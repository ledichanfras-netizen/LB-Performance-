const numericFields = new Set(["averageForce", "basalMetabolism", "boneMass", "contactTime", "depth", "dropHeight", "fatArmL", "fatArmR", "fatLegL", "fatLegR", "fatPercentage", "fatTrunk", "flightTime", "force100", "force200", "force300", "forceMean100", "forceMean200", "forceMean300", "forceMeanPico", "forcePico", "halfSquatKgf", "hamstringsL", "hamstringsR", "height", "hydration", "impulse100", "impulse200", "impulse300", "impulsePeak", "impulsePico", "iqRatioL", "iqRatioR", "jumpHeight", "maxHeartRate", "maxSpeed", "maxVentilation", "meanForce", "meanPower", "metabolicAge", "muscleArmL", "muscleArmR", "muscleLegL", "muscleLegR", "muscleMass", "muscleTrunk", "peakForce", "physiqueRating", "power", "quadricepsL", "quadricepsR", "rec10s", "rec30s", "rec60s", "relativePeakForce", "repetitions", "rfd100", "rfd200", "rfd300", "rfdPeak", "rfdPico", "rsi", "score", "speed10m", "speed20m", "speed30m", "speed5m", "stiffness", "thresholdHeartRate", "thresholdSpeed", "time10m", "time20m", "time30m", "time5m", "timeToPeakForce", "vam", "visceralFat", "vo2max", "weight"]);

// PostgreSQL NUMERIC values arrive as strings. Preserve missing fields and metadata.
export function normalizeAssessmentNumbers<T extends object>(row: T): T {
  const result = {...row};
  for (const [key, value] of Object.entries(row)) {
    if (!numericFields.has(key) || typeof value !== "string" || !value.trim()) continue;
    const parsed = Number(value.trim().replace(",", "."));
    if (Number.isFinite(parsed)) (result as Record<string, unknown>)[key] = parsed;
  }
  return result;
}
