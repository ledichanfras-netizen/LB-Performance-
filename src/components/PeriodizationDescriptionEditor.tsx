import { useEffect, useId, useRef, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { useAiAccess } from './AiAccess';
import { improvePeriodizationDescription } from '../services/periodizationDescription';
import { DESCRIPTION_LIMIT, type DescriptionContext, type DescriptionSuggestion } from '../utils/periodizationDescription';

interface Props { value: string; onChange: (value: string) => void; context: DescriptionContext; disabled?: boolean; }
export function PeriodizationDescriptionEditor({ value, onChange, context, disabled = false }: Props) {
  const aiAllowed = useAiAccess();
  const id = useId();
  const contextKey = JSON.stringify(context);
  const latestKey = useRef('');
  latestKey.current = contextKey + value;
  const controller = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState<(DescriptionSuggestion & { original: string }) | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  useEffect(() => {
    controller.current?.abort(); setBusy(false); setReview(null); setError('');
    return () => controller.current?.abort();
  }, [contextKey, value]);
  useEffect(() => { setOriginal(null); }, [context.athleteId]);

  const improve = async () => {
    if (busy || disabled || !value.trim() || !aiAllowed) return;
    const request = new AbortController();
    controller.current = request;
    const submittedKey = latestKey.current;
    const submitted = value;
    setBusy(true); setError(''); setReview(null);
    const timeout = setTimeout(() => request.abort('timeout'), 55000);
    try {
      const result = await improvePeriodizationDescription(submitted, context, request.signal);
      if (!request.signal.aborted && latestKey.current === submittedKey) setReview({ ...result, original: submitted });
    } catch (e: any) {
      if (latestKey.current === submittedKey && (!request.signal.aborted || request.signal.reason === 'timeout')) {
        setError(request.signal.aborted ? 'A sugestão demorou para responder. Seu texto foi preservado; tente novamente.' : e.message);
      }
    } finally {
      clearTimeout(timeout);
      if (controller.current === request) { controller.current = null; setBusy(false); }
    }
  };

  return <div className="space-y-3 text-sm text-slate-100">
    <label htmlFor={id} className="sr-only">Descrição da periodização</label>
    <textarea id={id} value={value} maxLength={DESCRIPTION_LIMIT} disabled={disabled || busy}
      onChange={e => { setReview(null); setError(''); onChange(e.target.value); }}
      placeholder="Escreva o objetivo, as prioridades e os cuidados que deseja para este período."
      className="w-full min-h-28 resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-emerald-400 outline-none disabled:opacity-60" />
    {aiAllowed && <button type="button" onClick={improve} disabled={disabled || busy || !value.trim() || !context.athleteId}
      aria-busy={busy} className="min-h-11 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950 px-4 py-2 text-sm font-bold text-emerald-100 disabled:opacity-50">
      {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {busy ? 'Aprimorando descrição...' : 'Aprimorar descrição'}
    </button>}
    {error && <p role="alert" className="text-sm text-amber-200">{error}</p>}
    {review && <section aria-label="Revisar descrição aprimorada" className="space-y-3 rounded-xl border border-emerald-600/60 bg-slate-900 p-3 sm:p-4">
      <p role="status" className="font-bold text-emerald-200">Sugestão pronta para sua revisão</p>
      <div><h4 className="mb-1 font-bold">Seu texto original</h4><p className="whitespace-pre-wrap break-words text-slate-300">{review.original}</p></div>
      <label htmlFor={`${id}-suggestion`} className="block font-bold">Sugestão aprimorada — você pode editar</label>
      <textarea id={`${id}-suggestion`} value={review.description} maxLength={DESCRIPTION_LIMIT} disabled={disabled}
        onChange={e => setReview({ ...review, description: e.target.value })}
        className="w-full min-h-44 resize-y rounded-xl border border-slate-600 bg-slate-950 p-3 text-sm text-white focus:border-emerald-400 outline-none" />
      {review.questions.length > 0 && <div><h4 className="mb-2 font-bold text-amber-200">Pontos a confirmar</h4><ul className="list-disc space-y-1 pl-5">{review.questions.map((q, i) => <li key={i}>{q}</li>)}</ul><p className="mt-2 text-xs text-slate-300">Se necessário, inclua as respostas na descrição antes de gerar os treinos.</p></div>}
      <p className="text-xs text-slate-300">Revise objetivos e restrições. Esta etapa não gera nem altera treinos.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={disabled || !review.description.trim()} onClick={() => { setOriginal(review.original); onChange(review.description); setReview(null); }}
          className="min-h-11 rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white disabled:opacity-50">Usar descrição aprimorada</button>
        <button type="button" disabled={disabled} onClick={() => setReview(null)} className="min-h-11 rounded-xl border border-slate-500 px-4 py-2 font-bold">Manter original</button>
      </div>
    </section>}
    {original !== null && !review && <button type="button" disabled={disabled || busy} onClick={() => { onChange(original); setOriginal(null); }} className="min-h-11 px-2 text-sm font-bold text-emerald-200 underline">Restaurar descrição original</button>}
  </div>;
}
