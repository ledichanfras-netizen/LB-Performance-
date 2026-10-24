import React from 'react';
import type { ExerciseSet, PrescribedExercise } from '../types';
import { getSetSide, sideLabel, sideOrder, sideSets } from '../utils/unilateral';

export function UnilateralSetTracker({exercise:ex,onUpdate,onToggle}:{exercise:PrescribedExercise;onUpdate:(setId:string,field:keyof ExerciseSet,value:number)=>void;onToggle:(setId:string)=>void}){
 const groups=[...sideOrder(ex).map(side=>({label:sideLabel(side),side,sets:sideSets(ex,side)})),{label:'Registro anterior · lado não informado',side:undefined,sets:(ex.performedSets || []).filter(s=>!getSetSide(s))}];
 const completed=(ex.performedSets || []).filter(s=>s.isCompleted).length;
 return <div className="lb-unilateral-panel" data-testid="unilateral-execution">
  {groups.filter(g=>g.sets.length).map(group=><section key={group.label} className="lb-unilateral-execution-side"><h4>{group.label}</h4>{group.side && ex.sidePrescriptions && <p className="lb-unilateral-summary">{group.sets.filter(s=>s.isCompleted).length}/{group.sets.length} concluídas · Prescrito: {ex.sidePrescriptions[group.side].sets} × {ex.sidePrescriptions[group.side].reps} · {ex.sidePrescriptions[group.side].weight}</p>}
   {group.sets.map((s,i)=><div key={s.id} className={`lb-unilateral-set ${s.isCompleted?'is-complete':''}`}><span>Série {i+1}</span><label>Carga (kg)<input className="lb-unilateral-bg-field" type="number" min={0} step="any" aria-label={`${group.label}, série ${i+1}, carga realizada`} value={s.weight ?? ''} onChange={e=>onUpdate(s.id,'weight',Math.max(0,Number(e.target.value)||0))}/></label><label>{ex.repsType==='time'?'Tempo (s)':'Repetições'}<input className="lb-unilateral-bg-field" type="number" min={0} step="any" aria-label={`${group.label}, série ${i+1}, ${ex.repsType==='time'?'tempo':'repetições'} realizadas`} value={ex.repsType==='time'?(s.timeSeconds ?? s.reps ?? ''):(s.reps ?? '')} onChange={e=>{const value=Math.max(0,Math.floor(Number(e.target.value)||0));onUpdate(s.id,'reps',Math.floor(value));if(ex.repsType==='time')onUpdate(s.id,'timeSeconds',value);}}/></label><label className="lb-unilateral-confirm"><input type="checkbox" checked={!!s.isCompleted} aria-label={`Concluir ${group.label}, série ${i+1}`} onChange={()=>onToggle(s.id)}/><span>Feito</span></label></div>)}
  </section>)}
  <p className="lb-unilateral-summary" aria-live="polite">{completed} de {ex.performedSets?.length || 0} séries concluídas · carga total utilizada por execução</p>
 </div>;
}
