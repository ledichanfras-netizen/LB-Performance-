import {Router} from 'express';
import {isDeepStrictEqual} from 'node:util';
import {mayAccessAthlete, ScopeDenied} from './scope';
import {sportsReadScope} from './readScope';
import {SportsValidationError} from './sportsValidation';
import {SyncConflict, syncRevision} from './workoutSync';
import {anamnesisBackupFields, readAnamnesisBackup} from './anamnesis';

/** Save this history only. Historical wellness/workout data is neither accepted nor rewritten. */
export async function saveAnamnesisHistory(pool:any, account:any, athleteId:string, body:any) {
  sportsReadScope(account);
  if(account.supervision) throw new ScopeDenied();
  if(typeof athleteId!=='string' || !athleteId || athleteId.length>200 || !body || !Array.isArray(body.history) ||
      Object.keys(body).some(key=>!['history','baseRevision'].includes(key))) throw new SportsValidationError('Histórico de anamnese inválido.');
  const {anamnesis:history} = anamnesisBackupFields({id:athleteId,anamnesis:body.history});
  const client=await pool.connect(); let discard=false;
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout='5000ms'");
    await client.query("SET LOCAL statement_timeout='15000ms'");
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[account.organization_id]);
    if(!await mayAccessAthlete(client,account,athleteId)) throw new ScopeDenied();
    const result=await client.query('SELECT injury_history,updated_at FROM public.athletes WHERE id=$1 FOR UPDATE',[athleteId]);
    const stored=result.rows[0]; if(!stored) throw new ScopeDenied();
    const receipt=(revision:unknown)=>({confirmed:true,athleteId,anamnesis:history,syncRevisions:{[athleteId]:syncRevision(revision)}});
    const existing=readAnamnesisBackup(stored.injury_history);
    // Retrying a committed request after a lost response must not create a duplicate or fail on its own revision.
    if(existing!==undefined && isDeepStrictEqual(existing,history)) {
      await client.query('COMMIT'); return receipt(stored.updated_at);
    }
    // Athletes can correct their own answers; removing stored records remains a coach action.
    if(account.role==='athlete' && (existing || []).some(record=>
      !history!.some(incoming=>incoming.id===record.id))) throw new ScopeDenied();
    if(!syncRevision(body.baseRevision) || syncRevision(body.baseRevision)!==syncRevision(stored.updated_at)) throw new SyncConflict();
    let backup:any={legacy:stored.injury_history || ''};
    try { const parsed=JSON.parse(stored.injury_history); if(parsed && typeof parsed==='object' && !Array.isArray(parsed)) backup=parsed; } catch {}
    const saved=await client.query('UPDATE public.athletes SET injury_history=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING updated_at',
      [JSON.stringify({...backup,anamnesis:history}),athleteId]);
    await client.query('COMMIT'); return receipt(saved.rows[0].updated_at);
  } catch(error) {try{await client.query('ROLLBACK');}catch{discard=true;} throw error;}
  finally{client.release(discard);}
}

export function anamnesisSaveRouter(pool:any) {
  const router=Router();
  router.put('/:id/anamnesis',async(req:any,res)=>{
    res.setHeader('Cache-Control','no-store');
    try{return res.json(await saveAnamnesisHistory(pool,req.account,req.params.id,req.body));}
    catch(error){const status=error instanceof ScopeDenied?403:error instanceof SyncConflict?409:error instanceof SportsValidationError?400:503;
      return res.status(status).json({error:status===409?'O cadastro foi atualizado em outro dispositivo. Sincronize antes de tentar novamente; mantenha a cópia local.':
        status===403?'Esta anamnese não está disponível para a conta.':status===400?(error as Error).message:'Não foi possível confirmar a anamnese no banco. Mantenha a cópia local.',
        ...(status===409?{code:'SYNC_CONFLICT'}:{})});}
  });
  return router;
}
