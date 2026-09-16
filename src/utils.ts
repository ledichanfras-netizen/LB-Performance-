
import { IQRatioStatus, AsymmetryStatus, WellnessEntry, Workout, Athlete, PrescribedExercise, AdvancedExecutionMethod } from './types';

// Enhanced Repetitions Parser: supports cluster "2+2+2", rest-pause "8+3+2", ranges "8-10", "4x4", etc.
export const parseRepetitions = (repsStr: string | number | undefined | null): number => {
  if (repsStr === undefined || repsStr === null) return 10;
  if (typeof repsStr === "number") return isNaN(repsStr) ? 10 : repsStr;
  const cleaned = String(repsStr).trim();
  if (!cleaned) return 10;

  // Handle cluster/rest-pause with '+' (e.g. "2+2+2" = 6, "8 + 3 + 2" = 13)
  if (cleaned.includes("+")) {
    const parts = cleaned.split("+").map(p => {
      const match = p.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    });
    const sum = parts.reduce((acc, curr) => acc + curr, 0);
    return sum > 0 ? sum : 10;
  }

  // Handle range "8-10" or "8 a 10" -> take target (upper or single)
  if (cleaned.includes("-") || cleaned.toLowerCase().includes(" a ")) {
    const matches = cleaned.match(/\d+/g);
    if (matches && matches.length >= 2) {
      const maxVal = Math.max(...matches.map(m => parseInt(m, 10)));
      return maxVal > 0 ? maxVal : 10;
    }
  }

  // Match regular single integer
  const match = cleaned.match(/\d+/);
  if (match) {
    const val = parseInt(match[0], 10);
    return isNaN(val) ? 10 : val;
  }
  return 10;
};

// Enhanced Weight Value Parser: supports numbers, commas, "85% 1RM", "BW", "100kg"
export const parseWeightValue = (weightStr: string | number | undefined | null): number => {
  if (weightStr === undefined || weightStr === null) return 0;
  if (typeof weightStr === "number") return isNaN(weightStr) ? 0 : weightStr;
  const cleaned = String(weightStr).trim().replace(",", ".");
  if (!cleaned || cleaned.toLowerCase() === "bw" || cleaned.toLowerCase() === "pc") return 0;
  const match = cleaned.match(/\d+(\.\d+)?/);
  if (match) {
    const val = parseFloat(match[0]);
    return isNaN(val) ? 0 : val;
  }
  return 0;
};

// Automatic Detection and Normalization of Special Training Methods
export const detectSpecialMethod = (ex: Partial<PrescribedExercise>): {
  method: AdvancedExecutionMethod;
  clusterReps?: string;
  intraSetRest?: number;
  blockTag?: string;
  blockRole?: string;
  rest?: string;
} => {
  if (ex.executionMethod && ex.executionMethod !== 'standard') {
    return {
      method: ex.executionMethod,
      clusterReps: ex.clusterReps || (ex.executionMethod === 'cluster' ? (ex.reps || "2+2+2") : undefined),
      intraSetRest: ex.intraSetRest ?? (ex.executionMethod === 'cluster' ? 20 : ex.executionMethod === 'rest_pause' ? 15 : 20),
      blockTag: ex.blockTag,
      blockRole: ex.blockRole,
      rest: ex.rest
    };
  }

  const nameLower = (ex.name || "").toLowerCase();
  const notesLower = (ex.notes || "").toLowerCase();
  const repsStr = String(ex.reps || "");

  // 1. Cluster Set detection
  if (
    ex.clusterReps ||
    (repsStr.includes("+") && !nameLower.includes("rest") && !notesLower.includes("rest-pause")) ||
    nameLower.includes("cluster") ||
    notesLower.includes("cluster")
  ) {
    const clusterReps = ex.clusterReps || (repsStr.includes("+") ? repsStr : "2+2+2");
    return {
      method: 'cluster',
      clusterReps,
      intraSetRest: ex.intraSetRest ?? 20,
      rest: ex.rest || "2m30s"
    };
  }

  // 2. Rest-Pause detection
  if (
    nameLower.includes("rest-pause") ||
    nameLower.includes("rest pause") ||
    notesLower.includes("rest-pause") ||
    notesLower.includes("rest pause") ||
    (repsStr.includes("+") && (repsStr.includes("8") || repsStr.includes("10") || repsStr.includes("12")))
  ) {
    return {
      method: 'rest_pause',
      intraSetRest: ex.intraSetRest ?? 15,
      rest: ex.rest || "2min"
    };
  }

  // 3. Complex Contrast / French Contrast / PAP detection
  if (
    ex.blockTag ||
    nameLower.includes("contraste") ||
    nameLower.includes("french contrast") ||
    notesLower.includes("contraste") ||
    notesLower.includes("pap") ||
    notesLower.includes("complexo")
  ) {
    return {
      method: 'complex_contrast',
      blockTag: ex.blockTag || "1A",
      blockRole: ex.blockRole || "1A: Carga Pesada (PAP)",
      intraSetRest: ex.intraSetRest ?? 20,
      rest: ex.rest || "20s"
    };
  }

  // 4. Drop-Set detection
  if (nameLower.includes("drop-set") || nameLower.includes("dropset") || notesLower.includes("drop-set") || notesLower.includes("dropset")) {
    return {
      method: 'drop_set',
      intraSetRest: 0,
      rest: ex.rest || "2min"
    };
  }

  // 5. Bi-Set detection
  if (nameLower.includes("bi-set") || nameLower.includes("biset") || notesLower.includes("bi-set") || notesLower.includes("biset")) {
    return {
      method: 'bi_set',
      intraSetRest: 0,
      rest: ex.rest || "90s"
    };
  }

  // 6. Tri-Set detection
  if (nameLower.includes("tri-set") || nameLower.includes("triset") || notesLower.includes("tri-set") || notesLower.includes("triset")) {
    return {
      method: 'tri_set',
      intraSetRest: 0,
      rest: ex.rest || "2min"
    };
  }

  // 7. Super-Set detection
  if (nameLower.includes("super-set") || nameLower.includes("superset") || notesLower.includes("super-set") || notesLower.includes("superset")) {
    return {
      method: 'super_set',
      intraSetRest: 0,
      rest: ex.rest || "90s"
    };
  }

  // 8. German Volume Training (GVT) detection
  if (nameLower.includes("gvt") || notesLower.includes("gvt") || (ex.sets === 10 && repsStr === "10")) {
    return {
      method: 'gvt',
      intraSetRest: 60,
      rest: ex.rest || "60s"
    };
  }

  // 9. Myo-Reps detection
  if (nameLower.includes("myo-rep") || nameLower.includes("myorep") || notesLower.includes("myo-rep") || notesLower.includes("myorep")) {
    return {
      method: 'myo_reps',
      intraSetRest: 10,
      rest: ex.rest || "2min"
    };
  }

  // 10. Wave Loading detection
  if (nameLower.includes("wave") || nameLower.includes("onda") || notesLower.includes("onda") || notesLower.includes("wave loading")) {
    return {
      method: 'wave_loading',
      intraSetRest: 120,
      rest: ex.rest || "3min"
    };
  }

  return { method: 'standard', rest: ex.rest || "90s" };
};

