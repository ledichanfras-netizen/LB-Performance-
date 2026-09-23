
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

  // 11. Tiros Curtos / RSA (Repeated Sprint Ability)
  if (
    nameLower.includes("rsa") || 
    nameLower.includes("tiro") || 
    nameLower.includes("sprint") || 
    notesLower.includes("rsa") || 
    notesLower.includes("tiros curtos") ||
    repsStr.toLowerCase().includes("x") && repsStr.toLowerCase().includes("m")
  ) {
    return {
      method: 'sprint_rsa',
      intraSetRest: ex.intraSetRest ?? 20,
      rest: ex.rest || "2m30s"
    };
  }

  // 12. Pirâmide de Campo / Quadra
  if (
    nameLower.includes("pirâmide") || 
    nameLower.includes("piramide") || 
    notesLower.includes("pirâmide") || 
    notesLower.includes("pyramid") ||
    (repsStr.includes("-") && repsStr.toLowerCase().includes("m"))
  ) {
    return {
      method: 'pyramid_field',
      intraSetRest: ex.intraSetRest ?? 30,
      rest: ex.rest || "3min"
    };
  }

  // 13. Fartlek Intermitente
  if (nameLower.includes("fartlek") || notesLower.includes("fartlek") || repsStr.toLowerCase().includes("15s:15s") || repsStr.toLowerCase().includes("30s:30s")) {
    return {
      method: 'fartlek',
      intraSetRest: ex.intraSetRest ?? 15,
      rest: ex.rest || "2m30s"
    };
  }

  // 14. Shuttle Run / Vai-e-Vem (COD & Frenagem)
  if (
    nameLower.includes("shuttle") || 
    nameLower.includes("vai-e-vem") || 
    nameLower.includes("vai e vem") || 
    notesLower.includes("shuttle") || 
    notesLower.includes("vai-e-vem") ||
    nameLower.includes("pro agility")
  ) {
    return {
      method: 'shuttle_run',
      intraSetRest: ex.intraSetRest ?? 60,
      rest: ex.rest || "60s"
    };
  }

  return { method: 'standard', rest: ex.rest || "90s" };
};

