import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { normalizePerformedSetNumbers, normalizeWorkoutNumbers, normalizeExternalSessionNumbers } from '../src/utils/sportNumericStorage';
import { normalizeReadinessScore } from '../src/utils/wellnessNumbers';
import { validateSportsPayload } from './sportsValidation';
import { assertCompleteSnapshots } from './snapshotContract';
import { workoutFromRows } from './workoutHistory';
import { sanitizeAthleteData } from '../src/utils';
import { realizedTonnage } from '../src/utils/sessionMetrics';
import { externalSessionFromRow } from '../src/utils/externalSessions';

test('shared NUMERIC decoding preserves zeros and decimals across all audited storage fields', () => {
  const source = { weight: '37.50', reps: 8, rpe: 0, isCompleted: true };
  const normalized = normalizePerformedSetNumbers(source);
  assert.equal(normalized.weight,37.5); assert.equal(source.weight,'37.50');
  assert.equal(normalizePerformedSetNumbers({weight:'0.00'}).weight,0);
  assert.equal(normalizeReadinessScore({readinessScore:'79.00'}).readinessScore,79);
  assert.deepEqual(normalizeWorkoutNumbers({totalLoad:'1500.50',monotony:'1.25',strain:'1875.625'}),{totalLoad:1500.5,monotony:1.25,strain:1875.625});
  assert.equal(normalizeExternalSessionNumbers({load:'450.0'}).load,450);
  assert.equal(externalSessionFromRow({load:'450',duration_minutes:75,rpe:6}).load,450);
});

test('weight compatibility is restricted to valid decimal measurements, never units or prescriptions', () => {
  for (const weight of ['', ' ', 'BW', '20kg', '70%', '1e2', 'NaN', 'Infinity', true, {}, [], '-1', '2001', -1, 2001, NaN, Infinity]) {
    const set = {weight}; assert.equal(normalizePerformedSetNumbers(set),set);
    assert.throws(()=>validateSportsPayload([{id:'a',workouts:[{exercises:[{performedSets:[set]}]}]}]),/carga/);
  }
  const set = {weight:'37.50',reps:8,rpe:0,isCompleted:true};
  validateSportsPayload([{id:'a',wellness:[{readinessScore:'79'}],workouts:[{rpe:4,exercises:[{weight:'70% 1RM',performedSets:[set]}]}]}]);
  assert.equal(set.weight,37.5);
  assert.throws(()=>validateSportsPayload([{id:'a',workouts:[{rpe:'4'}]}]),/PSE/);
});

test('NUMERIC database -> history -> cache -> snapshot supports readiness changes and workout edits without replacing prescription or results', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE workouts(id text,date text,status text,rpe integer,duration_minutes integer,total_load numeric,monotony numeric,strain numeric);
      CREATE TABLE exercises(id text,workout_id text,name text,weight text,sets integer,reps text,order_index integer,prescription_meta jsonb);
      CREATE TABLE performed_sets(id text,exercise_id text,reps integer,weight numeric,rpe integer,is_completed boolean);
      INSERT INTO workouts VALUES('w','2026-11-09','completed',4,41,300,1.25,375);
      INSERT INTO exercises VALUES('e','w','Agachamento','70% 1RM',1,'8',0,'{}');
      INSERT INTO performed_sets VALUES('s','e',8,37.5,0,true);`);
    const wk = (await db.query('SELECT * FROM workouts')).rows[0];
    const exercises = (await db.query('SELECT * FROM exercises')).rows;
    const sets = (await db.query('SELECT * FROM performed_sets')).rows;
    assert.equal(typeof sets[0].weight,'string');
    const loaded = workoutFromRows(wk,exercises,sets);
    assert.equal(loaded.exercises[0].weight,'70% 1RM');
    assert.equal(loaded.exercises[0].performedSets[0].weight,37.5);
    assert.equal(loaded.totalLoad,300); assert.equal(loaded.monotony,1.25);
    const source: any = {id:'a',name:'Synthetic',dob:'2000-01-01',gender:'M',modality:'Futebol',assessments:{},externalSessions:[],wellness:[{id:'old',date:'2026-11-08',readinessScore:'79'}],workouts:[JSON.parse(JSON.stringify(loaded))]};
    // Also exercise compatibility with an old device cache, before the fixed reader existed.
    source.workouts[0].exercises[0].performedSets[0].weight='37.50';
    const normalized = sanitizeAthleteData(source);
    assert.equal(normalized.workouts[0].exercises[0].performedSets![0].weight,37.5);
    assert.equal(source.workouts[0].exercises[0].performedSets[0].weight,'37.50');
    for (const action of ['readiness','edit','complete']) {
      const snapshot=structuredClone(source);
      if(action==='readiness')snapshot.wellness.unshift({id:'new',date:'2026-11-09',readinessScore:85});
      if(action==='edit')snapshot.workouts[0].name='Nome corrigido';
      assertCompleteSnapshots([snapshot]);validateSportsPayload([snapshot]);
      assert.equal(snapshot.workouts[0].exercises[0].performedSets[0].weight,37.5);
      assert.equal(snapshot.workouts[0].exercises[0].weight,'70% 1RM');
      assert.equal(realizedTonnage(snapshot.workouts[0].exercises),300);
    }
    assert.equal((await db.query('SELECT weight FROM performed_sets')).rows[0].weight,'37.5');
  } finally { await db.close(); }
});

test('tonnage uses valid NUMERIC results, ignores missing/invalid/unchecked/aerobic rows and never substitutes a prescribed load', () => {
  const set:any={reps:8,weight:'37.50',isCompleted:true};
  assert.equal(realizedTonnage([{performedSets:[set]}]),300);
  for (const weight of [undefined,null,'','BW','37.5kg','-1','2001']) assert.equal(realizedTonnage([{weight:'100',performedSets:[{...set,weight}]}] as any),0);
  assert.equal(realizedTonnage([{performedSets:[{...set,isCompleted:false}]}]),0);
  assert.equal(realizedTonnage([{aerobic:{},performedSets:[set]}]),0);
});
