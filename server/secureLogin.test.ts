import test from 'node:test';import assert from 'node:assert/strict';
import express from 'express';import jwt from 'jsonwebtoken';import bcrypt from 'bcryptjs';import {PGlite} from '@electric-sql/pglite';
import {secureLogin} from './secureLogin';import {liveMembership} from './liveMembership';
const secret='local-test-only-secret-for-roles';
test('both login paths reject unbound and disabled coach accounts; athlete and legitimate coach keep their own roles',async()=>{
 const db=new PGlite();let server:any;
 try{
 await db.exec(`CREATE SCHEMA lb_accounts;CREATE TABLE lb_accounts.rate_limits(key text PRIMARY KEY,bucket bigint,attempts integer);
 CREATE TABLE users(id text PRIMARY KEY,username text,password text,role text,athlete_id text);
 CREATE TABLE lb_accounts.memberships(user_id text,organization_id text,active boolean,platform_admin boolean,session_version integer,ai_enabled boolean);
 CREATE TABLE lb_accounts.athlete_scopes(athlete_id text,organization_id text);CREATE TABLE lb_accounts.athlete_archives(athlete_id text);`);
 const password=await bcrypt.hash('test-password-123',4);
 for(const u of [['old-student','Alexandre','coach',null],['student','alexandre.magno','athlete','a'],['coach','Leandro','coach',null],['duplicate','leandro','coach',null],['blocked','bloqueado','athlete','a']])await db.query('INSERT INTO users VALUES($1,$2,$3,$4,$5)',[u[0],u[1],password,u[2],u[3]]);
 await db.exec(`INSERT INTO lb_accounts.memberships VALUES('student','org',true,false,1,false),('coach','org',true,true,1,false),('blocked','org',false,false,2,false);INSERT INTO lb_accounts.athlete_scopes VALUES('a','org');`);
 const pool={query:(sql:string,params?:any[])=>db.query(sql,params)} as any;
 const app=express();app.use(express.json());for(const path of ['/api/auth/login','/api/accounts/login'])app.post(path,secureLogin(pool,secret));
 server=await new Promise<any>(r=>{const s=app.listen(0,'127.0.0.1',()=>r(s));});
 const login=async(path:string,username:string)=>{const r=await fetch(`http://127.0.0.1:${server.address().port}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password:'test-password-123'})});return {status:r.status,body:await r.json()};};
 for(const path of ['/api/auth/login','/api/accounts/login']){
  assert.equal((await login(path,'Alexandre')).status,401);assert.equal((await login(path,'bloqueado')).status,401);
  const student=await login(path,'alexandre.magno');assert.equal(student.status,200);assert.equal(student.body.role,'athlete');assert.equal(student.body.athleteId,'a');assert.equal(student.body.platformAdmin,false);
  const coach=await login(path,'LEANDRO');assert.equal(coach.status,200);assert.equal(coach.body.id,'coach');assert.equal(coach.body.role,'coach');
  const claims=jwt.verify(student.body.token,secret) as any;
  await assert.rejects(()=>liveMembership(pool,{id:'coach',accountMode:'scoped',sessionVersion:1,organizationId:'old-default-organization'}),/INVALID_SESSION/);
  assert.equal((await liveMembership(pool,{...claims,role:'coach',platformAdmin:true})).role,'athlete');
  await db.query('UPDATE lb_accounts.memberships SET active=false,session_version=session_version+1 WHERE user_id=$1',['student']);
  await assert.rejects(()=>liveMembership(pool,claims),/INVALID_SESSION/);
  await db.query('UPDATE lb_accounts.memberships SET active=true WHERE user_id=$1',['student']);
 }
 await assert.rejects(()=>liveMembership(pool,{id:'old-student',sessionVersion:1}),/INVALID_SESSION/);
 // An inactive account may resume only after a valid invite explicitly reactivates its membership.
 await db.exec("UPDATE lb_accounts.memberships SET active=true,session_version=session_version+1 WHERE user_id='blocked'");
 assert.equal((await login('/api/auth/login','bloqueado')).body.role,'athlete');
 }finally{if(server)await new Promise<void>(r=>server.close(()=>r()));await db.close();}
});
test('login fails closed on database errors instead of trying cached or hardcoded trainer credentials',async()=>{
 const app=express();app.use(express.json());app.post('/login',secureLogin({query:async()=>{throw Error('offline');}} as any,secret));
 const s=await new Promise<any>(r=>{const v=app.listen(0,'127.0.0.1',()=>r(v));});
 try{const result=await fetch(`http://127.0.0.1:${s.address().port}/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'coach',password:'admin'})});assert.equal(result.status,503);}finally{await new Promise<void>(r=>s.close(()=>r()));}
});
