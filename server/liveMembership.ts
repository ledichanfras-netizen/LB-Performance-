import type {Pool} from 'pg';
export async function liveMembership(pool:Pick<Pool,'query'>,claims:any){
 const {rows}=await pool.query('SELECT m.*,u.role,u.athlete_id FROM lb_accounts.memberships m JOIN public.users u ON u.id=m.user_id WHERE m.user_id=$1 AND m.active',[claims.id]);
 const account=rows[0];
 if((claims.accountMode && claims.accountMode!=='scoped') || !account || account.session_version!==claims.sessionVersion || (claims.organizationId && account.organization_id!==claims.organizationId))throw Error('INVALID_SESSION');
 return account;
}
