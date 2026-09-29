import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Athlete,
  Workout,
  ExternalSession,
  DecisionMatrixRow,
  DecisionCategory,
  DecisionPriority,
  DecisionConduct,
  AttentionSignal
} from "../types";
import {
  MASTER_DECISION_MATRIX,
  generateAthleteDecisionMatrix,
  generatePrescriptionPayloadFromDecisionMatrix,
  PrescribedWorkoutPayload
} from "../utils/decisionMatrixEngine";
import {
  Zap,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Search,
  Download,
  Printer,
  BookOpen,
  Filter,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Clock,
  Target,
  FileSpreadsheet,
  Activity,
  Layers,
  HeartPulse,
  Flame,
  CheckSquare,
  Repeat,
  Sliders,
  Eye,
  Info,
  PlayCircle,
  PlusCircle,
  Award
} from "lucide-react";
import { toJpeg } from "html-to-image";
import toast from "react-hot-toast";

interface LBPerformanceDecisionMatrixProps {
  athlete?: Athlete;
  workouts?: Workout[];
  externalSessions?: ExternalSession[];
  onNavigateToWorkout?: (recommendedExercises?: string[] | PrescribedWorkoutPayload) => void;
  onSaveWorkoutToAthlete?: (workout: any) => void;
  standaloneMode?: boolean;
}

