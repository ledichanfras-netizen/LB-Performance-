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
    <div className="lb-cycles-card rounded-2xl p-4 md:p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="lb-cycles-icon w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="lb-cycles-title text-xs md:text-sm font-black uppercase tracking-wider">
              Histórico e Adesão por Ciclo de Treino
            </h4>
            <p className="lb-cycles-muted text-[11px] mt-0.5">
              Acompanhe quantos treinos foram concluídos e quantos não foram realizados em cada ciclo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
          <span className="lb-cycles-chip-emerald inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {totals.completed} concluído{totals.completed === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={onShowMissed}
            className="lb-cycles-chip-amber inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            title="Filtrar treinos não realizados"
          >
            <XCircle className="w-3.5 h-3.5" />
            {totals.missed} não realizado{totals.missed === 1 ? '' : 's'}
          </button>
          <span className="lb-cycles-chip-neutral inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg">
            {totals.pending} pendente{totals.pending === 1 ? '' : 's'}
          </span>
          <span className="lb-cycles-chip-strong inline-flex items-center px-2.5 py-1 rounded-lg">
            Adesão: {totals.adherencePercent !== null ? `${totals.adherencePercent}%` : '—'}
          </span>
        </div>
      </div>

      {activePeriodization && (
        <div className="lb-cycles-active-bar flex flex-wrap items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-xs">
          <div className="lb-cycles-text flex items-center gap-2 font-bold">
            <CalendarDays className="lb-cycles-accent w-4 h-4 shrink-0" />
            <span>
              Ciclo vigente ({formatRange(activePeriodization.start, activePeriodization.end)}):
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
            <span className="lb-cycles-stat-emerald">{activePeriodization.completed} concluídos</span>
            <span className="lb-cycles-stat-amber">{activePeriodization.missed} não realizados</span>
            <span className="lb-cycles-muted">{activePeriodization.pending} pendentes</span>
            <span className="lb-cycles-title">
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
            const badgeClass =
              cycle.missed > 0
                ? 'lb-cycles-chip-amber'
                : cycle.adherencePercent !== null
                  ? 'lb-cycles-chip-emerald'
                  : 'lb-cycles-chip-neutral';
            return (
              <button
                key={cycle.phase}
                type="button"
                onClick={() => onSelectPhase(isSelected ? null : cycle.phase)}
                className={`lb-cycles-item text-left rounded-xl p-3 transition-all cursor-pointer ${
                  isSelected ? 'is-selected' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="lb-cycles-title text-xs font-black uppercase tracking-wide truncate">
                      {cycle.phase}
                    </p>
                    <p className="lb-cycles-muted text-[10px] mt-0.5">
                      {formatRange(cycle.firstDate, cycle.lastDate)} · {cycle.total} treino{cycle.total === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${badgeClass}`}
                  >
                    {cycle.adherencePercent !== null ? `${cycle.adherencePercent}% adesão` : 'Em aberto'}
                  </span>
                </div>

                <div className="lb-cycles-divider grid grid-cols-3 gap-1.5 mt-2.5 pt-2 text-[10px] font-bold">
                  <div className="lb-cycles-stat-emerald">{cycle.completed} concl.</div>
                  <div className={cycle.missed > 0 ? 'lb-cycles-stat-amber font-black' : 'lb-cycles-stat-muted'}>
                    {cycle.missed} não real.
                  </div>
                  <div className="lb-cycles-stat-secondary text-right">{cycle.pending} pend.</div>
                </div>

                {cycle.missedReasons.length > 0 && (
                  <p className="lb-cycles-reason text-[10px] mt-1.5 truncate">
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
              className="lb-cycles-accent text-[11px] font-bold hover:underline cursor-pointer"
            >
              Mostrando ciclo "{selectedPhase}" · Limpar filtro de ciclo
            </button>
          ) : (
            <span className="lb-cycles-muted text-[11px]">
              Clique em um ciclo para filtrar os treinos abaixo.
            </span>
          )}
          {cycles.length > 3 && (
            <button
              type="button"
              onClick={() => setExpanded(prev => !prev)}
              className="lb-cycles-expand inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer"
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
