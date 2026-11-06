import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {PGlite} from '@electric-sql/pglite';
import {readWorkoutHistoryPage,workoutHistoryRouter,workoutFromRows} from './workoutHistory';
import {loadPagedAthletes,HistoryChangedError} from '../src/utils/pagedHistory';
import {assertCompleteSnapshots} from './snapshotContract';
import {validateSportsPayload} from './sportsValidation';
import {archiveMissingWorkoutsSQL} from './workoutSync';
import {mergeAthletesWithLocalCache,sanitizeAthleteData,calculateACWR} from '../src/utils';
const revision='2026-11-06T10:00:00.000Z';
const coach={user_id:'c',role:'coach',organization_id:'org'};
async function fixture(dateType:'varchar(255)'|'date'='varchar(255)'){
 const db=new PGlite();
 await db.exec(`CREATE SCHEMA lb_accounts;
 CREATE TABLE athletes(id text PRIMARY KEY,updated_at timestamptz NOT NULL);
 CREATE TABLE lb_accounts.athlete_scopes(athlete_id text,organization_id text);
 CREATE TABLE lb_accounts.athlete_archives(athlete_id text);
 CREATE TABLE workouts(id text PRIMARY KEY,athlete_id text,date ${dateType},status text,name text,phase text,rpe real,duration_minutes integer,total_load real,archived_at timestamptz,updated_at timestamptz,created_at timestamptz,trainer_notes text);
 CREATE TABLE prescribed_exercises(id text PRIMARY KEY,workout_id text,name text,muscle_group text,reps_type text,order_index integer,prescription_meta jsonb);
 CREATE TABLE performed_sets(id text PRIMARY KEY,exercise_id text,reps integer,weight real,rpe real,is_completed boolean);
 INSERT INTO athletes VALUES('own','${revision}'),('foreign','${revision}');
 INSERT INTO lb_accounts.athlete_scopes VALUES('own','org'),('foreign','other');
 INSERT INTO workouts(id,athlete_id,date,status,name) SELECT 'w-'||lpad(n::text,3,'0'),'own',('2026-10-'||lpad(((n%28)+1)::text,2,'0'))::${dateType},CASE WHEN n%3=0 THEN 'completed' WHEN n%3=1 THEN 'planned' ELSE 'in_progress' END,'Treino '||n FROM generate_series(1,61) n;
 INSERT INTO workouts(id,athlete_id,date,archived_at) VALUES('archived','own','2026-11-01',CURRENT_TIMESTAMP),('foreign-w','foreign','2026-11-01',NULL);
 UPDATE workouts SET rpe=0,duration_minutes=20,total_load=200,phase='Base';
 INSERT INTO prescribed_exercises SELECT 'e-'||id,id,'Agachamento','MMII','reps',0,'{}'::jsonb FROM workouts;
 INSERT INTO performed_sets SELECT 'z-'||id,id,8,50,0,true FROM prescribed_exercises;
 INSERT INTO performed_sets SELECT 'a-'||id,id,6,60,8,true FROM prescribed_exercises;
 UPDATE prescribed_exercises SET prescription_meta=jsonb_build_object('aerobic',jsonb_build_object('goal','warmup','target','time','minutes',20,'distanceKm',0),'performedMetrics',jsonb_build_array(jsonb_build_object('id','z-'||id,'timeSeconds',120),jsonb_build_object('id','a-'||id,'timeSeconds',60)));
 `);
 const releases:boolean[]=[];const queries:string[]=[];
 const pool:any={connect:async()=>({query:async(q:string,p?:any[])=>{queries.push(q);const result=await db.query(q,p);if(dateType==='date')result.rows=result.rows.map((row:any)=>row.date?{...row,date:row.date instanceof Date?row.date:new Date(String(row.date).slice(0,10)+'T00:00:00.000Z')}:row);return result;},release:(discard:boolean)=>releases.push(discard)})};
 return {db,pool,releases,queries};
}
for(const dateType of ['varchar(255)','date'] as const)test(`HTTP pagination with ${dateType} loads all 61 workouts once and preserves complete results`,async()=>{
 const {db,pool,releases,queries}=await fixture(dateType);let server:any;
 try{
  const initial:any={id:'own',name:'Atleta',dob:'2000-01-01',gender:'M',modality:'Tênis',wellness:[],externalSessions:[],assessments:{},workouts:[],syncRevision:revision,historyWorkoutCount:61,historyComplete:false};
  const app=express();app.get('/api/ler',(_req,res)=>res.json([initial]));app.use('/api/athletes',(req:any,_res,next)=>{req.account=coach;next();},workoutHistoryRouter(pool));
  server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;let pages=0;
  const loaded=await loadPagedAthletes(async url=>{const response=await fetch(base+url);if(url.includes('/workouts?'))pages++;assert.equal(response.status,200);return response.json();});
  assert.equal(pages,4);assert.equal(loaded[0].workouts.length,61);assert.equal(new Set(loaded[0].workouts.map(w=>w.id)).size,61);assert.equal(loaded[0].historyComplete,true);assert.equal(initial.historyComplete,false);assert.deepEqual(initial.workouts,[]);
  assert.ok(!loaded[0].workouts.some(w=>['archived','foreign-w'].includes(w.id)));
  const legacyRows=(await db.query("SELECT * FROM workouts WHERE athlete_id='own' AND archived_at IS NULL ORDER BY date DESC,id DESC")).rows;
  const allExercises=(await db.query('SELECT * FROM prescribed_exercises ORDER BY order_index ASC,id ASC')).rows;const allSets=(await db.query('SELECT * FROM performed_sets')).rows;
  const legacy=legacyRows.map((w:any)=>workoutFromRows(w,allExercises.filter((e:any)=>e.workout_id===w.id),allSets));
  assert.deepEqual(loaded[0].workouts,JSON.parse(JSON.stringify(legacy)));
  const first=loaded[0].workouts[0];assert.equal(first.rpe,0);assert.equal(first.durationMinutes,20);assert.equal(first.totalLoad,200);assert.deepEqual(first.exercises[0].performedSets!.map(s=>s.weight),[50,60]);assert.deepEqual(first.exercises[0].performedSets!.map(s=>s.timeSeconds),[120,60]);
  // The same complete object reaches edit/clone/export consumers; serialization preserves the full prescription and execution.
  const exported=JSON.parse(JSON.stringify(loaded));assert.deepEqual(exported[0].workouts,loaded[0].workouts);assert.doesNotThrow(()=>assertCompleteSnapshots(exported));assert.doesNotThrow(()=>validateSportsPayload(exported));
  const merged=mergeAthletesWithLocalCache([],exported,{authoritativeWorkouts:true});assert.equal(merged[0].workouts.length,61);
  await db.query(archiveMissingWorkoutsSQL,['own',JSON.stringify(exported[0].workouts.map((w:any)=>w.id))]);assert.equal((await db.query("SELECT count(*)::int n FROM workouts WHERE athlete_id='own' AND archived_at IS NULL")).rows[0].n,61);
  assert.equal(releases.length,4);assert.ok(releases.every(x=>x===false));assert.equal(queries.filter(q=>q.startsWith('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')).length,4);
  assert.ok(queries.filter(q=>q.startsWith('SELECT * FROM public.workouts')).every(q=>q.includes('LIMIT $2')&&!q.includes('OFFSET')));
  assert.equal((await fetch(base+'/api/athletes/foreign/workouts?revision='+revision)).status,403);
  assert.equal((await fetch(base+'/api/athletes/own/workouts')).status,400);
  const conflict=await fetch(base+'/api/athletes/own/workouts?revision=2020-01-01T00:00:00Z');assert.equal(conflict.status,409);assert.equal((await conflict.json()).code,'SYNC_CONFLICT');
 }finally{if(server)await new Promise<void>(r=>server.close(()=>r()));await db.close();}
});
test('history pages enforce organization, athlete identity, archives, cursor binding, and revision',async()=>{
 const {db,pool}=await fixture();try{
  await assert.rejects(readWorkoutHistoryPage(pool,coach,'foreign',{revision}));
  await assert.rejects(readWorkoutHistoryPage(pool,{...coach,role:'athlete',athlete_id:'foreign'},'own',{revision}));
  const first=await readWorkoutHistoryPage(pool,coach,'own',{revision,limit:'2'});assert.equal(first.workouts.length,2);
  const second=await readWorkoutHistoryPage(pool,coach,'own',{revision,limit:'2',cursor:first.nextCursor});assert.ok(second.workouts.every(w=>!first.workouts.some(v=>v.id===w.id)));
  await assert.rejects(readWorkoutHistoryPage(pool,{...coach,organization_id:'other'},'foreign',{revision,cursor:first.nextCursor}));
  for(const limit of ['0','-1','51','NaN','1.5'])await assert.rejects(readWorkoutHistoryPage(pool,coach,'own',{revision,limit}));
  await assert.rejects(readWorkoutHistoryPage(pool,coach,'own',{revision,cursor:'invalid'}));
  await db.exec("UPDATE athletes SET updated_at='2026-11-06T11:00:00Z' WHERE id='own'");await assert.rejects(readWorkoutHistoryPage(pool,coach,'own',{revision,cursor:first.nextCursor}),/outro dispositivo/);
  await db.exec("INSERT INTO lb_accounts.athlete_archives VALUES('own')");await assert.rejects(readWorkoutHistoryPage(pool,coach,'own',{revision:'2026-11-06T11:00:00.000Z'}));
 }finally{await db.close();}
});
test('partial history cannot be saved by coaches or students, and a failing page never returns partial data',async()=>{
 const a:any={id:'own',name:'A',dob:'2000-01-01',gender:'M',modality:'Run',syncRevision:revision,historyWorkoutCount:2,historyComplete:false,wellness:[],externalSessions:[],assessments:{},workouts:[]};
 assert.throws(()=>assertCompleteSnapshots([a]));assert.throws(()=>validateSportsPayload([a]));let pages=0;
 await assert.rejects(loadPagedAthletes(async url=>{if(url.startsWith('/api/ler'))return [a];if(++pages===2)throw Error('offline');return {athleteId:'own',revision,workouts:[{id:'w',exercises:[]}],nextCursor:'next'};}),/offline/);
 assert.deepEqual(a.workouts,[]);assert.equal(a.historyComplete,false);
});
test('a concurrent edit restarts the complete read once and never mixes revisions',async()=>{
 let roots=0,pages=0;
 const loaded=await loadPagedAthletes(async url=>{if(url.startsWith('/api/ler'))return [{id:'own',syncRevision:++roots===1?'v1':'v2',historyWorkoutCount:1,historyComplete:false}];if(++pages===1)throw new HistoryChangedError();return {athleteId:'own',revision:'v2',workouts:[{id:'new',exercises:[]}],nextCursor:null};});
 assert.equal(roots,2);assert.equal(loaded[0].syncRevision,'v2');assert.equal(loaded[0].workouts[0].id,'new');
 let attempts=0;await assert.rejects(loadPagedAthletes(async url=>{if(url.startsWith('/api/ler')){attempts++;return [{id:'own',syncRevision:'v',historyWorkoutCount:1,historyComplete:false}];}throw new HistoryChangedError();}),HistoryChangedError);assert.equal(attempts,2);
});
test('legacy full responses stay compatible; empty histories are authoritative; duplicate pages terminate',async()=>{
 const complete:any={id:'a',workouts:[{id:'w',exercises:[]}]};assert.deepEqual(await loadPagedAthletes(async()=>[complete]),[complete]);
 const empty=await loadPagedAthletes(async url=>url.startsWith('/api/ler')?[{id:'a',syncRevision:'v',historyWorkoutCount:0,historyComplete:false}]:{athleteId:'a',revision:'v',workouts:[],nextCursor:null});assert.deepEqual(empty[0].workouts,[]);assert.equal(empty[0].historyComplete,true);
 let calls=0;await assert.rejects(loadPagedAthletes(async url=>{calls++;return url.startsWith('/api/ler')?[{id:'a',syncRevision:'v',historyWorkoutCount:1,historyComplete:false}]:{athleteId:'a',revision:'v',workouts:[{id:'w',exercises:[]}],nextCursor:'repeat'};}),/duplicado/);assert.equal(calls,3);
});
test('a failed rollback discards the history connection and never masks the original failure',async()=>{
 let released:any;const pool={connect:async()=>({query:async()=>{throw Error('db offline');},release:(discard:boolean)=>{released=discard;}})};
 await assert.rejects(readWorkoutHistoryPage(pool,coach,'own',{revision}),/db offline/);assert.equal(released,true);
});

