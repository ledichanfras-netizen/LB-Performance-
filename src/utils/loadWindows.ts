import {metricDay} from './metricTimeline';
import {sessionInternalLoad} from './sessionMetrics';
const DAY=86400000;
const todayString=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
type Entry={id?:string;date:string;status?:string;isRestDay?:boolean;rpe?:number;durationMinutes?:number};
function observations(workouts:Entry[],external:Entry[],asOf:string){
 const today=metricDay(asOf);if(today===null)throw Error('Data de referência inválida.');
 const all=[...workouts.filter(w=>w.status==='completed'),...external].filter(s=>metricDay(s.date)!==null&&metricDay(s.date)!<=today);
 return {today,all:all.map(s=>({day:metricDay(s.date)!,load:s.isRestDay===true?0:sessionInternalLoad(s),rest:s.isRestDay===true}))};
}
export function weeklyLoadMetrics(workouts:Entry[]=[],external:Entry[]=[],asOf=todayString()){
 const {today,all}=observations(workouts,external,asOf),start=today-6*DAY;
 const window=all.filter(s=>s.day>=start);const days=Array.from({length:7},(_,i)=>{const rows=window.filter(s=>s.day===start+i*DAY);return rows.length&&rows.every(s=>s.load!==null)?rows.reduce((sum,s)=>sum+s.load!,0):null;});
 const recordedDays=days.filter(d=>d!==null).length;
 const totalLoad=window.reduce((sum,s)=>sum+(s.load??0),0);
 if(recordedDays<7)return {monotony:null,strain:null,totalLoad,recordedDays,windowDays:7,sessionCount:window.length};
 const values=days as number[],mean=values.reduce((a,b)=>a+b,0)/7,variance=values.reduce((sum,n)=>sum+(n-mean)**2,0)/7;
 const monotony=variance>0?Math.round(mean/Math.sqrt(variance)*100)/100:null;
 return {monotony,strain:monotony===null?null:Math.round(totalLoad*monotony),totalLoad,recordedDays,windowDays:7,sessionCount:window.length};
}
export function acwrMetrics(workouts:Entry[]=[],external:Entry[]=[],asOf=todayString()){
 const {today,all}=observations(workouts,external,asOf),start=today-27*DAY;
 const window=all.filter(s=>s.day>=start),valid=window.filter(s=>s.load!==null);
 const acute=valid.filter(s=>s.day>=today-6*DAY).reduce((sum,s)=>sum+s.load!,0);
 const chronicTotal=valid.reduce((sum,s)=>sum+s.load!,0),chronic=chronicTotal/4;
 const first=all.filter(s=>s.load!==null).reduce((min,s)=>Math.min(min,s.day),Infinity);
 const missingSessions=window.filter(s=>s.load===null).length;
 const ratio=first<=start&&chronic>0&&missingSessions===0?Math.round(acute/chronic*100)/100:null;
 const status=ratio===null?'Não calculável':ratio>1.3?'Relação elevada':ratio<.8?'Relação reduzida':'Faixa de referência';
 const color=ratio===null?'text-slate-400':ratio>1.3?'text-orange-400':ratio<.8?'text-amber-400':'text-emerald-400';
 return {ratio,acute:Math.round(acute),chronic:Math.round(chronic),status,color,recordedDays:new Set(valid.map(s=>s.day)).size,windowDays:28,missingSessions,hasBaseline:first<=start};
}
