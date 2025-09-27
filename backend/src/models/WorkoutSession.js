const mongoose = require('mongoose');

const poseDataSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  keypoints: {
    // MediaPipe pose landmarks
    nose: { x: Number, y: Number, z: Number, visibility: Number },
    left_eye: { x: Number, y: Number, z: Number, visibility: Number },
    right_eye: { x: Number, y: Number, z: Number, visibility: Number },
    left_ear: { x: Number, y: Number, z: Number, visibility: Number },
    right_ear: { x: Number, y: Number, z: Number, visibility: Number },
    left_shoulder: { x: Number, y: Number, z: Number, visibility: Number },
    right_shoulder: { x: Number, y: Number, z: Number, visibility: Number },
    left_elbow: { x: Number, y: Number, z: Number, visibility: Number },
    right_elbow: { x: Number, y: Number, z: Number, visibility: Number },
    left_wrist: { x: Number, y: Number, z: Number, visibility: Number },
    right_wrist: { x: Number, y: Number, z: Number, visibility: Number },
    left_hip: { x: Number, y: Number, z: Number, visibility: Number },
    right_hip: { x: Number, y: Number, z: Number, visibility: Number },
    left_knee: { x: Number, y: Number, z: Number, visibility: Number },
    right_knee: { x: Number, y: Number, z: Number, visibility: Number },
    left_ankle: { x: Number, y: Number, z: Number, visibility: Number },
    right_ankle: { x: Number, y: Number, z: Number, visibility: Number }
  },
  angles: {
    left_knee_angle: Number,
    right_knee_angle: Number,
    left_hip_angle: Number,
    right_hip_angle: Number,
    back_angle: Number,
    left_elbow_angle: Number,
    right_elbow_angle: Number
  },
  repNumber: Number,
  phase: {
    type: String,
    enum: ['starting', 'descending', 'bottom', 'ascending', 'top', 'completed']
  }
});

const feedbackLogSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  repNumber: Number,
  errorType: {
    type: String,
    enum: [
      'shallow_depth', 'knees_inward', 'back_rounded', 'weight_forward',
      'uneven_stance', 'arms_position', 'head_position', 'tempo_too_fast'
    ]
  },
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'major'],
    default: 'moderate'
  },
  message: String,
  correctionGiven: String,
  userResponse: {
    type: String,
    enum: ['corrected', 'ignored', 'partial'],
    default: 'ignored'
  }
});

const workoutSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  exercise: {
    type: String,
    required: true,
    enum: ['squat', 'deadlift', 'pushup', 'pullup', 'lunge', 'plank', 'bicep_curl', 'shoulder_press']
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: Date,
  duration: Number, // in seconds
  
  // Workout metrics
  totalReps: { type: Number, default: 0 },
  completedReps: { type: Number, default: 0 },
  correctReps: { type: Number, default: 0 },
  formAccuracy: { type: Number, default: 0 }, // percentage
  
  // Detailed pose and feedback data
  poseData: [poseDataSchema],
  feedbackLog: [feedbackLogSchema],
  
  // Session summary
  commonErrors: [{
    errorType: String,
    count: Number,
    percentage: Number
  }],
  improvements: [{
    metric: String,
    previousValue: Number,
    currentValue: Number,
    improvement: Number
  }],
  
  // Session settings
  settings: {
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    feedbackMode: {
      type: String,
      enum: ['real_time', 'post_rep', 'post_set'],
      default: 'real_time'
    },
    audioFeedback: { type: Boolean, default: true },
    visualFeedback: { type: Boolean, default: true }
  },
  
  // Metadata
  deviceInfo: {
    platform: String,
    cameraResolution: String,
    frameRate: Number
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate form accuracy before saving
workoutSessionSchema.pre('save', function(next) {
  if (this.totalReps > 0) {
    this.formAccuracy = Math.round((this.correctReps / this.totalReps) * 100);
  }
  
  if (this.endTime && this.startTime) {
    this.duration = Math.round((this.endTime - this.startTime) / 1000);
  }
  
  next();
});

// Method to add pose data
workoutSessionSchema.methods.addPoseData = function(poseData) {
  this.poseData.push(poseData);
};

// Method to add feedback
workoutSessionSchema.methods.addFeedback = function(feedback) {
  this.feedbackLog.push(feedback);
};

// Method to calculate common errors
workoutSessionSchema.methods.calculateCommonErrors = function() {
  const errorCounts = {};
  
  this.feedbackLog.forEach(feedback => {
    if (feedback.errorType) {
      errorCounts[feedback.errorType] = (errorCounts[feedback.errorType] || 0) + 1;
    }
  });
  
  this.commonErrors = Object.entries(errorCounts).map(([errorType, count]) => ({
    errorType,
    count,
    percentage: Math.round((count / this.feedbackLog.length) * 100)
  })).sort((a, b) => b.count - a.count);
};

// Method to end session
workoutSessionSchema.methods.endSession = function() {
  this.endTime = new Date();
  this.calculateCommonErrors();
};

module.exports = mongoose.model('WorkoutSession', workoutSessionSchema);
