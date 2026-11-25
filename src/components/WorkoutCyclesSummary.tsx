import React, { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronDown, ChevronUp, Layers, XCircle } from 'lucide-react';
import type { Workout } from '../types';
import { summarizeWorkoutsByCycle } from '../utils/workoutCycles';
import { formatBrazilianDate } from '../utils/billingPeriod';

interface WorkoutCyclesSummaryProps {
  workouts: Workout[];
  periodizationStart?: string;
  periodizationEnd?: string;
  selectedPhase: string | null;
  onSelectPhase: (phase: string | null) => void;
  onShowMissed: () => void;
}

const formatRange = (start?: string, end?: string) => {
  const s = formatBrazilianDate(start);
  const e = formatBrazilianDate(end);
  if (s && e) return s === e ? s : `${s} – ${e}`;
  return s || e || 'Sem data';
};

export const WorkoutCyclesSummary: React.FC<WorkoutCyclesSummaryProps> = ({
  workouts,
  periodizationStart,
  periodizationEnd,
  selectedPhase,
  onSelectPhase,
  onShowMissed,
}) => {
  const [expanded, setExpanded] = useState(false);

  const report = useMemo(
    () =>
      summarizeWorkoutsByCycle(workouts, {
        start: periodizationStart,
        end: periodizationEnd,
      }),
    [workouts, periodizationStart, periodizationEnd]
  );

  if (!workouts.length) return null;

  const { totals, cycles, activePeriodization } = report;
  const visibleCycles = expanded ? cycles : cycles.slice(0, 3);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 md:p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-primary/10 border border-brand-primary/25 flex items-center justify-center shrink-0 text-brand-primary">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs md:text-sm font-black uppercase tracking-wider text-white">
              Histórico e Adesão por Ciclo de Treino
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Acompanhe quantos treinos foram concluídos e quantos não foram realizados em cada ciclo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {totals.completed} concluído{totals.completed === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={onShowMissed}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-300 hover:bg-amber-500/25 transition-colors cursor-pointer"
            title="Filtrar treinos não realizados"
          >
            <XCircle className="w-3.5 h-3.5" />
            {totals.missed} não realizado{totals.missed === 1 ? '' : 's'}
          </button>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
            {totals.pending} pendente{totals.pending === 1 ? '' : 's'}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white">
            Adesão: {totals.adherencePercent !== null ? `${totals.adherencePercent}%` : '—'}
          </span>
        </div>
      </div>

      {activePeriodization && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-950/70 border border-slate-800/90 px-3.5 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-bold">
            <CalendarDays className="w-4 h-4 text-brand-primary shrink-0" />
            <span>
              Ciclo vigente ({formatRange(activePeriodization.start, activePeriodization.end)}):
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
            <span className="text-emerald-400">{activePeriodization.completed} concluídos</span>
            <span className="text-amber-300">{activePeriodization.missed} não realizados</span>
            <span className="text-slate-400">{activePeriodization.pending} pendentes</span>
            <span className="text-white">
              Adesão:{' '}
              {activePeriodization.adherencePercent !== null
                ? `${activePeriodization.adherencePercent}%`
                : '—'}
            </span>
          </div>
        </div>
      )}

      {cycles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {visibleCycles.map(cycle => {
            const isSelected = selectedPhase?.toLocaleLowerCase('pt-BR') === cycle.phase.toLocaleLowerCase('pt-BR');
            return (
              <button
                key={cycle.phase}
                type="button"
                onClick={() => onSelectPhase(isSelected ? null : cycle.phase)}
                className={`text-left rounded-xl border p-3 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-brand-primary/10 border-brand-primary/50 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white uppercase tracking-wide truncate">
                      {cycle.phase}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatRange(cycle.firstDate, cycle.lastDate)} · {cycle.total} treino{cycle.total === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-md border shrink-0 ${
                      cycle.missed > 0
                        ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                        : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                    }`}
                  >
                    {cycle.adherencePercent !== null ? `${cycle.adherencePercent}% adesão` : 'Em aberto'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] font-bold">
                  <div className="text-emerald-400">{cycle.completed} concl.</div>
                  <div className={cycle.missed > 0 ? 'text-amber-300 font-black' : 'text-slate-500'}>
                    {cycle.missed} não real.
                  </div>
                  <div className="text-slate-400 text-right">{cycle.pending} pend.</div>
                </div>

                {cycle.missedReasons.length > 0 && (
                  <p className="text-[10px] text-amber-200/80 mt-1.5 truncate">
                    Motivos:{' '}
                    {cycle.missedReasons
                      .slice(0, 2)
                      .map(r => (r.count > 1 ? `${r.reason} (${r.count})` : r.reason))
                      .join(', ')}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {(cycles.length > 3 || selectedPhase) && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {selectedPhase ? (
            <button
              type="button"
              onClick={() => onSelectPhase(null)}
              className="text-[11px] font-bold text-brand-primary hover:underline cursor-pointer"
            >
              Mostrando ciclo "{selectedPhase}" · Limpar filtro de ciclo
            </button>
          ) : (
            <span className="text-[11px] text-slate-500">
              Clique em um ciclo para filtrar os treinos abaixo.
            </span>
          )}
          {cycles.length > 3 && (
            <button
              type="button"
              onClick={() => setExpanded(prev => !prev)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white cursor-pointer"
            >
              {expanded ? (
                <>
                  <span>Mostrar menos ciclos</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Ver todos os {cycles.length} ciclos</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
