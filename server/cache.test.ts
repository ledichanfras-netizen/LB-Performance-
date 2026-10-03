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
