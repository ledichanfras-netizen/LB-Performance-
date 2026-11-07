import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {PGlite} from '@electric-sql/pglite';
import {anamnesisSaveRouter,saveAnamnesisHistory} from './anamnesisSave';
import {syncRevision} from './workoutSync';
import {validateSportsPayload} from './sportsValidation';
import {persistAnamnesisHistory} from '../src/utils/anamnesisSave';

const coach={user_id:'coach',organization_id:'org',role:'coach'};
const record={id:'history-1',athleteId:'a',date:'2026-11-07',cardio:{chestPainExercise:false},orthopedic:{painLevel:0},signatureName:'Teste'};
const revision='2026-11-07T10:00:00.000Z';
async function fixture(){
  const db=new PGlite();
  await db.exec(`CREATE SCHEMA lb_accounts;
    CREATE TABLE lb_accounts.athlete_scopes(athlete_id text PRIMARY KEY,organization_id text);
    CREATE TABLE lb_accounts.athlete_archives(athlete_id text PRIMARY KEY);
    CREATE TABLE athletes(id text PRIMARY KEY,injury_history text,updated_at timestamptz);
    CREATE TABLE wellness(id text PRIMARY KEY,athlete_id text,readiness_score real);
    CREATE TABLE workouts(id text PRIMARY KEY,athlete_id text,status text);
    INSERT INTO lb_accounts.athlete_scopes VALUES('a','org'),('other','foreign');
    INSERT INTO athletes VALUES('a','{"legacy":"original","matches":[{"id":"match"}]}','2026-11-07T10:00:00Z'),('other','{}','2026-11-07T10:00:00Z');
    INSERT INTO wellness VALUES('legacy-wellness','a',120);
    INSERT INTO workouts VALUES('w','a','completed');`);
  const query=(sql:string,args?:any[])=>db.query(sql,args);
  const pool={connect:async()=>({query,release:()=>{}})};
  return {db,pool};
}

test('anamnesis HTTP save succeeds with invalid historical readiness and leaves all unrelated records untouched',async()=>{
  const {db,pool}=await fixture();let server:any;
  try{
    assert.throws(()=>validateSportsPayload([{id:'a',wellness:[{readinessScore:120}]}]),/prontidão/);
    const app=express();app.use(express.json());app.use((req:any,_res,next)=>{req.account=coach;next();});app.use('/api/atletas',anamnesisSaveRouter(pool));
    server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
    const base=`http://127.0.0.1:${server.address().port}`;
    const saved=await persistAnamnesisHistory((url,options)=>fetch(base+url,options),{id:'a',syncRevision:revision},[record as any],'test-token');
    assert.deepEqual(saved.history,[record]);assert.ok(saved.revision);
    const row=(await db.query("SELECT * FROM athletes WHERE id='a'")).rows[0] as any;
    const backup=JSON.parse(row.injury_history);
    assert.deepEqual(backup.anamnesis,[record]);assert.equal(backup.legacy,'original');assert.deepEqual(backup.matches,[{id:'match'}]);
    assert.equal((await db.query("SELECT readiness_score FROM wellness WHERE id='legacy-wellness'")).rows[0].readiness_score,120);
    assert.equal((await db.query("SELECT status FROM workouts WHERE id='w'")).rows[0].status,'completed');
    assert.equal((await db.query("SELECT injury_history FROM athletes WHERE id='other'")).rows[0].injury_history,'{}');
    const retry=await saveAnamnesisHistory(pool,coach,'a',{history:[record],baseRevision:revision});assert.equal(retry.syncRevisions.a,saved.revision);
    const bad=await fetch(base+'/api/atletas/a/anamnesis',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({history:[record],wellness:[]})});assert.equal(bad.status,400);
  }finally{if(server)await new Promise<void>(r=>server.close(()=>r()));await db.close();}
});

