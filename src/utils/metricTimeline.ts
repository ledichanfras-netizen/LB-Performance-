/** Calendar dates stay on their recorded day, including API timestamps at midnight UTC. */
export function metricDay(value: string): number | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/.exec(value || '');
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value || '');
  if (!iso && !br) return null;
  const [year, month, day] = iso ? [+iso[1], +iso[2], +iso[3]] : [+br![3], +br![2], +br![1]];
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? time : null;
}

export function metricDateLabel(time: number, full = false): string {
  return new Date(time).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', ...(full ? { year: 'numeric' as const } : {}) });
}

export type MetricReading = { date: string; value: number };
export type MetricPoint = { time: number; value: number; count: number };

/** Show the day's best valid attempt; missing readings never become zero. */
export function metricTimeline(readings: MetricReading[]): MetricPoint[] {
  const days = new Map<number, MetricPoint>();
  for (const reading of readings) {
    const time = metricDay(reading.date);
    if (time === null || !Number.isFinite(reading.value) || reading.value <= 0) continue;
    const previous = days.get(time);
    days.set(time, { time, value: Math.max(previous?.value ?? 0, reading.value), count: (previous?.count ?? 0) + 1 });
  }
  return [...days.values()].sort((a, b) => a.time - b.time);
}
