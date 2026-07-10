const Event = require('../models/Event');

/**
 * Automatically transition event statuses based on current date:
 * - Published + startDate <= now < endDate → Ongoing
 * - Published/Ongoing + endDate <= now → Completed
 * Draft events are NOT touched (organizer must explicitly publish).
 */
async function autoUpdateEventStatuses() {
  const now = new Date();

  try {
    // Published → Ongoing (event has started but not ended)
    await Event.updateMany(
      {
        status: 'Published',
        startDate: { $lte: now },
        endDate: { $gt: now }
      },
      { $set: { status: 'Ongoing' } }
    );

    // Published/Ongoing → Completed (event has ended)
    await Event.updateMany(
      {
        status: { $in: ['Published', 'Ongoing'] },
        endDate: { $lte: now }
      },
      { $set: { status: 'Completed' } }
    );
  } catch (err) {
    console.error('Auto status update error:', err.message);
  }
}

module.exports = { autoUpdateEventStatuses };
