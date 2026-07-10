const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const Organizer = require('../models/Organizer');
const emailService = require('../utils/emailService');
const qrService = require('../utils/qrService');
const { sendDiscordNotification } = require('../utils/discordWebhook');

// ================= BROWSE EVENTS =================
exports.browseEvents = async (req, res) => {
  try {
    const {
      search = '',
      type,
      eligibility,
      startDate,
      endDate,
      followedClubs = [],
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object
    let filter = { status: { $in: ['Published', 'Ongoing'] } };

    // Search with fuzzy matching (e.g. "mh" matches "merch")
    if (search) {
      // Escape special regex chars, then insert .* between each character
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const fuzzyPattern = escaped.split('').join('.*');
      const searchRegex = new RegExp(fuzzyPattern, 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { tags: searchRegex }
      ];
    }

    // Filter by type
    if (type) {
      filter.type = type;
    }

    // Filter by eligibility
    if (eligibility) {
      filter['eligibility.type'] = eligibility;
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) {
        filter.startDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.startDate.$lte = new Date(endDate);
      }
    }

    // Filter by followed clubs (organizer IDs)
    let filterByClubs = false;
    if (followedClubs) {
      let clubIds = followedClubs;
      if (typeof followedClubs === 'string') {
        try { clubIds = JSON.parse(followedClubs); } catch { clubIds = []; }
      }
      if (Array.isArray(clubIds) && clubIds.length > 0) {
        filter.organizer = { $in: clubIds };
        filterByClubs = true;
      }
    }

    // Exclude events from inactive/deleted organizers
    const inactiveOrgIds = await Organizer.find({ isActive: false }).distinct('_id');
    if (inactiveOrgIds.length > 0) {
      if (filter.organizer && filter.organizer.$in) {
        filter.organizer.$nin = inactiveOrgIds;
      } else if (!filter.organizer) {
        filter.organizer = { $nin: inactiveOrgIds };
      }
    }

    // Pagination
    const skip = (page - 1) * limit;

    // ---------- Personalized ordering ----------
    // If the request carries a JWT, load the participant's preferences to
    // boost events from followed clubs and matching interest categories/tags.
    let userFollowedIds = [];
    let userInterests = [];
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        if (decoded && decoded.id) {
          const Participant = require('../models/Participant');
          const participant = await Participant.findById(decoded.id).select('followedClubs interests').lean();
          if (participant) {
            userFollowedIds = (participant.followedClubs || []).map(id => id.toString());
            userInterests = (participant.interests || []).map(i => i.toLowerCase());
          }
        }
      }
    } catch (_prefErr) {
      // Not logged in or invalid token — just skip personalisation
    }

    // Execute query — fetch all matching docs for this page window so we can
    // re-sort by relevance.  We fetch a bit more to have room for ranking.
    const allEvents = await Event.find(filter)
      .populate('organizer', 'email clubName')
      .sort({ createdAt: -1 })
      .lean();

    // Score each event for personalised ranking
    const scored = allEvents.map(ev => {
      let score = 0;
      // Boost for followed clubs
      if (userFollowedIds.length > 0 && ev.organizer) {
        const orgId = (ev.organizer._id || ev.organizer).toString();
        if (userFollowedIds.includes(orgId)) score += 10;
      }
      // Boost for matching interests (category or tags)
      if (userInterests.length > 0) {
        const cat = (ev.category || '').toLowerCase();
        if (cat && userInterests.includes(cat)) score += 5;
        const tags = (ev.tags || []).map(t => t.toLowerCase());
        for (const interest of userInterests) {
          if (tags.includes(interest)) { score += 3; break; }
        }
      }
      return { ...ev, _score: score };
    });

    // Sort: highest score first, then by createdAt desc within same score
    scored.sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Paginate after sorting
    const total = scored.length;
    const paged = scored.slice(skip, skip + parseInt(limit));
    // Remove internal score before sending
    const events = paged.map(({ _score, ...rest }) => rest);

    res.json({
      events,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= GET TRENDING EVENTS =================
exports.getTrendingEvents = async (req, res) => {
  try {
    // Get date 24 hours ago
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find top 5 events by registrations in last 24h
    const trendingEvents = await Registration.aggregate([
      {
        $match: {
          createdAt: { $gte: last24h }
        }
      },
      {
        $group: {
          _id: '$event',
          registrationCount: { $sum: 1 }
        }
      },
      {
        $sort: { registrationCount: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: '_id',
          as: 'eventDetails'
        }
      },
      {
        $unwind: '$eventDetails'
      },
      {
        $project: {
          _id: '$eventDetails._id',
          name: '$eventDetails.name',
          description: '$eventDetails.description',
          type: '$eventDetails.type',
          category: '$eventDetails.category',
          startDate: '$eventDetails.startDate',
          registrationCount: 1,
          poster: '$eventDetails.poster',
          tags: '$eventDetails.tags'
        }
      }
    ]);

    res.json(trendingEvents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= GET PARTICIPANT'S REGISTRATIONS =================
exports.getParticipantEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tab = 'upcoming' } = req.query;

    let registrationFilter = { participant: userId };
    let eventFilter = {};

    const now = new Date();

    // Filter based on tab
    if (tab === 'upcoming') {
      eventFilter.startDate = { $gt: now };
      registrationFilter.status = { $in: ['Registered', 'Confirmed', 'PendingApproval'] };
    } else if (tab === 'normal') {
      eventFilter.type = 'Normal';
      registrationFilter.status = { $nin: ['Cancelled', 'Rejected'] };
    } else if (tab === 'merchandise') {
      eventFilter.type = 'Merchandise';
      registrationFilter.status = { $nin: ['Cancelled', 'Rejected'] };
    } else if (tab === 'completed') {
      // Show events that have ended (regardless of registration status label)
      eventFilter.endDate = { $lt: now };
      registrationFilter.status = { $nin: ['Cancelled', 'Rejected'] };
    } else if (tab === 'cancelled') {
      registrationFilter.status = { $in: ['Cancelled', 'Rejected'] };
    }

    // Get registrations
    const registrations = await Registration.find(registrationFilter)
      .populate({
        path: 'event',
        match: eventFilter,
        select: 'name description type startDate endDate location category poster fee organizer isTeamEvent',
        populate: { path: 'organizer', select: 'clubName email' }
      })
      .populate('participant', 'email firstName lastName')
      .populate('team', 'name')
      .sort({ createdAt: -1 });

    // Filter out null events (didn't match eventFilter)
    const validRegistrations = registrations.filter(r => r.event !== null);

    // Format response
    const events = validRegistrations.map(reg => ({
      _id: reg._id,
      registrationId: reg._id,
      event: reg.event,
      ticketId: reg.ticketId,
      status: reg.status,
      paymentStatus: reg.payment.status,
      paymentProofUploaded: !!reg.payment.proofImage,
      formResponses: reg.formResponses,
      merchandisePurchase: reg.merchandisePurchase,
      teamName: reg.team?.name || null,
      registeredAt: reg.createdAt
    }));

    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= GET TICKET DETAILS =================
exports.getTicketDetails = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;

    // Find registration by ticket ID
    const registration = await Registration.findOne({ ticketId })
      .populate('event')
      .populate('participant', 'email interests');

    if (!registration) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Verify ownership
    if (registration.participant._id.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Try to regenerate QR data URL for display
    let qrCodeDataUrl = null;
    try {
      qrCodeDataUrl = await qrService.generateTicketQRDataUrl(
        registration.ticketId,
        {
          eventId: registration.event._id,
          eventName: registration.event.name,
          participantId: registration.participant._id,
          registeredAt: registration.createdAt
        }
      );
    } catch (e) {
      // QR generation may fail, continue without it
    }

    res.json({
      ticketId: registration.ticketId,
      event: registration.event,
      participant: registration.participant,
      status: registration.status,
      paymentStatus: registration.payment.status,
      checkInStatus: registration.checkedIn,
      checkInTime: registration.checkInTime,
      formResponses: registration.formResponses,
      merchandisePurchase: registration.merchandisePurchase,
      registeredAt: registration.createdAt,
      qrCode: qrCodeDataUrl
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= GET SINGLE EVENT =================
exports.getEventDetails = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId)
      .populate('organizer', 'email clubName');

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get registration count
    const registrationCount = await Registration.countDocuments({
      event: eventId,
      status: { $in: ['Registered', 'Confirmed', 'Completed'] }
    });

    res.json({
      ...event.toObject(),
      registrationCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= REGISTER FOR EVENT =================
exports.registerForEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { formResponses = {}, selectedVariants = [] } = req.body;

    // 1. Check if event exists
    const event = await Event.findById(eventId)
      .populate('organizer', 'email clubName firstName lastName');
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // 2. Check registration deadline
    const now = new Date();
    if (event.registrationDeadline && new Date(event.registrationDeadline) < now) {
      return res.status(400).json({ error: 'Registration deadline has passed' });
    }

    // 3. Get participant details for eligibility check
    const participant = await User.findById(userId);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // 4. Check eligibility
    const eligType = event.eligibility?.type || 'All';
    if (eligType !== 'All') {
      const email = participant.email || '';
      const domain = email.split('@')[1] || '';

      if (eligType === 'IIIT' && !domain.endsWith('iiit.ac.in')) {
        return res.status(403).json({ error: 'Only IIIT students (with @iiit.ac.in email) are eligible' });
      }

      if (eligType === 'Non-IIIT' && domain.endsWith('iiit.ac.in')) {
        return res.status(403).json({ error: 'Only Non-IIIT students are eligible for this event' });
      }
    }

    // 5. Check if already registered
    const existingRegistration = await Registration.findOne({
      event: eventId,
      participant: userId
    });

    if (existingRegistration) {
      return res.status(400).json({ error: 'Already registered for this event' });
    }

    // 6. Check capacity
    if (event.participantLimit) {
      const registrationCount = await Registration.countDocuments({
        event: eventId,
        status: { $in: ['Registered', 'Confirmed'] }
      });

      if (registrationCount >= event.participantLimit) {
        return res.status(400).json({ error: 'Event is full - registration capacity reached' });
      }
    }

    // 6b. Validate required custom form fields for Normal events
    if (event.type === 'Normal' && event.customForm && event.customForm.length > 0) {
      for (const field of event.customForm) {
        if (field.required) {
          const val = formResponses[field.fieldId];
          if (val === undefined || val === null || val === '' || val === false) {
            return res.status(400).json({ error: `Required field missing: ${field.label}` });
          }
        }
      }
    }

    // 7. Build merchandise purchase data if applicable
    let merchData = undefined;
    if (event.type === 'Merchandise') {
      if (!selectedVariants || selectedVariants.length === 0) {
        return res.status(400).json({ error: 'Please select at least one merchandise variant' });
      }

      // Enforce purchase limit set by organizer
      const purchaseLimit = event.merchandise?.purchaseLimit || 1;
      if (selectedVariants.length > purchaseLimit) {
        return res.status(400).json({ error: `You can select at most ${purchaseLimit} variant(s) per order` });
      }

      const items = [];
      let totalAmount = 0;
      for (const vid of selectedVariants) {
        const variant = event.merchandise?.variants?.find(v => v.variantId === vid);
        if (!variant) {
          return res.status(400).json({ error: `Variant ${vid} not found` });
        }
        if (variant.stock <= 0) {
          return res.status(400).json({ error: `${variant.name} is out of stock` });
        }
        const item = {
          variantId: variant.variantId,
          variantName: variant.name,
          quantity: 1,
          pricePerUnit: variant.price,
          totalPrice: variant.price
        };
        items.push(item);
        totalAmount += variant.price;
      }
      if (items.length === 0) {
        return res.status(400).json({ error: 'No valid variants selected' });
      }
      merchData = { items, totalAmount, purchaseDate: new Date() };
    }

    // 8. Create registration
    // Paid events (Merchandise OR Normal with fee > 0) go through PendingApproval pipeline
    const needsPaymentApproval = event.type === 'Merchandise' || event.fee > 0;
    const registration = new Registration({
      event: eventId,
      participant: userId,
      status: needsPaymentApproval ? 'PendingApproval' : 'Registered',
      formResponses: event.type === 'Normal' ? formResponses : undefined,
      merchandisePurchase: merchData,
      payment: {
        status: needsPaymentApproval ? 'PendingApproval' : 'Completed',
        amount: event.type === 'Merchandise' ? (merchData?.totalAmount || 0) : event.fee
      }
    });

    await registration.save();

    // 9. Update event registration count
    await Event.findByIdAndUpdate(eventId, {
      $inc: { totalRegistrations: 1 }
    });

    // 10. SEND RESPONSE IMMEDIATELY — don't block on QR/email/Discord
    res.status(201).json({
      message: 'Registered successfully!',
      registration: {
        _id: registration._id,
        ticketId: registration.ticketId,
        event: registration.event,
        status: registration.status,
        createdAt: registration.createdAt
      },
      ticketId: registration.ticketId
    });

    // 11. Async post-registration tasks (QR, email, Discord) — non-blocking
    // Skip QR/email for paid events — those are generated upon organizer approval
    if (!needsPaymentApproval) {
    (async () => {
      try {
        // Generate QR code
        let qrCodeDataUrl = null;
        try {
          const ticketData = {
            eventId: event._id,
            eventName: event.name,
            participantId: userId,
            participantName: participant.firstName + ' ' + participant.lastName,
            registeredAt: registration.createdAt
          };
          qrCodeDataUrl = await qrService.generateTicketQR(registration.ticketId, ticketData);
        } catch (qrError) {
          console.error('QR code generation error:', qrError);
        }

        // Send registration email
        try {
          await emailService.sendRegistrationEmail(participant.email, {
            ticketId: registration.ticketId,
            eventName: event.name,
            eventDate: event.startDate,
            location: event.location,
            participantName: (participant.firstName || '') + ' ' + (participant.lastName || ''),
            organizer: event.organizer?.clubName,
            qrCodeDataUrl
          });
        } catch (emailError) {
          console.error('Email sending error:', emailError);
        }

        // Send Discord webhook
        try {
          const organizer = await Organizer.findById(event.organizer._id || event.organizer);
          if (organizer?.discordWebhook) {
            sendDiscordNotification(organizer.discordWebhook, {
              type: 'registration',
              eventName: event.name,
              participantName: (participant.firstName || '') + ' ' + (participant.lastName || ''),
              participantEmail: participant.email,
              ticketId: registration.ticketId
            });
          }
        } catch (discordErr) {
          console.error('Discord webhook error:', discordErr);
        }
      } catch (asyncErr) {
        console.error('Post-registration async error:', asyncErr);
      }
    })();
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
};

// ================= UPLOAD PAYMENT PROOF =================
exports.uploadPaymentProof = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { proofImage } = req.body;

    if (!proofImage) {
      return res.status(400).json({ error: 'Payment proof image is required' });
    }

    // Validate base64 size (max ~5MB)
    if (proofImage.length > 7 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image is too large. Maximum 5MB allowed.' });
    }

    // Find the registration
    const registration = await Registration.findOne({
      event: eventId,
      participant: userId
    });

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    if (registration.status !== 'PendingApproval' && registration.payment.status !== 'PendingApproval') {
      return res.status(400).json({ error: 'Payment proof can only be uploaded for pending orders' });
    }

    registration.payment.proofImage = proofImage;
    await registration.save();

    res.json({ message: 'Payment proof uploaded successfully' });
  } catch (error) {
    console.error('Upload proof error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload proof' });
  }
};
