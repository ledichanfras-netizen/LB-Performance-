/** A later login resolves the financial history through the athlete's registered id. */
export const billingOwn=(alias='s',parameter='$2')=>`((${alias}.athlete_id IS NULL AND ${alias}.user_id=${parameter}) OR (${alias}.athlete_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.users payer WHERE payer.id=${parameter} AND payer.role='athlete' AND payer.athlete_id=${alias}.athlete_id)))`;
export async function billingTargets(db:any){
 return (await db.query(`SELECT 'athlete:'||a.id AS id,COALESCE(NULLIF(a.name,''),'Nome não informado') AS username,'athlete'::text AS role,a.id AS athlete_id,NULL::text AS user_id
 FROM public.athletes a WHERE NOT EXISTS(SELECT 1 FROM lb_accounts.athlete_archives ar WHERE ar.athlete_id=a.id)
 UNION ALL SELECT 'user:'||u.id,u.username,u.role,NULL::text,u.id FROM public.users u
 WHERE u.role='coach' OR (u.role='athlete' AND u.athlete_id IS NULL)
 ORDER BY username,id`)).rows;
}
export async function resolveBillingSubject(c:any,body:any){
 let athleteId=body.athleteId,user:any;
 if(body.userId){
  user=(await c.query('SELECT id,role,athlete_id FROM public.users WHERE id=$1',[body.userId])).rows[0];
  if(!user||!['athlete','coach'].includes(user.role))throw Error('Conta indisponível.');
  if(athleteId&&(user.role!=='athlete'||user.athlete_id!==athleteId))throw Error('Aluno e conta não correspondem.');
  if(user.role==='athlete'&&user.athlete_id)athleteId=user.athlete_id;
 }
 if(athleteId){
  const athlete=(await c.query(`SELECT a.id FROM public.athletes a WHERE a.id=$1 AND NOT EXISTS(SELECT 1 FROM lb_accounts.athlete_archives ar WHERE ar.athlete_id=a.id) FOR UPDATE OF a`,[athleteId])).rows[0];
  if(!athlete)throw Error('Aluno indisponível ou arquivado.');
  const current=(await c.query(`SELECT s.* FROM lb_billing.subscriptions s WHERE s.athlete_id=$1 OR EXISTS(SELECT 1 FROM public.users linked WHERE linked.id=s.user_id AND linked.role='athlete' AND linked.athlete_id=$1) FOR UPDATE OF s`,[athleteId])).rows;
  if(current.length>1)throw Error('Existem contratos antigos duplicados para este aluno. Confira os registros antes de lançar outro período.');
  return {role:'athlete',athleteId,userId:current[0]?.user_id||user?.id||null,current:current[0]};
 }
 if(!user)throw Error('Selecione o aluno ou treinador.');
 await c.query('SELECT id FROM public.users WHERE id=$1 FOR UPDATE',[user.id]);
 const current=(await c.query('SELECT * FROM lb_billing.subscriptions WHERE user_id=$1 FOR UPDATE',[user.id])).rows[0];
 return {role:user.role,athleteId:null,userId:user.id,current};
}
