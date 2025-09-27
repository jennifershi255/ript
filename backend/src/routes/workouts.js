const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const WorkoutSession = require('../models/WorkoutSession');
const User = require('../models/User');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Start a new workout session
// @route   POST /api/workouts/start
// @access  Private
router.post('/start', auth, [
  body('exercise').isIn(['squat', 'deadlift', 'pushup', 'pullup', 'lunge', 'plank', 'bicep_curl', 'shoulder_press'])
    .withMessage('Invalid exercise type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { exercise, settings, deviceInfo } = req.body;

    const workoutSession = await WorkoutSession.create({
      userId: req.user.id,
      exercise,
      settings: settings || {},
      deviceInfo: deviceInfo || {}
    });

    logger.info(`Workout session started: ${workoutSession._id} for user ${req.user.id}`);

    res.status(201).json({
      success: true,
      session: workoutSession
    });

  } catch (error) {
    logger.error('Start workout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error starting workout session'
    });
  }
});

// @desc    End a workout session
// @route   PUT /api/workouts/:sessionId/end
// @access  Private
router.put('/:sessionId/end', auth, async (req, res) => {
  try {
    const session = await WorkoutSession.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Workout session not found'
      });
    }

    // Check if user owns this session
    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to end this session'
      });
    }

    // Update session with final statistics from request body if provided
    const { totalReps, correctReps, formAccuracy, duration } = req.body;
    
    if (totalReps !== undefined) session.totalReps = totalReps;
    if (correctReps !== undefined) session.correctReps = correctReps;
    if (formAccuracy !== undefined) session.formAccuracy = formAccuracy;
    if (duration !== undefined) session.duration = duration;

    // End the session
    session.endSession();
    await session.save();

    // Update user stats
    const user = await User.findById(req.user.id);
    if (user.updateStats) {
      user.updateStats({
        totalReps: session.totalReps,
        formAccuracy: session.formAccuracy
      });
      await user.save();
    }

    logger.info(`Workout session ended: ${session._id} - ${session.totalReps} reps, ${session.formAccuracy}% accuracy`);

    res.status(200).json({
      success: true,
      session
    });

  } catch (error) {
    logger.error('End workout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error ending workout session'
    });
  }
});

// @desc    Add pose data to workout session
// @route   POST /api/workouts/:sessionId/pose-data
// @access  Private
router.post('/:sessionId/pose-data', auth, async (req, res) => {
  try {
    const session = await WorkoutSession.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Workout session not found'
      });
    }

    // Check if user owns this session
    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add data to this session'
      });
    }

    const { poseData } = req.body;
    session.addPoseData(poseData);
    await session.save();

    res.status(200).json({
      success: true,
      message: 'Pose data added successfully'
    });

  } catch (error) {
    logger.error('Add pose data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding pose data'
    });
  }
});

// @desc    Add feedback to workout session
// @route   POST /api/workouts/:sessionId/feedback
// @access  Private
router.post('/:sessionId/feedback', auth, async (req, res) => {
  try {
    const session = await WorkoutSession.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Workout session not found'
      });
    }

    // Check if user owns this session
    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add feedback to this session'
      });
    }

    const { feedback } = req.body;
    session.addFeedback(feedback);
    await session.save();

    res.status(200).json({
      success: true,
      message: 'Feedback added successfully'
    });

  } catch (error) {
    logger.error('Add feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding feedback'
    });
  }
});

// @desc    Get user's workout sessions
// @route   GET /api/workouts
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, exercise, startDate, endDate } = req.query;

    // Build query
    const query = { userId: req.user.id };
    
    if (exercise) {
      query.exercise = exercise;
    }
    
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    const sessions = await WorkoutSession.find(query)
      .sort({ startTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-poseData'); // Exclude detailed pose data for list view

    const total = await WorkoutSession.countDocuments(query);

    res.status(200).json({
      success: true,
      sessions,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    logger.error('Get workouts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching workout sessions'
    });
  }
});

// @desc    Get specific workout session
// @route   GET /api/workouts/:sessionId
// @access  Private
router.get('/:sessionId', auth, async (req, res) => {
  try {
    const session = await WorkoutSession.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Workout session not found'
      });
    }

    // Check if user owns this session
    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this session'
      });
    }

    res.status(200).json({
      success: true,
      session
    });

  } catch (error) {
    logger.error('Get workout session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching workout session'
    });
  }
});

// @desc    Get workout analytics
// @route   GET /api/workouts/analytics/summary
// @access  Private
router.get('/analytics/summary', auth, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    logger.info(`Getting analytics for user ${req.user.id} for period ${period}`);
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // First, let's check how many sessions exist for this user
    const totalSessionsCount = await WorkoutSession.countDocuments({ 
      userId: new mongoose.Types.ObjectId(req.user.id) 
    });
    
    logger.info(`Total sessions for user ${req.user.id}: ${totalSessionsCount}`);

    const analytics = await WorkoutSession.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.id),
          startTime: { $gte: startDate },
          endTime: { $exists: true } // Only include completed sessions
        }
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalReps: { $sum: '$totalReps' },
          averageFormAccuracy: { $avg: '$formAccuracy' },
          exerciseBreakdown: {
            $push: {
              exercise: '$exercise',
              formAccuracy: '$formAccuracy',
              reps: '$totalReps'
            }
          }
        }
      }
    ]);

    const result = analytics[0] || {
      totalSessions: 0,
      totalReps: 0,
      averageFormAccuracy: 0,
      exerciseBreakdown: []
    };

    logger.info(`Analytics result for user ${req.user.id}:`, result);

    res.status(200).json({
      success: true,
      analytics: result
    });

  } catch (error) {
    logger.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching analytics'
    });
  }
});

module.exports = router;
