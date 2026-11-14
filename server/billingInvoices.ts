import {billingPeriod,shiftBillingDate} from '../src/utils/billingPeriod';
import {Router,RequestHandler} from 'express';
import type {Pool} from 'pg';
import {randomUUID} from 'node:crypto';
const validDate=(s:any)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
export function billingInvoices(pool:Pool,admin:RequestHandler){
 const router=Router();
 router.get('/summary',async(req:any,res)=>{try{
  const totals=await pool.query(`SELECT
   (SELECT COALESCE(sum(e.amount_cents),0)::bigint FROM lb_billing.entries e JOIN lb_billing.subscriptions s ON s.id=e.subscription_id WHERE ($1::boolean OR s.user_id=$2) AND e.voided_at IS NULL AND e.kind='payment' AND e.effective_on>=date_trunc('month',now() AT TIME ZONE 'America/Sao_Paulo')::date AND e.effective_on<(date_trunc('month',now() AT TIME ZONE 'America/Sao_Paulo')+interval '1 month')::date) AS received,
   (SELECT COALESCE(sum(i.amount_cents),0)::bigint FROM lb_billing.invoices i JOIN lb_billing.subscriptions s ON s.id=i.subscription_id WHERE ($1::boolean OR s.user_id=$2) AND i.status='pending') AS pending,
   (SELECT count(*)::integer FROM lb_billing.invoices i JOIN lb_billing.subscriptions s ON s.id=i.subscription_id WHERE ($1::boolean OR s.user_id=$2) AND i.status='pending' AND i.due_on<(now() AT TIME ZONE 'America/Sao_Paulo')::date) AS overdue`,[req.billingAdmin,req.user.id]);
  res.json(totals.rows[0]);
 }catch{res.status(503).json({error:'Resumo financeiro indisponível.'});}});
 router.get('/',async(req:any,res)=>{try{const r=await pool.query(`SELECT i.*,i.period_start::text AS period_start,i.period_end::text AS period_end,i.due_on::text AS due_on,i.paid_on::text AS paid_on,u.username FROM lb_billing.invoices i JOIN lb_billing.subscriptions s ON s.id=i.subscription_id JOIN public.users u ON u.id=s.user_id WHERE ($1::boolean OR s.user_id=$2) ORDER BY i.created_at DESC LIMIT 500`,[req.billingAdmin,req.user.id]);res.json(r.rows);}catch{res.status(503).json({error:'Cobranças indisponíveis. Verifique a atualização do módulo financeiro.'});}});
 router.post('/enroll',admin,async(req:any,res)=>{
  const b=req.body;
  if(typeof b.userId!=='string'||typeof b.name!=='string'||!b.name.trim()||b.name.length>100||!Number.isSafeInteger(b.amountCents)||b.amountCents<0||b.amountCents>2147483647||!Number.isInteger(b.durationDays)||b.durationDays<1||b.durationDays>366||!Number.isInteger(b.graceDays)||b.graceDays<0||b.graceDays>30)return res.status(400).json({error:'Informe conta, valor, duração e tolerância válidos.'});
  let c:any;try{c=await pool.connect();await c.query('BEGIN');
   const target=(await c.query('SELECT id,role FROM public.users WHERE id=$1 FOR UPDATE',[b.userId])).rows[0];
   if(!target||!['athlete','coach'].includes(target.role))throw Error('INVALID');
   if((await c.query('SELECT id FROM lb_billing.subscriptions WHERE user_id=$1',[b.userId])).rows.length){await c.query('ROLLBACK');return res.status(409).json({error:'Esta conta já tem mensalidade. Use Editar / Liberar ou Novo período.'});}
   const plan=randomUUID(),subscription=randomUUID();
   await c.query('INSERT INTO lb_billing.plans(id,name,audience,price_cents,duration_days,grace_days) VALUES($1,$2,$3,$4,$5,$6)',[plan,b.name.trim(),target.role,b.amountCents,b.durationDays,b.graceDays]);
   await c.query('INSERT INTO lb_billing.subscriptions(id,user_id,plan_id) VALUES($1,$2,$3)',[subscription,b.userId,plan]);
   await c.query('COMMIT');res.status(201).json({id:subscription});
  }catch{if(c)await c.query('ROLLBACK').catch(()=>{});res.status(400).json({error:'Não foi possível cadastrar a mensalidade. Confira a conta selecionada.'});}finally{c?.release();}
 });
 router.post('/:id/:action',admin,async(req:any,res)=>{
  const {id,action}=req.params,b=req.body;
  if(!/^[a-f0-9-]{36}$/i.test(id)||!['issue','receive','cancel'].includes(action))return res.status(400).json({error:'Ação inválida.'});
  if(action==='receive'&&(!validDate(b.paidOn)||!['pix','cash','transfer','payment_link','courtesy','trial'].includes(b.method)||b.confirmed!==true))return res.status(400).json({error:'Confirme a data, a forma e o recebimento integral.'});
  if(action!=='issue'&&(typeof b.note!=='string'||b.note.length>500))return res.status(400).json({error:'Observação inválida.'});
  if(action==='cancel'&&!b.note.trim())return res.status(400).json({error:'Informe o motivo do cancelamento.'});
  let c:any;
  try{c=await pool.connect();await c.query('BEGIN');
   if(action==='issue'){
    const sub=(await c.query('SELECT s.*,p.name,p.price_cents,p.duration_days,p.calendar_months,p.by_periodization FROM lb_billing.subscriptions s JOIN lb_billing.plans p ON p.id=s.plan_id WHERE s.id=$1 FOR UPDATE OF s',[id])).rows[0];
    if(!sub)throw Error('NOT_FOUND');
    if(b.amountCents!==undefined&&(!Number.isSafeInteger(b.amountCents)||b.amountCents<0||b.amountCents>2147483647))throw Error('PAYMENT');
    if(b.durationDays!==undefined&&(!Number.isInteger(b.durationDays)||b.durationDays<1||b.durationDays>366))throw Error('PAYMENT');
    const pending=(await c.query("SELECT * FROM lb_billing.invoices WHERE subscription_id=$1 AND status='pending'",[id])).rows[0];
    if(pending){await c.query('COMMIT');return res.json(pending);}
    if(sub.by_periodization)throw Error('PERIODIZATION');
    if(sub.calendar_months&&b.durationDays===undefined){
     const dates=(await c.query("SELECT GREATEST((now() AT TIME ZONE 'America/Sao_Paulo')::date,COALESCE(($1::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date+1,(now() AT TIME ZONE 'America/Sao_Paulo')::date))::text AS start",[sub.valid_until])).rows[0];
     const duration=({1:'monthly',3:'quarterly',6:'half_year',12:'yearly'} as const)[sub.calendar_months as 1|3|6|12];
     const p=billingPeriod(dates.start,duration);
     const row=(await c.query('INSERT INTO lb_billing.invoices(id,subscription_id,plan_name,amount_cents,period_start,period_end,due_on,created_by) VALUES($1,$2,$3,$4,$5::date,$6::date,$5::date,$7) RETURNING *',[randomUUID(),id,sub.name,b.amountCents??sub.price_cents,p.start,p.end,req.user.id])).rows[0];
     await c.query('COMMIT');return res.status(201).json(row);
    }
    const inserted=await c.query(`INSERT INTO lb_billing.invoices(id,subscription_id,plan_name,amount_cents,period_start,period_end,due_on,created_by)
     SELECT $1,$2,$3,$4,start_on,start_on+$5::integer-1,start_on,$6 FROM
     (SELECT GREATEST((now() AT TIME ZONE 'America/Sao_Paulo')::date,COALESCE(($7::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date+1,(now() AT TIME ZONE 'America/Sao_Paulo')::date)) AS start_on) dates RETURNING *`,[randomUUID(),id,sub.name,b.amountCents??sub.price_cents,b.durationDays??sub.duration_days,req.user.id,sub.valid_until]);
    await c.query('COMMIT');return res.status(201).json(inserted.rows[0]);
   }
   const found=(await c.query('SELECT subscription_id FROM lb_billing.invoices WHERE id=$1',[id])).rows[0];if(!found)throw Error('NOT_FOUND');
   await c.query('SELECT id FROM lb_billing.subscriptions WHERE id=$1 FOR UPDATE',[found.subscription_id]);
   const invoice=(await c.query('SELECT *,period_start::text AS period_start,period_end::text AS period_end FROM lb_billing.invoices WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(action==='receive'&&invoice.status==='paid'){await c.query('COMMIT');return res.json({confirmed:true,duplicate:true});}
   if(invoice.status!=='pending')throw Error('NOT_PENDING');
   if(action==='cancel'){
    await c.query("UPDATE lb_billing.invoices SET status='cancelled',note=$2 WHERE id=$1",[id,b.note.trim()]);
   }else{
    const today=(await c.query("SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date::text AS day")).rows[0].day;
    if(b.paidOn>today||(['courtesy','trial'].includes(b.method)&&invoice.amount_cents!==0))throw Error('PAYMENT');
    // An older legacy renewal must not be counted again against the same period.
    const sub=(await c.query('SELECT valid_until FROM lb_billing.subscriptions WHERE id=$1',[invoice.subscription_id])).rows[0];
    if(sub.valid_until&&new Date(sub.valid_until)>=new Date(invoice.period_start+'T03:00:00Z'))throw Error('OVERLAP');
    if(sub.valid_until&&new Date(sub.valid_until).getTime()>=Date.now()){const last=new Date(sub.valid_until).toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});if(invoice.period_start!==shiftBillingDate(last,1))throw Error('OVERLAP');}
    const entryId=randomUUID();
    await c.query(`INSERT INTO lb_billing.entries(id,request_id,subscription_id,kind,amount_cents,method,reason,recorded_by,valid_until,effective_on)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,(($9::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo')-interval '1 millisecond',$10::date)`,[entryId,'invoice-'+id,invoice.subscription_id,['courtesy','trial'].includes(b.method)?'grant':'payment',invoice.amount_cents,b.method,b.note.trim()||'Recebimento confirmado',req.user.id,invoice.period_end,b.paidOn]);
    await c.query("UPDATE lb_billing.subscriptions SET access_start=CASE WHEN valid_until>=now() THEN COALESCE(access_start,(now() AT TIME ZONE 'America/Sao_Paulo')::date) ELSE $3::date END,valid_until=(($2::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo')-interval '1 millisecond',suspended=false,renewal_cancelled=false WHERE id=$1",[invoice.subscription_id,invoice.period_end,invoice.period_start]);
    await c.query("UPDATE lb_billing.invoices SET status='paid',paid_on=$2::date,method=$3,note=$4,entry_id=$5 WHERE id=$1",[id,b.paidOn,b.method,b.note.trim(),entryId]);
   }
   await c.query('INSERT INTO lb_billing.audit_events(id,subscription_id,action,reason,actor_id) VALUES($1,$2,$3,$4,$5)',[randomUUID(),invoice.subscription_id,'invoice-'+action,`${id}: ${b.note.trim()||'Recebimento confirmado'}`,req.user.id]);
   await c.query('COMMIT');res.json({confirmed:true});
  }catch(e:any){if(c)await c.query('ROLLBACK').catch(()=>{});const known=['NOT_FOUND','NOT_PENDING','PAYMENT','OVERLAP','PERIODIZATION'].includes(e.message);res.status(known?400:503).json({error:e.message==='PERIODIZATION'?'Use Novo período para informar as datas da nova periodização.':e.message==='OVERLAP'?'Este período já foi liberado por outro lançamento. Cancele a cobrança e gere a próxima.':known?'Cobrança indisponível ou dados de recebimento inválidos.':'Não foi possível confirmar a operação. Atualize e tente novamente.'});}finally{c?.release();}
 });return router;
}