export const LBPerformanceDecisionMatrix: React.FC<LBPerformanceDecisionMatrixProps> = ({
  athlete,
  workouts = [],
  externalSessions = [],
  onNavigateToWorkout,
  onSaveWorkoutToAthlete,
  standaloneMode = false
}) => {
  const [activeView, setActiveView] = useState<"athlete" | "master">(
    athlete ? "athlete" : "master"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("" );
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState<boolean>(false);
  const [generatedPayload, setGeneratedPayload] = useState<PrescribedWorkoutPayload | null>(null);

  // Dynamic report generated from engine
  const athleteReport = useMemo(() => {
    if (!athlete) return null;
    return generateAthleteDecisionMatrix(athlete, workouts, externalSessions);
  }, [athlete, workouts, externalSessions]);

  // Local state to allow trainer to override conduct for each row
  const [customConducts, setCustomConducts] = useState<Record<string, DecisionConduct>>({});

  // Reset custom conducts when athlete changes
  useEffect(() => {
    if (athleteReport) {
      const initial: Record<string, DecisionConduct> = {};
      athleteReport.activeRows.forEach((row) => {
        initial[row.id] = row.conduct || "monitorar";
      });
      setCustomConducts(initial);
    }
  }, [athleteReport]);

  const handleConductChange = (rowId: string, newConduct: DecisionConduct, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCustomConducts((prev) => ({
      ...prev,
      [rowId]: newConduct
    }));
    toast.success(
      `Conduta alterada para: ${
        newConduct === "dose_principal"
          ? "Dose Principal (Foco)"
          : newConduct === "microdose"
          ? "Microdose (Estímulo Curto)"
          : "Apenas Monitorar"
      }`,
      { duration: 2000, icon: "⚡" }
    );
  };

  // Current list merged with customized conducts
  const currentRows: DecisionMatrixRow[] = useMemo(() => {
    const source =
      activeView === "athlete" && athleteReport
        ? athleteReport.activeRows.map((r) => ({
            ...r,
            conduct: customConducts[r.id] || r.conduct || "monitorar"
          }))
        : MASTER_DECISION_MATRIX;

    return source.filter((row) => {
      const matchCat =
        selectedCategory === "all" || row.category === selectedCategory;
      const matchPriority =
        selectedPriority === "all" || row.priority === selectedPriority;

      if (!searchQuery.trim()) return matchCat && matchPriority;

      const q = searchQuery.toLowerCase();
      const matchSearch =
        row.finding.toLowerCase().includes(q) ||
        row.context.toLowerCase().includes(q) ||
        row.hypothesis.toLowerCase().includes(q) ||
        row.intervention.toLowerCase().includes(q) ||
        row.transfer.toLowerCase().includes(q) ||
        (row.targetBenchmark && row.targetBenchmark.toLowerCase().includes(q)) ||
        (row.evidence && row.evidence.toLowerCase().includes(q));

      return matchCat && matchPriority && matchSearch;
    });
  }, [activeView, athleteReport, customConducts, selectedCategory, selectedPriority, searchQuery]);

  // Active counts of conducts
  const conductCounts = useMemo(() => {
    if (activeView !== "athlete" || !athleteReport) {
      return { dosePrincipal: 1, microdoses: 2, monitorar: MASTER_DECISION_MATRIX.length - 3 };
    }
    const rows = athleteReport.activeRows.map((r) => ({
      ...r,
      conduct: customConducts[r.id] || r.conduct || "monitorar"
    }));

    return {
      dosePrincipal: rows.filter((r) => r.conduct === "dose_principal").length,
      microdoses: rows.filter((r) => r.conduct === "microdose").length,
      monitorar: rows.filter((r) => r.conduct === "monitorar").length
    };
  }, [activeView, athleteReport, customConducts]);

  const reportRef = useRef<HTMLDivElement>(null);

  const toggleRow = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  const getPriorityBadge = (priority: DecisionPriority) => {
    switch (priority) {
      case "Critica":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            Prioridade Crítica
          </span>
        );
      case "Alta":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Prioridade Alta
          </span>
        );
      case "Media":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
            <Clock className="w-3 h-3 text-yellow-400" />
            Intervenção Média
          </span>
        );
      case "Baixa":
      case "Normal":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Estável / Manutenção
          </span>
        );
    }
  };

  const getConfidenceBadge = (confidence?: "Alta" | "Moderada" | "Baixa") => {
    switch (confidence) {
      case "Alta":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
            Confiança: Alta
          </span>
        );
      case "Moderada":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
            Confiança: Moderada
          </span>
        );
      case "Baixa":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wider">
            Confiança: Preliminar
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
            Confiança: Alta
          </span>
        );
    }
  };

  const getCategoryLabel = (cat: DecisionCategory) => {
    switch (cat) {
      case "forca_maxima":
        return "Força Máxima (IMTP)";
      case "taxa_desenvolvimento_forca":
        return "Força Rápida / TDF";
      case "potencia_cmj":
        return "Potência Concêntrica (CMJ)";
      case "forca_reativa_dj":
        return "Força Reativa (DJ / RSI)";
      case "assimetria_prevencao":
        return "Assimetria & Razão I:Q";
      case "velocidade_sprint":
        return "Velocidade & Aceleração";
      case "capacidade_aerobica":
        return "Capacidade Aeróbica";
      case "controle_carga_recuperacao":
        return "Carga & Prontidão";
      default:
        return cat;
    }
  };

  const handleConcludeToPrescription = () => {
    if (!athlete) {
      toast.error("Selecione um atleta para gerar a prescrição baseada na Matriz.");
      return;
    }

    const mergedRows = athleteReport
      ? athleteReport.activeRows.map((r) => ({
          ...r,
          conduct: customConducts[r.id] || r.conduct || "monitorar"
        }))
      : MASTER_DECISION_MATRIX;

    const payload = generatePrescriptionPayloadFromDecisionMatrix(
      athlete,
      mergedRows,
      athleteReport?.attentionSignals || []
    );

    setGeneratedPayload(payload);
    setPrescriptionModalOpen(true);

    if (onNavigateToWorkout) {
      onNavigateToWorkout(payload);
    }
  };

  const handleConfirmPrescriptionToAthlete = () => {
    if (!generatedPayload || !athlete) return;

    if (onSaveWorkoutToAthlete) {
      const newWorkout = {
        id: `workout-lb-matrix-${Date.now()}`,
        name: generatedPayload.title,
        date: new Date().toISOString().split("T")[0],
        category: "Método LB - Matriz de Decisão",
        exercises: generatedPayload.exercises.map((ex, idx) => ({
          id: `ex-${idx}`,
          name: ex.name,
          category: ex.block,
          sets: ex.sets,
          reps: ex.reps,
          load: ex.intensity,
          rest: ex.rest,
          notes: ex.notes
        }))
      };
      onSaveWorkoutToAthlete(newWorkout);
    }

    toast.success(`Ficha de treino gerada com sucesso para ${athlete.name}!`, {
      icon: "🏋️‍♂️",
      duration: 3500
    });
    setPrescriptionModalOpen(false);
  };

  const handleExportJpeg = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Gerando imagem em alta resolução da Matriz...");
    try {
      const dataUrl = await toJpeg(reportRef.current, {
        quality: 0.95,
        backgroundColor: "#0b0f19",
        pixelRatio: 2
      });
      const link = document.createElement("a");
      const athleteSlug = athlete
        ? athlete.name.toLowerCase().replace(/\s+/g, "-")
        : "mentoria-geral";
      link.download = `lb-decision-matrix-${athleteSlug}.jpg`;
      link.href = dataUrl;
      link.click();
      toast.success("Imagem gerada com sucesso!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Falha ao exportar imagem.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-6 text-slate-100 font-sans pb-20">
      {/* 1. FLUXO ARQUITETURAL LB (BREADCRUMB VISUAL) */}
      <div className="bg-slate-900/95 border border-emerald-500/20 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-black uppercase tracking-wider text-slate-400">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              1. Avaliações
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-[#39FF14] border border-emerald-400/40 shadow-[0_0_12px_rgba(57,255,20,0.2)]">
              2. Matriz de Decisão LB (Cérebro)
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              3. Prescrição LB (Execução)
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              4. Monitoramento & Reavaliação
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJpeg}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all shadow-sm"
              title="Exportar JPEG da Matriz"
            >
              <Download className="w-3.5 h-3.5 text-[#39FF14]" />
              <span>Exportar</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all shadow-sm"
              title="Imprimir Matriz"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. HEADER HERO DA MATRIZ */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-emerald-950/30 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[#39FF14] text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Ecossistema LB • Tomada de Decisão & Dosagem Proporcional
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              LB Performance Decision Matrix
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              O cérebro central da prescrição: transforma dados de testes laboratoriais e de campo
              em intervenções proporcionais balanceadas (<strong>Dose Principal</strong> + <strong>Microdoses</strong> + <strong>Monitoramento</strong>) com rigor científico e 1 clique para prescrição.
            </p>
          </div>

          {/* MUDANÇA DE MODO: ATLETA vs MENTORIA */}
          <div className="inline-flex p-1.5 bg-slate-950 rounded-2xl border border-slate-800 shrink-0">
            {athlete && (
              <button
                onClick={() => setActiveView("athlete")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                  activeView === "athlete"
                    ? "bg-[#10b981] text-slate-950 shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Activity className="w-4 h-4" />
                Matriz de {athlete.name.split(" ")[0]}
                {athleteReport && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-slate-950 text-white font-black">
                    {athleteReport.totalFindings}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setActiveView("master")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                activeView === "master"
                  ? "bg-[#10b981] text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Matriz Mestre de Mentoria
              <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-slate-800 text-slate-300 font-bold">
                {MASTER_DECISION_MATRIX.length}
              </span>
            </button>
          </div>
        </div>

        {/* CONTADORES RÁPIDOS DE CONDUTA */}
        {athlete && activeView === "athlete" && (
          <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Dose Principal</p>
                <p className="text-xl font-black text-[#39FF14]">{conductCounts.dosePrincipal}</p>
              </div>
              <Flame className="w-6 h-6 text-[#39FF14] opacity-80" />
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Microdoses</p>
                <p className="text-xl font-black text-amber-400">{conductCounts.microdoses}</p>
              </div>
              <Sliders className="w-6 h-6 text-amber-400 opacity-80" />
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Apenas Monitorar</p>
                <p className="text-xl font-black text-emerald-400">{conductCounts.monitorar}</p>
              </div>
              <Eye className="w-6 h-6 text-emerald-400 opacity-80" />
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sinais de Atenção</p>
                <p className="text-xl font-black text-rose-400">
                  {athleteReport?.attentionSignals.length || 0}
                </p>
              </div>
              <ShieldAlert className="w-6 h-6 text-rose-400 opacity-80" />
            </div>
          </div>
        )}
      </div>

      {/* 3. QUADRO EXCLUSIVO: SINAIS DE ATENÇÃO & SEGURANÇA (SE HOUVER) */}
      {athlete && activeView === "athlete" && athleteReport && athleteReport.attentionSignals.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 text-rose-400 font-black text-sm uppercase tracking-wider">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
            <span>Sinais de Atenção & Bandeiras Vermelhas ({athleteReport.attentionSignals.length})</span>
          </div>
          <p className="text-xs text-slate-300">
            Fatores agudos ou assimetrias de alta magnitude detectados nos testes recentes. Requerem modulação e volume de compensação na sessão:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {athleteReport.attentionSignals.map((signal) => (
              <div
                key={signal.id}
                className="bg-slate-950/80 border border-rose-500/20 p-3.5 rounded-2xl space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-rose-300">{signal.title}</span>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    {signal.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{signal.description}</p>
                <div className="pt-1 text-[11px] text-[#39FF14] font-semibold flex items-start gap-1.5">
                  <span className="font-bold">Conduta Recomendada:</span>
                  <span>{signal.actionRecommendation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. BARRA DE FILTRO E PESQUISA */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar capacidade, evidência, exercício..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
              >
                Limpar
              </button>
            )}
          </div>

          {/* FILTRO DE CATEGORIAS */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Categoria:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-400"
            >
              <option value="all">Todas as Capacidades</option>
              <option value="forca_maxima">Força Máxima (IMTP)</option>
              <option value="taxa_desenvolvimento_forca">Força Rápida / TDF</option>
              <option value="potencia_cmj">Potência Concêntrica (CMJ)</option>
              <option value="forca_reativa_dj">Força Reativa (DJ / RSI)</option>
              <option value="assimetria_prevencao">Assimetria & Razão I:Q</option>
              <option value="velocidade_sprint">Velocidade & Sprint</option>
              <option value="capacidade_aerobica">Capacidade Aeróbica</option>
              <option value="controle_carga_recuperacao">Carga & Prontidão</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. CARDS INTERATIVOS DE CAPACIDADES COM SELETOR DE CONDUTA */}
      <div ref={reportRef} className="space-y-4">
        {currentRows.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 text-xs">
            Nenhum achado correspondente aos filtros selecionados.
          </div>
        ) : (
          currentRows.map((row) => {
            const isExpanded = expandedRowId === row.id;
            const currentConduct = customConducts[row.id] || row.conduct || "monitorar";

            return (
              <div
                key={row.id}
                className={`bg-slate-900/90 border transition-all rounded-3xl overflow-hidden shadow-lg ${
                  currentConduct === "dose_principal"
                    ? "border-[#39FF14]/50 shadow-[0_0_20px_rgba(57,255,20,0.1)]"
                    : currentConduct === "microdose"
                    ? "border-amber-500/30"
                    : "border-slate-800"
                }`}
              >
                {/* CABEÇALHO DO CARD */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          {getCategoryLabel(row.category)}
                        </span>
                        <span className="text-slate-600">•</span>
                        {getPriorityBadge(row.priority)}
                        {getConfidenceBadge(row.confidence)}
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                        {row.finding}
                      </h3>
                      {row.evidence && (
                        <p className="text-xs text-slate-300 font-mono">
                          <span className="text-emerald-400 font-bold">Evidência:</span> {row.evidence}
                        </p>
                      )}
                    </div>

                    {/* SELETOR INTERATIVO DE CONDUTA */}
                    <div className="flex flex-col items-start lg:items-end gap-1.5 shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Conduta Prescritiva LB:
                      </span>
                      <div className="inline-flex p-1 bg-slate-950 rounded-2xl border border-slate-800 gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleConductChange(row.id, "dose_principal", e)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                            currentConduct === "dose_principal"
                              ? "bg-[#39FF14] text-slate-950 shadow-[0_0_12px_rgba(57,255,20,0.4)] scale-102"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <Flame className="w-3.5 h-3.5" />
                          Dose Principal
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleConductChange(row.id, "microdose", e)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                            currentConduct === "microdose"
                              ? "bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.4)] scale-102"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          Microdose
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleConductChange(row.id, "monitorar", e)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                            currentConduct === "monitorar"
                              ? "bg-slate-700 text-white shadow-sm scale-102"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Monitorar
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* HIPÓTESE & INTERVENÇÃO RESUMIDA */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                        Hipótese Fisiológica:
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">{row.hypothesis}</p>
                    </div>

                    <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                        Intervenção Proporcional:
                      </span>
                      <p className="text-xs text-[#39FF14] font-semibold leading-relaxed">
                        {row.intervention}
                      </p>
                    </div>
                  </div>

                  {/* BOTÃO PARA EXPANDIR FICHA-MÃE (8 PASSOS) */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                      <Target className="w-3.5 h-3.5" />
                      <span>Transferência: {row.transfer}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleRow(row.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
                    >
                      <span>{isExpanded ? "Ocultar Ficha-Mãe" : "Ver Ficha-Mãe Completa"}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#39FF14]" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 6. CORPO EXPANDIDO: ESTRUTURA DA FICHA-MÃE (8 ETAPAS DO MÉTODO LB) */}
                {isExpanded && (
                  <div className="bg-slate-950/90 border-t border-slate-800 p-6 space-y-6">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#39FF14] font-black tracking-widest">
                        ESTRUTURA DE RACIOCÍNIO CLÍNICO LB (FICHA-MÃE)
                      </span>
                      <h4 className="text-sm font-black text-white mt-1">
                        Cadeia Causal de 8 Passos: {row.finding}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      {/* PASSO 1: PROBLEMA */}
                      <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                        <span className="text-[10px] font-black text-rose-400 uppercase">1. Problema</span>
                        <p className="text-slate-200 font-medium">
                          {row.problemStatement || row.finding}
                        </p>
                      </div>

                      {/* PASSO 2: EVIDÊNCIA */}
                      <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                        <span className="text-[10px] font-black text-amber-400 uppercase">2. Evidência</span>
                        <p className="text-slate-200 font-medium">
                          {row.evidence || row.metricValue || "Teste quantitativo"}
                        </p>
                      </div>

                      {/* PASSO 3: HIPÓTESE */}
                      <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                        <span className="text-[10px] font-black text-cyan-400 uppercase">3. Hipótese</span>
                        <p className="text-slate-200 font-medium">{row.hypothesis}</p>
                      </div>

                      {/* PASSO 4: PRIORIDADE */}
                      <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                        <span className="text-[10px] font-black text-emerald-400 uppercase">4. Prioridade</span>
                        <p className="text-slate-200 font-medium">
                          {row.priority} ({row.confidence || "Alta"} Confiança)
                        </p>
                      </div>

                      {/* PASSO 5: INTERVENÇÃO */}
                      <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 space-y-1 sm:col-span-2">
                        <span className="text-[10px] font-black text-[#39FF14] uppercase">5. Intervenção Proporcional</span>
                        <p className="text-slate-200 font-medium">{row.intervention}</p>
                      </div>

                      {/* PASSO 6: MONITORAMENTO & REAVALIAÇÃO */}
                      <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                        <span className="text-[10px] font-black text-indigo-400 uppercase">6 & 7. Monitoramento & Prazo</span>
                        <p className="text-slate-200 font-medium">
                          {row.monitoring} (Prazo: {row.reassessmentTimeline || "3-4 semanas"})
                        </p>
                      </div>

                      {/* PASSO 8: TRANSFERÊNCIA */}
                      <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                        <span className="text-[10px] font-black text-emerald-400 uppercase">8. Transferência</span>
                        <p className="text-slate-200 font-medium">{row.transfer}</p>
                      </div>
                    </div>

                    {/* PROTOCOLO PRÁTICO DE EXERCÍCIOS */}
                    <div className="space-y-3 pt-2">
                      <h5 className="text-xs font-black uppercase tracking-wider text-[#39FF14] flex items-center gap-2">
                        <Dumbbell className="w-4 h-4" />
                        Exercícios e Séries Prescritas
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {row.practicalDetails?.map((detail, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5 text-xs text-slate-200"
                          >
                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-[#39FF14] font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="leading-relaxed">{detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 text-[10px] text-slate-500 italic">
                      Fundamentação: {row.evidenceReference || "Literatura Internacional em Fisiologia & Biomecânica LB"}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 7. BARRAMENTO FIXO DE CONSOLIDAÇÃO & PRESCRIÇÃO EM 1 CLIQUE */}
      {athlete && activeView === "athlete" && (
        <div className="sticky bottom-4 z-40 bg-slate-950/95 border border-emerald-400/40 rounded-3xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-md">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs font-black">
              <span className="text-slate-400 uppercase tracking-wider font-mono">Consolidado da Matriz:</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#39FF14]/15 text-[#39FF14] border border-[#39FF14]/30">
                <Flame className="w-3.5 h-3.5" /> Dose Principal: {conductCounts.dosePrincipal}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Sliders className="w-3.5 h-3.5" /> Microdoses: {conductCounts.microdoses}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                <Eye className="w-3.5 h-3.5" /> Monitorar: {conductCounts.monitorar}
              </span>
            </div>

            <button
              type="button"
              onClick={handleConcludeToPrescription}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#10b981] to-[#39FF14] text-slate-950 text-xs font-black uppercase tracking-wider shadow-[0_0_25px_rgba(57,255,20,0.4)] hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Concluir para Prescrição (1 Clique)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 8. MODAL DE REVISÃO E CONFIRMAÇÃO DA FICHA PRESCRITA */}
      {prescriptionModalOpen && generatedPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-emerald-400/40 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl text-slate-100">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#39FF14] uppercase font-black tracking-widest">
                  MOTOR EXECUTIVO LB • PRESCRIÇÃO AUTOMÁTICA
                </span>
                <h3 className="text-xl font-black text-white mt-1">
                  {generatedPayload.title}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  {generatedPayload.rationale}
                </p>
              </div>
              <button
                onClick={() => setPrescriptionModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center shrink-0"
              >
                ✕
              </button>
            </div>

            {/* LISTA DE EXERCÍCIOS ORGANIZADOS POR BLOCOS */}
            <div className="space-y-4">
              {["Aquecimento & Priming", "Dose Principal (Foco)", "Microdoses & Acessórios", "Prevenção & Recovery"].map((blockName) => {
                const blockExercises = generatedPayload.exercises.filter((ex) => ex.block === blockName);
                if (blockExercises.length === 0) return null;

                return (
                  <div key={blockName} className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#39FF14]">
                      <Award className="w-3.5 h-3.5" />
                      <span>{blockName} ({blockExercises.length} exercícios)</span>
                    </div>

                    <div className="space-y-2">
                      {blockExercises.map((ex, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <h5 className="font-bold text-white text-sm">{ex.name}</h5>
                            {ex.notes && <p className="text-[11px] text-slate-400">{ex.notes}</p>}
                          </div>

                          <div className="flex items-center gap-3 shrink-0 text-slate-300 font-mono text-[11px]">
                            <span className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                              {ex.sets} séries x {ex.reps}
                            </span>
                            <span className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 text-emerald-400">
                              {ex.intensity}
                            </span>
                            <span className="bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-slate-400">
                              {ex.rest}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AÇÕES FINAIS DO MODAL */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPrescriptionModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Revisar na Matriz
              </button>
              <button
                type="button"
                onClick={handleConfirmPrescriptionToAthlete}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#39FF14] text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-transform"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Salvar Ficha no Perfil do Atleta</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
