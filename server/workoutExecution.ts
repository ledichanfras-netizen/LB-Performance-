import {Router} from 'express';
import {mayAccessAthlete,ScopeDenied} from './scope';
import {sportsReadScope} from './readScope';
import {SyncConflict,syncRevision} from './workoutSync';
import {validateSportsPayload,SportsValidationError} from './sportsValidation';
import {realizedTonnage} from '../src/utils/sessionMetrics';
import {workoutFromRows} from './workoutHistory';
import {exerciseMetadata} from './exerciseMetadata';
const measurementKeys=['reps','weight','rpe','distance','timeSeconds','intensity','speedKmh','inclinePercent'] as const;
function results(w:any){
 return {date:w.date,status:w.status,rpe:w.rpe,durationMinutes:w.durationMinutes,feedback:w.feedback||'',exercises:[...w.exercises].sort((a,b)=>a.id.localeCompare(b.id)).map((e:any)=>({id:e.id,painLevel:e.painLevel??0,performedSets:[...(e.performedSets||[])].map((s:any)=>Object.fromEntries([['id',s.id],['isCompleted',s.isCompleted===true],...measurementKeys.map(k=>[k,s[k]??null])]))}))};
}
export async function saveWorkoutExecution(pool:any,account:any,athleteId:string,workoutId:string,body:any){
 sportsReadScope(account);
 if(account.supervision)throw new ScopeDenied();
 const w=body?.execution;
 if(typeof workoutId!=='string'||!workoutId||workoutId.length>200||!w||w.id!==workoutId||w.status!=='completed'||!Array.isArray(w.exercises)||!Number.isInteger(w.durationMinutes)||w.durationMinutes<1||w.durationMinutes>1440||!Number.isInteger(w.rpe)||w.rpe<0||w.rpe>10||typeof w.date!=='string'||(w.feedback!==undefined&&(typeof w.feedback!=='string'||w.feedback.length>10000)))throw new SportsValidationError('Resultados da sessão inválidos.');
 validateSportsPayload([{id:athleteId,workouts:[w]}]);
 const ids=new Set<string>(),setIds=new Set<string>();
 for(const e of w.exercises){if(typeof e.id!=='string'||!e.id||e.id.length>200||ids.has(e.id)||!Array.isArray(e.performedSets))throw new SportsValidationError('Exercícios da sessão incompletos.');ids.add(e.id);
  for(const s of e.performedSets){if(typeof s.id!=='string'||!s.id||s.id.length>200||setIds.has(s.id))throw new SportsValidationError('Identificação das séries inválida.');setIds.add(s.id);}
 }
 const c=await pool.connect();let discard=false;
 try{
  await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5000ms'");await c.query("SET LOCAL statement_timeout='15000ms'");
  if(!await mayAccessAthlete(c,account,athleteId))throw new ScopeDenied();
  const lockedScope=await c.query('SELECT athlete_id FROM lb_accounts.athlete_scopes WHERE athlete_id=$1 AND organization_id=$2 FOR UPDATE',[athleteId,account.organization_id]);if(!lockedScope.rows.length)throw new ScopeDenied();
  const athlete=await c.query('SELECT updated_at FROM public.athletes WHERE id=$1 FOR UPDATE',[athleteId]);
  const found=await c.query('SELECT * FROM public.workouts WHERE id=$1 AND athlete_id=$2 AND archived_at IS NULL FOR UPDATE',[workoutId,athleteId]);
  const stored=found.rows[0];if(!stored)throw new ScopeDenied();
  const exercises=(await c.query('SELECT * FROM public.prescribed_exercises WHERE workout_id=$1 ORDER BY order_index,id',[workoutId])).rows;
  if(exercises.length!==ids.size||exercises.some((e:any)=>!ids.has(e.id)))throw new SyncConflict();
  const actualSets=exercises.length?(await c.query('SELECT s.* FROM public.performed_sets s JOIN public.prescribed_exercises e ON e.id=s.exercise_id WHERE e.workout_id=$1',[workoutId])).rows:[];
  const receipt=(workout:any,revision:any)=>({confirmed:true,workout,syncRevisions:{[athleteId]:syncRevision(revision)}});
  const current=workoutFromRows(stored,exercises,actualSets);
  // A lost response may be retried: identical committed results need no second write.
  if(JSON.stringify(results(current))===JSON.stringify(results(w))){await c.query('COMMIT');return receipt(current,athlete.rows[0].updated_at);}
  if(syncRevision(stored.updated_at)!==syncRevision(body.baseUpdatedAt))throw new SyncConflict();
  if(setIds.size){
   const existing=await c.query('SELECT id,exercise_id FROM public.performed_sets WHERE id=ANY($1::text[])',[[...setIds]]);
   const parents=new Map(w.exercises.flatMap((e:any)=>e.performedSets.map((s:any)=>[s.id,e.id])));
   if(existing.rows.some((s:any)=>parents.get(s.id)!==s.exercise_id))throw new ScopeDenied();
  }
  const rows=w.exercises.flatMap((e:any)=>e.performedSets.map((s:any)=>({id:s.id,exercise_id:e.id,reps:s.reps??null,weight:s.weight??null,rpe:s.rpe??null,is_completed:s.isCompleted===true})));
  await c.query('DELETE FROM public.performed_sets WHERE exercise_id IN (SELECT id FROM public.prescribed_exercises WHERE workout_id=$1) AND NOT(id=ANY($2::text[]))',[workoutId,[...setIds]]);
  if(rows.length){const inserted=await c.query(`INSERT INTO public.performed_sets(id,exercise_id,reps,weight,rpe,is_completed)
   SELECT id,exercise_id,reps,weight,rpe,is_completed FROM jsonb_to_recordset($1::jsonb) AS s(id text,exercise_id text,reps integer,weight real,rpe real,is_completed boolean)
   ON CONFLICT(id) DO UPDATE SET reps=EXCLUDED.reps,weight=EXCLUDED.weight,rpe=EXCLUDED.rpe,is_completed=EXCLUDED.is_completed WHERE performed_sets.exercise_id=EXCLUDED.exercise_id RETURNING id`,[JSON.stringify(rows)]);if(inserted.rows.length!==rows.length)throw new ScopeDenied();}
  const metadata=w.exercises.map((e:any)=>({id:e.id,pain_level:e.painLevel??0,metrics:JSON.parse(exerciseMetadata({performedSets:e.performedSets})).performedMetrics}));
  if(metadata.length)await c.query(`UPDATE public.prescribed_exercises e SET pain_level=x.pain_level,prescription_meta=jsonb_set(COALESCE(e.prescription_meta,'{}'::jsonb),'{performedMetrics}',x.metrics)
   FROM jsonb_to_recordset($1::jsonb) AS x(id text,pain_level integer,metrics jsonb) WHERE e.id=x.id AND e.workout_id=$2`,[JSON.stringify(metadata),workoutId]);
  const merged=exercises.map((e:any)=>{const incoming=w.exercises.find((x:any)=>x.id===e.id);return {...e,pain_level:incoming.painLevel??0,prescription_meta:{...e.prescription_meta,performedMetrics:metadata.find((x:any)=>x.id===e.id)?.metrics},performedSets:incoming.performedSets};});
  const total=realizedTonnage(merged.map((e:any)=>({...e.prescription_meta,repsType:e.reps_type,performedSets:e.performedSets})));
  const saved=await c.query(`UPDATE public.workouts SET date=$1,status='completed',rpe=$2,duration_minutes=$3,feedback=$4,total_load=$5,updated_at=CURRENT_TIMESTAMP WHERE id=$6 AND athlete_id=$7 RETURNING *`,[w.date.split('T')[0],w.rpe,w.durationMinutes,w.feedback||'',total,workoutId,athleteId]);
  const revised=await c.query('UPDATE public.athletes SET updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING updated_at',[athleteId]);
  const canonical=workoutFromRows(saved.rows[0],merged,rows);
  await c.query('COMMIT');return receipt(canonical,revised.rows[0].updated_at);
 }catch(error){try{await c.query('ROLLBACK');}catch{discard=true;}throw error;}
 finally{c.release(discard);}
}
export function workoutExecutionRouter(pool:any){
 const router=Router();router.put('/:id/workouts/:workoutId/execution',async(req:any,res)=>{
  res.setHeader('Cache-Control','no-store');
  try{return res.json(await saveWorkoutExecution(pool,req.account,req.params.id,req.params.workoutId,req.body));}
  catch(error){const status=error instanceof ScopeDenied?403:error instanceof SyncConflict?409:error instanceof SportsValidationError?400:503;
   return res.status(status).json({error:status===409?'A prescrição foi atualizada. Sincronize antes de salvar; o rascunho foi preservado.':status===403?'Esta sessão não está disponível para a conta.':status===400?(error as Error).message:'Não foi possível confirmar o salvamento. O rascunho foi preservado.',...(status===409?{code:'SYNC_CONFLICT'}:{})});}
 });return router;
}
