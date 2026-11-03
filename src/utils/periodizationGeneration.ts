/** Generate a complete calendar without repairing truncated JSON or inventing sessions. */
export interface PeriodizationReply { result?: string; finishReason?: string }
export interface GenerationProgress { completed: number; total: number; retrying: boolean }
type RequestBatch = (dates: string[], accepted: any[]) => Promise<PeriodizationReply>;

const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
function validSession(w: any): boolean {
  if (!w || !text(w.name) || !text(w.phase) || !Number.isFinite(w.estimatedDurationMinutes) || w.estimatedDurationMinutes <= 0 || !Array.isArray(w.exercises) || !w.exercises.length) return false;
  let rest = 0;
  for (const e of w.exercises) {
    if (!e || !text(e.name) || !Number.isInteger(e.sets) || e.sets < 1 || !text(e.reps) || !text(e.weight) || !Number.isFinite(e.recoverySeconds) || e.recoverySeconds < 0) return false;
    rest += (e.sets - 1) * e.recoverySeconds;
  }
  return w.estimatedDurationMinutes * 60 >= rest;
}

function parseReply(reply: PeriodizationReply): any[] {
  // A token-limited response is never accepted as a complete prescription.
  if (reply.finishReason && reply.finishReason !== 'STOP') return [];
  if (!text(reply.result)) return [];
  const content = reply.result.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { const rows = JSON.parse(content); return Array.isArray(rows) ? rows : []; } catch { return []; }
}

export async function generateCompletePeriodization(
  dates: string[], request: RequestBatch, onProgress?: (progress: GenerationProgress) => void
): Promise<any[]> {
  if (!dates.length || dates.length > 28 || new Set(dates).size !== dates.length) throw new Error('Confira os dias e o período selecionados antes de gerar.');
  const accepted = new Map<string, any>();
  // Two sessions per first request. Failed/incomplete sessions get one individual retry.
  for (let round = 0; round < 2; round++) {
    const pending = dates.filter(date => !accepted.has(date));
    const size = round === 0 ? 2 : 1;
    for (let i = 0; i < pending.length; i += size) {
      const batch = pending.slice(i, i + size);
      onProgress?.({completed: accepted.size, total: dates.length, retrying: round > 0});
      // Transport/auth failures propagate; structured incomplete replies are retried below.
      const rows = parseReply(await request(batch, [...accepted.values()]));
      for (const date of batch) {
        const matches = rows.filter(w => w?.date === date);
        if (matches.length === 1 && validSession(matches[0])) accepted.set(date, matches[0]);
      }
      onProgress?.({completed: accepted.size, total: dates.length, retrying: round > 0});
    }
    if (accepted.size === dates.length) return dates.map(date => accepted.get(date)!);
  }
  const missing = dates.filter(date => !accepted.has(date)).map(date => date.split('-').reverse().join('/'));
  throw new Error(`Não foi possível completar as sessões de ${missing.join(', ')} após nova tentativa automática. Nenhum treino foi substituído. Tente gerar novamente.`);
}

/** Only the current batch is an output target; cycle context remains available for coherence. */
export function periodizationBatchPrompt(prompt: string, dates: string[], accepted: any[]): string {
  const match = prompt.match(/CRONOGRAMA EXATO DE SESSÕES A SEREM GERADAS[^\n]*:\s*\n([\s\S]*?)\n\s*PREFERÊNCIA ABSOLUTA DA BIBLIOTECA DO TREINADOR:/);
  if (!match) throw new Error('Não foi possível preparar o calendário da periodização.');
  const lines = match[1].split('\n').filter(line => dates.some(date => line.includes(`- Data: ${date} (`)));
  if (lines.length !== dates.length) throw new Error('O calendário da periodização contém datas inconsistentes.');
  const subset = `CRONOGRAMA EXATO DE SESSÕES A SEREM GERADAS (Total: ${dates.length} treinos):\n${lines.join('\n')}\n\n        PREFERÊNCIA ABSOLUTA DA BIBLIOTECA DO TREINADOR:`;
  const previous = accepted.map(w => ({date: w.date, objective: w.objective, phase: w.phase, exercises: w.exercises.map((e: any) => ({name:e.name,sets:e.sets,reps:e.reps,weight:e.weight}))}));
  return prompt.replace(match[0], subset) + `\nCONTINUIDADE DO CICLO (sessões já propostas; não repetir nem alterar):\n${JSON.stringify(previous)}\nGere APENAS as ${dates.length} sessões das datas ${dates.join(', ')}. Cada sessão deve ter exercícios completos, séries, repetições e recuperação. Não omita sessões, não retorne sessões vazias e não use placeholders. Mantenha os objetivos, a progressão e as diretrizes do ciclo completo.`;
}
