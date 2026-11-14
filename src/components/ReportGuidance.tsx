import React from 'react';
type Props={coach:string;athlete:string;priorities:string[];followUp?:string};
/** One decision-focused synthesis, without repeating the numeric results page. */
export default function ReportGuidance({coach,athlete,priorities,followUp}:Props){
 return <div className="lb-report-guidance space-y-4 font-sans">
  <section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-sm font-black text-slate-900 mb-3">Para o treinador</h3><p className="text-xs text-slate-700 leading-relaxed">{coach}</p></section>
  <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><h3 className="text-sm font-black text-emerald-800 mb-3">Para o atleta e a família</h3><p className="text-xs text-slate-800 leading-relaxed">{athlete}</p></section>
  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><h3 className="text-sm font-black text-slate-900 mb-3">Foco do próximo ciclo</h3><ol className="space-y-4">{priorities.slice(0,3).map((p,i)=><li key={p} className="flex gap-3 text-xs text-slate-700 leading-relaxed"><span className="font-black text-emerald-700">{i+1}.</span><span>{p}</span></li>)}</ol></section>
  <section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-sm font-black text-slate-900 mb-3">Como acompanhar</h3><p className="text-xs text-slate-700 leading-relaxed">{followUp||'Reavaliar com o mesmo protocolo e equipamento. Comparar com o próprio histórico e definir as metas e a data de reavaliação com o treinador.'}</p></section>
 </div>;
}
