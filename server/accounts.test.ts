import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { accountRouter, validPassword, tokenHash } from './accounts';
import jwt from 'jsonwebtoken';
test('password validates UTF8 bytes and minimum length of 8',()=>{
 assert.equal(validPassword('short'),false);assert.equal(validPassword('a'.repeat(7)),false);assert.equal(validPassword('a'.repeat(8)),true);
 assert.equal(validPassword('a'.repeat(73)),false);assert.equal(validPassword('😀'.repeat(19)),false);
});
test('invite storage uses deterministic SHA256 hash',()=>{assert.equal(tokenHash('a').length,64);assert.notEqual(tokenHash('a'),tokenHash('b'));});
async function fixture(fn:(url:string)=>Promise<void>){
 const app=express();app.use(express.json());app.use('/accounts',accountRouter({query:async()=>({rows:[]})} as any,'test-secret'));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 try{await fn(`http://127.0.0.1:${(server.address() as any).port}/accounts`);}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
test('disabled account module denies requests',async()=>{process.env.ACCOUNTS_ENABLED='false';await fixture(async url=>assert.equal((await fetch(url+'/me')).status,503));});
test('legacy tokens cannot access account administration',async()=>{process.env.ACCOUNTS_ENABLED='true';process.env.JWT_SECRET='test-secret';const token=jwt.sign({id:'coach',role:'coach'},'test-secret');await fixture(async url=>assert.equal((await fetch(url+'/me',{headers:{Authorization:`Bearer ${token}`}})).status,401));});
test('weak passwords rejected before invite lookup',async()=>{await fixture(async url=>assert.equal((await fetch(url+'/accept',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:'a'.repeat(64),password:'short'})})).status,400));});

test('student save discards a connection when the transaction and rollback fail',async()=>{
 const {saveStudentData}=await import('./studentSave');let discarded=false;
 const db={connect:async()=>({query:async()=>{throw Error('Query read timeout');},release:(destroy:boolean)=>{discarded=destroy;}})} as any;
 await assert.rejects(()=>saveStudentData(db,{user_id:'student',role:'athlete',athlete_id:'a',organization_id:'org'},[{id:'a'}]),/Query read timeout/);
 assert.equal(discarded,true);
});
