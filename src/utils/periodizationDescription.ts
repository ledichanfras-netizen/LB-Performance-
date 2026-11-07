export interface DescriptionContext {
  athleteId: string;
  modality?: string;
  goal?: string;
  startDate: string;
  endDate: string;
  academyDays: number[];
  courtDays: number[];
  progressionMethod: string;
}
export interface DescriptionSuggestion { description: string; questions: string[]; }
export const DESCRIPTION_LIMIT = 6000;

export function parseDescriptionSuggestion(value: unknown): DescriptionSuggestion {
  const data = value as DescriptionSuggestion;
  if (!data || typeof data.description !== 'string' || !data.description.trim() ||
    data.description.length > DESCRIPTION_LIMIT || !Array.isArray(data.questions) ||
    data.questions.length > 6 || data.questions.some(q => typeof q !== 'string' || !q.trim() || q.length > 300)) {
    throw new Error('A sugestão veio incompleta. Seu texto original foi preservado. Tente novamente.');
  }
  return { description: data.description.trim(), questions: data.questions.map(q => q.trim()) };
}
