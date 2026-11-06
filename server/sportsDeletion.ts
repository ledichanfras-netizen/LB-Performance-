import { Router, type RequestHandler } from 'express';
import type { Pool } from 'pg';
import { ScopeDenied, mayAccessAthlete, scopedDelete } from './scope';

/** Every deletion stays scoped; an authorization or database failure is terminal. */
export function sportsDeletionRouter(pool: Pool, auth: RequestHandler) {
 const router=Router();
 const failure=(res:any,error:unknown)=>res.status(error instanceof ScopeDenied?403:503).json({error:error instanceof ScopeDenied?'Ação não permitida para este registro.':'Não foi possível confirmar a remoção. Tente novamente.'});
 router.delete('/atletas/:id',auth,async(req:any,res)=>{
  const account=req.account;
  if(!account||account.role!=='coach')return failure(res,new ScopeDenied());
  let client:any;
  try{
   client=await pool.connect(); await client.query('BEGIN');
   await client.query('SELECT id FROM public.athletes WHERE id=$1 FOR UPDATE',[req.params.id]);
   if(!await mayAccessAthlete(client,account,req.params.id))throw new ScopeDenied();
   await client.query('INSERT INTO lb_accounts.athlete_archives(athlete_id,organization_id,archived_by) VALUES($1,$2,$3) ON CONFLICT(athlete_id) DO NOTHING',[req.params.id,account.organization_id,account.user_id]);
   await client.query('UPDATE public.athletes SET updated_at=CURRENT_TIMESTAMP WHERE id=$1',[req.params.id]);
   await client.query('COMMIT'); return res.json({message:'Atleta arquivado. Histórico preservado.',deleted:true});
  }catch(error){if(client)await client.query('ROLLBACK').catch(()=>{});return failure(res,error);}
  finally{client?.release();}
 });
 for(const [path,type] of [['workouts','workouts'],['wellness','wellness'],['sessions','sessions']] as const){
  router.delete(`/${path}/:id`,auth,async(req:any,res)=>{
   if(!req.account)return failure(res,new ScopeDenied());
   try{return res.json(await scopedDelete(pool,req.account,type,req.params.id));}catch(error){return failure(res,error);}
  });
 }
 router.delete('/assessments/:type/:id',auth,async(req:any,res)=>{
  if(!req.account)return failure(res,new ScopeDenied());
  try{return res.json(await scopedDelete(pool,req.account,req.params.type,req.params.id));}catch(error){return failure(res,error);}
 });
 return router;
}
