import type { PrescribedExercise, AerobicPrescription } from '../types';
export const aerobicCandidate = (ex: PrescribedExercise) => !!ex.aerobic || (/esteira/i.test(ex.name) && !ex.conditioningProtocol && (!ex.executionMethod || ex.executionMethod === 'standard'));
export const defaultAerobic = (): AerobicPrescription => ({goal:'warmup',target:'time',minutes:10,distanceKm:1});
export function aerobicFields(p: AerobicPrescription): Partial<PrescribedExercise> {
 return {aerobic:p, sets:1, reps:p.target==='time'?`${p.minutes*60}s`:`${p.distanceKm*1000}m`, repsType:p.target==='time'?'time':'meters', weight:'0', rest:'0s', trainingMode:'conditioning',metricType:'interval',distanceMeters:p.target==='distance'?p.distanceKm*1000:0,defaultExecutionTime:p.target==='time'?`${p.minutes*60}`:'0',lateralType:'N/A',sidePrescriptions:undefined};
}
export const aerobicSummary = (p: AerobicPrescription) => `${({warmup:'Aquecimento',base:'Base aeróbia',recovery:'Recuperação'})[p.goal]} · ${p.target==='time'?`${p.minutes} min`:`${p.distanceKm} km`}${p.speedKmh?` · ${p.speedKmh} km/h`:''}${p.inclinePercent!==undefined?` · inclinação ${p.inclinePercent}%`:''}${p.intensity?` · ${p.intensity}`:''}`;
export function aerobicVolume(exercises: PrescribedExercise[]) {
 let seconds=0,meters=0,load=0;
 for(const ex of exercises.filter(e=>e.aerobic))for(const s of ex.performedSets||[])if(s.isCompleted){seconds+=s.timeSeconds||0;meters+=s.distance||0;load+=(s.timeSeconds||0)/60*(s.rpe||0);}
 return {minutes:seconds/60,km:meters/1000,load};
}
