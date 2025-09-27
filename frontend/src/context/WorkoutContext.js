import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { workoutAPI } from '../services/api';
import { useAuth } from './AuthContext';

// Initial state
const initialState = {
  currentSession: null,
  workoutHistory: [],
  analytics: null,
  isRecording: false,
  isLoading: false,
  error: null,
  poseData: [],
  feedbackLog: [],
  repCount: 0,
  currentExercise: null
};

// Action types
const WORKOUT_ACTIONS = {
  START_SESSION: 'START_SESSION',
  END_SESSION: 'END_SESSION',
  START_RECORDING: 'START_RECORDING',
  STOP_RECORDING: 'STOP_RECORDING',
  ADD_POSE_DATA: 'ADD_POSE_DATA',
  ADD_FEEDBACK: 'ADD_FEEDBACK',
  INCREMENT_REP: 'INCREMENT_REP',
  RESET_REP_COUNT: 'RESET_REP_COUNT',
  LOAD_HISTORY_START: 'LOAD_HISTORY_START',
  LOAD_HISTORY_SUCCESS: 'LOAD_HISTORY_SUCCESS',
  LOAD_HISTORY_FAILURE: 'LOAD_HISTORY_FAILURE',
  LOAD_ANALYTICS_SUCCESS: 'LOAD_ANALYTICS_SUCCESS',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_LOADING: 'SET_LOADING'
};

// Reducer
function workoutReducer(state, action) {
  switch (action.type) {
    case WORKOUT_ACTIONS.START_SESSION:
      return {
        ...state,
        currentSession: action.payload,
        currentExercise: action.payload.exercise,
        poseData: [],
        feedbackLog: [],
        repCount: 0,
        error: null
      };

    case WORKOUT_ACTIONS.END_SESSION:
      return {
        ...state,
        currentSession: null,
        currentExercise: null,
        isRecording: false,
        poseData: [],
        feedbackLog: [],
        repCount: 0
      };

    case WORKOUT_ACTIONS.START_RECORDING:
      return {
        ...state,
        isRecording: true
      };

    case WORKOUT_ACTIONS.STOP_RECORDING:
      return {
        ...state,
        isRecording: false
      };

    case WORKOUT_ACTIONS.ADD_POSE_DATA:
      return {
        ...state,
        poseData: [...state.poseData, action.payload]
      };

    case WORKOUT_ACTIONS.ADD_FEEDBACK:
      return {
        ...state,
        feedbackLog: [...state.feedbackLog, action.payload]
      };

    case WORKOUT_ACTIONS.INCREMENT_REP:
      return {
        ...state,
        repCount: state.repCount + 1
      };

    case WORKOUT_ACTIONS.RESET_REP_COUNT:
      return {
        ...state,
        repCount: 0
      };

    case WORKOUT_ACTIONS.LOAD_HISTORY_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case WORKOUT_ACTIONS.LOAD_HISTORY_SUCCESS:
      return {
        ...state,
        workoutHistory: action.payload,
        isLoading: false,
        error: null
      };

    case WORKOUT_ACTIONS.LOAD_HISTORY_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload
      };

    case WORKOUT_ACTIONS.LOAD_ANALYTICS_SUCCESS:
      return {
        ...state,
        analytics: action.payload
      };

    case WORKOUT_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case WORKOUT_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case WORKOUT_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    default:
      return state;
  }
}

// Create context
const WorkoutContext = createContext();

