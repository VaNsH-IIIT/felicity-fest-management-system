const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');
const userController = require('../controllers/userController');

// Public routes — clubs listing
router.get('/clubs', userController.listClubs);
router.get('/clubs/:organizerId', userController.getClubDetail);

// Protected participant routes
router.post('/preferences', authMiddleware, authorizeRoles('Participant'), userController.savePreferences);
router.get('/profile', authMiddleware, authorizeRoles('Participant'), userController.getProfile);
router.put('/profile', authMiddleware, authorizeRoles('Participant'), userController.updateProfile);
router.post('/follow/:organizerId', authMiddleware, authorizeRoles('Participant'), userController.toggleFollowClub);

module.exports = router;
