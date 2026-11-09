/** PostgreSQL NUMERIC is serialized as text. Preserve values, not display fallbacks. */
export function normalizeReadinessScore<T extends { readinessScore?: unknown }>(entry: T): T {
  const value = entry.readinessScore;
  if (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value.trim())) return entry;
  const score = Number(value.trim());
  // Invalid values remain invalid for the save validator; never clamp or fabricate zero.
  if (!Number.isFinite(score) || score < 0 || score > 100) return entry;
  return { ...entry, readinessScore: score };
}
