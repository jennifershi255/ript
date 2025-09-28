import React, { useEffect, useMemo } from "react";
import Navigation from "../components/Navigation";
import { useWorkout } from "../context/WorkoutContext";
import DotGrid from "../components/DotGrid";
import "./AnalyticsScreen.css";

/* ------------------------ Utilities ------------------------ */
type DayStat = { date: string; count: number; reps: number };

function startOfDayISO(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/* ------------------- Heatmap Calendar ------------------- */
type HeatmapProps = { dataByDay: Record<string, DayStat>; weeks?: number };

const HeatmapCalendar: React.FC<HeatmapProps> = ({ dataByDay, weeks = 26 }) => {
  const today = new Date();
  const endSunday = addDays(today, -((today.getDay() + 7) % 7));
  const daysTotal = weeks * 7;
  const start = addDays(endSunday, -daysTotal + 1);

  const cells: { date: string; count: number }[] = [];
  let maxCount = 0;

  for (let i = 0; i < daysTotal; i++) {
    const dt = addDays(start, i);
    const key = startOfDayISO(dt);
    const val = dataByDay[key]?.count ?? 0;
    cells.push({ date: key, count: val });
    if (val > maxCount) maxCount = val;
  }

  const step = Math.max(1, Math.ceil(maxCount / 4));
  const level = (c: number) =>
    c === 0 ? 0 : c <= step ? 1 : c <= step * 2 ? 2 : c <= step * 3 ? 3 : 4;

  const columns: { date: string; count: number }[][] = [];
  for (let w = 0; w < weeks; w++) {
    columns.push(cells.slice(w * 7, w * 7 + 7));
  }

  return (
    <div className="heatmap-wrap">
      <div className="heatmap">
        <div className="heatmap-rows">
          {["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map((d, i) => (
            <div key={i} className="heatmap-rowlabel">
              {d}
            </div>
          ))}
        </div>

        <div className="heatmap-grid" aria-label="Activity calendar">
          {columns.map((week, wi) => (
            <div className="heatmap-col" key={wi}>
              {week.map((day, di) => {
                let lvl = level(day.count);

                // Hardcode blue for first Saturday (di = 6) and first Sunday (di = 0) in first column (wi = 0)
                if (wi === 0 && (di === 0 || di === 6)) {
                  lvl = 3; // Force level 3 (blue)
                }

                const title = `${day.date}: ${day.count} workout${
                  day.count === 1 ? "" : "s"
                }`;
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

      <div className="heatmap-legend">
        <span className="legend-label">less</span>
        <span className="day-cell l0" />
        <span className="day-cell l1" />
        <span className="day-cell l2" />
        <span className="day-cell l3" />
        <span className="day-cell l4" />
        <span className="legend-label">more</span>
      </div>
    </div>
  );
};

/* ------------------------- Screen ------------------------- */
const AnalyticsScreen: React.FC = () => {
  const { analytics, workoutHistory, loadAnalytics, loadWorkoutHistory } =
    useWorkout();

  useEffect(() => {
    loadAnalytics();
    loadWorkoutHistory();
  }, [loadAnalytics, loadWorkoutHistory]);

  const handleRefresh = () => {
    loadAnalytics();
    loadWorkoutHistory();
  };

  const dataByDay = useMemo(() => {
    const map: Record<string, DayStat> = {};
    (workoutHistory ?? []).forEach((w: any) => {
      // Only include sessions with actual workout data for activity chart
      if (w.totalReps > 0) {
        const key = startOfDayISO(new Date(w.startTime));
        if (!map[key]) map[key] = { date: key, count: 0, reps: 0 };
        map[key].count += 1;
        map[key].reps += Number(w.totalReps ?? 0);
      }
    });
    return map;
  }, [workoutHistory]);

  const { currentStreak, longestStreak } = useMemo(() => {
    const active = new Set(Object.keys(dataByDay));
    const today = new Date();

    let longest = 0;
    let run = 0;
    let p = new Date(today);
    for (let i = 0; i < 400; i++) {
      const k = startOfDayISO(p);
      if (active.has(k)) {
        run++;
        if (run > longest) longest = run;
      } else {
        run = 0;
      }
      p = addDays(p, -1);
    }

    let cur = 0;
    let q = new Date(today);
    while (active.has(startOfDayISO(q))) {
      cur++;
      q = addDays(q, -1);
    }

    return { currentStreak: cur, longestStreak: longest };
  }, [dataByDay]);

  const fmt = (n?: number) => (n ?? 0).toLocaleString();

  return (
    <div className="analytics-screen">
      {/* Fullscreen background grid */}
      <DotGrid
        dotSize={6} // smaller dots
        gap={24} // more spacing between dots
        baseColor="#191717"
        activeColor="83EBFC"
        proximity={200}
        shockRadius={250}
        shockStrength={30}
        resistance={400}
        returnDuration={1.5}
        className="dot-grid-bg"
      />

      {/* Foreground */}
      <Navigation />

      <div className="analytics-content">
        <header className="analytics-header">
          <h1>your progress</h1>
          <p>track your fitness journey with detailed analytics</p>
          {/* <button
            onClick={handleRefresh}
            style={{
              background: "var(--accent)",
              color: "var(--bg)",
              border: "none",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              marginTop: "10px",
              fontFamily: "var(--font-mono)",
            }}
          >
            🔄 Refresh Data
          </button> */}
        </header>

        <section className="overview-split">
          {/* LEFT */}
          <aside className="overview-left">
            <h3>overall statistics</h3>
            <div className="stat-stack">
              <div className="stat-item stat-tile">
                <div className="stat-icon">🏆</div>
                <div className="stat-main">{fmt(analytics?.totalSessions)}</div>
                <div className="stat-sub">total workouts</div>
              </div>
              <div className="stat-item stat-tile">
                <div className="stat-icon">⚡</div>
                <div className="stat-main">{fmt(analytics?.totalReps)}</div>
                <div className="stat-sub">total reps</div>
              </div>
              <div className="stat-item stat-tile">
                <div className="stat-icon">🎯</div>
                <div className="stat-main">
                  {Math.round(analytics?.averageFormAccuracy ?? 0)}%
                </div>
                <div className="stat-sub">average form</div>
              </div>
            </div>
          </aside>

          {/* RIGHT */}
          <div className="overview-right">
            <h3 className="activity-header">activity</h3>

            <HeatmapCalendar dataByDay={dataByDay} weeks={26} />

            <div className="streaks">
              <div className="streak-card">
                <div className="streak-icon">🔥</div>
                <div className="streak-meta">
                  <div className="streak-value">{currentStreak} days</div>
                  <div className="streak-label">current streak</div>
                </div>
              </div>

              <div className="streak-card">
                <div className="streak-icon">🏆</div>
                <div className="streak-meta">
                  <div className="streak-value">{longestStreak} days</div>
                  <div className="streak-label">longest streak</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Workouts */}
        <article className="analytics-card recent">
          <h3 className="recent-title">recent workouts</h3>

          <div className="workout-list">
            {workoutHistory?.length ? (
              workoutHistory.slice(0, 5).map((w: any, i: number) => (
                <div key={w.startTime + i} className="workout-item">
                  <div className="workout-exercise">
                    <span className="emoji">🏋️</span>
                    <span className="exercise-name">{w.exercise}</span>
                  </div>

                  <div className="workout-date">
                    {new Date(w.startTime).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>

                  <div className="workout-reps">
                    <span className="metric-number">{fmt(w.totalReps)}</span>
                    <span className="metric-label">reps</span>
                  </div>

                  <div className="workout-accuracy">
                    <span className="metric-number">
                      {Math.round(w.formAccuracy ?? 0)}
                    </span>
                    <span className="metric-label">%</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">no workout history available yet</p>
            )}
          </div>
        </article>
      </div>
    </div>
  );
};

export default AnalyticsScreen;
