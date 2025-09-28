import React, { useState, useEffect } from "react";
import { analysisAPI } from "../services/api";
import "./AICoachingPanel.css";

interface APIResponse<T> {
  success: boolean;
  coaching?: T;
  error?: string;
}

interface AICoachingData {
  primaryFeedback: string;
  technicalCues: string[];
  encouragement: string;
  nextSteps: string;
  formRating: "excellent" | "good" | "needs_improvement" | "poor";
  priority: "high" | "medium" | "low";
}

interface AICoachingPanelProps {
  exercise: string;
  analysisData?: any;
  isVisible: boolean;
  onClose: () => void;
}

const AICoachingPanel: React.FC<AICoachingPanelProps> = ({
  exercise,
  analysisData,
  isVisible,
  onClose,
}) => {
  const [coachingData, setCoachingData] = useState<AICoachingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible && exercise) {
      loadCoachingTips();
    }
  }, [isVisible, exercise]);

  const loadCoachingTips = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = (await analysisAPI.getCoachingTips(
        exercise
      )) as unknown as APIResponse<AICoachingData>;

      if (response.success) {
        setCoachingData(response.coaching || null);
      } else {
        setError("Failed to load coaching tips");
      }
    } catch (err) {
      console.error("Error loading coaching tips:", err);
      setError("Unable to connect to AI coach");
    } finally {
      setIsLoading(false);
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "excellent":
        return "#10b981";
      case "good":
        return "#f59e0b";
      case "needs_improvement":
        return "#ef4444";
      case "poor":
        return "#dc2626";
      default:
        return "#6b7280";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return "🔥";
      case "medium":
        return "⚡";
      case "low":
        return "💡";
      default:
        return "💡";
    }
  };

  if (!isVisible) return null;

  return (
    <div className="ai-coaching-overlay">
      <div className="ai-coaching-panel">
        <div className="coaching-header">
          <div className="coaching-title">
            <span className="ai-icon">🤖</span>
            <h3>AI Coach</h3>
          </div>
          <button onClick={onClose} className="close-button">
            ×
          </button>
        </div>

        <div className="coaching-content">
          {isLoading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Getting personalized coaching tips...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p className="error-message">{error}</p>
              <button onClick={loadCoachingTips} className="retry-button">
                Try Again
              </button>
            </div>
          )}

          {coachingData && !isLoading && (
            <>
              {/* Primary Feedback */}
              <div className="feedback-section">
                <div className="section-header">
                  <span className="priority-icon">
                    {getPriorityIcon(coachingData.priority)}
                  </span>
                  <h4>Key Focus</h4>
                  <span
                    className="form-rating"
                    style={{ color: getRatingColor(coachingData.formRating) }}
                  >
                    {coachingData.formRating.replace("_", " ")}
                  </span>
                </div>
                <p className="primary-feedback">
                  {coachingData.primaryFeedback}
                </p>
              </div>

              {/* Technical Cues */}
              {coachingData.technicalCues &&
                coachingData.technicalCues.length > 0 && (
                  <div className="cues-section">
                    <h4>🎯 Technique Tips</h4>
                    <ul className="technical-cues">
                      {coachingData.technicalCues.map((cue, index) => (
                        <li key={index} className="cue-item">
                          {cue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Encouragement */}
              {coachingData.encouragement && (
                <div className="encouragement-section">
                  <h4>💪 Motivation</h4>
                  <p className="encouragement">{coachingData.encouragement}</p>
                </div>
              )}

              {/* Next Steps */}
              {coachingData.nextSteps && (
                <div className="next-steps-section">
                  <h4>🎯 Next Steps</h4>
                  <p className="next-steps">{coachingData.nextSteps}</p>
                </div>
              )}

              {/* Analysis Data Display */}
              <div className="analysis-summary">
                <h4>📊 Current Analysis</h4>
                <div className="analysis-stats">
                  <div className="stat">
                    <span className="stat-label">Form Score</span>
                    <span className="stat-value">86/100</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Phase</span>
                    <span className="stat-value">
                      {analysisData?.phase || "descending"}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Rep #</span>
                    <span className="stat-value">3</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="coaching-footer">
          <p className="ai-disclaimer">
            💡 AI-powered coaching based on your form analysis and fitness
            profile
          </p>
        </div>
      </div>
    </div>
  );
};

export default AICoachingPanel;
