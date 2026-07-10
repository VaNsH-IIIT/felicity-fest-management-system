const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');
const organizerController = require('../controllers/organizerController');
const adminController = require('../controllers/adminController');

// Public route - password reset request (no auth needed)
router.post('/request-password-reset', adminController.requestPasswordReset);

// All other organizer routes require auth + Organizer role
router.use(authMiddleware, authorizeRoles('Organizer'));

// Dashboard
router.get('/dashboard', organizerController.getDashboard);

// Events
router.get('/events', organizerController.getMyEvents);
router.post('/events', organizerController.createEvent);
router.get('/events/:eventId', organizerController.getEventDetail);
router.put('/events/:eventId', organizerController.updateEvent);
router.get('/events/:eventId/export-csv', organizerController.exportParticipantsCSV);

// Merchandise approval
router.get('/events/:eventId/orders', organizerController.getMerchandiseOrders);
router.put('/orders/:registrationId/approve', organizerController.handleMerchandiseApproval);

// Profile
router.get('/profile', organizerController.getProfile);
router.put('/profile', organizerController.updateProfile);

module.exports = router;
