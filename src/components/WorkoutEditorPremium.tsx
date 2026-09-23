import React, { FC, useState, useMemo, useEffect } from "react";
import { 
  Dumbbell, Search, Sparkles, Plus, Trash2, Copy, 
  ChevronDown, ChevronUp, Calendar, Zap, Clock, 
  Settings, AlertCircle, Check, Heart, History, 
  X, ChevronRight, Grid, HelpCircle, Info, Brain, 
  Cpu, Sliders, Layers, Award, ShieldAlert, CheckCircle2,
  TrendingUp, RefreshCw, Eye, BookOpen, Target, Save, Bookmark, Video, Play, Image as ImageIcon,
  Edit3, ArrowLeftRight, Repeat
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-hot-toast";
import { Workout, PrescribedExercise, AdvancedExecutionMethod } from "../types";
import { ENRICHED_LIBRARY, EnrichedExercise, getBiomechanicalDetails, BiomechanicalDetails } from "../data/exercises";
import { searchExercisesWithAi, prescribeWorkoutWithAi } from "../services/aiPerformanceService";
import { ExerciseEditorModal } from "./ExerciseEditorModal";
import { isTimeExercise, structureExerciseForMethod, getSpecialMethodMeta, calculateFieldCourtMetrics } from "../utils";
import { isFieldOrRunningExercise } from "../utils/runningBlockUtils";

interface WorkoutEditorPremiumProps {
  workout: Partial<Workout>;
  onSave: (w: Workout) => void;
  onCancel: () => void;
  athleteModality?: string;
  athleteGoal?: string;
  athleteName?: string;
  athlete?: any;
  updateAthlete?: (id: string, data: any) => Promise<void> | void;
  generateAIWorkouts?: (
    athlete: any, 
    coachInstructions?: string,
    options?: {
      periodizationStart?: string;
      periodizationEnd?: string;
      academyDays?: number[];
      courtDays?: number[];
    }
  ) => Promise<void>;
}

export function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
}

export function detectCategoryFromName(name: string, activeTab: string): string {
  if (["MMII", "MMSS", "Potência", "Velocidade", "Preventivo", "Core"].includes(activeTab)) {
    return activeTab;
  }
  const lower = (name || "").toLowerCase().trim();
  if (
    lower.includes("sprint") ||
    lower.includes("tiro") ||
    lower.includes("velocidade") ||
    lower.includes("corrida") ||
    lower.includes("agilidade") ||
    lower.includes("cone") ||
    lower.includes("tempo run") ||
    lower.includes("acelera") ||
    lower.includes("deslocamento")
  ) {
    return "Velocidade";
  }
  if (
    lower.includes("potência") ||
    lower.includes("pliometria") ||
    lower.includes("salto") ||
    lower.includes("jump") ||
    lower.includes("kettlebell") ||
    lower.includes("lpo") ||
    lower.includes("medicine") ||
    lower.includes("arremesso")
  ) {
    return "Potência";
  }
  if (
    lower.includes("agachamento") ||
    lower.includes("squat") ||
    lower.includes("leg press") ||
    lower.includes("stiff") ||
    lower.includes("rdl") ||
    lower.includes("quadríceps") ||
    lower.includes("posterior") ||
    lower.includes("panturrilha") ||
    lower.includes("coice") ||
    lower.includes("mmii") ||
    lower.includes("gêmeos")
  ) {
    return "MMII";
  }
  if (
    lower.includes("supino") ||
    lower.includes("press") ||
    lower.includes("puxada") ||
    lower.includes("remada") ||
    lower.includes("flexão") ||
    lower.includes("biceps") ||
    lower.includes("triceps") ||
    lower.includes("ombro") ||
    lower.includes("membros sup") ||
    (!lower.includes("mmii") && (lower.includes("braço") || lower.includes("peito") || lower.includes("costas")))
  ) {
    return "MMSS";
  }
  if (
    lower.includes("core") ||
    lower.includes("abdominal") ||
    lower.includes("plank") ||
    lower.includes("prancha") ||
    lower.includes("rotacional") ||
    lower.includes("estabilidade") ||
    lower.includes("infra") ||
    lower.includes("supra") ||
    lower.includes("lombar")
  ) {
    return "Core";
  }
  if (
    lower.includes("preventivo") ||
    lower.includes("mobilidade") ||
    lower.includes("manguito") ||
    lower.includes("alongamento") ||
    lower.includes("copenhagen") ||
    lower.includes("liberação") ||
    lower.includes("prevenção") ||
    lower.includes("reab") ||
    lower.includes("recuperação")
  ) {
    return "Preventivo";
  }
  return "Geral";
}

export function isExerciseInActiveCategory(
  item: EnrichedExercise,
  activeCategory: string,
  favorites: string[],
  recentAdds: string[],
  customLibraryExercises: EnrichedExercise[]
): boolean {
  if (activeCategory === "ALL") return true;
  if (activeCategory === "WITH_VIDEO") return Boolean(item.videoUrl && item.videoUrl.trim());
  if (activeCategory === "FAVORITES") return favorites.includes(item.id);
  if (activeCategory === "RECENTS") return recentAdds.includes(item.id);
  if (activeCategory === "CUSTOM") return customLibraryExercises.some(x => x.id === item.id);

  const cat = (item.category || "").toLowerCase();
  const name = (item.name || "").toLowerCase();
  const subcat = (item.subcategory || "").toLowerCase();
  const physQual = (item.physicalQuality || "").toLowerCase();
  const mGroup = (item.muscleGroup || "").toLowerCase();

  switch (activeCategory) {
    case "MMII":
      return (
        cat.includes("mmii") ||
        cat.includes("agachamento") ||
        cat.includes("dobradiça") ||
        cat.includes("extensora") ||
        cat.includes("flexora") ||
        cat.includes("panturrilha") ||
        cat.includes("unilateral") ||
        cat.includes("agachamentos") ||
        mGroup.includes("mmii") ||
        mGroup.includes("glúteo") ||
        mGroup.includes("quadríceps") ||
        mGroup.includes("posterior") ||
        mGroup.includes("isquiotibiais") ||
        mGroup.includes("adutor") ||
        subcat.includes("agachamento") ||
        subcat.includes("mmii") ||
        name.includes("agachamento") ||
        name.includes("squat") ||
        name.includes("leg press") ||
        name.includes("panturrilha") ||
        name.includes("stiff") ||
        name.includes("rdl")
      );

    case "MMSS":
      return (
        cat.includes("mmss") ||
        cat.includes("empurrar horizontal") ||
        cat.includes("empurrar vertical") ||
        cat.includes("puxar horizontal") ||
        cat.includes("puxar vertical") ||
        cat.includes("cotovelo") ||
        mGroup.includes("mmss") ||
        mGroup.includes("peito") ||
        mGroup.includes("costas") ||
        mGroup.includes("ombro") ||
        mGroup.includes("bíceps") ||
        mGroup.includes("tríceps") ||
        subcat.includes("mmss") ||
        name.includes("supino") ||
        name.includes("puxada") ||
        name.includes("remada") ||
        name.includes("biceps") ||
        name.includes("triceps") ||
        name.includes("ombro") ||
        name.includes("desenvolvimento")
      );

    case "Potência":
      return (
        cat.includes("potência") ||
        cat.includes("pliometria") ||
        cat.includes("kettlebell") ||
        cat.includes("lpo") ||
        cat.includes("medicine ball") ||
        cat.includes("arremesso") ||
        physQual.includes("potência") ||
        physQual.includes("pliometria") ||
        subcat.includes("pliometria") ||
        subcat.includes("arremesso") ||
        name.includes("pliometria") ||
        name.includes("salto") ||
        name.includes("jump") ||
        name.includes("potência") ||
        name.includes("lpo")
      );

    case "Velocidade":
      return (
        cat.includes("velocidade") ||
        cat.includes("agilidade") ||
        cat.includes("sprint") ||
        cat.includes("aceleração") ||
        cat.includes("mudança de direção") ||
        cat.includes("deslocamento") ||
        cat.includes("desaceleração") ||
        physQual.includes("velocidade") ||
        physQual.includes("aceleração") ||
        physQual.includes("agilidade") ||
        subcat.includes("velocidade") ||
        subcat.includes("agilidade") ||
        name.includes("velocidade") ||
        name.includes("sprint") ||
        name.includes("tiro") ||
        name.includes("corrida") ||
        name.includes("agilidade")
      );

    case "Preventivo":
      return (
        cat.includes("preventivo") ||
        cat.includes("prevenção") ||
        cat.includes("mobilidade") ||
        cat.includes("recuperação") ||
        cat.includes("equilíbrio") ||
        physQual.includes("prevenção") ||
        physQual.includes("mobilidade") ||
        subcat.includes("prevenção") ||
        subcat.includes("mobilidade") ||
        subcat.includes("recuperação") ||
        name.includes("preventivo") ||
        name.includes("mobilidade") ||
        name.includes("alongamento") ||
        name.includes("prevenção")
      );

    case "Core":
      return (
        cat.includes("core") ||
        cat.includes("estabilidade") ||
        cat.includes("rotacional") ||
        cat.includes("flexão de tronco") ||
        mGroup.includes("core") ||
        mGroup.includes("abdômen") ||
        subcat.includes("core") ||
        subcat.includes("estabilidade") ||
        name.includes("core") ||
        name.includes("abdominal") ||
        name.includes("prancha") ||
        name.includes("plank")
      );

    default:
      return cat === activeCategory.toLowerCase();
  }
}

