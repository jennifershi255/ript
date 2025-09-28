import React from "react";
import "./LoadingScreen.css";

const LoadingScreen: React.FC = () => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <h2>ript</h2>
        <p>loading your fitness journey...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
