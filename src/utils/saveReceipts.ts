import type { Athlete } from '../types';

export interface SaveReceipt {
  matchesByAthlete?: Record<string, any>;
  syncRevisions?: Record<string, string>;
  workoutRevisions?: Record<string, string>;
}

const isoRevision = (value?: string): string | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : undefined;
};

/** Apply authoritative server syncRevision and workoutRevisions from a /api/salvar receipt. */
export function applySaveReceiptToAthletes(athletes: Athlete[], receipt: SaveReceipt): Athlete[] {
  const { matchesByAthlete, syncRevisions, workoutRevisions } = receipt;
  if (!matchesByAthlete && !syncRevisions && !workoutRevisions) return athletes;
  return athletes.map((a) => {
    const nextMatches = matchesByAthlete?.[a.id];
    const nextSync = syncRevisions?.[a.id];
    let workoutsChanged = false;
    const nextWorkouts = workoutRevisions && Array.isArray(a.workouts)
      ? a.workouts.map((w) => {
          const nextRev = workoutRevisions[w.id];
          if (nextRev && w.updatedAt !== nextRev) {
            workoutsChanged = true;
            return { ...w, updatedAt: nextRev };
          }
          return w;
        })
      : a.workouts;
    if (!nextMatches && !nextSync && !workoutsChanged) return a;
    return {
      ...a,
      ...(nextMatches ? { matches: nextMatches } : {}),
      ...(nextSync ? { syncRevision: nextSync } : {}),
      ...(workoutsChanged ? { workouts: nextWorkouts } : {}),
    };
  });
}

/** Detect stale workout timestamps or unconfirmed local statuses even when athlete syncRevision matches. */
export function hasStaleCachedWorkouts(cached: Athlete, summary: Athlete): boolean {
  const cachedWorkouts = cached.workouts || [];
  const summaryWorkouts = summary.workouts || [];
  if (cachedWorkouts.length !== summaryWorkouts.length) return true;
  const byId = new Map(cachedWorkouts.map((w) => [w.id, w]));
  for (const sw of summaryWorkouts) {
    const cw = byId.get(sw.id);
    if (!cw) return true;
    if (cw.status !== sw.status) return true;
    const summaryRev = isoRevision(sw.updatedAt);
    const cachedRev = isoRevision(cw.updatedAt);
    if (summaryRev && cachedRev !== summaryRev) return true;
  }
  return false;
}

/**
 * Reconcile a workout's baseUpdatedAt ONLY when this same tab's in-flight /api/salvar
 * transitioned the workout from requestedBaseRevision -> currentRevision.
 */
export function resolveWorkoutExecutionBaseRevision(
  currentWorkoutUpdatedAt: string | undefined,
  requestedBaseUpdatedAt: string | undefined,
  reconciled?: { fromRevision?: string; toRevision: string }
): string | undefined {
  if (
    reconciled &&
    reconciled.fromRevision === requestedBaseUpdatedAt &&
    currentWorkoutUpdatedAt === reconciled.toRevision
  ) {
    return reconciled.toRevision;
  }
  return requestedBaseUpdatedAt;
}
