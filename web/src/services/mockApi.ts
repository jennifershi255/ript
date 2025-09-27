// Mock API service for when backend is not accessible
// This simulates the backend responses for testing purposes

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock user data
const mockUsers = [
  {
    id: '1',
    username: 'demo',
    email: 'demo@aiworkout.com',
    profile: {
      firstName: 'Demo',
      lastName: 'User',
      age: 25,
      height: 175,
      weight: 70,
      fitnessLevel: 'intermediate'
    },
    stats: {
      totalWorkouts: 15,
      totalReps: 450,
      averageFormAccuracy: 85,
      streakDays: 7
    }
  }
];

// Mock workout sessions
const mockWorkoutSessions = [
  {
    _id: '1',
    exercise: 'squat',
    startTime: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    totalReps: 20,
    correctReps: 17,
    formAccuracy: 85,
    duration: 300
  },
  {
    _id: '2',
    exercise: 'pushup',
    startTime: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    totalReps: 15,
    correctReps: 13,
    formAccuracy: 87,
    duration: 240
  }
];

export const mockAuthAPI = {
  login: async (email: string, password: string) => {
    await delay(1000); // Simulate network delay
    
    const user = mockUsers.find(u => u.email === email);
    if (user && password === 'demo123') {
      return {
        success: true,
        token: 'mock-jwt-token-12345',
        user
      };
    }
    
    throw new Error('Invalid credentials');
  },

  register: async (userData: any) => {
    await delay(1000);
    
    // Check if user already exists
    const existingUser = mockUsers.find(u => u.email === userData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    const newUser = {
      id: Date.now().toString(),
      username: userData.username,
      email: userData.email,
      profile: userData.profile || {
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        fitnessLevel: 'beginner'
      },
      stats: {
        totalWorkouts: 0,
        totalReps: 0,
        averageFormAccuracy: 0,
        streakDays: 0
      }
    };
    
    mockUsers.push(newUser);
    
    return {
      success: true,
      token: 'mock-jwt-token-' + Date.now(),
      user: newUser
    };
  },

  getCurrentUser: async () => {
    await delay(500);
    return {
      success: true,
      user: mockUsers[0] // Return demo user
    };
  }
};

export const mockWorkoutAPI = {
  startSession: async (sessionData: any) => {
    await delay(800);
    
    const session = {
      _id: Date.now().toString(),
      userId: '1',
      exercise: sessionData.exercise,
      startTime: new Date().toISOString(),
      totalReps: 0,
      correctReps: 0,
      formAccuracy: 0,
      settings: sessionData.settings || {}
    };
    
    return {
      success: true,
      session
    };
  },

  endSession: async (sessionId: string) => {
    await delay(800);
    
    const session = {
      _id: sessionId,
      endTime: new Date().toISOString(),
      totalReps: Math.floor(Math.random() * 20) + 10,
      correctReps: Math.floor(Math.random() * 15) + 8,
      formAccuracy: Math.floor(Math.random() * 20) + 75,
      duration: Math.floor(Math.random() * 300) + 180
    };
    
    session.formAccuracy = Math.round((session.correctReps / session.totalReps) * 100);
    
    return {
      success: true,
      session
    };
  },

  getWorkoutHistory: async (params: any = {}) => {
    await delay(600);
    
    return {
      success: true,
      sessions: mockWorkoutSessions,
      pagination: {
        current: 1,
        pages: 1,
        total: mockWorkoutSessions.length
      }
    };
  },

  getAnalytics: async (period: string = '30d') => {
    await delay(700);
    
    return {
      success: true,
      analytics: {
        totalSessions: 15,
        totalReps: 450,
        averageFormAccuracy: 85,
        exerciseBreakdown: [
          { exercise: 'squat', formAccuracy: 85, reps: 200 },
          { exercise: 'pushup', formAccuracy: 87, reps: 150 },
          { exercise: 'deadlift', formAccuracy: 82, reps: 100 }
        ]
      }
    };
  },

  addPoseData: async (sessionId: string, poseData: any) => {
    await delay(100);
    return { success: true };
  },

  addFeedback: async (sessionId: string, feedback: any) => {
    await delay(100);
    return { success: true };
  }
};

export const mockAnalysisAPI = {
  analyzePose: async (poseData: any, exercise: string, repNumber: number) => {
    await delay(200);
    
    const feedbackMessages = [
      'Great form! Keep it up!',
      'Try to go a bit deeper',
      'Keep your back straight',
      'Good depth, maintain control'
    ];
    
    const randomFeedback = feedbackMessages[Math.floor(Math.random() * feedbackMessages.length)];
    const randomScore = Math.floor(Math.random() * 30) + 70; // 70-100
    
    return {
      success: true,
      analysis: {
        timestamp: new Date().toISOString(),
        repNumber,
        angles: {
          left_knee_angle: Math.floor(Math.random() * 40) + 90,
          right_knee_angle: Math.floor(Math.random() * 40) + 90,
          back_angle: Math.floor(Math.random() * 20) + 10
        },
        phase: ['starting', 'descending', 'bottom', 'ascending', 'completed'][Math.floor(Math.random() * 5)],
        feedback: [randomFeedback],
        corrections: randomScore < 80 ? [randomFeedback] : [],
        formScore: randomScore,
        isGoodForm: randomScore >= 75
      }
    };
  },

  getGuidelines: async (exercise: string) => {
    await delay(300);
    
    const guidelines: any = {
      squat: {
        keyPoints: [
          'Feet shoulder-width apart',
          'Knees track over toes',
          'Descend until thighs parallel to ground',
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
      }
    };
    
    return {
      success: true,
      guidelines: guidelines[exercise] || guidelines.squat
    };
  }
};

export const mockUserAPI = {
  updateProfile: async (profileData: any) => {
    await delay(800);
    
    // Update mock user
    mockUsers[0].profile = { ...mockUsers[0].profile, ...profileData };
    
    return {
      success: true,
      user: mockUsers[0]
    };
  },

  updatePreferences: async (preferences: any) => {
    await delay(600);
    
    return {
      success: true,
      preferences
    };
  },

  getStats: async () => {
    await delay(400);
    
    return {
      success: true,
      stats: mockUsers[0].stats
    };
  }
};
