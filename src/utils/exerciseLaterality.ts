type ExerciseDescription = { name?: string; nameEn?: string; defaultReps?: string; reps?: string; lateralType?: string };
const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[-–—]/g, ' ');

/** Only the exercise itself and its dose are evidence; related exercises and progressions are not. */
export function classifyLaterality(ex: ExerciseDescription): 'Unilateral' | 'Bilateral' | 'N/A' {
  const name = normalize(`${ex.name || ''} ${ex.nameEn || ''}`);
  const dose = normalize(ex.defaultReps || ex.reps || '');
  if (/\bunilateral\b|\bunipodal\b|\bmonopodal\b|\bsingle (leg|arm)\b|\bone (leg|arm)\b|\beach (leg|arm)\b|\b(one|single) sided\b|\bpor lado\b|\/\s*lado\b/.test(`${name} ${dose}`) ||
    /\bbulgar|\bafundo\b|\bavanco\b|\blunge|\bsplit squat\b|\bstep (up|down)\b|\bserrote\b|\bsuitcase\b|\bpallof press\b|\bfortalecimento de tibial anterior com elastico\b|\bcopenhagen\b|\bcopenhague\b|\bside plank\b|\b(plancha|prancha) lateral\b|\bcossac|\bcossack\b|\bwindmill\b|\blevantamento turco\b|\bturkish get up\b|\bstiff unilateral\b/.test(name)) return 'Unilateral';
  if (ex.lateralType === 'Unilateral' || ex.lateralType === 'N/A') return ex.lateralType;
  return 'Bilateral';
}

export function normalizeExerciseLaterality<T extends ExerciseDescription>(ex: T): T {
  const lateralType = classifyLaterality(ex);
  return ex.lateralType === lateralType ? ex : { ...ex, lateralType };
}

/** Repair custom registrations at load and save, including overrides of built-in exercises. */
export function normalizeExerciseLibrary(value: unknown): any[] {
  return Array.isArray(value) ? value.map(ex => ex && typeof ex === 'object' ? normalizeExerciseLaterality(ex) : ex).filter(ex => ex && typeof ex === 'object') : [];
}
