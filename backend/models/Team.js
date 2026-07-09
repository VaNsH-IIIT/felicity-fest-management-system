const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({

name: {
type: String,
required: true
},

event: {
type: mongoose.Schema.Types.ObjectId,
ref: 'Event',
required: true
},

leader: {
type: mongoose.Schema.Types.ObjectId,
ref: 'User',
required: true
},

members: [{
user: {
type: mongoose.Schema.Types.ObjectId,
ref: 'User'
},
status: {
type: String,
enum: ['Pending', 'Accepted', 'Declined'],
default: 'Pending'
},
joinedAt: Date
}],

maxSize: {
type: Number,
required: true
},

inviteCode: {
type: String,
unique: true,
sparse: true
},

status: {
type: String,
enum: ['Forming', 'Complete', 'Incomplete'],
default: 'Forming'
}

}, { timestamps: true });

// Generate invite code before saving
teamSchema.pre('save', function() {
if (!this.inviteCode) {
this.inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
}
});

module.exports = mongoose.model('Team', teamSchema);
