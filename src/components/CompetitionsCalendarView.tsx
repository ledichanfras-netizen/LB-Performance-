import React, { FC, useState, useMemo } from "react";
import {
  Trophy,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  Activity,
  Flame,
  Target,
  BarChart3,
  Check,
  X,
  Edit2,
  TrendingUp,
  Award,
  Zap,
  Layers
} from "lucide-react";
import {
  Athlete,
  MatchEvent,
  SportOption,
  MatchTypeOption,
  MatchPriorityOption,
  MatchResultOption,
  SportSpecificData
} from "../types";
import { motion, AnimatePresence } from "motion/react";
import { formatDate, getLocalDateString } from "../utils";

interface CompetitionsCalendarViewProps {
  athlete: Athlete;
  allAthletes?: Athlete[];
  onUpdateAthlete: (data: Partial<Athlete>) => void;
  role: "coach" | "athlete";
}

export const SPORTS_LIST: { id: SportOption; label: string; icon: string; category: "team" | "endurance" | "racket" }[] = [
  { id: "Futebol", label: "Futebol", icon: "⚽", category: "team" },
  { id: "Vôlei", label: "Vôlei", icon: "🏐", category: "team" },
  { id: "Basquete", label: "Basquete", icon: "🏀", category: "team" },
  { id: "Handebol", label: "Handebol", icon: "🤾", category: "team" },
  { id: "Tênis", label: "Tênis", icon: "🎾", category: "racket" },
  { id: "Corrida / Atletismo", label: "Corrida / Atletismo", icon: "🏃", category: "endurance" },
  { id: "Ciclismo", label: "Ciclismo", icon: "🚴", category: "endurance" },
  { id: "Natação", label: "Natação", icon: "🏊", category: "endurance" },
  { id: "Triatlo", label: "Triatlo", icon: "🏊🚴🏃", category: "endurance" },
  { id: "Outro", label: "Outro Esporte", icon: "🏆", category: "team" },
];

export const MATCH_TYPES: MatchTypeOption[] = [
  "Jogo / Partida",
  "Prova / Corrida",
  "Torneio / Etapa",
  "Amistoso",
  "Treino Tático / Simulado"
];

