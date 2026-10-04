import type {Pool} from 'pg';
export async function canManageInvites(pool:Pick<Pool,'query'>,account:any,organizationId:string){
 if(account.role!=='coach' || account.active===false)return false;
 if(account.organization_id===organizationId)return true;
 if(!account.platform_admin)return false;
 const {rows}=await pool.query('SELECT 1 FROM lb_accounts.supervisor_links WHERE supervisor_id=$1 AND organization_id=$2',[account.user_id,organizationId]);
 return rows.length===1;
}
