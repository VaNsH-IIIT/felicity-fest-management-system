require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Routes
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const participantRoutes = require('./routes/participantRoutes');
const organizerRoutes = require('./routes/organizerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const teamRoutes = require('./routes/teamRoutes');
const forumRoutes = require('./routes/forumRoutes');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = FRONTEND_URL.split(',').map(u => u.trim());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io accessible to routes
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('joinEventForum', (eventId) => {
    socket.join(`event_${eventId}`);
    console.log(`Socket ${socket.id} joined event_${eventId}`);
  });

  socket.on('leaveEventForum', (eventId) => {
    socket.leave(`event_${eventId}`);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// Middleware
const path = require('path');
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Serve static files (QR codes, etc.)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/participant', participantRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/forum', forumRoutes);

// Error handling middleware (must be AFTER routes)
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server after DB connects
const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed admin account if it doesn't exist
    try {
      const Admin = require('./models/Admin');
      const existing = await Admin.findOne({ role: 'Admin' });
      if (!existing) {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'supersecurepassword';
        const admin = new Admin({ email: adminEmail, password: adminPassword });
        await admin.save();
        console.log('✅ Admin account seeded:', adminEmail);
      }
    } catch (seedErr) {
      console.error('Admin seed error (non-fatal):', seedErr.message);
    }

    // Auto-update event statuses on startup and every 5 minutes
    const { autoUpdateEventStatuses } = require('./utils/autoStatusUpdate');
    autoUpdateEventStatuses(); // run immediately
    setInterval(autoUpdateEventStatuses, 5 * 60 * 1000); // every 5 min

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () =>
      console.log(`✅ Backend running on http://localhost:${PORT}`)
    );

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

startServer();