// Metadata for rendering special training methods
export const getSpecialMethodMeta = (method?: AdvancedExecutionMethod) => {
  switch (method) {
    case 'cluster':
      return {
        id: 'cluster' as const,
        name: 'Cluster Set',
        badge: '🎯 Cluster Set',
        icon: '🎯',
        bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        cardBg: 'bg-purple-500/10 dark:bg-purple-950/25 border-purple-500/30 text-purple-200',
        activeRing: 'ring-purple-500/40 border-purple-500',
        accentColor: 'text-purple-400',
        buttonBg: 'bg-purple-600 hover:bg-purple-500 text-white',
        description: 'Sub-blocos com micro-pausa na barra (15-20s) para preservar a velocidade e recrutamento de motoneurônios de alto limiar sem acúmulo excessivo de lactato.',
        scientificRationale: 'Fracionar a série em clusters (ex: 2+2+2 ou 3+3) com micro-pausas intra-série (15s a 25s) preserva os estoques de fosfocreatina (PCr), reduz a acidose intramuscular e sustenta a velocidade de pico da barra em todas as repetições sem queda de potência mecânica.',
        defaultSets: 3,
        defaultReps: '2+2+2',
        defaultWeight: '85-90% 1RM',
        defaultRest: '2m30s',
        defaultIntraRest: 20,
        defaultInterRest: '2m30s',
        repsPresets: ['2+2+2', '3+3', '1+1+1+1', '2+2+2+2', '4+4'],
        restPresets: ['1m30s', '2min', '2m30s', '3min'],
        intraRestPresets: [15, 20, 25, 30]
      };
    case 'complex_contrast':
      return {
        id: 'complex_contrast' as const,
        name: 'Contraste Francês / Complex PAP',
        badge: '🇫🇷 Complexo PAP',
        icon: '🇫🇷',
        bg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        cardBg: 'bg-cyan-500/10 dark:bg-cyan-950/25 border-cyan-500/30 text-cyan-200',
        activeRing: 'ring-cyan-500/40 border-cyan-500',
        accentColor: 'text-cyan-400',
        buttonBg: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950',
        description: 'Potenciação pós-ativação e potencialização pós-exercício (PAP/PAPE) combinando 4 estágios: carga pesada (>80% 1RM), pliometria com carga, velocidade balística e pliometria reativa.',
        scientificRationale: 'Utiliza o fenômeno de Potenciação Pós-Ativação (PAPE) onde a contração prévia pesada (1A @ 80-85% 1RM) aumenta a sensibilidade ao cálcio e a taxa de disparo neural. Transições curtas (~20s) transferem essa facilitação neuromuscular para saltos carregados (1B), aceleração balística (1C) e pliometria reativa com RSI alto (1D).',
        defaultSets: 3,
        defaultReps: '3',
        defaultWeight: '85% 1RM',
        defaultRest: '20s',
        defaultIntraRest: 20,
        defaultInterRest: '3m30s',
        repsPresets: ['3', '4', '5'],
        restPresets: ['20s', '30s', '2min', '3m30s', '4min'],
        intraRestPresets: [15, 20, 30, 45]
      };
    case 'rest_pause':
      return {
        id: 'rest_pause' as const,
        name: 'Rest-Pause',
        badge: '🔥 Rest-Pause',
        icon: '🔥',
        bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        cardBg: 'bg-rose-500/10 dark:bg-rose-950/25 border-rose-500/30 text-rose-200',
        activeRing: 'ring-rose-500/40 border-rose-500',
        accentColor: 'text-rose-400',
        buttonBg: 'bg-rose-600 hover:bg-rose-500 text-white',
        description: 'Série levada à fadiga (RPE 9) seguida de micro-pausas curtas (15s) para recrutar o máximo de unidades motoras com alto estresse metabólico e tensão mecânica.',
        scientificRationale: 'A série inicial atinge o limiar máximo de recrutamento motor sob fadiga (RPE 9-9.5). A micro-pausa de 10s-15s permite ressíntese parcial de ATP/PCr e alívio transitório do influxo de íons H+, permitindo realizar mini-séries consecutivas de 2 a 3 reps no limite da capacidade neuromuscular.',
        defaultSets: 3,
        defaultReps: '8+3+2',
        defaultWeight: '80-85% 1RM (RPE 9)',
        defaultRest: '2min',
        defaultIntraRest: 15,
        defaultInterRest: '2min',
        repsPresets: ['8+3+2', '10+4+3', '6+3+2+1', '8+4+3'],
        restPresets: ['1m30s', '2min', '2m30s', '3min'],
        intraRestPresets: [10, 15, 20, 25]
      };
    case 'drop_set':
      return {
        id: 'drop_set' as const,
        name: 'Drop-Set',
        badge: '📉 Drop-Set',
        icon: '📉',
        bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        cardBg: 'bg-amber-500/10 dark:bg-amber-950/25 border-amber-500/30 text-amber-200',
        activeRing: 'ring-amber-500/40 border-amber-500',
        accentColor: 'text-amber-400',
        buttonBg: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
        description: 'Série inicial pesada até a falha técnica seguida de reduções imediatas de carga (-20% a -30%) sem descanso, exaurindo todas as fibras musculares.',
        scientificRationale: 'Ao atingir a falha concêntrica na carga principal (75-80% 1RM), a redução imediata da carga (-20% a -25%) permite manter o recrutamento de fibras do tipo II sob alto estresse metabólico, hipóxia tecidual e acúmulo de metabólitos, estimulando hipertrofia e resistência de força.',
        defaultSets: 3,
        defaultReps: '8+8+8',
        defaultWeight: '75-80% 1RM (-20% por queda)',
        defaultRest: '2min',
        defaultIntraRest: 5,
        defaultInterRest: '2min',
        repsPresets: ['8+8+8', '10+8+6', '6+6+6', '10+10+10'],
        restPresets: ['1m30s', '2min', '2m30s', '3min'],
        intraRestPresets: [0, 5, 10]
      };
    case 'bi_set':
      return {
        id: 'bi_set' as const,
        name: 'Bi-Set',
        badge: '⚡ Bi-Set',
        icon: '⚡',
        bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        cardBg: 'bg-blue-500/10 dark:bg-blue-950/25 border-blue-500/30 text-blue-200',
        activeRing: 'ring-blue-500/40 border-blue-500',
        accentColor: 'text-blue-400',
        buttonBg: 'bg-blue-600 hover:bg-blue-500 text-white',
        description: 'Dois exercícios executados em sequência contínua sem descanso para o mesmo grupamento muscular (ou agonista/antagonista).',
        scientificRationale: 'Aumenta a densidade da sessão (trabalho/tempo) e o estresse mecânico no grupo muscular alvo. A combinação de dois ângulos articulares ou curvas de resistência distintas potencializa o recrutamento de diferentes feixes musculares.',
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: '70-75% 1RM',
        defaultRest: '90s',
        defaultIntraRest: 10,
        defaultInterRest: '90s',
        repsPresets: ['10-12', '8-10', '12-15', '10+10', '12+10'],
        restPresets: ['60s', '90s', '2min', '2m30s'],
        intraRestPresets: [0, 5, 10, 15]
      };
    case 'tri_set':
      return {
        id: 'tri_set' as const,
        name: 'Tri-Set',
        badge: '🔱 Tri-Set',
        icon: '🔱',
        bg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
        cardBg: 'bg-indigo-500/10 dark:bg-indigo-950/25 border-indigo-500/30 text-indigo-200',
        activeRing: 'ring-indigo-500/40 border-indigo-500',
        accentColor: 'text-indigo-400',
        buttonBg: 'bg-indigo-600 hover:bg-indigo-500 text-white',
        description: 'Três exercícios sequenciais sem pausa entre eles, aumentando a densidade e o volume por unidade de tempo sob alto estresse glicolítico.',
        scientificRationale: 'A combinação de três exercícios contínuos sem intervalo causa depleção rápida de glicogênio muscular e alto acúmulo de íons hidrogênio e fosfato inorgânico, promovendo adaptações metabólicas e hipertrofia sarcoplasmática acentuada.',
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: '65-70% 1RM',
        defaultRest: '2min',
        defaultIntraRest: 10,
        defaultInterRest: '2min',
        repsPresets: ['10-12', '8-10', '10+10+10', '12+10+8'],
        restPresets: ['1m30s', '2min', '2m30s', '3min'],
        intraRestPresets: [0, 5, 10, 15]
      };
    case 'super_set':
      return {
        id: 'super_set' as const,
        name: 'Super-Set (Agonista/Antagonista)',
        badge: '⚔️ Super-Set',
        icon: '⚔️',
        bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        cardBg: 'bg-emerald-500/10 dark:bg-emerald-950/25 border-emerald-500/30 text-emerald-200',
        activeRing: 'ring-emerald-500/40 border-emerald-500',
        accentColor: 'text-emerald-400',
        buttonBg: 'bg-emerald-600 hover:bg-emerald-500 text-white',
        description: 'Combinação alternada de músculos agonistas e antagonistas (ex: Supino + Remada) otimizando tempo e estimulando a inibição recíproca neuromuscular.',
        scientificRationale: 'A contração do músculo agonista gera relaxamento neural recíproco do músculo antagonista via interneurônios Ia, permitindo maior produção de força e recuperação ativa entre contrações opostas com economia de 50% do tempo de treino.',
        defaultSets: 3,
        defaultReps: '10-12',
        defaultWeight: '70-75% 1RM',
        defaultRest: '90s',
        defaultIntraRest: 10,
        defaultInterRest: '90s',
        repsPresets: ['10-12', '8-10', '12-15', '6-8'],
        restPresets: ['60s', '90s', '2min', '2m30s'],
        intraRestPresets: [0, 5, 10, 15]
      };
    case 'gvt':
      return {
        id: 'gvt' as const,
        name: 'German Volume Training (GVT 10x10)',
        badge: '🇩🇪 GVT 10x10',
        icon: '🇩🇪',
        bg: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
        cardBg: 'bg-yellow-500/10 dark:bg-yellow-950/25 border-yellow-500/30 text-yellow-200',
        activeRing: 'ring-yellow-500/40 border-yellow-500',
        accentColor: 'text-yellow-400',
        buttonBg: 'bg-yellow-500 hover:bg-yellow-400 text-slate-950',
        description: '10 séries estritas de 10 repetições com 60% de 1RM e intervalo fixo e rígido de 60s, promovendo hipertrofia extrema e capacidade de trabalho.',
        scientificRationale: 'Criado pela escola alemã de halterofilismo, o GVT submete um único grupo de unidades motoras a 100 repetições acumuladas com carga de 60% 1RM. Nas séries finais (séries 6 a 10), o recrutamento de fibras de contração rápida é forçado pela fadiga cumulativa das fibras oxidativas.',
        defaultSets: 10,
        defaultReps: '10',
        defaultWeight: '60% 1RM (carga constante)',
        defaultRest: '60s',
        defaultIntraRest: 60,
        defaultInterRest: '60s',
        repsPresets: ['10', '8', '10x10'],
        restPresets: ['45s', '60s', '75s', '90s'],
        intraRestPresets: [45, 60, 75]
      };
    case 'myo_reps':
      return {
        id: 'myo_reps' as const,
        name: 'Myo-Reps (Borge Fagerli)',
        badge: '🧬 Myo-Reps',
        icon: '🧬',
        bg: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
        cardBg: 'bg-teal-500/10 dark:bg-teal-950/25 border-teal-500/30 text-teal-200',
        activeRing: 'ring-teal-500/40 border-teal-500',
        accentColor: 'text-teal-400',
        buttonBg: 'bg-teal-600 hover:bg-teal-500 text-white',
        description: 'Série de ativação (12-15 reps @ RPE 9) seguida de 4-5 mini-séries de 3-5 reps com pausas de 5 respirações profundas (10-15s).',
        scientificRationale: 'A primeira série (ativação @ RPE 9) recruta todos os motoneurônios de alto limiar. As mini-séries subsequentes (3-5 reps com 10-15s de pausa) mantêm o estado de recrutamento de 100% das fibras ativas em todas as repetições, convertendo quase 100% das repetições em repetições efetivas.',
        defaultSets: 4,
        defaultReps: '12 + 4x3',
        defaultWeight: '70% 1RM (12RM)',
        defaultRest: '2min',
        defaultIntraRest: 15,
        defaultInterRest: '2min',
        repsPresets: ['12 + 4x3', '15 + 5x3', '10 + 4x4', '12 + 5x2'],
        restPresets: ['1m30s', '2min', '2m30s'],
        intraRestPresets: [10, 15, 20]
      };
    case 'wave_loading':
      return {
        id: 'wave_loading' as const,
        name: 'Wave Loading (Carga Ondulatória)',
        badge: '🌊 Wave Loading',
        icon: '🌊',
        bg: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
        cardBg: 'bg-violet-500/10 dark:bg-violet-950/25 border-violet-500/30 text-violet-200',
        activeRing: 'ring-violet-500/40 border-violet-500',
        accentColor: 'text-violet-400',
        buttonBg: 'bg-violet-600 hover:bg-violet-500 text-white',
        description: 'Estrutura em ondas de repetições decrescentes e cargas crescentes (ex: 7-5-3 / 7-5-3 ou 3-2-1 / 3-2-1) para facilitação neural progressiva.',
        scientificRationale: 'Cada onda sucessiva se beneficia da potenciação pós-tetânica gerada pela onda anterior. O sistema nervoso central é excitado pela série pesada final da onda 1 (ex: 3 reps @ 85%), permitindo que na onda 2 o atleta execute as mesmas 7 reps com 2% a 5% a mais de carga.',
        defaultSets: 6,
        defaultReps: '7-5-3 / 7-5-3',
        defaultWeight: 'Onda 1: 75-80-85% | Onda 2: 77.5-82.5-87.5%',
        defaultRest: '2m30s',
        defaultIntraRest: 120,
        defaultInterRest: '2m30s',
        repsPresets: ['7-5-3 / 7-5-3', '5-3-1 / 5-3-1', '3-2-1 / 3-2-1', '6-4-2 / 6-4-2'],
        restPresets: ['2min', '2m30s', '3min', '3m30s'],
        intraRestPresets: [90, 120, 150]
      };
    case 'sprint_rsa':
      return {
        id: 'sprint_rsa' as const,
        name: 'Tiros Curtos / RSA (Repeated Sprint Ability)',
        badge: '🏃‍♂️ Tiros Curtos / RSA',
        icon: '🏃‍♂️',
        bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        cardBg: 'bg-emerald-500/10 dark:bg-emerald-950/25 border-emerald-500/30 text-emerald-200',
        activeRing: 'ring-emerald-500/40 border-emerald-500',
        accentColor: 'text-emerald-400',
        buttonBg: 'bg-emerald-600 hover:bg-emerald-500 text-white',
        description: 'Sprints curtos em velocidade máxima (100%) com micro-pausas intra-série (15s a 30s) e pausa inter-blocos (2m30s a 3min).',
        scientificRationale: 'Desenvolve a potência alática máxima (via ATP-CP) e a taxa de desenvolvimento de força (RFD) horizontal. A micro-pausa incompleta (15s-25s) treina a habilidade neuromuscular e metabólica de repetir tiros sem queda de rendimento mecânico.',
        defaultSets: 2,
        defaultReps: '5x 20m',
        defaultWeight: '100% Sprint',
        defaultRest: '2m30s',
        defaultIntraRest: 20,
        defaultInterRest: '2m30s',
        repsPresets: ['5x 20m', '4x 30m', '6x 15m', '4x 10m', '3x 40m', '6x 20m'],
        restPresets: ['2min', '2m30s', '3min', '4min'],
        intraRestPresets: [15, 20, 25, 30, 45]
      };
    case 'pyramid_field':
      return {
        id: 'pyramid_field' as const,
        name: 'Pirâmide de Campo / Quadra',
        badge: '🔺 Pirâmide de Campo',
        icon: '🔺',
        bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        cardBg: 'bg-amber-500/10 dark:bg-amber-950/25 border-amber-500/30 text-amber-200',
        activeRing: 'ring-amber-500/40 border-amber-500',
        accentColor: 'text-amber-400',
        buttonBg: 'bg-amber-600 hover:bg-amber-500 text-white',
        description: 'Progressão e regressão de distâncias métricas (ex: 10m-20m-30m-40m-30m-20m-10m) ou tempos em formato piramidal com intervalos proporcionais.',
        scientificRationale: 'Estimula progressivamente aceleração rápida inicial (10-20m) ➔ velocidade máxima sustentada no ápice (30-40m) ➔ fase descendente executada sob acidose muscular e fadiga metabólica, fortalecendo a resiliência neural.',
        defaultSets: 1,
        defaultReps: '10-20-30-40-30-20-10m',
        defaultWeight: '95-100% Vel',
        defaultRest: '3min',
        defaultIntraRest: 30,
        defaultInterRest: '3min',
        repsPresets: ['10-20-30-40-30-20-10m', '10-20-30-40m', '10-20-30m', '5-10-15-20-15-10-5s'],
        restPresets: ['2m30s', '3min', '3m30s', '4min'],
        intraRestPresets: [20, 25, 30, 40]
      };
    case 'fartlek':
      return {
        id: 'fartlek' as const,
        name: 'Fartlek Intermitente de Quadra/Campo',
        badge: '⏱️ Fartlek Intermitente',
        icon: '⏱️',
        bg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        cardBg: 'bg-cyan-500/10 dark:bg-cyan-950/25 border-cyan-500/30 text-cyan-200',
        activeRing: 'ring-cyan-500/40 border-cyan-500',
        accentColor: 'text-cyan-400',
        buttonBg: 'bg-cyan-600 hover:bg-cyan-500 text-white',
        description: 'Alternância de tiros rápidos (>100% VAM) com recuperação ativa (trote leve 50% VAM) por tempo (15s:15s / 30s:30s) ou marcações da quadra/campo.',
        scientificRationale: 'Mantém a frequência cardíaca elevada (>85-95% FCmáx) e consumo de oxigênio alto por períodos sustentados. A recuperação ativa a 50% VAM otimiza o clearance e reutilização de lactato pelas fibras oxidativas e miocárdio.',
        defaultSets: 2,
        defaultReps: '12x (15s:15s)',
        defaultWeight: '100% VAM / 50% Trote',
        defaultRest: '2m30s',
        defaultIntraRest: 15,
        defaultInterRest: '2m30s',
        repsPresets: ['12x (15s:15s)', '10x (30s:30s)', '8x (10s:20s)', '6x (45s:15s)', 'Campo: Reta / Curva'],
        restPresets: ['2min', '2m30s', '3min'],
        intraRestPresets: [10, 15, 20, 30]
      };
    case 'shuttle_run':
      return {
        id: 'shuttle_run' as const,
        name: 'Shuttle Run / Vai-e-Vem (COD & Frenagem)',
        badge: '⚡ Shuttle Run / Vai-e-Vem',
        icon: '⚡',
        bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        cardBg: 'bg-rose-500/10 dark:bg-rose-950/25 border-rose-500/30 text-rose-200',
        activeRing: 'ring-rose-500/40 border-rose-500',
        accentColor: 'text-rose-400',
        buttonBg: 'bg-rose-600 hover:bg-rose-500 text-white',
        description: 'Tiros em alta velocidade intercalados por desacelerações excêntricas bruscas e mudanças de direção em distâncias fracionadas (5m, 10m, 15m).',
        scientificRationale: 'Gera alta sobrecarga excêntrica no quadríceps e isquiotibiais nas desacelerações (>3-4 m/s²). Fundamental para blindagem ligamentar do joelho (LCA) e aprimoramento da taxa de frenagem e aceleração esportiva.',
        defaultSets: 4,
        defaultReps: '5m+10m+15m (60m tot)',
        defaultWeight: 'Máxima Intensidade (COD)',
        defaultRest: '60s',
        defaultIntraRest: 60,
        defaultInterRest: '60s',
        repsPresets: ['5m+10m+15m (60m tot)', '5-10-5m (Pro Agility)', '10m+10m+10m', '3x 5m Shuttle'],
        restPresets: ['45s', '60s', '75s', '90s'],
        intraRestPresets: [45, 60, 75]
      };
    default:
      return {
        id: 'standard' as const,
        name: 'Tradicional',
        badge: 'Série Tradicional',
        icon: '🏋️‍♂️',
        bg: 'bg-slate-800 text-slate-300 border-slate-700',
        cardBg: 'bg-slate-900/60 border-slate-800 text-slate-300',
        activeRing: 'ring-slate-700 border-slate-600',
        accentColor: 'text-slate-400',
        buttonBg: 'bg-slate-800 hover:bg-slate-700 text-white',
        description: 'Execução linear de séries com intervalo inter-séries completo para recuperação dos estoques de fosfocreatina.',
        scientificRationale: 'Séries convencionais com descanso completo (90s a 3min) garantem a recuperação ótima da ressíntese de fosfocreatina (PCr) e homeostase celular, permitindo manter o volume total e qualidade técnica sem acúmulo excessivo de fadiga prematura.',
        defaultSets: 3,
        defaultReps: '10',
        defaultWeight: '70-75% 1RM',
        defaultRest: '90s',
        defaultIntraRest: 0,
        defaultInterRest: '90s',
        repsPresets: ['8', '10', '12', '15', '6-8', '8-10', '10-12'],
        restPresets: ['60s', '90s', '2min', '3min'],
        intraRestPresets: [0]
      };
  }
};

