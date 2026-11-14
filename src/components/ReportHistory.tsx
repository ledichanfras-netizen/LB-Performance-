import React from 'react';
type Column={label:string;key:string;unit?:string};
/** Compact longitudinal values; empty measurements never become made-up zeroes. */
export default function ReportHistory({rows,columns,asOf}:{rows:any[];columns:Column[];asOf?:string}){
 const unique=new Map<string,any>();for(const row of rows){const key=row.id||row.date;if(!unique.has(key)&&(!asOf||String(row.date).slice(0,10)<=asOf.slice(0,10)))unique.set(key,row);}
 const selected=[...unique.values()].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
 const value=(v:any)=>v===undefined||v===null||v===''||!Number.isFinite(Number(v))?'Não informado':Number(v).toLocaleString('pt-BR',{maximumFractionDigits:2});
 return <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4"><h3 className="text-sm font-black text-slate-900">Histórico individual</h3><table className="w-full text-left"><thead><tr><th className="pb-3">Avaliação</th>{columns.map(c=><th key={c.key} className="pb-3">{c.label}{c.unit&&` (${c.unit})`}</th>)}</tr></thead><tbody>{selected.map(r=><tr key={r.id||r.date} className="border-t border-slate-200"><td className="py-3">{String(r.date||'').slice(0,10).split('-').reverse().join('/')||'Não informada'}</td>{columns.map(c=><td key={c.key} className="py-3">{value(r[c.key])}</td>)}</tr>)}</tbody></table>{selected.length<2&&<p className="text-xs text-slate-600">Primeira referência disponível. A evolução poderá ser comparada após uma nova avaliação com o mesmo protocolo.</p>}</section>;
}
