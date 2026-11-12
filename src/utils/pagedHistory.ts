import type {Athlete,Workout} from '../types';
export class HistoryChangedError extends Error {}
type ReadJSON=(url:string)=>Promise<any>;
/** Partial data stays private until every page of every athlete has been validated. */
export async function loadPagedAthletes(read:ReadJSON,athleteId?:string):Promise<Athlete[]>{
 for(let attempt=0;attempt<2;attempt++){
  try{
   const initial=await read('/api/ler?history=paged'+(athleteId?'&athleteId='+encodeURIComponent(athleteId):''));
   if(!Array.isArray(initial))throw Error('Resposta de atletas inválida.');
   const result:Athlete[]=new Array(initial.length);let index=0;
   const worker=async()=>{
    while(index<initial.length){
     const i=index++,athlete=initial[i];
     if(!athlete||typeof athlete.id!=='string')throw Error('Cadastro inválido.');
     if(athlete.historyComplete!==false){result[i]=athlete;continue;}
     if(typeof athlete.syncRevision!=='string')throw Error('Histórico sem versão. Sincronize novamente.');
     if(!Number.isInteger(athlete.historyWorkoutCount)||athlete.historyWorkoutCount<0)throw Error('Contagem de histórico inválida.');
     if(athlete.historyWorkoutCount===0){result[i]={...athlete,workouts:[],historyComplete:true};continue;}
     const workouts:Workout[]=[],ids=new Set<string>(),cursors=new Set<string>();let cursor:string|null=null;
     do{
      const params=new URLSearchParams({limit:'20',revision:athlete.syncRevision});if(cursor)params.set('cursor',cursor);
      const page=await read(`/api/athletes/${encodeURIComponent(athlete.id)}/workouts?${params}`);
      if(page?.athleteId!==athlete.id||page.revision!==athlete.syncRevision)throw new HistoryChangedError();
      if(!Array.isArray(page.workouts)||page.workouts.length>20||(page.nextCursor!==null&&typeof page.nextCursor!=='string'))throw Error('Página de histórico inválida.');
      for(const workout of page.workouts){
       if(!workout||typeof workout.id!=='string'||ids.has(workout.id)||!Array.isArray(workout.exercises))throw Error('Histórico incompleto ou duplicado.');
       ids.add(workout.id);workouts.push(workout);
      }
      cursor=page.nextCursor;
      if(cursor){if(!page.workouts.length||cursors.has(cursor))throw Error('Paginação de histórico interrompida.');cursors.add(cursor);}
     }while(cursor);
     if(workouts.length!==athlete.historyWorkoutCount)throw new HistoryChangedError('Histórico incompleto. Sincronize novamente.');
     result[i]={...athlete,workouts,historyComplete:true};
    }
   };
   // Wait for both workers even after an error, before retrying a different revision.
   const workers=await Promise.allSettled(Array.from({length:Math.min(2,initial.length)},worker));
   const failure=workers.find((r):r is PromiseRejectedResult=>r.status==='rejected');if(failure)throw failure.reason;
   return result;
  }catch(error){if(!(error instanceof HistoryChangedError)||attempt===1)throw error;}
 }
 throw new HistoryChangedError('Histórico alterado durante a leitura.');
}
