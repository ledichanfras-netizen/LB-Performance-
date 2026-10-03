import { Router, RequestHandler } from 'express';
import { Pool } from 'pg';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { scopedAthletes } from './scope';

export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const validPassword = (password: unknown): password is string => typeof password === 'string' && password.length >= 12 && Buffer.byteLength(password,'utf8') <= 72;
export function accountRouter(pool: Pool, secret: string) {
 const router=Router();
 router.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store'); if(process.env.ACCOUNTS_ENABLED!=='true') return res.status(503).json({error:'Cadastro por convite ainda não ativado.'}); if(!process.env.JWT_SECRET) return res.status(503).json({error:'Configure a autenticação segura.'});next();});
 const run=(fn:any):RequestHandler=>async(req,res)=>{try{await fn(req,res);}catch(e:any){console.error('[Accounts]',e.code || 'error');res.status(e.message==='INVALID'?400:503).json({error:e.message==='INVALID'?'Dados inválidos ou convite indisponível.':'Não foi possível concluir o cadastro.'});}};
 const auth:RequestHandler=async(req:any,res,next)=>{
  try {const token=req.headers.authorization?.split(' ')[1];if(!token) return res.status(401).json({error:'Faça login.'});
   const claims=jwt.verify(token,secret) as any;
   if(claims.accountMode!=='scoped') return res.status(401).json({error:'Entre pelo login seguro.'});
   const {rows}=await pool.query('SELECT m.*,u.role,u.athlete_id FROM lb_accounts.memberships m JOIN public.users u ON u.id=m.user_id WHERE m.user_id=$1 AND m.active', [claims.id]);
   if(!rows[0] || rows[0].session_version!==claims.sessionVersion) return res.status(401).json({error:'Sessão inválida.'});req.account=rows[0];next();
  }catch{res.status(401).json({error:'Sessão inválida.'});}
 };
 router.post('/login',run(async(req:any,res:any)=>{
  const {username,password}=req.body;if(typeof username!=='string' || typeof password!=='string' || Buffer.byteLength(password)>72) throw Error('INVALID');
  const {rows}=await pool.query('SELECT u.*,m.organization_id,m.platform_admin,m.session_version FROM public.users u JOIN lb_accounts.memberships m ON m.user_id=u.id WHERE lower(u.username)=lower($1) AND m.active',[username.trim()]);
  const u=rows[0];if(!u || !/^\$2[aby]\$/.test(u.password || '') || !await bcrypt.compare(password,u.password)) return res.status(401).json({error:'Credenciais inválidas.'});
  const token=jwt.sign({id:u.id,role:u.role,athleteId:u.athlete_id,organizationId:u.organization_id,accountMode:'scoped',sessionVersion:u.session_version},secret,{expiresIn:'2h'});
  res.json({token,id:u.id,role:u.role,athleteId:u.athlete_id,organizationId:u.organization_id,platformAdmin:u.platform_admin,accountMode:'scoped'});
 }));
 router.post('/accept',run(async(req:any,res:any)=>{
  const {token,password}=req.body;if(typeof token!=='string' || !/^[a-f0-9]{64}$/.test(token) || !validPassword(password)) throw Error('INVALID');
  const passwordHash=await bcrypt.hash(password,12);const client=await pool.connect();
  try{await client.query('BEGIN');const {rows}=await client.query('SELECT * FROM lb_accounts.invites WHERE token_hash=$1 AND accepted_at IS NULL AND expires_at>now() FOR UPDATE',[tokenHash(token)]);const invite=rows[0];if(!invite) throw Error('INVALID');
   const id=randomUUID();await client.query("INSERT INTO public.users(id,username,password,role,athlete_id,plan) VALUES($1,$2,$3,$4,$5,'free')",[id,invite.username,passwordHash,invite.role,invite.athlete_id]);
   await client.query('INSERT INTO lb_accounts.memberships(user_id,organization_id) VALUES($1,$2)',[id,invite.organization_id]);
   await client.query('UPDATE lb_accounts.invites SET accepted_at=now() WHERE id=$1',[invite.id]);await client.query('COMMIT');res.status(201).json({created:true});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }));
 router.use(auth);
 router.get('/me',(req:any,res)=>res.json(req.account));
 router.get('/athletes',run(async(req:any,res:any)=>res.json(await scopedAthletes(pool,req.account))));
 router.post('/organizations',run(async(req:any,res:any)=>{
  if(!req.account.platform_admin) return res.status(403).json({error:'Apenas o administrador.'});
  const {name}=req.body;if(typeof name!=='string' || !name.trim() || name.length>100) throw Error('INVALID');
  const {rows}=await pool.query('INSERT INTO lb_accounts.organizations(id,name) VALUES($1,$2) RETURNING *',[randomUUID(),name.trim()]);res.status(201).json(rows[0]);
 }));
 router.post('/invites',run(async(req:any,res:any)=>{
  if(!req.account.platform_admin) return res.status(403).json({error:'Apenas o administrador pode convidar.'});
  const {organizationId,username,role,athleteId=null}=req.body;
  if(typeof username!=='string' || !/^[a-zA-Z0-9._@-]{3,100}$/.test(username) || !['coach','athlete'].includes(role) || (role==='coach' && athleteId!==null) || (role==='athlete' && typeof athleteId!=='string')) throw Error('INVALID');
  const existing=await pool.query('SELECT id FROM public.users WHERE lower(username)=lower($1)',[username]);if(existing.rows.length) throw Error('INVALID');
  if(role==='athlete'){const scope=await pool.query('SELECT athlete_id FROM lb_accounts.athlete_scopes WHERE athlete_id=$1 AND organization_id=$2',[athleteId,organizationId]);if(!scope.rows.length) throw Error('INVALID');}
  const token=randomBytes(32).toString('hex');const {rows}=await pool.query("INSERT INTO lb_accounts.invites(id,token_hash,organization_id,username,role,athlete_id,created_by,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '48 hours') RETURNING id,expires_at",[randomUUID(),tokenHash(token),organizationId,username,role,athleteId,req.account.user_id]);
  res.status(201).json({...rows[0],token});
 }));
 return router;
}
