import {SportsValidationError} from './sportsValidation';
/** This endpoint replaces a complete snapshot. Omission is never a deletion command. */
export function assertCompleteSnapshots(athletes:any[]){
 for(const a of athletes){
  for(const key of ['name','dob','gender','modality','wellness','workouts','externalSessions','assessments'])if(!Object.hasOwn(a,key)||a[key]===undefined)throw new SportsValidationError('Cadastro incompleto. Sincronize antes de salvar; nenhum histórico foi removido.');
  for(const w of a.workouts||[])if(!Array.isArray(w.exercises))throw new SportsValidationError('Treino incompleto. Sincronize antes de salvar; a prescrição foi preservada.');
  if(a.historyComplete===false)throw new SportsValidationError('Histórico parcial. Carregue o cadastro completo antes de substituir dados.');
 }
}
