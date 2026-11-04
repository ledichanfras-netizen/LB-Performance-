import React from 'react';
import type { PrescribedExercise } from '../types';
import { aerobicFields, defaultAerobic, aerobicSummary } from '../utils/aerobic';
export function AerobicEditor({exercise:ex,onChange}:{exercise:PrescribedExercise;onChange:(p:Partial<PrescribedExercise>)=>void}) {
 const p=ex.aerobic;
 const field='w-full min-h-11 bg-slate-950 text-white border border-slate-700 rounded-xl p-2';
 if(!p)return <button type="button" className={field} onClick={()=>onChange(aerobicFields(defaultAerobic()))}>Configurar esteira por tempo ou distância</button>;
 const change=(v:Partial<typeof p>)=>onChange(aerobicFields({...p,...v}));
 return <section className="space-y-3 p-3 border border-emerald-500/40 rounded-xl">
 <h3 className="font-bold text-emerald-400">Esteira — caminhada/corrida</h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <label>Objetivo<select className={field} value={p.goal} onChange={e=>change({goal:e.target.value as typeof p.goal})}><option value="warmup">Aquecimento</option><option value="base">Base aeróbia</option><option value="recovery">Recuperação</option></select></label>
 <label>Prescrever por<select className={field} value={p.target} onChange={e=>change({target:e.target.value as typeof p.target})}><option value="time">Tempo (minutos)</option><option value="distance">Distância (km)</option></select></label>
 <label>{p.target==='time'?'Duração (min)':'Distância (km)'}<input className={field} type="number" min="0.1" step="0.1" value={p.target==='time'?p.minutes:p.distanceKm} onChange={e=>change({[p.target==='time'?'minutes':'distanceKm']:Math.max(0,Number(e.target.value))})}/></label>
 <label>Velocidade (km/h, opcional)<input className={field} type="number" min="0" max="50" step="0.1" value={p.speedKmh??''} onChange={e=>change({speedKmh:e.target.value===''?undefined:Number(e.target.value)})}/></label>
 <label>Inclinação (%, opcional)<input className={field} type="number" min="0" max="40" step="0.5" value={p.inclinePercent??''} onChange={e=>change({inclinePercent:e.target.value===''?undefined:Number(e.target.value)})}/></label>
 <label>Intensidade orientada<input className={field} placeholder="Ex.: confortável, PSE 3–4" value={p.intensity||''} onChange={e=>change({intensity:e.target.value})}/></label>
 </div><p>{aerobicSummary(p)}</p><p className="text-xs text-slate-400">O aluno registra minutos e km realizados. A duração deste exercício já faz parte do tempo total da sessão.</p></section>;
}
