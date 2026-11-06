import type { Workout } from '../types';
export type SessionDraft={version:1;baseUpdatedAt?:string;session:Workout;elapsedSeconds:number;savedAt:number;date:string;rpe:number;rpeAnswered?:boolean;duration:string;feedback:string};
export function browserDraftStorage():Storage|null{try{return typeof window==='undefined'?null:window.localStorage;}catch{return null;}}
export function readAnySessionDraft(storage:Pick<Storage,'getItem'>|null,key:string|undefined,workout:Workout):SessionDraft|null{
 if(!storage||!key||workout.status==='completed')return null;
 try{const d=JSON.parse(storage.getItem(key)||'null');if(d?.version!==1||d.session?.id!==workout.id||!Array.isArray(d.session?.exercises)||!Number.isFinite(d.elapsedSeconds)||d.elapsedSeconds<0||!Number.isFinite(d.savedAt))return null;return d;}catch{return null;}
}
export function readSessionDraft(storage:Pick<Storage,'getItem'>|null,key:string|undefined,workout:Workout):SessionDraft|null{
 const d=readAnySessionDraft(storage,key,workout);return d&&d.baseUpdatedAt===workout.updatedAt?d:null;
}
export function writeSessionDraft(storage:Pick<Storage,'setItem'> & Partial<Pick<Storage,'getItem'>>|null,key:string|undefined,draft:SessionDraft){
 if(!storage||!key)return false;
 try{const previous=storage.getItem?.(key);if(previous){const old=JSON.parse(previous);if(old?.version===1&&old.baseUpdatedAt!==draft.baseUpdatedAt){storage.setItem(`${key}:recovery:${old.savedAt}`,previous);}}storage.setItem(key,JSON.stringify(draft));return true;}catch{return false;}
}
export function clearSessionDraft(storage:Pick<Storage,'removeItem'>|null,key:string|undefined){if(storage&&key)try{storage.removeItem(key);}catch{}}
/** Copy only results whose exercise and set IDs still belong to the new prescription. */
export function recoverDraftResults(workout:Workout,draft:SessionDraft):Workout{
 return {...workout,status:'in_progress',exercises:workout.exercises.map(ex=>{const old=draft.session.exercises.find(e=>e.id===ex.id);if(!old)return ex;const allowed=new Set((ex.performedSets||[]).map(s=>s.id));return {...ex,performedSets:(ex.performedSets||[]).map(s=>{const saved=old.performedSets?.find(o=>o.id===s.id);return saved&&allowed.has(saved.id)?{...saved}:s;})};})};
}

/** Persisted elapsed time excludes the period when the application was closed. */
export function resumedElapsedSeconds(draft:SessionDraft|null){return draft?.elapsedSeconds??0;}
export function resumedDurationNeedsConfirmation(draft:SessionDraft|null,now=Date.now()){return Boolean(draft&&now-draft.savedAt>120000);}
