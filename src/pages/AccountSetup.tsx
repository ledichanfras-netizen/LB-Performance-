import React, { useState } from 'react';
import { Link } from 'react-router-dom';
export default function AccountSetup() {
 const [token,setToken]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 const call=async(e:React.FormEvent<HTMLFormElement>,path:string)=>{
  e.preventDefault();setBusy(true);setMessage('');const form=e.currentTarget;
  const body=Object.fromEntries(new FormData(form));
  try{const response=await fetch(`/api/accounts/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});const data=await response.json();if(!response.ok) throw Error(data.error);if(path==='login'){if(!data.platformAdmin) throw Error('Esta área é reservada à administração.');setToken(data.token);setMessage('Administração autenticada.');}else if(path==='accept'){setMessage('Conta criada. O acesso esportivo será liberado após validação da migração.');form.reset();}else if(path==='organizations') setMessage(`Organização criada: ${data.id}`);else setMessage(`Convite: ${data.token}\nExpira em: ${new Date(data.expires_at).toLocaleString('pt-BR')}`);
  }catch(err){setMessage((err as Error).message);}finally{setBusy(false);}
 };
 const input='text-black p-2 rounded w-full';
 return <main className="min-h-screen bg-slate-950 text-white p-6 space-y-6 max-w-3xl mx-auto"><Link to="/hub">← Voltar</Link><h1 className="text-3xl font-bold">Contas por convite</h1><p>Piloto de cadastro. Esta área ainda não libera acesso aos dados esportivos.</p>
 {message && <p role="status" className="whitespace-pre-wrap break-all bg-slate-800 p-4">{message}</p>}
 <form onSubmit={e=>call(e,'accept')} className="space-y-3"><h2>Aceitar convite</h2><label className="block">Código do convite<input className={input} required name="token" pattern="[a-f0-9]{64}" autoComplete="off" /></label><label className="block">Nova senha (mínimo 12 caracteres)<input className={input} required name="password" type="password" minLength={12} autoComplete="new-password" /></label><button disabled={busy} className="bg-green-700 p-2">Criar minha conta</button></form>
 {!token?<form onSubmit={e=>call(e,'login')} className="space-y-3"><h2>Administração</h2><label className="block">Usuário<input required className={input} name="username" autoComplete="username" /></label><label className="block">Senha<input required className={input} name="password" type="password" autoComplete="current-password" /></label><button disabled={busy} className="bg-green-700 p-2">Entrar</button></form>:<>
 <button onClick={()=>{setToken('');setMessage('');}}>Sair da administração</button>
 <form onSubmit={e=>call(e,'organizations')} className="space-y-3"><h2>Criar espaço do treinador</h2><label className="block">Nome<input required className={input} name="name" maxLength={100} /></label><button disabled={busy} className="bg-green-700 p-2">Criar organização</button></form>
 <form onSubmit={e=>call(e,'invites')} className="space-y-3"><h2>Convidar treinador</h2><input type="hidden" name="role" value="coach"/><label className="block">Identificador da organização<input required className={input} name="organizationId"/></label><label className="block">Usuário do treinador<input required className={input} name="username" pattern="[a-zA-Z0-9._@-]{3,100}"/></label><button disabled={busy} className="bg-green-700 p-2">Gerar convite</button></form></>}
 </main>;
}
