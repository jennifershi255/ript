const logger = require('../utils/logger');

class FormAnalyzer {
  constructor(exercise) {
    this.exercise = exercise;
    this.exerciseRules = this.getExerciseRules(exercise);
  }

  // Calculate angle between three points
  calculateAngle(point1, point2, point3) {
    const vector1 = {
      x: point1.x - point2.x,
      y: point1.y - point2.y
    };
    
    const vector2 = {
      x: point3.x - point2.x,
      y: point3.y - point2.y
    };

    const dot = vector1.x * vector2.x + vector1.y * vector2.y;
    const mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);

    const angle = Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
    return isNaN(angle) ? 0 : angle;
  }

  // Extract key angles from pose keypoints
  extractAngles(keypoints) {
    const angles = {};

    try {
      // Knee angles (hip-knee-ankle)
      if (keypoints.left_hip && keypoints.left_knee && keypoints.left_ankle) {
        angles.left_knee_angle = this.calculateAngle(
          keypoints.left_hip,
          keypoints.left_knee,
          keypoints.left_ankle
        );
      }

      if (keypoints.right_hip && keypoints.right_knee && keypoints.right_ankle) {
        angles.right_knee_angle = this.calculateAngle(
          keypoints.right_hip,
          keypoints.right_knee,
          keypoints.right_ankle
        );
      }

      // Hip angles (shoulder-hip-knee)
      if (keypoints.left_shoulder && keypoints.left_hip && keypoints.left_knee) {
        angles.left_hip_angle = this.calculateAngle(
          keypoints.left_shoulder,
          keypoints.left_hip,
          keypoints.left_knee
        );
      }

      if (keypoints.right_shoulder && keypoints.right_hip && keypoints.right_knee) {
        angles.right_hip_angle = this.calculateAngle(
          keypoints.right_shoulder,
          keypoints.right_hip,
          keypoints.right_knee
        );
      }

      // Back angle (shoulder-hip line relative to vertical)
      if (keypoints.left_shoulder && keypoints.right_shoulder && 
          keypoints.left_hip && keypoints.right_hip) {
        const shoulderMidpoint = {
          x: (keypoints.left_shoulder.x + keypoints.right_shoulder.x) / 2,
          y: (keypoints.left_shoulder.y + keypoints.right_shoulder.y) / 2
        };
        const hipMidpoint = {
          x: (keypoints.left_hip.x + keypoints.right_hip.x) / 2,
          y: (keypoints.left_hip.y + keypoints.right_hip.y) / 2
        };
        
        // Calculate angle from vertical (90 degrees = perfectly upright)
        const backVector = {
          x: shoulderMidpoint.x - hipMidpoint.x,
          y: shoulderMidpoint.y - hipMidpoint.y
        };
        angles.back_angle = Math.atan2(Math.abs(backVector.x), Math.abs(backVector.y)) * (180 / Math.PI);
      }

      // Elbow angles (shoulder-elbow-wrist)
      if (keypoints.left_shoulder && keypoints.left_elbow && keypoints.left_wrist) {
        angles.left_elbow_angle = this.calculateAngle(
          keypoints.left_shoulder,
          keypoints.left_elbow,
          keypoints.left_wrist
        );
      }

      if (keypoints.right_shoulder && keypoints.right_elbow && keypoints.right_wrist) {
        angles.right_elbow_angle = this.calculateAngle(
          keypoints.right_shoulder,
          keypoints.right_elbow,
          keypoints.right_wrist
        );
      }

    } catch (error) {
      logger.error('Error extracting angles:', error);
    }

    return angles;
  }

  // Analyze pose and provide feedback
  analyzePose(poseData, repNumber = 0) {
    const angles = this.extractAngles(poseData.keypoints);
    const feedback = this.evaluateForm(angles);
    const phase = this.detectRepPhase(angles, this.exercise);

    return {
      timestamp: new Date().toISOString(),
      repNumber,
      angles,
      phase,
      feedback: feedback.messages,
      corrections: feedback.corrections,
      formScore: feedback.score,
      isGoodForm: feedback.score >= 70
    };
  }

  // Evaluate form based on exercise-specific rules
  evaluateForm(angles) {
    const feedback = {
      messages: [],
      corrections: [],
      score: 100,
      errors: []
    };

    const rules = this.exerciseRules;

    // Check each rule
    rules.forEach(rule => {
      const result = rule.check(angles);
      if (!result.passed) {
        feedback.messages.push(result.message);
        feedback.corrections.push(result.correction);
        feedback.errors.push(result.errorType);
        feedback.score -= result.penalty;
      }
    });

    // Ensure score doesn't go below 0
    feedback.score = Math.max(0, feedback.score);

    return feedback;
  }

  // Detect which phase of the rep the user is in
  detectRepPhase(angles, exercise) {
    switch (exercise) {
      case 'squat':
        return this.detectSquatPhase(angles);
      case 'pushup':
        return this.detectPushupPhase(angles);
      case 'deadlift':
        return this.detectDeadliftPhase(angles);
      default:
        return 'unknown';
    }
  }

  detectSquatPhase(angles) {
    const avgKneeAngle = (angles.left_knee_angle + angles.right_knee_angle) / 2;
    
    if (avgKneeAngle > 160) return 'starting';
    if (avgKneeAngle > 120) return 'descending';
    if (avgKneeAngle <= 120 && avgKneeAngle >= 90) return 'bottom';
    if (avgKneeAngle > 90 && avgKneeAngle <= 160) return 'ascending';
    return 'completed';
  }

  detectPushupPhase(angles) {
    const avgElbowAngle = (angles.left_elbow_angle + angles.right_elbow_angle) / 2;
    
    if (avgElbowAngle > 160) return 'starting';
    if (avgElbowAngle > 120) return 'descending';
    if (avgElbowAngle <= 120 && avgElbowAngle >= 90) return 'bottom';
    if (avgElbowAngle > 90 && avgElbowAngle <= 160) return 'ascending';
    return 'completed';
  }

  detectDeadliftPhase(angles) {
    const avgHipAngle = (angles.left_hip_angle + angles.right_hip_angle) / 2;
    
    if (avgHipAngle < 90) return 'starting';
    if (avgHipAngle >= 90 && avgHipAngle < 140) return 'ascending';
    if (avgHipAngle >= 140) return 'top';
    return 'completed';
  }

  // Get exercise-specific rules
  getExerciseRules(exercise) {
    switch (exercise) {
      case 'squat':
        return this.getSquatRules();
      case 'pushup':
        return this.getPushupRules();
      case 'deadlift':
        return this.getDeadliftRules();
      default:
        return [];
    }
  }

  getSquatRules() {
    return [
      {
        name: 'knee_depth',
        check: (angles) => {
          const avgKneeAngle = (angles.left_knee_angle + angles.right_knee_angle) / 2;
          if (avgKneeAngle > 100) {
            return {
              passed: false,
              message: 'Go deeper in your squat',
              correction: 'Bend your knees more to reach proper depth',
              errorType: 'shallow_depth',
              penalty: 20
            };
          }
          return { passed: true };
        }
      },
      {
        name: 'back_posture',
        check: (angles) => {
          if (angles.back_angle > 30) {
            return {
              passed: false,
              message: 'Keep your back straighter',
              correction: 'Engage your core and maintain neutral spine',
              errorType: 'back_rounded',
              penalty: 25
            };
          }
          return { passed: true };
        }
      },
      {
        name: 'knee_alignment',
        check: (angles) => {
          const kneeDifference = Math.abs(angles.left_knee_angle - angles.right_knee_angle);
          if (kneeDifference > 15) {
            return {
              passed: false,
              message: 'Keep your knees aligned',
              correction: 'Ensure both knees track in the same direction',
              errorType: 'knees_inward',
              penalty: 15
            };
          }
          return { passed: true };
        }
      }
    ];
  }

  getPushupRules() {
    return [
      {
        name: 'elbow_depth',
        check: (angles) => {
          const avgElbowAngle = (angles.left_elbow_angle + angles.right_elbow_angle) / 2;
          if (avgElbowAngle > 120) {
            return {
              passed: false,
              message: 'Go lower in your pushup',
              correction: 'Lower your chest closer to the ground',
              errorType: 'shallow_depth',
              penalty: 20
            };
          }
          return { passed: true };
        }
      },
      {
        name: 'back_straight',
        check: (angles) => {
          if (angles.back_angle > 20) {
            return {
              passed: false,
              message: 'Keep your body in a straight line',
              correction: 'Engage your core to maintain plank position',
              errorType: 'back_rounded',
              penalty: 25
            };
          }
          return { passed: true };
        }
      }
    ];
  }

  getDeadliftRules() {
    return [
      {
        name: 'back_neutral',
        check: (angles) => {
          if (angles.back_angle > 25) {
            return {
              passed: false,
              message: 'Keep your back neutral',
              correction: 'Maintain natural spine curvature',
              errorType: 'back_rounded',
              penalty: 30
            };
          }
          return { passed: true };
        }
      },
      {
        name: 'hip_hinge',
        check: (angles) => {
          const avgHipAngle = (angles.left_hip_angle + angles.right_hip_angle) / 2;
          if (avgHipAngle > 160) {
            return {
              passed: false,
              message: 'Hinge more at the hips',
              correction: 'Push your hips back to initiate the movement',
              errorType: 'improper_hinge',
              penalty: 20
            };
          }
          return { passed: true };
        }
      }
    ];
  }

  // Get form guidelines for an exercise
  getFormGuidelines() {
    const guidelines = {
      squat: {
        keyPoints: [
          'Feet shoulder-width apart',
          'Knees track over toes',
          'Descend until thighs are parallel to ground',
          'Keep chest up and back straight',
          'Drive through heels to stand'
        ],
        commonMistakes: [
          'Not going deep enough',
          'Knees caving inward',
          'Leaning too far forward',
          'Rising on toes'
        ]
      },
      pushup: {
        keyPoints: [
          'Hands slightly wider than shoulders',
          'Body in straight line from head to heels',
          'Lower until chest nearly touches ground',
          'Push up explosively',
          'Keep core engaged throughout'
        ],
        commonMistakes: [
          'Sagging hips',
          'Not going low enough',
          'Flaring elbows too wide',
          'Looking up instead of down'
        ]
      },
      deadlift: {
        keyPoints: [
          'Feet hip-width apart',
          'Bar close to shins',
          'Neutral spine throughout',
          'Hinge at hips first',
          'Drive through heels'
        ],
        commonMistakes: [
          'Rounding the back',
          'Bar drifting away from body',
          'Not engaging lats',
          'Hyperextending at top'
        ]
      }
    };

    return guidelines[this.exercise] || { keyPoints: [], commonMistakes: [] };
  }

  // Analyze batch of poses for rep counting and overall session analysis
  analyzeBatch(poseFrames) {
    const analyses = poseFrames.map((frame, index) => 
      this.analyzePose(frame, index)
    );

    return {
      frameAnalyses: analyses,
      sessionSummary: this.generateSessionSummary(analyses)
    };
  }

  // Count reps from a sequence of poses
  countReps(poseSequence) {
    let repCount = 0;
    let currentPhase = 'starting';
    let repStarted = false;

    poseSequence.forEach(pose => {
      const angles = this.extractAngles(pose.keypoints);
      const phase = this.detectRepPhase(angles, this.exercise);

      // Rep counting logic based on phase transitions
      if (phase === 'starting' && currentPhase === 'completed') {
        repCount++;
        repStarted = false;
      } else if (phase === 'descending' && !repStarted) {
        repStarted = true;
      }

      currentPhase = phase;
    });

    return {
      totalReps: repCount,
      lastPhase: currentPhase
    };
  }

  // Generate session summary from multiple analyses
  generateSessionSummary(analyses) {
    const totalFrames = analyses.length;
    const goodFormFrames = analyses.filter(a => a.isGoodForm).length;
    const averageScore = analyses.reduce((sum, a) => sum + a.formScore, 0) / totalFrames;

    // Count error types
    const errorCounts = {};
    analyses.forEach(analysis => {
      analysis.corrections.forEach(correction => {
        const errorType = this.extractErrorType(correction);
        errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
      });
    });

    return {
      totalFrames,
      formAccuracy: Math.round((goodFormFrames / totalFrames) * 100),
      averageScore: Math.round(averageScore),
      commonErrors: Object.entries(errorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([error, count]) => ({ error, count, percentage: Math.round((count / totalFrames) * 100) }))
    };
  }

  // Extract error type from correction message
  extractErrorType(correction) {
    if (correction.includes('deeper') || correction.includes('lower')) return 'shallow_depth';
    if (correction.includes('back') || correction.includes('spine')) return 'back_posture';
    if (correction.includes('knee')) return 'knee_alignment';
    if (correction.includes('elbow')) return 'elbow_position';
    return 'other';
  }
}

module.exports = FormAnalyzer;
