const Organizer = require('../models/Organizer');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Team = require('../models/Team');
const ForumMessage = require('../models/ForumMessage');
const generateToken = require('../utils/generateToken');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// ================= CREATE ORGANIZER =================
exports.createOrganizer = async (req, res) => {
  try {
    const { clubName, category, description, contactEmail, contactNumber } = req.body;

    if (!clubName) {
      return res.status(400).json({ message: 'Club name is required' });
    }

    // Auto-generate email and password
    const sanitizedName = clubName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${sanitizedName}@fest.organizer.com`;
    const password = crypto.randomBytes(8).toString('hex');

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Organizer with this name already exists' });
    }

    const organizer = new Organizer({
      email,
      password,
      clubName,
      category: category || '',
      description: description || '',
      contactEmail: contactEmail || email,
      contactNumber: contactNumber || ''
    });

    await organizer.save();

    res.status(201).json({
      message: 'Organizer created successfully',
      organizer: {
        _id: organizer._id,
        email: organizer.email,
        clubName: organizer.clubName,
        category: organizer.category,
        description: organizer.description
      },
      credentials: {
        email,
        password
      }
    });
  } catch (error) {
    console.error('Create organizer error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ================= LIST ALL ORGANIZERS =================
exports.listOrganizers = async (req, res) => {
  try {
    const organizers = await Organizer.find({ isActive: { $ne: false } }, '-password')
      .sort({ createdAt: -1 });
    res.json(organizers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= REMOVE / DISABLE ORGANIZER =================
exports.removeOrganizer = async (req, res) => {
  try {
    const { organizerId } = req.params;
    const action = req.query.action || (req.body && req.body.action) || 'disable'; // 'disable' or 'delete'

    const organizer = await Organizer.findById(organizerId);
    if (!organizer) {
      return res.status(404).json({ message: 'Organizer not found' });
    }

    if (action === 'delete') {
      // Cascade: find all events by this organizer
      const events = await Event.find({ organizer: organizerId }).select('_id');
      const eventIds = events.map(e => e._id);

      if (eventIds.length > 0) {
        // Delete all registrations for these events
        const registrations = await Registration.find({ event: { $in: eventIds } }).select('ticketId');

        // Best-effort: remove QR code files
        const qrDir = path.join(__dirname, '../public/qrcodes');
        for (const reg of registrations) {
          if (reg.ticketId) {
            try { fs.unlinkSync(path.join(qrDir, `${reg.ticketId}.png`)); } catch (_) {}
          }
        }

        await Registration.deleteMany({ event: { $in: eventIds } });
        await Team.deleteMany({ event: { $in: eventIds } });
        await ForumMessage.deleteMany({ event: { $in: eventIds } });
        await Event.deleteMany({ organizer: organizerId });
      }

      // Delete any password reset requests for this organizer
      try {
        const PasswordResetRequest = require('mongoose').model('PasswordResetRequest');
        await PasswordResetRequest.deleteMany({ organizer: organizerId });
      } catch (_) {}

      await Organizer.findByIdAndDelete(organizerId);
      res.json({ message: 'Organizer and all associated data permanently deleted' });
    } else {
      // Disable: mark as inactive and change password
      organizer.isActive = false;
      organizer.password = crypto.randomBytes(32).toString('hex') + '!DISABLED!';
      await organizer.save();
      res.json({ message: 'Organizer account disabled' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= ADMIN DASHBOARD STATS =================
exports.getDashboardStats = async (req, res) => {
  try {
    const Participant = require('../models/Participant');
    const totalOrganizers = await Organizer.countDocuments();
    const totalParticipants = await Participant.countDocuments();
    const totalEvents = await Event.countDocuments();
    const totalRegistrations = await Registration.countDocuments();
    const activeEvents = await Event.countDocuments({ status: { $in: ['Published', 'Ongoing'] } });

    // Count pending password resets
    let pendingResets = 0;
    try {
      const PasswordResetRequest = require('mongoose').model('PasswordResetRequest');
      pendingResets = await PasswordResetRequest.countDocuments({ status: 'Pending' });
    } catch (e) { /* model not registered yet */ }

    res.json({
      totalOrganizers,
      totalParticipants,
      totalEvents,
      totalRegistrations,
      activeEvents,
      pendingResets
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= PASSWORD RESET REQUESTS =================
// Model for password reset requests
const mongoose = require('mongoose');
const passwordResetSchema = new mongoose.Schema({
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer', required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  adminComment: String,
  newPassword: String,
  resolvedAt: Date
}, { timestamps: true });

let PasswordResetRequest;
try {
  PasswordResetRequest = mongoose.model('PasswordResetRequest');
} catch {
  PasswordResetRequest = mongoose.model('PasswordResetRequest', passwordResetSchema);
}

exports.PasswordResetRequest = PasswordResetRequest;

// Get all password reset requests
exports.getPasswordResetRequests = async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find()
      .populate('organizer', 'email clubName')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Handle password reset request (approve/reject)
exports.handlePasswordReset = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, comment } = req.body; // action: 'approve' | 'reject'

    const request = await PasswordResetRequest.findById(requestId)
      .populate('organizer');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ message: 'Request already handled' });
    }

    if (action === 'approve') {
      const newPassword = crypto.randomBytes(8).toString('hex');

      // Explicitly hash the password and use findByIdAndUpdate to
      // bypass the pre-save hook (avoids discriminator hook issues)
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      await Organizer.findByIdAndUpdate(request.organizer._id, {
        password: hashedPassword
      });

      request.status = 'Approved';
      request.newPassword = newPassword;
      request.adminComment = comment || '';
      request.resolvedAt = new Date();
      await request.save();

      res.json({
        message: 'Password reset approved',
        newPassword,
        organizerEmail: request.organizer.email
      });
    } else {
      request.status = 'Rejected';
      request.adminComment = comment || 'Request rejected';
      request.resolvedAt = new Date();
      await request.save();

      res.json({ message: 'Password reset request rejected' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Organizer requests password reset
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email, reason } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find the organizer by email
    const organizer = await Organizer.findOne({ email });
    if (!organizer) {
      return res.status(404).json({ error: 'No organizer found with this email' });
    }

    // Check for existing pending request
    const existing = await PasswordResetRequest.findOne({
      organizer: organizer._id,
      status: 'Pending'
    });

    if (existing) {
      return res.status(400).json({ error: 'You already have a pending password reset request' });
    }

    const request = new PasswordResetRequest({
      organizer: organizer._id,
      reason: reason || 'No reason provided'
    });

    await request.save();
    res.status(201).json({ message: 'Password reset request submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
