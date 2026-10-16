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

test('matrix countdown uses the latest measurement and the 30/60/90 day LB defaults',()=>{
 const a=athlete();const result=buildReassessment(a,'2026-10-15');
 assert.equal(result.dueDate,'2026-10-31');
 assert.equal(result.items[0].lastDate,'2026-10-01');
 assert.equal(result.items[0].timeline,'30 dias');
 assert.equal(reassessmentMessage(result.dueDate,'2026-10-15',true),'Reavaliar em 16 dias');
 assert.equal(reassessmentMessage(result.dueDate,'2026-10-31',true),'Reavaliação prevista para hoje');
 assert.equal(reassessmentMessage(result.dueDate,'2026-11-05',true),'Reavaliação pendente há 5 dias');
 assert.equal(timelineDays('48 a 72 horas'),2);assert.equal(timelineDays('4 semanas'),28);assert.equal(timelineDays('a definir'),null);
 a.assessments.imtp.reverse();assert.equal(buildReassessment(a,'2026-10-15').dueDate,result.dueDate);
 const newestFirst=athlete();newestFirst.assessments.imtp=[{id:'new',date:'2026-10-14',relativePeakForce:2},{id:'old',date:'2026-09-01',relativePeakForce:1}];
 assert.equal(buildReassessment(newestFirst,'2026-10-15').dueDate,'2026-12-13');
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
 assert.equal(buildReassessment(a,'2026-10-15').items[0].timeline,'60 dias');
 });

test('partial measurements never use missing mass or a missing limb as zero to assign a deadline',()=>{
 for(const assessments of [{imtp:[{id:'partial',date:'2026-10-01',peakForce:100}]},{isometricStrength:[{id:'partial',date:'2026-10-01',quadricepsR:90}]},{vo2max:[{id:'partial',date:'2026-10-01',vam:15}]}]){
  const result=buildReassessment(athlete({assessments}),'2026-10-15');assert.equal(result.dueDate,null);assert.ok(result.items.every(i=>i.dueDate===null));
 }
});


test('central counts athletes once, orders deadlines, filters seven days and searches accents',async()=>{
 const {reassessmentCenterData}=await import('../src/utils/reassessment');
 const planned=(id:string,name:string,dueDate:string)=>athlete({id,name,reassessmentPlan:{dueDate,createdOn:'2026-10-01',tests:['imtp'],baseline:{imtp:{id:'latest',date:'2026-10-01'}}}});
 const list=[planned('far','Futuro','2026-11-20'),planned('near','Próximo','2026-10-22'),planned('today','Émanuel','2026-10-15'),planned('over','Atrasado','2026-10-10'),athlete({id:'missing',name:'Inicial',assessments:{}}),planned('model-fake','Modelo','2026-10-15')];
 const data=reassessmentCenterData(list,'2026-10-15');
 assert.deepEqual(data.counts,{all:5,today:1,upcoming:1,overdue:1,undefined:1});
 assert.deepEqual(data.rows.map(r=>r.athlete.id),['over','today','near','far','missing']);
 for(const [filter,id] of [['today','today'],['upcoming','near'],['overdue','over'],['undefined','missing']] as const)assert.deepEqual(reassessmentCenterData(list,'2026-10-15',filter).rows.map(r=>r.athlete.id),[id]);
 assert.deepEqual(reassessmentCenterData(list,'2026-10-15','all',' EMANUEL ').rows.map(r=>r.athlete.id),['today']);
 assert.equal(reassessmentCenterData(list,'2026-10-15','all','não existe').rows.length,0);
 const centerModule=await import('../src/components/ReassessmentCenter');
 const html=renderToStaticMarkup(React.createElement(centerModule.default,{athletes:list,today:'2026-10-15',onSave:async()=>{},onAssess:()=>{}}));
 assert.match(html,/Central de Reavaliações/);assert.match(html,/Buscar atleta na central/);assert.match(html,/Abrir avaliações/);assert.match(html,/Ajustar data/);assert.match(html,/Ver critérios/);
 assert.doesNotMatch(html,/Modelo|bg-white|text-slate-900/);
});

