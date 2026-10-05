import React from 'react';
import { ConditioningProtocol, PrescribedExercise } from '../types';
type Block = ConditioningProtocol['blocks'][number];
const environmentName = (p: ConditioningProtocol) => p.environment === 'field' ? 'Campo / Quadra' : p.environment === 'bike' ? 'Bike' : 'Esteira';
const amount = (value: number, unit: Block['unit']) => unit === 'meters' ? `${value} m` : value >= 60 && value % 60 === 0 ? `${value / 60} min` : `${value} s`;
export const protocolSummary = (p: ConditioningProtocol) => {
 let number = 0;
 return `${environmentName(p)}\n\n` + p.blocks.map((b, index) => {
  const sequence = b.stages.map(v => amount(v, b.unit)).join(' → ');
  if (b.phase === 'warmup' || b.phase === 'cooldown') return `${b.phase === 'warmup' ? 'Aquecimento' : 'Desaquecimento'}: ${sequence}.${b.repetitions > 1 ? ` Repita ${b.repetitions} vezes.` : ''}`;
  const lines = [`Bloco ${++number}: ${b.repetitions} ${b.stages.length > 1 ? 'voltas na sequência' : 'tiros'} de ${sequence}.`];
  lines.push(b.pauseSeconds ? `Descanse ${amount(b.pauseSeconds, 'seconds')} entre ${b.stages.length > 1 ? 'cada esforço, inclusive ao repetir a sequência' : 'os tiros'}.` : 'Sem pausa entre os esforços.');
  if (b.blockPauseSeconds && index < p.blocks.length - 1) lines.push(`Ao terminar o bloco, descanse ${amount(b.blockPauseSeconds, 'seconds')} antes da próxima etapa.`);
  return lines.join('\n');
 }).join('\n\n');
};
const modelBlock = (method?: string): Block => ({phase: 'work', repetitions: method === 'pyramid_field' ? 2 : method === 'fartlek' ? 6 : 5, stages: method === 'pyramid_field' ? [20,40,60,40,20] : method === 'fartlek' ? [30] : [20], unit: method === 'fartlek' ? 'seconds' : 'meters', pauseSeconds: method === 'fartlek' ? 60 : 30, blockPauseSeconds: 180});
export default function ConditioningProtocolEditor({exercise,onChange}: {exercise: PrescribedExercise; onChange: (values: Partial<PrescribedExercise>) => void}) {
 const p = exercise.conditioningProtocol;
 const apply = (next: ConditioningProtocol) => {
  const main = next.blocks.find(b => !b.phase || b.phase === 'work') || next.blocks[0];
  onChange({conditioningProtocol: next, sets: next.blocks.length, reps: next.blocks.map(b => `${b.repetitions}x ${b.stages.join('+')}${b.unit === 'meters' ? 'm' : 's'}`).join(' / '), repsType: main.unit === 'meters' ? 'meters' : 'time', fieldUnit: main.unit === 'meters' ? 'meters' : 'time', intraSetRest: main.pauseSeconds, rest: `${main.blockPauseSeconds}s`, isStructuredRunning: true});
 };
 const update = (i: number, values: Partial<Block>) => p && apply({...p, blocks: p.blocks.map((b,j) => j === i ? {...b,...values} : b)});
 const numeric = (value: string, min: number, max: number) => Math.min(max,Math.max(min,Number(value) || min));
 const field = 'w-full rounded-lg border border-slate-300 bg-white text-slate-900 p-2 mt-1';
 const button = 'rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 px-3 py-2 font-semibold';
 return <section className="bg-white text-slate-900 border border-emerald-300 rounded-xl p-4 space-y-4">
  <h4 className="font-bold">Prescrição do protocolo</h4>
  {!p ? <><p className="text-sm text-slate-600">Comece com o modelo e ajuste os valores.</p><button type="button" className={button} onClick={() => apply({environment:'field',blocks:[modelBlock(exercise.executionMethod)]})}>Usar modelo e editar</button></> : <>
   <label className="block text-sm font-semibold">Onde será executado?<select className={field} value={p.environment} onChange={e => apply({...p,environment:e.target.value as ConditioningProtocol['environment']})}><option value="field">Campo / Quadra</option><option value="treadmill">Esteira</option><option value="bike">Bike</option></select></label>
   {exercise.executionMethod === 'shuttle_run' && p.environment !== 'field' && <p className="text-sm text-amber-800">Na esteira ou bike, use intervalos sem mudança de direção.</p>}
   {p.blocks.map((b,i) => {
    const auxiliary = b.phase === 'warmup' || b.phase === 'cooldown';
    const title = b.phase === 'warmup' ? 'Aquecimento' : b.phase === 'cooldown' ? 'Desaquecimento' : `Bloco ${p.blocks.slice(0,i+1).filter(x => !x.phase || x.phase === 'work').length}`;
    return <div key={i} className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-3">
     <div className="flex justify-between items-center gap-2"><h5 className="font-bold">{title}</h5>{p.blocks.length > 1 && (auxiliary || p.blocks.filter(x => !x.phase || x.phase === 'work').length > 1) && <button type="button" className="text-sm text-red-700" onClick={() => apply({...p,blocks:p.blocks.filter((_,j) => j !== i)})}>Remover</button>}</div>
     <div className="grid grid-cols-2 gap-3">
      {!auxiliary && <label className="text-sm">{b.stages.length > 1 ? 'Repetir a sequência (vezes)' : 'Quantidade de tiros'}<input className={field} type="number" min={1} max={100} value={b.repetitions} onChange={e => update(i,{repetitions:Math.round(numeric(e.target.value,1,100))})}/></label>}
      <label className="text-sm">Prescrever por<select className={field} value={b.unit} onChange={e => update(i,{unit:e.target.value as Block['unit']})}><option value="meters">Distância (metros)</option><option value="seconds">Tempo (segundos)</option></select></label>
     </div>
     <div className="space-y-2">{b.stages.map((value,j) => <div key={j} className="flex items-end gap-2"><label className="text-sm flex-1">{b.stages.length > 1 ? `Esforço ${j+1}` : auxiliary ? 'Duração / distância' : 'Cada tiro'} ({b.unit === 'meters' ? 'm' : 's'})<input className={field} type="number" min={1} max={100000} value={value} onChange={e => update(i,{stages:b.stages.map((v,k) => k === j ? numeric(e.target.value,1,100000) : v)})}/></label>{b.stages.length > 1 && <button type="button" className="p-2 text-red-700 text-sm" onClick={() => update(i,{stages:b.stages.filter((_,k) => k !== j)})}>Remover</button>}</div>)}</div>
     {!auxiliary && <>
      <button type="button" className="text-sm text-emerald-800 underline" disabled={b.stages.length >= 20} onClick={() => update(i,{stages:[...b.stages,b.stages[b.stages.length-1]]})}>Adicionar esforço diferente à sequência</button>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm">Pausa entre tiros (s)<input className={field} type="number" min={0} max={3600} value={b.pauseSeconds} onChange={e => update(i,{pauseSeconds:numeric(e.target.value,0,3600)})}/></label><label className="text-sm">Pausa após o bloco (s)<input className={field} type="number" min={0} max={3600} value={b.blockPauseSeconds} onChange={e => update(i,{blockPauseSeconds:numeric(e.target.value,0,3600)})}/></label></div>
     </>}
    </div>;
   })}
   <div className="flex flex-wrap gap-2">
    <button type="button" className={button} disabled={p.blocks.length >= 20} onClick={() => {const end=p.blocks.findIndex(b => b.phase === 'cooldown');const blocks=[...p.blocks];blocks.splice(end < 0 ? blocks.length : end,0,modelBlock(exercise.executionMethod));apply({...p,blocks});}}>+ Bloco de tiros</button>
    {!p.blocks.some(b => b.phase === 'warmup') && <button type="button" className={button} disabled={p.blocks.length >= 20} onClick={() => apply({...p,blocks:[{phase:'warmup',repetitions:1,stages:[300],unit:'seconds',pauseSeconds:0,blockPauseSeconds:0},...p.blocks]})}>+ Aquecimento</button>}
    {!p.blocks.some(b => b.phase === 'cooldown') && <button type="button" className={button} disabled={p.blocks.length >= 20} onClick={() => apply({...p,blocks:[...p.blocks,{phase:'cooldown',repetitions:1,stages:[300],unit:'seconds',pauseSeconds:0,blockPauseSeconds:0}]})}>+ Desaquecimento</button>}
   </div>
   <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><h5 className="font-bold mb-2">Como o aluno vai executar</h5><p className="text-sm whitespace-pre-wrap leading-relaxed">{protocolSummary(p)}</p></div>
  </>}
 </section>;
}
