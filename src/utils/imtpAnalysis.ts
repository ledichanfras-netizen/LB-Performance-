import type { Imtp } from '../types';

export const imtpMetrics = [
  ['peakForce', 'Força máxima', 'kgf'], ['relativePeakForce', 'Força relativa', 'kgf/kg'],
  ['weight', 'Massa corporal no teste', 'kg'], ['meanForce', 'Força média', 'kgf'],
  ['timeToPeakForce', 'Tempo até a força máxima', 'ms'],
  ['force100', 'Força em 100 ms', 'kgf'], ['force200', 'Força em 200 ms', 'kgf'], ['force300', 'Força em 300 ms', 'kgf'],
  ['rfdPeak', 'RFD informada como pico', 'N/s'], ['rfd100', 'RFD em 100 ms', 'N/s'],
  ['rfd200', 'RFD em 200 ms', 'N/s'], ['rfd300', 'RFD em 300 ms', 'N/s'],
  ['impulsePeak', 'Impulso total informado', 'N·s'], ['impulse100', 'Impulso até 100 ms', 'N·s'],
  ['impulse200', 'Impulso até 200 ms', 'N·s'], ['impulse300', 'Impulso até 300 ms', 'N·s'],
] as const;

// Historical forms stored zero placeholders. They are not evidence of measured force.
export function imtpValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(',', '.')) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
export function formatImtpValue(value: unknown): string {
  const numeric = imtpValue(value);
  return numeric === null ? 'Não Informado' : numeric.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}
export function previousImtp(current: Imtp, history: Imtp[]): Imtp | undefined {
  const date = new Date(current.date).getTime();
  if (!Number.isFinite(date)) return undefined;
  return history.filter(row => row.id !== current.id && new Date(row.date).getTime() < date)
    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}
export function imtpChange(current: unknown, previous: unknown): number | null {
  const now = imtpValue(current), before = imtpValue(previous);
  return now === null || before === null ? null : (now - before) / before * 100;
}