test('central and individual card share remaining tests and refresh after a reassessment',async()=>{
 const {reassessmentCenterData,reassessmentSummary}=await import('../src/utils/reassessment');
 const a=athlete({reassessmentPlan:{dueDate:'2026-10-15',createdOn:'2026-10-01',tests:['imtp'],baseline:{imtp:{id:'latest',date:'2026-10-01'}}}});
 const center=reassessmentCenterData([a],'2026-10-15').rows[0],card=reassessmentSummary(a,'2026-10-15');
 assert.deepEqual(center.tests,card.tests);assert.equal(center.message,card.message);
 a.assessments.imtp.push({id:'retest',date:'2026-10-15',relativePeakForce:1.8});
 const next=reassessmentCenterData([a],'2026-10-15');assert.equal(next.counts.today,0);assert.equal(next.rows[0].result.manual,false);
 const readOnlyHtml=renderToStaticMarkup(React.createElement(ReassessmentNotice,{athlete:a,today:'2026-10-15',readOnly:true,onSave:async()=>{},onAssess:()=>{}}));assert.doesNotMatch(readOnlyHtml,/Agendar reavaliação|Ajustar agendamento/);
 const initialEditor=renderToStaticMarkup(React.createElement(ReassessmentNotice,{athlete:a,today:'2026-10-15',initialMode:'schedule',embedded:true,onSave:async()=>{},onAssess:()=>{}}));assert.match(initialEditor,/Salvar agendamento/);assert.match(initialEditor,/type="date"/);assert.match(initialEditor,/ra-input bg-brand-dark/);
});

test('LB routine intervals cover severity, normal maintenance and separate acute monitoring',()=>{
 const measured=(data:any)=>({id:'test',date:'2026-10-01',...data});
 for(const [type,data,want] of [
  ['imtp',{relativePeakForce:1.3},'30 dias'],['imtp',{relativePeakForce:2},'60 dias'],['imtp',{relativePeakForce:3},'90 dias'],
  ['isometricStrength',{quadricepsR:100,quadricepsL:80,hamstringsR:60,hamstringsL:50},'30 dias'],
  ['isometricStrength',{quadricepsR:100,quadricepsL:88,hamstringsR:60,hamstringsL:55},'60 dias'],
  ['isometricStrength',{quadricepsR:100,quadricepsL:98,hamstringsR:60,hamstringsL:60},'90 dias'],
  ['cmj',{height:30},'30 dias'],['cmj',{height:40},'60 dias'],['cmj',{height:46},'90 dias'],
  ['dropJump',{contactTime:250,rsi:1.4},'30 dias'],['dropJump',{contactTime:210,rsi:1.8},'60 dias'],['dropJump',{contactTime:180,rsi:2.2},'90 dias'],
  ['speed',{speed10m:4,speed30m:8},'60 dias'],['speed',{speed10m:6,speed30m:8},'90 dias'],
  ['vo2max',{vo2max:40},'60 dias'],['vo2max',{vo2max:55},'90 dias'],
 ] as const){
  const result=buildReassessment(athlete({assessments:{[type]:[measured(data)]}}),'2026-10-15');
  assert.equal(result.items.find(i=>i.type===type)?.timeline,want,`${type}: ${JSON.stringify(data)}`);
 }
 const acute=athlete({assessments:{cmj:[{id:'old',date:'2026-09-01',height:50},measured({height:40})]}});
 assert.equal(buildReassessment(acute,'2026-10-15').items[0].timeline,'60 dias');
 const independent=athlete({assessments:{imtp:[measured({relativePeakForce:1.3})],cmj:[measured({height:46})]}});
 const result=buildReassessment(independent,'2026-10-15');
 assert.equal(result.items.find(i=>i.type==='imtp')?.dueDate,'2026-10-31');
 assert.equal(result.items.find(i=>i.type==='cmj')?.dueDate,'2026-12-30');
});


test('assessment-only students have no reassessment deadlines, even with a manual plan',async()=>{
 const {reassessmentCenterData}=await import('../src/utils/reassessment');
 const a=athlete({followUpType:'assessment-only',reassessmentPlan:{dueDate:'2026-10-15',createdOn:'2026-10-01',tests:['imtp'],baseline:{imtp:{id:'latest',date:'2026-10-01'}}}});
 const before=JSON.stringify(a.assessments);
 const result=buildReassessment(a,'2026-10-15');
 assert.deepEqual(result.items,[]);assert.deepEqual(result.initial,[]);assert.equal(result.dueDate,null);assert.equal(result.manual,false);
 assert.equal(reassessmentCenterData([a],'2026-10-15').counts.all,0);
 assert.equal(renderToStaticMarkup(React.createElement(ReassessmentNotice,{athlete:a,today:'2026-10-15',onSave:async()=>{},onAssess:()=>{}})),'');
 a.followUpType='athlete';assert.equal(buildReassessment(a,'2026-10-15').dueDate,'2026-10-15');
 assert.equal(JSON.stringify(a.assessments),before);
});
