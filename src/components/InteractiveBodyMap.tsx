import React, { FC, useState, useMemo } from "react";
import {
  Activity,
  Calendar,
  ShieldAlert,
  Plus,
  Trash2,
  HeartPulse,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Info,
  X,
  RotateCcw,
  User,
  Filter,
  Check
} from "lucide-react";
import {
  Athlete,
  BodyMapRecord,
  SideOption,
  PainTypeOption,
  EvolutionStatusOption,
  InjuryEntry
} from "../types";
import { motion, AnimatePresence } from "motion/react";
import { formatDate, getLocalDateString } from "../utils";

interface InteractiveBodyMapProps {
  athlete: Athlete;
  onUpdateAthlete: (data: Partial<Athlete>) => void;
  role: "coach" | "athlete";
}

// Region definitions for SVG mapping
export interface BodyRegionDef {
  id: string;
  name: string;
  view: "anterior" | "posterior";
  category: "membro_superior" | "tronco" | "membro_inferior" | "cabeca";
  defaultLocation: 'Joelho' | 'Tornozelo' | 'Coxa Posterior' | 'Coxa Anterior' | 'Panturrilha' | 'Coluna/Lombar' | 'Ombro' | 'Pé/Articulação' | 'Outro';
}

export const BODY_REGIONS: BodyRegionDef[] = [
  // Anterior (Frente)
  { id: "cabeca_pesc", name: "Cabeça & Pescoço", view: "anterior", category: "cabeca", defaultLocation: "Outro" },
  { id: "ombro_d", name: "Ombro Direito", view: "anterior", category: "membro_superior", defaultLocation: "Ombro" },
  { id: "ombro_e", name: "Ombro Esquerdo", view: "anterior", category: "membro_superior", defaultLocation: "Ombro" },
  { id: "peitoral", name: "Peitoral & Tórax", view: "anterior", category: "tronco", defaultLocation: "Outro" },
  { id: "abdomen", name: "Abdômen & Core", view: "anterior", category: "tronco", defaultLocation: "Outro" },
  { id: "cotovelo_d", name: "Cotovelo Direito", view: "anterior", category: "membro_superior", defaultLocation: "Outro" },
  { id: "cotovelo_e", name: "Cotovelo Esquerdo", view: "anterior", category: "membro_superior", defaultLocation: "Outro" },
  { id: "punho_d", name: "Punho & Mão Direita", view: "anterior", category: "membro_superior", defaultLocation: "Outro" },
  { id: "punho_e", name: "Punho & Mão Esquerda", view: "anterior", category: "membro_superior", defaultLocation: "Outro" },
  { id: "quadril_d", name: "Quadril / Pélvis Dir.", view: "anterior", category: "membro_inferior", defaultLocation: "Outro" },
  { id: "quadril_e", name: "Quadril / Pélvis Esq.", view: "anterior", category: "membro_inferior", defaultLocation: "Outro" },
  { id: "coxa_ant_d", name: "Coxa Anterior Dir. (Quadríceps)", view: "anterior", category: "membro_inferior", defaultLocation: "Coxa Anterior" },
  { id: "coxa_ant_e", name: "Coxa Anterior Esq. (Quadríceps)", view: "anterior", category: "membro_inferior", defaultLocation: "Coxa Anterior" },
  { id: "joelho_d", name: "Joelho Direito", view: "anterior", category: "membro_inferior", defaultLocation: "Joelho" },
  { id: "joelho_e", name: "Joelho Esquerdo", view: "anterior", category: "membro_inferior", defaultLocation: "Joelho" },
  { id: "canela_d", name: "Canela / Tíbia Dir.", view: "anterior", category: "membro_inferior", defaultLocation: "Outro" },
  { id: "canela_e", name: "Canela / Tíbia Esq.", view: "anterior", category: "membro_inferior", defaultLocation: "Outro" },
  { id: "tornozelo_d", name: "Tornozelo / Pé Dir.", view: "anterior", category: "membro_inferior", defaultLocation: "Tornozelo" },
  { id: "tornozelo_e", name: "Tornozelo / Pé Esq.", view: "anterior", category: "membro_inferior", defaultLocation: "Tornozelo" },

  // Posterior (Costas)
  { id: "nuca_cervical", name: "Cervical & Nuca", view: "posterior", category: "cabeca", defaultLocation: "Outro" },
  { id: "trapezio_costas", name: "Trapézio & Dorsal", view: "posterior", category: "tronco", defaultLocation: "Outro" },
  { id: "lombar", name: "Coluna & Lombar", view: "posterior", category: "tronco", defaultLocation: "Coluna/Lombar" },
  { id: "gluteo_d", name: "Glúteo Direito", view: "posterior", category: "membro_inferior", defaultLocation: "Outro" },
  { id: "gluteo_e", name: "Glúteo Esquerdo", view: "posterior", category: "membro_inferior", defaultLocation: "Outro" },
  { id: "coxa_post_d", name: "Coxa Posterior Dir. (Isquiotibiais)", view: "posterior", category: "membro_inferior", defaultLocation: "Coxa Posterior" },
  { id: "coxa_post_e", name: "Coxa Posterior Esq. (Isquiotibiais)", view: "posterior", category: "membro_inferior", defaultLocation: "Coxa Posterior" },
  { id: "panturrilha_d", name: "Panturrilha Direita", view: "posterior", category: "membro_inferior", defaultLocation: "Panturrilha" },
  { id: "panturrilha_e", name: "Panturrilha Esquerda", view: "posterior", category: "membro_inferior", defaultLocation: "Panturrilha" },
  { id: "calcanhar_d", name: "Calcanhar / Tendão Dir.", view: "posterior", category: "membro_inferior", defaultLocation: "Pé/Articulação" },
  { id: "calcanhar_e", name: "Calcanhar / Tendão Esq.", view: "posterior", category: "membro_inferior", defaultLocation: "Pé/Articulação" }
];

