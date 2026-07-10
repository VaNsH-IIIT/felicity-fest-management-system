const Team = require('../models/Team');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const qrService = require('../utils/qrService');
const emailService = require('../utils/emailService');
const Organizer = require('../models/Organizer');
const { sendDiscordNotification } = require('../utils/discordWebhook');

// Create a team for a team event
exports.createTeam = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId, teamName, teamSize } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (!event.isTeamEvent) return res.status(400).json({ error: 'This is not a team event' });

    // Validate team size — must be between 2 and event.maxTeamSize
    const desiredSize = parseInt(teamSize) || event.maxTeamSize;
    if (desiredSize < 2) return res.status(400).json({ error: 'Team size must be at least 2' });
    if (desiredSize > event.maxTeamSize) return res.status(400).json({ error: `Team size cannot exceed ${event.maxTeamSize}` });

    // Check if user already has a team for this event
    const existingTeam = await Team.findOne({
      event: eventId,
      $or: [
        { leader: userId },
        { 'members.user': userId }
      ]
    });
    if (existingTeam) return res.status(400).json({ error: 'You already have a team for this event' });

    const team = new Team({
      name: teamName,
      event: eventId,
      leader: userId,
      maxSize: desiredSize,
      members: [{ user: userId, status: 'Accepted', joinedAt: new Date() }]
    });

    await team.save();

    res.status(201).json({
      message: 'Team created!',
      team,
      inviteCode: team.inviteCode
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Join a team via invite code
exports.joinTeam = async (req, res) => {
  try {
    const userId = req.user.id;
    const { inviteCode } = req.body;

    const team = await Team.findOne({ inviteCode }).populate('event');
    if (!team) return res.status(404).json({ error: 'Invalid invite code' });

    // Check if team is full
    const acceptedMembers = team.members.filter(m => m.status === 'Accepted');
    if (acceptedMembers.length >= team.maxSize) {
      return res.status(400).json({ error: 'Team is full' });
    }

    // Check if user already in this team
    const alreadyMember = team.members.find(m => m.user.toString() === userId);
    if (alreadyMember) return res.status(400).json({ error: 'You are already in this team' });

    // Check if user has another team for this event
    const existingTeam = await Team.findOne({
      event: team.event._id,
      'members.user': userId
    });
    if (existingTeam) return res.status(400).json({ error: 'You already have a team for this event' });

    team.members.push({ user: userId, status: 'Accepted', joinedAt: new Date() });

    // Check if team is now full
    if (team.members.filter(m => m.status === 'Accepted').length >= team.maxSize) {
      team.status = 'Complete';
    }

    await team.save();

    res.json({ message: 'Joined team successfully!', team });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get team details
exports.getTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId)
      .populate('leader', 'email firstName lastName')
      .populate('members.user', 'email firstName lastName')
      .populate('event', 'name startDate maxTeamSize');

    if (!team) return res.status(404).json({ error: 'Team not found' });

    res.json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get my teams
exports.getMyTeams = async (req, res) => {
  try {
    const userId = req.user.id;

    const teams = await Team.find({
      'members.user': userId
    })
      .populate('leader', 'email firstName lastName')
      .populate('members.user', 'email firstName lastName')
      .populate('event', 'name startDate maxTeamSize isTeamEvent status');

    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Leave a team
exports.leaveTeam = async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    if (team.leader.toString() === userId) {
      return res.status(400).json({ error: 'Team leader cannot leave. Delete the team instead.' });
    }

    team.members = team.members.filter(m => m.user.toString() !== userId);
    team.status = 'Forming';
    await team.save();

    res.json({ message: 'Left the team' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete team (leader only)
exports.deleteTeam = async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    if (team.leader.toString() !== userId) {
      return res.status(403).json({ error: 'Only the team leader can delete the team' });
    }

    await Team.findByIdAndDelete(teamId);
    res.json({ message: 'Team deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Register team for event (leader only)
exports.registerTeam = async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamId } = req.params;

    const team = await Team.findById(teamId).populate('event');
    if (!team) return res.status(404).json({ error: 'Team not found' });

    if (team.leader.toString() !== userId) {
      return res.status(403).json({ error: 'Only the team leader can register the team' });
    }

    const acceptedMembers = team.members.filter(m => m.status === 'Accepted');
    if (acceptedMembers.length < team.maxSize) {
      return res.status(400).json({ error: `Team must be fully formed (${acceptedMembers.length}/${team.maxSize} members). Invite more members before registering.` });
    }

    if (team.status !== 'Complete') {
      return res.status(400).json({ error: 'Team must be fully formed before registering' });
    }

    // Check registration deadline
    const event = team.event;
    if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) {
      return res.status(400).json({ error: 'Registration deadline has passed' });
    }

    // Create registrations for all accepted members
    const registrations = [];
    for (const member of acceptedMembers) {
      const existing = await Registration.findOne({
        event: event._id,
        participant: member.user
      });
      if (existing) continue;

      const needsPaymentApproval = event.fee > 0;
      const reg = new Registration({
        event: event._id,
        participant: member.user,
        team: team._id,
        status: needsPaymentApproval ? 'PendingApproval' : 'Registered',
        payment: {
          status: needsPaymentApproval ? 'PendingApproval' : 'Completed',
          amount: event.fee
        }
      });
      await reg.save();
      registrations.push(reg);
    }

    await team.save();

    await Event.findByIdAndUpdate(event._id, {
      $inc: { totalRegistrations: registrations.length }
    });

    res.json({
      message: `Team registered! ${registrations.length} registrations created.`,
      registrations
    });

    // Async: Discord notification for team registration
    (async () => {
      try {
        const organizer = await Organizer.findById(event.organizer._id || event.organizer);
        if (organizer?.discordWebhook) {
          sendDiscordNotification(organizer.discordWebhook, {
            type: 'registration',
            eventName: event.name,
            participantName: `Team: ${team.name} (${acceptedMembers.length} members)`,
            participantEmail: acceptedMembers.map(m => m.user.toString()).join(', '),
            ticketId: registrations[0]?.ticketId || 'N/A',
            teamName: team.name
          });
        }
      } catch (e) {
        console.error('Discord team registration error:', e);
      }
    })();

    // Async: Generate QR codes and send emails for all team members
    // Only for free events — paid events get QR/email after organizer approval
    if (event.fee <= 0) {
    (async () => {
      try {
        for (const reg of registrations) {
          const participant = await User.findById(reg.participant);
          if (!participant) continue;

          // Generate QR code
          let qrCodeDataUrl = null;
          try {
            qrCodeDataUrl = await qrService.generateTicketQR(reg.ticketId, {
              eventId: event._id,
              eventName: event.name,
              participantId: reg.participant,
              participantName: (participant.firstName || '') + ' ' + (participant.lastName || ''),
              teamName: team.name,
              registeredAt: reg.createdAt
            });
          } catch (qrErr) {
            console.error('Team QR generation error:', qrErr);
          }

          // Send email
          try {
            await emailService.sendRegistrationEmail(participant.email, {
              ticketId: reg.ticketId,
              eventName: event.name,
              eventDate: event.startDate,
              location: event.location,
              participantName: (participant.firstName || '') + ' ' + (participant.lastName || ''),
              teamName: team.name,
              qrCodeDataUrl
            });
          } catch (emailErr) {
            console.error('Team email error:', emailErr);
          }
        }
      } catch (asyncErr) {
        console.error('Post team-registration async error:', asyncErr);
      }
    })();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
