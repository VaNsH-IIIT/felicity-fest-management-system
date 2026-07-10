const ForumMessage = require('../models/ForumMessage');
const Event = require('../models/Event');

// Get messages for an event
exports.getMessages = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await ForumMessage.find({ event: eventId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ForumMessage.countDocuments({ event: eventId });

    res.json({
      messages: messages.reverse(),
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Post a message
exports.postMessage = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const User = require('../models/User');
    const user = await User.findById(userId);

    const message = new ForumMessage({
      event: eventId,
      user: userId,
      text: text.trim(),
      userName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email.split('@')[0],
      userRole: user.__t || 'Participant'
    });

    await message.save();

    // Emit via Socket.io if available
    const io = req.app.get('io');
    if (io) {
      io.to(`event_${eventId}`).emit('newMessage', message);
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
