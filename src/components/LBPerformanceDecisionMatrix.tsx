import React, { useState, useMemo, useRef } from "react";
import {
  Athlete,
  Workout,
  ExternalSession,
  DecisionMatrixRow,
  DecisionCategory,
  DecisionPriority
} from "../types";
import {
  MASTER_DECISION_MATRIX,
  generateAthleteDecisionMatrix
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
  HeartPulse
} from "lucide-react";
import { toJpeg } from "html-to-image";
import toast from "react-hot-toast";

interface LBPerformanceDecisionMatrixProps {
  athlete?: Athlete;
  workouts?: Workout[];
  externalSessions?: ExternalSession[];
  onNavigateToWorkout?: (recommendedExercises?: string[]) => void;
  standaloneMode?: boolean;
}

export const LBPerformanceDecisionMatrix: React.FC<LBPerformanceDecisionMatrixProps> = ({
  athlete,
  workouts = [],
  externalSessions = [],
  onNavigateToWorkout,
  standaloneMode = false
}) => {
  const [activeView, setActiveView] = useState<"athlete" | "master">(
    athlete ? "athlete" : "master"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Generate dynamic diagnosis for athlete if available
  const athleteReport = useMemo(() => {
    if (!athlete) return null;
    return generateAthleteDecisionMatrix(athlete, workouts, externalSessions);
  }, [athlete, workouts, externalSessions]);

  // Current list based on active view
  const currentRows: DecisionMatrixRow[] = useMemo(() => {
    const source =
      activeView === "athlete" && athleteReport
        ? athleteReport.activeRows
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
        (row.targetBenchmark && row.targetBenchmark.toLowerCase().includes(q));

      return matchCat && matchPriority && matchSearch;
    });
  }, [activeView, athleteReport, selectedCategory, selectedPriority, searchQuery]);

  const toggleRow = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  const getPriorityBadge = (priority: DecisionPriority) => {
    switch (priority) {
      case "Critica":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            Crítica
          </span>
        );
      case "Alta":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Alta
          </span>
        );
      case "Media":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
            <Clock className="w-3 h-3 text-yellow-400" />
            Média
          </span>
        );
      case "Baixa":
      case "Normal":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            {priority}
          </span>
        );
    }
  };

  const getCategoryLabel = (cat: DecisionCategory) => {
    switch (cat) {
      case "forca_maxima":
        return "Força Máxima";
      case "taxa_desenvolvimento_forca":
        return "TDF / RFD";
      case "potencia_cmj":
        return "Potência CMJ";
      case "forca_reativa_dj":
        return "Força Reativa (DJ)";
      case "assimetria_prevencao":
        return "Assimetria & Prevenção";
      case "velocidade_sprint":
        return "Velocidade & Sprint";
      case "capacidade_aerobica":
        return "Capacidade Aeróbica";
      case "controle_carga_recuperacao":
        return "Carga & Prontidão";
      default:
        return cat;
    }
  };

  const handleExportJpeg = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Gerando imagem da Matriz de Decisão...");
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
      link.download = `lb-performance-decision-matrix-${athleteSlug}.jpg`;
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
    <div className="w-full space-y-6 text-slate-100 font-sans pb-16">
      {/* HEADER PRINCIPAL */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-brand-primary/10 border border-slate-800/80 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/15 border border-brand-primary/30 text-brand-primary text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Ecossistema LB • Tomada de Decisão Baseada em Evidências
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              LB Performance Decision Matrix
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Ponte direta entre biomarcadores laboratoriais e intervenções
              práticas no campo. Conecte achados de IMTP, CMJ, Drop Jump,
              Velocidade e Cargas às hipóteses fisiológicas, prioridades clínicas
              e transferências diretas para a modalidade.
            </p>
          </div>

          {/* AÇÕES NO TOPO */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleExportJpeg}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              title="Baixar imagem em alta resolução"
            >
              <Download className="w-4 h-4 text-brand-primary" />
              <span>Exportar JPEG</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              title="Imprimir relatório da matriz"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* CONTROLES DE MODO DE VISUALIZAÇÃO */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="inline-flex p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
            {athlete && (
              <button
                onClick={() => setActiveView("athlete")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  activeView === "athlete"
                    ? "bg-brand-primary text-slate-950 shadow-md shadow-brand-primary/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Diagnóstico de {athlete.name.split(" ")[0]}
                {athleteReport && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                      athleteReport.criticalCount > 0
                        ? "bg-rose-950 text-rose-200"
                        : "bg-slate-800 text-white"
                    }`}
                  >
                    {athleteReport.totalFindings}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setActiveView("master")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeView === "master"
                  ? "bg-brand-primary text-slate-950 shadow-md shadow-brand-primary/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Matriz Mestre de Mentoria
              <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-slate-800 text-slate-300 font-bold">
                {MASTER_DECISION_MATRIX.length}
              </span>
            </button>
          </div>

          {athlete && activeView === "athlete" && athleteReport && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Status Geral:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  athleteReport.overallStatus === "critico"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : athleteReport.overallStatus === "atencao"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                }`}
              >
                {athleteReport.overallStatus === "critico"
                  ? "Alerta Crítico"
                  : athleteReport.overallStatus === "atencao"
                  ? "Pontos de Atenção"
                  : "Perfil Equilibrado"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* PAINEL DE RESUMO EXECUTIVO (QUANDO EM MODO ATLETA) */}
      {athlete && activeView === "athlete" && athleteReport && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Total de Achados
              </p>
              <p className="text-2xl font-black text-white">
                {athleteReport.totalFindings}
              </p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Prioridade Crítica
              </p>
              <p className="text-2xl font-black text-rose-400">
                {athleteReport.criticalCount}
              </p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Prioridade Alta
              </p>
              <p className="text-2xl font-black text-amber-400">
                {athleteReport.highCount}
              </p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Estáveis / Baixo Risco
              </p>
              <p className="text-2xl font-black text-emerald-400">
                {athleteReport.normalCount}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* RESUMO EXECUTIVO TEXTUAL */}
      {athlete && activeView === "athlete" && athleteReport && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex items-start gap-4">
          <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
              Diretriz Executiva da Mentoria para {athlete.name}
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              {athleteReport.executiveSummary}
            </p>
          </div>
        </div>
      )}

      {/* BARRA DE FILTROS E BUSCA */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* BUSCA */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar achado, hipótese, exercício..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary transition-colors"
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

          {/* FILTRO DE PRIORIDADE */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Prioridade:
            </span>
            <button
              onClick={() => setSelectedPriority("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shrink-0 ${
                selectedPriority === "all"
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setSelectedPriority("Critica")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shrink-0 ${
                selectedPriority === "Critica"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Crítica
            </button>
            <button
              onClick={() => setSelectedPriority("Alta")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shrink-0 ${
                selectedPriority === "Alta"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Alta
            </button>
            <button
              onClick={() => setSelectedPriority("Media")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shrink-0 ${
                selectedPriority === "Media"
                  ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Média
            </button>
          </div>
        </div>

        {/* PILLS DE CATEGORIAS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-slate-800/60 no-scrollbar">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Categorias:
          </span>
          {[
            { id: "all", label: "Todas as Categorias" },
            { id: "forca_maxima", label: "Força Máxima (IMTP)" },
            { id: "taxa_desenvolvimento_forca", label: "TDF / RFD" },
            { id: "potencia_cmj", label: "Potência (CMJ)" },
            { id: "forca_reativa_dj", label: "Força Reativa (DJ)" },
            { id: "assimetria_prevencao", label: "Assimetria & Prevenção" },
            { id: "velocidade_sprint", label: "Velocidade & Sprint" },
            { id: "capacidade_aerobica", label: "VO2Max & VAM" },
            { id: "controle_carga_recuperacao", label: "Carga & Prontidão" }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-brand-primary text-slate-950 shadow-sm shadow-brand-primary/20"
                  : "bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABELA PRINCIPAL DA DECISION MATRIX */}
      <div
        ref={reportRef}
        className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* CABEÇALHO DO RELATÓRIO PARA EXPORTAÇÃO */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary font-mono">
              LB PERFORMANCE MATRIX • SISTEMA DE CONDUTAS CLÍNICAS
            </div>
            <h3 className="text-lg font-black text-white mt-1">
              {activeView === "athlete" && athlete
                ? `Matriz de Ação Personalizada: ${athlete.name}`
                : "Matriz Mestre de Decisão Metodológica (Referência)"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualizando {currentRows.length} linha(s) de decisão
              estruturada(s)
            </p>
          </div>

          <div className="text-right text-xs text-slate-400 hidden sm:block">
            <p className="font-mono text-[11px]">
              {new Date().toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric"
              })}
            </p>
            <p className="text-[10px] text-slate-400">
              Padrão Ouro de Avaliação e Mentoria
            </p>
          </div>
        </div>

        {/* TABELA DESKTOP */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <th className="py-3.5 px-4 w-[16%]">Achado (Biomarcador)</th>
                <th className="py-3.5 px-4 w-[14%]">Contexto</th>
                <th className="py-3.5 px-4 w-[16%]">Hipótese Fisiológica</th>
                <th className="py-3.5 px-3 w-[8%] text-center">Prioridade</th>
                <th className="py-3.5 px-4 w-[20%]">Intervenção Prescrita</th>
                <th className="py-3.5 px-3 w-[12%]">Monitoramento</th>
                <th className="py-3.5 px-4 w-[14%]">Transferência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenhum achado correspondente aos filtros selecionados.
                  </td>
                </tr>
              ) : (
                currentRows.map((row) => {
                  const isExpanded = expandedRowId === row.id;
                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        onClick={() => toggleRow(row.id)}
                        className={`cursor-pointer transition-colors hover:bg-slate-800/40 ${
                          isExpanded ? "bg-slate-800/60" : ""
                        }`}
                      >
                        {/* ACHADO */}
                        <td className="py-4 px-4 align-top">
                          <div className="font-bold text-white flex items-start gap-1.5">
                            <ChevronDown
                              className={`w-4 h-4 shrink-0 text-slate-400 transition-transform mt-0.5 ${
                                isExpanded ? "rotate-180 text-brand-primary" : ""
                              }`}
                            />
                            <div>
                              <span>{row.finding}</span>
                              {row.metricValue && (
                                <div className="mt-1 text-[11px] text-brand-primary font-mono font-bold">
                                  Atual: {row.metricValue}
                                </div>
                              )}
                              {row.targetBenchmark && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Alvo: {row.targetBenchmark}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* CONTEXTO */}
                        <td className="py-4 px-4 align-top text-slate-300 font-medium">
                          {row.context}
                        </td>

                        {/* HIPÓTESE */}
                        <td className="py-4 px-4 align-top text-slate-300 leading-relaxed">
                          {row.hypothesis}
                        </td>

                        {/* PRIORIDADE */}
                        <td className="py-4 px-3 align-top text-center">
                          {getPriorityBadge(row.priority)}
                        </td>

                        {/* INTERVENÇÃO */}
                        <td className="py-4 px-4 align-top text-slate-200">
                          <div className="font-semibold">{row.intervention}</div>
                          <div className="mt-1 text-[11px] text-brand-primary flex items-center gap-1 font-bold">
                            <span>Ver exercícios práticos</span>
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        </td>

                        {/* MONITORAMENTO */}
                        <td className="py-4 px-3 align-top text-slate-300 font-mono text-[11px]">
                          {row.monitoring}
                        </td>

                        {/* TRANSFERÊNCIA */}
                        <td className="py-4 px-4 align-top text-emerald-400/90 font-medium">
                          {row.transfer}
                        </td>
                      </tr>

                      {/* DETALHES EXPANDIDOS (EXERCÍCIOS E METODOLOGIA) */}
                      {isExpanded && (
                        <tr className="bg-slate-950/70 border-b border-slate-800">
                          <td colSpan={7} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* EXERCÍCIOS E DOSAGENS */}
                              <div className="md:col-span-2 space-y-3">
                                <h5 className="text-xs font-black uppercase tracking-wider text-brand-primary flex items-center gap-2">
                                  <Dumbbell className="w-4 h-4" />
                                  Protocolo de Exercícios e Dosagem Recomendada
                                </h5>
                                {row.practicalDetails &&
                                row.practicalDetails.length > 0 ? (
                                  <ul className="space-y-2">
                                    {row.practicalDetails.map((det, idx) => (
                                      <li
                                        key={idx}
                                        className="text-xs text-slate-200 flex items-start gap-2.5 bg-slate-900/80 p-3 rounded-xl border border-slate-800"
                                      >
                                        <span className="w-5 h-5 rounded-full bg-brand-primary/20 text-brand-primary font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                          {idx + 1}
                                        </span>
                                        <span className="leading-relaxed">
                                          {det}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-slate-400">
                                    {row.intervention}
                                  </p>
                                )}

                                {onNavigateToWorkout && (
                                  <div className="pt-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onNavigateToWorkout(row.practicalDetails);
                                      }}
                                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-slate-950 text-xs font-black shadow-md transition-transform hover:scale-[1.02]"
                                    >
                                      <FileSpreadsheet className="w-3.5 h-3.5" />
                                      Carregar na Ficha de Treino do Atleta
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* TRANSFERÊNCIA E REFERÊNCIA CIENTÍFICA */}
                              <div className="space-y-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                                <div>
                                  <h6 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
                                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                                    Mecanismo de Transferência Esportiva
                                  </h6>
                                  <p className="text-xs text-slate-300 leading-relaxed">
                                    {row.transfer}
                                  </p>
                                </div>

                                <div>
                                  <h6 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
                                    <BookOpen className="w-3.5 h-3.5 text-brand-primary" />
                                    Fundamentação Científica
                                  </h6>
                                  <p className="text-xs text-slate-400 italic">
                                    {row.evidenceReference ||
                                      "Literatura padrão em Fisiologia do Exercício e Biomecânica do Esporte"}
                                  </p>
                                </div>

                                <div>
                                  <h6 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
                                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                                    Frequência de Monitoramento
                                  </h6>
                                  <p className="text-xs text-amber-300 font-mono">
                                    {row.monitoring}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* CARDS RESPONSIVOS PARA MOBILE / TABLET */}
        <div className="block lg:hidden divide-y divide-slate-800">
          {currentRows.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Nenhum achado correspondente aos filtros selecionados.
            </div>
          ) : (
            currentRows.map((row) => {
              const isExpanded = expandedRowId === row.id;
              return (
                <div
                  key={row.id}
                  className="p-4 sm:p-5 space-y-3 cursor-pointer hover:bg-slate-800/30 transition-colors"
                  onClick={() => toggleRow(row.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        {getCategoryLabel(row.category)}
                      </span>
                      <h4 className="text-sm font-black text-white">
                        {row.finding}
                      </h4>
                      {row.metricValue && (
                        <div className="text-xs font-mono text-brand-primary font-bold mt-0.5">
                          Atual: {row.metricValue} • Alvo: {row.targetBenchmark}
                        </div>
                      )}
                    </div>
                    {getPriorityBadge(row.priority)}
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Contexto & Hipótese:
                      </span>
                      <p className="text-slate-300 mt-0.5">
                        <strong className="text-white">{row.context}:</strong>{" "}
                        {row.hypothesis}
                      </p>
                    </div>

                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Intervenção:
                      </span>
                      <p className="text-brand-primary font-semibold mt-0.5">
                        {row.intervention}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-emerald-400 font-medium">
                      🎯 {row.transfer}
                    </span>
                    <div className="flex items-center gap-1 text-slate-400 font-bold text-[11px]">
                      <span>{isExpanded ? "Fechar" : "Detalhes"}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-brand-primary" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  {/* DETALHES NO MOBILE */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-800 space-y-3 bg-slate-950/90 p-3 rounded-xl">
                      <h6 className="text-[11px] font-black uppercase text-brand-primary">
                        Exercícios Práticos Prescritos
                      </h6>
                      <ul className="space-y-1.5">
                        {row.practicalDetails?.map((ex, i) => (
                          <li
                            key={i}
                            className="text-xs text-slate-200 bg-slate-900 p-2 rounded-lg border border-slate-800"
                          >
                            • {ex}
                          </li>
                        ))}
                      </ul>

                      <div className="text-[11px] text-slate-400">
                        <span className="font-bold text-slate-300">
                          Monitoramento:
                        </span>{" "}
                        {row.monitoring}
                      </div>
                      <div className="text-[10px] text-slate-500 italic">
                        Ref: {row.evidenceReference}
                      </div>

                      {onNavigateToWorkout && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToWorkout(row.practicalDetails);
                          }}
                          className="w-full py-2 bg-brand-primary text-slate-950 font-black text-xs rounded-xl shadow mt-2"
                        >
                          Carregar no Treino
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
