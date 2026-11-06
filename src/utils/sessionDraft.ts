import type { Workout } from '../types';
export type SessionDraft={version:1;baseUpdatedAt?:string;session:Workout;elapsedSeconds:number;savedAt:number;date:string;rpe:number;rpeAnswered?:boolean;duration:string;feedback:string};
export function readSessionDraft(storage:Pick<Storage,'getItem'>,key:string|undefined,workout:Workout):SessionDraft|null{
 if(!key||workout.status==='completed')return null;
 try{const d=JSON.parse(storage.getItem(key)||'null');
  if(d?.version!==1||d.session?.id!==workout.id||!Array.isArray(d.session?.exercises)||d.baseUpdatedAt!==workout.updatedAt||!Number.isFinite(d.elapsedSeconds)||d.elapsedSeconds<0||!Number.isFinite(d.savedAt))return null;
  return d;
 }catch{return null;}
}
export function writeSessionDraft(storage:Pick<Storage,'setItem'>,key:string|undefined,draft:SessionDraft){if(!key)return false;try{storage.setItem(key,JSON.stringify(draft));return true;}catch{return false;}}
export function clearSessionDraft(storage:Pick<Storage,'removeItem'>,key:string|undefined){if(key)try{storage.removeItem(key);}catch{}}
