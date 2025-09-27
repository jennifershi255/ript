import React, { useEffect, useMemo } from "react";
import Navigation from "../components/Navigation";
import { useWorkout } from "../context/WorkoutContext";
import DotGridBackground from "../components/DotGridBackground";
import "./AnalyticsScreen.css";

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
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
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
        <span className="legend-label">Less</span>
        <span className="day-cell l0" />
        <span className="day-cell l1" />
        <span className="day-cell l2" />
        <span className="day-cell l3" />
        <span className="day-cell l4" />
        <span className="legend-label">More</span>
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
      <DotGridBackground />
      <Navigation />

      <div className="analytics-content">
        <header className="analytics-header">
          <h1>Your Progress</h1>
          <p>Track your fitness journey with detailed analytics</p>
        </header>

        <section className="overview-split">
          {/* LEFT */}
          <aside className="overview-left">
            <h3>overall statistics</h3>
            <div className="stat-stack">
              <div className="stat-item stat-tile">
                <div className="stat-icon">🏆</div>
                <div className="stat-main">{fmt(analytics?.totalSessions)}</div>
                <div className="stat-sub">Total Workouts</div>
              </div>
              <div className="stat-item stat-tile">
                <div className="stat-icon">⚡</div>
                <div className="stat-main">{fmt(analytics?.totalReps)}</div>
                <div className="stat-sub">Total Reps</div>
              </div>
              <div className="stat-item stat-tile">
                <div className="stat-icon">🎯</div>
                <div className="stat-main">
                  {Math.round(analytics?.averageFormAccuracy ?? 0)}%
                </div>
                <div className="stat-sub">Average Form</div>
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
                  <div className="streak-label">Current Streak</div>
                </div>
              </div>

              <div className="streak-card">
                <div className="streak-icon">🏆</div>
                <div className="streak-meta">
                  <div className="streak-value">{longestStreak} days</div>
                  <div className="streak-label">Longest Streak</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Workouts */}
        <article className="analytics-card recent">
          <h3>Recent Workouts</h3>
          <div className="workout-list">
            {workoutHistory?.length ? (
              workoutHistory.slice(0, 5).map((w: any, i: number) => (
                <div key={w.startTime + i} className="workout-item">
                  <div className="workout-info">
                    <span className="workout-exercise">🏋️ {w.exercise}</span>
                    <time className="workout-date">
                      {new Date(w.startTime).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                  <div className="workout-stats">
                    <span className="workout-reps">⚡ {fmt(w.totalReps)} reps</span>
                    <span className="workout-accuracy">
                      🎯 {Math.round(w.formAccuracy ?? 0)}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No workout history available yet</p>
            )}
          </div>
        </article>
      </div>
    </div>
  );
};

export default AnalyticsScreen;
