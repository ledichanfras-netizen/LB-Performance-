import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserWithPlan } from '../types';

type Plan = { id: string; name: string; price_cents: number; duration_days: number };
type Subscription = { id: string; username: string; plan_name: string; status: string; valid_until: string | null };
const labels: Record<string,string> = { active:'Ativo', grace:'Em tolerância', expired:'Vencido', pending:'Aguardando liberação', suspended:'Suspenso' };
export default function Billing({ user }: { user: UserWithPlan }) {
  const [data, setData] = useState<{admin:boolean;plans:Plan[];subscriptions:Subscription[];users:{id:string;username:string}[]} | null>(null);
  const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const request = async (path:string, body?:unknown) => {
    const response=await fetch(`/api/billing/${path}`,{headers:{Authorization:`Bearer ${user.token}`, 'Content-Type':'application/json'},method:body?'POST':'GET',body:body?JSON.stringify(body):undefined,cache:'no-store'});
    const result=await response.json(); if(!response.ok) throw Error(result.error || 'Falha ao carregar'); return result;
  };
  const load=async()=>setData(await request('overview'));
  useEffect(()=>{load().catch(e=>setError(e.message));},[user.token]);
  const submit=async(event:React.FormEvent<HTMLFormElement>,path:string,transform:(f:FormData)=>unknown)=>{
    event.preventDefault(); const form=event.currentTarget;setBusy(true);setError('');
    try{await request(path,transform(new FormData(form)));await load();form.reset();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  };
  return <main className="min-h-screen bg-slate-950 text-white p-6 space-y-6"><Link to="/hub" className="text-green-400">← Voltar ao aplicativo</Link>
    <h1 className="text-3xl font-bold">{data?.admin?'Gestão de planos e assinaturas':'Minha assinatura'}</h1>
    <p>Pagamentos confirmados manualmente. Cortesias e testes não são registrados como receita.</p>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {!data && !error && <p>Carregando…</p>}
    {data?.admin && <section className="grid md:grid-cols-2 gap-6">
      <form className="bg-slate-800 p-4 space-y-3" onSubmit={e=>submit(e,'plans',f=>({name:f.get('name'),audience:f.get('audience'),priceCents:Math.round(Number(f.get('price'))*100),durationDays:Number(f.get('days'))}))}>
        <h2 className="font-bold">Criar plano</h2><label className="block">Nome <input required name="name" maxLength={100} className="text-black" /></label>
        <label className="block">Público <select name="audience" className="text-black"><option value="athlete">Aluno</option><option value="coach">Treinador</option></select></label>
        <label className="block">Valor em R$ <input required name="price" type="number" min="0" step="0.01" className="text-black" /></label>
        <label className="block">Duração em dias <input required name="days" type="number" min="1" max="366" defaultValue="30" className="text-black" /></label><button disabled={busy} className="bg-green-700 px-4 py-2">Salvar plano</button>
      </form>
      <form className="bg-slate-800 p-4 space-y-3" onSubmit={e=>submit(e,'subscriptions',f=>({userId:f.get('userId'),planId:f.get('planId')}))}>
        <h2 className="font-bold">Vincular assinatura</h2><label className="block">Conta <select required name="userId" className="text-black"><option value="">Selecione</option>{data.users.map(u=><option key={u.id} value={u.id}>{u.username}</option>)}</select></label>
        <label className="block">Plano <select required name="planId" className="text-black"><option value="">Selecione</option>{data.plans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button disabled={busy} className="bg-green-700 px-4 py-2">Vincular</button>
      </form></section>}
    {data?.subscriptions.length===0 && <p>Nenhuma assinatura cadastrada.</p>}
    {data?.subscriptions.map(s=><section key={s.id} className="bg-slate-800 p-4 rounded space-y-3"><h2 className="font-bold">{s.username} — {s.plan_name}</h2><p>{labels[s.status] || s.status} · Até: {s.valid_until?new Date(s.valid_until).toLocaleString('pt-BR'):'Não liberado'}</p>
      {data.admin && <form className="flex flex-wrap gap-3" onSubmit={e=>submit(e,`subscriptions/${s.id}/renew`,f=>({requestId:crypto.randomUUID(),amountCents:Math.round(Number(f.get('amount'))*100),method:f.get('method'),reason:f.get('reason')}))}>
        <label>Valor R$ <input required name="amount" type="number" min="0" step="0.01" className="text-black w-24" /></label>
        <label>Forma <select name="method" className="text-black"><option value="pix">Pix</option><option value="cash">Dinheiro</option><option value="transfer">Transferência</option><option value="payment_link">Link de pagamento</option><option value="courtesy">Cortesia (R$ 0)</option><option value="trial">Teste (R$ 0)</option></select></label>
        <label>Referência ou motivo <input required name="reason" maxLength={500} className="text-black" /></label><button disabled={busy} className="bg-green-700 px-4 py-2">Registrar e renovar</button>
      </form>}
    </section>)}
  </main>;
}
