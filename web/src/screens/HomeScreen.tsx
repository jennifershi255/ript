import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWorkout } from "../context/WorkoutContext";
import Navigation from "../components/Navigation";
import "./HomeScreen.css";
import Aurora from "../components/Aurora";



const EXERCISES = [
  {
    id: "squat",
    name: "squat",
    description: "lower body strength exercise",
    difficulty: "beginner",
    duration: "5-10 mins",
    color: "linear-gradient(135deg, #83EBFC 0%, #4A90E2 100%)",
  },
  {
    id: "pushup",
    name: "push-up",
    description: "upper body strength exercise",
    difficulty: "beginner",
    duration: "5-10 mins",
    color: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
  },
  {
    id: "deadlift",
    name: "deadlift",
    description: "full body compound exercise",
    difficulty: "intermediate",
    duration: "10-15 mins",
    color: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
  },
  {
    id: "lunge",
    name: "lunge",
    description: "lower body unilateral exercise",
    difficulty: "beginner",
    duration: "5-10 mins",
    color: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
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
      <div className="exercise-card-container">
        <div className="exercise-card-header">
          <div className="exercise-card-info">
            <h3 className="exercise-name">{exercise.name}</h3>
            <p className="exercise-description">{exercise.description}</p>
          </div>
        </div>

        <div className="exercise-card-body">
          <div className="exercise-info">
            <div className="info-item">
              <span className="info-label">Level:</span>
              <span className="info-value">{exercise.difficulty}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Duration:</span>
              <span className="info-value">{exercise.duration}</span>
            </div>
          </div>
        </div>

        <div className="exercise-card-footer">
          <button
            onClick={() => handleStartWorkout(exercise)}
            className="exercise-start-button"
            disabled={isStarting === exercise.id}
            style={{ background: exercise.color }}
          >
            <span className="button-text">
              {isStarting === exercise.id ? "Starting..." : "Start Workout"}
            </span>
            <div className="button-icon">→</div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderStatsCard = () => (
    <div className="stats-card">
      <h3 className="stats-title">your progress</h3>
      <div className="stats-row">
        <div className="stat-item">
          <div className="stat-value">{analytics?.totalSessions || 0}</div>
          <div className="stat-label">workouts</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{analytics?.totalReps || 0}</div>
          <div className="stat-label">total reps</div>
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
      {/* Aurora Background */}
      <Aurora
        colorStops={["#83EBFC", "#B19EEF", "#5227FF"]}
        blend={0.5}
        amplitude={1.0}
        speed={0.5}
      />
  
      {/* Foreground content */}
      <Navigation />
  
      <div className="home-content">
        {/* Header */}
        <div className="home-header">
          <h1 className="greeting">
            welcome to ript!
          </h1>
          <p className="subtitle">ready for your next workout?</p>
        </div>
  
        {/* Stats Card */}
        {renderStatsCard()}
  
        {/* Exercise Selection */}
        <div className="exercises-section">
          <h2 className="section-title">choose your exercise</h2>
          <p className="section-subtitle">
            AI-powered form analysis for perfect technique
          </p>
  
          <div className="exercises-grid">
            {EXERCISES.map((exercise, index) =>
              renderExerciseCard(exercise, index)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
