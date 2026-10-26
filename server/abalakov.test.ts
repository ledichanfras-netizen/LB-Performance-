import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { ensureAbalakovTable, saveAbalakovAssessments } from './abalakov';
import { validateScopedSave } from './saveScope';
import { scopedDelete } from './scope';
import { createSaveBatch } from './saveBatch';

test('Abalakov persists every CMJ metric, stays separate, validates ownership and deletes by scope',async()=>{
 const db=new PGlite();
 const query=async(sql:string,args?:any[])=>args?.length ? db.query(sql,args) : (await db.exec(sql)).at(-1) || {rows:[]};
 const client={query,release(){}};
 const pool={query,connect:async()=>client} as any;
 const coach={organization_id:'org',role:'coach',user_id:'coach'} as any;
 try {
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;
   CREATE SCHEMA lb_accounts;CREATE TABLE lb_accounts.athlete_scopes(athlete_id text,organization_id text);
   CREATE TABLE lb_accounts.athlete_archives(athlete_id text);
   CREATE TABLE athletes(id text PRIMARY KEY);CREATE TABLE cmj(id text PRIMARY KEY,athlete_id text,height real);
   INSERT INTO athletes VALUES('a'),('b');INSERT INTO lb_accounts.athlete_scopes VALUES('a','org'),('b','other');
   INSERT INTO cmj VALUES('cmj-only','a',38);`);
  await ensureAbalakovTable(client);await ensureAbalakovTable(client);
  const assessment={id:'ab-a',date:'2026-10-26',weight:72.5,height:49.8,power:3100.4,depth:32.1,rsi:0,flightTime:637.2,averageForce:1530.6,observations:'Com auxílio dos braços'};
  const athlete={id:'a',assessments:{abalakov:[assessment]}};
  await validateScopedSave(client as any,coach,[athlete]);
  const writes=createSaveBatch(client as any);await saveAbalakovAssessments(writes,athlete);await writes.flush();
  const row=(await query('SELECT * FROM abalakov WHERE id=$1',['ab-a'])).rows[0];
  assert.equal(row.height,49.8);assert.equal(row.flight_time,637.2);assert.equal(row.average_force,1530.6);
  assert.equal(row.power,3100.4);assert.equal(row.depth,32.1);assert.equal(row.weight,72.5);assert.equal(row.observations,assessment.observations);
  assert.deepEqual((await query('SELECT height FROM cmj')).rows,[{height:38}]);
  assessment.height=12.4;assessment.observations='Reavaliação';
  await saveAbalakovAssessments(client,athlete);
  assert.equal((await query('SELECT height FROM abalakov')).rows[0].height,12.4);
  await assert.rejects(()=>validateScopedSave(client as any,{...coach,organization_id:'other'},[{id:'b',assessments:{abalakov:[assessment]}}]));
  await assert.rejects(()=>scopedDelete(pool,{...coach,organization_id:'other'},'abalakov','ab-a'));
  await assert.rejects(()=>scopedDelete(pool,{...coach,role:'athlete',athlete_id:'a'},'abalakov','ab-a'));
  const privileges=(await query(`SELECT relrowsecurity AS rls,has_table_privilege('anon','abalakov','SELECT') AS anon,has_table_privilege('authenticated','abalakov','INSERT') AS authenticated FROM pg_class WHERE oid='abalakov'::regclass`)).rows[0];
  assert.deepEqual(privileges,{rls:true,anon:false,authenticated:false});
  await scopedDelete(pool,coach,'abalakov','ab-a');
  assert.equal((await query('SELECT * FROM abalakov')).rows.length,0);
  assert.equal((await query('SELECT * FROM cmj')).rows.length,1);
 }finally{await db.close();}
});


test('Abalakov cache sync retains separate histories',async()=>{
 const {mergeAthletesWithLocalCache}=await import('../src/utils');
 const base={id:'a',workouts:[],wellness:[],externalSessions:[]} as any;
 const local={...base,assessments:{cmj:[{id:'cmj',date:'2026-10-01',height:38}],abalakov:[{id:'old',date:'2026-10-01',height:45}]}};
 const remote={...base,assessments:{abalakov:[{id:'new',date:'2026-10-26',height:49.8}]}};
 const merged=mergeAthletesWithLocalCache([local],[remote]);
 assert.deepEqual(merged[0].assessments.abalakov?.map(x=>x.id),['new','old']);
 assert.deepEqual(merged[0].assessments.cmj.map(x=>x.id),['cmj']);
});
