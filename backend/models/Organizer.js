const mongoose = require('mongoose');
const User = require('./User');

const organizerSchema = new mongoose.Schema({

clubName: {
type: String,
required: true
},

category: {
type: String,
default: ''
},

description: {
type: String,
default: ''
},

contactEmail: {
type: String,
default: ''
},

contactNumber: {
type: String,
default: ''
},

discordWebhook: {
type: String,
default: ''
},

isActive: {
type: Boolean,
default: true
}

});

// Register discriminator safely
let Organizer;
try {
Organizer = User.discriminator('Organizer', organizerSchema);
} catch (error) {
// If discriminator already exists, get the existing one
Organizer = mongoose.model('Organizer');
}

module.exports = Organizer;
