import React from 'react';
import type { PrescribedExercise } from '../types';
import { isUnilateral, sideLabel, sideOrder, unilateralEligible, prescriptionSummary } from '../utils/unilateral';

export function UnilateralPrescriptionEditor({exercise:ex,onChange,disabled=false}:{exercise:PrescribedExercise;onChange:(patch:Partial<PrescribedExercise>)=>void;disabled?:boolean}) {
 if(!unilateralEligible(ex))return null;
 const unilateral=isUnilateral(ex);
 const enable=()=>{const p={sets:Math.max(1,Number(ex.sets)||3),reps:ex.reps,weight:ex.weight};onChange({lateralType:'Unilateral',sidePrescriptions:{left:{...p},right:{...p}},startingSide:ex.startingSide || 'left'});};
 return <div className="lb-unilateral-panel" data-testid="unilateral-prescription">
  <label className="lb-unilateral-toggle"><input type="checkbox" checked={unilateral} disabled={disabled} onChange={e=>onChange({lateralType:e.target.checked?'Unilateral':'Bilateral',sidePrescriptions:undefined,startingSide:undefined,sets:ex.sidePrescriptions?.left.sets || ex.sets,reps:ex.sidePrescriptions?.left.reps || ex.reps,weight:ex.sidePrescriptions?.left.weight || ex.weight})}/>Exercício unilateral · dose por lado</label>
  {unilateral && <>
   <label className="lb-unilateral-toggle"><input type="checkbox" checked={!!ex.sidePrescriptions} disabled={disabled} onChange={e=>e.target.checked?enable():onChange({sidePrescriptions:undefined,sets:ex.sidePrescriptions?.left.sets || ex.sets,reps:ex.sidePrescriptions?.left.reps || ex.reps,weight:ex.sidePrescriptions?.left.weight || ex.weight})}/>Personalizar por lado</label>
   {ex.sidePrescriptions && <>
    <label className="lb-unilateral-start">Começar pelo<select className="lb-unilateral-bg-field" aria-label="Começar pelo lado" value={ex.startingSide || 'left'} disabled={disabled} onChange={e=>onChange({startingSide:e.target.value as 'left'|'right'})}><option value="left">Lado esquerdo</option><option value="right">Lado direito</option></select></label>
    <div className="lb-unilateral-sides">{sideOrder(ex).map(side=>{const p=ex.sidePrescriptions![side];return <section key={side}><h4>{sideLabel(side)}</h4><div className="lb-unilateral-fields">{(['sets','reps','weight'] as const).map(field=><label key={field}>{field==='sets'?'Séries':field==='reps'?(ex.repsType==='time'?'Tempo (s)':'Repetições'):'Carga'}<input className="lb-unilateral-bg-field" aria-label={`${sideLabel(side)}: ${field==='sets'?'séries':field==='reps'?'volume':'carga'}`} disabled={disabled} type={field==='sets'?'number':'text'} min={1} max={25} value={p[field]} onChange={e=>onChange({sidePrescriptions:{...ex.sidePrescriptions!,[side]:{...p,[field]:field==='sets'?Math.max(1,Math.min(25,parseInt(e.target.value)||1)):e.target.value}}})}/></label>)}</div></section>})}</div>
   </>}
   <p className="lb-unilateral-summary">{prescriptionSummary(ex)}</p>
  </>}
 </div>;
}
