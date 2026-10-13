import type { Athlete, Workout } from '../types';

type Cycle = Pick<Athlete, 'periodizationStart' | 'periodizationEnd' | 'trainingDays' | 'academyDays' | 'courtDays'>;
export const isSnapshotConflict = (error: any) => error?.status === 409 || error?.code === 'SYNC_CONFLICT' || String(error?.message || '').includes('atualizados em outro dispositivo');

/** Rebase only the generated prescription, never the entire stale athlete snapshot. */
export async function persistPeriodization(
  athleteId: string,
  generated: Workout[],
  cycle: Cycle,
  replacePending: boolean,
  io: { load: () => Promise<Athlete[]>; save: (athlete: Athlete) => Promise<void>; draft?: (athlete: Athlete) => void }
): Promise<Athlete> {
  const generatedIds = new Set(generated.map(w=>w.id));
  for (let attempt=0;attempt<3;attempt++) {
    const latest = (await io.load()).find(a=>a.id===athleteId);
    if (!latest) throw new Error('Aluno indisponível. A periodização foi preservada; confira a sincronização.');
    const preserved = (latest.workouts || []).filter(w=>!generatedIds.has(w.id) && (!replacePending || w.status==='completed' || w.status==='in_progress'));
    const candidate = {...latest,...cycle,workouts:[...generated,...preserved].sort((a,b)=>a.date.localeCompare(b.date))};
    io.draft?.(candidate);
    try {
      await io.save(candidate);
      return candidate;
    } catch (error) {
      if (!isSnapshotConflict(error) || attempt===2) throw error;
      // Fetch again and retry the SAME generated IDs; do not call generation again.
    }
  }
  throw new Error('Não foi possível confirmar o salvamento da periodização.');
}
