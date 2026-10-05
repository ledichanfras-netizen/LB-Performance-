import { Router, RequestHandler } from 'express';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
export function billingManagement(pool:Pool,admin:RequestHandler){
 const router=Router();router.use(admin);
 router.post('/:entity/:id/:action',async(req:any,res)=>{
  const {entity,id,action}=req.params;const b=req.body;
  const table=({plans:'plans',entries:'entries',subscriptions:'subscriptions'} as Record<string,string>)[entity];
  if(!table || !['edit','remove','date'].includes(action) || !/^[a-f0-9-]{36}$/i.test(id) || typeof b.reason!=='string' || !b.reason.trim() || b.reason.length>500)return res.status(400).json({error:'Informe o motivo da alteração.'});
  const c=await pool.connect();try{await c.query('BEGIN');
   const old=(await c.query(`SELECT * FROM lb_billing.${table} WHERE id=$1 FOR UPDATE`,[id])).rows[0];if(!old)throw Error('Registro não encontrado.');
   let after;
   if(action==='date'){
    if(!['entries','subscriptions'].includes(entity)||typeof b.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||new Date(b.date+'T12:00:00Z').toISOString().slice(0,10)!==b.date)throw Error('Data inválida.');
    if(entity==='entries'&&(old.voided_at||old.source!=='manual'))throw Error('Lançamentos do provedor ou cancelados não podem ter a data alterada.');
    const column=entity==='entries'?'effective_on':'registered_on';
    after=(await c.query(`UPDATE lb_billing.${table} SET ${column}=$2::date WHERE id=$1 RETURNING *`,[id,b.date])).rows[0];
   }else if(entity==='plans'){
    if(action==='remove'){
     // Archive rather than delete: existing contracts retain their plan reference.
     after=(await c.query('UPDATE lb_billing.plans SET archived=true WHERE id=$1 RETURNING *',[id])).rows[0];
    }else{
     if(typeof b.name!=='string'||!b.name.trim()||b.name.length>100||!['coach','athlete'].includes(b.audience)||!Number.isSafeInteger(b.priceCents)||b.priceCents<0||!Number.isInteger(b.durationDays)||b.durationDays<1||b.durationDays>366||!Number.isInteger(b.graceDays)||b.graceDays<0||b.graceDays>30||(b.athleteLimit!==null&&(!Number.isInteger(b.athleteLimit)||b.athleteLimit<1))||typeof b.deliveries!=='string'||b.deliveries.length>5000||typeof b.resources!=='string'||b.resources.length>5000)throw Error('Dados do plano inválidos.');
     const linked=(await c.query('SELECT 1 FROM lb_billing.subscriptions WHERE plan_id=$1 LIMIT 1',[id])).rows.length>0;
     if(linked&&(b.audience!==old.audience||b.athleteLimit!==old.athlete_limit||b.graceDays!==old.grace_days))throw Error('Plano vinculado: para alterar público, limite ou tolerância, crie outro pacote e transfira as assinaturas.');
     after=(await c.query('UPDATE lb_billing.plans SET name=$2,audience=$3,price_cents=$4,duration_days=$5,grace_days=$6,athlete_limit=$7,deliveries=$8,resources=$9 WHERE id=$1 RETURNING *',[id,b.name.trim(),b.audience,b.priceCents,b.durationDays,b.graceDays,b.athleteLimit,b.deliveries.trim(),b.resources.trim()])).rows[0];
    }
   }else if(entity==='entries'){
    if(old.voided_at)throw Error('Este lançamento já foi cancelado.');
    if(old.source!=='manual')throw Error('Lançamentos do provedor devem ser tratados na integração de pagamentos.');
    if(action==='remove')after=(await c.query('UPDATE lb_billing.entries SET voided_at=now() WHERE id=$1 RETURNING *',[id])).rows[0];
    else{
     if(!Number.isSafeInteger(b.amountCents)||b.amountCents<0||!['pix','cash','transfer','payment_link','courtesy','trial'].includes(b.method)||(old.kind==='grant'? !['courtesy','trial'].includes(b.method)||b.amountCents!==0 : ['courtesy','trial'].includes(b.method)))throw Error('Valor ou forma de pagamento inválidos.');
     after=(await c.query('UPDATE lb_billing.entries SET amount_cents=$2,method=$3,reason=$4 WHERE id=$1 RETURNING *',[id,b.amountCents,b.method,b.reason.trim()])).rows[0];
    }
   }else{
    if(action==='remove')after=(await c.query('UPDATE lb_billing.subscriptions SET suspended=true,renewal_cancelled=true WHERE id=$1 RETURNING *',[id])).rows[0];
    else{
     if(typeof b.validUntil!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.validUntil)||!Number.isFinite(Date.parse(b.validUntil)))throw Error('Vencimento inválido.');
     after=(await c.query("UPDATE lb_billing.subscriptions SET valid_until=(($2::date + interval '1 day') AT TIME ZONE 'America/Sao_Paulo') - interval '1 millisecond' WHERE id=$1 RETURNING *",[id,b.validUntil])).rows[0];
    }
   }
   await c.query('INSERT INTO lb_billing.management_audit(id,entity_type,entity_id,action,reason,actor_id,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),entity,id,action,b.reason.trim(),req.user.id,JSON.stringify(old),JSON.stringify(after)]);
   await c.query('COMMIT');res.json({updated:true});
  }catch(e:any){await c.query('ROLLBACK');res.status(400).json({error:e.message?.includes('inválid')||e.message?.startsWith('Plano vinculado')||e.message?.startsWith('Este lançamento')||e.message?.startsWith('Lançamentos do provedor')?e.message:'Não foi possível alterar este registro.'});}finally{c.release();}
 });return router;
}
