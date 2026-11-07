import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { anamnesisBackupFields, readAnamnesisBackup } from './anamnesis';
import { lockAthleteSnapshots, syncRevision } from './workoutSync';
import { mergeAthletesWithLocalCache } from '../src/utils';

const record = {id:'anamnesis-test',athleteId:'a',date:'2026-11-06',cardio:{chestPainExercise:false},orthopedic:{painLevel:0},mainGoal:'performance'};

test('anamnesis persists all answers and survives a legacy-device save which omits the history', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE TABLE athletes(id text PRIMARY KEY,updated_at timestamptz DEFAULT now(),injury_history text); CREATE TABLE workouts(id text,athlete_id text,archived_at timestamptz);');
    const backup = JSON.stringify({legacy:'unchanged',...anamnesisBackupFields({id:'a',anamnesis:[record]})});
    await db.query('INSERT INTO athletes(id,injury_history) VALUES($1,$2)',['a',backup]);
    const stored = (await db.query('SELECT * FROM athletes WHERE id=$1',['a'])).rows[0] as any;
    assert.deepEqual(readAnamnesisBackup(stored.injury_history),[record]);
    const legacy:any={id:'a',syncRevision:syncRevision(stored.updated_at),workouts:[]};
    await lockAthleteSnapshots({query:(sql:string,args:any[])=>db.query(sql,args)},[legacy]);
    assert.deepEqual(legacy.anamnesis,[record]);
    const resaved=JSON.stringify({legacy:'unchanged',...anamnesisBackupFields(legacy)});
    await db.query('UPDATE athletes SET injury_history=$1 WHERE id=$2',[resaved,'a']);
    assert.deepEqual(readAnamnesisBackup((await db.query('SELECT injury_history FROM athletes WHERE id=$1',['a'])).rows[0].injury_history),[record]);
    assert.deepEqual(anamnesisBackupFields({id:'a',anamnesis:[]}),{anamnesis:[]});
  } finally { await db.close(); }
});

test('legacy database absence preserves tablet-only history during synchronization', () => {
  assert.equal(readAnamnesisBackup('{"legacy":"text"}'),undefined);
  assert.equal(readAnamnesisBackup('plain legacy text'),undefined);
  assert.deepEqual(anamnesisBackupFields({id:'a'}),{});
  const local:any={id:'a',name:'Teste',anamnesis:[record]};
  assert.deepEqual(mergeAthletesWithLocalCache([local],[{id:'a',name:'Teste'} as any])[0].anamnesis,[record]);
  assert.deepEqual(mergeAthletesWithLocalCache([local],[{id:'a',name:'Teste',anamnesis:[]} as any])[0].anamnesis,[]);
});

test('anamnesis rejects invalid or cross-athlete histories before storage', () => {
  assert.throws(()=>anamnesisBackupFields({id:'other',anamnesis:[record]}));
  assert.throws(()=>anamnesisBackupFields({id:'a',anamnesis:{}}));
  assert.throws(()=>anamnesisBackupFields({id:'a',anamnesis:[record,record]}));
  assert.throws(()=>anamnesisBackupFields({id:'a',anamnesis:[{...record,date:'invalid'}]}));
});
