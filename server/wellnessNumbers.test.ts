import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { normalizeReadinessScore } from '../src/utils/wellnessNumbers';
import { sanitizeAthleteData } from '../src/utils';
import { validateSportsPayload } from './sportsValidation';
import { assertCompleteSnapshots } from './snapshotContract';
import { saveStudentData } from './studentSave';

test('valid NUMERIC strings are normalized without clamping, rounding or changing the cached source', () => {
  for (const [raw, expected] of [['0', 0], ['85', 85], ['100.00', 100], [' 68.75 ', 68.75]] as const) {
    const source = { id: 'wellness', readinessScore: raw, notes: 'Preservar' };
    const normalized = normalizeReadinessScore(source);
    assert.equal(normalized.readinessScore, expected);
    assert.equal(normalized.notes, 'Preservar'); assert.equal(source.readinessScore, raw);
    const snapshot: any = { id: 'a', wellness: [source] };
    validateSportsPayload([snapshot]); assert.equal(snapshot.wellness[0].readinessScore, expected);
  }
  for (const raw of [undefined, null, 0, 100, 68.75]) {
    const source = { readinessScore: raw };
    assert.equal(normalizeReadinessScore(source), source);
  }
});

test('invalid readiness is still rejected and other sports validation is unchanged', () => {
  for (const raw of ['', ' ', '85%', '85 points', 'NaN', 'Infinity', '1e2', true, {}, [], '101', '-1', 120, -1, NaN, Infinity]) {
    const source = { readinessScore: raw };
    assert.equal(normalizeReadinessScore(source), source);
    assert.throws(() => validateSportsPayload([{ id: 'a', wellness: [source] }]), /prontidão/);
  }
  assert.throws(() => validateSportsPayload([{id:'a',wellness:[{readinessScore:'85',fatigue:11}]}]), /fatigue/);
  assert.throws(() => validateSportsPayload([{id:'a',wellness:[{readinessScore:'85'}],workouts:[{rpe:'5'}]}]), /PSE/);
});

test('read/cache/save cycle with PostgreSQL NUMERIC no longer blocks readiness, workout edits or completion snapshots', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE wellness(id text PRIMARY KEY,readiness_score numeric); INSERT INTO wellness VALUES('historic',85.25);`);
    const row: any = (await db.query('SELECT * FROM wellness')).rows[0];
    assert.equal(typeof row.readiness_score, 'string');
    const raw: any = {id:'a',name:'Synthetic',dob:'2000-01-01',gender:'M',modality:'Futebol',assessments:{},externalSessions:[],wellness:[{id:row.id,date:'2026-11-01',readinessScore:row.readiness_score}],workouts:[]};
    const normalized = sanitizeAthleteData(JSON.parse(JSON.stringify(raw)));
    assert.equal(normalized.wellness![0].readinessScore, 85.25);
    assert.equal(raw.wellness[0].readinessScore, '85.25');
    for (const workouts of [[], [{id:'workout',date:'2026-11-09',name:'Edited',status:'planned',exercises:[]}], [{id:'workout',date:'2026-11-09',status:'completed',durationMinutes:41,rpe:4,exercises:[]}]]) {
      const snapshot: any = {...raw,wellness:[...raw.wellness,{id:'new',date:'2026-11-09',readinessScore:90}],workouts};
      assertCompleteSnapshots([snapshot]); validateSportsPayload([snapshot]);
      assert.equal(snapshot.wellness[0].readinessScore,85.25);
    }
    assert.equal((await db.query('SELECT readiness_score FROM wellness')).rows[0].readiness_score,'85.25');
  } finally { await db.close(); }
});

test('actual student transaction saves readiness and completed workouts with cached scores while enforcing revisions and ownership', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE SCHEMA lb_accounts;
      CREATE TABLE lb_accounts.athlete_scopes(athlete_id text,organization_id text);
      CREATE TABLE lb_accounts.athlete_archives(athlete_id text);
      CREATE TABLE athletes(id text PRIMARY KEY,injury_history text,updated_at timestamptz DEFAULT now());
      INSERT INTO athletes(id) VALUES('a'),('b'); INSERT INTO lb_accounts.athlete_scopes VALUES('a','org'),('b','other');
      CREATE TABLE wellness(id text PRIMARY KEY,athlete_id text,date text,readiness_score numeric,fatigue integer,sleep real,stress integer,soreness integer,mood integer);
      INSERT INTO wellness VALUES('old','a','2026-11-01',85.25,1,8,1,1,8),('foreign','b','2026-11-01',70,1,8,1,1,8);
      CREATE TABLE workouts(id text PRIMARY KEY,athlete_id text,status text,rpe real,duration_minutes real,archived_at timestamptz);
      INSERT INTO workouts VALUES('workout','a','planned',NULL,NULL,NULL);`);
    const pool: any = {connect:async()=>({query:(sql:string,args:any[])=>db.query(sql,args),release:()=>{}})};
    const account: any = {user_id:'student',role:'athlete',athlete_id:'a',organization_id:'org'};
    const revision = async () => (await db.query("SELECT updated_at FROM athletes WHERE id='a'")).rows[0].updated_at;
    const firstRevision = await revision();
    const payload: any = {id:'a',syncRevision:firstRevision,wellness:[{id:'old',date:'2026-11-01',readinessScore:'85.25',fatigue:1,sleep:8,stress:1,soreness:1,mood:8},{id:'new',date:'2026-11-09',readinessScore:90,fatigue:0,sleep:8,stress:0,soreness:0,mood:9}],workouts:[{id:'workout',status:'completed',rpe:4,durationMinutes:41}]};
    const result = await saveStudentData(pool,account,[payload]); assert.ok(result.syncRevisions.a);
    assert.equal((await db.query("SELECT readiness_score FROM wellness WHERE id='old'")).rows[0].readiness_score,'85.25');
    assert.equal((await db.query("SELECT readiness_score FROM wellness WHERE id='new'")).rows[0].readiness_score,'90');
    assert.equal((await db.query("SELECT status FROM workouts WHERE id='workout'")).rows[0].status,'completed');
    await assert.rejects(saveStudentData(pool,account,[{...payload,syncRevision:firstRevision}]), /outro dispositivo/);
    await assert.rejects(saveStudentData(pool,account,[{...payload,id:'b'}]));
    await assert.rejects(saveStudentData(pool,account,[{id:'a',syncRevision:await revision(),wellness:[{id:'foreign',date:'2026-11-09',readinessScore:'85'}]}]));
    assert.equal((await db.query("SELECT readiness_score FROM wellness WHERE id='foreign'")).rows[0].readiness_score,'70');
  } finally { await db.close(); }
});
