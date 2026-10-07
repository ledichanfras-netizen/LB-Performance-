import React, { useState } from "react";
import { Athlete, Workout } from "../types";
import { Brain, Sparkles, Calendar, Check, X, RefreshCw, Dumbbell, Target } from "lucide-react";
import { getLocalDateString } from "../utils";
import toast from "react-hot-toast";

interface PeriodizeAthleteModalProps {
  athlete: Athlete;
  onClose: () => void;
  generateAIWorkouts: (
    athlete: Athlete,
    coachInstructions?: string,
    options?: {
      periodizationStart?: string;
      periodizationEnd?: string;
      academyDays?: number[];
      courtDays?: number[];
      progressionMethod?: "auto" | "linear" | "undulating" | "accumulation" | "deload" | "tapering" | "block_atr";
      replacePendingWorkouts?: boolean;
    }
  ) => Promise<Workout[]>;
  updateAthlete?: (id: string, data: any) => Promise<void> | void;
}

export const PeriodizeAthleteModal: React.FC<PeriodizeAthleteModalProps> = ({
  athlete,
  onClose,
  generateAIWorkouts,
  updateAthlete,
}) => {
  const todayStr = getLocalDateString();

  // Ensure start date is strictly current or future
  const [startDate, setStartDate] = useState<string>(() => {
    if (athlete.periodizationStart && athlete.periodizationStart >= todayStr) {
      return athlete.periodizationStart;
    }
    return todayStr;
  });

  // Ensure end date is strictly after start date (default 14 days)
  const [endDate, setEndDate] = useState<string>(() => {
    const base = (athlete.periodizationStart && athlete.periodizationStart >= todayStr)
      ? athlete.periodizationStart
      : todayStr;
    if (athlete.periodizationEnd && athlete.periodizationEnd > base) {
      return athlete.periodizationEnd;
    }
    const [y, m, d] = base.split("-").map(Number);
    const end = new Date(y, m - 1, d + 14, 12, 0, 0);
    return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  });

  const [academyDays, setAcademyDays] = useState<number[]>(
    Array.isArray(athlete.academyDays) && athlete.academyDays.length > 0
      ? athlete.academyDays
      : [1, 3, 5]
  );

  const [courtDays, setCourtDays] = useState<number[]>(
    Array.isArray(athlete.courtDays) && athlete.courtDays.length > 0
      ? athlete.courtDays
      : [2, 4]
  );

  const [progressionMethod, setProgressionMethod] = useState<
    "auto" | "linear" | "undulating" | "accumulation" | "deload" | "tapering" | "block_atr"
  >("auto");

  const [instructions, setInstructions] = useState<string>("");
  const [replacePending, setReplacePending] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generatedWorkouts, setGeneratedWorkouts] = useState<Workout[] | null>(null);

  const setCycleDuration = (days: number) => {
    const [y, m, d] = startDate.split("-").map(Number);
    const end = new Date(y, m - 1, d + days, 12, 0, 0);
    setEndDate(
      `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
    );
  };

  const handleGenerate = async () => {
    if (!athlete) return;
    if (!athlete.modality) {
      toast.error("Defina a modalidade do atleta antes de gerar a periodização.");
      return;
    }

    if (academyDays.length === 0 && courtDays.length === 0) {
      toast.error("Selecione pelo menos um dia da semana para treino.");
      return;
    }

    setIsLoading(true);
    try {
      const unionDays = Array.from(new Set([...academyDays, ...courtDays])).sort();
      if (updateAthlete) {
        await updateAthlete(athlete.id, {
          periodizationStart: startDate,
          periodizationEnd: endDate,
          academyDays,
          courtDays,
          trainingDays: unionDays,
        });
      }

      const results = await generateAIWorkouts(athlete, instructions, {
        periodizationStart: startDate,
        periodizationEnd: endDate,
        academyDays,
        courtDays,
        progressionMethod,
        replacePendingWorkouts: replacePending,
      });

      if (Array.isArray(results) && results.length > 0) {
        setGeneratedWorkouts(results);
      } else {
        toast.error("Nenhum treino gerado pela IA. Tente novamente.");
      }
    } catch (err: any) {
      console.error("Erro na periodização:", err);
      toast.error(err?.message || "Falha ao gerar periodização.");
    } finally {
      setIsLoading(false);
    }
  };

  const weekDayLabels = [
    { id: 0, label: "Dom" },
    { id: 1, label: "Seg" },
    { id: 2, label: "Ter" },
    { id: 3, label: "Qua" },
    { id: 4, label: "Qui" },
    { id: 5, label: "Sex" },
    { id: 6, label: "Sáb" },
  ];

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-6 animate-fade-in overflow-y-auto">
      <div className="bg-[#0c111d] border border-slate-800 p-5 sm:p-7 rounded-3xl max-w-2xl w-full shadow-2xl space-y-5 text-slate-100 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#39FF14]/10 border border-[#39FF14]/30 flex items-center justify-center text-[#39FF14]">
              <Brain className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                  IA Co-Pilot • Periodização de Treino
                </h3>
                <span className="text-[7.5px] font-black px-1.5 py-0.5 rounded bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/30 uppercase">
                  Elite
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold">
                Atleta: <span className="text-white font-black">{athlete.name}</span> ({athlete.modality || "Geral"})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode: Success with Generated Calendar */}
        {generatedWorkouts && generatedWorkouts.length > 0 ? (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/25 p-4 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <Check className="w-5 h-5 stroke-[3] shrink-0" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">
                    Periodização Criada com Sucesso!
                  </h4>
                  <p className="text-[9.5px] text-emerald-300 font-semibold">
                    {generatedWorkouts.length} sessões geradas entre {startDate.split("-").reverse().join("/")} e {endDate.split("-").reverse().join("/")}.
                  </p>
                </div>
              </div>
            </div>

            {/* List of Generated Sessions */}
            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {generatedWorkouts.map((w, idx) => (
                <div
                  key={w.id || idx}
                  className="p-3.5 rounded-2xl border border-slate-850 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        Sessão {idx + 1}
                      </span>
                      <span className="text-[9.5px] font-black text-[#39FF14]">
                        📅 {w.date ? w.date.split("-").reverse().join("/") : ""}
                      </span>
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-950 text-slate-400">
                        {w.phase}
                      </span>
                    </div>
                    <h5 className="text-xs font-black text-white">{w.name}</h5>
                    <p className="text-[9px] text-slate-400 font-medium">
                      {(w.exercises || []).map((e) => e.name).slice(0, 4).join(" • ")}
                      {(w.exercises || []).length > 4 ? ` e mais ${(w.exercises || []).length - 4}...` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-[8.5px] font-bold text-slate-400 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
                      {w.exercises?.length || 0} exercícios
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#39FF14] hover:bg-[#32e00f] text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#39FF14]/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Concluir e Ver Planilha do Atleta</span>
              </button>
            </div>
          </div>
        ) : (
          /* Input Configuration Mode */
          <div className="space-y-4">
            {/* Dates Configuration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                  📅 Período do Ciclo
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCycleDuration(14)}
                    className="text-[7.5px] font-black px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 transition-all cursor-pointer"
                  >
                    14 dias (2 Semanas)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCycleDuration(21)}
                    className="text-[7.5px] font-black px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-850 transition-all cursor-pointer"
                  >
                    21 dias (3 Semanas)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCycleDuration(28)}
                    className="text-[7.5px] font-black px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-850 transition-all cursor-pointer"
                  >
                    28 dias (4 Semanas)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[7.5px] font-black text-slate-500 uppercase block mb-1">
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#161b26] text-[9.5px] font-black uppercase text-slate-200 border border-slate-850 p-2.5 rounded-xl focus:border-[#39FF14] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[7.5px] font-black text-slate-500 uppercase block mb-1">
                    Data Término
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#161b26] text-[9.5px] font-black uppercase text-slate-200 border border-slate-850 p-2.5 rounded-xl focus:border-[#39FF14] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Days of the Week Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Academy Days */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-300 uppercase flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-[#39FF14]" />
                  <span>Academia (Musculação / Força / RFD)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {weekDayLabels.map((day) => {
                    const isSelected = academyDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => {
                          setAcademyDays((prev) =>
                            prev.includes(day.id) ? prev.filter((d) => d !== day.id) : [...prev, day.id].sort()
                          );
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-[#39FF14] border-[#39FF14] text-slate-950 shadow-[0_0_8px_rgba(57,255,20,0.3)]"
                            : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Court / Field Days */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-300 uppercase flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-brand-secondary" />
                  <span>Campo / Quadra (Técnico / Tático / Agilidade)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {weekDayLabels.map((day) => {
                    const isSelected = courtDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => {
                          setCourtDays((prev) =>
                            prev.includes(day.id) ? prev.filter((d) => d !== day.id) : [...prev, day.id].sort()
                          );
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-brand-secondary border-brand-secondary text-brand-dark shadow-[0_0_8px_rgba(57,255,20,0.3)]"
                            : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Progression Model */}
            <div className="space-y-1 pt-1">
              <label className="text-[8px] font-black text-slate-400 uppercase flex items-center justify-between">
                <span>📈 Modelo de Progressão Fisiológica</span>
                <span className="text-[7.5px] text-[#39FF14] font-bold">Científico</span>
              </label>
              <select
                value={progressionMethod}
                onChange={(e) => setProgressionMethod(e.target.value as any)}
                className="w-full bg-[#161b26] text-[9.5px] font-bold text-slate-200 border border-slate-850 p-2.5 rounded-xl focus:border-[#39FF14] outline-none cursor-pointer"
              >
                <option value="auto">⚡ Automático (IA Seleciona pelo Perfil & Testes)</option>
                <option value="linear">📈 Progressão Linear Acumulativa (Carga ↑, Reps ↓)</option>
                <option value="undulating">🌊 Ondulatória Diária / DUP (Força, Potência, Hipertrofia)</option>
                <option value="accumulation">🧱 Bloco de Acumulação (+Séries & Densidade)</option>
                <option value="block_atr">🔄 Periodização em Blocos ATR (Acumulação ➔ Transmutação ➔ Realização)</option>
                <option value="tapering">🏆 Polimento Competitivo / Tapering (Pico Neural, Volume ↓)</option>
                <option value="deload">🍃 Semana de Deload / Regenerativa (-35% Carga & Volume)</option>
              </select>
            </div>

            {/* Coach Description / Directives */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[8px] font-black text-slate-400 uppercase block">
                📝 Descrição & Diretrizes da Periodização (Prioridade da IA)
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ex: Focar em potência vertical e aceleração, ênfase em posterior de coxa e isquiotibiais, exercícios de campo com foco em mudança de direção e agilidade, sem sobrecarga na coluna lombar..."
                className="w-full bg-[#161b26] border border-slate-850 rounded-xl p-3 text-[9.5px] font-bold text-white outline-none focus:border-[#39FF14] resize-none h-20 placeholder:text-slate-600"
              />
            </div>

            {/* Replace Pending Option */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="replace-pending"
                checked={replacePending}
                onChange={(e) => setReplacePending(e.target.checked)}
                className="accent-[#39FF14] rounded cursor-pointer w-4 h-4"
              />
              <label htmlFor="replace-pending" className="text-[9px] text-slate-300 font-bold cursor-pointer">
                Substituir treinos planejados anteriores não concluídos (mantém histórico concluído 100% seguro)
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-850">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-black text-[9.5px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#39FF14] hover:bg-[#32e00f] disabled:bg-slate-850 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#39FF14]/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>IA CO-PILOT PERIODIZANDO...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 stroke-[3]" />
                    <span>GERAR PERIODIZAÇÃO COM IA CO-PILOT</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
