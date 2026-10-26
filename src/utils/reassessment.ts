import { isAssessmentOnly } from './followUp';
import type { Athlete, AssessmentType, DecisionCategory, DecisionMatrixRow } from '../types';
import { generateAthleteDecisionMatrix } from './decisionMatrixEngine';
import { normalizeBirthDate as dateOnly } from './birthDate';

export const assessmentLabels: Record<AssessmentType,string> = {imtp:'IMTP',isometricStrength:'Força de quadríceps e isquiotibiais',cmj:'CMJ',dropJump:'Drop Jump',abalakov:'Salto Abalakov',speed:'Velocidade',vo2max:'VO₂máx',bioimpedance:'Bioimpedância',postural:'Avaliação postural'};
export const matrixTests: AssessmentType[] = ['imtp','isometricStrength','cmj','dropJump','speed','vo2max'];
export type ReassessmentPlan = {dueDate:string;tests:AssessmentType[];createdOn:string;baseline:Partial<Record<AssessmentType,{id:string;date:string}>>};
const categoryTest:Partial<Record<DecisionCategory,AssessmentType>>={forca_maxima:'imtp',taxa_desenvolvimento_forca:'imtp',potencia_cmj:'cmj',forca_reativa_dj:'dropJump',assimetria_prevencao:'isometricStrength',velocidade_sprint:'speed',capacidade_aerobica:'vo2max'};
const fields:Record<string,string[]>={imtp:['peakForce','relativePeakForce'],isometricStrength:['quadricepsR','quadricepsL','hamstringsR','hamstringsL'],cmj:['height'],abalakov:['height'],dropJump:['rsi','contactTime','jumpHeight'],speed:['speed5m','speed10m','speed20m','speed30m','time5m','time10m','time20m','time30m'],vo2max:['vo2max','vam']};
export const daysBetween=(from:string,to:string)=>Math.round((Date.parse(`${to}T12:00:00Z`)-Date.parse(`${from}T12:00:00Z`))/86400000);
const addDays=(date:string,days:number)=>new Date(Date.parse(`${date}T12:00:00Z`)+days*86400000).toISOString().slice(0,10);
export function timelineDays(text?:string):number|null {
  if(!text)return null;
  const values=text.match(/\d+/g)?.map(Number);if(!values?.length)return null;
  const amount=Math.min(...values.filter(n=>n>0));
  if(!Number.isFinite(amount))return null;
  if(/semana/i.test(text))return amount*7;
  if(/hora|\bh\b|\d+h/i.test(text))return Math.max(1,Math.ceil(amount/24));
  if(/dia|diário/i.test(text))return amount;
  return null;
}
export function validAssessmentHistory(athlete:Athlete,type:AssessmentType,today:string) {
  return ((athlete.assessments?.[type] || []) as any[]).filter(row=>{
    const date=dateOnly(row?.date);
    return row?.id && date && date<=today && (!fields[type] || fields[type].some(key=>Number.isFinite(Number(row[key])) && Number(row[key])>0));
  }).sort((a,b)=>(Date.parse(a.date)||0)-(Date.parse(b.date)||0) || String(a.id).localeCompare(String(b.id)));
}
export function readReassessmentPlan(value:unknown):ReassessmentPlan|null {
  if(!value || typeof value!=='object')return null;
  const plan=value as any;
  if(!dateOnly(plan.dueDate) || !dateOnly(plan.createdOn) || !Array.isArray(plan.tests) || !plan.tests.length || plan.tests.some((t:any)=>typeof t!=='string' || !Object.hasOwn(assessmentLabels,t)))return null;
  const baseline:ReassessmentPlan['baseline']={};
  for(const type of plan.tests as AssessmentType[]){const row=plan.baseline?.[type];if(row && typeof row.id==='string' && dateOnly(row.date))baseline[type]={id:row.id,date:dateOnly(row.date)};}
  return {dueDate:dateOnly(plan.dueDate),createdOn:dateOnly(plan.createdOn),tests:[...new Set<AssessmentType>(plan.tests)],baseline};
}
export type ReassessmentItem={type:AssessmentType;dueDate:string|null;lastDate:string|null;reason:string;timeline?:string;source:'matrix'|'coach'};
export function buildReassessment(athlete:Athlete,today:string, suppliedRows?:DecisionMatrixRow[]):{items:ReassessmentItem[];dueDate:string|null;initial:AssessmentType[];manual:boolean;completed:AssessmentType[]} {
  if(isAssessmentOnly(athlete))return {items:[],dueDate:null,initial:[],manual:false,completed:[]};
  const history=Object.fromEntries(Object.keys(assessmentLabels).map(t=>[t,validAssessmentHistory(athlete,t as AssessmentType,today)]));
  const latest=(type:AssessmentType)=>history[type].at(-1);
  const initial=matrixTests.filter(type=>!latest(type));
  const plan=readReassessmentPlan(athlete.reassessmentPlan);
  if(plan){
    const pending=plan.tests.filter(type=>{
      const row=latest(type),base=plan.baseline[type];
      return !row || (base ? row.id===base.id || dateOnly(row.date)<base.date : dateOnly(row.date)<plan.createdOn);
    });
    if(pending.length)return {items:pending.map(type=>({type,dueDate:plan.dueDate,lastDate:latest(type)?dateOnly(latest(type).date):null,reason:'Data e avaliações definidas pelo treinador.',source:'coach' as const})),dueDate:plan.dueDate,initial,manual:true,completed:plan.tests.filter(t=>!pending.includes(t))};
  }
  // Matrix expects chronological history; do not let cache order or missing metrics choose the rule.
  const rows=suppliedRows || generateAthleteDecisionMatrix({...athlete,assessments:history as any}).activeRows;
  const byType=new Map<AssessmentType,ReassessmentItem>();
  for(const row of rows){
    const type=categoryTest[row.category];if(!type || !latest(type) || (row.id==='dyn-atleta-balanceado' || row.id==='dyn-cmj-queda-aguda'))continue;
    const measured=latest(type),positive=(key:string)=>Number(measured[key])>0;
    const enoughData=type==='imtp' ? (positive('relativePeakForce') || (positive('peakForce') && (positive('weight') || Number(athlete.weight)>0)))
      : type==='isometricStrength' ? ['quadricepsR','quadricepsL','hamstringsR','hamstringsL'].every(positive)
      : type==='dropJump' ? positive('rsi') && positive('contactTime')
      : type==='vo2max' ? positive('vo2max') : true;
    if(!enoughData)continue;
    const days=timelineDays(row.reassessmentTimeline),lastDate=dateOnly(measured.date);
    const dueDate=days===null?null:addDays(lastDate,days);
    const previous=byType.get(type);
    if(!previous || (dueDate && (!previous.dueDate || dueDate<previous.dueDate)))byType.set(type,{type,dueDate,lastDate,reason:`Padrão operacional LB: ${row.reassessmentTimeline}. ${row.finding}. Antecipar conforme avaliação do treinador, sintomas ou queda de desempenho.`,timeline:row.reassessmentTimeline,source:'matrix'});
  }
  // Complete tests without an intervention row follow the 90-day maintenance default.
  // Explicitly supplied rows remain authoritative (e.g. previews and tests).
  if(!suppliedRows)for(const type of matrixTests){
    const measured=latest(type);if(!measured || byType.has(type))continue;
    const positive=(key:string)=>Number(measured[key])>0;
    const complete=type==='isometricStrength' ? ['quadricepsR','quadricepsL','hamstringsR','hamstringsL'].every(positive)
      : type==='vo2max' ? positive('vo2max') : false;
    if(complete){const lastDate=dateOnly(measured.date);byType.set(type,{type,lastDate,dueDate:addDays(lastDate,90),timeline:'90 dias',reason:'Reavaliação de manutenção em 90 dias, conforme padrão operacional LB.',source:'matrix'});}
  }
  // Partial tests without an applicable rule need a coach-defined deadline.
  for(const type of matrixTests)if(latest(type) && !byType.has(type))byType.set(type,{type,dueDate:null,lastDate:dateOnly(latest(type).date),reason:'Sem prazo aplicável na Matriz LB. Definir a data com o treinador.',source:'matrix'});
  const items=[...byType.values()].sort((a,b)=>(a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  return {items,dueDate:items.find(i=>i.dueDate)?.dueDate || null,initial,manual:false,completed:[] as AssessmentType[]};
}
export function reassessmentMessage(dueDate:string|null,today:string,hasAssessments:boolean) {
  if(!hasAssessments)return 'Avaliação inicial pendente';
  if(!dueDate)return 'Prazo a definir pelo treinador';
  const days=daysBetween(today,dueDate);
  return days<0?`Reavaliação pendente há ${-days} ${days===-1?'dia':'dias'}`:days===0?'Reavaliação prevista para hoje':`Reavaliar em ${days} ${days===1?'dia':'dias'}`;
}

export type ReassessmentFilter='all'|'today'|'upcoming'|'overdue'|'undefined';
export function reassessmentSummary(athlete:Athlete,today:string){
  const result=buildReassessment(athlete,today);
  const relevant=result.items.filter(i=>i.dueDate && (i.dueDate===result.dueDate || daysBetween(today,i.dueDate)<=0));
  const tests=relevant.length?relevant.map(i=>i.type):result.items.length?result.items.map(i=>i.type):result.initial;
  const days=result.dueDate?daysBetween(today,result.dueDate):null;
  const status:Exclude<ReassessmentFilter,'all'>|'future'=days===null?'undefined':days<0?'overdue':days===0?'today':days<=7?'upcoming':'future';
  return {athlete,result,tests,days,status,message:reassessmentMessage(result.dueDate,today,result.items.length>0 || result.manual)};
}
export function reassessmentCenterData(athletes:Athlete[],today:string,filter:ReassessmentFilter='all',query=''){
  const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  const all=athletes.filter(a=>a?.id && !isAssessmentOnly(a) && !/^(featured-|model-|meta-)/.test(a.id)).map(a=>reassessmentSummary(a,today))
    .sort((a,b)=>(a.result.dueDate || '9999').localeCompare(b.result.dueDate || '9999') || a.athlete.name.localeCompare(b.athlete.name,'pt-BR'));
  const counts={all:all.length,today:0,upcoming:0,overdue:0,undefined:0};
  for(const row of all)if(row.status!=='future')counts[row.status]++;
  const search=normalize(query.trim());
  const rows=all.filter(row=>(filter==='all' || row.status===filter) && (!search || normalize(row.athlete.name).includes(search)));
  return {rows,counts};
}
