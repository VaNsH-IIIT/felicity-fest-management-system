const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');
const eventController = require('../controllers/eventController');
const userController = require('../controllers/userController');

// Public routes
router.get('/browse', eventController.browseEvents);
router.get('/trending', eventController.getTrendingEvents);
router.get('/details/:eventId', eventController.getEventDetails);

// Public: clubs listing (also accessible via /participant/clubs)
router.get('/clubs', userController.listClubs);
router.get('/clubs/:organizerId', userController.getClubDetail);

// Protected routes
router.get('/my-events', authMiddleware, eventController.getParticipantEvents);
router.get('/ticket/:ticketId', authMiddleware, eventController.getTicketDetails);
router.post('/:eventId/register', authMiddleware, eventController.registerForEvent);
router.put('/:eventId/upload-proof', authMiddleware, eventController.uploadPaymentProof);

module.exports = router;
