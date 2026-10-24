import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { ENRICHED_LIBRARY } from '../src/data/exercises';
import { classifyLaterality, normalizeExerciseLibrary } from '../src/utils/exerciseLaterality';
import { reconcilePrescriptionSets } from '../src/utils/prescriptionSets';
import { getSetSide, sideSets, prescriptionSummary } from '../src/utils/unilateral';
import { exerciseMetadata } from './exerciseMetadata';
import { saveStudentData } from './studentSave';
import type { PrescribedExercise } from '../src/types';

const base: PrescribedExercise={id:'e',name:'Stiff Unilateral',muscleGroup:'MMII',lateralType:'Unilateral',sets:3,reps:'8',weight:'12kg',startingSide:'left',sidePrescriptions:{left:{sets:4,reps:'10',weight:'12kg'},right:{sets:3,reps:'8',weight:'10kg'}}};

test('library audit: per-side names and doses override incorrect bilateral registration',()=>{
 const perSide=ENRICHED_LIBRARY.filter(e=>/\/lado|unilateral|copenhagen|side plank/i.test(`${e.name} ${e.defaultReps}`));
 assert.ok(perSide.length>20);
 for(const e of perSide)assert.equal(e.lateralType,'Unilateral',e.name);
 for(const name of ['Stiff Unilateral','Single-Leg RDL','Remada One-Arm','Agachamento Búlgaro','Prancha Lateral'])assert.equal(classifyLaterality({name,lateralType:'Bilateral'}),'Unilateral',name);
 assert.equal(classifyLaterality({name:'Supino Inclinado com Halteres'}),'Bilateral');
 const [custom]=normalizeExerciseLibrary([{name:'Leg Press Unilateral',lateralType:'Bilateral',defaultSets:5}]);
 assert.equal(custom.lateralType,'Unilateral');assert.equal(custom.defaultSets,5);
});

test('different doses generate exact side-specific rows and survive unordered database reloads',()=>{
 const ex=reconcilePrescriptionSets(base);
 assert.equal(ex.sets,7);assert.equal(sideSets(ex,'left').length,4);assert.equal(sideSets(ex,'right').length,3);
 assert.ok(sideSets(ex,'left').every(s=>s.reps===10 && s.weight===12));
 assert.ok(sideSets(ex,'right').every(s=>s.reps===8 && s.weight===10));
 const reloaded={...base,performedSets:ex.performedSets!.map(({side,...s})=>s).reverse()};
 const restored=reconcilePrescriptionSets(reloaded);
 assert.deepEqual(restored.performedSets!.map(s=>s.id),ex.performedSets!.map(s=>s.id));
 assert.match(prescriptionSummary(restored),/Esq.: 4 × 10/);assert.match(prescriptionSummary(restored),/Dir.: 3 × 8/);
});

test('planned edits replace only pending rows, without deleting actual results or guessing their side',()=>{
 const original=reconcilePrescriptionSets(base);
 original.performedSets![3]={...original.performedSets![3],reps:0,weight:0,isCompleted:true};
 const adjusted=reconcilePrescriptionSets({...original,sidePrescriptions:{...base.sidePrescriptions!,left:{sets:2,reps:'6',weight:'BW'}}});
 assert.equal(sideSets(adjusted,'left').length,3); // 2 pending + 1 extra recorded
 assert.equal(sideSets(adjusted,'right').length,3);
 assert.ok(sideSets(adjusted,'left').some(s=>s.isCompleted && s.reps===0 && s.weight===0));
 const legacy={id:'legacy',reps:7,weight:20,rpe:8,isCompleted:true};
 const migrated=reconcilePrescriptionSets({...base,performedSets:[legacy]});
 assert.equal(migrated.performedSets!.length,8);assert.equal(getSetSide(legacy),undefined);
 assert.equal(reconcilePrescriptionSets(original,'completed'),original);
});

test('in-progress typed values, starting side and time prescriptions are preserved',()=>{
 const original=reconcilePrescriptionSets({...base,startingSide:'right',repsType:'time',sidePrescriptions:{left:{sets:2,reps:'30s',weight:'BW'},right:{sets:1,reps:'20s',weight:'BW'}}});
 assert.equal(getSetSide(original.performedSets![0]),'right');assert.equal(original.performedSets![0].timeSeconds,20);
 original.performedSets![0].reps=0;original.performedSets![0].weight=0;
 const resumed=reconcilePrescriptionSets(original,'in_progress');assert.equal(resumed.performedSets![0].reps,0);assert.equal(resumed.performedSets![0].weight,0);
});

test('per-side metadata validates doses and round-trips without altering common fields',()=>{
 assert.deepEqual(JSON.parse(exerciseMetadata(base)).sidePrescriptions,base.sidePrescriptions);
 assert.throws(()=>exerciseMetadata({...base,sidePrescriptions:{...base.sidePrescriptions,left:{sets:0,reps:'8',weight:'12'}}}));
 assert.throws(()=>exerciseMetadata({...base,startingSide:'invalid'}));
});

test('athlete-only save persists both sides and results without modifying the coach prescription',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`CREATE SCHEMA lb_accounts;CREATE TABLE lb_accounts.athlete_scopes(athlete_id text,organization_id text);CREATE TABLE lb_accounts.athlete_archives(athlete_id text);
 CREATE TABLE athletes(id text PRIMARY KEY,updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,injury_history text);INSERT INTO athletes(id) VALUES('a');
 CREATE TABLE workouts(id text PRIMARY KEY,athlete_id text,status text,rpe real,duration_minutes real,total_load real,feedback text,archived_at timestamptz);
 CREATE TABLE prescribed_exercises(id text PRIMARY KEY,workout_id text,prescription_meta jsonb);
 CREATE TABLE performed_sets(id text PRIMARY KEY,exercise_id text,reps integer,weight real,rpe real,is_completed boolean);
 INSERT INTO lb_accounts.athlete_scopes VALUES('a','org');INSERT INTO workouts(id,athlete_id,status) VALUES('w','a','planned');`);
 await db.query('INSERT INTO prescribed_exercises VALUES($1,$2,$3)',['e','w',exerciseMetadata(base)]);
 const ex=reconcilePrescriptionSets(base);ex.performedSets![0]={...ex.performedSets![0],reps:9,weight:11,isCompleted:true};
 const adapter={query:(q:string,p:any[])=>db.query(q,p),connect:async()=>({query:(q:string,p?:any[])=>db.query(q,p),release:()=>{}})} as any;
 await saveStudentData(adapter,{user_id:'student',organization_id:'org',role:'athlete',athlete_id:'a'} as any,[{id:'a',workouts:[{id:'w',status:'in_progress',exercises:[{...ex,sidePrescriptions:undefined}]}]}]);
 const meta=(await db.query('SELECT prescription_meta FROM prescribed_exercises')).rows[0].prescription_meta as any;
 assert.deepEqual(meta.sidePrescriptions,base.sidePrescriptions);
 const rows=(await db.query('SELECT * FROM performed_sets ORDER BY id DESC')).rows.map((s:any)=>({...s,isCompleted:s.is_completed}));
 const restored={...base,...meta,performedSets:rows};assert.equal(sideSets(restored,'left').length,4);assert.equal(sideSets(restored,'right').length,3);
 assert.equal(sideSets(restored,'left')[0].reps,9);assert.equal(sideSets(restored,'left')[0].weight,11);assert.equal(sideSets(restored,'left')[0].isCompleted,true);
 }finally{await db.close();}
});
