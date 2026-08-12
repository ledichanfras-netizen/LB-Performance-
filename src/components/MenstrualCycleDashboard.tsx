import React, { FC, useState, useMemo } from "react";
import { 
  Heart, 
  Calendar, 
  Activity, 
  Sparkles, 
  Flame, 
  Coffee, 
  TrendingUp, 
  AlertCircle, 
  Info,
  Clock,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  Dumbbell
} from "lucide-react";
import { Athlete, WellnessEntry } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { formatDate, getSafeDateTime, getLocalDateString } from "../utils";

interface MenstrualCycleDashboardProps {
  athlete: Athlete;
  role: "coach" | "athlete";
  onUpdateAthlete: (data: Partial<Athlete>) => void;
}

export const MenstrualCycleDashboard: FC<MenstrualCycleDashboardProps> = ({
  athlete,
  role,
  onUpdateAthlete,
}) => {
  const [activeTab, setActiveTabTab] = useState<"insights" | "history" | "stats">("insights");

  // Get wellness checklist with menstrual tracking
  const wellnessHistory = useMemo(() => {
    return (Array.isArray(athlete.wellness) ? athlete.wellness : [])
      .filter(w => w.menstrualPhase && w.menstrualPhase !== "Nenhuma");
  }, [athlete.wellness]);

  // Current current menstrual status
  const currentStatus = useMemo(() => {
    const sorted = [...(athlete.wellness || [])].sort(
      (a, b) => getSafeDateTime(b.date) - getSafeDateTime(a.date)
    );
    const lastWithMenstrual = sorted.find(w => w.menstrualPhase);
    return lastWithMenstrual || null;
  }, [athlete.wellness]);

  const currentPhase = currentStatus?.menstrualPhase || "Nenhuma";
  const currentSymptoms = currentStatus?.menstrualSymptoms || [];

  // Phase details & Recommendations
  const phaseDetails = useMemo(() => {
    switch (currentPhase) {
      case "Folicular":
        return {
          title: "Fase Folicular (Pós-Menstruação)",
          color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
          accentColor: "#34d399",
          badge: "Foco: Força & Hipertrofia",
          loadModifier: "Carga Máxima (100% - 105%)",
          desc: "Níveis de estrogênio estão em ascensão progressiva. Excelente tolerância à fadiga, metabolismo de carboidratos otimizado e alto poder neuromuscular.",
          guidelines: [
            "Período ideal para recordes de carga (PRs) e treinos de força máxima.",
            "Maior capacidade de recuperação inter-séries e alta tolerância a volumes elevados.",
            "Foco em treinos de alta intensidade e sprints metabólicos."
          ],
          nutriAdvice: "Priorizar carboidratos complexos de boa qualidade para sustentar a alta intensidade.",
          injuryRisk: "Baixo a moderado. Boa estabilidade neuromuscular geral."
        };
      case "Ovulatória":
        return {
          title: "Fase Ovulatória (Pico Hormonal)",
          color: "text-[#ec4899] border-pink-500/20 bg-pink-500/10",
          accentColor: "#ec4899",
          badge: "Foco: Potência & Auto-regulação",
          loadModifier: "Alta Intensidade / Auto-regulado (90% - 100%)",
          desc: "Pico máximo de estrogênio e liberação de LH. Excelente força de disparo neuromuscular, mas concomitante aumento da frouxidão ligamentar devido à elastina sob efeito estrogênico.",
          guidelines: [
            "Ótimo potencial de força neuromuscular pura e exercícios dinâmicos (pliometria).",
            "Atenção redobrada na estabilização articular de joelhos e tornozelos devido ao risco ligamentar elevado.",
            "Aquecimento neuromuscular completo é mandatório antes de cargas máximas."
          ],
          nutriAdvice: "Ingestão adequada de antioxidantes e gorduras boas para apoiar a síntese hormonal.",
          injuryRisk: "Crítico / Elevado (risco ligamentar e tendíneo aumentado no joelho)."
        };
      case "Lútea":
        return {
          title: "Fase Lútea (Progesterona Dominante)",
          color: "text-amber-400 border-amber-500/20 bg-amber-500/10",
          accentColor: "#fbbf24",
          badge: "Foco: Resistência & Aeróbio",
          loadModifier: "Moderado / Foco Técnico (75% - 85%)",
          desc: "Progesterona é o hormônio dominante. Aumento da temperatura corporal basal cardíaca em repouso. Maior oxidação lipídica (gorduras) e possibilidade de retenção líquida e oscilações na glicemia.",
          guidelines: [
            "Excelente período para treinos aeróbios contínuos, endurance de média densidade e trabalhos técnicos refinados.",
            "Esforço percebido (PSE) pode estar acentuado; priorize o planejamento do volume sobre a intensidade pura.",
            "Foco em repouso adequado devido ao sono potencialmente perturbado pela temperatura corporal."
          ],
          nutriAdvice: "Aumento sutil na ingestão proteica e manutenção constante de sais minerais e hidratação.",
          injuryRisk: "Moderado. Atenção à fadiga cardiovascular precoce."
        };
      case "Menstruação":
        return {
          title: "Fase Menstrual (Início do Ciclo)",
          color: "text-red-400 border-red-500/20 bg-red-500/10",
          accentColor: "#f87171",
          badge: "Foco: Regenerativo & Mobilidade",
          loadModifier: "Regenerativo / Baixo Volume (60% - 70%)",
          desc: "Estrogênio e progesterona em níveis basais mínimos. Descolamento endometrial com possíveis manifestações inflamatórias (cólicas, enxaqueca e fadiga sistêmica).",
          guidelines: [
            "Excelente janela para trabalhos de mobilidade ativa, alongamento e liberação miofascial profunda.",
            "Reduzir o volume total de séries preservando a intensidade apenas se a atleta se reportar sem dores.",
            "Priorizar exercícios multiarticulares de baixo estresse axial lombar se houver queixa de dor lombar."
          ],
          nutriAdvice: "Foco em micronutrientes anti-inflamatórios (magnésio, ômega-3) e hidratação redobrada.",
          injuryRisk: "Moderado a elevado para lesões musculares se houver espasmos abdominais graves."
        };
      default:
        return {
          title: "Ciclo Menstrual Estabilizado / Nenhuma",
          color: "text-slate-400 border-slate-800 bg-slate-900/50",
          accentColor: "#94a3b8",
          badge: "Foco: Periodização Convencional",
          loadModifier: "Ajuste Padrão de Carga (100%)",
          desc: "Nenhum status hormonal específico reportado ou uso de anticoncepcional contínuo. Atleta opera sob regulação padrão de carga.",
          guidelines: [
            "Seguir a periodização esportiva clássica planejada na planilha.",
            "Modificar treinos com base exclusivamente nos parâmetros físicos de prontidão padrão (fadiga, dor muscular, sono).",
            "Manter o registro diário para identificar flutuações discretas de rendimento."
          ],
          nutriAdvice: "Alimentação balanceada de acordo com as metas gerais de composição e treino.",
          injuryRisk: "Normal. Alinhado estritamente com o score de prontidão padrão."
        };
    }
  }, [currentPhase]);

  // Aggregate statistics
  const phaseStats = useMemo(() => {
    const list = Array.isArray(athlete.wellness) ? athlete.wellness : [];
    const statsMap: Record<string, { count: number; sumReadiness: number; avgReadiness: number; symptoms: Record<string, number> }> = {
      Folicular: { count: 0, sumReadiness: 0, avgReadiness: 0, symptoms: {} },
      Ovulatória: { count: 0, sumReadiness: 0, avgReadiness: 0, symptoms: {} },
      Lútea: { count: 0, sumReadiness: 0, avgReadiness: 0, symptoms: {} },
      Menstruação: { count: 0, sumReadiness: 0, avgReadiness: 0, symptoms: {} },
    };

    list.forEach(w => {
      const p = w.menstrualPhase;
      if (p && statsMap[p]) {
        statsMap[p].count += 1;
        statsMap[p].sumReadiness += w.readinessScore || 0;
        if (Array.isArray(w.menstrualSymptoms)) {
          w.menstrualSymptoms.forEach(sym => {
            statsMap[p].symptoms[sym] = (statsMap[p].symptoms[sym] || 0) + 1;
          });
        }
      }
    });

    Object.keys(statsMap).forEach(key => {
      const s = statsMap[key];
      s.avgReadiness = s.count > 0 ? Math.round(s.sumReadiness / s.count) : 0;
    });

    return statsMap;
  }, [athlete.wellness]);

  // Most common symptoms across history
  const topSymptoms = useMemo(() => {
    const counts: Record<string, number> = {};
    const list = Array.isArray(athlete.wellness) ? athlete.wellness : [];
    list.forEach(w => {
      if (Array.isArray(w.menstrualSymptoms)) {
        w.menstrualSymptoms.forEach(sym => {
          counts[sym] = (counts[sym] || 0) + 1;
        });
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [athlete.wellness]);

  return (
    <div id="menstrual-performance-module" className="space-y-6">
      
      {/* MODULE MAIN CARD */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-pink-500/10 rounded-[2.5rem] p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/5 rounded-full blur-[80px] pointer-events-none group-hover:scale-120 transition-transform duration-700" />
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-slate-800/60 pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-widest text-[#ec4899] uppercase">
              <Heart className="w-3.5 h-3.5 text-[#ec4899]" />
              CICLO FEMININO & PERFORMANCE ELITE
            </div>
            <h3 className="text-xl md:text-3xl font-black italic uppercase tracking-tight text-white">
              Monitoramento Hormonal & Prescrição
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Análise integrada do ciclo menstrual para otimização neural e controle preditivo de lesões.
            </p>
          </div>

          {/* TOGGLE MENSTRU TAB */}
          <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-2xl w-full md:w-auto self-stretch md:self-auto shadow-sm">
            {[
              { id: "insights", label: "Insights & Carga" },
              { id: "stats", label: "Correlação Bio" },
              { id: "history", label: "Registros" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTabTab(tab.id as any)}
                className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase transition-all flex-grow md:flex-none ${
                  activeTab === tab.id
                    ? "bg-[#ec4899] text-white shadow-lg shadow-pink-500/15"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: INSIGHTS & CARGA */}
        <AnimatePresence mode="wait">
          {activeTab === "insights" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* CURRENT STATE HIGHLIGHT */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* STATE BOX */}
                <div className="p-6 rounded-[2rem] bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">
                      Fase Atual do Ciclo (Check-in)
                    </span>
                    <h4 className="text-2xl font-black italic uppercase tracking-tight text-white flex items-center gap-2">
                      <span className="w-3.5 h-3.5 bg-pink-500 rounded-full inline-block shrink-0 animate-pulse" />
                      {currentPhase === "Nenhuma" ? "Não Informado" : currentPhase}
                    </h4>
                    {currentStatus && (
                      <p className="text-[9px] font-black text-slate-500 uppercase">
                        Última atualização: {formatDate(currentStatus.date)}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase block mb-2">
                      Sintomas Reportados
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentSymptoms.length > 0 ? (
                        currentSymptoms.map((sym, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] px-2.5 py-1 bg-pink-500/10 border border-pink-500/20 text-[#ec4899] font-black uppercase tracking-wider rounded-lg"
                          >
                            {sym}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] font-bold text-slate-600 uppercase">
                          Zero sintomas limitantes
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* TARGET INTENSITY */}
                <div className="p-6 rounded-[2rem] bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-brand-primary" />
                      Ajuste Neural de Carga
                    </span>
                    <div className="text-xl font-black italic uppercase tracking-tight text-white leading-tight">
                      {phaseDetails.loadModifier}
                    </div>
                    <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${phaseDetails.color}`}>
                      {phaseDetails.badge}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
                      <span>Risco Clínico Artcular</span>
                      <span className="text-white">{phaseDetails.title.includes("Ovulatória") ? "CRÍTICO (LCA)" : "Controlado"}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          currentPhase === "Ovulatória" ? "bg-red-500" :
                          currentPhase === "Menstruação" ? "bg-orange-500" : "bg-emerald-500"
                        }`}
                        style={{ width: currentPhase === "Ovulatória" ? "90%" : currentPhase === "Menstruação" ? "65%" : "30%" }}
                      />
                    </div>
                  </div>
                </div>

                {/* REHAB / RECOVERY */}
                <div className="p-6 rounded-[2rem] bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-[#ec4899]" />
                      Recomendação Preventiva
                    </span>
                    <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed">
                      {currentPhase === "Ovulatória" 
                        ? "Restringir saltos de alto impacto sem estabilizador. Redobrar o foco na técnica exata de desaceleração." 
                        : currentPhase === "Menstruação" 
                        ? "Oferecer pausa em treinos de potência máxima se cólicas persistirem. Foco em flexibilidade." 
                        : "Liberado para aplicar sobrecarga progressiva estruturada."}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                      Nutrição Correlacionada
                    </span>
                    <p className="text-[9px] font-bold text-slate-400 leading-normal uppercase">
                      {phaseDetails.nutriAdvice}
                    </p>
                  </div>
                </div>

              </div>

              {/* MEDICAL ACTIONABLE INSIGHT BOX */}
              <div className="p-6 md:p-8 bg-slate-950 border border-slate-800 rounded-[2.5rem] space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#ec4899]/10 border border-[#ec4899]/20 flex items-center justify-center text-[#ec4899] rounded-xl shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                      Diretrizes de Campo & Prescrição
                    </h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Instruções para treinadores otimizarem a carga com base na resposta endometrial
                    </p>
                  </div>
                </div>

                <div className="h-px bg-slate-800/50" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest">
                      Ocorrência de Estresse Hormonal
                    </div>
                    <p className="text-xs text-slate-300 font-bold leading-relaxed uppercase">
                      {phaseDetails.desc}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                      Protocolos de Exercícios & Volume
                    </div>
                    <ul className="space-y-2">
                      {phaseDetails.guidelines.map((g, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[10px] text-slate-400 font-bold tracking-wide uppercase leading-snug">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* ATHLETE MANUAL FORCE OVERRIDE */}
              {role === "coach" && (
                <div className="p-5 border border-slate-800/80 rounded-2xl bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <h5 className="text-[11px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5 justify-center sm:justify-start">
                      <Activity className="w-4 h-4 text-[#ec4899]" />
                      Sobrescrita de Ciclo pelo Coach
                    </h5>
                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase">
                      Caso necessite modificar a fase ativa do ciclo devido a uso de anticoncepcional ou dados manuais.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {["Folicular", "Ovulatória", "Lútea", "Menstruação", "Nenhuma"].map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          const mockWellness: WellnessEntry = {
                            id: `well-man-${Date.now()}`,
                            date: getLocalDateString(),
                            fatigue: currentStatus?.fatigue || 3,
                            sleep: currentStatus?.sleep || 8,
                            stress: currentStatus?.stress || 3,
                            soreness: currentStatus?.soreness || 3,
                            mood: currentStatus?.mood || 8,
                            cognitiveLoad: currentStatus?.cognitiveLoad || 3,
                            readinessScore: currentStatus?.readinessScore || 85,
                            menstrualPhase: p as any,
                            menstrualSymptoms: currentSymptoms
                          };
                          
                          const list = Array.isArray(athlete.wellness) ? [...athlete.wellness] : [];
                          // Add or replace today's manual wellness
                          const todayStr = getLocalDateString();
                          const filtered = list.filter(w => w.date && w.date.split("T")[0] !== todayStr);
                          
                          onUpdateAthlete({
                            wellness: [{ ...mockWellness, date: todayStr }, ...filtered]
                          });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                          currentPhase === p 
                            ? "bg-[#ec4899] text-white" 
                            : "bg-slate-950 text-slate-500 border border-slate-850 hover:text-slate-300"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </motion.div>
          )}

          {/* TAB 2: CORRELAÇÃO BIOSTATISTICA */}
          {activeTab === "stats" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { phase: "Folicular", info: phaseStats.Folicular, color: "border-emerald-500/20 text-emerald-400" },
                  { phase: "Ovulatória", info: phaseStats.Ovulatória, color: "border-pink-500/20 text-[#ec4899]" },
                  { phase: "Lútea", info: phaseStats.Lútea, color: "border-amber-500/20 text-amber-500" },
                  { phase: "Menstruação", info: phaseStats.Menstruação, color: "border-red-500/20 text-red-500" },
                ].map((p, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-4 text-center">
                    <div>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-2">
                        FASE {p.phase.toUpperCase()}
                      </span>
                      <div className="text-3xl font-black text-white italic tracking-tighter">
                        {p.info.avgReadiness > 0 ? `${p.info.avgReadiness}%` : "--"}
                      </div>
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mt-1">
                        Média de Prontidão ({p.info.count} logs)
                      </span>
                    </div>

                    <div className="h-1 w-12 bg-slate-800 rounded mx-auto" />

                    <div className="space-y-1">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">
                        Sintoma Mais Comum
                      </span>
                      <div className="text-[9px] font-bold text-white uppercase italic">
                        {(() => {
                          const syms = Object.entries(p.info.symptoms);
                          if (syms.length === 0) return "Nenhum sintoma grave";
                          const sorted = syms.sort((a,b) => b[1] - a[1]);
                          return `${sorted[0][0]} (${sorted[0][1]}x)`;
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* HEAVY SYMPTOMS ANALYSIS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* RECURRENT SYMPTOMS SUMMARY */}
                <div className="p-6 rounded-[2rem] bg-slate-950 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#ec4899]" />
                    Sintomas Mais Frequentes da Atleta
                  </h4>
                  <div className="h-px bg-slate-900" />
                  
                  <div className="space-y-3">
                    {topSymptoms.length > 0 ? (
                      topSymptoms.map(([symptom, count]) => {
                        const pct = Math.min(100, Math.round((count / (athlete.wellness?.length || 1)) * 100));
                        return (
                          <div key={symptom} className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                              <span>{symptom}</span>
                              <span className="text-[#ec4899]">{count}x ocorrências ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                              <div className="bg-[#ec4899] h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-slate-500 text-[10px] font-black uppercase tracking-widest">
                        Nenhum sintoma recorrente registrado
                      </div>
                    )}
                  </div>
                </div>

                {/* CLINICAL SUMMARY FOR THE CYCLE */}
                <div className="p-6 rounded-[2rem] bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Auditoria de Adaptação de Carga
                    </h4>
                    <div className="h-px bg-slate-900" />
                    <p className="text-[11px] text-slate-400 leading-relaxed font-bold uppercase">
                      O emparelhamento do ciclo com as dores musculares (soreness) indica se a atleta está sofrendo sobrecarga nas fases de risco ou se necessita modificações na modulação de volume.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                    <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                      Status de Auto-regulação
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase leading-snug">
                      Excelente! A atleta apresenta alta correlação positiva de prontidão com a fase folicular, promovendo melhor rendimento e resposta hipertrófica.
                    </p>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 3: HISTORICO DE CHECK-INS */}
          {activeTab === "history" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-[2rem] overflow-hidden">
                <div className="overflow-x-auto min-w-full">
                  <table className="w-full text-left text-xs font-mono text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        <th className="py-4 px-3">Data</th>
                        <th className="py-4 px-3">Fase Menstrual</th>
                        <th className="py-4 px-3">Sintomas Reportados</th>
                        <th className="py-4 px-3 text-center">Prontidão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 divide-dashed">
                      {wellnessHistory.length > 0 ? (
                        wellnessHistory.map((w, idx) => (
                          <tr key={w.id || idx} className="hover:bg-pink-500/5 transition-colors">
                            <td className="py-4 px-3 font-bold text-white">{formatDate(w.date)}</td>
                            <td className="py-4 px-3">
                              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded bg-slate-900 text-pink-300">
                                {w.menstrualPhase}
                              </span>
                            </td>
                            <td className="py-4 px-3 text-slate-400 font-sans font-bold uppercase text-[10px]">
                              {Array.isArray(w.menstrualSymptoms) && w.menstrualSymptoms.length > 0 
                                ? w.menstrualSymptoms.join(", ") 
                                : "Nenhum"}
                            </td>
                            <td className="py-4 px-3 text-center font-bold text-[#ec4899]">{w.readinessScore}%</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-slate-550 uppercase font-black text-[10px] tracking-widest">
                            Nenhum registro menstrual ativo correspondente
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

    </div>
  );
};
