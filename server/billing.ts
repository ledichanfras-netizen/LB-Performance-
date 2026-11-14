import {billingOwn,billingTargets,resolveBillingSubject} from './billingIdentities';
import {billingPeriod} from '../src/utils/billingPeriod';
import {simpleBilling} from './billingSimple';
import {billingInvoices} from './billingInvoices';
import { renewalRouter } from "./renewalAlerts";
import { billingManagement } from "./billingManagement";
import { Router, RequestHandler } from 'express';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';

export function billingRouter(pool: Pool, authenticate: RequestHandler) {
  const router = Router();
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (process.env.BILLING_ENABLED !== 'true') return res.status(503).json({ error: 'Gestão comercial ainda não ativada.' });
    next();
  });
  router.use(authenticate);
  router.use(async (req: any, res, next) => {
    try {
      // Never authorize using the legacy username-only fallback token.
      if (!req.user?.id) return res.status(403).json({ error: 'Entre com uma conta cadastrada no banco.' });
      const { rows } = await pool.query('SELECT id, role FROM users WHERE id=$1', [req.user.id]);
      if (!rows[0]) return res.status(401).json({ error: 'Conta inexistente.' });
      if (req.user.accountMode === 'scoped') {
        const membership = await pool.query('SELECT platform_admin FROM lb_accounts.memberships WHERE user_id=$1 AND active', [rows[0].id]);
        req.billingAdmin = rows[0].role === 'coach' && membership.rows[0]?.platform_admin === true;
      } else {
        req.billingAdmin = rows[0].role === 'coach' && (process.env.BILLING_ADMIN_USER_IDS || '').split(',').map(x => x.trim()).includes(rows[0].id);
      }
      next();
    } catch { res.status(503).json({ error: 'Banco indisponível para gestão comercial.' }); }
  });
  const admin: RequestHandler = (req: any, res, next) => req.billingAdmin ? next() : res.status(403).json({ error: 'Apenas o administrador pode alterar assinaturas.' });
  const run = (fn: any): RequestHandler => async (req, res) => {
    try { await fn(req, res); } catch (e: any) {
      console.error('[Billing]', e.code || 'error');
      res.status(e.message === 'INVALID' ? 400 : 503).json({ error: e.message === 'INVALID' ? 'Dados inválidos.' : 'Não foi possível concluir. Verifique a configuração comercial.' });
    }
  };
  router.use('/renewals',renewalRouter(pool,admin));
  router.use('/manage',billingManagement(pool,admin));
  router.use('/invoices',billingInvoices(pool,admin));
  router.use('/simple',simpleBilling(pool,admin));
  router.get('/overview', run(async (req: any, res: any) => {
    const subscriptions = await pool.query(`SELECT s.*,s.complimentary_until::text AS complimentary_until, p.grace_days,p.name AS plan_name, p.price_cents, p.duration_days,p.calendar_months,p.by_periodization,COALESCE(a.name,u.username,'Aluno') AS username,CASE WHEN s.athlete_id IS NOT NULL THEN 'athlete' ELSE u.role END AS audience,
      CASE WHEN s.suspended THEN 'suspended' WHEN s.valid_until IS NULL THEN 'pending'
      WHEN s.valid_until > now() THEN 'active' WHEN s.valid_until + make_interval(days => p.grace_days) > now() THEN 'grace' ELSE 'expired' END AS status
      FROM lb_billing.subscriptions s JOIN lb_billing.plans p ON p.id=s.plan_id LEFT JOIN users u ON u.id=s.user_id LEFT JOIN public.athletes a ON a.id=COALESCE(s.athlete_id,u.athlete_id)
      WHERE ($1::boolean OR ${billingOwn()}) ORDER BY username,s.id`, [req.billingAdmin, req.user.id]);
    const plans = await pool.query('SELECT * FROM lb_billing.plans ORDER BY name');
    const users = req.billingAdmin ? await billingTargets(pool) : [];
    res.json({ admin: req.billingAdmin, enforcementEnabled: process.env.BILLING_ENFORCE==='true', subscriptions: subscriptions.rows, plans: plans.rows, users });
  }));
  router.get('/entries', run(async (req:any,res:any)=>{
    const {rows}=await pool.query(`SELECT e.*,COALESCE(a.name,u.username,'Aluno') AS username FROM lb_billing.entries e JOIN lb_billing.subscriptions s ON s.id=e.subscription_id LEFT JOIN users u ON u.id=s.user_id LEFT JOIN public.athletes a ON a.id=COALESCE(s.athlete_id,u.athlete_id) WHERE ($1::boolean OR ${billingOwn()}) ORDER BY e.created_at DESC LIMIT 200`,[req.billingAdmin,req.user.id]);res.json(rows);
  }));
  router.post('/subscriptions/:id/action',admin,run(async(req:any,res:any)=>{
    const {action,reason}=req.body;
    if(!['suspend','resume','cancel-renewal'].includes(action) || typeof reason!=='string' || !reason.trim() || reason.length>500)throw Error('INVALID');
    const c=await pool.connect();try{await c.query('BEGIN');
      const result=await c.query(`UPDATE lb_billing.subscriptions SET suspended=CASE WHEN $2='suspend' THEN true WHEN $2='resume' THEN false ELSE suspended END, renewal_cancelled=CASE WHEN $2='cancel-renewal' THEN true ELSE renewal_cancelled END WHERE id=$1 RETURNING id`,[req.params.id,action]);
      if(!result.rows.length)throw Error('INVALID');
      await c.query('INSERT INTO lb_billing.audit_events(id,subscription_id,action,reason,actor_id) VALUES($1,$2,$3,$4,$5)',[randomUUID(),req.params.id,action,reason.trim(),req.user.id]);await c.query('COMMIT');res.json({updated:true});
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }));
  router.post('/plans', admin, run(async (req: any, res: any) => {
    const { name, audience, priceCents, durationDays, graceDays = 3, athleteLimit = null, deliveries = '', resources = '' } = req.body;
    if (typeof name !== 'string' || !name.trim() || name.length > 100 || !['coach','athlete'].includes(audience) || !Number.isSafeInteger(priceCents) || priceCents < 0 || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > 366 || !Number.isInteger(graceDays) || graceDays < 0 || graceDays > 30 || (athleteLimit !== null && (!Number.isInteger(athleteLimit) || athleteLimit < 1))) throw Error('INVALID');
    if(typeof deliveries!=='string'||deliveries.length>5000||typeof resources!=='string'||resources.length>5000)throw Error('INVALID');
    const result = await pool.query('INSERT INTO lb_billing.plans(id,name,audience,price_cents,duration_days,grace_days,athlete_limit,deliveries,resources) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *', [randomUUID(), name.trim(), audience, priceCents, durationDays, graceDays, athleteLimit, deliveries.trim(), resources.trim()]);
    res.status(201).json(result.rows[0]);
  }));
  router.post('/subscriptions', admin, run(async (req: any, res: any) => {
    const { userId, planId } = req.body;
    const c=await pool.connect();try{
      await c.query('BEGIN');const target=await resolveBillingSubject(c,{userId});
      if(target.current)throw Error('INVALID');
      const plan=(await c.query('SELECT id FROM lb_billing.plans WHERE id=$1 AND audience=$2 AND NOT archived',[planId,target.role])).rows[0];if(!plan)throw Error('INVALID');
      const result=await c.query('INSERT INTO lb_billing.subscriptions(id,user_id,plan_id,athlete_id) VALUES($1,$2,$3,$4) RETURNING *',[randomUUID(),target.userId,planId,target.athleteId]);
      await c.query('COMMIT');res.status(201).json(result.rows[0]);
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }));
  router.post('/subscriptions/:id/plan', admin, run(async (req:any,res:any)=>{
    const {planId,reason}=req.body;
    if(typeof planId!=='string' || !/^[a-f0-9-]{36}$/i.test(planId) || typeof reason!=='string' || !reason.trim() || reason.length>500)throw Error('INVALID');
    const c=await pool.connect();try{await c.query('BEGIN');
      const current=await c.query(`SELECT s.*,CASE WHEN s.athlete_id IS NOT NULL THEN 'athlete' ELSE u.role END AS role FROM lb_billing.subscriptions s LEFT JOIN public.users u ON u.id=s.user_id WHERE s.id=$1 FOR UPDATE OF s`,[req.params.id]);
      const plan=await c.query('SELECT * FROM lb_billing.plans WHERE id=$1',[planId]);
      if(!current.rows[0] || !plan.rows[0] || current.rows[0].role!==plan.rows[0].audience || plan.rows[0].archived)throw Error('INVALID');
      await c.query('SELECT pg_advisory_xact_lock(hashtext(organization_id::text)) FROM lb_accounts.memberships WHERE user_id=$1',[current.rows[0].user_id]);
      if(plan.rows[0].athlete_limit!==null && current.rows[0].role==='coach'){
        const count=await c.query('SELECT count(*)::integer AS total FROM lb_accounts.athlete_scopes a JOIN lb_accounts.memberships m ON m.organization_id=a.organization_id WHERE m.user_id=$1 AND NOT EXISTS(SELECT 1 FROM lb_accounts.athlete_archives ar WHERE ar.athlete_id=a.athlete_id)',[current.rows[0].user_id]);
        if(count.rows[0].total>plan.rows[0].athlete_limit)throw Error('INVALID');
      }
      await c.query('UPDATE lb_billing.subscriptions SET plan_id=$1 WHERE id=$2',[planId,req.params.id]);
      await c.query('INSERT INTO lb_billing.audit_events(id,subscription_id,action,reason,actor_id) VALUES($1,$2,$3,$4,$5)',[randomUUID(),req.params.id,'change-plan',`${reason.trim()} | ${current.rows[0].plan_id} -> ${planId}`,req.user.id]);
      await c.query('COMMIT');res.json({updated:true});
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }));
  router.post('/subscriptions/:id/renew', admin, run(async (req: any, res: any) => {
    const { requestId, amountCents, method, reason } = req.body;
    if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId) || !Number.isSafeInteger(amountCents) || amountCents < 0 || !['pix','cash','transfer','payment_link','courtesy','trial'].includes(method) || typeof reason !== 'string' || !reason.trim() || reason.length > 500 || (['courtesy','trial'].includes(method) && amountCents !== 0)) throw Error('INVALID');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT s.*,p.duration_days,p.calendar_months,p.by_periodization FROM lb_billing.subscriptions s JOIN lb_billing.plans p ON p.id=s.plan_id WHERE s.id=$1 FOR UPDATE OF s', [req.params.id]);
      if (!rows[0]) throw Error('INVALID');
      const prior = await client.query('SELECT * FROM lb_billing.entries WHERE request_id=$1', [requestId]);
      if (prior.rows[0]) {
        const old = prior.rows[0];
        if (old.subscription_id !== req.params.id || old.amount_cents !== amountCents || old.method !== method || old.reason !== reason.trim()) throw Error('INVALID');
        await client.query('COMMIT'); return res.json({ duplicate: true, validUntil: rows[0].valid_until });
      }
      if(rows[0].by_periodization)throw Error('INVALID');
      let updated;
      if(rows[0].calendar_months){
        const dates=(await client.query("SELECT GREATEST((now() AT TIME ZONE 'America/Sao_Paulo')::date,COALESCE(($1::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date+1,(now() AT TIME ZONE 'America/Sao_Paulo')::date))::text AS start",[rows[0].valid_until])).rows[0];
        const kind=({1:'monthly',3:'quarterly',6:'half_year',12:'yearly'} as const)[rows[0].calendar_months as 1|3|6|12];
        const period=billingPeriod(dates.start,kind);
        updated=await client.query("UPDATE lb_billing.subscriptions SET valid_until=(($2::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo')-interval '1 millisecond',suspended=false,renewal_cancelled=false WHERE id=$1 RETURNING valid_until",[req.params.id,period.end]);
      }else updated = await client.query(`UPDATE lb_billing.subscriptions SET valid_until=GREATEST(COALESCE(valid_until,now()),now()) + make_interval(days => $2), suspended=false, renewal_cancelled=false WHERE id=$1 RETURNING valid_until`, [req.params.id, rows[0].duration_days]);
      await client.query('INSERT INTO lb_billing.entries(id,request_id,subscription_id,kind,amount_cents,method,reason,recorded_by,valid_until) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [randomUUID(),requestId,req.params.id,['courtesy','trial'].includes(method) ? 'grant' : 'payment',amountCents,method,reason.trim(),req.user.id,updated.rows[0].valid_until]);
      await client.query('COMMIT'); res.json({ validUntil: updated.rows[0].valid_until });
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }));
  return router;
}