test('narrow anamnesis save enforces ownership, archived state, supervisor restrictions and stale-write protection',async()=>{
  const {db,pool}=await fixture();try{
    await assert.rejects(saveAnamnesisHistory(pool,coach,'other',{history:[],baseRevision:revision}));
    await assert.rejects(saveAnamnesisHistory(pool,{...coach,supervision:true},'a',{history:[record],baseRevision:revision}));
    await assert.rejects(saveAnamnesisHistory(pool,coach,'a',{history:[{...record,athleteId:'other'}],baseRevision:revision}));
    await assert.rejects(saveAnamnesisHistory(pool,coach,'a',{history:[record],baseRevision:'2020-01-01'}),/outro dispositivo/);
    await db.query("INSERT INTO lb_accounts.athlete_archives VALUES('a')");
    await assert.rejects(saveAnamnesisHistory(pool,coach,'a',{history:[record],baseRevision:revision}));
    assert.equal(JSON.parse((await db.query("SELECT injury_history FROM athletes WHERE id='a'")).rows[0].injury_history as string).anamnesis,undefined);
  }finally{await db.close();}
});

test('athletes can create and correct their own answers but cannot access another athlete or remove history',async()=>{
  const {db,pool}=await fixture();const student={...coach,role:'athlete',athlete_id:'a'};
  try{
    const first=await saveAnamnesisHistory(pool,student,'a',{history:[record],baseRevision:revision});
    await assert.rejects(saveAnamnesisHistory(pool,student,'other',{history:[],baseRevision:revision}));
    await assert.rejects(saveAnamnesisHistory(pool,student,'a',{history:[],baseRevision:first.syncRevisions.a}));
    const edited={...record,signatureName:'Corrected',cardio:{chestPainExercise:true}};
    const correction=await saveAnamnesisHistory(pool,student,'a',{history:[edited],baseRevision:first.syncRevisions.a});
    assert.equal(correction.anamnesis!.length,1);
    assert.equal(correction.anamnesis![0].id,record.id);
    assert.equal(correction.anamnesis![0].signatureName,'Corrected');
    assert.equal(correction.anamnesis![0].cardio.chestPainExercise,true);
    const second=await saveAnamnesisHistory(pool,student,'a',{history:[{...record,id:'history-2'},edited],baseRevision:correction.syncRevisions.a});
    assert.equal(second.anamnesis!.length,2);
  }finally{await db.close();}
});

test('failed commit rolls back anamnesis and never returns a successful receipt',async()=>{
  const {db,pool}=await fixture();try{
    const failing={connect:async()=>{const c=await pool.connect();return {...c,query:(sql:string,args?:any[])=>{if(sql==='COMMIT')throw Error('commit interrupted');return c.query(sql,args);}};}};
    await assert.rejects(saveAnamnesisHistory(failing,coach,'a',{history:[record],baseRevision:revision}),/interrupted/);
    const row=(await db.query("SELECT * FROM athletes WHERE id='a'")).rows[0] as any;
    assert.equal(JSON.parse(row.injury_history).anamnesis,undefined);assert.equal(syncRevision(row.updated_at),revision);
  }finally{await db.close();}
});

test('client sends only anamnesis fields and refuses incomplete or unrelated acknowledgments',async()=>{
  let body:any;
  const request=async(_url:string,options:RequestInit)=>{body=JSON.parse(options.body as string);return new Response(JSON.stringify({confirmed:true,athleteId:'a',anamnesis:[record],syncRevisions:{a:revision}}));};
  const saved=await persistAnamnesisHistory(request,{id:'a',syncRevision:revision,wellness:[{readinessScore:120}],workouts:['private']} as any,[record as any],'token');
  assert.deepEqual(Object.keys(body).sort(),['baseRevision','history']);assert.equal(saved.history[0].id,record.id);
  for(const payload of [{confirmed:false},{confirmed:true,athleteId:'other',anamnesis:[record],syncRevisions:{a:revision}},{confirmed:true,athleteId:'a',anamnesis:[],syncRevisions:{a:revision}}]){
    await assert.rejects(persistAnamnesisHistory(async()=>new Response(JSON.stringify(payload)),{id:'a',syncRevision:revision},[record as any],'token'),/confirm/);
  }
});
