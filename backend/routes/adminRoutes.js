const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');
const adminController = require('../controllers/adminController');

// All admin routes require auth + Admin role
router.use(authMiddleware, authorizeRoles('Admin'));

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Organizer management
router.post('/organizers', adminController.createOrganizer);
router.get('/organizers', adminController.listOrganizers);
router.delete('/organizers/:organizerId', adminController.removeOrganizer);

// Password reset requests
router.get('/password-resets', adminController.getPasswordResetRequests);
router.put('/password-resets/:requestId', adminController.handlePasswordReset);

module.exports = router;