export const CompetitionsCalendarView: FC<CompetitionsCalendarViewProps> = ({
  athlete,
  allAthletes,
  onUpdateAthlete,
  role
}) => {
  const [selectedSportFilter, setSelectedSportFilter] = useState<string>("todos");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("todas");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  // Current Month State for Calendar
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Modal for Create/Edit Match
  const [selectedMatch, setSelectedMatch] = useState<MatchEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"info" | "pre" | "post">("info");

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formSport, setFormSport] = useState<SportOption>((athlete.modality as SportOption) || "Futebol");
  const [formType, setFormType] = useState<MatchTypeOption>("Jogo / Partida");
  const [formDate, setFormDate] = useState(getLocalDateString());
  const [formTime, setFormTime] = useState("15:00");
  const [formOpponent, setFormOpponent] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formVenueType, setFormVenueType] = useState<"Casa" | "Fora" | "Neutro">("Casa");
  const [formPriority, setFormPriority] = useState<MatchPriorityOption>("A");
  const [formTargetReadiness, setFormTargetReadiness] = useState<number>(80);

  // Pre-Game Form State
  const [formPreReadinessScore, setFormPreReadinessScore] = useState<number>(0);
  const [formPreNotes, setFormPreNotes] = useState("");

  // Post-Game Form State
  const [formResult, setFormResult] = useState<MatchResultOption>("Pendente");
  const [formScoreOrTime, setFormScoreOrTime] = useState("");
  const [formDurationMinutes, setFormDurationMinutes] = useState<number>(90);
  const [formPostRpe, setFormPostRpe] = useState<number>(7);
  const [formSorenessPost, setFormSorenessPost] = useState<number>(3);
  const [formTravelFatiguePost, setFormTravelFatiguePost] = useState<number>(2);
  const [formPostNotes, setFormPostNotes] = useState("");

  // Sport Specific Extra State
  const [formMinPlayed, setFormMinPlayed] = useState<number>(90);
  const [formGoals, setFormGoals] = useState<number>(0);
  const [formAssists, setFormAssists] = useState<number>(0);
  const [formSets, setFormSets] = useState<number>(0);
  const [formDistanceKm, setFormDistanceKm] = useState<number>(10);
  const [formPaceAvg, setFormPaceAvg] = useState("04:30");
  const [formElevation, setFormElevation] = useState<number>(0);
  const [formRankPos, setFormRankPos] = useState("");

  // Get Matches
  const matches = useMemo(() => {
    return athlete.matches || [];
  }, [athlete.matches]);

  // Filtered matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (selectedSportFilter !== "todos" && m.sport !== selectedSportFilter) return false;
      if (selectedPriorityFilter !== "todas" && m.priority !== selectedPriorityFilter) return false;
      return true;
    });
  }, [matches, selectedSportFilter, selectedPriorityFilter]);

  // Priority A counts, victory counts, average pre-game readiness
  const stats = useMemo(() => {
    const total = matches.length;
    const priorityA = matches.filter((m) => m.priority === "A").length;
    const completed = matches.filter((m) => m.status === "Concluído");
    const wins = matches.filter((m) => m.result === "Vitória" || m.result === "Pódio").length;
    
    const preScores = completed
      .map((m) => m.preGameReadinessScore)
      .filter((s): s is number => s !== undefined && s > 0);
    const avgPreReadiness = preScores.length > 0 ? Math.round(preScores.reduce((a, b) => a + b, 0) / preScores.length) : 0;

    return { total, priorityA, completedCount: completed.length, wins, avgPreReadiness };
  }, [matches]);

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = useMemo(() => {
    const date = new Date(year, month, 1);
    const days = [];
    // Start day offset (0 = Sun, 1 = Mon...)
    const firstDayIndex = date.getDay();

    // Fill previous month days empty
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= lastDay; i++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({ dayNumber: i, dateStr: dayStr });
    }
    return days;
  }, [year, month]);

  const monthName = currentDate.toLocaleString("pt-BR", { month: "long" });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Open Create Modal for specific date or general
  const handleOpenCreateModal = (dateStr?: string) => {
    setSelectedMatch(null);
    setModalTab("info");
    setFormTitle("");
    setFormSport((athlete.modality as SportOption) || "Futebol");
    setFormType("Jogo / Partida");
    setFormDate(dateStr || getLocalDateString());
    setFormTime("15:00");
    setFormOpponent("");
    setFormLocation("");
    setFormVenueType("Casa");
    setFormPriority("A");
    setFormTargetReadiness(80);

    // Reset Pre/Post
    setFormPreReadinessScore(0);
    setFormPreNotes("");
    setFormResult("Pendente");
    setFormScoreOrTime("");
    setFormDurationMinutes(90);
    setFormPostRpe(7);
    setFormSorenessPost(3);
    setFormTravelFatiguePost(2);
    setFormPostNotes("");

    // Sport extra
    setFormMinPlayed(90);
    setFormGoals(0);
    setFormAssists(0);
    setFormSets(0);
    setFormDistanceKm(10);
    setFormPaceAvg("04:30");
    setFormElevation(0);
    setFormRankPos("");

    setIsModalOpen(true);
  };

  // Open Edit Modal for existing match
  const handleOpenEditModal = (match: MatchEvent) => {
    setSelectedMatch(match);
    setModalTab("info");
    setFormTitle(match.title);
    setFormSport(match.sport);
    setFormType(match.type);
    setFormDate(match.date);
    setFormTime(match.time || "15:00");
    setFormOpponent(match.opponentOrEventName || "");
    setFormLocation(match.location || "");
    setFormVenueType(match.venueType);
    setFormPriority(match.priority);
    setFormTargetReadiness(match.preGameTargetReadiness || 80);

    // Pre
    setFormPreReadinessScore(match.preGameReadinessScore || 0);
    setFormPreNotes(match.preGameNotes || "");

    // Post
    setFormResult(match.result || "Pendente");
    setFormScoreOrTime(match.scoreOrTime || "");
    setFormDurationMinutes(match.durationMinutes || 90);
    setFormPostRpe(match.postRpe || 7);
    setFormSorenessPost(match.sorenessPost || 3);
    setFormTravelFatiguePost(match.travelFatiguePost || 2);
    setFormPostNotes(match.postGameNotes || "");

    // Sport extra
    const sp = match.sportSpecificData || {};
    setFormMinPlayed(sp.minutesPlayed ?? 90);
    setFormGoals(sp.goalsScored ?? 0);
    setFormAssists(sp.assists ?? 0);
    setFormSets(sp.setsPlayed ?? 0);
    setFormDistanceKm(sp.distanceKm ?? 10);
    setFormPaceAvg(sp.paceAvg || "04:30");
    setFormElevation(sp.elevationGainMeters ?? 0);
    setFormRankPos(sp.rankPosition || "");

    setIsModalOpen(true);
  };

  // Auto-fill Pre-Game Wellness if available for that date
  const handleAutoFillPreGameWellness = () => {
    const wellnessForDate = athlete.wellness?.find((w) => w.date && w.date.startsWith(formDate));
    if (wellnessForDate && wellnessForDate.readinessScore) {
      setFormPreReadinessScore(wellnessForDate.readinessScore);
    } else {
      // Fallback to latest wellness
      const latest = athlete.wellness?.[0];
      if (latest && latest.readinessScore) {
        setFormPreReadinessScore(latest.readinessScore);
      }
    }
  };

  // Save Match
  const handleSaveMatch = (e: React.FormEvent) => {
    e.preventDefault();

    const sportData: SportSpecificData = {
      minutesPlayed: formMinPlayed,
      goalsScored: formGoals,
      assists: formAssists,
      setsPlayed: formSets,
      distanceKm: formDistanceKm,
      paceAvg: formPaceAvg,
      elevationGainMeters: formElevation,
      rankPosition: formRankPos
    };

    const calculatedLoad = (formDurationMinutes || 0) * (formPostRpe || 0);
    const isCompleted = formResult !== "Pendente";

    const matchToSave: MatchEvent = {
      id: selectedMatch ? selectedMatch.id : `match-${Date.now()}`,
      athleteId: athlete.id,
      title: formTitle || `${formSport} vs ${formOpponent || "Adversário"}`,
      sport: formSport,
      type: formType,
      date: formDate,
      time: formTime,
      opponentOrEventName: formOpponent,
      location: formLocation,
      venueType: formVenueType,
      priority: formPriority,
      status: isCompleted ? "Concluído" : "Agendado",
      preGameTargetReadiness: formTargetReadiness,
      preGameReadinessScore: formPreReadinessScore > 0 ? formPreReadinessScore : undefined,
      preGameCheckinDone: formPreReadinessScore > 0,
      preGameNotes: formPreNotes,
      result: formResult,
      scoreOrTime: formScoreOrTime,
      durationMinutes: formDurationMinutes,
      postRpe: formPostRpe,
      postLoad: calculatedLoad,
      sorenessPost: formSorenessPost,
      travelFatiguePost: formTravelFatiguePost,
      sportSpecificData: sportData,
      postGameNotes: formPostNotes
    };

    let updatedMatches = [...matches];
    if (selectedMatch) {
      updatedMatches = updatedMatches.map((m) => (m.id === selectedMatch.id ? matchToSave : m));
    } else {
      updatedMatches = [matchToSave, ...updatedMatches];
    }

    // Also sync to athlete.externalSessions if completed, so training load/ACWR auto integrates!
    let updatedExternal = [...(athlete.externalSessions || [])];
    if (isCompleted && calculatedLoad > 0) {
      const existingExtIndex = updatedExternal.findIndex((e) => e.id === `ext-${matchToSave.id}`);
      const extSessionData = {
        id: `ext-${matchToSave.id}`,
        date: formDate,
        type: "jogo" as const,
        durationMinutes: formDurationMinutes,
        rpe: formPostRpe,
        notes: `Competição: ${matchToSave.title} (${formResult})`,
        load: calculatedLoad
      };

      if (existingExtIndex >= 0) {
        updatedExternal[existingExtIndex] = extSessionData;
      } else {
        updatedExternal = [extSessionData, ...updatedExternal];
      }
    }

    onUpdateAthlete({
      matches: updatedMatches,
      externalSessions: updatedExternal
    });

    setIsModalOpen(false);
  };

  // Delete Match
  const handleDeleteMatch = (matchId: string) => {
    if (window.confirm("Excluir este evento de competição do calendário?")) {
      const updated = matches.filter((m) => m.id !== matchId);
      onUpdateAthlete({ matches: updated });
    }
  };

  const getPriorityBadge = (p: MatchPriorityOption) => {
    switch (p) {
      case "A":
        return <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-black text-[9px] uppercase tracking-widest flex items-center gap-1"><Flame className="w-2.5 h-2.5 text-red-400 fill-red-400" /> ALVO A (PRINCIPAL)</span>;
      case "B":
        return <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-black text-[9px] uppercase tracking-widest">PREPARATÓRIA (B)</span>;
      case "C":
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-bold text-[9px] uppercase">SECUNDÁRIA (C)</span>;
    }
  };

  const getResultBadge = (res?: MatchResultOption) => {
    switch (res) {
      case "Vitória":
        return <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black text-[10px] uppercase tracking-wider flex items-center gap-1"><Trophy className="w-3 h-3 text-emerald-400" /> VITÓRIA</span>;
      case "Pódio":
        return <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black text-[10px] uppercase tracking-wider flex items-center gap-1"><Award className="w-3 h-3 text-amber-300" /> PÓDIO</span>;
      case "Derrota":
        return <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black text-[10px] uppercase tracking-wider">DERROTA</span>;
      case "Empate":
        return <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 font-black text-[10px] uppercase tracking-wider">EMPATE</span>;
      case "Concluído":
        return <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-black text-[10px] uppercase tracking-wider">✓ CONCLUÍDO</span>;
      default:
        return <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 font-black text-[10px] uppercase tracking-wider">AGENDADO</span>;
    }
  };

  return (
    <div className="space-y-8">
      
      {/* HEADER BANNER */}
      <div className="p-6 md:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/5 rounded-full blur-[90px] pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-primary/10 rounded-full border border-brand-primary/20 text-[9px] font-black tracking-widest text-brand-primary uppercase">
              <Trophy className="w-3.5 h-3.5 text-brand-primary" /> CALENDÁRIO UNIFICADO MULTIMODALIDADE
            </div>
            <h2 className="text-2xl md:text-4xl font-black italic uppercase tracking-tight text-white">
              COMPETIÇÕES & <span className="text-brand-primary">COLETA PRÉ/PÓS JOGO</span>
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl font-medium leading-relaxed">
              Gerencie partidas, provas e torneios para qualquer esporte (Futebol, Vôlei, Tênis, Corrida, Ciclismo, Natação) com monitoramento de prontidão no dia da prova e estatísticas dinâmicas pós-competição.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleOpenCreateModal()}
              className="flex items-center gap-2 px-5 py-3.5 bg-brand-primary hover:bg-lime-400 text-slate-950 font-black text-xs uppercase rounded-2xl tracking-wider shadow-lg shadow-brand-primary/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Novo Jogo / Prova
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Agendado</span>
            <span className="text-2xl font-black font-mono text-white mt-1 block">{stats.total}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block flex items-center gap-1">
              <Flame className="w-3 h-3 text-red-500 fill-red-500" /> Alvos Principais (A)
            </span>
            <span className="text-2xl font-black font-mono text-red-400 mt-1 block">{stats.priorityA}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">Vitórias / Pódios</span>
            <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">{stats.wins}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest block">Média Prontidão Pré-Jogo</span>
            <span className="text-2xl font-black font-mono text-brand-primary mt-1 block">{stats.avgPreReadiness > 0 ? `${stats.avgPreReadiness}%` : "--"}</span>
          </div>
        </div>
      </div>

      {/* FILTER & VIEW CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-3xl border border-slate-800">
        
        {/* FILTERS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 shrink-0 pr-2">
            <Filter className="w-3.5 h-3.5 text-brand-primary" /> Esporte:
          </span>
          <select
            value={selectedSportFilter}
            onChange={(e) => setSelectedSportFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-white font-bold text-xs rounded-xl px-3 py-2 outline-none focus:border-brand-primary"
          >
            <option value="todos">Todas Modalidades</option>
            {SPORTS_LIST.map((s) => (
              <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
            ))}
          </select>

          <select
            value={selectedPriorityFilter}
            onChange={(e) => setSelectedPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-white font-bold text-xs rounded-xl px-3 py-2 outline-none focus:border-brand-primary"
          >
            <option value="todas">Todas Prioridades</option>
            <option value="A">Prioridade A (Alvo)</option>
            <option value="B">Prioridade B (Preparatória)</option>
            <option value="C">Prioridade C (Treino)</option>
          </select>
        </div>

        {/* VIEW MODE TOGGLE */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shrink-0">
          <button
            onClick={() => setViewMode("calendar")}
            className={`px-4 py-2 rounded-xl font-black text-[10px] tracking-wider uppercase transition-all flex items-center gap-2 ${
              viewMode === "calendar"
                ? "bg-brand-primary text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Calendário Mensal
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 rounded-xl font-black text-[10px] tracking-wider uppercase transition-all flex items-center gap-2 ${
              viewMode === "list"
                ? "bg-brand-primary text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Lista & Coleta
          </button>
        </div>
      </div>

      {/* CALENDAR MONTHLY VIEW */}
      {viewMode === "calendar" && (
        <div className="p-6 md:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
          
          {/* MONTH NAVIGATOR */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevMonth}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-black uppercase text-white italic tracking-tight font-mono">
                {monthName} {year}
              </h3>
              <button
                onClick={handleNextMonth}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider border border-slate-800"
            >
              Hoje
            </button>
          </div>

          {/* WEEKDAY HEADERS */}
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
            <div>DOM</div>
            <div>SEG</div>
            <div>TER</div>
            <div>QUA</div>
            <div>QUI</div>
            <div>SEX</div>
            <div>SÁB</div>
          </div>

          {/* DAYS GRID */}
          <div className="grid grid-cols-7 gap-2">
            {daysInMonth.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="aspect-square rounded-2xl bg-slate-950/20 border border-slate-900/30" />;
              }

              const isToday = day.dateStr === getLocalDateString();
              const dayMatches = filteredMatches.filter((m) => m.date === day.dateStr);

              return (
                <div
                  key={day.dateStr}
                  onClick={() => handleOpenCreateModal(day.dateStr)}
                  className={`min-h-[110px] p-2 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer group hover:border-brand-primary/50 ${
                    isToday
                      ? "bg-brand-primary/5 border-brand-primary/40 ring-1 ring-brand-primary/30"
                      : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono font-black ${isToday ? "text-brand-primary" : "text-slate-400"}`}>
                      {day.dayNumber}
                    </span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-ping" />
                    )}
                  </div>

                  {/* MATCHES BADGES LIST ON THIS DAY */}
                  <div className="space-y-1.5 my-1">
                    {dayMatches.map((m) => {
                      const spInfo = SPORTS_LIST.find((s) => s.id === m.sport);
                      return (
                        <div
                          key={m.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(m);
                          }}
                          className={`p-1.5 rounded-xl border text-left transition-all hover:scale-102 ${
                            m.priority === "A"
                              ? "bg-red-950/40 border-red-500/40 text-red-200"
                              : m.priority === "B"
                              ? "bg-amber-950/40 border-amber-500/40 text-amber-200"
                              : "bg-slate-900 border-slate-800 text-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-black truncate">
                              {spInfo?.icon} {m.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 mt-0.5">
                            <span>{m.time || "15:00"}</span>
                            <span>• {m.venueType}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold text-brand-primary text-center">
                    + Adicionar
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LIST & TIMELINE VIEW */}
      {(viewMode === "list" || filteredMatches.length > 0) && (
        <div className="p-6 md:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-lg font-black uppercase text-white italic tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-primary" />
              CRONOGRAMA E CENTRAL DE COLETA ({filteredMatches.length})
            </h3>
          </div>

          {filteredMatches.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-medium text-xs">
              Nenhuma competição encontrada para os filtros selecionados.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMatches.sort((a, b) => b.date.localeCompare(a.date)).map((m) => {
                const spInfo = SPORTS_LIST.find((s) => s.id === m.sport);
                const isPast = m.date < getLocalDateString();
                const isToday = m.date === getLocalDateString();

                return (
                  <div
                    key={m.id}
                    className={`p-5 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                      isToday
                        ? "bg-slate-950 border-brand-primary/50 shadow-xl shadow-brand-primary/5"
                        : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl shrink-0">
                        {spInfo?.icon || "🏆"}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-black text-white">{m.title}</h4>
                          {getPriorityBadge(m.priority)}
                          {getResultBadge(m.result)}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 font-medium flex-wrap">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3.5 h-3.5 text-brand-primary" /> {formatDate(m.date)}
                          </span>
                          {m.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-500" /> {m.time}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" /> {m.location || m.venueType}
                          </span>
                        </div>

                        {/* PRE & POST INDICATORS */}
                        <div className="flex items-center gap-4 pt-2 flex-wrap text-xs font-bold">
                          {m.preGameReadinessScore ? (
                            <span className="text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Prontidão Pré-Jogo: {m.preGameReadinessScore}%
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                              <AlertTriangle className="w-3.5 h-3.5" /> Coleta Pré-Jogo Pendente
                            </span>
                          )}

                          {m.postLoad ? (
                            <span className="text-brand-primary flex items-center gap-1 bg-brand-primary/10 px-2.5 py-1 rounded-lg border border-brand-primary/20">
                              <Zap className="w-3.5 h-3.5" /> Carga do Jogo: {m.postLoad} AU ({m.durationMinutes}min | PSE {m.postRpe})
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(m)}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase rounded-xl border border-slate-800 transition-colors flex items-center gap-2"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-brand-primary" />
                        Coletar / Editar Dados
                      </button>

                      <button
                        onClick={() => handleDeleteMatch(m.id)}
                        className="p-2.5 rounded-xl bg-slate-900 text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 transition-colors"
                        title="Excluir Competição"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT & COLLECTION MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 relative"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="text-[9px] font-black text-brand-primary uppercase tracking-widest">
                    GERENCIADOR DE COMPETIÇÕES & COLETA
                  </div>
                  <h3 className="text-xl font-black text-white italic uppercase tracking-tight">
                    {selectedMatch ? "EDITAR / COLETAR DADOS DO JOGO" : "NOVO JOGO OU PROVA DE COMPETIÇÃO"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* MODAL TABS */}
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalTab("info")}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                    modalTab === "info"
                      ? "bg-brand-primary text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  1. Dados do Jogo
                </button>

                <button
                  type="button"
                  onClick={() => setModalTab("pre")}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                    modalTab === "pre"
                      ? "bg-brand-primary text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  2. Coleta Pré-Jogo
                </button>

                <button
                  type="button"
                  onClick={() => setModalTab("post")}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                    modalTab === "post"
                      ? "bg-brand-primary text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  3. Coleta Pós-Jogo
                </button>
              </div>

              <form onSubmit={handleSaveMatch} className="space-y-6">
                
                {/* TAB 1: BASIC MATCH INFO */}
                {modalTab === "info" && (
                  <div className="space-y-4">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          Modalidade Esportiva
                        </label>
                        <select
                          value={formSport}
                          onChange={(e) => setFormSport(e.target.value as SportOption)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3 text-xs text-white font-black outline-none"
                        >
                          {SPORTS_LIST.map((s) => (
                            <option key={s.id} value={s.id} className="bg-slate-900">
                              {s.icon} {s.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          Tipo de Evento
                        </label>
                        <select
                          value={formType}
                          onChange={(e) => setFormType(e.target.value as MatchTypeOption)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3 text-xs text-white font-black outline-none"
                        >
                          {MATCH_TYPES.map((t) => (
                            <option key={t} value={t} className="bg-slate-900">{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                        Título do Jogo / Nome da Prova
                      </label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        placeholder="Ex: Flamengo vs Palmeiras, Maratona Internacional, Open de Tênis..."
                        className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3 text-xs text-white font-black outline-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          Data
                        </label>
                        <input
                          type="date"
                          value={formDate}
                          onChange={(e) => setFormDate(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3 text-xs text-white font-black outline-none"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          Horário
                        </label>
                        <input
                          type="time"
                          value={formTime}
                          onChange={(e) => setFormTime(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3 text-xs text-white font-black outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          Prioridade no Calendário
                        </label>
                        <select
                          value={formPriority}
                          onChange={(e) => setFormPriority(e.target.value as MatchPriorityOption)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3 text-xs text-white font-black outline-none"
                        >
                          <option value="A" className="bg-slate-900">Prioridade A (Alvo Principal)</option>
                          <option value="B" className="bg-slate-900">Prioridade B (Preparatória)</option>
                          <option value="C" className="bg-slate-900">Prioridade C (Secundária)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          Mando / Mando de Campo
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["Casa", "Fora", "Neutro"] as const).map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setFormVenueType(v)}
                              className={`py-2.5 rounded-xl font-bold text-xs uppercase border transition-all ${
                                formVenueType === v
                                  ? "bg-slate-800 text-brand-primary border-brand-primary"
                                  : "bg-slate-950 text-slate-400 border-slate-800"
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          Adversário / Local da Prova
                        </label>
                        <input
                          type="text"
                          value={formOpponent}
                          onChange={(e) => setFormOpponent(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                          placeholder="Ex: Rival FC, Maracanã, Parque Ibirapuera..."
                          className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3 text-xs text-white font-medium outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: PRE-GAME READINESS COLLECTION */}
                {modalTab === "pre" && (
                  <div className="space-y-6">
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white uppercase">Coleta no Dia do Jogo / Prova</span>
                        <button
                          type="button"
                          onClick={handleAutoFillPreGameWellness}
                          className="px-3 py-1 rounded-lg bg-brand-primary/10 text-brand-primary border border-brand-primary/30 font-bold text-[10px] uppercase hover:bg-brand-primary hover:text-slate-950 transition-colors"
                        >
                          ⚡ Puxar Prontidão do Check-in Wellness de Hoje
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Insira o Score de Prontidão (Readiness 0-100%) coletado na manhã do jogo para avaliar a recuperação do atleta.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Score de Prontidão Medido (0 - 100%)
                        </label>
                        <span className="text-xl font-mono font-black text-brand-primary">
                          {formPreReadinessScore > 0 ? `${formPreReadinessScore}%` : "Pendente"}
                        </span>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formPreReadinessScore}
                        onChange={(e) => setFormPreReadinessScore(Number(e.target.value))}
                        className="w-full accent-brand-primary cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                        Meta de Prontidão Desejada (%)
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="100"
                        value={formTargetReadiness === 0 ? "" : formTargetReadiness || ""}
                        onChange={(e) => setFormTargetReadiness(Number(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        placeholder="85"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3 text-xs text-white font-black outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                        Parecer / Observações Pré-Competição
                      </label>
                      <textarea
                        value={formPreNotes}
                        onChange={(e) => setFormPreNotes(e.target.value)}
                        placeholder="Ex: Atleta motivado, sem dores musculares registradas no check-in, estratégia tática definida..."
                        className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3 text-xs text-white font-medium outline-none h-20 resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 3: POST-GAME DATA COLLECTION (DYNAMIC BY SPORT) */}
                {modalTab === "post" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          Resultado Final
                        </label>
                        <select
                          value={formResult}
                          onChange={(e) => setFormResult(e.target.value as MatchResultOption)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3 text-xs text-white font-black outline-none"
                        >
                          <option value="Pendente" className="bg-slate-900">Pendente (Não Concluído)</option>
                          <option value="Vitória" className="bg-slate-900">Vitória</option>
                          <option value="Derrota" className="bg-slate-900">Derrota</option>
                          <option value="Empate" className="bg-slate-900">Empate</option>
                          <option value="Concluído" className="bg-slate-900">Concluído (Provas)</option>
                          <option value="Pódio" className="bg-slate-900">Pódio / Medalha</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          Placar / Tempo / Posicionamento
                        </label>
                        <input
                          type="text"
                          value={formScoreOrTime}
                          onChange={(e) => setFormScoreOrTime(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                          placeholder="Ex: 3x1, 2h45min12s, 6-3 / 6-4, 1º Lugar..."
                          className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3 text-xs text-white font-black outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          Duração Total do Evento (Minutos)
                        </label>
                        <input
                          type="number"
                          value={formDurationMinutes === 0 ? "" : formDurationMinutes || ""}
                          onChange={(e) => setFormDurationMinutes(Number(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                          placeholder="90"
                          className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3 text-xs text-white font-black outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          PSE / RPE da Competição (0-10)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={formPostRpe === 0 ? "" : formPostRpe || ""}
                          onChange={(e) => setFormPostRpe(Number(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                          placeholder="8"
                          className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3 text-xs text-white font-black outline-none"
                        />
                      </div>
                    </div>

                    {/* SPORT-SPECIFIC EXTRA FIELDS */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                      <div className="text-[10px] font-black text-brand-primary uppercase tracking-widest">
                        MÓDULO ESPECÍFICO DE DESEMPENHO ({formSport.toUpperCase()})
                      </div>

                      {/* TEAM SPORTS */}
                      {["Futebol", "Basquete", "Handebol"].includes(formSport) && (
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">Min. Jogados</label>
                            <input
                              type="number"
                              value={formMinPlayed === 0 ? "" : formMinPlayed || ""}
                              onChange={(e) => setFormMinPlayed(Number(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              placeholder="90"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">Gols/Pontos</label>
                            <input
                              type="number"
                              value={formGoals === 0 ? "" : formGoals || ""}
                              onChange={(e) => setFormGoals(Number(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              placeholder="0"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">Assistências</label>
                            <input
                              type="number"
                              value={formAssists === 0 ? "" : formAssists || ""}
                              onChange={(e) => setFormAssists(Number(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              placeholder="0"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-bold"
                            />
                          </div>
                        </div>
                      )}

                      {/* RACKET / NET SPORTS */}
                      {["Vôlei", "Tênis"].includes(formSport) && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">Sets Jogados</label>
                            <input
                              type="number"
                              value={formSets === 0 ? "" : formSets || ""}
                              onChange={(e) => setFormSets(Number(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              placeholder="3"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">Pontos / Games Vencidos</label>
                            <input
                              type="number"
                              value={formGoals === 0 ? "" : formGoals || ""}
                              onChange={(e) => setFormGoals(Number(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              placeholder="0"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-bold"
                            />
                          </div>
                        </div>
                      )}

                      {/* ENDURANCE SPORTS */}
                      {["Corrida / Atletismo", "Ciclismo", "Natação", "Triatlo"].includes(formSport) && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">Distância (km)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={formDistanceKm === 0 ? "" : formDistanceKm || ""}
                              onChange={(e) => setFormDistanceKm(Number(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              placeholder="10.0"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">Pace Média</label>
                            <input
                              type="text"
                              value={formPaceAvg}
                              onChange={(e) => setFormPaceAvg(e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              placeholder="04:30 min/km"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">Desnível (m)</label>
                            <input
                              type="number"
                              value={formElevation === 0 ? "" : formElevation || ""}
                              onChange={(e) => setFormElevation(Number(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              placeholder="150"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">Colocação / Rank</label>
                            <input
                              type="text"
                              value={formRankPos}
                              onChange={(e) => setFormRankPos(e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              placeholder="3º Lugar Geral"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-bold"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                        Feedback & Observações Pós-Jogo
                      </label>
                      <textarea
                        value={formPostNotes}
                        onChange={(e) => setFormPostNotes(e.target.value)}
                        placeholder="Ex: Excelente resposta no 2º tempo, fadiga moderada nas pernas, necessidade de crio/bota de compressão..."
                        className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3 text-xs text-white font-medium outline-none h-20 resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* MODAL ACTIONS */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-1/3 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase rounded-xl tracking-wider transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-3.5 bg-brand-primary hover:bg-lime-400 text-slate-950 font-black text-xs uppercase rounded-xl tracking-wider shadow-lg shadow-brand-primary/20 transition-all active:scale-95 cursor-pointer"
                  >
                    Salvar Evento & Coleta
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