// Metadata for rendering special training methods
export const getSpecialMethodMeta = (method?: AdvancedExecutionMethod) => {
  switch (method) {
    case 'cluster':
      return {
        id: 'cluster',
        name: 'Cluster Set',
        badge: '🎯 Cluster Set',
        icon: '🎯',
        bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        activeRing: 'ring-purple-500/40 border-purple-500',
        description: 'Sub-blocos com micro-pausa na barra (15-20s) para preservar a velocidade e recrutamento de motoneurônios de alto limiar sem acúmulo excessivo de lactato.',
        defaultIntraRest: 20,
        defaultInterRest: '2m30s'
      };
    case 'complex_contrast':
      return {
        id: 'complex_contrast',
        name: 'Contraste Francês / Complex PAP',
        badge: '🇫🇷 Complexo PAP',
        icon: '🇫🇷',
        bg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        activeRing: 'ring-cyan-500/40 border-cyan-500',
        description: 'Potenciação pós-ativação (PAP) combinando carga pesada (>80% 1RM), pliometria com carga, velocidade balística e pliometria reativa.',
        defaultIntraRest: 20,
        defaultInterRest: '3m30s'
      };
    case 'rest_pause':
      return {
        id: 'rest_pause',
        name: 'Rest-Pause',
        badge: '🔥 Rest-Pause',
        icon: '🔥',
        bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        activeRing: 'ring-rose-500/40 border-rose-500',
        description: 'Série levada à fadiga seguida de micro-pausas curtas (15s) para recrutar o máximo de unidades motoras com alto estresse metabólico.',
        defaultIntraRest: 15,
        defaultInterRest: '2min'
      };
    case 'drop_set':
      return {
        id: 'drop_set',
        name: 'Drop-Set',
        badge: '📉 Drop-Set',
        icon: '📉',
        bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        activeRing: 'ring-amber-500/40 border-amber-500',
        description: 'Redução imediata de carga (-20% a -25%) sem descanso entre as quedas para esgotamento das fibras musculares.',
        defaultIntraRest: 0,
        defaultInterRest: '2min'
      };
    case 'bi_set':
      return {
        id: 'bi_set',
        name: 'Bi-Set',
        badge: '⚡ Bi-Set',
        icon: '⚡',
        bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        activeRing: 'ring-blue-500/40 border-blue-500',
        description: 'Dois exercícios executados em sequência contínua sem descanso para o mesmo grupo muscular ou agonista/antagonista.',
        defaultIntraRest: 0,
        defaultInterRest: '90s'
      };
    case 'tri_set':
      return {
        id: 'tri_set',
        name: 'Tri-Set',
        badge: '🔱 Tri-Set',
        icon: '🔱',
        bg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
        activeRing: 'ring-indigo-500/40 border-indigo-500',
        description: 'Três exercícios sequenciais sem pausa entre eles, aumentando a densidade e o volume por unidade de tempo.',
        defaultIntraRest: 0,
        defaultInterRest: '2min'
      };
    case 'super_set':
      return {
        id: 'super_set',
        name: 'Super-Set',
        badge: '⚔️ Super-Set',
        icon: '⚔️',
        bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        activeRing: 'ring-emerald-500/40 border-emerald-500',
        description: 'Combinação alternada de músculos agonistas e antagonistas (ex: Extensão + Flexão) otimizando tempo e recuperação neuromuscular recíproca.',
        defaultIntraRest: 0,
        defaultInterRest: '90s'
      };
    case 'gvt':
      return {
        id: 'gvt',
        name: 'German Volume Training (GVT)',
        badge: '🇩🇪 GVT 10x10',
        icon: '🇩🇪',
        bg: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
        activeRing: 'ring-yellow-500/40 border-yellow-500',
        description: '10 séries de 10 repetições com 60% de 1RM e intervalo estrito de 60s, promovendo hipertrofia e capacidade de trabalho extraordinárias.',
        defaultIntraRest: 60,
        defaultInterRest: '60s'
      };
    case 'myo_reps':
      return {
        id: 'myo_reps',
        name: 'Myo-Reps',
        badge: '🧬 Myo-Reps',
        icon: '🧬',
        bg: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
        activeRing: 'ring-teal-500/40 border-teal-500',
        description: 'Série de ativação (12-15 reps) seguida de 4-5 mini-séries de 3-5 reps com pausas de 5 respirações profundas (10s).',
        defaultIntraRest: 10,
        defaultInterRest: '2min'
      };
    case 'wave_loading':
      return {
        id: 'wave_loading',
        name: 'Wave Loading (Ondulatória)',
        badge: '🌊 Wave Loading',
        icon: '🌊',
        bg: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
        activeRing: 'ring-violet-500/40 border-violet-500',
        description: 'Estrutura em ondas de repetições decrescentes e cargas crescentes (ex: 3-2-1 @ 85-90-95%) para facilitação neural progressiva.',
        defaultIntraRest: 120,
        defaultInterRest: '3min'
      };
    default:
      return {
        id: 'standard',
        name: 'Tradicional',
        badge: 'Série Tradicional',
        icon: '🏋️‍♂️',
        bg: 'bg-slate-800 text-slate-300 border-slate-700',
        activeRing: 'ring-slate-700 border-slate-600',
        description: 'Execução linear de séries com intervalo inter-séries completo para recuperação dos estoques de fosfocreatina.',
        defaultIntraRest: 0,
        defaultInterRest: '90s'
      };
  }
};

export const calculateAge = (dob: string): number => {
  if (!dob) return 0;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const safeParseFloat = (val: any): number => {
  if (val === undefined || val === null || val === '') return NaN;
  if (typeof val === 'number') return isNaN(val) ? NaN : val;
  if (typeof val === 'string') {
    const cleaned = val.trim().replace(',', '.').replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? NaN : parsed;
  }
  return NaN;
};

export const formatSleepHours = (hours: number): string => {
  if (isNaN(hours) || hours <= 0) return "0h";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m >= 60) return `${h + 1}h`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export const calculateSleepHoursFromTimes = (sleepStartTime?: string, wakeUpTime?: string): { hours: number; formatted: string } | null => {
  if (!sleepStartTime || !wakeUpTime) return null;
  const [startH, startM] = sleepStartTime.split(':').map(Number);
  const [wakeH, wakeM] = wakeUpTime.split(':').map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(wakeH) || isNaN(wakeM)) return null;
  
  const startMin = startH * 60 + startM;
  let wakeMin = wakeH * 60 + wakeM;
  if (wakeMin <= startMin) {
    wakeMin += 24 * 60; // DORMIR EM UM DIA E ACORDAR NO OUTRO (EX: 23:00 -> 07:00)
  }
  const diffMin = wakeMin - startMin;
  const hours = Number((diffMin / 60).toFixed(2));
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  const formatted = m > 0 ? `${h}h ${m}m` : `${h}h`;
  return { hours, formatted };
};

