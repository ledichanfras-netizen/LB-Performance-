import test from 'node:test';
import assert from 'node:assert/strict';
import { athleteCacheKey,clearAthleteCaches } from '../src/utils/accountCache';
const token=(id:string,org:string)=>`header.${Buffer.from(JSON.stringify({id,organizationId:org})).toString('base64url')}.signature`;
test('cache differs by account and organization',()=>{
 assert.notEqual(athleteCacheKey(token('a','1')),athleteCacheKey(token('b','1')));
 assert.notEqual(athleteCacheKey(token('a','1')),athleteCacheKey(token('a','2')));
 assert.notEqual(athleteCacheKey(),athleteCacheKey(token('a','1')));
});
test('logout clears legacy and scoped caches without deleting preferences',()=>{
 const items=new Map([['lb_athletes_cache','x'],['lb_athletes_cache:1:a','x'],['lb_theme','green']]);
 clearAthleteCaches({get length(){return items.size;},key:(i:number)=>Array.from(items.keys())[i] || null,removeItem:(k:string)=>{items.delete(k);}});
 assert.deepEqual(Array.from(items.keys()),['lb_theme']);
});

test('temporary supervision does not replace the administrator login',async()=>{
 const {isSupervisedToken}=await import('../src/utils/accountCache');
 const {setSupervisionToken,getEffectiveSessionToken}=await import('../src/utils/supervisionSession');
 const owner='owner-token';const view='header.'+btoa(JSON.stringify({id:'owner',organizationId:'other',supervisedUserId:'coach',supervision:true}))+'.signature';
 const original=(globalThis as any).localStorage;
 (globalThis as any).localStorage={getItem:(key:string)=>key==='lb_user'?JSON.stringify({token:owner}):null};
 try{
  assert.equal(getEffectiveSessionToken(),owner);setSupervisionToken(view);assert.equal(getEffectiveSessionToken(),view);
  assert.equal(JSON.parse(localStorage.getItem('lb_user')!).token,owner);assert.equal(isSupervisedToken(view),true);assert.equal(isSupervisedToken(owner),false);
  assert.match(athleteCacheKey(view),/^lb_athletes_cache:supervision:/);
  setSupervisionToken(null);assert.equal(getEffectiveSessionToken(),owner);
 }finally{setSupervisionToken(null);(globalThis as any).localStorage=original;}
});

test('exercise order survives stale metadata, database row order, and legacy numeric strings',async()=>{
 const {indexExercises,orderedExercises}=await import('../src/utils/exerciseOrder');
 const edited=[{id:'c',order_index:2},{id:'a',order_index:0},{id:'b',order_index:1}];
 const saved=indexExercises(edited);
 assert.deepEqual(saved.map(e=>e.id),['c','a','b']);
 assert.deepEqual(saved.map(e=>e.order_index),[0,1,2]);
 const rows=[saved[2],saved[0],saved[1]].map(e=>({...e,order_index:String(e.order_index)}));
 assert.deepEqual(orderedExercises(rows).map(e=>e.id),['c','a','b']);
 assert.deepEqual(orderedExercises([{id:'b',orderIndex:'1'},{id:'a',orderIndex:'0'}]).map(e=>e.id),['a','b']);
 assert.deepEqual(orderedExercises([{id:'c'},{id:'a'},{id:'b'}]).map(e=>e.id),['c','a','b']);
 assert.equal(edited[0].order_index,2);
});

test('older completed cache cannot replace a newer trainer prescription order',async()=>{
 const {mergeArrayById}=await import('../src/utils');
 const cached={id:'w',status:'completed',updatedAt:'2026-10-01T12:00:00Z',exercises:[{id:'a'},{id:'b'}]};
 const remote={id:'w',status:'planned',updatedAt:'2026-10-02T12:00:00Z',exercises:[{id:'b'},{id:'a'}]};
 assert.deepEqual(mergeArrayById([cached],[remote])[0].exercises.map(e=>e.id),['b','a']);
 assert.deepEqual(mergeArrayById([{...cached,updatedAt:'2026-10-03T12:00:00Z'}],[remote])[0].exercises.map(e=>e.id),['a','b']);
});

