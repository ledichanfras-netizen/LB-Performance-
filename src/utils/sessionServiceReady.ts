import {fetchWithDeadline} from './requestDeadline';
/** Safe reads wake an idle service before any write is submitted. No idle keep-alive polling. */
export async function ensureSessionServiceReady(fetcher:typeof fetch=fetch,options:{maxWaitMs?:number;pollMs?:number;requestTimeoutMs?:number}={}){
 const until=Date.now()+(options.maxWaitMs??120000);
 while(Date.now()<until){
  try{
   const response=await fetchWithDeadline('/api/health',{cache:'no-store'},Math.min(options.requestTimeoutMs??30000,Math.max(1,until-Date.now())),fetcher);
   if(response.ok){let data:any;try{data=await response.json();}catch{}if(data?.status==='ok')return;}
  }catch{}
  const remaining=until-Date.now();if(remaining>0)await new Promise(r=>setTimeout(r,Math.min(options.pollMs??2000,remaining)));
 }
 throw Error('O serviço ainda não está disponível para confirmar a sessão. O rascunho foi preservado; tente novamente quando houver conexão.');
}
