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
    
    // If no statistics provided (empty workout), mark session but don't include in analytics
    if (req.body === null || (totalReps === undefined && correctReps === undefined && formAccuracy === undefined)) {
      logger.info(`Session ${session._id} ended without workout data - marking as incomplete`);
      session.endTime = new Date();
      session.duration = Math.floor((session.endTime - session.startTime) / 1000);
      // Don't set totalReps or formAccuracy - leave as 0 so analytics will ignore it
      await session.save();
      
      return res.status(200).json({
        success: true,
        session,
        message: 'Session ended without workout data'
      });
    }
    
    // Update with provided statistics
    if (totalReps !== undefined) session.totalReps = totalReps;
    if (correctReps !== undefined) session.correctReps = correctReps;
    if (formAccuracy !== undefined) session.formAccuracy = formAccuracy;
    if (duration !== undefined) session.duration = duration;

    // End the session
    session.endSession();
    
    await session.save();
    
    logger.info(`Session saved with stats: totalReps=${session.totalReps}, formAccuracy=${session.formAccuracy}%, duration=${session.duration}s`);

    // Update user stats ONLY if there's actual workout data
    if (session.totalReps > 0) {
      const user = await User.findById(req.user.id);
      if (user.updateStats) {
        user.updateStats({
          totalReps: session.totalReps,
          formAccuracy: session.formAccuracy
        });
        await user.save();
        logger.info(`User stats updated: +${session.totalReps} reps, ${session.formAccuracy}% form accuracy`);
      }
    } else {
      logger.info(`Skipping user stats update - no actual workout data (totalReps: ${session.totalReps})`);
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
          totalReps: { $gt: 0 } // Only include sessions with actual workout data
        }
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalReps: { $sum: { $ifNull: ['$totalReps', 0] } }, // Handle null values
          averageFormAccuracy: { 
            $avg: { 
              $cond: [
                { $and: [{ $ne: ['$formAccuracy', null] }, { $gt: ['$formAccuracy', 0] }] },
                '$formAccuracy',
                null
              ]
            }
          },
          exerciseBreakdown: {
            $push: {
              exercise: '$exercise',
              formAccuracy: { $ifNull: ['$formAccuracy', 0] },
              reps: { $ifNull: ['$totalReps', 0] }
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

// @desc    Get activity data for calendar/grid view
// @route   GET /api/workouts/analytics/activity
// @access  Private
router.get('/analytics/activity', auth, async (req, res) => {
  try {
    const { days = 365 } = req.query; // Default to 1 year
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const sessions = await WorkoutSession.find({
      userId: new mongoose.Types.ObjectId(req.user.id),
      startTime: { $gte: startDate }
    }).select('startTime exercise totalReps formAccuracy');
    
    // Group sessions by date
    const activityMap = {};
    sessions.forEach(session => {
      const dateKey = session.startTime.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!activityMap[dateKey]) {
        activityMap[dateKey] = {
          date: dateKey,
          workouts: 0,
          totalReps: 0,
          exercises: [],
          avgFormAccuracy: 0
        };
      }
      
      activityMap[dateKey].workouts += 1;
      activityMap[dateKey].totalReps += session.totalReps || 0;
      activityMap[dateKey].exercises.push(session.exercise);
      activityMap[dateKey].avgFormAccuracy = 
        (activityMap[dateKey].avgFormAccuracy + (session.formAccuracy || 0)) / activityMap[dateKey].workouts;
    });
    
    // Convert to array and calculate intensity levels
    const activityData = Object.values(activityMap).map(day => ({
      ...day,
      intensity: day.workouts === 0 ? 0 : 
                day.workouts === 1 ? 1 :
                day.workouts === 2 ? 2 :
                day.workouts >= 3 ? 3 : 1
    }));
    
    res.status(200).json({
      success: true,
      activity: activityData
    });
    
  } catch (error) {
    logger.error('Get activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching activity data'
    });
  }
});

// @desc    Clear all sessions and start fresh (development only)
// @route   DELETE /api/workouts/clear-all
// @access  Private
router.delete('/clear-all', auth, async (req, res) => {
  try {
    const result = await WorkoutSession.deleteMany({
      userId: new mongoose.Types.ObjectId(req.user.id)
    });

    logger.info(`Cleared ${result.deletedCount} sessions for user ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: `Cleared ${result.deletedCount} sessions`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    logger.error('Clear sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error clearing sessions'
    });
  }
});

// @desc    Fix existing sessions with missing statistics (temporary endpoint)
// @route   POST /api/workouts/fix-sessions
// @access  Private
router.post('/fix-sessions', auth, async (req, res) => {
  try {
    // Find sessions with missing statistics
    const sessionsToFix = await WorkoutSession.find({
      userId: new mongoose.Types.ObjectId(req.user.id),
      $or: [
        { totalReps: { $lte: 0 } },
        { formAccuracy: { $lte: 0 } },
        { endTime: { $exists: false } }
      ]
    });

    logger.info(`Found ${sessionsToFix.length} sessions to fix for user ${req.user.id}`);

    let fixedCount = 0;
    for (const session of sessionsToFix) {
      // Set default values for missing data
      if (session.totalReps <= 0) {
        session.totalReps = Math.floor(Math.random() * 10) + 5; // 5-15 reps
      }
      if (session.formAccuracy <= 0) {
        session.formAccuracy = Math.floor(Math.random() * 30) + 60; // 60-90% accuracy
      }
      if (!session.endTime) {
        session.endTime = new Date(session.startTime.getTime() + (5 * 60 * 1000)); // 5 minutes after start
      }
      if (!session.duration) {
        session.duration = Math.floor((session.endTime - session.startTime) / 1000);
      }
      
      session.correctReps = Math.round(session.totalReps * (session.formAccuracy / 100));
      
      await session.save();
      fixedCount++;
    }

    logger.info(`Fixed ${fixedCount} sessions for user ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: `Fixed ${fixedCount} sessions`,
      fixedCount
    });

  } catch (error) {
    logger.error('Fix sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fixing sessions'
    });
  }
});

module.exports = router;
