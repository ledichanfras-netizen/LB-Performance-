import {externalSessionColumns} from '../src/utils/externalSessions';
export const externalSessionDetailsSQL=`ALTER TABLE public.external_sessions ADD COLUMN IF NOT EXISTS activity text;
ALTER TABLE public.external_sessions ADD COLUMN IF NOT EXISTS session_time varchar(5);
ALTER TABLE public.external_sessions ADD COLUMN IF NOT EXISTS distance_km double precision;
ALTER TABLE public.external_sessions ADD COLUMN IF NOT EXISTS competition_id text;`;
export async function saveExternalSession(writes:{query:Function},athleteId:string,es:any){
 const details=externalSessionColumns(es),d=es.durationMinutes??es.duration_minutes??0,r=es.rpe??0;
 await writes.query(`INSERT INTO external_sessions(id,athlete_id,date,type,duration_minutes,rpe,notes,load,activity,session_time,distance_km,competition_id)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
 ON CONFLICT(id) DO UPDATE SET date=$3,type=$4,duration_minutes=$5,rpe=$6,notes=$7,load=$8,
 activity=COALESCE(EXCLUDED.activity,external_sessions.activity),session_time=COALESCE(EXCLUDED.session_time,external_sessions.session_time),
 distance_km=CASE WHEN $13 THEN EXCLUDED.distance_km ELSE external_sessions.distance_km END,competition_id=COALESCE(EXCLUDED.competition_id,external_sessions.competition_id)`,
 [es.id,athleteId,es.date,es.type||'tecnico',d,r,es.notes||'',d*r,details.activity,details.session_time,details.distance_km,details.competition_id,Object.hasOwn(es,'distanceKm')||Object.hasOwn(es,'distance_km')]);
}
