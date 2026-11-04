import React, { useEffect, useRef, useState } from 'react';
import type { PrescribedExercise } from '../types';
import { aerobicSummary, aerobicVolume } from '../utils/aerobic';
// Keep the text being typed separate from the saved numeric value, so clearing
// a field or entering a decimal separator does not immediately insert a zero.
function FastNumericInput({value,onChange,className,integer=false,max=Infinity}:{value:number|undefined;onChange:(value:number)=>void;className:string;integer?:boolean;max?:number}) {
 const [draft,setDraft]=useState(value===undefined?'':String(value));
 const focused=useRef(false);
 useEffect(()=>{if(!focused.current)setDraft(value===undefined?'':String(value));},[value]);
 const numberFrom=(text:string)=>Math.min(max,Math.max(0,integer?Math.round(Number(text.replace(',','.'))):Number(text.replace(',','.'))));
 return <input type="text" inputMode={integer?'numeric':'decimal'} autoComplete="off" className={className} value={draft}
  onFocus={e=>{
   focused.current=true;
   if(value===0)setDraft('');
   const input=e.currentTarget;
   requestAnimationFrame(()=>{if(document.activeElement===input)input.select();});
  }}
  onChange={e=>{
   const text=e.target.value;
   if(!/^\d*(?:[.,]\d*)?$/.test(text))return;
   setDraft(text);
   if(text===''||text===','||text==='.')onChange(0);
   else {const number=numberFrom(text);if(Number.isFinite(number))onChange(number);}
  }}
  onBlur={()=>{
   focused.current=false;
   const number=numberFrom(draft);
   if(Number.isFinite(number)){setDraft(draft===''?'':String(number));onChange(number);}
  }}
 />;
}
export function AerobicTracker({exercise:ex,onUpdate,onToggle}:{exercise:PrescribedExercise;onUpdate:(id:string,field:string,value:number)=>void;onToggle:(id:string)=>void}) {
 const v=aerobicVolume([ex]);
 return <section className="space-y-3 mt-4"><p className="font-bold text-emerald-400">Prescrito: {aerobicSummary(ex.aerobic!)}</p>
 {(ex.performedSets||[]).map(s=><div key={s.id} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 {([{key:'timeSeconds',label:'Tempo realizado (min)',factor:60},{key:'distance',label:'Distância realizada (km)',factor:1000},{key:'speedKmh',label:'Velocidade (km/h)',factor:1},{key:'inclinePercent',label:'Inclinação (%)',factor:1},{key:'rpe',label:'PSE (0–10)',factor:1}] as const).map(f=><label key={f.key} className="text-sm">{f.label}<FastNumericInput integer={f.key==='rpe'} max={f.key==='rpe'?10:undefined} className="block w-full min-h-12 rounded-xl p-3 bg-slate-900 text-white border border-slate-700" value={s[f.key]===undefined?undefined:s[f.key]!/f.factor} onChange={value=>onUpdate(s.id,f.key,value*f.factor)}/></label>)}
 <button type="button" className="min-h-12 rounded-xl bg-emerald-500 text-slate-950 font-bold px-3" onClick={()=>onToggle(s.id)}>{s.isCompleted?'Concluído ✓ — reabrir':'Concluir aeróbio'}</button></div>)}
 <p className="text-sm">Realizado: {v.minutes.toLocaleString('pt-BR',{maximumFractionDigits:1})} min · {v.km.toLocaleString('pt-BR',{maximumFractionDigits:2})} km · carga do aeróbio: {Math.round(v.load)} UA</p>
 <p className="text-xs text-slate-400">Carga do aeróbio = minutos realizados × PSE. Está incluída na sessão; não somar novamente à carga total.</p></section>;
}
