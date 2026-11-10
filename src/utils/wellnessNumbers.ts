import { normalizeStoredNumericFields } from './sportNumericStorage';
/** PostgreSQL NUMERIC is serialized as text. Preserve values, not display fallbacks. */
export function normalizeReadinessScore<T extends { readinessScore?: unknown }>(entry: T): T {
  return normalizeStoredNumericFields(entry, { readinessScore: [0, 100] });
}
