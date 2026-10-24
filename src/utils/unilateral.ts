import type { ExerciseSet, PrescribedExercise, Workout } from '../types';
import { parsePerSetWeights, parseRepetitions, parseWeightValue } from '../utils';
import { classifyLaterality } from './exerciseLaterality';

export type ExerciseSide = 'left' | 'right';
export const sideLabel = (side: ExerciseSide) => side === 'left' ? 'Lado esquerdo' : 'Lado direito';
export const sideOrder = (ex: PrescribedExercise): ExerciseSide[] => ex.startingSide === 'right' ? ['right', 'left'] : ['left', 'right'];
// The side and ordinal travel in the existing durable set ID, including athlete-only saves.
// No dependency on row ordering or a new database column.
export const getSetSide = (set: ExerciseSet): ExerciseSide | undefined => set.side || (set.id.match(/:lb-(left|right):\d+$/)?.[1] as ExerciseSide | undefined);
const ordinal = (set: ExerciseSet) => Number(set.id.match(/:lb-(?:left|right):(\d+)$/)?.[1]) || 0;
export const sideSets = (ex: PrescribedExercise, side: ExerciseSide) => (ex.performedSets || []).filter(s => getSetSide(s) === side).sort((a,b) => ordinal(a)-ordinal(b));
export const unilateralEligible = (ex: PrescribedExercise) => !ex.conditioningProtocol && !ex.isStructuredRunning && (!ex.trainingMode || ex.trainingMode === 'strength') && ex.repsType !== 'meters';
export const isUnilateral = (ex: PrescribedExercise) => ex.lateralType === 'Bilateral' ? false : classifyLaterality(ex) === 'Unilateral' || !!ex.sidePrescriptions;
export function prescriptionSummary(ex: PrescribedExercise): string {
  if (!ex.sidePrescriptions) return `${ex.sets} × ${ex.reps} @ ${ex.weight}${isUnilateral(ex) ? ' · por lado' : ''}`;
  return sideOrder(ex).map(side => { const p=ex.sidePrescriptions![side];return `${side === 'left' ? 'Esq.' : 'Dir.'}: ${p.sets} × ${p.reps} @ ${p.weight}`; }).join(' · ');
}

export function reconcileUnilateralSets(ex: PrescribedExercise, status: Workout['status']): PrescribedExercise {
  if (!ex.sidePrescriptions || status === 'completed') return ex;
  const previous=ex.performedSets || [];
  const used = new Set<string>();
  const sets: ExerciseSet[]=[];
  const prescriptions={...ex.sidePrescriptions};
  for (const side of sideOrder(ex)) {
    const p=prescriptions[side];
    const count=Math.max(1,Math.min(25,Math.floor(Number(p.sets)||1)));
    prescriptions[side]={...p,sets:count};
    const old=sideSets(ex,side);
    const weights=parsePerSetWeights(p.weight,count);
    for(let index=0;index<count;index++) {
      const existing=old.find(s=>ordinal(s)===index+1) || old.filter(s=>!ordinal(s))[index];
      if(existing)used.add(existing.id);
      if(existing && (existing.isCompleted || status==='in_progress')) {sets.push({...existing,side});continue;}
      sets.push({id:existing?.id || `set-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}:lb-${side}:${index+1}`,side,reps:parseRepetitions(p.reps),weight:weights[index] ?? parseWeightValue(p.weight),rpe:0,isCompleted:false,timeSeconds:ex.repsType==='time'?parseRepetitions(p.reps):0});
    }
  }
  // Unlabelled historical results must never be guessed to belong to a leg.
  sets.push(...previous.filter(s=>!used.has(s.id) && (s.isCompleted || status==='in_progress')).map(s=>({...s})));
  return {...ex,sidePrescriptions:prescriptions,sets:prescriptions.left.sets+prescriptions.right.sets,performedSets:sets};
}
