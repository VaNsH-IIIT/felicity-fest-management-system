const mongoose = require('mongoose');
const User = require('./User');

const participantSchema = new mongoose.Schema({

firstName: {
type: String,
default: ''
},

lastName: {
type: String,
default: ''
},

contactNumber: {
type: String,
default: ''
},

collegeName: {
type: String,
default: ''
},

type: {
type: String,
enum: ['IIIT', 'Non-IIIT'],
required: true
},

interests: [{
type: String
}],

followedClubs: [{
type: mongoose.Schema.Types.ObjectId,
ref: 'Organizer'
}],

onboardingCompleted: {
type: Boolean,
default: false
}

});

// Register discriminator safely
let Participant;
try {
Participant = User.discriminator('Participant', participantSchema);
} catch (error) {
// If discriminator already exists, get the existing one
Participant = mongoose.model('Participant');
}

module.exports = Participant;
