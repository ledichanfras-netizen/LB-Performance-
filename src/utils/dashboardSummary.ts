import type { Athlete } from '../types';
import { metricDay } from './metricTimeline';

export const validNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export function sessionLoad(session: { rpe?: number; durationMinutes?: number }): number | null {
  return validNumber(session.rpe) && session.rpe >= 0 && session.rpe <= 10 && validNumber(session.durationMinutes) && session.durationMinutes > 0
    ? session.rpe * session.durationMinutes : null;
}

export function dashboardSummary(athlete: Athlete, today: string) {
  const day = metricDay(today)!;
  const offset = (new Date(day).getUTCDay() + 6) % 7;
  const weekStart = day - offset * 86400000;
  const weekEnd = weekStart + 6 * 86400000;
  const inWeek = (date: string) => { const d = metricDay(date); return d !== null && d >= weekStart && d <= day; };
  const workouts = (athlete.workouts || []).filter(w => inWeek(w.date));
  const completed = workouts.filter(w => w.status === 'completed');
  const external = (athlete.externalSessions || []).filter(s => inWeek(s.date));
  const sessions = [...completed, ...external];
  const loads = sessions.map(sessionLoad).filter((n): n is number => n !== null);
  const todayWellness = [...(athlete.wellness || [])].filter(w => metricDay(w.date) === day)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const todayWorkouts = (athlete.workouts || []).filter(w => metricDay(w.date) === day);
  const latestSession = [...(athlete.workouts || []).filter(w => w.status === 'completed'), ...(athlete.externalSessions || [])]
    .filter(w => { const d = metricDay(w.date); return d !== null && d <= day; })
    .sort((a,b) => (metricDay(b.date)! - metricDay(a.date)!) || b.date.localeCompare(a.date))[0];
  const dailyLoads = Array.from({ length: offset + 1 }, (_, i) => {
    const time = weekStart + i * 86400000;
    const sameDay = sessions.filter(s => metricDay(s.date) === time);
    const values = sameDay.map(sessionLoad).filter((n): n is number => n !== null);
    return { time, load: values.length ? values.reduce((a,b) => a+b,0) : null };
  });
  return {
    weekStart, weekEnd, todayWellness, todayWorkouts, latestSession, dailyLoads,
    completedCount: completed.length, scheduledCount: workouts.length, externalCount: external.length,
    sessionCount: sessions.length, load: loads.length ? loads.reduce((a,b) => a+b,0) : null,
    loadCoverage: loads.length,
    pendingRpe: sessions.filter(s => !validNumber(s.rpe) || s.rpe < 0 || s.rpe > 10).length,
    previousPending: workouts.filter(w => w.status !== 'completed' && metricDay(w.date)! < day).length,
  };
}
