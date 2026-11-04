import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { aerobicFields, aerobicVolume, defaultAerobic } from '../src/utils/aerobic';
import { reconcilePrescriptionSets } from '../src/utils/prescriptionSets';
import { calculateWorkoutLoad, calculateWorkoutInternalLoad } from '../src/utils';
import { exerciseMetadata, restorePerformedMetrics } from './exerciseMetadata';
import { saveStudentData } from './studentSave';
import type { PrescribedExercise } from '../src/types';
const base:PrescribedExercise={id:'e',name:'Aquecimento na Esteira',muscleGroup:'Aeróbio',sets:3,reps:'10',weight:'BW',...aerobicFields(defaultAerobic())};
test('aerobic time and distance prescriptions create one row without inventing actual volume',()=>{
 for(const p of [defaultAerobic(),{...defaultAerobic(),target:'distance' as const,distanceKm:2.5}]){
  const ex=reconcilePrescriptionSets({...base,...aerobicFields(p)});
  assert.equal(ex.performedSets!.length,1);assert.equal(ex.performedSets![0].distance,0);assert.equal(ex.performedSets![0].timeSeconds,0);
  assert.equal(ex.reps,p.target==='time'?'600s':'2500m');
  ex.performedSets![0].timeSeconds=1200;
  assert.equal(reconcilePrescriptionSets(ex,'in_progress').performedSets![0].timeSeconds,1200);
 }
});
test('aerobic actual volume is separate from tonnage and session internal load',()=>{
 const ex={...base,performedSets:[{id:'s',reps:1000,weight:20,rpe:4,timeSeconds:1200,distance:2500,isCompleted:true},{id:'pending',reps:0,weight:0,rpe:10,timeSeconds:600,distance:2000,isCompleted:false}]};
 assert.deepEqual(aerobicVolume([ex]),{minutes:20,km:2.5,load:80});
 const w={id:'w',date:'2026-11-03',name:'Treino',status:'completed',exercises:[ex],durationMinutes:60,rpe:5} as any;
 assert.equal(calculateWorkoutLoad(w,80),0);assert.equal(calculateWorkoutInternalLoad(w),300);
});
test('metadata keeps speed, incline, time and distance through a JSONB database round trip',async()=>{
 const db=new PGlite();try{
  await db.exec('CREATE TABLE ex(meta jsonb)');
  const ex={...base,performedSets:[{id:'s',reps:0,weight:0,rpe:4,timeSeconds:1200,distance:2500,speedKmh:7.5,inclinePercent:0,isCompleted:true}]};
  await db.query('INSERT INTO ex VALUES($1)',[exerciseMetadata(ex)]);
  const meta=(await db.query('SELECT meta FROM ex')).rows[0].meta;
  const rows=restorePerformedMetrics({prescription_meta:meta},[{id:'s',reps:0,weight:0,rpe:4,is_completed:true}]);
  assert.equal(rows[0].timeSeconds,1200);assert.equal(rows[0].distance,2500);assert.equal(rows[0].speedKmh,7.5);assert.equal(rows[0].inclinePercent,0);assert.equal(rows[0].isCompleted,true);
 }finally{await db.close();}
});
test('student save retains aerobic metrics while preventing prescription changes',async()=>{
 const db=new PGlite();try{
 await db.exec(`CREATE SCHEMA lb_accounts;CREATE TABLE lb_accounts.athlete_scopes(athlete_id text,organization_id text);CREATE TABLE lb_accounts.athlete_archives(athlete_id text);
 CREATE TABLE athletes(id text PRIMARY KEY,updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,injury_history text);INSERT INTO athletes(id) VALUES('a');
 CREATE TABLE workouts(id text PRIMARY KEY,athlete_id text,status text,rpe real,duration_minutes real,total_load real,feedback text,archived_at timestamptz);
 CREATE TABLE prescribed_exercises(id text PRIMARY KEY,workout_id text,prescription_meta jsonb);
 CREATE TABLE performed_sets(id text PRIMARY KEY,exercise_id text,reps integer,weight real,rpe real,is_completed boolean);
 INSERT INTO lb_accounts.athlete_scopes VALUES('a','org');INSERT INTO workouts(id,athlete_id,status) VALUES('w','a','planned');`);
 await db.query('INSERT INTO prescribed_exercises VALUES($1,$2,$3)',['e','w',exerciseMetadata(base)]);
 const ex=reconcilePrescriptionSets(base);ex.performedSets![0]={...ex.performedSets![0],timeSeconds:900,distance:1500,speedKmh:6,inclinePercent:2,rpe:3,isCompleted:true};
 const adapter={query:(q:string,p:any[])=>db.query(q,p),connect:async()=>({query:(q:string,p?:any[])=>db.query(q,p),release:()=>{}})} as any;
 await saveStudentData(adapter,{organization_id:'org',role:'athlete',athlete_id:'a'} as any,[{id:'a',workouts:[{id:'w',status:'completed',exercises:[{...ex,aerobic:{...ex.aerobic,minutes:999}}]}]}]);
 const meta=(await db.query('SELECT prescription_meta FROM prescribed_exercises')).rows[0].prescription_meta as any;
 assert.deepEqual(meta.aerobic,base.aerobic);
 const sets=(await db.query('SELECT * FROM performed_sets')).rows;
 const restored=restorePerformedMetrics({prescription_meta:meta},sets);
 assert.equal(restored[0].timeSeconds,900);assert.equal(restored[0].distance,1500);assert.equal(restored[0].speedKmh,6);assert.equal(restored[0].inclinePercent,2);
 }finally{await db.close();}
});
test('invalid targets and non-finite actual metrics fail before persistence',()=>{
 assert.throws(()=>exerciseMetadata({...base,aerobic:{...base.aerobic,minutes:0}}));
 assert.throws(()=>exerciseMetadata({...base,performedSets:[{id:'s',distance:Infinity}]}));
});
