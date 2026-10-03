// Run ONLY against a backed-up staging database before deploying new authentication.
// Credentials are supplied via environment; never printed or committed.
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { validPassword } from '../server/accounts';
const { STAGING_DATABASE_URL, LB_ADMIN_USERNAME, LB_ADMIN_PASSWORD }=process.env;
if(!STAGING_DATABASE_URL || !LB_ADMIN_USERNAME || !validPassword(LB_ADMIN_PASSWORD)) throw Error('Configure staging URL, administrator username and a new password of 12–72 bytes.');
const pool=new Pool({connectionString:STAGING_DATABASE_URL});
const c=await pool.connect();
try {
 await c.query('BEGIN');
 await c.query('LOCK TABLE public.users,public.athletes IN SHARE ROW EXCLUSIVE MODE');
 const prior=await c.query('SELECT user_id FROM lb_accounts.memberships WHERE platform_admin');
 if(prior.rows.length) throw Error('Administrator already provisioned; refusing to reset password.');
 const users=await c.query('SELECT id,role FROM public.users WHERE lower(username)=lower($1)',[LB_ADMIN_USERNAME]);
 if(users.rows.length!==1 || users.rows[0].role!=='coach') throw Error('Resolve exactly one existing coach account before migration.');
 const organizationId=randomUUID();
 await c.query('INSERT INTO lb_accounts.organizations(id,name) VALUES($1,$2)',[organizationId,'LB Performance — Prof. Leandro']);
 const userId=users.rows[0].id;
 await c.query('UPDATE public.users SET password=$1 WHERE id=$2',[await bcrypt.hash(LB_ADMIN_PASSWORD!,12),userId]);
 await c.query('INSERT INTO lb_accounts.memberships(user_id,organization_id,platform_admin) VALUES($1,$2,true)',[userId,organizationId]);
 // Existing athletes are associated only if not already assigned.
 await c.query('INSERT INTO lb_accounts.athlete_scopes(athlete_id,organization_id) SELECT id,$1 FROM public.athletes ON CONFLICT(athlete_id) DO NOTHING',[organizationId]);
 await c.query('COMMIT');console.log('Staging administrator and athlete links provisioned. Test the new login before removing legacy authentication.');
} catch(error){await c.query('ROLLBACK');throw error;} finally {c.release();await pool.end();}
