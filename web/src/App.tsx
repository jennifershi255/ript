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
import HomeScreen from "./screens/HomeScreen";
import WorkoutScreen from "./screens/WorkoutScreen";
import CameraScreen from "./screens/CameraScreen";
import ProfileScreen from "./screens/ProfileScreen";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import LoadingScreen from "./components/LoadingScreen";
import "./App.css";

// Main App Content
function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Landing Page - Show when not authenticated */}
          <Route path="/" element={<LandingPage />} />

          {/* Protected Routes */}
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/workout/:exercise" element={<WorkoutScreen />} />
          <Route path="/camera" element={<CameraScreen />} />
          <Route path="/analytics" element={<AnalyticsScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />

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
