import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {PGlite} from '@electric-sql/pglite';
import {sportsDeletionRouter} from './sportsDeletion';
import {sportsReadScope} from './readScope';
import {prepareBackupImport} from './backupImport';
import {validateSportsPayload} from './sportsValidation';
import {realizedTonnage,sessionInternalLoad} from '../src/utils/sessionMetrics';
import {migrateLegacyImtp,verifiedImtpView} from '../src/utils/legacyImtp';
import {readSessionDraft,writeSessionDraft,clearSessionDraft} from '../src/utils/sessionDraft';

test('HTTP deletions deny foreign data and athlete deletion; own removal archives history',async()=>{
 const db=new PGlite();let server:any;
 try{
 await db.exec(`CREATE SCHEMA lb_accounts;CREATE TABLE athletes(id text PRIMARY KEY,updated_at timestamptz default now());
 CREATE TABLE lb_accounts.athlete_scopes(athlete_id text,organization_id text);CREATE TABLE lb_accounts.athlete_archives(athlete_id text PRIMARY KEY,organization_id text,archived_by text);
 INSERT INTO athletes(id) VALUES('own'),('foreign');INSERT INTO lb_accounts.athlete_scopes VALUES('own','org'),('foreign','other');
 CREATE TABLE workouts(id text PRIMARY KEY,athlete_id text,updated_at timestamptz,archived_at timestamptz);
 CREATE TABLE wellness(id text PRIMARY KEY,athlete_id text);CREATE TABLE external_sessions(id text PRIMARY KEY,athlete_id text);CREATE TABLE cmj(id text PRIMARY KEY,athlete_id text);
 INSERT INTO workouts VALUES('foreign','foreign',now(),NULL),('own','own',now(),NULL);INSERT INTO wellness VALUES('foreign','foreign'),('own','own');INSERT INTO external_sessions VALUES('foreign','foreign');INSERT INTO cmj VALUES('foreign','foreign');`);
 const adapter={query:(q:string,p:any[])=>db.query(q,p),connect:async()=>({query:(q:string,p?:any[])=>db.query(q,p),release(){}})} as any;
 const accounts:any={coach:{user_id:'coach',organization_id:'org',role:'coach'},athlete:{user_id:'student',organization_id:'org',role:'athlete',athlete_id:'own'}};
 const app=express();app.use(sportsDeletionRouter(adapter,((req:any,_res,next)=>{req.account=accounts[req.headers['x-test-account'] as string];next();}) as any));
 server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 for(const actor of ['coach','athlete'])for(const path of ['/atletas/foreign','/wellness/foreign','/sessions/foreign','/assessments/cmj/foreign','/workouts/foreign'])assert.equal((await fetch(base+path,{method:'DELETE',headers:{'x-test-account':actor}})).status,403,`${actor} ${path}`);
 assert.equal((await fetch(base+'/atletas/own',{method:'DELETE',headers:{'x-test-account':'athlete'}})).status,403);
 assert.equal((await fetch(base+'/wellness/own',{method:'DELETE'})).status,403);
 for(const table of ['athletes','wellness','external_sessions','cmj','workouts'])assert.equal((await db.query(`SELECT count(*)::int AS n FROM ${table} WHERE ${table==='athletes'?'id':'athlete_id'}='foreign'`)).rows[0].n,1);
 assert.equal((await fetch(base+'/workouts/own',{method:'DELETE',headers:{'x-test-account':'coach'}})).status,200);
 assert.ok((await db.query("SELECT archived_at FROM workouts WHERE id='own'")).rows[0].archived_at);
 assert.equal((await fetch(base+'/atletas/own',{method:'DELETE',headers:{'x-test-account':'coach'}})).status,200);
 assert.equal((await db.query("SELECT count(*)::int AS n FROM athletes WHERE id='own'")).rows[0].n,1);
 assert.equal((await db.query("SELECT count(*)::int AS n FROM lb_accounts.athlete_archives WHERE athlete_id='own'")).rows[0].n,1);
 }finally{if(server)await new Promise<void>(r=>server.close(()=>r()));await db.close();}
});
test('database errors end HTTP deletions with 503, never success',async()=>{
 const app=express();app.use(sportsDeletionRouter({connect:async()=>{throw Error('offline');}} as any,((req:any,_res,next)=>{req.account={role:'coach',organization_id:'org'};next();}) as any));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));try{assert.equal((await fetch(`http://127.0.0.1:${(server.address() as any).port}/wellness/x`,{method:'DELETE'})).status,503);}finally{await new Promise<void>(r=>server.close(()=>r()));}
});
test('organization scope never depends on feature flags',()=>{
 process.env.ACCOUNTS_ENABLED='false';process.env.SCOPED_SPORTS_ENABLED='false';
 assert.throws(()=>sportsReadScope(null));assert.throws(()=>sportsReadScope({role:'coach'}));assert.throws(()=>sportsReadScope({role:'athlete',organization_id:'org'}));
 const account={role:'coach',organization_id:'org'};assert.equal(sportsReadScope(account),account);
});
test('backup preflight preserves existing records, refuses foreign IDs, and validates before writing',async()=>{
 const db=new PGlite();try{await db.exec("CREATE TABLE athletes(id text PRIMARY KEY);CREATE SCHEMA lb_accounts;CREATE TABLE lb_accounts.athlete_scopes(athlete_id text,organization_id text);INSERT INTO athletes VALUES('existing'),('foreign');INSERT INTO lb_accounts.athlete_scopes VALUES('existing','org'),('foreign','other');");
 const adapter={query:(q:string,p:any[])=>db.query(q,p)} as any;const account={role:'coach',organization_id:'org'};
 const preview=await prepareBackupImport(adapter,account,[{id:'new',name:'Novo'},{id:'existing',name:'Backup antigo'}]);assert.equal(preview.importCount,1);assert.equal(preview.preservedCount,1);assert.deepEqual(preview.athletes.map(a=>a.id),['new']);
 await assert.rejects(()=>prepareBackupImport(adapter,account,[{id:'foreign'}]));await assert.rejects(()=>prepareBackupImport(adapter,{...account,role:'athlete'},[{id:'new'}]));
 assert.equal((await db.query('SELECT count(*)::int AS n FROM athletes')).rows[0].n,2);
 }finally{await db.close();}
});
test('invalid sport measurements are rejected; zero PSE and partial legacy records remain distinct',()=>{
 const valid={id:'a',workouts:[{id:'w',durationMinutes:20,rpe:0,exercises:[{sets:1,performedSets:[{reps:0,weight:0,rpe:0,isCompleted:false}]}]}]};assert.doesNotThrow(()=>validateSportsPayload([valid]));
 for(const value of [-1,11,NaN,Infinity,'5'])assert.throws(()=>validateSportsPayload([{id:'a',workouts:[{rpe:value}]}]));
 assert.throws(()=>validateSportsPayload([{id:'a',wellness:[{date:'2026-02-30'}]}]));assert.throws(()=>validateSportsPayload([{id:'a',workouts:[null]}]));
});
test('only confirmed measured sets contribute to tonnage; missing duration never invents 60 minutes',()=>{
 assert.equal(realizedTonnage([{performedSets:[{reps:10,weight:20,isCompleted:true},{reps:10,weight:20,isCompleted:false}]}]),200);
 assert.equal(realizedTonnage([{performedSets:[{reps:0,weight:20,isCompleted:true}]}]),0);
 assert.equal(realizedTonnage([{aerobic:{},performedSets:[{reps:1000,weight:80,isCompleted:true}]}]),0);
 assert.equal(sessionInternalLoad({rpe:5,durationMinutes:0}),null);assert.equal(sessionInternalLoad({rpe:0,durationMinutes:20}),0);assert.equal(sessionInternalLoad({rpe:4,durationMinutes:20}),80);
});
test('legacy IMTP migrates measured force only with deterministic ID and preserves original unverified metrics',()=>{
 const original:any={assessments:{isometricStrength:[{id:'old',date:'2026-11-01',halfSquatKgf:100}]}};const migrated=migrateLegacyImtp(original).assessments.imtp[0];
 assert.equal(migrated.id,'imtp-mig-old');assert.equal(migrated.peakForce,100);assert.equal(migrated.rfdPeak,undefined);assert.equal(migrated.impulsePeak,undefined);assert.equal(migrated.relativePeakForce,undefined);assert.equal(original.assessments.imtp,undefined);
 const legacy:any={id:'imtp-mig-old',date:'2026-11-01',peakForce:100,rfdPeak:148};assert.equal(verifiedImtpView(legacy).rfdPeak,undefined);assert.equal(legacy.rfdPeak,148);
});
test('drafts recover only their matching workout and base revision; completion cleanup removes only its key',()=>{
 const values=new Map<string,string>();const storage={getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>{values.set(k,v)},removeItem:(k:string)=>{values.delete(k)}};
 const w:any={id:'w',updatedAt:'2026-11-01',status:'planned',exercises:[]};const draft:any={version:1,baseUpdatedAt:w.updatedAt,session:w,elapsedSeconds:120,savedAt:Date.now(),date:'2026-11-01',rpe:0,duration:'',feedback:''};
 assert.equal(writeSessionDraft(storage,'account:a:w',draft),true);assert.equal(readSessionDraft(storage,'account:a:w',w)?.elapsedSeconds,120);
 assert.equal(readSessionDraft(storage,'account:b:w',w),null);assert.equal(readSessionDraft(storage,'account:a:w',{...w,updatedAt:'new'}),null);assert.equal(readSessionDraft(storage,'account:a:w',{...w,status:'completed'}),null);
 clearSessionDraft(storage,'account:a:w');assert.equal(readSessionDraft(storage,'account:a:w',w),null);
});
