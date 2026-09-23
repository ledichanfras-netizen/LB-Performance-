import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Save, ChevronRight, AlertTriangle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

type MetricDef={code:string;label:string;unit:string};
const DEFS:Record<string,MetricDef[]>={
 IMTP:[
  {code:"peak_force",label:"Força Pico",unit:"N"},{code:"peak_force_kgf",label:"Força Pico",unit:"kgf"},
  {code:"relative_force",label:"Força Relativa",unit:"N/kg"},{code:"impulse_100ms",label:"Impulso 0–100 ms",unit:"N·s"},
  {code:"impulse_200ms",label:"Impulso 0–200 ms",unit:"N·s"},{code:"rfd_100ms",label:"TDF 0–100 ms",unit:"N/s"},
  {code:"rfd_200ms",label:"TDF 0–200 ms",unit:"N/s"}
 ],
 CMJ:[
  {code:"jump_height",label:"Altura do Salto",unit:"cm"},{code:"peak_power",label:"Potência Pico",unit:"W"},
  {code:"relative_power",label:"Potência Relativa",unit:"W/kg"},{code:"contraction_time",label:"Tempo de Contração",unit:"ms"},
  {code:"eccentric_impulse",label:"Impulso Excêntrico",unit:"N·s"},{code:"concentric_impulse",label:"Impulso Concêntrico",unit:"N·s"}
 ],
 DROP_JUMP:[
  {code:"drop_height",label:"Altura de Queda",unit:"cm"},{code:"jump_height",label:"Altura do Salto",unit:"cm"},
  {code:"contact_time",label:"Tempo de Contato",unit:"ms"},{code:"rsi",label:"RSI",unit:"m/s"}
 ],
 ISOMETRIC_STRENGTH:[
  {code:"quadriceps_right",label:"Quadríceps Direito",unit:"kgf"},{code:"quadriceps_left",label:"Quadríceps Esquerdo",unit:"kgf"},
  {code:"hamstrings_right",label:"Isquiotibiais Direito",unit:"kgf"},{code:"hamstrings_left",label:"Isquiotibiais Esquerdo",unit:"kgf"},
  {code:"quadriceps_asymmetry",label:"Assimetria Quadríceps",unit:"%"},{code:"hamstrings_asymmetry",label:"Assimetria Isquiotibiais",unit:"%"},
  {code:"hq_right",label:"Relação I/Q Direita",unit:"%"},{code:"hq_left",label:"Relação I/Q Esquerda",unit:"%"}
 ],
 SPEED:[
  {code:"sprint_10m",label:"10 m",unit:"s"},{code:"sprint_20m",label:"20 m",unit:"s"},{code:"sprint_30m",label:"30 m",unit:"s"}
 ],
 VO2:[
  {code:"vo2max",label:"VO₂máx",unit:"ml/kg/min"},{code:"vvo2max",label:"vVO₂máx",unit:"km/h"},
  {code:"hr_max",label:"FC Máxima",unit:"bpm"},{code:"vt1",label:"Limiar 1",unit:"km/h"},{code:"vt2",label:"Limiar 2",unit:"km/h"}
 ],
 BIOIMPEDANCE:[
  {code:"body_mass",label:"Massa Corporal",unit:"kg"},{code:"body_fat",label:"Gordura Corporal",unit:"%"},
  {code:"muscle_mass",label:"Massa Muscular",unit:"kg"},{code:"fat_mass",label:"Massa Gorda",unit:"kg"}
 ]
};
const readUser=()=>{try{return JSON.parse(localStorage.getItem("lb_user")||"null")}catch{return null}};
export default function LbAssessmentResults(){
 const {groupId}=useParams(); const navigate=useNavigate();
 const [data,setData]=useState<any>(null); const [active,setActive]=useState(0);
 const [values,setValues]=useState<Record<string,Record<string,string>>>({});
 const [saving,setSaving]=useState(false); const [message,setMessage]=useState(""); const [error,setError]=useState("");
 const load=async()=>{
  const u=readUser(); if(!u?.token||!groupId){setError("Sessão inválida ou expirada.");return;}
  try{const r=await fetch(`/api/lb/assessment-sessions/${groupId}`,{headers:{Authorization:`Bearer ${u.token}`}});const p=await r.json();if(!r.ok)throw new Error(p?.error||`HTTP ${r.status}`);
   setData(p); const next:Record<string,Record<string,string>>={}; for(const s of p.sessions||[]){next[s.id]={}; for(const m of s.metrics||[])next[s.id][m.metricCode]=m.valueNumeric!==null&&m.valueNumeric!==undefined?String(m.valueNumeric):(m.valueText||"");} setValues(next);
  }catch(e:any){setError(e.message||"Erro ao carregar sessão.");}
 };
 useEffect(()=>{load()},[groupId]);
 const sessions=data?.sessions||[]; const current=sessions[active];
 const defs=useMemo(()=>current?DEFS[current.test_type]||[]:[],[current]);
 const completed=(s:any)=>Array.isArray(s.metrics)&&s.metrics.length>0;
 const save=async()=>{
  if(!current)return; const u=readUser(); const map=values[current.id]||{}; const metrics=defs.filter(d=>map[d.code]!==undefined&&map[d.code]!=="").map(d=>({metricCode:d.code,valueNumeric:map[d.code],unit:d.unit,isValid:true}));
  if(!metrics.length){setError("Preencha ao menos um resultado antes de salvar.");return;}
  setSaving(true);setError("");setMessage("");
  try{const r=await fetch(`/api/lb/assessment-sessions/${current.id}/metrics`,{method:"PUT",headers:{"Content-Type":"application/json",Authorization:`Bearer ${u.token}`},body:JSON.stringify({metrics})});const p=await r.json();if(!r.ok)throw new Error(p?.error||`HTTP ${r.status}`);
   setMessage(`${current.test_type}: resultados salvos.`); await load(); if(active<sessions.length-1)setActive(active+1);
  }catch(e:any){setError(e.message||"Erro ao salvar.");}finally{setSaving(false)}
 };
 if(!data)return <div className="min-h-screen bg-slate-950 text-white p-8">{error||"Carregando Sessão LB..."}</div>;
 const done=sessions.filter(completed).length;
 return <div className="min-h-screen bg-slate-950 text-white">
  <header className="border-b border-slate-800 sticky top-0 z-20 bg-slate-950/95 backdrop-blur"><div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex justify-between items-center"><button onClick={()=>navigate("/hub/metodo-lb/avaliar")} className="flex gap-2 items-center text-xs font-black uppercase text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4"/> Nova sessão</button><div className="text-right"><p className="text-[10px] text-emerald-400 font-black tracking-[.25em] uppercase">Sessão LB em andamento</p><h1 className="font-black uppercase">{sessions[0]?.athlete_name}</h1></div></div></header>
  <main className="max-w-6xl mx-auto p-4 md:p-8">
   <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 mb-6"><div className="flex justify-between gap-4 items-center"><div><p className="text-xs text-slate-500 uppercase font-black tracking-widest">Progresso</p><p className="text-2xl font-black mt-1">{done}/{sessions.length} avaliações preenchidas</p></div><div className="text-right text-xs text-slate-500">{sessions[0]?.protocol_version}<br/>{sessions[0]?.quality_flag}</div></div><div className="h-2 rounded-full bg-slate-800 mt-4 overflow-hidden"><div className="h-full bg-emerald-400" style={{width:`${sessions.length?done/sessions.length*100:0}%`}}/></div></section>
   {error&&<div className="mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300">{error}</div>}
   {message&&<div className="mb-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex gap-2"><CheckCircle2 className="w-5 h-5"/>{message}</div>}
   <div className="grid lg:grid-cols-[300px_1fr] gap-6">
    <aside className="space-y-2">{sessions.map((s:any,i:number)=><button key={s.id} onClick={()=>{setActive(i);setMessage("");setError("")}} className={`w-full rounded-2xl border p-4 text-left flex items-center gap-3 ${i===active?"border-emerald-400 bg-emerald-400/10":"border-slate-800 bg-slate-900"}`}><div className={`w-8 h-8 rounded-full flex items-center justify-center ${completed(s)?"bg-emerald-400 text-slate-950":"bg-slate-800 text-slate-400"}`}>{completed(s)?<CheckCircle2 className="w-4 h-4"/>:<span className="text-xs font-black">{i+1}</span>}</div><div><p className="font-black text-sm">{s.test_type.replace("_"," ")}</p><p className="text-[10px] text-slate-500">{completed(s)?"PREENCHIDO":"PENDENTE"}</p></div><ChevronRight className="w-4 h-4 ml-auto text-slate-600"/></button>)}</aside>
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
     <div className="mb-6"><p className="text-[10px] font-black text-emerald-400 uppercase tracking-[.25em]">Inserir resultados</p><h2 className="text-3xl font-black mt-1">{current?.test_type.replace("_"," ")}</h2><p className="text-sm text-slate-500 mt-2">Registre os valores medidos. Métricas ausentes podem permanecer em branco.</p></div>
     {defs.length?<div className="grid sm:grid-cols-2 gap-4">{defs.map(d=><label key={d.code} className="space-y-2"><span className="text-[10px] uppercase font-black tracking-widest text-slate-500">{d.label}</span><div className="flex"><input type="number" step="any" inputMode="decimal" value={values[current.id]?.[d.code]||""} onChange={e=>setValues(v=>({...v,[current.id]:{...(v[current.id]||{}),[d.code]:e.target.value}}))} className="min-w-0 flex-1 bg-slate-950 border border-slate-700 rounded-l-xl px-4 py-3 outline-none focus:border-emerald-400"/><span className="px-3 py-3 bg-slate-800 border border-l-0 border-slate-700 rounded-r-xl text-xs text-slate-400 flex items-center">{d.unit}</span></div></label>)}</div>:<div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-200 flex gap-3"><AlertTriangle className="w-5 h-5"/><span>Este protocolo ainda não possui campos configurados.</span></div>}
     <button onClick={save} disabled={saving||!defs.length} className="mt-8 w-full py-4 rounded-2xl bg-emerald-400 text-slate-950 font-black uppercase tracking-widest text-xs disabled:opacity-40 flex justify-center gap-2 items-center"><Save className="w-4 h-4"/>{saving?"Salvando...":active<sessions.length-1?"Salvar e próxima avaliação":"Salvar resultados"}</button>
     {done===sessions.length&&<div className="mt-5 p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10"><p className="font-black text-emerald-300">AVALIAR concluído</p><p className="text-xs text-slate-400 mt-1">Todos os testes possuem resultados. A próxima etapa será INTERPRETAR, sem alterar os dados brutos registrados.</p></div>}
    </section>
   </div>
  </main>
 </div>
}
