import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { setSupervisionToken } from '../utils/supervisionSession';
export default function SupervisionFrame({name,token,onExit,children}:{name:string;token:string;onExit:()=>void;children:ReactNode}){
 useEffect(()=>{
  const expire=()=>{toast.error('A consulta de supervisão terminou. Reabra o treinador para continuar.');onExit();};
  let timeout:ReturnType<typeof setTimeout>|undefined;
  try{const claims=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));timeout=setTimeout(expire,Math.max(0,claims.exp*1000-Date.now()));}catch{expire();}
  window.addEventListener('lb:supervision-invalid',expire);
  return()=>{if(timeout)clearTimeout(timeout);window.removeEventListener('lb:supervision-invalid',expire);setSupervisionToken(null);};
 },[token,onExit]);
 const deny=(event:any)=>{event.preventDefault();event.stopPropagation();toast.error('Supervisão somente leitura. O treinador deve fazer as alterações.');};
 return <><aside className="sticky top-0 z-[3000] bg-amber-100 text-slate-950 border-b-2 border-amber-400 p-4 flex flex-wrap gap-4 items-center justify-between"><div><strong>Supervisão — {name} — Somente leitura</strong><p>Telas e nível de acesso do treinador. Sua conta principal permanece ativa.</p></div><Link to="/supervisao" onClick={onExit} className="bg-green-700 text-white px-5 py-3 rounded font-semibold">Voltar à minha organização</Link></aside><div onSubmitCapture={deny} onClickCapture={event=>{
 const button=(event.target as HTMLElement).closest('button');
 if(button && /\b(salvar|excluir|deletar|apagar|criar|adicionar|prescrever|gerar|importar|registrar|finalizar|concluir)\b/i.test((button.textContent || '')+' '+(button.getAttribute('title') || '')+' '+(button.getAttribute('aria-label') || '')))deny(event);
 }}>{children}</div></>;
}
