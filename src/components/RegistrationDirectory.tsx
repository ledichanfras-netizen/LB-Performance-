import React,{useState} from 'react';
import {X,Search,Users} from 'lucide-react';
import toast from 'react-hot-toast';
import type {Athlete} from '../types';
import {isAssessmentOnly,type FollowUpType} from '../utils/followUp';

export default function RegistrationDirectory({athletes,readOnly=false,onClose,onOpen,onChangeType}:{athletes:Athlete[];readOnly?:boolean;onClose:()=>void;onOpen:(id:string)=>void;onChangeType:(ids:string[],type:FollowUpType)=>Promise<void>}){
 const [filter,setFilter]=useState<'athlete'|'assessment-only'|'all'>('athlete');
 const [query,setQuery]=useState(''),[selected,setSelected]=useState<string[]>([]),[saving,setSaving]=useState(false);
 const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
 const visible=athletes.filter(a=>(filter==='all'||(isAssessmentOnly(a)?'assessment-only':'athlete')===filter)&&normalize(a.name).includes(normalize(query)));
 const change=async(type:FollowUpType)=>{setSaving(true);try{await onChangeType(selected,type);setSelected([]);}catch(e:any){toast.error(e.message||'Não foi possível salvar.');}finally{setSaving(false);}};
 return <div className="lb-reassessment fixed inset-0 z-[1100] bg-slate-950/90 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="directory-title">
  <section className="lb-surface-card max-w-4xl mx-auto rounded-3xl p-5 sm:p-8 space-y-5">
   <div className="flex items-start justify-between gap-3"><div><h2 id="directory-title" className="text-xl font-black text-brand-primary uppercase flex items-center gap-2"><Users size={22}/>Atletas e Alunos</h2><p className="text-sm text-slate-400 mt-2">Alunos mantêm avaliações, evolução e relatórios, sem monitoramento de treinos ou prazos de reavaliação.</p></div><button type="button" disabled={saving} onClick={onClose} aria-label="Fechar cadastros" className="ra-button"><X size={20}/></button></div>
   <div className="flex flex-wrap gap-2" aria-label="Filtrar cadastros">{([{id:'athlete',label:'Atletas'},{id:'assessment-only',label:'Alunos'},{id:'all',label:'Todos'}] as const).map(f=><button type="button" key={f.id} onClick={()=>{setFilter(f.id);setSelected([]);}} aria-pressed={filter===f.id} disabled={saving} className={`ra-button ${filter===f.id?'ra-primary':''}`}>{f.label} ({athletes.filter(a=>f.id==='all'||(isAssessmentOnly(a)?'assessment-only':'athlete')===f.id).length})</button>)}</div>
   <label className="flex items-center gap-2"><Search size={18}/><span className="sr-only">Buscar cadastro</span><input type="search" value={query} onChange={e=>{setQuery(e.target.value);setSelected([]);}} placeholder="Buscar por nome…" disabled={saving} className="ra-input bg-brand-dark w-full"/></label>
   {!readOnly && <div className="flex flex-wrap items-center gap-3"><label className="text-sm text-slate-300 flex gap-2"><input type="checkbox" disabled={saving||!visible.length} checked={visible.length>0&&visible.every(a=>selected.includes(a.id))} onChange={e=>setSelected(e.target.checked?visible.map(a=>a.id):[])}/>Selecionar todos deste filtro</label><span className="text-xs text-slate-400">{selected.length} selecionados</span></div>}
   {!readOnly && selected.length>0 && <div className="flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={()=>void change('assessment-only')} className="ra-button ra-primary">{saving?'Salvando…':'Mover para Alunos — somente avaliações'}</button><button type="button" disabled={saving} onClick={()=>void change('athlete')} className="ra-button">Mover para Atletas</button></div>}
   <ul className="divide-y divide-slate-800">{visible.map(a=><li key={a.id} className="flex items-center gap-3 py-4">{!readOnly&&<input type="checkbox" aria-label={`Selecionar ${a.name}`} disabled={saving} checked={selected.includes(a.id)} onChange={e=>setSelected(prev=>e.target.checked?[...prev,a.id]:prev.filter(id=>id!==a.id))}/>}<div className="min-w-0 flex-1"><p className="font-bold text-slate-200 break-words">{a.name}</p><p className="text-xs text-slate-400 mt-1">{isAssessmentOnly(a)?'Aluno — somente avaliações':'Atleta — acompanhamento de performance'}</p></div><button type="button" disabled={saving} className="ra-button" onClick={()=>onOpen(a.id)}>{isAssessmentOnly(a)?'Avaliações':'Abrir perfil'}</button></li>)}</ul>
   {!visible.length&&<p className="text-sm text-slate-400 py-6 text-center">Nenhum cadastro neste filtro.</p>}
   <p className="text-xs text-slate-400">Mudar o acompanhamento preserva avaliações e histórico. Os cadastros existentes permanecem como Atletas até você alterá-los.</p>
  </section>
 </div>;
}
