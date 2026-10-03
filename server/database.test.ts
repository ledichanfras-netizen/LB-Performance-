import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { scopedAthletes,mayAccessAthlete } from './scope';
// External test-only runtime; no dependency added to application.
const runtime=process.env.LB_TEST_PGLITE_MODULE;
if(!runtime) throw Error('Set LB_TEST_PGLITE_MODULE to the installed PGlite module.');
const {PGlite}=await import(runtime);
test('schemas and organization scope on PostgreSQL',async()=>{
 const db=new PGlite();
 try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
 CREATE TABLE public.users(id text PRIMARY KEY,username text UNIQUE,password text,role text,athlete_id text,plan text);
 CREATE TABLE public.athletes(id text PRIMARY KEY,name text,modality text);
 INSERT INTO users VALUES('admin','Leandro','hash','coach',NULL,'pro');
 INSERT INTO athletes VALUES('a','Ana','Tênis'),('b','Bruno','Corrida');`);
 for(const file of ['accounts-schema.sql','billing-schema.sql'])await db.exec(await readFile(new URL(file,import.meta.url),'utf8'));
 const org1='11111111-1111-4111-8111-111111111111',org2='22222222-2222-4222-8222-222222222222';
 await db.query('INSERT INTO lb_accounts.organizations(id,name) VALUES($1,$2),($3,$4)',[org1,'LB',org2,'Outro']);
 await db.query('INSERT INTO lb_accounts.athlete_scopes VALUES($1,$2),($3,$4)',['a',org1,'b',org2]);
 const adapter={query:(q:string,p:any[])=>db.query(q,p)} as any;
 assert.deepEqual((await scopedAthletes(adapter,{user_id:'admin',organization_id:org1,role:'coach'})).map((x:any)=>x.id),['a']);
 assert.equal(await mayAccessAthlete(adapter,{user_id:'admin',organization_id:org1,role:'coach'},'b'),false);
 assert.equal(await mayAccessAthlete(adapter,{user_id:'student',organization_id:org1,role:'athlete',athlete_id:'b'},'a'),false);
 await db.exec('SET ROLE anon');
 await assert.rejects(()=>db.query('SELECT * FROM lb_accounts.invites'));
 await assert.rejects(()=>db.query('SELECT * FROM lb_billing.entries'));
 await db.exec('RESET ROLE');
 // Validate repeatable schema setup without destroying existing scopes.
 for(const file of ['accounts-schema.sql','billing-schema.sql'])await db.exec(await readFile(new URL(file,import.meta.url),'utf8'));
 assert.equal((await db.query('SELECT * FROM lb_accounts.athlete_scopes')).rows.length,2);
 }finally{await db.close();}
});
