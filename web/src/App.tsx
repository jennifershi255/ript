import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WorkoutProvider } from "./context/WorkoutContext";
import LandingPage from "./screens/LandingPage";
import RegisterScreen from "./screens/RegisterScreen";
import HomeScreen from "./screens/HomeScreen";
import WorkoutScreen from "./screens/WorkoutScreen";
import CameraScreen from "./screens/CameraScreen";
import ProfileScreen from "./screens/ProfileScreen";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import LoadingScreen from "./components/LoadingScreen";
import "./App.css";

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

// Public Route Component (redirect if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/home" />;
}

// Main App Content
function AppContent() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Landing Page - Always accessible */}
          <Route path="/" element={<LandingPage />} />
          
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterScreen />
              </PublicRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomeScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workout/:exercise"
            element={
              <ProtectedRoute>
                <WorkoutScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/camera"
            element={
              <ProtectedRoute>
                <CameraScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileScreen />
              </ProtectedRoute>
            }
          />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/home" />} />
        </Routes>
      </div>
    </Router>
  );
}

// Root App Component
function App() {
  return (
    <AuthProvider>
      <WorkoutProvider>
        <AppContent />
      </WorkoutProvider>
    </AuthProvider>
  );
}

export default App;
