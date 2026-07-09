const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 1000
  },
  userName: {
    type: String,
    default: 'Anonymous'
  },
  userRole: {
    type: String,
    enum: ['Participant', 'Organizer', 'Admin'],
    default: 'Participant'
  }
}, { timestamps: true });

messageSchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.model('ForumMessage', messageSchema);
