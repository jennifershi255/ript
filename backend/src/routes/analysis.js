const express = require('express');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const FormAnalyzer = require('../services/FormAnalyzer');

const router = express.Router();

// @desc    Analyze pose data for form feedback
// @route   POST /api/analysis/pose
// @access  Private
router.post('/pose', auth, async (req, res) => {
  try {
    const { poseData, exercise, repNumber } = req.body;

    if (!poseData || !exercise) {
      return res.status(400).json({
        success: false,
        message: 'Pose data and exercise type are required'
      });
    }

    // Analyze the pose using our form analyzer
    const analyzer = new FormAnalyzer(exercise);
    const analysis = analyzer.analyzePose(poseData, repNumber);

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

module.exports = router;
