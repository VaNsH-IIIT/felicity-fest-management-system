const mongoose = require('mongoose');
const User = require('./User');

const adminSchema = new mongoose.Schema({
// Admin-specific fields if needed
});

// Register discriminator safely
let Admin;
try {
Admin = User.discriminator('Admin', adminSchema);
} catch (error) {
// If discriminator already exists, get the existing one
Admin = mongoose.model('Admin');
}

module.exports = Admin;