/**
 * Estrutura e preenche automaticamente o exercício (Séries, Repetições, Carga, Descanso e Notas Fisiológicas)
 * de acordo com o método especial de treino selecionado.
 */
export const structureExerciseForMethod = (
  currentEx: PrescribedExercise,
  method: AdvancedExecutionMethod,
  index: number = 0,
  allExercises: PrescribedExercise[] = []
): PrescribedExercise => {
  const currentSets = currentEx.sets || 3;

  if (method === 'complex_contrast') {
    const prevEx = index > 0 ? allExercises[index - 1] : null;
    let suggestedTag = "1A";
    let suggestedRole = "1A: Carga Pesada (PAP 80-85% 1RM)";
    let suggestedRest = "20s";
    let suggestedReps = "3";
    let suggestedWeight = currentEx.weight && currentEx.weight !== "BW" && !currentEx.weight.includes("1RM") ? currentEx.weight : "85% 1RM";

    if (prevEx && prevEx.executionMethod === "complex_contrast" && prevEx.blockTag) {
      const prevTag = prevEx.blockTag;
      if (prevTag.endsWith("A")) {
        suggestedTag = `${prevTag.slice(0, -1)}B`;
        suggestedRole = "1B: Pliometria com Sobrecarga (Salto)";
        suggestedWeight = "BW";
        suggestedReps = "4";
        suggestedRest = "20s";
      } else if (prevTag.endsWith("B")) {
        suggestedTag = `${prevTag.slice(0, -1)}C`;
        suggestedRole = "1C: Velocidade Balística (30% 1RM)";
        suggestedWeight = "30% 1RM";
        suggestedReps = "4";
        suggestedRest = "20s";
      } else if (prevTag.endsWith("C")) {
        suggestedTag = `${prevTag.slice(0, -1)}D`;
        suggestedRole = "1D: Pliometria Reativa (RSI / Drop Jump)";
        suggestedWeight = "BW";
        suggestedReps = "4";
        suggestedRest = "3m30s";
      } else {
        const round = (parseInt(prevTag) || 1) + 1;
        suggestedTag = `${round}A`;
      }
    }

    const targetTag = currentEx.blockTag || suggestedTag;
    const targetRole = currentEx.blockRole || suggestedRole;
    const targetRest = targetTag.endsWith("D") ? (currentEx.blockRest || "3m30s") : "20s";
    const setsCount = Math.max(3, currentSets);

    return {
      ...currentEx,
      executionMethod: "complex_contrast",
      sets: setsCount,
      reps: currentEx.reps && currentEx.reps !== "10" ? currentEx.reps : suggestedReps,
      weight: currentEx.weight && currentEx.weight !== "BW" ? currentEx.weight : suggestedWeight,
      rest: targetRest,
      intraSetRest: currentEx.intraSetRest ?? 20,
      blockTag: targetTag,
      blockRole: targetRole,
      blockRest: currentEx.blockRest || "3m30s",
      notes: `[CONTRASTE FRANCÊS 🇫🇷] Estágio ${targetTag}: ${targetRole}`,
      performedSets: Array.from({ length: setsCount }).map((_, sIdx) => ({
        id: currentEx.performedSets?.[sIdx]?.id || `s-${Date.now()}-${sIdx}-${Math.random().toString(36).substr(2, 4)}`,
        reps: Number(suggestedReps) || 4,
        weight: typeof currentEx.performedSets?.[sIdx]?.weight === 'number' ? currentEx.performedSets[sIdx].weight : 0,
        rpe: currentEx.performedSets?.[sIdx]?.rpe || 0
      }))
    };
  }

  if (method === 'cluster') {
    const cReps = currentEx.clusterReps || (currentEx.reps && currentEx.reps.includes("+") ? currentEx.reps : "2+2+2");
    const setsCount = Math.max(3, currentSets);
    return {
      ...currentEx,
      executionMethod: "cluster",
      sets: setsCount,
      clusterReps: cReps,
      reps: cReps,
      weight: currentEx.weight && currentEx.weight !== "BW" ? currentEx.weight : "85-90% 1RM",
      intraSetRest: currentEx.intraSetRest ?? 20,
      rest: currentEx.rest && currentEx.rest !== "20s" ? currentEx.rest : "2m30s",
      notes: "[CLUSTER SET 🎯] 3-4 séries de 2+2+2 reps com 20s de micro-pausa na barra e 2m30s entre séries.",
      performedSets: Array.from({ length: setsCount }).map((_, sIdx) => ({
        id: currentEx.performedSets?.[sIdx]?.id || `s-${Date.now()}-${sIdx}-${Math.random().toString(36).substr(2, 4)}`,
        reps: 6,
        weight: typeof currentEx.performedSets?.[sIdx]?.weight === 'number' ? currentEx.performedSets[sIdx].weight : 0,
        rpe: currentEx.performedSets?.[sIdx]?.rpe || 0
      }))
    };
  }

  if (method === 'rest_pause') {
    const setsCount = 3;
    return {
      ...currentEx,
      executionMethod: "rest_pause",
      sets: setsCount,
      reps: "8+3+2",
      weight: currentEx.weight && currentEx.weight !== "BW" ? currentEx.weight : "80-85% 1RM (RPE 9)",
      intraSetRest: currentEx.intraSetRest ?? 15,
      rest: currentEx.rest && currentEx.rest !== "20s" ? currentEx.rest : "2min",
      notes: "[REST-PAUSE 🔥] Série principal de 8 reps @ RPE 9 -> micro-pausa de 15s -> 3 reps -> micro-pausa de 15s -> 2 reps até a falha técnica.",
      performedSets: Array.from({ length: setsCount }).map((_, sIdx) => ({
        id: currentEx.performedSets?.[sIdx]?.id || `s-${Date.now()}-${sIdx}-${Math.random().toString(36).substr(2, 4)}`,
        reps: 13,
        weight: typeof currentEx.performedSets?.[sIdx]?.weight === 'number' ? currentEx.performedSets[sIdx].weight : 0,
        rpe: currentEx.performedSets?.[sIdx]?.rpe || 0
      }))
    };
  }

  if (method === 'drop_set') {
    const setsCount = 3;
    return {
      ...currentEx,
      executionMethod: "drop_set",
      sets: setsCount,
      reps: "8+8+8",
      weight: currentEx.weight && currentEx.weight !== "BW" ? currentEx.weight : "75-80% 1RM (-20% por queda)",
      intraSetRest: currentEx.intraSetRest ?? 5,
      rest: "2min",
      notes: "[DROP-SET 📉] 8 reps @ 75% 1RM -> reduzir 20-30% de carga sem descanso (6-8 reps) -> reduzir 20% sem descanso (até a falha técnica).",
      performedSets: Array.from({ length: setsCount }).map((_, sIdx) => ({
        id: currentEx.performedSets?.[sIdx]?.id || `s-${Date.now()}-${sIdx}-${Math.random().toString(36).substr(2, 4)}`,
        reps: 24,
        weight: typeof currentEx.performedSets?.[sIdx]?.weight === 'number' ? currentEx.performedSets[sIdx].weight : 0,
        rpe: currentEx.performedSets?.[sIdx]?.rpe || 0
      }))
    };
  }

  if (method === 'bi_set') {
    const setsCount = Math.max(3, currentSets);
    return {
      ...currentEx,
      executionMethod: "bi_set",
      sets: setsCount,
      reps: currentEx.reps && currentEx.reps !== "10" ? currentEx.reps : "10-12",
      weight: currentEx.weight && currentEx.weight !== "BW" ? currentEx.weight : "70-75% 1RM",
      intraSetRest: currentEx.intraSetRest ?? 10,
      rest: "90s",
      notes: "[BI-SET ⚡] Execução de 2 exercícios conjugados sem pausa intermediária. Descanso de 90s a 2min ao final de cada par.",
      performedSets: Array.from({ length: setsCount }).map((_, sIdx) => ({
        id: currentEx.performedSets?.[sIdx]?.id || `s-${Date.now()}-${sIdx}-${Math.random().toString(36).substr(2, 4)}`,
        reps: 10,
        weight: typeof currentEx.performedSets?.[sIdx]?.weight === 'number' ? currentEx.performedSets[sIdx].weight : 0,
        rpe: currentEx.performedSets?.[sIdx]?.rpe || 0
      }))
    };
  }

  if (method === 'tri_set') {
    const setsCount = 3;
    return {
      ...currentEx,
      executionMethod: "tri_set",
      sets: setsCount,
      reps: currentEx.reps && currentEx.reps !== "10" ? currentEx.reps : "10-12",
      weight: currentEx.weight && currentEx.weight !== "BW" ? currentEx.weight : "65-70% 1RM",
      intraSetRest: currentEx.intraSetRest ?? 10,
      rest: "2min",
      notes: "[TRI-SET 🔱] 3 exercícios sequenciais contínuos sem descanso entre eles. Descanso completo de 2min após o trio.",
      performedSets: Array.from({ length: setsCount }).map((_, sIdx) => ({
        id: currentEx.performedSets?.[sIdx]?.id || `s-${Date.now()}-${sIdx}-${Math.random().toString(36).substr(2, 4)}`,
        reps: 10,
        weight: typeof currentEx.performedSets?.[sIdx]?.weight === 'number' ? currentEx.performedSets[sIdx].weight : 0,
        rpe: currentEx.performedSets?.[sIdx]?.rpe || 0
      }))
    };
  }

  if (method === 'super_set') {
    const setsCount = Math.max(3, currentSets);
    return {
      ...currentEx,
      executionMethod: "super_set",
      sets: setsCount,
      reps: currentEx.reps && currentEx.reps !== "10" ? currentEx.reps : "10-12",
      weight: currentEx.weight && currentEx.weight !== "BW" ? currentEx.weight : "70-75% 1RM",
      intraSetRest: currentEx.intraSetRest ?? 10,
      rest: "90s",
      notes: "[SUPER-SET ⚔️] Par Agonista + Antagonista conjugados. Transição rápida (10s) e 90s de recuperação entre pares.",
      performedSets: Array.from({ length: setsCount }).map((_, sIdx) => ({
        id: currentEx.performedSets?.[sIdx]?.id || `s-${Date.now()}-${sIdx}-${Math.random().toString(36).substr(2, 4)}`,
        reps: 10,
        weight: typeof currentEx.performedSets?.[sIdx]?.weight === 'number' ? currentEx.performedSets[sIdx].weight : 0,
        rpe: currentEx.performedSets?.[sIdx]?.rpe || 0
      }))
    };
  }

  if (method === 'gvt') {
    const setsCount = 10;
    return {
      ...currentEx,
      executionMethod: "gvt",
      sets: setsCount,
      reps: "10",
      weight: currentEx.weight && currentEx.weight !== "BW" ? currentEx.weight : "60% 1RM",
      intraSetRest: 60,
      rest: "60s",
      notes: "[GERMAN VOLUME TRAINING 🇩🇪] 10 séries estritas de 10 reps a 60% 1RM com descanso fixo e rígido de 60s. Cadência controlada (4-0-2).",
      performedSets: Array.from({ length: setsCount }).map((_, sIdx) => ({
        id: currentEx.performedSets?.[sIdx]?.id || `s-${Date.now()}-${sIdx}-${Math.random().toString(36).substr(2, 4)}`,
        reps: 10,
        weight: typeof currentEx.performedSets?.[sIdx]?.weight === 'number' ? currentEx.performedSets[sIdx].weight : 0,
        rpe: currentEx.performedSets?.[sIdx]?.rpe || 0
      }))
    };
  }

  if (method === 'myo_reps') {
    const setsCount = 4;
    return {
      ...currentEx,
      executionMethod: "myo_reps",
      sets: setsCount,
      reps: "12 + 4x3",
      weight: currentEx.weight && currentEx.weight !== "BW" ? currentEx.weight : "70% 1RM (12RM)",
      intraSetRest: currentEx.intraSetRest ?? 15,
      rest: "2min",
      notes: "[MYO-REPS 🧬] Série de ativação (12-15 reps @ RPE 9) + 4 mini-sets de 3-5 reps com pausas de 10-15s (5 respirações profundas).",
      performedSets: Array.from({ length: setsCount }).map((_, sIdx) => ({
        id: currentEx.performedSets?.[sIdx]?.id || `s-${Date.now()}-${sIdx}-${Math.random().toString(36).substr(2, 4)}`,
        reps: 12,
        weight: typeof currentEx.performedSets?.[sIdx]?.weight === 'number' ? currentEx.performedSets[sIdx].weight : 0,
        rpe: currentEx.performedSets?.[sIdx]?.rpe || 0
      }))
    };
  }

  if (method === 'wave_loading') {
    const setsCount = 6;
    return {
      ...currentEx,
      executionMethod: "wave_loading",
      sets: setsCount,
      reps: "7-5-3 / 7-5-3",
      weight: "Onda 1: 75-80-85% | Onda 2: 77.5-82.5-87.5%",
      intraSetRest: 120,
      rest: "2m30s",
      notes: "[WAVE LOADING 🌊] Onda 1: 7 reps (75%), 5 reps (80%), 3 reps (85%) -> Pausa 2m30s -> Onda 2: 7 reps (77.5%), 5 reps (82.5%), 3 reps (87.5%).",
      performedSets: Array.from({ length: setsCount }).map((_, sIdx) => ({
        id: currentEx.performedSets?.[sIdx]?.id || `s-${Date.now()}-${sIdx}-${Math.random().toString(36).substr(2, 4)}`,
        reps: [7, 5, 3, 7, 5, 3][sIdx] || 5,
        weight: typeof currentEx.performedSets?.[sIdx]?.weight === 'number' ? currentEx.performedSets[sIdx].weight : 0,
        rpe: currentEx.performedSets?.[sIdx]?.rpe || 0
      }))
    };
  }

  if (method === 'sprint_rsa') {
    const setsCount = 2;
    return {
      ...currentEx,
      executionMethod: "sprint_rsa",
      trainingMode: "speed",
      metricType: "sprint",
      repsType: "meters",
      fieldUnit: "meters",
      sets: setsCount,
      reps: currentEx.reps && currentEx.reps.toLowerCase().includes("m") ? currentEx.reps : "5x 20m",
      weight: "100% Sprint Máximo",
      intraSetRest: currentEx.intraSetRest ?? 20,
      rest: currentEx.rest && currentEx.rest !== "20s" && currentEx.rest !== "90s" ? currentEx.rest : "2m30s",
      workRestRatio: "1:5",
      notes: "[TIROS CURTOS / RSA 🏃‍♂️] 2 blocos de 5x 20m com 20s de micro-pausa entre tiros e 2m30s entre blocos.",
      performedSets: Array.from({ length: setsCount }).map((_, sIdx) => ({
        id: currentEx.performedSets?.[sIdx]?.id || `s-${Date.now()}-${sIdx}-${Math.random().toString(36).substr(2, 4)}`,
        reps: 5,
        weight: 0,
        rpe: currentEx.performedSets?.[sIdx]?.rpe || 9
      }))
    };
  }

  if (method === 'pyramid_field') {
    const setsCount = 1;
    return {
      ...currentEx,
      executionMethod: "pyramid_field",
      trainingMode: "speed",
      metricType: "sprint",
      repsType: "meters",
      fieldUnit: "meters",
      sets: setsCount,
      reps: currentEx.reps && currentEx.reps.toLowerCase().includes("m") ? currentEx.reps : "10-20-30-40-30-20-10m",
      weight: "95-100% Vel",
      intraSetRest: currentEx.intraSetRest ?? 30,
      rest: "3min",
      notes: "[PIRÂMIDE DE CAMPO 🔺] Pirâmide 10-20-30-40-30-20-10m (160m total) com micro-pausas progressivas e 3min pós-pirâmide.",
      performedSets: Array.from({ length: setsCount }).map((_, sIdx) => ({
        id: currentEx.performedSets?.[sIdx]?.id || `s-${Date.now()}-${sIdx}-${Math.random().toString(36).substr(2, 4)}`,
        reps: 7,
        weight: 0,
        rpe: currentEx.performedSets?.[sIdx]?.rpe || 9
      }))
    };
  }

  if (method === 'fartlek') {
    const setsCount = 2;
    return {
      ...currentEx,
      executionMethod: "fartlek",
      trainingMode: "conditioning",
      metricType: "interval",
      repsType: "time",
      fieldUnit: "time",
      sets: setsCount,
      reps: currentEx.reps && currentEx.reps.includes(":") ? currentEx.reps : "12x (15s:15s)",
      weight: "100% VAM / 50% Trote",
      intraSetRest: 15,
      rest: "2m30s",
      workRestRatio: "1:1",
      notes: "[FARTLEK INTERMITENTE ⏱️] 2 blocos de 12 repetições de 15s tiro rápido / 15s trote leve. Pausa de 2m30s entre blocos.",
      performedSets: Array.from({ length: setsCount }).map((_, sIdx) => ({
        id: currentEx.performedSets?.[sIdx]?.id || `s-${Date.now()}-${sIdx}-${Math.random().toString(36).substr(2, 4)}`,
        reps: 12,
        weight: 0,
        rpe: currentEx.performedSets?.[sIdx]?.rpe || 8.5
      }))
    };
  }

  if (method === 'shuttle_run') {
    const setsCount = 4;
    return {
      ...currentEx,
      executionMethod: "shuttle_run",
      trainingMode: "speed",
      metricType: "drill",
      repsType: "meters",
      fieldUnit: "meters",
      sets: setsCount,
      reps: currentEx.reps && currentEx.reps.toLowerCase().includes("m") ? currentEx.reps : "5m+10m+15m (60m tot)",
      weight: "Máxima Intensidade (COD)",
      intraSetRest: 60,
      rest: "60s",
      notes: "[SHUTTLE RUN / VAI-E-VEM ⚡] 4 séries de 5m+10m+15m (60m totais com 3 frenagens excêntricas). Intervalo completo de 60s.",
      performedSets: Array.from({ length: setsCount }).map((_, sIdx) => ({
        id: currentEx.performedSets?.[sIdx]?.id || `s-${Date.now()}-${sIdx}-${Math.random().toString(36).substr(2, 4)}`,
        reps: 3,
        weight: 0,
        rpe: currentEx.performedSets?.[sIdx]?.rpe || 9
      }))
    };
  }

  // standard
  const setsCount = Math.max(3, currentSets);
  return {
    ...currentEx,
    executionMethod: "standard",
    sets: setsCount,
    reps: currentEx.reps && !currentEx.reps.includes("+") && !currentEx.reps.includes("/") ? currentEx.reps : "10",
    weight: currentEx.weight || "70-75% 1RM",
    rest: currentEx.rest === "20s" ? "90s" : (currentEx.rest || "90s"),
    intraSetRest: undefined,
    clusterReps: undefined,
    blockTag: undefined,
    blockRole: undefined,
    blockRest: undefined,
    notes: currentEx.notes?.startsWith("[") ? "" : currentEx.notes
  };
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
      cardClasses: "bg-gradient-to-br from-amber-50 via-yellow-50 to-white dark:from-[#241a02] dark:via-[#140e01] dark:to-slate-950 border-2 border-amber-500/70 shadow-[0_0_35px_rgba(245,158,11,0.28)] hover:border-amber-400",
      glowColor: "bg-amber-400/25 animate-pulse",
      iconBgClasses: "bg-amber-100 dark:bg-amber-500/20 border-amber-500 dark:border-amber-400/50 text-amber-700 dark:text-amber-400 animate-pulse shadow-[0_0_22px_rgba(245,158,11,0.45)]",
      insightBoxClasses: "bg-amber-50 dark:bg-amber-950/40 border border-amber-400/60 dark:border-amber-500/35 text-amber-950 dark:text-amber-200",
      insightTitleClasses: "text-amber-700 dark:text-amber-400",
      insightTextClasses: "text-amber-950 dark:text-amber-200/90",
      buttonClasses: "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 font-black border border-amber-300 shadow-[0_0_22px_rgba(245,158,11,0.4)] hover:brightness-110",
      buttonText: "REALIZAR CHECK-IN AGORA!",
      coachGuidance: "Check-in de prontidão pendente para hoje. Solicite que o atleta responda os dados de recuperação (sono, fadiga e dor muscular) antes de liberar as cargas principais do treino.",
      shortStatus: "Aguardando Check-in",
      subtextColor: "text-slate-700 dark:text-slate-300",
      statusBadgeClasses: "bg-amber-100 dark:bg-slate-950/60 border-current/30 text-amber-800 dark:text-amber-400",
      dividerColor: "border-b border-amber-200 dark:border-white/10",
    };
  }

  if (score >= 85) {
    return {
      level: "elite",
      label: "Prontidão Máxima (Elite)",
      badgeText: "PRONTIDÃO MÁXIMA (ELITE)",
      scoreColor: "text-emerald-700 dark:text-emerald-400",
      cardClasses: "bg-gradient-to-br from-emerald-50 via-green-50 to-white dark:from-[#022818] dark:via-[#041910] dark:to-[#010e08] border-2 border-emerald-500/70 shadow-[0_0_40px_rgba(16,185,129,0.32)] hover:border-emerald-400",
      glowColor: "bg-emerald-400/25 animate-pulse",
      iconBgClasses: "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-600 dark:border-emerald-500/50 text-emerald-700 dark:text-emerald-400 shadow-[0_0_22px_rgba(16,185,129,0.4)]",
      insightBoxClasses: "bg-emerald-50 dark:bg-emerald-950/45 border border-emerald-400/60 dark:border-emerald-500/35 text-emerald-950 dark:text-emerald-100",
      insightTitleClasses: "text-emerald-700 dark:text-emerald-400",
      insightTextClasses: "text-emerald-950 dark:text-emerald-200/90",
      buttonClasses: "bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-500/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500 hover:text-slate-950",
      buttonText: "ATUALIZAR PRONTIDÃO",
      coachGuidance: "Atleta em pico de recuperação fisiológica e neuromuscular. Totalmente liberado para cargas máximas, tiros de alta velocidade, saltos com máxima reatividade e testes de PR. Cumprir 100% da planilha com intensidade máxima.",
      shortStatus: "100% Liberado para Alta Carga",
      subtextColor: "text-slate-700 dark:text-slate-300",
      statusBadgeClasses: "bg-emerald-100 dark:bg-slate-950/60 border-current/30 text-emerald-800 dark:text-emerald-400",
      dividerColor: "border-b border-emerald-200 dark:border-white/10",
    };
  } else if (score >= 70) {
    return {
      level: "good",
      label: "Boa Prontidão",
      badgeText: "BOA PRONTIDÃO (REGULAR)",
      scoreColor: "text-teal-700 dark:text-teal-300",
      cardClasses: "bg-gradient-to-br from-teal-50 via-cyan-50 to-white dark:from-[#022424] dark:via-[#041617] dark:to-[#010e0f] border-2 border-teal-400/70 shadow-[0_0_35px_rgba(20,184,166,0.3)] hover:border-teal-300",
      glowColor: "bg-teal-400/25 animate-pulse",
      iconBgClasses: "bg-teal-100 dark:bg-teal-500/20 border-teal-600 dark:border-teal-500/50 text-teal-700 dark:text-teal-300 shadow-[0_0_22px_rgba(20,184,166,0.4)]",
      insightBoxClasses: "bg-teal-50 dark:bg-teal-950/45 border border-teal-400/60 dark:border-teal-500/35 text-teal-950 dark:text-teal-100",
      insightTitleClasses: "text-teal-700 dark:text-teal-300",
      insightTextClasses: "text-teal-950 dark:text-teal-200/90",
      buttonClasses: "bg-teal-100 dark:bg-teal-500/15 border border-teal-500/50 text-teal-800 dark:text-teal-300 hover:bg-teal-500 hover:text-slate-950",
      buttonText: "ATUALIZAR PRONTIDÃO",
      coachGuidance: "Condição física e tônus muscular adequados. O treino planejado pode ser seguido integralmente sem alterações estruturais. Monitorar apenas caso o atleta aponte desconforto muscular localizado durante o aquecimento.",
      shortStatus: "Planilha 100% Liberada",
      subtextColor: "text-slate-700 dark:text-slate-300",
      statusBadgeClasses: "bg-teal-100 dark:bg-slate-950/60 border-current/30 text-teal-800 dark:text-teal-300",
      dividerColor: "border-b border-teal-200 dark:border-white/10",
    };
  } else if (score >= 50) {
    return {
      level: "moderate",
      label: "Estado de Atenção",
      badgeText: "ATENÇÃO (PRONTIDÃO MODERADA)",
      scoreColor: "text-amber-800 dark:text-amber-400",
      cardClasses: "bg-gradient-to-br from-amber-50 via-yellow-50 to-white dark:from-[#2a1b02] dark:via-[#170e01] dark:to-[#0d0700] border-2 border-amber-500/80 shadow-[0_0_40px_rgba(245,158,11,0.34)] hover:border-amber-400",
      glowColor: "bg-amber-400/25 animate-pulse",
      iconBgClasses: "bg-amber-100 dark:bg-amber-500/20 border-amber-600 dark:border-amber-500/50 text-amber-800 dark:text-amber-400 shadow-[0_0_22px_rgba(245,158,11,0.45)]",
      insightBoxClasses: "bg-amber-50 dark:bg-amber-950/50 border border-amber-400/60 dark:border-amber-500/40 text-amber-950 dark:text-amber-100",
      insightTitleClasses: "text-amber-700 dark:text-amber-400",
      insightTextClasses: "text-amber-950 dark:text-amber-200/90",
      buttonClasses: "bg-amber-100 dark:bg-amber-500/15 border border-amber-500/50 text-amber-800 dark:text-amber-300 hover:bg-amber-500 hover:text-slate-950",
      buttonText: "ATUALIZAR PRONTIDÃO",
      coachGuidance: "Prontidão moderada indicando fadiga neuromuscular residual ou sono não reparador. Reduzir o volume de séries em 20% a 30% ou a intensidade (RPE) em 1-2 pontos. Priorizar técnica, mobilidade articular e aquecimento minucioso.",
      shortStatus: "Reduzir Volume (-20% a -30%)",
      subtextColor: "text-slate-700 dark:text-slate-300",
      statusBadgeClasses: "bg-amber-100 dark:bg-slate-950/60 border-current/30 text-amber-800 dark:text-amber-400",
      dividerColor: "border-b border-amber-200 dark:border-white/10",
    };
  } else {
    return {
      level: "critical",
      label: "Risco de Sobrecarga",
      badgeText: "RISCO DE SOBRECARGA (CRÍTICO)",
      scoreColor: "text-red-700 dark:text-red-300",
      cardClasses: "readiness-critical-card bg-gradient-to-br from-red-50 via-rose-50 to-white dark:from-[#3b0a12] dark:via-[#22070d] dark:to-[#120409] border-2 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.42)] hover:border-red-400 text-slate-950 dark:text-white",
      glowColor: "bg-red-400/30 animate-pulse",
      iconBgClasses: "bg-red-600 border-red-700 text-white shadow-[0_0_24px_rgba(239,68,68,0.5)] animate-pulse",
      insightBoxClasses: "bg-white/95 dark:bg-red-950/55 border border-red-300 dark:border-red-400/50 shadow-sm text-slate-900 dark:text-red-50",
      insightTitleClasses: "text-red-700 dark:text-red-300",
      insightTextClasses: "text-red-950 dark:text-red-100",
      buttonClasses: "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black border border-red-700 shadow-md shadow-red-500/30",
      buttonText: "ATUALIZAR PRONTIDÃO",
      coachGuidance: "ALERTA DE SOBRECARGA CRÍTICA: Risco elevado de lesão musculoesquelética ou esgotamento do SNC. Vete tiros em velocidade máxima, saltos de alto impacto e cargas pesadas. Substitua por protocolo regenerativo, liberação miofascial suave ou descanso total.",
      shortStatus: "Treino Regenerativo / Repouso",
      subtextColor: "text-red-950/80 dark:text-red-100/90 font-bold",
      statusBadgeClasses: "bg-red-200/90 dark:bg-red-950/70 border-red-400 text-red-950 dark:text-red-100 font-black",
      dividerColor: "border-b border-red-200 dark:border-red-400/40",
    };
  }
};

