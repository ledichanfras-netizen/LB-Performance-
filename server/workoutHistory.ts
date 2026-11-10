import { normalizeWorkoutNumbers } from '../src/utils/sportNumericStorage';
import {Router} from 'express';
import {mayAccessAthlete,ScopeDenied} from './scope';
import {sportsReadScope} from './readScope';
import {syncRevision,SyncConflict} from './workoutSync';
import {restorePerformedMetrics} from './exerciseMetadata';

export class HistoryInputError extends Error {}
const PAGE_SIZE=20;
const MAX_PAGE_SIZE=50;
type Cursor={athleteId:string;revision:string;date:string;id:string};
function pageInput(athleteId:string,query:Record<string,unknown>){
 const limit=query.limit===undefined?PAGE_SIZE:Number(query.limit);
 if(!Number.isInteger(limit)||limit<1||limit>MAX_PAGE_SIZE)throw new HistoryInputError();
 const revision=typeof query.revision==='string'?syncRevision(query.revision):undefined;
 if(!revision)throw new HistoryInputError();
 let cursor:Cursor|undefined;
 if(query.cursor!==undefined){
  if(typeof query.cursor!=='string'||query.cursor.length>2048||!/^[A-Za-z0-9_-]+$/.test(query.cursor))throw new HistoryInputError();
  try{cursor=JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8'));}catch{throw new HistoryInputError();}
  if(!cursor||cursor.athleteId!==athleteId||cursor.revision!==revision||typeof cursor.date!=='string'||cursor.date.length>255||typeof cursor.id!=='string'||!cursor.id||cursor.id.length>200)throw new HistoryInputError();
 }
 return {limit,revision,cursor};
}

/** Shared by the legacy full read and paged read to preserve prescription/result semantics. */
export function workoutFromRows(wk:any,exercises:any[],sets:any[]){
 const byExercise=new Map<string,any[]>();
 for(const s of sets){const list=byExercise.get(s.exercise_id)||[];list.push(s);byExercise.set(s.exercise_id,list);}
 return normalizeWorkoutNumbers({...wk,
  date:wk.date?(typeof wk.date==='string'?wk.date.split('T')[0]:new Date(wk.date).toISOString().split('T')[0]):wk.date,
  durationMinutes:wk.duration_minutes,totalLoad:wk.total_load,trainerNotes:wk.trainer_notes,
  updatedAt:wk.updated_at?new Date(wk.updated_at).toISOString():wk.updatedAt,
  createdAt:wk.created_at?new Date(wk.created_at).toISOString():wk.createdAt,
  exercises:exercises.map(ex=>{
   const order=new Map((ex.prescription_meta?.performedMetrics||[]).map((s:any,i:number)=>[s.id,i]));
   const orderedSets=[...(byExercise.get(ex.id)||[])].sort((a,b)=>Number(order.get(a.id)??Number.MAX_SAFE_INTEGER)-Number(order.get(b.id)??Number.MAX_SAFE_INTEGER));
   return {...ex.prescription_meta,...ex,muscleGroup:ex.muscle_group,painLevel:ex.pain_level,rest:ex.rest,notes:ex.notes,
   repsType:ex.reps_type||'reps',order_index:Number(ex.order_index??ex.orderIndex??0),videoUrl:ex.video_url||'',imageUrl:ex.image_url||'',
   performedSets:restorePerformedMetrics(ex,orderedSets)
  };}).sort((a,b)=>a.order_index-b.order_index||String(a.id).localeCompare(String(b.id)))
 });
}

export async function readWorkoutHistoryPage(pool:any,account:any,athleteId:string,query:Record<string,unknown>){
 sportsReadScope(account);
 if(typeof athleteId!=='string'||!athleteId||athleteId.length>200)throw new HistoryInputError();
 const input=pageInput(athleteId,query);
 const c=await pool.connect();let discard=false;
 try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await c.query("SET LOCAL statement_timeout='15000ms'");
  if(!await mayAccessAthlete(c,account,athleteId))throw new ScopeDenied();
  const athlete=await c.query('SELECT updated_at FROM public.athletes WHERE id=$1',[athleteId]);
  const revision=syncRevision(athlete.rows[0]?.updated_at);
  if(!revision||revision!==input.revision)throw new SyncConflict();
  const values:any[]=[athleteId,input.limit+1];
  let after='';
  // Leave parameters uncast: PostgreSQL infers DATE or VARCHAR from the actual column.
  if(input.cursor){values.push(input.cursor.date,input.cursor.id);after=' AND (date,id)<($3,$4)';}
  const result=await c.query(`SELECT * FROM public.workouts WHERE athlete_id=$1 AND archived_at IS NULL${after} ORDER BY date DESC,id DESC LIMIT $2`,values);
  const rows=result.rows.slice(0,input.limit);
  let exercises:any[]=[],sets:any[]=[];
  if(rows.length){
   const ids=rows.map((w:any)=>w.id);
   exercises=(await c.query('SELECT * FROM public.prescribed_exercises WHERE workout_id=ANY($1::text[]) ORDER BY order_index ASC,id ASC',[ids])).rows;
   if(exercises.length)sets=(await c.query('SELECT * FROM public.performed_sets WHERE exercise_id=ANY($1::text[])',[exercises.map(e=>e.id)])).rows;
  }
  const exByWorkout=new Map<string,any[]>();for(const ex of exercises){const list=exByWorkout.get(ex.workout_id)||[];list.push(ex);exByWorkout.set(ex.workout_id,list);}
  const last=rows.at(-1);
  const nextCursor=result.rows.length>input.limit?Buffer.from(JSON.stringify({athleteId,revision,date:last.date,id:last.id})).toString('base64url'):null;
  const workouts=rows.map((w:any)=>workoutFromRows(w,exByWorkout.get(w.id)||[],sets));
  await c.query('COMMIT');
  return {athleteId,revision,workouts,nextCursor};
 }catch(error){try{await c.query('ROLLBACK');}catch{discard=true;}throw error;}
 finally{c.release(discard);}
}
export function workoutHistoryRouter(pool:any){
 const router=Router();
 router.get('/:id/workouts',async(req:any,res)=>{
  res.setHeader('Cache-Control','no-store');
  try{return res.json(await readWorkoutHistoryPage(pool,req.account,req.params.id,req.query));}
  catch(error){const status=error instanceof ScopeDenied?403:error instanceof SyncConflict?409:error instanceof HistoryInputError?400:503;
   if(status===503)console.error('[WorkoutHistory]',(error as any)?.code||'READ_FAILED');
   return res.status(status).json({error:status===409?'O histórico mudou durante a leitura. Sincronize novamente.':status===400?'Página de histórico inválida.':status===403?'Atleta não autorizado.':'Histórico temporariamente indisponível. Seus dados foram preservados.',...(status===409?{code:'SYNC_CONFLICT'}:{})});}
 });return router;
}
