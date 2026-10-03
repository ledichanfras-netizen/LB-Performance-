import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { scopedAthletes,mayAccessAthlete } from './scope';
// External test-only runtime; no dependency added to application.
const runtime=process.env.LB_TEST_PGLITE_MODULE || '@electric-sql/pglite';
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

test('profile and deletion refuse cross-organization operations',async()=>{
 const {scopedDelete,scopedAthleteProfile}=await import('./scope');
 const db=new PGlite();
 const adapter={query:(q:string,p:any[])=>db.query(q,p),connect:async()=>({query:(q:string,p?:any[])=>db.query(q,p),release:()=>{}})} as any;
 try{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;
 CREATE TABLE users(id text PRIMARY KEY);CREATE TABLE athletes(id text PRIMARY KEY,name text,modality text);
 CREATE TABLE wellness(id text PRIMARY KEY,athlete_id text REFERENCES athletes(id));
 INSERT INTO users VALUES('coach');INSERT INTO athletes VALUES('a','Ana','Tênis'),('b','Bruno','Corrida');
 INSERT INTO wellness VALUES('wa','a'),('wb','b');`);
 await db.exec(await readFile(new URL('accounts-schema.sql',import.meta.url),'utf8'));
 const org1='11111111-1111-4111-8111-111111111111',org2='22222222-2222-4222-8222-222222222222';
 await db.query('INSERT INTO lb_accounts.organizations(id,name) VALUES($1,$2),($3,$4)',[org1,'LB',org2,'Outro']);
 await db.query('INSERT INTO lb_accounts.athlete_scopes VALUES($1,$2),($3,$4)',['a',org1,'b',org2]);
 const coach={user_id:'coach',organization_id:org1,role:'coach'};
 await assert.rejects(()=>scopedAthleteProfile(adapter,coach,'b',{name:'Changed',modality:'Outro'}));
 await assert.rejects(()=>scopedDelete(adapter,coach,'wellness','wb'));
 assert.equal((await db.query("SELECT name FROM athletes WHERE id='b'")).rows[0].name,'Bruno');
 assert.equal((await db.query("SELECT id FROM wellness WHERE id='wb'")).rows.length,1);
 const student={user_id:'student',organization_id:org1,role:'athlete',athlete_id:'a'};
 await assert.rejects(()=>scopedAthleteProfile(adapter,student,'a',{name:'Changed',modality:'Outro'}));
 await scopedDelete(adapter,student,'wellness','wa');
 assert.equal((await db.query("SELECT id FROM wellness WHERE id='wa'")).rows.length,0);
 await assert.rejects(()=>scopedDelete(adapter,coach,'users','coach'));
 }finally{await db.close();}
});


test('distributed login limiter resets its time window',async()=>{
 const {allowAccountAttempt}=await import('./accountRate');const db=new PGlite();
 try{await db.exec('CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA lb_accounts;');
 await db.exec(await readFile(new URL('account-rate-schema.sql',import.meta.url),'utf8'));
 const adapter={query:(q:string,p:any[])=>db.query(q,p)} as any;
 for(let i=0;i<20;i++)assert.equal(await allowAccountAttempt(adapter,'login','leandro',0),true);
 assert.equal(await allowAccountAttempt(adapter,'login','leandro',0),false);
 assert.equal(await allowAccountAttempt(adapter,'login','another',0),true);
 assert.equal(await allowAccountAttempt(adapter,'login','leandro',900000),true);
 }finally{await db.close();}
});

test('invitation and manual renewal end to end with PostgreSQL',async()=>{
 const express=(await import('express')).default;
 const {accountRouter,tokenHash}=await import('./accounts');
 const {billingRouter}=await import('./billing');
 const db=new PGlite();
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;
 CREATE TABLE users(id text PRIMARY KEY,username text UNIQUE,password text,role text,athlete_id text,plan text);
 CREATE TABLE athletes(id text PRIMARY KEY,name text,modality text);
 INSERT INTO users VALUES('admin','Leandro','unused','coach',NULL,'pro');`);
 for(const f of ['accounts-schema.sql','billing-schema.sql','account-rate-schema.sql'])await db.exec(await readFile(new URL(f,import.meta.url),'utf8'));
 const org='11111111-1111-4111-8111-111111111111';
 await db.query('INSERT INTO lb_accounts.organizations(id,name) VALUES($1,$2)',[org,'LB']);
 const invite='a'.repeat(64),expired='b'.repeat(64);
 await db.query("INSERT INTO lb_accounts.invites VALUES($1,$2,$3,$4,'coach',NULL,'admin',now()+interval '1 hour',NULL),($5,$6,$3,$7,'coach',NULL,'admin',now()-interval '1 hour',NULL)",['22222222-2222-4222-8222-222222222222',tokenHash(invite),org,'coach-new','33333333-3333-4333-8333-333333333333',tokenHash(expired),'expired-user']);
 const adapter={query:(q:string,p?:any[])=>db.query(q,p),connect:async()=>({query:(q:string,p?:any[])=>db.query(q,p),release:()=>{}})} as any;
 process.env.ACCOUNTS_ENABLED='true';process.env.JWT_SECRET='test-secret';process.env.BILLING_ENABLED='true';process.env.BILLING_ADMIN_USER_IDS='admin';
 const app=express();app.use(express.json());app.use('/accounts',accountRouter(adapter,'test-secret'));
 app.use('/billing',billingRouter(adapter,(req:any,_res,next)=>{req.user={id:'admin'};next();}));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${(server.address() as any).port}`;
 const post=async(path:string,body:any)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
 assert.equal((await post('/accounts/accept',{token:expired,password:'a-new-safe-password'})).status,400);
 assert.equal((await post('/accounts/accept',{token:invite,password:'a-new-safe-password'})).status,201);
 assert.equal((await post('/accounts/accept',{token:invite,password:'a-new-safe-password'})).status,400);
 const login=await post('/accounts/login',{username:'coach-new',password:'a-new-safe-password'});assert.equal(login.status,200);
 const user=await login.json();assert.equal(user.platformAdmin,false);
 assert.equal((await fetch(base+'/accounts/me',{headers:{Authorization:`Bearer ${user.token}`}})).status,200);
 assert.equal((await post('/billing/plans',{name:'Mensal',audience:'coach',priceCents:10000,durationDays:30})).status,201);
 const overview=await (await fetch(base+'/billing/overview')).json();const plan=overview.plans[0];
 const subResponse=await post('/billing/subscriptions',{userId:user.id,planId:plan.id});assert.equal(subResponse.status,201);const sub=await subResponse.json();
 const payment={requestId:'manual-payment-request-001',amountCents:10000,method:'pix',reason:'Recebimento confirmado'};
 const first=await post(`/billing/subscriptions/${sub.id}/renew`,payment);assert.equal(first.status,200);const firstData=await first.json();
 const second=await post(`/billing/subscriptions/${sub.id}/renew`,payment);assert.equal(second.status,200);const secondData=await second.json();assert.equal(secondData.duplicate,true);assert.equal(secondData.validUntil,firstData.validUntil);
 assert.equal((await db.query('SELECT * FROM lb_billing.entries')).rows.length,1);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await db.close();}
});