export const calculateWorkoutLoad = (workout: Workout, athleteWeight?: number): number => {
  let total = 0;
  if (!workout || !workout.exercises) return 0;
  
  workout.exercises.forEach(ex => {
    if (ex.trainingMode && ex.trainingMode !== "strength") return;
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

export interface FieldCourtMetrics {
  totalDistanceMeters: number;
  sprintDistanceMeters: number;
  highIntensitySeconds: number;
  totalSprintsCount: number;
  hasFieldExercises: boolean;
}

export const calculateFieldCourtMetrics = (workout: Workout): FieldCourtMetrics => {
  let totalDistanceMeters = 0;
  let sprintDistanceMeters = 0;
  let highIntensitySeconds = 0;
  let totalSprintsCount = 0;
  let hasFieldExercises = false;

  if (!workout || !workout.exercises) {
    return { totalDistanceMeters: 0, sprintDistanceMeters: 0, highIntensitySeconds: 0, totalSprintsCount: 0, hasFieldExercises: false };
  }

  workout.exercises.forEach(ex => {
    const method = ex.executionMethod;
    const isFieldMethod = method === 'sprint_rsa' || method === 'pyramid_field' || method === 'fartlek' || method === 'shuttle_run';
    const isMeters = ex.repsType === 'meters' || (typeof ex.reps === 'string' && ex.reps.toLowerCase().includes('m'));
    const isCourtOrSpeed = ex.trainingMode === 'speed' || ex.trainingMode === 'court' || ex.trainingMode === 'conditioning';

    if (!isFieldMethod && !isMeters && !isCourtOrSpeed && !ex.distanceMeters) {
      return;
    }

    hasFieldExercises = true;
    const numSets = ex.sets || 1;
    const repsStr = String(ex.reps || "").toLowerCase().trim();

    // 1. Tiros / RSA: ex "5x 20m" or "4x 30m"
    if (method === 'sprint_rsa' || (repsStr.includes('x') && repsStr.includes('m'))) {
      const match = repsStr.match(/(\d+)\s*x\s*(\d+)\s*m/i);
      if (match) {
        const reps = parseInt(match[1], 10) || 1;
        const meters = parseInt(match[2], 10) || 20;
        const sprintMeters = numSets * reps * meters;
        totalDistanceMeters += sprintMeters;
        sprintDistanceMeters += sprintMeters;
        totalSprintsCount += numSets * reps;
        highIntensitySeconds += numSets * reps * Math.max(2, Math.round(meters / 6));
        return;
      }
    }

    // 2. Pyramid: ex "10-20-30-40-30-20-10m"
    if (method === 'pyramid_field' || (repsStr.includes('-') && repsStr.includes('m'))) {
      const nums = repsStr.replace(/[^0-9-]/g, '').split('-').map(n => parseInt(n, 10)).filter(n => !isNaN(n) && n > 0);
      if (nums.length > 0) {
        const sumMeters = nums.reduce((a, b) => a + b, 0);
        const totalPyrMeters = numSets * sumMeters;
        totalDistanceMeters += totalPyrMeters;
        sprintDistanceMeters += totalPyrMeters;
        totalSprintsCount += numSets * nums.length;
        highIntensitySeconds += numSets * Math.round(sumMeters / 6);
        return;
      }
    }

    // 3. Fartlek: ex "12x (15s:15s)" or "10x (30s:30s)"
    if (method === 'fartlek' || (repsStr.includes(':') && repsStr.includes('s'))) {
      const match = repsStr.match(/(\d+)\s*x\s*\(?(\d+)\s*s?\s*:\s*(\d+)\s*s?\)?/i);
      if (match) {
        const reps = parseInt(match[1], 10) || 10;
        const workSec = parseInt(match[2], 10) || 15;
        const restSec = parseInt(match[3], 10) || 15;
        const totalWorkSec = numSets * reps * workSec;
        highIntensitySeconds += totalWorkSec;
        totalSprintsCount += numSets * reps;
        const fastMeters = totalWorkSec * 5;
        const slowMeters = numSets * reps * restSec * 2.5;
        totalDistanceMeters += (fastMeters + slowMeters);
        sprintDistanceMeters += fastMeters;
        return;
      }
    }

    // 4. Shuttle run: ex "5m+10m+15m" (vai e vem total 60m)
    if (method === 'shuttle_run' || repsStr.includes('shuttle') || (repsStr.includes('+') && repsStr.includes('m'))) {
      const nums = repsStr.replace(/[^0-9+]/g, '').split('+').map(n => parseInt(n, 10)).filter(n => !isNaN(n) && n > 0);
      if (nums.length > 0) {
        const oneWay = nums.reduce((a, b) => a + b, 0);
        const roundMeters = oneWay * 2;
        const totalShuttleMeters = numSets * roundMeters;
        totalDistanceMeters += totalShuttleMeters;
        sprintDistanceMeters += totalShuttleMeters;
        totalSprintsCount += numSets * (nums.length * 2);
        highIntensitySeconds += numSets * Math.round(roundMeters / 4.5);
        return;
      }
    }

    // 5. Explicit distanceMeters
    if (ex.distanceMeters && ex.distanceMeters > 0) {
      const totalM = numSets * ex.distanceMeters;
      totalDistanceMeters += totalM;
      sprintDistanceMeters += totalM;
      totalSprintsCount += numSets;
      highIntensitySeconds += numSets * Math.round(ex.distanceMeters / 6);
      return;
    }

    // 6. Generic single meter string (e.g. "30m")
    const singleMeterMatch = repsStr.match(/^(\d+)\s*m$/i);
    if (singleMeterMatch) {
      const mVal = parseInt(singleMeterMatch[1], 10);
      const totalM = numSets * mVal;
      totalDistanceMeters += totalM;
      sprintDistanceMeters += totalM;
      totalSprintsCount += numSets;
      highIntensitySeconds += numSets * Math.max(2, Math.round(mVal / 6));
    }
  });

  return {
    totalDistanceMeters: Math.round(totalDistanceMeters),
    sprintDistanceMeters: Math.round(sprintDistanceMeters),
    highIntensitySeconds: Math.round(highIntensitySeconds),
    totalSprintsCount,
    hasFieldExercises
  };
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

