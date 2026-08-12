import React, { FC, useState, useMemo } from "react";
import { 
  Activity, 
  Calendar, 
  ShieldAlert, 
  Sparkles, 
  Plus, 
  Trash2, 
  Heart, 
  ClipboardList, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Users,
  ShieldCheck,
  User,
  HeartPulse,
  Pencil,
  Check,
  X,
  FileText,
  FileCheck,
  Upload,
  Eye,
  Download,
  Search,
  Paperclip,
  Image as ImageIcon,
  Maximize2,
  FolderOpen,
  FileUp,
  FileSpreadsheet,
  ExternalLink
} from "lucide-react";
import { Athlete, InjuryEntry, MedicalExam } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { formatDate, getSafeDateTime, getLocalDateString } from "../utils";
import { HealthReport } from "./HealthReport";
import { InteractiveBodyMap } from "./InteractiveBodyMap";
import toast from "react-hot-toast";

interface InjuriesViewProps {
  athlete: Athlete;
  onUpdateAthlete: (data: Partial<Athlete>) => void;
  role: "coach" | "athlete";
}

export const InjuriesView: FC<InjuriesViewProps> = ({
  athlete,
  onUpdateAthlete,
  role,
}) => {
  const injuries = useMemo(() => athlete.injuries || [], [athlete.injuries]);
  const medicalExams = useMemo(() => athlete.medicalExams || [], [athlete.medicalExams]);

  const [activeSubTab, setActiveSubTab] = useState<"body-map" | "occurrences" | "exams" | "report">("body-map");
  const [showHealthReport, setShowHealthReport] = useState(false);

  // Exams State
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [filterExamCategory, setFilterExamCategory] = useState<string>("todos");
  const [searchExamQuery, setSearchExamQuery] = useState<string>("");
  const [selectedExamForViewer, setSelectedExamForViewer] = useState<MedicalExam | null>(null);
  const [confirmDeleteExam, setConfirmDeleteExam] = useState<MedicalExam | null>(null);

  const [newExam, setNewExam] = useState<Omit<MedicalExam, "id">>({
    date: getLocalDateString(),
    title: "",
    category: "Ressonância",
    fileUrl: "",
    fileName: "",
    fileType: "pdf",
    fileSize: "",
    notes: "",
    injuryId: "",
    recordedBy: role === "coach" ? "coach" : "atleta"
  });

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInjury, setNewInjury] = useState<Omit<InjuryEntry, "id">>({
    date: getLocalDateString(),
    description: "",
    status: "Ativa",
    location: "Joelho",
    severity: "Leve",
    rehabStage: "Fisioterapia",
    estimatedReturnDate: "",
    notes: "",
  });

  // Editing State
  const [editingInjury, setEditingInjury] = useState<InjuryEntry | null>(null);
  const [confirmDeleteInjury, setConfirmDeleteInjury] = useState<InjuryEntry | null>(null);

  // Filters state
  const [filterStatus, setFilterStatus] = useState<"todos" | "Ativa" | "Observação" | "Recuperada">("todos");

  // Filtered Injuries
  const filteredInjuries = useMemo(() => {
    let list = [...injuries].sort((a, b) => getSafeDateTime(b.date) - getSafeDateTime(a.date));
    if (filterStatus !== "todos") {
      list = list.filter((i) => i.status === filterStatus);
    }
    return list;
  }, [injuries, filterStatus]);

  // General statistics
  const stats = useMemo(() => {
    const total = injuries.length;
    const active = injuries.filter(i => i.status === "Ativa").length;
    const observation = injuries.filter(i => i.status === "Observação").length;
    const recovered = injuries.filter(i => i.status === "Recuperada").length;
    
    // Severity breakdown
    const severeCount = injuries.filter(i => i.severity === "Grave" || i.severity === "Cirúrgica").length;
    
    // Location distribution
    const locations: Record<string, number> = {};
    injuries.forEach(i => {
      const loc = i.location || "Outro";
      locations[loc] = (locations[loc] || 0) + 1;
    });

    return { total, active, observation, recovered, severeCount, locations };
  }, [injuries]);

  // Medical status label for athlete
  const statusGlow = useMemo(() => {
    if (stats.active > 0) {
      return {
        label: "Sob Cuidados Médicos / DM",
        color: "text-red-500 bg-red-500/10 border-red-500/20",
        glow: "shadow-[0_0_15px_rgba(239,68,68,0.3)]",
        badge: "● INATIVO / DM",
      };
    } else if (stats.observation > 0) {
      return {
        label: "Liberado sob Restrição / Observação",
        color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        glow: "shadow-[0_0_15px_rgba(245,158,11,0.3)]",
        badge: "● ATENÇÃO / LIMITADO",
      };
    } else {
      return {
        label: "Apto para Atividade Plena",
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        glow: "shadow-[0_0_15px_rgba(16,185,129,0.3)]",
        badge: "● LIBERADO TOTAL",
      };
    }
  }, [stats]);

  // Anatomical injury location map configuration
  const allLocations: Array<NonNullable<InjuryEntry['location']>> = [
    "Joelho", "Tornozelo", "Coxa Posterior", "Coxa Anterior", 
    "Panturrilha", "Coluna/Lombar", "Ombro", "Pé/Articulação", "Outro"
  ];

  // Actions
  const handleAddInjury = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInjury.description) return;

    const entry: InjuryEntry = {
      ...newInjury,
      id: `inj-${Date.now()}`,
    };

    onUpdateAthlete({
      injuries: [...injuries, entry],
    });

    // Reset Form
    setNewInjury({
      date: getLocalDateString(),
      description: "",
      status: "Ativa",
      location: "Joelho",
      severity: "Leve",
      rehabStage: "Fisioterapia",
      estimatedReturnDate: "",
      notes: "",
    });
    setShowAddForm(false);
  };

  const handleRemoveInjury = (id: string) => {
    onUpdateAthlete({
      injuries: injuries.filter((i) => i.id !== id),
    });
    setConfirmDeleteInjury(null);
  };

  const handleEditInjury = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInjury || !editingInjury.description) return;

    onUpdateAthlete({
      injuries: injuries.map((i) => i.id === editingInjury.id ? editingInjury : i),
    });

    setEditingInjury(null);
  };

  // Exam Handlers
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 KB";
    const k = 1024;
    if (bytes < k * k) {
      return (bytes / k).toFixed(1) + " KB";
    }
    return (bytes / (k * k)).toFixed(2) + " MB";
  };

  const handleExamFileUpload = (file: File) => {
    if (!file) return;

    const isPdf = file.type.toLowerCase().includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
    const isImg = file.type.toLowerCase().includes("image") || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name);

    if (!isPdf && !isImg) {
      toast.error("Formato inválido. Por favor envie arquivos em PDF ou Imagem (PNG, JPG, WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setNewExam((prev) => ({
        ...prev,
        fileUrl: dataUrl,
        fileName: file.name,
        fileType: isPdf ? "pdf" : "image",
        fileSize: formatBytes(file.size),
        title: prev.title || file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
      }));
      toast.success("Arquivo carregado com sucesso! Preencha os detalhes e confirme o arquivamento.");
    };
    reader.onerror = () => {
      toast.error("Erro ao ler o arquivo selecionado.");
    };
    reader.readAsDataURL(file);
  };

  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExam.title || !newExam.fileUrl) {
      toast.error("Preencha o título e selecione um arquivo (PDF ou Imagem).");
      return;
    }

    const entry: MedicalExam = {
      ...newExam,
      id: `exam-${Date.now()}`,
    };

    onUpdateAthlete({
      medicalExams: [entry, ...medicalExams],
    });

    toast.success("Exame arquivado com sucesso no histórico de DM!");
    setShowAddExamModal(false);
    
    // Reset Form
    setNewExam({
      date: getLocalDateString(),
      title: "",
      category: "Ressonância",
      fileUrl: "",
      fileName: "",
      fileType: "pdf",
      fileSize: "",
      notes: "",
      injuryId: "",
      recordedBy: role === "coach" ? "coach" : "atleta"
    });
  };

  const handleRemoveExam = (id: string) => {
    onUpdateAthlete({
      medicalExams: medicalExams.filter((e) => e.id !== id),
    });
    setConfirmDeleteExam(null);
    toast.success("Exame removido com sucesso do banco de dados.");
  };

  const getCategoryBadge = (cat: MedicalExam["category"]) => {
    switch (cat) {
      case "Ressonância":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "Ultrassom":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "Raio-X":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
      case "Tomografia":
        return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
      case "Exame de Sangue":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "Laudo Médico":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "Laudo Fisioterapêutico":
        return "bg-teal-500/20 text-teal-300 border-teal-500/30";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    }
  };

  // Filtered Exams list
  const filteredExams = useMemo(() => {
    let list = [...medicalExams].sort((a, b) => getSafeDateTime(b.date) - getSafeDateTime(a.date));
    
    if (filterExamCategory !== "todos") {
      if (filterExamCategory === "pdf") {
        list = list.filter((e) => e.fileType === "pdf");
      } else if (filterExamCategory === "image") {
        list = list.filter((e) => e.fileType === "image");
      } else {
        list = list.filter((e) => e.category === filterExamCategory);
      }
    }

    if (searchExamQuery.trim()) {
      const query = searchExamQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.fileName.toLowerCase().includes(query) ||
          (e.notes && e.notes.toLowerCase().includes(query)) ||
          e.category.toLowerCase().includes(query)
      );
    }

    return list;
  }, [medicalExams, filterExamCategory, searchExamQuery]);

  const getSeverityColor = (sev: InjuryEntry['severity']) => {
    switch (sev) {
      case "Leve": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Moderada": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Grave": return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case "Cirúrgica": return "bg-red-500/10 text-red-400 border-red-500/40";
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const getStatusColor = (status: InjuryEntry['status']) => {
    switch (status) {
      case "Ativa": return "bg-red-500/20 text-red-500 border-red-500/30";
      case "Observação": return "bg-amber-500/20 text-amber-500 border-amber-500/30";
      case "Recuperada": return "bg-emerald-500/20 text-emerald-500 border-emerald-500/30";
      default: return "bg-slate-500/25 text-slate-400 border-slate-500/30";
    }
  };

  if (showHealthReport) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-start">
          <button
            onClick={() => setShowHealthReport(false)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            <span>← Voltar para o Painel DM</span>
          </button>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-2xl overflow-auto flex justify-center">
          <HealthReport athlete={athlete} onClose={() => setShowHealthReport(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* 1. HERO SECTION & MEDICAL STATUS */}
      <div className="relative p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 backdrop-blur-3xl overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 rounded-full -mr-20 -mt-20 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full -ml-20 -mb-20 blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20 text-[9px] font-black tracking-widest text-red-400 uppercase">
              <HeartPulse className="w-3 h-3 animate-pulse" />
              DEPARTAMENTO MÉDICO & REABILITAÇÃO
            </div>
            <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white">
              CONTROLE CLÍNICO DE <span className="text-brand-primary">SAÚDE</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-xl font-medium leading-relaxed">
              Mapeamento de lesões musculares e articulares estruturado no padrão elite. Centraliza o feedback, minimiza riscos de não-contato e otimiza a comunicação multifocal (atleta, comissão técnica e responsáveis).
            </p>
          </div>

          <div className={`p-6 rounded-2xl border flex flex-col items-center md:items-end justify-center shrink-0 w-full md:w-auto ${statusGlow.color} ${statusGlow.glow} transition-all duration-300 md:max-w-xs`}>
            <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-2">
              Status Clínico do Atleta
            </span>
            <span className="text-lg font-black tracking-tight leading-none text-center md:text-right uppercase">
              {statusGlow.badge}
            </span>
            <span className="text-[9px] font-medium opacity-70 mt-2 text-center md:text-right">
              {statusGlow.label}
            </span>
          </div>
        </div>
      </div>

      {/* DM SUB-TABS NAVIGATION */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-2 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto p-1">
          <button
            onClick={() => setActiveSubTab("body-map")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeSubTab === "body-map"
                ? "bg-brand-primary text-slate-950 shadow-lg shadow-brand-primary/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Activity className="w-4 h-4" />
            Mapa Corporal Interativo (Dores 0-10)
          </button>

          <button
            onClick={() => setActiveSubTab("occurrences")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeSubTab === "occurrences"
                ? "bg-brand-primary text-slate-950 shadow-lg shadow-brand-primary/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Ocorrências / Ficha Clínica ({injuries.length})
          </button>

          <button
            onClick={() => setActiveSubTab("exams")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeSubTab === "exams"
                ? "bg-brand-primary text-slate-950 shadow-lg shadow-brand-primary/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Exames & Diagnósticos ({medicalExams.length})
          </button>
        </div>

        {role === "coach" && (
          <button
            onClick={() => setShowHealthReport(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all text-slate-300 bg-slate-950 hover:bg-slate-800 border border-slate-800 shrink-0 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            Relatório Fisiopatológico
          </button>
        )}
      </div>

      {activeSubTab === "exams" && (
        <div className="space-y-6">
          {/* EXAMS HEADER & ACTION BAR */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-brand-primary" />
                <h3 className="text-xl font-black uppercase text-white italic tracking-tight">
                  Arquivo de Exames & Diagnósticos Clínicos
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Central de armazenamento no banco de dados para laudos em PDF, imagens radiológicas (RM, US, Raio-X) e históricos de exames para consulta médica rápida.
              </p>
            </div>

            <Button
              onClick={() => setShowAddExamModal(true)}
              variant="primary"
              className="text-[10px] font-black py-3.5 px-6 tracking-widest uppercase shrink-0 shadow-lg shadow-brand-primary/10"
            >
              <Upload className="w-4 h-4" />
              + ANEXAR EXAME OU LAUDO
            </Button>
          </div>

          {/* SEARCH & FILTERS TOOLBAR */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchExamQuery}
                onChange={(e) => setSearchExamQuery(e.target.value)}
                placeholder="Buscar exames por título, laudo ou palavra-chave..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-brand-primary text-xs font-medium text-white pl-10 pr-4 py-3 rounded-xl outline-none transition-all placeholder:text-slate-500"
              />
              {searchExamQuery && (
                <button
                  onClick={() => setSearchExamQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs font-bold"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              {[
                { id: "todos", label: "Todos" },
                { id: "Ressonância", label: "Ressonância" },
                { id: "Ultrassom", label: "Ultrassom" },
                { id: "Raio-X", label: "Raio-X" },
                { id: "Tomografia", label: "Tomografia" },
                { id: "Exame de Sangue", label: "Sangue" },
                { id: "Laudo Médico", label: "Laudos" },
                { id: "pdf", label: "PDFs" },
                { id: "image", label: "Imagens" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilterExamCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    filterExamCategory === cat.id
                      ? "bg-brand-primary text-slate-950 shadow-md shadow-brand-primary/20"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* EXAMS GRID DISPLAY */}
          {filteredExams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExams.map((exam) => {
                const linkedInjury = injuries.find((i) => i.id === exam.injuryId);
                return (
                  <motion.div
                    key={exam.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-4 group relative overflow-hidden"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${getCategoryBadge(exam.category)}`}>
                          {exam.category}
                        </span>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            exam.fileType === "pdf"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          }`}>
                            {exam.fileType.toUpperCase()}
                          </span>

                          <span className="text-[10px] font-bold text-slate-500">
                            {formatDate(exam.date)}
                          </span>
                        </div>
                      </div>

                      {/* Title & File Name */}
                      <div>
                        <h4 className="text-base font-black text-white group-hover:text-brand-primary transition-colors tracking-tight line-clamp-2">
                          {exam.title}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-500 block truncate mt-0.5">
                          📄 {exam.fileName} {exam.fileSize && `(${exam.fileSize})`}
                        </span>
                      </div>

                      {/* Linked Injury Tag */}
                      {linkedInjury && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950 rounded-xl border border-slate-800 text-[9px] text-amber-400 font-bold uppercase">
                          <Paperclip className="w-3 h-3 shrink-0" />
                          <span>Ocorrência: {linkedInjury.location || "Lesão"} ({linkedInjury.description})</span>
                        </div>
                      )}

                      {/* Thumbnail or Document Preview Card */}
                      <div
                        onClick={() => setSelectedExamForViewer(exam)}
                        className="relative rounded-2xl bg-slate-950 border border-slate-800 h-36 overflow-hidden flex items-center justify-center cursor-pointer group/preview"
                      >
                        {exam.fileType === "image" ? (
                          <img
                            src={exam.fileUrl}
                            alt={exam.title}
                            className="w-full h-full object-cover group-hover/preview:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-slate-400 p-4 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover/preview:scale-110 transition-transform">
                              <FileText className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                              Documento PDF Clínico
                            </span>
                            <span className="text-[9px] text-slate-500 font-bold">
                              Clique para Visualização Rápida
                            </span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <span className="px-3 py-1.5 bg-brand-primary text-slate-950 text-[10px] font-black uppercase rounded-xl tracking-wider shadow-lg flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5" />
                            Abrir Leitor
                          </span>
                        </div>
                      </div>

                      {/* Diagnostic Notes excerpt */}
                      {exam.notes && (
                        <p className="text-xs text-slate-400 font-medium italic line-clamp-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
                          "{exam.notes}"
                        </p>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                      <button
                        onClick={() => setSelectedExamForViewer(exam)}
                        className="flex-1 py-2.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-brand-primary" />
                        <span>Visualizar</span>
                      </button>

                      <a
                        href={exam.fileUrl}
                        download={exam.fileName}
                        className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-emerald-400 rounded-xl transition-all cursor-pointer"
                        title="Baixar Arquivo"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>

                      {(role === "coach" || exam.recordedBy === "atleta") && (
                        <button
                          onClick={() => setConfirmDeleteExam(exam)}
                          className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-500 hover:text-red-400 rounded-xl transition-all cursor-pointer"
                          title="Excluir Exame"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center space-y-4 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-950/30">
              <div className="mx-auto w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                <FolderOpen className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black uppercase text-white tracking-widest">
                  Nenhum exame ou laudo arquivado
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto font-medium">
                  {searchExamQuery || filterExamCategory !== "todos"
                    ? "Nenhum resultado para os filtros aplicados."
                    : "Anexe os laudos médicos em PDF, ultrassons ou ressonâncias para arquivamento definitivo no banco de dados."}
                </p>
              </div>

              <Button
                onClick={() => setShowAddExamModal(true)}
                variant="primary"
                className="text-[10px] font-black py-3 px-6 tracking-widest uppercase inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                + ANEXAR PRIMEIRO EXAME
              </Button>
            </div>
          )}

          {/* MODAL: UPLOAD NEW EXAM */}
          <AnimatePresence>
            {showAddExamModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8"
                >
                  <button
                    onClick={() => setShowAddExamModal(false)}
                    className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-brand-primary/10 rounded-2xl border border-brand-primary/20 text-brand-primary">
                      <FileUp className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black italic uppercase tracking-tight text-white">
                        Anexar Novo Exame / Laudo Médico
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">
                        Upload e armazenamento persistente no banco de dados
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleAddExam} className="space-y-6">
                    {/* File Dropzone */}
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 px-1">
                        Arquivo do Exame (PDF ou Imagem PNG/JPG) *
                      </label>
                      
                      <div
                        onClick={() => {
                          const input = document.getElementById("exam-file-input");
                          input?.click();
                        }}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                          newExam.fileUrl
                            ? "border-emerald-500/50 bg-emerald-500/5"
                            : "border-slate-800 hover:border-brand-primary/50 bg-slate-950/60"
                        }`}
                      >
                        <input
                          id="exam-file-input"
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleExamFileUpload(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />

                        {newExam.fileUrl ? (
                          <div className="space-y-2">
                            <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                              {newExam.fileType === "pdf" ? (
                                <FileText className="w-6 h-6" />
                              ) : (
                                <ImageIcon className="w-6 h-6" />
                              )}
                            </div>
                            <div className="text-xs font-black text-white">
                              {newExam.fileName}
                            </div>
                            <div className="text-[10px] text-emerald-400 font-mono font-bold">
                              ✓ Arquivo carregado ({newExam.fileSize}) - Clique para alterar
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center">
                              <Upload className="w-6 h-6" />
                            </div>
                            <div className="text-xs font-bold text-slate-300">
                              Clique para selecionar ou arraste o arquivo aqui
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              Suporta documentos em PDF, imagens de Ressonância, Ultrassom, Raio-X ou fotos
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metadata fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 px-1">
                          Título / Identificação do Exame *
                        </label>
                        <input
                          type="text"
                          value={newExam.title}
                          onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
                          placeholder="Ex: RM de Joelho Esquerdo"
                          className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3.5 text-xs text-white font-black outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 px-1">
                          Categoria Médica
                        </label>
                        <select
                          value={newExam.category}
                          onChange={(e) => setNewExam({ ...newExam, category: e.target.value as any })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3.5 text-xs text-white font-black outline-none"
                        >
                          <option value="Ressonância" className="bg-slate-900">Ressonância Magnética (RM)</option>
                          <option value="Ultrassom" className="bg-slate-900">Ultrassonografia (USG)</option>
                          <option value="Raio-X" className="bg-slate-900">Radiografia (Raio-X)</option>
                          <option value="Tomografia" className="bg-slate-900">Tomografia Computadorizada (TC)</option>
                          <option value="Exame de Sangue" className="bg-slate-900">Exame de Sangue / CPK</option>
                          <option value="Laudo Médico" className="bg-slate-900">Laudo Médico / Atestado</option>
                          <option value="Laudo Fisioterapêutico" className="bg-slate-900">Laudo Fisioterapêutico</option>
                          <option value="Outro" className="bg-slate-900">Outro Documento</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 px-1">
                          Data da Realização
                        </label>
                        <input
                          type="date"
                          value={newExam.date}
                          onChange={(e) => setNewExam({ ...newExam, date: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3.5 text-xs text-white font-black outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 px-1">
                          Relacionar a Ocorrência do DM (Opcional)
                        </label>
                        <select
                          value={newExam.injuryId || ""}
                          onChange={(e) => setNewExam({ ...newExam, injuryId: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3.5 text-xs text-white font-black outline-none"
                        >
                          <option value="" className="bg-slate-900">Nenhum (Exame Avulso)</option>
                          {injuries.map((inj) => (
                            <option key={inj.id} value={inj.id} className="bg-slate-900">
                              [{formatDate(inj.date)}] {inj.location || "Lesão"}: {inj.description}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 px-1">
                        Resumo do Laudo / Observações Diagnósticas
                      </label>
                      <textarea
                        value={newExam.notes || ""}
                        onChange={(e) => setNewExam({ ...newExam, notes: e.target.value })}
                        placeholder="Insira aqui a conclusão do laudo radiológico ou observações do médico responsável..."
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3.5 text-xs text-white font-medium outline-none resize-none"
                      />
                    </div>

                    <div className="flex gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddExamModal(false)}
                        className="w-1/2 border border-slate-800 hover:bg-slate-950 rounded-2xl text-[10px] font-black py-4 uppercase tracking-[0.15em] text-slate-400 transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <Button
                        type="submit"
                        variant="primary"
                        className="w-1/2 py-4 text-[10px] font-black tracking-widest uppercase"
                      >
                        Salvar no Banco de Dados
                      </Button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* LIGHTBOX VIEWER MODAL */}
          <AnimatePresence>
            {selectedExamForViewer && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-4xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-6 space-y-6"
                >
                  <button
                    onClick={() => setSelectedExamForViewer(null)}
                    className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
                  >
                    <X className="w-6 h-6" />
                  </button>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getCategoryBadge(selectedExamForViewer.category)}`}>
                      {selectedExamForViewer.category}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      Data do Exame: {formatDate(selectedExamForViewer.date)}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      ({selectedExamForViewer.fileSize})
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-black uppercase text-white tracking-tight">
                      {selectedExamForViewer.title}
                    </h3>
                    <p className="text-xs font-mono text-slate-400 mt-1">
                      Arquivo: {selectedExamForViewer.fileName}
                    </p>
                  </div>

                  {/* Document / Image Viewer Box */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[350px] max-h-[60vh] overflow-auto">
                    {selectedExamForViewer.fileType === "image" ? (
                      <img
                        src={selectedExamForViewer.fileUrl}
                        alt={selectedExamForViewer.title}
                        className="max-h-[55vh] max-w-full object-contain rounded-xl shadow-2xl"
                      />
                    ) : (
                      <div className="w-full flex flex-col items-center gap-4 py-6 text-center">
                        <iframe
                          src={selectedExamForViewer.fileUrl}
                          className="w-full h-[50vh] rounded-xl border border-slate-800 bg-white"
                          title="Visualizador de PDF"
                        />
                      </div>
                    )}
                  </div>

                  {/* Notes & Linked Injury */}
                  {selectedExamForViewer.notes && (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-[10px] font-black uppercase text-brand-primary tracking-widest block">
                        Parecer Diagnóstico & Achados Clínicos:
                      </span>
                      <p className="text-xs text-slate-300 font-medium leading-relaxed italic">
                        "{selectedExamForViewer.notes}"
                      </p>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800">
                    <div className="text-[10px] font-bold text-slate-500">
                      Armazenado no banco de dados com segurança
                    </div>

                    <div className="flex items-center gap-3">
                      <a
                        href={selectedExamForViewer.fileUrl}
                        download={selectedExamForViewer.fileName}
                        className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
                      >
                        <Download className="w-4 h-4" />
                        Baixar Arquivo Original
                      </a>

                      <button
                        onClick={() => setSelectedExamForViewer(null)}
                        className="px-5 py-3 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                      >
                        Fechar Leitor
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* CONFIRM DELETE EXAM MODAL */}
          <AnimatePresence>
            {confirmDeleteExam && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-md bg-gradient-to-br from-[#020617] via-slate-950 to-[#020617] border border-red-500/20 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative space-y-6 text-center"
                >
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteExam(null)}
                    className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-2">
                    <Trash2 className="w-6 h-6" />
                  </div>

                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-widest text-red-400 uppercase">
                      CONFIRMAR EXCLUSÃO DE EXAME
                    </div>
                    <h3 className="text-xl font-black italic uppercase tracking-tight text-white">
                      Excluir Exame / Laudo?
                    </h3>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                      Você está prestes a excluir o exame <strong className="text-slate-200">"{confirmDeleteExam.title}"</strong> ({confirmDeleteExam.fileName}) do banco de dados.
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteExam(null)}
                      className="w-1/2 border border-slate-800 hover:bg-slate-950 rounded-2xl text-[10px] font-black py-4 uppercase tracking-[0.15em] text-slate-400 transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveExam(confirmDeleteExam.id)}
                      className="w-1/2 bg-red-500 border border-red-500 text-white hover:bg-transparent hover:text-red-500 rounded-2xl text-[10px] font-black py-4 uppercase tracking-[0.15em] transition-all cursor-pointer shadow-lg shadow-red-500/10"
                    >
                      Confirmar Exclusão
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* RENDER ACTIVE SUBTAB CONTENT */}
      {activeSubTab === "body-map" && (
        <InteractiveBodyMap
          athlete={athlete}
          onUpdateAthlete={onUpdateAthlete}
          role={role}
        />
      )}

      {activeSubTab === "occurrences" && (
        <>
          {/* 2. ACTIONS FOR COACH: ADD INJURY ENTRY */}
      {role === "coach" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black uppercase text-white italic tracking-tight">
              Ações Clínicas do Gestor
            </h3>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              variant={showAddForm ? "secondary" : "accent"}
              className="text-[10px] font-black py-3 px-6 tracking-widest uppercase"
            >
              {showAddForm ? "Cancelar Inserção" : "+ REGISTRAR OCORRÊNCIA"}
            </Button>
          </div>

          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-900/60 border border-slate-800 p-6 sm:p-8 rounded-3xl overflow-hidden"
              >
                <form onSubmit={handleAddInjury} className="space-y-6">
                  <h4 className="text-[10px] font-black text-brand-primary tracking-[0.2em] uppercase">
                    REGISTRAR NOVA LESÃO NO HISTÓRICO CLÍNICO ELITE
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 px-1">
                        Data da Ocorrência
                      </label>
                      <input
                        type="date"
                        value={newInjury.date}
                        onChange={(e) => setNewInjury({ ...newInjury, date: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3.5 text-xs text-white font-black outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 px-1">
                        Localização Anatômica
                      </label>
                      <select
                        value={newInjury.location}
                        onChange={(e) => setNewInjury({ ...newInjury, location: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3.5 text-xs text-white font-black outline-none"
                      >
                        {allLocations.map(loc => (
                          <option key={loc} value={loc} className="bg-slate-900">{loc}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 px-1">
                        Gravidade da Lesão
                      </label>
                      <select
                        value={newInjury.severity}
                        onChange={(e) => setNewInjury({ ...newInjury, severity: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3.5 text-xs text-white font-black outline-none"
                      >
                        <option value="Leve" className="bg-slate-900">Leve (1-7 dias)</option>
                        <option value="Moderada" className="bg-slate-900">Moderada (8-28 dias)</option>
                        <option value="Grave" className="bg-slate-900">Grave (&gt;28 dias)</option>
                        <option value="Cirúrgica" className="bg-slate-900">Cirúrgica / Complexo</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 px-1">
                        Status Clínico
                      </label>
                      <select
                        value={newInjury.status}
                        onChange={(e) => setNewInjury({ ...newInjury, status: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3.5 text-xs text-white font-black outline-none"
                      >
                        <option value="Ativa" className="bg-slate-900">Ativa (Inativo)</option>
                        <option value="Observação" className="bg-slate-900">Observação (Restrito)</option>
                        <option value="Recuperada" className="bg-slate-900">Recuperada (Apto)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 px-1">
                        Descrição / Diagnóstico Clínico
                      </label>
                      <input
                        type="text"
                        value={newInjury.description}
                        onChange={(e) => setNewInjury({ ...newInjury, description: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3.5 text-xs text-white font-black outline-none"
                        placeholder="Ex: Entorse de grau II no ligamento colateral medial (LCM)"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 px-1">
                        Estágio de Reabilitação
                      </label>
                      <select
                        value={newInjury.rehabStage}
                        onChange={(e) => setNewInjury({ ...newInjury, rehabStage: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3.5 text-xs text-white font-black outline-none"
                      >
                        <option value="Fisioterapia" className="bg-slate-900">Fisioterapia Hospitalar/Clínica</option>
                        <option value="Transição Física" className="bg-slate-900">Transição Física (Campo/Academia)</option>
                        <option value="Treino Assistido" className="bg-slate-900">Treino Assistido (Poupando área)</option>
                        <option value="Retorno Pleno" className="bg-slate-900">Retorno Pleno (Competição/Alta Int.)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 px-1">
                        Previsão Estimada de Retorno
                      </label>
                      <input
                        type="date"
                        value={newInjury.estimatedReturnDate}
                        onChange={(e) => setNewInjury({ ...newInjury, estimatedReturnDate: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3.5 text-xs text-white font-black outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 px-1">
                        Conduta Clínica e Exercícios de Reforço
                      </label>
                      <textarea
                        value={newInjury.notes}
                        onChange={(e) => setNewInjury({ ...newInjury, notes: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3.5 text-xs text-white font-black outline-none h-20 resize-none animate-none"
                        placeholder="Exercícios e medicamentos prescritos, limitações físicas e observações do fisioterapeuta."
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="accent"
                    className="w-full text-[10px] font-black py-4 uppercase tracking-[0.2em]"
                  >
                    Salvar Ocorrência Clíncia e Sincronizar Ficha
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 3. HISTORY DETAILED TIMELINE */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black uppercase text-white italic tracking-tighter">
              Linha do Tempo de Ocorrências
            </h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">
              Histórico médico completo do atleta listado cronologicamente
            </p>
          </div>

          {/* Filtering */}
          <div className="flex flex-wrap gap-2">
            {(["todos", "Ativa", "Observação", "Recuperada"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterStatus(filter)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                  filterStatus === filter
                    ? "bg-brand-primary border-brand-primary text-brand-dark"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                {filter === "todos" ? "Todas as Lesões" : filter}
              </button>
            ))}
          </div>
        </div>

        {filteredInjuries.length > 0 ? (
          <div className="space-y-4">
            {filteredInjuries.map((injury) => (
              <div
                key={injury.id}
                className={`p-6 sm:p-8 rounded-3xl bg-slate-900/40 border border-slate-800 flex flex-col md:flex-row md:items-start justify-between gap-6 relative group transition-all hover:bg-slate-900/60`}
              >
                <div className="space-y-4 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {formatDate(injury.date)}
                    </span>
                    
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${getSeverityColor(injury.severity)}`}>
                      Gravidade: {injury.severity || "Leve"}
                    </span>

                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${getStatusColor(injury.status)}`}>
                      Status: {injury.status}
                    </span>

                    {injury.location && (
                      <span className="bg-slate-800/80 text-white border border-slate-700 px-2.5 py-1 rounded-full text-[9px] font-black uppercase">
                        Área: {injury.location}
                      </span>
                    )}

                    {injury.rehabStage && (
                      <span className="bg-slate-800/80 text-brand-primary border border-brand-primary/20 px-2.5 py-1 rounded-full text-[9px] font-black uppercase">
                        Tratamento: {injury.rehabStage}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-lg font-black uppercase italic text-white group-hover:text-brand-primary tracking-tight transition-colors">
                      {injury.description}
                    </h4>
                    
                    {injury.estimatedReturnDate && injury.status !== "Recuperada" && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500 uppercase italic">
                        <Clock className="w-3.5 h-3.5" />
                        Previsão Estimada de Retorno: {formatDate(injury.estimatedReturnDate)}
                      </div>
                    )}

                    {injury.notes && (
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/50 text-xs text-slate-300 font-medium leading-relaxed mt-2 italic">
                        <span className="text-[10px] font-black text-slate-500 uppercase block mb-1 non-italic tracking-wider">
                          Observações e Conduta Clínica:
                        </span>
                        {injury.notes}
                      </div>
                    )}

                    {/* Attached exams badge */}
                    {(() => {
                      const linkedExams = medicalExams.filter((e) => e.injuryId === injury.id);
                      if (linkedExams.length === 0) return null;
                      return (
                        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5 text-brand-primary" />
                            Exames & Laudos Anexados ({linkedExams.length}):
                          </span>
                          {linkedExams.map((ex) => (
                            <button
                              key={ex.id}
                              onClick={() => {
                                setSelectedExamForViewer(ex);
                                setActiveSubTab("exams");
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-brand-primary text-[10px] font-bold text-slate-200 transition-all cursor-pointer shadow-sm"
                            >
                              {ex.fileType === "pdf" ? (
                                <FileText className="w-3.5 h-3.5 text-red-400" />
                              ) : (
                                <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                              )}
                              <span>{ex.title}</span>
                              <Eye className="w-3 h-3 text-brand-primary ml-1" />
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {role === "coach" && (
                  <div className="flex flex-row md:flex-col items-center gap-2 self-end sm:self-start md:self-auto shrink-0 mt-3 md:mt-0">
                    <button
                      onClick={() => setEditingInjury({ ...injury })}
                      className="p-2.5 px-4 text-slate-400 hover:text-[#10b981] hover:bg-[#10b981]/15 rounded-xl transition-all flex items-center justify-center gap-2 bg-slate-950/60 border border-slate-800"
                      title="Editar Ocorrência e Status"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Editar</span>
                    </button>
                    <button
                      onClick={() => setConfirmDeleteInjury(injury)}
                      className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-500/15 rounded-xl transition-all flex items-center justify-center bg-slate-950/60 border border-slate-800 animate-none shrink-0"
                      title="Excluir Ocorrência"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-slate-500 font-black uppercase text-[11px] tracking-[0.3em] border-2 border-dashed border-slate-800 rounded-3xl bg-slate-950/20">
            Nenhum registro de lesão correspondente aos filtros
          </div>
        )}
      </div>

      {/* 4. STATS BENTO GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Geral</span>
            {role === "coach" && (
              <button
                onClick={() => setShowHealthReport(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-emerald-950/20"
                title="Gerar Relatório de Saúde"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>Relatório</span>
              </button>
            )}
          </div>
          <div>
            <span className="text-4xl font-black text-white">{stats.total}</span>
            <span className="text-[9px] font-bold text-slate-400 block mt-1">Lesões registradas no histórico</span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Casos Ativos</span>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div>
            <span className="text-4xl font-black text-red-500">{stats.active}</span>
            <span className="text-[9px] font-bold text-slate-400 block mt-1">Lesões em tratamento ativo</span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sob Observação</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-4xl font-black text-amber-500">{stats.observation}</span>
            <span className="text-[9px] font-bold text-slate-400 block mt-1">Processo de transição esportiva</span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Casos Graves</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-4xl font-black text-orange-400">{stats.severeCount}</span>
            <span className="text-[9px] font-bold text-slate-400 block mt-1">Casos Graves ou com Cirurgia</span>
          </div>
        </div>
      </div>

      {/* 5. SHARING & FEEDBACK REPORTS (TREINADOR, ATLETA, PAIS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Anatomical Distribution Chart (Col 4) */}
        <div className="lg:col-span-4 p-6 sm:p-8 rounded-[2rem] bg-slate-900/50 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase text-brand-primary tracking-widest flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4" />
              MAPA ANATÔMICO DE IMPACTO
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-6 leading-relaxed">
              Mapeamento de prevalência de queixas por articulação / grupamento
            </p>
          </div>

          <div className="space-y-4 flex-grow flex flex-col justify-center">
            {allLocations.map((loc) => {
              const count = stats.locations[loc] || 0;
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={loc} className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-black uppercase">
                    <span className={count > 0 ? "text-white" : "text-slate-500"}>{loc}</span>
                    <span className={count > 0 ? "text-brand-primary" : "text-slate-500"}>
                      {count} {count === 1 ? "caso" : "casos"} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                    <motion.div 
                      className={`h-full rounded-full ${count > 0 ? "bg-brand-primary" : "bg-slate-800"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customized Clinical Feedback (Col 8) */}
        <div className="lg:col-span-8 p-6 sm:p-8 rounded-[2rem] bg-slate-900/50 border border-slate-800/80 backdrop-blur-md space-y-6">
          <div>
            <h3 className="text-xs font-black uppercase text-brand-primary tracking-widest flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-brand-primary" />
              RELATÓRIO MULTIFOCAL ELITE
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">
              Orientações, cuidados integrados e conduta sugerida para cada agente envolvido
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Coach Panel */}
            <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/60 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-brand-primary">
                  <User className="w-4 h-4" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Como Treinador</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  {stats.active > 0 ? (
                    "Ajuste rigorosamente o plano de carga do atleta. Evite treinos de impacto excêntrico para lesões ativas e preserve os grupos articulares afetados mantendo foco compensatório (ex: treinar parte superior)."
                  ) : stats.observation > 0 ? (
                    "Atleta em transição esportiva de campo. Realizar testes de assimetria de força e carga menor antes de liberar para jogos completos. Foco no volume progressivo."
                  ) : (
                    "Plena capacidade performática para o atleta. Monitorar o estresse fisiológico através do painel de Prontidão (Wellness) diário para evitar picos abruptos de fadiga."
                  )}
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800 mt-4">
                <span className="text-[9px] font-black text-brand-primary uppercase">Foco de Ajuste: Volume/Carga</span>
              </div>
            </div>

            {/* Athlete Panel */}
            <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/60 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-400">
                  <Activity className="w-4 h-4" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Como Atleta</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  {stats.active > 0 ? (
                    "Respeite o protocolo estabelecido. Aplique gelo local (20 min) após as sessões de reabilitação fisioterápica. Nunca esconda dores da equipe médica/treinador."
                  ) : stats.observation > 0 ? (
                    "Utilize bandagens, protetores ou aquecimento focado na articulação afetada. Reporte qualquer desconforto antes, durante ou após as sessões imediatamente."
                  ) : (
                    "Invista tempo em reforço preventivo (exercícios acessórios, alongamento focado nas áreas mais afetadas anteriormente no histórico clínico pessoal)."
                  )}
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800 mt-4">
                <span className="text-[9px] font-black text-blue-400 uppercase">Foco de Ajuste: Disciplina Clínica</span>
              </div>
            </div>

            {/* Parents Panel */}
            <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/60 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Users className="w-4 h-4" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Como Pais</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  {stats.active > 0 ? (
                    "Monitore a ingestão hídrica, qualidade do sono e alimentação anti-inflamatória em casa (reduzir ultraprocessados). O descanso físico domiciliar acarreta a cicatrização acelerada."
                  ) : stats.observation > 0 ? (
                    "Fique alerta à sobrecarga escolar combinada com cansaço físico. Garanta que o atleta aplique as compressas e faça repouso ativo nos dias livres."
                  ) : (
                    "Parabenize a consistência preventiva do atleta e apoie os check-ups regulares de saúde. A alimentação e sono de qualidade permanecem os pilares da saúde do atleta."
                  )}
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800 mt-4">
                <span className="text-[9px] font-black text-emerald-400 uppercase">Foco de Ajuste: Nutrição & Sono</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 6. EDITING INJURY MODAL */}
      <AnimatePresence>
        {editingInjury && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/85 backdrop-blur-lg overflow-y-auto p-4 animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-gradient-to-br from-[#020617] via-slate-950 to-[#020617] border border-white/10 rounded-[2rem] p-6 sm:p-8 md:p-10 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setEditingInjury(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-widest text-[#10b981] uppercase">
                  <Pencil className="w-3 h-3 text-[#10b981]" />
                  EDITAR REGISTRO CLÍNICO
                </div>
                <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tight text-white mb-1">
                  Editar Ocorrência de Saúde
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Modifique os parâmetros da lesão ou ative a liberação total do atleta para arquivar a alta.
                </p>
              </div>

              {/* QUICK DISCHARGE BUTTON (Liberar Atleta) */}
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h5 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Liberar Atleta para Treino Pleno
                    </h5>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-md">
                      Isso redefinirá o status da ocorrência para <strong className="text-emerald-400">Recuperada</strong> e o estágio de tratamento para <strong className="text-emerald-400">Retorno Pleno</strong>, de forma a liberar o atleta para treinar normalmente mantendo o registro em seu histórico clínico.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingInjury(prev => prev ? {
                        ...prev,
                        status: 'Recuperada',
                        rehabStage: 'Retorno Pleno',
                        estimatedReturnDate: ''
                      } : null);
                    }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shrink-0 border h-10 w-full sm:w-auto ${
                      editingInjury.status === 'Recuperada'
                        ? "bg-emerald-500 border-emerald-500 text-[#020617]"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {editingInjury.status === 'Recuperada' ? "Atleta Liberado" : "Liberar Agora"}
                  </button>
                </div>
              </div>

              <form onSubmit={handleEditInjury} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 px-1">
                      Data da Ocorrência
                    </label>
                    <input
                      type="date"
                      value={editingInjury.date}
                      onChange={(e) => setEditingInjury({ ...editingInjury, date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#10b981] rounded-xl p-3.5 text-xs text-white font-black outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 px-1">
                      Localização Anatômica
                    </label>
                    <select
                      value={editingInjury.location || "Joelho"}
                      onChange={(e) => setEditingInjury({ ...editingInjury, location: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#10b981] rounded-xl p-3.5 text-xs text-white font-black outline-none"
                    >
                      {allLocations.map(loc => (
                        <option key={loc} value={loc} className="bg-slate-900">{loc}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 px-1">
                      Gravidade da Lesão
                    </label>
                    <select
                      value={editingInjury.severity || "Leve"}
                      onChange={(e) => setEditingInjury({ ...editingInjury, severity: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#10b981] rounded-xl p-3.5 text-xs text-white font-black outline-none"
                    >
                      <option value="Leve" className="bg-slate-900">Leve (1-7 dias)</option>
                      <option value="Moderada" className="bg-slate-900">Moderada (8-28 dias)</option>
                      <option value="Grave" className="bg-slate-900">Grave (&gt;28 dias)</option>
                      <option value="Cirúrgica" className="bg-slate-900">Cirúrgica / Complexo</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 px-1">
                      Status Clínico
                    </label>
                    <select
                      value={editingInjury.status}
                      onChange={(e) => setEditingInjury({ ...editingInjury, status: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#10b981] rounded-xl p-3.5 text-xs text-white font-black outline-none"
                    >
                      <option value="Ativa" className="bg-slate-900">Ativa (Inativo)</option>
                      <option value="Observação" className="bg-slate-900">Observação (Restrito)</option>
                      <option value="Recuperada" className="bg-slate-900">Recuperada (Apto)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 px-1">
                      Descrição / Diagnóstico Clínico
                    </label>
                    <input
                      type="text"
                      value={editingInjury.description}
                      onChange={(e) => setEditingInjury({ ...editingInjury, description: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#10b981] rounded-xl p-3.5 text-xs text-white font-black outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 px-1">
                      Estágio de Reabilitação
                    </label>
                    <select
                      value={editingInjury.rehabStage || "Fisioterapia"}
                      onChange={(e) => setEditingInjury({ ...editingInjury, rehabStage: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#10b981] rounded-xl p-3.5 text-xs text-white font-black outline-none"
                    >
                      <option value="Fisioterapia" className="bg-slate-900">Fisioterapia Hospitalar/Clínica</option>
                      <option value="Transição Física" className="bg-slate-900">Transição Física (Campo/Academia)</option>
                      <option value="Treino Assistido" className="bg-slate-900">Treino Assistido (Poupando área)</option>
                      <option value="Retorno Pleno" className="bg-slate-900">Retorno Pleno (Competição/Alta Int.)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 px-1">
                      Previsão Estimada de Retorno
                    </label>
                    <input
                      type="date"
                      value={editingInjury.estimatedReturnDate || ""}
                      onChange={(e) => setEditingInjury({ ...editingInjury, estimatedReturnDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#10b981] rounded-xl p-3.5 text-xs text-white font-black outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 px-1">
                      Conduta Clínia e Exercícios de Reforço
                    </label>
                    <textarea
                      value={editingInjury.notes || ""}
                      onChange={(e) => setEditingInjury({ ...editingInjury, notes: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#10b981] rounded-xl p-3.5 text-xs text-white font-black outline-none h-20 resize-none animate-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingInjury(null)}
                    className="w-1/3 border border-slate-800 hover:bg-slate-950 rounded-2xl text-[10px] font-black py-4 uppercase tracking-[0.2em] text-slate-400 transition-all active:scale-95"
                  >
                    Descartar Alterações
                  </button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-2/3 text-[10px] font-black py-4 uppercase tracking-[0.2em]"
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. CUSTOM DELETION CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmDeleteInjury && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/85 backdrop-blur-lg overflow-y-auto p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-gradient-to-br from-[#020617] via-slate-950 to-[#020617] border border-red-500/20 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative space-y-6 text-center"
            >
              <button
                type="button"
                onClick={() => setConfirmDeleteInjury(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-2">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-widest text-red-400 uppercase">
                  CONFIRMAR EXCLUSÃO
                </div>
                <h3 className="text-xl font-black italic uppercase tracking-tight text-white">
                  Excluir Ocorrência?
                </h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Você está prestes a excluir definitivamente o registro clínico de <strong className="text-slate-200">"{confirmDeleteInjury.description}"</strong> de {formatDate(confirmDeleteInjury.date)}. Esta ação removerá permanentemente o item do histórico.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteInjury(null)}
                  className="w-1/2 border border-slate-800 hover:bg-slate-950 rounded-2xl text-[10px] font-black py-4 uppercase tracking-[0.15em] text-slate-400 transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveInjury(confirmDeleteInjury.id)}
                  className="w-1/2 bg-red-500 border border-red-500 text-white hover:bg-transparent hover:text-red-500 rounded-2xl text-[10px] font-black py-4 uppercase tracking-[0.15em] transition-all active:scale-95 shadow-lg shadow-red-500/10"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}

    </div>
  );
};

// Help button mimic to match project Button template inside App.tsx
const Button: FC<{
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "accent";
  className?: string;
  onClick?: (e: any) => void;
  type?: "button" | "submit";
}> = ({ children, variant = "primary", className = "", onClick, type = "button" }) => {
  const styles = {
    primary: "bg-brand-primary border border-brand-primary text-brand-dark hover:bg-transparent hover:text-brand-primary shadow-lg shadow-brand-primary/10",
    secondary: "bg-transparent border border-slate-800 text-slate-300 hover:bg-slate-950 hover:border-slate-700",
    accent: "bg-red-500 border border-red-500 text-white hover:bg-transparent hover:text-red-500 shadow-lg shadow-red-500/10",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-6 py-3.5 rounded-2xl font-black transition-all flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest ${styles[variant]} ${className} active:scale-95`}
    >
      {children}
    </button>
  );
};
