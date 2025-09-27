import React from "react";
import "./LoadingScreen.css";

const LoadingScreen: React.FC = () => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <h2>AI Workout Coach</h2>
        <p>Loading your fitness journey...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
