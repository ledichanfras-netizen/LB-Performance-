import type {ExternalSession,MatchEvent} from '../types';
import {metricDay} from './metricTimeline';
export const externalActivities=['Futebol','Futsal','Tênis','Vôlei','Vôlei de praia','Basquete','Handebol','Corrida / Atletismo','Caminhada','Ciclismo','Natação','Triatlo','Duatlo','Musculação','Funcional','Mobilidade / recuperação','Outro'];
export const externalTypes={tecnico:'Técnico',tatico:'Tático',jogo:'Jogo / competição',amistoso:'Amistoso',recuperacao:'Recuperação ativa'};
export const externalHasDistance=(activity:string)=>/corrida|atletismo|caminhada|ciclismo|bike|nata[çc][aã]o|triat|duat/i.test(activity);
export const externalCompetitionId=(s:Partial<ExternalSession>,matches:MatchEvent[]=[])=>s.competitionId || matches.find(m=>`ext-${m.id}`===s.id)?.id || (s.id?.startsWith('ext-match-')?s.id.slice(4):undefined);
export function externalSessionColumns(s:any){
 const activity=s.activity, time=s.time??s.session_time, distance=Object.hasOwn(s,'distanceKm')?s.distanceKm:s.distance_km, competition=s.competitionId??s.competition_id;
 if(activity!==undefined&&activity!==null&&(typeof activity!=='string'||activity.length>120))throw Error('Atividade inválida.');
 if(time!==undefined&&time!==null&&(typeof time!=='string'||time!==''&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)))throw Error('Horário inválido.');
 if(distance!==undefined&&distance!==null&&(typeof distance!=='number'||!Number.isFinite(distance)||distance<0||distance>100000))throw Error('Distância inválida.');
 if(competition!==undefined&&competition!==null&&(typeof competition!=='string'||competition.length>200))throw Error('Vínculo de competição inválido.');
 return {activity:activity??null,session_time:time??null,distance_km:distance??null,competition_id:competition??externalCompetitionId(s)??null};
}
export const externalSessionFromRow=(s:any):ExternalSession=>({...s,durationMinutes:s.duration_minutes??s.durationMinutes,activity:s.activity||undefined,time:s.session_time??s.time??'',distanceKm:s.distance_km??s.distanceKm??null,competitionId:s.competition_id??s.competitionId??externalCompetitionId(s)});
const numeric=(v:unknown)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
export function externalLoad(s:Partial<ExternalSession>){const d=numeric(s.durationMinutes),r=numeric(s.rpe);return d!==null&&d>0&&r!==null&&r>=0&&r<=10?d*r:null;}
export function externalWeeklySummary(sessions:ExternalSession[],today:string){
 const end=metricDay(today)!;const start=end-((new Date(end).getUTCDay()+6)%7)*86400000;
 const rows=sessions.filter(s=>{const day=metricDay(s.date);return day!==null&&day>=start&&day<=end;});
 return {count:rows.length,duration:rows.reduce((n,s)=>n+(numeric(s.durationMinutes)??0),0),load:rows.reduce((n,s)=>n+(externalLoad(s)??0),0),coverage:rows.filter(s=>externalLoad(s)!==null).length};
}
export function sortExternalSessions(sessions:ExternalSession[]){return [...sessions].sort((a,b)=>(metricDay(b.date)??0)-(metricDay(a.date)??0)||(b.time||'').localeCompare(a.time||'')||b.id.localeCompare(a.id));}
