/** Independent protocol: arm-assisted jumps must never enter CMJ history or LB-X. */
export const abalakovTableSQL = `
CREATE TABLE IF NOT EXISTS public.abalakov (
 id TEXT PRIMARY KEY,
 athlete_id TEXT NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
 date VARCHAR(255) NOT NULL,
 height REAL, power REAL, depth REAL, rsi REAL, flight_time REAL,
 weight REAL, average_force REAL, observations TEXT,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_abalakov_athlete_date ON public.abalakov(athlete_id,date DESC);
ALTER TABLE public.abalakov ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.abalakov FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
  REVOKE ALL ON TABLE public.abalakov FROM anon;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
  REVOKE ALL ON TABLE public.abalakov FROM authenticated;
 END IF;
END $$;
`;
export async function ensureAbalakovTable(client:{query:Function}) {
 await client.query(abalakovTableSQL);
}
/** Uses the existing scoped save transaction and batch, after ownership validation. */
export async function saveAbalakovAssessments(writes:{query:Function},athlete:any) {
 for(const asm of athlete.assessments?.abalakov || []) {
  if(!asm.id) asm.id=`abalakov-${crypto.randomUUID()}`;
  await writes.query(`INSERT INTO public.abalakov
   (id,athlete_id,date,height,power,depth,rsi,flight_time,weight,average_force,observations)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
   ON CONFLICT(id) DO UPDATE SET date=$3,height=$4,power=$5,depth=$6,rsi=$7,flight_time=$8,weight=$9,average_force=$10,observations=$11`,
   [asm.id,athlete.id,asm.date,asm.height??0,asm.power??0,asm.depth??0,asm.rsi??0,asm.flightTime??0,asm.weight??0,asm.averageForce??0,asm.observations||'']);
 }
}
