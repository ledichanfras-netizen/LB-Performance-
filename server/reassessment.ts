import { readFollowUpType } from '../src/utils/followUp';
import { Router } from 'express';
import { mayAccessAthlete, ScopeDenied } from './scope';
import { assessmentLabels, readReassessmentPlan } from '../src/utils/reassessment';
import { normalizeBirthDate } from '../src/utils/birthDate';
const tables:Record<string,string>={imtp:'imtp',isometricStrength:'isometric_strength',cmj:'cmj',dropJump:'drop_jump',speed:'speed',vo2max:'vo2max',bioimpedance:'bioimpedance',postural:''};
export async function saveReassessmentPlan(pool:any,account:any,athleteId:string,input:any,now=new Date()) {
  if(account?.role!=='coach' || account.supervision)throw new ScopeDenied();
  const c=await pool.connect();
  try{
    await c.query('BEGIN');
    if(!await mayAccessAthlete(c,account,athleteId))throw new ScopeDenied();
    const owned=await c.query('SELECT id,injury_history FROM athletes WHERE id=$1 FOR UPDATE',[athleteId]);if(!owned.rows.length)throw new ScopeDenied();
    let plan:any=null;
    if(input!==null){
      if(readFollowUpType(owned.rows[0])==='assessment-only')throw new Error('Alunos de somente avaliações não possuem agendamento automático de reavaliação.');
      if(!input || !normalizeBirthDate(input.dueDate) || !Array.isArray(input.tests) || !input.tests.length || input.tests.length>8 || input.tests.some((t:any)=>typeof t!=='string' || !Object.hasOwn(assessmentLabels,t)))throw new Error('Selecione uma data válida e pelo menos uma avaliação.');
      const createdOn=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
      const baseline:any={};
      for(const type of [...new Set<string>(input.tests)]){
        if(!tables[type]) {
          let backup:any={};try{backup=JSON.parse(owned.rows[0].injury_history || '{}');}catch{}
          const row=(Array.isArray(backup.posturalBackup)?backup.posturalBackup:[]).filter((r:any)=>r?.id && normalizeBirthDate(r.date) && normalizeBirthDate(r.date)<=createdOn).sort((a:any,b:any)=>normalizeBirthDate(b.date).localeCompare(normalizeBirthDate(a.date)))[0];
          if(row)baseline[type]={id:row.id,date:normalizeBirthDate(row.date)};
          continue;
        }
        const {rows}=await c.query(`SELECT id,date FROM ${tables[type]} WHERE athlete_id=$1`,[athleteId]);
        // Production has both DATE and VARCHAR histories (IMTP / Drop Jump).
        const row=rows.filter((r:any)=>normalizeBirthDate(r.date) && normalizeBirthDate(r.date)<=createdOn).sort((a:any,b:any)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0) || String(b.id).localeCompare(String(a.id)))[0];
        if(row)baseline[type]={id:row.id,date:normalizeBirthDate(row.date)};
      }
      plan=readReassessmentPlan({dueDate:input.dueDate,tests:input.tests,createdOn,baseline});
      if(!plan)throw new Error('Agendamento inválido.');
    }
    await c.query('UPDATE athletes SET reassessment_plan=$2::jsonb,updated_at=CURRENT_TIMESTAMP WHERE id=$1',[athleteId,plan?JSON.stringify(plan):null]);
    await c.query('COMMIT');return {plan};
  }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
}
export function reassessmentRouter(pool:any){
 const router=Router();
 router.patch('/:id/reassessment',async(req:any,res)=>{
  if(!req.account || req.account.supervision || req.user?.supervision)return res.status(403).json({error:'Apenas o treinador responsável pode agendar.'});
  try{return res.json(await saveReassessmentPlan(pool,req.account,req.params.id,req.body?.plan));}
  catch(error:any){return res.status(error instanceof ScopeDenied?403:400).json({error:error instanceof ScopeDenied?'Atleta não autorizado.':error.message || 'Não foi possível salvar o agendamento.'});}
 });return router;
}
