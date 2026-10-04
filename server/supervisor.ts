import { Router } from 'express';
import type { Pool } from 'pg';

export const supervisorTables:Record<string,string>={wellness:'wellness',workouts:'workouts',sessions:'external_sessions',isometricStrength:'isometric_strength',generalStrength:'general_strength',cmj:'cmj',dropJump:'drop_jump',imtp:'imtp',vo2max:'vo2max',speed:'speed',bioimpedance:'bioimpedance'};
export async function canSupervise(pool:Pick<Pool,'query'>,userId:string,organizationId:string){
 const {rows}=await pool.query(`SELECT 1 FROM lb_accounts.supervisor_links l
 JOIN lb_accounts.memberships m ON m.user_id=l.supervisor_id
 WHERE l.supervisor_id=$1 AND l.organization_id=$2 AND m.active AND m.platform_admin`,[userId,organizationId]);
 return rows.length===1;
}
export function supervisorRouter(pool:Pool){
 const router=Router();
 router.use((req:any,res,next)=>{if(!req.account?.platform_admin)return res.status(403).json({error:'Apenas o supervisor administrador.'});next();});
 const run=(fn:any)=>async(req:any,res:any)=>{try{await fn(req,res);}catch(e:any){console.error('[Supervisor]',e.code || 'error');res.status(503).json({error:'Não foi possível carregar a supervisão.'});}};
 const uuid=(value:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
 router.get('/organizations',run(async(req:any,res:any)=>{
  res.json((await pool.query(`SELECT o.id,o.name,EXISTS(SELECT 1 FROM lb_accounts.supervisor_links l WHERE l.organization_id=o.id AND l.supervisor_id=$1) AS linked,
  (SELECT count(*)::int FROM lb_accounts.athlete_scopes s WHERE s.organization_id=o.id AND NOT EXISTS(SELECT 1 FROM lb_accounts.athlete_archives ar WHERE ar.athlete_id=s.athlete_id)) AS athlete_count,
  ARRAY(SELECT u.username FROM public.users u JOIN lb_accounts.memberships m ON m.user_id=u.id WHERE m.organization_id=o.id AND m.active AND u.role='coach' ORDER BY u.username) AS coaches
  FROM lb_accounts.organizations o WHERE o.id<>$2 ORDER BY o.name`,[req.account.user_id,req.account.organization_id])).rows);
 }));
 router.put('/organizations/:organizationId/link',run(async(req:any,res:any)=>{
  const id=req.params.organizationId,enabled=req.body.enabled;
  if(!uuid(id) || typeof enabled!=='boolean')return res.status(400).json({error:'Vínculo inválido.'});
  const c=await pool.connect();
  try{await c.query('BEGIN');
   if(!(await c.query('SELECT id FROM lb_accounts.organizations WHERE id=$1',[id])).rows.length){await c.query('ROLLBACK');return res.status(404).json({error:'Organização indisponível.'});}
   if(enabled)await c.query('INSERT INTO lb_accounts.supervisor_links(supervisor_id,organization_id,granted_by) VALUES($1,$2,$1) ON CONFLICT DO NOTHING',[req.account.user_id,id]);
   else await c.query('DELETE FROM lb_accounts.supervisor_links WHERE supervisor_id=$1 AND organization_id=$2',[req.account.user_id,id]);
   await c.query('INSERT INTO lb_accounts.supervisor_audit(actor_id,supervisor_id,organization_id,enabled) VALUES($1,$1,$2,$3)',[req.account.user_id,id,enabled]);
   await c.query('COMMIT');res.json({linked:enabled});
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }));
 router.use('/organizations/:organizationId',async(req:any,res,next)=>{
  try{if(!uuid(req.params.organizationId) || !await canSupervise(pool,req.account.user_id,req.params.organizationId))return res.status(403).json({error:'Organização sem vínculo de supervisão.'});next();}catch{res.status(503).json({error:'Não foi possível validar a supervisão.'});}
 });
 router.get('/organizations/:organizationId/athletes',run(async(req:any,res:any)=>{
  res.json((await pool.query(`SELECT a.id,a.name,a.modality FROM public.athletes a JOIN lb_accounts.athlete_scopes s ON s.athlete_id=a.id
  WHERE s.organization_id=$1 AND NOT EXISTS(SELECT 1 FROM lb_accounts.athlete_archives ar WHERE ar.athlete_id=a.id) ORDER BY a.name,a.id`,[req.params.organizationId])).rows);
 }));
 router.get('/organizations/:organizationId/athletes/:athleteId',run(async(req:any,res:any)=>{
  const kind=String(req.query.kind || 'wellness'),table=supervisorTables[kind];
  const page=Number(req.query.page || 0);
  if(!table || !Number.isSafeInteger(page) || page<0 || page>10000)return res.status(400).json({error:'Consulta inválida.'});
  const {rows}=await pool.query(`SELECT a.* FROM public.athletes a JOIN lb_accounts.athlete_scopes s ON s.athlete_id=a.id
  WHERE a.id=$1 AND s.organization_id=$2 AND NOT EXISTS(SELECT 1 FROM lb_accounts.athlete_archives ar WHERE ar.athlete_id=a.id)`,[req.params.athleteId,req.params.organizationId]);
  if(!rows.length)return res.status(404).json({error:'Atleta indisponível nessa organização.'});
  // Fixed allowlist; organization and current supervisor grant checked again inside the data query.
  const records=await pool.query(`SELECT t.* ${kind==='workouts'?`,(SELECT coalesce(jsonb_agg(to_jsonb(e) || jsonb_build_object('performed_sets',(SELECT coalesce(jsonb_agg(ps),'[]'::jsonb) FROM public.performed_sets ps WHERE ps.exercise_id=e.id)) ORDER BY e.id),'[]'::jsonb) FROM public.prescribed_exercises e WHERE e.workout_id=t.id) AS exercises`:''}
  FROM public.${table} t JOIN lb_accounts.athlete_scopes s ON s.athlete_id=t.athlete_id
  JOIN lb_accounts.supervisor_links l ON l.organization_id=s.organization_id AND l.supervisor_id=$3
  WHERE t.athlete_id=$1 AND s.organization_id=$2 ORDER BY t.date DESC,t.id DESC LIMIT 51 OFFSET $4`,[req.params.athleteId,req.params.organizationId,req.account.user_id,page*50]);
  res.json({athlete:rows[0],records:records.rows.slice(0,50),hasMore:records.rows.length>50,page});
 }));
 return router;
}