export const WorkoutEditorPremium: FC<WorkoutEditorPremiumProps> = ({
  workout,
  onSave,
  onCancel,
  athleteModality = "Futebol",
  athleteGoal = "Explosão e Força",
  athleteName = "Leandro Barbosa",
  athlete,
  updateAthlete,
  generateAIWorkouts
}) => {
  const [edited, setEdited] = useState<Workout>(() => {
    const rawExercises: PrescribedExercise[] = workout.exercises ? JSON.parse(JSON.stringify(workout.exercises)) : [];
    const hasDistinctOrder = rawExercises.some((x) => 
      (typeof x.order_index === 'number' && x.order_index !== 0) || 
      (typeof (x as any).orderIndex === 'number' && (x as any).orderIndex !== 0)
    );
    const sorted = hasDistinctOrder
      ? [...rawExercises].sort((a: any, b: any) => {
          const aIdx = typeof a.order_index === 'number' ? a.order_index : (typeof (a as any).orderIndex === 'number' ? (a as any).orderIndex : 9999);
          const bIdx = typeof b.order_index === 'number' ? b.order_index : (typeof (b as any).orderIndex === 'number' ? (b as any).orderIndex : 9999);
          return aIdx - bIdx;
        })
      : rawExercises;
    const indexed = sorted.map((ex, idx) => ({ ...ex, order_index: idx }));
    return {
      ...workout,
      id: workout.id || `wk-man-${Date.now()}`,
      date: workout.date?.split("T")[0] || new Date().toISOString().split("T")[0],
      name: workout.name || (athlete?.workouts?.length ? `Treino ${String.fromCharCode(65 + ((athlete.workouts.length) % 26))}` : "Treino A"),
      phase: workout.phase || "Preparação Geral",
      status: workout.status || "planned",
      exercises: indexed,
    };
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarTab, setSidebarTab] = useState<"library" | "ai" | "progression" | "deficit">("library");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  
  // Advanced Filters State
  const [filterDifficulty, setFilterDifficulty] = useState<string>("ALL");
  const [filterQuality, setFilterQuality] = useState<string>("ALL");
  const [filterEquipment, setFilterEquipment] = useState<string>("ALL");
  const [filterMuscleGroup, setFilterMuscleGroup] = useState<string>("ALL");
  const [filterSport, setFilterSport] = useState<string>("ALL");
  const [filterPattern, setFilterPattern] = useState<string>("ALL");
  const [filterLateralType, setFilterLateralType] = useState<string>("ALL");
  const [filterVideo, setFilterVideo] = useState<string>("ALL");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterDifficulty !== "ALL") count++;
    if (filterQuality !== "ALL") count++;
    if (filterEquipment !== "ALL") count++;
    if (filterMuscleGroup !== "ALL") count++;
    if (filterSport !== "ALL") count++;
    if (filterPattern !== "ALL") count++;
    if (filterLateralType !== "ALL") count++;
    if (filterVideo !== "ALL") count++;
    return count;
  }, [filterDifficulty, filterQuality, filterEquipment, filterMuscleGroup, filterSport, filterPattern, filterLateralType, filterVideo]);

  const clearAllFilters = () => {
    setFilterDifficulty("ALL");
    setFilterQuality("ALL");
    setFilterEquipment("ALL");
    setFilterMuscleGroup("ALL");
    setFilterSport("ALL");
    setFilterPattern("ALL");
    setFilterLateralType("ALL");
    setFilterVideo("ALL");
  };

  // AI Search States
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiSearchReasoning, setAiSearchReasoning] = useState<string | null>(null);
  const [aiSearchIds, setAiSearchIds] = useState<string[] | null>(null);
  
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("lb_favorites");
      return stored ? JSON.parse(stored) : ENRICHED_LIBRARY.filter(e => e.isFavorite).map(e => e.id);
    } catch {
      return ENRICHED_LIBRARY.filter(e => e.isFavorite).map(e => e.id);
    }
  });

  const [recentAdds, setRecentAdds] = useState<string[]>([]);
  const [activeMobileTab, setActiveMobileTab] = useState<"library" | "workout">("workout");
  const [selectedDetailsExercise, setSelectedDetailsExercise] = useState<EnrichedExercise | null>(null);
  const [customExerciseName, setCustomExerciseName] = useState("");

  // Swap / Replace Exercise State (Troca de Exercício pela Biblioteca)
  const [exerciseToSwap, setExerciseToSwap] = useState<PrescribedExercise | null>(null);
  const [swapSearchQuery, setSwapSearchQuery] = useState("");
  const [swapCategoryFilter, setSwapCategoryFilter] = useState("TODOS");
  
  // Collapse & Expand States for spacious layout optimization
  const [isHeaderExpanded, setIsHeaderExpanded] = useState<boolean>(false);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);

  // AI Generator Panel States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiThoughts, setAiThoughts] = useState<string[]>([]);
  const [aiSuggestedExercises, setAiSuggestedExercises] = useState<EnrichedExercise[]>([]);
  const [aiFocusModality, setAiFocusModality] = useState(athleteModality);
  const [aiFocusGoal, setAiFocusGoal] = useState(athleteGoal);
  const [aiAgeRange, setAiAgeRange] = useState("Profissional");
  const [aiEquipmentSet, setAiEquipmentSet] = useState("Completo");
  
  // Periodization & Strategic Command States (IA Co-Pilot)
  const [iaInstructions, setIaInstructions] = useState("");
  const [isPeriodizationExpanded, setIsPeriodizationExpanded] = useState(false);
  const [iaWorkoutsLoading, setIaWorkoutsLoading] = useState(false);
  const [localPeriodizationStart, setLocalPeriodizationStart] = useState<string>(athlete?.periodizationStart || "");
  const [localPeriodizationEnd, setLocalPeriodizationEnd] = useState<string>(athlete?.periodizationEnd || "");
  const [localAcademyDays, setLocalAcademyDays] = useState<number[]>(Array.isArray(athlete?.academyDays) ? athlete.academyDays : [1, 3, 5]);
  const [localCourtDays, setLocalCourtDays] = useState<number[]>(Array.isArray(athlete?.courtDays) ? athlete.courtDays : [2, 4]);

  useEffect(() => {
    if (athlete) {
      if (athlete.periodizationStart !== undefined) setLocalPeriodizationStart(athlete.periodizationStart || "");
      if (athlete.periodizationEnd !== undefined) setLocalPeriodizationEnd(athlete.periodizationEnd || "");
      if (Array.isArray(athlete.academyDays)) setLocalAcademyDays(athlete.academyDays);
      if (Array.isArray(athlete.courtDays)) setLocalCourtDays(athlete.courtDays);
    }
  }, [athlete?.id, athlete?.periodizationStart, athlete?.periodizationEnd, athlete?.academyDays, athlete?.courtDays]);

  // Progression Studio States
  const [progressionMethod, setProgressionMethod] = useState<"linear" | "undulating" | "accumulation" | "deload" | "tapering">("linear");

  // Custom Exercises saved from AI or user customization to the library
  const [customLibraryExercises, setCustomLibraryExercises] = useState<EnrichedExercise[]>(() => {
    try {
      const stored = localStorage.getItem("LB_CUSTOM_LIBRARY_EXERCISES");
      return stored ? JSON.parse(stored) : [];
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
        if (storedCustom) setCustomLibraryExercises(JSON.parse(storedCustom));
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

  // Modals / Confirmation States for Workout Editor
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<EnrichedExercise | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<EnrichedExercise | null>(null);
  const [exerciseToClone, setExerciseToClone] = useState<EnrichedExercise | null>(null);

  const handleSaveExercise = (updated: EnrichedExercise) => {
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
    
    // Trigger storage event so other components sync
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
    
    // Trigger storage event so other components sync
    window.dispatchEvent(new Event("storage"));

    setExerciseToClone(null);
    toast.success(`"${item.name}" clonado com sucesso como "${cloned.name}"!`);
    
    // Automatically open editor on the cloned exercise so they can modify it
    setExerciseToEdit(cloned);
    setIsEditorOpen(true);
  };

  const saveExerciseToLibrary = (ex: Partial<EnrichedExercise>) => {
    if (!ex.name) {
      toast.error("Nome do exercício é obrigatório para salvar.");
      return;
    }

    const nameLower = ex.name.toLowerCase().trim();
    const isDuplicate = ENRICHED_LIBRARY.some(x => x.name.toLowerCase().trim() === nameLower) ||
                        customLibraryExercises.some(x => x.name.toLowerCase().trim() === nameLower);

    if (isDuplicate) {
      toast.error(`"${ex.name}" já existe na sua biblioteca.`);
      return;
    }

    const detectedCategory = detectCategoryFromName(ex.name, activeCategory);

    const newExercise: EnrichedExercise = {
      id: ex.id || `custom-lib-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: ex.name,
      category: detectedCategory,
      muscleGroup: ex.muscleGroup || detectedCategory,
      defaultReps: ex.defaultReps || "10",
      defaultWeight: ex.defaultWeight || "BW",
      isFavorite: false,
      physicalQuality: ex.physicalQuality || "Geral",
      kineticChain: ex.kineticChain || "Fechada",
      movementPlane: ex.movementPlane || "Sagital",
      equipment: ex.equipment || "Geral",
      difficulty: ex.difficulty || "Intermediário",
      sports: ex.sports || [aiFocusModality || "Geral"],
      physiologicalGoal: ex.physiologicalGoal || "Foco no desenvolvimento neuromuscular, força e controle de padrão de movimento.",
      scientificEvidence: ex.scientificEvidence || "Diretrizes baseadas em evidências científicas de ciência esportiva.",
      benefits: ex.benefits || ["Aumento da eficiência neuromuscular", "Melhora de força específica", "Prevenção de lesões"],
      contraindications: ex.contraindications || ["Limitação severa ou dor aguda no padrão de movimento."],
      commonErrors: ex.commonErrors || ["Desalinhamento postural", "Fase excêntrica sem controle"],
      progressions: ex.progressions || ["Aumento de carga", "Variação de velocidade"],
      regressions: ex.regressions || ["Execução adaptada", "Menor amplitude"],
      musclesInvolved: ex.musclesInvolved || [ex.muscleGroup || "Geral"],
      tags: ex.tags || ["#Customizado", "#IA"],
      videoUrl: ex.videoUrl,
      imageUrl: ex.imageUrl
    };

    const updated = [newExercise, ...customLibraryExercises];
    setCustomLibraryExercises(updated);
    localStorage.setItem("LB_CUSTOM_LIBRARY_EXERCISES", JSON.stringify(updated));
    toast.success(`"${ex.name}" salvo na biblioteca com sucesso! 📚`);
  };

  const saveAllAiSuggestedExercises = () => {
    if (aiSuggestedExercises.length === 0) return;
    let addedCount = 0;
    const updated = [...customLibraryExercises];

    aiSuggestedExercises.forEach(sug => {
      const nameLower = sug.name.toLowerCase().trim();
      const isDuplicate = ENRICHED_LIBRARY.some(x => x.name.toLowerCase().trim() === nameLower) ||
                          updated.some(x => x.name.toLowerCase().trim() === nameLower);

      if (!isDuplicate) {
        const newExercise: EnrichedExercise = {
          ...sug,
          id: sug.id.startsWith("virtual-") ? `custom-lib-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` : sug.id,
          tags: ["#IA-Salvo", "#Prescrição", ...(sug.tags || [])]
        };
        updated.unshift(newExercise);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      setCustomLibraryExercises(updated);
      localStorage.setItem("LB_CUSTOM_LIBRARY_EXERCISES", JSON.stringify(updated));
      toast.success(`${addedCount} exercícios da IA salvos na sua biblioteca! 📚`);
    } else {
      toast.error("Todos os exercícios já estão na biblioteca.");
    }
  };

  // Persist favorites
  useEffect(() => {
    localStorage.setItem("lb_favorites", JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
    toast.success("Biblioteca de favoritos atualizada!");
  };

  // Real-time muscular distribution
  const muscleDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalSets = 0;
    (edited.exercises || []).forEach(ex => {
      const group = ex.muscleGroup.split("/")[0].trim().toUpperCase();
      const s = Number(ex.sets) || 0;
      counts[group] = (counts[group] || 0) + s;
      totalSets += s;
    });

    return {
      distribution: Object.entries(counts).map(([name, value]) => ({
        name,
        sets: value,
        percent: totalSets > 0 ? Math.round((value / totalSets) * 100) : 0
      })),
      totalSets
    };
  }, [edited.exercises]);

  // Estimated metrics
  const estimatedDuration = useMemo(() => {
    let totalMinutes = 10; // warm up
    (edited.exercises || []).forEach(ex => {
      const s = Number(ex.sets) || 3;
      totalMinutes += s * 2.5; // Rest + execution
    });
    return Math.round(totalMinutes);
  }, [edited.exercises]);

  const estimatedLoad = useMemo(() => {
    let sum = 0;
    (edited.exercises || []).forEach(ex => {
      const s = Number(ex.sets) || 0;
      const r = parseInt(ex.reps) || 0;
      const wMatch = ex.weight.match(/\d+/);
      const w = wMatch ? parseInt(wMatch[0]) : 0;
      sum += s * r * (w || 1); // 1kg for BW
    });
    return sum;
  }, [edited.exercises]);

  const fieldMetrics = useMemo(() => {
    return calculateFieldCourtMetrics(edited as Workout);
  }, [edited.exercises]);

  // Actions
  const removeEx = (id: string) => {
    const remaining = (edited.exercises || []).filter((ex) => ex.id !== id);
    const reindexed = remaining.map((ex, i) => ({ ...ex, order_index: i }));
    setEdited({
      ...edited,
      exercises: reindexed,
    });
    toast.success("Exercício removido.");
  };

  const moveEx = (index: number, direction: "up" | "down") => {
    const exercises = [...(edited.exercises || [])];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= exercises.length) return;

    [exercises[index], exercises[newIndex]] = [
      exercises[newIndex],
      exercises[index],
    ];
    const reindexed = exercises.map((ex, i) => ({ ...ex, order_index: i }));
    setEdited({ ...edited, exercises: reindexed });
  };

  const addExFromLib = (
    libEx: EnrichedExercise,
    method: AdvancedExecutionMethod = "standard",
    complexTag?: string
  ) => {
    const current = edited.exercises || [];
    const prescribedSets = libEx.defaultSets && Number(libEx.defaultSets) > 0 ? Number(libEx.defaultSets) : 3;
    const repsType: 'reps' | 'time' | 'meters' = libEx.defaultRepsType || (
      libEx.defaultExecutionTime ||
      (libEx.defaultReps && (libEx.defaultReps.toLowerCase().includes("s") || libEx.defaultReps.toLowerCase().includes("min") || libEx.defaultReps.toLowerCase().includes("seg")))
        ? "time"
        : (libEx.defaultReps && libEx.defaultReps.toLowerCase().includes("m") ? "meters" : "reps")
    );
    let repVal = repsType === "time"
      ? (libEx.defaultExecutionTime || libEx.defaultReps || "30s")
      : (libEx.defaultReps || "10");

    let weightVal = libEx.defaultWeight || "BW";
    let restVal = libEx.recommendedRest || "90s";
    let blockTagVal = complexTag;
    let blockRoleVal: string | undefined = undefined;
    let intraSetVal: number | undefined = undefined;
    let blockRestVal: string | undefined = undefined;
    let clusterRepsVal: string | undefined = undefined;
    let setsVal = prescribedSets;

    if (method === "complex_contrast") {
      // Intelligently determine blockTag if not provided
      if (!blockTagVal) {
        const lastEx = current.length > 0 ? current[current.length - 1] : null;
        if (lastEx && lastEx.executionMethod === "complex_contrast" && lastEx.blockTag) {
          const pt = lastEx.blockTag;
          if (pt.endsWith("A")) blockTagVal = pt.replace("A", "B");
          else if (pt.endsWith("B")) blockTagVal = pt.replace("B", "C");
          else if (pt.endsWith("C")) blockTagVal = pt.replace("C", "D");
          else {
            const round = (parseInt(pt.charAt(0)) || 1) + 1;
            blockTagVal = `${round}A`;
          }
        } else {
          const existing = current.filter(e => e.executionMethod === "complex_contrast").length;
          const round = Math.floor(existing / 4) + 1;
          const mod = existing % 4;
          const letters = ["A", "B", "C", "D"];
          blockTagVal = `${round}${letters[mod] || "A"}`;
        }
      }

      setsVal = 3;
      if (blockTagVal.endsWith("A")) {
        blockRoleVal = "1A: Carga Pesada (PAP 80-85% 1RM)";
        weightVal = "85% 1RM";
        repVal = "3";
        restVal = "20s";
      } else if (blockTagVal.endsWith("B")) {
        blockRoleVal = "1B: Pliometria com Sobrecarga (Salto)";
        weightVal = "BW";
        repVal = "4";
        restVal = "20s";
      } else if (blockTagVal.endsWith("C")) {
        blockRoleVal = "1C: Velocidade Balística (30% 1RM)";
        weightVal = "30% 1RM";
        repVal = "4";
        restVal = "20s";
      } else if (blockTagVal.endsWith("D")) {
        blockRoleVal = "1D: Pliometria Reativa (RSI / Drop Jump)";
        weightVal = "BW";
        repVal = "4";
        restVal = "3m30s";
      }
      intraSetVal = 20;
      blockRestVal = "3m30s";
    } else if (method === "cluster") {
      clusterRepsVal = "2+2+2";
      repVal = "2+2+2";
      intraSetVal = 20;
      restVal = "2m30s";
      weightVal = "85% 1RM";
    } else if (method === "rest_pause") {
      repVal = "8 + 3 + 2";
      intraSetVal = 15;
      restVal = "2min";
      weightVal = "RPE 9";
    }

    const newEx: PrescribedExercise = {
      id: `ex-lib-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: libEx.name,
      muscleGroup: libEx.muscleGroup,
      sets: setsVal,
      reps: repVal,
      weight: weightVal,
      repsType: repsType,
      rest: restVal,
      notes: method === "complex_contrast" 
        ? `Estágio ${blockTagVal}: ${blockRoleVal}` 
        : `Foco: ${libEx.physicalQuality || 'Geral'} | RPE Alvo: ${libEx.recommendedRpe || '8'}`,
      videoUrl: libEx.videoUrl || "",
      imageUrl: libEx.imageUrl || "",
      executionMethod: method,
      blockTag: blockTagVal,
      blockRole: blockRoleVal,
      intraSetRest: intraSetVal,
      blockRest: blockRestVal,
      clusterReps: clusterRepsVal,
      trainingMode: libEx.trainingMode || "strength",
      metricType: libEx.metricType || "load",
      distanceMeters: libEx.distanceMeters,
      targetIntensity: libEx.targetIntensity,
      recoverySeconds: libEx.recoverySeconds,
      order_index: current.length
    };

    const reindexed = [...current, newEx].map((ex, i) => ({ ...ex, order_index: i }));
    setEdited(prev => ({ ...prev, exercises: reindexed }));
    setExpandedExerciseId(newEx.id); // auto-expand newly added exercise
    setRecentAdds(prev => [libEx.id, ...prev.slice(0, 4)]);

    if (method === "complex_contrast") {
      toast.success(`🇫🇷 Adicionado ao Contraste Francês: ${libEx.name} (${blockTagVal})!`, { duration: 3500, icon: "🇫🇷" });
    } else if (method === "cluster") {
      toast.success(`🎯 Adicionado como Cluster Set: ${libEx.name}!`, { duration: 3500, icon: "🎯" });
    } else if (method === "rest_pause") {
      toast.success(`🔥 Adicionado como Rest-Pause: ${libEx.name}!`, { duration: 3500, icon: "🔥" });
    } else {
      toast.success(`Prescrito: ${libEx.name} (${setsVal}x ${repVal})`);
    }
  };

  // TROCAR EXERCÍCIO EXISTENTE POR OUTRO DA BIBLIOTECA (PRESERVANDO ESTRUTURA, BLOCO E ESTÁGIO)
  const swapExerciseWithLibrary = (currentExId: string, libEx: EnrichedExercise) => {
    const current = edited.exercises || [];
    const targetIndex = current.findIndex(e => e.id === currentExId);
    if (targetIndex === -1) return;

    const oldEx = current[targetIndex];

    // Detectar se o novo exercício é isométrico ou tem tempo de contração padrão (ex: Meio Agachamento Isométrico IMTP)
    const isIsometric = (libEx.name || "").toLowerCase().includes("isométrico") || 
                        (libEx.name || "").toLowerCase().includes("isometric") ||
                        (libEx.subcategory || "").toLowerCase().includes("isometria") ||
                        (libEx.tags || []).some(t => t.toLowerCase().includes("imtp") || t.toLowerCase().includes("isometria")) ||
                        libEx.defaultRepsType === "time";

    let repsVal = oldEx.reps;
    let repsTypeVal: 'reps' | 'time' | 'meters' = oldEx.repsType || "reps";
    let weightVal = oldEx.weight;
    let restVal = oldEx.rest;

    if (isIsometric) {
      repsVal = libEx.defaultExecutionTime || libEx.defaultReps || "5s";
      repsTypeVal = "time";
      // Se for estágio 1A do Contraste Francês, carga padrão de esforço máximo isométrico (MVC)
      if (oldEx.executionMethod === "complex_contrast" && (oldEx.blockTag || "").endsWith("A")) {
        weightVal = libEx.defaultWeight || "100% MVC";
      }
    } else {
      // Se era time e o novo é repetições normais dinâmicas
      if (oldEx.repsType === "time" && !isIsometric) {
        repsVal = libEx.defaultReps || "4";
        repsTypeVal = "reps";
      }
    }

    let notesVal = oldEx.notes || "";
    if (oldEx.executionMethod === "complex_contrast") {
      notesVal = `Estágio ${oldEx.blockTag || "1A"}: ${oldEx.blockRole || "PAP / Contraste"} • ${libEx.name}`;
    } else if (!notesVal || notesVal.includes("Foco:") || notesVal.includes("RPE")) {
      notesVal = `Foco: ${libEx.physicalQuality || 'Geral'} | RPE Alvo: ${libEx.recommendedRpe || '8-10'}`;
    }

    const updatedEx: PrescribedExercise = {
      ...oldEx,
      name: libEx.name,
      muscleGroup: libEx.muscleGroup,
      videoUrl: libEx.videoUrl || "",
      imageUrl: libEx.imageUrl || "",
      notes: notesVal,
      reps: repsVal,
      repsType: repsTypeVal,
      weight: weightVal,
      rest: restVal,
    };

    const newExercises = [...current];
    newExercises[targetIndex] = { ...updatedEx, order_index: targetIndex };

    setEdited(prev => ({
      ...prev,
      exercises: newExercises.map((ex, i) => ({ ...ex, order_index: i }))
    }));

    setExpandedExerciseId(updatedEx.id);
    setExerciseToSwap(null);
    setSwapSearchQuery("");

    const methodTag = oldEx.executionMethod === "complex_contrast"
      ? ` (mantido Estágio ${oldEx.blockTag || "1A"} • Contraste Francês 🇫🇷)`
      : oldEx.executionMethod === "cluster"
      ? " (mantido Cluster Set 🎯)"
      : oldEx.executionMethod === "rest_pause"
      ? " (mantido Rest-Pause 🔥)"
      : "";

    toast.success(
      `Exercício trocado: "${oldEx.name}" ➔ "${libEx.name}"${methodTag}!`,
      { duration: 4500, icon: "🔄" }
    );
  };

  const addCustomEx = () => {
    if (!customExerciseName.trim()) {
      toast.error("Insira o nome do exercício customizado.");
      return;
    }
    const detectedCategory = detectCategoryFromName(customExerciseName.trim(), activeCategory);
    
    // Look up in the combined library (defaults + custom exercises)
    let matchedEx = combinedLibrary.find(x => x.name.toLowerCase().trim() === customExerciseName.trim().toLowerCase());
    if (!matchedEx) {
      // Try substring match: find first exercise that contains or is contained in the customExerciseName
      const typedLower = customExerciseName.trim().toLowerCase();
      matchedEx = combinedLibrary.find(x => {
        const nameLower = x.name.toLowerCase().trim();
        return nameLower.includes(typedLower) || typedLower.includes(nameLower);
      });
    }
    
    const current = edited.exercises || [];
    const prescribedSets = matchedEx?.defaultSets && Number(matchedEx.defaultSets) > 0 ? Number(matchedEx.defaultSets) : 3;
    const repsType: 'reps' | 'time' | 'meters' = matchedEx?.defaultRepsType || (
      matchedEx?.defaultExecutionTime ||
      (matchedEx?.defaultReps && (matchedEx.defaultReps.toLowerCase().includes("s") || matchedEx.defaultReps.toLowerCase().includes("min") || matchedEx.defaultReps.toLowerCase().includes("seg")))
        ? "time"
        : (matchedEx?.defaultReps && matchedEx.defaultReps.toLowerCase().includes("m") ? "meters" : "reps")
    );
    const repVal = repsType === "time"
      ? (matchedEx?.defaultExecutionTime || matchedEx?.defaultReps || "30s")
      : (matchedEx?.defaultReps || "10");

    const newEx: PrescribedExercise = {
      id: `ex-custom-${Date.now()}`,
      name: customExerciseName.trim(),
      muscleGroup: matchedEx?.muscleGroup || (detectedCategory !== "Geral" ? detectedCategory : "Geral"),
      sets: prescribedSets,
      reps: repVal,
      weight: matchedEx?.defaultWeight || "BW",
      repsType: repsType,
      rest: matchedEx?.recommendedRest || "60s",
      trainingMode: matchedEx?.trainingMode || "strength",
      metricType: matchedEx?.metricType || "load",
      distanceMeters: matchedEx?.distanceMeters,
      targetIntensity: matchedEx?.targetIntensity,
      recoverySeconds: matchedEx?.recoverySeconds,
      videoUrl: matchedEx?.videoUrl || "",
      imageUrl: matchedEx?.imageUrl || "",
      order_index: current.length
    };

    const reindexed = [...current, newEx].map((ex, i) => ({ ...ex, order_index: i }));
    setEdited({ ...edited, exercises: reindexed });
    setExpandedExerciseId(newEx.id); // auto-expand newly custom exercise
    setCustomExerciseName("");
    toast.success(`Customizado adicionado (${detectedCategory}): ${newEx.name} (${prescribedSets}x ${repVal})`);
  };

  const addDeficitCorrectiveBlock = (deficitName: string, exerciseNames: string[]) => {
    const toAdd: EnrichedExercise[] = [];
    exerciseNames.forEach(name => {
      const match = combinedLibrary.find(x => x.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(x.name.toLowerCase()));
      if (match) toAdd.push(match);
    });

    if (toAdd.length === 0) {
      toast.error("Nenhum exercício correspondente encontrado na biblioteca.");
      return;
    }

    const newExs = toAdd.map((libEx, idx) => {
      const prescribedSets = libEx.defaultSets && Number(libEx.defaultSets) > 0 ? Number(libEx.defaultSets) : 3;
      const repsType: 'reps' | 'time' | 'meters' = libEx.defaultRepsType || (
        libEx.defaultExecutionTime ||
        (libEx.defaultReps && (libEx.defaultReps.toLowerCase().includes("s") || libEx.defaultReps.toLowerCase().includes("min") || libEx.defaultReps.toLowerCase().includes("seg")))
          ? "time"
          : (libEx.defaultReps && libEx.defaultReps.toLowerCase().includes("m") ? "meters" : "reps")
      );
      const repVal = repsType === "time"
        ? (libEx.defaultExecutionTime || libEx.defaultReps || "30s")
        : (libEx.defaultReps || "10");

      const newEx: PrescribedExercise = {
        id: `ex-deficit-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        name: libEx.name,
        muscleGroup: libEx.muscleGroup,
        sets: prescribedSets,
        reps: repVal,
        weight: libEx.defaultWeight || "BW",
        repsType: repsType,
        rest: libEx.recommendedRest || "90s",
        notes: `Bloco Corretivo IA: Foco em Corrigir ${deficitName} | VBT: Máxima Velocidade`,
        videoUrl: libEx.videoUrl || "",
        imageUrl: libEx.imageUrl || ""
      };
      return newEx;
    });

    setEdited(prev => {
      const current = prev.exercises || [];
      const combined = [...current, ...newExs].map((ex, i) => ({ ...ex, order_index: i }));
      return {
        ...prev,
        exercises: combined
      };
    });
    toast.success(`Bloco de Correção (${deficitName}) com ${newExs.length} exercícios prescrito!`);
  };


  const updateExFields = (id: string, updates: Partial<PrescribedExercise>) => {
    setEdited(prev => ({
      ...prev,
      exercises: (prev.exercises || []).map((ex, i) => {
        if (ex.id === id) {
          const updated = { ...ex, ...updates, order_index: i };
          if (updates.repsType === "time") {
            updated.repsType = "time";
          }
          return updated;
        }
        return { ...ex, order_index: i };
      }),
    }));
  };

  const updateExField = (id: string, field: keyof PrescribedExercise, value: any) => {
    setEdited(prev => ({
      ...prev,
      exercises: (prev.exercises || []).map((ex, i) => {
        if (ex.id === id) {
          const updated = { ...ex, [field]: value, order_index: i };
          if (field === "repsType" && value === "time") {
            updated.repsType = "time";
          }
          return updated;
        }
        return { ...ex, order_index: i };
      }),
    }));
  };

  const duplicateBlock = (ex: PrescribedExercise) => {
    const duplicated: PrescribedExercise = {
      ...ex,
      id: `ex-dup-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `${ex.name} (Cópia)`
    };
    const current = edited.exercises || [];
    const reindexed = [...current, duplicated].map((e, i) => ({ ...e, order_index: i }));
    setEdited({
      ...edited,
      exercises: reindexed
    });
    setExpandedExerciseId(duplicated.id); // auto-expand duplicated exercise
    toast.success("Bloco de exercício duplicado!");
  };

  const duplicateEntireWorkout = () => {
    if ((edited.exercises || []).length === 0) {
      toast.error("O treino está vazio!");
      return;
    }
    const current = edited.exercises || [];
    const duplicatedExercises = current.map(ex => ({
      ...ex,
      id: `ex-dup-wk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    }));
    const reindexed = [...current, ...duplicatedExercises].map((e, i) => ({ ...e, order_index: i }));
    setEdited({
      ...edited,
      exercises: reindexed
    });
    toast.success(`Duplicado! Total de ${edited.exercises.length} novos exercícios adicionados.`);
  };

  // MÉTODOS AVANÇADOS DE FORÇA & POTÊNCIA (S&C DE ELITE)
  // Adiciona um Bloco de Contraste Francês Completo (4 Estágios: 1A, 1B, 1C, 1D)
  const addFrenchContrastBlock = () => {
    const groupId = `complex_fct_${Date.now()}`;
    const existingComplexCount = (edited.exercises || []).filter(e => e.executionMethod === "complex_contrast").length;
    const roundNumber = Math.floor(existingComplexCount / 4) + 1;
    
    const blockExs: PrescribedExercise[] = [
      {
        id: `ex-fct-1a-${Date.now()}-1`,
        name: "Agachamento Livre (Back Squat)",
        muscleGroup: "Membros Inferiores",
        sets: 3,
        reps: "3",
        weight: "85% 1RM",
        rest: "20s",
        notes: "Estágio 1A: Carga Pesada (Potenciação Pós-Ativação - PAPE). Movimento com máxima intenção concêntrica.",
        executionMethod: "complex_contrast",
        blockGroupId: groupId,
        blockTag: `${roundNumber}A`,
        blockType: "french_contrast",
        blockRole: "1A: Carga Pesada (PAP 80-85% 1RM)",
        intraSetRest: 20,
        blockRest: "3m30s"
      },
      {
        id: `ex-fct-1b-${Date.now()}-2`,
        name: "Hurdle Jumps / Saltos sobre Barreiras",
        muscleGroup: "Potência / Pliometria",
        sets: 3,
        reps: "4",
        weight: "BW",
        rest: "20s",
        notes: "Estágio 1B: Pliometria com Sobrecarga / Esforço Máximo. Mínimo tempo de contato com o solo.",
        executionMethod: "complex_contrast",
        blockGroupId: groupId,
        blockTag: `${roundNumber}B`,
        blockType: "french_contrast",
        blockRole: "1B: Pliometria com Sobrecarga (Salto)",
        intraSetRest: 20,
        blockRest: "3m30s"
      },
      {
        id: `ex-fct-1c-${Date.now()}-3`,
        name: "Trap Bar Jump Squat (ou Halteres)",
        muscleGroup: "Potência Balística",
        sets: 3,
        reps: "4",
        weight: "30% 1RM",
        rest: "20s",
        notes: "Estágio 1C: Velocidade Balística com Carga Leve. Acelerar através de toda a amplitude.",
        executionMethod: "complex_contrast",
        blockGroupId: groupId,
        blockTag: `${roundNumber}C`,
        blockType: "french_contrast",
        blockRole: "1C: Velocidade Balística (30% 1RM)",
        intraSetRest: 20,
        blockRest: "3m30s"
      },
      {
        id: `ex-fct-1d-${Date.now()}-4`,
        name: "Drop Jump Reativo (RSI)",
        muscleGroup: "Pliometria Reativa",
        sets: 3,
        reps: "4",
        weight: "BW",
        rest: "3m30s",
        notes: "Estágio 1D: Pliometria Reativa Rápida. Foco em rigidez de tornozelo (stiffness) e tempo de contato mínimo.",
        executionMethod: "complex_contrast",
        blockGroupId: groupId,
        blockTag: `${roundNumber}D`,
        blockType: "french_contrast",
        blockRole: "1D: Pliometria Reativa (RSI / Drop Jump)",
        intraSetRest: 20,
        blockRest: "3m30s"
      }
    ];

    const current = edited.exercises || [];
    const reindexed = [...current, ...blockExs].map((e, i) => ({ ...e, order_index: i }));
    setEdited({
      ...edited,
      exercises: reindexed
    });
    setExpandedExerciseId(blockExs[0].id);
    toast.success("🇫🇷 Bloco de Contraste Francês (4 Estágios) adicionado com sucesso!", { duration: 4000, icon: "🇫🇷" });
  };

  // Adiciona um Par Contrastado Clássico (1A + 1B)
  const addClassicPapBlock = () => {
    const groupId = `complex_pap_${Date.now()}`;
    const existingComplexCount = (edited.exercises || []).filter(e => e.executionMethod === "complex_contrast").length;
    const roundNumber = Math.floor(existingComplexCount / 2) + 1;
    
    const blockExs: PrescribedExercise[] = [
      {
        id: `ex-pap-1a-${Date.now()}-1`,
        name: "Back Squat ou Trap Bar Pesado",
        muscleGroup: "Membros Inferiores",
        sets: 3,
        reps: "3",
        weight: "85% 1RM",
        rest: "90s",
        notes: "1A: Estímulo Condicionante PAP. Descanso intermediário de 90s para dissipação da fadiga e aproveitamento da potenciação.",
        executionMethod: "complex_contrast",
        blockGroupId: groupId,
        blockTag: `${roundNumber}A`,
        blockType: "pap_classic",
        blockRole: "1A: Carga Pesada (PAP 80-85% 1RM)",
        intraSetRest: 90,
        blockRest: "2m30s"
      },
      {
        id: `ex-pap-1b-${Date.now()}-2`,
        name: "Salto Vertical CMJ ou Tuck Jump",
        muscleGroup: "Potência Pliométrica",
        sets: 3,
        reps: "5",
        weight: "BW",
        rest: "2m30s",
        notes: "1B: Expressão Balística Máxima potencializada pelo PAP.",
        executionMethod: "complex_contrast",
        blockGroupId: groupId,
        blockTag: `${roundNumber}B`,
        blockType: "pap_classic",
        blockRole: "1B: Pliometria com Sobrecarga (Salto)",
        intraSetRest: 90,
        blockRest: "2m30s"
      }
    ];

    const current = edited.exercises || [];
    const reindexed = [...current, ...blockExs].map((e, i) => ({ ...e, order_index: i }));
    setEdited({
      ...edited,
      exercises: reindexed
    });
    setExpandedExerciseId(blockExs[0].id);
    toast.success("⚡ Complex PAP Clássico (1A + 1B) adicionado!", { duration: 3500, icon: "⚡" });
  };

  // Adiciona Exercício em Cluster Set
  const addClusterSetTemplate = () => {
    const clusterEx: PrescribedExercise = {
      id: `ex-cluster-${Date.now()}`,
      name: "Agachamento ou Supino (Cluster Set)",
      muscleGroup: "Força Pura / VBT",
      sets: 4,
      reps: "2+2+2",
      weight: "85% 1RM",
      rest: "2m30s",
      notes: "Série em Cluster: Realize 2 reps, descanse 20s na barra, 2 reps, descanse 20s, 2 reps finais. Mantenha alta velocidade concêntrica.",
      executionMethod: "cluster",
      clusterReps: "2+2+2",
      intraSetRest: 20
    };

    const current = edited.exercises || [];
    const reindexed = [...current, clusterEx].map((e, i) => ({ ...e, order_index: i }));
    setEdited({
      ...edited,
      exercises: reindexed
    });
    setExpandedExerciseId(clusterEx.id);
    toast.success("🎯 Cluster Set (2+2+2 • 20s intra-pausa) adicionado!", { icon: "🎯" });
  };

  // Adiciona Exercício em Rest-Pause
  const addRestPauseTemplate = () => {
    const restPauseEx: PrescribedExercise = {
      id: `ex-rp-${Date.now()}`,
      name: "Puxada Alta ou Desenvolvimento (Rest-Pause)",
      muscleGroup: "Hipertrofia Funcional",
      sets: 3,
      reps: "8 + 3 + 2",
      weight: "RPE 9",
      rest: "2min",
      notes: "Rest-Pause: Realize 8 reps até próximo da falha, pause 15s respirando fundo, mais 3 reps, pause 15s, mais 2 reps finais.",
      executionMethod: "rest_pause",
      intraSetRest: 15
    };

    const current = edited.exercises || [];
    const reindexed = [...current, restPauseEx].map((e, i) => ({ ...e, order_index: i }));
    setEdited({
      ...edited,
      exercises: reindexed
    });
    setExpandedExerciseId(restPauseEx.id);
    toast.success("🔥 Rest-Pause (8+3+2 • 15s intra-pausa) adicionado!", { icon: "🔥" });
  };

  // Adiciona Exercício em Drop-Set Triplo
  const addDropSetTemplate = () => {
    const dropSetEx: PrescribedExercise = {
      id: `ex-ds-${Date.now()}`,
      name: "Elevação Lateral ou Extensora (Drop-Set Triplo)",
      muscleGroup: "Hipertrofia Funcional",
      sets: 3,
      reps: "8+8+8",
      weight: "75% 1RM (-20% por queda)",
      rest: "2min",
      notes: "Drop-Set Triplo: 8 reps com carga inicial -> redução imediata de 20-25% (6-8 reps) -> redução de 20% até a falha técnica.",
      executionMethod: "drop_set",
      intraSetRest: 5
    };
    const current = edited.exercises || [];
    const reindexed = [...current, dropSetEx].map((e, i) => ({ ...e, order_index: i }));
    setEdited({ ...edited, exercises: reindexed });
    setExpandedExerciseId(dropSetEx.id);
    toast.success("📉 Drop-Set Triplo (8+8+8) adicionado!", { icon: "📉" });
  };

  // Adiciona Par em Bi-Set
  const addBiSetTemplate = () => {
    const groupId = `biset_${Date.now()}`;
    const blockExs: PrescribedExercise[] = [
      {
        id: `ex-bi-1a-${Date.now()}-1`,
        name: "Supino Reto com Barra ou Halteres",
        muscleGroup: "Peitoral",
        sets: 3,
        reps: "10-12",
        weight: "75% 1RM",
        rest: "10s",
        notes: "Bi-Set 1A: Exercício Composto Multiarticular. Transição rápida (10s) direta para o exercício 1B.",
        executionMethod: "bi_set",
        blockGroupId: groupId,
        blockTag: "1A",
        blockRole: "1A: Exercício Base / Composto",
        intraSetRest: 10,
        blockRest: "90s"
      },
      {
        id: `ex-bi-1b-${Date.now()}-2`,
        name: "Crucifixo com Halteres ou Crossover",
        muscleGroup: "Peitoral Isolado",
        sets: 3,
        reps: "12-15",
        weight: "70% 1RM",
        rest: "90s",
        notes: "Bi-Set 1B: Exercício Isolador Sinergista. Descanso completo de 90s ao final do par.",
        executionMethod: "bi_set",
        blockGroupId: groupId,
        blockTag: "1B",
        blockRole: "1B: Exercício Isolador / Complementar",
        intraSetRest: 10,
        blockRest: "90s"
      }
    ];
    const current = edited.exercises || [];
    const reindexed = [...current, ...blockExs].map((e, i) => ({ ...e, order_index: i }));
    setEdited({ ...edited, exercises: reindexed });
    setExpandedExerciseId(blockExs[0].id);
    toast.success("🔗 Bi-Set (1A Composto + 1B Isolador) adicionado!", { icon: "🔗" });
  };

  // Adiciona Par em Super-Set (Antagonista)
  const addSuperSetTemplate = () => {
    const groupId = `superset_${Date.now()}`;
    const blockExs: PrescribedExercise[] = [
      {
        id: `ex-ss-1a-${Date.now()}-1`,
        name: "Rosca Direta com Barra W (Bíceps)",
        muscleGroup: "Bíceps Braquial",
        sets: 3,
        reps: "10-12",
        weight: "75% 1RM",
        rest: "10s",
        notes: "Super-Set 1A: Agonista. Transição imediata para o músculo antagonista.",
        executionMethod: "super_set",
        blockGroupId: groupId,
        blockTag: "1A",
        blockRole: "1A: Músculo Agonista",
        intraSetRest: 10,
        blockRest: "90s"
      },
      {
        id: `ex-ss-1b-${Date.now()}-2`,
        name: "Tríceps Testa ou Pulley (Tríceps)",
        muscleGroup: "Tríceps Braquial",
        sets: 3,
        reps: "10-12",
        weight: "75% 1RM",
        rest: "90s",
        notes: "Super-Set 1B: Antagonista. Recuperação completa de 90s a 2min ao finalizar o par.",
        executionMethod: "super_set",
        blockGroupId: groupId,
        blockTag: "1B",
        blockRole: "1B: Músculo Antagonista",
        intraSetRest: 10,
        blockRest: "90s"
      }
    ];
    const current = edited.exercises || [];
    const reindexed = [...current, ...blockExs].map((e, i) => ({ ...e, order_index: i }));
    setEdited({ ...edited, exercises: reindexed });
    setExpandedExerciseId(blockExs[0].id);
    toast.success("⚔️ Super-Set Antagonista (Bíceps + Tríceps) adicionado!", { icon: "⚔️" });
  };

  // Adiciona Trio em Tri-Set
  const addTriSetTemplate = () => {
    const groupId = `triset_${Date.now()}`;
    const blockExs: PrescribedExercise[] = [
      {
        id: `ex-tri-1a-${Date.now()}-1`,
        name: "Desenvolvimento com Halteres",
        muscleGroup: "Deltoide Anterior / Geral",
        sets: 3,
        reps: "10",
        weight: "75% 1RM",
        rest: "10s",
        notes: "Tri-Set 1A: Movimento multiarticular principal.",
        executionMethod: "tri_set",
        blockGroupId: groupId,
        blockTag: "1A",
        blockRole: "1A: Composto Principal",
        intraSetRest: 10,
        blockRest: "2min"
      },
      {
        id: `ex-tri-1b-${Date.now()}-2`,
        name: "Elevação Lateral com Halteres",
        muscleGroup: "Deltoide Lateral",
        sets: 3,
        reps: "12",
        weight: "70% 1RM",
        rest: "10s",
        notes: "Tri-Set 1B: Isolamento porção média. Sem descanso.",
        executionMethod: "tri_set",
        blockGroupId: groupId,
        blockTag: "1B",
        blockRole: "1B: Isolamento Lateral",
        intraSetRest: 10,
        blockRest: "2min"
      },
      {
        id: `ex-tri-1c-${Date.now()}-3`,
        name: "Crucifixo Invertido com Halteres",
        muscleGroup: "Deltoide Posterior",
        sets: 3,
        reps: "15",
        weight: "65% 1RM",
        rest: "2min",
        notes: "Tri-Set 1C: Porção posterior. Descanso completo de 2min após o 3º exercício.",
        executionMethod: "tri_set",
        blockGroupId: groupId,
        blockTag: "1C",
        blockRole: "1C: Isolamento Posterior",
        intraSetRest: 10,
        blockRest: "2min"
      }
    ];
    const current = edited.exercises || [];
    const reindexed = [...current, ...blockExs].map((e, i) => ({ ...e, order_index: i }));
    setEdited({ ...edited, exercises: reindexed });
    setExpandedExerciseId(blockExs[0].id);
    toast.success("🔱 Tri-Set (3 Exercícios Sequenciais) adicionado!", { icon: "🔱" });
  };

  // Adiciona GVT (German Volume Training 10x10)
  const addGvtTemplate = () => {
    const gvtEx: PrescribedExercise = {
      id: `ex-gvt-${Date.now()}`,
      name: "Agachamento Livre ou Supino Reto (GVT)",
      muscleGroup: "Força / Volume Máximo",
      sets: 10,
      reps: "10",
      weight: "60% 1RM",
      rest: "60s",
      notes: "German Volume Training (GVT): 10 séries estritas de 10 reps a 60% 1RM. Descanso fixo e rigoroso de 60s entre todas as séries.",
      executionMethod: "gvt",
      intraSetRest: 60
    };
    const current = edited.exercises || [];
    const reindexed = [...current, gvtEx].map((e, i) => ({ ...e, order_index: i }));
    setEdited({ ...edited, exercises: reindexed });
    setExpandedExerciseId(gvtEx.id);
    toast.success("🇩🇪 GVT 10x10 (Volume Alemão) adicionado!", { icon: "🇩🇪" });
  };

  // Adiciona Myo-Reps
  const addMyoRepsTemplate = () => {
    const myoEx: PrescribedExercise = {
      id: `ex-myo-${Date.now()}`,
      name: "Puxada Frontal ou Elevação Lateral (Myo-Reps)",
      muscleGroup: "Hipertrofia Eficiente",
      sets: 4,
      reps: "12 + 4x3",
      weight: "70% 1RM (12RM)",
      rest: "2min",
      notes: "Myo-Reps: Série de ativação (12-15 reps @ RPE 9) + 4 mini-sets de 3 reps com micro-pausa de 15s (5 respirações profundas).",
      executionMethod: "myo_reps",
      intraSetRest: 15
    };
    const current = edited.exercises || [];
    const reindexed = [...current, myoEx].map((e, i) => ({ ...e, order_index: i }));
    setEdited({ ...edited, exercises: reindexed });
    setExpandedExerciseId(myoEx.id);
    toast.success("🧬 Myo-Reps (Ativação + 4 Mini-sets) adicionado!", { icon: "🧬" });
  };

  // Adiciona Wave Loading (Ondulatório)
  const addWaveLoadingTemplate = () => {
    const waveEx: PrescribedExercise = {
      id: `ex-wave-${Date.now()}`,
      name: "Agachamento ou Terra (Wave Loading)",
      muscleGroup: "Força Máxima Neuromuscular",
      sets: 6,
      reps: "7-5-3 / 7-5-3",
      weight: "Onda 1: 75-80-85% | Onda 2: 77.5-82.5-87.5%",
      rest: "2m30s",
      notes: "Wave Loading: Onda 1 (7 reps @ 75%, 5 reps @ 80%, 3 reps @ 85%) -> Pausa 2m30s -> Onda 2 potencializada (7 reps @ 77.5%, 5 reps @ 82.5%, 3 reps @ 87.5%).",
      executionMethod: "wave_loading",
      intraSetRest: 120
    };
    const current = edited.exercises || [];
    const reindexed = [...current, waveEx].map((e, i) => ({ ...e, order_index: i }));
    setEdited({ ...edited, exercises: reindexed });
    setExpandedExerciseId(waveEx.id);
    toast.success("🌊 Wave Loading Ondulatório (7-5-3 / 7-5-3) adicionado!", { icon: "🌊" });
  };

  // Adiciona Tiros / RSA (Campo & Velocidade)
  const addSprintRsaTemplate = () => {
    const rsaEx: PrescribedExercise = {
      id: `ex-rsa-${Date.now()}`,
      name: "Tiros Curtos com Mudança de Direção (RSA)",
      muscleGroup: "Velocidade / Aceleração",
      sets: 2,
      reps: "5x 20m",
      repsType: "meters",
      fieldUnit: "meters",
      weight: "100% Sprint Máximo",
      rest: "2m30s",
      intraSetRest: 20,
      workRestRatio: "1:5",
      notes: "Tiros Curtos / RSA: 2 blocos de 5 tiros de 20m em velocidade máxima. Micro-pausa de 20s entre tiros e 2m30s entre blocos.",
      trainingMode: "speed",
      metricType: "sprint",
      executionMethod: "sprint_rsa",
      isStructuredRunning: true
    };
    const current = edited.exercises || [];
    const reindexed = [...current, rsaEx].map((e, i) => ({ ...e, order_index: i }));
    setEdited({ ...edited, exercises: reindexed });
    setExpandedExerciseId(rsaEx.id);
    toast.success("🏃‍♂️ Tiros / RSA (2 Blocos • 5x 20m) adicionado!", { icon: "🏃‍♂️" });
  };

  // Adiciona Pirâmide de Campo
  const addPyramidFieldTemplate = () => {
    const pyrEx: PrescribedExercise = {
      id: `ex-pyr-${Date.now()}`,
      name: "Pirâmide Linear de Campo",
      muscleGroup: "Velocidade & Tolerância ao Lactato",
      sets: 1,
      reps: "10-20-30-40-30-20-10m",
      repsType: "meters",
      fieldUnit: "meters",
      weight: "95-100% Vel",
      rest: "3min",
      intraSetRest: 30,
      notes: "Pirâmide de Campo: Tiros escalonados de 10m, 20m, 30m, 40m, 30m, 20m, 10m (160m total) com micro-pausas progressivas.",
      trainingMode: "speed",
      metricType: "sprint",
      executionMethod: "pyramid_field",
      isStructuredRunning: true
    };
    const current = edited.exercises || [];
    const reindexed = [...current, pyrEx].map((e, i) => ({ ...e, order_index: i }));
    setEdited({ ...edited, exercises: reindexed });
    setExpandedExerciseId(pyrEx.id);
    toast.success("🔺 Pirâmide de Campo (10-40-10m) adicionada!", { icon: "🔺" });
  };

  // Adiciona Fartlek / Intermitente
  const addFartlekTemplate = () => {
    const fartlekEx: PrescribedExercise = {
      id: `ex-fartlek-${Date.now()}`,
      name: "Treino Intermitente 15s:15s (Fartlek)",
      muscleGroup: "Condicionamento / Potência Aeróbia",
      sets: 2,
      reps: "10x (15s:15s)",
      repsType: "time",
      fieldUnit: "time",
      weight: "100-110% VAM",
      rest: "3min",
      intraSetRest: 15,
      notes: "Intermitente 15s forte (>100% VAM) por 15s trote leve/caminhada. 2 blocos de 10 tiros com 3min de recuperação inter-blocos.",
      trainingMode: "conditioning",
      metricType: "interval",
      executionMethod: "fartlek",
      isStructuredRunning: true
    };
    const current = edited.exercises || [];
    const reindexed = [...current, fartlekEx].map((e, i) => ({ ...e, order_index: i }));
    setEdited({ ...edited, exercises: reindexed });
    setExpandedExerciseId(fartlekEx.id);
    toast.success("⏱️ Fartlek Intermitente 15s:15s adicionado!", { icon: "⏱️" });
  };

  // Adiciona Shuttle Run / Agilidade COD
  const addShuttleRunTemplate = () => {
    const shuttleEx: PrescribedExercise = {
      id: `ex-shuttle-${Date.now()}`,
      name: "Pro Agility Shuttle 5-10-5m (COD)",
      muscleGroup: "Agilidade & Mudança de Direção",
      sets: 3,
      reps: "3x (5+10+5m)",
      repsType: "meters",
      fieldUnit: "meters",
      weight: "Máxima Aceleração & Freio",
      rest: "2min",
      intraSetRest: 25,
      notes: "Shuttle Run COD: 5m direita com toque no solo ➔ 10m esquerda com toque no solo ➔ 5m sprint através da linha média.",
      trainingMode: "speed",
      metricType: "drill",
      executionMethod: "shuttle_run",
      isStructuredRunning: true
    };
    const current = edited.exercises || [];
    const reindexed = [...current, shuttleEx].map((e, i) => ({ ...e, order_index: i }));
    setEdited({ ...edited, exercises: reindexed });
    setExpandedExerciseId(shuttleEx.id);
    toast.success("⚡ Shuttle Run / COD 5-10-5m adicionado!", { icon: "⚡" });
  };

  // Advanced filtration
  const filteredLibrary = useMemo(() => {
    return combinedLibrary.filter(item => {
      // 1. Text Search
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.physicalQuality || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.equipment || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      // 2. Tab Categories
      if (!isExerciseInActiveCategory(item, activeCategory, favorites, recentAdds, customLibraryExercises)) {
        return false;
      }

      // 3. Metadata Filters
      if (filterDifficulty !== "ALL" && item.difficulty !== filterDifficulty) return false;
      if (filterQuality !== "ALL" && item.physicalQuality !== filterQuality) return false;
      if (filterEquipment !== "ALL" && !(item.equipment || "").toLowerCase().includes(filterEquipment.toLowerCase())) return false;
      if (filterMuscleGroup !== "ALL" && item.muscleGroup !== filterMuscleGroup) return false;
      if (filterSport !== "ALL" && !(item.sports || []).some(s => s.toLowerCase() === filterSport.toLowerCase())) return false;
      if (filterPattern !== "ALL" && item.movementPattern !== filterPattern) return false;
      if (filterLateralType !== "ALL" && item.lateralType !== filterLateralType) return false;
      if (filterVideo === "WITH_VIDEO" && (!item.videoUrl || !item.videoUrl.trim())) return false;
      if (filterVideo === "WITHOUT_VIDEO" && Boolean(item.videoUrl && item.videoUrl.trim())) return false;

      // 4. AI Search Filter
      if (aiSearchIds && !aiSearchIds.includes(item.id)) return false;

      return true;
    });
  }, [searchQuery, activeCategory, favorites, recentAdds, filterDifficulty, filterQuality, filterEquipment, filterMuscleGroup, filterSport, filterPattern, filterLateralType, filterVideo, aiSearchIds, combinedLibrary, customLibraryExercises]);

  // Unique list of qualities, difficulties, and equipments for filters
  const uniqueQualities = useMemo(() => {
    const set = new Set<string>();
    combinedLibrary.forEach(x => {
      if (x.physicalQuality) set.add(x.physicalQuality);
    });
    return Array.from(set);
  }, [combinedLibrary]);

  const uniqueMuscleGroups = useMemo(() => {
    const set = new Set<string>();
    combinedLibrary.forEach(x => {
      if (x.muscleGroup) set.add(x.muscleGroup);
    });
    return Array.from(set);
  }, [combinedLibrary]);

  const uniqueSports = useMemo(() => {
    const set = new Set<string>();
    combinedLibrary.forEach(x => {
      if (x.sports) {
        x.sports.forEach(s => set.add(s));
      }
    });
    return Array.from(set);
  }, [combinedLibrary]);

  const uniquePatterns = useMemo(() => {
    const set = new Set<string>();
    combinedLibrary.forEach(x => {
      if (x.movementPattern) set.add(x.movementPattern);
    });
    return Array.from(set).sort();
  }, [combinedLibrary]);

  const uniqueEquipments = [
    "Barra", "Halter", "Kettlebell", "Peso Corporal", "Elástico", "Força", "Máquina", "BOSU", "Cones", "Corda", "Trenó"
  ];

  // Recomendações contextuais de troca de exercício
  const swapRecommendations = useMemo(() => {
    if (!exerciseToSwap) return [];
    
    // Se for Contraste Francês
    if (exerciseToSwap.executionMethod === "complex_contrast") {
      const tag = (exerciseToSwap.blockTag || "1A").toUpperCase();
      if (tag.endsWith("A")) {
        return [
          "Meio Agachamento Isométrico IMTP",
          "Puxada Isométrica no Meio da Coxa (IMTP)",
          "Agachamento Traseiro (Back Squat)",
          "Agachamento Frontal (Front Squat)",
          "Trap Bar Deadlift",
          "Leg Press 45º Unilateral"
        ];
      }
      if (tag.endsWith("B")) {
        return [
          "Hurdle Jumps / Saltos sobre Barreiras",
          "Box Jump (Salto na Caixa)",
          "Salto Vertical CMJ com Halteres",
          "Salto sobre Barreira Unilateral",
          "Broad Jump (Salto Horizontal)"
        ];
      }
      if (tag.endsWith("C")) {
        return [
          "Trap Bar Jump Squat (ou Halteres)",
          "Kettlebell Swing Potência",
          "Push Press com Barra",
          "Power Clean",
          "Arremesso de Medball no Solo"
        ];
      }
      if (tag.endsWith("D")) {
        return [
          "Drop Jump Reativo (RSI)",
          "Pogo Jumps Reativos",
          "Saltos Contínuos no Step",
          "Drop Jump com Barreira"
        ];
      }
    }

    // Se for Cluster Set
    if (exerciseToSwap.executionMethod === "cluster") {
      return [
        "Agachamento Traseiro (Back Squat)",
        "Supino Reto com Barra",
        "Trap Bar Deadlift",
        "Desenvolvimento Militar",
        "Meio Agachamento Isométrico IMTP"
      ];
    }

    // Se for Rest-Pause
    if (exerciseToSwap.executionMethod === "rest_pause") {
      return [
        "Leg Press 45º",
        "Puxada Alta no Pulley",
        "Supino Inclinado com Halteres",
        "Remada Curvada com Barra",
        "Agachamento Hack"
      ];
    }

    // Caso padrão: exercícios populares do mesmo grupo muscular
    return combinedLibrary
      .filter(e => e.muscleGroup === exerciseToSwap.muscleGroup || (e.tags || []).some(t => t.toLowerCase().includes("força") || t.toLowerCase().includes("potência")))
      .slice(0, 6)
      .map(e => e.name);
  }, [exerciseToSwap, combinedLibrary]);

  // Busca e filtragem da biblioteca para o modal de troca
  const swapFilteredLibrary = useMemo(() => {
    if (!exerciseToSwap) return [];
    
    const query = swapSearchQuery.trim().toLowerCase();
    
    return combinedLibrary.filter(item => {
      // 1. Categoria
      if (swapCategoryFilter !== "TODOS") {
        const cat = (item.category || "").toUpperCase();
        const sub = (item.subcategory || "").toUpperCase();
        const mg = (item.muscleGroup || "").toUpperCase();
        const filt = swapCategoryFilter.toUpperCase();
        if (!cat.includes(filt) && !sub.includes(filt) && !mg.includes(filt)) {
          return false;
        }
      }

      // 2. Query de texto
      if (query) {
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesSub = (item.subcategory || "").toLowerCase().includes(query);
        const matchesQuality = (item.physicalQuality || "").toLowerCase().includes(query);
        const matchesMuscle = item.muscleGroup.toLowerCase().includes(query);
        const matchesEquip = (item.equipment || "").toLowerCase().includes(query);
        const matchesTags = (item.tags || []).some(t => t.toLowerCase().includes(query));
        const matchesPattern = (item.movementPattern || "").toLowerCase().includes(query);
        return matchesName || matchesSub || matchesQuality || matchesMuscle || matchesEquip || matchesTags || matchesPattern;
      }

      return true;
    }).sort((a, b) => {
      if (query) {
        const aStarts = a.name.toLowerCase().startsWith(query);
        const bStarts = b.name.toLowerCase().startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
      }
      
      const aIsRec = swapRecommendations.includes(a.name);
      const bIsRec = swapRecommendations.includes(b.name);
      if (aIsRec && !bIsRec) return -1;
      if (!aIsRec && bIsRec) return 1;

      return 0;
    });
  }, [combinedLibrary, exerciseToSwap, swapSearchQuery, swapCategoryFilter, swapRecommendations]);

  const handleAiSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Por favor, digite termos de busca científicos (ex: 'reabilitação de joelho', 'explosão vertical').");
      return;
    }
    setIsAiSearching(true);
    setAiSearchReasoning(null);
    setAiSearchIds(null);
    
    try {
      const response = await searchExercisesWithAi(searchQuery);
      if (response && response.exerciseIds) {
        setAiSearchIds(response.exerciseIds);
        setAiSearchReasoning(response.reasoning);
        toast.success(`Busca Inteligente ativada! ${response.exerciseIds.length} exercícios encontrados.`);
      } else {
        toast.error("Nenhum exercício correspondente foi encontrado pela IA.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao realizar busca por IA.");
    } finally {
      setIsAiSearching(false);
    }
  };

  const clearAiSearch = () => {
    setAiSearchIds(null);
    setAiSearchReasoning(null);
    setSearchQuery("");
  };

  const handlePeriodizeWithAi = async () => {
    if (!athlete) {
      toast.error("Atleta não identificado no editor.");
      return;
    }
    if (!athlete.modality) {
      toast.error("Defina a modalidade do atleta antes de gerar treinos específicos.");
      return;
    }
    if (!generateAIWorkouts) {
      toast.error("Serviço de geração da IA indisponível.");
      return;
    }
    setIaWorkoutsLoading(true);
    try {
      const unionTrainingDays = Array.from(new Set([...localAcademyDays, ...localCourtDays])).sort();
      if (updateAthlete) {
        await updateAthlete(athlete.id, {
          periodizationStart: localPeriodizationStart,
          periodizationEnd: localPeriodizationEnd,
          academyDays: localAcademyDays,
          courtDays: localCourtDays,
          trainingDays: unionTrainingDays
        });
      }
      await generateAIWorkouts(athlete, iaInstructions, {
        periodizationStart: localPeriodizationStart,
        periodizationEnd: localPeriodizationEnd,
        academyDays: localAcademyDays,
        courtDays: localCourtDays
      });
      setIaInstructions(""); // Clear after successful generation
    } catch (error) {
      console.error("Erro ao gerar periodização completa:", error);
      toast.error("Erro ao processar periodização completa com IA.");
    } finally {
      setIaWorkoutsLoading(false);
    }
  };

  // Simulated Sports Science AI Agent Deep Generation
  const startAiPrescription = async () => {
    setAiLoading(true);
    setAiThoughts([]);
    setAiSuggestedExercises([]);

    const messages = [
      "⚡ [CONEXÃO] Iniciando LB Sport Science Copilot...",
      `📊 [MÉTRICAS] Sincronizando avaliações físicas ativas de ${athleteName}...`,
      "🔍 [DIAGNÓSTICO] Identificada predominância de força reativa moderada (RSI < 1.8) e assimetria de tripla extensão.",
      `🧠 [IA INTELIGENTE] Cruzando modalidade [${aiFocusModality}] com objetivo fisiológico [${aiFocusGoal}]...`,
      "🧬 [FISIOLOGIA] Otimizando recrutamento de Unidades Motoras de Alto Limiar e Rigidez de Tendão.",
      "📋 [PROTOCOLOS] Aplicando diretrizes EXOS Pillar Prep e Hawkin Dynamics Triphasic System.",
      "🤖 [GEMINI] Consultando modelo de linguagem de alta performance para prescrição baseada em evidências..."
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index < messages.length) {
        setAiThoughts(prev => [...prev, messages[index]]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 350);

    // Wait 2.5s for thinking steps animation
    await new Promise(resolve => setTimeout(resolve, 2500));

    try {
      const response = await prescribeWorkoutWithAi({
        athleteData: `${athleteName} (${aiAgeRange})`,
        objective: aiFocusGoal,
        restrictions: "Nenhuma restrição de lesão relatada",
        timeAvailable: "60 minutos",
        equipment: aiEquipmentSet,
        periodizationPhase: "Preparação Geral",
        library: combinedLibrary.map(ex => ({
          id: ex.id,
          name: ex.name,
          category: ex.category || "ALL",
          muscleGroup: ex.muscleGroup || ex.physicalQuality || "",
          description: (ex as any).description || ex.physiologicalGoal || ""
        }))
      });

      if (response && response.exercises) {
        setAiThoughts(prev => [...prev, "✅ [SUCESSO] Bloco de prescrição otimizado gerado com sucesso pelo Gemini!"]);
        
        const suggestions = response.exercises.map((item: any, i: number) => {
          const matchingLibEx = ENRICHED_LIBRARY.find(x => x.id === item.exerciseId || x.name.toLowerCase() === item.name.toLowerCase());
          return {
            id: matchingLibEx?.id || `virtual-${Math.random().toString(36).substr(2, 4)}-${i}`,
            name: item.name,
            physicalQuality: item.muscleGroup,
            physiologicalGoal: item.notes || "Otimização de força e potência baseada em ciência.",
            category: matchingLibEx?.category || "ALL",
            muscleGroup: item.muscleGroup,
            equipment: item.weight,
            difficulty: "Intermediário",
            defaultReps: item.reps,
            defaultWeight: item.weight,
            recommendedRest: item.rest,
            recommendedRpe: "8-9",
            sports: [aiFocusModality],
            description: item.notes,
            scientificRationale: response.scientificRationale || ""
          };
        });

        setAiSuggestedExercises(suggestions);
        toast.success("Prescrição sugerida pela IA pronta!");
      } else {
        throw new Error("Invalid or empty response from API");
      }
    } catch (err) {
      console.warn("AI Prescriber failed or key not set, using science-backed offline engine:", err);
      // Pick dynamic suggestions based on selections
      const suggestions = combinedLibrary.filter(ex => {
        if (aiFocusGoal.toLowerCase().includes("potência") || aiFocusGoal.toLowerCase().includes("explosão")) {
          return ex.category === "Potência" || (ex.physicalQuality || "").includes("Potência");
        }
        if (aiFocusGoal.toLowerCase().includes("prevenção") || aiFocusGoal.toLowerCase().includes("estabilidade")) {
          return ex.category === "Preventivo" || ex.category === "Core";
        }
        return ex.category === "MMII" || ex.category === "Potência";
      });

      setAiSuggestedExercises(suggestions.length > 0 ? suggestions : combinedLibrary.slice(0, 3));
      setAiThoughts(prev => [...prev, "⚠️ [OFF-LINE] Chave de API não ativa. Carregadas diretrizes de ciência esportiva off-line."]);
      toast.success("Prescrição alternativa (Off-line) carregada.");
    } finally {
      setAiLoading(false);
    }
  };

  const injectAiSuggestedExercises = () => {
    if (aiSuggestedExercises.length === 0) return;
    
    const newExercises = aiSuggestedExercises.map((libEx, index) => {
      const prescribedSets = libEx.defaultSets && Number(libEx.defaultSets) > 0 ? Number(libEx.defaultSets) : 4;
      const repsType: 'reps' | 'time' | 'meters' = libEx.defaultRepsType || (
        libEx.defaultExecutionTime ||
        (libEx.defaultReps && (libEx.defaultReps.toLowerCase().includes("s") || libEx.defaultReps.toLowerCase().includes("min") || libEx.defaultReps.toLowerCase().includes("seg")))
          ? "time"
          : (libEx.defaultReps && libEx.defaultReps.toLowerCase().includes("m") ? "meters" : "reps")
      );
      const repVal = repsType === "time"
        ? (libEx.defaultExecutionTime || libEx.defaultReps || "30s")
        : (libEx.defaultReps || "10");

      return {
        id: `ex-ai-${Date.now()}-${index}`,
        name: libEx.name,
        muscleGroup: libEx.muscleGroup,
        sets: prescribedSets,
        reps: repVal,
        weight: libEx.defaultWeight || "BW",
        repsType: repsType,
        rest: libEx.recommendedRest || "2 min",
        notes: `[IA PRESCRITO] Foco: ${libEx.physicalQuality || 'Geral'} | Justificativa: Otimização de RFD por VBT.`
      };
    });

    setEdited(prev => {
      const current = prev.exercises || [];
      const combined = [...current, ...newExercises].map((ex, i) => ({ ...ex, order_index: i }));
      return {
        ...prev,
        exercises: combined
      };
    });
    
    toast.success(`Injetados ${newExercises.length} exercícios científicos na planilha!`);
  };

  // Progression Studio Application Logic
  const applyProgressionSystem = () => {
    if ((edited.exercises || []).length === 0) {
      toast.error("Prescreva pelo menos um exercício na planilha primeiro!");
      return;
    }

    let logs = "";
    const updatedExercises = edited.exercises.map(ex => {
      let currentSets = ex.sets || 3;
      let currentRepsVal = parseInt(ex.reps) || 8;
      let currentWeightVal = parseFloat(ex.weight) || 0;
      const weightUnit = ex.weight.includes("kg") ? "kg" : "BW";
      let note = ex.notes || "";

      switch (progressionMethod) {
        case "linear":
          // +5% load, -1 or 2 reps, maintaining sets
          currentRepsVal = Math.max(3, currentRepsVal - 2);
          currentWeightVal = currentWeightVal > 0 ? Math.round(currentWeightVal * 1.05) : 0;
          note = `[PROG. LINEAR] Carga incremental +5% | Reps ajustadas de forma compensatória.`;
          break;
        case "undulating":
          // Heavy set-rep scheme alternating volumes
          currentSets = 4;
          currentRepsVal = 6;
          currentWeightVal = currentWeightVal > 0 ? Math.round(currentWeightVal * 1.15) : 0;
          note = `[PROG. ONDULATÓRIA] Carga de Alta Intensidade | Ondulação de microciclo focado em RFD.`;
          break;
        case "accumulation":
          // Hypertrophy and structural accumulation (+1 set, +2 reps, lighter weight)
          currentSets = currentSets + 1;
          currentRepsVal = currentRepsVal + 2;
          currentWeightVal = currentWeightVal > 0 ? Math.round(currentWeightVal * 0.90) : 0;
          note = `[PROG. ACUMULAÇÃO] Aumento de volume total (+1 Set, +2 Reps) focado em capacidade de trabalho.`;
          break;
        case "deload":
          // Drop weight by 30%, reduce sets by 1
          currentSets = Math.max(2, currentSets - 1);
          currentWeightVal = currentWeightVal > 0 ? Math.round(currentWeightVal * 0.65) : 0;
          note = `[PROG. DELOAD] Descarga regenerativa de fadiga ativa. Redução de 35% na intensidade.`;
          break;
        case "tapering":
          // Peak intensity, drop volume by 50%
          currentSets = 2;
          currentRepsVal = Math.max(2, Math.round(currentRepsVal * 0.6));
          currentWeightVal = currentWeightVal > 0 ? Math.round(currentWeightVal * 1.10) : 0;
          note = `[PROG. TAPERING] Polimento Competitivo. Volume reduzido em 50% | Intensidade Neural Máxima (+10% Carga).`;
          break;
      }

      const formattedWeight = currentWeightVal > 0 ? `${currentWeightVal}${weightUnit === "kg" ? "kg" : ""}` : "BW";

      return {
        ...ex,
        sets: currentSets,
        reps: currentRepsVal.toString(),
        weight: formattedWeight,
        notes: note
      };
    });

    setEdited(prev => ({
      ...prev,
      exercises: updatedExercises.map((ex, i) => ({ ...ex, order_index: i }))
    }));

    toast.success(`Progressão [${progressionMethod.toUpperCase()}] aplicada com sucesso a toda a planilha!`);
  };

  // Close filter drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFilterDrawerOpen) {
        setIsFilterDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFilterDrawerOpen]);

  return (
    <div className="coach-editor-shell w-full h-full md:max-w-[98vw] xl:max-w-[1720px] md:h-[97vh] bg-slate-950 md:border md:border-slate-900 md:rounded-[2.5rem] overflow-y-auto shadow-2xl text-slate-100 flex flex-col lg:flex-row animate-in fade-in duration-300">
      
      {/* MOBILE HEADER & TAB SWITCHER */}
      <div className="lg:hidden shrink-0 bg-[#0c111d] border-b border-slate-900 px-4 py-3 flex items-center justify-between gap-2 w-full">
        <div className="flex gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-900/60 flex-1">
          <button
            onClick={() => setActiveMobileTab("workout")}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all text-center ${
              activeMobileTab === "workout"
                ? "bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            📋 Planilha ({edited.exercises?.length || 0})
          </button>
          <button
            onClick={() => setActiveMobileTab("library")}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all text-center ${
              activeMobileTab === "library"
                ? "bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ⚡ Prescritor Elite
          </button>
        </div>
        <button
          onClick={onCancel}
          className="p-2 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-colors shrink-0"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* LEFT COLUMN: MULTI-TAB PRESCRIÇÃO PLATFORM */}
      <div className={`coach-editor-library ${activeMobileTab === "library" ? "flex" : "hidden"} lg:flex w-full lg:w-[380px] xl:w-[420px] bg-[#0c111d] border-b lg:border-b-0 lg:border-r border-slate-900 p-5 lg:p-6 flex-col overflow-y-auto no-scrollbar relative`}>
        
        {/* PLATFORM HEADER */}
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center text-[#39FF14]">
              <Cpu className="w-5 h-5 text-[#39FF14] animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider text-white leading-tight">LB PRESCRITOR PREMIUM</h4>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Módulo de Alta Performance EXOS</p>
            </div>
          </div>
          <button 
            onClick={duplicateEntireWorkout} 
            className="text-[9px] font-black uppercase tracking-widest text-[#39FF14] bg-[#39FF14]/10 border border-[#39FF14]/20 px-3 py-2 rounded-lg hover:bg-[#39FF14]/20 transition-all"
            title="Clonar planilha de treino ativa"
          >
            CLONAR TREINO
          </button>
        </div>

        {/* WORKSPACE SIDEBAR SUB-TABS */}
        <div className="flex bg-slate-950 border border-slate-900/60 p-1 rounded-xl mb-5 shrink-0 gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSidebarTab("library")}
            className={`flex-1 py-2 px-1 text-[8px] md:text-[9px] font-black uppercase tracking-wider rounded-lg transition-all shrink-0 ${
              sidebarTab === "library"
                ? "bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            📚 Biblioteca
          </button>
          <button
            onClick={() => {
              setSidebarTab("ai");
              setIsFilterDrawerOpen(false);
            }}
            className={`flex-1 py-2 px-1 text-[8px] md:text-[9px] font-black uppercase tracking-wider rounded-lg transition-all shrink-0 ${
              sidebarTab === "ai"
                ? "bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🧠 IA Co-Pilot
          </button>
          <button
            onClick={() => {
              setSidebarTab("progression");
              setIsFilterDrawerOpen(false);
            }}
            className={`flex-1 py-2 px-1 text-[8px] md:text-[9px] font-black uppercase tracking-wider rounded-lg transition-all shrink-0 ${
              sidebarTab === "progression"
                ? "bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ⚙️ Progressão
          </button>
          <button
            onClick={() => {
              setSidebarTab("deficit");
              setIsFilterDrawerOpen(false);
            }}
            className={`flex-1 py-2 px-1 text-[8px] md:text-[9px] font-black uppercase tracking-wider rounded-lg transition-all shrink-0 ${
              sidebarTab === "deficit"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                : "text-slate-400 hover:text-white"
            }`}
            title="Sugerir treinos focados nos déficits das avaliações físicas"
          >
            🎯 Déficits IA
          </button>
        </div>

        {/* TAB CONTENT: BIBLIOTECA ELITE */}
        {sidebarTab === "library" && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            
            {/* SEARCH & FILTER TRIGGER BAR */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#161b26] border border-slate-850 rounded-xl py-2.5 pl-10 pr-9 text-xs font-semibold text-slate-200 outline-none focus:ring-2 focus:ring-[#39FF14]/10 focus:border-[#39FF14] transition-all"
                  placeholder="Pesquisar por nome, músculo, equipamento..."
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white transition-colors cursor-pointer"
                    title="Limpar pesquisa"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* CLEAN FILTER DRAWER TRIGGER BUTTON */}
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(true)}
                className={`h-[40px] px-3.5 rounded-xl border flex items-center gap-1.5 transition-all text-xs font-black uppercase tracking-wider cursor-pointer shrink-0 ${
                  activeFiltersCount > 0
                    ? "bg-[#39FF14]/15 text-[#39FF14] border-[#39FF14]/40 shadow-sm shadow-[#39FF14]/20"
                    : "bg-[#161b26] hover:bg-slate-800 text-slate-300 hover:text-white border-slate-850"
                }`}
                title="Abrir gaveta limpa de filtros de ciência e biomecânica"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filtros</span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#39FF14] text-slate-950 font-black text-[10px] flex items-center justify-center leading-none">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {/* ACTIVE FILTERS CHIPS (QUICK SUMMARY & INSTANT DISMISS) */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-950/70 border border-slate-900 shrink-0 text-[10px]">
                <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Filtros:</span>
                {filterDifficulty !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20 font-bold">
                    {filterDifficulty}
                    <X className="w-2.5 h-2.5 cursor-pointer hover:opacity-75" onClick={() => setFilterDifficulty("ALL")} />
                  </span>
                )}
                {filterQuality !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                    {filterQuality}
                    <X className="w-2.5 h-2.5 cursor-pointer hover:opacity-75" onClick={() => setFilterQuality("ALL")} />
                  </span>
                )}
                {filterMuscleGroup !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
                    {filterMuscleGroup}
                    <X className="w-2.5 h-2.5 cursor-pointer hover:opacity-75" onClick={() => setFilterMuscleGroup("ALL")} />
                  </span>
                )}
                {filterEquipment !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                    {filterEquipment}
                    <X className="w-2.5 h-2.5 cursor-pointer hover:opacity-75" onClick={() => setFilterEquipment("ALL")} />
                  </span>
                )}
                {filterPattern !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    {filterPattern}
                    <X className="w-2.5 h-2.5 cursor-pointer hover:opacity-75" onClick={() => setFilterPattern("ALL")} />
                  </span>
                )}
                {filterLateralType !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                    {filterLateralType}
                    <X className="w-2.5 h-2.5 cursor-pointer hover:opacity-75" onClick={() => setFilterLateralType("ALL")} />
                  </span>
                )}
                {filterVideo !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                    {filterVideo === "WITH_VIDEO" ? "🎥 Com Vídeo" : "Sem Vídeo"}
                    <X className="w-2.5 h-2.5 cursor-pointer hover:opacity-75" onClick={() => setFilterVideo("ALL")} />
                  </span>
                )}
                {filterSport !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold">
                    {filterSport}
                    <X className="w-2.5 h-2.5 cursor-pointer hover:opacity-75" onClick={() => setFilterSport("ALL")} />
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-[8.5px] font-black uppercase text-slate-400 hover:text-white underline ml-auto cursor-pointer"
                >
                  Limpar todos
                </button>
              </div>
            )}

            {/* AI SEARCH RESULTS REASONING BANNER */}
            {aiSearchReasoning && (
              <div className="bg-[#39FF14]/5 border border-[#39FF14]/20 p-3.5 rounded-xl space-y-1 animate-fade-in shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase text-[#39FF14] tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#39FF14]" />
                    Análise Científica de Busca por IA
                  </span>
                  <button
                    onClick={clearAiSearch}
                    className="text-[8px] font-black text-slate-400 hover:text-white uppercase tracking-wider"
                  >
                    LIMPAR
                  </button>
                </div>
                <p className="text-[9.5px] text-slate-300 font-bold leading-normal">
                  {aiSearchReasoning}
                </p>
              </div>
            )}

            {/* CATEGORY SELECTOR CHIPS */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 shrink-0 no-scrollbar border-b border-slate-900/80">
              {[
                { id: "ALL", label: "TUDO" },
                { id: "WITH_VIDEO", label: "🎥 Vídeos" },
                { id: "CUSTOM", label: "Salvos 💾" },
                { id: "MMII", label: "Membros Inf." },
                { id: "MMSS", label: "Membros Sup." },
                { id: "Potência", label: "Potência" },
                { id: "Velocidade", label: "Velocidade" },
                { id: "Preventivo", label: "Preventivos" },
                { id: "Core", label: "Core" },
                { id: "FAVORITES", label: "★" }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    activeCategory === cat.id 
                      ? "bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/30" 
                      : "bg-slate-900/40 text-slate-400 border-slate-800/60 hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* STREAMLINED EXERCISE COUNT INFO */}
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 shrink-0 px-1">
              <span>{filteredLibrary.length} exercícios disponíveis</span>
              {searchQuery && (
                <span className="text-slate-400 truncate max-w-[170px]">
                  Filtro: "{searchQuery}"
                </span>
              )}
            </div>

            {/* HIGH-FIDELITY BENTO LIST */}
            <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar min-h-[150px] pr-1">
              {filteredLibrary.map(item => (
                <div
                  key={item.id}
                  onClick={() => addExFromLib(item)}
                  className="p-3 bg-[#111622] hover:bg-[#151c2c] border border-slate-900 rounded-xl flex items-center justify-between group cursor-pointer transition-all hover:scale-[1.01] hover:border-slate-850"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800/40 flex items-center justify-center text-slate-400 group-hover:text-[#39FF14] group-hover:bg-[#39FF14]/5 transition-all">
                      <Dumbbell className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h5 className="text-[11px] font-black text-slate-200 group-hover:text-white transition-colors tracking-tight leading-snug">
                        {item.name}
                      </h5>
                      <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                        <span className="text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-[#39FF14]/10 text-[#39FF14] rounded">
                          {item.physicalQuality || "Geral"}
                        </span>
                        {item.movementPattern && (
                          <span className="text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                            {item.movementPattern}
                          </span>
                        )}
                        <span className="text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded">
                          {item.lateralType || "Bilateral"}
                        </span>
                        <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-500">
                          {item.equipment ? item.equipment.split(" ")[0] : "BW"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* View Details Icon */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDetailsExercise(item);
                      }}
                      className="p-1.5 text-slate-500 hover:text-white transition-colors cursor-pointer"
                      title="Ver detalhes científicos ricos"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {/* Favorite Heart Icon */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(item.id, e)}
                      className="p-1.5 text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      <Heart className={`w-3.5 h-3.5 ${favorites.includes(item.id) ? "fill-amber-400 text-amber-400" : ""}`} />
                    </button>
                    {/* Prescribe directly as Complex Training / French Contrast */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addExFromLib(item, "complex_contrast");
                      }}
                      className="px-2 py-1 rounded-md bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 transition-all cursor-pointer shadow-sm shadow-cyan-500/10 active:scale-95"
                      title="Prescrever direto no Treino Complexo / Contraste Francês 🇫🇷"
                    >
                      <span className="text-[11px] leading-none">🇫🇷</span>
                      <span className="text-[8px] font-black uppercase hidden xl:inline">Complex</span>
                    </button>
                    {/* Standard Add */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addExFromLib(item, "standard");
                      }}
                      className="w-6 h-6 rounded-md bg-[#39FF14]/10 hover:bg-[#39FF14]/20 border border-[#39FF14]/20 flex items-center justify-center text-[#39FF14] group-hover:scale-110 transition-transform cursor-pointer"
                      title="Prescrever Padrão (+)"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  </div>
                </div>
              ))}

              {filteredLibrary.length === 0 && (
                <div className="py-12 text-center text-slate-500 font-bold uppercase tracking-widest text-[9px] border-2 border-dashed border-slate-900 rounded-xl">
                  Nenhum exercício correspondente aos filtros
                </div>
              )}
            </div>

            {/* CUSTOM EXERCISE ADDER */}
            <div className="border-t border-slate-900 pt-4 mt-auto shrink-0">
              <label className="text-[8.5px] font-black text-slate-500 uppercase block mb-1.5 tracking-widest">
                + Adicionar Customizado Rápido
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customExerciseName}
                  onChange={(e) => setCustomExerciseName(e.target.value)}
                  className="flex-1 bg-[#161b26] border border-slate-850 rounded-lg p-2.5 text-xs text-slate-200 font-medium outline-none focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14]/10"
                  placeholder="Ex: Saltos Unilaterais Caixa"
                />
                <button
                  onClick={addCustomEx}
                  className="bg-[#39FF14] hover:bg-[#32e00f] text-slate-950 font-black text-[10px] px-4 rounded-lg transition-colors uppercase tracking-widest"
                >
                  ADD
                </button>
              </div>
            </div>

          </div>
        )}

        {/* GAVETA LIMPA DE FILTROS DOS EXERCÍCIOS (DRAWER) */}
        {isFilterDrawerOpen && (
          <div className="exercise-filter-drawer absolute inset-0 z-40 bg-[#0c111d] flex flex-col p-4 sm:p-5 animate-in fade-in slide-in-from-left duration-200 shadow-2xl overflow-hidden">
            {/* DRAWER HEADER */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#39FF14]/15 border border-[#39FF14]/30 flex items-center justify-center text-[#39FF14]">
                  <Sliders className="w-4 h-4 text-[#39FF14]" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white leading-tight">
                    Filtros de Exercícios
                  </h4>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                    Refinar biomecânica, capacidades e materiais
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#39FF14] text-slate-950">
                    {activeFiltersCount} ativo{activeFiltersCount > 1 ? "s" : ""}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                  title="Fechar Gaveta (ESC)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* DRAWER SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 no-scrollbar pb-2">
              {/* 1. Dificuldade */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Nível de Dificuldade
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "ALL", label: "Todas" },
                    { id: "Iniciante", label: "Iniciante" },
                    { id: "Intermediário", label: "Intermed." },
                    { id: "Avançado", label: "Avançado" },
                    { id: "Elite", label: "Elite" }
                  ].map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setFilterDifficulty(d.id)}
                      className={`py-1.5 px-2 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${
                        filterDifficulty === d.id
                          ? "bg-[#39FF14]/15 border-[#39FF14]/50 text-[#39FF14] font-black"
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Vídeo & Lateralidade (Quick Toggles) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                    Vídeo Demonstrativo
                  </span>
                  <div className="flex flex-col gap-1">
                    {[
                      { id: "ALL", label: "Todos" },
                      { id: "WITH_VIDEO", label: "🎥 Com Vídeo" },
                      { id: "WITHOUT_VIDEO", label: "Sem Vídeo" }
                    ].map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setFilterVideo(v.id)}
                        className={`py-1.5 px-2 rounded-lg text-[9px] font-bold border text-left transition-all cursor-pointer ${
                          filterVideo === v.id
                            ? "bg-[#39FF14]/15 border-[#39FF14]/50 text-[#39FF14] font-black"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                    Lateralidade
                  </span>
                  <div className="flex flex-col gap-1">
                    {[
                      { id: "ALL", label: "Ambos" },
                      { id: "Unilateral", label: "Unilateral" },
                      { id: "Bilateral", label: "Bilateral" }
                    ].map(l => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setFilterLateralType(l.id)}
                        className={`py-1.5 px-2 rounded-lg text-[9px] font-bold border text-left transition-all cursor-pointer ${
                          filterLateralType === l.id
                            ? "bg-[#39FF14]/15 border-[#39FF14]/50 text-[#39FF14] font-black"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Grupo Muscular */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Grupo Muscular Principal
                </label>
                <select
                  value={filterMuscleGroup}
                  onChange={(e) => setFilterMuscleGroup(e.target.value)}
                  className="w-full bg-[#161b26] text-[10px] font-bold text-slate-200 border border-slate-800 p-2.5 rounded-xl outline-none focus:border-[#39FF14]"
                >
                  <option value="ALL">TODOS OS GRUPOS MUSCULARES</option>
                  {uniqueMuscleGroups.map(mg => <option key={mg} value={mg}>{mg}</option>)}
                </select>
              </div>

              {/* 4. Qualidade Física */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Qualidade Física / Foco Biomecânico
                </label>
                <select
                  value={filterQuality}
                  onChange={(e) => setFilterQuality(e.target.value)}
                  className="w-full bg-[#161b26] text-[10px] font-bold text-slate-200 border border-slate-800 p-2.5 rounded-xl outline-none focus:border-[#39FF14]"
                >
                  <option value="ALL">TODAS AS QUALIDADES FÍSICAS</option>
                  {uniqueQualities.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>

              {/* 5. Padrão de Movimento */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Padrão de Movimento
                </label>
                <select
                  value={filterPattern}
                  onChange={(e) => setFilterPattern(e.target.value)}
                  className="w-full bg-[#161b26] text-[10px] font-bold text-slate-200 border border-slate-800 p-2.5 rounded-xl outline-none focus:border-[#39FF14]"
                >
                  <option value="ALL">TODOS OS PADRÕES DE MOVIMENTO</option>
                  {uniquePatterns.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* 6. Equipamento Requerido */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Equipamento Requerido
                </label>
                <select
                  value={filterEquipment}
                  onChange={(e) => setFilterEquipment(e.target.value)}
                  className="w-full bg-[#161b26] text-[10px] font-bold text-slate-200 border border-slate-800 p-2.5 rounded-xl outline-none focus:border-[#39FF14]"
                >
                  <option value="ALL">TODOS OS EQUIPAMENTOS</option>
                  {uniqueEquipments.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                </select>
              </div>

              {/* 7. Esporte Específico */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Modalidade Esportiva
                </label>
                <select
                  value={filterSport}
                  onChange={(e) => setFilterSport(e.target.value)}
                  className="w-full bg-[#161b26] text-[10px] font-bold text-slate-200 border border-slate-800 p-2.5 rounded-xl outline-none focus:border-[#39FF14]"
                >
                  <option value="ALL">TODAS AS MODALIDADES</option>
                  {uniqueSports.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                </select>
              </div>
            </div>

            {/* DRAWER FOOTER */}
            <div className="pt-3 border-t border-slate-800 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={clearAllFilters}
                disabled={activeFiltersCount === 0}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 disabled:opacity-40 disabled:pointer-events-none text-slate-300 hover:text-white border border-slate-800 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Limpar Filtros
              </button>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="flex-[1.5] py-2.5 px-3 rounded-xl bg-[#39FF14] hover:bg-[#32e00f] text-slate-950 text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-[#39FF14]/15 cursor-pointer text-center"
              >
                Ver {filteredLibrary.length} Exercício{filteredLibrary.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}

        {/* TAB CONTENT: IA PRESCRITOR (CO-PILOT) */}
        {sidebarTab === "ai" && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            
            {/* IA CO-PILOT - PERIODIZATION & TRAINING DAYS */}
            {athlete && updateAthlete && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#39FF14]">
                    <Brain className="w-4 h-4 text-[#39FF14] animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-white">
                      IA CO-PILOT (PERIODIZAÇÃO)
                    </span>
                  </div>
                  <span className="text-[7.5px] font-black px-1.5 py-0.5 rounded bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20 uppercase">
                    Ciclo Automático
                  </span>
                </div>

                <p className="text-[8.5px] text-slate-400 font-bold leading-relaxed">
                  Defina o intervalo e os dias da semana. A <span className="text-white font-black">IA Co-Pilot</span> analisa a descrição do treinador e os testes do atleta para estruturar os treinos nas datas corretas.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[7.5px] font-black text-slate-500 uppercase block mb-1">Início do Ciclo</label>
                    <input
                      type="date"
                      value={localPeriodizationStart}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocalPeriodizationStart(val);
                        if (updateAthlete && athlete) {
                          updateAthlete(athlete.id, { periodizationStart: val });
                        }
                      }}
                      className="w-full bg-[#161b26] text-[9px] font-black uppercase text-slate-200 border border-slate-850 p-2 rounded-lg focus:border-[#39FF14]"
                    />
                  </div>
                  <div>
                    <label className="text-[7.5px] font-black text-slate-500 uppercase block mb-1">Término do Ciclo</label>
                    <input
                      type="date"
                      value={localPeriodizationEnd}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocalPeriodizationEnd(val);
                        if (updateAthlete && athlete) {
                          updateAthlete(athlete.id, { periodizationEnd: val });
                        }
                      }}
                      className="w-full bg-[#161b26] text-[9px] font-black uppercase text-slate-200 border border-slate-850 p-2 rounded-lg focus:border-[#39FF14]"
                    />
                  </div>
                </div>

                {/* Weekdays for Academy and Field */}
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="text-[7.5px] font-black text-slate-400 uppercase block mb-1">
                      🏋️‍♂️ Academia (Musculação / Força)
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { id: 0, label: "D" },
                        { id: 1, label: "S" },
                        { id: 2, label: "T" },
                        { id: 3, label: "Q" },
                        { id: 4, label: "Q" },
                        { id: 5, label: "S" },
                        { id: 6, label: "S" },
                      ].map((day) => {
                        const isSelected = localAcademyDays.includes(day.id);
                        return (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => {
                              const newAcademy = localAcademyDays.includes(day.id)
                                ? localAcademyDays.filter((d: number) => d !== day.id)
                                : [...localAcademyDays, day.id].sort();
                              setLocalAcademyDays(newAcademy);
                              const unionDays = Array.from(new Set([...newAcademy, ...localCourtDays])).sort();
                              if (updateAthlete && athlete) {
                                updateAthlete(athlete.id, { academyDays: newAcademy, trainingDays: unionDays });
                              }
                            }}
                            className={`w-6 h-6 rounded-md text-[8px] font-black flex items-center justify-center border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#39FF14] border-[#39FF14] text-slate-950 font-black shadow-[0_0_8px_rgba(57,255,20,0.3)]"
                                : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[7.5px] font-black text-slate-400 uppercase block mb-1">
                      ⚽ Campo / Quadra (Técnico / Tático)
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { id: 0, label: "D" },
                        { id: 1, label: "S" },
                        { id: 2, label: "T" },
                        { id: 3, label: "Q" },
                        { id: 4, label: "Q" },
                        { id: 5, label: "S" },
                        { id: 6, label: "S" },
                      ].map((day) => {
                        const isSelected = localCourtDays.includes(day.id);
                        return (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => {
                              const newCourt = localCourtDays.includes(day.id)
                                ? localCourtDays.filter((d: number) => d !== day.id)
                                : [...localCourtDays, day.id].sort();
                              setLocalCourtDays(newCourt);
                              const unionDays = Array.from(new Set([...localAcademyDays, ...newCourt])).sort();
                              if (updateAthlete && athlete) {
                                updateAthlete(athlete.id, { courtDays: newCourt, trainingDays: unionDays });
                              }
                            }}
                            className={`w-6 h-6 rounded-md text-[8px] font-black flex items-center justify-center border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-brand-secondary border-brand-secondary text-brand-dark font-black shadow-[0_0_8px_rgba(57,255,20,0.3)]"
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

                <div>
                  <label className="text-[7.5px] font-black text-slate-400 uppercase block mb-1">
                    📝 Descrição & Diretrizes da Periodização
                  </label>
                  <textarea
                    value={iaInstructions}
                    onChange={(e) => setIaInstructions(e.target.value)}
                    placeholder="Ex: Focar em potência e salto vertical, ênfase em corrida de alta intensidade nos dias de campo, proteção de ligamentos..."
                    className="w-full bg-[#161b26] border border-slate-850 rounded-lg p-2.5 text-[9px] font-bold text-white outline-none focus:border-[#39FF14] resize-none h-16 placeholder:text-slate-700"
                  />
                </div>

                <button
                  type="button"
                  onClick={handlePeriodizeWithAi}
                  disabled={iaWorkoutsLoading}
                  className="w-full bg-[#39FF14] hover:bg-[#32e00f] disabled:bg-slate-850 text-slate-950 font-black text-[9.5px] py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer shadow-lg shadow-[#39FF14]/10"
                >
                  {iaWorkoutsLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      IA CO-PILOT PERIODIZANDO ATLETA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 stroke-[3]" />
                      GERAR PERIODIZAÇÃO COM IA CO-PILOT
                    </>
                  )}
                </button>
              </div>
            )}
            
            {/* AI CONFIGURATION FORM */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 space-y-3.5 shrink-0">
              <div className="flex items-center gap-2 text-[#39FF14]">
                <Brain className="w-4.5 h-4.5 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider">CONFIGURADOR INTELIGENTE IA</span>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide leading-relaxed">
                A IA analisa a idade, modalidade e as avaliações ativas de <span className="text-white font-black">{athleteName}</span> (como CMJ, RSI de {athleteGoal}) para montar o melhor microciclo.
              </p>

              <div className="space-y-3">
                {/* Modality & Goal Customizers */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[7.5px] font-black text-slate-500 uppercase block mb-1">Esporte Alvo</label>
                    <input 
                      type="text"
                      value={aiFocusModality}
                      onChange={(e) => setAiFocusModality(e.target.value)}
                      className="w-full bg-[#161b26] text-[9px] font-black uppercase text-slate-200 border border-slate-850 p-2 rounded-lg focus:border-[#39FF14]"
                    />
                  </div>
                  <div>
                    <label className="text-[7.5px] font-black text-slate-500 uppercase block mb-1">Foco Principal</label>
                    <input 
                      type="text"
                      value={aiFocusGoal}
                      onChange={(e) => setAiFocusGoal(e.target.value)}
                      className="w-full bg-[#161b26] text-[9px] font-black uppercase text-slate-200 border border-slate-850 p-2 rounded-lg focus:border-[#39FF14]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[7.5px] font-black text-slate-500 uppercase block mb-1">Faixa Etária</label>
                    <select
                      value={aiAgeRange}
                      onChange={(e) => setAiAgeRange(e.target.value)}
                      className="w-full bg-[#161b26] text-[9px] font-black uppercase text-slate-300 border border-slate-850 p-2 rounded-lg focus:border-[#39FF14]"
                    >
                      <option value="Sub-15">Sub-15</option>
                      <option value="Sub-17">Sub-17</option>
                      <option value="Sub-20">Sub-20</option>
                      <option value="Profissional">Profissional</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[7.5px] font-black text-slate-500 uppercase block mb-1">Equipamentos</label>
                    <select
                      value={aiEquipmentSet}
                      onChange={(e) => setAiEquipmentSet(e.target.value)}
                      className="w-full bg-[#161b26] text-[9px] font-black uppercase text-slate-300 border border-slate-850 p-2 rounded-lg focus:border-[#39FF14]"
                    >
                      <option value="Completo">Academia Completa</option>
                      <option value="Halteres">Halteres & Elásticos</option>
                      <option value="Livre">Apenas Peso Corporal</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={startAiPrescription}
                  disabled={aiLoading}
                  className="w-full bg-[#39FF14] hover:bg-[#32e00f] disabled:bg-slate-850 text-slate-950 font-black text-[10px] py-3 rounded-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest shadow-xl shadow-[#39FF14]/10 cursor-pointer"
                >
                  {aiLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      PROCESSANDO DADOS ATLETA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 stroke-[3]" />
                      GERAR PRESCRIÇÃO AUTOMÁTICA
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI THOUGHT PROCESS CONSOLE */}
            {aiThoughts.length > 0 && (
              <div className="bg-[#05080e] border border-slate-900 rounded-xl p-4 space-y-1 font-mono text-[8px] leading-relaxed max-h-[140px] overflow-y-auto no-scrollbar">
                {aiThoughts.map((thought, i) => (
                  <div key={i} className="text-[#39FF14]/90 animate-fade-in">
                    {thought}
                  </div>
                ))}
              </div>
            )}

            {/* AI SUGGESTED BLOCKS CARDS */}
            {aiSuggestedExercises.length > 0 && (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    SUGESTÃO GERADA ({aiSuggestedExercises.length} EXERCÍCIOS)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={saveAllAiSuggestedExercises}
                      className="text-[9px] font-black text-blue-400 hover:underline uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                      title="Salvar todos no acervo permanente da Biblioteca"
                    >
                      <Save className="w-3 h-3 stroke-[3]" />
                      Salvar na Biblioteca 📚
                    </button>
                    <button
                      onClick={injectAiSuggestedExercises}
                      className="text-[9px] font-black text-[#39FF14] hover:underline uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                      Injetar Tudo
                    </button>
                  </div>
                </div>
 
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1">
                  {aiSuggestedExercises.map((sug, i) => (
                    <div 
                      key={sug.id}
                      className="p-3 bg-[#111622] border border-slate-900 rounded-xl relative group"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <span className="text-[11px] font-black text-slate-100">{sug.name}</span>
                          <p className="text-[7.5px] text-[#39FF14] font-black uppercase tracking-wider mt-0.5">{sug.physicalQuality}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => saveExerciseToLibrary(sug)}
                            className="w-5 h-5 bg-blue-500/10 hover:bg-blue-500/25 text-blue-400 rounded-md border border-blue-500/20 flex items-center justify-center transition-all cursor-pointer"
                            title="Salvar no acervo permanente da Biblioteca 💾"
                          >
                            <Bookmark className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => addExFromLib(sug)}
                            className="w-5 h-5 bg-[#39FF14]/10 hover:bg-[#39FF14]/20 text-[#39FF14] rounded-md border border-[#39FF14]/20 flex items-center justify-center transition-all cursor-pointer"
                            title="Adicionar ao Treino Ativo ➕"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold leading-normal mt-1.5">{sug.physiologicalGoal}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* IF EMPTY AI VIEW */}
            {aiSuggestedExercises.length === 0 && !aiLoading && (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-slate-500 select-none">
                <Brain className="w-8 h-8 text-slate-800 mb-2 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Sem Prescrição Ativa</span>
                <span className="text-[8px] text-slate-600 font-bold uppercase mt-1 leading-normal max-w-[240px]">
                  Clique no botão acima para rodar o motor de IA e gerar uma planilha estruturada para o atleta
                </span>
              </div>
            )}

          </div>
        )}

        {/* TAB CONTENT: AUTOMATIC PROGRESSION STUDIO */}
        {sidebarTab === "progression" && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 space-y-3.5 shrink-0">
              <div className="flex items-center gap-2 text-[#39FF14]">
                <Sliders className="w-4.5 h-4.5" />
                <span className="text-[10px] font-black uppercase tracking-wider">ESTÚDIO DE AUTOMOÇÃO DE CICLOS</span>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide leading-relaxed">
                Selecione o esquema de progressão desejável. O estúdio ajustará automaticamente as repetições, as cargas e a descrição de todos os exercícios na planilha de forma científica.
              </p>

              <div className="space-y-2">
                {[
                  { id: "linear", title: "Progressão Linear Acumulativa", desc: "Aumento progressivo de carga (+5%) e diminuição compensatória de reps.", color: "text-blue-400" },
                  { id: "undulating", title: "Periodização Ondulatória Diária", desc: "Varie o volume e a intensidade diariamente para evitar adaptação precoce.", color: "text-amber-400" },
                  { id: "accumulation", title: "Bloco de Acumulação / Hipertrofia", desc: "Aumento de séries totais (+1 Set, +2 Reps) com cargas submáximas.", color: "text-emerald-400" },
                  { id: "deload", title: "Semana de Deload / Regenerativa", desc: "Redução de 35% nas cargas e remoção de 1 série por exercício para dissipar fadiga.", color: "text-purple-400" },
                  { id: "tapering", title: "Polimento Competitivo (Tapering)", desc: "Queda drástica de 50% no volume e pico de intensidade neural (+10% Carga) para prontidão máxima.", color: "text-[#39FF14]" }
                ].map(item => (
                  <label 
                    key={item.id}
                    onClick={() => setProgressionMethod(item.id as any)}
                    className={`p-3 rounded-lg border flex flex-col cursor-pointer transition-all ${
                      progressionMethod === item.id 
                        ? "bg-[#111622] border-[#39FF14]/30" 
                        : "bg-slate-900/30 border-slate-850 hover:bg-slate-900/60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        checked={progressionMethod === item.id} 
                        onChange={() => {}}
                        className="accent-[#39FF14]"
                      />
                      <span className={`text-[10px] font-black uppercase tracking-wider ${item.color}`}>{item.title}</span>
                    </div>
                    <p className="text-[8.5px] text-slate-400 font-bold uppercase mt-1 leading-normal ml-5">{item.desc}</p>
                  </label>
                ))}
              </div>

              <button
                onClick={applyProgressionSystem}
                className="w-full bg-[#39FF14] hover:bg-[#32e00f] text-slate-950 font-black text-[10px] py-3 rounded-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest shadow-xl shadow-[#39FF14]/10 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 stroke-[3]" />
                APLICAR SISTEMA DE PROGRESSÃO
              </button>
            </div>

          </div>
        )}

        {/* TAB CONTENT: ASSESSMENT DEFICITS CLINIC */}
        {sidebarTab === "deficit" && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-y-auto no-scrollbar pb-6 px-1">
            
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 space-y-2 shrink-0">
              <div className="flex items-center gap-2 text-amber-400">
                <Brain className="w-4.5 h-4.5 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider">🎯 MOTOR CLÍNICO: PRESCRIÇÃO POR AVALIAÇÕES</span>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide leading-relaxed">
                Este painel sincroniza em tempo real as métricas de performance de {athleteName} com a biblioteca para identificar déficits e prescrever blocos de correção de elite.
              </p>
            </div>

            {/* DEFICIT LIST */}
            <div className="space-y-3">
              {(() => {
                // Get latest assessments safely
                const cmjs = athlete?.assessments?.cmj || [];
                const latestCmj = cmjs[cmjs.length - 1];
                
                const djs = athlete?.assessments?.dropJump || [];
                const latestDrop = djs[djs.length - 1];
                
                const imtps = athlete?.assessments?.imtp || [];
                const latestImtp = imtps[imtps.length - 1];
                
                const isometrics = athlete?.assessments?.isometricStrength || [];
                const latestIso = isometrics[isometrics.length - 1];

                // Criteria
                const isCmjLow = !latestCmj || latestCmj.height < 36;
                const isRsiLow = !latestDrop || latestDrop.rsi < 2.0;
                
                const rawImtpRel = latestImtp?.relativePeakForce || 0;
                const imtpRelKgf = rawImtpRel > 0 
                  ? (rawImtpRel < 10 ? rawImtpRel : rawImtpRel / 9.80665) 
                  : (latestImtp?.peakForce && athlete?.weight ? latestImtp.peakForce / athlete.weight : 0);
                const imtpRelNkg = imtpRelKgf * 9.80665;
                const minImtpKgf = athlete?.gender === "F" ? 1.50 : 1.80;
                const isImtpLow = !latestImtp || (imtpRelKgf > 0 && imtpRelKgf < minImtpKgf) || (latestImtp.peakForce && latestImtp.peakForce < 140);
                
                let isAsymmetryHigh = false;
                let asymmetryValue = 0;
                if (latestIso) {
                  const quadDiff = Math.abs(latestIso.quadricepsR - latestIso.quadricepsL);
                  const quadMax = Math.max(latestIso.quadricepsR, latestIso.quadricepsL);
                  if (quadMax > 0) {
                    asymmetryValue = (quadDiff / quadMax) * 100;
                    if (asymmetryValue > 10) isAsymmetryHigh = true;
                  }
                }

                const isIqRatioLow = latestIso && ((latestIso.iqRatioR && latestIso.iqRatioR < 0.60) || (latestIso.iqRatioL && latestIso.iqRatioL < 0.60));

                const deficits = [
                  {
                    id: "cmj",
                    title: "Déficit de Extensão Tripla / Potência Vertical",
                    status: isCmjLow ? "DEFICIT DETECTADO" : "LIVRE / OK",
                    statusColor: isCmjLow ? "text-red-400 bg-red-400/5 border-red-500/20" : "text-emerald-400 bg-emerald-400/5 border-emerald-500/20",
                    isDetected: isCmjLow,
                    metric: latestCmj ? `Último CMJ: ${latestCmj.height}cm (Ref: >36cm)` : "Nenhum CMJ cadastrado (Sugerido preventivo)",
                    desc: "Baixa produção de potência explosiva em saltos verticais, indicando necessidade de treinos de força-velocidade e pliometria vertical profunda.",
                    exercises: ["Trap Bar Jump Squat", "Agachamento Traseiro", "Kettlebell Swing", "Hang Power Clean"],
                  },
                  {
                    id: "rsi",
                    title: "Déficit de Rigidez Ativa / Elasticidade (RSI)",
                    status: isRsiLow ? "DEFICIT DETECTADO" : "LIVRE / OK",
                    statusColor: isRsiLow ? "text-amber-400 bg-amber-400/5 border-amber-500/20" : "text-emerald-400 bg-emerald-400/5 border-emerald-500/20",
                    isDetected: isRsiLow,
                    metric: latestDrop ? `Último RSI: ${latestDrop.rsi} (Ref: >2.0)` : "Nenhum Drop Jump cadastrado (Sugerido preventivo)",
                    desc: "Alto tempo de contato com o solo e baixa capacidade reativa (baixo RSI). Recomenda-se pliometria rápida de tornozelo (Fast SSC).",
                    exercises: ["Pogo Jumps", "Drop Jump", "Salto sobre barreiras"],
                  },
                  {
                    id: "imtp",
                    title: "Déficit de Força Isométrica Máxima / RFD",
                    status: isImtpLow ? "DEFICIT DETECTADO" : "LIVRE / OK",
                    statusColor: isImtpLow ? "text-red-400 bg-red-400/5 border-red-500/20" : "text-emerald-400 bg-emerald-400/5 border-emerald-500/20",
                    isDetected: isImtpLow,
                    metric: latestImtp ? `Força Relativa: ${imtpRelKgf.toFixed(2)} kgf/kg (${imtpRelNkg.toFixed(1)} N/kg)` : "Nenhum IMTP cadastrado",
                    desc: "Dificuldade em atingir altos picos de força em curtos intervalos de tempo. Recomenda-se isometria pesada multiarticular ou força pura.",
                    exercises: ["Agachamento Traseiro", "Isometric Mid-Thigh Pull", "Spanish Squat"],
                  },
                  {
                    id: "asymmetry",
                    title: "Assimetria de Membros / Lateralidade (>10%)",
                    status: isAsymmetryHigh ? "DÉFICIT CRÍTICO" : "DENTRO DO LIMITE",
                    statusColor: isAsymmetryHigh ? "text-red-500 bg-red-500/5 border-red-500/20 font-black animate-pulse" : "text-emerald-400 bg-emerald-400/5 border-emerald-500/20",
                    isDetected: isAsymmetryHigh,
                    metric: asymmetryValue > 0 ? `Diferença atual: ${asymmetryValue.toFixed(1)}% (Ref: <10%)` : "Sem assimetria registrada",
                    desc: "Desequilíbrio de força de quadríceps significativo entre os membros direito e esquerdo. Aumenta risco de lesão articular. Recomenda-se treino unilateral focado.",
                    exercises: ["Agachamento Búlgaro", "Single Leg RDL", "Single Leg Hip Thrust"],
                  },
                  {
                    id: "hamstring",
                    title: "Falta de Resistência Excêntrica de Isquiotibiais",
                    status: isIqRatioLow ? "ATENÇÃO / RISCO LESÃO" : "ESTÁVEL / SAUDÁVEL",
                    statusColor: isIqRatioLow ? "text-amber-500 bg-amber-500/5 border-amber-500/20" : "text-emerald-400 bg-emerald-400/5 border-emerald-500/20",
                    isDetected: isIqRatioLow,
                    metric: latestIso ? `Relação I/Q: ${(latestIso.iqRatioR || 0.65).toFixed(2)} (Ref: >0.60)` : "Sem relação de força I/Q cadastrada",
                    desc: "Déficit de força excêntrica ou fadiga severa nos isquiotibiais em relação ao quadríceps. Risco crítico de estiramento de posterior e lesão de LCA.",
                    exercises: ["Flexão Nórdica", "Romanian Deadlift", "Copenhagen Plank"],
                  }
                ];

                return deficits.map(def => (
                  <div key={def.id} className="p-4 bg-slate-950/50 rounded-xl border border-slate-900/85 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <span className="text-[10px] font-extrabold text-white block leading-tight truncate">{def.title}</span>
                        <span className="text-[8px] text-slate-500 font-bold block">{def.metric}</span>
                      </div>
                      <span className={`text-[7.5px] font-black px-2 py-0.5 rounded border uppercase shrink-0 ${def.statusColor}`}>
                        {def.status}
                      </span>
                    </div>

                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed bg-[#0c111d]/50 p-2.5 rounded-lg border border-slate-900">
                      {def.desc}
                    </p>

                    <div className="space-y-1.5">
                      <span className="text-[7.5px] text-[#39FF14] font-black uppercase tracking-wider block">🛠️ Exercícios Corretivos de Elite:</span>
                      
                      <div className="grid grid-cols-1 gap-1">
                        {def.exercises.map((exName, idx) => {
                          const matchingEx = ENRICHED_LIBRARY.find(x => 
                            x.name.toLowerCase().trim() === exName.toLowerCase().trim() ||
                            x.name.toLowerCase().includes(exName.toLowerCase()) ||
                            exName.toLowerCase().includes(x.name.toLowerCase())
                          );

                          if (matchingEx) {
                            return (
                              <div key={idx} className="flex items-center justify-between p-1.5 bg-slate-900/60 rounded-lg border border-slate-850 hover:border-[#39FF14]/20 transition-all">
                                <span className="text-[10px] font-extrabold text-slate-300 truncate">{matchingEx.name}</span>
                                <div className="flex items-center gap-1 shrink-0 ml-1">
                                  <button
                                    onClick={() => setSelectedDetailsExercise(matchingEx)}
                                    className="p-1 text-slate-400 hover:text-[#39FF14] hover:bg-[#39FF14]/5 rounded transition-all cursor-pointer"
                                    title="Ver Perfil Biomecânico"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => addExFromLib(matchingEx)}
                                    className="p-1 text-[#39FF14] hover:bg-[#39FF14]/10 rounded transition-all cursor-pointer"
                                    title="Prescrever de imediato"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={idx} className="p-1.5 bg-slate-900/20 text-slate-500 text-[10px] rounded border border-dashed border-slate-900 flex items-center justify-between">
                              <span>{exName}</span>
                              <span className="text-[8px] uppercase tracking-widest font-bold">Livre</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => addDeficitCorrectiveBlock(def.title, def.exercises)}
                      className="w-full bg-[#39FF14]/10 hover:bg-[#39FF14]/20 border border-[#39FF14]/30 text-[#39FF14] font-black text-[9px] py-2.5 rounded-lg transition-all tracking-wider uppercase cursor-pointer"
                    >
                      ⚡ PRESCREVER BLOCO DE CORREÇÃO INTEGRAL
                    </button>
                  </div>
                ));
              })()}
            </div>

          </div>
        )}

      </div>

      {/* RIGHT WORKOUT WORKSPACE */}
      <div className={`coach-editor-workspace ${activeMobileTab === "workout" ? "flex" : "hidden"} lg:flex flex-1 flex-col bg-[#05080e] overflow-hidden`}>
        
        {/* STREAMLINED WORKOUT HEADER BAR - ZERO FRICTION PRESCRIPTION */}
        <div className="py-3 px-4 sm:px-6 border-b border-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-[#0c111d]/95 backdrop-blur-md select-none">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0 flex-1">
            <span className="text-[9px] bg-[#39FF14]/15 text-[#39FF14] px-2.5 py-1 rounded-md border border-[#39FF14]/30 font-black tracking-wider uppercase shrink-0">
              PLANILHA
            </span>

            {/* Direct Inline Name Input - Instant Naming with No Modals */}
            <div className="relative min-w-[170px] max-w-[280px] sm:max-w-xs flex-1">
              <input
                type="text"
                value={edited.name}
                onChange={(e) => setEdited({ ...edited, name: e.target.value })}
                placeholder="Nome do Treino (ex: Treino A - Força)"
                className="w-full bg-slate-950/80 hover:bg-slate-950 focus:bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-[#39FF14] rounded-xl px-3 py-1.5 text-xs sm:text-sm font-extrabold text-white placeholder:text-slate-500 outline-none transition-all shadow-inner"
              />
            </div>

            {/* Quick Phase Selector */}
            <select
              value={edited.phase}
              onChange={(e) => setEdited({ ...edited, phase: e.target.value })}
              className="hidden sm:block bg-slate-950/80 hover:bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-300 outline-none cursor-pointer focus:border-[#39FF14] transition-all"
            >
              <option>Preparação Geral</option>
              <option>Preparação Específica</option>
              <option>Pré-Competitivo</option>
              <option>Competitivo</option>
              <option>Transição</option>
              <option>Mobilidade/Estabilidade</option>
              <option>Prescrito Elite</option>
            </select>

            {/* Quick Date Selector */}
            <input
              type="date"
              value={edited.date.split("T")[0]}
              onChange={(e) => setEdited({ ...edited, date: e.target.value })}
              className="hidden md:block bg-slate-950/80 hover:bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-400 outline-none focus:border-[#39FF14] transition-all"
            />

            {/* Mini Realtime Stats Badge */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-850 text-[10px] font-bold text-slate-400 shrink-0">
              <span className="text-white font-extrabold">{edited.exercises?.length || 0} Exs</span>
              <span className="text-slate-700">•</span>
              <span className="text-[#39FF14] font-black">{muscleDistribution.totalSets} Sets</span>
              <span className="text-slate-700">•</span>
              <span className="text-amber-400 font-bold">{estimatedDuration}m</span>
              {fieldMetrics.hasFieldExercises && (
                <>
                  <span className="text-slate-700">•</span>
                  <span className="text-emerald-400 font-black">🏃 {fieldMetrics.totalDistanceMeters}m</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Optional AI Periodization & Advanced Drawer Toggle */}
            {athlete && updateAthlete && (
              <button
                type="button"
                onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isHeaderExpanded
                    ? "bg-[#39FF14]/15 border-[#39FF14]/40 text-[#39FF14]"
                    : "bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300 hover:text-white"
                }`}
                title="Configurar Periodização e IA Co-Pilot (Opcional)"
              >
                <Brain className="w-3.5 h-3.5 text-[#39FF14]" />
                <span className="hidden md:inline">IA & Periodização</span>
                {isHeaderExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#39FF14]" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Fast Save Button directly in Header */}
            <button
              type="button"
              onClick={() => {
                const finalName = (edited.name || "").trim() || (athlete?.workouts?.length ? `Treino ${String.fromCharCode(65 + ((athlete.workouts.length || 0) % 26))}` : "Treino A");
                const finalExercises = (edited.exercises || []).map((ex, i) => ({
                  ...ex,
                  order_index: i
                }));
                onSave({
                  ...edited,
                  name: finalName,
                  date: edited.date.split("T")[0],
                  updatedAt: new Date().toISOString(),
                  exercises: finalExercises
                });
              }}
              className="px-3 py-1.5 bg-[#39FF14] hover:bg-[#32e00f] text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#39FF14]/10 flex items-center gap-1.5 cursor-pointer"
              title="Salvar Planilha Imediatamente"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span className="hidden sm:inline">Salvar</span>
            </button>

            {/* Desktop Close Button */}
            <button
              type="button"
              onClick={onCancel}
              className="hidden lg:flex p-1.5 sm:p-2 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-all cursor-pointer"
              title="Fechar e Descartar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* OPTIONAL EXPANDABLE IA CO-PILOT & PERIODIZATION DRAWER (OPEN ONLY WHEN REQUESTED) */}
        {isHeaderExpanded && athlete && updateAthlete && (
          <div className="p-4 sm:p-6 border-b border-slate-900 bg-[#0c111d] flex flex-col gap-4 relative shrink-0 animate-in slide-in-from-top-3 duration-250">
            <div className="flex items-center justify-between pb-2 border-b border-slate-850">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#39FF14] animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-widest text-[#39FF14]">
                  IA CO-PILOT (PERIODIZAÇÃO & DIAS DE TREINO)
                </h3>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20 uppercase">
                  Inteligente
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsHeaderExpanded(false)}
                className="text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Fechar Painel</span>
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            <p className="text-[8.5px] text-slate-400 font-bold leading-relaxed">
              A <span className="text-white font-black">IA Co-Pilot</span> analisa os dias da semana de treino (Academia vs Campo/Quadra), o período selecionado e a descrição do treinador para estruturar a periodização nas datas e dias corretos.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[7.5px] font-black text-slate-500 uppercase block mb-1">Data Início</label>
                <input
                  type="date"
                  value={localPeriodizationStart}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalPeriodizationStart(val);
                    if (updateAthlete && athlete) {
                      updateAthlete(athlete.id, { periodizationStart: val });
                    }
                  }}
                  className="w-full bg-[#161b26] text-[9px] font-black uppercase text-slate-200 border border-slate-850 p-2 rounded-lg focus:border-[#39FF14]"
                />
              </div>
              <div>
                <label className="text-[7.5px] font-black text-slate-500 uppercase block mb-1">Data Término</label>
                <input
                  type="date"
                  value={localPeriodizationEnd}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalPeriodizationEnd(val);
                    if (updateAthlete && athlete) {
                      updateAthlete(athlete.id, { periodizationEnd: val });
                    }
                  }}
                  className="w-full bg-[#161b26] text-[9px] font-black uppercase text-slate-200 border border-slate-850 p-2 rounded-lg focus:border-[#39FF14]"
                />
              </div>
            </div>

            {/* Weekdays for Academy and Field */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[7.5px] font-black text-slate-400 uppercase block mb-1.5">
                  🏋️‍♂️ Academia (Fortalecimento & Força)
                </label>
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 0, label: "D" },
                    { id: 1, label: "S" },
                    { id: 2, label: "T" },
                    { id: 3, label: "Q" },
                    { id: 4, label: "Q" },
                    { id: 5, label: "S" },
                    { id: 6, label: "S" },
                  ].map((day) => {
                    const isSelected = localAcademyDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => {
                          const newAcademy = localAcademyDays.includes(day.id)
                            ? localAcademyDays.filter((d: number) => d !== day.id)
                            : [...localAcademyDays, day.id].sort();
                          setLocalAcademyDays(newAcademy);
                          const unionDays = Array.from(new Set([...newAcademy, ...localCourtDays])).sort();
                          if (updateAthlete && athlete) {
                            updateAthlete(athlete.id, { academyDays: newAcademy, trainingDays: unionDays });
                          }
                        }}
                        className={`w-6 h-6 rounded-md text-[8px] font-black flex items-center justify-center border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#39FF14] border-[#39FF14] text-slate-950 font-black shadow-[0_0_8px_rgba(57,255,20,0.3)]"
                            : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[7.5px] font-black text-slate-400 uppercase block mb-1.5">
                  ⚽ Campo/Quadra (Técnico & Tático)
                </label>
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 0, label: "D" },
                    { id: 1, label: "S" },
                    { id: 2, label: "T" },
                    { id: 3, label: "Q" },
                    { id: 4, label: "Q" },
                    { id: 5, label: "S" },
                    { id: 6, label: "S" },
                  ].map((day) => {
                    const isSelected = localCourtDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => {
                          const newCourt = localCourtDays.includes(day.id)
                            ? localCourtDays.filter((d: number) => d !== day.id)
                            : [...localCourtDays, day.id].sort();
                          setLocalCourtDays(newCourt);
                          const unionDays = Array.from(new Set([...localAcademyDays, ...newCourt])).sort();
                          if (updateAthlete && athlete) {
                            updateAthlete(athlete.id, { courtDays: newCourt, trainingDays: unionDays });
                          }
                        }}
                        className={`w-6 h-6 rounded-md text-[8px] font-black flex items-center justify-center border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-brand-secondary border-brand-secondary text-brand-dark font-black shadow-[0_0_8px_rgba(57,255,20,0.3)]"
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

            {/* Coach description / strategic directions */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[7.5px] font-black text-slate-400 uppercase block">
                📝 Descrição & Diretrizes da Periodização (IA Co-Pilot)
              </label>
              <textarea
                value={iaInstructions}
                onChange={(e) => setIaInstructions(e.target.value)}
                placeholder="Ex: Focar em força explosiva e saltos, reduzir carga se houver fadiga na lombar, treinos de campo com foco em agilidade e mudanças de direção..."
                className="w-full bg-[#161b26] border border-slate-850 rounded-lg p-2.5 text-[9px] font-bold text-white outline-none focus:border-[#39FF14] resize-none h-16 placeholder:text-slate-700"
              />
            </div>

            {/* Periodize Action Button */}
            <button
              type="button"
              onClick={handlePeriodizeWithAi}
              disabled={iaWorkoutsLoading}
              className="w-full bg-[#39FF14] hover:bg-[#32e00f] disabled:bg-slate-850 text-slate-950 font-black text-[9.5px] py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer shadow-lg shadow-[#39FF14]/10"
            >
              {iaWorkoutsLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  IA CO-PILOT PERIODIZANDO ATLETA...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 stroke-[3]" />
                  GERAR PERIODIZAÇÃO COM IA CO-PILOT
                </>
              )}
            </button>
          </div>
        )}

        {/* WORKOUT LIST WITH SMART BENTO METRICS FOR BALANCING */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 no-scrollbar">
          
          {/* Realtime muscular loading bars */}
          {muscleDistribution.distribution.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#0c111d] rounded-2xl border border-slate-900/60 animate-in fade-in duration-300">
              <div className="col-span-full mb-1">
                <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Grid className="w-3.5 h-3.5 text-[#39FF14]" />
                  Balanço Muscular / Distribuição de Volume da Planilha Ativa
                </h5>
              </div>
              {muscleDistribution.distribution.map(dist => (
                <div key={dist.name} className="space-y-1 bg-slate-950/40 p-2.5 rounded-xl border border-slate-900">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400">
                    <span>{dist.name}</span>
                    <span>{dist.sets} sets ({dist.percent}%)</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-[#39FF14] to-emerald-400 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${dist.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CARD MÉTODOS AVANÇADOS: TODOS OS MÉTODOS DE FORÇA, POTÊNCIA, HIPERTROFIA E CAMPO */}
          <div className="advanced-methods-master-card p-4 sm:p-5 rounded-2xl border transition-all shadow-lg bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-amber-500/30 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                  <Zap className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h5 className="text-xs sm:text-sm font-black uppercase text-slate-100 tracking-wider flex items-center gap-2">
                    <span>MÉTODOS AVANÇADOS</span>
                    <span className="text-[8px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 font-bold">15 MÉTODOS</span>
                  </h5>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Adicione blocos com micro-pausas intra-série, pareamentos biomecânicos e tiros de campo
                  </p>
                </div>
              </div>
            </div>

            {/* Grid dos Métodos Avançados divididos em Força/Potência/Hipertrofia e Campo/Velocidade */}
            <div className="mt-3.5 space-y-3">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  Musculação, Força & Hipertrofia (S&C)
                </span>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={addFrenchContrastBlock}
                    className="px-2.5 py-1.5 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm group active:scale-95"
                    title="Adicionar Complexo Francês de 4 Estágios (1A PAP Pesado ➔ 1B Pliometria com Carga ➔ 1C Balístico ➔ 1D Pliometria Reativa RSI)"
                  >
                    <span>🇫🇷</span>
                    <span className="group-hover:text-white">Contraste Francês (4 Estágios)</span>
                  </button>

                  <button
                    type="button"
                    onClick={addClassicPapBlock}
                    className="px-2.5 py-1.5 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/40 hover:border-indigo-400 text-indigo-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm group active:scale-95"
                    title="Adicionar Par Contrastado PAP (1A Pesado + 1B Salto Explosivo)"
                  >
                    <span>⚡</span>
                    <span className="group-hover:text-white">Complex PAP (1A + 1B)</span>
                  </button>

                  <button
                    type="button"
                    onClick={addClusterSetTemplate}
                    className="px-2.5 py-1.5 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 hover:border-purple-400 text-purple-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm group active:scale-95"
                    title="Adicionar Série em Cluster (2+2+2 com micro-pausa de 20s)"
                  >
                    <span>🎯</span>
                    <span className="group-hover:text-white">Cluster Set</span>
                  </button>

                  <button
                    type="button"
                    onClick={addRestPauseTemplate}
                    className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/40 hover:border-rose-400 text-rose-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm group active:scale-95"
                    title="Adicionar Série em Rest-Pause (8+3+2 com micro-pausa de 15s)"
                  >
                    <span>🔥</span>
                    <span className="group-hover:text-white">Rest-Pause</span>
                  </button>

                  <button
                    type="button"
                    onClick={addDropSetTemplate}
                    className="px-2.5 py-1.5 bg-pink-950/40 hover:bg-pink-900/50 border border-pink-500/40 hover:border-pink-400 text-pink-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm group active:scale-95"
                    title="Adicionar Drop-Set Triplo (8+8+8 com reduções imediatas de carga)"
                  >
                    <span>📉</span>
                    <span className="group-hover:text-white">Drop-Set Triplo</span>
                  </button>

                  <button
                    type="button"
                    onClick={addBiSetTemplate}
                    className="px-2.5 py-1.5 bg-sky-950/40 hover:bg-sky-900/50 border border-sky-500/40 hover:border-sky-400 text-sky-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm group active:scale-95"
                    title="Adicionar Par em Bi-Set (1A Composto + 1B Isolador)"
                  >
                    <span>🔗</span>
                    <span className="group-hover:text-white">Bi-Set</span>
                  </button>

                  <button
                    type="button"
                    onClick={addSuperSetTemplate}
                    className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 hover:border-red-400 text-red-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm group active:scale-95"
                    title="Adicionar Super-Set Antagonista (ex: Bíceps + Tríceps)"
                  >
                    <span>⚔️</span>
                    <span className="group-hover:text-white">Super-Set</span>
                  </button>

                  <button
                    type="button"
                    onClick={addTriSetTemplate}
                    className="px-2.5 py-1.5 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/40 hover:border-amber-400 text-amber-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm group active:scale-95"
                    title="Adicionar Tri-Set (3 Exercícios Consecutivos)"
                  >
                    <span>🔱</span>
                    <span className="group-hover:text-white">Tri-Set</span>
                  </button>

                  <button
                    type="button"
                    onClick={addGvtTemplate}
                    className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm group active:scale-95"
                    title="Adicionar German Volume Training (10 séries x 10 reps @ 60s descanso)"
                  >
                    <span>🇩🇪</span>
                    <span className="group-hover:text-white">GVT (10x10)</span>
                  </button>

                  <button
                    type="button"
                    onClick={addMyoRepsTemplate}
                    className="px-2.5 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm group active:scale-95"
                    title="Adicionar Myo-Reps (Série de ativação + 4 mini-sets com 15s de pausa)"
                  >
                    <span>🧬</span>
                    <span className="group-hover:text-white">Myo-Reps</span>
                  </button>

                  <button
                    type="button"
                    onClick={addWaveLoadingTemplate}
                    className="px-2.5 py-1.5 bg-blue-950/40 hover:bg-blue-900/50 border border-blue-500/40 hover:border-blue-400 text-blue-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm group active:scale-95"
                    title="Adicionar Wave Loading Ondulatório (7-5-3 / 7-5-3)"
                  >
                    <span>🌊</span>
                    <span className="group-hover:text-white">Wave Loading</span>
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block mb-1.5">
                  Velocidade, Pista & Campo (Blocos & Intervalados)
                </span>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={addSprintRsaTemplate}
                    className="px-2.5 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm group active:scale-95"
                    title="Adicionar Tiros Curtos / RSA (2 Blocos de 5x 20m com micro-pausas)"
                  >
                    <span>🏃‍♂️</span>
                    <span className="group-hover:text-white">Tiros / RSA (5x 20m)</span>
                  </button>

                  <button
                    type="button"
                    onClick={addPyramidFieldTemplate}
                    className="px-2.5 py-1.5 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/40 hover:border-amber-400 text-amber-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm group active:scale-95"
                    title="Adicionar Pirâmide de Campo (10-20-30-40-30-20-10m)"
                  >
                    <span>🔺</span>
                    <span className="group-hover:text-white">Pirâmide de Campo</span>
                  </button>

                  <button
                    type="button"
                    onClick={addFartlekTemplate}
                    className="px-2.5 py-1.5 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm group active:scale-95"
                    title="Adicionar Fartlek Intermitente 15s:15s"
                  >
                    <span>⏱️</span>
                    <span className="group-hover:text-white">Fartlek (15s:15s)</span>
                  </button>

                  <button
                    type="button"
                    onClick={addShuttleRunTemplate}
                    className="px-2.5 py-1.5 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 hover:border-purple-400 text-purple-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm group active:scale-95"
                    title="Adicionar Shuttle Run Pro Agility 5-10-5m"
                  >
                    <span>⚡</span>
                    <span className="group-hover:text-white">Shuttle Run / COD</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE EXERCISES LIST */}
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {(edited.exercises || []).map((ex, index) => {
                const isExpanded = expandedExerciseId === ex.id;
                
                return (
                  <motion.div
                    key={ex.id}
                    layout="position"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`bg-[#0c111d] border rounded-2xl md:rounded-3xl relative group shadow-lg transition-all ${
                      exerciseToSwap?.id === ex.id
                        ? "ring-2 ring-cyan-400 border-cyan-400 shadow-xl shadow-cyan-500/20"
                        : ex.executionMethod === "complex_contrast"
                        ? (ex.blockTag || "").endsWith("A")
                          ? "border-cyan-500/50 bg-gradient-to-br from-[#0c111d] via-[#091421] to-[#0c111d] shadow-cyan-500/5"
                          : (ex.blockTag || "").endsWith("B")
                          ? "border-indigo-500/50 bg-gradient-to-br from-[#0c111d] via-[#101429] to-[#0c111d] shadow-indigo-500/5"
                          : (ex.blockTag || "").endsWith("C")
                          ? "border-amber-500/50 bg-gradient-to-br from-[#0c111d] via-[#1a170d] to-[#0c111d] shadow-amber-500/5"
                          : "border-emerald-500/50 bg-gradient-to-br from-[#0c111d] via-[#0b1c14] to-[#0c111d] shadow-emerald-500/5"
                        : ex.executionMethod === "cluster"
                        ? "border-purple-500/50 bg-gradient-to-br from-[#0c111d] via-[#160d26] to-[#0c111d] shadow-purple-500/5"
                        : ex.executionMethod === "rest_pause"
                        ? "border-rose-500/50 bg-gradient-to-br from-[#0c111d] via-[#210c14] to-[#0c111d] shadow-rose-500/5"
                        : isExpanded 
                        ? "border-[#39FF14]/30 ring-1 ring-[#39FF14]/10 shadow-[#39FF14]/5 bg-[#0e1627]" 
                        : "border-slate-900/60 hover:border-[#39FF14]/20 hover:bg-[#0c111d]/80 cursor-pointer"
                    } ${isExpanded ? "p-5 md:p-6" : "p-4"}`}
                    onClick={() => {
                      if (!isExpanded) {
                        setExpandedExerciseId(ex.id);
                      }
                    }}
                  >
                    {/* Floating Controls */}
                    <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-all z-10">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveEx(index, "up"); }}
                        disabled={index === 0}
                        className="bg-slate-950 text-slate-400 w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-slate-850 shadow-md hover:text-[#39FF14] disabled:opacity-30 disabled:hover:text-slate-400 flex items-center justify-center transition-all cursor-pointer"
                        title="Mover para cima"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveEx(index, "down"); }}
                        disabled={index === (edited.exercises || []).length - 1}
                        className="bg-slate-950 text-slate-400 w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-slate-850 shadow-md hover:text-[#39FF14] disabled:opacity-30 disabled:hover:text-slate-400 flex items-center justify-center transition-all cursor-pointer"
                        title="Mover para baixo"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExerciseToSwap(ex);
                          setSwapSearchQuery("");
                          setSwapCategoryFilter("TODOS");
                        }}
                        className="bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-400 hover:text-cyan-200 w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-cyan-500/30 hover:border-cyan-400 shadow-md flex items-center justify-center transition-all cursor-pointer group/swap active:scale-95"
                        title={ex.executionMethod === "complex_contrast"
                          ? `Trocar Estágio ${ex.blockTag || "1A"} por outro da Biblioteca (ex: Meio Agachamento Isométrico IMTP)`
                          : "Trocar exercício por outro da Biblioteca"}
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 group-hover/swap:rotate-180 transition-transform duration-300" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); saveExerciseToLibrary(ex); }}
                        className="bg-slate-950 text-slate-400 w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-slate-850 shadow-md hover:text-blue-400 flex items-center justify-center transition-all cursor-pointer"
                        title="Salvar na Biblioteca para acervo 💾"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); duplicateBlock(ex); }}
                        className="bg-slate-950 text-slate-400 w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-slate-850 shadow-md hover:text-amber-400 flex items-center justify-center transition-all cursor-pointer"
                        title="Duplicar Exercício"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeEx(ex.id); }}
                        className="bg-red-950/20 text-red-400 border border-red-900/40 w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-red-500 hover:text-slate-950 flex items-center justify-center transition-all cursor-pointer"
                        title="Excluir exercício"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {!isExpanded ? (
                      /* COMPACT / COLLAPSED CARD MODE - EXTREMELY SPACE-EFFICIENT */
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pr-32 sm:pr-40 md:pr-44">
                        <div className="flex items-center gap-3 min-w-0 pr-4 sm:pr-0">
                          <div className="w-8 h-8 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center text-[#39FF14] text-xs font-black italic shrink-0">
                            #{index + 1}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-[#39FF14] transition-colors truncate flex items-center gap-2">
                              <span>{ex.name || "Sem Nome"}</span>
                              {exerciseToSwap?.id === ex.id && (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-cyan-500 text-slate-950 flex items-center gap-1 shadow-xs animate-pulse">
                                  <ArrowLeftRight className="w-3 h-3" />
                                  <span>Em Troca</span>
                                </span>
                              )}
                            </h4>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              {ex.muscleGroup || "GERAL"}
                            </p>
                          </div>
                        </div>

                        {/* Quick Prescription Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          {ex.executionMethod === "complex_contrast" && (
                            <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border shadow-sm ${
                              (ex.blockTag || "").endsWith("A")
                                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                                : (ex.blockTag || "").endsWith("B")
                                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                                : (ex.blockTag || "").endsWith("C")
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            }`}>
                              🇫🇷 {ex.blockTag || "1A"} • {ex.blockRole?.split(":")[1]?.trim() || "PAP / Contraste"}
                            </span>
                          )}
                          {ex.executionMethod === "cluster" && (
                            <span className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              🎯 Cluster {ex.clusterReps || ex.reps} • {ex.intraSetRest || 20}s
                            </span>
                          )}
                          {ex.executionMethod === "rest_pause" && (
                            <span className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              🔥 Rest-Pause • {ex.intraSetRest || 15}s
                            </span>
                          )}
                          {ex.executionMethod === "sprint_rsa" && (
                            <span className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              ⚡ Tiros / RSA • {ex.intraSetRest ?? 20}s
                            </span>
                          )}
                          {ex.executionMethod === "pyramid_field" && (
                            <span className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              📐 Pirâmide de Campo
                            </span>
                          )}
                          {ex.executionMethod === "fartlek" && (
                            <span className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                              ⏱️ Fartlek / Intermitente
                            </span>
                          )}
                          {ex.executionMethod === "shuttle_run" && (
                            <span className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              🔄 Shuttle COD
                            </span>
                          )}

                          <div className="flex items-center gap-1 bg-slate-950 border border-slate-900/80 px-2.5 py-1 rounded-xl">
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">
                              {isFieldOrRunningExercise(ex) ? "Blocos" : "Séries"}
                            </span>
                            <span className="text-[#39FF14] text-xs font-extrabold">{ex.sets}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-slate-950 border border-slate-900/80 px-2.5 py-1 rounded-xl">
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">
                              {isFieldOrRunningExercise(ex) ? "Tiros" : "Volume"}
                            </span>
                            <span className="text-slate-200 text-xs font-extrabold">
                              {ex.clusterReps || ex.reps}{ex.repsType === "time" ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 bg-slate-950 border border-slate-900/80 px-2.5 py-1 rounded-xl">
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">
                              {isFieldOrRunningExercise(ex) ? "Intensidade" : "Carga"}
                            </span>
                            <span className="text-slate-200 text-xs font-extrabold">{ex.weight || "BW"}</span>
                          </div>
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-850 hover:border-amber-400/50 focus-within:border-amber-400 px-2.5 py-1 rounded-xl transition-all shadow-sm group/rest cursor-text"
                            title="Clique para editar Transição ou Pausa diretamente"
                          >
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 group-hover/rest:text-amber-500 transition-colors">
                              {ex.executionMethod === "complex_contrast" ? "Transição" : isFieldOrRunningExercise(ex) ? "Inter-Blocos" : "Pausa"}:
                            </span>
                            <input
                              value={ex.rest || (ex.executionMethod === "complex_contrast" ? "20s" : "90s")}
                              onChange={(e) => updateExField(ex.id, "rest", e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => {
                                e.stopPropagation();
                                (e.target as HTMLInputElement).select();
                              }}
                              className="w-14 bg-transparent text-amber-500 dark:text-amber-400 text-xs font-black text-center outline-none border-b border-dashed border-amber-500/30 focus:border-amber-400 py-0.5"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* FULL EDITABLE FORM (EXPANDED) */
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        
                        {/* Index & Name */}
                        <div className="md:col-span-4 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-[#39FF14] italic">#{index + 1}</span>
                            <input
                              value={ex.name}
                              onChange={(e) => updateExField(ex.id, "name", e.target.value)}
                              className="bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:border-b-[#39FF14] outline-none text-base md:text-lg text-slate-900 dark:text-slate-100 font-extrabold w-full py-1 transition-colors"
                            />
                          </div>
                          <input
                            value={ex.muscleGroup}
                            onChange={(e) => updateExField(ex.id, "muscleGroup", e.target.value)}
                            className="bg-transparent text-[10px] font-black uppercase text-slate-400 w-full outline-none focus:text-slate-300"
                            placeholder="Grupo Muscular"
                          />
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExerciseToSwap(ex);
                                setSwapSearchQuery("");
                                setSwapCategoryFilter("TODOS");
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 dark:text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                              title="Trocar este exercício por outro da Biblioteca"
                            >
                              <ArrowLeftRight className="w-3 h-3 text-cyan-400" />
                              <span>Trocar da Biblioteca</span>
                            </button>
                            {ex.executionMethod === "complex_contrast" && (
                              <span className="text-[9px] font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                                {ex.blockTag || "1A"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Numeric Prescriptions */}
                        <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <div>
                            <label className="text-[10px] text-slate-400 uppercase font-extrabold block tracking-wider mb-1">
                              {isFieldOrRunningExercise(ex) ? "Blocos" : "Séries"}
                            </label>
                            <input
                              type="number"
                              value={ex.sets}
                              onChange={(e) => updateExField(ex.id, "sets", parseInt(e.target.value) || 1)}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              className="w-full bg-slate-950/50 border border-slate-800 focus:border-[#39FF14]/50 rounded-xl p-3 text-sm text-white text-center font-extrabold transition-all"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 uppercase font-extrabold block tracking-wider mb-1">
                              Tipo
                            </label>
                            <select
                              value={ex.repsType || (isTimeExercise(ex) ? "time" : (String(ex.reps || "").toLowerCase().includes("m") ? "meters" : "reps"))}
                              onChange={(e) => updateExField(ex.id, "repsType", e.target.value)}
                              className="w-full bg-slate-950/50 border border-slate-800 focus:border-[#39FF14]/50 rounded-xl p-3 text-sm text-slate-300 font-extrabold transition-all"
                            >
                              <option value="reps">Reps</option>
                              <option value="time">Tempo (s)</option>
                              <option value="meters">Metros (m)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 uppercase font-extrabold block tracking-wider mb-1">
                              {ex.repsType === "meters" ? "Metros (m)" : isTimeExercise(ex) ? "Duração (s)" : isFieldOrRunningExercise(ex) ? "Tiros / Reps" : "Volume / Reps"}
                            </label>
                            <input
                              value={ex.reps}
                              onChange={(e) => updateExField(ex.id, "reps", e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              className="w-full bg-slate-950/50 border border-slate-800 focus:border-[#39FF14]/50 rounded-xl p-3 text-sm text-white text-center font-extrabold transition-all"
                              placeholder={ex.repsType === "meters" ? "20m" : isTimeExercise(ex) ? "30s" : "10"}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 uppercase font-extrabold block tracking-wider mb-1">
                              {isFieldOrRunningExercise(ex) ? "Intensidade" : "Carga"}
                            </label>
                            <input
                              value={ex.weight}
                              onChange={(e) => updateExField(ex.id, "weight", e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              className="w-full bg-slate-950/50 border border-slate-800 focus:border-[#39FF14]/50 rounded-xl p-3 text-sm text-white text-center font-extrabold transition-all"
                              placeholder={isFieldOrRunningExercise(ex) ? "100% Máx" : "BW"}
                            />
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">
                                {ex.executionMethod === "complex_contrast" ? "Transição" : isFieldOrRunningExercise(ex) ? "Inter-Blocos" : "Descanso"}
                              </label>
                              <span className="text-[8.5px] text-amber-500 font-bold hidden sm:inline">⚡ Clique e edite</span>
                            </div>
                            <input
                              value={ex.rest || (ex.executionMethod === "complex_contrast" ? "20s" : "90s")}
                              onChange={(e) => updateExField(ex.id, "rest", e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              className="w-full bg-slate-950/50 border border-slate-800 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 rounded-xl p-3 text-sm text-amber-500 dark:text-amber-400 text-center font-black transition-all outline-none"
                              placeholder={ex.executionMethod === "complex_contrast" ? "20s" : "90s"}
                            />
                            {/* Preset pills for 1-click editing */}
                            <div className="flex items-center justify-center gap-1 mt-1.5 flex-wrap">
                              {(ex.executionMethod === "complex_contrast" 
                                ? ["15s", "20s", "30s", "45s", "3m30s"] 
                                : ["30s", "45s", "60s", "90s", "2m", "3m"]
                              ).map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateExField(ex.id, "rest", preset);
                                    if (ex.executionMethod === "complex_contrast" && preset.endsWith("s") && !preset.includes("m")) {
                                      updateExField(ex.id, "intraSetRest", parseInt(preset) || 20);
                                    }
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase transition-all cursor-pointer ${
                                    ex.rest === preset
                                      ? "bg-amber-500 text-slate-950 font-black shadow"
                                      : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-amber-400 border border-slate-800"
                                  }`}
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* ADVANCED S&C EXECUTION METHOD CONFIGURATOR */}
                        <div className="md:col-span-12 mt-3 pt-3 border-t border-slate-800/80 bg-slate-950/70 p-4 rounded-2xl border border-slate-900">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-amber-400" />
                              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">
                                Método Especial de Treinamento
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {[
                                { id: "standard", label: "Padrão", icon: "🏋️‍♂️", group: "strength" },
                                { id: "complex_contrast", label: "🇫🇷 Contraste Francês", icon: "🇫🇷", group: "strength" },
                                { id: "cluster", label: "🎯 Cluster Set", icon: "🎯", group: "strength" },
                                { id: "rest_pause", label: "🔥 Rest-Pause", icon: "🔥", group: "strength" },
                                { id: "drop_set", label: "📉 Drop-Set", icon: "📉", group: "strength" },
                                { id: "bi_set", label: "⚡ Bi-Set", icon: "⚡", group: "strength" },
                                { id: "tri_set", label: "🔱 Tri-Set", icon: "🔱", group: "strength" },
                                { id: "super_set", label: "⚔️ Super-Set", icon: "⚔️", group: "strength" },
                                { id: "gvt", label: "🇩🇪 GVT (10x10)", icon: "🇩🇪", group: "strength" },
                                { id: "myo_reps", label: "🧬 Myo-Reps", icon: "🧬", group: "strength" },
                                { id: "wave_loading", label: "🌊 Wave Loading", icon: "🌊", group: "strength" },
                                // Métodos de Campo & Quadra
                                { id: "sprint_rsa", label: "🏃‍♂️ Tiros / RSA", icon: "🏃‍♂️", group: "field" },
                                { id: "pyramid_field", label: "🔺 Pirâmide Campo", icon: "🔺", group: "field" },
                                { id: "fartlek", label: "⏱️ Fartlek", icon: "⏱️", group: "field" },
                                { id: "shuttle_run", label: "⚡ Shuttle Run / COD", icon: "⚡", group: "field" },
                              ].map((m) => {
                                const isCurrent = (ex.executionMethod || "standard") === m.id;
                                const isField = m.group === "field";
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const structured = structureExerciseForMethod(
                                        ex,
                                        m.id as AdvancedExecutionMethod,
                                        index,
                                        edited.exercises || []
                                      );
                                      updateExFields(ex.id, structured);
                                      const meta = getSpecialMethodMeta(m.id as AdvancedExecutionMethod);
                                      toast.success(`${meta.badge}: Exercício estruturado com sucesso! (Séries: ${structured.sets}, Reps: ${structured.reps}, Carga: ${structured.weight}, Descanso: ${structured.rest})`, {
                                        icon: meta.icon,
                                        duration: 4000
                                      });
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95 ${
                                      isCurrent
                                        ? isField 
                                          ? "bg-emerald-400 text-slate-950 shadow-md font-black ring-2 ring-emerald-400/50"
                                          : "bg-amber-400 text-slate-950 shadow-md font-black ring-2 ring-amber-400/50"
                                        : isField
                                        ? "bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 hover:text-white border border-emerald-500/30"
                                        : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800"
                                    }`}
                                    title={`Estruturar exercício para o método ${m.label}`}
                                  >
                                    <span>{m.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Render Dedicated Pedagogical Panel & Structured Controls for Selected Method */}
                          {ex.executionMethod && ex.executionMethod !== "standard" && (() => {
                            const methodMeta = getSpecialMethodMeta(ex.executionMethod);
                            return (
                              <div className="pt-3 border-t border-slate-900 text-xs space-y-3">
                                {/* Complex Contrast Stage Manager */}
                                {ex.executionMethod === "complex_contrast" && (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                      <div className="sm:col-span-3">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                          Posição no Bloco (ex: 1A, 1B, 1C, 1D)
                                        </label>
                                        <div className="flex gap-1">
                                          {["1A", "1B", "1C", "1D", "2A", "2B", "2C", "2D"].map((tag) => (
                                            <button
                                              key={tag}
                                              type="button"
                                              onClick={() => {
                                                let newRole = ex.blockRole || "1A: Carga Pesada (PAP 80-85% 1RM)";
                                                let newRest = "20s";
                                                let newWeight = ex.weight;
                                                let newReps = ex.reps;
                                                if (tag.endsWith("A")) {
                                                  newRole = "1A: Carga Pesada (PAP 80-85% 1RM)";
                                                  newRest = "20s";
                                                  if (!ex.weight || ex.weight === "BW") newWeight = "85% 1RM";
                                                  if (!ex.reps || ex.reps === "10") newReps = "3";
                                                } else if (tag.endsWith("B")) {
                                                  newRole = "1B: Pliometria com Sobrecarga (Salto)";
                                                  newRest = "20s";
                                                  if (!ex.weight) newWeight = "BW";
                                                  if (!ex.reps || ex.reps === "10") newReps = "4";
                                                } else if (tag.endsWith("C")) {
                                                  newRole = "1C: Velocidade Balística (30% 1RM)";
                                                  newRest = "20s";
                                                  if (!ex.weight || ex.weight === "BW") newWeight = "30% 1RM";
                                                  if (!ex.reps || ex.reps === "10") newReps = "4";
                                                } else if (tag.endsWith("D")) {
                                                  newRole = "1D: Pliometria Reativa (RSI / Drop Jump)";
                                                  newRest = ex.blockRest || "3m30s";
                                                  if (!ex.weight) newWeight = "BW";
                                                  if (!ex.reps || ex.reps === "10") newReps = "4";
                                                }
                                                updateExFields(ex.id, {
                                                  blockTag: tag,
                                                  blockRole: newRole,
                                                  rest: newRest,
                                                  weight: newWeight,
                                                  reps: newReps,
                                                  notes: `[CONTRASTE FRANCÊS 🇫🇷] Estágio ${tag}: ${newRole}`
                                                });
                                              }}
                                              className={`flex-1 py-1.5 text-[10px] font-black rounded-lg border transition-all cursor-pointer ${
                                                (ex.blockTag || "1A") === tag
                                                  ? "bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow"
                                                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                                              }`}
                                            >
                                              {tag}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="sm:col-span-5">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                          Papel no Complexo Francês / PAPE
                                        </label>
                                        <select
                                          value={ex.blockRole || "1A: Carga Pesada (PAP 80-85% 1RM)"}
                                          onChange={(e) => updateExFields(ex.id, { blockRole: e.target.value, notes: `[CONTRASTE FRANCÊS 🇫🇷] Estágio ${ex.blockTag || '1A'}: ${e.target.value}` })}
                                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold outline-none focus:border-cyan-400"
                                        >
                                          <option value="1A: Carga Pesada (PAP 80-85% 1RM)">1A: Carga Pesada / Força Máxima (PAP - 80-85% 1RM)</option>
                                          <option value="1B: Pliometria com Sobrecarga (Salto)">1B: Pliometria com Sobrecarga / Salto Acentuado</option>
                                          <option value="1C: Velocidade Balística (30% 1RM)">1C: Velocidade Balística / Força Rápida (30% 1RM)</option>
                                          <option value="1D: Pliometria Reativa (RSI / Drop Jump)">1D: Pliometria Reativa / Assistida (RSI / Drop Jump)</option>
                                          <option value="Agonista / Antagonista">Par Agonista / Antagonista</option>
                                          <option value="Customizado">Customizado</option>
                                        </select>
                                      </div>

                                      <div className="sm:col-span-2">
                                        <div className="flex items-center justify-between mb-1">
                                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                            Transição Rápida
                                          </label>
                                          <span className="text-[8px] text-cyan-500 font-bold hidden sm:inline">⚡ intra-bloco</span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 focus-within:border-cyan-400 rounded-xl px-2.5 py-2 transition-all">
                                          <input
                                            type="number"
                                            value={ex.intraSetRest ?? 20}
                                            onChange={(e) => {
                                              const val = parseInt(e.target.value) || 0;
                                              updateExFields(ex.id, {
                                                intraSetRest: val,
                                                ...(!(ex.blockTag || "").endsWith("D") ? { rest: `${val}s` } : {})
                                              });
                                            }}
                                            onFocus={(e) => e.target.select()}
                                            onClick={(e) => (e.target as HTMLInputElement).select()}
                                            className="w-full bg-transparent text-slate-100 font-black text-center text-xs outline-none"
                                          />
                                          <span className="text-[9px] text-slate-400 font-bold">s</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-1 mt-1">
                                          {[15, 20, 30, 45].map((sec) => (
                                            <button
                                              key={sec}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateExFields(ex.id, {
                                                  intraSetRest: sec,
                                                  ...(!(ex.blockTag || "").endsWith("D") ? { rest: `${sec}s` } : {})
                                                });
                                              }}
                                              className={`flex-1 py-0.5 rounded text-[8px] font-black uppercase transition-all cursor-pointer ${
                                                (ex.intraSetRest ?? 20) === sec
                                                  ? "bg-cyan-500 text-slate-950 font-black"
                                                  : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-cyan-400 border border-slate-800"
                                              }`}
                                            >
                                              {sec}s
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="sm:col-span-2">
                                        <div className="flex items-center justify-between mb-1">
                                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                            Pausa pós-Round
                                          </label>
                                          <span className="text-[8px] text-amber-500 font-bold hidden sm:inline">⏱️ pós 1D</span>
                                        </div>
                                        <input
                                          type="text"
                                          value={ex.blockRest || "3m30s"}
                                          onChange={(e) => {
                                            updateExFields(ex.id, {
                                              blockRest: e.target.value,
                                              ...((ex.blockTag || "").endsWith("D") ? { rest: e.target.value } : {})
                                            });
                                          }}
                                          onFocus={(e) => e.target.select()}
                                          onClick={(e) => (e.target as HTMLInputElement).select()}
                                          placeholder="3m30s"
                                          className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 rounded-xl px-2.5 py-2 text-xs text-amber-500 dark:text-amber-400 font-black text-center outline-none transition-all"
                                        />
                                        <div className="flex items-center justify-between gap-1 mt-1">
                                          {["2m", "2m30s", "3m", "3m30s", "4m"].map((pRest) => (
                                            <button
                                              key={pRest}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateExFields(ex.id, {
                                                  blockRest: pRest,
                                                  ...((ex.blockTag || "").endsWith("D") ? { rest: pRest } : {})
                                                });
                                              }}
                                              className={`flex-1 py-0.5 rounded text-[7.5px] font-black uppercase transition-all cursor-pointer ${
                                                (ex.blockRest || "3m30s") === pRest
                                                  ? "bg-amber-500 text-slate-950 font-black"
                                                  : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-amber-400 border border-slate-800"
                                              }`}
                                            >
                                              {pRest}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Quick Next Stage Adder */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 bg-cyan-500/10 dark:bg-cyan-950/20 border border-cyan-500/30 rounded-xl px-3 py-2.5 shadow-sm">
                                      <div className="text-[11px] font-bold text-cyan-900 dark:text-cyan-200 flex flex-wrap items-center gap-2">
                                        <span>
                                          <span className="font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Bloco Vinculado:</span> {ex.blockTag || "1A"} • {ex.blockRole || "PAP / Contraste"}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExerciseToSwap(ex);
                                            setSwapSearchQuery("");
                                            setSwapCategoryFilter("TODOS");
                                          }}
                                          className="px-2 py-0.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-800 dark:text-cyan-200 border border-cyan-500/40 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                                          title={`Trocar exercício do Estágio ${ex.blockTag || '1A'} por outro da Biblioteca`}
                                        >
                                          <ArrowLeftRight className="w-2.5 h-2.5 text-cyan-600 dark:text-cyan-400" />
                                          <span>Trocar Estágio {ex.blockTag || "1A"}</span>
                                        </button>
                                      </div>
                                      {(() => {
                                        const tag = ex.blockTag || "1A";
                                        const nextLetter = tag.endsWith("A") ? "B" : tag.endsWith("B") ? "C" : tag.endsWith("C") ? "D" : null;
                                        if (!nextLetter) return null;
                                        const nextTag = `${tag.slice(0, -1)}${nextLetter}`;
                                        return (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const current = edited.exercises || [];
                                              const nextRole = nextLetter === "B" 
                                                ? "1B: Pliometria com Sobrecarga (Salto)"
                                                : nextLetter === "C"
                                                ? "1C: Velocidade Balística (30% 1RM)"
                                                : "1D: Pliometria Reativa (RSI / Drop Jump)";
                                              const nextName = nextLetter === "B"
                                                ? "Salto Vertical com Sobrecarga / Trap Bar Jump"
                                                : nextLetter === "C"
                                                ? "Agachamento com Salto Balístico (30% 1RM)"
                                                : "Drop Jump / Box Jump Reativo (RSI)";
                                              const nextWeight = nextLetter === "C" ? "30% 1RM" : "BW";
                                              const nextRest = nextLetter === "D" ? "3m30s" : "20s";

                                              const newEx: PrescribedExercise = {
                                                id: `ex-stage-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                                                name: nextName,
                                                muscleGroup: ex.muscleGroup,
                                                sets: ex.sets,
                                                reps: "4",
                                                weight: nextWeight,
                                                repsType: "reps",
                                                rest: nextRest,
                                                notes: `Estágio ${nextTag}: ${nextRole}`,
                                                executionMethod: "complex_contrast",
                                                blockTag: nextTag,
                                                blockRole: nextRole,
                                                intraSetRest: 20,
                                                blockRest: "3m30s",
                                                order_index: index + 1
                                              };

                                              const updatedList = [...current.slice(0, index + 1), newEx, ...current.slice(index + 1)].map((e, i) => ({ ...e, order_index: i }));
                                              setEdited(prev => ({ ...prev, exercises: updatedList }));
                                              setExpandedExerciseId(newEx.id);
                                              toast.success(`Estágio ${nextTag} adicionado ao Bloco Francês!`, { icon: "🇫🇷" });
                                            }}
                                            className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow flex items-center gap-1"
                                          >
                                            <span>+ Adicionar Estágio {nextTag}</span>
                                          </button>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                )}

                                {/* Dedicated Presets & Micro-Rest Controls for Other Methods */}
                                {ex.executionMethod === "cluster" && (
                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                    <div className="sm:col-span-6">
                                      <div className="flex items-center justify-between mb-1">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                          Estrutura de Reps Intra-Série (ex: 2+2+2 ou 3+3)
                                        </label>
                                        <span className="text-[8.5px] text-purple-400 font-bold hidden sm:inline">⚡ Clique e edite</span>
                                      </div>
                                      <input
                                        type="text"
                                        value={ex.clusterReps || ex.reps || "2+2+2"}
                                        onChange={(e) => updateExFields(ex.id, { clusterReps: e.target.value, reps: e.target.value })}
                                        placeholder="2+2+2"
                                        className="w-full bg-slate-950 border border-slate-800 focus:border-purple-400 rounded-xl p-2.5 text-xs text-purple-400 font-black outline-none transition-all"
                                      />
                                      <div className="flex items-center gap-1.5 mt-1.5">
                                        {methodMeta.repsPresets?.map((preset) => (
                                          <button
                                            key={preset}
                                            type="button"
                                            onClick={() => updateExFields(ex.id, { clusterReps: preset, reps: preset })}
                                            className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase transition-all cursor-pointer ${
                                              (ex.clusterReps || ex.reps) === preset
                                                ? "bg-purple-600 text-white font-black"
                                                : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-purple-400 border border-slate-800"
                                            }`}
                                          >
                                            {preset}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="sm:col-span-6">
                                      <div className="flex items-center justify-between mb-1">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                          Micro-Pausa Intra-Cluster (repouso na barra)
                                        </label>
                                        <span className="text-[8.5px] text-purple-400 font-bold hidden sm:inline">⏱️ segundos</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {methodMeta.intraRestPresets?.map((sec) => (
                                          <button
                                            key={sec}
                                            type="button"
                                            onClick={() => updateExField(ex.id, "intraSetRest", sec)}
                                            className={`flex-1 py-2 text-[10px] font-black rounded-lg border transition-all cursor-pointer ${
                                              (ex.intraSetRest ?? 20) === sec
                                                ? "bg-purple-600 text-white border-purple-400 font-black shadow"
                                                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                                            }`}
                                          >
                                            {sec}s
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {ex.executionMethod === "rest_pause" && (
                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                    <div className="sm:col-span-6">
                                      <div className="flex items-center justify-between mb-1">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                          Micro-Pausa Rest-Pause (tempo de respiração antes do mini-set)
                                        </label>
                                        <span className="text-[8.5px] text-rose-400 font-bold hidden sm:inline">⏱️ segundos</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {methodMeta.intraRestPresets?.map((sec) => (
                                          <button
                                            key={sec}
                                            type="button"
                                            onClick={() => updateExField(ex.id, "intraSetRest", sec)}
                                            className={`flex-1 py-2 text-[10px] font-black rounded-lg border transition-all cursor-pointer ${
                                              (ex.intraSetRest ?? 15) === sec
                                                ? "bg-rose-600 text-white border-rose-400 font-black shadow"
                                                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                                            }`}
                                          >
                                            {sec}s
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="sm:col-span-6">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                        Presets de Repetições Rest-Pause
                                      </label>
                                      <div className="flex items-center gap-1.5">
                                        {methodMeta.repsPresets?.map((preset) => (
                                          <button
                                            key={preset}
                                            type="button"
                                            onClick={() => updateExFields(ex.id, { reps: preset })}
                                            className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer flex-1 ${
                                              ex.reps === preset
                                                ? "bg-rose-600 text-white font-black"
                                                : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-rose-400 border border-slate-800"
                                            }`}
                                          >
                                            {preset}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {ex.executionMethod === "drop_set" && (
                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                    <div className="sm:col-span-6">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                        Estrutura de Reps no Drop (ex: 8+8+8 ou 10+8+6)
                                      </label>
                                      <div className="flex items-center gap-1.5">
                                        {methodMeta.repsPresets?.map((preset) => (
                                          <button
                                            key={preset}
                                            type="button"
                                            onClick={() => updateExFields(ex.id, { reps: preset })}
                                            className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer flex-1 ${
                                              ex.reps === preset
                                                ? "bg-amber-500 text-slate-950 font-black shadow"
                                                : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-amber-400 border border-slate-800"
                                            }`}
                                          >
                                            {preset}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="sm:col-span-6">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                        Descanso entre Séries Completas
                                      </label>
                                      <div className="flex items-center gap-1.5">
                                        {methodMeta.restPresets?.map((pRest) => (
                                          <button
                                            key={pRest}
                                            type="button"
                                            onClick={() => updateExFields(ex.id, { rest: pRest })}
                                            className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer flex-1 ${
                                              ex.rest === pRest
                                                ? "bg-amber-500 text-slate-950 font-black shadow"
                                                : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-amber-400 border border-slate-800"
                                            }`}
                                          >
                                            {pRest}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {(ex.executionMethod === "bi_set" || ex.executionMethod === "tri_set" || ex.executionMethod === "super_set") && (
                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                    <div className="sm:col-span-6">
                                      <div className="flex items-center justify-between mb-1">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                          Transição Rápida entre Exercícios
                                        </label>
                                        <span className="text-[8.5px] text-blue-400 font-bold hidden sm:inline">⚡ segundos</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {methodMeta.intraRestPresets?.map((sec) => (
                                          <button
                                            key={sec}
                                            type="button"
                                            onClick={() => updateExField(ex.id, "intraSetRest", sec)}
                                            className={`flex-1 py-1.5 text-[10px] font-black rounded-lg border transition-all cursor-pointer ${
                                              (ex.intraSetRest ?? 10) === sec
                                                ? "bg-blue-600 text-white border-blue-400 font-black shadow"
                                                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                                            }`}
                                          >
                                            {sec}s
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="sm:col-span-6">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                        Descanso Completo pós-Bloco
                                      </label>
                                      <div className="flex items-center gap-1.5">
                                        {methodMeta.restPresets?.map((pRest) => (
                                          <button
                                            key={pRest}
                                            type="button"
                                            onClick={() => updateExFields(ex.id, { rest: pRest })}
                                            className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer flex-1 ${
                                              ex.rest === pRest
                                                ? "bg-blue-600 text-white font-black shadow"
                                                : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-blue-400 border border-slate-800"
                                            }`}
                                          >
                                            {pRest}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {ex.executionMethod === "gvt" && (
                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                    <div className="sm:col-span-6">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                        Volume Estrito: 10 Séries x 10 Reps a 60% 1RM
                                      </label>
                                      <div className="flex items-center gap-2">
                                        <div className="px-3 py-1.5 bg-yellow-500/20 text-yellow-300 font-black text-xs rounded-lg border border-yellow-500/30">
                                          10 Séries x 10 Reps
                                        </div>
                                        <div className="px-3 py-1.5 bg-slate-900 text-slate-300 font-bold text-xs rounded-lg border border-slate-800">
                                          Cadência: 4-0-2
                                        </div>
                                      </div>
                                    </div>
                                    <div className="sm:col-span-6">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                        Descanso Estrito Rígido entre Séries (GVT)
                                      </label>
                                      <div className="flex items-center gap-1.5">
                                        {methodMeta.restPresets?.map((pRest) => (
                                          <button
                                            key={pRest}
                                            type="button"
                                            onClick={() => updateExFields(ex.id, { rest: pRest, intraSetRest: parseInt(pRest) || 60 })}
                                            className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer flex-1 ${
                                              ex.rest === pRest
                                                ? "bg-yellow-500 text-slate-950 font-black shadow"
                                                : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-yellow-400 border border-slate-800"
                                            }`}
                                          >
                                            {pRest}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {ex.executionMethod === "myo_reps" && (
                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                    <div className="sm:col-span-6">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                        Estrutura: Série de Ativação + Mini-Sets
                                      </label>
                                      <div className="flex items-center gap-1.5">
                                        {methodMeta.repsPresets?.map((preset) => (
                                          <button
                                            key={preset}
                                            type="button"
                                            onClick={() => updateExFields(ex.id, { reps: preset })}
                                            className={`px-2.5 py-1.5 rounded-lg text-[8.5px] font-black uppercase transition-all cursor-pointer flex-1 ${
                                              ex.reps === preset
                                                ? "bg-teal-600 text-white font-black shadow"
                                                : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-teal-400 border border-slate-800"
                                            }`}
                                          >
                                            {preset}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="sm:col-span-6">
                                      <div className="flex items-center justify-between mb-1">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                          Pausa Respiratória dos Mini-Sets
                                        </label>
                                        <span className="text-[8.5px] text-teal-400 font-bold hidden sm:inline">🌬️ 5 respirações</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {methodMeta.intraRestPresets?.map((sec) => (
                                          <button
                                            key={sec}
                                            type="button"
                                            onClick={() => updateExField(ex.id, "intraSetRest", sec)}
                                            className={`flex-1 py-1.5 text-[10px] font-black rounded-lg border transition-all cursor-pointer ${
                                              (ex.intraSetRest ?? 15) === sec
                                                ? "bg-teal-600 text-white border-teal-400 font-black shadow"
                                                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                                            }`}
                                          >
                                            {sec}s
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {ex.executionMethod === "wave_loading" && (
                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                    <div className="sm:col-span-6">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                        Progressão de Ondas (Onda 1 / Onda 2)
                                      </label>
                                      <div className="flex items-center gap-1.5">
                                        {methodMeta.repsPresets?.map((preset) => (
                                          <button
                                            key={preset}
                                            type="button"
                                            onClick={() => updateExFields(ex.id, { reps: preset })}
                                            className={`px-2.5 py-1.5 rounded-lg text-[8.5px] font-black uppercase transition-all cursor-pointer flex-1 ${
                                              ex.reps === preset
                                                ? "bg-violet-600 text-white font-black shadow"
                                                : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-violet-400 border border-slate-800"
                                            }`}
                                          >
                                            {preset}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="sm:col-span-6">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                        Descanso Inter-Ondas (PAP Facilitation)
                                      </label>
                                      <div className="flex items-center gap-1.5">
                                        {methodMeta.restPresets?.map((pRest) => (
                                          <button
                                            key={pRest}
                                            type="button"
                                            onClick={() => updateExFields(ex.id, { rest: pRest })}
                                            className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer flex-1 ${
                                              ex.rest === pRest
                                                ? "bg-violet-600 text-white font-black shadow"
                                                : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-violet-400 border border-slate-800"
                                            }`}
                                          >
                                            {pRest}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Métodos de Campo e Quadra: Tiros Curtos / RSA */}
                                {ex.executionMethod === "sprint_rsa" && (
                                  <div className="space-y-3 p-3.5 bg-emerald-950/20 border border-emerald-500/25 rounded-2xl shadow-inner">
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                      <div className="sm:col-span-6">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block mb-1">
                                          Estrutura de Tiros por Bloco (ex: 5x 20m ou 4x 30m)
                                        </label>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          {methodMeta.repsPresets?.map((preset) => (
                                            <button
                                              key={preset}
                                              type="button"
                                              onClick={() => updateExFields(ex.id, { reps: preset, repsType: "meters" })}
                                              className={`px-2.5 py-1.5 rounded-lg text-[8.5px] font-black uppercase transition-all cursor-pointer ${
                                                ex.reps === preset
                                                  ? "bg-emerald-500 text-slate-950 font-black shadow"
                                                  : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-emerald-400 border border-slate-800"
                                              }`}
                                            >
                                              {preset}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="sm:col-span-3">
                                        <div className="flex items-center justify-between mb-1">
                                          <label className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block">
                                            Micro-Pausa Intra-Série
                                          </label>
                                          <span className="text-[8px] text-emerald-300 font-bold">⚡ ATP-CP</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {methodMeta.intraRestPresets?.map((sec) => (
                                            <button
                                              key={sec}
                                              type="button"
                                              onClick={() => updateExField(ex.id, "intraSetRest", sec)}
                                              className={`flex-1 py-1.5 text-[9px] font-black rounded-lg border transition-all cursor-pointer ${
                                                (ex.intraSetRest ?? 20) === sec
                                                  ? "bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow"
                                                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                                              }`}
                                            >
                                              {sec}s
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="sm:col-span-3">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block mb-1">
                                          Descanso Inter-Blocos
                                        </label>
                                        <div className="flex items-center gap-1">
                                          {methodMeta.restPresets?.map((pRest) => (
                                            <button
                                              key={pRest}
                                              type="button"
                                              onClick={() => updateExField(ex.id, "rest", pRest)}
                                              className={`flex-1 py-1.5 text-[9px] font-black rounded-lg border transition-all cursor-pointer ${
                                                ex.rest === pRest
                                                  ? "bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow"
                                                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                                              }`}
                                            >
                                              {pRest}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-emerald-300/90 font-bold bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                      <span>🏃 Densidade: {ex.sets || 2} blocos x {ex.reps || "5x 20m"} • 100% Velocidade Máxima sem perda de potência</span>
                                      <span className="text-emerald-400 font-black">Relação Esforço:Pausa ~1:5 (RPE 9)</span>
                                    </div>
                                  </div>
                                )}

                                {/* Métodos de Campo e Quadra: Pirâmide de Campo */}
                                {ex.executionMethod === "pyramid_field" && (
                                  <div className="space-y-3 p-3.5 bg-amber-950/20 border border-amber-500/25 rounded-2xl shadow-inner">
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                      <div className="sm:col-span-6">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                                          Sequência da Pirâmide (Metros ou Segundos)
                                        </label>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          {methodMeta.repsPresets?.map((preset) => (
                                            <button
                                              key={preset}
                                              type="button"
                                              onClick={() => updateExFields(ex.id, { reps: preset, repsType: preset.includes("s") ? "time" : "meters" })}
                                              className={`px-2.5 py-1.5 rounded-lg text-[8.5px] font-black uppercase transition-all cursor-pointer ${
                                                ex.reps === preset
                                                  ? "bg-amber-500 text-slate-950 font-black shadow"
                                                  : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-amber-400 border border-slate-800"
                                              }`}
                                            >
                                              {preset}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="sm:col-span-3">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                                          Micro-Pausa Progressiva
                                        </label>
                                        <div className="flex items-center gap-1">
                                          {methodMeta.intraRestPresets?.map((sec) => (
                                            <button
                                              key={sec}
                                              type="button"
                                              onClick={() => updateExField(ex.id, "intraSetRest", sec)}
                                              className={`flex-1 py-1.5 text-[9px] font-black rounded-lg border transition-all cursor-pointer ${
                                                (ex.intraSetRest ?? 30) === sec
                                                  ? "bg-amber-500 text-slate-950 border-amber-400 font-black shadow"
                                                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                                              }`}
                                            >
                                              {sec}s
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="sm:col-span-3">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                                          Descanso Pós-Pirâmide
                                        </label>
                                        <div className="flex items-center gap-1">
                                          {methodMeta.restPresets?.map((pRest) => (
                                            <button
                                              key={pRest}
                                              type="button"
                                              onClick={() => updateExField(ex.id, "rest", pRest)}
                                              className={`flex-1 py-1.5 text-[9px] font-black rounded-lg border transition-all cursor-pointer ${
                                                ex.rest === pRest
                                                  ? "bg-amber-500 text-slate-950 border-amber-400 font-black shadow"
                                                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                                              }`}
                                            >
                                              {pRest}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-amber-300/90 font-bold bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-500/20">
                                      <span>🔺 Dinâmica: Aceleração (10-20m) ➔ Velocidade Máxima (30-40m) ➔ Retorno sob Fadiga</span>
                                      <span className="text-amber-400 font-black">Volume Total: ~160m de alta intensidade por pirâmide</span>
                                    </div>
                                  </div>
                                )}

                                {/* Métodos de Campo e Quadra: Fartlek */}
                                {ex.executionMethod === "fartlek" && (
                                  <div className="space-y-3 p-3.5 bg-cyan-950/20 border border-cyan-500/25 rounded-2xl shadow-inner">
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                      <div className="sm:col-span-6">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-cyan-400 block mb-1">
                                          Estrutura do Estímulo Intermitente (Tiro : Trote)
                                        </label>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          {methodMeta.repsPresets?.map((preset) => (
                                            <button
                                              key={preset}
                                              type="button"
                                              onClick={() => updateExFields(ex.id, { reps: preset, repsType: "time" })}
                                              className={`px-2.5 py-1.5 rounded-lg text-[8.5px] font-black uppercase transition-all cursor-pointer ${
                                                ex.reps === preset
                                                  ? "bg-cyan-500 text-slate-950 font-black shadow"
                                                  : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-cyan-400 border border-slate-800"
                                              }`}
                                            >
                                              {preset}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="sm:col-span-3">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-cyan-400 block mb-1">
                                          Intervalo Ativo (Trote)
                                        </label>
                                        <div className="flex items-center gap-1">
                                          {methodMeta.intraRestPresets?.map((sec) => (
                                            <button
                                              key={sec}
                                              type="button"
                                              onClick={() => updateExField(ex.id, "intraSetRest", sec)}
                                              className={`flex-1 py-1.5 text-[9px] font-black rounded-lg border transition-all cursor-pointer ${
                                                (ex.intraSetRest ?? 15) === sec
                                                  ? "bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow"
                                                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                                              }`}
                                            >
                                              {sec}s
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="sm:col-span-3">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-cyan-400 block mb-1">
                                          Descanso Inter-Blocos
                                        </label>
                                        <div className="flex items-center gap-1">
                                          {methodMeta.restPresets?.map((pRest) => (
                                            <button
                                              key={pRest}
                                              type="button"
                                              onClick={() => updateExField(ex.id, "rest", pRest)}
                                              className={`flex-1 py-1.5 text-[9px] font-black rounded-lg border transition-all cursor-pointer ${
                                                ex.rest === pRest
                                                  ? "bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow"
                                                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                                              }`}
                                            >
                                              {pRest}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-cyan-300/90 font-bold bg-cyan-950/40 px-3 py-1.5 rounded-lg border border-cyan-500/20">
                                      <span>⏱️ Fisiologia: Estímulo &gt;100% VAM com recuperação ativa (50% VAM)</span>
                                      <span className="text-cyan-400 font-black">Consumo VO2 Elevado com Manutenção de FC &gt;85%</span>
                                    </div>
                                  </div>
                                )}

                                {/* Métodos de Campo e Quadra: Shuttle Run */}
                                {ex.executionMethod === "shuttle_run" && (
                                  <div className="space-y-3 p-3.5 bg-rose-950/20 border border-rose-500/25 rounded-2xl shadow-inner">
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                      <div className="sm:col-span-6">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-rose-400 block mb-1">
                                          Distância Fracionada & Mudança de Direção (COD)
                                        </label>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          {methodMeta.repsPresets?.map((preset) => (
                                            <button
                                              key={preset}
                                              type="button"
                                              onClick={() => updateExFields(ex.id, { reps: preset, repsType: "meters" })}
                                              className={`px-2.5 py-1.5 rounded-lg text-[8.5px] font-black uppercase transition-all cursor-pointer ${
                                                ex.reps === preset
                                                  ? "bg-rose-500 text-white font-black shadow"
                                                  : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-rose-400 border border-slate-800"
                                              }`}
                                            >
                                              {preset}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="sm:col-span-6">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-rose-400 block mb-1">
                                          Descanso entre Séries (Recuperação Mecânica Excêntrica)
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                          {methodMeta.restPresets?.map((pRest) => (
                                            <button
                                              key={pRest}
                                              type="button"
                                              onClick={() => updateExFields(ex.id, { rest: pRest, intraSetRest: parseInt(pRest) || 60 })}
                                              className={`flex-1 py-1.5 text-[9px] font-black rounded-lg border transition-all cursor-pointer ${
                                                ex.rest === pRest
                                                  ? "bg-rose-500 text-white border-rose-400 font-black shadow"
                                                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                                              }`}
                                            >
                                              {pRest}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-rose-300/90 font-bold bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-500/20">
                                      <span>⚡ Biomecânica: Alta sobrecarga excêntrica de desaceleração nos isquiotibiais e quadríceps</span>
                                      <span className="text-rose-400 font-black">Blindagem LCA e Capacidade de Frenagem Rápida</span>
                                    </div>
                                  </div>
                                )}

                                {/* Pedagogical Explanation Card with High Contrast */}
                                <div className={`p-3 rounded-xl ${methodMeta.cardBg || 'bg-slate-900/60 border-slate-800 text-slate-300'} text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm`}>
                                  <div className="flex items-start gap-2.5">
                                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                      <div className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 text-white">
                                        <span>{methodMeta.badge} • Fisiologia & Prescrição Técnica:</span>
                                      </div>
                                      <p className="text-[11px] font-medium text-slate-300 leading-relaxed">
                                        {methodMeta.scientificRationale || methodMeta.description}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const reStructured = structureExerciseForMethod(
                                        ex,
                                        ex.executionMethod as AdvancedExecutionMethod,
                                        index,
                                        edited.exercises || []
                                      );
                                      updateExFields(ex.id, reStructured);
                                      toast.success(`Parâmetros de ${methodMeta.name} reaplicados com sucesso!`, { icon: methodMeta.icon });
                                    }}
                                    className="px-3 py-1.5 bg-slate-950/80 hover:bg-slate-900 text-amber-400 border border-amber-400/30 hover:border-amber-400 rounded-lg text-[9px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer shadow flex items-center gap-1"
                                    title="Reaplicar configuração e parâmetros padrão recomendados para este método"
                                  >
                                    <Sparkles className="w-3 h-3 text-amber-400" />
                                    <span>Reestruturar Parâmetros</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Extended notes field */}
                        <div className="md:col-span-12 mt-3 pt-3 border-t border-slate-900/60 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                          <span className="text-[10px] text-[#39FF14] uppercase font-black tracking-widest shrink-0">OBSERVAÇÕES:</span>
                          <input 
                            value={ex.notes || ""}
                            onChange={(e) => updateExField(ex.id, "notes", e.target.value)}
                            className="w-full flex-1 bg-slate-950/40 border border-slate-900 focus:border-[#39FF14]/40 rounded-xl px-4 py-2 text-xs md:text-sm text-slate-300 focus:text-slate-100 placeholder-slate-700 font-medium outline-none transition-all"
                            placeholder="Adicione observações de velocidade de execução, VBT, posicionamento, etc."
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedExerciseId(null); }}
                            className="w-full sm:w-auto mt-2 sm:mt-0 px-3 py-2 bg-slate-900 hover:bg-slate-850 hover:text-[#39FF14] border border-slate-800 text-slate-400 font-black text-[9px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                            title="Recolher exercício"
                          >
                            Recolher <ChevronUp className="w-3.5 h-3.5 text-[#39FF14]" />
                          </button>
                        </div>

                        {/* Video and Image URLs */}
                        <div className="md:col-span-12 mt-3 pt-3 border-t border-slate-900/40 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-blue-400 uppercase font-black tracking-widest shrink-0">VÍDEO URL:</span>
                            <input 
                              value={ex.videoUrl || ""}
                              onChange={(e) => updateExField(ex.id, "videoUrl", e.target.value)}
                              className="w-full flex-1 bg-slate-950/40 border border-slate-900 focus:border-blue-400/40 rounded-xl px-4 py-2 text-xs text-slate-300 focus:text-slate-100 placeholder-slate-700 outline-none transition-all"
                              placeholder="YouTube, Vimeo ou vídeo de execução"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-purple-400 uppercase font-black tracking-widest shrink-0">IMAGEM URL:</span>
                            <input 
                              value={ex.imageUrl || ""}
                              onChange={(e) => updateExField(ex.id, "imageUrl", e.target.value)}
                              className="w-full flex-1 bg-slate-950/40 border border-slate-900 focus:border-purple-400/40 rounded-xl px-4 py-2 text-xs text-slate-300 focus:text-slate-100 placeholder-slate-700 outline-none transition-all"
                              placeholder="Imagem de referência ou link de GIF"
                            />
                          </div>
                        </div>

                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {(!edited.exercises || edited.exercises.length === 0) && (
              <div className="py-24 text-center text-slate-500 font-black uppercase text-xs tracking-widest border-2 border-dashed border-slate-900 rounded-[2rem]">
                Planilha Vazia. Selecione exercícios da biblioteca ou gere por IA para prescrever.
              </div>
            )}
          </div>
        </div>

        {/* WORKOUT FOOTER WORKSPACE */}
        <div className="p-6 md:p-8 bg-[#0c111d] border-t border-slate-900 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-8 py-4 bg-slate-950 text-slate-400 hover:text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all border border-slate-800 cursor-pointer"
          >
            DESCARTAR ALTERAÇÕES
          </button>
          
          <button
            onClick={() => {
              const finalName = (edited.name || "").trim() || (athlete?.workouts?.length ? `Treino ${String.fromCharCode(65 + ((athlete.workouts.length || 0) % 26))}` : "Treino A");
              const finalExercises = (edited.exercises || []).map((ex, i) => ({
                ...ex,
                order_index: i
              }));
              onSave({
                ...edited,
                name: finalName,
                date: edited.date.split("T")[0],
                updatedAt: new Date().toISOString(),
                exercises: finalExercises
              });
            }}
            className="w-full sm:w-auto px-10 py-4 bg-[#39FF14] hover:bg-[#32e00f] text-slate-950 font-black text-xs uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl shadow-[#39FF14]/10 flex items-center justify-center gap-2 cursor-pointer"
          >
            SALVAR PLANILHA DE ALTA PERFORMANCE
            <ChevronRight className="w-4 h-4 text-slate-950 stroke-[3]" />
          </button>
        </div>

      </div>

      {/* RICH SCIENTIFIC EXERCISE DETAILS DRAWER / MODAL */}
      <AnimatePresence>
        {selectedDetailsExercise && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0c111d] border border-slate-850 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100"
            >
              
              {/* Drawer Header */}
              <div className="p-6 md:p-8 border-b border-slate-900 flex items-start justify-between bg-slate-950">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-[#39FF14]/10 text-[#39FF14] rounded">
                      {selectedDetailsExercise.physicalQuality || "Geral"}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                      {selectedDetailsExercise.difficulty || "Intermediário"}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded">
                      Plano {selectedDetailsExercise.movementPlane || "Sagital"}
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-white mt-1.5">{selectedDetailsExercise.name}</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Mapeamento Anatômico & Biomecânico Rico</p>
                </div>
                <button 
                  onClick={() => setSelectedDetailsExercise(null)}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-850 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 no-scrollbar">
                
                {/* GRID METADATA SUMMARY */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-900">
                    <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-500 block mb-0.5">Padrão de Movimento</span>
                    <span className="text-[10px] font-black text-blue-400 block truncate" title={selectedDetailsExercise.movementPattern || "Geral"}>
                      {selectedDetailsExercise.movementPattern || "Geral"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-900">
                    <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-500 block mb-0.5">Lateralidade</span>
                    <span className="text-[10px] font-black text-purple-400 block truncate" title={selectedDetailsExercise.lateralType || "Bilateral"}>
                      {selectedDetailsExercise.lateralType || "Bilateral"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-900">
                    <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-500 block mb-0.5">Cadeia Cinética</span>
                    <span className="text-[10px] font-black text-white block truncate" title={selectedDetailsExercise.kineticChain || "N/A"}>
                      {selectedDetailsExercise.kineticChain || "N/A"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-900">
                    <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-500 block mb-0.5">Equipamento</span>
                    <span className="text-[10px] font-black text-[#39FF14] block truncate" title={selectedDetailsExercise.equipment || "BW"}>
                      {selectedDetailsExercise.equipment || "BW"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-900">
                    <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-500 block mb-0.5">RPE Recomendado</span>
                    <span className="text-[10px] font-black text-amber-400 block truncate" title={selectedDetailsExercise.recommendedRpe || "8-10"}>
                      {selectedDetailsExercise.recommendedRpe || "8-10"}
                    </span>
                  </div>
                  <div className="p-3 bg-[#111622] rounded-xl border border-[#39FF14]/20">
                    <span className="text-[7.5px] font-black uppercase tracking-wider text-[#39FF14] block mb-0.5">Velo. Alvo (VBT)</span>
                    <span className="text-[10px] font-black text-emerald-400 block truncate" title={selectedDetailsExercise.targetVelocity || "Máxima"}>
                      {selectedDetailsExercise.targetVelocity || "Máxima"}
                    </span>
                  </div>
                </div>

                {/* 🎥 DEMONSTRATION & MEDIA HUB (INTELIGENTE) */}
                <div className="p-5 bg-gradient-to-b from-[#111622] to-slate-900/40 rounded-2xl border border-slate-900 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-blue-400" />
                      Demonstração de Execução Técnica & Biomecânica
                    </span>
                    <span className="text-[8.5px] font-extrabold text-slate-500 uppercase tracking-wider bg-slate-950 px-2.5 py-1 rounded border border-slate-900">
                      Mídia Ativa da LB Sports
                    </span>
                  </div>

                  {(() => {
                    const ytEmbedUrl = getYouTubeEmbedUrl(selectedDetailsExercise.videoUrl);
                    const imageOrGifUrl = selectedDetailsExercise.imageUrl;

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Video player ou imagem / GIF */}
                        <div className="md:col-span-7 flex flex-col justify-center bg-slate-950 rounded-xl border border-slate-850 overflow-hidden relative min-h-[220px]">
                          {ytEmbedUrl ? (
                            <div className="aspect-video w-full h-full">
                              <iframe
                                src={`${ytEmbedUrl}?autoplay=0&mute=1&rel=0`}
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title={`Vídeo de Execução: ${selectedDetailsExercise.name}`}
                              />
                            </div>
                          ) : imageOrGifUrl ? (
                            <img
                              src={imageOrGifUrl}
                              alt={`Demonstração de ${selectedDetailsExercise.name}`}
                              className="w-full h-full object-cover max-h-[300px] rounded-xl"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="p-6 flex flex-col items-center justify-center text-center space-y-2 h-full">
                              <Video className="w-10 h-10 text-slate-700 animate-pulse" />
                              <span className="text-xs font-black text-slate-500 uppercase">Vídeo Demonstrativo Personalizável</span>
                              <p className="text-[10px] text-slate-600 font-bold max-w-sm leading-relaxed">
                                Nenhum link de vídeo ou imagem direta foi cadastrado para este exercício personalizado. Mas não se preocupe! Você e seus atletas têm acesso ao nosso robô de demonstrações automatizadas ao lado.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Detalhes / Assistir e Automação */}
                        <div className="md:col-span-5 flex flex-col justify-between space-y-3">
                          <div className="space-y-2">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Ações Disponíveis:</span>
                            
                            {selectedDetailsExercise.videoUrl ? (
                              <a
                                href={selectedDetailsExercise.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-black text-[10px] py-3 rounded-xl transition-all uppercase tracking-wider"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Assistir no YouTube Externo
                              </a>
                            ) : null}

                            {/* ROBÔ DE AUTOMAÇÃO: Busca direta e instantânea no YouTube */}
                            <a
                              href={`https://www.youtube.com/results?search_query=como+fazer+${encodeURIComponent(selectedDetailsExercise.name)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 w-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-black text-[10px] py-3 rounded-xl transition-all uppercase tracking-wider"
                              title="Pesquisa inteligente e direta no YouTube pela execução deste exercício"
                            >
                              <Search className="w-3.5 h-3.5" />
                              🔍 Busca de Execução Técnica (YouTube)
                            </a>
                            
                            <a
                              href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(selectedDetailsExercise.name + " exercicio gif")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 w-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 font-black text-[10px] py-3 rounded-xl transition-all uppercase tracking-wider"
                              title="Pesquisa de GIFs demonstrativos no Google Imagens"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              🖼️ Buscar Imagem/GIF Técnico (Google)
                            </a>
                          </div>

                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 text-[9px] text-slate-500 font-bold leading-relaxed uppercase">
                            💡 <span className="text-slate-300">DICA DE ELITE:</span> Você pode cadastrar o link do seu próprio vídeo do YouTube ou GIF animado de preferência ao editar ou criar os exercícios da sua planilha de treinos!
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* ADVANCED BIOMECHANICAL & SCIENTIFIC ANALYTICS */}
                {(() => {
                  const bio = getBiomechanicalDetails(selectedDetailsExercise);
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-950/40 rounded-2xl border border-slate-900/80">
                      
                      {/* Biomechanical Profile Bars */}
                      <div className="space-y-3.5">
                        <span className="text-[9px] font-black text-[#39FF14] uppercase tracking-wider block border-b border-slate-900 pb-1.5 flex items-center justify-between">
                          <span>📊 Perfil Biomecânico de Desempenho</span>
                          <span className="text-slate-500 text-[8px]">Índice de Solicitação (0-10)</span>
                        </span>
                        
                        <div className="space-y-2">
                          {[
                            { name: "Força Máxima", score: bio.force, color: "bg-red-500", desc: "Produção de força concêntrica/excêntrica" },
                            { name: "RFD (Explosividade)", score: bio.rfd, color: "bg-amber-500", desc: "Taxa de desenvolvimento de força rápida" },
                            { name: "Potência Mecânica", score: bio.power, color: "bg-[#39FF14]", desc: "Produção de watts sob carga ótima" },
                            { name: "Hipertrofia Muscular", score: bio.hypertrophy, color: "bg-pink-500", desc: "Tensão mecânica e estímulo trófico" },
                            { name: "Estabilidade Co-contração", score: bio.stability, color: "bg-blue-500", desc: "Estabilização ativa e controle articular" },
                            { name: "Transferência Funcional", score: bio.sportTransfer, color: "bg-purple-500", desc: "Grau de transferência direta ao gesto esportivo" },
                          ].map((bar, i) => (
                            <div key={i} className="space-y-0.5">
                              <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-300">
                                <span className="flex items-center gap-1">
                                  <span>{bar.name}</span>
                                  <span className="text-[7.5px] font-medium text-slate-500">({bar.desc})</span>
                                </span>
                                <span>{bar.score}/10</span>
                              </div>
                              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-850">
                                <div className={`h-full ${bar.color}`} style={{ width: `${bar.score * 10}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Scientific Evidence and Sports Transfer */}
                      <div className="space-y-4 flex flex-col justify-between">
                        <div className="space-y-2.5">
                          <span className="text-[9px] font-black text-blue-400 uppercase tracking-wider block border-b border-slate-900 pb-1.5">
                            🔬 Nível de Evidência Científica
                          </span>
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-900/80 flex items-center gap-3">
                            <div className="flex flex-col">
                              <div className="flex gap-0.5 mb-1 text-amber-400">
                                {Array.from({ length: 5 }).map((_, idx) => (
                                  <span key={idx} className="text-sm">
                                    {idx < bio.scientificStars ? "⭐" : "☆"}
                                  </span>
                                ))}
                              </div>
                              <span className="text-[10px] font-black text-white">{bio.evidenceLabel}</span>
                              <p className="text-[9.5px] font-bold text-slate-400 leading-normal mt-1">
                                {selectedDetailsExercise.scientificEvidence || "Prescrição validada cientificamente de acordo com diretrizes de treino de alta performance."}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <span className="text-[9px] font-black text-purple-400 uppercase tracking-wider block border-b border-slate-900 pb-1.5">
                            🏃 Índice de Transferência por Esporte (0-10)
                          </span>
                          <div className="grid grid-cols-5 gap-1.5">
                            {[
                              { label: "Futebol", val: bio.soccerIndex, emoji: "⚽" },
                              { label: "Vôlei", val: bio.volleyIndex, emoji: "🏐" },
                              { label: "Corrida", val: bio.runningIndex, emoji: "🏃" },
                              { label: "Basquete", val: bio.basketballIndex, emoji: "🏀" },
                              { label: "Tênis", val: bio.tennisIndex, emoji: "🎾" },
                            ].map((sp, idx) => (
                              <div key={idx} className="bg-slate-950 p-2 rounded-xl border border-slate-900 text-center space-y-1">
                                <span className="text-xs block" title={sp.label}>{sp.emoji}</span>
                                <span className="text-[8px] font-bold text-slate-400 block truncate leading-none">{sp.label}</span>
                                <span className={`text-[10px] font-black leading-none block ${sp.val >= 9 ? "text-[#39FF14]" : sp.val >= 7 ? "text-blue-400" : "text-slate-400"}`}>
                                  {sp.val}/10
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })()}

                {/* MUSCLES INVOLVED PILLS */}
                <div className="space-y-2 p-5 bg-slate-950/50 rounded-2xl border border-slate-900">
                  <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-widest">Músculos Recrutados Primários/Secundários:</span>
                  <div className="flex flex-wrap gap-2">
                    {(selectedDetailsExercise.musclesInvolved || [selectedDetailsExercise.muscleGroup]).map((muscle, idx) => (
                      <span key={idx} className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 bg-slate-900 text-slate-300 border border-slate-850 rounded-xl">
                        🔥 {muscle}
                      </span>
                    ))}
                  </div>
                </div>

                {/* THREE COLUMNS: BENEFITS, CONTRAINDICATIONS & ERRORS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Benefits */}
                  <div className="space-y-3 p-5 bg-slate-950 rounded-2xl border border-slate-900">
                    <span className="text-[10px] font-black text-[#39FF14] uppercase tracking-widest block border-b border-slate-900 pb-2">
                      🍀 Benefícios Clínicos
                    </span>
                    <ul className="space-y-2">
                      {(selectedDetailsExercise.benefits || ["Aumento da taxa de desenvolvimento de força (RFD).", "Melhora da coordenação intramuscular.", "Prevenção ativa de lesões ligamentares."]).map((b, i) => (
                        <li key={i} className="text-[11px] font-bold text-slate-300 flex items-start gap-2 leading-relaxed">
                          <CheckCircle2 className="w-4 h-4 text-[#39FF14] shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Contraindications */}
                  <div className="space-y-3 p-5 bg-slate-950 rounded-2xl border border-slate-900">
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block border-b border-slate-900 pb-2">
                      ⚠️ Contraindicações
                    </span>
                    <ul className="space-y-2">
                      {(selectedDetailsExercise.contraindications || ["Lesões articulares agudas sem liberação médica.", "Limitação severa de mobilidade no padrão do movimento."]).map((c, i) => (
                        <li key={i} className="text-[11px] font-bold text-slate-300 flex items-start gap-2 leading-relaxed">
                          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Common Errors */}
                  <div className="space-y-3 p-5 bg-slate-950 rounded-2xl border border-slate-900">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block border-b border-slate-900 pb-2">
                      ❌ Erros Comuns
                    </span>
                    <ul className="space-y-2">
                      {(selectedDetailsExercise.commonErrors || ["Fase excêntrica sem controle ou rebote inadequado.", "Perda de alinhamento postural/valgo dinâmico."]).map((e, i) => (
                        <li key={i} className="text-[11px] font-bold text-slate-300 flex items-start gap-2 leading-relaxed">
                          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span>{e}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

                {/* PROGRESSION / REGRESSION LINKS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  
                  {/* Progressions */}
                  <div className="p-5 bg-slate-950 rounded-2xl border border-slate-900 space-y-2.5">
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">📈 Progressões Inteligentes</span>
                    <div className="space-y-2">
                      {(selectedDetailsExercise.progressions || ["Aumento da carga externa progressiva.", "Redução do tempo de transição ou aumento da velocidade de execução (VBT)."]).map((prog, i) => {
                        // Find matching exercise in library
                        const matchingEx = ENRICHED_LIBRARY.find(x => 
                          x.name.toLowerCase().trim() === prog.toLowerCase().trim() ||
                          x.name.toLowerCase().includes(prog.toLowerCase()) || 
                          prog.toLowerCase().includes(x.name.toLowerCase())
                        );

                        if (matchingEx) {
                          return (
                            <button
                              key={i}
                              onClick={() => setSelectedDetailsExercise(matchingEx)}
                              className="w-full text-left text-xs font-extrabold text-slate-300 hover:text-emerald-400 hover:bg-[#39FF14]/5 p-2 rounded-xl border border-slate-900 hover:border-emerald-500/20 transition-all flex items-center justify-between cursor-pointer group/item"
                              title={`Navegar para ${matchingEx.name}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <ChevronUp className="w-4 h-4 text-emerald-400 shrink-0 group-hover/item:translate-y-[-1px] transition-transform" />
                                <span className="truncate">{prog}</span>
                              </div>
                              <Eye className="w-3.5 h-3.5 text-slate-500 group-hover/item:text-[#39FF14] shrink-0 ml-1" />
                            </button>
                          );
                        }

                        return (
                          <div key={i} className="text-xs font-bold text-slate-400 p-2 border border-dashed border-slate-900 rounded-xl flex items-center gap-2">
                            <ChevronUp className="w-4 h-4 text-emerald-500/40 shrink-0" />
                            <span>{prog}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Regressions */}
                  <div className="p-5 bg-slate-950 rounded-2xl border border-slate-900 space-y-2.5">
                    <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">📉 Regressões Inteligentes</span>
                    <div className="space-y-2">
                      {(selectedDetailsExercise.regressions || ["Redução da amplitude do movimento.", "Execução assistida ou com peso corporal."]).map((reg, i) => {
                        // Find matching exercise in library
                        const matchingEx = ENRICHED_LIBRARY.find(x => 
                          x.name.toLowerCase().trim() === reg.toLowerCase().trim() ||
                          x.name.toLowerCase().includes(reg.toLowerCase()) || 
                          reg.toLowerCase().includes(x.name.toLowerCase())
                        );

                        if (matchingEx) {
                          return (
                            <button
                              key={i}
                              onClick={() => setSelectedDetailsExercise(matchingEx)}
                              className="w-full text-left text-xs font-extrabold text-slate-300 hover:text-amber-400 hover:bg-amber-400/5 p-2 rounded-xl border border-slate-900 hover:border-amber-500/20 transition-all flex items-center justify-between cursor-pointer group/item"
                              title={`Navegar para ${matchingEx.name}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <ChevronDown className="w-4 h-4 text-amber-400 shrink-0 group-hover/item:translate-y-[1px] transition-transform" />
                                <span className="truncate">{reg}</span>
                              </div>
                              <Eye className="w-3.5 h-3.5 text-slate-500 group-hover/item:text-[#39FF14] shrink-0 ml-1" />
                            </button>
                          );
                        }

                        return (
                          <div key={i} className="text-xs font-bold text-slate-400 p-2 border border-dashed border-slate-900 rounded-xl flex items-center gap-2">
                            <ChevronDown className="w-4 h-4 text-amber-500/40 shrink-0" />
                            <span>{reg}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </div>

              {/* Drawer Footer */}
              <div className="p-6 bg-[#0c111d] border-t border-slate-900 flex flex-wrap gap-4 justify-between items-center shrink-0">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  TAGS: {(selectedDetailsExercise.tags || ["N/A"]).join(" | ")}
                </span>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setExerciseToEdit(selectedDetailsExercise);
                      setIsEditorOpen(true);
                      setSelectedDetailsExercise(null);
                    }}
                    className="px-3.5 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Editar Exercício"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => {
                      setExerciseToClone(selectedDetailsExercise);
                      setSelectedDetailsExercise(null);
                    }}
                    className="px-3.5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Clonar Exercício"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Clonar</span>
                  </button>
                  <button
                    onClick={() => {
                      setExerciseToDelete(selectedDetailsExercise);
                      setSelectedDetailsExercise(null);
                    }}
                    className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Excluir Exercício"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>

                  {/* Standard Add */}
                  <button
                    type="button"
                    onClick={() => {
                      addExFromLib(selectedDetailsExercise, "standard");
                      setSelectedDetailsExercise(null);
                    }}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    title="Prescrever de forma padrão"
                  >
                    + Padrão
                  </button>

                  {/* French Contrast / Complex Add */}
                  <button
                    type="button"
                    onClick={() => {
                      addExFromLib(selectedDetailsExercise, "complex_contrast");
                      setSelectedDetailsExercise(null);
                    }}
                    className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center gap-1.5"
                    title="Prescrever direto no Contraste Francês / Complex"
                  >
                    <span>🇫🇷</span>
                    <span>Contraste Francês (Complex)</span>
                  </button>

                  {/* Cluster Set Add */}
                  <button
                    type="button"
                    onClick={() => {
                      addExFromLib(selectedDetailsExercise, "cluster");
                      setSelectedDetailsExercise(null);
                    }}
                    className="px-3.5 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    title="Prescrever como Cluster Set"
                  >
                    <span>🎯</span>
                    <span>Cluster Set</span>
                  </button>

                  {/* Rest-Pause Add */}
                  <button
                    type="button"
                    onClick={() => {
                      addExFromLib(selectedDetailsExercise, "rest_pause");
                      setSelectedDetailsExercise(null);
                    }}
                    className="px-3.5 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    title="Prescrever como Rest-Pause"
                  >
                    <span>🔥</span>
                    <span>Rest-Pause</span>
                  </button>

                  {/* Botão de Troca Direta se exerciseToSwap estiver ativo */}
                  {exerciseToSwap && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-400 dark:border-cyan-500/40">
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        Substituir <span className="font-black text-cyan-800 dark:text-cyan-300">"{exerciseToSwap.name}"</span> por <span className="font-black text-slate-950 dark:text-white">"{selectedDetailsExercise.name}"</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          swapExerciseWithLibrary(exerciseToSwap.id, selectedDetailsExercise);
                          setSelectedDetailsExercise(null);
                        }}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-cyan-500/30 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                        title={`Substituir "${exerciseToSwap.name}" por "${selectedDetailsExercise.name}"`}
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                        <span>Confirmar Troca</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE TROCA DE EXERCÍCIO DA BIBLIOTECA - RESPONSIVO E ACESSÍVEL */}
      <AnimatePresence>
        {exerciseToSwap && (
          <div className="fixed inset-0 z-[1300] flex items-end sm:items-center justify-center bg-slate-950/85 backdrop-blur-md p-0 sm:p-4 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-[#0c111d] border-t sm:border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[92vh] sm:h-[86vh] sm:max-h-[86vh] text-slate-900 dark:text-slate-100"
            >
              {/* Modal Header - Compact & Informative */}
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-slate-850 bg-slate-50/95 dark:bg-slate-950/90 flex flex-col gap-2.5 shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0 shadow-xs">
                      <ArrowLeftRight className="w-4 h-4" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        Substituir Exercício
                      </span>
                      {exerciseToSwap.executionMethod === "complex_contrast" && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 rounded-md flex items-center gap-1">
                          <span>🇫🇷 Contraste Francês</span>
                          <span>•</span>
                          <span>Estágio {exerciseToSwap.blockTag || "1A"}</span>
                        </span>
                      )}
                      {exerciseToSwap.executionMethod === "cluster" && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-500/30 rounded-md">
                          🎯 Cluster Set
                        </span>
                      )}
                      {exerciseToSwap.executionMethod === "rest_pause" && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/30 rounded-md">
                          🔥 Rest-Pause
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setExerciseToSwap(null);
                      setSwapSearchQuery("");
                    }}
                    className="p-1.5 sm:p-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white rounded-xl border border-slate-300 dark:border-slate-800 transition-all cursor-pointer shrink-0"
                    title="Fechar modal"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                {/* Banner do Exercício Sendo Substituído */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-400/50 dark:border-cyan-500/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-cyan-800 dark:text-cyan-300 shrink-0 flex items-center gap-1">
                      <span>Atual:</span>
                    </span>
                    <span className="text-xs sm:text-sm font-black text-slate-950 dark:text-cyan-100 truncate">
                      {exerciseToSwap.name}
                    </span>
                    {exerciseToSwap.blockTag && (
                      <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase bg-cyan-500 text-slate-950 shrink-0">
                        {exerciseToSwap.blockTag}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                    Preserva {exerciseToSwap.sets} séries × {exerciseToSwap.reps || "8"} reps {exerciseToSwap.rest ? `• pausa ${exerciseToSwap.rest}` : ""}
                  </div>
                </div>
              </div>

              {/* Search & Quick Filter Bar */}
              <div className="px-4 py-2.5 sm:px-6 sm:py-3 border-b border-slate-200 dark:border-slate-850/80 bg-slate-100/70 dark:bg-slate-900/30 space-y-2 shrink-0">
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    autoFocus
                    value={swapSearchQuery}
                    onChange={(e) => setSwapSearchQuery(e.target.value)}
                    placeholder="Buscar na Biblioteca (ex: Agachamento, Trap Bar, Salto, IMTP...)"
                    className="w-full bg-white dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 focus:border-cyan-500 dark:focus:border-cyan-400 rounded-xl pl-10 pr-10 py-2 text-xs sm:text-sm text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-bold outline-none transition-all shadow-xs"
                  />
                  {swapSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setSwapSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                      title="Limpar busca"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Quick Recommendation Chips (Single Scrollable Row to Save Vertical Space) */}
                {swapRecommendations.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-400 shrink-0 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Sugeridos:</span>
                    </span>
                    {swapRecommendations.map((recName) => {
                      const isCurrentActive = swapSearchQuery.toLowerCase() === recName.toLowerCase();
                      return (
                        <button
                          key={recName}
                          type="button"
                          onClick={() => setSwapSearchQuery(recName)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 border shrink-0 ${
                            isCurrentActive
                              ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-xs font-black"
                              : "bg-white hover:bg-cyan-50 dark:bg-slate-950 dark:hover:bg-cyan-950/40 text-slate-700 hover:text-cyan-800 dark:text-slate-300 dark:hover:text-cyan-300 border-slate-300 dark:border-slate-800 hover:border-cyan-500/40"
                          }`}
                        >
                          <span>{recName.includes("IMTP") || recName.includes("Isométrico") ? "⚡" : "•"}</span>
                          <span>{recName}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Category Filter Pills (Single Scrollable Row) */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {["TODOS", "MMII", "Potência", "MMSS", "Core", "Velocidade", "Preventivo"].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSwapCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
                        swapCategoryFilter === cat
                          ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-xs"
                          : "bg-white hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-200 border-slate-300 dark:border-slate-850"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exercise Results List - Spacious & Touch-Friendly */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2.5 bg-slate-50/50 dark:bg-transparent overscroll-contain">
                {swapFilteredLibrary.length > 0 ? (
                  swapFilteredLibrary.slice(0, 50).map(item => {
                    const isRecommended = swapRecommendations.includes(item.name);
                    return (
                      <div
                        key={item.id}
                        className={`p-3 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isRecommended
                            ? "bg-cyan-50/80 hover:bg-cyan-100/90 border-cyan-400/60 dark:bg-[#101928] dark:hover:bg-[#142034] dark:border-cyan-500/40 shadow-xs"
                            : "bg-white hover:bg-slate-100/90 border-slate-200 hover:border-slate-300 dark:bg-[#0e1320] dark:hover:bg-[#131a2c] dark:border-slate-850 dark:hover:border-slate-700 shadow-xs"
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isRecommended
                              ? "bg-cyan-500/20 text-cyan-800 dark:text-cyan-400 border border-cyan-500/30"
                              : "bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50"
                          }`}>
                            <Dumbbell className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 space-y-1 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h4 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white leading-snug">
                                {item.name}
                              </h4>
                              {isRecommended && (
                                <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
                                  ⭐ Compatível
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                {item.muscleGroup || item.category}
                              </span>
                              {item.physicalQuality && (
                                <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-500/25">
                                  {item.physicalQuality}
                                </span>
                              )}
                            </div>
                            <p className="text-[10.5px] text-slate-600 dark:text-slate-400 line-clamp-2 font-medium leading-relaxed">
                              {item.physiologicalGoal || item.applicability || `Equipamento: ${item.equipment || "BW"} • Padrão: ${item.movementPattern || "Geral"}`}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-center justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-800/60">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailsExercise(item)}
                            className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-400 border border-slate-300 dark:border-slate-800 transition-all cursor-pointer flex items-center justify-center"
                            title="Ver Biomecânica & Evidência Científica"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => swapExerciseWithLibrary(exerciseToSwap.id, item)}
                            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer min-h-[40px]"
                            title={`Substituir "${exerciseToSwap.name}" por "${item.name}"`}
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            <span>Substituir</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 flex items-center justify-center text-slate-500 mx-auto shadow-xs">
                      <Search className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Nenhum exercício encontrado</p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">Tente buscar por termos como "Agachamento", "IMTP", "Salto", "Trap Bar" ou redefina os filtros.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSwapSearchQuery("");
                        setSwapCategoryFilter("TODOS");
                      }}
                      className="px-4 py-2 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-300 dark:border-slate-800 text-cyan-700 dark:text-cyan-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Limpar Filtros e Busca
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer - Compact */}
              <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 flex items-center justify-between shrink-0">
                <span className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-semibold">
                  <strong className="text-slate-950 dark:text-white font-black">{swapFilteredLibrary.length}</strong> exercícios disponíveis
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setExerciseToSwap(null);
                    setSwapSearchQuery("");
                  }}
                  className="px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <AnimatePresence>
        {exerciseToDelete && (
          <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0c111d] border border-slate-850 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4 text-slate-100"
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
              className="bg-[#0c111d] border border-slate-850 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4 text-slate-100"
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