test('incomplete page counts retry once; athletes without workouts skip detail requests; concurrency is bounded',async()=>{
 let truncatedRoots=0;await assert.rejects(loadPagedAthletes(async url=>{if(url.startsWith('/api/ler')){truncatedRoots++;return [{id:'a',syncRevision:'v',historyWorkoutCount:2,historyComplete:false}];}return {athleteId:'a',revision:'v',workouts:[{id:'one',exercises:[]}],nextCursor:null};}),HistoryChangedError);assert.equal(truncatedRoots,2);
 let inFlight=0,maxInFlight=0,pages=0;
 const loaded=await loadPagedAthletes(async url=>{if(url.startsWith('/api/ler'))return Array.from({length:5},(_,i)=>({id:String(i),syncRevision:'v',historyWorkoutCount:i?1:0,historyComplete:false}));
  pages++;inFlight++;maxInFlight=Math.max(maxInFlight,inFlight);await new Promise(r=>setTimeout(r,5));inFlight--;const id=url.split('/')[3];return {athleteId:id,revision:'v',workouts:[{id:'w'+id,exercises:[]}],nextCursor:null};});
 assert.equal(loaded.length,5);assert.equal(pages,4);assert.equal(maxInFlight,2);assert.equal(loaded[0].workouts.length,0);
});

test('normalizing loaded history does not fabricate duration or PSE and keeps tonnage distinct from internal load',()=>{
 const a:any={workouts:[{id:'missing',date:'2026-10-01',status:'completed',exercises:[]},{id:'no-pse',date:'2026-11-06',status:'completed',durationMinutes:20,exercises:[]},{id:'real',date:'2026-11-06',status:'completed',rpe:5,durationMinutes:20,exercises:[{performedSets:[{reps:3,weight:20,isCompleted:true}]}]}],externalSessions:[{id:'external',date:'2026-11-06'}]};
 const result=sanitizeAthleteData(a);assert.equal(result.workouts[0].durationMinutes,undefined);assert.equal(result.workouts[0].rpe,undefined);assert.equal(result.workouts[1].rpe,undefined);assert.equal(result.workouts[2].totalLoad,60);assert.equal(result.externalSessions[0].durationMinutes,undefined);assert.equal(result.externalSessions[0].rpe,undefined);assert.equal(calculateACWR(result.workouts,result.externalSessions,'2026-11-06').ratio,null);assert.equal(sanitizeAthleteData({...a,workouts:[{...a.workouts[2],totalLoad:25000}]}).workouts[0].totalLoad,25000);
});