export const calculateReadiness = (w: Omit<WellnessEntry, 'id' | 'readinessScore' | 'date'> & { isMatchDay?: boolean; emotionalReadiness?: number; psychologicalReadiness?: number }): number => {
  // Escala de 0 a 10. Maior é melhor para: Sono (Quantidade + Qualidade) e Humor. 
  // Menor é melhor para: Fadiga, Estresse, Dor, Carga Cognitiva e Viagem.
  const moodPts = w.mood !== undefined && w.mood !== null ? Number(w.mood) : 10;
  
  // Cálculo integrado dos pontos de Sono combinando Quantidade (Horas) e Qualidade
  let sleepPts = 10;
  const rawSleep = w.sleep !== undefined && w.sleep !== null ? w.sleep : w.calculatedSleepHours;
  const sleepHours = safeParseFloat(rawSleep);
  
  if (!isNaN(sleepHours)) {
    // Escala fisiológica de horas de sono (8h+ = 10 pts, 7h = 8.75 pts, 6h = 7.5 pts, 5h = 6.25 pts, 4h = 5 pts, <=2h = 2 pts)
    const durationPts = Math.min(10, Math.max(0, (sleepHours / 8) * 10));
    
    if (w.sleepQuality !== undefined && w.sleepQuality !== null) {
      const qualityPts = Number(w.sleepQuality);
      // Ponderação ponderada: 50% duração fisiológica + 50% percepção da qualidade do sono
      sleepPts = (durationPts * 0.5) + (qualityPts * 0.5);
    } else {
      sleepPts = durationPts;
    }
  } else if (w.sleepQuality !== undefined && w.sleepQuality !== null) {
    sleepPts = Number(w.sleepQuality);
  }
  
  const cognitivePts = 10 - (w.cognitiveLoad !== undefined && w.cognitiveLoad !== null ? Number(w.cognitiveLoad) : 0);
  const fatiguePts = 10 - (w.fatigue !== undefined && w.fatigue !== null ? Number(w.fatigue) : 0);
  const stressPts = 10 - (w.stress !== undefined && w.stress !== null ? Number(w.stress) : 0);
  const sorenessPts = 10 - (w.soreness !== undefined && w.soreness !== null ? Number(w.soreness) : 0);
  
  const basePts = [moodPts, sleepPts, cognitivePts, fatiguePts, stressPts, sorenessPts];

  // Em Dias de Jogo, inclua a Prontidão Emocional e Psicológica na composição do score
  if (w.isMatchDay) {
    if (w.emotionalReadiness !== undefined && w.emotionalReadiness !== null) {
      basePts.push(Number(w.emotionalReadiness));
    }
    if (w.psychologicalReadiness !== undefined && w.psychologicalReadiness !== null) {
      basePts.push(Number(w.psychologicalReadiness));
    }
  }

  // Média dos pontos (0 a 10)
  const total = basePts.reduce((sum, p) => sum + p, 0) / basePts.length;
  
  // Transformar em 0-100%
  let score = total * 10;
  
  // Modificador de Viagem (0 a 10, onde 0 é sem cansaço de viagem)
  if (w.travelFatigue) score -= (Number(w.travelFatigue) * 2);
  
  return Math.min(100, Math.max(0, Math.round(score)));
};

export const getReadinessInsight = (score: number): { text: string; color: string; action: string } => {
  if (score >= 85) {
    return {
      text: "Prontidão Máxima (Elite)",
      color: "text-green-400",
      action: "Atleta apto para treinos de alta intensidade, potência e cargas máximas. Excelente dia para estímulos neurais e recordes pessoais (PRs)."
    };
  } else if (score >= 70) {
    return {
      text: "Boa Prontidão",
      color: "text-brand-secondary",
      action: "O plano de treino pode ser seguido integralmente. Monitorar apenas se houver dor muscular muito localizada."
    };
  } else if (score >= 50) {
    return {
      text: "Estado de Atenção",
      color: "text-yellow-500",
      action: "Prontidão moderada. Considere reduzir o volume em 20% ou a intensidade (RPE) em 1-2 pontos. Foco em técnica e mobilidade."
    };
  } else {
    return {
      text: "Risco de Sobrecarga",
      color: "text-red-500",
      action: "Alto risco de lesão. Recomendado treino regenerativo, liberação miofascial ou repouso. Priorizar higiene do sono e hidratação."
    };
  }
};

export interface ReadinessCardTheme {
  level: "elite" | "good" | "moderate" | "critical" | "pending";
  label: string;
  badgeText: string;
  scoreColor: string;
  cardClasses: string;
  glowColor: string;
  iconBgClasses: string;
  insightBoxClasses: string;
  insightTitleClasses: string;
  insightTextClasses: string;
  buttonClasses: string;
  buttonText: string;
  coachGuidance: string;
  shortStatus: string;
  subtextColor: string;
  statusBadgeClasses: string;
  dividerColor: string;
}

export const getReadinessCardTheme = (score: number | null | undefined, isPending: boolean): ReadinessCardTheme => {
  if (isPending || score === null || score === undefined) {
    return {
      level: "pending",
      label: "Check-in Pendente",
      badgeText: "CHECK-IN DE HOJE PENDENTE",
      scoreColor: "text-amber-400",
      cardClasses: "bg-gradient-to-br from-[#241a02] via-[#140e01] to-slate-950 border-2 border-amber-500/70 shadow-[0_0_35px_rgba(245,158,11,0.25)] hover:border-amber-400",
      glowColor: "bg-amber-500/20",
      iconBgClasses: "bg-amber-500/20 border-amber-400/50 text-amber-400 animate-bounce",
      insightBoxClasses: "bg-amber-950/40 border border-amber-500/35 text-amber-200",
      insightTitleClasses: "text-amber-400",
      insightTextClasses: "text-amber-200/90",
      buttonClasses: "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 font-black border border-amber-300 shadow-amber-500/40 hover:brightness-110",
      buttonText: "REALIZAR CHECK-IN AGORA!",
      coachGuidance: "Check-in de prontidão pendente para hoje. Solicite que o atleta responda os dados de recuperação (sono, fadiga e dor muscular) antes de liberar as cargas principais do treino.",
      shortStatus: "Aguardando Check-in",
      subtextColor: "text-slate-400",
      statusBadgeClasses: "bg-slate-950/60 border-current/30 text-amber-400",
      dividerColor: "border-b border-white/10",
    };
  }

  if (score >= 85) {
    return {
      level: "elite",
      label: "Prontidão Máxima (Elite)",
      badgeText: "PRONTIDÃO MÁXIMA (ELITE)",
      scoreColor: "text-emerald-400",
      cardClasses: "bg-gradient-to-br from-[#022818] via-[#041910] to-[#010e08] border-2 border-emerald-500/70 shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:border-emerald-400",
      glowColor: "bg-emerald-500/25",
      iconBgClasses: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400",
      insightBoxClasses: "bg-emerald-950/45 border border-emerald-500/35 text-emerald-100",
      insightTitleClasses: "text-emerald-400",
      insightTextClasses: "text-emerald-200/90",
      buttonClasses: "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950",
      buttonText: "ATUALIZAR PRONTIDÃO",
      coachGuidance: "Atleta em pico de recuperação fisiológica e neuromuscular. Totalmente liberado para cargas máximas, tiros de alta velocidade, saltos com máxima reatividade e testes de PR. Cumprir 100% da planilha com intensidade máxima.",
      shortStatus: "100% Liberado para Alta Carga",
      subtextColor: "text-slate-400",
      statusBadgeClasses: "bg-slate-950/60 border-current/30 text-emerald-400",
      dividerColor: "border-b border-white/10",
    };
  } else if (score >= 70) {
    return {
      level: "good",
      label: "Boa Prontidão",
      badgeText: "BOA PRONTIDÃO (REGULAR)",
      scoreColor: "text-teal-300",
      cardClasses: "bg-gradient-to-br from-[#022424] via-[#041617] to-[#010e0f] border-2 border-teal-400/70 shadow-[0_0_35px_rgba(20,184,166,0.25)] hover:border-teal-300",
      glowColor: "bg-teal-400/20",
      iconBgClasses: "bg-teal-500/20 border-teal-500/50 text-teal-300",
      insightBoxClasses: "bg-teal-950/45 border border-teal-500/35 text-teal-100",
      insightTitleClasses: "text-teal-300",
      insightTextClasses: "text-teal-200/90",
      buttonClasses: "bg-teal-500/15 border border-teal-500/40 text-teal-300 hover:bg-teal-500 hover:text-slate-950",
      buttonText: "ATUALIZAR PRONTIDÃO",
      coachGuidance: "Condição física e tônus muscular adequados. O treino planejado pode ser seguido integralmente sem alterações estruturais. Monitorar apenas caso o atleta aponte desconforto muscular localizado durante o aquecimento.",
      shortStatus: "Planilha 100% Liberada",
      subtextColor: "text-slate-400",
      statusBadgeClasses: "bg-slate-950/60 border-current/30 text-teal-300",
      dividerColor: "border-b border-white/10",
    };
  } else if (score >= 50) {
    return {
      level: "moderate",
      label: "Estado de Atenção",
      badgeText: "ATENÇÃO (PRONTIDÃO MODERADA)",
      scoreColor: "text-amber-400",
      cardClasses: "bg-gradient-to-br from-[#2a1b02] via-[#170e01] to-[#0d0700] border-2 border-amber-500/80 shadow-[0_0_40px_rgba(245,158,11,0.3)] hover:border-amber-400",
      glowColor: "bg-amber-500/25",
      iconBgClasses: "bg-amber-500/20 border-amber-500/50 text-amber-400",
      insightBoxClasses: "bg-amber-950/50 border border-amber-500/40 text-amber-100",
      insightTitleClasses: "text-amber-400",
      insightTextClasses: "text-amber-200/90",
      buttonClasses: "bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-slate-950",
      buttonText: "ATUALIZAR PRONTIDÃO",
      coachGuidance: "Prontidão moderada indicando fadiga neuromuscular residual ou sono não reparador. Reduzir o volume de séries em 20% a 30% ou a intensidade (RPE) em 1-2 pontos. Priorizar técnica, mobilidade articular e aquecimento minucioso.",
      shortStatus: "Reduzir Volume (-20% a -30%)",
      subtextColor: "text-slate-400",
      statusBadgeClasses: "bg-slate-950/60 border-current/30 text-amber-400",
      dividerColor: "border-b border-white/10",
    };
  } else {
    return {
      level: "critical",
      label: "Risco de Sobrecarga",
      badgeText: "RISCO DE SOBRECARGA (CRÍTICO)",
      scoreColor: "text-red-700",
      cardClasses: "readiness-critical-card bg-gradient-to-br from-[#fee2e2] via-[#fff1f2] to-[#fecdd3] border-2 border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.35)] hover:border-red-600 text-slate-950",
      glowColor: "bg-red-400/25",
      iconBgClasses: "bg-red-600 border-red-700 text-white shadow-md animate-pulse",
      insightBoxClasses: "bg-white/95 border border-red-300 shadow-sm text-slate-900",
      insightTitleClasses: "text-red-700",
      insightTextClasses: "text-red-950",
      buttonClasses: "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black border border-red-700 shadow-md shadow-red-500/30",
      buttonText: "ATUALIZAR PRONTIDÃO",
      coachGuidance: "ALERTA DE SOBRECARGA CRÍTICA: Risco elevado de lesão musculoesquelética ou esgotamento do SNC. Vete tiros em velocidade máxima, saltos de alto impacto e cargas pesadas. Substitua por protocolo regenerativo, liberação miofascial suave ou descanso total.",
      shortStatus: "Treino Regenerativo / Repouso",
      subtextColor: "text-red-950/80 font-bold",
      statusBadgeClasses: "bg-red-200/90 border-red-400 text-red-950 font-black",
      dividerColor: "border-b border-red-200",
    };
  }
};

