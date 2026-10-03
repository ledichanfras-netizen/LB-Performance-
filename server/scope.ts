import type { Pool } from 'pg';
export type AccountScope = { user_id:string; organization_id:string; role:string; athlete_id?:string | null };
// Platform administration never implies permission to read another organization's athletes.
export async function scopedAthletes(db:Pick<Pool,'query'>, account:AccountScope) {
 const result=await db.query(`SELECT a.id,a.name,a.modality FROM public.athletes a
 JOIN lb_accounts.athlete_scopes s ON s.athlete_id=a.id
 WHERE s.organization_id=$1 AND ($2::text='coach' OR ($2::text='athlete' AND a.id=$3))
 ORDER BY a.name,a.id`,[account.organization_id,account.role,account.athlete_id || null]);
 return result.rows;
}
export async function mayAccessAthlete(db:Pick<Pool,'query'>, account:AccountScope, athleteId:string) {
 const result=await db.query(`SELECT 1 FROM lb_accounts.athlete_scopes WHERE organization_id=$1 AND athlete_id=$2
 AND ($3::text='coach' OR ($3::text='athlete' AND athlete_id=$4))`,[account.organization_id,athleteId,account.role,account.athlete_id || null]);
 return result.rows.length===1;
}
