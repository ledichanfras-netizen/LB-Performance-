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
 for(const f of ['accounts-schema.sql','billing-schema.sql','account-rate-schema.sql','commercial-controls-schema.sql'])await db.exec(await readFile(new URL(f,import.meta.url),'utf8'));
 const org='11111111-1111-4111-8111-111111111111';
 await db.query('INSERT INTO lb_accounts.organizations(id,name) VALUES($1,$2)',[org,'LB']);
 const invite='a'.repeat(64),expired='b'.repeat(64);
 await db.query("INSERT INTO lb_accounts.invites(id,token_hash,organization_id,username,role,athlete_id,created_by,expires_at,accepted_at) VALUES($1,$2,$3,$4,'coach',NULL,'admin',now()+interval '1 hour',NULL),($5,$6,$3,$7,'coach',NULL,'admin',now()-interval '1 hour',NULL)",['22222222-2222-4222-8222-222222222222',tokenHash(invite),org,'coach-new','33333333-3333-4333-8333-333333333333',tokenHash(expired),'expired-user']);
 const adapter={query:(q:string,p?:any[])=>db.query(q,p),connect:async()=>({query:(q:string,p?:any[])=>db.query(q,p),release:()=>{}})} as any;
 process.env.ACCOUNTS_ENABLED='true';process.env.JWT_SECRET='test-secret';process.env.BILLING_ENABLED='true';process.env.BILLING_ADMIN_USER_IDS='admin';
 const app=express();app.use(express.json());app.use('/accounts',accountRouter(adapter,'test-secret'));
 app.use('/billing',billingRouter(adapter,(req:any,_res,next)=>{req.user={id:'admin'};next();}));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${(server.address() as any).port}`;
 const post=async(path:string,body:any)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
 await db.query('INSERT INTO lb_accounts.memberships(user_id,organization_id,platform_admin) VALUES($1,$2,true)',['admin',org]);
 const jwt=(await import('jsonwebtoken')).default;const adminToken=jwt.sign({id:'admin',accountMode:'scoped',sessionVersion:1},'test-secret');
 const invitePost=(body:any)=>fetch(base+'/accounts/invites',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${adminToken}`},body:JSON.stringify(body)});
 const organizations=await fetch(base+'/accounts/organizations',{headers:{Authorization:`Bearer ${adminToken}`}});assert.equal(organizations.status,200);assert.equal((await organizations.json())[0].id,org);
 const generated=await invitePost({organizationId:' '+org+' ',username:' coach.generated ',role:'coach',athleteId:''});assert.equal(generated.status,201);assert.match((await generated.json()).token,/^[a-f0-9]{64}$/);
 assert.equal((await invitePost({organizationId:org,username:'coach.generated',role:'coach'})).status,409);
 const ownerInvite=await invitePost({organizationId:org,username:'Leandro',role:'coach'});assert.equal(ownerInvite.status,400);assert.match((await ownerInvite.json()).error,/administrador/);
 assert.equal((await invitePost({organizationId:'LB',username:'another.coach',role:'coach'})).status,400);
 assert.equal((await post('/accounts/accept',{token:expired,password:'a-new-safe-password'})).status,400);
 assert.equal((await post('/accounts/accept',{token:invite,password:'a-new-safe-password'})).status,201);
 assert.equal((await post('/accounts/accept',{token:invite,password:'a-new-safe-password'})).status,400);
 const login=await post('/accounts/login',{username:'coach-new',password:'a-new-safe-password'});assert.equal(login.status,200);
 const user=await login.json();assert.equal(user.platformAdmin,false);assert.equal(user.aiEnabled,false);
 assert.equal((await fetch(base+'/accounts/me',{headers:{Authorization:`Bearer ${user.token}`}})).status,200);
 assert.equal((await post('/billing/plans',{name:'Mensal',audience:'coach',priceCents:10000,durationDays:30})).status,201);
 const overview=await (await fetch(base+'/billing/overview')).json();const plan=overview.plans[0];
 const subResponse=await post('/billing/subscriptions',{userId:user.id,planId:plan.id});assert.equal(subResponse.status,201);const sub=await subResponse.json();
 const payment={requestId:'manual-payment-request-001',amountCents:10000,method:'pix',reason:'Recebimento confirmado'};
 const first=await post(`/billing/subscriptions/${sub.id}/renew`,payment);assert.equal(first.status,200);const firstData=await first.json();
 const second=await post(`/billing/subscriptions/${sub.id}/renew`,payment);assert.equal(second.status,200);const secondData=await second.json();assert.equal(secondData.duplicate,true);assert.equal(secondData.validUntil,firstData.validUntil);
 assert.equal((await db.query('SELECT * FROM lb_billing.entries')).rows.length,1);
 assert.equal((await post(`/billing/subscriptions/${sub.id}/action`,{action:'cancel-renewal',reason:'Solicitação do treinador'})).status,200);
 const cancelled=await db.query('SELECT valid_until,renewal_cancelled FROM lb_billing.subscriptions WHERE id=$1',[sub.id]);assert.equal(cancelled.rows[0].renewal_cancelled,true);assert.equal(new Date(cancelled.rows[0].valid_until).toISOString(),firstData.validUntil);
 assert.equal((await post(`/billing/subscriptions/${sub.id}/action`,{action:'suspend',reason:'Revisão administrativa'})).status,200);
 const {hasSportsAccess}=await import('./entitlement');assert.equal(await hasSportsAccess(adapter,{user_id:user.id,organization_id:org,role:'coach'}),false);
 assert.equal((await post(`/billing/subscriptions/${sub.id}/action`,{action:'resume',reason:'Revisão concluída'})).status,200);
 assert.equal(await hasSportsAccess(adapter,{user_id:user.id,organization_id:org,role:'coach'}),true);
 const reset='c'.repeat(64);await db.query("INSERT INTO lb_accounts.invites(id,token_hash,organization_id,username,role,created_by,expires_at,target_user_id) VALUES($1,$2,$3,'coach-new','coach','admin',now()+interval '1 hour',$4)",['44444444-4444-4444-8444-444444444444',tokenHash(reset),org,user.id]);
 assert.equal((await post('/accounts/accept',{token:reset,password:'another-safe-password'})).status,201);
 assert.equal((await fetch(base+'/accounts/me',{headers:{Authorization:`Bearer ${user.token}`}})).status,401);
 assert.equal((await post('/accounts/login',{username:'coach-new',password:'another-safe-password'})).status,200);

 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await db.close();}
});

