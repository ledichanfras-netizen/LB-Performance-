import test from 'node:test';import assert from 'node:assert/strict';
import type {Athlete,Workout} from '../src/types';
import {buildGymContext,reviewGymProposal,progressionGuidance} from '../src/utils/periodizationIntelligence';
import {persistPeriodization} from '../src/utils/periodizationSave';
import {exerciseMetadata} from './exerciseMetadata';
const athlete={id:'a',name:'Teste',assessments:{},wellness:[],workouts:[]} as unknown as Athlete;
const proposal=()=>({id:'new',date:'2026-11-03',name:'Força',phase:'Base',status:'planned',prescriptionObjective:'Força',prescriptionRationale:'Consolidar a execução.',estimatedDurationMinutes:45,exercises:[{id:'ex',name:'Agachamento',muscleGroup:'MMII',sets:3,reps:'5',weight:'Carga moderada',rest:'180s',recoverySeconds:180,capacity:'Força',method:'Tradicional',prescriptionRole:'Dose principal'}]} as Workout);
test('uses only confirmed performed sets, never planned values or unfinished sessions',()=>{const a={...athlete,workouts:[{...proposal(),id:'done',date:'2026-10-30',status:'completed',durationMinutes:40,rpe:7,exercises:[{...proposal().exercises[0],sets:99,performedSets:[{id:'s',reps:5,weight:50,rpe:8,isCompleted:true},{id:'p',reps:99,weight:999,rpe:0,isCompleted:false}]}]},proposal()]} as Athlete;const before=JSON.stringify(a);const c=buildGymContext(a,'2026-11-02','2026-11-30');assert.equal(c.completedWorkouts,1);assert.equal(c.confirmedSets,1);assert.equal(c.unconfirmedRows,1);assert.equal(c.sessions[0].exercises[0].confirmedSets[0].kg,50);assert.ok(!JSON.stringify(c).includes('999'));assert.equal(JSON.stringify(a),before);});
test('assessment snapshots use dates and include IMTP, DJ and Abalakov while excluding images and menstrual fields',()=>{const a={...athlete,assessments:{imtp:[{id:'older',date:'2026-10-01',peakForce:100},{id:'latest',date:'2026-11-01',peakForce:120,image:'PRIVATE'},{id:'future',date:'2026-12-01',peakForce:999}],dropJump:[{date:'2026-10-31',rsi:2}],abalakov:[{date:'2026-10-31',height:40}]},wellness:[{date:'2026-11-01',sleep:3,menstrualPhase:'PRIVATE',psychologyNotes:'PRIVATE'}]} as unknown as Athlete;const c=buildGymContext(a,'2026-11-02','2026-11-30');assert.equal(c.assessments.imtp[0].peakForce,120);assert.equal(c.assessments.dropJump.length,1);assert.equal(c.assessments.abalakov.length,1);assert.ok(!JSON.stringify(c).includes('PRIVATE'));assert.ok(!JSON.stringify(c).includes('999'));});
test('external sessions and competition calendar are separate and time-filtered',()=>{const a={...athlete,externalSessions:[{id:'e',date:'2026-10-30',type:'jogo',durationMinutes:70,rpe:8},{id:'f',date:'2026-12-01',type:'jogo'}],matches:[{date:'2026-11-04',title:'Jogo',status:'Agendado'},{date:'2026-11-05',title:'Cancelado',status:'Cancelado'}]} as Athlete;const c=buildGymContext(a,'2026-11-02','2026-11-30');assert.equal(c.external.length,1);assert.equal(c.matches.length,1);assert.ok(reviewGymProposal([proposal()],['2026-11-03'],c).warnings.some(w=>w.includes('Jogo')));});
test('calendar completeness, duplicate dates and rest budget are independently checked',()=>{const c=buildGymContext(athlete,'2026-11-02','2026-11-30');assert.equal(reviewGymProposal([proposal()],['2026-11-03'],c).errors.length,0);const p=proposal();p.estimatedDurationMinutes=2;assert.ok(reviewGymProposal([p],['2026-11-03'],c).errors.some(e=>e.includes('intervalos')));assert.ok(reviewGymProposal([proposal(),proposal()],['2026-11-03','2026-11-04'],c).errors.some(e=>e.includes('duplicada')));});
test('missing duration is reported and recorded PSE zero remains valid',()=>{const a={...athlete,workouts:[{...proposal(),date:'2026-10-31',status:'completed',rpe:0,durationMinutes:0}]} as Athlete;const c=buildGymContext(a,'2026-11-02','2026-11-30');assert.equal(c.missingPse,0);assert.equal(c.missingDuration,1);assert.equal(c.sessions[0].sessionPse,0);assert.equal(c.sessions[0].durationMinutes,null);assert.equal(c.confirmedSets,0);});
test('capacity, method and role round-trip in existing exercise metadata without new columns',()=>{const ex=proposal().exercises[0];const restored=JSON.parse(exerciseMetadata(ex));assert.equal(restored.capacity,'Força');assert.equal(restored.method,'Tradicional');assert.equal(restored.prescriptionRole,'Dose principal');assert.equal(restored.recoverySeconds,180);});
test('save rebases generated IDs on fresh data and preserves completed and ongoing sessions after a conflict',async()=>{let saves=0;const completed={...proposal(),id:'done',status:'completed'} as Workout;const running={...proposal(),id:'running',status:'in_progress'} as Workout;const pending={...proposal(),id:'pending'} as Workout;let saved:Athlete|undefined;await persistPeriodization('a',[proposal()],{},true,{load:async()=>[{...athlete,workouts:[completed,running,pending]}],save:async a=>{if(++saves===1)throw {status:409};saved=a;}});assert.equal(saves,2);assert.deepEqual(saved?.workouts.map(w=>w.id).sort(),['done','new','running']);assert.equal(saved?.workouts.find(w=>w.id==='done')?.status,'completed');});
test('progression guidance has no mandatory weekly percentages or fixed deload prescription',()=>{for(const m of ['linear','undulating','accumulation','deload','tapering','block_atr','auto'])assert.ok(!/\d+%|35|40-50|8\.5/.test(progressionGuidance(m)));});

