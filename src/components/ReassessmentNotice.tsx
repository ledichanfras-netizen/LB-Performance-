import React,{useState,useEffect} from 'react';
import {Bell,CalendarDays,ChevronDown} from 'lucide-react';
import toast from 'react-hot-toast';
import type {Athlete,AssessmentType} from '../types';
import {assessmentLabels,buildReassessment,daysBetween,matrixTests,reassessmentMessage} from '../utils/reassessment';
import {getLocalDateString} from '../utils';

export default function ReassessmentNotice({athlete,onSave,onAssess,readOnly=false,today:fixedToday}:{athlete:Athlete;onSave:(plan:{dueDate:string;tests:AssessmentType[]}|null)=>Promise<void>;onAssess:()=>void;readOnly?:boolean;today?:string}){
 const [today,setToday]=useState(fixedToday || getLocalDateString());
 useEffect(()=>{if(fixedToday)return;const timer=setInterval(()=>setToday(getLocalDateString()),60000);return()=>clearInterval(timer);},[fixedToday]);
 const result=buildReassessment(athlete,today);
 const shown=result.items.filter(i=>i.dueDate && (i.dueDate===result.dueDate || daysBetween(today,i.dueDate)<=0));
 const suggested=shown.length?shown.map(i=>i.type):result.items.length?result.items.map(i=>i.type):result.initial;
 const [editing,setEditing]=useState(false),[criteria,setCriteria]=useState(false),[saving,setSaving]=useState(false);
 const [date,setDate]=useState(''),[tests,setTests]=useState<AssessmentType[]>([]);
 const open=()=>{setDate(result.dueDate || '');setTests(suggested.length?suggested:matrixTests);setEditing(true);};
 const dateLabel=(value:string)=>value.split('-').reverse().join('/');
 const submit=async(reset=false)=>{
  if(!reset && (!date || !tests.length)){toast.error('Escolha uma data e pelo menos uma avaliação.');return;}
  setSaving(true);
  try{await onSave(reset?null:{dueDate:date,tests});setEditing(false);toast.success(reset?'Sugestões da Matriz LB retomadas.':'Reavaliação agendada!');}
  catch(error:any){toast.error(error.message || 'Não foi possível salvar. Tente novamente.');}finally{setSaving(false);}
 };
 const message=reassessmentMessage(result.dueDate,today,result.items.length>0 || result.manual);
 return <section className="reassessment-notice mb-6 rounded-2xl border border-emerald-400/50 bg-white text-slate-900 p-4 sm:p-5 shadow-sm" aria-label="Reavaliação do atleta">
  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
   <div className="min-w-0"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-800"><Bell size={16}/> Reavaliação — Matriz LB</p><h2 className="text-lg font-black mt-2">{message}</h2>{result.dueDate && <p className="text-sm text-slate-600 mt-1">{dateLabel(result.dueDate)} · {result.manual?'Agendado pelo treinador':'Início da janela sugerida pela Matriz'}</p>}<p className="text-sm mt-2"><strong>Avaliações sugeridas: </strong>{suggested.map(t=>assessmentLabels[t]).join(' · ') || 'Definir com o treinador'}</p></div>
   <div className="flex flex-wrap gap-2 shrink-0">{!readOnly && <button type="button" onClick={open} className="bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2"><CalendarDays size={15}/>{result.manual?'Ajustar agendamento':'Agendar reavaliação'}</button>}<button type="button" onClick={()=>setCriteria(!criteria)} aria-expanded={criteria} className="bg-slate-100 text-slate-800 border border-slate-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1">Ver critérios <ChevronDown size={14}/></button></div>
  </div>
  {criteria && <div className="mt-4 pt-3 border-t border-slate-200 space-y-3 text-sm">{result.items.map(item=><div key={item.type}><p className="font-bold">{assessmentLabels[item.type]} · {item.dueDate?dateLabel(item.dueDate):'Prazo a definir'}</p><p className="text-slate-600">Último teste: {item.lastDate?dateLabel(item.lastDate):'Não Informado'}. {item.timeline?`Prazo da Matriz: ${item.timeline}. `:''}{item.reason}</p></div>)}{result.initial.length>0 && <p className="text-slate-600">Sem avaliação válida registrada: {result.initial.map(t=>assessmentLabels[t]).join(' · ')}. O treinador pode escolher quais se aplicam ao atleta.</p>}{result.completed.length>0 && <p className="text-emerald-800">Já realizadas neste agendamento: {result.completed.map(t=>assessmentLabels[t]).join(' · ')}.</p>}<p className="text-slate-600">O aviso organiza a reavaliação. Interpretar a evolução individual com o mesmo protocolo, considerando a variação habitual do teste e o calendário esportivo.</p><button type="button" onClick={onAssess} className="font-bold text-emerald-800 underline">Abrir avaliações do atleta</button></div>}
  {editing && <form onSubmit={e=>{e.preventDefault();void submit();}} className="mt-4 border-t border-slate-200 pt-4 space-y-3"><label className="block text-sm font-bold">Data da reavaliação<input type="date" required value={date} onChange={e=>setDate(e.target.value)} className="block mt-1 w-full sm:w-auto rounded-lg border border-slate-400 bg-white text-slate-900 p-2"/></label><fieldset><legend className="text-sm font-bold mb-2">Avaliações a realizar</legend><div className="grid sm:grid-cols-2 gap-2">{Object.entries(assessmentLabels).map(([type,label])=><label key={type} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={tests.includes(type as AssessmentType)} onChange={e=>setTests(prev=>e.target.checked?[...prev,type as AssessmentType]:prev.filter(t=>t!==type))}/>{label}</label>)}</div></fieldset><div className="flex flex-wrap gap-2"><button disabled={saving} className="bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm">{saving?'Salvando…':'Salvar agendamento'}</button><button type="button" disabled={saving} onClick={()=>setEditing(false)} className="bg-slate-100 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm">Cancelar</button>{result.manual && <button type="button" disabled={saving} onClick={()=>void submit(true)} className="text-emerald-800 underline text-sm px-2">Usar sugestão da Matriz</button>}</div></form>}
 </section>;
}
