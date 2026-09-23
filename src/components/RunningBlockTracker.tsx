import { useState, useEffect, useRef, FC } from 'react';
import { PrescribedExercise, RunningBlock, RunningStep } from '../types';
import { getOrGenerateRunningBlocks, calculateBlocksMetrics } from '../utils/runningBlockUtils';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  ChevronRight, 
  Timer, 
  Zap, 
  Flag, 
  Flame, 
  Clock, 
  CheckCircle2, 
  Activity,
  ArrowRight,
  TrendingUp,
  Volume2,
  VolumeX
} from 'lucide-react';

interface RunningBlockTrackerProps {
  exercise: PrescribedExercise;
  onUpdateExercise: (updated: PrescribedExercise) => void;
  onStartGlobalRestTimer?: (seconds: number, label?: string) => void;
}

export const RunningBlockTracker: FC<RunningBlockTrackerProps> = ({
  exercise,
  onUpdateExercise,
  onStartGlobalRestTimer
}) => {
  // Inicializa ou obtém os blocos estruturados do exercício
  const [blocks, setBlocks] = useState<RunningBlock[]>(() => {
    return getOrGenerateRunningBlocks(exercise);
  });

  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Micro-timer embutido para passos de recuperação / descanso
  const [timerSecondsRemaining, setTimerSecondsRemaining] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerActiveStepId, setTimerActiveStepId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Som de bipe suave usando Web Audio API para não depender de arquivo externo
  const playBeep = (freq: number = 880, durationMs: number = 200) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (durationMs / 1000));
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + (durationMs / 1000));
    } catch {
      // Ignora erro em navegadores que bloqueiam áudio automático
    }
  };

  // Efeito do timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSecondsRemaining !== null && timerSecondsRemaining > 0) {
      interval = setInterval(() => {
        setTimerSecondsRemaining((prev) => {
          if (prev === null || prev <= 1) {
            setIsTimerRunning(false);
            playBeep(987, 400); // Beep de fim de intervalo
            return 0;
          }
          if (prev <= 4) {
            playBeep(659, 100); // Contagem regressiva final (3, 2, 1)
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSecondsRemaining]);

  // Sincroniza blocos de volta com o exercício principal
  const syncBlocksToExercise = (newBlocks: RunningBlock[]) => {
    setBlocks(newBlocks);

    // Total de passos completados vs total de passos de esforço
    let completedSteps = 0;
    let totalEffortSteps = 0;
    newBlocks.forEach(b => {
      b.steps.forEach(s => {
        if (s.type === 'sprint' || s.type === 'interval') {
          totalEffortSteps++;
          if (s.isCompleted) completedSteps++;
        }
      });
    });

    // Atualiza performedSets para manter compatibilidade e métricas globais
    const updatedSets = (exercise.performedSets || []).map((set, idx) => {
      const isCompleted = idx < newBlocks.length ? (newBlocks[idx].isCompleted || false) : false;
      return {
        ...set,
        isCompleted
      };
    });

    const isAllFinished = completedSteps >= totalEffortSteps && totalEffortSteps > 0;

    onUpdateExercise({
      ...exercise,
      isStructuredRunning: true,
      runningBlocks: newBlocks,
      performedSets: updatedSets
    });
  };

  // Alterna conclusão de um passo individual
  const toggleStepCompleted = (blockIdx: number, stepIdx: number) => {
    const updatedBlocks = [...blocks];
    const targetBlock = { ...updatedBlocks[blockIdx] };
    const targetSteps = [...targetBlock.steps];
    const step = { ...targetSteps[stepIdx] };

    const nextState = !step.isCompleted;
    step.isCompleted = nextState;
    targetSteps[stepIdx] = step;

    // Se todos os passos do bloco estiverem completos, marca o bloco como completo
    const allStepsCompleted = targetSteps.every(s => s.isCompleted);
    targetBlock.isCompleted = allStepsCompleted;
    targetBlock.steps = targetSteps;
    updatedBlocks[blockIdx] = targetBlock;

    syncBlocksToExercise(updatedBlocks);

    // Se o passo foi concluído e o próximo passo for uma micro-pausa, inicia a pausa automaticamente
    if (nextState) {
      playBeep(784, 150);
      const nextStepIdx = stepIdx + 1;
      if (nextStepIdx < targetSteps.length) {
        const nextStep = targetSteps[nextStepIdx];
        if ((nextStep.type === 'recovery_rest' || nextStep.type === 'recovery_active') && nextStep.targetValue > 0) {
          setActiveStepIndex(nextStepIdx);
          setTimerSecondsRemaining(nextStep.targetValue);
          setTimerActiveStepId(nextStep.id);
          setIsTimerRunning(true);
        } else {
          setActiveStepIndex(nextStepIdx);
        }
      } else if (allStepsCompleted) {
        // Fim do bloco! Se houver descanso de bloco e houver próximo bloco:
        if (targetBlock.blockRestSeconds && blockIdx < updatedBlocks.length - 1) {
          if (onStartGlobalRestTimer) {
            onStartGlobalRestTimer(targetBlock.blockRestSeconds, targetBlock.blockRestLabel || 'Recuperação Inter-Blocos');
          } else {
            setTimerSecondsRemaining(targetBlock.blockRestSeconds);
            setTimerActiveStepId(`block-rest-${blockIdx}`);
            setIsTimerRunning(true);
          }
          setActiveBlockIndex(blockIdx + 1);
          setActiveStepIndex(0);
        }
      }
    }
  };

  // Grava tempo real de um passo (cronômetro em segundos)
  const updateStepActualTime = (blockIdx: number, stepIdx: number, seconds: number) => {
    const updatedBlocks = [...blocks];
    const targetBlock = { ...updatedBlocks[blockIdx] };
    const targetSteps = [...targetBlock.steps];
    const step = { ...targetSteps[stepIdx] };

    step.actualTimeSeconds = seconds;
    targetSteps[stepIdx] = step;
    targetBlock.steps = targetSteps;
    updatedBlocks[blockIdx] = targetBlock;

    syncBlocksToExercise(updatedBlocks);
  };

  // Concluir ou reabrir todos os passos de um bloco
  const toggleAllStepsOfBlock = (blockIdx: number) => {
    const updatedBlocks = [...blocks];
    const targetBlock = { ...updatedBlocks[blockIdx] };
    const currentCompleted = targetBlock.isCompleted;
    const nextState = !currentCompleted;

    targetBlock.isCompleted = nextState;
    targetBlock.steps = targetBlock.steps.map(s => ({
      ...s,
      isCompleted: nextState
    }));
    updatedBlocks[blockIdx] = targetBlock;

    syncBlocksToExercise(updatedBlocks);
  };

  // Concluir todos os blocos do exercício
  const completeAllBlocks = () => {
    const updatedBlocks = blocks.map(b => ({
      ...b,
      isCompleted: true,
      steps: b.steps.map(s => ({ ...s, isCompleted: true }))
    }));
    syncBlocksToExercise(updatedBlocks);
  };

  const currentBlock = blocks[activeBlockIndex] || blocks[0];
  const metrics = calculateBlocksMetrics(blocks);

  // Calcula contadores de conclusão
  const totalSteps = blocks.reduce((acc, b) => acc + b.steps.filter(s => s.type === 'sprint' || s.type === 'interval').length, 0);
  const completedEfforts = blocks.reduce((acc, b) => acc + b.steps.filter(s => (s.type === 'sprint' || s.type === 'interval') && s.isCompleted).length, 0);
  const percentComplete = totalSteps > 0 ? Math.round((completedEfforts / totalSteps) * 100) : 0;

  return (
    <div className="space-y-4 my-2">
      {/* Barra de Status e Resumo Métrico de Campo */}
      <div className="running-block-tracker-shell bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-100 dark:text-white">
                  Treino de Campo por Blocos
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {blocks.length} {blocks.length === 1 ? 'Bloco' : 'Blocos'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {exercise.notes || `${metrics.totalSprintsCount} tiros totais • Densidade controlada`}
              </p>
            </div>
          </div>

          {/* Botões Rápidos de Ação */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 dark:border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              title={soundEnabled ? "Desativar alertas sonoros" : "Ativar alertas sonoros"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {percentComplete === 100 ? (
              <button
                type="button"
                onClick={() => {
                  const reopened = blocks.map(b => ({
                    ...b,
                    isCompleted: false,
                    steps: b.steps.map(s => ({ ...s, isCompleted: false }))
                  }));
                  syncBlocksToExercise(reopened);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 dark:border-slate-800 text-slate-300 hover:text-white text-[9px] font-black uppercase tracking-wider cursor-pointer"
              >
                Reabrir Treino
              </button>
            ) : (
              <button
                type="button"
                onClick={completeAllBlocks}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md shadow-emerald-500/20 cursor-pointer transition-all"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Concluir Todos os Tiros</span>
              </button>
            )}
          </div>
        </div>

        {/* Dashlets de Métricas Físicas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="running-block-tracker-stat bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block">Progresso</span>
              <span className="text-sm font-black text-slate-100 dark:text-white">{completedEfforts} / {totalSteps}</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-emerald-400">{percentComplete}%</span>
            </div>
          </div>

          <div className="running-block-tracker-stat bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block">Distância Total</span>
              <span className="text-sm font-black text-cyan-400">{metrics.totalDistanceMeters}m</span>
            </div>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="running-block-tracker-stat bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block">Micro-Pausa</span>
              <span className="text-sm font-black text-amber-400">{exercise.intraSetRest ?? 20}s</span>
            </div>
            <Timer className="w-4 h-4 text-amber-400" />
          </div>

          <div className="running-block-tracker-stat bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block">Pausa Inter-Blocos</span>
              <span className="text-sm font-black text-indigo-400">{exercise.rest || '2m30s'}</span>
            </div>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
        </div>

        {/* Barra de Progresso do Exercício */}
        <div className="w-full bg-slate-950 h-2 rounded-full mt-3 overflow-hidden border border-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-300 rounded-full"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Navegação de Abas dos Blocos */}
      {blocks.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {blocks.map((block, idx) => {
            const isSelected = activeBlockIndex === idx;
            const effortSteps = block.steps.filter(s => s.type === 'sprint' || s.type === 'interval');
            const completedCount = effortSteps.filter(s => s.isCompleted).length;
            const isAllBlockDone = effortSteps.length > 0 && completedCount === effortSteps.length;

            return (
              <button
                key={block.id || idx}
                type="button"
                onClick={() => {
                  setActiveBlockIndex(idx);
                  setActiveStepIndex(0);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 border ${
                  isSelected
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10"
                    : isAllBlockDone
                    ? "bg-slate-900 text-slate-400 border-emerald-900/40 hover:text-white"
                    : "bg-slate-950 text-slate-500 border-slate-850 hover:text-slate-300"
                }`}
              >
                {isAllBlockDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                )}
                <span>Bloco {idx + 1}</span>
                <span className="text-[10px] opacity-75 font-mono">({completedCount}/{effortSteps.length})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Card do Bloco Ativo */}
      {currentBlock && (
        <div className="running-block-tracker-card bg-slate-900/90 dark:bg-slate-950/95 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-2xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-100 dark:text-white tracking-wider">
                  {currentBlock.name || `Bloco ${activeBlockIndex + 1}`}
                </span>
                {currentBlock.isCompleted && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Bloco Concluído ✓
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {currentBlock.notes || "Execute os tiros na velocidade máxima com técnica e aceleração constante"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => toggleAllStepsOfBlock(activeBlockIndex)}
              className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-750 dark:border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              {currentBlock.isCompleted ? 'Desmarcar Bloco' : 'Concluir Bloco'}
            </button>
          </div>

          {/* Timer Flutuante do Intervalo / Micro-Pausa */}
          {timerSecondsRemaining !== null && timerSecondsRemaining > 0 && (
            <div className="mb-4 p-3.5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Timer className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 block">
                    Micro-Pausa em Andamento
                  </span>
                  <span className="text-xl font-black font-mono text-slate-100 dark:text-white">
                    {Math.floor(timerSecondsRemaining / 60)}:{String(timerSecondsRemaining % 60).padStart(2, '0')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTimerSecondsRemaining(0);
                    setIsTimerRunning(false);
                  }}
                  className="px-2.5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider cursor-pointer"
                >
                  Pular Pausa
                </button>
              </div>
            </div>
          )}

          {/* Lista de Passos do Bloco */}
          <div className="space-y-2.5">
            {currentBlock.steps.map((step, sIdx) => {
              const isEffort = step.type === 'sprint' || step.type === 'interval';
              const isRecovery = step.type === 'recovery_rest' || step.type === 'recovery_active';

              if (isRecovery) {
                // Renderização do Passo de Recuperação / Micro-Pausa
                return (
                  <div
                    key={step.id || sIdx}
                    className={`running-block-tracker-step flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      step.isCompleted
                        ? "bg-slate-950/40 border-slate-900 opacity-60 text-slate-500"
                        : "bg-slate-900/60 border-slate-800 hover:border-amber-500/30 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <Timer className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 dark:text-amber-300/90 block">
                          {step.label}
                        </span>
                        <span className="text-[9px] text-slate-500 font-medium">
                          {step.notes || "Recuperação passiva / caminhada lenta"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTimerSecondsRemaining(step.targetValue);
                          setTimerActiveStepId(step.id);
                          setIsTimerRunning(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Play className="w-3 h-3 fill-amber-300" />
                        <span>Iniciar {step.targetValue}s</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleStepCompleted(activeBlockIndex, sIdx)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          step.isCompleted
                            ? "bg-emerald-500 text-slate-950 border border-emerald-400"
                            : "bg-slate-900 border border-slate-800 text-slate-600 hover:border-slate-500"
                        }`}
                        title={step.isCompleted ? "Desmarcar micro-pausa" : "Concluir micro-pausa"}
                      >
                        <Check className={`w-3.5 h-3.5 stroke-[3] transition-transform ${step.isCompleted ? "scale-100" : "scale-0"}`} />
                      </button>
                    </div>
                  </div>
                );
              }

              // Renderização do Passo de Estímulo / Tiro
              return (
                <div
                  key={step.id || sIdx}
                  className={`running-block-tracker-step p-3 rounded-xl border transition-all ${
                    step.isCompleted
                      ? "bg-emerald-950/20 border-emerald-500/30 shadow-inner"
                      : "bg-slate-900/80 border-slate-800 hover:border-emerald-500/40"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleStepCompleted(activeBlockIndex, sIdx)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          step.isCompleted
                            ? "bg-emerald-500 text-slate-950 border border-emerald-400 shadow-md shadow-emerald-500/30"
                            : "bg-slate-950 border border-slate-800 text-slate-600 hover:border-emerald-400"
                        }`}
                        title={step.isCompleted ? "Desmarcar tiro" : "Concluir tiro"}
                      >
                        <Check className={`w-4 h-4 stroke-[3] transition-transform ${step.isCompleted ? "scale-100" : "scale-0"}`} />
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black uppercase tracking-wider ${step.isCompleted ? "text-emerald-400" : "text-slate-100 dark:text-white"}`}>
                            {step.label}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                            {step.targetValue}{step.targetUnit}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {step.intensityTarget || "100% Velocidade Máxima"}
                        </span>
                      </div>
                    </div>

                    {/* Registro de Tempo Real / Cronômetro do Tiro */}
                    <div className="flex items-center gap-2">
                      <div className="running-block-tracker-input flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Tempo:</span>
                        <input
                          type="number"
                          step="0.01"
                          value={step.actualTimeSeconds || ""}
                          onChange={(e) => updateStepActualTime(activeBlockIndex, sIdx, parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-14 bg-transparent text-right font-mono font-bold text-xs text-slate-100 dark:text-white focus:outline-none"
                        />
                        <span className="text-[9px] font-bold text-slate-400">s</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleStepCompleted(activeBlockIndex, sIdx)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                          step.isCompleted
                            ? "bg-slate-850 text-slate-400 hover:text-white border border-slate-750 dark:border-slate-800"
                            : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-sm"
                        }`}
                      >
                        {step.isCompleted ? "Feito ✓" : "Registrar Tiro"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Descanso de Bloco ao Final */}
          {currentBlock.blockRestSeconds && currentBlock.blockRestSeconds > 0 && activeBlockIndex < blocks.length - 1 && (
            <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400 bg-indigo-950/20 px-3 py-2.5 rounded-xl border border-indigo-500/20">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 block">
                    Pausa Completa ao Final deste Bloco
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {currentBlock.blockRestLabel || `${Math.round(currentBlock.blockRestSeconds / 60)}min de descanso para restauração completa`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onStartGlobalRestTimer) {
                    onStartGlobalRestTimer(currentBlock.blockRestSeconds!, currentBlock.blockRestLabel);
                  } else {
                    setTimerSecondsRemaining(currentBlock.blockRestSeconds!);
                    setTimerActiveStepId(`block-rest-${activeBlockIndex}`);
                    setIsTimerRunning(true);
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 text-[9px] font-black uppercase tracking-wider cursor-pointer"
              >
                Disparar Pausa ({currentBlock.blockRestSeconds}s)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
