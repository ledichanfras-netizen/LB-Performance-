import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { billingRouter } from './billing';

async function fixture(user: any, query: any, fn: (url: string) => Promise<void>) {
 const app=express();app.use(express.json());
 app.use('/billing',billingRouter({query} as any, (req:any,_res,next)=>{req.user=user;next();}));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 try{await fn(`http://127.0.0.1:${(server.address() as any).port}/billing`);}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
test('disabled module never accesses database',async()=>{
 process.env.BILLING_ENABLED='false';
 await fixture({id:'admin'},()=>{throw Error('unexpected');},async url=>assert.equal((await fetch(url+'/overview')).status,503));
});
test('legacy username-only token cannot administer billing',async()=>{
 process.env.BILLING_ENABLED='true';
 await fixture({username:'Leandro',role:'coach'},()=>{throw Error('unexpected');},async url=>assert.equal((await fetch(url+'/overview')).status,403));
});
test('athlete cannot create plans even when listed in admin configuration',async()=>{
 process.env.BILLING_ADMIN_USER_IDS='athlete-1';
 await fixture({id:'athlete-1'},async()=>({rows:[{id:'athlete-1',role:'athlete'}]}),async url=>assert.equal((await fetch(url+'/plans',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403));
});
test('administrator cannot grant courtesy as revenue',async()=>{
 process.env.BILLING_ADMIN_USER_IDS='admin';
 await fixture({id:'admin'},async()=>({rows:[{id:'admin',role:'coach'}]}),async url=>assert.equal((await fetch(url+'/subscriptions/example/renew',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:'1234567890123456',amountCents:100,method:'courtesy',reason:'Teste'})})).status,400));
});

test('scoped financial permission comes from persisted membership',async()=>{
 process.env.BILLING_ENABLED='true';process.env.BILLING_ADMIN_USER_IDS='coach-new';
 await fixture({id:'coach-new',accountMode:'scoped'},async(q:string)=>({rows:q.includes('platform_admin')?[{platform_admin:false}]:[{id:'coach-new',role:'coach'}]}),async url=>assert.equal((await fetch(url+'/plans',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403));
});
