import type {Workout} from '../types';
/** Only execution data: no athlete profile, history, images or prescription payload. */
export function workoutExecutionPayload(workout:Workout,baseUpdatedAt?:string){
 return {baseUpdatedAt,execution:{id:workout.id,date:workout.date,status:workout.status,rpe:workout.rpe,durationMinutes:workout.durationMinutes,feedback:workout.feedback,
  exercises:workout.exercises.map(e=>({id:e.id,painLevel:e.painLevel,performedSets:(e.performedSets||[]).map(s=>Object.fromEntries(['id','reps','weight','rpe','isCompleted','distance','timeSeconds','intensity','speedKmh','inclinePercent'].filter(k=>(s as any)[k]!==undefined).map(k=>[k,(s as any)[k]])))}))}};
}
