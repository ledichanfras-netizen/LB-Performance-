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