export const calculateWorkoutLoad = (workout: Workout, athleteWeight?: number): number => {
  let total = 0;
  if (!workout || !workout.exercises) return 0;
  
  workout.exercises.forEach(ex => {
    const special = detectSpecialMethod(ex);
    const defaultReps = parseRepetitions(special.clusterReps || ex.reps);
    const defaultWeight = parseWeightValue(ex.weight);

    if (ex.performedSets && ex.performedSets.length > 0) {
      ex.performedSets.forEach(set => {
        // Effective reps: if set.reps is specified and > 0, use set.reps; otherwise fallback to prescribed default reps
        const reps = (set.reps && set.reps > 0) ? set.reps : defaultReps;
        // Effective weight: if set.weight is 0 and athleteWeight provided, use BW; otherwise set.weight or defaultWeight
        const rawWeight = (set.weight !== undefined && set.weight !== null) ? set.weight : defaultWeight;
        const effectiveWeight = (rawWeight === 0 && athleteWeight) ? athleteWeight : rawWeight;
        
        total += reps * effectiveWeight;
      });
    } else {
      // Fallback for planned or unrecorded sets
      const numSets = ex.sets || 3;
      const effectiveWeight = (defaultWeight === 0 && athleteWeight) ? athleteWeight : defaultWeight;
      total += numSets * defaultReps * effectiveWeight;
    }
  });
  return Math.round(total);
};

export const calculateWorkoutInternalLoad = (workout: Workout): number => {
  return (workout.rpe || 0) * (workout.durationMinutes || 60);
};

