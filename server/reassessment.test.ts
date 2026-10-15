import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildReassessment,reassessmentMessage,timelineDays} from '../src/utils/reassessment';
import ReassessmentNotice from '../src/components/ReassessmentNotice';
import {saveReassessmentPlan} from './reassessment';
const athlete=(patch:any={}):any=>({id:'a',name:'Atleta de teste',gender:'M',modality:'Tênis',assessments:{imtp:[{id:'old',date:'2026-09-01',relativePeakForce:1.6},{id:'latest',date:'2026-10-01',relativePeakForce:1.6}],cmj:[],isometricStrength:[],dropJump:[],speed:[],vo2max:[]},workouts:[],wellness:[],...patch});

test('matrix countdown uses the most recent measured test and the start of the existing time window',()=>{
 const a=athlete();const result=buildReassessment(a,'2026-10-15');
 assert.equal(result.dueDate,'2026-10-22');
 assert.equal(result.items[0].lastDate,'2026-10-01');
 assert.equal(result.items[0].timeline,'3 a 4 semanas');
 assert.equal(reassessmentMessage(result.dueDate,'2026-10-15',true),'Reavaliar em 7 dias');
 assert.equal(reassessmentMessage(result.dueDate,'2026-10-22',true),'Reavaliação prevista para hoje');
 assert.equal(reassessmentMessage(result.dueDate,'2026-10-27',true),'Reavaliação pendente há 5 dias');
 assert.equal(timelineDays('48 a 72 horas'),2);assert.equal(timelineDays('4 semanas'),28);assert.equal(timelineDays('a definir'),null);
 a.assessments.imtp.reverse();assert.equal(buildReassessment(a,'2026-10-15').dueDate,result.dueDate);
 const newestFirst=athlete();newestFirst.assessments.imtp=[{id:'new',date:'2026-10-14',relativePeakForce:2},{id:'old',date:'2026-09-01',relativePeakForce:1}];
 assert.equal(buildReassessment(newestFirst,'2026-10-15').dueDate,'2026-11-11');
 assert.equal(newestFirst.assessments.imtp[0].id,'new');
});
test('missing, zero and future assessments never create a deadline or a performance classification',()=>{
 const a=athlete({assessments:{imtp:[{id:'empty',date:'2026-10-01',peakForce:0},{id:'future',date:'2027-01-01',peakForce:100}]}});
 const result=buildReassessment(a,'2026-10-15');assert.equal(result.dueDate,null);assert.equal(result.items.length,0);
 assert.equal(reassessmentMessage(null,'2026-10-15',false),'Avaliação inicial pendente');
 const noRule=buildReassessment(athlete(),'2026-10-15',[]);assert.equal(noRule.dueDate,null);assert.equal(noRule.items[0].dueDate,null);
 assert.equal(reassessmentMessage(null,'2026-10-15',true),'Prazo a definir pelo treinador');
 const html=renderToStaticMarkup(React.createElement(ReassessmentNotice,{athlete:a,today:'2026-10-15',onSave:async()=>{},onAssess:()=>{}}));
 assert.match(html,/Avaliação inicial pendente/);assert.doesNotMatch(html,/Crítica|Déficit|Reavaliar em 0/);
});
test('manual schedules update per test, preserve pending tests and resume matrix suggestions after completion',()=>{
 const a=athlete({reassessmentPlan:{dueDate:'2026-10-25',createdOn:'2026-10-15',tests:['imtp','cmj'],baseline:{imtp:{id:'latest',date:'2026-10-01'}}}});
 assert.equal(buildReassessment(a,'2026-10-15').manual,true);
 a.assessments.imtp.push({id:'new-test',date:'2026-10-15',relativePeakForce:1.8});
 const partial=buildReassessment(a,'2026-10-15');assert.deepEqual(partial.items.map(i=>i.type),['cmj']);assert.deepEqual(partial.completed,['imtp']);
 a.assessments.cmj.push({id:'new-cmj',date:'2026-10-15',height:35});
 const complete=buildReassessment(a,'2026-10-15');assert.equal(complete.manual,false);assert.ok(complete.dueDate!>'2026-10-15');
});
test('agendamento is scoped to the coach, survives reload and unrelated saves, and can return to matrix defaults',async()=>{
 const db=new PGlite();
 try {
  await db.exec(`CREATE SCHEMA lb_accounts;CREATE TABLE lb_accounts.athlete_scopes(athlete_id text,organization_id text);CREATE TABLE lb_accounts.athlete_archives(athlete_id text);CREATE TABLE athletes(id text PRIMARY KEY,name text,injury_history text,updated_at timestamptz default now());CREATE TABLE imtp(id text PRIMARY KEY,athlete_id text,date varchar);CREATE TABLE cmj(id text PRIMARY KEY,athlete_id text,date date);INSERT INTO athletes(id,name) VALUES('a','Nome'),('b','Outro');INSERT INTO lb_accounts.athlete_scopes VALUES('a','org'),('b','foreign');INSERT INTO imtp VALUES('latest','a','2026-10-01');`);
  const schema=await readFile(new URL('./reassessment-schema.sql',import.meta.url),'utf8');await db.exec(schema);await db.exec(schema);
  const pool={connect:async()=>({query:(sql:string,args:any[])=>db.query(sql,args),release(){}})};
  const coach={role:'coach',organization_id:'org'};
  const {plan}=await saveReassessmentPlan(pool,coach,'a',{dueDate:'2026-10-25',tests:['imtp','cmj']},new Date('2026-10-15T13:00:00Z'));
  assert.equal(plan.createdOn,'2026-10-15');assert.deepEqual(plan.baseline.imtp,{id:'latest',date:'2026-10-01'});
  await db.query("UPDATE athletes SET name='Novo nome' WHERE id='a'");
  const saved=(await db.query("SELECT reassessment_plan FROM athletes WHERE id='a'")).rows[0].reassessment_plan;
  assert.deepEqual(saved,plan);
  assert.equal(buildReassessment(athlete({reassessmentPlan:saved}),'2026-10-15').dueDate,'2026-10-25');
  await assert.rejects(()=>saveReassessmentPlan(pool,coach,'b',{dueDate:'2026-10-25',tests:['imtp']}));
  await assert.rejects(()=>saveReassessmentPlan(pool,{...coach,role:'athlete'},'a',{dueDate:'2026-10-25',tests:['imtp']}));
  for(const invalid of [{dueDate:'2026-02-31',tests:['imtp']},{dueDate:'2026-10-25',tests:[]},{dueDate:'2026-10-25',tests:['injection']}])await assert.rejects(()=>saveReassessmentPlan(pool,coach,'a',invalid));
  assert.equal((await db.query("SELECT reassessment_plan FROM athletes WHERE id='b'")).rows[0].reassessment_plan,null);
  await saveReassessmentPlan(pool,coach,'a',null);assert.equal((await db.query("SELECT reassessment_plan FROM athletes WHERE id='a'")).rows[0].reassessment_plan,null);
 } finally {await db.close();}
});

 test('matrix criteria and notice both select the latest assessment from newest-first API history',async()=>{
 const {generateAthleteDecisionMatrix}=await import('../src/utils/decisionMatrixEngine');
 const a=athlete();a.assessments.imtp=[{id:'new',date:'2026-10-14',relativePeakForce:2},{id:'old',date:'2026-09-01',relativePeakForce:1}];
 const report=generateAthleteDecisionMatrix(a);
 assert.ok(report.activeRows.some(r=>r.id==='dyn-imtp-estavel'));
 assert.equal(report.activeRows.some(r=>r.id==='dyn-imtp-base'),false);
 assert.equal(buildReassessment(a,'2026-10-15').items[0].timeline,'4 a 6 semanas');
 });

test('partial measurements never use missing mass or a missing limb as zero to assign a deadline',()=>{
 for(const assessments of [{imtp:[{id:'partial',date:'2026-10-01',peakForce:100}]},{isometricStrength:[{id:'partial',date:'2026-10-01',quadricepsR:90}]},{vo2max:[{id:'partial',date:'2026-10-01',vam:15}]}]){
  const result=buildReassessment(athlete({assessments}),'2026-10-15');assert.equal(result.dueDate,null);assert.ok(result.items.every(i=>i.dueDate===null));
 }
});
