import React, { useEffect } from "react";
import { useWorkout } from "../context/WorkoutContext";
import Navigation from "../components/Navigation";
import "./AnalyticsScreen.css";

const AnalyticsScreen: React.FC = () => {
  const { analytics, workoutHistory, loadAnalytics, loadWorkoutHistory } =
    useWorkout();

  useEffect(() => {
    loadAnalytics();
    loadWorkoutHistory();
  }, []);

  return (
    <div className="analytics-screen">
      <Navigation />

      <div className="analytics-content">
        <div className="analytics-header">
          <h1>📊 Your Progress</h1>
          <p>Track your fitness journey with detailed analytics</p>
        </div>

        <div className="analytics-grid">
          {/* Overall Stats */}
          <div className="analytics-card">
            <h3>📊 Overall Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-icon">🏋️</div>
                <div className="stat-value">
                  {analytics?.totalSessions || 0}
                </div>
                <div className="stat-label">Total Workouts</div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">⚡</div>
                <div className="stat-value">{analytics?.totalReps || 0}</div>
                <div className="stat-label">Total Reps</div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">🎯</div>
                <div className="stat-value">
                  {analytics?.averageFormAccuracy || 0}%
                </div>
                <div className="stat-label">Average Form</div>
              </div>
            </div>
          </div>

          {/* Exercise Breakdown */}
          <div className="analytics-card">
            <h3>💪 Exercise Breakdown</h3>
            <div className="exercise-list">
              {analytics?.exerciseBreakdown?.map((exercise, index) => (
                <div key={index} className="exercise-item">
                  <div className="exercise-info">
                    <span className="exercise-name">{exercise.exercise}</span>
                    <span className="exercise-reps">{exercise.reps} reps</span>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar" 
                        style={{ width: `${exercise.formAccuracy}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="exercise-accuracy">
                    {exercise.formAccuracy}%
                  </div>
                </div>
              )) || <p className="no-data">No exercise data available yet</p>}
            </div>
          </div>

          {/* Recent Workouts */}
          <div className="analytics-card full-width">
            <h3>📅 Recent Workouts</h3>
            <div className="workout-list">
              {workoutHistory?.slice(0, 5).map((workout, index) => (
                <div key={index} className="workout-item">
                  <div className="workout-info">
                    <div className="workout-header">
                      <span className="workout-exercise">🏋️ {workout.exercise}</span>
                      <span className="workout-date">
                        {new Date(workout.startTime).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="workout-progress">
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar" 
                          style={{ width: `${workout.formAccuracy}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="workout-stats">
                    <span className="workout-reps">
                      ⚡ {workout.totalReps} reps
                    </span>
                    <span className="workout-accuracy">
                      🎯 {workout.formAccuracy}%
                    </span>
                  </div>
                </div>
              )) || <p className="no-data">No workout history available yet</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsScreen;
