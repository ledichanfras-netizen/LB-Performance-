import {ensureSessionServiceReady} from '../src/utils/sessionServiceReady';
import {writeSessionDraft,readSessionDraft,clearSessionDraft} from '../src/utils/sessionDraft';
import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import express from 'express';
import {saveWorkoutExecution,workoutExecutionRouter} from './workoutExecution';
import {workoutExecutionPayload} from '../src/utils/workoutExecution';
const revision='2026-11-05T10:00:00.000Z';
const coach={role:'coach',user_id:'c',organization_id:'org'};
async function fixture(){
 const db=new PGlite();await db.exec(`CREATE SCHEMA lb_accounts;CREATE TABLE lb_accounts.athlete_scopes(athlete_id text,organization_id text);CREATE TABLE lb_accounts.athlete_archives(athlete_id text);
 CREATE TABLE athletes(id text PRIMARY KEY,updated_at timestamptz);INSERT INTO athletes VALUES('a','${revision}'),('foreign','${revision}');INSERT INTO lb_accounts.athlete_scopes VALUES('a','org'),('foreign','other');
 CREATE TABLE workouts(id text PRIMARY KEY,athlete_id text,date varchar(255),status text,rpe real,duration_minutes integer,feedback text,total_load real,updated_at timestamptz,archived_at timestamptz);
 INSERT INTO workouts VALUES('w','a','2026-11-06','planned',NULL,NULL,NULL,0,'${revision}',NULL),('old','a','2026-01-01','completed',8,30,'Histórico',900,'${revision}',NULL),('foreign-w','foreign','2026-11-01','planned',NULL,NULL,NULL,0,'${revision}',NULL);
 CREATE TABLE prescribed_exercises(id text PRIMARY KEY,workout_id text,name text,sets integer,reps text,weight text,rest text,notes text,pain_level integer,order_index integer,reps_type text,prescription_meta jsonb);
 INSERT INTO prescribed_exercises SELECT 'e'||n,'w','Exercício '||n,3,'10','20','60s','Manter técnica',0,n,'reps','{"capacity":"Força","lateralType":"bilateral"}'::jsonb FROM generate_series(1,40)n;
 INSERT INTO prescribed_exercises VALUES('foreign-e','foreign-w','Privado',3,'8','100','60s','',0,0,'reps','{}');
 CREATE TABLE performed_sets(id text PRIMARY KEY,exercise_id text,reps integer,weight real,rpe real,is_completed boolean);
 INSERT INTO performed_sets VALUES('foreign-s','foreign-e',3,100,5,true);
 CREATE TABLE wellness(id text,notes text);INSERT INTO wellness VALUES('untouched','Prontidão original');`);
 const queries:string[]=[];const pool:any={connect:async()=>({query:async(q:string,p?:any[])=>{queries.push(q);return db.query(q,p);},release(){}})};
 const workout:any={id:'w',date:'2026-11-05',status:'completed',rpe:6,durationMinutes:61,feedback:'Boa sessão',name:'Alteração indevida ignorada',exercises:Array.from({length:40},(_,i)=>({id:'e'+(i+1),name:'Não mudar a prescrição',sets:999,reps:'999',weight:'999',painLevel:2,performedSets:Array.from({length:3},(_,j)=>({id:`s-${i}-${j}`,reps:10,weight:20,rpe:0,isCompleted:true,timeSeconds:30,distance:0,speedKmh:0,inclinePercent:0}))}))};
 return {db,pool,queries,workout};
}
test('saving one 120-set session uses bounded queries and preserves all other history and the coach prescription',async()=>{
 const {db,pool,queries,workout}=await fixture();try{
  const old=(await db.query("SELECT * FROM workouts WHERE id='old'")).rows;
  const receipt=await saveWorkoutExecution(pool,coach,'a','w',workoutExecutionPayload(workout,revision));
  assert.equal(receipt.confirmed,true);assert.equal(receipt.workout.date,'2026-11-05');assert.equal(receipt.workout.durationMinutes,61);assert.equal(receipt.workout.rpe,6);assert.equal(receipt.workout.totalLoad,24000);assert.equal(receipt.workout.exercises.length,40);
  assert.deepEqual((await db.query("SELECT * FROM workouts WHERE id='old'")).rows,old);assert.equal((await db.query('SELECT notes FROM wellness')).rows[0].notes,'Prontidão original');
  const ex:any=(await db.query("SELECT * FROM prescribed_exercises WHERE id='e1'")).rows[0];assert.equal(ex.sets,3);assert.equal(ex.reps,'10');assert.equal(ex.weight,'20');assert.equal(ex.notes,'Manter técnica');assert.equal(ex.prescription_meta.capacity,'Força');assert.equal(ex.pain_level,2);
  assert.equal(receipt.workout.exercises[0].performedSets[0].rpe,0);assert.equal(receipt.workout.exercises[0].performedSets[0].timeSeconds,30);
  assert.ok(queries.length<=19,`queries=${queries.length}`);assert.equal(queries.filter(q=>q.startsWith('INSERT INTO public.performed_sets')).length,1);
  const savedVersion=receipt.workout.updatedAt;const writesBefore=queries.filter(q=>/^(UPDATE|INSERT|DELETE)/.test(q)).length;
  const retry=await saveWorkoutExecution(pool,coach,'a','w',workoutExecutionPayload(workout,revision));assert.equal(retry.confirmed,true);assert.equal(retry.workout.updatedAt,savedVersion);assert.equal(queries.filter(q=>/^(UPDATE|INSERT|DELETE)/.test(q)).length,writesBefore);
 }finally{await db.close();}
});
test('students save only their execution, PSE zero is valid, and aerobic results never inflate tonnage',async()=>{
 const {db,pool,workout}=await fixture();try{
  await db.query("UPDATE prescribed_exercises SET prescription_meta=prescription_meta||'{\"aerobic\":{\"goal\":\"warmup\",\"target\":\"time\",\"minutes\":20,\"distanceKm\":0}}'::jsonb WHERE id='e1'");workout.rpe=0;workout.exercises[0].performedSets[0].timeSeconds=1200;workout.exercises[0].performedSets[0].distance=2000;
  const receipt=await saveWorkoutExecution(pool,{...coach,role:'athlete',athlete_id:'a'},'a','w',workoutExecutionPayload(workout,revision));assert.equal(receipt.workout.rpe,0);assert.equal(receipt.workout.totalLoad,23400);assert.equal(receipt.workout.exercises[0].aerobic.minutes,20);assert.equal(receipt.workout.exercises[0].performedSets[0].distance,2000);
 }finally{await db.close();}
});
test('scope, foreign sets, archived sessions and stale conflicting results are rejected without partial writes',async()=>{
 const {db,pool,workout}=await fixture();try{
  await assert.rejects(saveWorkoutExecution(pool,{...coach,organization_id:'other'},'a','w',workoutExecutionPayload(workout,revision)));
  await assert.rejects(saveWorkoutExecution(pool,{...coach,role:'athlete',athlete_id:'foreign'},'a','w',workoutExecutionPayload(workout,revision)));
  const stolen=structuredClone(workout);stolen.exercises[0].performedSets[0].id='foreign-s';await assert.rejects(saveWorkoutExecution(pool,coach,'a','w',workoutExecutionPayload(stolen,revision)));
  assert.equal((await db.query("SELECT reps FROM performed_sets WHERE id='foreign-s'")).rows[0].reps,3);assert.equal((await db.query("SELECT count(*)::int n FROM performed_sets WHERE id<>'foreign-s'")).rows[0].n,0);
  await db.query("UPDATE workouts SET updated_at='2026-11-06T12:00:00Z' WHERE id='w'");await assert.rejects(saveWorkoutExecution(pool,coach,'a','w',workoutExecutionPayload(workout,revision)),/outro dispositivo/);
  await db.query("UPDATE workouts SET archived_at=CURRENT_TIMESTAMP WHERE id='w'");await assert.rejects(saveWorkoutExecution(pool,coach,'a','w',workoutExecutionPayload(workout,'2026-11-06T12:00:00Z')));
  assert.equal((await db.query("SELECT status FROM workouts WHERE id='w'")).rows[0].status,'planned');
 }finally{await db.close();}
});
test('HTTP confirms a committed session, validates before connecting, and returns 503 on database failure',async()=>{
 const {db,pool,workout}=await fixture();let server:any;try{
  const app=express();app.use(express.json());app.use((req:any,_res,next)=>{req.account=coach;next();});app.use('/down',workoutExecutionRouter({connect:async()=>{throw Error('unavailable');}}));app.use(workoutExecutionRouter(pool));server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}`;const res=await fetch(base+'/a/workouts/w/execution',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(workoutExecutionPayload(workout,revision))});assert.equal(res.status,200);assert.equal((await res.json()).confirmed,true);
  const invalid=await fetch(base+'/a/workouts/w/execution',{method:'PUT',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(invalid.status,400);const unavailable=await fetch(base+'/down/a/workouts/w/execution',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(workoutExecutionPayload(workout,revision))});assert.equal(unavailable.status,503);assert.notEqual((await unavailable.json()).confirmed,true);
  await assert.rejects(saveWorkoutExecution({connect:async()=>{throw Error('must not connect');}},coach,'a','w',{execution:{...workout,rpe:11}}),/inválid/);
 }finally{if(server)await new Promise<void>(r=>server.close(()=>r()));await db.close();}
});
test('execution requests contain no profile, images, exercise prescription, or unrelated history',()=>{
 const w:any={id:'w',date:'2026-11-05',status:'completed',rpe:6,durationMinutes:61,photoUrl:'PRIVATE',workouts:['PRIVATE'],exercises:[{id:'e',name:'PRIVATE',photoUrl:'PRIVATE',sets:99,weight:'PRIVATE',performedSets:[{id:'s',reps:10,weight:20,rpe:0,isCompleted:true}]}]};
 const body=workoutExecutionPayload(w,revision);assert.doesNotMatch(JSON.stringify(body),/PRIVATE/);assert.equal(body.execution.exercises[0].performedSets[0].rpe,0);assert.ok(JSON.stringify(body).length<700);
});

test('a failure after set writes rolls back the entire session instead of acknowledging success',async()=>{
 const {db,pool,workout}=await fixture();try{
  const failing={connect:async()=>{const c=await pool.connect();return {...c,query:async(q:string,p:any[])=>{if(q.startsWith('UPDATE public.workouts SET'))throw Error('simulated interruption');return c.query(q,p);}};}};
  await assert.rejects(saveWorkoutExecution(failing,coach,'a','w',workoutExecutionPayload(workout,revision)),/simulated/);
  assert.equal((await db.query("SELECT count(*)::int n FROM performed_sets WHERE exercise_id<>'foreign-e'")).rows[0].n,0);assert.equal((await db.query("SELECT status FROM workouts WHERE id='w'")).rows[0].status,'planned');
 }finally{await db.close();}
});
test('unsaved corrections to completed sessions remain recoverable until the server receipt clears the draft',()=>{
 const values=new Map<string,string>(),storage={getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>{values.set(k,v)},removeItem:(k:string)=>{values.delete(k)}};
 const workout:any={id:'w',updatedAt:revision,status:'completed',exercises:[]};const draft:any={version:1,editingCompleted:true,baseUpdatedAt:revision,session:{...workout,rpe:6,durationMinutes:61},elapsedSeconds:3660,savedAt:Date.now(),date:'2026-11-05',rpe:6,duration:'61',feedback:'Correção'};
 assert.equal(writeSessionDraft(storage,'draft',draft),true);assert.equal(readSessionDraft(storage,'draft',workout)?.session.durationMinutes,61);clearSessionDraft(storage,'draft');assert.equal(readSessionDraft(storage,'draft',workout),null);
});

test('session service readiness handles a warming HTML page and a temporary 503 before allowing a write',async()=>{
 const requests:any[]=[];const responses=[new Response('<html>Starting</html>'),new Response('',{status:503}),Response.json({status:'ok'})];
 await ensureSessionServiceReady((async(url:any,options:any)=>{requests.push({url,options});return responses.shift()!;}) as any,{maxWaitMs:200,pollMs:1,requestTimeoutMs:50});assert.equal(requests.length,3);assert.ok(requests.every(r=>r.url==='/api/health'&&!r.options.body&&r.options.cache==='no-store'));
});
test('unavailable service stops the readiness wait and never sends session data',async()=>{
 let reads=0;await assert.rejects(ensureSessionServiceReady((async()=>{reads++;return Response.json({status:'unavailable'},{status:503});}) as any,{maxWaitMs:25,pollMs:2,requestTimeoutMs:10}),/rascunho foi preservado/);assert.ok(reads>0&&reads<20);
});
test('a stalled readiness connection is bounded before the mutation stage',async()=>{
 const started=Date.now();await assert.rejects(ensureSessionServiceReady((()=>new Promise(()=>{})) as any,{maxWaitMs:25,pollMs:1,requestTimeoutMs:8}),/rascunho/);assert.ok(Date.now()-started<1000);
});