test('batch save refuses foreign nested IDs and ownership reassignment',async()=>{
 const {validateScopedSave}=await import('./saveScope');const db=new PGlite();
 try{await db.exec(`CREATE TABLE athletes(id text PRIMARY KEY);CREATE SCHEMA lb_accounts;CREATE TABLE lb_accounts.athlete_scopes(athlete_id text,organization_id text);CREATE TABLE lb_accounts.athlete_archives(athlete_id text);
 CREATE TABLE wellness(id text PRIMARY KEY,athlete_id text);CREATE TABLE external_sessions(id text PRIMARY KEY,athlete_id text);CREATE TABLE workouts(id text PRIMARY KEY,athlete_id text);
 CREATE TABLE prescribed_exercises(id text PRIMARY KEY,workout_id text);CREATE TABLE performed_sets(id text PRIMARY KEY,exercise_id text);
 CREATE TABLE bioimpedance(id text PRIMARY KEY,athlete_id text);CREATE TABLE isometric_strength(id text PRIMARY KEY,athlete_id text);CREATE TABLE cmj(id text PRIMARY KEY,athlete_id text);CREATE TABLE drop_jump(id text PRIMARY KEY,athlete_id text);CREATE TABLE vo2max(id text PRIMARY KEY,athlete_id text);CREATE TABLE speed(id text PRIMARY KEY,athlete_id text);CREATE TABLE imtp(id text PRIMARY KEY,athlete_id text);CREATE TABLE general_strength(id text PRIMARY KEY,athlete_id text);
 INSERT INTO athletes VALUES('a'),('b');INSERT INTO lb_accounts.athlete_scopes VALUES('a','org1'),('b','org2');INSERT INTO wellness VALUES('foreign','b');`);
 const adapter={query:(q:string,p:any[])=>q.includes('pg_advisory_xact_lock')?Promise.resolve({rows:[]}):db.query(q,p)} as any;
 const coach={user_id:'u',organization_id:'org1',role:'coach'};
 await assert.rejects(()=>validateScopedSave(adapter,coach,[{id:'b'}]));
 await assert.rejects(()=>validateScopedSave(adapter,coach,[{id:'a',wellness:[{id:'foreign'}]}]));
 await assert.rejects(()=>validateScopedSave(adapter,coach,[{id:'new1',wellness:[{id:'same'}]},{id:'new2',wellness:[{id:'same'}]}]));
 await validateScopedSave(adapter,coach,[{id:'a',wellness:[{id:'new'}]}]);
 await assert.rejects(()=>validateScopedSave(adapter,{...coach,role:'athlete'},[{id:'a'}]));
 }finally{await db.close();}
});

