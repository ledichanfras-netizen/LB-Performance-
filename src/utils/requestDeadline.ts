export class RequestTimeout extends Error{constructor(){super('O servidor não confirmou a operação no prazo. Sincronize antes de tentar novamente; o rascunho foi preservado.');this.name='RequestTimeout';}}
/** Includes response body; a stalled response cannot hold the write queue forever. */
export async function fetchWithDeadline(url:string,options:RequestInit={},timeoutMs=45000,fetcher:typeof fetch=fetch):Promise<Response>{
 const controller=new AbortController();const abort=()=>controller.abort();
 if(options.signal?.aborted)abort();else options.signal?.addEventListener('abort',abort,{once:true});
 let expired=false;let timer:ReturnType<typeof setTimeout>;
 const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{expired=true;controller.abort();reject(new RequestTimeout());},timeoutMs);});
 const work=(async()=>{const response=await fetcher(url,{...options,signal:controller.signal});const body=[204,205,304].includes(response.status)?null:await response.arrayBuffer();return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});})();
 try{return await Promise.race([work,deadline]);}catch(error){if(expired)throw new RequestTimeout();throw error;}
 finally{clearTimeout(timer!);options.signal?.removeEventListener('abort',abort);}
}
