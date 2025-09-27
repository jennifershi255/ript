import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWorkout } from "../context/WorkoutContext";
import Navigation from "../components/Navigation";
import "./HomeScreen.css";

const EXERCISES = [
  {
    id: "squat",
    name: "Squat",
    description: "Lower body strength exercise",
    icon: "🏋️‍♀️",
    difficulty: "Beginner",
    duration: "5-10 mins",
    color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  {
    id: "pushup",
    name: "Push-up",
    description: "Upper body strength exercise",
    icon: "💪",
    difficulty: "Beginner",
    duration: "5-10 mins",
    color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  },
  {
    id: "deadlift",
    name: "Deadlift",
    description: "Full body compound exercise",
    icon: "🏋️",
    difficulty: "Intermediate",
    duration: "10-15 mins",
    color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  },
  {
    id: "lunge",
    name: "Lunge",
    description: "Lower body unilateral exercise",
    icon: "🦵",
    difficulty: "Beginner",
    duration: "5-10 mins",
    color: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  },
];

const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { analytics, loadAnalytics, startWorkoutSession } = useWorkout();
  const [isStarting, setIsStarting] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleStartWorkout = async (exercise: any) => {
    try {
      setIsStarting(exercise.id);
      const result = await startWorkoutSession(exercise.id);

      if (result.success) {
        navigate(`/workout/${exercise.id}`, {
          state: {
            exercise: exercise.id,
            sessionId: result.session?._id,
          },
        });
      } else {
        alert(result.error || "Failed to start workout session");
      }
    } catch (error) {
      alert("Failed to start workout session");
    } finally {
      setIsStarting(null);
    }
  };

  const renderExerciseCard = (exercise: any, index: number) => (
    <div
      key={exercise.id}
      className="exercise-card"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <button
        onClick={() => handleStartWorkout(exercise)}
        className="exercise-card-button"
        disabled={isStarting === exercise.id}
        style={{ background: exercise.color }}
      >
        <div className="exercise-card-content">
          <div className="exercise-icon">{exercise.icon}</div>
          <h3 className="exercise-name">{exercise.name}</h3>
          <p className="exercise-description">{exercise.description}</p>

          <div className="exercise-details">
            <div className="exercise-detail">
              <span className="detail-label">Level</span>
              <span className="detail-value">{exercise.difficulty}</span>
            </div>
            <div className="exercise-detail">
              <span className="detail-label">Duration</span>
              <span className="detail-value">{exercise.duration}</span>
            </div>
          </div>

          <div className="start-button">
            {isStarting === exercise.id ? "Starting..." : "Start Workout"}
          </div>
        </div>
      </button>
    </div>
  );

  const renderStatsCard = () => (
    <div className="stats-card">
      <h3 className="stats-title">Your Progress</h3>
      <div className="stats-row">
        <div className="stat-item">
          <div className="stat-value">{analytics?.totalSessions || 0}</div>
          <div className="stat-label">Workouts</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{analytics?.totalReps || 0}</div>
          <div className="stat-label">Total Reps</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">
            {analytics?.averageFormAccuracy || 0}%
          </div>
          <div className="stat-label">Avg Form</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="home-screen">
      <Navigation />

      <div className="home-content">
        {/* Header */}
        <div className="home-header">
          <h1 className="greeting">
            Hello, {user?.profile?.firstName || user?.username || "Athlete"}! 👋
          </h1>
          <p className="subtitle">Ready for your next workout?</p>
        </div>

        {/* Stats Card */}
        {renderStatsCard()}

        {/* Exercise Selection */}
        <div className="exercises-section">
          <h2 className="section-title">Choose Your Exercise</h2>
          <p className="section-subtitle">
            AI-powered form analysis for perfect technique
          </p>

          <div className="exercises-grid">
            {EXERCISES.map((exercise, index) =>
              renderExerciseCard(exercise, index)
            )}
          </div>
        </div>

        {/* Quick Tips */}
        <div className="tips-card">
          <h3 className="tips-title">💡 Quick Tips</h3>
          <div className="tips-list">
            <div className="tip-item">
              • Ensure good lighting for accurate pose detection
            </div>
            <div className="tip-item">
              • Position camera at chest level, 6 feet away
            </div>
            <div className="tip-item">
              • Wear fitted clothing for better tracking
            </div>
            <div className="tip-item">
              • Follow the on-screen guidance for proper form
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