test('periodization matrix accepts raw API numeric strings without changing findings or stored assessments', async()=>{
 const {generateAthleteDecisionMatrix}=await import('../src/utils/decisionMatrixEngine');
 const numeric={...athlete,weight:75,gender:'M',assessments:{
  imtp:[{id:'imtp',date:'2026-10-30',peakForce:180,relativePeakForce:2.4,weight:75}],
  cmj:[{id:'cmj',date:'2026-10-30',height:38.1,power:3000,weight:75}],
  dropJump:[{id:'dj',date:'2026-10-30',rsi:2.26,contactTime:200}],
  vo2max:[{id:'vo2',date:'2026-10-30',vo2max:48,vam:15.5}],
  speed:[{id:'speed',date:'2026-10-30',speed10m:5.5,speed30m:8}],
  isometricStrength:[{id:'iso',date:'2026-10-30',quadricepsL:90,quadricepsR:100,hamstringsL:45,hamstringsR:50}]
 }} as unknown as Athlete;
 const raw=JSON.parse(JSON.stringify(numeric,(_,v)=>typeof v==='number'?String(v):v));
 raw.assessments.cmj[0].height='38,1';raw.assessments.dropJump[0].rsi='2,26';
 const before=JSON.stringify(raw);const actual=generateAthleteDecisionMatrix(raw);const expected=generateAthleteDecisionMatrix(numeric);
 assert.deepEqual(actual.activeRows,expected.activeRows);assert.deepEqual(actual.attentionSignals,expected.attentionSignals);
 assert.equal(JSON.stringify(raw),before);assert.ok(!JSON.stringify(actual).includes('NaN'));
});
test('matrix omits malformed assessment numbers instead of throwing or emitting NaN',async()=>{
 const {generateAthleteDecisionMatrix}=await import('../src/utils/decisionMatrixEngine');
 const a={...athlete,assessments:{imtp:[{date:'2026-10-30',relativePeakForce:'infinito'}],cmj:[{date:'2026-10-30',height:'não informado',power:Infinity}],dropJump:[{date:'2026-10-30',rsi:{},contactTime:'200'}],vo2max:[{date:'2026-10-30',vo2max:'--',vam:[]}]}} as unknown as Athlete;
 const result=generateAthleteDecisionMatrix(a);assert.ok(!/NaN|Infinity|\[object Object\]/.test(JSON.stringify(result)));assert.equal((a.assessments.cmj[0] as any).height,'não informado');
});
