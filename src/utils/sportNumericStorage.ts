type Bounds = Readonly<Record<string, readonly [number, number]>>;
/** Decode known PostgreSQL NUMERIC fields only; never parse units or prescription text. */
export function normalizeStoredNumericFields<T extends object>(row: T, bounds: Bounds): T {
  let result = row;
  for (const [key, [min, max]] of Object.entries(bounds)) {
    const raw = (row as Record<string, unknown>)[key];
    if (typeof raw !== 'string' || !/^\d+(?:\.\d+)?$/.test(raw.trim())) continue;
    const number = Number(raw.trim());
    if (!Number.isFinite(number) || number < min || number > max) continue;
    if (result === row) result = { ...row };
    (result as Record<string, unknown>)[key] = number;
  }
  return result;
}

export const normalizePerformedSetNumbers = <T extends object>(row: T): T =>
  normalizeStoredNumericFields(row, { weight: [0, 2000] });
export const normalizeWorkoutNumbers = <T extends object>(row: T): T =>
  normalizeStoredNumericFields(row, { totalLoad: [0, Number.MAX_SAFE_INTEGER], monotony: [0, Number.MAX_SAFE_INTEGER], strain: [0, Number.MAX_SAFE_INTEGER] });
export const normalizeExternalSessionNumbers = <T extends object>(row: T): T =>
  normalizeStoredNumericFields(row, { load: [0, Number.MAX_SAFE_INTEGER] });
