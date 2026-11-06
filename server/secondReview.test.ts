import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {rootCertificates} from 'node:tls';
import {X509Certificate} from 'node:crypto';
import {weeklyLoadMetrics,acwrMetrics} from '../src/utils/loadWindows';
import {readAnySessionDraft,readSessionDraft,writeSessionDraft,recoverDraftResults,resumedElapsedSeconds,resumedDurationNeedsConfirmation} from '../src/utils/sessionDraft';
import {fetchWithDeadline,RequestTimeout} from '../src/utils/requestDeadline';
import {databaseConnectionOptions} from '../src/db/connectionOptions';
import {assertCompleteSnapshots} from './snapshotContract';
import {loadPerformanceContext,performancePrompt} from './performanceContext';
import {buildGymContext} from '../src/utils/periodizationIntelligence';
const session=(date:string,rpe=5,durationMinutes=20)=>({date,rpe,durationMinutes,status:'completed'});

test('weekly load uses seven calendar days and sums every session on each day',()=>{
 const week=Array.from({length:7},(_,i)=>session(`2026-11-0${i+1}`,i));
 const result=weeklyLoadMetrics([...week,session('2026-11-07'),session('2026-10-01',10,1000),session('2026-11-08',10,1000)],[],'2026-11-07');
 assert.equal(result.recordedDays,7);assert.equal(result.totalLoad,520);assert.equal(result.sessionCount,8);assert.ok(result.monotony!>0);assert.equal(result.strain,Math.round(520*result.monotony!));
 assert.equal(weeklyLoadMetrics(week.slice(1),[],'2026-11-07').monotony,null);
 assert.equal(weeklyLoadMetrics(week.map(w=>({...w,rpe:5})),[],'2026-11-07').monotony,null);
});
test('ACWR is unknown with empty or short history, excludes future records, and preserves PSE zero',()=>{
 assert.equal(acwrMetrics([],[],'2026-11-07').ratio,null);
 assert.equal(acwrMetrics([session('2026-11-07')],[],'2026-11-07').ratio,null);
 const days=Array.from({length:28},(_,i)=>session(new Date(Date.UTC(2026,9,11+i)).toISOString().slice(0,10)));
 const base=acwrMetrics(days,[],'2026-11-07');assert.equal(base.ratio,1);assert.equal(base.acute,700);assert.equal(base.recordedDays,28);
 assert.deepEqual(acwrMetrics([...days,session('2026-11-08',10,1440)],[],'2026-11-07'),base);
 assert.equal(acwrMetrics(days.map(d=>({...d,rpe:0})),[],'2026-11-07').ratio,null);
 assert.equal(acwrMetrics([...days,{...session('2026-11-07'),rpe:undefined}],[],'2026-11-07').ratio,null);
});
test('version conflicts preserve the original draft and recover results only by existing exercise and set IDs',()=>{
 const values=new Map<string,string>();const storage={getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>{values.set(k,v);}};
 const original:any={version:1,baseUpdatedAt:'old',savedAt:10,elapsedSeconds:1200,session:{id:'w',exercises:[{id:'e',performedSets:[{id:'s',reps:8,weight:50,isCompleted:true},{id:'removed',reps:99}]}]}};
 const workout:any={id:'w',updatedAt:'new',exercises:[{id:'e',weight:'60',performedSets:[{id:'s',reps:10},{id:'new',reps:10}]}]};
 assert.equal(writeSessionDraft(storage,'draft',original),true);assert.equal(readSessionDraft(storage,'draft',workout),null);assert.ok(readAnySessionDraft(storage,'draft',workout));
 assert.equal(writeSessionDraft(storage,'draft',{...original,baseUpdatedAt:'new',savedAt:20}),true);assert.deepEqual(JSON.parse(values.get('draft:recovery:10')!),original);
 const result=recoverDraftResults(workout,original);assert.equal(result.exercises[0].weight,'60');assert.equal(result.exercises[0].performedSets![0].reps,8);assert.equal(result.exercises[0].performedSets![1].reps,10);
 assert.equal(writeSessionDraft(null,'draft',original),false);
 assert.equal(writeSessionDraft({...storage,setItem(){throw Error('quota');}},'draft',original),false);
});
test('resuming a draft does not add six hours spent with the application closed',()=>{
 const draft:any={elapsedSeconds:1200,savedAt:1000};assert.equal(resumedElapsedSeconds(draft),1200);assert.equal(resumedDurationNeedsConfirmation(draft,1000+6*3600000),true);assert.equal(resumedDurationNeedsConfirmation(draft,2000),false);
});
test('deadline bounds stalled requests and bodies; a subsequent save can proceed',async()=>{
 await assert.rejects(fetchWithDeadline('/test',{},15,(()=>new Promise(()=>{})) as any),RequestTimeout);
 await assert.rejects(fetchWithDeadline('/test',{},15,(async()=>({status:200,arrayBuffer:()=>new Promise(()=>{})})) as any),RequestTimeout);
 assert.equal(await (await fetchWithDeadline('/test',{},100,(async()=>Response.json({ok:true})) as any)).text(),'{"ok":true}');
});
test('service worker never substitutes HTML for a missing offline JavaScript chunk',async()=>{
 const handlers:Record<string,Function>={};const cached=new Response('<html>offline</html>',{headers:{'Content-Type':'text/html'}});
 vm.runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),{self:{addEventListener:(name:string,f:Function)=>{handlers[name]=f;}},URL,Response,fetch:async()=>{throw Error('offline');},caches:{match:async(key:any)=>key==='/index.html'?cached.clone():undefined}});
 async function request(path:string,mode:string){let response:Promise<Response>|undefined;handlers.fetch({request:{url:`https://local.test${path}`,method:'GET',mode},respondWith:(p:Promise<Response>)=>{response=p;}});return response!;}
 const js=await request('/assets/lazy.js','cors');assert.equal(js.status,503);assert.match(js.headers.get('Content-Type')! as string,/text\/plain/);assert.doesNotMatch(await js.text(),/<html>/);
 assert.match(await (await request('/treino','navigate')).text(),/<html>/);
});
test('complete-snapshot contract rejects omitted collections and incomplete workout prescriptions',()=>{
 const full={name:'A',dob:'2000-01-01',gender:'M',modality:'Run',wellness:[],workouts:[],externalSessions:[],assessments:{}};
 assert.doesNotThrow(()=>assertCompleteSnapshots([full]));
 for(const key of ['name','dob','gender','modality','wellness','workouts','externalSessions','assessments']){const partial:any={...full};delete partial[key];assert.throws(()=>assertCompleteSnapshots([partial]));}
 assert.throws(()=>assertCompleteSnapshots([{...full,historyComplete:false}]));assert.throws(()=>assertCompleteSnapshots([{...full,workouts:[{id:'w'}]}]));
});
test('AI context is server-built and excludes identification, menstrual and psychology data',async()=>{
 let calls=0;const pool:any={query:async(q:string)=>{calls++;if(q.includes('SELECT 1 FROM'))return {rows:[{}]};if(q.includes('FROM public.athletes'))return {rows:[{gender:'F',modality:'Run',dob:'2000-01-01',name:'PRIVATE',competitive_level:'Elite'}]};return {rows:[{date:'2026-11-01',rpe:0,duration_minutes:20,psychology_notes:'PRIVATE',menstrual_symptoms:'PRIVATE',athlete_id:'PRIVATE',name:'PRIVATE'}]};}};
 const context=await loadPerformanceContext(pool,{role:'coach',organization_id:'org'},'a');const prompt=performancePrompt(context);assert.doesNotMatch(prompt,/PRIVATE|psychology|menstrual|athlete_id|dob/);assert.match(prompt,/'?rpe"?:0/);assert.equal(calls,9);
 let deniedCalls=0;await assert.rejects(loadPerformanceContext({query:async()=>{deniedCalls++;return {rows:[]};}} as any,{role:'coach',organization_id:'other'},'a'));assert.equal(deniedCalls,1);
});
test('database TLS verifies identity, removes URL overrides, pins the bundled CA, and rejects invalid trust anchors',async()=>{
 const cert=rootCertificates.find(c=>Date.parse(new X509Certificate(c).validTo)>Date.now())!;
 const remote=await databaseConnectionOptions({DATABASE_URL:'postgresql://user:password@db.example.org/db?sslmode=no-verify'});assert.equal((remote.ssl as any).rejectUnauthorized,true);assert.doesNotMatch(remote.connectionString!,/sslmode/);
 assert.equal((await databaseConnectionOptions({DATABASE_URL:'postgresql://localhost/db'})).ssl,false);
 const configured=await databaseConnectionOptions({DATABASE_URL:'postgresql://db.test.supabase.co/db',DATABASE_SSL_CA:cert});assert.equal((configured.ssl as any).rejectUnauthorized,true);
 const bundled=await databaseConnectionOptions({DATABASE_URL:'postgresql://db.test.supabase.co/db'});const ca=(bundled.ssl as any).ca.at(-1);assert.equal(new X509Certificate(ca).fingerprint256.replaceAll(':','').toLowerCase(),'807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa');
 await assert.rejects(databaseConnectionOptions({DATABASE_URL:'postgresql://db.test.supabase.co/db',DATABASE_SSL_CA:'invalid'}));
});
test('gym AI context preserves a recorded PSE of zero',()=>{
 const context=buildGymContext({workouts:[{id:'w',date:'2026-11-07',status:'completed',rpe:0,durationMinutes:20,exercises:[{id:'e',performedSets:[{id:'s',rpe:0,isCompleted:true}]}]}],assessments:{},externalSessions:[],wellness:[]} as any,'2026-11-07','2026-11-14');
 assert.equal(context.sessions[0].sessionPse,0);assert.equal(context.sessions[0].exercises[0].confirmedSets[0].pse,0);assert.equal(context.missingPse,0);
});
