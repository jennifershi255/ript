import axios from 'axios';
import { mockAuthAPI, mockWorkoutAPI, mockAnalysisAPI, mockUserAPI } from './mockApi';

// Base API URL - Dynamic configuration for better connectivity
const getBaseURL = () => {
  if (__DEV__) {
    // For development, we'll use a mock API since network connectivity is blocked
    // In a real deployment, this would be your actual backend URL
    return 'http://localhost:3000/api'; // This will be mocked for now
  }
  return 'https://your-production-api.com/api';
};

const BASE_URL = getBaseURL();

// Flag to determine if we should use mock API
const USE_MOCK_API = true; // Set to false when backend is accessible

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // Increased timeout to 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response.data;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    
    // Handle common error scenarios
    if (error.response?.status === 401) {
      // Token expired or invalid - handled by auth context
      return Promise.reject(new Error('Authentication required'));
    }
    
    if (error.response?.status === 403) {
      return Promise.reject(new Error('Access denied'));
    }
    
    if (error.response?.status >= 500) {
      return Promise.reject(new Error('Server error. Please try again later.'));
    }
    
    return Promise.reject(error.response?.data || error);
  }
);

// Auth API
export const authAPI = {
  // Set auth token in headers
  setAuthToken: (token) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  },

  // Remove auth token
  removeAuthToken: () => {
    delete api.defaults.headers.common['Authorization'];
  },

  // Login
  login: async (email, password) => {
    if (USE_MOCK_API) {
      return await mockAuthAPI.login(email, password);
    }
    
    try {
      const response = await api.post('/auth/login', { email, password });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Register
  register: async (userData) => {
    if (USE_MOCK_API) {
      return await mockAuthAPI.register(userData);
    }
    
    try {
      const response = await api.post('/auth/register', userData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get current user
  getCurrentUser: async () => {
    if (USE_MOCK_API) {
      return await mockAuthAPI.getCurrentUser();
    }
    
    try {
      const response = await api.get('/auth/me');
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// User API
export const userAPI = {
  // Update profile
  updateProfile: async (profileData) => {
    if (USE_MOCK_API) {
      return await mockUserAPI.updateProfile(profileData);
    }
    
    try {
      const response = await api.put('/users/profile', { profile: profileData });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update preferences
  updatePreferences: async (preferences) => {
    if (USE_MOCK_API) {
      return await mockUserAPI.updatePreferences(preferences);
    }
    
    try {
      const response = await api.put('/users/preferences', { preferences });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get user stats
  getStats: async () => {
    if (USE_MOCK_API) {
      return await mockUserAPI.getStats();
    }
    
    try {
      const response = await api.get('/users/stats');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete account
  deleteAccount: async () => {
    try {
      const response = await api.delete('/users/account');
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// Workout API
export const workoutAPI = {
  // Start workout session
  startSession: async (sessionData) => {
    if (USE_MOCK_API) {
      return await mockWorkoutAPI.startSession(sessionData);
    }
    
    try {
      const response = await api.post('/workouts/start', sessionData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // End workout session
  endSession: async (sessionId) => {
    if (USE_MOCK_API) {
      return await mockWorkoutAPI.endSession(sessionId);
    }
    
    try {
      const response = await api.put(`/workouts/${sessionId}/end`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Add pose data to session
  addPoseData: async (sessionId, poseData) => {
    if (USE_MOCK_API) {
      return await mockWorkoutAPI.addPoseData(sessionId, poseData);
    }
    
    try {
      const response = await api.post(`/workouts/${sessionId}/pose-data`, poseData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Add feedback to session
  addFeedback: async (sessionId, feedback) => {
    if (USE_MOCK_API) {
      return await mockWorkoutAPI.addFeedback(sessionId, feedback);
    }
    
    try {
      const response = await api.post(`/workouts/${sessionId}/feedback`, feedback);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get workout history
  getWorkoutHistory: async (params = {}) => {
    if (USE_MOCK_API) {
      return await mockWorkoutAPI.getWorkoutHistory(params);
    }
    
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/workouts?${queryString}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get specific workout session
  getWorkoutSession: async (sessionId) => {
    try {
      const response = await api.get(`/workouts/${sessionId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get analytics
  getAnalytics: async (period = '30d') => {
    if (USE_MOCK_API) {
      return await mockWorkoutAPI.getAnalytics(period);
    }
    
    try {
      const response = await api.get(`/workouts/analytics/summary?period=${period}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// Analysis API
export const analysisAPI = {
  // Analyze pose data
  analyzePose: async (poseData, exercise, repNumber) => {
    if (USE_MOCK_API) {
      return await mockAnalysisAPI.analyzePose(poseData, exercise, repNumber);
    }
    
    try {
      const response = await api.post('/analysis/pose', {
        poseData,
        exercise,
        repNumber
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get exercise guidelines
  getGuidelines: async (exercise) => {
    if (USE_MOCK_API) {
      return await mockAnalysisAPI.getGuidelines(exercise);
    }
    
    try {
      const response = await api.get(`/analysis/guidelines/${exercise}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Batch analyze poses
  batchAnalyze: async (poseFrames, exercise) => {
    try {
      const response = await api.post('/analysis/batch', {
        poseFrames,
        exercise
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Count reps
  countReps: async (poseSequence, exercise) => {
    try {
      const response = await api.post('/analysis/rep-count', {
        poseSequence,
        exercise
      });
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default api;
