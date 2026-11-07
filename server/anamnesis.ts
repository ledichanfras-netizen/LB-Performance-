import { SportsValidationError } from './sportsValidation';

/** Absence stays absent so legacy clients/tablet caches are not mistaken for deletions. */
export function readAnamnesisBackup(value: unknown): any[] | undefined {
  try {
    const backup = typeof value === 'string' ? JSON.parse(value) : value;
    return backup && Array.isArray(backup.anamnesis) ? backup.anamnesis : undefined;
  } catch { return undefined; }
}

export function anamnesisBackupFields(athlete: any): { anamnesis?: any[] } {
  if (athlete.anamnesis === undefined) return {};
  if (!Array.isArray(athlete.anamnesis) || athlete.anamnesis.length > 1000) throw new SportsValidationError('Histórico de anamnese inválido.');
  const ids = new Set();
  for (const record of athlete.anamnesis) {
    if (!record || typeof record !== 'object' || typeof record.id !== 'string' || !record.id.trim() ||
        record.athleteId !== athlete.id || typeof record.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.date) ||
        !Number.isFinite(Date.parse(record.date)) || ids.has(record.id)) throw new SportsValidationError('Confira o atleta, a data e os registros da anamnese.');
    ids.add(record.id);
  }
  return { anamnesis: athlete.anamnesis };
}
