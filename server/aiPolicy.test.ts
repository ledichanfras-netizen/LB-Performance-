import test from 'node:test';
import assert from 'node:assert/strict';
import {hasAIAccess,requireAIAccess} from './aiPolicy';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AiAccessProvider,AiOnly} from '../src/components/AiAccess';
test('AI is denied by default and independent from paid plan or JWT claims',()=>{
 for(const account of [null,{role:'coach',plan:'pro'},{role:'coach',ai_enabled:false},{role:'athlete',ai_enabled:true},{role:'coach',platform_admin:true,active:false}])assert.equal(hasAIAccess(account),false);
 assert.equal(hasAIAccess({role:'coach',platform_admin:true,active:true}),true);
 assert.equal(hasAIAccess({role:'coach',ai_enabled:true,active:true}),true);
 let called=false,status=0,body:any;
 requireAIAccess({account:{role:'coach',ai_enabled:false},user:{aiEnabled:true,platformAdmin:true}}, {status:(code:number)=>{status=code;return {json:(value:any)=>body=value};}},()=>called=true);
 assert.equal(called,false);assert.equal(status,403);assert.equal(body.code,'AI_NOT_ALLOWED');
});
test('AI controls disappear while manual navigation stays visible for mentors and students',()=>{
 const render=(user:any)=>renderToStaticMarkup(createElement(AiAccessProvider,{user,children:[createElement('button',{key:'manual'},'Avaliações e prescrição manual'),createElement(AiOnly,{key:'ai',children:createElement('button',null,'Chat IA')})]}));
 for(const user of [{role:'coach',plan:'pro',aiEnabled:false},{role:'coach',plan:'pro'},{role:'athlete',aiEnabled:true},null]){
  const html=render(user);assert.match(html,/prescrição manual/);assert.doesNotMatch(html,/Chat IA/);
 }
 assert.match(render({role:'coach',platformAdmin:true}),/Chat IA/);
});

test('live membership rejects revoked sessions and cannot fall back to JWT administration on database failure',async()=>{
 const {liveMembership}=await import('./liveMembership');
 const claims={id:'coach',sessionVersion:1,platformAdmin:true,aiEnabled:true};
 await assert.rejects(()=>liveMembership({query:async()=>{throw Error('DB offline');}} as any,claims),/DB offline/);
 await assert.rejects(()=>liveMembership({query:async()=>({rows:[]})} as any,claims),/INVALID_SESSION/);
 await assert.rejects(()=>liveMembership({query:async()=>({rows:[{session_version:2}]})} as any,claims),/INVALID_SESSION/);
 const account=await liveMembership({query:async()=>({rows:[{user_id:'coach',session_version:1,role:'coach',platform_admin:false,ai_enabled:false}]})} as any,claims);
 assert.equal(hasAIAccess(account),false);
});
