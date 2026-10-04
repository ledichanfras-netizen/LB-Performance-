// Temporary session only: never replaces the administrator's persisted login.
let currentToken:string|null=null;
export function setSupervisionToken(token:string|null){currentToken=token;}
export function getEffectiveSessionToken():string|null{
 if(currentToken)return currentToken;
 try{return JSON.parse(localStorage.getItem('lb_user') || 'null')?.token || null;}catch{return null;}
}
