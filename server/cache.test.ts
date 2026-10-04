import test from 'node:test';
import assert from 'node:assert/strict';
import { athleteCacheKey,clearAthleteCaches } from '../src/utils/accountCache';
const token=(id:string,org:string)=>`header.${Buffer.from(JSON.stringify({id,organizationId:org})).toString('base64url')}.signature`;
test('cache differs by account and organization',()=>{
 assert.notEqual(athleteCacheKey(token('a','1')),athleteCacheKey(token('b','1')));
 assert.notEqual(athleteCacheKey(token('a','1')),athleteCacheKey(token('a','2')));
 assert.notEqual(athleteCacheKey(),athleteCacheKey(token('a','1')));
});
test('logout clears legacy and scoped caches without deleting preferences',()=>{
 const items=new Map([['lb_athletes_cache','x'],['lb_athletes_cache:1:a','x'],['lb_theme','green']]);
 clearAthleteCaches({get length(){return items.size;},key:(i:number)=>Array.from(items.keys())[i] || null,removeItem:(k:string)=>{items.delete(k);}});
 assert.deepEqual(Array.from(items.keys()),['lb_theme']);
});

test('temporary supervision does not replace the administrator login',async()=>{
 const {isSupervisedToken}=await import('../src/utils/accountCache');
 const {setSupervisionToken,getEffectiveSessionToken}=await import('../src/utils/supervisionSession');
 const owner='owner-token';const view='header.'+btoa(JSON.stringify({id:'owner',organizationId:'other',supervisedUserId:'coach',supervision:true}))+'.signature';
 const original=(globalThis as any).localStorage;
 (globalThis as any).localStorage={getItem:(key:string)=>key==='lb_user'?JSON.stringify({token:owner}):null};
 try{
  assert.equal(getEffectiveSessionToken(),owner);setSupervisionToken(view);assert.equal(getEffectiveSessionToken(),view);
  assert.equal(JSON.parse(localStorage.getItem('lb_user')!).token,owner);assert.equal(isSupervisedToken(view),true);assert.equal(isSupervisedToken(owner),false);
  assert.match(athleteCacheKey(view),/^lb_athletes_cache:supervision:/);
  setSupervisionToken(null);assert.equal(getEffectiveSessionToken(),owner);
 }finally{setSupervisionToken(null);(globalThis as any).localStorage=original;}
});
