import React from 'react';
export default function DataLoadState({title,error,onRetry,onBack}:{title:string;error?:string|null;onRetry?:()=>void;onBack?:()=>void}){
 return <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-slate-50 text-slate-900" data-testid="data-load-state">
  <section className="w-full max-w-md rounded-3xl bg-white border border-emerald-200 p-7 text-center shadow-sm" aria-live="polite">
   <img src="/pwa-192x192.svg" alt="LB Performance" className="w-16 h-16 mx-auto mb-5 rounded-2xl"/>
   {!error&&<div className="w-8 h-8 mx-auto mb-4 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" aria-hidden="true"/>}
   <h1 className="text-xl font-bold">{error?'Não foi possível carregar os dados':title}</h1>
   <p className="mt-3 text-sm text-slate-600">{error||'Aguarde enquanto buscamos as informações desta tela.'}</p>
   {error&&onRetry&&<button type="button" onClick={onRetry} className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white">Tentar novamente</button>}
   {onBack&&<button type="button" onClick={onBack} className="block mx-auto mt-4 px-4 py-3 text-emerald-800 font-bold">Voltar ao painel</button>}
  </section>
 </div>;
}