export const PAIN_TYPES: PainTypeOption[] = [
  "Muscular",
  "Articular",
  "Tendão",
  "Ligamento",
  "Trauma",
  "Dor Tardia (DOMS)"
];

export const SIDE_OPTIONS: SideOption[] = [
  "Direito",
  "Esquerdo",
  "Bilateral"
];

export const EVOLUTION_OPTIONS: EvolutionStatusOption[] = [
  "Iniciou",
  "Aumentou",
  "Melhorou",
  "Resolvido"
];

export const InteractiveBodyMap: FC<InteractiveBodyMapProps> = ({
  athlete,
  onUpdateAthlete,
  role
}) => {
  const [activeView, setActiveView] = useState<"anterior" | "posterior">("anterior");
  const [selectedRegion, setSelectedRegion] = useState<BodyRegionDef | null>(null);
  const [filterStatus, setFilterStatus] = useState<"todas" | "ativas" | "resolvidas">("ativas");

  // Form state for creating/updating pain point
  const [formSide, setFormSide] = useState<SideOption>("Direito");
  const [formPainLevel, setFormPainLevel] = useState<number>(3);
  const [formPainType, setFormPainType] = useState<PainTypeOption>("Muscular");
  const [formEvolution, setFormEvolution] = useState<EvolutionStatusOption>("Iniciou");
  const [formStartDate, setFormStartDate] = useState<string>(getLocalDateString());
  const [formNotes, setFormNotes] = useState<string>("");

  // Get records list
  const records = useMemo(() => {
    return athlete.bodyMapRecords || [];
  }, [athlete.bodyMapRecords]);

  // Active records grouped by region for quick lookup on body silhouette
  const activeRecordsByRegion = useMemo(() => {
    const map = new Map<string, BodyMapRecord>();
    // Sort ascending by date so latest overwrites
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach((r) => {
      if (r.evolution !== "Resolvido") {
        map.set(r.regionId, r);
      }
    });
    return map;
  }, [records]);

  // Filtered timeline history
  const filteredRecords = useMemo(() => {
    let list = [...records].sort((a, b) => b.date.localeCompare(a.date));
    if (filterStatus === "ativas") {
      list = list.filter((r) => r.evolution !== "Resolvido");
    } else if (filterStatus === "resolvidas") {
      list = list.filter((r) => r.evolution === "Resolvido");
    }
    return list;
  }, [records, filterStatus]);

  // Handle opening modal for a region
  const handleSelectRegion = (region: BodyRegionDef) => {
    setSelectedRegion(region);
    const existing = activeRecordsByRegion.get(region.id);
    if (existing) {
      setFormSide(existing.side);
      setFormPainLevel(existing.painLevel);
      setFormPainType(existing.painType);
      setFormEvolution("Aumentou");
      setFormStartDate(existing.startDate || existing.date);
      setFormNotes(existing.notes || "");
    } else {
      // Auto infer side from region id
      let inferredSide: SideOption = "Direito";
      if (region.id.endsWith("_e")) inferredSide = "Esquerdo";
      else if (region.id.endsWith("_d")) inferredSide = "Direito";
      else inferredSide = "Bilateral";

      setFormSide(inferredSide);
      setFormPainLevel(3);
      setFormPainType("Muscular");
      setFormEvolution("Iniciou");
      setFormStartDate(getLocalDateString());
      setFormNotes("");
    }
  };

  // Save Record
  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegion) return;

    const todayStr = getLocalDateString();
    const newRecord: BodyMapRecord = {
      id: `bm-${Date.now()}`,
      date: todayStr,
      regionId: selectedRegion.id,
      regionName: selectedRegion.name,
      side: formSide,
      painLevel: formPainLevel,
      painType: formPainType,
      evolution: formEvolution,
      startDate: formStartDate,
      notes: formNotes,
      recordedBy: role === "coach" ? "coach" : "atleta"
    };

    const updatedRecords = [newRecord, ...records];

    // Sync with injuries list for full DM dashboard consistency
    let updatedInjuries = [...(athlete.injuries || [])];

    // Find if active injury exists for this region
    const existingInjIndex = updatedInjuries.findIndex(
      (i) => i.regionId === selectedRegion.id && i.status !== "Recuperada"
    );

    const isResolved = formEvolution === "Resolvido" || formPainLevel === 0;

    const mappedSeverity =
      formPainLevel >= 8
        ? "Grave"
        : formPainLevel >= 5
        ? "Moderada"
        : "Leve";

    const mappedStatus = isResolved
      ? "Recuperada"
      : formPainLevel >= 5
      ? "Ativa"
      : "Observação";

    const injuryDescription = `${selectedRegion.name} (${formSide}): Dor ${formPainType} [Intensidade ${formPainLevel}/10]`;

    if (existingInjIndex >= 0) {
      updatedInjuries[existingInjIndex] = {
        ...updatedInjuries[existingInjIndex],
        date: todayStr,
        description: injuryDescription,
        status: mappedStatus,
        severity: mappedSeverity,
        notes: formNotes || updatedInjuries[existingInjIndex].notes,
        side: formSide,
        painLevel: formPainLevel,
        painType: formPainType,
        evolution: formEvolution
      };
    } else if (!isResolved) {
      const newInj: InjuryEntry = {
        id: `inj-bm-${Date.now()}`,
        date: todayStr,
        description: injuryDescription,
        status: mappedStatus,
        severity: mappedSeverity,
        location: selectedRegion.defaultLocation,
        notes: formNotes,
        rehabStage: formPainLevel >= 7 ? "Fisioterapia" : "Transição Física",
        side: formSide,
        painLevel: formPainLevel,
        painType: formPainType,
        evolution: formEvolution,
        startDate: formStartDate,
        regionId: selectedRegion.id
      };
      updatedInjuries = [newInj, ...updatedInjuries];
    }

    onUpdateAthlete({
      bodyMapRecords: updatedRecords,
      injuries: updatedInjuries
    });

    setSelectedRegion(null);
  };

  // Delete Record
  const handleDeleteRecord = (id: string) => {
    const updated = records.filter((r) => r.id !== id);
    onUpdateAthlete({ bodyMapRecords: updated });
  };

  // Helper for pain level badge style
  const getPainLevelColor = (level: number) => {
    if (level === 0) return { bg: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/30", fill: "#10b981", label: "Sem Dor" };
    if (level <= 3) return { bg: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/30", fill: "#f59e0b", label: "Leve" };
    if (level <= 6) return { bg: "bg-orange-500", text: "text-orange-400", border: "border-orange-500/30", fill: "#f97316", label: "Moderada" };
    if (level <= 8) return { bg: "bg-red-500", text: "text-red-400", border: "border-red-500/30", fill: "#ef4444", label: "Forte" };
    return { bg: "bg-purple-600", text: "text-purple-400", border: "border-purple-500/40", fill: "#9333ea", label: "Intensa" };
  };

  const getEvolutionBadge = (evolution: EvolutionStatusOption) => {
    switch (evolution) {
      case "Iniciou":
        return <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold text-[9px] uppercase">● Iniciou</span>;
      case "Aumentou":
        return <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-[9px] uppercase flex items-center gap-1"><TrendingUp className="w-2.5 h-2.5" /> Piorou</span>;
      case "Melhorou":
        return <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[9px] uppercase flex items-center gap-1"><TrendingDown className="w-2.5 h-2.5" /> Melhorou</span>;
      case "Resolvido":
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-bold text-[9px] uppercase">✓ Resolvido</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* HEADER BANNER */}
      <div className="p-6 md:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-brand-primary/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-primary/10 rounded-full border border-brand-primary/20 text-[9px] font-black tracking-widest text-brand-primary uppercase">
              <Sparkles className="w-3 h-3" /> MAPA CORPORAL INTERATIVO DM & SAÚDE
            </div>
            <h2 className="text-2xl md:text-4xl font-black italic uppercase tracking-tight text-white">
              MAPEAMENTO DE <span className="text-brand-primary">DORES E LESÕES</span>
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl font-medium leading-relaxed">
              Toque na região anatômica desejada para registrar a intensidade (0-10), tipo da dor, lado afetado e acompanhamento de evolução temporal.
            </p>
          </div>

          {/* QUICK VIEW TOGGLE */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shrink-0">
            <button
              onClick={() => setActiveView("anterior")}
              className={`px-4 py-2.5 rounded-xl font-black text-[10px] tracking-wider uppercase transition-all ${
                activeView === "anterior"
                  ? "bg-brand-primary text-slate-950 shadow-lg shadow-brand-primary/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Frente (Anterior)
            </button>
            <button
              onClick={() => setActiveView("posterior")}
              className={`px-4 py-2.5 rounded-xl font-black text-[10px] tracking-wider uppercase transition-all ${
                activeView === "posterior"
                  ? "bg-brand-primary text-slate-950 shadow-lg shadow-brand-primary/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Costas (Posterior)
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID: BODY SILHOUETTE + REGION QUICK GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT/CENTER: INTERACTIVE BODY VISUALIZER */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 p-6 md:p-8 rounded-3xl relative flex flex-col items-center">
          
          <div className="w-full flex items-center justify-between mb-6">
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-2">
              <User className="w-4 h-4 text-brand-primary" />
              Vista Ativa: <span className="text-white">{activeView === "anterior" ? "Anterior (Frente)" : "Posterior (Costas)"}</span>
            </span>

            <div className="flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> 0
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> 1-3
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> 4-6
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> 7-10
              </span>
            </div>
          </div>

          {/* SILHOUETTE SVG CONTAINER */}
          <div className="relative w-full max-w-sm aspect-[1/2] max-h-[560px] bg-slate-950/80 rounded-3xl border border-slate-800/80 p-4 flex items-center justify-center shadow-inner overflow-hidden group">
            
            {/* Background grid lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-20 pointer-events-none" />

            {/* VECTOR ANATOMICAL BODY SILHOUETTE */}
            <svg
              viewBox="0 0 200 420"
              className="w-full h-full drop-shadow-2xl select-none"
            >
              {/* BODY SILHOUETTE BASE */}
              <g fill="#0f172a" stroke="#334155" strokeWidth="1.5">
                {/* Head */}
                <circle cx="100" cy="35" r="22" />
                <path d="M 92,57 L 108,57 L 112,68 L 88,68 Z" />

                {/* Torso */}
                <path d="M 60,70 Q 100,65 140,70 L 132,170 Q 100,175 68,170 Z" />

                {/* Arms Left & Right */}
                {/* Left Arm (viewer's left) */}
                <path d="M 60,70 Q 42,100 38,130 Q 35,160 32,190 Q 28,210 25,225" fill="none" strokeWidth="16" strokeLinecap="round" />
                {/* Right Arm (viewer's right) */}
                <path d="M 140,70 Q 158,100 162,130 Q 165,160 168,190 Q 172,210 175,225" fill="none" strokeWidth="16" strokeLinecap="round" />

                {/* Hips & Pelvis */}
                <path d="M 68,170 Q 100,178 132,170 L 138,210 Q 100,220 62,210 Z" />

                {/* Legs Left & Right */}
                {/* Left Leg */}
                <path d="M 65,210 Q 68,270 70,310 Q 72,350 72,390" fill="none" strokeWidth="22" strokeLinecap="round" />
                {/* Right Leg */}
                <path d="M 135,210 Q 132,270 130,310 Q 128,350 128,390" fill="none" strokeWidth="22" strokeLinecap="round" />
              </g>

              {/* CLICKABLE REGION HOTSPOTS OVERLAY */}
              {BODY_REGIONS.filter((r) => r.view === activeView).map((region) => {
                const activeRecord = activeRecordsByRegion.get(region.id);
                const hasActivePain = !!activeRecord;
                const painLevel = activeRecord ? activeRecord.painLevel : 0;
                const colorInfo = getPainLevelColor(painLevel);

                // Coordinates for regions
                let cx = 100, cy = 100, r = 12;
                switch (region.id) {
                  case "cabeca_pesc": case "nuca_cervical": cx = 100; cy = 35; r = 18; break;
                  case "ombro_d": cx = 148; cy = 72; r = 13; break;
                  case "ombro_e": cx = 52; cy = 72; r = 13; break;
                  case "peitoral": case "trapezio_costas": cx = 100; cy = 95; r = 18; break;
                  case "abdomen": case "lombar": cx = 100; cy = 140; r = 18; break;
                  case "cotovelo_e": cx = 38; cy = 130; r = 11; break;
                  case "cotovelo_d": cx = 162; cy = 130; r = 11; break;
                  case "punho_e": cx = 25; cy = 215; r = 10; break;
                  case "punho_d": cx = 175; cy = 215; r = 10; break;
                  case "quadril_e": case "gluteo_e": cx = 78; cy = 190; r = 14; break;
                  case "quadril_d": case "gluteo_d": cx = 122; cy = 190; r = 14; break;
                  case "coxa_ant_e": case "coxa_post_e": cx = 72; cy = 250; r = 15; break;
                  case "coxa_ant_d": case "coxa_post_d": cx = 128; cy = 250; r = 15; break;
                  case "joelho_e": cx = 71; cy = 300; r = 13; break;
                  case "joelho_d": cx = 129; cy = 300; r = 13; break;
                  case "canela_e": case "panturrilha_e": cx = 71; cy = 345; r = 13; break;
                  case "canela_d": case "panturrilha_d": cx = 129; cy = 345; r = 13; break;
                  case "tornozelo_e": case "calcanhar_e": cx = 72; cy = 390; r = 11; break;
                  case "tornozelo_d": case "calcanhar_d": cx = 128; cy = 390; r = 11; break;
                }

                return (
                  <g
                    key={region.id}
                    onClick={() => handleSelectRegion(region)}
                    className="cursor-pointer group/spot transition-all"
                  >
                    {/* Glowing outer aura for active pain */}
                    {hasActivePain && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r + 6}
                        fill={colorInfo.fill}
                        opacity="0.35"
                        className="animate-pulse"
                      />
                    )}

                    {/* Main region circle node */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={hasActivePain ? colorInfo.fill : "#1e293b"}
                      stroke={hasActivePain ? "#ffffff" : "#3b82f6"}
                      strokeWidth={hasActivePain ? "2" : "1"}
                      className="transition-all duration-200 group-hover/spot:scale-125 group-hover/spot:fill-brand-primary"
                    />

                    {/* Intensity label inside node */}
                    {hasActivePain && (
                      <text
                        x={cx}
                        y={cy + 3.5}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="900"
                        className="pointer-events-none font-mono"
                      >
                        {painLevel}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Instruction Badge */}
            <div className="absolute bottom-3 inset-x-3 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl text-center backdrop-blur-md">
              <p className="text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-brand-primary" />
                Clique em qualquer articulação ou músculo para registrar
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: LIST OF REGIONS BY CATEGORY & ACTIVE PAIN SUMMARY */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* ACTIVE PAIN SUMMARY CARD */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-red-500 animate-pulse" />
                Pontos de Dor Ativos ({activeRecordsByRegion.size})
              </h3>
              <button
                onClick={() => setFilterStatus(filterStatus === "ativas" ? "todas" : "ativas")}
                className="text-[10px] font-bold text-slate-400 hover:text-white uppercase transition-colors"
              >
                Ver Histórico Completo →
              </button>
            </div>

            {activeRecordsByRegion.size === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-white">Nenhum ponto de dor ativo no momento</p>
                <p className="text-[10px] text-slate-400">Atleta apto para treinamento e alta intensidade.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {Array.from(activeRecordsByRegion.values()).map((rec) => {
                  const color = getPainLevelColor(rec.painLevel);
                  return (
                    <div
                      key={rec.id}
                      onClick={() => {
                        const reg = BODY_REGIONS.find((r) => r.id === rec.regionId);
                        if (reg) handleSelectRegion(reg);
                      }}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 cursor-pointer transition-all hover:translate-x-1"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl ${color.bg} flex items-center justify-center font-mono font-black text-xs text-white shrink-0`}>
                          {rec.painLevel}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">{rec.regionName}</span>
                            <span className="text-[10px] font-bold text-slate-400">({rec.side})</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-brand-primary">{rec.painType}</span>
                            <span className="text-[9px] text-slate-500">• {formatDate(rec.date)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getEvolutionBadge(rec.evolution)}
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* QUICK SELECTION LIST BY ANATOMICAL REGIONS */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-primary" />
              Seletor Rápido por Região
            </h3>

            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {BODY_REGIONS.filter((r) => r.view === activeView).map((reg) => {
                const hasActive = activeRecordsByRegion.has(reg.id);
                const rec = activeRecordsByRegion.get(reg.id);
                const color = rec ? getPainLevelColor(rec.painLevel) : null;

                return (
                  <button
                    key={reg.id}
                    onClick={() => handleSelectRegion(reg)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      hasActive
                        ? `${color?.border} bg-slate-950 text-white font-black`
                        : "border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    <span className="text-[11px] truncate">{reg.name}</span>
                    {rec ? (
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black ${color?.bg} text-white`}>
                        {rec.painLevel}/10
                      </span>
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* REGION SELECTION MODAL / DRAWER */}
      <AnimatePresence>
        {selectedRegion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 relative"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="text-[9px] font-black text-brand-primary uppercase tracking-widest">
                    REGISTRO DE APONTAMENTO CLÍNICO
                  </div>
                  <h3 className="text-xl font-black text-white italic uppercase tracking-tight">
                    {selectedRegion.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedRegion(null)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRecord} className="space-y-6">
                
                {/* 1. LADO AFETADO */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    1. Lado Afetado
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {SIDE_OPTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormSide(s)}
                        className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider border transition-all ${
                          formSide === s
                            ? "bg-brand-primary text-slate-950 border-brand-primary shadow-lg shadow-brand-primary/20"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. INTENSIDADE DA DOR (0-10) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      2. Intensidade da Dor (Escala EVA 0-10)
                    </label>
                    <span className={`text-sm font-mono font-black px-3 py-1 rounded-lg ${getPainLevelColor(formPainLevel).bg} text-white`}>
                      {formPainLevel} - {getPainLevelColor(formPainLevel).label}
                    </span>
                  </div>

                  {/* 0-10 Buttons Grid */}
                  <div className="grid grid-cols-11 gap-1.5">
                    {Array.from({ length: 11 }, (_, i) => i).map((num) => {
                      const color = getPainLevelColor(num);
                      const isSelected = formPainLevel === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setFormPainLevel(num)}
                          className={`py-2.5 rounded-xl font-mono font-black text-xs transition-all ${
                            isSelected
                              ? `${color.bg} text-white ring-2 ring-white shadow-lg`
                              : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>

                  {/* Slider */}
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={formPainLevel}
                    onChange={(e) => setFormPainLevel(Number(e.target.value))}
                    className="w-full accent-brand-primary cursor-pointer"
                  />
                </div>

                {/* 3. TIPO DA DOR */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    3. Tipo da Dor
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PAIN_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormPainType(t)}
                        className={`p-2.5 rounded-xl font-bold text-[11px] text-left border transition-all ${
                          formPainType === t
                            ? "bg-slate-800 text-white border-brand-primary text-brand-primary"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. EVOLUÇÃO E STATUS TEMPORAL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      4. Evolução Atual
                    </label>
                    <select
                      value={formEvolution}
                      onChange={(e) => setFormEvolution(e.target.value as EvolutionStatusOption)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3 text-xs text-white font-black outline-none"
                    >
                      {EVOLUTION_OPTIONS.map((e) => (
                        <option key={e} value={e} className="bg-slate-900">
                          {e === "Iniciou" && "● Iniciou (Novo Sintoma)"}
                          {e === "Aumentou" && "▲ Aumentou / Piorou"}
                          {e === "Melhorou" && "▼ Melhorou / Em Regressão"}
                          {e === "Resolvido" && "✓ Resolvido (Sem Dor / Alta)"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Quando Iniciou?
                    </label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3 text-xs text-white font-black outline-none"
                    />
                  </div>
                </div>

                {/* 5. OBSERVAÇÕES E GATILHO */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    5. Observações / Gatilho Clínico
                  </label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Ex: Puxão ao acelerar no treino, alívio com gelo, incômodo na rotação externa..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-brand-primary rounded-xl p-3 text-xs text-white font-medium outline-none h-20 resize-none animate-none"
                  />
                </div>

                {/* ACTIONS */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRegion(null)}
                    className="w-1/3 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase rounded-xl tracking-wider transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-3.5 bg-brand-primary hover:bg-lime-400 text-slate-950 font-black text-xs uppercase rounded-xl tracking-wider shadow-lg shadow-brand-primary/20 transition-all active:scale-95"
                  >
                    Salvar no Histórico do DM
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AUTOMATIC TIMELINE & HISTORY LOG SECTION */}
      <div className="p-6 md:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-black uppercase text-white italic tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-primary" />
              HISTÓRICO AUTOMÁTICO DE EVOLUÇÃO
            </h3>
            <p className="text-xs text-slate-400">
              Registros cronológicos de cada apontamento e alteração de sintomas no Mapa Corporal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(["ativas", "todas", "resolvidas"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider border transition-all ${
                  filterStatus === st
                    ? "bg-slate-800 border-brand-primary text-brand-primary"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {st === "ativas" && "Em Aberto"}
                {st === "todas" && "Todos"}
                {st === "resolvidas" && "Resolvidos"}
              </button>
            ))}
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-medium text-xs">
            Nenhum registro encontrado no histórico para o filtro selecionado.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((rec) => {
              const color = getPainLevelColor(rec.painLevel);
              return (
                <div
                  key={rec.id}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl ${color.bg} flex items-center justify-center font-mono font-black text-sm text-white shrink-0`}>
                      {rec.painLevel}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-white">{rec.regionName}</span>
                        <span className="text-xs font-bold text-slate-400">({rec.side})</span>
                        <span className="text-xs font-black text-brand-primary">• {rec.painType}</span>
                        {getEvolutionBadge(rec.evolution)}
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-3 flex-wrap">
                        <span>Data do Registro: <strong className="text-slate-200">{formatDate(rec.date)}</strong></span>
                        {rec.startDate && (
                          <span>Início: <strong className="text-slate-200">{formatDate(rec.startDate)}</strong></span>
                        )}
                        {rec.recordedBy && (
                          <span className="text-[10px] uppercase font-bold text-slate-500">
                            Por: {rec.recordedBy === "coach" ? "Fisioterapeuta / DM" : "Atleta"}
                          </span>
                        )}
                      </div>

                      {rec.notes && (
                        <p className="text-xs text-slate-300 italic bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 mt-1">
                          "{rec.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleDeleteRecord(rec.id)}
                      className="p-2 rounded-xl bg-slate-900 text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 transition-colors"
                      title="Excluir Registro"
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
    </div>
  );
};
