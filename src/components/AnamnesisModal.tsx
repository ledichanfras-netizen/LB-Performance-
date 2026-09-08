import React, { useState, FC, useEffect } from "react";
import {
  X,
  Printer,
  FileText,
  History,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  Activity,
  Calendar,
  Save,
  Trash2,
  ChevronRight,
  ShieldCheck,
  User,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { Athlete, AnamnesisRecord } from "../types";

interface AnamnesisModalProps {
  athlete: Athlete;
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: AnamnesisRecord) => void;
  onDeleteRecord?: (recordId: string) => void;
  role?: "coach" | "athlete";
}

const DEFAULT_TECHNICAL_RESPONSIBLE = {
  name: "Prof. Leandro Barbosa",
  cred: "036202-G/PR",
};

export const AnamnesisModal: FC<AnamnesisModalProps> = ({
  athlete,
  isOpen,
  onClose,
  onSave,
  onDeleteRecord,
  role = "coach",
}) => {
  const [activeTab, setActiveTab] = useState<"form" | "history" | "preview_filled" | "preview_blank">("form");
  const [selectedRecordForView, setSelectedRecordForView] = useState<AnamnesisRecord | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Helper to calculate age
  const calculateAge = (dobString?: string): number => {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return 0;
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  // Form state
  const [formData, setFormData] = useState<Partial<AnamnesisRecord>>({
    date: new Date().toISOString().split("T")[0],
    athleteName: athlete.name || "",
    dob: athlete.dob || "",
    athleteAge: calculateAge(athlete.dob),
    athleteGender: athlete.gender || "M",
    phone: "",
    modality: athlete.modality || "",
    categoryOrPosition: `${athlete.category || ""} ${athlete.position ? `• ${athlete.position}` : ""}`.trim(),
    teamOrClub: athlete.team || "",
    competitiveLevel: (athlete.competitiveLevel as any) || "competitivo",
    emergencyContact: "",
    emergencyPhone: "",

    // 1. Triagem de Segurança Cardiovascular
    cardio: {
      chestPainExercise: false,
      chestPainRest: false,
      dizzinessOrFainting: false,
      hypertensionOrArrhythmia: false,
      asthmaOrDyspnea: false,
      familySuddenDeath: false,
      continuousMedication: false,
      medicationDetails: "",
    },

    // 2. Histórico Ortopédico, Lesões e Dor Atual
    orthopedic: {
      hasInjuryPast12Months: false,
      injuryDetails: {
        ankleFoot: { has: false, side: "Dir", type: "" },
        knee: { has: false, side: "Dir", type: "" },
        thighHamstring: { has: false, side: "Dir", type: "" },
        hipPubis: { has: false, side: "Dir", type: "" },
        spine: { has: false, region: "Lombar" },
        shoulderUpperLimb: { has: false, side: "Dir", type: "" },
        otherNotes: "",
      },
      hasSurgery: false,
      surgeryDetails: "",
      hasCurrentPain: false,
      painLocation: "",
      painLevel: 0,
    },

    // 3. Rotina de Treino, Sono e Recuperação
    routine: {
      weeklyTrainingDays: "3-4x",
      sleepHours: "6-8h",
      sleepQuality: "bom",
      intenseTrainingPast24h: false,
      usesSupplements: false,
      supplementsDetails: "",
      waterIntake: "1.5-2.5L",
    },

    // 4. Objetivo Principal
    mainGoal: "performance",
    mainGoalOther: "",

    // 5. Declaração
    declaredTruthful: true,
    signatureName: athlete.name || "",
    signatureDate: new Date().toISOString().split("T")[0],

    technicalResponsible: DEFAULT_TECHNICAL_RESPONSIBLE,
  });

  // Keep form data synchronized if athlete changes
  useEffect(() => {
    if (athlete) {
      setFormData((prev) => ({
        ...prev,
        athleteName: athlete.name || "",
        dob: athlete.dob || "",
        athleteAge: calculateAge(athlete.dob),
        athleteGender: athlete.gender || "M",
        modality: athlete.modality || "",
        categoryOrPosition: `${athlete.category || ""} ${athlete.position ? `• ${athlete.position}` : ""}`.trim(),
        teamOrClub: athlete.team || "",
        signatureName: athlete.name || "",
      }));
    }
  }, [athlete]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSave = () => {
    const newRecord: AnamnesisRecord = {
      id: `anamnesis_${Date.now()}`,
      athleteId: athlete.id,
      date: formData.date || new Date().toISOString().split("T")[0],
      athleteName: formData.athleteName || athlete.name,
      dob: formData.dob || athlete.dob,
      athleteAge: formData.athleteAge || calculateAge(athlete.dob),
      athleteGender: formData.athleteGender || athlete.gender,
      phone: formData.phone || "",
      modality: formData.modality || athlete.modality,
      categoryOrPosition: formData.categoryOrPosition || "",
      teamOrClub: formData.teamOrClub || athlete.team || "",
      competitiveLevel: formData.competitiveLevel || "competitivo",
      emergencyContact: formData.emergencyContact || "",
      emergencyPhone: formData.emergencyPhone || "",

      cardio: formData.cardio || {
        chestPainExercise: false,
        chestPainRest: false,
        dizzinessOrFainting: false,
        hypertensionOrArrhythmia: false,
        asthmaOrDyspnea: false,
        familySuddenDeath: false,
        continuousMedication: false,
        medicationDetails: "",
      },

      orthopedic: formData.orthopedic || {
        hasInjuryPast12Months: false,
        injuryDetails: {},
        hasSurgery: false,
        surgeryDetails: "",
        hasCurrentPain: false,
        painLocation: "",
        painLevel: 0,
      },

      routine: formData.routine || {
        weeklyTrainingDays: "3-4x",
        sleepHours: "6-8h",
        sleepQuality: "bom",
        intenseTrainingPast24h: false,
        usesSupplements: false,
        waterIntake: "1.5-2.5L",
      },

      mainGoal: formData.mainGoal || "performance",
      mainGoalOther: formData.mainGoalOther || "",

      declaredTruthful: !!formData.declaredTruthful,
      signatureName: formData.signatureName || athlete.name,
      signatureDate: formData.signatureDate || new Date().toISOString().split("T")[0],

      technicalResponsible: DEFAULT_TECHNICAL_RESPONSIBLE,
    };

    onSave(newRecord);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setActiveTab("history");
    }, 1200);
  };

  const existingRecords: AnamnesisRecord[] = athlete.anamnesis || [];

  // Count positive cardio risk factors
  const cardioAlertsCount = Object.entries(formData.cardio || {}).filter(
    ([k, v]) => k !== "medicationDetails" && v === true
  ).length;

  return (
    <div className="report-modal fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      {/* Printable Sheet View (Hidden on screen unless preview active, visible in @media print) */}
      <div className={`print-container ${activeTab === "preview_blank" || activeTab === "preview_filled" ? "block" : "hidden print:block"} w-full max-w-4xl`}>
        <PrintableAnamnesisSheet
          data={activeTab === "preview_blank" ? null : (selectedRecordForView || (formData as AnamnesisRecord))}
          athlete={athlete}
          onBack={() => setActiveTab("form")}
          onPrint={handlePrint}
        />
      </div>

      {/* Screen Interactive Container (Hidden during @media print) */}
      <div className={`no-print ${activeTab === "preview_blank" || activeTab === "preview_filled" ? "hidden" : "flex"} flex-col bg-[#0b101b] border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#39FF14]/15 border border-[#39FF14]/30 flex items-center justify-center text-[#39FF14]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight uppercase">
                  Anamnese Pré-Avaliação
                </h2>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  PAR-Q+ & FIFA Medical
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Atleta: <strong className="text-white">{athlete.name}</strong> • {athlete.modality || "Geral"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Print Shortcuts */}
            <button
              type="button"
              onClick={() => {
                setSelectedRecordForView(null);
                setActiveTab("preview_blank");
              }}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Gerar modelo em branco pronto para imprimir e preencher à caneta"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Folha em Branco</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedRecordForView(null);
                setActiveTab("preview_filled");
              }}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-[#39FF14]/50 rounded-xl text-xs font-bold text-slate-200 hover:text-[#39FF14] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Visualizar e imprimir com os dados preenchidos deste atleta"
            >
              <Printer className="w-3.5 h-3.5 text-[#39FF14]" />
              <span>Imprimir Ficha</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 flex items-center justify-between border-b border-slate-800/60 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("form")}
              className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                activeTab === "form"
                  ? "border-[#39FF14] text-[#39FF14]"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Responder / Preencher
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                activeTab === "history"
                  ? "border-[#39FF14] text-[#39FF14]"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Histórico ({existingRecords.length})
            </button>
          </div>

          {/* Quick Alert Counter */}
          {cardioAlertsCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-black uppercase">
              <AlertTriangle className="w-3 h-3" />
              {cardioAlertsCount} Alerta{cardioAlertsCount > 1 ? "s" : ""} PAR-Q
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === "history" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">
                  Anamneses Realizadas para {athlete.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("form")}
                  className="text-xs font-bold text-[#39FF14] hover:underline cursor-pointer flex items-center gap-1"
                >
                  + Nova Resposta
                </button>
              </div>

              {existingRecords.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl p-6 bg-slate-950/40">
                  <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-400">Nenhuma anamnese registrada ainda.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Preencha digitalmente ou imprima a ficha para o atleta responder à caneta.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("form")}
                    className="mt-4 px-4 py-2 bg-[#39FF14] hover:bg-[#32e012] text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    Preencher Agora
                  </button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {existingRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">
                            {new Date(rec.date).toLocaleDateString("pt-BR")}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#39FF14]/15 text-[#39FF14] border border-[#39FF14]/30 uppercase">
                            Objetivo: {getGoalLabel(rec.mainGoal)}
                          </span>
                          {rec.orthopedic?.hasCurrentPain && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase">
                              Dor Hoje: Nível {rec.orthopedic.painLevel}/10
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          Assinado por: <strong className="text-slate-300">{rec.signatureName || rec.athleteName}</strong> • Sono: {rec.routine?.sleepHours} ({rec.routine?.sleepQuality})
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRecordForView(rec);
                            setActiveTab("preview_filled");
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          Visualizar / Imprimir
                        </button>

                        {role === "coach" && onDeleteRecord && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Deseja realmente excluir este registro de anamnese?")) {
                                onDeleteRecord(rec.id);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-400 transition-all cursor-pointer rounded-lg hover:bg-red-500/10"
                            title="Excluir anamnese"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className="space-y-6"
            >
              {/* Card 0: Identificação Rápida */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#39FF14]" />
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                    Dados do Aluno / Atleta
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Nome Completo</label>
                    <input
                      type="text"
                      value={formData.athleteName || ""}
                      onChange={(e) => setFormData({ ...formData, athleteName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-[#39FF14] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Data de Nascimento</label>
                    <input
                      type="date"
                      value={formData.dob || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dob: e.target.value,
                          athleteAge: calculateAge(e.target.value),
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-[#39FF14] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Idade / Sexo</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Idade"
                        value={formData.athleteAge || ""}
                        onChange={(e) => setFormData({ ...formData, athleteAge: parseInt(e.target.value) || 0 })}
                        className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-[#39FF14] outline-none"
                      />
                      <select
                        value={formData.athleteGender || "M"}
                        onChange={(e) => setFormData({ ...formData, athleteGender: e.target.value as "M" | "F" })}
                        className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-sm text-white focus:border-[#39FF14] outline-none"
                      >
                        <option value="M">Masc</option>
                        <option value="F">Fem</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-[#39FF14] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Modalidade / Esporte</label>
                    <input
                      type="text"
                      value={formData.modality || ""}
                      onChange={(e) => setFormData({ ...formData, modality: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-[#39FF14] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Posição / Categoria</label>
                    <input
                      type="text"
                      value={formData.categoryOrPosition || ""}
                      onChange={(e) => setFormData({ ...formData, categoryOrPosition: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-[#39FF14] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Nível Praticante</label>
                    <select
                      value={formData.competitiveLevel || "competitivo"}
                      onChange={(e) => setFormData({ ...formData, competitiveLevel: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-[#39FF14] outline-none"
                    >
                      <option value="recreativo">Recreativo</option>
                      <option value="competitivo">Competitivo</option>
                      <option value="alto_rendimento">Alto Rendimento</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bloco 1: Triagem Cardiovascular (PAR-Q+ & ACSM) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-red-400" />
                    <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                      1. Triagem de Segurança Cardiovascular (PAR-Q+ & ACSM)
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Toque Sim ou Não</span>
                </div>

                <div className="space-y-2.5">
                  <CardioQuestionRow
                    num="1.1"
                    text="Sente dor, pressão ou aperto no peito durante a prática de exercícios?"
                    value={formData.cardio?.chestPainExercise || false}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        cardio: { ...formData.cardio!, chestPainExercise: val },
                      })
                    }
                  />

                  <CardioQuestionRow
                    num="1.2"
                    text="Sente dor ou desconforto no peito quando está em repouso?"
                    value={formData.cardio?.chestPainRest || false}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        cardio: { ...formData.cardio!, chestPainRest: val },
                      })
                    }
                  />

                  <CardioQuestionRow
                    num="1.3"
                    text="Teve tonturas, sensação de desmaio ou perda de equilíbrio nos últimos 12 meses?"
                    value={formData.cardio?.dizzinessOrFainting || false}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        cardio: { ...formData.cardio!, dizzinessOrFainting: val },
                      })
                    }
                  />

                  <CardioQuestionRow
                    num="1.4"
                    text="Possui diagnóstico médico de pressão alta, arritmia cardíaca ou sopro?"
                    value={formData.cardio?.hypertensionOrArrhythmia || false}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        cardio: { ...formData.cardio!, hypertensionOrArrhythmia: val },
                      })
                    }
                  />

                  <CardioQuestionRow
                    num="1.5"
                    text="Possui histórico de asma, bronquite ou falta de ar intensa sem causa óbvia?"
                    value={formData.cardio?.asthmaOrDyspnea || false}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        cardio: { ...formData.cardio!, asthmaOrDyspnea: val },
                      })
                    }
                  />

                  <CardioQuestionRow
                    num="1.6"
                    text="Algum familiar direto (pais, irmãos) faleceu subitamente de coração antes dos 50 anos?"
                    value={formData.cardio?.familySuddenDeath || false}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        cardio: { ...formData.cardio!, familySuddenDeath: val },
                      })
                    }
                  />

                  <CardioQuestionRow
                    num="1.7"
                    text="Faz uso diário de algum medicamento de uso contínuo?"
                    value={formData.cardio?.continuousMedication || false}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        cardio: { ...formData.cardio!, continuousMedication: val },
                      })
                    }
                  />

                  {formData.cardio?.continuousMedication && (
                    <div className="pl-8 pt-1">
                      <input
                        type="text"
                        placeholder="Quais medicamentos você utiliza?"
                        value={formData.cardio?.medicationDetails || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cardio: { ...formData.cardio!, medicationDetails: e.target.value },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#39FF14] outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Bloco 2: Histórico Ortopédico, Lesões e Dor Atual */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                      2. Histórico Ortopédico, Lesões Recentes e Dor Atual (FIFA Medical)
                    </h3>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* 2.1 Lesão nos últimos 12 meses */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-xs font-bold text-slate-300">
                      2.1. Sofreu alguma lesão osteomuscular nos últimos 12 meses?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            orthopedic: { ...formData.orthopedic!, hasInjuryPast12Months: false },
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase cursor-pointer transition-all ${
                          !formData.orthopedic?.hasInjuryPast12Months
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                            : "bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800"
                        }`}
                      >
                        Não
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            orthopedic: { ...formData.orthopedic!, hasInjuryPast12Months: true },
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase cursor-pointer transition-all ${
                          formData.orthopedic?.hasInjuryPast12Months
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                            : "bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800"
                        }`}
                      >
                        Sim
                      </button>
                    </div>
                  </div>

                  {/* Detalhes de Lesões */}
                  {formData.orthopedic?.hasInjuryPast12Months && (
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                      <p className="text-[10px] font-black uppercase text-slate-400">
                        Marque as regiões afetadas:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { key: "ankleFoot", label: "Tornozelo / Pé" },
                          { key: "knee", label: "Joelho" },
                          { key: "thighHamstring", label: "Coxa / Isquiotibial" },
                          { key: "hipPubis", label: "Quadril / Púbis" },
                          { key: "spine", label: "Coluna / Lombar" },
                          { key: "shoulderUpperLimb", label: "Ombro / MMSS" },
                        ].map((item) => {
                          const isChecked = !!(formData.orthopedic?.injuryDetails as any)?.[item.key]?.has;
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => {
                                const current = formData.orthopedic?.injuryDetails || {};
                                const prevItem = (current as any)[item.key] || {};
                                setFormData({
                                  ...formData,
                                  orthopedic: {
                                    ...formData.orthopedic!,
                                    injuryDetails: {
                                      ...current,
                                      [item.key]: { ...prevItem, has: !isChecked },
                                    },
                                  },
                                });
                              }}
                              className={`p-2 rounded-lg text-xs font-bold text-left border transition-all cursor-pointer flex items-center justify-between ${
                                isChecked
                                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              <span>{item.label}</span>
                              {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2.2 Cirurgia */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 gap-2">
                    <span className="text-xs font-bold text-slate-300">
                      2.2. Já realizou alguma cirurgia ortopédica?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            orthopedic: { ...formData.orthopedic!, hasSurgery: false, surgeryDetails: "" },
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase cursor-pointer transition-all ${
                          !formData.orthopedic?.hasSurgery
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                            : "bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800"
                        }`}
                      >
                        Não
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            orthopedic: { ...formData.orthopedic!, hasSurgery: true },
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase cursor-pointer transition-all ${
                          formData.orthopedic?.hasSurgery
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                            : "bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800"
                        }`}
                      >
                        Sim
                      </button>
                    </div>
                  </div>

                  {formData.orthopedic?.hasSurgery && (
                    <div className="pl-4">
                      <input
                        type="text"
                        placeholder="Qual cirurgia e em que ano?"
                        value={formData.orthopedic?.surgeryDetails || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            orthopedic: { ...formData.orthopedic!, surgeryDetails: e.target.value },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#39FF14] outline-none"
                      />
                    </div>
                  )}

                  {/* 2.3 Dor Hoje & Escala EVA */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">
                        2.3. Você sente alguma DOR OU INCÔMODO NO CORPO HOJE?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              orthopedic: {
                                ...formData.orthopedic!,
                                hasCurrentPain: false,
                                painLevel: 0,
                                painLocation: "",
                              },
                            })
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase cursor-pointer transition-all ${
                            !formData.orthopedic?.hasCurrentPain
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              : "bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800"
                          }`}
                        >
                          Não (Dor 0)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              orthopedic: { ...formData.orthopedic!, hasCurrentPain: true },
                            })
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase cursor-pointer transition-all ${
                            formData.orthopedic?.hasCurrentPain
                              ? "bg-red-500/20 text-red-400 border border-red-500/40"
                              : "bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800"
                          }`}
                        >
                          Sim
                        </button>
                      </div>
                    </div>

                    {formData.orthopedic?.hasCurrentPain && (
                      <div className="space-y-3 pt-2 border-t border-slate-900">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Local exato da dor:</label>
                          <input
                            type="text"
                            placeholder="Ex: Joelho direito, lombar, posterior de coxa..."
                            value={formData.orthopedic?.painLocation || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                orthopedic: { ...formData.orthopedic!, painLocation: e.target.value },
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#39FF14] outline-none"
                          />
                        </div>

                        {/* Escala Visual Analógica 0 a 10 */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-slate-400">
                              Intensidade da Dor (Escala EVA 0 a 10):
                            </span>
                            <span className="text-xs font-black text-amber-400">
                              Nível {formData.orthopedic?.painLevel || 0}/10
                            </span>
                          </div>
                          <div className="grid grid-cols-11 gap-1">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => {
                              const isSelected = (formData.orthopedic?.painLevel || 0) === v;
                              return (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() =>
                                    setFormData({
                                      ...formData,
                                      orthopedic: { ...formData.orthopedic!, painLevel: v },
                                    })
                                  }
                                  className={`py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                    isSelected
                                      ? v === 0
                                        ? "bg-emerald-500 text-slate-950"
                                        : v <= 3
                                        ? "bg-amber-400 text-slate-950"
                                        : "bg-red-500 text-white shadow-lg"
                                      : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                                  }`}
                                >
                                  {v}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex justify-between text-[8px] font-black uppercase text-slate-500 px-1 pt-1">
                            <span>0 Sem dor</span>
                            <span>1-3 Leve</span>
                            <span>4-6 Moderada</span>
                            <span>7-10 Severa</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bloco 3: Rotina de Treino, Sono e Recuperação */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                    3. Rotina de Treino, Sono e Recuperação
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* 3.1 Dias por semana */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Dias de treino por semana</label>
                    <select
                      value={formData.routine?.weeklyTrainingDays || "3-4x"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          routine: { ...formData.routine!, weeklyTrainingDays: e.target.value },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#39FF14] outline-none"
                    >
                      <option value="1-2x">1 a 2x por semana</option>
                      <option value="3-4x">3 a 4x por semana</option>
                      <option value="5-6x">5 a 6x por semana</option>
                      <option value="todos">Todos os dias</option>
                    </select>
                  </div>

                  {/* 3.2 Horas de sono */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Média de sono por noite</label>
                    <select
                      value={formData.routine?.sleepHours || "6-8h"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          routine: { ...formData.routine!, sleepHours: e.target.value },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#39FF14] outline-none"
                    >
                      <option value="<6h">Menos de 6 horas</option>
                      <option value="6-8h">6 a 8 horas</option>
                      <option value=">8h">Mais de 8 horas</option>
                    </select>
                  </div>

                  {/* 3.3 Qualidade do sono */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Qualidade habitual do sono</label>
                    <select
                      value={formData.routine?.sleepQuality || "bom"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          routine: { ...formData.routine!, sleepQuality: e.target.value },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#39FF14] outline-none"
                    >
                      <option value="ruim">Ruim / Interrompido</option>
                      <option value="regular">Regular</option>
                      <option value="bom">Bom / Reparador</option>
                    </select>
                  </div>

                  {/* 3.4 Treinou nas últimas 24h */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Treino intenso últimas 24h?</label>
                    <select
                      value={formData.routine?.intenseTrainingPast24h ? "sim" : "nao"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          routine: { ...formData.routine!, intenseTrainingPast24h: e.target.value === "sim" },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#39FF14] outline-none"
                    >
                      <option value="nao">Não (Descansado)</option>
                      <option value="sim">Sim (Treino pesado ou jogo)</option>
                    </select>
                  </div>

                  {/* 3.5 Suplementos */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Faz uso de suplementos?</label>
                    <select
                      value={formData.routine?.usesSupplements ? "sim" : "nao"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          routine: { ...formData.routine!, usesSupplements: e.target.value === "sim" },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#39FF14] outline-none"
                    >
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </div>

                  {/* 3.6 Consumo de água */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Consumo diário de água</label>
                    <select
                      value={formData.routine?.waterIntake || "1.5-2.5L"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          routine: { ...formData.routine!, waterIntake: e.target.value },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#39FF14] outline-none"
                    >
                      <option value="<1.5L">Menos de 1,5 Litros</option>
                      <option value="1.5-2.5L">1,5L a 2,5 Litros</option>
                      <option value=">2.5L">Mais de 2,5 Litros</option>
                    </select>
                  </div>
                </div>

                {formData.routine?.usesSupplements && (
                  <div className="pt-2">
                    <input
                      type="text"
                      placeholder="Quais suplementos você utiliza? (ex: Creatina, Whey, Cafeína...)"
                      value={formData.routine?.supplementsDetails || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          routine: { ...formData.routine!, supplementsDetails: e.target.value },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#39FF14] outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Bloco 4: Objetivo Principal do Aluno / Atleta */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#39FF14]" />
                    <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                      4. Objetivo Principal do Aluno / Atleta
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Selecione a principal</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {[
                    { id: "performance", label: "⚡ Melhorar Performance e Rendimento Esportivo" },
                    { id: "prevencao", label: "🛡️ Prevenção de Lesões e Longevidade Física" },
                    { id: "saude", label: "🌿 Saúde, Bem-Estar e Qualidade de Vida" },
                    { id: "retorno", label: "🔄 Retorno Seguro ao Esporte (Pós-Lesão)" },
                    { id: "estetica", label: "⚖️ Estética e Composição Corporal" },
                  ].map((goal) => {
                    const isSelected = formData.mainGoal === goal.id;
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, mainGoal: goal.id })}
                        className={`p-3 rounded-xl text-left text-xs font-bold border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-[#39FF14]/15 border-[#39FF14] text-[#39FF14] shadow-md shadow-[#39FF14]/10"
                            : "bg-slate-950/60 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                        }`}
                      >
                        <span>{goal.label}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0 text-[#39FF14]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bloco 5: Declaração de Veracidade e Assinatura */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                    5. Declaração de Veracidade e Ciência
                  </h3>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.declaredTruthful || false}
                      onChange={(e) => setFormData({ ...formData, declaredTruthful: e.target.checked })}
                      className="mt-1 w-4 h-4 rounded text-[#39FF14] focus:ring-[#39FF14] bg-slate-900 border-slate-700 cursor-pointer"
                    />
                    <span className="text-xs text-slate-300 leading-relaxed">
                      Declaro que todas as informações prestadas nesta anamnese são verdadeiras e completas, não tendo
                      omitido nenhum sintoma, dor ou diagnóstico prévio. Estou ciente de que as avaliações físicas
                      exigem esforço motor voluntário.
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">
                      Assinatura / Nome do Atleta (ou Responsável se menor)
                    </label>
                    <input
                      type="text"
                      value={formData.signatureName || ""}
                      onChange={(e) => setFormData({ ...formData, signatureName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-[#39FF14] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Data da Assinatura</label>
                    <input
                      type="date"
                      value={formData.signatureDate || ""}
                      onChange={(e) => setFormData({ ...formData, signatureDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-[#39FF14] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Rodapé Oficial da Avaliação */}
              <div className="pt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-4 bg-slate-950/40 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center p-1 border border-slate-800 shrink-0 shadow">
                    <img src="/pwa-192x192.svg" className="w-full h-full object-contain" alt="LB" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.25em] leading-none mb-1">
                      Responsável Técnico / Avaliador
                    </p>
                    <p className="text-xs font-black text-white uppercase italic leading-none">
                      {DEFAULT_TECHNICAL_RESPONSIBLE.name} ({DEFAULT_TECHNICAL_RESPONSIBLE.cred})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                      saveSuccess
                        ? "bg-emerald-500 text-white shadow-emerald-500/20"
                        : "bg-[#39FF14] hover:bg-[#32e012] text-slate-950 shadow-[#39FF14]/20"
                    }`}
                  >
                    {saveSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Salvo com Sucesso!
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Salvar Anamnese
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// Row helper for cardio questions
const CardioQuestionRow: FC<{
  num: string;
  text: string;
  value: boolean;
  onChange: (val: boolean) => void;
}> = ({ num, text, value, onChange }) => (
  <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 gap-3">
    <div className="flex items-start gap-2">
      <span className="text-[11px] font-black text-[#39FF14] shrink-0 mt-0.5">{num}</span>
      <span className="text-xs font-bold text-slate-300 leading-snug">{text}</span>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-3 py-1 rounded-lg text-xs font-black uppercase cursor-pointer transition-all ${
          !value
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
            : "bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800"
        }`}
      >
        Não
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-3 py-1 rounded-lg text-xs font-black uppercase cursor-pointer transition-all ${
          value
            ? "bg-red-500/20 text-red-400 border border-red-500/40 font-black"
            : "bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800"
        }`}
      >
        Sim
      </button>
    </div>
  </div>
);

// Helper for human-readable goal
function getGoalLabel(goal?: string): string {
  switch (goal) {
    case "performance":
      return "Performance & Rendimento";
    case "prevencao":
      return "Prevenção de Lesões";
    case "saude":
      return "Saúde & Qualidade de Vida";
    case "retorno":
      return "Retorno ao Esporte";
    case "estetica":
      return "Composição Corporal";
    default:
      return goal || "Geral";
  }
}

// -------------------------------------------------------------------------
// PRINTABLE A4 SHEET COMPONENT
// Strict A4 formatting with clean typography, crisp boxes, and official footer
// -------------------------------------------------------------------------
interface PrintableAnamnesisSheetProps {
  data: AnamnesisRecord | null; // null means blank template
  athlete: Athlete;
  onBack: () => void;
  onPrint: () => void;
}

export const PrintableAnamnesisSheet: FC<PrintableAnamnesisSheetProps> = ({
  data,
  athlete,
  onBack,
  onPrint,
}) => {
  const isBlank = !data;

  return (
    <div className="flex flex-col items-center">
      {/* Print Controls (Screen Only) */}
      <div className="no-print w-full max-w-[210mm] mb-4 p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-xl">
        <button
          type="button"
          onClick={onBack}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
        >
          ← Voltar para Edição
        </button>

        <div className="text-center">
          <span className="text-xs font-black uppercase tracking-wider text-white">
            {isBlank ? "Visualização: Modelo em Branco (A4)" : "Visualização: Ficha Preenchida (A4)"}
          </span>
          <p className="text-[10px] text-slate-400">Pressione Imprimir para gerar o PDF ou enviar à impressora</p>
        </div>

        <button
          type="button"
          onClick={onPrint}
          className="px-4 py-1.5 bg-[#39FF14] hover:bg-[#32e012] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#39FF14]/20"
        >
          <Printer className="w-4 h-4" />
          Imprimir Agora
        </button>
      </div>

      {/* The Actual A4 Printable Page */}
      <div className="report-page bg-white text-slate-900 shadow-2xl w-[210mm] min-h-[297mm] p-6 sm:p-8 flex flex-col justify-between border border-slate-200 print:border-none print:shadow-none print:p-6 print:m-0 font-sans text-left box-border">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center p-1.5 border border-slate-800">
                <img src="/pwa-192x192.svg" className="w-full h-full object-contain" alt="LB Sports" />
              </div>
              <div>
                <h1 className="text-sm font-black uppercase tracking-wider text-slate-950 leading-tight">
                  LB SPORTS • CENTRO DE PERFORMANCE E AVALIAÇÃO FÍSICA
                </h1>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600">
                  FICHA DE ANAMNESE E TRIAGEM PRÉ-AVALIAÇÃO
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black uppercase px-2 py-0.5 border border-slate-900 rounded bg-slate-100 text-slate-900">
                PAR-Q+ • FIFA MED
              </span>
              <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">
                Data: {isBlank ? "____/____/202___" : (data?.date ? new Date(data.date).toLocaleDateString("pt-BR") : "____/____/202___")}
              </p>
            </div>
          </div>

          {/* Dados do Aluno / Atleta */}
          <div className="mt-3 p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-[10px] space-y-1.5">
            <div className="flex justify-between items-center font-black uppercase text-slate-800 text-[9px] border-b border-slate-200 pb-1">
              <span>IDENTIFICAÇÃO DO ALUNO / ATLETA</span>
              <span>{isBlank ? "NÍVEL: [ ] RECREATIVO  [ ] COMPETITIVO  [ ] ALTO RENDIMENTO" : `NÍVEL: ${(data?.competitiveLevel || "Competitivo").toUpperCase()}`}</span>
            </div>
            <div className="grid grid-cols-12 gap-x-2 gap-y-1 text-[10px]">
              <div className="col-span-8">
                <strong>Nome:</strong> {isBlank ? "________________________________________________________________" : data?.athleteName || athlete.name}
              </div>
              <div className="col-span-4">
                <strong>Nasc:</strong> {isBlank ? "____/____/________" : (data?.dob ? new Date(data.dob).toLocaleDateString("pt-BR") : "____/____/________")} ({isBlank ? "____ anos" : `${data?.athleteAge || 0} anos`})
              </div>

              <div className="col-span-4">
                <strong>Sexo:</strong> {isBlank ? "( ) M  ( ) F" : (data?.athleteGender === "F" ? "Feminino" : "Masculino")}
              </div>
              <div className="col-span-4">
                <strong>Telefone:</strong> {isBlank ? "(___) _______________" : data?.phone || "(___) _______________"}
              </div>
              <div className="col-span-4">
                <strong>Esporte:</strong> {isBlank ? "____________________" : data?.modality || athlete.modality || "Geral"}
              </div>

              <div className="col-span-6">
                <strong>Posição / Categoria:</strong> {isBlank ? "___________________________" : data?.categoryOrPosition || "—"}
              </div>
              <div className="col-span-6">
                <strong>Contato Emergência:</strong> {isBlank ? "___________________________" : data?.emergencyContact ? `${data.emergencyContact} ${data.emergencyPhone || ""}` : "___________________________"}
              </div>
            </div>
          </div>

          {/* 1. Triagem de Segurança Cardiovascular */}
          <div className="mt-3">
            <div className="bg-slate-900 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex justify-between">
              <span>1. TRIAGEM DE SEGURANÇA CARDIOVASCULAR (Protocolo PAR-Q+ & ACSM)</span>
              <span>SIM &nbsp;&nbsp;&nbsp; NÃO</span>
            </div>
            <div className="divide-y divide-slate-200 text-[9.5px] border border-slate-200 rounded-b-lg">
              {[
                { id: "1.1", text: "Sente dor, pressão ou aperto no peito durante a prática de exercícios?", val: data?.cardio?.chestPainExercise },
                { id: "1.2", text: "Sente dor ou desconforto no peito quando está em repouso?", val: data?.cardio?.chestPainRest },
                { id: "1.3", text: "Teve tonturas, sensação de desmaio ou perda de equilíbrio nos últimos 12 meses?", val: data?.cardio?.dizzinessOrFainting },
                { id: "1.4", text: "Possui diagnóstico médico de pressão alta, arritmia cardíaca ou sopro?", val: data?.cardio?.hypertensionOrArrhythmia },
                { id: "1.5", text: "Possui histórico de asma, bronquite ou falta de ar intensa sem causa óbvia?", val: data?.cardio?.asthmaOrDyspnea },
                { id: "1.6", text: "Algum familiar direto (pais, irmãos) faleceu subitamente de coração antes dos 50 anos?", val: data?.cardio?.familySuddenDeath },
                { id: "1.7", text: "Faz uso diário de algum medicamento de uso contínuo?", val: data?.cardio?.continuousMedication },
              ].map((q) => (
                <div key={q.id} className="py-1 px-2 flex justify-between items-center">
                  <span className="leading-tight">
                    <strong>{q.id}.</strong> {q.text}
                  </span>
                  <div className="flex gap-4 font-mono font-bold shrink-0 ml-2">
                    <span>{isBlank ? "[  ]" : q.val ? "[ X ]" : "[  ]"}</span>
                    <span>{isBlank ? "[  ]" : !q.val ? "[ X ]" : "[  ]"}</span>
                  </div>
                </div>
              ))}
              <div className="py-1 px-2 text-[9px] bg-slate-50">
                <strong>Medicamento contínuo (se houver):</strong>{" "}
                {isBlank ? "________________________________________________________________________________" : data?.cardio?.medicationDetails || "Nenhum"}
              </div>
            </div>
          </div>

          {/* 2. Histórico Ortopédico, Lesões e Dor Atual */}
          <div className="mt-3">
            <div className="bg-slate-900 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex justify-between">
              <span>2. HISTÓRICO ORTOPÉDICO, LESÕES RECENTES E DOR ATUAL (Base FIFA Medical)</span>
            </div>
            <div className="border border-slate-200 rounded-b-lg p-2 text-[9.5px] space-y-1.5">
              <div className="flex justify-between items-center">
                <span>
                  <strong>2.1. Sofreu lesão osteomuscular nos últimos 12 meses?</strong>
                </span>
                <span className="font-mono font-bold">
                  {isBlank ? "( ) NÃO   ( ) SIM" : data?.orthopedic?.hasInjuryPast12Months ? "( ) NÃO   ( X ) SIM" : "( X ) NÃO   ( ) SIM"}
                </span>
              </div>
              <div className="text-[9px] bg-slate-50 p-1.5 rounded border border-slate-100 flex flex-wrap gap-x-4 gap-y-1">
                {[
                  { key: "ankleFoot", label: "Tornozelo/Pé" },
                  { key: "knee", label: "Joelho" },
                  { key: "thighHamstring", label: "Coxa/Posterior" },
                  { key: "hipPubis", label: "Quadril/Púbis" },
                  { key: "spine", label: "Coluna" },
                  { key: "shoulderUpperLimb", label: "Ombro/MMSS" },
                ].map((r) => {
                  const marked = !isBlank && !!(data?.orthopedic?.injuryDetails as any)?.[r.key]?.has;
                  return (
                    <span key={r.key}>
                      [{marked ? "X" : " "}] {r.label}
                    </span>
                  );
                })}
              </div>

              <div className="flex justify-between items-center">
                <span>
                  <strong>2.2. Já realizou alguma cirurgia ortopédica?</strong> {isBlank ? "( ) NÃO  ( ) SIM. Qual/Ano: __________________________" : data?.orthopedic?.hasSurgery ? `(X) SIM: ${data.orthopedic.surgeryDetails || "Não especificado"}` : "(X) NÃO"}
                </span>
              </div>

              <div className="pt-1 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <span>
                    <strong>2.3. Sente dor ou incômodo no corpo HOJE?</strong> {isBlank ? "( ) NÃO  ( ) SIM" : data?.orthopedic?.hasCurrentPain ? "(X) SIM" : "(X) NÃO"}
                  </span>
                  <span>
                    <strong>Local:</strong> {isBlank ? "________________________" : data?.orthopedic?.painLocation || "Livre de dor"}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[9px] bg-slate-50 px-2 py-1 rounded border border-slate-200">
                  <span className="font-bold">Escala EVA (0 a 10):</span>
                  <div className="flex gap-1 font-mono font-bold text-[9px]">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                      const active = !isBlank && data?.orthopedic?.hasCurrentPain && data?.orthopedic?.painLevel === n;
                      return (
                        <span
                          key={n}
                          className={`px-1 rounded ${active ? "bg-slate-900 text-white font-black" : "text-slate-700"}`}
                        >
                          {n}
                        </span>
                      );
                    })}
                  </div>
                  <span className="text-[8px] text-slate-500 uppercase">(0 = Sem dor | 10 = Extrema)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Rotina de Treino, Sono e Recuperação */}
          <div className="mt-3">
            <div className="bg-slate-900 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
              3. ROTINA DE TREINO, SONO E RECUPERAÇÃO
            </div>
            <div className="border border-slate-200 rounded-b-lg p-2 text-[9.5px] grid grid-cols-3 gap-2">
              <div>
                <strong>Treinos semanais:</strong>
                <p className="text-[9px] text-slate-700 mt-0.5">
                  {isBlank ? "[ ] 1-2x  [ ] 3-4x  [ ] 5-6x  [ ] Todos" : data?.routine?.weeklyTrainingDays || "3-4x"}
                </p>
              </div>
              <div>
                <strong>Média de sono/noite:</strong>
                <p className="text-[9px] text-slate-700 mt-0.5">
                  {isBlank ? "[ ] < 6h  [ ] 6h a 8h  [ ] > 8h" : data?.routine?.sleepHours || "6-8h"}
                </p>
              </div>
              <div>
                <strong>Qualidade do sono:</strong>
                <p className="text-[9px] text-slate-700 mt-0.5">
                  {isBlank ? "[ ] Ruim  [ ] Regular  [ ] Bom" : (data?.routine?.sleepQuality || "Bom").toUpperCase()}
                </p>
              </div>
              <div>
                <strong>Treino intenso últimas 24h?</strong>
                <p className="text-[9px] text-slate-700 mt-0.5">
                  {isBlank ? "[ ] NÃO   [ ] SIM" : data?.routine?.intenseTrainingPast24h ? "[X] SIM" : "[X] NÃO"}
                </p>
              </div>
              <div>
                <strong>Usa suplementos?</strong>
                <p className="text-[9px] text-slate-700 mt-0.5">
                  {isBlank ? "[ ] NÃO   [ ] SIM" : data?.routine?.usesSupplements ? `[X] SIM (${data.routine.supplementsDetails || "Sim"})` : "[X] NÃO"}
                </p>
              </div>
              <div>
                <strong>Consumo diário de água:</strong>
                <p className="text-[9px] text-slate-700 mt-0.5">
                  {isBlank ? "[ ] < 1,5L  [ ] 1,5L-2,5L  [ ] > 2,5L" : data?.routine?.waterIntake || "1,5-2,5L"}
                </p>
              </div>
            </div>
          </div>

          {/* 4. Objetivo Principal do Aluno / Atleta */}
          <div className="mt-3">
            <div className="bg-slate-900 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
              4. OBJETIVO PRINCIPAL DO ALUNO / ATLETA
            </div>
            <div className="border border-slate-200 rounded-b-lg p-2 text-[9.5px] grid grid-cols-2 gap-x-4 gap-y-1">
              {[
                { id: "performance", label: "⚡ Melhorar Performance e Rendimento Esportivo" },
                { id: "prevencao", label: "🛡️ Prevenção de Lesões e Longevidade Física" },
                { id: "saude", label: "🌿 Saúde, Bem-Estar e Qualidade de Vida" },
                { id: "retorno", label: "🔄 Retorno Seguro ao Esporte (Pós-Lesão)" },
                { id: "estetica", label: "⚖️ Estética e Composição Corporal" },
              ].map((g) => {
                const checked = !isBlank && data?.mainGoal === g.id;
                return (
                  <div key={g.id} className="flex items-center gap-1.5">
                    <span className="font-mono font-bold">[{checked ? "X" : " "}]</span>
                    <span>{g.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Declaração de Veracidade e Ciência */}
          <div className="mt-3 p-2.5 border border-slate-300 rounded-lg text-[9px] space-y-2 bg-slate-50">
            <p className="text-slate-700 leading-snug">
              <strong>Declaração de Ciência e Veracidade:</strong> Declaro que todas as informações prestadas nesta
              anamnese são verdadeiras e completas, não tendo omitido nenhum sintoma, dor ou diagnóstico prévio. Estou
              ciente de que as avaliações físicas exigem esforço motor voluntário e que os dados aqui coletados servirão de
              base científica para o planejamento do meu treinamento na LB Sports.
            </p>
            <div className="flex justify-between items-end pt-3">
              <div className="w-2/3 border-b border-slate-900 pb-0.5">
                <p className="text-[8px] font-black uppercase text-slate-500">Assinatura do Atleta / Aluno (ou Responsável se menor):</p>
                <p className="text-[10px] font-bold text-slate-900">
                  {isBlank ? "" : data?.signatureName || athlete.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black uppercase text-slate-500">Data:</p>
                <p className="text-[10px] font-bold text-slate-900">
                  {isBlank ? "_____ / _____ / 202___" : (data?.signatureDate ? new Date(data.signatureDate).toLocaleDateString("pt-BR") : "_____ / _____ / 202___")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Official Standard Evaluation Footer */}
        <div className="mt-4 pt-3 border-t-2 border-slate-900 flex justify-between items-center bg-white shrink-0 text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center p-1 border border-slate-800 shrink-0">
              <img src="/pwa-192x192.svg" className="w-full h-full object-contain" alt="LB" />
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.25em] leading-none mb-1">
                Responsável Técnico
              </p>
              <p className="text-[10px] font-black text-slate-900 uppercase italic leading-none">
                {DEFAULT_TECHNICAL_RESPONSIBLE.name} ({DEFAULT_TECHNICAL_RESPONSIBLE.cred})
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">
              Página 1 de 1
            </p>
            <div className="flex items-center justify-end gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#39FF14] rounded-full"></span>
              <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                LB HUB v3.0 • ELITE PERFORMANCE
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
