import React, { useState, useMemo, useRef } from "react";
import { Athlete, Workout, ExternalSession } from "../types";
import {
  generateAthleteNutritionPlan,
  NutritionDayScenario
} from "../utils/nutritionEngine";
import {
  Droplets,
  Flame,
  Zap,
  Clock,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Download,
  Printer,
  ArrowRight,
  Utensils,
  Activity,
  ShieldCheck,
  RefreshCw,
  Info
} from "lucide-react";
import { toJpeg } from "html-to-image";
import toast from "react-hot-toast";

interface NutritionGuidancePanelProps {
  athlete: Athlete;
  workouts?: Workout[];
  externalSessions?: ExternalSession[];
}

export const NutritionGuidancePanel: React.FC<NutritionGuidancePanelProps> = ({
  athlete,
  workouts = [],
  externalSessions = []
}) => {
  const [selectedScenario, setSelectedScenario] = useState<NutritionDayScenario | undefined>(
    undefined
  );
  const [customWeight, setCustomWeight] = useState<string>("");
  const [customDuration, setCustomDuration] = useState<number | undefined>(undefined);
  const [activeTimingTab, setActiveTimingTab] = useState<"pre" | "intra" | "pos">("pos");

  // Sweat Rate Calculator States
  const [preWeightInput, setPreWeightInput] = useState<string>("");
  const [postWeightInput, setPostWeightInput] = useState<string>("");
  const [fluidDrankMlInput, setFluidDrankMlInput] = useState<string>("500");

  const [isExporting, setIsExporting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const parsedCustomWeight = customWeight ? parseFloat(customWeight) : undefined;

  const plan = useMemo(() => {
    return generateAthleteNutritionPlan(
      athlete,
      workouts,
      externalSessions,
      selectedScenario,
      undefined,
      customDuration,
      parsedCustomWeight
    );
  }, [athlete, workouts, externalSessions, selectedScenario, customDuration, parsedCustomWeight]);

  // Sweat calculator computation
  const sweatCalc = useMemo(() => {
    const pre = parseFloat(preWeightInput) || plan.weightKg;
    const post = parseFloat(postWeightInput);
    const drankLiters = (parseFloat(fluidDrankMlInput) || 0) / 1000;

    if (!post || post <= 20 || post > pre + 5) return null;

    const weightDiffKg = pre - post;
    const totalSweatLossLiters = Math.max(0, weightDiffKg + drankLiters);
    const dehydrationPercent = pre > 0 ? (weightDiffKg / pre) * 100 : 0;
    const replacement150Ml = Math.round(Math.max(0, weightDiffKg) * 1500);

    return {
      weightDiffKg: Math.round(weightDiffKg * 100) / 100,
      totalSweatLossMl: Math.round(totalSweatLossLiters * 1000),
      dehydrationPercent: Math.round(dehydrationPercent * 10) / 10,
      replacement150Ml,
      status:
        dehydrationPercent >= 2.0
          ? "critico"
          : dehydrationPercent >= 1.0
          ? "atencao"
          : "otimo"
    };
  }, [preWeightInput, postWeightInput, fluidDrankMlInput, plan.weightKg]);

  const handleExportJpeg = async () => {
    if (!panelRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Gerando lâmina de orientação nutricional...");
    try {
      const isLightMode = document.body.classList.contains("light-theme");
      const dataUrl = await toJpeg(panelRef.current, {
        quality: 0.95,
        backgroundColor: isLightMode ? "#f8fafc" : "#0b0f19",
        pixelRatio: 2
      });
      const link = document.createElement("a");
      const safeName = (athlete.name || "atleta").toLowerCase().replace(/\s+/g, "-");
      link.download = `orientacao-nutricional-lb-${safeName}.jpg`;
      link.href = dataUrl;
      link.click();
      toast.success("Lâmina nutricional exportada com sucesso!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar imagem.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full space-y-6 text-slate-100 font-sans pb-16">
      <div ref={panelRef} className="space-y-6">
        {/* 1. HEADER HERO & SELETOR DE CENÁRIO DO DIA */}
        <div className="lb-surface-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full lb-badge-emerald text-xs font-black uppercase tracking-wider">
                <Utensils className="w-4 h-4" />
                <span>Suporte Energético & Recuperação por Carga • Método LB</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Orientação Nutricional & Hidratação: {plan.athleteName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed font-medium">
                Metas quantitativas calculadas em <strong>g/kg</strong> e <strong>ml/kg</strong> de
                acordo com a massa corporal (<strong>{plan.weightKg} kg</strong> • {plan.weightSource}) e moduladas
                pela intensidade da sessão de treino.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleExportJpeg}
                disabled={isExporting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl lb-btn-secondary text-xs font-black uppercase tracking-wider"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Exportar JPEG</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl lb-btn-secondary text-xs font-black uppercase tracking-wider"
              >
                <Printer className="w-4 h-4 text-slate-300" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>

          {/* CONTROLES DE PERSONALIZAÇÃO DE CARGA DO DIA */}
          <div className="pt-6 border-t border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            <div className="lg:col-span-7 space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                1. Selecione a Demanda / Intensidade do Dia:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lb-segmented-group">
                <button
                  type="button"
                  onClick={() => setSelectedScenario("leve")}
                  className={`py-2.5 px-3 rounded-xl text-xs lb-pill-btn flex items-center justify-center gap-1.5 ${
                    plan.activeScenario === "leve"
                      ? "lb-pill-active-green"
                      : "lb-pill-inactive"
                  }`}
                >
                  <span>🟢 Dia Leve / Recovery</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedScenario("moderado")}
                  className={`py-2.5 px-3 rounded-xl text-xs lb-pill-btn flex items-center justify-center gap-1.5 ${
                    plan.activeScenario === "moderado"
                      ? "lb-pill-active-amber"
                      : "lb-pill-inactive"
                  }`}
                >
                  <span>🟡 Treino Moderado</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedScenario("choque_jogo")}
                  className={`py-2.5 px-3 rounded-xl text-xs lb-pill-btn flex items-center justify-center gap-1.5 ${
                    plan.activeScenario === "choque_jogo"
                      ? "lb-pill-active-rose"
                      : "lb-pill-inactive"
                  }`}
                >
                  <span>🔴 Intenso / Jogo (PSE ≥ 8)</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  Peso de Cálculo (kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="30"
                  max="180"
                  value={customWeight}
                  onChange={(e) => setCustomWeight(e.target.value)}
                  placeholder={`${plan.weightKg} kg (Auto)`}
                  className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-black text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  Duração do Treino (min)
                </label>
                <select
                  value={customDuration || plan.sessionDurationMinutes}
                  onChange={(e) => setCustomDuration(Number(e.target.value))}
                  className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-black text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value={45}>45 min (Curto)</option>
                  <option value={60}>60 min (Padrão)</option>
                  <option value={75}>75 min (Estendido)</option>
                  <option value={90}>90 min (Jogo / Campo)</option>
                  <option value={120}>120 min (Duplo / Longo)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 2. METAS DIÁRIAS TOTAIS POR PESO CORPORAL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* PROTEÍNA */}
          <div className="lb-surface-card rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-black uppercase tracking-wider">
              <span>Proteína Diária</span>
              <span className="px-2 py-0.5 rounded-md lb-badge-emerald font-mono text-[11px]">{plan.dailyProteinGPerKg.toFixed(1)} g/kg</span>
            </div>
            <div className="text-3xl font-black text-white tracking-tight">
              {plan.dailyProteinGrams} <span className="text-sm font-bold text-slate-400">g/dia</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Síntese miofibrilar e reparo muscular. Fracionar em 4 a 5 doses de ~{Math.round(plan.dailyProteinGrams / 4)}g.
            </p>
          </div>

          {/* CARBOIDRATO */}
          <div className="lb-surface-card rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-black uppercase tracking-wider">
              <span>Carboidrato Diário</span>
              <span className="px-2 py-0.5 rounded-md lb-badge-amber font-mono text-[11px]">{plan.dailyCarbsGPerKg.toFixed(1)} g/kg</span>
            </div>
            <div className="text-3xl font-black text-white tracking-tight">
              {plan.dailyCarbsGrams} <span className="text-sm font-bold text-slate-400">g/dia</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Substrato primário para força rápida (TDF), sprints repetidos e preservação do SNC.
            </p>
          </div>

          {/* HIDRATAÇÃO */}
          <div className="lb-surface-card rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-black uppercase tracking-wider">
              <span>Hidratação Total</span>
              <span className="px-2 py-0.5 rounded-md lb-badge-cyan font-mono text-[11px]">{plan.baseWaterMlPerKg} ml/kg + Treino</span>
            </div>
            <div className="text-3xl font-black text-cyan-400 tracking-tight">
              {plan.totalDailyWaterLiters.toFixed(1)} <span className="text-sm font-bold text-slate-400">Litros/dia</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Base basal: {plan.baseWaterLiters}L + {plan.trainingExtraWaterMl}ml para a sessão de {plan.sessionDurationMinutes} min.
            </p>
          </div>

          {/* APORTE ENERGÉTICO */}
          <div className="lb-surface-card rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-black uppercase tracking-wider">
              <span>Disponibilidade</span>
              <span className="px-2 py-0.5 rounded-md lb-badge-emerald font-mono text-[11px]">Gorduras: {plan.dailyFatGrams}g</span>
            </div>
            <div className="text-3xl font-black text-white tracking-tight">
              {plan.estimatedCaloriesKcal.toLocaleString("pt-BR")} <span className="text-sm font-bold text-slate-400">kcal</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Estimativa para sustentar a carga do dia sem déficit energético deletério (RED-S).
            </p>
          </div>
        </div>

        {/* 3. PROTOCOLO DE JANELAS TEMPORAIS: PRÉ, INTRA E PÓS-TREINO */}
        <div className="lb-surface-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                Timing Nutricional da Sessão: Antes, Durante e Pós-Treino
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Quantidades exatas para {plan.weightKg} kg e tradução em alimentos acessíveis do cotidiano.
              </p>
            </div>

            <div className="inline-flex flex-wrap lb-segmented-group gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTimingTab("pre")}
                className={`px-3.5 py-2 rounded-xl text-xs lb-pill-btn ${
                  activeTimingTab === "pre"
                    ? "lb-pill-active-amber"
                    : "lb-pill-inactive"
                }`}
              >
                <span>1. Pré-Treino (1h30 antes)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTimingTab("intra")}
                className={`px-3.5 py-2 rounded-xl text-xs lb-pill-btn ${
                  activeTimingTab === "intra"
                    ? "lb-pill-active-cyan"
                    : "lb-pill-inactive"
                }`}
              >
                <span>2. Intra-Treino (Hidratação)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTimingTab("pos")}
                className={`px-3.5 py-2 rounded-xl text-xs lb-pill-btn ${
                  activeTimingTab === "pos"
                    ? "lb-pill-active-green"
                    : "lb-pill-inactive"
                }`}
              >
                <span>3. Pós-Treino (Recuperação)</span>
              </button>
            </div>
          </div>

          {/* RESUMO DAS 3 JANELAS SEMPRE VISÍVEL EM LINHA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* PRÉ-TREINO BOX */}
            <div
              onClick={() => setActiveTimingTab("pre")}
              className={`p-5 rounded-2xl transition-all cursor-pointer ${
                activeTimingTab === "pre"
                  ? "lb-surface-card-highlight"
                  : "lb-surface-subcard hover:border-amber-500"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-amber-400 mb-2">
                <span>⏱️ Pré-Treino ({plan.preWorkout.windowLabel})</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Carboidrato de Ignição:</span>
                  <strong className="text-white font-mono">
                    {plan.preWorkout.carbsGrams}g ({plan.preWorkout.carbsGPerKg} g/kg)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Proteína Leve:</span>
                  <strong className="text-white font-mono">
                    {plan.preWorkout.proteinGrams}g ({plan.preWorkout.proteinGPerKg} g/kg)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Pré-Hidratação:</span>
                  <strong className="text-cyan-400 font-mono">{plan.preWorkout.waterMl} ml água</strong>
                </div>
              </div>
            </div>

            {/* INTRA-TREINO BOX */}
            <div
              onClick={() => setActiveTimingTab("intra")}
              className={`p-5 rounded-2xl transition-all cursor-pointer ${
                activeTimingTab === "intra"
                  ? "lb-surface-card-highlight"
                  : "lb-surface-subcard hover:border-cyan-500"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-cyan-400 mb-2">
                <span>💧 Intra-Treino ({plan.sessionDurationMinutes} min)</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Água na Sessão:</span>
                  <strong className="text-cyan-400 font-mono">{plan.intraWorkout.totalSessionWaterMl} ml</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Carboidrato Rápido:</span>
                  <strong className="text-white font-mono">{plan.intraWorkout.carbsGramsPerHour} g/h</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Reposição de Sódio:</span>
                  <strong className="text-white font-mono">
                    {plan.intraWorkout.electrolytesRequired ? "Recomendado" : "Opcional"}
                  </strong>
                </div>
              </div>
            </div>

            {/* PÓS-TREINO BOX */}
            <div
              onClick={() => setActiveTimingTab("pos")}
              className={`p-5 rounded-2xl transition-all cursor-pointer ${
                activeTimingTab === "pos"
                  ? "lb-surface-card-highlight"
                  : "lb-surface-subcard hover:border-emerald-500"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-[#39FF14] mb-2">
                <span>⚡ Pós-Treino Imediato (0–60 min)</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Proteína de Reparo:</span>
                  <strong className="text-[#39FF14] font-mono">
                    {plan.postWorkout.proteinGrams}g ({plan.postWorkout.proteinGPerKg} g/kg)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Carboidrato (Glicogênio):</span>
                  <strong className="text-amber-400 font-mono">
                    {plan.postWorkout.carbsGrams}g ({plan.postWorkout.carbsGPerKg} g/kg)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Reidratação (2h pós):</span>
                  <strong className="text-cyan-400 font-mono">+{plan.postWorkout.rehydrationMl} ml</strong>
                </div>
              </div>
            </div>
          </div>

          {/* DETALHAMENTO DE EQUIVALÊNCIAS PRÁTICAS DA ABA SELECIONADA */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            {activeTimingTab === "pre" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-300 font-medium">
                  <strong className="text-amber-400">Objetivo Fisiológico Pré-Treino:</strong>{" "}
                  {plan.preWorkout.goalDescription}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plan.preWorkout.equivalences.map((eq, i) => (
                    <div key={i} className="lb-surface-subcard p-5 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-black text-white">{eq.title}</h4>
                        <span className="px-2.5 py-0.5 rounded-lg lb-badge-amber text-[11px] font-mono font-bold">
                          {eq.macrosSummary}
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-300 font-medium">
                        {eq.items.map((item, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <span className="text-[#39FF14] font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-slate-400 italic pt-2 border-t border-slate-800">
                        💡 {eq.practicalTip}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTimingTab === "intra" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-300 font-medium">
                  <strong className="text-cyan-400">Objetivo Fisiológico Intra-Treino:</strong>{" "}
                  {plan.intraWorkout.goalDescription}
                </p>
                <div className="grid grid-cols-1 gap-4">
                  {plan.intraWorkout.equivalences.map((eq, i) => (
                    <div key={i} className="lb-surface-subcard p-5 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-black text-white">{eq.title}</h4>
                        <span className="px-2.5 py-0.5 rounded-lg lb-badge-cyan text-[11px] font-mono font-bold">
                          {eq.macrosSummary}
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-300 font-medium">
                        {eq.items.map((item, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <span className="text-cyan-400 font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-slate-400 italic pt-2 border-t border-slate-800">
                        💡 {eq.practicalTip}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTimingTab === "pos" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-300 font-medium">
                  <strong className="text-[#39FF14]">Objetivo Fisiológico Pós-Treino:</strong>{" "}
                  {plan.postWorkout.goalDescription} (Meta de Leucina: ~{plan.postWorkout.leucineTargetGrams}g • Relação {plan.postWorkout.carbToProteinRatio}).
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plan.postWorkout.equivalences.map((eq, i) => (
                    <div key={i} className="lb-surface-subcard p-5 rounded-2xl space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-white">{eq.title}</h4>
                          <span className="inline-block px-2.5 py-0.5 rounded-lg lb-badge-emerald text-[11px] font-mono font-bold">
                            {eq.macrosSummary}
                          </span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-300 font-medium">
                          {eq.items.map((item, j) => (
                            <li key={j} className="flex items-start gap-2">
                              <span className="text-[#39FF14] font-bold">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <p className="text-[11px] text-slate-400 italic pt-2 border-t border-slate-800">
                        💡 {eq.practicalTip}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. AJUSTES POR BIOMARCADORES (BIOIMPEDÂNCIA, CMJ, ACWR & PRONTIDÃO) */}
        {plan.biomarkerAdjustments.length > 0 && (
          <div className="lb-surface-card rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2.5 text-sm font-black uppercase tracking-wider text-white">
              <ShieldCheck className="w-5 h-5 text-[#39FF14]" />
              <span>Ajustes Finos por Biomarcadores & Matriz de Decisão LB</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plan.biomarkerAdjustments.map((adj) => (
                <div
                  key={adj.id}
                  className="lb-surface-subcard p-4 rounded-2xl space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-white">{adj.title}</span>
                    <span className="px-2 py-0.5 rounded-md lb-badge-emerald text-[10px] font-mono uppercase font-bold">
                      {adj.source.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">{adj.description}</p>
                  <div className="pt-1 text-xs text-[#39FF14] font-bold">
                    Conduta Nutricional: {adj.practicalAction}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. CALCULADORA PRÁTICA DE TAXA DE SUDORESE E REIDRATAÇÃO PÓS-TREINO */}
        <div className="lb-surface-card rounded-3xl p-6 sm:p-8 space-y-5">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Droplets className="w-5 h-5 text-cyan-400" />
              <span>Calculadora de Taxa de Sudorese & Reidratação Pós-Sessão</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Meça o peso do atleta imediatamente antes e após o treino para descobrir a perda hídrica real e o volume exato de reposição (150% do peso perdido).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                Peso Antes do Treino (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={preWeightInput}
                onChange={(e) => setPreWeightInput(e.target.value)}
                placeholder={`${plan.weightKg}`}
                className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                Peso Após o Treino (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={postWeightInput}
                onChange={(e) => setPostWeightInput(e.target.value)}
                placeholder={`Ex: ${(plan.weightKg - 0.9).toFixed(1)}`}
                className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                Líquido Ingerido no Treino (ml)
              </label>
              <input
                type="number"
                step="50"
                value={fluidDrankMlInput}
                onChange={(e) => setFluidDrankMlInput(e.target.value)}
                placeholder="500"
                className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {sweatCalc && (
            <div className="lb-surface-subcard rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">
                  Desidratação Relativa
                </span>
                <span
                  className={`text-2xl font-black ${
                    sweatCalc.status === "critico"
                      ? "text-rose-400"
                      : sweatCalc.status === "atencao"
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  {sweatCalc.dehydrationPercent}% do peso
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5 font-medium">
                  {sweatCalc.dehydrationPercent >= 2
                    ? "Alerta: Acima de 2% reduz força e potência"
                    : "Dentro da margem segura (< 2%)"}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">
                  Suor Total Produzido
                </span>
                <span className="text-2xl font-black text-white">
                  {sweatCalc.totalSweatLossMl} ml
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5 font-medium">
                  Variação na balança: -{sweatCalc.weightDiffKg} kg
                </span>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-cyan-400 block">
                  Meta de Reidratação (150%)
                </span>
                <span className="text-2xl font-black text-cyan-400">
                  +{sweatCalc.replacement150Ml} ml
                </span>
                <span className="text-[11px] text-slate-300 block mt-0.5 font-medium">
                  Ingerir de forma fracionada nas próximas 2 a 3h
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// CARD COMPACTO INTELIGENTE PARA A ABA DE TREINOS (CAMINHO 1)
// ==========================================

interface SmartWorkoutNutritionCardProps {
  athlete: Athlete;
  workouts?: Workout[];
  externalSessions?: ExternalSession[];
  onOpenFullNutritionPanel?: () => void;
  onOpenFullNutritionTab?: () => void;
}

export const SmartWorkoutNutritionCard: React.FC<SmartWorkoutNutritionCardProps> = ({
  athlete,
  workouts = [],
  externalSessions = [],
  onOpenFullNutritionPanel,
  onOpenFullNutritionTab
}) => {
  const plan = useMemo(
    () => generateAthleteNutritionPlan(athlete, workouts, externalSessions),
    [athlete, workouts, externalSessions]
  );

  const handleOpenPanel = onOpenFullNutritionPanel || onOpenFullNutritionTab;

  return (
    <div className="lb-surface-card-highlight rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full lb-badge-emerald text-xs font-black uppercase tracking-wider">
            <Utensils className="w-4 h-4" />
            <span>Combustível & Recuperação Nutricional Hoje ({plan.weightKg} kg)</span>
          </div>
          <p className="text-xs text-slate-300 font-medium">
            Orientação calculada automaticamente para <strong>{plan.scenarioLabel}</strong> (PSE Estimada:{" "}
            <strong>{plan.sessionRpe}</strong> • <strong>{plan.sessionDurationMinutes} min</strong>).
          </p>
        </div>

        {handleOpenPanel && (
          <button
            type="button"
            onClick={handleOpenPanel}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl lb-btn-accent text-xs font-black uppercase tracking-wider shrink-0"
          >
            <span>Ver Equivalências & Calculadora</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="lb-surface-subcard rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] font-black uppercase text-amber-400 block">
            ⏱️ Pré-Treino (1h30 antes)
          </span>
          <div className="text-base font-black text-white">
            {plan.preWorkout.carbsGrams}g Carbo + {plan.preWorkout.proteinGrams}g Prot
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            +{plan.preWorkout.waterMl}ml água • Energia limpa ({plan.preWorkout.carbsGPerKg} g/kg)
          </p>
        </div>

        <div className="lb-surface-subcard rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] font-black uppercase text-[#39FF14] block">
            ⚡ Pós-Treino Imediato (0–60m)
          </span>
          <div className="text-base font-black text-[#39FF14]">
            {plan.postWorkout.proteinGrams}g Proteína ({plan.postWorkout.proteinGPerKg} g/kg)
          </div>
          <p className="text-[11px] text-slate-300 font-medium">
            + {plan.postWorkout.carbsGrams}g Carbo ({plan.postWorkout.carbsGPerKg} g/kg) p/ glicogênio
          </p>
        </div>

        <div className="lb-surface-subcard rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] font-black uppercase text-cyan-400 block">
            💧 Hidratação & Reposição
          </span>
          <div className="text-base font-black text-cyan-400">
            {plan.totalDailyWaterLiters.toFixed(1)} Litros / Dia
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            Sendo +{plan.postWorkout.rehydrationMl}ml nas 2h pós-treino
          </p>
        </div>

        <div className="lb-surface-subcard rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] font-black uppercase text-emerald-400 block">
            🥩 Meta Diária Total ({plan.weightKg}kg)
          </span>
          <div className="text-base font-black text-white">
            {plan.dailyProteinGrams}g Prot • {plan.dailyCarbsGrams}g Carbo
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {plan.dailyProteinGPerKg.toFixed(1)}g/kg Proteína • {plan.dailyCarbsGPerKg.toFixed(1)}g/kg Carbo
          </p>
        </div>
      </div>
    </div>
  );
};
