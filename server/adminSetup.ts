import type { Pool } from 'pg';
import { randomUUID,timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { tokenHash,validPassword } from './accounts';
/** Only a server-configured target and a random setup secret can bootstrap administration. */
export async function setupAdministrator(pool:Pool,token:unknown,password:unknown){
 const expected=process.env.ADMIN_SETUP_TOKEN_HASH;
 const username=process.env.ADMIN_SETUP_USERNAME;
 const mayCreate=process.env.ADMIN_SETUP_ALLOW_CREATE==='true' && typeof username==='string' && /^[a-zA-Z0-9._@-]{3,100}$/.test(username);
 const target=process.env.ADMIN_SETUP_USER_ID || (mayCreate ? randomUUID() : undefined);
 if(!expected || !/^[a-f0-9]{64}$/.test(expected) || !target || typeof token!=='string' || !/^[a-f0-9]{64}$/.test(token) || !validPassword(password))throw Error('INVALID');
 if(!timingSafeEqual(Buffer.from(tokenHash(token),'hex'),Buffer.from(expected,'hex')))throw Error('INVALID');
 const hash=await bcrypt.hash(password,12),c=await pool.connect();
 try{await c.query('BEGIN');await c.query('LOCK TABLE lb_accounts.memberships IN EXCLUSIVE MODE');
 if((await c.query('SELECT user_id FROM lb_accounts.memberships WHERE platform_admin')).rows.length)throw Error('INVALID');
 const user=await c.query("SELECT id FROM public.users WHERE id=$1 AND role='coach' FOR UPDATE",[target]);if(!user.rows.length){
  if(!mayCreate)throw Error('INVALID');
  if((await c.query('SELECT id FROM public.users WHERE lower(username)=lower($1)',[username])).rows.length)throw Error('INVALID');
  await c.query("INSERT INTO public.users(id,username,password,role,plan) VALUES($1,$2,$3,'coach','pro')",[target,username,hash]);
 }
 const organization=randomUUID();await c.query('INSERT INTO lb_accounts.organizations(id,name) VALUES($1,$2)',[organization,'LB Performance — Prof. Leandro']);
 await c.query('UPDATE public.users SET password=$1 WHERE id=$2',[hash,target]);
 await c.query('INSERT INTO lb_accounts.memberships(user_id,organization_id,platform_admin) VALUES($1,$2,true)',[target,organization]);
 await c.query('INSERT INTO lb_accounts.athlete_scopes(athlete_id,organization_id) SELECT id,$1 FROM public.athletes ON CONFLICT(athlete_id) DO NOTHING',[organization]);
 await c.query('COMMIT');return {configured:true};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
