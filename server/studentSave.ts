import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { AccountScope, ScopeDenied } from './scope';
const wellnessFields:Record<string,string>={date:'date',fatigue:'fatigue',sleep:'sleep',stress:'stress',soreness:'soreness',mood:'mood',cognitive_load:'cognitiveLoad',readiness_score:'readinessScore',travel_fatigue:'travelFatigue',sleep_quality:'sleepQuality',menstrual_phase:'menstrualPhase',menstrual_symptoms:'menstrualSymptoms',hrv:'hrv',sleep_hours_formatted:'sleepHoursFormatted',sleep_start_time:'sleepStartTime',wake_up_time:'wakeUpTime',calculated_sleep_hours:'calculatedSleepHours',is_match_day:'isMatchDay',emotional_readiness:'emotionalReadiness',psychological_readiness:'psychologicalReadiness',psychology_notes:'psychologyNotes'};
const sessionFields:Record<string,string>={date:'date',type:'type',duration_minutes:'durationMinutes',rpe:'rpe',notes:'notes',load:'load'};
export async function saveStudentData(pool:Pool,account:AccountScope,payload:any[]){
 if(account.role!=='athlete' || !account.athlete_id || !Array.isArray(payload) || payload.length!==1 || payload[0]?.id!==account.athlete_id)throw new ScopeDenied();
 const athlete=payload[0];const c=await pool.connect();let discardClient=false;
 try{await c.query('BEGIN');
 const scope=await c.query('SELECT athlete_id FROM lb_accounts.athlete_scopes WHERE athlete_id=$1 AND organization_id=$2 AND NOT EXISTS(SELECT 1 FROM lb_accounts.athlete_archives ar WHERE ar.athlete_id=lb_accounts.athlete_scopes.athlete_id) FOR UPDATE',[account.athlete_id,account.organization_id]);if(!scope.rows.length)throw new ScopeDenied();
 const upsert=async(table:'wellness'|'external_sessions',item:any,fields:Record<string,string>)=>{
  if(!item || typeof item!=='object' || (item.id!==undefined && (typeof item.id!=='string' || !item.id || item.id.length>200)))throw new ScopeDenied();
  const id=item.id || randomUUID();const columns=['id','athlete_id'];const values:any[]=[id,account.athlete_id];
  for(const [column,key] of Object.entries(fields))if(Object.hasOwn(item,key)){
   let value=item[key];if(value!==null && !['string','number','boolean'].includes(typeof value) && !(column==='menstrual_symptoms' && Array.isArray(value)))throw new ScopeDenied();
   if(typeof value==='number' && !Number.isFinite(value))throw new ScopeDenied();
   if(column==='menstrual_symptoms')value=JSON.stringify(value);
   if(column==='readiness_score' && typeof value==='number')value=Math.round(value);
   if(column==='sleep' && typeof value==='number')value=Number(value.toFixed(2));
   columns.push(column);values.push(value);
  }
  // Required wellness metrics default to zero only for new incomplete records.
  if(table==='wellness')for(const field of ['fatigue','sleep','stress','soreness','mood'])if(!columns.includes(field)){columns.push(field);values.push(0);}
  if(!columns.includes('date'))throw new ScopeDenied();
  const updates=columns.filter(x=>!['id','athlete_id'].includes(x)).map(x=>`${x}=EXCLUDED.${x}`).join(',');
  const result=await c.query(`INSERT INTO public.${table}(${columns.join(',')}) VALUES(${values.map((_,i)=>`$${i+1}`).join(',')}) ON CONFLICT(id) DO UPDATE SET ${updates} WHERE ${table}.athlete_id=EXCLUDED.athlete_id RETURNING id`,values);
  if(!result.rows.length)throw new ScopeDenied();
 };
 for(const [key,table,fields] of [['wellness','wellness',wellnessFields],['externalSessions','external_sessions',sessionFields]] as const){
  const items=athlete[key] || [];if(!Array.isArray(items) || items.length>1000)throw new ScopeDenied();for(const item of items)await upsert(table,item,fields);
 }
 const workouts=athlete.workouts || [];if(!Array.isArray(workouts) || workouts.length>1000)throw new ScopeDenied();
 for(const w of workouts){
  if(typeof w.id!=='string')throw new ScopeDenied();
  const existing=await c.query('SELECT id FROM public.workouts WHERE id=$1 AND athlete_id=$2 FOR UPDATE',[w.id,account.athlete_id]);if(!existing.rows.length)throw new ScopeDenied();
  const allowed:Record<string,string>={status:'status',rpe:'rpe',duration_minutes:'durationMinutes',total_load:'totalLoad',feedback:'feedback'};
  const columns:string[]=[],values:any[]=[];
  for(const [column,key] of Object.entries(allowed))if(Object.hasOwn(w,key)){
   const value=w[key];if(value!==null && !['number','string'].includes(typeof value))throw new ScopeDenied();
   if(column==='status' && !['planned','in_progress','completed'].includes(value))throw new ScopeDenied();
   columns.push(`${column}=$${values.length+1}`);values.push(value);
  }
  if(columns.length){values.push(w.id);await c.query(`UPDATE public.workouts SET ${columns.join(',')} WHERE id=$${values.length}`,values);}
  if(!Array.isArray(w.exercises || []))throw new ScopeDenied();
  for(const e of w.exercises || []){
   const owned=await c.query('SELECT id FROM public.prescribed_exercises WHERE id=$1 AND workout_id=$2 FOR UPDATE',[e.id,w.id]);if(!owned.rows.length)throw new ScopeDenied();
   if(!Array.isArray(e.performedSets || []) || (e.performedSets || []).length>500)throw new ScopeDenied();
   for(const set of e.performedSets || []){
    const id=set.id || randomUUID();if(typeof id!=='string' || id.length>200)throw new ScopeDenied();
    const result=await c.query(`INSERT INTO public.performed_sets(id,exercise_id,reps,weight,rpe,is_completed) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET reps=EXCLUDED.reps,weight=EXCLUDED.weight,rpe=EXCLUDED.rpe,is_completed=EXCLUDED.is_completed WHERE performed_sets.exercise_id=EXCLUDED.exercise_id RETURNING id`,[id,e.id,set.reps ?? null,set.weight ?? null,set.rpe ?? null,set.isCompleted ?? false]);
    if(!result.rows.length)throw new ScopeDenied();
   }
  }
 }
 await c.query('COMMIT');return {message:'Prontidão, sessões e execução sincronizadas. Prescrição preservada.'};
 }catch(e){discardClient=true;try{await c.query('ROLLBACK');}catch{}throw e;}finally{c.release(discardClient);}
}
