export class SportsValidationError extends Error {}
const invalid=(field:string):never=>{throw new SportsValidationError(`Valor inválido em ${field}.`);};
export function boundedNumber(value:unknown,field:string,min:number,max:number,integer=false){
 if(value===undefined||value===null)return;
 if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))invalid(field);
}
export function validateSportsPayload(athletes:any[]){
 if(!Array.isArray(athletes)||!athletes.length||athletes.length>100)invalid('atletas');
 const array=(value:any,field:string,max=5000):any[]=>{if(value===undefined)return [];if(!Array.isArray(value)||value.length>max||value.some((entry:any)=>!entry||typeof entry!=='object'||Array.isArray(entry)))invalid(field);return value;};
 const date=(value:any,field:string)=>{if(value===undefined)return;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)!==value.slice(0,10))invalid(field);};
 for(const a of athletes){
  if(a?.historyComplete===false)invalid('histórico parcial; sincronize antes de salvar');
  if(!a||typeof a.id!=='string'||!a.id||a.id.length>200)invalid('identificação do atleta');
  if(a.name!==undefined&&(typeof a.name!=='string'||!a.name.trim()||a.name.length>200))invalid('nome');
  if(a.dob)date(a.dob,'nascimento');
  for(const w of array(a.wellness,'prontidão',1000)){
   date(w.date,'data da prontidão');
   for(const key of ['fatigue','stress','soreness','mood','cognitiveLoad','travelFatigue','sleepQuality','emotionalReadiness','psychologicalReadiness'])boundedNumber(w[key],key,0,10);
   boundedNumber(w.sleep,'sono',0,24);boundedNumber(w.calculatedSleepHours,'horas de sono',0,24);boundedNumber(w.readinessScore,'prontidão',0,100);
  }
  for(const e of array(a.externalSessions,'sessões externas',1000)){date(e.date,'data da sessão');boundedNumber(e.durationMinutes,'duração',0,1440,true);boundedNumber(e.rpe,'PSE',0,10,true);boundedNumber(e.distanceKm,'distância',0,500);}
  for(const w of array(a.workouts,'treinos',1000)){
   date(w.date,'data do treino');if(w.status!==undefined&&!['planned','in_progress','completed'].includes(w.status))invalid('estado do treino');
   boundedNumber(w.durationMinutes,'duração do treino',0,1440,true);boundedNumber(w.rpe,'PSE do treino',0,10,true);
   for(const ex of array(w.exercises,'exercícios',300)){
    boundedNumber(ex.sets,'séries',1,500,true);boundedNumber(ex.painLevel,'dor',0,10,true);
    for(const s of array(ex.performedSets,'séries realizadas',500)){
     if(!s||typeof s!=='object')invalid('série');boundedNumber(s.reps,'repetições',0,10000,true);boundedNumber(s.weight,'carga',0,2000);boundedNumber(s.rpe,'PSE da série',0,10,true);
     boundedNumber(s.timeSeconds,'tempo realizado',0,86400);boundedNumber(s.distance,'distância realizada',0,500000);boundedNumber(s.speedKmh,'velocidade',0,100);boundedNumber(s.inclinePercent,'inclinação',0,100);
     if(s.isCompleted!==undefined&&typeof s.isCompleted!=='boolean')invalid('conclusão da série');
    }
   }
  }
  if(a.assessments)for(const entries of Object.values(a.assessments))for(const item of array(entries,'avaliações')){
   date(item.date,'data da avaliação');for(const [key,value]of Object.entries(item))if(typeof value==='number'&&!Number.isFinite(value))invalid(key);
  }
 }
}
