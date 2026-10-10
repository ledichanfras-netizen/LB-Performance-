/** A stale device must never replace a more recent server snapshot. */
export class SyncConflict extends Error {
  constructor() { super('Os dados foram atualizados em outro dispositivo. Sincronize antes de salvar novamente.'); }
}
export const syncRevision = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value as string);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
};
export async function lockAthleteSnapshots(client: any, athletes: any[]) {
  const ids = athletes.map(a => a.id);
  const {rows} = await client.query('SELECT id,updated_at FROM athletes WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE', [ids]);
  for (const row of rows) {
    const incoming = athletes.find(a => a.id === row.id);
    if (incoming.syncRevision && syncRevision(incoming.syncRevision) !== syncRevision(row.updated_at)) throw new SyncConflict();
  }
  const archived = await client.query('SELECT id,athlete_id FROM workouts WHERE athlete_id = ANY($1::text[]) AND archived_at IS NOT NULL', [ids]);
  const removed = new Set(archived.rows.map((w:any) => w.id));
  // Archived rows remain available for recovery; older clients cannot reactivate them.
  for (const athlete of athletes) athlete.workouts = (athlete.workouts || []).filter((w:any) => !removed.has(w.id));
}
export async function readSavedRevisions(client: any, athletes: any[]) {
  const {rows} = await client.query('SELECT id,updated_at FROM athletes WHERE id = ANY($1::text[])', [athletes.map(a=>a.id)]);
  return Object.fromEntries(rows.map((row:any)=>[row.id,syncRevision(row.updated_at)]));
}
export const archiveMissingWorkoutsSQL = 'UPDATE workouts SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE athlete_id = $1 AND archived_at IS NULL AND id NOT IN (SELECT jsonb_array_elements_text($2::jsonb))';
