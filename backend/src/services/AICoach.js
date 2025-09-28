const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class AICoach {
  constructor() {
    // Initialize Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('GEMINI_API_KEY not found. AI coaching features will be limited.');
      this.genAI = null;
      this.model = null;
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    // Exercise-specific coaching knowledge
    this.exerciseKnowledge = {
      squat: {
        commonIssues: [
          'knee valgus (knees caving in)',
          'forward lean (chest dropping)',
          'insufficient depth',
          'heel lifting',
          'asymmetrical movement'
        ],
        keyPoints: [
          'Keep knees aligned with toes',
          'Maintain neutral spine',
          'Descend to hip crease below knee',
          'Drive through heels',
          'Keep chest up and core engaged'
        ],
        phases: ['starting', 'descending', 'bottom', 'ascending', 'completed']
      },
      deadlift: {
        commonIssues: [
          'rounded back',
          'bar drift from body',
          'hyperextension at top',
          'knee lockout timing',
          'uneven hip hinge'
        ],
        keyPoints: [
          'Maintain neutral spine throughout',
          'Keep bar close to body',
          'Hip hinge movement pattern',
          'Simultaneous hip and knee extension',
          'Controlled eccentric phase'
        ]
      },
      pushup: {
        commonIssues: [
          'sagging hips',
          'flared elbows',
          'partial range of motion',
          'head position',
          'uneven hand placement'
        ],
        keyPoints: [
          'Maintain plank position',
          'Elbows at 45-degree angle',
          'Full range of motion',
          'Neutral head position',
          'Controlled movement tempo'
        ]
      }
    };
  }

  /**
   * Generate AI-powered coaching feedback based on pose analysis
   * @param {Object} analysisData - Pose analysis data from FormAnalyzer
   * @param {Object} userProfile - User's fitness profile and history
   * @param {string} exercise - Exercise type
   * @returns {Promise<Object>} Enhanced coaching feedback
   */
  async generateCoachingFeedback(analysisData, userProfile, exercise) {
    try {
      if (!this.model) {
        return this.getFallbackFeedback(analysisData, exercise);
      }

      const prompt = this.buildCoachingPrompt(analysisData, userProfile, exercise);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const aiText = response.text();

      // Parse AI response and structure it
      const coaching = this.parseCoachingResponse(aiText, analysisData);
      
      logger.info(`AI coaching generated for ${exercise}:`, {
        userId: userProfile.id,
        formScore: analysisData.formScore,
        feedbackLength: coaching.feedback.length
      });

      return coaching;

    } catch (error) {
      logger.error('AI coaching generation error:', error);
      return this.getFallbackFeedback(analysisData, exercise);
    }
  }

  /**
   * Generate personalized workout recommendations
   * @param {Object} userStats - User's workout statistics
   * @param {Array} recentSessions - Recent workout sessions
   * @param {Object} userGoals - User's fitness goals
   * @returns {Promise<Object>} Personalized recommendations
   */
  async generateWorkoutRecommendations(userStats, recentSessions, userGoals) {
    try {
      if (!this.model) {
        return this.getFallbackRecommendations(userStats);
      }

      const prompt = this.buildRecommendationPrompt(userStats, recentSessions, userGoals);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const aiText = response.text();

      const recommendations = this.parseRecommendations(aiText);
      
      logger.info('AI workout recommendations generated:', {
        userId: userStats.userId,
        recommendationCount: recommendations.exercises.length
      });

      return recommendations;

    } catch (error) {
      logger.error('AI recommendation generation error:', error);
      return this.getFallbackRecommendations(userStats);
    }
  }

  /**
   * Analyze workout session and provide insights
   * @param {Object} sessionData - Complete workout session data
   * @param {Object} userProfile - User profile information
   * @returns {Promise<Object>} Session insights and analysis
   */
  async analyzeWorkoutSession(sessionData, userProfile) {
    try {
      if (!this.model) {
        return this.getFallbackSessionAnalysis(sessionData);
      }

      const prompt = this.buildSessionAnalysisPrompt(sessionData, userProfile);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const aiText = response.text();

      const analysis = this.parseSessionAnalysis(aiText, sessionData);
      
      logger.info('AI session analysis generated:', {
        userId: userProfile.id,
        exercise: sessionData.exercise,
        totalReps: sessionData.totalReps
      });

      return analysis;

    } catch (error) {
      logger.error('AI session analysis error:', error);
      return this.getFallbackSessionAnalysis(sessionData);
    }
  }

  /**
   * Build coaching prompt for Gemini API
   */
  buildCoachingPrompt(analysisData, userProfile, exercise) {
    const exerciseInfo = this.exerciseKnowledge[exercise] || {};
    
    return `You are an expert fitness coach analyzing a ${exercise} exercise. 

USER PROFILE:
- Fitness Level: ${userProfile.fitnessLevel || 'beginner'}
- Age: ${userProfile.age || 'not specified'}
- Goals: ${userProfile.goals?.join(', ') || 'general fitness'}
- Total Workouts: ${userProfile.totalWorkouts || 0}

CURRENT ANALYSIS:
- Form Score: ${analysisData.formScore}/100
- Phase: ${analysisData.phase}
- Rep Number: ${analysisData.repNumber}
- Key Angles: ${JSON.stringify(analysisData.angles)}
- Current Feedback: ${analysisData.feedback?.join(', ') || 'none'}

EXERCISE KNOWLEDGE:
- Common Issues: ${exerciseInfo.commonIssues?.join(', ') || 'general form issues'}
- Key Points: ${exerciseInfo.keyPoints?.join(', ') || 'proper form fundamentals'}

Please provide coaching feedback in this JSON format:
{
  "primaryFeedback": "Main coaching point (1-2 sentences)",
  "technicalCues": ["specific technique cue 1", "specific technique cue 2"],
  "encouragement": "Motivational message",
  "nextSteps": "What to focus on next",
  "formRating": "excellent|good|needs_improvement|poor",
  "priority": "high|medium|low"
}

Focus on being encouraging while providing specific, actionable feedback. Consider the user's fitness level and make suggestions appropriate for their experience.`;
  }

  /**
   * Build workout recommendation prompt
   */
  buildRecommendationPrompt(userStats, recentSessions, userGoals) {
    const recentExercises = recentSessions.map(s => s.exercise).join(', ');
    const avgAccuracy = userStats.averageFormAccuracy || 0;
    
    return `You are a fitness coach creating personalized workout recommendations.

USER STATISTICS:
- Total Workouts: ${userStats.totalWorkouts || 0}
- Total Reps: ${userStats.totalReps || 0}
- Average Form Accuracy: ${avgAccuracy}%
- Recent Exercises: ${recentExercises || 'none'}
- Fitness Goals: ${userGoals?.join(', ') || 'general fitness'}

Based on this data, recommend 3-5 exercises for their next workout. Consider:
1. Exercise variety and progression
2. Form accuracy trends
3. User's stated goals
4. Appropriate difficulty level

Provide recommendations in this JSON format:
{
  "exercises": [
    {
      "name": "exercise_name",
      "reason": "why this exercise is recommended",
      "sets": 3,
      "reps": "8-12",
      "difficulty": "beginner|intermediate|advanced",
      "focusAreas": ["area1", "area2"]
    }
  ],
  "overallStrategy": "Brief explanation of the workout strategy",
  "progressionTips": "How to progress over time"
}`;
  }

  /**
   * Build session analysis prompt
   */
  buildSessionAnalysisPrompt(sessionData, userProfile) {
    return `Analyze this completed workout session as an expert fitness coach.

SESSION DATA:
- Exercise: ${sessionData.exercise}
- Total Reps: ${sessionData.totalReps}
- Correct Reps: ${sessionData.correctReps || 0}
- Form Accuracy: ${sessionData.formAccuracy}%
- Duration: ${sessionData.duration || 0} seconds
- Common Errors: ${sessionData.commonErrors?.join(', ') || 'none recorded'}

USER CONTEXT:
- Fitness Level: ${userProfile.fitnessLevel || 'beginner'}
- Previous Sessions: ${userProfile.totalWorkouts || 0}

Provide analysis in this JSON format:
{
  "performance": "excellent|good|average|needs_improvement",
  "keyStrengths": ["strength1", "strength2"],
  "areasToImprove": ["area1", "area2"],
  "progressIndicators": "How this compares to typical progress",
  "nextSessionFocus": "What to emphasize next time",
  "motivationalMessage": "Encouraging message about their progress"
}`;
  }

  /**
   * Parse AI coaching response
   */
  parseCoachingResponse(aiText, analysisData) {
    try {
      // Extract JSON from AI response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          feedback: [parsed.primaryFeedback],
          technicalCues: parsed.technicalCues || [],
          encouragement: parsed.encouragement,
          nextSteps: parsed.nextSteps,
          formRating: parsed.formRating || 'good',
          priority: parsed.priority || 'medium',
          aiGenerated: true,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.warn('Failed to parse AI coaching response:', error);
    }

    // Fallback to basic parsing
    return {
      feedback: [aiText.substring(0, 200) + '...'],
      aiGenerated: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Parse AI recommendations
   */
  parseRecommendations(aiText) {
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.warn('Failed to parse AI recommendations:', error);
    }

    return this.getFallbackRecommendations();
  }

  /**
   * Parse session analysis
   */
  parseSessionAnalysis(aiText, sessionData) {
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          sessionId: sessionData._id,
          aiGenerated: true,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.warn('Failed to parse AI session analysis:', error);
    }

    return this.getFallbackSessionAnalysis(sessionData);
  }

  /**
   * Fallback feedback when AI is unavailable
   */
  getFallbackFeedback(analysisData, exercise) {
    const exerciseInfo = this.exerciseKnowledge[exercise] || {};
    const score = analysisData.formScore || 0;

    let feedback = [];
    if (score >= 80) {
      feedback.push("Great form! Keep maintaining this technique.");
    } else if (score >= 60) {
      feedback.push("Good effort! Focus on the key movement patterns.");
    } else {
      feedback.push("Let's work on improving your form step by step.");
    }

    return {
      feedback,
      technicalCues: exerciseInfo.keyPoints?.slice(0, 2) || [],
      formRating: score >= 80 ? 'good' : score >= 60 ? 'needs_improvement' : 'poor',
      aiGenerated: false,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Fallback recommendations
   */
  getFallbackRecommendations(userStats) {
    return {
      exercises: [
        {
          name: "squat",
          reason: "Fundamental lower body movement",
          sets: 3,
          reps: "8-12",
          difficulty: "beginner"
        },
        {
          name: "pushup",
          reason: "Upper body strength development",
          sets: 3,
          reps: "5-10",
          difficulty: "beginner"
        }
      ],
      overallStrategy: "Focus on mastering basic movement patterns",
      aiGenerated: false
    };
  }

  /**
   * Fallback session analysis
   */
  getFallbackSessionAnalysis(sessionData) {
    const accuracy = sessionData.formAccuracy || 0;
    
    return {
      performance: accuracy >= 80 ? 'good' : accuracy >= 60 ? 'average' : 'needs_improvement',
      keyStrengths: ["Completed the workout session"],
      areasToImprove: accuracy < 80 ? ["Form consistency"] : [],
      aiGenerated: false,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = AICoach;
