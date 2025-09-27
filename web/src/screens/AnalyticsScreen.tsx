import React, { useEffect, useMemo } from "react";
import Navigation from "../components/Navigation";
import { useWorkout } from "../context/WorkoutContext";
import "./AnalyticsScreen.css";

/* ------------------------------ helpers ------------------------------ */

type DayStat = { date: string; count: number; reps: number };

function startOfDayISO(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10); // YYYY-MM-DD
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/* ---------------------------- Heatmap Calendar ---------------------------- */

type HeatmapProps = {
  dataByDay: Record<string, DayStat>; // keyed by YYYY-MM-DD
  weeks?: number;                      // how many weeks back to show (default 26)
  title?: string;
};

const HeatmapCalendar: React.FC<HeatmapProps> = ({ dataByDay, weeks = 26, title }) => {
  // build a matrix of days (rows = Sun..Sat, cols = weeks)
  const today = new Date();
  const end = addDays(today, 0);
  const endSunday = addDays(end, -((end.getDay() + 7) % 7)); // last Sunday (align like GitHub)

  const daysTotal = weeks * 7;
  const start = addDays(endSunday, -daysTotal + 1);

  const cells: { date: string; count: number }[] = [];
  let maxCount = 0;

  for (let i = 0; i < daysTotal; i++) {
    const dt = addDays(start, i);
    const key = startOfDayISO(dt);
    const val = dataByDay[key]?.count ?? 0; // sessions that day
    cells.push({ date: key, count: val });
    maxCount = Math.max(maxCount, val);
  }

  // thresholds (0..4) auto-scale by max
  const step = Math.max(1, Math.ceil(maxCount / 4));

  function level(c: number) {
    if (c === 0) return 0;
    if (c <= step) return 1;
    if (c <= step * 2) return 2;
    if (c <= step * 3) return 3;
    return 4;
  }

  // columns by week
  const columns: { date: string; count: number }[][] = [];
  for (let w = 0; w < weeks; w++) {
    columns.push(cells.slice(w * 7, w * 7 + 7));
  }

  return (
    <div className="heatmap-wrap">
      {title && <div className="heatmap-title">{title}</div>}
      <div className="heatmap">
        {/* weekday labels */}
        <div className="heatmap-rows">
          {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
            <div key={i} className="heatmap-rowlabel">
              {d}
            </div>
          ))}
        </div>
        <div className="heatmap-grid" aria-label="Activity calendar">
          {columns.map((week, wi) => (
            <div className="heatmap-col" key={wi}>
              {week.map((day, di) => {
                const lvl = level(day.count);
                const title = `${day.date}: ${day.count} workout${day.count === 1 ? "" : "s"}`;
                return (
                  <div
                    key={di}
                    className={`day-cell l${lvl}`}
                    title={title}
                    aria-label={title}
                    role="img"
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* legend */}
      <div className="heatmap-legend">
        <span className="legend-label">Less</span>
        <span className="day-cell l0" aria-hidden />
        <span className="day-cell l1" aria-hidden />
        <span className="day-cell l2" aria-hidden />
        <span className="day-cell l3" aria-hidden />
        <span className="day-cell l4" aria-hidden />
        <span className="legend-label">More</span>
      </div>
    </div>
  );
};

/* --------------------------------- Screen -------------------------------- */

const AnalyticsScreen: React.FC = () => {
  const { analytics, workoutHistory, loadAnalytics, loadWorkoutHistory } = useWorkout();

  useEffect(() => {
    loadAnalytics();
    loadWorkoutHistory();
  }, [loadAnalytics, loadWorkoutHistory]);

  const formatNum = (n?: number) => (n ?? 0).toLocaleString();

  // Aggregate history into days
  const dataByDay = useMemo(() => {
    const map: Record<string, DayStat> = {};
    (workoutHistory ?? []).forEach((w: any) => {
      const key = startOfDayISO(new Date(w.startTime));
      if (!map[key]) map[key] = { date: key, count: 0, reps: 0 };
      map[key].count += 1;
      map[key].reps += Number(w.totalReps ?? 0);
    });
    return map;
  }, [workoutHistory]);

  // Streaks
  const { currentStreak, longestStreak } = useMemo(() => {
    // set of active days
    const days = new Set(Object.keys(dataByDay));
    // iterate backward from today
    let cur = 0;
    let best = 0;

    // we’ll scan back 400 days which is plenty
    const today = new Date();
    let ptr = new Date(today);
    for (let i = 0; i < 400; i++) {
      const key = startOfDayISO(ptr);
      if (days.has(key)) {
        cur += 1;
        best = Math.max(best, cur);
      } else {
        // break only for currentStreak calc, but continue to find longest
        if (i === 0) {
          cur = 0;
        } else {
          // keep longest by scanning but reset cur
          cur = 0;
        }
      }
      ptr = addDays(ptr, -1);
    }
    // compute current streak again accurately (consecutive up to today)
    let cur2 = 0;
    let p = new Date(today);
    for (;;) {
      const k = startOfDayISO(p);
      if (days.has(k)) {
        cur2++;
        p = addDays(p, -1);
      } else break;
    }
    return { currentStreak: cur2, longestStreak: best };
  }, [dataByDay]);

  return (
    <div className="analytics-screen">
      <Navigation />

      <div className="analytics-content">
        <header className="analytics-header">
          <h1>Your Progress</h1>
          <p>Track your fitness journey with detailed analytics</p>
        </header>

        <section className="analytics-grid">
          {/* Overall Stats */}
          <article className="analytics-card">
            <h3>Overall Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-icon">🏋️</div>
                <div className="stat-value">{formatNum(analytics?.totalSessions)}</div>
                <div className="stat-label">Total Workouts</div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">⚡</div>
                <div className="stat-value">{formatNum(analytics?.totalReps)}</div>
                <div className="stat-label">Total Reps</div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">🎯</div>
                <div className="stat-value">
                  {Math.round(analytics?.averageFormAccuracy ?? 0)}%
                </div>
                <div className="stat-label">Average Form</div>
              </div>
            </div>
          </article>

          {/* Activity Calendar + Streaks (replacing Exercise Breakdown) */}
          <article className="analytics-card">
            <h3>Activity</h3>
            <HeatmapCalendar dataByDay={dataByDay} weeks={26} />
            <div className="streaks">
              <div className="streak-card">
                <div className="streak-icon">🔥</div>
                <div className="streak-meta">
                  <div className="streak-value">{currentStreak} day{currentStreak === 1 ? "" : "s"}</div>
                  <div className="streak-label">Current Streak</div>
                </div>
              </div>
              <div className="streak-card">
                <div className="streak-icon">🏆</div>
                <div className="streak-meta">
                  <div className="streak-value">{longestStreak} day{longestStreak === 1 ? "" : "s"}</div>
                  <div className="streak-label">Longest Streak</div>
                </div>
              </div>
            </div>
          </article>

          {/* Recent Workouts (keep your clean list or bars as-is) */}
          <article className="analytics-card full-width">
            <h3>Recent Workouts</h3>
            <div className="workout-list">
              {workoutHistory?.slice(0, 5).map((workout: any, index: number) => (
                <div key={index} className="workout-item">
                  <div className="workout-info">
                    <div className="workout-header">
                      <span className="workout-exercise">🏋️ {workout.exercise}</span>
                      <span className="workout-date">
                        {new Date(workout.startTime).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="workout-progress">
                      <div className="progress-bar-container">
                        <div
                          className="progress-bar"
                          style={{ width: `${Math.round(workout.formAccuracy ?? 0)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="workout-stats">
                    <span className="workout-reps">⚡ {formatNum(workout.totalReps)} reps</span>
                    <span className="workout-accuracy">
                      🎯 {Math.round(workout.formAccuracy ?? 0)}%
                    </span>
                  </div>
                </div>
              )) || <p className="no-data">No workout history available yet</p>}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
};

export default AnalyticsScreen;
