import test from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';
import {achievementRows,achievementTotals,emptyAchievement,possibleLegacyAchievement} from '../src/utils/achievements';
import {achievementReportHTML} from '../src/components/AchievementsPanel';
import {mergeStudentCompetitionMatches} from './competitionAchievements';
import {saveStudentData} from './studentSave';
const event=(patch:any={}):any=>({id:'event',athleteId:'a',title:'Torneio',sport:'Tênis',type:'Torneio / Etapa',date:'2026-01-01',venueType:'Casa',priority:'A',status:'Concluído',result:'Vitória',...patch});
const conquest=(patch:any={})=>({...emptyAchievement(),kind:'champion',status:'confirmed',...patch});
test('totals count confirmed participations once, exclude pending/cancelled/future, and never infer medals from podiums',()=>{
 const a:any={id:'a',name:'Ana',matches:[event({achievement:conquest()}),event({achievement:conquest()}),event({id:'silver',achievement:conquest({kind:'runner_up',medal:'silver'})}),event({id:'pending',achievement:conquest({status:'pending',medal:'gold'})}),event({id:'future',date:'2999-01-01',achievement:conquest()}),event({id:'cancel',status:'Cancelado',achievement:conquest()})]};
 const b:any={id:'b',name:'Bia',matches:[event({achievement:conquest({kind:'personal_best'})})]};
 const rows=achievementRows([a,b]);assert.equal(rows.find(r=>r.athlete.id==='b')!.event.athleteId,'b');
 assert.deepEqual(achievementTotals(rows),{athletes:2,total:3,titles:1,podiums:2,gold:0,silver:1,bronze:0});
});
test('old podiums, rankings and notes are review candidates; a match win alone is not a title',()=>{
 assert.equal(possibleLegacyAchievement(event()),false);
 for(const patch of [{result:'Pódio'},{postGameNotes:'Campeã ITF Sub-18'},{sportSpecificData:{rankPosition:'3º categoria'}}])assert.equal(possibleLegacyAchievement(event(patch)),true);
 assert.equal(possibleLegacyAchievement(event({scoreOrTime:'2x0'})),false);
 assert.equal(possibleLegacyAchievement(event({result:'Pódio',achievementReview:'dismissed'})),false);
 assert.equal(achievementTotals(achievementRows([{id:'a',matches:[event({result:'Pódio'})]} as any])).total,0);
});
test('athlete cannot self-confirm, change confirmed facts silently, dismiss coach review or write another owner',()=>{
 const existing=event({achievement:conquest({confirmedAt:'2026-01-02T12:00:00Z'}),achievementReview:'dismissed'});
 const unchanged=mergeStudentCompetitionMatches([existing],[existing],'a')[0];assert.equal(unchanged.achievement.status,'confirmed');
 assert.equal(mergeStudentCompetitionMatches([existing],[{...existing,achievement:undefined}],'a')[0].achievement.status,'confirmed');
 const changed=mergeStudentCompetitionMatches([existing],[{...existing,achievement:conquest({medal:'gold'})}],'a')[0];assert.equal(changed.achievement.status,'pending');assert.equal(changed.achievement.confirmedAt,undefined);
 const newEvent=mergeStudentCompetitionMatches([],[existing],'a')[0];assert.equal(newEvent.achievement.status,'pending');assert.equal(newEvent.achievementReview,undefined);
 assert.throws(()=>mergeStudentCompetitionMatches([],[{...existing,athleteId:'b'}],'a'));
 assert.throws(()=>mergeStudentCompetitionMatches([],[{...existing,achievement:{kind:'invented'}}],'a'));
 assert.equal(mergeStudentCompetitionMatches([existing],[],'a').length,1);
});
test('student result submission persists with pending review without modifying profile metadata, prescription or other athletes',async()=>{
 const db=new PGlite();try{
 await db.exec(`CREATE SCHEMA lb_accounts;CREATE TABLE lb_accounts.athlete_scopes(athlete_id text,organization_id text);CREATE TABLE lb_accounts.athlete_archives(athlete_id text);
 CREATE TABLE athletes(id text PRIMARY KEY,updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,injury_history text);
 CREATE TABLE workouts(id text,athlete_id text,archived_at timestamptz);
 INSERT INTO athletes(id,injury_history) VALUES('a','{"legacy":"Histórico preservado","reassessmentPlan":{"dueDate":"2027-01-01"},"matches":[]}'),('b','outro');
 INSERT INTO lb_accounts.athlete_scopes VALUES('a','org'),('b','other');`);
 const adapter={query:(sql:string,p?:any[])=>db.query(sql,p),connect:async()=>({query:(sql:string,p?:any[])=>db.query(sql,p),release(){}})} as any;
 const account={user_id:'student',role:'athlete',athlete_id:'a',organization_id:'org'} as any;
 const result=await saveStudentData(adapter,account,[{id:'a',injuryHistory:'overwrite',matches:[event({achievement:conquest({medal:'gold'})})]}]);
 const stored=JSON.parse((await db.query("SELECT injury_history FROM athletes WHERE id='a'")).rows[0].injury_history as string);
 assert.equal(stored.legacy,'Histórico preservado');assert.equal(stored.reassessmentPlan.dueDate,'2027-01-01');assert.equal(stored.matches[0].achievement.status,'pending');assert.equal(result.matchesByAthlete.a[0].achievement.status,'pending');
 await assert.rejects(()=>saveStudentData(adapter,account,[{id:'b',matches:[]} ]));
 assert.equal((await db.query("SELECT injury_history FROM athletes WHERE id='b'")).rows[0].injury_history,'outro');
 }finally{await db.close();}
});
test('report includes confirmed results only and escapes all user text',()=>{
 const rows=achievementRows([{id:'a',name:'<script>alert(1)</script>',matches:[event({title:'<img src=x>',achievement:conquest()}),event({id:'pending',title:'PENDING_SECRET',achievement:conquest({status:'pending'})})]} as any]);
 const html=achievementReportHTML(rows,'<period>');assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('&lt;img src=x&gt;'));assert.ok(!html.includes('PENDING_SECRET'));assert.ok(!html.includes('<script>'));
});
