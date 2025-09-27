// This file can be used to export all routes if needed
const authRoutes = require('./auth');
const userRoutes = require('./users');
const workoutRoutes = require('./workouts');
const analysisRoutes = require('./analysis');

module.exports = {
  authRoutes,
  userRoutes,
  workoutRoutes,
  analysisRoutes
};
