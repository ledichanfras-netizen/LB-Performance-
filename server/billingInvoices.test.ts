import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {billingInvoices} from './billingInvoices';
const sub='11111111-1111-4111-8111-111111111111';
async function fixture(fn:(url:string,db:PGlite)=>Promise<void>,isAdmin=true){
 const db=new PGlite();await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA lb_billing;
 CREATE TABLE users(id text PRIMARY KEY,username text,role text);INSERT INTO users VALUES('admin','Leandro','coach'),('other','Outro','athlete');
 CREATE TABLE lb_billing.plans(id text PRIMARY KEY,name text,price_cents integer,duration_days integer,audience text,grace_days integer);INSERT INTO lb_billing.plans(id,name,price_cents,duration_days) VALUES('p','Mensal',10000,30);
 CREATE TABLE lb_billing.subscriptions(id uuid PRIMARY KEY,user_id text,plan_id text,valid_until timestamptz,suspended boolean,renewal_cancelled boolean);
 INSERT INTO lb_billing.subscriptions VALUES('${sub}','admin','p',NULL,false,false);
 CREATE TABLE lb_billing.entries(id uuid PRIMARY KEY,request_id text UNIQUE,subscription_id uuid,kind text,amount_cents integer,method text,reason text,recorded_by text,valid_until timestamptz,effective_on date,voided_at timestamptz);
 CREATE TABLE lb_billing.audit_events(id uuid,subscription_id uuid,action text,reason text,actor_id text);`);
 await db.exec(await readFile(new URL('./billing-invoices-schema.sql',import.meta.url),'utf8'));
 const pool:any={query:(q:string,p:any[])=>db.query(q,p),connect:async()=>({query:(q:string,p:any[])=>db.query(q,p),release(){}})};
 const app=express();app.use(express.json());app.use((req:any,_res,next)=>{req.user={id:isAdmin?'admin':'other'};req.billingAdmin=isAdmin;next();});app.use(billingInvoices(pool,(req:any,res,next)=>req.billingAdmin?next():void res.sendStatus(403)));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));try{await fn(`http://127.0.0.1:${(server.address() as any).port}`,db);}finally{await new Promise<void>(r=>server.close(()=>r()));await db.close();}
}
const post=async(url:string,body:any={})=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
test('issuing preserves pending amounts, creates no revenue or release; receiving is atomic and retry-safe',async()=>fixture(async(url,db)=>{
 const first=await post(`${url}/${sub}/issue`);assert.equal(first.status,201);const invoice=await first.json();
 assert.equal((await db.query('SELECT count(*)::int n FROM lb_billing.entries')).rows[0].n,0);
 assert.equal((await db.query('SELECT valid_until FROM lb_billing.subscriptions')).rows[0].valid_until,null);
 await db.exec('UPDATE lb_billing.plans SET price_cents=20000');
 const again=await (await post(`${url}/${sub}/issue`)).json();assert.equal(again.id,invoice.id);assert.equal(again.amount_cents,10000);
 const paidOn=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 assert.equal((await post(`${url}/${invoice.id}/receive`,{paidOn,method:'pix',note:'',confirmed:false})).status,400);
 const payment={paidOn,method:'pix',note:'',confirmed:true};assert.equal((await post(`${url}/${invoice.id}/receive`,payment)).status,200);assert.equal((await (await post(`${url}/${invoice.id}/receive`,payment)).json()).duplicate,true);
 assert.equal((await db.query('SELECT count(*)::int n FROM lb_billing.entries')).rows[0].n,1);
 assert.equal((await db.query('SELECT status FROM lb_billing.invoices')).rows[0].status,'paid');
 const summary=await (await fetch(url+'/summary')).json();assert.equal(Number(summary.received),10000);assert.equal(Number(summary.pending),0);
 const next=await (await post(`${url}/${sub}/issue`)).json();assert.equal(next.amount_cents,20000);assert.ok(next.period_start>invoice.period_end);
 assert.equal((await post(`${url}/${next.id}/cancel`,{note:'Ajuste do próximo período'})).status,200);
 assert.equal((await db.query('SELECT count(*)::int n FROM lb_billing.entries')).rows[0].n,1);
 const custom=await (await post(`${url}/${sub}/issue`,{amountCents:15000,durationDays:60})).json();assert.equal(custom.amount_cents,15000);
}));
test('non-admin cannot generate invoices or read another payer history',async()=>fixture(async url=>{
 assert.equal((await post(`${url}/${sub}/issue`)).status,403);assert.deepEqual(await (await fetch(url)).json(),[]);
},false));
test('invalid period and invalid date never record payments',async()=>fixture(async(url,db)=>{
 assert.equal((await post(`${url}/${sub}/issue`,{durationDays:0})).status,400);
 const invoice=await (await post(`${url}/${sub}/issue`)).json();
 assert.equal((await post(`${url}/${invoice.id}/receive`,{paidOn:'2026-02-31',method:'pix',note:'',confirmed:true})).status,400);
 assert.equal((await db.query('SELECT count(*)::int n FROM lb_billing.entries')).rows[0].n,0);
}));

test('one-step enrollment creates account-specific terms without recording revenue and rejects duplicates',async()=>fixture(async(url,db)=>{
 const body={userId:'other',name:'Mensal',amountCents:12000,durationDays:30,graceDays:3};
 assert.equal((await post(url+'/enroll',body)).status,201);
 assert.equal((await post(url+'/enroll',body)).status,409);
 assert.equal((await db.query("SELECT count(*)::int n FROM lb_billing.subscriptions WHERE user_id='other'")).rows[0].n,1);
 assert.equal((await db.query('SELECT count(*)::int n FROM lb_billing.entries')).rows[0].n,0);
 assert.equal((await db.query("SELECT audience FROM lb_billing.plans WHERE price_cents=12000")).rows[0].audience,'athlete');
}));
