import React, { FC, useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Trophy, Calendar as CalendarIcon, Plus, Trash2, MapPin, ChevronLeft, ChevronRight, Filter, Check, X, Edit2, Layers } from "lucide-react";
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
  athlete?: Athlete;
  allAthletes?: Athlete[];
  onUpdateAthlete: (data: Partial<Athlete>) => void;
  onUpdateAthleteById?: (id: string, data: Partial<Athlete>) => void;
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
  onUpdateAthleteById,
  role
}) => {
  const modalViewportRef = useRef<HTMLDivElement>(null);
  const [selectedSportFilter, setSelectedSportFilter] = useState<string>("todos");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("todas");
  const [viewMode, setViewMode] = useState<"calendar" | "list">(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches ? 'list' : 'calendar');
  const [athleteFilter, setAthleteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDay, setSelectedDay] = useState(getLocalDateString());
  const owners = useMemo(() => role === 'coach' && onUpdateAthleteById ? (allAthletes || (athlete ? [athlete] : [])) : athlete ? [athlete] : [], [role, allAthletes, athlete, onUpdateAthleteById]);
  const [formAthleteId, setFormAthleteId] = useState(athlete?.id || owners[0]?.id || '');
  const formAthlete = owners.find(a => a.id === formAthleteId);
  const persist = (owner: Athlete, data: Partial<Athlete>) => {
    if (role === 'coach' && onUpdateAthleteById) onUpdateAthleteById(owner.id, data);
    else if (owner.id === athlete?.id) onUpdateAthlete(data);
  };

  // Current Month State for Calendar
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Modal for Create/Edit Match
  const [selectedMatch, setSelectedMatch] = useState<MatchEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  useEffect(() => {
    if (!isModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const viewport = window.visualViewport;
    const fitViewport = () => {
      const overlay = modalViewportRef.current;
      if (!overlay) return;
      overlay.style.height = `${viewport?.height || window.innerHeight}px`;
      overlay.style.top = `${viewport?.offsetTop || 0}px`;
    };
    fitViewport();
    viewport?.addEventListener('resize', fitViewport);
    viewport?.addEventListener('scroll', fitViewport);
    window.addEventListener('resize', fitViewport);
    return () => {
      document.body.style.overflow = previousOverflow;
      viewport?.removeEventListener('resize', fitViewport);
      viewport?.removeEventListener('scroll', fitViewport);
      window.removeEventListener('resize', fitViewport);
    };
  }, [isModalOpen]);

  const [modalTab, setModalTab] = useState<"info" | "pre" | "post">("info");

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formSport, setFormSport] = useState<SportOption>((athlete?.modality as SportOption) || "Futebol");
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

  // Keep the owner with each participation; event IDs may repeat across athletes.
  const matches = useMemo(() => owners.flatMap(a => (a.matches || []).map(m => ({ ...m, athleteId: a.id, athleteName: a.name }))), [owners]);
  const filteredMatches = useMemo(() => matches.filter(m =>
    (athleteFilter === 'all' || m.athleteId === athleteFilter) &&
    (selectedSportFilter === 'todos' || m.sport === selectedSportFilter) &&
    (selectedPriorityFilter === 'todas' || m.priority === selectedPriorityFilter) &&
    (statusFilter === 'all' || m.status === statusFilter)
  ), [matches, athleteFilter, selectedSportFilter, selectedPriorityFilter, statusFilter]);

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
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthMatches = useMemo(() => filteredMatches.filter(m => m.date.startsWith(monthKey)).sort((a,b) => a.date.localeCompare(b.date) || (a.time || '99:99').localeCompare(b.time || '99:99') || a.athleteName.localeCompare(b.athleteName)), [filteredMatches, monthKey]);
  const matchesByDay = useMemo(() => {
    const result = new Map<string, typeof monthMatches>();
    for (const m of monthMatches) result.set(m.date, [...(result.get(m.date) || []), m]);
    return result;
  }, [monthMatches]);
  const visibleMatches = viewMode === 'list' ? monthMatches : matchesByDay.get(selectedDay) || [];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(`${new Date(year, month - 1, 1).getFullYear()}-${String(new Date(year, month - 1, 1).getMonth() + 1).padStart(2, '0')}-01`);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(`${new Date(year, month + 1, 1).getFullYear()}-${String(new Date(year, month + 1, 1).getMonth() + 1).padStart(2, '0')}-01`);
  };

  // Open Create Modal for specific date or general
  const handleOpenCreateModal = (dateStr?: string) => {
    const owner = owners.find(a => a.id === athleteFilter) || owners.find(a => a.id === athlete?.id) || owners[0];
    if (!owner) return;
    setFormAthleteId(owner.id);
    setSelectedMatch(null);
    setModalTab("info");
    setFormTitle("");
    setFormSport((owner.modality as SportOption) || "Futebol");
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
    setFormAthleteId(match.athleteId);
    setSelectedMatch(match);
    setModalTab("info");
    setFormTitle(match.title);
    setFormSport(match.sport);
    setFormType(match.type);
    setFormDate(match.date);
    setFormTime(match.time || "");
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
    setFormDurationMinutes(match.durationMinutes ?? 90);
    setFormPostRpe(match.postRpe ?? 7);
    setFormSorenessPost(match.sorenessPost ?? 3);
    setFormTravelFatiguePost(match.travelFatiguePost ?? 2);
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
    const wellnessForDate = formAthlete?.wellness?.find((w) => w.date && w.date.startsWith(formDate));
    if (wellnessForDate && wellnessForDate.readinessScore) {
      setFormPreReadinessScore(wellnessForDate.readinessScore);
    } else {
      // Fallback to latest wellness
      const latest = formAthlete?.wellness?.[0];
      if (latest && latest.readinessScore) {
        setFormPreReadinessScore(latest.readinessScore);
      }
    }
  };

  // Save Match
  const handleSaveMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAthlete) return;

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
      athleteId: formAthlete.id,
      title: formTitle || `${formSport} vs ${formOpponent || "Adversário"}`,
      sport: formSport,
      type: formType,
      date: formDate,
      time: formTime,
      opponentOrEventName: formOpponent,
      location: formLocation,
      venueType: formVenueType,
      priority: formPriority,
      status: isCompleted ? "Concluído" : selectedMatch?.status === "Cancelado" ? "Cancelado" : "Agendado",
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

    let updatedMatches = [...(formAthlete.matches || [])];
    if (selectedMatch) {
      updatedMatches = updatedMatches.map((m) => (m.id === selectedMatch.id ? matchToSave : m));
    } else {
      updatedMatches = [matchToSave, ...updatedMatches];
    }

    // Also sync to athlete.externalSessions if completed, so training load/ACWR auto integrates!
    let updatedExternal = [...(formAthlete.externalSessions || [])];
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
    } else {
      updatedExternal = updatedExternal.filter(e => e.id !== `ext-${matchToSave.id}`);
    }

    persist(formAthlete, {
      matches: updatedMatches,
      externalSessions: updatedExternal
    });

    // Keep the saved event visible, including when its date or athlete changed.
    setCurrentDate(new Date(`${formDate}T12:00:00`));
    setSelectedDay(formDate);
    if (athleteFilter !== 'all') setAthleteFilter(formAthlete.id);
    if (selectedSportFilter !== 'todos' && selectedSportFilter !== formSport) setSelectedSportFilter('todos');
    if (selectedPriorityFilter !== 'todas' && selectedPriorityFilter !== formPriority) setSelectedPriorityFilter('todas');
    if (statusFilter !== 'all' && statusFilter !== matchToSave.status) setStatusFilter('all');
    setIsModalOpen(false);
  };

  // Scope all mutations to the event owner, never the dashboard selection.
  const handleDeleteMatch = (match: MatchEvent) => {
    const owner = owners.find(a => a.id === match.athleteId);
    if (owner && window.confirm("Excluir este evento de competição do calendário?")) {
      persist(owner, { matches: (owner.matches || []).filter(m => m.id !== match.id), externalSessions: (owner.externalSessions || []).filter(e => e.id !== `ext-${match.id}`) });
    }
  };

  return (
    <div className="lb-competitions space-y-5">
      <header className="lc-hero">
        <div className="lc-eyebrow"><Trophy size={15} /> LB PERFORMANCE · {role === 'coach' ? 'TREINADOR' : 'ATLETA'}</div>
        <div className="lc-hero-row"><div><h2>Competições<br />no seu radar.</h2><p>{role === 'coach' ? 'Todos os seus atletas. Uma visão para planejar.' : 'Seus jogos, provas e torneios em um só lugar.'}</p></div><button className="lc-primary" onClick={() => handleOpenCreateModal()} disabled={!owners.length}><Plus size={17} /> Novo jogo / prova</button></div>
        <div className="lc-hero-bottom"><span><span className="lc-dot" />{role === 'coach' ? 'Calendário geral' : 'Meu calendário'}</span><span>Jogos · Provas · Torneios</span></div>
      </header>
      <div className="lc-body">
        <div className="lc-filters">
          {role === 'coach' && <label>Atleta<select aria-label="Filtrar por atleta" value={athleteFilter} onChange={e => setAthleteFilter(e.target.value)}><option value="all">Todos os atletas</option>{owners.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
          <label>Modalidade<select aria-label="Filtrar por modalidade" value={selectedSportFilter} onChange={e => setSelectedSportFilter(e.target.value)}><option value="todos">Todas as modalidades</option>{SPORTS_LIST.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}</select></label>
        </div>
        <details className="lc-more-filters"><summary><Filter size={14} /> Mais filtros{selectedPriorityFilter !== 'todas' || statusFilter !== 'all' ? ' · ativos' : ''}</summary><div className="lc-filters"><label>Prioridade<select aria-label="Filtrar por prioridade" value={selectedPriorityFilter} onChange={e => setSelectedPriorityFilter(e.target.value)}><option value="todas">Todas as prioridades</option><option value="A">A · Principal</option><option value="B">B · Preparatória</option><option value="C">C · Secundária</option></select></label><label>Situação<select aria-label="Filtrar por situação" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">Todas as situações</option><option>Agendado</option><option>Concluído</option><option>Cancelado</option></select></label></div></details>
        <div className="lc-toolbar"><div className="lc-segment" aria-label="Visualização"><button aria-pressed={viewMode === 'calendar'} onClick={() => setViewMode('calendar')}><CalendarIcon size={16} />Mês</button><button aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')}><Layers size={16} />Agenda</button></div><span className="lc-muted">{monthMatches.length} {monthMatches.length === 1 ? 'participação' : 'participações'} no mês</span></div>
        <div className="lc-month-row"><div><button aria-label="Mês anterior" onClick={handlePrevMonth}><ChevronLeft size={18} /></button><h3>{monthName} {year}</h3><button aria-label="Próximo mês" onClick={handleNextMonth}><ChevronRight size={18} /></button></div><button className="lc-today" onClick={() => { setCurrentDate(new Date()); setSelectedDay(getLocalDateString()); }}>Hoje</button></div>
        {viewMode === 'calendar' && <div className="lc-grid" aria-label={`Calendário de ${monthName} ${year}`}>
          {['DOM','SEG','TER','QUA','QUI','SEX','SÁB'].map(d => <span className="lc-weekday" key={d}>{d}</span>)}
          {daysInMonth.map((day, i) => !day ? <span key={`empty-${i}`} /> : <button key={day.dateStr} className="lc-day" data-events={Boolean(matchesByDay.get(day.dateStr)?.length)} aria-current={day.dateStr === getLocalDateString() ? 'date' : undefined} aria-pressed={selectedDay === day.dateStr} aria-label={`${formatDate(day.dateStr)}, ${matchesByDay.get(day.dateStr)?.length || 0} participações`} onClick={() => setSelectedDay(day.dateStr)}><span>{day.dayNumber}</span><span className="lc-day-count" aria-hidden="true">{matchesByDay.get(day.dateStr)?.length ? (matchesByDay.get(day.dateStr)!.length > 3 ? `${matchesByDay.get(day.dateStr)!.length}` : '●'.repeat(matchesByDay.get(day.dateStr)!.length)) : '\u00a0'}</span></button>)}
        </div>}
        <section className="lc-agenda" aria-live="polite"><div className="lc-agenda-heading"><h3>{viewMode === 'calendar' ? 'Competições do dia' : 'Agenda do mês'}</h3><span className="lc-muted">{viewMode === 'calendar' ? formatDate(selectedDay) : `${monthMatches.length} participações`}</span></div>
          {!visibleMatches.length ? <div className="lc-empty"><CalendarIcon size={28} /><p>{owners.length ? 'Sem competições para este período e filtros.' : 'Cadastre um atleta para começar.'}</p>{owners.length > 0 && <button className="lc-secondary" onClick={() => handleOpenCreateModal(viewMode === 'calendar' ? selectedDay : undefined)}><Plus size={15} />Adicionar competição</button>}</div> : <div className="lc-event-list">{visibleMatches.map(m => <article className="lc-event" key={`${m.athleteId}:${m.id}`}>
            <div className="lc-time"><time>{m.time || 'A definir'}</time><span>{formatDate(m.date).slice(0,5)}</span></div>
            <div className="lc-event-content"><span className="lc-sport">{m.sport}</span><h4>{m.athleteName}</h4><p className="lc-event-title">{m.title}</p><p className="lc-location"><MapPin size={13} />{m.location || 'Local a definir'} · {m.venueType}</p><div className="lc-event-footer"><span className="lc-priority" data-priority={m.priority}>{m.priority} · {m.priority === 'A' ? 'Principal' : m.priority === 'B' ? 'Preparatória' : 'Secundária'}</span><span className="lc-muted">{m.status}{m.status === 'Concluído' && m.result && m.result !== 'Concluído' ? ` · ${m.result}` : ''}</span></div>
            {(m.preGameReadinessScore != null && m.preGameReadinessScore > 0 || m.status === 'Concluído' && m.postLoad != null) && <div className="lc-collected">{m.preGameReadinessScore != null && m.preGameReadinessScore > 0 && <span>Prontidão: {m.preGameReadinessScore}%</span>}{m.status === 'Concluído' && m.postLoad != null && <span>Carga: {m.postLoad.toLocaleString('pt-BR')} UA</span>}</div>}
            <div className="lc-event-actions"><button className="lc-secondary" onClick={() => handleOpenEditModal(m)}><Edit2 size={14} />Detalhes / pré e pós</button><button className="lc-delete" aria-label={`Excluir ${m.title} de ${m.athleteName}`} onClick={() => handleDeleteMatch(m)}><Trash2 size={16} /></button></div></div>
          </article>)}</div>}
        </section>
      </div>
      {/* CREATE / EDIT & COLLECTION MODAL */}
      {createPortal(<AnimatePresence>
        {isModalOpen && (
          <div ref={modalViewportRef} className="lb-competitions lc-modal-overlay bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="competition-modal-title"
              className="lc-modal bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl relative"
            >
              <div className="lc-modal-scroll space-y-5 p-4 sm:p-6 md:p-8">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="text-[9px] font-black text-brand-primary uppercase tracking-widest">
                    GERENCIADOR DE COMPETIÇÕES & COLETA
                  </div>
                  <h3 id="competition-modal-title" className="text-xl font-black text-white italic uppercase tracking-tight">
                    {selectedMatch ? "EDITAR / COLETAR DADOS DO JOGO" : "NOVO JOGO OU PROVA DE COMPETIÇÃO"}
                  </h3>
                </div>
                <button
                  aria-label="Fechar competição"
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

              <form id="competition-collection-form" onSubmit={handleSaveMatch} className="space-y-6">
                <label className="lc-owner-label">Atleta
                  <select aria-label="Atleta da competição" value={formAthleteId} disabled={Boolean(selectedMatch) || role !== 'coach'} onChange={e => { setFormAthleteId(e.target.value); const owner = owners.find(a => a.id === e.target.value); setFormSport((owner?.modality as SportOption) || 'Futebol'); }}>
                    {owners.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </label>
                
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
                        aria-label="Nome da competição"
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
                          aria-label="Data da competição"
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
                          aria-label="Horário da competição"
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
                          aria-label="Resultado final"
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
                          aria-label="Duração da competição em minutos"
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
                          min="0"
                          max="10"
                          aria-label="PSE da competição"
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

              </form>
              </div>
                {/* Actions stay outside the scrolling fields, above app navigation. */}
                <div className="lc-modal-actions border-t border-slate-800 flex items-center gap-3 p-4 sm:px-6 md:px-8">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase rounded-xl tracking-wider transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    form="competition-collection-form"
                    className="w-2/3 py-3 bg-brand-primary hover:bg-lime-400 text-slate-950 font-black text-xs uppercase rounded-xl tracking-wider shadow-lg shadow-brand-primary/20 transition-all active:scale-95 cursor-pointer"
                  >
                    Salvar Evento & Coleta
                  </button>
                </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>, document.body)}

    </div>
  );
};
