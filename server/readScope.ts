import { ScopeDenied } from './scope';
/** Organization scope is mandatory, regardless of rollout flags. */
export function sportsReadScope(account:any){
 if(!account||typeof account.organization_id!=='string'||!account.organization_id||!['coach','athlete'].includes(account.role)||(account.role==='athlete'&&!account.athlete_id))throw new ScopeDenied();
 return account;
}