test('expired student subscription is not overridden by an organization license',async()=>{
 const {hasSportsAccess}=await import('./entitlement');
 const student={user_id:'student',organization_id:'org',role:'athlete'};
 const ownExpired={query:async()=>({rows:[{allowed:false}]})} as any;
 assert.equal(await hasSportsAccess(ownExpired,student),false);
 let calls=0;const included={query:async()=>({rows:++calls===1?[]:[{id:'license'}]})} as any;
 assert.equal(await hasSportsAccess(included,student),true);
 assert.equal(await hasSportsAccess(ownExpired,{...student,platform_admin:true}),true);
});

test('student writes execution without changing prescription or another athlete',async()=>{
 const {saveStudentData}=await import('./studentSave');const db=new PGlite();
 try{await db.exec(`CREATE SCHEMA lb_accounts;CREATE TABLE lb_accounts.athlete_scopes(athlete_id text,organization_id text);CREATE TABLE lb_accounts.athlete_archives(athlete_id text);
 CREATE TABLE wellness(id text PRIMARY KEY,athlete_id text,date text,fatigue integer,sleep integer,stress integer,soreness integer,mood integer);
 CREATE TABLE external_sessions(id text PRIMARY KEY,athlete_id text,date text);
 CREATE TABLE workouts(id text PRIMARY KEY,athlete_id text,name text,status text,rpe real,duration_minutes real,total_load real,feedback text);
 CREATE TABLE prescribed_exercises(id text PRIMARY KEY,workout_id text,name text,weight real);
 CREATE TABLE performed_sets(id text PRIMARY KEY,exercise_id text,reps integer,weight real,rpe real,is_completed boolean);
 INSERT INTO lb_accounts.athlete_scopes VALUES('a','org1'),('b','org2');
 INSERT INTO workouts(id,athlete_id,name,status) VALUES('w','a','Treino do treinador','planned'),('foreign-w','b','Outro','planned');
 INSERT INTO prescribed_exercises VALUES('e','w','Agachamento',50),('foreign-e','foreign-w','Outro',80);
 INSERT INTO performed_sets VALUES('foreign-set','foreign-e',8,80,8,true);`);
 const adapter={query:(q:string,p:any[])=>db.query(q,p),connect:async()=>({query:(q:string,p?:any[])=>db.query(q,p),release:()=>{}})} as any;
 const student={user_id:'student',organization_id:'org1',role:'athlete',athlete_id:'a'};
 await saveStudentData(adapter,student,[{id:'a',name:'Malicious',wellness:[{id:'today',date:'2026-10-03',fatigue:3,sleep:8,stress:2,soreness:2,mood:4}],workouts:[{id:'w',name:'Modified',status:'completed',exercises:[{id:'e',weight:1,performedSets:[{id:'set',reps:8,weight:50,rpe:7,isCompleted:true}]}]}]}]);
 assert.equal((await db.query("SELECT name FROM workouts WHERE id='w'")).rows[0].name,'Treino do treinador');
 assert.equal((await db.query("SELECT weight FROM prescribed_exercises WHERE id='e'")).rows[0].weight,50);
 assert.equal((await db.query("SELECT is_completed FROM performed_sets WHERE id='set'")).rows[0].is_completed,true);
 await assert.rejects(()=>saveStudentData(adapter,student,[{id:'b'}]));
 await assert.rejects(()=>saveStudentData(adapter,student,[{id:'a',workouts:[{id:'w',exercises:[{id:'e',performedSets:[{id:'foreign-set',reps:99}]}]}]}]));
 assert.equal((await db.query("SELECT reps FROM performed_sets WHERE id='foreign-set'")).rows[0].reps,8);
 }finally{await db.close();}
});

