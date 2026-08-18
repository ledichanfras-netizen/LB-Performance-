import React, { FC, useState, useEffect, useMemo, useRef } from "react";
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Trophy, Zap, 
  Settings, Check, AlertCircle, ChevronRight, MessageSquare, 
  Smile, Dumbbell, Clock, Timer, Sparkles, Flame, ShieldAlert,
  Sliders, ArrowRight, ArrowLeft, X, ChevronUp, ChevronDown, Plus, Trash2,
  Video, ExternalLink, Search, Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-hot-toast";
import { Workout, PrescribedExercise, ExerciseSet } from "../types";
import { ENRICHED_LIBRARY } from "../data/exercises";
import { calculateWorkoutLoad, isTimeExercise, getEmbedVideoInfo } from "../utils";

// TTS Voice announcer
const speakText = (text: string, enabled: boolean) => {
  if (!enabled || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel(); // Stop current speech
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = 1.1; // slightly faster for premium athletic pacing
  window.speechSynthesis.speak(utterance);
};

// Gamified motivational quotes
const MOTIVATIONAL_QUOTES = [
  "Excelente! Fibra por fibra, construindo um monstro.",
  "Foco total! Cada série te aproxima do nível Elite.",
  "Sólido! Sua consistência é sua maior vantagem.",
  "Fantástico! Mantenha a velocidade e técnica perfeitas.",
  "Que potência! Biofeedback total no controle.",
  "Execução cirúrgica. Continue quebrando recordes pessoais!",
];

// Helper functions to parse reps and weights from arbitrary strings
const parseReps = (repsStr: string | number | undefined | null): number => {
  if (repsStr === undefined || repsStr === null) return 10;
  if (typeof repsStr === "number") return repsStr;
  const cleaned = repsStr.trim();
  const match = cleaned.match(/\d+/);
  if (match) {
    const val = parseInt(match[0], 10);
    return isNaN(val) ? 10 : val;
  }
  return 10;
};

const parseWeight = (weightStr: string | number | undefined | null): number => {
  if (weightStr === undefined || weightStr === null) return 0;
  if (typeof weightStr === "number") return weightStr;
  const cleaned = weightStr.trim();
  const withDot = cleaned.replace(",", ".");
  const match = withDot.match(/\d+(\.\d+)?/);
  if (match) {
    const val = parseFloat(match[0]);
    return isNaN(val) ? 0 : val;
  }
  return 0;
};

interface SessionTrackerPremiumProps {
  workout: Workout;
  onFinish: (w: Workout) => void;
  onCancel: () => void;
  athleteWeight?: number;
}

export const SessionTrackerPremium: FC<SessionTrackerPremiumProps> = ({
  workout,
  onFinish,
  onCancel,
  athleteWeight
}) => {
  const isEditingCompleted = workout.status === "completed";

  const [session, setSession] = useState<Workout>({
    ...workout,
    status: "in_progress",
    date: workout.date?.split("T")[0] || new Date().toISOString().split("T")[0],
    durationMinutes: workout.durationMinutes || 60,
    exercises: (Array.isArray(workout.exercises) ? [...workout.exercises] : [])
      .sort((a: any, b: any) => {
        const aIdx = typeof a.order_index === 'number' ? a.order_index : (typeof (a as any).orderIndex === 'number' ? (a as any).orderIndex : 9999);
        const bIdx = typeof b.order_index === 'number' ? b.order_index : (typeof (b as any).orderIndex === 'number' ? (b as any).orderIndex : 9999);
        return aIdx - bIdx;
      })
      .map(
      (ex, idx) => {
        const targetReps = parseReps(ex.reps);
        const targetWeight = parseWeight(ex.weight);
        const initialSets = ex.performedSets && ex.performedSets.length > 0
          ? ex.performedSets.map((s) => ({
              ...s,
              reps: (s.reps === 0 || !s.reps) ? targetReps : s.reps,
              weight: (s.weight === 0 || !s.weight) ? targetWeight : s.weight,
              isCompleted: isEditingCompleted ? true : ((s as any).isCompleted || false)
            }))
          : Array.from({ length: ex.sets || 3 }).map((_, i) => ({
              id: `s-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
              reps: targetReps,
              weight: targetWeight,
              rpe: 0,
              isCompleted: isEditingCompleted ? true : false // New flag for state tracking
            }));

        const isTime = isTimeExercise(ex);
        return {
          ...ex,
          repsType: isTime ? ("time" as const) : ("reps" as const),
          isSimpleEntry: ex.isSimpleEntry !== undefined ? ex.isSimpleEntry : true,
          painLevel: ex.painLevel || 0,
          performedSets: initialSets,
        };
      }
    ),
  });

  // UI state managers
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [totalElapsedTime, setTotalElapsedTime] = useState(workout.durationMinutes ? workout.durationMinutes * 60 : 0); // in seconds
  const [sessionDate, setSessionDate] = useState<string>(
    workout.date?.split("T")[0] || new Date().toISOString().split("T")[0]
  );
  const [manualDurationMinutes, setManualDurationMinutes] = useState<string>(
    isEditingCompleted ? (workout.durationMinutes || 60).toString() : ""
  );
  
  // Rest Timer states
  const [restSecondsRemaining, setRestSecondsRemaining] = useState(0);
  const [restDuration, setRestDuration] = useState(90); // default rest is 90s
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [feedbackNotes, setFeedbackNotes] = useState(workout.feedback || "");
  const [overallRpe, setOverallRpe] = useState(workout.rpe || 7);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [isQuickAdjustsCollapsed, setIsQuickAdjustsCollapsed] = useState(false);
  const [isGeneralParamsCollapsed, setIsGeneralParamsCollapsed] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [videoModalExercise, setVideoModalExercise] = useState<{
    name: string;
    muscleGroup?: string;
    notes?: string;
    videoUrl?: string;
    imageUrl?: string;
  } | null>(null);
  
  // References
  const mainStopwatchRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Active workout stats
  const activeEx = session.exercises[currentExerciseIndex];
  const nextEx = session.exercises[currentExerciseIndex + 1];

  const incompleteExercisesCount = useMemo(() => {
    return session.exercises.filter(ex => 
      !(ex.performedSets || []).every(s => (s as any).isCompleted)
    ).length;
  }, [session.exercises]);

  const isCurrentExCompleted = useMemo(() => {
    if (!activeEx || !activeEx.performedSets || activeEx.performedSets.length === 0) return false;
    return activeEx.performedSets.every(s => (s as any).isCompleted);
  }, [activeEx]);

  // Initialize total stopwatch
  useEffect(() => {
    mainStopwatchRef.current = setInterval(() => {
      setTotalElapsedTime((prev) => prev + 1);
    }, 1000);

    // Initial voice greeting
    setTimeout(() => {
      speakText(`Iniciando treino de alta performance. ${workout.name}. Foco e força!`, isVoiceEnabled);
    }, 1000);

    return () => {
      if (mainStopwatchRef.current) clearInterval(mainStopwatchRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, []);

  // Rest Timer ticking logic
  useEffect(() => {
    if (isTimerActive && restSecondsRemaining > 0) {
      restTimerRef.current = setTimeout(() => {
        setRestSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (restSecondsRemaining === 0 && isTimerActive) {
      setIsTimerActive(false);
      speakText("Descanso finalizado. Próxima série!", isVoiceEnabled);
      toast.success("Descanso Concluído! Volte ao treino.", { icon: "💪" });
    }
  }, [restSecondsRemaining, isTimerActive]);

  // Format stopwatch string
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs}:` : ""}${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Toggle voice settings
  const toggleVoice = () => {
    const nextState = !isVoiceEnabled;
    setIsVoiceEnabled(nextState);
    toast.success(nextState ? "Áudio Guia Ativado" : "Áudio Guia Silenciado", {
      icon: nextState ? "🔊" : "🔇",
    });
  };

  // Rest timer triggers
  const startRestTimer = (seconds: number) => {
    setRestDuration(seconds);
    setRestSecondsRemaining(seconds);
    setIsTimerActive(true);
    speakText(`Descanso iniciado. ${seconds} segundos de recuperação.`, isVoiceEnabled);
  };

  const stopRestTimer = () => {
    setIsTimerActive(false);
    if (restTimerRef.current) clearTimeout(restTimerRef.current);
  };

  const resetRestTimer = () => {
    setRestSecondsRemaining(restDuration);
    setIsTimerActive(true);
  };

  // Check off a set
  const toggleSetCompletion = (exId: string, setId: string) => {
    let justCompleted = false;
    let willBeAllCompleted = false;

    if (activeEx && activeEx.id === exId && activeEx.performedSets) {
      const targetSet = activeEx.performedSets.find((s) => s.id === setId);
      const isTargetCompletedBefore = targetSet ? (targetSet as any).isCompleted : false;
      const nextCompleted = !isTargetCompletedBefore;
      if (nextCompleted) {
        justCompleted = true;
      }
      
      const allOthersCompleted = activeEx.performedSets
        .filter((s) => s.id !== setId)
        .every((s) => (s as any).isCompleted);
      
      if (allOthersCompleted && nextCompleted) {
        willBeAllCompleted = true;
      }
    }

    setSession((prev) => {
      const updatedExercises = prev.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        
        const updatedSets = (ex.performedSets || []).map((set) => {
          if (set.id === setId) {
            return { ...set, isCompleted: !((set as any).isCompleted) };
          }
          return set;
        });

        return { ...ex, performedSets: updatedSets };
      });

      return { ...prev, exercises: updatedExercises };
    });

    if (justCompleted) {
      // Trigger dynamic motivation toast
      const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
      toast.success(randomQuote, {
        icon: "⚡",
        duration: 3000
      });

      // Parse configured rest time or fallback to 90s
      const restValue = activeEx?.rest || "90s";
      const secondsMatch = restValue.match(/\d+/);
      const restSecs = secondsMatch ? parseInt(secondsMatch[0]) : 90;

      // Auto start rest timer! Excellent usability UX
      startRestTimer(restSecs);

      // Auto-switching to next exercise if all are completed
      if (willBeAllCompleted) {
        const nextIndex = currentExerciseIndex + 1;
        if (nextIndex < session.exercises.length) {
          setTimeout(() => {
            navigateToExercise(nextIndex);
            toast.success(`Avançando para o próximo exercício: ${session.exercises[nextIndex].name}!`, { icon: "➡️" });
          }, 1500);
        } else {
          setTimeout(() => {
            setShowFinishModal(true);
            toast.success("Todos os exercícios concluídos! Defina sua percepção de esforço (PSE) para finalizar. 🏆", { duration: 5000 });
          }, 1500);
        }
      }
    }
  };

  // Set-level data modifiers
  const updateSetField = (exId: string, setId: string, field: keyof ExerciseSet | "isCompleted", value: any) => {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        return {
          ...ex,
          performedSets: (ex.performedSets || []).map((s) =>
            s.id === setId ? { ...s, [field]: value } : s
          ),
        };
      }),
    }));
  };

  const adjustSetField = (exId: string, setId: string, field: "weight" | "reps" | "rpe", amount: number) => {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        return {
          ...ex,
          performedSets: (ex.performedSets || []).map((s) => {
            if (s.id !== setId) return s;
            const current = Number(s[field]) || 0;
            const newVal = Math.max(0, current + amount);
            return { ...s, [field]: newVal };
          }),
        };
      }),
    }));
  };

  // Add new set replicating last set's reps and weight (or prescribed default)
  const addSetToExercise = (exId: string) => {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const currentSets = ex.performedSets || [];
        const lastSet = currentSets[currentSets.length - 1];
        const targetReps = parseReps(ex.reps);
        const targetWeight = parseWeight(ex.weight);

        const newSet: ExerciseSet = {
          id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          reps: lastSet ? (lastSet.reps || targetReps) : targetReps,
          weight: lastSet ? (lastSet.weight || targetWeight) : targetWeight,
          rpe: lastSet ? (lastSet.rpe || 0) : 0,
          isCompleted: false,
        };

        return {
          ...ex,
          performedSets: [...currentSets, newSet],
        };
      }),
    }));
    toast.success("Nova série adicionada! Carga e repetições replicadas.");
  };

  // Remove set (either specific set or last set)
  const removeSetFromExercise = (exId: string, setId?: string) => {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const currentSets = ex.performedSets || [];
        if (currentSets.length <= 1) {
          toast.error("O exercício deve ter pelo menos 1 série.");
          return ex;
        }

        let updatedSets: ExerciseSet[];
        if (setId) {
          updatedSets = currentSets.filter((s) => s.id !== setId);
        } else {
          updatedSets = currentSets.slice(0, currentSets.length - 1);
        }

        return {
          ...ex,
          performedSets: updatedSets,
        };
      }),
    }));
  };

  // Update total sets count in simple entry mode
  const updateSimpleSetsCount = (exId: string, count: number) => {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const currentSets = ex.performedSets || [];
        const targetCount = Math.max(1, count);
        let updatedSets = [...currentSets];

        if (targetCount > currentSets.length) {
          const lastSet = currentSets[currentSets.length - 1];
          const targetReps = parseReps(ex.reps);
          const targetWeight = parseWeight(ex.weight);
          const baseReps = lastSet ? (lastSet.reps || targetReps) : targetReps;
          const baseWeight = lastSet ? (lastSet.weight || targetWeight) : targetWeight;
          const baseRpe = lastSet ? (lastSet.rpe || 0) : 0;

          for (let i = currentSets.length; i < targetCount; i++) {
            updatedSets.push({
              id: `s-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
              reps: baseReps,
              weight: baseWeight,
              rpe: baseRpe,
              isCompleted: false,
            });
          }
        } else if (targetCount < currentSets.length) {
          updatedSets = updatedSets.slice(0, targetCount);
        }

        return { ...ex, performedSets: updatedSets };
      }),
    }));
  };

  // Toggle between single simple input mode or detailed list mode
  const toggleExInputMode = (exId: string) => {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.id === exId ? { ...ex, isSimpleEntry: !ex.isSimpleEntry } : ex
      ),
    }));
  };

  const updatePainValue = (exId: string, pain: number) => {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.id === exId ? { ...ex, painLevel: pain } : ex
      ),
    }));
    if (pain > 4) {
      toast("Dica: Reduza a amplitude ou carga caso a dor passe de 4.", { icon: "⚠️" });
    }
  };

  // Voice announced transition to next exercise
  const navigateToExercise = (index: number) => {
    if (index < 0 || index >= session.exercises.length) return;
    setCurrentExerciseIndex(index);
    const targetEx = session.exercises[index];
    const unit = isTimeExercise(targetEx) ? "segundos" : "repetições";
    speakText(`Próximo exercício: ${targetEx.name}. Prescrito: ${targetEx.sets} séries de ${targetEx.reps} ${unit}.`, isVoiceEnabled);
  };

  const currentSetIndexForActiveEx = useMemo(() => {
    if (!activeEx || !activeEx.performedSets) return 0;
    const firstUncompletedIndex = activeEx.performedSets.findIndex((s: any) => !s.isCompleted);
    return firstUncompletedIndex === -1 ? activeEx.performedSets.length : firstUncompletedIndex;
  }, [activeEx]);

  // Completion calculation
  const totalSetsCount = useMemo(() => {
    return session.exercises.reduce((acc, ex) => acc + (ex.performedSets?.length || 0), 0);
  }, [session.exercises]);

  const completedSetsCount = useMemo(() => {
    return session.exercises.reduce(
      (acc, ex) => acc + (ex.performedSets || []).filter((s: any) => s.isCompleted).length,
      0
    );
  }, [session.exercises]);

  const progressPercent = totalSetsCount > 0 ? Math.round((completedSetsCount / totalSetsCount) * 100) : 0;

  // Finishing the entire session
  const triggerFinish = () => {
    if (!isEditingCompleted && completedSetsCount < totalSetsCount * 0.5) {
      const confirmFinish = window.confirm("Você concluiu menos da metade das séries planejadas. Deseja finalizar mesmo assim?");
      if (!confirmFinish) return;
    }

    if (isEditingCompleted) {
      speakText("Alterações salvas com sucesso.", isVoiceEnabled);
    } else {
      speakText("Treino concluído com maestria. Parabéns pelo desempenho elite!", isVoiceEnabled);
    }
    
    // Save state
    const finalDuration = manualDurationMinutes !== "" 
      ? parseInt(manualDurationMinutes) || 1 
      : Math.max(1, Math.round(totalElapsedTime / 60));
    
    // Auto map values to match standard types
    const completedSession: Workout = {
      ...session,
      status: "completed",
      date: sessionDate,
      durationMinutes: finalDuration,
      rpe: overallRpe,
      feedback: feedbackNotes || session.feedback || "Treino concluído com biofeedback de alta performance.",
      totalLoad: calculateWorkoutLoad(session, athleteWeight),
      exercises: (session.exercises || []).map((ex, idx) => ({ ...ex, order_index: idx }))
    };

    onFinish(completedSession);
  };

  // Face indicator for RPE scale
  const getRpeEmojiAndInfo = (rpe: number) => {
    if (rpe <= 2) return { emoji: "🟢 😌", text: "Muito Leve / Recuperação" };
    if (rpe <= 4) return { emoji: "🟡 🙂", text: "Moderado / Confortável" };
    if (rpe <= 6) return { emoji: "🟠 😏", text: "Firme / Ritmo Esportivo" };
    if (rpe <= 8) return { emoji: "🔴 🥵", text: "Intenso / Sobrecarga Planejada" };
    return { emoji: "🔥 ☠️", text: "Esforço Máximo / RPE Limiar" };
  };

  const rpeDetails = getRpeEmojiAndInfo(overallRpe);

  if (isEditingCompleted) {
    return (
      <div id="completed-workout-edit-modal" className="w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] bg-slate-950 md:border md:border-slate-900 md:rounded-[2.5rem] shadow-2xl text-slate-100 p-4 sm:p-6 flex flex-col gap-4 animate-in fade-in duration-300 relative overflow-y-auto no-scrollbar">
        {/* BACKGROUND GLOW */}
        <div id="edit-glow" className="absolute -top-12 -right-12 w-48 h-48 bg-brand-primary/5 rounded-full blur-[80px] pointer-events-none" />
        
        {/* EDITING HEADER */}
        <div id="edit-header" className="flex justify-between items-center border-b border-slate-900 pb-3 shrink-0">
          <div>
            <span className="text-[9px] font-black text-[#39FF14] uppercase tracking-widest block">MODO DE EDIÇÃO DE TREINO CONCLUÍDO</span>
            <h2 className="text-sm sm:text-base font-black uppercase italic text-white tracking-tight mt-0.5">{workout.name}</h2>
          </div>
          <button
            id="edit-close-btn"
            onClick={() => {
              if (window.confirm("Deseja realmente sair e descartar as alterações deste treino?")) {
                onCancel();
              }
            }}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-all cursor-pointer"
            title="Sair da Edição"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* PARÂMETROS GERAIS DO TREINO */}
        {isGeneralParamsCollapsed ? (
          <div id="edit-general-params-collapsed" className="p-3 bg-[#0a0f1d] border border-slate-900 rounded-2xl flex items-center justify-between gap-3 shrink-0 my-1 hover:border-slate-800 transition-all">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-amber-400/5 px-2 py-0.5 rounded border border-amber-400/15">SESSÃO</span>
              <span className="text-[10px] text-slate-300 font-black">📅 {sessionDate ? new Date(sessionDate + "T00:00:00").toLocaleDateString('pt-BR') : '-'}</span>
              <span className="text-[10px] text-slate-300 font-black">⏱️ {manualDurationMinutes || "0"} MIN</span>
              <span className="text-[10px] text-slate-300 font-black">🔥 PSE {overallRpe} — {getRpeEmojiAndInfo(overallRpe).emoji}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsGeneralParamsCollapsed(false)}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[#39FF14] text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0"
            >
              <span>Expandir</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#39FF14]" />
            </button>
          </div>
        ) : (
          <div id="edit-general-params" className="p-4 bg-[#0a0f1d] border border-slate-900 rounded-2xl space-y-3 shrink-0 my-1 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between pb-1 border-b border-slate-900">
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block">📊 DETALHES GERAIS DA SESSÃO</span>
              <button
                type="button"
                onClick={() => setIsGeneralParamsCollapsed(true)}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0"
                title="Recolher painel para liberar espaço para edição dos exercícios"
              >
                <span>Recolher Detalhes</span>
                <ChevronUp className="w-3.5 h-3.5 text-[#39FF14]" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Data */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">📅 DATA DE EXECUÇÃO</label>
                <input
                  id="edit-date-input"
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#39FF14] transition-all cursor-pointer"
                />
              </div>

              {/* Duração */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">⏱️ DURAÇÃO DO TREINO</label>
                <div className="relative">
                  <input
                    id="edit-duration-input"
                    type="number"
                    min="1"
                    value={manualDurationMinutes}
                    onChange={(e) => setManualDurationMinutes(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="w-full bg-slate-950 border border-slate-900 rounded-xl pl-3 pr-16 py-2 text-xs font-bold text-white outline-none focus:border-[#39FF14] transition-all cursor-pointer"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-500 uppercase tracking-wider select-none pointer-events-none">
                    MINUTOS
                  </span>
                </div>
              </div>

              {/* PSE Geral */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">🔥 PSE DA SESSÃO (1 A 10)</label>
                <select
                  id="edit-rpe-select"
                  value={overallRpe}
                  onChange={(e) => setOverallRpe(parseInt(e.target.value) || 7)}
                  className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#39FF14] transition-all cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                    <option key={v} value={v} className="bg-slate-950 text-white">
                      PSE {v} — {getRpeEmojiAndInfo(v).emoji}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Feedback/Relato */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">💬 RELATO DE BIOFEEDBACK (OPCIONAL)</label>
              <textarea
                id="edit-feedback-input"
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                className="w-full h-12 bg-slate-950 border border-slate-900 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#39FF14] transition-all font-semibold resize-none"
                placeholder="Descreva as percepções sobre o cansaço, cargas ou dores..."
              />
            </div>
          </div>
        )}

        {/* LISTA VERTICAL DE TODOS OS EXERCÍCIOS */}
        <div id="edit-exercises-scroll" className="space-y-4 pr-1 mt-1 mb-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">🏋️‍♂️ EXERCÍCIOS E METRÍCAS DO TREINO</span>
            <span className="text-[8px] font-bold text-slate-500 uppercase">Lista contínua</span>
          </div>

          {session.exercises.map((ex, idx) => {
            const prescribedSets = ex.sets || 3;
            const prescribedReps = ex.reps || "10";
            const prescribedWeight = ex.weight || "0";

            return (
              <div 
                key={ex.id} 
                id={`edit-ex-card-${ex.id}`}
                className="p-4 bg-[#0c111d] border border-slate-900 rounded-2xl space-y-3 shadow-md hover:border-slate-800 transition-all"
              >
                {/* Exercise Title and prescribed metrics */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2.5 border-b border-slate-900">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                      <span className="text-[#39FF14]">{idx + 1}.</span>
                      <span>{ex.name}</span>
                    </h4>
                    <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 block">
                      Grupo: {ex.muscleGroup || "GERAL"} • Prescrição: {prescribedSets}x{isTimeExercise(ex) ? `${String(prescribedReps).replace(/s/gi, "")}s` : prescribedReps} @ {prescribedWeight}
                    </span>
                  </div>

                  {/* Pain Level Dropdown */}
                  <div className="flex items-center gap-1.5 shrink-0 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-900/60">
                    <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">DOR REATIVA:</span>
                    <select
                      id={`edit-ex-pain-${ex.id}`}
                      value={ex.painLevel || 0}
                      onChange={(e) => updatePainValue(ex.id, parseInt(e.target.value))}
                      className={`text-[10px] font-black bg-transparent outline-none cursor-pointer transition-colors ${
                        (ex.painLevel || 0) > 4 ? "text-red-500 font-bold" : "text-white"
                      }`}
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                        <option key={v} value={v} className="bg-slate-900 text-white">{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Individual performed sets */}
                <div className="space-y-1.5">
                  <div className="grid grid-cols-12 gap-2 text-center text-[8.5px] font-black text-slate-500 uppercase tracking-wider px-1 select-none">
                    <div className="col-span-2 text-left">Série</div>
                    <div className="col-span-4">Carga (kg)</div>
                    <div className="col-span-4">Reps / Tempo</div>
                    <div className="col-span-2">PSE</div>
                  </div>

                  {(ex.performedSets || []).map((set, setIdx) => (
                    <div 
                      key={set.id} 
                      id={`edit-set-row-${set.id}`}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-950/40 p-1.5 rounded-xl border border-slate-900/60"
                    >
                      <div className="col-span-2 pl-1.5 text-[10px] font-black text-[#39FF14] font-mono">
                        S{setIdx + 1}
                      </div>

                      {/* Weight input */}
                      <div className="col-span-4 relative flex items-center">
                        <input
                          id={`edit-weight-input-${set.id}`}
                          type="number"
                          step="any"
                          value={set.weight ?? ""}
                          onChange={(e) => updateSetField(ex.id, set.id, "weight", parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className="w-full bg-slate-950 border border-slate-900 focus:border-[#39FF14] rounded-lg py-1 text-center font-extrabold text-xs text-white outline-none transition-colors"
                          placeholder="0"
                        />
                      </div>

                      {/* Reps input */}
                      <div className="col-span-4 relative flex items-center">
                        <input
                          id={`edit-reps-input-${set.id}`}
                          type="number"
                          value={set.reps ?? ""}
                          onChange={(e) => updateSetField(ex.id, set.id, "reps", parseInt(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className="w-full bg-slate-950 border border-slate-900 focus:border-[#39FF14] rounded-lg py-1 pr-6 text-center font-extrabold text-xs text-white outline-none transition-colors"
                          placeholder="0"
                        />
                        <span className="absolute right-2 text-[9px] font-black text-slate-500 uppercase select-none pointer-events-none">
                          {isTimeExercise(ex) ? "s" : "r"}
                        </span>
                      </div>

                      {/* RPE input */}
                      <div className="col-span-2">
                        <select
                          id={`edit-set-rpe-${set.id}`}
                          value={set.rpe || 0}
                          onChange={(e) => updateSetField(ex.id, set.id, "rpe", parseInt(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-900 focus:border-[#39FF14] rounded-lg py-0.5 px-1 text-center font-extrabold text-xs text-white outline-none cursor-pointer"
                        >
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                            <option key={v} value={v} className="bg-slate-900">{v}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div id="edit-footer-actions" className="border-t border-slate-900 pt-3 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 shrink-0">
          <button
            id="edit-save-btn"
            onClick={triggerFinish}
            className="w-full sm:flex-1 py-3 bg-[#39FF14] hover:bg-[#32e00f] text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-[#39FF14]/15 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Salvar Alterações</span>
          </button>
          <button
            id="edit-cancel-btn"
            onClick={onCancel}
            className="w-full sm:w-auto px-6 py-3 border border-slate-800 hover:border-slate-600 text-slate-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen md:min-h-0 md:h-[97vh] md:max-w-6xl bg-slate-950 md:border md:border-slate-900 md:rounded-[2.5rem] overflow-y-auto md:overflow-hidden shadow-2xl text-slate-100 p-3 sm:p-6 md:p-8 space-y-4 md:space-y-6 flex flex-col animate-in fade-in duration-300">
      
      {isHeaderCollapsed ? (
        /* COMPACT FOCUS HEADER FOR MOBILE */
        <div className="flex items-center justify-between gap-3 border-b border-slate-900 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider truncate max-w-[150px] sm:max-w-none">
              {workout.name} — <strong className="text-amber-400">Modo Foco 🎯</strong>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {isEditingCompleted && (
              <button
                type="button"
                onClick={triggerFinish}
                className="px-3 py-1.5 bg-[#39FF14] hover:bg-[#32e00f] text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar</span>
              </button>
            )}
            
            <button
              type="button"
              onClick={() => setIsHeaderCollapsed(false)}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-[#39FF14] border border-slate-800 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
            >
              <span>Exibir Cabeçalho</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            
            <button
              onClick={() => {
                if (window.confirm("Deseja realmente sair e descartar o andamento deste treino?")) {
                  onCancel();
                }
              }}
              className="p-1.5 bg-red-950/20 hover:bg-red-900 text-red-400 hover:text-white rounded-lg border border-red-900/30 transition-all cursor-pointer"
              title="Sair"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* HUD HEADER PANEL */
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-5 shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">SESSÃO ELITE EM EXECUÇÃO</span>
              </div>
              <button
                type="button"
                onClick={() => setIsHeaderCollapsed(true)}
                className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[8px] font-bold uppercase tracking-wider text-amber-400 rounded transition-all cursor-pointer"
                title="Ocultar cabeçalho para focar exclusivamente nos exercícios e liberar espaço no celular"
              >
                🎯 Recolher Cabeçalho (Foco Celular)
              </button>
            </div>
            <h2 className="text-xl md:text-2xl font-black uppercase italic text-white tracking-tight mt-1">{workout.name}</h2>
          </div>

          {/* CLOCKS & TOGGLES */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={() => {
                if (manualDurationMinutes === "") {
                  setManualDurationMinutes(Math.max(1, Math.round(totalElapsedTime / 60)).toString());
                }
                setShowFinishModal(true);
              }}
              className="flex items-center gap-2 bg-[#0c111d] hover:bg-slate-900 px-4 py-2 rounded-xl border border-slate-900 hover:border-slate-800 shadow-md group transition-all cursor-pointer text-left"
              title="Ajustar data/tempo total de execução"
            >
              <Clock className="w-4 h-4 text-amber-400 animate-spin-slow group-hover:text-[#39FF14] transition-colors" />
              <div className="flex flex-col leading-none">
                <span className="text-[7px] font-black text-[#39FF14] uppercase tracking-wider select-none opacity-80 group-hover:opacity-100 transition-all">Ajustar</span>
                <span className="text-xs font-black text-white font-mono mt-0.5">
                  {manualDurationMinutes !== "" ? `${manualDurationMinutes} min` : formatTime(totalElapsedTime)}
                </span>
              </div>
            </button>

            <button
              onClick={toggleVoice}
              className={`p-2.5 rounded-xl border transition-all ${
                isVoiceEnabled 
                  ? "bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/30 shadow-lg shadow-[#39FF14]/5" 
                  : "bg-slate-900 text-slate-500 border-slate-800"
              }`}
              title="Ativar/Desativar áudio guia"
            >
              {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                if (window.confirm("Deseja realmente sair e descartar o andamento deste treino?")) {
                  onCancel();
                }
              }}
              className="p-2.5 bg-red-950/20 hover:bg-red-900 text-red-400 hover:text-white rounded-xl border border-red-900/30 transition-all cursor-pointer"
              title="Sair do Treino"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SESSION PROGRESSION TIMELINE */}
      {!isHeaderCollapsed && (
        <div className="space-y-1.5 shrink-0">
          <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 tracking-wider px-1">
            <span>PROGRESSO DA SESSÃO</span>
            <span className="text-[#39FF14]">{completedSetsCount} DE {totalSetsCount} SÉRIES ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-950">
            <div 
              className="bg-gradient-to-r from-emerald-500 via-brand-primary to-cyan-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* SEÇÃO DE AJUSTES RÁPIDOS DO TREINO CONCLUÍDO */}
      {isEditingCompleted && !isHeaderCollapsed && (
        <div className="p-4 bg-[#0a0f1d] border border-slate-900 rounded-2xl space-y-4 shrink-0 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          {isQuickAdjustsCollapsed ? (
            /* COMPACT COLLAPSED VIEW */
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1">
                  🎯 AJUSTES RÁPIDOS <span className="text-slate-500 font-bold">(Recolhido)</span>
                </span>
                <span className="text-[10px] text-slate-300 font-bold">
                  Tempo: <strong className="text-[#39FF14]">{manualDurationMinutes || "1"} min</strong>
                </span>
                <span className="text-[10px] text-slate-300 font-bold">
                  PSE: <strong className="text-amber-400">{overallRpe}</strong> — {getRpeEmojiAndInfo(overallRpe).emoji}
                </span>
                <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">
                  • Exercício ativo: <strong className="text-white">{(currentExerciseIndex + 1)}. {activeEx?.name}</strong>
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={triggerFinish}
                  className="px-3.5 py-1.5 bg-[#39FF14] hover:bg-[#32e00f] text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Check className="w-3 h-3" />
                  <span>Salvar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsQuickAdjustsCollapsed(false)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-[#39FF14] border border-slate-800 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <span>Expandir</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* FULL EXPANDED VIEW */
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
                <div className="flex items-start justify-between sm:justify-start gap-3 w-full sm:w-auto">
                  <div>
                    <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block">🎯 AJUSTES RÁPIDOS DO TREINO</span>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Altere o tempo de treino, PSE ou clique em qualquer exercício na lista abaixo para editar suas cargas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsQuickAdjustsCollapsed(true)}
                    className="sm:ml-3 px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    title="Recolher painel para liberar espaço para edição dos exercícios"
                  >
                    <span>Recolher</span>
                    <ChevronUp className="w-3.5 h-3.5 text-[#39FF14]" />
                  </button>
                </div>
                
                {/* Botão de Salvar Rápido */}
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <button
                    onClick={triggerFinish}
                    className="px-5 py-2.5 bg-[#39FF14] hover:bg-[#32e00f] text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#39FF14]/10 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar Alterações</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ajuste de Tempo */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                    ⏱️ TEMPO DO TREINO (MINUTOS)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="480"
                      value={manualDurationMinutes}
                      onChange={(e) => setManualDurationMinutes(e.target.value)}
                      className="w-24 bg-slate-950 border border-slate-900 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-[#39FF14] transition-all cursor-pointer"
                    />
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">minutos totais</span>
                  </div>
                </div>

                {/* Ajuste de PSE */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                    🔥 PSE DA SESSÃO (1 a 10)
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => {
                      const isSelected = overallRpe === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setOverallRpe(v)}
                          className={`w-7 h-7 rounded-lg border text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                            isSelected
                              ? "bg-amber-500/20 border-amber-500 text-amber-400 shadow-md font-black"
                              : "bg-slate-950 border-slate-900 hover:border-slate-700 text-slate-400"
                          }`}
                        >
                          {v}
                        </button>
                      );
                    })}
                    <span className="text-[9px] text-amber-400 font-bold ml-1 self-center bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      PSE {overallRpe} — {getRpeEmojiAndInfo(overallRpe).emoji}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lista de Exercícios para Seleção Rápida */}
              <div className="space-y-1.5 pt-2 border-t border-slate-900">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">🏋️‍♂️ IR PARA EXERCÍCIO (CLIQUE PARA EDITAR CARGA)</span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                  {session.exercises.map((ex, idx) => {
                    const isActive = idx === currentExerciseIndex;
                    return (
                      <button
                        key={ex.id}
                        onClick={() => setCurrentExerciseIndex(idx)}
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                          isActive
                            ? "bg-[#39FF14]/15 border-[#39FF14]/30 text-[#39FF14]"
                            : "bg-slate-950 hover:bg-slate-900 border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-300"
                        }`}
                      >
                        <span className="opacity-50">{idx + 1}.</span>
                        <span>{ex.name}</span>
                        <span className="text-[8px] bg-slate-900 px-1 py-0.2 rounded-md text-slate-500 font-mono font-black">
                          {(ex.performedSets || []).length}S
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* DETAILED ACTIVE WORKOUT CARD */}
      <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar">
        {activeEx ? (
          <div className="space-y-6">
            
            {/* Exercise Card Header & Info */}
            <div className="p-6 bg-gradient-to-b from-[#0c111d] to-[#05080e] rounded-[2rem] border border-slate-900 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-[50px] pointer-events-none" />
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black bg-[#39FF14]/15 border border-[#39FF14]/25 text-[#39FF14] px-3 py-1 rounded-full uppercase tracking-wider">
                      {activeEx.muscleGroup || "GERAL"}
                    </span>
                    {isCurrentExCompleted ? (
                      <span className="text-[10px] font-black bg-[#39FF14]/15 border border-[#39FF14]/25 text-[#39FF14] px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                        ✔️ EXERCÍCIO CONCLUÍDO
                      </span>
                    ) : (
                      activeEx.performedSets && (
                        <span className="text-[10px] font-black bg-amber-500/15 border border-amber-500/25 text-amber-400 px-3 py-1 rounded-full uppercase tracking-wider">
                          ⚡ Série em execução: {currentSetIndexForActiveEx + 1 > activeEx.performedSets.length ? "Concluída ✨" : `Série ${currentSetIndexForActiveEx + 1} de ${activeEx.performedSets.length}`}
                        </span>
                      )
                    )}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black uppercase italic text-white tracking-tight mt-2.5 flex flex-wrap items-center gap-3">
                    <span>{activeEx.name}</span>
                    {(() => {
                      let customExs: any[] = [];
                      try {
                        const stored = localStorage.getItem("LB_CUSTOM_LIBRARY_EXERCISES");
                        if (stored) {
                          customExs = JSON.parse(stored);
                        }
                      } catch (err) {
                        console.error("Erro ao carregar customLibraryExercises em SessionTrackerPremium:", err);
                      }
                      const matchingCustomEx = customExs.find((x: any) => x.name.toLowerCase().trim() === activeEx.name.toLowerCase().trim() || activeEx.name.toLowerCase().includes(x.name.toLowerCase()));
                      const matchingLibEx = ENRICHED_LIBRARY.find((x: any) => x.name.toLowerCase().trim() === activeEx.name.toLowerCase().trim() || activeEx.name.toLowerCase().includes(x.name.toLowerCase()));
                      
                      const resolvedVideoUrl = activeEx.videoUrl || matchingCustomEx?.videoUrl || matchingLibEx?.videoUrl;
                      const hasDirectVideo = !!resolvedVideoUrl;

                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setVideoModalExercise({
                              name: activeEx.name,
                              muscleGroup: activeEx.muscleGroup,
                              notes: activeEx.notes,
                              videoUrl: resolvedVideoUrl,
                              imageUrl: activeEx.imageUrl || (matchingCustomEx as any)?.imageUrl || (matchingLibEx as any)?.imageUrl
                            });
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[9.5px] uppercase font-black tracking-wider rounded-xl transition-all cursor-pointer ${
                            hasDirectVideo 
                              ? "bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse" 
                              : "bg-[#39FF14]/10 hover:bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/25 shadow-[0_0_15px_rgba(57,255,20,0.15)]"
                          }`}
                          title="Abrir demonstração em vídeo e guia técnico de execução"
                        >
                          <Video className="w-3.5 h-3.5 shrink-0" />
                          <span>{hasDirectVideo ? "Vídeo Técnico 🎬" : "Guia de Execução ⚡"}</span>
                        </button>
                      );
                    })()}
                  </h3>
                  {activeEx.notes && (
                    <p className="text-xs text-slate-400 font-semibold mt-2.5 bg-slate-950/40 p-2.5 rounded-lg border border-slate-900 italic">
                      💡 {activeEx.notes}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">PRESCRIÇÃO</span>
                  <span className="text-sm font-black text-[#39FF14] bg-[#39FF14]/10 border border-[#39FF14]/20 px-4 py-2 rounded-xl italic">
                    {activeEx.sets}x{isTimeExercise(activeEx) ? `${String(activeEx.reps).replace(/s/gi, "")}s` : activeEx.reps} @ {activeEx.weight}
                  </span>
                </div>
              </div>

              {/* PAIN & DETAILS CONTROLLER */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-5 border-t border-slate-900 relative z-10">
                <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-900/60">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">MODO DE PREENCHIMENTO</span>
                  <button
                    onClick={() => toggleExInputMode(activeEx.id)}
                    className="text-[10px] font-black uppercase tracking-wider text-[#39FF14] bg-[#39FF14]/10 hover:bg-[#39FF14]/20 px-3 py-1.5 rounded-lg transition-colors border border-brand-primary/20"
                  >
                    {activeEx.isSimpleEntry ? "Modo Detalhado 📊" : "Modo Simplificado ⚡"}
                  </button>
                </div>

                <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-900/60">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">DOR REATIVA (0-10)</span>
                  <select
                    value={activeEx.painLevel || 0}
                    onChange={(e) => updatePainValue(activeEx.id, parseInt(e.target.value))}
                    className={`text-xs font-black rounded-lg px-2.5 py-1.5 outline-none border transition-all ${
                      (activeEx.painLevel || 0) > 4 
                        ? "bg-red-950/40 border-red-500 text-red-500" 
                        : "bg-slate-950 border-slate-800 text-white"
                    }`}
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                      <option key={v} value={v} className="bg-slate-900">{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* REST COUNTDOWN HUB */}
            <div className="p-4 bg-[#0c111d]/60 rounded-2xl border border-slate-900 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Timer className={`w-5 h-5 ${isTimerActive ? "animate-pulse" : ""}`} />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">CRONÔMETRO DE DESCANSO</h4>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Automático ao marcar série</p>
                </div>
              </div>

              {/* TIMER CONTROLS */}
              <div className="flex items-center gap-4">
                {isTimerActive ? (
                  <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-900 rounded-xl px-5 py-2">
                    <span className="text-lg font-black text-[#39FF14] font-mono leading-none animate-pulse">
                      {restSecondsRemaining}s
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={stopRestTimer} className="p-1 text-red-400 hover:text-red-300">
                        <Pause className="w-4 h-4" />
                      </button>
                      <button onClick={resetRestTimer} className="p-1 text-slate-400 hover:text-white">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {[60, 90, 120].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => startRestTimer(sec)}
                        className="text-[10px] font-black uppercase tracking-wider bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                      >
                        +{sec}s
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SETS EXECUTION MANAGER */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  MÉTRICAS EXECUTADAS ({(activeEx.performedSets || []).length} SÉRIES)
                </h4>
              </div>
              
              {activeEx.isSimpleEntry ? (
                // SIMPLE ENTRY FORM FOR EASY COACHING PRE-POPULATION
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#0c111d] p-4 rounded-2xl border border-slate-900">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-900">
                    <label className="text-[9px] text-slate-500 uppercase font-black block tracking-widest text-center mb-1">SÉRIES ATIVAS</label>
                    <div className="flex items-center justify-between">
                      <button onClick={() => removeSetFromExercise(activeEx.id)} className="text-slate-400 hover:text-white text-base font-bold px-2.5 py-1 bg-slate-900 rounded-lg cursor-pointer">-</button>
                      <input
                        type="number"
                        value={activeEx.performedSets?.length || ""}
                        onChange={(e) => updateSimpleSetsCount(activeEx.id, parseInt(e.target.value) || 1)}
                        onFocus={(e) => e.target.select()}
                        className="w-12 bg-transparent text-center font-black text-white text-base outline-none"
                      />
                      <button onClick={() => addSetToExercise(activeEx.id)} className="text-slate-400 hover:text-white text-base font-bold px-2.5 py-1 bg-slate-900 rounded-lg cursor-pointer">+</button>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-900">
                    <label className="text-[9px] text-slate-500 uppercase font-black block tracking-widest text-center mb-1">{isTimeExercise(activeEx) ? "TEMPO (SEG)" : "REPETIÇÕES"}</label>
                    <div className="flex items-center justify-between">
                      <button onClick={() => adjustSetField(activeEx.id, activeEx.performedSets?.[0]?.id || "", "reps", -1)} className="text-slate-400 hover:text-white text-base font-bold px-2.5 py-1 bg-slate-900 rounded-lg">-</button>
                      <input
                        type="number"
                        value={activeEx.performedSets?.[0]?.reps === 0 ? "" : activeEx.performedSets?.[0]?.reps || ""}
                        onChange={(e) => updateSetField(activeEx.id, activeEx.performedSets?.[0]?.id || "", "reps", parseInt(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        className="w-14 bg-transparent text-center font-black text-white text-base outline-none"
                        placeholder="0"
                      />
                      <button onClick={() => adjustSetField(activeEx.id, activeEx.performedSets?.[0]?.id || "", "reps", 1)} className="text-slate-400 hover:text-white text-base font-bold px-2.5 py-1 bg-slate-900 rounded-lg">+</button>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-900">
                    <label className="text-[9px] text-slate-500 uppercase font-black block tracking-widest text-center mb-1">CARGA (KG)</label>
                    <div className="flex items-center justify-between">
                      <button onClick={() => adjustSetField(activeEx.id, activeEx.performedSets?.[0]?.id || "", "weight", -1)} className="text-slate-400 hover:text-white text-base font-bold px-2.5 py-1 bg-slate-900 rounded-lg">-</button>
                      <input
                        type="number"
                        value={activeEx.performedSets?.[0]?.weight === 0 ? "" : activeEx.performedSets?.[0]?.weight || ""}
                        onChange={(e) => updateSetField(activeEx.id, activeEx.performedSets?.[0]?.id || "", "weight", parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        className="w-14 bg-transparent text-center font-black text-white text-base outline-none"
                        placeholder="0"
                      />
                      <button onClick={() => adjustSetField(activeEx.id, activeEx.performedSets?.[0]?.id || "", "weight", 1)} className="text-slate-400 hover:text-white text-base font-bold px-2.5 py-1 bg-slate-900 rounded-lg">+</button>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 flex flex-col justify-center items-center gap-2">
                    {isCurrentExCompleted ? (
                      <>
                        <button
                          disabled
                          className="w-full bg-slate-900 text-slate-500 border border-slate-800/60 font-black text-xs uppercase py-3.5 px-3 rounded-xl tracking-wider select-none cursor-not-allowed opacity-50 flex items-center justify-center gap-1.5"
                        >
                          CONCLUÍDO ✔️
                        </button>
                        <button
                          onClick={() => {
                            (activeEx.performedSets || []).forEach(set => {
                              updateSetField(activeEx.id, set.id, "isCompleted", false);
                            });
                            toast.success("Exercício reaberto para edição!");
                          }}
                          className="text-[9px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors cursor-pointer"
                        >
                          REABRIR 🔄
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          (activeEx.performedSets || []).forEach(set => {
                            updateSetField(activeEx.id, set.id, "isCompleted", true);
                          });
                          toast.success("Todas as séries marcadas como concluídas!");
                          
                          const restValue = activeEx?.rest || "90s";
                          const secondsMatch = restValue.match(/\d+/);
                          const restSecs = secondsMatch ? parseInt(secondsMatch[0]) : 90;
                          startRestTimer(restSecs);

                          const nextIndex = currentExerciseIndex + 1;
                          if (nextIndex < session.exercises.length) {
                            setTimeout(() => {
                              navigateToExercise(nextIndex);
                              toast.success(`Avançando para o próximo exercício: ${session.exercises[nextIndex].name}!`, { icon: "➡️" });
                            }, 1500);
                          } else {
                            setTimeout(() => {
                              setShowFinishModal(true);
                              toast.success("Todos os exercícios concluídos! Defina sua percepção de esforço (PSE) para finalizar. 🏆", { duration: 5000 });
                            }, 1500);
                          }
                        }}
                        className="w-full bg-[#39FF14] hover:bg-[#32e00f] text-slate-950 font-black text-xs uppercase py-3.5 px-3 rounded-xl tracking-wider transition-colors shadow-lg shadow-[#39FF14]/10 cursor-pointer"
                      >
                        CONCLUIR ✅
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                // DETAILED ROW BY ROW SET RECORDING
                <div className="space-y-4">
                  {/* SMART ACTIVE SET CONTROLLER FOR QUICK RECORDING & REST TIMER TRIGGERS */}
                  {currentSetIndexForActiveEx < (activeEx.performedSets || []).length && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-950/80 border border-[#39FF14]/30 rounded-2xl p-5 shadow-[0_15px_30px_rgba(57,255,20,0.06)] flex flex-col sm:flex-row items-center justify-between gap-4"
                    >
                      <div className="text-center sm:text-left">
                        <div className="flex items-center gap-2 justify-center sm:justify-start">
                          <span className="inline-block w-2 h-2 rounded-full bg-[#39FF14] animate-ping" />
                          <span className="text-[9px] font-black text-[#39FF14] uppercase tracking-widest">
                            Série Atual em Execução
                          </span>
                        </div>
                        <h3 className="text-base font-black text-white uppercase mt-1 leading-tight">
                          Série {currentSetIndexForActiveEx + 1} de {(activeEx.performedSets || []).length}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5 tracking-wider">
                          Meta: {isTimeExercise(activeEx) ? `${String(activeEx.reps).replace(/s/gi, "")}s (Tempo)` : `${activeEx.reps} Reps`} • Carga: {activeEx.performedSets?.[currentSetIndexForActiveEx]?.weight || activeEx.weight || 0} kg
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          const activeSet = activeEx.performedSets?.[currentSetIndexForActiveEx];
                          if (activeSet) {
                            toggleSetCompletion(activeEx.id, activeSet.id);
                          }
                        }}
                        className="w-full sm:w-auto bg-[#39FF14] hover:bg-[#32e00f] text-slate-950 font-black text-xs uppercase py-3.5 px-6 rounded-xl tracking-widest transition-all shadow-[0_10px_20px_rgba(57,255,20,0.15)] flex items-center justify-center gap-2 group cursor-pointer"
                      >
                        <Check className="w-4 h-4 stroke-[3] group-hover:scale-115 transition-transform" />
                        CONCLUIR SÉRIE {currentSetIndexForActiveEx + 1} & INICIAR DESCANSO ⏱️
                      </button>
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    {(activeEx.performedSets || []).map((set, index) => {
                      const isCompleted = (set as any).isCompleted;
                      const isActive = index === currentSetIndexForActiveEx && !isCompleted;
                      return (
                        <div
                          key={set.id}
                          className={`grid grid-cols-12 gap-2.5 items-center p-3.5 rounded-xl border transition-all ${
                            isCompleted 
                              ? "bg-[#39FF14]/5 border-[#39FF14]/20 shadow-inner" 
                              : isActive
                                ? "bg-slate-900 border-[#39FF14]/40 shadow-[0_0_15px_rgba(57,255,20,0.05)] ring-1 ring-[#39FF14]/20"
                                : "bg-[#0c111d] border-slate-900"
                          }`}
                        >
                          {/* Checkbox button & Set label */}
                          <div className="col-span-2 flex items-center gap-2.5">
                            <button
                              onClick={() => toggleSetCompletion(activeEx.id, set.id)}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                isCompleted 
                                  ? "bg-[#39FF14] text-slate-950 border-[#39FF14] shadow-lg shadow-[#39FF14]/20" 
                                  : "bg-slate-950 border border-slate-800 text-slate-600 hover:border-slate-500"
                              }`}
                            >
                              <Check className={`w-4 h-4 stroke-[3] transition-transform duration-200 ${isCompleted ? "scale-100" : "scale-0"}`} />
                            </button>
                            <span className={`text-xs md:text-sm font-black uppercase tracking-wider ${isCompleted ? "text-[#39FF14]" : isActive ? "text-white font-extrabold" : "text-slate-400"}`}>
                              S{index + 1}
                            </span>
                          </div>

                          {/* Weight input */}
                          <div className="col-span-3 flex items-center gap-1">
                            <input
                              type="number"
                              value={set.weight || ""}
                              onChange={(e) => updateSetField(activeEx.id, set.id, "weight", parseFloat(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              className="w-full bg-slate-950 border border-slate-800 focus:border-[#39FF14] rounded-xl py-2.5 px-2 text-center font-extrabold text-sm md:text-base text-white transition-all"
                              placeholder="0"
                            />
                            <span className="text-[9px] font-black text-slate-500 uppercase">KG</span>
                          </div>

                          {/* Reps input */}
                          <div className="col-span-3 flex items-center gap-1">
                            <input
                              type="number"
                              value={set.reps || ""}
                              onChange={(e) => updateSetField(activeEx.id, set.id, "reps", parseInt(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              className="w-full bg-slate-950 border border-slate-800 focus:border-[#39FF14] rounded-xl py-2.5 px-2 text-center font-extrabold text-sm md:text-base text-white transition-all"
                              placeholder="0"
                            />
                            <span className="text-[9px] font-black text-slate-500 uppercase">{isTimeExercise(activeEx) ? "SEG" : "REPS"}</span>
                          </div>

                          {/* RPE input */}
                          <div className="col-span-3 flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-slate-500 uppercase shrink-0">PSE</span>
                            <select
                              value={set.rpe || 0}
                              onChange={(e) => updateSetField(activeEx.id, set.id, "rpe", parseInt(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 focus:border-[#39FF14] rounded-xl py-2.5 px-1 text-center font-extrabold text-xs md:text-sm text-white transition-all"
                            >
                              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                                <option key={v} value={v}>{v}</option>
                              ))}
                            </select>
                          </div>

                          {/* Remove set button */}
                          <div className="col-span-1 flex justify-end">
                            <button
                              onClick={() => removeSetFromExercise(activeEx.id, set.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                              title="Excluir esta série"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <button
                      onClick={() => addSetToExercise(activeEx.id)}
                      className="w-full py-3 px-4 bg-slate-950 hover:bg-[#39FF14]/10 border border-dashed border-slate-800 hover:border-[#39FF14]/50 text-slate-400 hover:text-[#39FF14] font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer group shadow-sm mt-3"
                    >
                      <Plus className="w-4 h-4 stroke-[3] text-[#39FF14] group-hover:scale-125 transition-transform" />
                      ACRESCENTAR SÉRIE AO EXERCÍCIO (+ REPLICAR REPS E CARGA)
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">
            Nenhum exercício carregado neste treino.
          </div>
        )}
      </div>

      {/* FOOTER NAVIGATION & COMPLETION HUB */}
      <div className="border-t border-slate-900 pt-5 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        
        {/* EXERCISES NAVIGATOR */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-start">
          <button
            onClick={() => navigateToExercise(currentExerciseIndex - 1)}
            disabled={currentExerciseIndex === 0}
            className="flex items-center gap-1 px-4 py-3 bg-[#0c111d] disabled:opacity-30 border border-slate-900 rounded-xl hover:text-white text-xs font-black uppercase tracking-wider transition-all disabled:pointer-events-none cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Anterior
          </button>

          <span className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">
            {currentExerciseIndex + 1} / {session.exercises.length}
          </span>

          <button
            onClick={() => navigateToExercise(currentExerciseIndex + 1)}
            disabled={currentExerciseIndex === session.exercises.length - 1}
            className="flex items-center gap-1 px-4 py-3 bg-[#0c111d] disabled:opacity-30 border border-slate-900 rounded-xl hover:text-white text-xs font-black uppercase tracking-wider transition-all disabled:pointer-events-none cursor-pointer"
          >
            Próximo <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* FEEDBACK & OVERALL RPE INPUT EXPANSION PANEL */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
          
          {isEditingCompleted ? (
            <button
              onClick={triggerFinish}
              className="w-full sm:w-auto px-8 py-4.5 bg-[#39FF14] hover:bg-[#32e00f] text-slate-950 font-black text-xs uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl shadow-[#39FF14]/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              SALVAR ALTERAÇÕES ✔️
            </button>
          ) : currentExerciseIndex === session.exercises.length - 1 ? (
            <button
              onClick={() => setShowFinishModal(true)}
              className="w-full sm:w-auto px-8 py-4.5 bg-[#39FF14] hover:bg-[#32e00f] text-slate-950 font-black text-xs uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl shadow-[#39FF14]/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              FINALIZAR TREINO 🏆
            </button>
          ) : (
            <button
              onClick={() => setShowFinishModal(true)}
              className="w-full sm:w-auto px-5 py-3.5 bg-slate-900/40 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              title="Finalizar treino antes de concluir os exercícios restantes"
            >
              CONCLUIR ANTECIPADAMENTE ⏱️
            </button>
          )}

          <button
            onClick={onCancel}
            className="text-[10px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-wider px-3.5 py-2 cursor-pointer"
          >
            DESCARTAR
          </button>
        </div>

      </div>

      {/* FINISH/RPE VERIFICATION MODAL OVERLAY */}
      <AnimatePresence>
        {showFinishModal && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 sm:p-6 overflow-y-auto animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl bg-[#0c111d] border border-slate-900 rounded-[2.5rem] p-6 sm:p-8 md:p-10 shadow-2xl relative space-y-6 text-left"
            >
              <div className="flex justify-between items-center border-b border-slate-900 pb-4">
                <div>
                  <span className="text-[10px] font-black text-[#39FF14] uppercase tracking-widest block">ETAPA FINAL</span>
                  <h3 className="text-xl font-black uppercase italic text-white tracking-tight mt-0.5 font-sans">RESUMO & VALIDAÇÃO DE PSE</h3>
                </div>
                <button
                  onClick={() => setShowFinishModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {incompleteExercisesCount > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs">
                  <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-black uppercase tracking-wider text-[10px]">Atenção: Exercícios Incompletos ⚠️</p>
                    <p className="font-semibold text-[10px] text-slate-400 mt-0.5">
                      Você possui <strong className="text-amber-400">{incompleteExercisesCount}</strong> {incompleteExercisesCount === 1 ? "exercício incompleto" : "exercícios incompletos"} neste treino. Tem certeza de que deseja encerrar o treino agora?
                    </p>
                  </div>
                </div>
              )}

              {/* EDIT DATE & TIME SECTION */}
              <div className="bg-slate-950/50 border border-slate-900 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    📅 DATA DE EXECUÇÃO
                  </label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#39FF14] transition-all cursor-pointer"
                  />
                  <p className="text-[8px] text-slate-500 font-semibold leading-normal">
                    Caso tenha treinado em outro dia ou queira corrigir a data.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    ⏱️ TEMPO TOTAL DO TREINO
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="480"
                      value={manualDurationMinutes}
                      onChange={(e) => setManualDurationMinutes(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      placeholder={`${Math.max(1, Math.round(totalElapsedTime / 60))} (timer atual)`}
                      className="w-full bg-slate-950 border border-slate-900 rounded-xl pl-3 pr-16 py-2 text-xs font-bold text-white outline-none focus:border-[#39FF14] transition-all cursor-pointer"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-500 uppercase tracking-wider select-none pointer-events-none">
                      MINUTOS
                    </span>
                  </div>
                  <p className="text-[8px] text-slate-500 font-semibold leading-normal">
                    Edite ou digite o tempo exato para não depender do cronômetro da página.
                  </p>
                </div>
              </div>

              {/* PSE (RPE) SELECTOR */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
                    PSE DA SESSÃO (Escala de Borg CR10)
                  </label>
                  <span className="text-sm font-black text-amber-400 font-mono bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl">
                    PSE {overallRpe} — {getRpeEmojiAndInfo(overallRpe).emoji}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold select-none leading-relaxed">
                  Classifique a intensidade geral deste treino considerando a percepção subjetiva do seu esforço:
                </p>

                {/* Big touch-friendly buttons for RPE 1-10 */}
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => {
                    const isSelected = overallRpe === v;
                    let colorClasses = "border-slate-800 hover:border-slate-500 text-slate-300";
                    if (isSelected) {
                      if (v <= 2) colorClasses = "bg-green-500/25 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]";
                      else if (v <= 4) colorClasses = "bg-yellow-500/25 border-yellow-500 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]";
                      else if (v <= 6) colorClasses = "bg-orange-500/25 border-orange-500 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]";
                      else if (v <= 8) colorClasses = "bg-red-500/25 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]";
                      else colorClasses = "bg-purple-500/25 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)] font-black";
                    }

                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setOverallRpe(v)}
                        className={`py-3 rounded-xl border text-sm font-black transition-all cursor-pointer ${colorClasses} hover:scale-[1.05]`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>

                <div className="text-center p-2.5 bg-slate-950/60 rounded-xl border border-slate-900/40 select-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {getRpeEmojiAndInfo(overallRpe).text}
                  </span>
                </div>
              </div>

              {/* FEEDBACK NOTES AREA */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
                  RELATO DE BIOFEEDBACK (OPCIONAL)
                </label>
                <textarea
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  className="w-full h-24 bg-slate-950 border border-slate-900 rounded-2xl p-3 text-xs text-white outline-none focus:border-[#39FF14] transition-all font-semibold resize-none"
                  placeholder="Ex: Senti um leve cansaço no posterior durante a 3ª série do agachamento. Prontidão excelente para o restante."
                />
              </div>

              {/* SAVE ACTION */}
              <div className="pt-4 border-t border-slate-900 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowFinishModal(false)}
                  className="flex-1 py-3.5 border border-slate-800 hover:border-slate-500 text-slate-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  VOLTAR AO TREINO
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFinishModal(false);
                    triggerFinish();
                  }}
                  className="flex-[1.5] py-3.5 bg-[#39FF14] hover:bg-[#32e00f] text-slate-950 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-[#39FF14]/15 cursor-pointer text-center"
                >
                  ENVIAR E CONCLUIR 🏆
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIDEO DEMONSTRATION & TECHNIQUE MODAL */}
      <AnimatePresence>
        {videoModalExercise && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0b101b] border border-slate-800 rounded-3xl p-5 md:p-6 w-full max-w-2xl shadow-2xl relative space-y-4 my-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30 shrink-0">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">
                      {videoModalExercise.name}
                    </h3>
                    <span className="text-[10px] font-black text-[#39FF14] uppercase tracking-widest">
                      {videoModalExercise.muscleGroup || "Execução Técnica"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setVideoModalExercise(null)}
                  className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white flex items-center justify-center border border-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Video embed / Player / Fallback */}
              {(() => {
                const videoInfo = getEmbedVideoInfo(videoModalExercise.videoUrl);
                const youtubeSearchUrl = `https://www.youtube.com/results?search_query=como+fazer+${encodeURIComponent(videoModalExercise.name)}+execucao+correta`;
                const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(videoModalExercise.name + " exercicio musculacao gif")}`;

                return (
                  <div className="space-y-4">
                    {videoInfo && videoInfo.embedUrl ? (
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-850 bg-slate-950 shadow-2xl">
                        {videoInfo.type === "direct" ? (
                          <video src={videoInfo.embedUrl} controls className="w-full h-full object-contain" autoPlay={false} />
                        ) : (
                          <iframe
                            src={videoInfo.embedUrl}
                            title={`Vídeo: ${videoModalExercise.name}`}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        )}
                      </div>
                    ) : videoModalExercise.imageUrl ? (
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-850 bg-slate-950 flex items-center justify-center">
                        <img
                          src={videoModalExercise.imageUrl}
                          alt={videoModalExercise.name}
                          className="w-full h-full object-cover rounded-2xl"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-950/60 rounded-2xl border border-slate-900 flex flex-col items-center justify-center text-center space-y-2">
                        <Video className="w-10 h-10 text-slate-600 animate-pulse" />
                        <h4 className="text-sm font-black text-white uppercase">Demonstração e Guia de Movimento</h4>
                        <p className="text-xs text-slate-400 font-medium max-w-md">
                          Acesse instantaneamente tutoriais em alta definição no YouTube e referências técnicas de postura para este exercício.
                        </p>
                      </div>
                    )}

                    {videoModalExercise.notes && (
                      <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-xs text-slate-300">
                        <span className="font-bold text-[#39FF14] block mb-1">💡 Dica do Treinador:</span>
                        {videoModalExercise.notes}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <a
                        href={youtubeSearchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-400 hover:text-red-300 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-red-950/30"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Abrir Vídeos no YouTube</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-auto" />
                      </a>

                      <a
                        href={googleImagesUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-purple-400 hover:text-purple-300 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-purple-950/30"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span>Ver GIFs e Imagens</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-auto" />
                      </a>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
