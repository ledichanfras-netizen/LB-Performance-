import test from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';
import {externalWeeklySummary,externalLoad,externalCompetitionId,externalHasDistance,externalSessionColumns,externalSessionFromRow,sortExternalSessions} from '../src/utils/externalSessions';
import {externalSessionDetailsSQL,saveExternalSession} from './externalSessionDetails';
import {saveStudentData} from './studentSave';
const session=(patch:any={}):any=>({id:'manual',date:'2026-10-29',type:'tecnico',durationMinutes:75,rpe:6,load:450,...patch});
test('external weekly summary uses Monday through today and preserves a real PSE zero',()=>{
 const rows=[session(),session({id:'zero',time:'18:00',rpe:0,load:0}),session({id:'old',date:'2026-10-25'}),session({id:'future',date:'2026-10-30'}),session({id:'monday',date:'2026-10-26T00:00:00.000Z'})];
 assert.deepEqual(externalWeeklySummary(rows,'2026-10-29'),{count:3,duration:225,load:900,coverage:3});
 assert.equal(externalLoad(session({rpe:0})),0);assert.equal(externalLoad(session({rpe:undefined})),null);
 assert.equal(sortExternalSessions(rows)[1].id,'zero');
 assert.equal(externalCompetitionId(session({id:'ext-match-old'})),'match-old');
 assert.equal(externalHasDistance('Tênis'),false);assert.equal(externalHasDistance('Natação'),true);assert.equal(externalHasDistance('Corrida / Atletismo'),true);
 assert.equal(externalSessionColumns({distanceKm:null,distance_km:5}).distance_km,null);
 assert.throws(()=>externalSessionColumns({time:'25:10'}));assert.throws(()=>externalSessionColumns({distanceKm:-1}));
});
test('external details survive coach writes, reload, edits and explicit distance clearing; old rows retain readable notes',async()=>{
 const db=new PGlite();try{
 await db.exec(`CREATE TABLE external_sessions(id text PRIMARY KEY,athlete_id text,date text,type text,duration_minutes integer,rpe integer,notes text,load real);INSERT INTO external_sessions VALUES('old','a','2026-10-01','tecnico',60,5,'Observação antiga',300);`);
 await db.exec(externalSessionDetailsSQL);await db.exec(externalSessionDetailsSQL);
 const adapter={query:(sql:string,p:any[])=>db.query(sql,p)};
 const row=session({activity:'Corrida / Atletismo',time:'07:30',distanceKm:5.25,notes:'Rodagem externa'});
 await saveExternalSession(adapter,'a',row);
 const loaded=externalSessionFromRow((await db.query("SELECT * FROM external_sessions WHERE id='manual'")).rows[0]);
 assert.equal(loaded.activity,'Corrida / Atletismo');assert.equal(loaded.time,'07:30');assert.equal(loaded.distanceKm,5.25);assert.equal(loaded.durationMinutes,75);
 await saveExternalSession(adapter,'a',{...loaded,distanceKm:null,time:'',rpe:0});
 const updated=externalSessionFromRow((await db.query("SELECT * FROM external_sessions WHERE id='manual'")).rows[0]);assert.equal(updated.distanceKm,null);assert.equal(updated.time,'');assert.equal(updated.load,0);
 await saveExternalSession(adapter,'a',session({id:'ext-match-source',competitionId:'match-source',activity:'Tênis',time:'10:00'}));
 assert.equal((await db.query("SELECT competition_id FROM external_sessions WHERE id='ext-match-source'")).rows[0].competition_id,'match-source');
 assert.equal((await db.query("SELECT notes FROM external_sessions WHERE id='old'")).rows[0].notes,'Observação antiga');
 }finally{await db.close();}
});
test('athlete persists session details in own organization and cannot overwrite another athlete; server calculates load',async()=>{
 const db=new PGlite();try{
 await db.exec(`CREATE SCHEMA lb_accounts;CREATE TABLE lb_accounts.athlete_scopes(athlete_id text,organization_id text);CREATE TABLE lb_accounts.athlete_archives(athlete_id text);
 CREATE TABLE athletes(id text PRIMARY KEY,updated_at timestamptz DEFAULT now(),injury_history text);INSERT INTO athletes(id) VALUES('a'),('b');INSERT INTO lb_accounts.athlete_scopes VALUES('a','org'),('b','other');
 CREATE TABLE workouts(id text,athlete_id text,archived_at timestamptz);
 CREATE TABLE external_sessions(id text PRIMARY KEY,athlete_id text,date text,type text,duration_minutes integer,rpe integer,notes text,load real);INSERT INTO external_sessions VALUES('foreign','b','2026-10-29','tecnico',60,5,'Outro atleta',300);`);
 await db.exec(externalSessionDetailsSQL);
 const query=(sql:string,p?:any[])=>db.query(sql,p);const pool={query,connect:async()=>({query,release(){}})} as any;
 const account={user_id:'student',role:'athlete',athlete_id:'a',organization_id:'org'} as any;
 await saveStudentData(pool,account,[{id:'a',externalSessions:[session({activity:'Ciclismo',time:'19:00',distanceKm:20,load:99999})]}]);
 const stored=externalSessionFromRow((await db.query("SELECT * FROM external_sessions WHERE id='manual'")).rows[0]);assert.equal(stored.distanceKm,20);assert.equal(stored.time,'19:00');assert.equal(Number(stored.load),450);
 await saveStudentData(pool,account,[{id:'a',externalSessions:[{...stored,distanceKm:null,rpe:0}]}]);
 assert.equal((await db.query("SELECT distance_km,load FROM external_sessions WHERE id='manual'")).rows[0].distance_km,null);
 assert.equal(Number((await db.query("SELECT load FROM external_sessions WHERE id='manual'")).rows[0].load),0);
 await assert.rejects(()=>saveStudentData(pool,account,[{id:'a',externalSessions:[session({id:'foreign'})]}]));
 assert.equal((await db.query("SELECT notes FROM external_sessions WHERE id='foreign'")).rows[0].notes,'Outro atleta');
 }finally{await db.close();}
});
