/** Namespace only; decoded claims must never authorize API access. */
export function athleteCacheKey(token?:string|null):string {
 if(!token) return 'lb_athletes_cache:guest';
 try{
 const part=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
 const payload=JSON.parse(atob(part));
 const identity=payload.id || payload.username;
 if(typeof identity!=='string') return 'lb_athletes_cache:invalid';
 if(payload.supervision===true)return `lb_athletes_cache:supervision:${encodeURIComponent(payload.organizationId || '')}:${encodeURIComponent(payload.supervisedUserId || '')}:${encodeURIComponent(identity)}`;
 return `lb_athletes_cache:${encodeURIComponent(payload.organizationId || 'legacy')}:${encodeURIComponent(identity)}`;
 }catch{return 'lb_athletes_cache:invalid';}
}
export function clearAthleteCaches(storage:Pick<Storage,'length'|'key'|'removeItem'>){
 const keys:string[]=[];
 for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key?.startsWith('lb_athletes_cache'))keys.push(key);}
 keys.forEach(key=>storage.removeItem(key));
}

/** UI behavior only; the server validates every supervised request. */
export function isSupervisedToken(token?:string|null):boolean {
 try{return JSON.parse(atob((token || '').split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).supervision===true;}catch{return false;}
}
