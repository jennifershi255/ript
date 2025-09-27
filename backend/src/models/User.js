const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
    maxlength: [50, 'Username cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },
  profile: {
    firstName: String,
    lastName: String,
    age: Number,
    height: Number, // in cm
    weight: Number, // in kg
    fitnessLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    goals: [{
      type: String,
      enum: ['strength', 'endurance', 'flexibility', 'weight_loss', 'muscle_gain']
    }],
    avatar: String
  },
  preferences: {
    units: {
      type: String,
      enum: ['metric', 'imperial'],
      default: 'metric'
    },
    notifications: {
      workout_reminders: { type: Boolean, default: true },
      progress_updates: { type: Boolean, default: true },
      form_corrections: { type: Boolean, default: true }
    },
    privacy: {
      share_progress: { type: Boolean, default: false },
      public_profile: { type: Boolean, default: false }
    }
  },
  stats: {
    totalWorkouts: { type: Number, default: 0 },
    totalReps: { type: Number, default: 0 },
    averageFormAccuracy: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },
    lastWorkout: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update user stats
userSchema.methods.updateStats = function(workoutData) {
  this.stats.totalWorkouts += 1;
  this.stats.totalReps += workoutData.totalReps || 0;
  
  // Calculate new average form accuracy
  const currentAvg = this.stats.averageFormAccuracy;
  const newAccuracy = workoutData.formAccuracy || 0;
  this.stats.averageFormAccuracy = ((currentAvg * (this.stats.totalWorkouts - 1)) + newAccuracy) / this.stats.totalWorkouts;
  
  // Update streak (simplified logic)
  const previousWorkout = this.stats.lastWorkout;
  const today = new Date();
  
  if (previousWorkout) {
    const diffTime = Math.abs(today - previousWorkout);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      this.stats.streakDays += 1;
    } else if (diffDays > 1) {
      this.stats.streakDays = 1;
    }
    // If diffDays === 0 (same day), keep current streak
  } else {
    // First workout
    this.stats.streakDays = 1;
  }
  
  // Update last workout date
  this.stats.lastWorkout = today;
};

module.exports = mongoose.model('User', userSchema);