import {exerciseMetadata} from './exerciseMetadata';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
test('special protocols retain ordered warmup, work and cooldown after database edits',async()=>{
 const db=new PGlite();
 try{
 await db.exec('CREATE TABLE prescribed_exercises(id text primary key);');
 await db.exec(await readFile(new URL('./exercise-metadata-schema.sql',import.meta.url),'utf8'));
 const p={environment:'bike',blocks:[{phase:'warmup',repetitions:1,stages:[600],unit:'seconds',pauseSeconds:0,blockPauseSeconds:0},{phase:'work',repetitions:6,stages:[30,60],unit:'seconds',pauseSeconds:45,blockPauseSeconds:120},{phase:'cooldown',repetitions:1,stages:[300],unit:'seconds',pauseSeconds:0,blockPauseSeconds:0}]};
 await db.query('INSERT INTO prescribed_exercises(id,prescription_meta) VALUES ($1,$2)', ['protocol',exerciseMetadata({conditioningProtocol:p,executionMethod:'fartlek'})]);
 p.blocks[1].repetitions=8;p.blocks[1].pauseSeconds=90;
 await db.query('UPDATE prescribed_exercises SET prescription_meta=$1 WHERE id=$2',[exerciseMetadata({conditioningProtocol:p,executionMethod:'fartlek'}),'protocol']);
 const rows=await db.query<{prescription_meta:any}>('SELECT prescription_meta FROM prescribed_exercises');
 assert.deepEqual(rows.rows[0].prescription_meta.conditioningProtocol,p);
 assert.equal(rows.rows[0].prescription_meta.executionMethod,'fartlek');
 }finally{await db.close();}
});
test('protocol validation accepts distance pyramids and rejects invalid prescriptions',()=>{
 const b={phase:'work',repetitions:3,stages:[20,40,60,40,20],unit:'meters',pauseSeconds:30,blockPauseSeconds:180};
 const p={environment:'field',blocks:[b]};
 assert.deepEqual(JSON.parse(exerciseMetadata({conditioningProtocol:p})).conditioningProtocol,p);
 for(const patch of [{repetitions:0},{stages:[NaN]},{pauseSeconds:-1},{phase:'unknown'},{unit:'hours'}])assert.throws(()=>exerciseMetadata({conditioningProtocol:{...p,blocks:[{...b,...patch}]}}));
 assert.throws(()=>exerciseMetadata({conditioningProtocol:{...p,blocks:[null]}}));
 assert.throws(()=>exerciseMetadata({conditioningProtocol:{...p,blocks:[]}}));
});

import {protocolSummary} from '../src/components/ConditioningProtocolEditor';
test('student instructions distinguish individual shots, pyramid rounds and optional stages',()=>{
 const p:any={environment:'field',blocks:[{phase:'warmup',repetitions:1,stages:[300],unit:'seconds',pauseSeconds:0,blockPauseSeconds:0},{phase:'work',repetitions:5,stages:[200],unit:'meters',pauseSeconds:60,blockPauseSeconds:120},{phase:'work',repetitions:2,stages:[20,40,20],unit:'seconds',pauseSeconds:30,blockPauseSeconds:0},{phase:'cooldown',repetitions:1,stages:[180],unit:'seconds',pauseSeconds:0,blockPauseSeconds:0}]};
 const summary=protocolSummary(p);
 assert.match(summary,/Aquecimento: 5 min/);
 assert.match(summary,/Bloco 1: 5 tiros de 200 m/);
 assert.match(summary,/Descanse 1 min entre os tiros/);
 assert.match(summary,/Bloco 2: 2 voltas na sequência de 20 s → 40 s → 20 s/);
 assert.match(summary,/Desaquecimento: 3 min/);
 assert.ok(summary.indexOf('Aquecimento')<summary.indexOf('Bloco 1'));
 assert.ok(summary.indexOf('Bloco 2')<summary.indexOf('Desaquecimento'));
 assert.doesNotMatch(summary,/Bloco 3/);
});

