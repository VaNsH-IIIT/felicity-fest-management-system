const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const forumController = require('../controllers/forumController');

// Get messages for an event (requires auth)
router.get('/:eventId/messages', authMiddleware, forumController.getMessages);

// Post a message (requires auth)
router.post('/:eventId/messages', authMiddleware, forumController.postMessage);

module.exports = router;
