// Permission comes from the live persisted membership, never from plan or JWT flags.
export function hasAIAccess(account:any):boolean {
 return !!account && account.active!==false && account.role==='coach' && (account.platform_admin===true || account.ai_enabled===true);
}
export function requireAIAccess(req:any,res:any,next:any){
 if(!hasAIAccess(req.account))return res.status(403).json({error:'IA não liberada para esta conta. Use a análise e a prescrição manual.',code:'AI_NOT_ALLOWED'});
 next();
}
