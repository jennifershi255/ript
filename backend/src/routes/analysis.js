const express = require('express');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const FormAnalyzer = require('../services/FormAnalyzer');
const AICoach = require('../services/AICoach');
const User = require('../models/User');

const router = express.Router();

// @desc    Analyze pose data for form feedback
// @route   POST /api/analysis/pose
// @access  Private
router.post('/pose', auth, async (req, res) => {
  try {
    const { poseData, exercise, repNumber, useAI = false } = req.body;

    if (!poseData || !exercise) {
      return res.status(400).json({
        success: false,
        message: 'Pose data and exercise type are required'
      });
    }

    const analyzer = new FormAnalyzer(exercise);
    let analysis;

    if (useAI) {
      // Get user profile for AI analysis
      const user = await User.findById(req.user.id);
      const userProfile = {
        id: user._id,
        fitnessLevel: user.profile?.fitnessLevel || 'beginner',
        age: user.profile?.age,
        goals: user.profile?.goals || [],
        totalWorkouts: user.stats?.totalWorkouts || 0
      };

      // Use AI-enhanced analysis
      analysis = await analyzer.analyzeWithAI(poseData, userProfile, repNumber);
    } else {
      // Use basic analysis
      analysis = analyzer.analyzePose(poseData, repNumber);
    }

    res.status(200).json({
      success: true,
      analysis
    });

  } catch (error) {
    logger.error('Pose analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error analyzing pose data'
    });
  }
});

// @desc    Get exercise-specific form guidelines
// @route   GET /api/analysis/guidelines/:exercise
// @access  Private
router.get('/guidelines/:exercise', auth, async (req, res) => {
  try {
    const { exercise } = req.params;
    
    const analyzer = new FormAnalyzer(exercise);
    const guidelines = analyzer.getFormGuidelines();

    res.status(200).json({
      success: true,
      guidelines
    });

  } catch (error) {
    logger.error('Get guidelines error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching form guidelines'
    });
  }
});

// @desc    Batch analyze multiple pose frames
// @route   POST /api/analysis/batch
// @access  Private
router.post('/batch', auth, async (req, res) => {
  try {
    const { poseFrames, exercise } = req.body;

    if (!poseFrames || !Array.isArray(poseFrames) || !exercise) {
      return res.status(400).json({
        success: false,
        message: 'Pose frames array and exercise type are required'
      });
    }

    const analyzer = new FormAnalyzer(exercise);
    const batchAnalysis = analyzer.analyzeBatch(poseFrames);

    res.status(200).json({
      success: true,
      analysis: batchAnalysis
    });

  } catch (error) {
    logger.error('Batch analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error analyzing pose batch'
    });
  }
});

// @desc    Get rep counting analysis
// @route   POST /api/analysis/rep-count
// @access  Private
router.post('/rep-count', auth, async (req, res) => {
  try {
    const { poseSequence, exercise } = req.body;

    if (!poseSequence || !Array.isArray(poseSequence) || !exercise) {
      return res.status(400).json({
        success: false,
        message: 'Pose sequence array and exercise type are required'
      });
    }

    const analyzer = new FormAnalyzer(exercise);
    const repCount = analyzer.countReps(poseSequence);

    res.status(200).json({
      success: true,
      repCount
    });

  } catch (error) {
    logger.error('Rep counting error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error counting reps'
    });
  }
});

// @desc    Get AI-powered workout recommendations
// @route   POST /api/analysis/ai-recommendations
// @access  Private
router.post('/ai-recommendations', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { recentSessions = [], goals = [] } = req.body;

    const aiCoach = new AICoach();
    const userStats = {
      userId: user._id,
      totalWorkouts: user.stats?.totalWorkouts || 0,
      totalReps: user.stats?.totalReps || 0,
      averageFormAccuracy: user.stats?.averageFormAccuracy || 0
    };

    const recommendations = await aiCoach.generateWorkoutRecommendations(
      userStats,
      recentSessions,
      goals.length > 0 ? goals : user.profile?.goals || []
    );

    res.status(200).json({
      success: true,
      recommendations
    });

  } catch (error) {
    logger.error('AI recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating recommendations'
    });
  }
});

// @desc    Analyze completed workout session with AI
// @route   POST /api/analysis/ai-session-analysis
// @access  Private
router.post('/ai-session-analysis', auth, async (req, res) => {
  try {
    const { sessionData } = req.body;

    if (!sessionData) {
      return res.status(400).json({
        success: false,
        message: 'Session data is required'
      });
    }

    const user = await User.findById(req.user.id);
    const userProfile = {
      id: user._id,
      fitnessLevel: user.profile?.fitnessLevel || 'beginner',
      totalWorkouts: user.stats?.totalWorkouts || 0
    };

    const aiCoach = new AICoach();
    const analysis = await aiCoach.analyzeWorkoutSession(sessionData, userProfile);

    res.status(200).json({
      success: true,
      analysis
    });

  } catch (error) {
    logger.error('AI session analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error analyzing session'
    });
  }
});

// @desc    Get personalized coaching tips
// @route   GET /api/analysis/coaching-tips/:exercise
// @access  Private
router.get('/coaching-tips/:exercise', auth, async (req, res) => {
  try {
    const { exercise } = req.params;
    const user = await User.findById(req.user.id);

    const aiCoach = new AICoach();
    
    // Create mock analysis data for general tips
    const mockAnalysis = {
      formScore: 75,
      phase: 'starting',
      repNumber: 1,
      angles: {},
      feedback: []
    };

    const userProfile = {
      id: user._id,
      fitnessLevel: user.profile?.fitnessLevel || 'beginner',
      age: user.profile?.age,
      goals: user.profile?.goals || [],
      totalWorkouts: user.stats?.totalWorkouts || 0
    };

    const coaching = await aiCoach.generateCoachingFeedback(
      mockAnalysis,
      userProfile,
      exercise
    );

    res.status(200).json({
      success: true,
      coaching
    });

  } catch (error) {
    logger.error('Coaching tips error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting coaching tips'
    });
  }
});

module.exports = router;
