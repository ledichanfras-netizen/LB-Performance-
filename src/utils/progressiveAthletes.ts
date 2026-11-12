import type {Athlete} from '../types';
/** A summary is never a replacement snapshot. Only unchanged complete details may be reused. */
export function mergeDashboardAthletes(local:Athlete[],summaries:Athlete[]):Athlete[]{
 const byId=new Map(local.map(a=>[a.id,a]));
 return summaries.map(summary=>{
  const previous=byId.get(summary.id);
  return previous && previous.historyComplete!==false && !!summary.syncRevision && previous.syncRevision===summary.syncRevision ? previous : summary;
 });
}
export function requireCompleteAthletes(athletes:Athlete[]){
 if(athletes.some(a=>a.historyComplete===false))throw Error('Carregue os dados completos do atleta antes de salvar ou exportar.');
}
