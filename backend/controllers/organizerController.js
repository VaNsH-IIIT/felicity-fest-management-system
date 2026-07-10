const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Organizer = require('../models/Organizer');
const Team = require('../models/Team');
const qrService = require('../utils/qrService');
const emailService = require('../utils/emailService');
const { sendDiscordNotification } = require('../utils/discordWebhook');

// ================= ORGANIZER DASHBOARD =================
exports.getDashboard = async (req, res) => {
  try {
    const organizerId = req.user.id;

    const events = await Event.find({ organizer: organizerId })
      .sort({ createdAt: -1 });

    // Aggregate stats across completed events
    const completedEvents = events.filter(e => e.status === 'Completed');
    let totalRegistrations = 0;
    let totalRevenue = 0;

    for (const event of events) {
      const regCount = await Registration.countDocuments({ event: event._id });
      totalRegistrations += regCount;

      const revenueAgg = await Registration.aggregate([
        { $match: { event: event._id, 'payment.status': 'Completed' } },
        { $group: { _id: null, total: { $sum: '$payment.amount' } } }
      ]);
      totalRevenue += revenueAgg[0]?.total || 0;
    }

    res.json({
      events: events.map(e => ({
        _id: e._id,
        name: e.name,
        type: e.type,
        status: e.status,
        startDate: e.startDate,
        endDate: e.endDate,
        totalRegistrations: e.totalRegistrations,
        participantLimit: e.participantLimit,
        fee: e.fee
      })),
      stats: {
        totalEvents: events.length,
        activeEvents: events.filter(e => ['Published', 'Ongoing'].includes(e.status)).length,
        publishedEvents: events.filter(e => e.status === 'Published').length,
        draftEvents: events.filter(e => e.status === 'Draft').length,
        ongoingEvents: events.filter(e => e.status === 'Ongoing').length,
        completedEvents: completedEvents.length,
        totalRegistrations,
        totalRevenue
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= CREATE EVENT =================
exports.createEvent = async (req, res) => {
  try {
    const organizerId = req.user.id;
    const {
      name, description, type, startDate, endDate,
      registrationDeadline, eligibility, fee, participantLimit,
      location, category, customForm, merchandise,
      isTeamEvent, maxTeamSize, tags, status
    } = req.body;

    if (!name || !description || !startDate || !endDate || !registrationDeadline) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    const eventType = type || 'Normal';

    const event = new Event({
      name,
      description,
      type: eventType,
      organizer: organizerId,
      startDate,
      endDate,
      registrationDeadline,
      eligibility: eligibility || { type: 'All' },
      fee: fee || 0,
      participantLimit: participantLimit || 100,
      location: location || '',
      category: category || '',
      customForm: customForm || [],
      merchandise: merchandise || { variants: [] },
      isTeamEvent: eventType === 'Merchandise' ? false : (isTeamEvent || false),
      maxTeamSize: eventType === 'Merchandise' ? 1 : (maxTeamSize || 1),
      tags: tags || [],
      status: status || 'Draft'
    });

    await event.save();

    res.status(201).json({
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ================= UPDATE EVENT =================
exports.updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const organizerId = req.user.id;
    const updates = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizer.toString() !== organizerId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Auto-compute current logical status from dates
    const now = new Date();
    if (event.status === 'Published' && event.startDate <= now && event.endDate > now) {
      event.status = 'Ongoing';
    }
    if (['Published', 'Ongoing'].includes(event.status) && event.endDate <= now) {
      event.status = 'Completed';
    }

    // Enforce editing rules based on status
    if (event.status === 'Draft') {
      // Check if any registrations exist — lock form structure if so
      const regCount = await Registration.countDocuments({ event: eventId });
      if (regCount > 0) {
        const lockedFields = ['customForm', 'merchandise'];
        const attempted = Object.keys(updates).filter(k => lockedFields.includes(k));
        if (attempted.length > 0) {
          return res.status(400).json({
            message: `Cannot edit ${attempted.join(', ')} after registrations have been received`
          });
        }
      }
      // Draft: free edits (except locked form fields handled above)
      // Only allow Draft or Published status from Draft
      if (updates.status && !['Draft', 'Published'].includes(updates.status)) {
        return res.status(400).json({ message: 'Draft events can only be set to Published' });
      }
      Object.assign(event, updates);
    } else if (event.status === 'Published') {
      // Published: only description, deadline extension, limit increase, close/completed
      const allowed = ['description', 'registrationDeadline', 'participantLimit', 'status'];
      for (const key of Object.keys(updates)) {
        if (allowed.includes(key)) {
          if (key === 'registrationDeadline' && new Date(updates[key]) < event.registrationDeadline) {
            return res.status(400).json({ message: 'Can only extend deadline, not shorten it' });
          }
          if (key === 'participantLimit' && updates[key] < event.participantLimit) {
            return res.status(400).json({ message: 'Can only increase participant limit' });
          }
          if (key === 'status' && !['Published', 'Closed', 'Completed'].includes(updates[key])) {
            return res.status(400).json({ message: 'Published events can only be set to Closed or Completed' });
          }
          event[key] = updates[key];
        }
      }
    } else if (['Ongoing', 'Completed', 'Closed'].includes(event.status)) {
      // Only status change allowed
      if (updates.status && ['Completed', 'Closed'].includes(updates.status)) {
        event.status = updates.status;
      } else if (Object.keys(updates).length === 1 && updates.status) {
        return res.status(400).json({ message: `${event.status} events can only be marked Completed or Closed` });
      } else {
        return res.status(400).json({ message: 'Only status changes allowed for ongoing/completed events' });
      }
    } else {
      return res.status(400).json({ message: 'Event cannot be edited in current status' });
    }

    await event.save();
    res.json({ message: 'Event updated', event });

    // If event was just published, auto-post to Discord
    if (event.status === 'Published') {
      (async () => {
        try {
          const organizer = await Organizer.findById(event.organizer);
          if (organizer?.discordWebhook) {
            sendDiscordNotification(organizer.discordWebhook, {
              type: 'registration',
              eventName: event.name,
              participantName: 'New Event Published',
              participantEmail: `Date: ${new Date(event.startDate).toLocaleDateString()} | Location: ${event.location || 'TBA'}`,
              ticketId: event._id.toString()
            });
          }
        } catch (e) {
          console.error('Discord publish notification error:', e);
        }
      })();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= GET EVENT DETAIL (ORGANIZER VIEW) =================
exports.getEventDetail = async (req, res) => {
  try {
    const { eventId } = req.params;
    const organizerId = req.user.id;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizer.toString() !== organizerId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get registrations
    const registrations = await Registration.find({ event: eventId })
      .populate('participant', 'email firstName lastName contactNumber')
      .populate('team', 'name')
      .sort({ createdAt: -1 });

    // Analytics
    const totalRegistrations = registrations.length;
    const confirmed = registrations.filter(r => r.status === 'Confirmed' || r.status === 'Registered').length;
    const cancelled = registrations.filter(r => r.status === 'Cancelled' || r.status === 'Rejected').length;
    const checkedIn = registrations.filter(r => r.checkedIn).length;
    const revenue = registrations
      .filter(r => r.payment.status === 'Completed')
      .reduce((sum, r) => sum + (r.payment.amount || 0), 0);

    // Form is locked once any registration exists
    const formLocked = totalRegistrations > 0;

    res.json({
      event,
      formLocked,
      registrations: registrations.map(r => ({
        _id: r._id,
        participant: r.participant,
        team: r.team,
        status: r.status,
        ticketId: r.ticketId,
        paymentStatus: r.payment.status,
        paymentAmount: r.payment.amount,
        checkedIn: r.checkedIn,
        checkInTime: r.checkInTime,
        registeredAt: r.createdAt,
        formResponses: r.formResponses,
        merchandisePurchase: r.merchandisePurchase
      })),
      analytics: {
        totalRegistrations,
        confirmed,
        cancelled,
        checkedIn,
        revenue,
        attendanceRate: totalRegistrations > 0 ? ((checkedIn / totalRegistrations) * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= EXPORT PARTICIPANTS CSV =================
exports.exportParticipantsCSV = async (req, res) => {
  try {
    const { eventId } = req.params;
    const organizerId = req.user.id;

    const event = await Event.findById(eventId);
    if (!event || event.organizer.toString() !== organizerId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const registrations = await Registration.find({ event: eventId })
      .populate('participant', 'email firstName lastName contactNumber collegeName')
      .populate('team', 'name');

    // Build CSV
    let csv = 'Name,Email,Contact,College,Status,Payment,Ticket ID,Team,Registered At,Checked In\n';
    
    for (const reg of registrations) {
      const p = reg.participant;
      const name = `${p?.firstName || ''} ${p?.lastName || ''}`.trim();
      csv += `"${name}","${p?.email || ''}","${p?.contactNumber || ''}","${p?.collegeName || ''}","${reg.status}","${reg.payment.status}","${reg.ticketId || ''}","${reg.team?.name || ''}","${reg.createdAt.toISOString()}","${reg.checkedIn ? 'Yes' : 'No'}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=participants_${eventId}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= GET ORGANIZER PROFILE =================
exports.getProfile = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.user.id, '-password');
    if (!organizer) {
      return res.status(404).json({ message: 'Organizer not found' });
    }
    res.json(organizer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= UPDATE ORGANIZER PROFILE =================
exports.updateProfile = async (req, res) => {
  try {
    const { clubName, category, description, contactEmail, contactNumber, discordWebhook } = req.body;

    const organizer = await Organizer.findByIdAndUpdate(
      req.user.id,
      {
        ...(clubName && { clubName }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(contactNumber !== undefined && { contactNumber }),
        ...(discordWebhook !== undefined && { discordWebhook })
      },
      { new: true, select: '-password' }
    );

    res.json({ message: 'Profile updated', organizer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= MERCHANDISE APPROVAL =================
exports.getMerchandiseOrders = async (req, res) => {
  try {
    const { eventId } = req.params;
    const organizerId = req.user.id;

    const event = await Event.findById(eventId);
    if (!event || event.organizer.toString() !== organizerId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Return merch orders OR paid normal event registrations (those with payment amount > 0)
    const query = event.type === 'Merchandise'
      ? { event: eventId, 'merchandisePurchase.items': { $exists: true, $ne: [] } }
      : { event: eventId, 'payment.amount': { $gt: 0 } };

    const orders = await Registration.find(query)
    .populate('participant', 'email firstName lastName')
    .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.handleMerchandiseApproval = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { action, reason, rejectionReason } = req.body; // action: 'approve' | 'reject'
    const rejectReason = reason || rejectionReason || '';
    const organizerId = req.user.id;

    const registration = await Registration.findById(registrationId)
      .populate('event')
      .populate('participant', 'email firstName lastName');

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    if (registration.event.organizer.toString() !== organizerId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (action === 'approve') {
      registration.payment.status = 'Completed';
      registration.payment.approvalDate = new Date();
      registration.status = 'Confirmed';

      // Save registration FIRST (critical), then respond immediately
      await registration.save();
      res.json({ message: 'Order approved, QR generated, email sent' });

      // ---- Async post-approval tasks (stock, QR, email) — non-blocking ----
      const eventId = registration.event._id || registration.event;
      const participantEmail = registration.participant?.email;
      const participantName = registration.participant
        ? `${registration.participant.firstName} ${registration.participant.lastName}`
        : '';
      const eventName = registration.event?.name || '';
      const eventStartDate = registration.event?.startDate;
      const eventLocation = registration.event?.location || '';

      (async () => {
        // Decrement stock
        try {
          const event = await Event.findById(eventId);
          if (event && registration.merchandisePurchase?.items) {
            for (const item of registration.merchandisePurchase.items) {
              const variant = event.merchandise?.variants?.find(v => v.variantId === item.variantId);
              if (variant) {
                variant.stock = Math.max(0, variant.stock - item.quantity);
              }
            }
            await event.save();
          }
        } catch (e) {
          console.error('Stock decrement error:', e);
        }

        // Generate QR code & send confirmation email
        try {
          const qrDataUrl = await qrService.generateTicketQRDataUrl(registration.ticketId, {
            eventId,
            participantId: registration.participant?._id || registration.participant,
            eventName
          });

          if (participantEmail) {
            await emailService.sendRegistrationEmail(participantEmail, {
              ticketId: registration.ticketId,
              eventName,
              eventDate: eventStartDate,
              location: eventLocation,
              participantName
            });
          }
        } catch (e) {
          console.error('QR/Email error (post-approval):', e);
        }

        // Send Discord notification on approval
        try {
          const organizer = await Organizer.findById(registration.event.organizer);
          if (organizer?.discordWebhook) {
            sendDiscordNotification(organizer.discordWebhook, {
              type: registration.merchandisePurchase?.items?.length ? 'merchandise' : 'registration',
              eventName,
              participantName,
              participantEmail,
              ticketId: registration.ticketId
            });
          }
        } catch (e) {
          console.error('Discord approval notification error:', e);
        }
      })();
    } else {
      registration.payment.status = 'Rejected';
      registration.payment.rejectionReason = rejectReason;
      registration.status = 'Rejected';
      await registration.save();
      res.json({ message: 'Order rejected' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= LIST ORGANIZER'S EVENTS =================
exports.getMyEvents = async (req, res) => {
  try {
    const organizerId = req.user.id;
    const events = await Event.find({ organizer: organizerId })
      .sort({ createdAt: -1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