test('administrator setup requires configured secret and cannot reset an existing administrator',async()=>{
 const {setupAdministrator}=await import('./adminSetup');const {tokenHash}=await import('./accounts');const db=new PGlite();
 try{await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE TABLE users(id text PRIMARY KEY,role text,password text);CREATE TABLE athletes(id text PRIMARY KEY);INSERT INTO users VALUES('owner','coach','old');INSERT INTO athletes VALUES('a');`);
 await db.exec(await readFile(new URL('accounts-schema.sql',import.meta.url),'utf8'));
 const adapter={query:(q:string,p:any[])=>db.query(q,p),connect:async()=>({query:(q:string,p?:any[])=>db.query(q,p),release:()=>{}})} as any;
 const token='c'.repeat(64);process.env.ADMIN_SETUP_TOKEN_HASH=tokenHash(token);process.env.ADMIN_SETUP_USER_ID='owner';
 await assert.rejects(()=>setupAdministrator(adapter,'d'.repeat(64),'new-password-12345'));
 await setupAdministrator(adapter,token,'new-password-12345');
 assert.equal((await db.query('SELECT platform_admin FROM lb_accounts.memberships')).rows[0].platform_admin,true);
 assert.equal((await db.query('SELECT * FROM lb_accounts.athlete_scopes')).rows.length,1);
 const before=(await db.query("SELECT password FROM users WHERE id='owner'")).rows[0].password;
 await assert.rejects(()=>setupAdministrator(adapter,token,'another-password-12345'));
 assert.equal((await db.query("SELECT password FROM users WHERE id='owner'")).rows[0].password,before);
 }finally{delete process.env.ADMIN_SETUP_TOKEN_HASH;delete process.env.ADMIN_SETUP_USER_ID;await db.close();}
});


test('first administrator can be created without replacing the regression coach',async()=>{
 const {setupAdministrator}=await import('./adminSetup');const {tokenHash}=await import('./accounts');const db=new PGlite();
 try{await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE TABLE users(id text PRIMARY KEY,username text UNIQUE,role text,password text,plan text);CREATE TABLE athletes(id text PRIMARY KEY);INSERT INTO users VALUES('regression','LB_STAGING_COACH','coach','unchanged','free');`);
 await db.exec(await readFile(new URL('accounts-schema.sql',import.meta.url),'utf8'));
 const adapter={query:(q:string,p:any[])=>db.query(q,p),connect:async()=>({query:(q:string,p?:any[])=>db.query(q,p),release:()=>{}})} as any;
 const token='e'.repeat(64);process.env.ADMIN_SETUP_TOKEN_HASH=tokenHash(token);process.env.ADMIN_SETUP_ALLOW_CREATE='true';process.env.ADMIN_SETUP_USERNAME='Leandro';delete process.env.ADMIN_SETUP_USER_ID;
 await setupAdministrator(adapter,token,'new-safe-password-123');
 assert.equal((await db.query("SELECT password FROM users WHERE id='regression'")).rows[0].password,'unchanged');
 assert.equal((await db.query("SELECT u.username FROM users u JOIN lb_accounts.memberships m ON m.user_id=u.id WHERE m.platform_admin")).rows[0].username,'Leandro');
 }finally{for(const key of ['ADMIN_SETUP_TOKEN_HASH','ADMIN_SETUP_ALLOW_CREATE','ADMIN_SETUP_USERNAME'])delete process.env[key];await db.close();}
});

