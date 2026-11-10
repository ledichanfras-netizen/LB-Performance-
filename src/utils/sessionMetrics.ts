import { normalizePerformedSetNumbers } from './sportNumericStorage';
/** Realized metrics never substitute a prescription for a missing observation. */
export function sessionInternalLoad(session:{rpe?:unknown;durationMinutes?:unknown}):number|null{
 const {rpe,durationMinutes}=session;
 if(typeof rpe!=='number'||!Number.isFinite(rpe)||rpe<0||rpe>10||typeof durationMinutes!=='number'||!Number.isFinite(durationMinutes)||durationMinutes<=0||durationMinutes>1440)return null;
 return rpe*durationMinutes;
}
export function realizedTonnage(exercises:ReadonlyArray<{aerobic?:unknown;trainingMode?:string;repsType?:string;performedSets?:ReadonlyArray<{isCompleted?:boolean;reps?:number;weight?:number}>}>):number{
 let total=0;
 for(const ex of exercises||[]){
  if(ex.aerobic||(ex.trainingMode&&ex.trainingMode!=='strength')||ex.repsType==='time')continue;
  for(const raw of ex.performedSets||[]){const s=normalizePerformedSetNumbers(raw);if(s.isCompleted===true&&typeof s.reps==='number'&&Number.isFinite(s.reps)&&s.reps>=0&&typeof s.weight==='number'&&Number.isFinite(s.weight)&&s.weight>=0)total+=s.reps*s.weight;}
 }
 return Math.round(total);
}
