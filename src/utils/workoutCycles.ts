import type { Workout } from '../types';

export const MISSED_WORKOUT_REASONS = [
  'Falta sem aviso',
  'Motivo pessoal / Trabalho',
  'Viagem / Competição',
  'Lesão ou dor',
  'Fadiga / Descanso estratégico',
  'Doença / Imprevisto',
] as const;

export const isWorkoutPending = (w: Pick<Workout, 'status'>): boolean =>
  w.status === 'planned' || w.status === 'in_progress';

export const isWorkoutCompleted = (w: Pick<Workout, 'status'>): boolean =>
  w.status === 'completed';

export const isWorkoutMissed = (w: Pick<Workout, 'status'>): boolean =>
  w.status === 'missed';

export interface WorkoutCycleStats {
  phase: string;
  total: number;
  completed: number;
  missed: number;
  pending: number;
  adherencePercent: number | null;
  firstDate: string;
  lastDate: string;
  missedReasons: Array<{ reason: string; count: number }>;
}

export interface PeriodizationCycleSummary {
  start: string;
  end: string;
  total: number;
  completed: number;
  missed: number;
  pending: number;
  adherencePercent: number | null;
}

export interface WorkoutCyclesReport {
  cycles: WorkoutCycleStats[];
  totals: {
    total: number;
    completed: number;
    missed: number;
    pending: number;
    adherencePercent: number | null;
  };
  activePeriodization: PeriodizationCycleSummary | null;
}

const normalizeDay = (date?: string): string => {
  if (!date || typeof date !== 'string') return '';
  const match = date.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
};

const computeAdherence = (completed: number, missed: number): number | null => {
  const resolved = completed + missed;
  return resolved > 0 ? Math.round((completed / resolved) * 100) : null;
};

export function summarizeWorkoutsByCycle(
  workouts: ReadonlyArray<Workout> = [],
  periodization?: { start?: string; end?: string }
): WorkoutCyclesReport {
  const groups = new Map<
    string,
    {
      phase: string;
      total: number;
      completed: number;
      missed: number;
      pending: number;
      firstDate: string;
      lastDate: string;
      reasons: Map<string, number>;
    }
  >();

  let totalCompleted = 0;
  let totalMissed = 0;
  let totalPending = 0;

  for (const w of workouts) {
    if (!w) continue;
    const rawPhase = typeof w.phase === 'string' && w.phase.trim() ? w.phase.trim() : 'Sem ciclo definido';
    const key = rawPhase.toLocaleLowerCase('pt-BR');
    let group = groups.get(key);
    if (!group) {
      group = {
        phase: rawPhase,
        total: 0,
        completed: 0,
        missed: 0,
        pending: 0,
        firstDate: '',
        lastDate: '',
        reasons: new Map(),
      };
      groups.set(key, group);
    }

    const day = normalizeDay(w.date);
    if (day) {
      if (!group.firstDate || day < group.firstDate) group.firstDate = day;
      if (!group.lastDate || day > group.lastDate) group.lastDate = day;
    }

    group.total += 1;
    if (w.status === 'completed') {
      group.completed += 1;
      totalCompleted += 1;
    } else if (w.status === 'missed') {
      group.missed += 1;
      totalMissed += 1;
      const reason = typeof w.missedReason === 'string' && w.missedReason.trim()
        ? w.missedReason.trim()
        : 'Motivo não informado';
      group.reasons.set(reason, (group.reasons.get(reason) || 0) + 1);
    } else {
      group.pending += 1;
      totalPending += 1;
    }
  }

  const cycles: WorkoutCycleStats[] = Array.from(groups.values())
    .map(g => ({
      phase: g.phase,
      total: g.total,
      completed: g.completed,
      missed: g.missed,
      pending: g.pending,
      adherencePercent: computeAdherence(g.completed, g.missed),
      firstDate: g.firstDate,
      lastDate: g.lastDate,
      missedReasons: Array.from(g.reasons.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason)),
    }))
    .sort((a, b) => {
      if (a.lastDate !== b.lastDate) return b.lastDate.localeCompare(a.lastDate);
      return a.phase.localeCompare(b.phase);
    });

  const start = normalizeDay(periodization?.start);
  const end = normalizeDay(periodization?.end);
  let activePeriodization: PeriodizationCycleSummary | null = null;
  if (start && end && start <= end) {
    let pTotal = 0;
    let pCompleted = 0;
    let pMissed = 0;
    let pPending = 0;
    for (const w of workouts) {
      const day = normalizeDay(w?.date);
      if (!day || day < start || day > end) continue;
      pTotal += 1;
      if (w.status === 'completed') pCompleted += 1;
      else if (w.status === 'missed') pMissed += 1;
      else pPending += 1;
    }
    activePeriodization = {
      start,
      end,
      total: pTotal,
      completed: pCompleted,
      missed: pMissed,
      pending: pPending,
      adherencePercent: computeAdherence(pCompleted, pMissed),
    };
  }

  return {
    cycles,
    totals: {
      total: totalCompleted + totalMissed + totalPending,
      completed: totalCompleted,
      missed: totalMissed,
      pending: totalPending,
      adherencePercent: computeAdherence(totalCompleted, totalMissed),
    },
    activePeriodization,
  };
}