test('supervisor HTTP reads require a live explicit link and never grant coach access or writes',async()=>{
 const express=(await import('express')).default;const jwt=(await import('jsonwebtoken')).default;
 const {accountRouter}=await import('./accounts');const {supervisorTables}=await import('./supervisor');
 const db=new PGlite();
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;
 CREATE TABLE users(id text PRIMARY KEY,username text,password text,role text,athlete_id text,plan text);
 CREATE TABLE athletes(id text PRIMARY KEY,name text,modality text);
 INSERT INTO users VALUES('admin','Owner','','coach',NULL,'pro'),('coach','Trainer','','coach',NULL,'pro');
 INSERT INTO athletes VALUES('own','Own','Run'),('other','Other','Tennis');`);
 for(const f of ['accounts-schema.sql','supervisor-schema.sql'])await db.exec(await readFile(new URL(f,import.meta.url),'utf8'));
 for(const table of Object.values(supervisorTables))await db.exec(`CREATE TABLE ${table}(id text PRIMARY KEY,athlete_id text,date text);INSERT INTO ${table} VALUES('${table}-own','own','2026-10-01'),('${table}-other','other','2026-10-02');`);
 await db.exec(`CREATE TABLE prescribed_exercises(id text,workout_id text,name text);CREATE TABLE performed_sets(id text,exercise_id text,load real);
 INSERT INTO prescribed_exercises VALUES('exercise','workouts-other','Squat');INSERT INTO performed_sets VALUES('set','exercise',50);`);
 const o1='11111111-1111-4111-8111-111111111111',o2='22222222-2222-4222-8222-222222222222';
 await db.query('INSERT INTO lb_accounts.organizations(id,name) VALUES($1,$2),($3,$4)',[o1,'Owner',o2,'Trainer']);
 await db.query('INSERT INTO lb_accounts.memberships(user_id,organization_id,platform_admin) VALUES($1,$2,true),($3,$4,false)',['admin',o1,'coach',o2]);
 await db.query('INSERT INTO lb_accounts.athlete_scopes VALUES($1,$2),($3,$4)',['own',o1,'other',o2]);
 const adapter={query:(q:string,p?:any[])=>db.query(q,p),connect:async()=>({query:(q:string,p?:any[])=>db.query(q,p),release:()=>{}})} as any;
 process.env.ACCOUNTS_ENABLED='true';process.env.JWT_SECRET='test-secret';
 const app=express();app.use(express.json());app.use('/accounts',accountRouter(adapter,'test-secret'));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${(server.address() as any).port}/accounts/supervisor`;
 const request=(path:string,user='admin',method='GET',body?:any)=>fetch(base+path,{method,headers:{Authorization:`Bearer ${jwt.sign({id:user,accountMode:'scoped',sessionVersion:1},'test-secret')}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 try{
 const previousBilling=process.env.BILLING_ENABLED;process.env.BILLING_ENABLED='false';
 const path=`/organizations/${o2}`;
 assert.equal((await request('/organizations','coach')).status,403);
 assert.equal((await request(path+'/athletes')).status,403);
 assert.equal((await request(path+'/link','coach','PUT',{enabled:true})).status,403);
 assert.equal((await request(path+'/link','admin','PUT',{enabled:true})).status,200);
 const view=await request(path+'/view','admin','POST',{coachId:'coach'});assert.equal(view.status,200);
 const viewUser=await view.json();assert.equal(viewUser.plan,'free');assert.equal(viewUser.platformAdmin,false);assert.equal(viewUser.supervision,true);
 const claims=jwt.verify(viewUser.token,'test-secret') as any;assert.equal(claims.id,'admin');assert.equal(claims.supervisedUserId,'coach');assert.equal(claims.exp-claims.iat,900);
 const {resolveSupervisedAccount}=await import('./supervisor');
 const context=await resolveSupervisedAccount(adapter,claims,'GET','/ler');assert.equal(context.user_id,'coach');assert.equal(context.organization_id,o2);assert.equal(context.platform_admin,false);
 for(const [method,path] of [['POST','/salvar'],['DELETE','/atletas/other'],['POST','/ai-chat'],['GET','/billing/overview'],['GET','/accounts/me']])await assert.rejects(()=>resolveSupervisedAccount(adapter,claims,method,path),/READ_ONLY/);
 assert.equal((await fetch(base.replace('/supervisor','')+'/me',{headers:{Authorization:`Bearer ${viewUser.token}`}})).status,403);
 assert.equal((await request(path+'/view','admin','POST',{coachId:'admin'})).status,404);
 await db.query("UPDATE lb_accounts.memberships SET active=false WHERE user_id='coach'");await assert.rejects(()=>resolveSupervisedAccount(adapter,claims,'GET','/ler'),/DENIED/);await db.query("UPDATE lb_accounts.memberships SET active=true WHERE user_id='coach'");
 await assert.rejects(()=>resolveSupervisedAccount(adapter,{...claims,targetSessionVersion:0},'GET','/ler'),/DENIED/);
 await assert.rejects(()=>resolveSupervisedAccount(adapter,{...claims,sessionVersion:0},'GET','/ler'),/DENIED/);

 const list=await request(path+'/athletes');assert.equal(list.status,200);assert.deepEqual((await list.json()).map((a:any)=>a.id),['other']);
 assert.equal((await request(path+'/athletes/own')).status,404);
 for(const kind of Object.keys(supervisorTables)){
  const r=await request(path+`/athletes/other?kind=${kind}`);assert.equal(r.status,200,kind);const data=await r.json();assert.equal(data.records.length,1);assert.equal(data.records[0].athlete_id,'other');
  if(kind==='workouts')assert.equal(data.records[0].exercises[0].performed_sets[0].load,50);
 }
 assert.equal((await request(path+'/athletes/other?kind=users')).status,400);
 assert.equal((await request(path+'/athletes/other?page=-1')).status,400);
 assert.equal((await request(path+'/athletes/other','admin','PATCH',{name:'Changed'})).status,404);
 assert.equal((await request(path+'/link','admin','PUT',{enabled:false})).status,200);
 assert.equal((await request(path+'/athletes/other')).status,403);
 await assert.rejects(()=>resolveSupervisedAccount(adapter,claims,'GET','/ler'),/DENIED/);
 assert.equal((await request(path+'/view','admin','POST',{coachId:'coach'})).status,403);
 process.env.BILLING_ENABLED=previousBilling;
 assert.equal((await db.query('SELECT * FROM lb_accounts.supervisor_audit')).rows.length,2);
 assert.equal((await db.query("SELECT name FROM athletes WHERE id='other'")).rows[0].name,'Other');
 await db.exec('SET ROLE anon');await assert.rejects(()=>db.query('SELECT * FROM lb_accounts.supervisor_links'));await db.exec('RESET ROLE');
 }finally{await new Promise<void>(r=>server.close(()=>r()));await db.close();}
});
