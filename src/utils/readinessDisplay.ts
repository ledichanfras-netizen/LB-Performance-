import type { WellnessEntry } from '../types';
import { calculateReadiness } from '../utils';

/** API numeric values can be serialized as strings. Blank values stay missing, never zero. */
export function readinessNumber(value: unknown, max = 10): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  if (typeof value === 'string' && !/^\d+(?:[.,]\d+)?$/.test(value.trim())) return undefined;
  const number = Number(typeof value === 'string' ? value.trim().replace(',', '.') : value);
  return Number.isFinite(number) && number >= 0 && number <= max ? number : undefined;
}

export function readinessForDisplay(entry: WellnessEntry): WellnessEntry {
  const raw = entry as unknown as Record<string, unknown>;
  const normalized = { ...entry };
  const fields = {
    fatigue:'fatigue', stress:'stress', soreness:'soreness', mood:'mood',
    cognitiveLoad:'cognitive_load', sleepQuality:'sleep_quality', travelFatigue:'travel_fatigue',
    emotionalReadiness:'emotional_readiness', psychologicalReadiness:'psychological_readiness',
    sleep:'sleep', calculatedSleepHours:'calculated_sleep_hours', readinessScore:'readiness_score',
  };
  for (const [key, alias] of Object.entries(fields)) {
    const max = key === 'readinessScore' ? 100 : key === 'sleep' || key === 'calculatedSleepHours' ? 24 : 10;
    (normalized as unknown as Record<string,unknown>)[key] = readinessNumber(raw[key], max) ?? readinessNumber(raw[alias], max);
  }
  normalized.sleepHoursFormatted = entry.sleepHoursFormatted || raw.sleep_hours_formatted as string | undefined;
  normalized.isMatchDay = entry.isMatchDay ?? raw.is_match_day as boolean | undefined;
  const core = [normalized.fatigue, normalized.stress, normalized.soreness, normalized.mood, normalized.cognitiveLoad];
  const hasSleep = normalized.sleep !== undefined || normalized.calculatedSleepHours !== undefined || normalized.sleepQuality !== undefined;
  if (normalized.readinessScore === undefined && hasSleep && core.every(v => v !== undefined)) {
    normalized.readinessScore = calculateReadiness(normalized);
  }
  return normalized;
}
