import {resolveBillingSubject} from './billingIdentities';
import {Router,RequestHandler} from 'express';
import type {Pool} from 'pg';
import {randomUUID,createHash} from 'node:crypto';
import {billingPeriod,validBillingDate,shiftBillingDate} from '../src/utils/billingPeriod';
export function simpleBilling(pool:Pool,admin:RequestHandler){
 const router=Router();
 router.post('/',admin,async(req:any,res)=>{
  const b=req.body;let period:ReturnType<typeof billingPeriod>;
  try{
   period=billingPeriod(b.startOn,b.duration,b.endOn);
   if((!b.userId&&!b.athleteId)||(b.userId!==undefined&&(typeof b.userId!=='string'||!b.userId))||(b.athleteId!==undefined&&(typeof b.athleteId!=='string'||!b.athleteId))||typeof b.name!=='string'||!b.name.trim()||b.name.length>100||!Number.isSafeInteger(b.amountCents)||b.amountCents<0||b.amountCents>100000000||!Number.isInteger(b.graceDays)||b.graceDays<0||b.graceDays>30||typeof b.paymentRequired!=='boolean'||typeof b.received!=='boolean'||typeof b.requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(b.requestId))throw Error('Confira aluno, plano, valor e tolerância.');
   if(b.complimentaryUntil&&!validBillingDate(b.complimentaryUntil))throw Error('Data de cortesia inválida.');
   if(b.received&&(!validBillingDate(b.paidOn)||!['pix','cash','transfer','payment_link','courtesy','trial'].includes(b.method)||b.confirmed!==true||(['courtesy','trial'].includes(b.method)&&b.amountCents!==0)))throw Error('Confirme a data, forma e recebimento integral.');
  }catch(e:any){return res.status(400).json({error:e.message});}
  const hash=createHash('sha256').update(JSON.stringify({userId:b.userId||null,athleteId:b.athleteId||null,planId:b.planId||null,name:b.name.trim(),amount:b.amountCents,duration:b.duration,start:period.start,end:period.end,grace:b.graceDays,required:b.paymentRequired,courtesy:b.complimentaryUntil||null,received:b.received,paidOn:b.received?b.paidOn:null,method:b.received?b.method:null})).digest('hex');
  let c:any;
  try{
   c=await pool.connect();await c.query('BEGIN');
   const target=await resolveBillingSubject(c,b);
   const prior=(await c.query('SELECT id,request_hash FROM lb_billing.invoices WHERE request_id=$1',[b.requestId])).rows[0];
   if(prior){if(prior.request_hash!==hash)throw Error('Esta confirmação já foi usada com outros dados. Atualize e confira o histórico.');await c.query('COMMIT');return res.json({confirmed:true,duplicate:true,invoiceId:prior.id});}
   const current=target.current;
   if(current){
    const pending=(await c.query("SELECT id FROM lb_billing.invoices WHERE subscription_id=$1 AND status='pending'",[current.id])).rows[0];
    if(pending)throw Error('Este aluno já tem uma cobrança pendente. Registre o recebimento ou cancele essa cobrança antes de criar outro período.');
    const latest=(await c.query("SELECT max(period_end)::text AS last_end FROM lb_billing.invoices WHERE subscription_id=$1 AND status='paid'",[current.id])).rows[0].last_end;
    if(latest&&period.start<=latest)throw Error('O novo período deve começar após o último período pago.');
    if(current.valid_until&&Date.parse(period.start+'T03:00:00Z')<=new Date(current.valid_until).getTime())throw Error('O início deve ser posterior à validade já liberada para este aluno.');
    if(b.received&&current.valid_until&&new Date(current.valid_until).getTime()>=Date.now()){const last=new Date(current.valid_until).toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});if(period.start!==shiftBillingDate(last,1))throw Error('Para renovar um acesso ainda ativo, inicie no dia seguinte ao vencimento atual.');}
   }
   const today=(await c.query("SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date::text AS day")).rows[0].day;
   if(b.received&&b.paidOn>today)throw Error('A data do recebimento não pode estar no futuro.');
   let template:any;
   if(b.planId){template=(await c.query('SELECT * FROM lb_billing.plans WHERE id=$1 AND NOT archived',[b.planId])).rows[0];if(!template||template.audience!==target.role)throw Error('Selecione um plano compatível com o aluno ou treinador.');}
   const planId=randomUUID(),subscriptionId=current?.id||randomUUID(),invoiceId=randomUUID();
   await c.query('INSERT INTO lb_billing.plans(id,name,audience,price_cents,duration_days,grace_days,calendar_months,by_periodization,athlete_limit,deliveries,resources) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[planId,b.name.trim(),target.role,b.amountCents,period.days,b.graceDays,period.months,b.duration==='periodization',template?.athlete_limit??null,template?.deliveries||'',template?.resources||'']);
   if(current)await c.query('UPDATE lb_billing.subscriptions SET plan_id=$2,payment_required=$3,complimentary_until=$4::date,athlete_id=COALESCE(athlete_id,$5) WHERE id=$1',[subscriptionId,planId,b.paymentRequired,b.complimentaryUntil||null,target.athleteId]);
   else await c.query('INSERT INTO lb_billing.subscriptions(id,user_id,plan_id,payment_required,complimentary_until,athlete_id) VALUES($1,$2,$3,$4,$5::date,$6)',[subscriptionId,target.userId,planId,b.paymentRequired,b.complimentaryUntil||null,target.athleteId]);
   await c.query(`INSERT INTO lb_billing.invoices(id,subscription_id,plan_name,amount_cents,period_start,period_end,due_on,created_by,request_id,request_hash) VALUES($1,$2,$3,$4,$5::date,$6::date,$5::date,$7,$8,$9)`,[invoiceId,subscriptionId,b.name.trim(),b.amountCents,period.start,period.end,req.user.id,b.requestId,hash]);
   if(b.received){
    const entryId=randomUUID();
    await c.query(`INSERT INTO lb_billing.entries(id,request_id,subscription_id,kind,amount_cents,method,reason,recorded_by,valid_until,effective_on) VALUES($1,$2,$3,$4,$5,$6,$7,$8,(($9::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo')-interval '1 millisecond',$10::date)`,[entryId,'invoice-'+invoiceId,subscriptionId,['courtesy','trial'].includes(b.method)?'grant':'payment',b.amountCents,b.method,'Recebimento confirmado no cadastro simplificado',req.user.id,period.end,b.paidOn]);
    await c.query("UPDATE lb_billing.invoices SET status='paid',paid_on=$2::date,method=$3,entry_id=$4 WHERE id=$1",[invoiceId,b.paidOn,b.method,entryId]);
    // Preserve currently valid access; a future period cannot release an unpaid gap.
    await c.query("UPDATE lb_billing.subscriptions SET access_start=CASE WHEN valid_until>=now() THEN COALESCE(access_start,(now() AT TIME ZONE 'America/Sao_Paulo')::date) ELSE $2::date END,valid_until=(($3::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo')-interval '1 millisecond',suspended=false,renewal_cancelled=false WHERE id=$1",[subscriptionId,period.start,period.end]);
   }
   await c.query('INSERT INTO lb_billing.audit_events(id,subscription_id,action,reason,actor_id) VALUES($1,$2,$3,$4,$5)',[randomUUID(),subscriptionId,'simple-period',`${period.start} a ${period.end}; ${b.received?'recebido':'pendente'}`,req.user.id]);
   await c.query('COMMIT');res.status(201).json({confirmed:true,invoiceId,received:b.received});
  }catch(e:any){if(c)await c.query('ROLLBACK').catch(()=>{});res.status(400).json({error:e.message&& !e.code?e.message:'Não foi possível salvar o plano. Seus dados foram mantidos para tentar novamente.'});}finally{c?.release();}
 });return router;
}
