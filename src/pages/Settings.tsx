import React from 'react';
import { Link } from 'react-router-dom';
import { UserWithPlan } from '../types';
export default function Settings({user}:{user:UserWithPlan}) {
 const items = [
  {to:'/acessos',title:'Acessos e convites',text:'Cadastrar organizações, convidar treinadores e vincular o acesso dos alunos.'},
  ...(user.platformAdmin ? [
   {to:'/assinaturas#planos',title:'Planos e pacotes',text:'Criar pacotes para alunos e treinadores, com valor, duração e limite de atletas.'},
   {to:'/assinaturas#liberacoes',title:'Liberações e assinaturas',text:'Vincular plano, liberar testes e cortesias, renovar ou suspender assinaturas.'},
   {to:'/assinaturas#cobrancas',title:'Cobranças e vencimentos',text:'Consultar assinaturas pendentes, vencidas e próximas de vencer.'},
   {to:'/assinaturas#pagamentos',title:'Pagamentos e recebimentos',text:'Registrar pagamentos confirmados e consultar o histórico financeiro.'},
   {to:'/supervisao',title:'Supervisão e mentoria',text:'Acompanhar os atletas e as prescrições das organizações vinculadas.'}
  ] : [{to:'/assinaturas',title:'Minha assinatura',text:'Consultar seu plano, prazo de acesso e histórico de pagamentos.'}])
 ];
 return <main className="admin-page min-h-screen bg-slate-950 text-slate-100 p-5 space-y-6"><Link to="/hub" className="text-green-400">← Voltar ao aplicativo</Link><h1 className="text-3xl font-bold">Configurações</h1><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{items.map(item=><Link key={item.to} to={item.to} className="bg-slate-800 border border-slate-500 rounded-xl p-5 hover:border-green-400 focus-visible:outline-green-400"><h2 className="text-xl font-bold text-green-300">{item.title}</h2><p className="mt-3 text-slate-100">{item.text}</p></Link>)}</div><p className="bg-slate-800 p-4 rounded-xl">Nesta etapa, os recebimentos são confirmados manualmente. O pagamento online automático será integrado depois.</p></main>;
}
