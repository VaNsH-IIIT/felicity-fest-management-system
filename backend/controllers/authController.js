const Participant = require('../models/Participant');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// Example college email domains
const allowedDomains = ['research.iiit.ac.in', 'students.iiit.ac.in', 'iiit.ac.in'];

// ================= REGISTER (Participants only) =================
exports.register = async (req, res) => {
try {
const { email, password, firstName, lastName, contactNumber, collegeName } = req.body;

// Validate input
if (!email || !password) {
  return res.status(400).json({
    message: 'Email and password are required'
  });
}

const existingUser = await User.findOne({ email });

if (existingUser) {
  return res.status(400).json({
    message: 'User already exists'
  });
}

// detect domain
const domain = email.split('@')[1];

const type = allowedDomains.some(d => domain.endsWith(d))
  ? 'IIIT'
  : 'Non-IIIT';

const user = new Participant({
  email,
  password,
  type,
  firstName: firstName || '',
  lastName: lastName || '',
  contactNumber: contactNumber || '',
  collegeName: collegeName || ''
});

await user.save();

const token = generateToken(user);

res.status(201).json({
  message: 'Registered successfully',
  token,
  type,
  role: 'Participant'
});

} catch (error) {
console.error('Registration error:', error);
res.status(500).json({ error: error.message || 'Registration failed' });
}
};

// ================= LOGIN =================
exports.login = async (req, res) => {
try {
const { email, password } = req.body;

const user = await User.findOne({ email });

if (!user || !(await user.comparePassword(password))) {
  return res.status(401).json({
    message: 'Invalid credentials'
  });
}

// Block disabled organizers
if (user.role === 'Organizer' && user.isActive === false) {
  return res.status(401).json({
    message: 'This account has been disabled. Contact the admin.'
  });
}

const token = generateToken(user);

res.json({
  message: 'Login successful',
  token,
  role: user.role,
  onboardingCompleted: user.onboardingCompleted || false
});

} catch (error) {
res.status(500).json({ error: error.message });
}
};

// ================= LOGOUT =================
exports.logout = async (req, res) => {
// JWT is stateless → logout handled client-side
res.json({
message: 'Logout successful (delete token on client)'
});
};

// ================= CHANGE PASSWORD =================
exports.changePassword = async (req, res) => {
try {
const { currentPassword, newPassword } = req.body;
const userId = req.user.id;

if (!currentPassword || !newPassword) {
  return res.status(400).json({ message: 'Current and new password required' });
}

if (newPassword.length < 6) {
  return res.status(400).json({ message: 'New password must be at least 6 characters' });
}

const user = await User.findById(userId);
if (!user) {
  return res.status(404).json({ message: 'User not found' });
}

const isMatch = await user.comparePassword(currentPassword);
if (!isMatch) {
  return res.status(401).json({ message: 'Current password is incorrect' });
}

user.password = newPassword;
await user.save();

res.json({ message: 'Password changed successfully' });
} catch (error) {
res.status(500).json({ error: error.message });
}
};
