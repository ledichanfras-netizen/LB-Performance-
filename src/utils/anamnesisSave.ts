import type {AnamnesisRecord} from '../types';

export async function persistAnamnesisHistory(
  request:(url:string, options:RequestInit)=>Promise<Response>,
  athlete:{id:string;syncRevision?:string}, history:AnamnesisRecord[], token:string
) {
  const response=await request(`/api/atletas/${encodeURIComponent(athlete.id)}/anamnesis`, {
    method:'PUT', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
    body:JSON.stringify({history,baseRevision:athlete.syncRevision})
  });
  const receipt=await response.json();
  if(!response.ok) throw new Error(receipt.error || 'A anamnese ainda não foi confirmada no banco.');
  const revision=receipt.syncRevisions?.[athlete.id];
  if(receipt.confirmed!==true || receipt.athleteId!==athlete.id || typeof revision!=='string' || !Number.isFinite(Date.parse(revision)) ||
      JSON.stringify(receipt.anamnesis)!==JSON.stringify(history)) throw new Error('O servidor não confirmou todas as respostas da anamnese.');
  return {history:receipt.anamnesis as AnamnesisRecord[],revision};
}
