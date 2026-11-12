import {sportsReadScope} from './readScope';

/** One read-only SQL statement/snapshot: dashboard metrics, never prescription sets. */
export async function readDashboardTables(pool:any,account:any){
 const scope=sportsReadScope(account);
 const tables=['athletes','wellness','workouts',null,null,'isometric_strength','cmj','vo2max','bioimpedance','speed','external_sessions','drop_jump','imtp','abalakov'];
 const selects=tables.map((table,i)=>{
  if(!table)return `'[]'::jsonb AS t${i}`;
  const key=table==='athletes'?'id':'athlete_id';
  // All session dates and loads remain available for the existing longitudinal metrics.
  const fields=table==='workouts'?'id,athlete_id,date,name,phase,status,rpe,duration_minutes,total_load,archived_at,updated_at,created_at':'*';
  const order=table==='athletes'?'name ASC':'date DESC';
  return `(SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) FROM (SELECT ${fields} FROM public.${table} WHERE ${key} IN (SELECT athlete_id FROM allowed)${table==='workouts'?' AND archived_at IS NULL':''} ORDER BY ${order}) r) AS t${i}`;
 });
 // Include pain alerts without downloading every prescribed exercise or any performed set.
 selects[3]=`(SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) FROM (SELECT e.id,e.workout_id,e.pain_level,e.order_index FROM public.prescribed_exercises e WHERE e.pain_level>=6 AND e.workout_id IN (SELECT w.id FROM public.workouts w WHERE w.athlete_id IN (SELECT athlete_id FROM allowed) AND w.archived_at IS NULL)) r) AS t3`;
 const {rows}=await pool.query(`WITH allowed AS (SELECT s.athlete_id FROM lb_accounts.athlete_scopes s WHERE s.organization_id=$1 AND ($2::text IS NULL OR s.athlete_id=$2) AND NOT EXISTS(SELECT 1 FROM lb_accounts.athlete_archives ar WHERE ar.athlete_id=s.athlete_id)) SELECT ${selects.join(',')}`,[scope.organization_id,scope.role==='athlete'?scope.athlete_id:null]);
 return tables.map((_,i)=>({rows:rows[0][`t${i}`]}));
}
