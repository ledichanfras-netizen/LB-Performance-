import { getEffectiveSessionToken } from '../utils/supervisionSession';
import { parseDescriptionSuggestion, type DescriptionContext } from '../utils/periodizationDescription';

export async function improvePeriodizationDescription(description: string, context: DescriptionContext, signal: AbortSignal) {
  const token = getEffectiveSessionToken();
  if (!token) throw new Error('Entre novamente para aprimorar a descrição. Seu texto foi preservado.');
  const response = await fetch('/api/improve-periodization-description', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...context, description }),
  });
  let result: any;
  try { result = await response.json(); } catch { throw new Error('Não foi possível ler a sugestão. Seu texto foi preservado.'); }
  if (!response.ok) throw new Error(result.error || 'Não foi possível aprimorar agora. Seu texto foi preservado.');
  return parseDescriptionSuggestion(result);
}
