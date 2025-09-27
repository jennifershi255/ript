const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const workoutRoutes = require('./routes/workouts');
const analysisRoutes = require('./routes/analysis');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000', 'http://localhost:19006', 'http://10.36.139.76:8081', 'exp://10.36.139.76:8081'],
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:19006', 'http://10.36.139.76:8081', 'exp://10.36.139.76:8081'],
  credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: '🏋️‍♀️ AI Workout Coach API',
    status: 'Running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      workouts: '/api/workouts',
      analysis: '/api/analysis'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/analysis', analysisRoutes);

// Socket.IO for real-time pose analysis
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('pose-data', (data) => {
    // Handle real-time pose data from frontend
    // Process pose analysis and send feedback
    const feedback = processPoseData(data);
    socket.emit('pose-feedback', feedback);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Placeholder for pose processing function
function processPoseData(poseData) {
  // This will be implemented with the form analysis engine
  return {
    timestamp: new Date().toISOString(),
    feedback: 'Processing pose data...',
    angles: {},
    corrections: []
  };
}

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  logger.info('Connected to MongoDB');
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
})
.catch((error) => {
  logger.error('MongoDB connection error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

module.exports = { app, server, io };
