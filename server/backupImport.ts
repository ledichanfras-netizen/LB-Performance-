import type { Pool } from 'pg';
import { ScopeDenied } from './scope';
import { validateSportsPayload } from './sportsValidation';
/** Import additions only. Existing/archived records are never overwritten by a backup. */
export async function prepareBackupImport(pool:Pick<Pool,'query'>,account:any,incoming:any[]){
 if(!account||account.role!=='coach')throw new ScopeDenied();
 validateSportsPayload(incoming);
 if(incoming.some(a=>a.id.startsWith('featured-')||a.id.startsWith('model-')||a.id==='meta-custom-library-exercises'))throw new ScopeDenied();
 const ids=incoming.map(a=>a.id);if(new Set(ids).size!==ids.length)throw new ScopeDenied();
 const {rows}=await pool.query('SELECT a.id,s.organization_id FROM public.athletes a LEFT JOIN lb_accounts.athlete_scopes s ON s.athlete_id=a.id WHERE a.id=ANY($1::text[])',[ids]);
 if(rows.some(r=>r.organization_id!==account.organization_id))throw new ScopeDenied();
 const existing=new Set(rows.map(r=>r.id));
 const athletes=incoming.filter(a=>!existing.has(a.id));
 return {athletes,importCount:athletes.length,preservedCount:existing.size};
}
