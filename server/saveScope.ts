import type { PoolClient } from 'pg';
import { AccountScope, ScopeDenied } from './scope';
const assessments:Record<string,string>={bioimpedance:'bioimpedance',isometricStrength:'isometric_strength',cmj:'cmj',dropJump:'drop_jump',vo2max:'vo2max',speed:'speed',imtp:'imtp',generalStrength:'general_strength'};
/** Must run inside the SAME transaction that writes the payload. */
export async function validateScopedSave(client:Pick<PoolClient,'query'>,scope:AccountScope,athletes:any[]){
 if(scope.role!=='coach' || !Array.isArray(athletes) || !athletes.length || athletes.length>100)throw new ScopeDenied();
 // Serializes organization saves, and locks IDs shared across organizations before checking ownership.
 await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[scope.organization_id]);
 const seen=new Map<string,string>();
 if(process.env.BILLING_ENFORCE==='true' && !(scope as any).platform_admin){
  const license=await client.query('SELECT p.athlete_limit FROM lb_billing.subscriptions s JOIN lb_billing.plans p ON p.id=s.plan_id WHERE s.user_id=$1',[scope.user_id]);
  const limit=license.rows[0]?.athlete_limit;
  if(typeof limit==='number'){
   const count=await client.query('SELECT count(*)::int AS total FROM lb_accounts.athlete_scopes s WHERE s.organization_id=$1 AND NOT EXISTS(SELECT 1 FROM lb_accounts.athlete_archives a WHERE a.athlete_id=s.athlete_id)',[scope.organization_id]);
   const existingIds=await client.query('SELECT athlete_id FROM lb_accounts.athlete_scopes WHERE athlete_id=ANY($1::text[])',[athletes.map(a=>a.id)]);
   const known=new Set(existingIds.rows.map((a:any)=>a.athlete_id));
   if(count.rows[0].total+athletes.filter(a=>!known.has(a.id)).length>limit)throw new ScopeDenied();
  }
 }
 const ids=athletes.map(a=>a?.id);if(ids.some(x=>typeof x!=='string' || !x || x.length>200) || new Set(ids).size!==ids.length)throw new ScopeDenied();
 for(const athlete of [...athletes].sort((a,b)=>a.id.localeCompare(b.id))){
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`athlete:${athlete.id}`]);
  const archived=await client.query('SELECT athlete_id FROM lb_accounts.athlete_archives WHERE athlete_id=$1',[athlete.id]);
  if(archived.rows.length)throw new ScopeDenied();
  const existing=await client.query('SELECT a.id,s.organization_id FROM public.athletes a LEFT JOIN lb_accounts.athlete_scopes s ON s.athlete_id=a.id WHERE a.id=$1',[athlete.id]);
  if(existing.rows.length && existing.rows[0].organization_id!==scope.organization_id)throw new ScopeDenied();
  const collections:[string,any[],string][]=[['wellness',athlete.wellness || [],'athlete_id'],['external_sessions',athlete.externalSessions || [],'athlete_id'],['workouts',athlete.workouts || [],'athlete_id']];
  for(const [key,table] of Object.entries(assessments))collections.push([table,athlete.assessments?.[key] || [],'athlete_id']);
  const workouts=athlete.workouts || [];
  if(!Array.isArray(workouts))throw new ScopeDenied();
  for(const w of workouts){collections.push(['prescribed_exercises',w.exercises || [],'workout_id']);for(const e of w.exercises || [])collections.push(['performed_sets',e.performedSets || [],'exercise_id']);}
  const grouped=new Map<string,{parentColumn:string,expected:Map<string,string>}>();
  for(const [table,items,parentColumn] of collections){
   if(!Array.isArray(items) || items.length>5000)throw new ScopeDenied();
   const group=grouped.get(table) || {parentColumn,expected:new Map<string,string>()};
   grouped.set(table,group);
   for(const item of items){
    if(!item.id)continue;
    if(typeof item.id!=='string' || item.id.length>200)throw new ScopeDenied();
    let expected=athlete.id;
    if(table==='prescribed_exercises')expected=workouts.find((w:any)=>w.exercises?.includes(item))?.id;
    if(table==='performed_sets')expected=workouts.flatMap((w:any)=>w.exercises || []).find((e:any)=>e.performedSets?.includes(item))?.id;
    const itemKey=`${table}:${item.id}`;
    if(seen.has(itemKey) && seen.get(itemKey)!==expected)throw new ScopeDenied();
    seen.set(itemKey,expected);group.expected.set(item.id,expected);
   }
  }
  for(const [table,group] of grouped){
   const itemIds=[...group.expected.keys()].sort();
   if(!itemIds.length)continue;
   await client.query('SELECT pg_advisory_xact_lock(hashtext(lock_id)) FROM unnest($1::text[]) AS locks(lock_id) ORDER BY lock_id',[itemIds.map(id=>`${table}:${id}`)]);
   const rows=await client.query(`SELECT id, ${group.parentColumn} AS parent FROM public.${table} WHERE id=ANY($1::text[])`,[itemIds]);
   for(const row of rows.rows)if(row.parent!==group.expected.get(row.id))throw new ScopeDenied();
  }
 }
}
export async function attachSavedAthletes(client:Pick<PoolClient,'query'>,scope:AccountScope,athletes:any[]){
 for(const a of athletes)await client.query('INSERT INTO lb_accounts.athlete_scopes(athlete_id,organization_id) VALUES($1,$2) ON CONFLICT(athlete_id) DO NOTHING',[a.id,scope.organization_id]);
}
