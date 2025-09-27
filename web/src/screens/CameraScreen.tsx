import React from "react";
import { useNavigate } from "react-router-dom";
import "./CameraScreen.css";

const CameraScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="camera-screen">
      <div className="camera-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>
        <h1>Camera Setup</h1>
      </div>

      <div className="camera-content">
        <div className="camera-placeholder">
          <div className="camera-icon">📹</div>
          <h2>Camera Access</h2>
          <p>Camera integration for pose detection will be implemented here</p>
        </div>
      </div>
    </div>
  );
};

export default CameraScreen;
