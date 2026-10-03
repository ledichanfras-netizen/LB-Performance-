import type { Pool } from 'pg';
import type { AccountScope } from './scope';
export async function hasSportsAccess(db:Pick<Pool,'query'>,account:AccountScope & {platform_admin?:boolean}){
 if(account.platform_admin)return true;
 const own=await db.query(`SELECT NOT s.suspended AND s.valid_until + make_interval(days=>p.grace_days)>now() AS allowed
 FROM lb_billing.subscriptions s JOIN lb_billing.plans p ON p.id=s.plan_id WHERE s.user_id=$1`,[account.user_id]);
 if(own.rows.length)return own.rows[0].allowed===true;
 if(account.role!=='athlete')return false;
 const license=await db.query(`SELECT 1 FROM lb_accounts.memberships m JOIN public.users u ON u.id=m.user_id
 JOIN lb_billing.subscriptions s ON s.user_id=m.user_id JOIN lb_billing.plans p ON p.id=s.plan_id
 WHERE m.organization_id=$1 AND m.active AND u.role='coach' AND p.audience='coach' AND NOT s.suspended
 AND s.valid_until + make_interval(days=>p.grace_days)>now() LIMIT 1`,[account.organization_id]);
 return license.rows.length>0;
}
