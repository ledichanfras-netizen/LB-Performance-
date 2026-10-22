import type { ExerciseSet, PrescribedExercise, Workout } from '../types';
import { detectSpecialMethod, parsePerSetWeights, parseRepetitions, parseWeightValue } from '../utils';

/** Pending execution rows follow the latest prescription; recorded results stay intact. */
export function reconcilePrescriptionSets(exercise: PrescribedExercise, status: Workout['status'] = 'planned'): PrescribedExercise {
  if (status === 'completed') return exercise;
  const previous = exercise.performedSets || [];
  const requested = Number(exercise.sets);
  const count = Number.isFinite(requested) && requested > 0 ? Math.max(1, Math.floor(requested)) : previous.length || 3;
  const special = detectSpecialMethod(exercise);
  const reps = parseRepetitions(special.clusterReps || exercise.reps);
  const weights = parsePerSetWeights(exercise.weight, count);
  const weight = parseWeightValue(exercise.weight);
  const performance = exercise.trainingMode && exercise.trainingMode !== 'strength';
  const distance = exercise.distanceMeters || (performance ? reps : 0);
  const time = exercise.defaultExecutionTime ? parseRepetitions(exercise.defaultExecutionTime) : exercise.trainingMode === 'conditioning' ? reps : 0;
  const performedSets: ExerciseSet[] = Array.from({ length: count }, (_, index) => {
    const existing = previous[index];
    // A running session may contain typed results that have not yet been checked off.
    if (existing && (existing.isCompleted || status === 'in_progress')) return { ...existing };
    const block = exercise.conditioningProtocol?.blocks[index];
    const blockVolume = block ? block.stages.reduce((sum, stage) => sum + stage, 0) * block.repetitions : 0;
    return {
      id: existing?.id || `set-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`}`,
      reps: block?.repetitions || reps,
      weight: weights[index] > 0 ? weights[index] : weight,
      distance: exercise.conditioningProtocol ? block?.unit === 'meters' ? blockVolume : 0 : distance,
      timeSeconds: exercise.conditioningProtocol ? block?.unit === 'seconds' ? blockVolume : 0 : time,
      intensity: exercise.targetIntensity || 0,
      rpe: 0,
      isCompleted: false,
    };
  });
  // Extra rows in a running session may hold unchecked results too; keep them.
  performedSets.push(...previous.slice(count).filter(set => status === 'in_progress' || set.isCompleted).map(set => ({ ...set })));
  return { ...exercise, sets: count, performedSets };
}
