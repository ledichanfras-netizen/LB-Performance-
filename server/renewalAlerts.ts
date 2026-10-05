import { Router, RequestHandler } from 'express';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
export async function renewalAlerts(db:Pick<Pool,'query'>,userId:string,admin:boolean){
 // An athlete without an individual contract uses the organization's coach license.
 const {rows}=await db.query(`SELECT s.id,s.user_id,s.valid_until,p.name AS plan_name,u.username,
 ((s.valid_until AT TIME ZONE 'America/Sao_Paulo')::date-(now() AT TIME ZONE 'America/Sao_Paulo')::date)::integer AS days_left,
 (s.user_id<>$2) AS inherited
 FROM lb_billing.subscriptions s JOIN lb_billing.plans p ON p.id=s.plan_id JOIN public.users u ON u.id=s.user_id
 WHERE NOT s.suspended AND NOT s.renewal_cancelled AND s.valid_until IS NOT NULL
 AND s.valid_until < now()+interval '8 days'
 AND ($1::boolean OR s.user_id=$2 OR (
 NOT EXISTS(SELECT 1 FROM lb_billing.subscriptions own WHERE own.user_id=$2)
 AND p.audience='coach' AND s.id=(SELECT lic.id FROM lb_billing.subscriptions lic
 JOIN lb_billing.plans lp ON lp.id=lic.plan_id JOIN public.users cu ON cu.id=lic.user_id
 JOIN lb_accounts.memberships owner ON owner.user_id=lic.user_id
 JOIN lb_accounts.memberships viewer ON viewer.organization_id=owner.organization_id
 JOIN public.users vu ON vu.id=viewer.user_id
 WHERE viewer.user_id=$2 AND viewer.active AND vu.role='athlete' AND owner.active
 AND cu.role='coach' AND lp.audience='coach' AND NOT lic.suspended
 ORDER BY lic.valid_until DESC NULLS LAST,lic.id LIMIT 1)))
 ORDER BY s.valid_until,s.id`,[admin,userId]);
 return rows.filter((r:any)=>r.days_left<=7).map((r:any)=>({...r,stage:r.days_left<0?'expired':r.days_left===0?'today':r.days_left<=1?'one-day':r.days_left<=3?'three-days':'seven-days'}));
}
export function renewalRouter(pool:Pool,adminMiddleware:RequestHandler){
 const router=Router();
 const run=(fn:any):RequestHandler=>async(req,res)=>{try{await fn(req,res);}catch{res.status(503).json({error:'Não foi possível carregar os avisos de renovação.'});}};
 router.get('/alerts',run(async(req:any,res:any)=>{
  const alerts=await renewalAlerts(pool,req.user.id,req.billingAdmin);
  const requests=await pool.query(`SELECT r.*,u.username,p.name AS plan_name FROM lb_billing.renewal_requests r
 JOIN public.users u ON u.id=r.user_id JOIN lb_billing.subscriptions s ON s.id=r.subscription_id JOIN lb_billing.plans p ON p.id=s.plan_id
 WHERE ($1::boolean OR r.user_id=$2) AND r.status<>'closed' ORDER BY r.created_at DESC LIMIT 200`,[req.billingAdmin,req.user.id]);
  res.json({admin:req.billingAdmin,alerts,requests:requests.rows});
 }));
 router.post('/request',run(async(req:any,res:any)=>{
  if(req.billingAdmin)return res.status(400).json({error:'Gerencie a renovação na assinatura.'});
  if(typeof req.body.message!=='string'||!req.body.message.trim()||req.body.message.length>500)return res.status(400).json({error:'Informe a solicitação.'});
  const alerts=await renewalAlerts(pool,req.user.id,false);
  if(!alerts.some((a:any)=>a.id===req.body.subscriptionId))return res.status(403).json({error:'Assinatura indisponível para esta conta.'});
  await pool.query(`INSERT INTO lb_billing.renewal_requests(id,subscription_id,user_id,message) VALUES($1,$2,$3,$4)
 ON CONFLICT(subscription_id,user_id) WHERE status IN ('open','contacted') DO NOTHING`,[randomUUID(),req.body.subscriptionId,req.user.id,req.body.message.trim()]);res.status(201).json({requested:true});
 }));
 router.post('/requests/:id',adminMiddleware,run(async(req:any,res:any)=>{
  if(!['contacted','closed'].includes(req.body.status))return res.status(400).json({error:'Status inválido.'});
  const result=await pool.query('UPDATE lb_billing.renewal_requests SET status=$2,updated_at=now() WHERE id=$1 RETURNING id',[req.params.id,req.body.status]);
  if(!result.rows.length)return res.status(404).json({error:'Solicitação inexistente.'});res.json({updated:true});
 }));return router;
}