export const calculateAdvancedMetrics = (workouts: Workout[], externalSessions: any[] = []) => {
  const completedWorkouts = workouts.filter(w => w.status === 'completed' && w.rpe);
  
  // Combine all sessions (gym + external)
  const allSessions = [
    ...completedWorkouts.map(w => ({ date: w.date, load: calculateWorkoutInternalLoad(w) })),
    ...externalSessions.map(s => ({ date: s.date, load: s.load || (s.durationMinutes * s.rpe) }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const last7Days = allSessions.slice(0, 7);

  if (last7Days.length === 0) return { monotony: 0, strain: 0 };

  const internalLoads = last7Days.map(s => s.load);
  const sumLoad = internalLoads.reduce((a, b) => a + b, 0);
  const meanLoad = sumLoad / last7Days.length;
  
  const variance = internalLoads.reduce((a, b) => a + Math.pow(b - meanLoad, 2), 0) / last7Days.length;
  const stdDev = Math.sqrt(variance);

  const monotony = stdDev > 0 ? parseFloat((meanLoad / stdDev).toFixed(2)) : 1.0;
  const strain = Math.round(sumLoad * monotony);

  return { monotony, strain };
};

export const calculateACWR = (workouts: Workout[], externalSessions: any[] = []) => {
  const allSessions = [
    ...workouts.filter(w => w.status === 'completed' && w.rpe).map(w => ({ date: w.date, load: calculateWorkoutInternalLoad(w) })),
    ...externalSessions.map(s => ({ date: s.date, load: s.load || (s.durationMinutes * s.rpe) }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (allSessions.length === 0) return { ratio: 1.0, acute: 0, chronic: 0, status: 'Estável', color: 'text-emerald-400' };

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  
  const twentyEightDaysAgo = new Date(today);
  twentyEightDaysAgo.setDate(today.getDate() - 28);

  const acuteSessions = allSessions.filter(s => new Date(s.date) >= sevenDaysAgo);
  const chronicSessions = allSessions.filter(s => new Date(s.date) >= twentyEightDaysAgo);

  const acuteLoad = acuteSessions.reduce((acc, s) => acc + s.load, 0) / 7;
  const chronicLoad = chronicSessions.reduce((acc, s) => acc + s.load, 0) / 28;

  const ratio = chronicLoad > 0 ? parseFloat((acuteLoad / chronicLoad).toFixed(2)) : 1.0;

  let status = 'Ideal';
  let color = 'text-emerald-400';

  if (ratio < 0.8) {
    status = 'Sub-treinado';
    color = 'text-yellow-500';
  } else if (ratio > 1.3 && ratio <= 1.5) {
    status = 'Atenção';
    color = 'text-orange-500';
  } else if (ratio > 1.5) {
    status = 'Risco Alto';
    color = 'text-red-500';
  }

  return { ratio, acute: Math.round(acuteLoad * 7), chronic: Math.round(chronicLoad * 28), status, color };
};

export const calculatePerformanceScore = (athleteOrAssessments: any) => {
  if (!athleteOrAssessments) return 0;
  
  let assessments = athleteOrAssessments.assessments || athleteOrAssessments;
  let gender = athleteOrAssessments.gender || "M";
  let dob = athleteOrAssessments.dob;
  let modality = athleteOrAssessments.modality || "";
  
  if (!assessments) return 0;
  
  const isFutebol = (modality || "").toLowerCase().includes("futebol") || (modality || "").toLowerCase().includes("soccer");
  const isFemale = gender === "F";
  const athleteAge = dob ? calculateAge(dob) : 25;
  
  const scores = [];
  
  // Power (CMJ) - Max target based on age and gender for soccer, otherwise general
  if (assessments.cmj && assessments.cmj.length > 0) {
    const list = [...assessments.cmj].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastCmj = list[0].height || 0;
    
    let targetCmjHeight = 50; // default elite target
    if (isFutebol) {
      if (isFemale) {
        if (athleteAge <= 15) targetCmjHeight = 26;
        else if (athleteAge <= 17) targetCmjHeight = 30;
        else if (athleteAge <= 20) targetCmjHeight = 33;
        else targetCmjHeight = 36;
      } else {
        if (athleteAge <= 15) targetCmjHeight = 35;
        else if (athleteAge <= 17) targetCmjHeight = 41;
        else if (athleteAge <= 20) targetCmjHeight = 44;
        else targetCmjHeight = 50;
      }
    }
    
    scores.push(Math.min((lastCmj / targetCmjHeight) * 100, 100));
  }
  
  // Strength (Isometric / IMTP) - Max based on age and gender for soccer, otherwise general
  let strengthScore = 0;
  let hasStrength = false;

  // Prioritize IMTP if available
  if (assessments.imtp && assessments.imtp.length > 0) {
    const list = [...assessments.imtp].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastImtp = list[0];
    if (lastImtp.relativePeakForce) {
      const relKgf = lastImtp.relativePeakForce > 10 ? lastImtp.relativePeakForce / 9.80665 : lastImtp.relativePeakForce;
      let targetImtpRel = isFemale ? 2.2 : 2.6; // meta calibrada para esportes coletivos e quadra
      if (isFemale) {
        if (athleteAge <= 15) targetImtpRel = 1.6;
        else if (athleteAge <= 17) targetImtpRel = 1.8;
        else if (athleteAge <= 20) targetImtpRel = 2.0;
        else targetImtpRel = 2.2;
      } else {
        if (athleteAge <= 15) targetImtpRel = 1.8;
        else if (athleteAge <= 17) targetImtpRel = 2.1;
        else if (athleteAge <= 20) targetImtpRel = 2.3;
        else targetImtpRel = 2.6;
      }
      strengthScore = Math.min((relKgf / targetImtpRel) * 100, 100);
      hasStrength = true;
    } else if (lastImtp.peakForce) {
      let targetPeakForce = isFemale ? 260 : 350;
      if (isFutebol) {
        if (isFemale) {
          if (athleteAge <= 15) targetPeakForce = 160;
          else if (athleteAge <= 17) targetPeakForce = 200;
          else if (athleteAge <= 20) targetPeakForce = 230;
          else targetPeakForce = 260;
        } else {
          if (athleteAge <= 15) targetPeakForce = 230;
          else if (athleteAge <= 17) targetPeakForce = 290;
          else if (athleteAge <= 20) targetPeakForce = 330;
          else targetPeakForce = 420;
        }
      }
      strengthScore = Math.min((lastImtp.peakForce / targetPeakForce) * 100, 100);
      hasStrength = true;
    }
  }

  // Fallback to isometricStrength
  if (!hasStrength && assessments.isometricStrength && assessments.isometricStrength.length > 0) {
    const list = [...assessments.isometricStrength].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastStr = list[0];
    if (lastStr.halfSquatKgf) {
      let targetPeakForce = isFemale ? 260 : 350;
      strengthScore = Math.min((lastStr.halfSquatKgf / targetPeakForce) * 100, 100);
      hasStrength = true;
    } else {
      // Calculate from Sum of Quadriceps R/L if halfSquatKgf is not entered
      const totalIsometric = (lastStr.quadricepsR || 0) + 
                             (lastStr.quadricepsL || 0) + 
                             (lastStr.hamstringsR || 0) + 
                             (lastStr.hamstringsL || 0);
      if (totalIsometric > 0) {
        let targetPeakForce = isFemale ? 260 : 350;
        strengthScore = Math.min((totalIsometric / targetPeakForce) * 100, 100);
        hasStrength = true;
      }
    }
  }

  if (hasStrength) {
    scores.push(strengthScore);
  }
  
  // Aerobic (VO2) - Max 80 ml/kg/min for elite
  if (assessments.vo2max && assessments.vo2max.length > 0) {
    const list = [...assessments.vo2max].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastVo2 = list[0].vo2max || 0;
    scores.push(Math.min((lastVo2 / 80) * 100, 100));
  }
  
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
};

export const getInjuryRiskLevel = (acwr: number, fatigue: number, readiness: number) => {
  let riskPoints = 0;
  
  // ACWR Factor (The Sweet Spot is 0.8 - 1.3)
  if (acwr > 1.5 || acwr < 0.5) riskPoints += 40;
  else if (acwr > 1.3 || acwr < 0.8) riskPoints += 20;
  
  // Fatigue Factor (Scale 0-10, where 10 is high fatigue)
  if (fatigue >= 8) riskPoints += 30;
  else if (fatigue >= 6) riskPoints += 15;
  
  // Readiness Factor
  if (readiness < 60) riskPoints += 30;
  else if (readiness < 80) riskPoints += 10;
  
  const total = Math.min(riskPoints, 100);
  
  if (total < 30) return { level: 'Baixo', color: 'text-emerald-500', bg: 'bg-emerald-500', value: total };
  if (total < 60) return { level: 'Moderado', color: 'text-yellow-500', bg: 'bg-yellow-500', value: total };
  if (total < 85) return { level: 'Alto', color: 'text-orange-500', bg: 'bg-orange-500', value: total };
  return { level: 'Extremo', color: 'text-red-500', bg: 'bg-red-50', value: total };
};

export const getAsymmetryStatus = (sideA: number, sideB: number): AsymmetryStatus => {
  if (!sideA || !sideB) return { value: 0, status: 'Aceitável', color: 'text-green-500' };
  const max = Math.max(sideA, sideB);
  const min = Math.min(sideA, sideB);
  const val = parseFloat(((max - min) / max * 100).toFixed(1));

  if (val <= 10) return { value: val, status: 'Aceitável', color: 'text-green-500' };
  if (val <= 15) return { value: val, status: 'Atenção', color: 'text-yellow-500' };
  return { value: val, status: 'Crítico', color: 'text-red-500' };
};

export const getIQRatioStatus = (hamstring: number, quadriceps: number): IQRatioStatus => {
    if (!quadriceps) return { ratio: 0, status: 'Risco Crítico', color: 'text-red-500' };
    const ratio = parseFloat(((hamstring / quadriceps) * 100).toFixed(1));
    
    // Ideal: 50 a 60%
    if (ratio >= 50 && ratio <= 60) {
        return { ratio, status: 'Ideal', color: 'text-emerald-500' };
    }
    // Atenção: 45-50% ou 60-65%
    if ((ratio >= 45 && ratio < 50) || (ratio > 60 && ratio <= 65)) {
        return { ratio, status: 'Atenção', color: 'text-yellow-500' };
    }
    // Risco: < 45% ou > 65%
    return { ratio, status: 'Desequilíbrio', color: 'text-red-500' };
};

export const calculateFlightTimeFromHeight = (heightCm: number): number => {
  if (!heightCm) return 0;
  const heightM = heightCm / 100;
  const g = 9.81;
  const timeS = Math.sqrt((8 * heightM) / g);
  return Math.round(timeS * 1000); 
};

export const calculateHeightFromFlightTime = (flightTimeMs: number): number => {
  if (!flightTimeMs) return 0;
  const t = flightTimeMs / 1000;
  const g = 9.81;
  const heightM = (g * t * t) / 8;
  return parseFloat((heightM * 100).toFixed(2)); // height in cm
};

export const calculateCMJPakPower = (heightCm: number, weightKg: number): number => {
  if (!heightCm || !weightKg) return 0;
  // Sayers Peak Power Formula:
  // Peak Power (W) = 60.7 * Height(cm) + 45.3 * Weight(kg) - 2055
  const power = 60.7 * heightCm + 45.3 * weightKg - 2055;
  return Math.max(0, Math.round(power));
};

export const calculateCMJAverageForce = (heightCm: number, weightKg: number, depthCm?: number): number => {
  if (!heightCm || !weightKg) return 0;
  const d = depthCm && depthCm > 0 ? depthCm : 35; // default to 35cm
  // Linthorne / Work-Energy: F_mean = m * g * (1 + h/d)
  const g = 9.81;
  const force = weightKg * g * (1 + heightCm / d);
  return Math.max(0, Math.round(force));
};

export const calculateRSI = (heightCm: number, flightTimeMs: number): number => {
    if (!heightCm || !flightTimeMs) return 0;
    const heightM = heightCm / 100;
    const flightTimeS = flightTimeMs / 1000;
    return parseFloat((heightM / flightTimeS).toFixed(2));
};

export const getSafeDateTime = (dateStr: any): number => {
  if (!dateStr) return 0;
  if (dateStr instanceof Date) {
    const t = dateStr.getTime();
    return isNaN(t) ? 0 : t;
  }
  if (typeof dateStr !== 'string') {
    return 0;
  }
  // Remove possible whitespace or time segments for cleaner matching
  const cleaned = dateStr.trim();
  
  // Try normal Date.parse
  let parsed = Date.parse(cleaned);
  if (!isNaN(parsed)) {
    return parsed;
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY
  const parts = cleaned.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1;
    const year = parseInt(parts[3], 10);
    const d = new Date(year, month, day);
    const t = d.getTime();
    return isNaN(t) ? 0 : t;
  }

  // Handle YYYY/MM/DD or YYYY-MM-DD
  const isoParts = cleaned.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})/);
  if (isoParts) {
    const year = parseInt(isoParts[1], 10);
    const month = parseInt(isoParts[2], 10) - 1;
    const day = parseInt(isoParts[3], 10);
    const d = new Date(year, month, day);
    const t = d.getTime();
    return isNaN(t) ? 0 : t;
  }

  return 0;
};

export const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) {
      // Try to parse using getSafeDateTime
      const t = getSafeDateTime(dateString);
      if (t > 0) {
        return new Date(t).toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: '2-digit',
            timeZone: 'UTC' 
        });
      }
      return dateString || "";
    }
    return d.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: '2-digit',
        timeZone: 'UTC' 
    });
};

