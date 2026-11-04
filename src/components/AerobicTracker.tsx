import React from 'react';
import type { PrescribedExercise } from '../types';
import { aerobicSummary, aerobicVolume } from '../utils/aerobic';
export function AerobicTracker({exercise:ex,onUpdate,onToggle}:{exercise:PrescribedExercise;onUpdate:(id:string,field:string,value:number)=>void;onToggle:(id:string)=>void}) {
 const v=aerobicVolume([ex]);
 return <section className="space-y-3 mt-4"><p className="font-bold text-emerald-400">Prescrito: {aerobicSummary(ex.aerobic!)}</p>
 {(ex.performedSets||[]).map(s=><div key={s.id} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 {([{key:'timeSeconds',label:'Tempo realizado (min)',factor:60},{key:'distance',label:'Distância realizada (km)',factor:1000},{key:'speedKmh',label:'Velocidade (km/h)',factor:1},{key:'inclinePercent',label:'Inclinação (%)',factor:1},{key:'rpe',label:'PSE (0–10)',factor:1}] as const).map(f=><label key={f.key} className="text-sm">{f.label}<input type="number" min="0" max={f.key==='rpe'?10:undefined} step={f.key==='rpe'?1:0.1} className="block w-full min-h-12 rounded-xl p-3 bg-slate-900 text-white border border-slate-700" value={s[f.key]===undefined?'':s[f.key]!/f.factor} onChange={e=>onUpdate(s.id,f.key,Math.max(0,Math.min(f.key==='rpe'?10:Infinity,f.key==='rpe'?Math.round(Number(e.target.value)):Number(e.target.value)))*f.factor)}/></label>)}
 <button type="button" className="min-h-12 rounded-xl bg-emerald-500 text-slate-950 font-bold px-3" onClick={()=>onToggle(s.id)}>{s.isCompleted?'Concluído ✓ — reabrir':'Concluir aeróbio'}</button></div>)}
 <p className="text-sm">Realizado: {v.minutes.toLocaleString('pt-BR',{maximumFractionDigits:1})} min · {v.km.toLocaleString('pt-BR',{maximumFractionDigits:2})} km · carga do aeróbio: {Math.round(v.load)} UA</p>
 <p className="text-xs text-slate-400">Carga do aeróbio = minutos realizados × PSE. Está incluída na sessão; não somar novamente à carga total.</p></section>;
}
