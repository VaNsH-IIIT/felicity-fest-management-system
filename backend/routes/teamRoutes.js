const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth');
const teamController = require('../controllers/teamController');

// All team routes require auth
router.use(authMiddleware);

// Team operations
router.post('/create', teamController.createTeam);
router.post('/join', teamController.joinTeam);
router.get('/my-teams', teamController.getMyTeams);
router.get('/:teamId', teamController.getTeam);
router.post('/:teamId/register', teamController.registerTeam);
router.post('/:teamId/leave', teamController.leaveTeam);
router.delete('/:teamId', teamController.deleteTeam);

module.exports = router;
