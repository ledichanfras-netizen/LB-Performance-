import { isAssessmentOnly } from '../utils/followUp';
import React,{useState,useEffect} from 'react';
import {Bell,CalendarDays,ChevronDown} from 'lucide-react';
import toast from 'react-hot-toast';
import type {Athlete,AssessmentType} from '../types';
import {assessmentLabels,matrixTests,reassessmentSummary} from '../utils/reassessment';
import {getLocalDateString} from '../utils';

export type ReassessmentSave=(plan:{dueDate:string;tests:AssessmentType[]}|null)=>Promise<void>;
export default function ReassessmentNotice({athlete,onSave,onAssess,readOnly=false,today:fixedToday,initialMode='summary',embedded=false,onClose}:{athlete:Athlete;onSave:ReassessmentSave;onAssess:()=>void;readOnly?:boolean;today?:string;initialMode?:'summary'|'schedule'|'criteria';embedded?:boolean;onClose?:()=>void}){
 const [today,setToday]=useState(fixedToday || getLocalDateString());
 useEffect(()=>{if(fixedToday)return;const timer=setInterval(()=>setToday(getLocalDateString()),60000);return()=>clearInterval(timer);},[fixedToday]);
 const {result,tests:suggested,message,status}=reassessmentSummary(athlete,today);
 const [editing,setEditing]=useState(initialMode==='schedule' && !readOnly),[criteria,setCriteria]=useState(initialMode==='criteria'),[saving,setSaving]=useState(false);
 const [date,setDate]=useState(result.dueDate || ''),[tests,setTests]=useState<AssessmentType[]>(suggested.length?suggested:matrixTests);
 const open=()=>{setDate(result.dueDate || '');setTests(suggested.length?suggested:matrixTests);setEditing(true);};
 const dateLabel=(value:string)=>value.split('-').reverse().join('/');
 const submit=async(reset=false)=>{
  if(!reset && (!date || !tests.length)){toast.error('Escolha uma data e pelo menos uma avaliação.');return;}
  setSaving(true);
  try{await onSave(reset?null:{dueDate:date,tests});setEditing(false);toast.success(reset?'Sugestões da Matriz LB retomadas.':'Reavaliação agendada!');onClose?.();}
  catch(error:any){toast.error(error.message || 'Não foi possível salvar. Tente novamente.');}finally{setSaving(false);}
 };
 if(isAssessmentOnly(athlete))return null;
 return <section className={`lb-reassessment ${embedded?'ra-embedded':'ra-panel ra-notice'}`} aria-label="Reavaliação do atleta">
  {!embedded && <div className="ra-heading-row">
   <div className="ra-min"><p className="ra-eyebrow"><Bell size={16}/> Reavaliação — Matriz LB</p><h2 className="ra-title">{message}</h2>{result.dueDate && <p className="ra-muted ra-meta">{dateLabel(result.dueDate)} · {result.manual?'Agendado pelo treinador':'Prazo sugerido pelo padrão LB'}</p>}<p className="ra-copy"><strong>Avaliações {result.manual?'agendadas':'sugeridas'}: </strong>{suggested.map(t=>assessmentLabels[t]).join(' · ') || 'Definir com o treinador'}</p><span className={`ra-badge ra-${status}`}>{result.manual?'Agendamento do treinador':'Sugestão da Matriz LB'}</span></div>
   <div className="ra-actions">{!readOnly && <button type="button" onClick={open} className="ra-button ra-primary"><CalendarDays size={15}/>{result.manual?'Ajustar agendamento':'Agendar reavaliação'}</button>}<button type="button" onClick={()=>setCriteria(!criteria)} aria-expanded={criteria} className="ra-button">Ver critérios <ChevronDown size={14}/></button></div>
  </div>}
  {criteria && <div className="ra-details ra-copy">{result.items.map(item=><div key={item.type} className="ra-criterion"><p className="ra-label">{assessmentLabels[item.type]} · {item.dueDate?dateLabel(item.dueDate):'Prazo a definir'}</p><p className="ra-muted">Último teste: {item.lastDate?dateLabel(item.lastDate):'Não Informado'}. {item.timeline?`Prazo da Matriz: ${item.timeline}. `:''}{item.reason}</p></div>)}{result.initial.length>0 && <p className="ra-muted">Sem avaliação válida registrada: {result.initial.map(t=>assessmentLabels[t]).join(' · ')}. O treinador pode escolher quais se aplicam ao atleta.</p>}{result.completed.length>0 && <p className="ra-accent">Já realizadas neste agendamento: {result.completed.map(t=>assessmentLabels[t]).join(' · ')}.</p>}<p className="ra-muted">Padrões operacionais LB de 30, 60 e 90 dias. O treinador pode antecipar ou ajustar conforme sintomas, evolução e calendário esportivo. Manter o mesmo protocolo e considerar a variação habitual do teste.</p><button type="button" onClick={onAssess} className="ra-button">Abrir avaliações do atleta</button></div>}
  {editing && <form onSubmit={e=>{e.preventDefault();void submit();}} className="ra-details ra-form"><fieldset disabled={saving}><legend className="sr-only">Agendamento da reavaliação</legend><label className="ra-label ra-date-label">Data da reavaliação<input type="date" required value={date} onChange={e=>setDate(e.target.value)} className="ra-input bg-brand-dark"/></label><p className="ra-label">Avaliações a realizar</p><div className="ra-tests">{Object.entries(assessmentLabels).map(([type,label])=><label key={type} className="ra-check"><input type="checkbox" checked={tests.includes(type as AssessmentType)} onChange={e=>setTests(prev=>e.target.checked?[...prev,type as AssessmentType]:prev.filter(t=>t!==type))}/>{label}</label>)}</div></fieldset><div className="ra-actions"><button disabled={saving} className="ra-button ra-primary">{saving?'Salvando…':'Salvar agendamento'}</button><button type="button" disabled={saving} onClick={()=>{setEditing(false);onClose?.();}} className="ra-button">Cancelar</button>{result.manual && <button type="button" disabled={saving} onClick={()=>void submit(true)} className="ra-button">Usar sugestão da Matriz</button>}</div></form>}
 </section>;
}
