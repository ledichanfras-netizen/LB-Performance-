import { Router, RequestHandler } from 'express';
import { Pool } from 'pg';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supervisorRouter } from './supervisor';
import { setupAdministrator } from './adminSetup';
import { hasSportsAccess } from './entitlement';
import { allowAccountAttempt } from './accountRate';
import { scopedAthletes, scopedDelete, scopedAthleteProfile, mayAccessAthlete, ScopeDenied } from './scope';

export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const validPassword = (password: unknown): password is string => typeof password === 'string' && password.length >= 12 && Buffer.byteLength(password,'utf8') <= 72;
export function accountRouter(pool: Pool, secret: string) {
 const router=Router();
 router.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store'); if(process.env.ACCOUNTS_ENABLED!=='true') return res.status(503).json({error:'Cadastro por convite ainda não ativado.'}); if(!process.env.JWT_SECRET) return res.status(503).json({error:'Configure a autenticação segura.'});next();});
 const run=(fn:any):RequestHandler=>async(req,res)=>{try{await fn(req,res);}catch(e:any){console.error('[Accounts]',e.code || 'error');res.status(e instanceof ScopeDenied ? 403 : e.message==='INVALID'?400:503).json({error:e instanceof ScopeDenied ? 'Registro indisponível ou ação não permitida.' : e.message==='INVALID'?'Dados inválidos ou convite indisponível.':'Não foi possível concluir o cadastro.'});}};
 const auth:RequestHandler=async(req:any,res,next)=>{
  try {const token=req.headers.authorization?.split(' ')[1];if(!token) return res.status(401).json({error:'Faça login.'});
   const claims=jwt.verify(token,secret) as any;
   if(claims.supervision===true)return res.status(403).json({error:'Supervisão permite somente consulta no aplicativo.'});
   if(claims.accountMode!=='scoped') return res.status(401).json({error:'Entre pelo login seguro.'});
   const {rows}=await pool.query('SELECT m.*,u.role,u.athlete_id FROM lb_accounts.memberships m JOIN public.users u ON u.id=m.user_id WHERE m.user_id=$1 AND m.active', [claims.id]);
   if(!rows[0] || rows[0].session_version!==claims.sessionVersion) return res.status(401).json({error:'Sessão inválida.'});req.account=rows[0];next();
  }catch{res.status(401).json({error:'Sessão inválida.'});}
 };
 router.post('/setup-admin',run(async(req:any,res:any)=>res.json(await setupAdministrator(pool,req.body.token,req.body.password))));
 router.post('/login',run(async(req:any,res:any)=>{
  const {username,password}=req.body;if(typeof username!=='string' || typeof password!=='string' || Buffer.byteLength(password)>72) throw Error('INVALID');
  if(!await allowAccountAttempt(pool,'login',username.trim().toLowerCase())) return res.status(429).json({error:'Muitas tentativas. Aguarde até 15 minutos.'});
  const {rows}=await pool.query('SELECT u.*,m.organization_id,m.platform_admin,m.session_version FROM public.users u JOIN lb_accounts.memberships m ON m.user_id=u.id WHERE lower(u.username)=lower($1) AND m.active',[username.trim()]);
  const u=rows[0];if(!u || !/^\$2[aby]\$/.test(u.password || '') || !await bcrypt.compare(password,u.password)) return res.status(401).json({error:'Credenciais inválidas.'});
  const token=jwt.sign({id:u.id,role:u.role,athleteId:u.athlete_id,organizationId:u.organization_id,accountMode:'scoped',sessionVersion:u.session_version},secret,{expiresIn:'2h'});
  const licensed=process.env.BILLING_ENABLED==='true' && await hasSportsAccess(pool,{user_id:u.id,organization_id:u.organization_id,role:u.role,athlete_id:u.athlete_id,platform_admin:u.platform_admin} as any);
  res.json({token,plan:u.platform_admin || licensed ? 'pro' : 'free',id:u.id,role:u.role,athleteId:u.athlete_id,organizationId:u.organization_id,platformAdmin:u.platform_admin,accountMode:'scoped'});
 }));
 router.post('/accept',run(async(req:any,res:any)=>{
  const {token,password}=req.body;if(typeof token!=='string' || !/^[a-f0-9]{64}$/.test(token) || !validPassword(password)) throw Error('INVALID');
  if(!await allowAccountAttempt(pool,'accept',token)) return res.status(429).json({error:'Muitas tentativas. Aguarde até 15 minutos.'});
  const passwordHash=await bcrypt.hash(password,12);const client=await pool.connect();
  try{await client.query('BEGIN');const {rows}=await client.query('SELECT * FROM lb_accounts.invites WHERE token_hash=$1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now() FOR UPDATE',[tokenHash(token)]);const invite=rows[0];if(!invite) throw Error('INVALID');
   const id=invite.target_user_id || randomUUID();
   if(invite.target_user_id){
    const target=await client.query('SELECT id FROM public.users WHERE id=$1 AND role=$2 AND lower(username)=lower($3) AND athlete_id IS NOT DISTINCT FROM $4 FOR UPDATE',[id,invite.role,invite.username,invite.athlete_id]);
    if(!target.rows.length)throw Error('INVALID');
    await client.query('UPDATE public.users SET password=$1 WHERE id=$2',[passwordHash,id]);
   }else await client.query("INSERT INTO public.users(id,username,password,role,athlete_id,plan) VALUES($1,$2,$3,$4,$5,'free')",[id,invite.username,passwordHash,invite.role,invite.athlete_id]);
   const membership=await client.query('INSERT INTO lb_accounts.memberships(user_id,organization_id) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET session_version=lb_accounts.memberships.session_version+1 WHERE lb_accounts.memberships.organization_id=EXCLUDED.organization_id RETURNING user_id',[id,invite.organization_id]);
   if(!membership.rows.length)throw Error('INVALID');
   await client.query('UPDATE lb_accounts.invites SET accepted_at=now() WHERE id=$1',[invite.id]);await client.query('COMMIT');res.status(201).json({created:true});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }));
 router.use(auth);
 router.use('/supervisor',supervisorRouter(pool,secret));
 router.get('/me',(req:any,res)=>res.json(req.account));
 router.get('/athletes',run(async(req:any,res:any)=>res.json(await scopedAthletes(pool,req.account))));
 router.patch('/athletes/:id/profile',run(async(req:any,res:any)=>res.json(await scopedAthleteProfile(pool,req.account,req.params.id,req.body))));
 router.delete('/records/:type/:id',run(async(req:any,res:any)=>res.json(await scopedDelete(pool,req.account,req.params.type,req.params.id))));
 router.get('/athletes/:id/ai-context',run(async(req:any,res:any)=>{
  if(req.account.role!=='coach' || !await mayAccessAthlete(pool,req.account,req.params.id)) throw new ScopeDenied();
  const {rows}=await pool.query('SELECT id,name,modality FROM public.athletes WHERE id=$1',[req.params.id]);
  res.json({athlete:rows[0]});
 }));
 router.get('/organizations',run(async(req:any,res:any)=>{if(!req.account.platform_admin)return res.status(403).json({error:'Apenas o administrador.'});res.json((await pool.query('SELECT id,name FROM lb_accounts.organizations ORDER BY name')).rows);}));
 router.post('/organizations',run(async(req:any,res:any)=>{
  if(!req.account.platform_admin) return res.status(403).json({error:'Apenas o administrador.'});
  const {name}=req.body;if(typeof name!=='string' || !name.trim() || name.length>100) throw Error('INVALID');
  const {rows}=await pool.query('INSERT INTO lb_accounts.organizations(id,name) VALUES($1,$2) RETURNING *',[randomUUID(),name.trim()]);res.status(201).json(rows[0]);
 }));
 router.post('/invites',run(async(req:any,res:any)=>{
  if(!req.account.platform_admin) return res.status(403).json({error:'Apenas o administrador pode convidar.'});
  const organizationId=typeof req.body.organizationId==='string'?req.body.organizationId.trim().toLowerCase():'';
  const username=typeof req.body.username==='string'?req.body.username.trim():'';
  const role=req.body.role;const athleteId=typeof req.body.athleteId==='string'?req.body.athleteId.trim()||null:null;
  if(!/^[a-zA-Z0-9._@-]{3,100}$/.test(username))return res.status(400).json({error:'Use um usuário de 3 a 100 caracteres, sem espaços: letras, números, ponto, hífen ou @.'});
  if(!['coach','athlete'].includes(role))return res.status(400).json({error:'Selecione Treinador ou Aluno.'});
  if((role==='coach' && athleteId!==null) || (role==='athlete' && !athleteId))return res.status(400).json({error:'Para aluno, informe seu identificador. Para treinador, deixe o identificador de aluno vazio.'});
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(organizationId) || !(await pool.query('SELECT id FROM lb_accounts.organizations WHERE id=$1',[organizationId])).rows.length)return res.status(400).json({error:'Selecione uma organização cadastrada.'});
  const existing=await pool.query('SELECT id,role,athlete_id FROM public.users WHERE lower(username)=lower($1)',[username]);
  let targetId=null;
  if(existing.rows.length){const u=existing.rows[0];if(u.role!==role || (role==='athlete' && u.athlete_id!==athleteId))return res.status(400).json({error:'Esse usuário já pertence a outra conta. Escolha um novo nome de usuário.'});
   const member=await pool.query('SELECT organization_id,platform_admin FROM lb_accounts.memberships WHERE user_id=$1',[u.id]);
   if(member.rows[0]?.platform_admin)return res.status(400).json({error:'Esse é o usuário administrador. Use um novo usuário para o treinador, por exemplo treinador.teste.'});
   if(member.rows[0] && member.rows[0].organization_id!==organizationId)return res.status(400).json({error:'Esse usuário pertence a outra organização. Escolha um novo usuário.'});
   if(role==='coach' && !member.rows.length)return res.status(400).json({error:'Conta existente sem organização. Use um novo usuário para este convite.'});targetId=u.id;
  }
  if(role==='athlete'){const scope=await pool.query('SELECT athlete_id FROM lb_accounts.athlete_scopes WHERE athlete_id=$1 AND organization_id=$2',[athleteId,organizationId]);if(!scope.rows.length)return res.status(400).json({error:'O aluno não está vinculado à organização selecionada.'});}
  await pool.query('UPDATE lb_accounts.invites SET revoked_at=now() WHERE lower(username)=lower($1) AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at<=now()',[username]);
  if((await pool.query('SELECT id FROM lb_accounts.invites WHERE lower(username)=lower($1) AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now()',[username])).rows.length)return res.status(409).json({error:'Já existe um convite válido para esse usuário. Use o convite anterior ou aguarde sua expiração.'});
  const token=randomBytes(32).toString('hex');const {rows}=await pool.query("INSERT INTO lb_accounts.invites(id,token_hash,organization_id,username,role,athlete_id,created_by,expires_at,target_user_id) VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '48 hours',$8) RETURNING id,expires_at",[randomUUID(),tokenHash(token),organizationId,username,role,athleteId,req.account.user_id,targetId]);
  res.status(201).json({...rows[0],token});
 }));
 return router;
}