// Workout Provider
export function WorkoutProvider({ children }) {
  const [state, dispatch] = useReducer(workoutReducer, initialState);
  const { isAuthenticated } = useAuth();

  // Load workout history when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadWorkoutHistory();
      loadAnalytics();
    }
  }, [isAuthenticated]);

  // Start workout session
  const startWorkoutSession = async (exercise, settings = {}) => {
    try {
      dispatch({ type: WORKOUT_ACTIONS.SET_LOADING, payload: true });
      
      const response = await workoutAPI.startSession({
        exercise,
        settings,
        deviceInfo: {
          platform: 'mobile',
          // Add more device info as needed
        }
      });

      if (response.success) {
        dispatch({
          type: WORKOUT_ACTIONS.START_SESSION,
          payload: response.session
        });
        return { success: true, session: response.session };
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Start session error:', error);
      dispatch({ 
        type: WORKOUT_ACTIONS.SET_ERROR, 
        payload: error.message || 'Failed to start workout session' 
      });
      return { success: false, error: error.message };
    } finally {
      dispatch({ type: WORKOUT_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // End workout session
  const endWorkoutSession = async () => {
    try {
      if (!state.currentSession) {
        throw new Error('No active session to end');
      }

      dispatch({ type: WORKOUT_ACTIONS.SET_LOADING, payload: true });
      
      const response = await workoutAPI.endSession(state.currentSession._id);

      if (response.success) {
        dispatch({ type: WORKOUT_ACTIONS.END_SESSION });
        
        // Reload history and analytics
        await loadWorkoutHistory();
        await loadAnalytics();
        
        return { success: true, session: response.session };
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('End session error:', error);
      dispatch({ 
        type: WORKOUT_ACTIONS.SET_ERROR, 
        payload: error.message || 'Failed to end workout session' 
      });
      return { success: false, error: error.message };
    } finally {
      dispatch({ type: WORKOUT_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // Start recording
  const startRecording = () => {
    dispatch({ type: WORKOUT_ACTIONS.START_RECORDING });
  };

  // Stop recording
  const stopRecording = () => {
    dispatch({ type: WORKOUT_ACTIONS.STOP_RECORDING });
  };

  // Add pose data
  const addPoseData = async (poseData) => {
    try {
      // Add to local state immediately for real-time feedback
      dispatch({
        type: WORKOUT_ACTIONS.ADD_POSE_DATA,
        payload: {
          ...poseData,
          timestamp: new Date().toISOString()
        }
      });

      // Send to backend if session is active
      if (state.currentSession) {
        await workoutAPI.addPoseData(state.currentSession._id, { poseData });
      }
    } catch (error) {
      console.error('Add pose data error:', error);
    }
  };

  // Add feedback
  const addFeedback = async (feedback) => {
    try {
      // Add to local state immediately
      dispatch({
        type: WORKOUT_ACTIONS.ADD_FEEDBACK,
        payload: {
          ...feedback,
          timestamp: new Date().toISOString()
        }
      });

      // Send to backend if session is active
      if (state.currentSession) {
        await workoutAPI.addFeedback(state.currentSession._id, { feedback });
      }
    } catch (error) {
      console.error('Add feedback error:', error);
    }
  };

  // Increment rep count
  const incrementRepCount = () => {
    dispatch({ type: WORKOUT_ACTIONS.INCREMENT_REP });
  };

  // Reset rep count
  const resetRepCount = () => {
    dispatch({ type: WORKOUT_ACTIONS.RESET_REP_COUNT });
  };

  // Load workout history
  const loadWorkoutHistory = async (params = {}) => {
    try {
      dispatch({ type: WORKOUT_ACTIONS.LOAD_HISTORY_START });
      
      const response = await workoutAPI.getWorkoutHistory(params);
      
      if (response.success) {
        dispatch({
          type: WORKOUT_ACTIONS.LOAD_HISTORY_SUCCESS,
          payload: response.sessions
        });
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Load history error:', error);
      dispatch({ 
        type: WORKOUT_ACTIONS.LOAD_HISTORY_FAILURE, 
        payload: error.message || 'Failed to load workout history' 
      });
    }
  };

  // Load analytics
  const loadAnalytics = async (period = '30d') => {
    try {
      const response = await workoutAPI.getAnalytics(period);
      
      if (response.success) {
        dispatch({
          type: WORKOUT_ACTIONS.LOAD_ANALYTICS_SUCCESS,
          payload: response.analytics
        });
      }
    } catch (error) {
      console.error('Load analytics error:', error);
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: WORKOUT_ACTIONS.CLEAR_ERROR });
  };

  // Get current form accuracy
  const getCurrentFormAccuracy = () => {
    if (state.poseData.length === 0) return 0;
    
    const goodFormFrames = state.poseData.filter(data => data.isGoodForm).length;
    return Math.round((goodFormFrames / state.poseData.length) * 100);
  };

  // Get common errors from current session
  const getCurrentSessionErrors = () => {
    const errorCounts = {};
    
    state.feedbackLog.forEach(feedback => {
      if (feedback.errorType) {
        errorCounts[feedback.errorType] = (errorCounts[feedback.errorType] || 0) + 1;
      }
    });

    return Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([error, count]) => ({ error, count }));
  };

  const value = {
    ...state,
    startWorkoutSession,
    endWorkoutSession,
    startRecording,
    stopRecording,
    addPoseData,
    addFeedback,
    incrementRepCount,
    resetRepCount,
    loadWorkoutHistory,
    loadAnalytics,
    clearError,
    getCurrentFormAccuracy,
    getCurrentSessionErrors
  };

  return (
    <WorkoutContext.Provider value={value}>
      {children}
    </WorkoutContext.Provider>
  );
}

// Hook to use workout context
export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
}
