import React, { useRef, useState } from 'react';
import { CalendarX, Copy, X } from 'lucide-react';
import type { Workout } from '../types';
import { MISSED_WORKOUT_REASONS } from '../utils/workoutCycles';
import { formatBrazilianDate } from '../utils/billingPeriod';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

interface MarkMissedWorkoutModalProps {
  workout: Workout;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string, rescheduleCopy: boolean) => Promise<void> | void;
}

export const MarkMissedWorkoutModal: React.FC<MarkMissedWorkoutModalProps> = ({
  workout,
  loading = false,
  onCancel,
  onConfirm,
}) => {
  const [reason, setReason] = useState<string>(workout.missedReason || '');
  const dialogRef = useRef<HTMLDivElement>(null);
  useAccessibleDialog(dialogRef, onCancel);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Registrar treino não realizado"
      tabIndex={-1}
      className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-[2rem] p-6 sm:p-7 shadow-2xl space-y-5 outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <CalendarX className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white uppercase italic leading-tight">
              Treino Não Realizado
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {workout.name || 'Treino'} · {formatBrazilianDate(workout.date) || workout.date}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 border border-slate-800 rounded-xl p-3">
        O treino será mantido no histórico do ciclo <strong className="text-white">{workout.phase || 'atual'}</strong> como{' '}
        <strong className="text-amber-300">Não realizado</strong>, sem somar carga ou tonelagem.
      </p>

      <div className="space-y-2.5">
        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400">
          Motivo (opcional)
        </label>
        <div className="flex flex-wrap gap-1.5">
          {MISSED_WORKOUT_REASONS.map(preset => {
            const active = reason.trim() === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setReason(active ? '' : preset)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                  active
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {preset}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          value={reason}
          maxLength={500}
          onChange={e => setReason(e.target.value)}
          placeholder="Ex.: Falta por viagem, dor no joelho, compromisso pessoal..."
          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
        <button
          type="button"
          disabled={loading}
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => onConfirm(reason.trim(), true)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-950 border border-brand-primary/40 hover:bg-brand-primary/10 text-brand-primary text-xs font-black uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
          title="Marca este treino como não realizado e abre a tela para clonar para uma nova data"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Salvar e Reagendar Cópia</span>
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => onConfirm(reason.trim(), false)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Confirmar'}
        </button>
      </div>
    </div>
  );
};
