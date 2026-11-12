import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readDashboardTables} from './dashboardRead';
import {mergeDashboardAthletes,requireCompleteAthletes} from '../src/utils/progressiveAthletes';
import {loadPagedAthletes} from '../src/utils/pagedHistory';
import {assertCompleteSnapshots} from './snapshotContract';
import {calculateACWR} from '../src/utils';
import {workoutFromRows} from './workoutHistory';

const revision='2026-11-12T10:00:00.000Z';
const summary=(id='a',version=revision):any=>({id,name:id,dob:'2000-01-01',gender:'M',modality:'Futebol',injuryHistory:'',syncRevision:version,historyComplete:false,historyWorkoutCount:1,wellness:[],workouts:[{id:'w',date:'2026-11-12',status:'completed',rpe:6,durationMinutes:30,totalLoad:200}],externalSessions:[],assessments:{}});
test('dashboard summaries reuse only unchanged complete details; removed or different-account records are not resurrected',()=>{
 const complete={...summary(),historyComplete:true,workouts:[{id:'w',exercises:[{id:'e',performedSets:[{id:'s',weight:50}]}]}]};
 assert.equal(mergeDashboardAthletes([complete],[summary()])[0],complete);
 assert.equal(mergeDashboardAthletes([complete],[summary('a','new')])[0].historyComplete,false);
 assert.deepEqual(mergeDashboardAthletes([complete],[]),[]);
 assert.deepEqual(mergeDashboardAthletes([{...complete,id:'foreign'}],[summary()]),[summary()]);
 assert.equal(mergeDashboardAthletes([summary()],[summary()])[0].historyComplete,false);
});
test('summary never passes client write/export guards or server replacement contract',()=>{
 assert.throws(()=>requireCompleteAthletes([summary()]),/completos/);
 assert.throws(()=>assertCompleteSnapshots([summary()]),/incompleto|parcial/);
 assert.throws(()=>assertCompleteSnapshots([{...summary(),workouts:[]}]),/parcial/);
 assert.doesNotThrow(()=>requireCompleteAthletes([{...summary(),historyComplete:true}]));
});
test('opening one athlete does not request other histories; all pages still required before complete data is returned',async()=>{
 const calls:string[]=[];
 const loaded=await loadPagedAthletes(async url=>{
  calls.push(url);
  if(url.startsWith('/api/ler')){assert.equal(new URL(url,'http://test').searchParams.get('athleteId'),'a / 1');return [{...summary('a / 1'),historyWorkoutCount:2}];}
  return {athleteId:'a / 1',revision,workouts:[{id:calls.length===2?'first':'last',exercises:[]}],nextCursor:calls.length===2?'next':null};
 },'a / 1');
 assert.equal(calls.length,3);assert.ok(calls.slice(1).every(url=>url.startsWith('/api/athletes/a%20%2F%201/')));
 assert.equal(loaded[0].historyComplete,true);assert.equal(loaded[0].workouts.length,2);
});
test('one SQL statement loads scoped dashboard metrics and pain alerts without any performed sets or prescription metadata',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`CREATE SCHEMA lb_accounts;
 CREATE TABLE lb_accounts.athlete_scopes(athlete_id text,organization_id text);
 CREATE TABLE lb_accounts.athlete_archives(athlete_id text);
 CREATE TABLE athletes(id text,name text,updated_at timestamptz);
 CREATE TABLE workouts(id text,athlete_id text,date date,name text,phase text,status text,rpe integer,duration_minutes integer,total_load numeric,archived_at timestamptz,updated_at timestamptz,created_at timestamptz);
 CREATE TABLE prescribed_exercises(id text,workout_id text,pain_level integer,order_index integer,prescription_meta jsonb);
 INSERT INTO athletes VALUES('a','Ana','${revision}'),('b','Bruno','${revision}'),('foreign','Outra','${revision}'),('archived','Arquivada','${revision}');
 INSERT INTO lb_accounts.athlete_scopes VALUES('a','org'),('b','org'),('foreign','other'),('archived','org');
 INSERT INTO lb_accounts.athlete_archives VALUES('archived');
 INSERT INTO workouts(id,athlete_id,date,status,rpe,duration_minutes,total_load) VALUES('w','a','2026-11-12','completed',6,30,200),('old','a','2026-10-01','completed',4,20,100),('wb','b','2026-11-12','planned',NULL,NULL,NULL),('hidden','foreign','2026-11-12','completed',10,60,9000),('wa','archived','2026-11-12','completed',10,60,9000);
 INSERT INTO prescribed_exercises VALUES('pain','w',7,0,'{"secretPrescription":true}'),('hiddenpain','hidden',9,0,'{}');`);
 for(const table of ['wellness','isometric_strength','cmj','vo2max','bioimpedance','speed','external_sessions','drop_jump','imtp','abalakov']){
  await db.exec(`CREATE TABLE ${table}(id text,athlete_id text,date date);INSERT INTO ${table} VALUES('ok','a','2026-11-12'),('hidden','foreign','2026-11-12'),('archived','archived','2026-11-12');`);
 }
 let queries=0;
 const pool={query:async(sql:string,args:any[])=>{queries++;assert.ok(!sql.includes('performed_sets'));assert.ok(!sql.includes('prescription_meta'));return db.query(sql,args);}};
 const coach={role:'coach',organization_id:'org'};
 const rows=await readDashboardTables(pool,coach);
 assert.equal(queries,1);assert.deepEqual(rows[0].rows.map((a:any)=>a.id),['a','b']);
 assert.equal(rows[2].rows.length,3);assert.deepEqual(rows[3].rows.map((e:any)=>e.id),['pain']);assert.deepEqual(rows[4].rows,[]);
 for(const i of [1,5,6,7,8,9,10,11,12,13])assert.deepEqual(rows[i].rows.map((r:any)=>r.athlete_id),['a']);
 const metricWorkouts=rows[2].rows.filter((w:any)=>w.athlete_id==='a').map((w:any)=>workoutFromRows(w,[],[]));
 const original=[{id:'w',date:'2026-11-12',status:'completed',rpe:6,durationMinutes:30},{id:'old',date:'2026-10-01',status:'completed',rpe:4,durationMinutes:20}];
 assert.deepEqual(calculateACWR(metricWorkouts,[],'2026-11-12'),calculateACWR(original as any,[],'2026-11-12'));
 assert.deepEqual((await readDashboardTables(pool,{...coach,role:'athlete',athlete_id:'b'}))[0].rows.map((a:any)=>a.id),['b']);
 assert.deepEqual((await readDashboardTables(pool,{...coach,organization_id:'empty'}))[0].rows,[]);
 await assert.rejects(()=>readDashboardTables(pool,{role:'coach'}));
 }finally{await db.close();}
});
