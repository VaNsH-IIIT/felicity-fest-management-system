const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');

// Save onboarding preferences
exports.savePreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { interests, followedClubs } = req.body;

    const user = await Participant.findByIdAndUpdate(
      userId,
      {
        interests,
        followedClubs,
        onboardingCompleted: true
      },
      { new: true }
    ).populate({
      path: 'followedClubs',
      select: 'clubName category',
      match: { isActive: { $ne: false } }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user profile/preferences
exports.getProfile = async (req, res) => {
  try {
    const user = await Participant.findById(req.user.id)
      .populate({
        path: 'followedClubs',
        select: 'clubName category description',
        match: { isActive: { $ne: false } }
      });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update participant profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, contactNumber, collegeName, interests, followedClubs } = req.body;

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (contactNumber !== undefined) updateData.contactNumber = contactNumber;
    if (collegeName !== undefined) updateData.collegeName = collegeName;
    if (interests !== undefined) updateData.interests = interests;
    if (followedClubs !== undefined) updateData.followedClubs = followedClubs;

    const user = await Participant.findByIdAndUpdate(userId, updateData, { new: true })
      .populate({
        path: 'followedClubs',
        select: 'clubName category description',
        match: { isActive: { $ne: false } }
      });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Follow/unfollow a club (organizer)
exports.toggleFollowClub = async (req, res) => {
  try {
    const userId = req.user.id;
    const { organizerId } = req.params;

    const participant = await Participant.findById(userId);
    if (!participant) {
      return res.status(404).json({ error: 'User not found' });
    }

    const index = participant.followedClubs.indexOf(organizerId);
    if (index > -1) {
      participant.followedClubs.splice(index, 1);
    } else {
      participant.followedClubs.push(organizerId);
    }

    await participant.save();
    await participant.populate({
      path: 'followedClubs',
      select: 'clubName category description',
      match: { isActive: { $ne: false } }
    });

    res.json({ followedClubs: participant.followedClubs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// List all clubs (organizers) — public
exports.listClubs = async (req, res) => {
  try {
    const clubs = await Organizer.find({ isActive: { $ne: false } }, 'clubName category description contactEmail contactNumber email');
    res.json(clubs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single club/organizer detail with events — public
exports.getClubDetail = async (req, res) => {
  try {
    const { organizerId } = req.params;
    const Event = require('../models/Event');

    const organizer = await Organizer.findOne({ _id: organizerId, isActive: { $ne: false } }, 'clubName category description contactEmail contactNumber email');
    if (!organizer) {
      return res.status(404).json({ error: 'Club not found' });
    }

    const events = await Event.find({
      organizer: organizerId,
      status: { $in: ['Published', 'Ongoing', 'Completed'] }
    }).sort({ startDate: -1 }).select('name description type startDate endDate status poster tags category');

    res.json({ organizer, events });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
