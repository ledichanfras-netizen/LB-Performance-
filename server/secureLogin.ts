import type {Pool} from 'pg';
import type {RequestHandler} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {allowAccountAttempt} from './accountRate';
import {hasSportsAccess} from './entitlement';
import {hasAIAccess} from './aiPolicy';
/** Both login URLs require the same active, organization-bound account. No legacy fallback. */
export function secureLogin(pool:Pool,secret:string):RequestHandler {
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  const {username,password}=req.body || {};
  if(typeof username!=='string'||!username.trim()||username.length>200||typeof password!=='string'||!password||Buffer.byteLength(password)>72){res.status(400).json({error:'Informe login e senha válidos.'});return;}
  if(!secret||secret==='your-secret-key-change-this-in-production'){res.status(503).json({error:'Acesso seguro temporariamente indisponível.'});return;}
  try{
   if(!await allowAccountAttempt(pool,'login',username.trim().toLowerCase())){res.status(429).json({error:'Muitas tentativas. Aguarde até 15 minutos.'});return;}
   const {rows}=await pool.query(`SELECT u.id,u.username,u.password,u.role,u.athlete_id,m.organization_id,m.platform_admin,m.session_version,m.ai_enabled
    FROM public.users u JOIN lb_accounts.memberships m ON m.user_id=u.id
    WHERE lower(u.username)=lower($1) AND m.active LIMIT 2`,[username.trim()]);
   const u=rows.length===1?rows[0]:null;
   if(!u||!['coach','athlete'].includes(u.role)||!u.organization_id||!/^\$2[aby]\$/.test(u.password || '')||!await bcrypt.compare(password,u.password)) {res.status(401).json({error:'Credenciais inválidas ou acesso desativado. Utilize o login recebido no convite.'});return;}
   if(u.role==='athlete'){
    const scoped=await pool.query(`SELECT 1 FROM lb_accounts.athlete_scopes s WHERE s.athlete_id=$1 AND s.organization_id=$2 AND NOT EXISTS(SELECT 1 FROM lb_accounts.athlete_archives a WHERE a.athlete_id=s.athlete_id)`,[u.athlete_id,u.organization_id]);
    if(!scoped.rows.length){res.status(401).json({error:'Acesso de aluno sem vínculo ativo. Solicite um novo convite ao treinador.'});return;}
   }
   const licensed=process.env.BILLING_ENABLED==='true' && await hasSportsAccess(pool,{user_id:u.id,organization_id:u.organization_id,role:u.role,athlete_id:u.athlete_id,platform_admin:u.platform_admin} as any);
   const token=jwt.sign({id:u.id,role:u.role,athleteId:u.athlete_id,organizationId:u.organization_id,accountMode:'scoped',sessionVersion:u.session_version,platformAdmin:u.platform_admin},secret,{expiresIn:'2h'});
   console.log(`[LOGIN] SUCESSO: [${u.username}] (Conta vinculada · ${u.role})`);
   res.json({token,aiEnabled:hasAIAccess({...u,active:true}),plan:u.platform_admin||licensed?'pro':'free',id:u.id,role:u.role,athleteId:u.athlete_id,organizationId:u.organization_id,platformAdmin:u.platform_admin,accountMode:'scoped'});
  }catch{console.error('[LOGIN] Verificação de conta indisponível.');res.status(503).json({error:'Não foi possível verificar seu acesso. Tente novamente.'});}
 };
}
