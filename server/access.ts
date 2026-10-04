import {Router} from 'express';
import type {Pool} from 'pg';
import {canManageInvites} from './inviteAccess';
export function accessRouter(pool:Pool){
 const router=Router();
 router.use((req:any,res,next)=>{if(req.account.role!=='coach')return res.status(403).json({error:'Área reservada ao treinador.'});next();});
 const run=(fn:any)=>async(req:any,res:any)=>{try{await fn(req,res);}catch(e:any){console.error('[Access]',e.code || 'error');res.status(503).json({error:'Não foi possível carregar os acessos.'});}};
 const validOrg=(id:any)=>typeof id==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);
 router.get('/organizations',run(async(req:any,res:any)=>{
  if(!req.account.platform_admin)return res.json((await pool.query('SELECT id,name FROM lb_accounts.organizations WHERE id=$1',[req.account.organization_id])).rows);
  res.json((await pool.query(`SELECT o.id,o.name FROM lb_accounts.organizations o WHERE o.id=$1 OR EXISTS
  (SELECT 1 FROM lb_accounts.supervisor_links l WHERE l.organization_id=o.id AND l.supervisor_id=$2) ORDER BY o.name`,[req.account.organization_id,req.account.user_id])).rows);
 }));
 router.use(async(req:any,res,next)=>{
  try{
   let organizationId=req.query.organizationId;
   if(req.method==='DELETE' && req.path.startsWith('/invites/')){
    const id=req.path.slice('/invites/'.length);
    if(!validOrg(id))return res.status(404).json({error:'Convite indisponível.'});
    organizationId=(await pool.query('SELECT organization_id FROM lb_accounts.invites WHERE id=$1',[id])).rows[0]?.organization_id;
   }
   if(!validOrg(organizationId) || !await canManageInvites(pool,req.account,organizationId))return res.status(403).json({error:'Organização sem permissão para gerenciar convites.'});
   req.inviteOrganizationId=organizationId;next();
  }catch{res.status(503).json({error:'Não foi possível validar as permissões.'});}
 });
 router.get('/athletes',run(async(req:any,res:any)=>{
  res.json((await pool.query(`SELECT a.id,a.name,a.modality,
   (SELECT u.username FROM public.users u JOIN lb_accounts.memberships m ON m.user_id=u.id WHERE u.athlete_id=a.id AND u.role='athlete' AND m.organization_id=$1 ORDER BY u.username LIMIT 1) AS login_username
   FROM public.athletes a JOIN lb_accounts.athlete_scopes s ON s.athlete_id=a.id WHERE s.organization_id=$1
   AND NOT EXISTS(SELECT 1 FROM lb_accounts.athlete_archives ar WHERE ar.athlete_id=a.id) ORDER BY a.name,a.id`,[req.inviteOrganizationId])).rows);
 }));
 router.get('/invites',run(async(req:any,res:any)=>{
  const page=Number(req.query.page || 0);if(!Number.isSafeInteger(page)||page<0||page>10000)return res.status(400).json({error:'Página inválida.'});
  const result=await pool.query(`SELECT i.id,i.username,i.role,i.athlete_id,a.name AS athlete_name,i.expires_at,i.accepted_at,i.revoked_at,
  CASE WHEN i.accepted_at IS NOT NULL THEN 'accepted' WHEN i.revoked_at IS NOT NULL THEN 'revoked' WHEN i.expires_at<=now() THEN 'expired' ELSE 'pending' END AS status
  FROM lb_accounts.invites i LEFT JOIN public.athletes a ON a.id=i.athlete_id WHERE i.organization_id=$1 AND ($2::boolean OR i.role='athlete')
  ORDER BY i.expires_at DESC,i.id DESC LIMIT 51 OFFSET $3`,[req.inviteOrganizationId,req.account.platform_admin,page*50]);
  res.json({items:result.rows.slice(0,50),hasMore:result.rows.length>50});
 }));
 router.delete('/invites/:id',run(async(req:any,res:any)=>{
  const result=await pool.query(`UPDATE lb_accounts.invites SET revoked_at=now() WHERE id=$1 AND organization_id=$2 AND accepted_at IS NULL AND revoked_at IS NULL
  AND ($3::boolean OR role='athlete') RETURNING id`,[req.params.id,req.inviteOrganizationId,req.account.platform_admin]);
  if(!result.rows.length)return res.status(409).json({error:'Convite já aceito, revogado ou indisponível.'});
  res.json({revoked:true});
 }));
 return router;
}
