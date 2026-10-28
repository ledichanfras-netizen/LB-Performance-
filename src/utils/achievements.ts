import type { Athlete, MatchEvent } from '../types';
import { getLocalDateString } from '../utils';
export const achievementKinds = {champion:'Campeão / campeã',runner_up:'Vice-campeão / vice-campeã',podium:'Pódio',qualification:'Classificação',personal_best:'Recorde pessoal'} as const;
export const achievementDivisions = {overall:'Geral',category:'Categoria',team:'Equipe',singles:'Simples',doubles:'Duplas'} as const;
export const achievementMedals = {none:'Sem medalha informada',gold:'Ouro',silver:'Prata',bronze:'Bronze'} as const;
export type Achievement = {kind:keyof typeof achievementKinds;placement?:number;division:keyof typeof achievementDivisions;category:string;medal:keyof typeof achievementMedals;notes:string;status:'pending'|'confirmed';confirmedAt?:string};
export type AchievementRow = {athlete:Athlete;event:MatchEvent;achievement?:Achievement;legacy:boolean};
export const emptyAchievement = ():Achievement => ({kind:'podium',division:'overall',category:'',medal:'none',notes:'',status:'pending'});
export function readAchievement(input:any):Achievement|undefined {
 if(!input || !Object.hasOwn(achievementKinds,input.kind) || !Object.hasOwn(achievementDivisions,input.division) || !Object.hasOwn(achievementMedals,input.medal))return;
 const rank=input.placement;
 if(rank!==undefined && rank!=='' && (!Number.isInteger(Number(rank)) || Number(rank)<1 || Number(rank)>100000))return;
 return {kind:input.kind,division:input.division,category:String(input.category || '').slice(0,120),medal:input.medal,notes:String(input.notes || '').slice(0,1000),...(rank!==undefined && rank!==''?{placement:Number(rank)}:{}),status:input.status==='confirmed'?'confirmed':'pending',...(typeof input.confirmedAt==='string'?{confirmedAt:input.confirmedAt}:{})};
}
export function possibleLegacyAchievement(event:MatchEvent,today=getLocalDateString()) {
 if(event.achievement || event.achievementReview==='dismissed' || event.status==='Cancelado' || !event.date || event.date.slice(0,10)>today)return false;
 const text=`${event.sportSpecificData?.rankPosition || ''} ${event.postGameNotes || ''}`;
 return event.result==='Pódio' || /campe[ãa]o|campe[ãa](?=\s|$|[.,;:!?])|vice[ -]campe|p[oó]dio|medalh|classificad[oa]|recorde pessoal/i.test(text) || /^[1-3]\s*(?:º|°|ª|o\b|a\b|lugar|$)/i.test((event.sportSpecificData?.rankPosition || '').trim());
}
export function achievementRows(athletes:Athlete[],today=getLocalDateString()):AchievementRow[] {
 const seen=new Set<string>();const rows:AchievementRow[]=[];
 for(const athlete of athletes)for(const event of athlete.matches || []) {
  const key=`${athlete.id}:${event.id}`;if(seen.has(key) || event.status==='Cancelado')continue;seen.add(key);
  const achievement=readAchievement(event.achievement);const legacy=possibleLegacyAchievement(event,today);
  if(achievement || legacy)rows.push({athlete,event:{...event,athleteId:athlete.id},achievement,legacy});
 }
 return rows.sort((a,b)=>b.event.date.localeCompare(a.event.date));
}
export const confirmedAchievement=(row:AchievementRow,today=getLocalDateString())=>row.achievement?.status==='confirmed' && row.event.status==='Concluído' && row.event.date.slice(0,10)<=today;
export function achievementTotals(rows:AchievementRow[]) {
 const confirmed=rows.filter(r=>confirmedAchievement(r));
 return {athletes:new Set(confirmed.map(r=>r.athlete.id)).size,total:confirmed.length,titles:confirmed.filter(r=>r.achievement?.kind==='champion').length,podiums:confirmed.filter(r=>['champion','runner_up','podium'].includes(r.achievement!.kind)).length,gold:confirmed.filter(r=>r.achievement?.medal==='gold').length,silver:confirmed.filter(r=>r.achievement?.medal==='silver').length,bronze:confirmed.filter(r=>r.achievement?.medal==='bronze').length};
}
export function achievementDescription(a:Achievement){return `${achievementKinds[a.kind]}${a.placement?` · ${a.placement}º lugar`:''} · ${achievementDivisions[a.division]}${a.category?` · ${a.category}`:''}${a.medal!=='none'?` · medalha de ${achievementMedals[a.medal].toLowerCase()}`:''}`;}
