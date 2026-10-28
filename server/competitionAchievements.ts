import {readAchievement} from '../src/utils/achievements';
import {normalizeBirthDate} from '../src/utils/birthDate';
import {ScopeDenied} from './scope';
const sports=['Futebol','Vôlei','Basquete','Tênis','Corrida / Atletismo','Ciclismo','Natação','Triatlo','Handebol','Outro'];
const textFields=['title','time','opponentOrEventName','location','preGameNotes','scoreOrTime','postGameNotes'];
const numberFields=['preGameTargetReadiness','preGameReadinessScore','durationMinutes','postRpe','postLoad','sorenessPost','travelFatiguePost'];
const sameAchievement=(a:any,b:any)=>JSON.stringify(a?{...a,status:undefined,confirmedAt:undefined}:null)===JSON.stringify(b?{...b,status:undefined,confirmedAt:undefined}:null);
/** Athletes may report their own results, but only coaches can confirm achievements. */
export function mergeStudentCompetitionMatches(existing:any[],incoming:any,athleteId:string){
 if(!Array.isArray(incoming)||incoming.length>1000)throw new ScopeDenied();
 const merged=new Map((existing || []).map(m=>[m.id,m]));const seen=new Set<string>();
 for(const input of incoming){
  if(!input||typeof input.id!=='string'||!input.id||input.id.length>200||seen.has(input.id)||input.athleteId!==athleteId)throw new ScopeDenied();seen.add(input.id);
  if(!normalizeBirthDate(input.date)||!sports.includes(input.sport)||!['Jogo / Partida','Prova / Corrida','Torneio / Etapa','Amistoso','Treino Tático / Simulado'].includes(input.type)||!['Casa','Fora','Neutro'].includes(input.venueType)||!['A','B','C'].includes(input.priority)||!['Agendado','Concluído','Cancelado'].includes(input.status))throw new ScopeDenied();
  const previous=merged.get(input.id);const clean:any={...previous,id:input.id,athleteId,date:normalizeBirthDate(input.date),sport:input.sport,type:input.type,venueType:input.venueType,priority:input.priority,status:input.status};
  for(const key of textFields)if(input[key]!==undefined){if(typeof input[key]!=='string'||input[key].length>5000)throw new ScopeDenied();clean[key]=input[key];}
  for(const key of numberFields)if(input[key]!==undefined){if(typeof input[key]!=='number'||!Number.isFinite(input[key])||input[key]<0||input[key]>1e7)throw new ScopeDenied();clean[key]=input[key];}
  if(input.preGameCheckinDone!==undefined){if(typeof input.preGameCheckinDone!=='boolean')throw new ScopeDenied();clean.preGameCheckinDone=input.preGameCheckinDone;}
  if(input.result!==undefined){if(!['Vitória','Derrota','Empate','Concluído','Pódio','DNF','Pendente'].includes(input.result))throw new ScopeDenied();clean.result=input.result;}
  if(input.sportSpecificData!==undefined){
   if(!input.sportSpecificData||typeof input.sportSpecificData!=='object'||Array.isArray(input.sportSpecificData))throw new ScopeDenied();
   clean.sportSpecificData={};
   for(const key of ['minutesPlayed','goalsScored','assists','setsPlayed','pointsScored','distanceKm','elevationGainMeters','gamesWon','firstServePct'])if(input.sportSpecificData[key]!==undefined){const v=input.sportSpecificData[key];if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1e7)throw new ScopeDenied();clean.sportSpecificData[key]=v;}
   for(const key of ['paceAvg','rankPosition'])if(input.sportSpecificData[key]!==undefined){const v=input.sportSpecificData[key];if(typeof v!=='string'||v.length>200)throw new ScopeDenied();clean.sportSpecificData[key]=v;}
  }
  const achievement=readAchievement(input.achievement);if(input.achievement&&!achievement)throw new ScopeDenied();
  const prior=readAchievement(previous?.achievement);
  const sameContext=previous&&['title','date','sport','type','result','status','scoreOrTime'].every(k=>previous[k]===clean[k]) && previous.sportSpecificData?.rankPosition===clean.sportSpecificData?.rankPosition;
  if(prior?.status==='confirmed'&&sameContext&&(!achievement||sameAchievement(prior,achievement)))clean.achievement=prior;
  else if(prior?.status==='confirmed'&&!achievement)clean.achievement={...prior,status:'pending',confirmedAt:undefined};
  else clean.achievement=achievement?{...achievement,status:'pending',confirmedAt:undefined}:undefined;
  clean.achievementReview=previous?.achievementReview;
  if(achievement)clean.achievementReview=undefined;
  merged.set(input.id,clean);
 }
 return [...merged.values()];
}
export async function saveStudentCompetitions(client:any,athlete:any){
 if(!Object.hasOwn(athlete,'matches'))return;
 const {rows}=await client.query('SELECT injury_history FROM athletes WHERE id=$1 FOR UPDATE',[athlete.id]);
 let metadata:any={};const original=rows[0]?.injury_history;
 try{metadata=JSON.parse(original || '{}');if(!metadata||typeof metadata!=='object'||Array.isArray(metadata))metadata={legacy:original || ''};}catch{metadata={legacy:original || ''};}
 metadata.matches=mergeStudentCompetitionMatches(Array.isArray(metadata.matches)?metadata.matches:[],athlete.matches,athlete.id);
 await client.query('UPDATE athletes SET injury_history=$1 WHERE id=$2',[JSON.stringify(metadata),athlete.id]);
 return metadata.matches;
}