export const getDiff = (current: number | undefined, previous: number | undefined, inverse = false) => {
  const cur = current || 0;
  const prev = previous || 0;
  
  if (!prev) return {
    value: '0.0',
    percent: '0.0',
    isGood: true,
    isPositive: true,
    color: 'text-slate-400',
    icon: '-'
  };

  const diff = cur - prev;
  const percent = (diff / prev) * 100;
  const isPositive = diff > 0;
  const isGood = inverse ? !isPositive : isPositive;
  
  return {
    value: diff.toFixed(1),
    percent: Math.abs(percent).toFixed(1),
    isGood,
    isPositive,
    color: isGood ? 'text-emerald-400' : 'text-red-400',
    icon: isPositive ? '↑' : '↓'
  };
};

export const getPreviousAssessment = <T extends { date: string; id: string }>(current: T, history: T[]): T | undefined => {
  const sorted = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const currentIndex = sorted.findIndex(item => item.id === current.id);
  return sorted[currentIndex + 1];
};

export const calculateWeeklyEvolution = (workouts: Workout[]) => {
  const completed = workouts.filter(w => w.status === 'completed' && w.date);
  const weeks: Record<string, number> = {};
  
  completed.forEach(w => {
    const d = new Date(w.date);
    const dCopy = new Date(d.getTime());
    dCopy.setHours(0, 0, 0, 0);
    dCopy.setDate(dCopy.getDate() + 4 - (dCopy.getDay() || 7));
    const yearStart = new Date(dCopy.getFullYear(), 0, 1);
    const weekNum = Math.ceil((((dCopy.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const weekKey = `Sem ${weekNum}/${d.getFullYear().toString().slice(2)}`;
    
    const load = calculateWorkoutInternalLoad(w);
    weeks[weekKey] = (weeks[weekKey] || 0) + load;
  });
  
  return Object.entries(weeks)
    .map(([name, load]) => ({ name, load }))
    .sort((a, b) => {
        const [aSem, aYear] = a.name.split(' ')[1].split('/');
        const [bSem, bYear] = b.name.split(' ')[1].split('/');
        if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
        return parseInt(aSem) - parseInt(bSem);
    })
    .slice(-10);
};

export const getFatPercentageClassification = (fat: number, age: number, gender: 'M' | 'F'): { label: string; color: string } => {
  if (!fat) return { label: '-', color: 'text-slate-400' };

  if (gender === 'M') {
    if (age <= 29) {
      if (fat < 8) return { label: 'Atleta', color: 'text-cyan-400' };
      if (fat <= 13) return { label: 'Excelente', color: 'text-emerald-400' };
      if (fat <= 20) return { label: 'Normal', color: 'text-green-500' };
      if (fat <= 25) return { label: 'Elevado', color: 'text-yellow-500' };
      return { label: 'Obesidade', color: 'text-red-500' };
    } else if (age <= 39) {
      if (fat < 11) return { label: 'Atleta', color: 'text-cyan-400' };
      if (fat <= 18) return { label: 'Excelente', color: 'text-emerald-400' };
      if (fat <= 21) return { label: 'Normal', color: 'text-green-500' };
      if (fat <= 26) return { label: 'Elevado', color: 'text-yellow-500' };
      return { label: 'Obesidade', color: 'text-red-500' };
    } else if (age <= 49) {
      if (fat < 13) return { label: 'Atleta', color: 'text-cyan-400' };
      if (fat <= 21) return { label: 'Excelente', color: 'text-emerald-400' };
      if (fat <= 24) return { label: 'Normal', color: 'text-green-500' };
      if (fat <= 28) return { label: 'Elevado', color: 'text-yellow-500' };
      return { label: 'Obesidade', color: 'text-red-500' };
    } else {
      if (fat < 15) return { label: 'Atleta', color: 'text-cyan-400' };
      if (fat <= 25) return { label: 'Excelente', color: 'text-emerald-400' };
      if (fat <= 28) return { label: 'Normal', color: 'text-green-500' };
      if (fat <= 30) return { label: 'Elevado', color: 'text-yellow-500' };
      return { label: 'Obesidade', color: 'text-red-500' };
    }
  } else {
    // Female
    if (age <= 29) {
      if (fat < 14) return { label: 'Atleta', color: 'text-cyan-400' };
      if (fat <= 19) return { label: 'Excelente', color: 'text-emerald-400' };
      if (fat <= 23) return { label: 'Normal', color: 'text-green-500' };
      if (fat <= 29) return { label: 'Elevado', color: 'text-yellow-500' };
      return { label: 'Obesidade', color: 'text-red-500' };
    } else if (age <= 39) {
      if (fat < 16) return { label: 'Atleta', color: 'text-cyan-400' };
      if (fat <= 22) return { label: 'Excelente', color: 'text-emerald-400' };
      if (fat <= 25) return { label: 'Normal', color: 'text-green-500' };
      if (fat <= 30) return { label: 'Elevado', color: 'text-yellow-500' };
      return { label: 'Obesidade', color: 'text-red-500' };
    } else if (age <= 49) {
      if (fat < 19) return { label: 'Atleta', color: 'text-cyan-400' };
      if (fat <= 25) return { label: 'Excelente', color: 'text-emerald-400' };
      if (fat <= 29) return { label: 'Normal', color: 'text-green-500' };
      if (fat <= 33) return { label: 'Elevado', color: 'text-yellow-500' };
      return { label: 'Obesidade', color: 'text-red-500' };
    } else {
      if (fat < 22) return { label: 'Atleta', color: 'text-cyan-400' };
      if (fat <= 29) return { label: 'Excelente', color: 'text-emerald-400' };
      if (fat <= 33) return { label: 'Normal', color: 'text-green-500' };
      if (fat <= 36) return { label: 'Elevado', color: 'text-yellow-500' };
      return { label: 'Obesidade', color: 'text-red-500' };
    }
  }
};

export interface FatRangeInfo {
  label: string;
  range: string;
  color: string;
  desc: string;
}

export const getFatRangesByAgeAndGender = (age: number, gender: 'M' | 'F'): FatRangeInfo[] => {
  if (gender === 'M') {
    if (age <= 29) {
      return [
        { label: "Atleta", range: "< 8%", color: "from-cyan-400 to-cyan-500", desc: "Condicionamento elite." },
        { label: "Excelente", range: "8 - 13%", color: "from-emerald-400 to-emerald-500", desc: "Ótimo estado neuromuscular." },
        { label: "Normal", range: "14 - 20%", color: "from-green-500 to-green-600", desc: "Faixa saudável e normalizada." },
        { label: "Elevado", range: "21 - 25%", color: "from-yellow-400 to-yellow-500", desc: "Atenção clínica moderada." },
        { label: "Obesidade", range: "> 25%", color: "from-red-500 to-red-600", desc: "Fatores de risco cardiovascular." }
      ];
    } else if (age <= 39) {
      return [
        { label: "Atleta", range: "< 11%", color: "from-cyan-400 to-cyan-500", desc: "Condicionamento elite." },
        { label: "Excelente", range: "11 - 18%", color: "from-emerald-400 to-emerald-500", desc: "Ótimo estado neuromuscular." },
        { label: "Normal", range: "19 - 21%", color: "from-green-500 to-green-600", desc: "Faixa saudável e normalizada." },
        { label: "Elevado", range: "22 - 26%", color: "from-yellow-400 to-yellow-500", desc: "Atenção clínica moderada." },
        { label: "Obesidade", range: "> 26%", color: "from-red-500 to-red-600", desc: "Fatores de risco cardiovascular." }
      ];
    } else if (age <= 49) {
      return [
        { label: "Atleta", range: "< 13%", color: "from-cyan-400 to-cyan-500", desc: "Condicionamento elite." },
        { label: "Excelente", range: "13 - 21%", color: "from-emerald-400 to-emerald-500", desc: "Ótimo estado neuromuscular." },
        { label: "Normal", range: "22 - 24%", color: "from-green-500 to-green-600", desc: "Faixa saudável e normalizada." },
        { label: "Elevado", range: "25 - 28%", color: "from-yellow-400 to-yellow-500", desc: "Atenção clínica moderada." },
        { label: "Obesidade", range: "> 28%", color: "from-red-500 to-red-600", desc: "Fatores de risco cardiovascular." }
      ];
    } else {
      return [
        { label: "Atleta", range: "< 15%", color: "from-cyan-400 to-cyan-500", desc: "Condicionamento elite." },
        { label: "Excelente", range: "15 - 25%", color: "from-emerald-400 to-emerald-500", desc: "Ótimo estado neuromuscular." },
        { label: "Normal", range: "26 - 28%", color: "from-green-500 to-green-600", desc: "Faixa saudável e normalizada." },
        { label: "Elevado", range: "29 - 30%", color: "from-yellow-400 to-yellow-500", desc: "Atenção clínica moderada." },
        { label: "Obesidade", range: "> 30%", color: "from-red-500 to-red-600", desc: "Fatores de risco cardiovascular." }
      ];
    }
  } else {
    // Female
    if (age <= 29) {
      return [
        { label: "Atleta", range: "< 14%", color: "from-cyan-400 to-cyan-500", desc: "Condicionamento elite." },
        { label: "Excelente", range: "14 - 19%", color: "from-emerald-400 to-emerald-500", desc: "Ótimo estado neuromuscular." },
        { label: "Normal", range: "20 - 23%", color: "from-green-500 to-green-600", desc: "Faixa saudável e normalizada." },
        { label: "Elevado", range: "24 - 29%", color: "from-yellow-400 to-yellow-500", desc: "Atenção clínica moderada." },
        { label: "Obesidade", range: "> 29%", color: "from-red-500 to-red-600", desc: "Fatores de risco cardiovascular." }
      ];
    } else if (age <= 39) {
      return [
        { label: "Atleta", range: "< 16%", color: "from-cyan-400 to-cyan-500", desc: "Condicionamento elite." },
        { label: "Excelente", range: "16 - 22%", color: "from-emerald-400 to-emerald-500", desc: "Ótimo estado neuromuscular." },
        { label: "Normal", range: "23 - 25%", color: "from-green-500 to-green-600", desc: "Faixa saudável e normalizada." },
        { label: "Elevado", range: "26 - 30%", color: "from-yellow-400 to-yellow-500", desc: "Atenção clínica moderada." },
        { label: "Obesidade", range: "> 30%", color: "from-red-500 to-red-600", desc: "Fatores de risco cardiovascular." }
      ];
    } else if (age <= 49) {
      return [
        { label: "Atleta", range: "< 19%", color: "from-cyan-400 to-cyan-500", desc: "Condicionamento elite." },
        { label: "Excelente", range: "19 - 25%", color: "from-emerald-400 to-emerald-500", desc: "Ótimo estado neuromuscular." },
        { label: "Normal", range: "26 - 29%", color: "from-green-500 to-green-600", desc: "Faixa saudável e normalizada." },
        { label: "Elevado", range: "30 - 33%", color: "from-yellow-400 to-yellow-500", desc: "Atenção clínica moderada." },
        { label: "Obesidade", range: "> 33%", color: "from-red-500 to-red-600", desc: "Fatores de risco cardiovascular." }
      ];
    } else {
      return [
        { label: "Atleta", range: "< 22%", color: "from-cyan-400 to-cyan-500", desc: "Condicionamento elite." },
        { label: "Excelente", range: "22 - 29%", color: "from-emerald-400 to-emerald-500", desc: "Ótimo estado neuromuscular." },
        { label: "Normal", range: "30 - 33%", color: "from-green-500 to-green-600", desc: "Faixa saudável e normalizada." },
        { label: "Elevado", range: "34 - 36%", color: "from-yellow-400 to-yellow-500", desc: "Atenção clínica moderada." },
        { label: "Obesidade", range: "> 36%", color: "from-red-500 to-red-600", desc: "Fatores de risk cardiovascular." }
      ];
    }
  }
};

export const getLocalDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isBirthdayToday = (dobString?: string, todayStr?: string): boolean => {
  if (!dobString) return false;
  const currentToday = todayStr || getLocalDateString();
  const cleanDob = dobString.includes("T") ? dobString.split("T")[0] : dobString.trim();
  const todayParts = currentToday.split("-");
  if (todayParts.length < 3) return false;
  const currentMonth = parseInt(todayParts[1], 10);
  const currentDay = parseInt(todayParts[2], 10);

  if (cleanDob.includes("-")) {
    const parts = cleanDob.split("-");
    if (parts.length >= 3) {
      const birthMonth = parseInt(parts[1], 10);
      const birthDay = parseInt(parts[2], 10);
      return birthMonth === currentMonth && birthDay === currentDay;
    }
  } else if (cleanDob.includes("/")) {
    const parts = cleanDob.split("/");
    if (parts.length >= 3) {
      const birthDay = parseInt(parts[0], 10);
      const birthMonth = parseInt(parts[1], 10);
      return birthMonth === currentMonth && birthDay === currentDay;
    }
  }
  return false;
};

export const formatCompetitiveLevel = (level?: string, modality?: string): string => {
  const l = (level || "").toLowerCase();
  const isFutebol = (modality || "").toLowerCase().includes("futebol") || (modality || "").toLowerCase().includes("soccer");
  if (l === "amador" || l === "dev") return isFutebol ? "Futebol Dev" : "Em Desenvolvimento";
  if (l === "competitivo" || l === "comp") return isFutebol ? "Futebol Competitivo" : "Competitivo";
  if (l === "avancado" || l === "adv") return isFutebol ? "Futebol Avançado" : "Avançado";
  if (l === "elite") return isFutebol ? "Futebol Elite" : "Elite Mundial";
  return level || "Geral";
};

export function getEmbedVideoInfo(url?: string): {
  type: "youtube" | "vimeo" | "direct" | "unknown";
  embedUrl: string | null;
  rawUrl: string;
} | null {
  if (!url || !url.trim()) return null;
  const rawUrl = url.trim();

  // YouTube match (watch, embed, shorts, youtu.be)
  const ytMatch = rawUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return {
      type: "youtube",
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`,
      rawUrl,
    };
  }

  // Vimeo match
  const vimeoMatch = rawUrl.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      rawUrl,
    };
  }

  // Direct MP4 or WebM or OGG video
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(rawUrl)) {
    return {
      type: "direct",
      embedUrl: rawUrl,
      rawUrl,
    };
  }

  return {
    type: "unknown",
    embedUrl: rawUrl,
    rawUrl,
  };
}

export const isTimeExercise = (ex?: { repsType?: string; reps?: string | number } | null): boolean => {
  if (!ex) return false;
  if (ex.repsType === "time" || (ex.repsType as string)?.toLowerCase() === "time") return true;
  if (typeof ex.reps === "string") {
    const lower = ex.reps.toLowerCase().trim();
    if (lower.includes("s") || lower.includes("seg") || lower.includes("min") || lower.includes("tempo") || lower.includes("sec")) {
      return true;
    }
  }
  return false;
};

export const getDeletedItemIds = (): Set<string> => {
  try {
    if (typeof localStorage === 'undefined') return new Set();
    const raw = localStorage.getItem('lb_deleted_item_ids');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (e) {}
  return new Set();
};

export const recordDeletedItemId = (id: string) => {
  if (!id) return;
  try {
    if (typeof localStorage === 'undefined') return;
    const set = getDeletedItemIds();
    set.add(id);
    const arr = Array.from(set).slice(-500);
    localStorage.setItem('lb_deleted_item_ids', JSON.stringify(arr));
  } catch (e) {}
};

export function mergeArrayById<T extends { id: string; date?: string; updatedAt?: string; status?: string }>(
  localArr: T[] = [],
  remoteArr: T[] = [],
  deletedIds: Set<string> = getDeletedItemIds()
): T[] {
  const mergedMap = new Map<string, T>();

  // Add remote items if not deleted
  for (const item of remoteArr) {
    if (item && item.id && !deletedIds.has(item.id)) {
      mergedMap.set(item.id, item);
    }
  }

  // Merge local items
  for (const item of localArr) {
    if (item && item.id && !deletedIds.has(item.id)) {
      const existing = mergedMap.get(item.id);
      if (!existing) {
        // Local item created offline or not yet on server -> keep!
        mergedMap.set(item.id, item);
      } else {
        const localTime = (item.updatedAt || (item as any).updated_at) ? getSafeDateTime(item.updatedAt || (item as any).updated_at) : 0;
        const remoteTime = (existing.updatedAt || (existing as any).updated_at) ? getSafeDateTime(existing.updatedAt || (existing as any).updated_at) : 0;

        if (localTime > remoteTime || (item.status === 'completed' && existing.status !== 'completed')) {
          // Local item is newer (e.g. edited offline or pending immediate sync)
          mergedMap.set(item.id, { ...existing, ...item });
        } else {
          // Remote DB item is newer or equal -> remote takes precedence
          mergedMap.set(item.id, { ...item, ...existing });
        }
      }
    }
  }

  return Array.from(mergedMap.values());
}

export function mergeAthletesWithLocalCache(
  localAthletes: Athlete[] = [],
  remoteAthletes: Athlete[] = []
): Athlete[] {
  const deletedIds = getDeletedItemIds();
  const mergedMap = new Map<string, Athlete>();

  // Add remote athletes if not deleted
  for (const rAth of remoteAthletes) {
    if (rAth && rAth.id && !deletedIds.has(rAth.id)) {
      mergedMap.set(rAth.id, rAth);
    }
  }

  // Merge local athletes
  for (const lAth of localAthletes) {
    if (!lAth || !lAth.id || deletedIds.has(lAth.id)) continue;
    const rAth = mergedMap.get(lAth.id);

    if (!rAth) {
      // Local athlete created offline -> keep!
      mergedMap.set(lAth.id, lAth);
    } else {
      // Merge all arrays safely
      const mergedWellness = mergeArrayById(lAth.wellness || [], rAth.wellness || [], deletedIds)
        .sort((a, b) => getSafeDateTime(b.date) - getSafeDateTime(a.date));

      const mergedWorkouts = mergeArrayById(lAth.workouts || [], rAth.workouts || [], deletedIds)
        .sort((a, b) => getSafeDateTime(b.date || (b as any).updatedAt) - getSafeDateTime(a.date || (a as any).updatedAt));

      const mergedExternalSessions = mergeArrayById(lAth.externalSessions || [], rAth.externalSessions || [], deletedIds)
        .sort((a, b) => getSafeDateTime(b.date) - getSafeDateTime(a.date));

      const lAsm = lAth.assessments || { bioimpedance: [], isometricStrength: [], imtp: [], cmj: [], dropJump: [], vo2max: [], speed: [] };
      const rAsm = rAth.assessments || { bioimpedance: [], isometricStrength: [], imtp: [], cmj: [], dropJump: [], vo2max: [], speed: [] };

      const mergedAssessments = {
        bioimpedance: mergeArrayById(lAsm.bioimpedance || [], rAsm.bioimpedance || [], deletedIds)
          .sort((a, b) => getSafeDateTime(b.date) - getSafeDateTime(a.date)),
        isometricStrength: mergeArrayById(lAsm.isometricStrength || [], rAsm.isometricStrength || [], deletedIds)
          .sort((a, b) => getSafeDateTime(b.date) - getSafeDateTime(a.date)),
        imtp: mergeArrayById(lAsm.imtp || [], rAsm.imtp || [], deletedIds)
          .sort((a, b) => getSafeDateTime(b.date) - getSafeDateTime(a.date)),
        cmj: mergeArrayById(lAsm.cmj || [], rAsm.cmj || [], deletedIds)
          .sort((a, b) => getSafeDateTime(b.date) - getSafeDateTime(a.date)),
        dropJump: mergeArrayById(lAsm.dropJump || [], rAsm.dropJump || [], deletedIds)
          .sort((a, b) => getSafeDateTime(b.date) - getSafeDateTime(a.date)),
        vo2max: mergeArrayById(lAsm.vo2max || [], rAsm.vo2max || [], deletedIds)
          .sort((a, b) => getSafeDateTime(b.date) - getSafeDateTime(a.date)),
        speed: mergeArrayById(lAsm.speed || [], rAsm.speed || [], deletedIds)
          .sort((a, b) => getSafeDateTime(b.date) - getSafeDateTime(a.date)),
        postural: mergeArrayById(lAsm.postural || [], rAsm.postural || [], deletedIds)
          .sort((a, b) => getSafeDateTime(b.date) - getSafeDateTime(a.date)),
      };

      mergedMap.set(lAth.id, {
        ...lAth,
        ...rAth,
        wellness: mergedWellness,
        workouts: mergedWorkouts,
        externalSessions: mergedExternalSessions,
        assessments: mergedAssessments,
      });
    }
  }

  return Array.from(mergedMap.values());
}

