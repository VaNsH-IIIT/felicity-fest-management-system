// run inside backend/: node seed/adminSeed.js

require('dotenv').config();

const connectDB = require('../config/db');
const Admin = require('../models/Admin');

const seedAdmin = async () => {
try {
// Connect to database
await connectDB();

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error('ADMIN_EMAIL or ADMIN_PASSWORD missing in .env');
  process.exit(1);
}

// Check if admin already exists
const existingAdmin = await Admin.findOne({ email });

if (existingAdmin) {
  console.log('Admin already exists.');
  process.exit(0);
}

// Create admin
const admin = new Admin({
  email,
  password
});

await admin.save();

console.log('Admin account created successfully!');
process.exit(0);

} catch (error) {
console.error('Error seeding admin:', error);
process.exit(1);
}
};

seedAdmin();
