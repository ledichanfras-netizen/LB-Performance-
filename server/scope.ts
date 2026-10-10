import type { Pool } from 'pg';
export type AccountScope = { user_id:string; organization_id:string; role:string; athlete_id?:string | null };
// Platform administration never implies permission to read another organization's athletes.
export async function scopedAthletes(db:Pick<Pool,'query'>, account:AccountScope) {
 const result=await db.query(`SELECT a.id,a.name,a.modality FROM public.athletes a
 JOIN lb_accounts.athlete_scopes s ON s.athlete_id=a.id
 WHERE s.organization_id=$1 AND NOT EXISTS(SELECT 1 FROM lb_accounts.athlete_archives ar WHERE ar.athlete_id=a.id) AND ($2::text='coach' OR ($2::text='athlete' AND a.id=$3))
 ORDER BY a.name,a.id`,[account.organization_id,account.role,account.athlete_id || null]);
 return result.rows;
}
export async function mayAccessAthlete(db:Pick<Pool,'query'>, account:AccountScope, athleteId:string) {
 const result=await db.query(`SELECT 1 FROM lb_accounts.athlete_scopes WHERE organization_id=$1 AND athlete_id=$2 AND NOT EXISTS(SELECT 1 FROM lb_accounts.athlete_archives ar WHERE ar.athlete_id=lb_accounts.athlete_scopes.athlete_id)
 AND ($3::text='coach' OR ($3::text='athlete' AND athlete_id=$4))`,[account.organization_id,athleteId,account.role,account.athlete_id || null]);
 return result.rows.length===1;
}

const mutableTables:Record<string,string>={workouts:'workouts',wellness:'wellness',sessions:'external_sessions',bioimpedance:'bioimpedance',isometricStrength:'isometric_strength',generalStrength:'general_strength',cmj:'cmj',dropJump:'drop_jump',vo2max:'vo2max',speed:'speed',imtp:'imtp'};
export class ScopeDenied extends Error {}
export async function scopedDelete(pool:Pool,account:AccountScope,type:string,id:string){
 const table=mutableTables[type];if(!table) throw new ScopeDenied('Tipo inválido.');
 // Table names come exclusively from the fixed allowlist above.
 const c=await pool.connect();
 try{await c.query('BEGIN');
  const row=await c.query(`SELECT t.id,t.athlete_id FROM public.${table} t JOIN lb_accounts.athlete_scopes s ON s.athlete_id=t.athlete_id
    WHERE t.id=$1 AND s.organization_id=$2 AND ($3::text='coach' OR ($3::text='athlete' AND t.athlete_id=$4 AND $5::text IN ('wellness','sessions')))
    FOR UPDATE OF t`,[id,account.organization_id,account.role,account.athlete_id || null,type]);
  if(!row.rows.length) throw new ScopeDenied('Registro indisponível.');
  if(type==='workouts') {
   await c.query('UPDATE public.workouts SET archived_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$1',[id]);
   await c.query('UPDATE public.athletes SET updated_at=CURRENT_TIMESTAMP WHERE id=$1',[row.rows[0].athlete_id]);
  } else await c.query(`DELETE FROM public.${table} WHERE id=$1`,[id]);
  await c.query('COMMIT');return {deleted:true};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function scopedAthleteProfile(pool:Pool,account:AccountScope,id:string,profile:{name:string;modality:string}){
 if(account.role!=='coach' || typeof profile?.name!=='string' || !profile.name.trim() || profile.name.length>200 || typeof profile.modality!=='string' || profile.modality.length>100)throw new ScopeDenied('Dados inválidos ou ação não permitida.');
 const result=await pool.query(`UPDATE public.athletes a SET name=$1,modality=$2 WHERE a.id=$3 AND EXISTS
 (SELECT 1 FROM lb_accounts.athlete_scopes s WHERE s.athlete_id=a.id AND s.organization_id=$4)
 RETURNING a.id,a.name,a.modality`,[profile.name.trim(),profile.modality,id,account.organization_id]);
 if(!result.rows.length) throw new ScopeDenied('Registro indisponível.');return result.rows[0];
}
