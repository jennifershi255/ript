import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWorkout } from "../context/WorkoutContext";
import Navigation from "../components/Navigation";
import {
  PoseDetector,
  SquatAnalysis,
  PoseResults,
} from "../services/PoseDetector";
import { analysisAPI } from "../services/api";
import "./WorkoutScreen.css";

const WorkoutScreen: React.FC = () => {
  const { exercise } = useParams<{ exercise: string }>();
  const navigate = useNavigate();
  const { isRecording, startRecording, stopRecording, repCount } = useWorkout();

  const [isCamera, setIsCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [poseDetector, setPoseDetector] = useState<PoseDetector | null>(null);
  const [isDisposing, setIsDisposing] = useState(false);
  const disposalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<SquatAnalysis | null>(
    null
  );
  const [showPoseOverlay, setShowPoseOverlay] = useState(true);
  const [totalReps, setTotalReps] = useState(0);
  const [formScoreHistory, setFormScoreHistory] = useState<number[]>([]);
  const [totalFormScoreSum, setTotalFormScoreSum] = useState(0);
  const [formScoreCount, setFormScoreCount] = useState(0);
  const [stableFeedback, setStableFeedback] = useState<string[]>([]);
  const [lastBottomTime, setLastBottomTime] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousPhaseRef = useRef<string | undefined>(undefined);

  const handleEndWorkout = async () => {
    console.log("Ending workout...");

    if (isDisposing) {
      console.log("Already disposing, forcing navigation...");
      navigate("/");
      return;
    }

    setDisposingWithTimeout(true);

    try {
      // Stop recording first
      if (isRecording) {
        console.log("Stopping recording...");
        stopRecording();
      }

      // Stop pose detection
      if (poseDetector) {
        console.log("Disposing pose detector...");
        try {
          poseDetector.dispose();
          setPoseDetector(null);
        } catch (error) {
          console.warn("Error disposing pose detector:", error);
        }
      }

      // Stop camera stream
      if (stream) {
        console.log("Stopping camera stream...");
        try {
          stream.getTracks().forEach((track) => {
            track.stop();
          });
          setStream(null);
          setIsCamera(false);
        } catch (error) {
          console.warn("Error stopping camera stream:", error);
        }
      }

      console.log("Workout ended successfully");
    } catch (error) {
      console.error("Error ending workout:", error);
    } finally {
      // Always reset disposing state and navigate
      setDisposingWithTimeout(false);
      navigate("/");
    }
  };

  const handleStartRecording = async () => {
    console.log(
      "handleStartRecording called, isCamera:",
      isCamera,
      "isRecording:",
      isRecording
    );
    try {
      if (!isCamera) {
        console.log("Requesting camera access...");
        // Request camera access
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: false,
        });

        setStream(mediaStream);
        setIsCamera(true);

        // Set video source
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          // Ensure video plays
          videoRef.current.play().catch(console.error);
        }
      } else {
        console.log("Camera already active");
      }

      // Reset workout stats
      console.log("Resetting workout stats");
      setTotalReps(0);
      setFormScoreHistory([]);
      setTotalFormScoreSum(0);
      setFormScoreCount(0);
      setStableFeedback([]);
      setLastBottomTime(0);
      previousPhaseRef.current = undefined;

      console.log("Calling startRecording()");
      startRecording();

      // Initialize pose detection after camera is ready
      if (videoRef.current && canvasRef.current && !poseDetector) {
        console.log("Initializing pose detection");
        initializePoseDetection();
      } else {
        console.log("Pose detection not initialized:", {
          videoRef: !!videoRef.current,
          canvasRef: !!canvasRef.current,
          poseDetector: !!poseDetector,
        });
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert(
        "Unable to access camera. Please make sure you have granted camera permissions."
      );
    }
  };

  const handleStopRecording = () => {
    console.log("Stopping recording...");
    stopRecording();

    if (poseDetector && !isDisposing) {
      try {
        poseDetector.stop();
      } catch (error) {
        console.warn("Error stopping pose detector:", error);
      }
    }
  };

  // Reset disposal state
  const resetDisposalState = () => {
    console.log("Resetting disposal state...");
    if (disposalTimeoutRef.current) {
      clearTimeout(disposalTimeoutRef.current);
      disposalTimeoutRef.current = null;
    }
    setIsDisposing(false);
  };

  // Set disposal state with automatic timeout
  const setDisposingWithTimeout = (disposing: boolean) => {
    if (disposing) {
      setIsDisposing(true);
      // Auto-reset after 5 seconds if it gets stuck
      disposalTimeoutRef.current = setTimeout(() => {
        console.log("Auto-resetting stuck disposal state...");
        setIsDisposing(false);
        disposalTimeoutRef.current = null;
      }, 5000);
    } else {
      if (disposalTimeoutRef.current) {
        clearTimeout(disposalTimeoutRef.current);
        disposalTimeoutRef.current = null;
      }
      setIsDisposing(false);
    }
  };

  // Initialize MediaPipe pose detection
  const initializePoseDetection = async () => {
    console.log("Starting pose detection initialization...");

    // Reset disposal state if it's stuck
    if (isDisposing) {
      console.log("Resetting stuck disposal state...");
      resetDisposalState();
    }

    if (!videoRef.current || !canvasRef.current) {
      console.error("Video or canvas ref not available:", {
        video: !!videoRef.current,
        canvas: !!canvasRef.current,
      });
      return;
    }

    if (poseDetector) {
      console.log("Pose detector already exists, skipping initialization");
      return;
    }

    try {
      console.log("Creating PoseDetector instance...");
      const detector = new PoseDetector();

      // Wait for video to be ready
      console.log("Waiting for video to be ready...");
      await new Promise<void>((resolve) => {
        const checkVideo = () => {
          if (videoRef.current && videoRef.current.videoWidth > 0) {
            console.log("Video ready:", {
              width: videoRef.current.videoWidth,
              height: videoRef.current.videoHeight,
            });
            resolve();
          } else {
            console.log("Video not ready yet, retrying...");
            setTimeout(checkVideo, 100);
          }
        };
        checkVideo();
      });

      console.log("Initializing detector with video and canvas...");
      await detector.initialize(
        videoRef.current,
        canvasRef.current,
        handlePoseResults,
        handleSquatAnalysis
      );

      console.log("Setting pose detector state...");
      setPoseDetector(detector);

      console.log("Starting pose detection...");
      detector.start();

      console.log("Pose detection initialization complete!");
    } catch (error) {
      console.error("Error initializing pose detection:", error);
    }
  };

  // Handle pose detection results
  const handlePoseResults = async (results: PoseResults) => {
    // Send pose data to backend for additional analysis and storage
    if (results.poseLandmarks && exercise) {
      try {
        // Convert MediaPipe landmarks to backend format
        const poseData = {
          timestamp: new Date().toISOString(),
          keypoints: convertLandmarksToBackendFormat(results.poseLandmarks),
          confidence: calculateAverageConfidence(results.poseLandmarks),
        };

        // Send to backend for analysis (optional - we're using local analysis for real-time feedback)
        // const backendAnalysis = await analysisAPI.analyzePose(poseData, exercise, currentAnalysis?.repCount || 0);

        // Store pose data for session history
        // This could be used for post-workout analysis or training data
      } catch (error) {
        console.error("Error sending pose data to backend:", error);
      }
    }
  };

  // Convert MediaPipe landmarks to backend format
  const convertLandmarksToBackendFormat = (landmarks: any[]) => {
    const landmarkNames = [
      "nose",
      "left_eye_inner",
      "left_eye",
      "left_eye_outer",
      "right_eye_inner",
      "right_eye",
      "right_eye_outer",
      "left_ear",
      "right_ear",
      "mouth_left",
      "mouth_right",
      "left_shoulder",
      "right_shoulder",
      "left_elbow",
      "right_elbow",
      "left_wrist",
      "right_wrist",
      "left_pinky",
      "right_pinky",
      "left_index",
      "right_index",
      "left_thumb",
      "right_thumb",
      "left_hip",
      "right_hip",
      "left_knee",
      "right_knee",
      "left_ankle",
      "right_ankle",
      "left_heel",
      "right_heel",
      "left_foot_index",
      "right_foot_index",
    ];

    const keypoints: any = {};
    landmarks.forEach((landmark, index) => {
      if (landmarkNames[index]) {
        keypoints[landmarkNames[index]] = {
          x: landmark.x,
          y: landmark.y,
          z: landmark.z,
          visibility: landmark.visibility,
        };
      }
    });

    return keypoints;
  };

  // Calculate average confidence of visible landmarks
  const calculateAverageConfidence = (landmarks: any[]): number => {
    const visibleLandmarks = landmarks.filter((l) => l.visibility > 0.5);
    if (visibleLandmarks.length === 0) return 0;

    const totalConfidence = visibleLandmarks.reduce(
      (sum, l) => sum + l.visibility,
      0
    );
    return totalConfidence / visibleLandmarks.length;
  };

  // Handle squat analysis results
  const handleSquatAnalysis = (analysis: SquatAnalysis) => {
    console.log("Squat analysis received:", analysis);

    // Get previous phase from ref (synchronous)
    const previousPhase = previousPhaseRef.current;
    console.log(
      `Phase: ${analysis.phase}, Previous Phase: ${previousPhase}, TotalReps: ${totalReps}`
    );

    const currentTime = Date.now();

    // Count rep when transitioning from "bottom" to "ascending"
    // This means the user completed the squat and is coming back up
    if (
      previousPhase === "bottom" &&
      analysis.phase === "ascending" &&
      currentTime - lastBottomTime > 1000 // 1 second cooldown between reps
    ) {
      console.log(
        `🎉 REP COMPLETED! Transition from bottom to ascending. Incrementing reps from ${totalReps} to ${
          totalReps + 1
        }`
      );
      setTotalReps((prev) => prev + 1);
      setLastBottomTime(currentTime);
    }

    // Update previous phase ref for next call (synchronous)
    previousPhaseRef.current = analysis.phase;

    // Update current analysis state
    setCurrentAnalysis(analysis);

    // Stabilize feedback messages - only update every 2 seconds
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = setTimeout(() => {
      setStableFeedback(analysis.feedback);
    }, 100); // Small delay to prevent rapid changes

    // Track form scores for cumulative average calculation
    if (analysis.formScore > 0) {
      console.log(`Adding form score: ${analysis.formScore}`);
      setFormScoreHistory((prev) => {
        const newHistory = [...prev, analysis.formScore];
        // Keep only last 10 scores for display purposes
        return newHistory.slice(-10);
      });

      // Update cumulative totals
      setTotalFormScoreSum((prev) => prev + analysis.formScore);
      setFormScoreCount((prev) => prev + 1);
    }
  };

  // Helper function to calculate cumulative average form score
  const getCumulativeFormScore = (): number => {
    if (formScoreCount === 0) return 0;
    return Math.round(totalFormScoreSum / formScoreCount);
  };

  // Toggle pose overlay visibility
  const togglePoseOverlay = () => {
    console.log("Toggling pose overlay:", {
      current: showPoseOverlay,
      willBe: !showPoseOverlay,
      canvasExists: !!canvasRef.current,
      poseDetectorExists: !!poseDetector,
    });
    setShowPoseOverlay(!showPoseOverlay);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      // Enter fullscreen
      if (videoRef.current?.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if ((videoRef.current as any)?.webkitRequestFullscreen) {
        (videoRef.current as any).webkitRequestFullscreen();
      } else if ((videoRef.current as any)?.mozRequestFullScreen) {
        (videoRef.current as any).mozRequestFullScreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  // Handle video stream setup
  useEffect(() => {
    if (stream && videoRef.current && isCamera) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [stream, isCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("Component unmounting, cleaning up...");

      // Clear feedback timeout
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = null;
      }

      try {
        if (poseDetector) {
          console.log("Cleanup: disposing pose detector");
          poseDetector.dispose();
        }
      } catch (error) {
        console.warn("Cleanup error with pose detector:", error);
      }

      try {
        if (stream) {
          console.log("Cleanup: stopping camera stream");
          stream.getTracks().forEach((track) => track.stop());
        }
      } catch (error) {
        console.warn("Cleanup error with stream:", error);
      }
    };
  }, [stream, poseDetector]);

  return (
    <div className="workout-screen">
      <Navigation />

      <div className="workout-content">
        <div className="workout-header">
          <h1>🏋️‍♀️ {exercise?.toUpperCase()} Workout</h1>
          <p>AI-powered form analysis coming soon!</p>
        </div>

        <div className="workout-placeholder">
          <div className="camera-placeholder">
            {isCamera ? (
              <>
                <div className="video-container">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="camera-video"
                  />
                  <canvas
                    ref={canvasRef}
                    className={`pose-overlay ${
                      showPoseOverlay ? "visible" : "hidden"
                    }`}
                  />
                </div>
                <div className="camera-controls">
                  <button
                    className="fullscreen-button"
                    onClick={toggleFullscreen}
                    title={
                      isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"
                    }
                  >
                    {isFullscreen ? "⤓" : "⤢"}
                  </button>
                  <button
                    className="overlay-toggle-button"
                    onClick={togglePoseOverlay}
                    title={
                      showPoseOverlay
                        ? "Hide Pose Overlay"
                        : "Show Pose Overlay"
                    }
                  >
                    {showPoseOverlay ? "👁️" : "👁️‍🗨️"}
                  </button>
                  {!poseDetector && (
                    <button
                      className="overlay-toggle-button"
                      onClick={initializePoseDetection}
                      title="Initialize Pose Detection"
                      style={{ backgroundColor: "rgba(255, 165, 0, 0.7)" }}
                    >
                      🤖
                    </button>
                  )}
                  {isDisposing && (
                    <button
                      className="overlay-toggle-button"
                      onClick={resetDisposalState}
                      title="Reset Disposal State"
                      style={{ backgroundColor: "rgba(255, 0, 0, 0.7)" }}
                    >
                      🔄
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="camera-icon">📹</div>
                <h3>Camera Feed</h3>
                <p>Click "Start Recording" to begin pose detection</p>
              </>
            )}
            {isRecording && (
              <div className="recording-indicator">
                <span className="recording-dot">🔴</span>
                <span>Recording</span>
              </div>
            )}
          </div>

          <div className="analysis-section">
            <div className="feedback-panel">
              <h3>Real-time Analysis</h3>
              {currentAnalysis ? (
                <>
                  <div className="analysis-phase">
                    <span className="phase-label">Phase:</span>
                    <span className={`phase-value ${currentAnalysis.phase}`}>
                      {currentAnalysis.phase.toUpperCase()}
                    </span>
                  </div>
                  <div className="feedback-messages">
                    {stableFeedback.map((message, index) => (
                      <div key={index} className="feedback-item">
                        <span className="feedback-icon">
                          {currentAnalysis.isGoodForm ? "✅" : "⚠️"}
                        </span>
                        <span>{message}</span>
                      </div>
                    ))}
                  </div>
                  <div className="angle-display">
                    <div className="angle-item">
                      <span>Left Knee:</span>
                      <span>
                        {Math.round(currentAnalysis.angles.leftKneeAngle)}°
                      </span>
                    </div>
                    <div className="angle-item">
                      <span>Right Knee:</span>
                      <span>
                        {Math.round(currentAnalysis.angles.rightKneeAngle)}°
                      </span>
                    </div>
                    <div className="angle-item">
                      <span>Back Angle:</span>
                      <span>
                        {Math.round(currentAnalysis.angles.backAngle)}°
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="no-analysis">
                  <p>Start recording to see real-time form analysis</p>
                </div>
              )}
            </div>

            <div className="workout-stats">
              <div className="stat-box">
                <div className="stat-number">{totalReps}</div>
                <div className="stat-label">Reps</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">{getCumulativeFormScore()}%</div>
                <div className="stat-label">Form Score</div>
              </div>
            </div>
          </div>
        </div>

        <div className="workout-controls">
          <button
            className="control-button secondary"
            onClick={handleEndWorkout}
          >
            End Workout
          </button>
          {!isRecording ? (
            <button
              className="control-button primary"
              onClick={handleStartRecording}
            >
              {isCamera ? "Start Recording" : "Start Camera & Recording"}
            </button>
          ) : (
            <button
              className="control-button secondary"
              onClick={handleStopRecording}
            >
              Stop Recording
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkoutScreen;