test('tablet cache cannot restore workouts replaced on the phone after an authoritative read',async()=>{
 const {mergeAthletesWithLocalCache}=await import('../src/utils');
 const completed={id:'done',date:'2026-09-01',status:'completed',exercises:[{id:'history'}]};
 const old={id:'old',date:'2026-08-01',status:'planned',exercises:[]};
 const fresh={id:'new',date:'2026-10-09',status:'planned',exercises:[{id:'new-ex'}]};
 const tablet:any={id:'a',workouts:[completed,old],assessments:{},wellness:[]};
 const phone:any={...tablet,workouts:[completed,fresh],syncRevision:'2026-10-09T19:53:13Z'};
 const synced=mergeAthletesWithLocalCache([tablet],[phone],{authoritativeWorkouts:true});
 assert.deepEqual(new Set(synced[0].workouts.map(w=>w.id)),new Set(['done','new']));
 assert.equal(synced[0].workouts.find(w=>w.id==='done')?.exercises[0].id,'history');
 const reload=mergeAthletesWithLocalCache(synced,[phone],{authoritativeWorkouts:true});
 assert.equal(reload[0].workouts.some(w=>w.id==='old'),false);
});

test('replacement archives old prescriptions, retains completed history, and rejects stale snapshots',async()=>{
 const {lockAthleteSnapshots,readSavedRevisions,SyncConflict,archiveMissingWorkoutsSQL}=await import('./workoutSync');
 const db=new PGlite();
 try{
  await db.exec(`CREATE TABLE athletes(id text PRIMARY KEY,updated_at timestamptz);CREATE TABLE workouts(id text PRIMARY KEY,athlete_id text,status text,updated_at timestamptz);CREATE TABLE prescribed_exercises(id text PRIMARY KEY,workout_id text);CREATE TABLE performed_sets(id text PRIMARY KEY,exercise_id text);INSERT INTO athletes VALUES('a','2026-10-09 12:00:00Z'),('b','2026-10-09 12:00:00Z');INSERT INTO workouts VALUES('old','a','planned',now()),('done','a','completed',now()),('foreign','b','planned',now());INSERT INTO prescribed_exercises VALUES('ex','old');INSERT INTO performed_sets VALUES('set','ex');`);
  const schema=await readFile(new URL('./workout-sync-schema.sql',import.meta.url),'utf8');await db.exec(schema);await db.exec(schema);
  const client={query:(sql:string,args:any[])=>db.query(sql,args)};
  const current:any={id:'a',syncRevision:'2026-10-09T12:00:00.000Z',workouts:[{id:'done'},{id:'new'}]};
  await db.exec('BEGIN');await lockAthleteSnapshots(client,[current]);
  const {createSaveBatch}=await import('./saveBatch');
  const writes=createSaveBatch({query:sql=>db.exec(sql)});
  await writes.query(archiveMissingWorkoutsSQL,['a',JSON.stringify(['done','new'])]);await writes.flush();
  await db.exec("INSERT INTO workouts(id,athlete_id,status) VALUES('new','a','planned');UPDATE athletes SET updated_at='2026-10-09 13:00:00Z' WHERE id='a';COMMIT");
  const rows=(await db.query('SELECT id FROM workouts WHERE athlete_id=$1 AND archived_at IS NULL',['a'])).rows;
  assert.deepEqual(new Set(rows.map(r=>r.id)),new Set(['done','new']));
  assert.equal((await db.query('SELECT count(*) as count FROM performed_sets')).rows[0].count,1);
  assert.equal((await db.query("SELECT archived_at FROM workouts WHERE id='foreign'")).rows[0].archived_at,null);
  await assert.rejects(()=>lockAthleteSnapshots(client,[current]),SyncConflict);
  const legacy:any={id:'a',workouts:[{id:'old'},{id:'done'},{id:'new'}]};await lockAthleteSnapshots(client,[legacy]);
  assert.equal(legacy.workouts.some((w:any)=>w.id==='old'),false);
  assert.equal((await readSavedRevisions(client,[current])).a,'2026-10-09T13:00:00.000Z');
  // Recovery only unarchives the original row: exercises and sets have not been lost.
  await db.exec("UPDATE workouts SET archived_at=NULL WHERE id='old'");
  assert.equal((await db.query("SELECT count(*) AS count FROM workouts WHERE id='old' AND archived_at IS NULL")).rows[0].count,1);
 }finally{await db.close();}
});
