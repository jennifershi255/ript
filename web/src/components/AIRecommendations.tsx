import React, { useState, useEffect } from "react";
import { analysisAPI } from "../services/api";
import "./AIRecommendations.css";

interface APIResponse<T> {
  success: boolean;
  recommendations?: T;
  error?: string;
}

interface Exercise {
  name: string;
  reason: string;
  sets: number;
  reps: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  focusAreas?: string[];
}

interface Recommendations {
  exercises: Exercise[];
  overallStrategy: string;
  progressionTips: string;
  aiGenerated?: boolean;
}

interface AIRecommendationsProps {
  recentSessions?: any[];
  userGoals?: string[];
  onExerciseSelect?: (exercise: string) => void;
}

const AIRecommendations: React.FC<AIRecommendationsProps> = ({
  recentSessions = [],
  userGoals = [],
  onExerciseSelect,
}) => {
  const [recommendations, setRecommendations] =
    useState<Recommendations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = (await analysisAPI.getAIRecommendations(
        recentSessions,
        userGoals
      )) as unknown as APIResponse<Recommendations>;

      if (response.success) {
        setRecommendations(response.recommendations || null);
      } else {
        setError("Failed to load recommendations");
      }
    } catch (err) {
      console.error("Error loading AI recommendations:", err);
      setError("Unable to get AI recommendations");
    } finally {
      setIsLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "#10b981";
      case "intermediate":
        return "#f59e0b";
      case "advanced":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "🟢";
      case "intermediate":
        return "🟡";
      case "advanced":
        return "🔴";
      default:
        return "⚪";
    }
  };

  const formatExerciseName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1).replace("_", " ");
  };

  if (isLoading) {
    return (
      <div className="ai-recommendations-card">
        <div className="recommendations-header">
          <h3>🤖 AI Workout Recommendations</h3>
        </div>
        <div className="loading-recommendations">
          <div className="loading-spinner"></div>
          <p>Generating personalized workout recommendations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-recommendations-card">
        <div className="recommendations-header">
          <h3>🤖 AI Workout Recommendations</h3>
        </div>
        <div className="error-recommendations">
          <p className="error-message">{error}</p>
          <button onClick={loadRecommendations} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!recommendations) return null;

  return (
    <div className="ai-recommendations-card">
      <div className="recommendations-header">
        <div className="header-content">
          <h3>🤖 AI Workout Recommendations</h3>
          {recommendations.aiGenerated && (
            <span className="ai-badge">AI Generated</span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="expand-button"
        >
          {isExpanded ? "−" : "+"}
        </button>
      </div>

      <div className="recommendations-content">
        {/* Overall Strategy */}
        <div className="strategy-section">
          <p className="strategy-text">{recommendations.overallStrategy}</p>
        </div>

        {/* Exercise Recommendations */}
        <div className="exercises-section">
          <h4>Recommended Exercises</h4>
          <div className="exercises-grid">
            {recommendations.exercises
              .slice(0, isExpanded ? undefined : 3)
              .map((exercise, index) => (
                <div key={index} className="exercise-recommendation">
                  <div className="exercise-header">
                    <div className="exercise-info">
                      <h5 className="exercise-name">
                        {formatExerciseName(exercise.name)}
                      </h5>
                      <div className="exercise-meta">
                        <span
                          className="difficulty-badge"
                          style={{
                            color: getDifficultyColor(exercise.difficulty),
                          }}
                        >
                          {getDifficultyIcon(exercise.difficulty)}{" "}
                          {exercise.difficulty}
                        </span>
                        <span className="sets-reps">
                          {exercise.sets} × {exercise.reps}
                        </span>
                      </div>
                    </div>
                    {onExerciseSelect && (
                      <button
                        onClick={() => onExerciseSelect(exercise.name)}
                        className="start-exercise-button"
                      >
                        Start
                      </button>
                    )}
                  </div>

                  <p className="exercise-reason">{exercise.reason}</p>

                  {exercise.focusAreas && exercise.focusAreas.length > 0 && (
                    <div className="focus-areas">
                      <span className="focus-label">Focus:</span>
                      {exercise.focusAreas.map((area, idx) => (
                        <span key={idx} className="focus-tag">
                          {area}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>

          {recommendations.exercises.length > 3 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="show-more-button"
            >
              {isExpanded
                ? "Show Less"
                : `Show ${recommendations.exercises.length - 3} More`}
            </button>
          )}
        </div>

        {/* Progression Tips */}
        {isExpanded && recommendations.progressionTips && (
          <div className="progression-section">
            <h4>💡 Progression Tips</h4>
            <p className="progression-text">
              {recommendations.progressionTips}
            </p>
          </div>
        )}

        {/* Refresh Button */}
        <div className="recommendations-footer">
          <button onClick={loadRecommendations} className="refresh-button">
            🔄 Get New Recommendations
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIRecommendations;
