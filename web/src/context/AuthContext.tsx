import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";
import { authAPI } from "../services/api";

// Types
interface User {
  id: string;
  username: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    age?: number;
    height?: number;
    weight?: number;
    fitnessLevel: string;
  };
  stats: {
    totalWorkouts: number;
    totalReps: number;
    averageFormAccuracy: number;
    streakDays: number;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  register: (userData: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (userData: Partial<User>) => void;
  loadUser: () => Promise<void>;
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: "LOGIN_START",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILURE: "LOGIN_FAILURE",
  LOGOUT: "LOGOUT",
  REGISTER_START: "REGISTER_START",
  REGISTER_SUCCESS: "REGISTER_SUCCESS",
  REGISTER_FAILURE: "REGISTER_FAILURE",
  LOAD_USER_START: "LOAD_USER_START",
  LOAD_USER_SUCCESS: "LOAD_USER_SUCCESS",
  LOAD_USER_FAILURE: "LOAD_USER_FAILURE",
  CLEAR_ERROR: "CLEAR_ERROR",
} as const;

type AuthAction =
  | { type: typeof AUTH_ACTIONS.LOGIN_START }
  | {
      type: typeof AUTH_ACTIONS.LOGIN_SUCCESS;
      payload: { user: User; token: string };
    }
  | { type: typeof AUTH_ACTIONS.LOGIN_FAILURE; payload: string }
  | { type: typeof AUTH_ACTIONS.LOGOUT }
  | { type: typeof AUTH_ACTIONS.REGISTER_START }
  | {
      type: typeof AUTH_ACTIONS.REGISTER_SUCCESS;
      payload: { user: User; token: string };
    }
  | { type: typeof AUTH_ACTIONS.REGISTER_FAILURE; payload: string }
  | { type: typeof AUTH_ACTIONS.LOAD_USER_START }
  | {
      type: typeof AUTH_ACTIONS.LOAD_USER_SUCCESS;
      payload: { user: User; token?: string };
    }
  | { type: typeof AUTH_ACTIONS.LOAD_USER_FAILURE; payload: string }
  | { type: typeof AUTH_ACTIONS.CLEAR_ERROR };

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
    case AUTH_ACTIONS.REGISTER_START:
    case AUTH_ACTIONS.LOAD_USER_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
    case AUTH_ACTIONS.REGISTER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.LOAD_USER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token || state.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
    case AUTH_ACTIONS.REGISTER_FAILURE:
    case AUTH_ACTIONS.LOAD_USER_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        isLoading: false,
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user on app start
  useEffect(() => {
    loadUser();
  }, []);

  // Load user from storage
  const loadUser = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOAD_USER_START });

      const token = localStorage.getItem("token");
      if (!token) {
        dispatch({
          type: AUTH_ACTIONS.LOAD_USER_FAILURE,
          payload: "No token found",
        });
        return;
      }

      // Set token in API headers
      authAPI.setAuthToken(token);

      // Get user data
      const response = await authAPI.getCurrentUser();

      if (response.success) {
        dispatch({
          type: AUTH_ACTIONS.LOAD_USER_SUCCESS,
          payload: { user: response.user, token },
        });
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error("Load user error:", error);
      localStorage.removeItem("token");
      dispatch({
        type: AUTH_ACTIONS.LOAD_USER_FAILURE,
        payload: error instanceof Error ? error.message : "Failed to load user",
      });
    }
  };

  // Login
  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });

      const response = await authAPI.login(email, password);

      if (response.success) {
        // Store token
        localStorage.setItem("token", response.token);

        // Set token in API headers
        authAPI.setAuthToken(response.token);

        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user: response.user, token: response.token },
        });

        return { success: true };
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  };

  // Register
  const register = async (userData: any) => {
    try {
      dispatch({ type: AUTH_ACTIONS.REGISTER_START });

      const response = await authAPI.register(userData);

      if (response.success) {
        // Store token
        localStorage.setItem("token", response.token);

        // Set token in API headers
        authAPI.setAuthToken(response.token);

        dispatch({
          type: AUTH_ACTIONS.REGISTER_SUCCESS,
          payload: { user: response.user, token: response.token },
        });

        return { success: true };
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error("Register error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Registration failed";
      dispatch({
        type: AUTH_ACTIONS.REGISTER_FAILURE,
        payload: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  };

  // Logout
  const logout = async () => {
    try {
      localStorage.removeItem("token");
      authAPI.removeAuthToken();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });

      // Force navigation to landing page after logout
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Update user
  const updateUser = (userData: Partial<User>) => {
    if (state.user) {
      dispatch({
        type: AUTH_ACTIONS.LOAD_USER_SUCCESS,
        payload: { user: { ...state.user, ...userData } },
      });
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    updateUser,
    loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
