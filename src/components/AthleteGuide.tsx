import { normalizeExerciseLibrary, normalizeExerciseLaterality } from "../utils/exerciseLaterality";
import React, { FC, useState, useMemo, useEffect } from 'react';
import { Dumbbell, Sparkles, BookOpen, Search, ChevronDown, ChevronUp, Heart, Filter, CheckCircle2, AlertCircle, Sliders, Edit3, Trash2, Copy, Plus, Video, Play, VideoOff, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SystemGuide } from './SystemGuide';
import { ENRICHED_LIBRARY, EnrichedExercise } from '../data/exercises';
import { toast } from 'react-hot-toast';
import { ExerciseEditorModal } from './ExerciseEditorModal';
import { getEmbedVideoInfo } from '../utils';
import { LBPerformanceDecisionMatrix } from './LBPerformanceDecisionMatrix';

export interface AthleteGuideProps {
  role?: "coach" | "athlete";
}

export const AthleteGuide: FC<AthleteGuideProps> = ({ role = "coach" }) => {
  const [subTab, setSubTab] = useState<"guide" | "library" | "matrix">("guide");

  useEffect(() => {
    if (role === "athlete" && subTab === "matrix") {
      setSubTab("guide");
    }
  }, [role, subTab]);

  // Library State
  const [libSearch, setLibSearch] = useState("");
  const [libCategory, setLibCategory] = useState<string>("ALL");
  const [libDifficulty, setLibDifficulty] = useState<string>("ALL");
  const [libVideoFilter, setLibVideoFilter] = useState<"ALL" | "WITH_VIDEO" | "WITHOUT_VIDEO">("ALL");
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);

  // Load custom library and deleted exercises
  const [customLibraryExercises, setCustomLibraryExercises] = useState<EnrichedExercise[]>(() => {
    try {
      const stored = localStorage.getItem("LB_CUSTOM_LIBRARY_EXERCISES");
      return stored ? normalizeExerciseLibrary(JSON.parse(stored)) : [];
    } catch (e) {
      console.error("Erro ao carregar exercícios customizados:", e);
      return [];
    }
  });

  const [deletedExerciseIds, setDeletedExerciseIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("LB_DELETED_LIBRARY_EXERCISES");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Erro ao carregar exercícios deletados:", e);
      return [];
    }
  });

  // Keep state updated if other tabs change local storage
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const storedCustom = localStorage.getItem("LB_CUSTOM_LIBRARY_EXERCISES");
        if (storedCustom) setCustomLibraryExercises(normalizeExerciseLibrary(JSON.parse(storedCustom)));
        const storedDeleted = localStorage.getItem("LB_DELETED_LIBRARY_EXERCISES");
        if (storedDeleted) setDeletedExerciseIds(JSON.parse(storedDeleted));
      } catch (e) {
        console.error("Erro ao sincronizar localStorage:", e);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("custom-library-synced", handleStorageChange);
    // Listen to custom local events if available, or just standard intervals
    const interval = setInterval(handleStorageChange, 2000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("custom-library-synced", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const combinedLibrary = useMemo(() => {
    const customMap = new Map(customLibraryExercises.map(ex => [ex.id, ex]));
    const list: EnrichedExercise[] = [];
    
    // Built-ins
    ENRICHED_LIBRARY.forEach(builtIn => {
      if (deletedExerciseIds.includes(builtIn.id)) return;
      if (customMap.has(builtIn.id)) {
        list.push(customMap.get(builtIn.id)!);
      } else {
        list.push(builtIn);
      }
    });
    
    // Custom news
    customLibraryExercises.forEach(custom => {
      if (deletedExerciseIds.includes(custom.id)) return;
      const isOverrideOfBuiltIn = ENRICHED_LIBRARY.some(b => b.id === custom.id);
      if (!isOverrideOfBuiltIn) {
        list.push(custom);
      }
    });
    
    return list;
  }, [customLibraryExercises, deletedExerciseIds]);

  // Modals / Confirmation States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<EnrichedExercise | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<EnrichedExercise | null>(null);
  const [exerciseToClone, setExerciseToClone] = useState<EnrichedExercise | null>(null);

  const handleSaveExercise = (updated: EnrichedExercise) => {
    updated = normalizeExerciseLaterality(updated);
    let updatedList = [...customLibraryExercises];
    const index = updatedList.findIndex(x => x.id === updated.id);
    if (index >= 0) {
      updatedList[index] = updated;
    } else {
      updatedList.unshift(updated);
    }
    setCustomLibraryExercises(updatedList);
    localStorage.setItem("LB_CUSTOM_LIBRARY_EXERCISES", JSON.stringify(updatedList));
    
    // Trigger storage event so other components sync
    window.dispatchEvent(new Event("storage"));

    setIsEditorOpen(false);
    setExerciseToEdit(null);
    toast.success(`"${updated.name}" salvo com sucesso! 📚`);
  };

  const handleDeleteExercise = (id: string) => {
    const updatedDeleted = [...deletedExerciseIds, id];
    setDeletedExerciseIds(updatedDeleted);
    localStorage.setItem("LB_DELETED_LIBRARY_EXERCISES", JSON.stringify(updatedDeleted));
    
    // Also remove from custom lists if present
    const updatedCustom = customLibraryExercises.filter(x => x.id !== id);
    setCustomLibraryExercises(updatedCustom);
    localStorage.setItem("LB_CUSTOM_LIBRARY_EXERCISES", JSON.stringify(updatedCustom));
    
    // Trigger storage event
    window.dispatchEvent(new Event("storage"));

    setExerciseToDelete(null);
    toast.success("Exercício excluído da biblioteca.");
  };

  const handleCloneExercise = (item: EnrichedExercise) => {
    const newId = `custom-lib-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const cloned: EnrichedExercise = {
      ...item,
      id: newId,
      name: `${item.name} (CÓPIA)`,
      isFavorite: false,
    };
    
    const updatedList = [cloned, ...customLibraryExercises];
    setCustomLibraryExercises(updatedList);
    localStorage.setItem("LB_CUSTOM_LIBRARY_EXERCISES", JSON.stringify(updatedList));
    
    // Trigger storage event
    window.dispatchEvent(new Event("storage"));

    setExerciseToClone(null);
    toast.success(`"${item.name}" clonado com sucesso como "${cloned.name}"!`);
    
    // Automatically open editor on the cloned exercise so they can modify it
    setExerciseToEdit(cloned);
    setIsEditorOpen(true);
  };

  // Video Counts
  const videoCounts = useMemo(() => {
    let withVideo = 0;
    let withoutVideo = 0;
    combinedLibrary.forEach(item => {
      if (item.videoUrl && item.videoUrl.trim()) withVideo++;
      else withoutVideo++;
    });
    return { withVideo, withoutVideo, total: combinedLibrary.length };
  }, [combinedLibrary]);

  // Filter exercises using combinedLibrary
  const filteredExercises = useMemo(() => {
    return combinedLibrary.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(libSearch.toLowerCase()) ||
        (item.muscleGroup || "").toLowerCase().includes(libSearch.toLowerCase()) ||
        (item.movementPattern || "").toLowerCase().includes(libSearch.toLowerCase()) ||
        (item.equipment || "").toLowerCase().includes(libSearch.toLowerCase()) ||
        (item.musclesInvolved || []).some(m => m.toLowerCase().includes(libSearch.toLowerCase()));

      const matchesCategory = libCategory === "ALL" || item.category === libCategory;
      const matchesDifficulty = libDifficulty === "ALL" || item.difficulty === libDifficulty;
      const matchesVideo = 
        libVideoFilter === "ALL" ||
        (libVideoFilter === "WITH_VIDEO" && Boolean(item.videoUrl && item.videoUrl.trim())) ||
        (libVideoFilter === "WITHOUT_VIDEO" && (!item.videoUrl || !item.videoUrl.trim()));

      return matchesSearch && matchesCategory && matchesDifficulty && matchesVideo;
    });
  }, [combinedLibrary, libSearch, libCategory, libDifficulty, libVideoFilter]);

  return (
    <div className="lb-guide-hub space-y-6 pb-20">
      {/* Sub tabs navigation */}
      <nav className="lb-guide-tabs" aria-label="Guia e recursos">
        <button aria-pressed={subTab === 'guide'} onClick={() => setSubTab('guide')}><BookOpen size={17} /><span>Guia do Sistema</span></button>
        <button aria-pressed={subTab === 'library'} onClick={() => setSubTab('library')}><Dumbbell size={17} /><span>Biblioteca de Exercícios</span></button>
        {role !== 'athlete' && <button aria-pressed={subTab === 'matrix'} onClick={() => setSubTab('matrix')}><Sparkles size={17} /><span>Matriz de Decisão LB</span></button>}
      </nav>

      {subTab === "guide" && <SystemGuide role={role} />}

      {subTab === "matrix" && role !== "athlete" && (
        <div className="animate-fadeIn">
          <LBPerformanceDecisionMatrix standaloneMode />
        </div>
      )}

      {subTab === "library" && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header */}
          <div className="border-b border-slate-900 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black uppercase text-white tracking-wider">Biblioteca de Exercícios Enriquecida</h3>
              <p className="text-[10px] font-bold text-brand-primary uppercase mt-0.5 tracking-wider">
                Exos & Hawkin Dynamics Standards • {filteredExercises.length} Exercícios Encontrados
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {role === "coach" && (
                <button
                  onClick={() => {
                    setExerciseToEdit(null);
                    setIsEditorOpen(true);
                  }}
                  className="bg-[#39FF14] hover:bg-[#32e00f] text-slate-950 font-black text-[10px] px-4 py-2.5 rounded-xl transition-all uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-[#39FF14]/10 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Novo Exercício</span>
                </button>
              )}

              {/* Quick search */}
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  value={libSearch}
                  onChange={(e) => setLibSearch(e.target.value)}
                  placeholder="Buscar por nome, músculo, padrão..."
                  className="w-full bg-[#0e1322] border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary"
                />
                <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
              </div>
            </div>
          </div>

          {/* Quick Category & Difficulty Filters */}
          <div className="bg-[#0e1322]/30 border border-slate-900/60 p-5 rounded-3xl space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-brand-primary" />
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Filtrar por Categoria Biomecânica</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "ALL", label: "Todos os Exercícios" },
                  { id: "MMII", label: "MMII (Membros Inferiores)" },
                  { id: "MMSS", label: "MMSS (Membros Superiores)" },
                  { id: "Potência", label: "Potência & Saltos" },
                  { id: "Core", label: "Core & Estabilidade" },
                  { id: "Preventivo", label: "Preventivos / Reabilitação" },
                  { id: "Velocidade", label: "Velocidade & Agilidade" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setLibCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                      libCategory === cat.id
                        ? "bg-brand-primary/10 text-brand-primary border-brand-primary/30 font-extrabold"
                        : "bg-[#0c101b] text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-900" />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Nível de Dificuldade</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "ALL", label: "Todos os Níveis" },
                  { id: "Iniciante", label: "Iniciante" },
                  { id: "Intermediário", label: "Intermediário" },
                  { id: "Avançado", label: "Avançado" },
                  { id: "Elite", label: "Elite" },
                ].map((diff) => (
                  <button
                    key={diff.id}
                    onClick={() => setLibDifficulty(diff.id)}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                      libDifficulty === diff.id
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/30 font-extrabold"
                        : "bg-[#0c101b] text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    {diff.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-900" />

            {/* Video Attachment Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Filtro por Vídeo Demonstrativo</span>
                </div>
                {libVideoFilter !== "ALL" && (
                  <button
                    onClick={() => setLibVideoFilter("ALL")}
                    className="text-[8px] font-black text-slate-500 hover:text-white uppercase tracking-wider cursor-pointer"
                  >
                    REDEFINIR VÍDEO
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "ALL", label: `Todos (${videoCounts.total})`, icon: Video },
                  { id: "WITH_VIDEO", label: `🎥 Com Vídeo Anexado (${videoCounts.withVideo})`, icon: Play },
                  { id: "WITHOUT_VIDEO", label: `Sem Vídeo (${videoCounts.withoutVideo})`, icon: VideoOff },
                ].map((vf) => (
                  <button
                    key={vf.id}
                    onClick={() => setLibVideoFilter(vf.id as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border flex items-center gap-1.5 cursor-pointer ${
                      libVideoFilter === vf.id
                        ? vf.id === "WITH_VIDEO"
                          ? "bg-red-500/15 text-red-400 border-red-500/40 shadow-lg shadow-red-500/10 font-extrabold"
                          : vf.id === "WITHOUT_VIDEO"
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/40 font-extrabold"
                          : "bg-brand-primary/10 text-brand-primary border-brand-primary/30 font-extrabold"
                        : "bg-[#0c101b] text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    <span>{vf.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Exercises Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredExercises.map((item) => {
              const isExpanded = expandedExerciseId === item.id;
              return (
                <div 
                  key={item.id}
                  className={`bg-slate-900/40 border rounded-3xl transition-all overflow-hidden ${
                    isExpanded ? "border-brand-primary/40 shadow-[0_0_15px_rgba(57,255,20,0.04)]" : "border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  {/* Summary row */}
                  <div 
                    onClick={() => setExpandedExerciseId(isExpanded ? null : item.id)}
                    className="p-5 flex items-start justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                          item.category === "MMII" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          item.category === "MMSS" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                          item.category === "Potência" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          item.category === "Core" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                          item.category === "Preventivo" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                          "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          {item.category}
                        </span>
                        {item.difficulty && (
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">• {item.difficulty}</span>
                        )}
                        {item.videoUrl ? (
                          <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                            <Play className="w-2.5 h-2.5 fill-red-400" />
                            <span>Vídeo HD</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-500 border border-slate-700/50 text-[8px] font-bold uppercase tracking-widest flex items-center gap-1">
                            <Video className="w-2.5 h-2.5 text-slate-500" />
                            <span>Sem Vídeo</span>
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-white italic uppercase tracking-tight">{item.name}</h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Músculo Alvo: <span className="text-white font-bold">{item.muscleGroup || "Geral"}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {item.isFavorite && (
                        <Heart className="w-3.5 h-3.5 text-brand-primary fill-brand-primary shrink-0" />
                      )}
                      <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded block */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="border-t border-slate-800/80 overflow-hidden"
                      >
                        <div className="p-5 space-y-5 text-xs text-slate-300 bg-[#070c14]/40">
                          {/* DEMONSTRAÇÃO EM VÍDEO DO EXERCÍCIO */}
                          {(() => {
                            const videoInfo = getEmbedVideoInfo(item.videoUrl);
                            if (videoInfo) {
                              return (
                                <div className="space-y-2 bg-[#090e1a] p-4 rounded-2xl border border-red-500/25 shadow-2xl">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30 shrink-0">
                                        <Video className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <span className="text-[11px] font-black uppercase text-white tracking-wider block">
                                          Vídeo de Execução Técnica
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400">
                                          {videoInfo.type === 'youtube' ? 'YouTube HD' : videoInfo.type === 'vimeo' ? 'Vimeo HD' : 'Player de Vídeo'}
                                        </span>
                                      </div>
                                    </div>
                                    <a
                                      href={item.videoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105"
                                    >
                                      <span>Abrir Player Externo</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>

                                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl mt-2">
                                    {videoInfo.type === "direct" ? (
                                      <video src={videoInfo.embedUrl!} controls className="w-full h-full object-contain" />
                                    ) : videoInfo.embedUrl ? (
                                      <iframe
                                        src={videoInfo.embedUrl}
                                        title={`Vídeo: ${item.name}`}
                                        className="w-full h-full border-0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                      />
                                    ) : (
                                      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                                        <Video className="w-8 h-8 text-slate-600 mb-2" />
                                        <p className="text-xs text-slate-400 mb-3">Não foi possível incorporar este vídeo diretamente.</p>
                                        <a
                                          href={item.videoUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl transition-all"
                                        >
                                          Assistir Vídeo Externo ↗
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div className="bg-[#0e1322]/80 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-slate-800/80 text-slate-400 flex items-center justify-center shrink-0 border border-slate-700/60">
                                      <Video className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <div>
                                      <span className="text-[11px] font-black uppercase text-white tracking-wider block">
                                        Sem Vídeo de Execução Cadastrado
                                      </span>
                                      <p className="text-[9px] text-slate-400 font-medium">
                                        Consulte o vídeo no YouTube ou adicione o link no cadastro do exercício.
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                                    <a
                                      href={`https://www.youtube.com/results?search_query=como+fazer+${encodeURIComponent(item.name)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="px-3 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                      title="Buscar automaticamente no YouTube como realizar este exercício"
                                    >
                                      <Search className="w-3.5 h-3.5" />
                                      <span>Buscar no YouTube</span>
                                    </a>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExerciseToEdit(item);
                                        setIsEditorOpen(true);
                                      }}
                                      className="px-3 py-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/30 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                      title="Adicionar o link de vídeo para este exercício"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Add Link</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                          })()}

                          {/* Biomechanical Metadata Grid */}
                          <div className="grid grid-cols-2 gap-3 bg-[#0d1220]/60 p-4 rounded-2xl border border-slate-800">
                            {item.movementPattern && (
                              <div>
                                <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">Padrão de Movimento</span>
                                <span className="text-[10px] font-bold text-white uppercase">{item.movementPattern}</span>
                              </div>
                            )}
                            {item.physicalQuality && (
                              <div>
                                <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">Qualidade Física</span>
                                <span className="text-[10px] font-bold text-white uppercase">{item.physicalQuality}</span>
                              </div>
                            )}
                            {item.kineticChain && (
                              <div>
                                <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">Cadeia Cinética</span>
                                <span className="text-[10px] font-bold text-white uppercase">{item.kineticChain}</span>
                              </div>
                            )}
                            {item.equipment && (
                              <div>
                                <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">Equipamento</span>
                                <span className="text-[10px] font-bold text-white uppercase">{item.equipment}</span>
                              </div>
                            )}
                          </div>

                          {/* Default prescriptions */}
                          <div className="flex flex-wrap gap-4 text-[10px] bg-slate-900/60 p-3 rounded-xl border border-slate-850/60">
                            {(item.defaultSets || item.defaultReps) && (
                              <div>
                                <span className="text-slate-500 font-bold uppercase tracking-widest mr-1.5">Séries / Execução:</span>
                                <span className="text-white font-extrabold">
                                  {item.defaultSets ? `${item.defaultSets} Séries x ` : ""}
                                  {item.defaultReps}
                                  {item.defaultRepsType === "time" || item.defaultExecutionTime ? " ⏱️ (Tempo)" : " 🏋️"}
                                </span>
                              </div>
                            )}
                            {item.defaultWeight && (
                              <div>
                                <span className="text-slate-500 font-bold uppercase tracking-widest mr-1.5">Carga Base:</span>
                                <span className="text-[#39FF14] font-extrabold">{item.defaultWeight}</span>
                              </div>
                            )}
                            {item.recommendedRpe && (
                              <div>
                                <span className="text-slate-500 font-bold uppercase tracking-widest mr-1.5">PSE sugerida:</span>
                                <span className="text-amber-400 font-extrabold">{item.recommendedRpe}</span>
                              </div>
                            )}
                            {item.recommendedRest && (
                              <div>
                                <span className="text-slate-500 font-bold uppercase tracking-widest mr-1.5">Intervalo:</span>
                                <span className="text-blue-400 font-extrabold">{item.recommendedRest}</span>
                              </div>
                            )}
                          </div>

                          {/* Musculos envolvidos */}
                          {item.musclesInvolved && item.musclesInvolved.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Músculos Envolvidos</span>
                              <div className="flex flex-wrap gap-1">
                                {item.musclesInvolved.map((m, i) => (
                                  <span key={i} className="bg-slate-800 text-slate-300 text-[8px] font-bold px-2 py-0.5 rounded">
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Execucao */}
                          {item.executionSteps && item.executionSteps.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Passo a Passo de Execução</span>
                              <ol className="list-decimal list-inside space-y-1 text-[10px] font-medium leading-relaxed text-slate-400 font-sans">
                                {item.executionSteps.map((step, i) => (
                                  <li key={i} className="marker:text-brand-primary">{step}</li>
                                ))}
                              </ol>
                            </div>
                          )}

                          {/* Beneficios e erros */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {item.benefits && item.benefits.length > 0 && (
                              <div className="space-y-1.5 bg-[#0b1c11]/10 border border-emerald-950/40 p-3.5 rounded-xl">
                                <div className="flex items-center gap-1.5 text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span className="text-[9px] font-black uppercase tracking-wider">Benefícios e Adaptações</span>
                                </div>
                                <ul className="space-y-1 text-[9px] font-semibold text-slate-400 leading-relaxed list-disc list-inside">
                                  {item.benefits.map((b, i) => (
                                    <li key={i} className="marker:text-emerald-500">{b}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {item.commonErrors && item.commonErrors.length > 0 && (
                              <div className="space-y-1.5 bg-[#1a0e0e]/10 border border-rose-950/40 p-3.5 rounded-xl">
                                <div className="flex items-center gap-1.5 text-rose-400">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span className="text-[9px] font-black uppercase tracking-wider">Erros Comuns (Evitar)</span>
                                </div>
                                <ul className="space-y-1 text-[9px] font-semibold text-slate-400 leading-relaxed list-disc list-inside">
                                  {item.commonErrors.map((e, i) => (
                                    <li key={i} className="marker:text-rose-500">{e}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Progressões e Regressões */}
                          {(item.progressions || item.regressions) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] border-t border-slate-800/80 pt-3">
                              {item.regressions && item.regressions.length > 0 && (
                                <div>
                                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block mb-1">Regressão Clínica</span>
                                  <span className="text-slate-400 font-bold">{item.regressions.join(", ")}</span>
                                </div>
                              )}
                              {item.progressions && item.progressions.length > 0 && (
                                <div>
                                  <span className="text-[8px] font-black uppercase text-brand-primary tracking-wider block mb-1">Progressão de Sobrecarga</span>
                                  <span className="text-slate-400 font-bold">{item.progressions.join(", ")}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Botões de Ação para Biblioteca */}
                          {role === "coach" && (
                            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-850/65">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExerciseToEdit(item);
                                  setIsEditorOpen(true);
                                }}
                                className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Editar Exercício</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExerciseToClone(item);
                                }}
                                className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Clonar</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExerciseToDelete(item);
                                }}
                                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {filteredExercises.length === 0 && (
              <div className="col-span-2 text-center py-12 bg-slate-900/10 rounded-3xl border border-dashed border-slate-850">
                <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">Nenhum exercício encontrado na biblioteca com esses filtros.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <AnimatePresence>
        {exerciseToDelete && (
          <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0c111d] border border-slate-850 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-500">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h4 className="text-base font-black uppercase tracking-tight">Confirmar Exclusão</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                Tem certeza de que deseja excluir o exercício <strong className="text-white italic">"{exerciseToDelete.name.toUpperCase()}"</strong> da sua biblioteca?
              </p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                ⚠️ Essa ação é irreversível e removerá o exercício de todas as buscas futuras.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setExerciseToDelete(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-300 font-black text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteExercise(exerciseToDelete.id)}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-rose-600/10 cursor-pointer"
                >
                  Confirmar e Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM CLONE MODAL */}
      <AnimatePresence>
        {exerciseToClone && (
          <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0c111d] border border-slate-850 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-500">
                <Copy className="w-6 h-6 shrink-0" />
                <h4 className="text-base font-black uppercase tracking-tight">Clonar Exercício</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                Deseja criar uma cópia do exercício <strong className="text-white italic">"{exerciseToClone.name.toUpperCase()}"</strong> na sua biblioteca?
              </p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                💡 A cópia será gerada com o sufixo "(CÓPIA)" para que você possa editá-la livremente sem alterar o original.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setExerciseToClone(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-300 font-black text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleCloneExercise(exerciseToClone)}
                  className="px-5 py-2 bg-amber-500 text-slate-950 hover:bg-amber-400 font-black text-[9px] uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
                >
                  Clonar Exercício
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE EDIÇÃO / CRIAÇÃO */}
      <ExerciseEditorModal
        isOpen={isEditorOpen}
        exercise={exerciseToEdit}
        onClose={() => {
          setIsEditorOpen(false);
          setExerciseToEdit(null);
        }}
        onSave={handleSaveExercise}
      />
    </div>
  );
};
