import { Athlete, Workout, ExternalSession } from "../types";
import { calculateACWR, calculateReadiness, getLocalDateString } from "../utils";

export type NutritionDayScenario = "leve" | "moderado" | "choque_jogo";

export interface MealEquivalenceOption {
  title: string;
  timing: "pre" | "intra" | "pos";
  items: string[];
  macrosSummary: string;
  practicalTip: string;
}

export interface BiomarkerNutritionAdjustment {
  id: string;
  source: "bioimpedancia" | "cmj_fadiga" | "acwr_carga" | "prontidao_sono" | "ciclo_menstrual";
  title: string;
  badgeColor: "emerald" | "amber" | "rose" | "cyan";
  description: string;
  practicalAction: string;
}

export interface AthleteNutritionPlan {
  athleteId: string;
  athleteName: string;
  weightKg: number;
  leanMassKg: number | null;
  fatPercentage: number | null;
  weightSource: string;
  detectedScenario: NutritionDayScenario;
  activeScenario: NutritionDayScenario;
  scenarioLabel: string;
  scenarioSubtitle: string;
  sessionRpe: number;
  sessionDurationMinutes: number;

  // Daily Totals
  dailyProteinGPerKg: number;
  dailyProteinGrams: number;
  dailyCarbsGPerKg: number;
  dailyCarbsGrams: number;
  dailyFatGPerKg: number;
  dailyFatGrams: number;
  estimatedCaloriesKcal: number;

  // Hydration
  baseWaterMlPerKg: number;
  baseWaterLiters: number;
  trainingExtraWaterMl: number;
  totalDailyWaterLiters: number;

  // Pre-Workout (1.5h - 2h before)
  preWorkout: {
    carbsGPerKg: number;
    carbsGrams: number;
    proteinGPerKg: number;
    proteinGrams: number;
    waterMl: number;
    windowLabel: string;
    goalDescription: string;
    equivalences: MealEquivalenceOption[];
  };

  // Intra-Workout (During training)
  intraWorkout: {
    waterMlPerHour: number;
    totalSessionWaterMl: number;
    carbsGramsPerHour: number;
    electrolytesRequired: boolean;
    windowLabel: string;
    goalDescription: string;
    equivalences: MealEquivalenceOption[];
  };

  // Post-Workout Immediate (0 - 60 min after)
  postWorkout: {
    proteinGPerKg: number;
    proteinGrams: number;
    leucineTargetGrams: number;
    carbsGPerKg: number;
    carbsGrams: number;
    carbToProteinRatio: string;
    rehydrationMl: number;
    windowLabel: string;
    goalDescription: string;
    equivalences: MealEquivalenceOption[];
  };

  // Matrix & Biomarker adjustments
  biomarkerAdjustments: BiomarkerNutritionAdjustment[];
}

export function getAthleteCurrentWeightAndBodyComp(athlete: Athlete): {
  weightKg: number;
  leanMassKg: number | null;
  fatPercentage: number | null;
  source: string;
} {
  const bioList = Array.isArray(athlete.assessments?.bioimpedance)
    ? [...athlete.assessments.bioimpedance].sort(
        (a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime()
      )
    : [];

  const latestBio = bioList[0];
  const latestCmj = athlete.assessments?.cmj?.slice(-1)[0];
  const latestImtp = athlete.assessments?.imtp?.slice(-1)[0];

  let weightKg = 75;
  let source = "Referência Padrão (75 kg)";

  if (latestBio && latestBio.weight && latestBio.weight > 25) {
    weightKg = Number(latestBio.weight);
    source = `Bioimpedância (${latestBio.date ? (latestBio.date || "").split("T")[0] : "Recente"})`;
  } else if (athlete.weight && athlete.weight > 25) {
    weightKg = Number(athlete.weight);
    source = "Perfil do Atleta";
  } else if (latestCmj?.weight && latestCmj.weight > 25) {
    weightKg = Number(latestCmj.weight);
    source = "Avaliação CMJ";
  } else if (latestImtp?.weight && latestImtp.weight > 25) {
    weightKg = Number(latestImtp.weight);
    source = "Avaliação IMTP";
  }

  const fatPercentage =
    latestBio && typeof latestBio.fatPercentage === "number" && latestBio.fatPercentage > 0
      ? Number(latestBio.fatPercentage)
      : null;

  const leanMassKg =
    latestBio && typeof latestBio.muscleMass === "number" && latestBio.muscleMass > 15
      ? Number(latestBio.muscleMass)
      : fatPercentage !== null
      ? Number((weightKg * (1 - fatPercentage / 100)).toFixed(1))
      : null;

  return {
    weightKg: Math.round(weightKg * 10) / 10,
    leanMassKg,
    fatPercentage,
    source
  };
}

export function calculatePostWorkoutQuickTarget(
  weightKg: number,
  rpe: number = 7,
  durationMinutes: number = 60
) {
  const safeWeight = weightKg > 25 ? weightKg : 75;
  const isHighIntensity = rpe >= 8 || durationMinutes >= 75;
  const isLowIntensity = rpe <= 4 && durationMinutes <= 45;

  const proteinGPerKg = isHighIntensity ? 0.4 : isLowIntensity ? 0.3 : 0.35;
  const carbsGPerKg = isHighIntensity ? 1.2 : isLowIntensity ? 0.6 : 0.9;

  const proteinGrams = Math.round(safeWeight * proteinGPerKg);
  const carbsGrams = Math.round(safeWeight * carbsGPerKg);
  const rehydrationMl = Math.round(
    (durationMinutes / 60) * (isHighIntensity ? 900 : isLowIntensity ? 500 : 700)
  );

  const scoopCount = Math.max(1, Math.round((proteinGrams / 24) * 2) / 2);
  const chickenGrams = Math.round(proteinGrams * 3.3);
  const riceGrams = Math.round(carbsGrams * 3.5);
  const bananaCount = Math.max(1, Math.round(carbsGrams / 25));

  return {
    weightKg: safeWeight,
    rpe,
    durationMinutes,
    proteinGPerKg,
    proteinGrams,
    carbsGPerKg,
    carbsGrams,
    rehydrationMl,
    intensityLabel: isHighIntensity
      ? "Alta Demanda / Choque (PSE ≥ 8)"
      : isLowIntensity
      ? "Regenerativo / Leve (PSE ≤ 4)"
      : "Moderado / Estrutural (PSE 5–7)",
    practicalSummary: `${scoopCount} dose(s) de Whey (ou ${chickenGrams}g de frango/carne magra) + ${bananaCount} banana(s) com aveia/mel (ou ${riceGrams}g de arroz/raízes cozidas).`
  };
}

export function generateAthleteNutritionPlan(
  athlete: Athlete,
  workouts: Workout[] = [],
  externalSessions: ExternalSession[] = [],
  overrideScenario?: NutritionDayScenario,
  overrideRpe?: number,
  overrideDurationMinutes?: number,
  overrideWeightKg?: number
): AthleteNutritionPlan {
  const bodyComp = getAthleteCurrentWeightAndBodyComp(athlete);
  const weightKg = overrideWeightKg && overrideWeightKg > 25 ? overrideWeightKg : bodyComp.weightKg;
  const todayStr = getLocalDateString();

  // Detect today's or most recent workout intensity
  const todayWorkouts = (workouts || []).filter(
    (w) => w.date && (w.date || "").split("T")[0] === todayStr
  );
  const todayExternal = (externalSessions || []).filter(
    (s) => s.date && (s.date || "").split("T")[0] === todayStr
  );

  let detectedRpe = 6;
  let detectedDuration = 60;

  if (todayWorkouts.length > 0 || todayExternal.length > 0) {
    const rpeValues = [
      ...todayWorkouts.map((w) => w.rpe || 6),
      ...todayExternal.map((s) => s.rpe || 7)
    ];
    detectedRpe = Math.max(...rpeValues);

    const totalMin =
      todayWorkouts.reduce((acc, w) => acc + (w.durationMinutes || 60), 0) +
      todayExternal.reduce((acc, s) => acc + (s.durationMinutes || 60), 0);
    detectedDuration = Math.max(45, totalMin);
  } else {
    const lastCompleted = (workouts || []).find((w) => w.status === "completed" && w.rpe);
    if (lastCompleted) {
      detectedRpe = lastCompleted.rpe || 6;
      detectedDuration = lastCompleted.durationMinutes || 60;
    }
  }

  const sessionRpe = overrideRpe ?? detectedRpe;
  const sessionDurationMinutes = overrideDurationMinutes ?? detectedDuration;

  let detectedScenario: NutritionDayScenario = "moderado";
  if (sessionRpe >= 8 || sessionDurationMinutes >= 95) {
    detectedScenario = "choque_jogo";
  } else if (sessionRpe <= 4 && sessionDurationMinutes <= 50) {
    detectedScenario = "leve";
  }

  const activeScenario: NutritionDayScenario = overrideScenario || detectedScenario;

  // Scenario parameters based on ISSN / ACSM / IOC Sports Nutrition Guidelines
  let dailyProteinGPerKg = 1.8;
  let dailyCarbsGPerKg = 5.0;
  let dailyFatGPerKg = 1.0;
  let baseWaterMlPerKg = 40;
  let scenarioLabel = "Dia de Treino Moderado / Força & Técnica";
  let scenarioSubtitle = "PSE 5 a 7 • Suporte para síntese miofibrilar e manutenção de glicogênio";

  if (activeScenario === "leve") {
    dailyProteinGPerKg = 1.6;
    dailyCarbsGPerKg = 3.5;
    dailyFatGPerKg = 1.0;
    baseWaterMlPerKg = 35;
    scenarioLabel = "Dia Leve / Regenerativo / Folga Ativa";
    scenarioSubtitle = "PSE 1 a 4 • Foco em reparo tecidual basal, controle glicêmico e hidratação";
  } else if (activeScenario === "choque_jogo") {
    dailyProteinGPerKg = 2.2;
    dailyCarbsGPerKg = 7.5;
    dailyFatGPerKg = 1.1;
    baseWaterMlPerKg = 45;
    scenarioLabel = "Dia Intenso / Choque Neuromuscular / Jogo";
    scenarioSubtitle = "PSE 8 a 10 • Supercompensação energética e máxima síntese proteica pós-esforço";
  }

  // Biomarker checks for fine-tuning
  const biomarkerAdjustments: BiomarkerNutritionAdjustment[] = [];

  // 1. Bioimpedance check
  if (bodyComp.fatPercentage !== null) {
    const isMale = (athlete.gender || "M") === "M";
    const highFatThreshold = isMale ? 16 : 23;
    if (bodyComp.fatPercentage > highFatThreshold) {
      dailyProteinGPerKg = Math.max(dailyProteinGPerKg, 2.2);
      biomarkerAdjustments.push({
        id: "bio-recomp",
        source: "bioimpedancia",
        title: `Proteção de Massa Magra (${bodyComp.fatPercentage.toFixed(1)}% GC)`,
        badgeColor: "cyan",
        description: `Bioimpedância indica ${bodyComp.fatPercentage.toFixed(1)}% de gordura corporal. A meta de proteína foi ajustada para ${dailyProteinGPerKg.toFixed(1)} g/kg para preservar a massa contrátil.`,
        practicalAction: "Priorizar proteínas magras em 4 a 5 refeições ao longo do dia (0,4 g/kg por refeição) e concentrar carboidratos nas janelas pré e pós-treino."
      });
    } else {
      biomarkerAdjustments.push({
        id: "bio-otimo",
        source: "bioimpedancia",
        title: `Composição Corporal Otimizada (${bodyComp.fatPercentage.toFixed(1)}% GC)`,
        badgeColor: "emerald",
        description: `Peso atual de ${weightKg} kg${bodyComp.leanMassKg ? ` com ${bodyComp.leanMassKg} kg de massa magra` : ""}. Excelente relação potência/peso.`,
        practicalAction: "Manter disponibilidade energética plena para evitar perda de tecido muscular magro."
      });
    }
  }

  // 2. Acute CMJ drop check
  const cmjList = athlete.assessments?.cmj || [];
  if (cmjList.length >= 2) {
    const latest = cmjList[cmjList.length - 1];
    const prev = cmjList[cmjList.length - 2];
    if (prev.height > 0 && latest.height > 0) {
      const dropPct = ((prev.height - latest.height) / prev.height) * 100;
      if (dropPct >= 5) {
        dailyCarbsGPerKg = Math.max(dailyCarbsGPerKg, 6.5);
        biomarkerAdjustments.push({
          id: "cmj-fadiga-nutri",
          source: "cmj_fadiga",
          title: `Suporte para Fadiga Neuromuscular (Queda CMJ -${dropPct.toFixed(1)}%)`,
          badgeColor: "rose",
          description: "Queda aguda no salto vertical associada à depleção de glicogênio intrafibrilar e microdano excêntrico.",
          practicalAction: "Incluir 5g de Creatina Monohidratada + Polifenóis (suco de uva integral/beterraba ou frutas vermelhas) e reforçar carboidrato pós-treino (1,2 g/kg)."
        });
      }
    }
  }

  // 3. ACWR check
  const acwrData = calculateACWR(workouts || [], externalSessions || []);
  const acwr = typeof acwrData === "object" && acwrData !== null ? acwrData.ratio : Number(acwrData) || 0;
  if (acwr > 1.45) {
    dailyProteinGPerKg = Math.max(dailyProteinGPerKg, 2.2);
    biomarkerAdjustments.push({
      id: "acwr-nutri",
      source: "acwr_carga",
      title: `Blindagem Tecidual em Pico de Carga (ACWR ${acwr.toFixed(2)})`,
      badgeColor: "amber",
      description: "Carga aguda elevada em relação à crônica exige maior suporte de aminoácidos essenciais e colágeno tendíneo.",
      practicalAction: "Consumir 15g de Gelatina/Colágeno Hidrolisado + 50mg de Vitamina C 45 min antes do treino para síntese de colágeno tendíneo e articular."
    });
  }

  // 4. Wellness / Readiness check
  const wellnessList = Array.isArray(athlete.wellness) ? athlete.wellness : [];
  const latestWellness = wellnessList.length > 0
    ? [...wellnessList].sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime())[0]
    : null;
  if (latestWellness) {
    const score = typeof latestWellness.readinessScore === "number"
      ? latestWellness.readinessScore
      : calculateReadiness(latestWellness);
    if (score > 0 && score < 65) {
      biomarkerAdjustments.push({
        id: "wellness-nutri",
        source: "prontidao_sono",
        title: `Protocolo Nutricional Pró-Sono & Anti-Dor (Prontidão ${Math.round(score)}%)`,
        badgeColor: "amber",
        description: "Baixa prontidão ou dor muscular relatada no check-in diário.",
        practicalAction: "Jantar rico em triptofano e carboidratos de moderado índice glicêmico 2h antes de dormir + 300mg de Magnésio e Ômega-3 (2g EPA/DHA)."
      });
    }
  }

  // Calculate Daily Macros
  const dailyProteinGrams = Math.round(weightKg * dailyProteinGPerKg);
  const dailyCarbsGrams = Math.round(weightKg * dailyCarbsGPerKg);
  const dailyFatGrams = Math.round(weightKg * dailyFatGPerKg);
  const estimatedCaloriesKcal = Math.round(
    dailyProteinGrams * 4 + dailyCarbsGrams * 4 + dailyFatGrams * 9
  );

  // Calculate Hydration
  const baseWaterLiters = Math.round((weightKg * baseWaterMlPerKg) / 100) / 10;
  const hourlySweatRateMl =
    activeScenario === "choque_jogo" ? 900 : activeScenario === "moderado" ? 650 : 450;
  const trainingExtraWaterMl = Math.round((sessionDurationMinutes / 60) * hourlySweatRateMl);
  const totalDailyWaterLiters =
    Math.round((baseWaterLiters * 1000 + trainingExtraWaterMl) / 100) / 10;

  // Pre-Workout (1.5h to 2h before)
  const preCarbsGPerKg = activeScenario === "choque_jogo" ? 1.4 : activeScenario === "moderado" ? 1.1 : 0.8;
  const preProteinGPerKg = 0.25;
  const preCarbsGrams = Math.round(weightKg * preCarbsGPerKg);
  const preProteinGrams = Math.round(weightKg * preProteinGPerKg);
  const preWaterMl = Math.round(weightKg * 6); // ~6 ml/kg 1.5h before

  const preBreadSlices = Math.max(2, Math.round(preCarbsGrams / 22));
  const preBananas = Math.max(1, Math.round(preCarbsGrams / 25));
  const preOatsGrams = Math.round(preCarbsGrams * 0.6);

  // Intra-Workout
  const intraWaterMlPerHour = hourlySweatRateMl;
  const intraCarbsPerHour =
    activeScenario === "choque_jogo" || sessionDurationMinutes > 75
      ? 45
      : activeScenario === "moderado" && sessionDurationMinutes >= 60
      ? 25
      : 0;

  // Post-Workout (0 to 60 min after)
  const postProteinGPerKg = activeScenario === "choque_jogo" ? 0.4 : activeScenario === "moderado" ? 0.35 : 0.3;
  const postCarbsGPerKg = activeScenario === "choque_jogo" ? 1.2 : activeScenario === "moderado" ? 0.9 : 0.5;
  const postProteinGrams = Math.round(weightKg * postProteinGPerKg);
  const postCarbsGrams = Math.round(weightKg * postCarbsGPerKg);
  const postRehydrationMl = Math.round(trainingExtraWaterMl * 1.25); // 125% replacement

  const postWheyScoops = Math.max(1, Math.round((postProteinGrams / 24) * 2) / 2);
  const postChickenGrams = Math.round(postProteinGrams * 3.3);
  const postRiceOrPastaGrams = Math.round(postCarbsGrams * 3.5);
  const postEggsCount = Math.max(2, Math.round(postProteinGrams / 6.5));

  return {
    athleteId: athlete.id,
    athleteName: athlete.name || "Atleta",
    weightKg,
    leanMassKg: bodyComp.leanMassKg,
    fatPercentage: bodyComp.fatPercentage,
    weightSource: bodyComp.source,
    detectedScenario,
    activeScenario,
    scenarioLabel,
    scenarioSubtitle,
    sessionRpe,
    sessionDurationMinutes,

    dailyProteinGPerKg,
    dailyProteinGrams,
    dailyCarbsGPerKg,
    dailyCarbsGrams,
    dailyFatGPerKg,
    dailyFatGrams,
    estimatedCaloriesKcal,

    baseWaterMlPerKg,
    baseWaterLiters,
    trainingExtraWaterMl,
    totalDailyWaterLiters,

    preWorkout: {
      carbsGPerKg: preCarbsGPerKg,
      carbsGrams: preCarbsGrams,
      proteinGPerKg: preProteinGPerKg,
      proteinGrams: preProteinGrams,
      waterMl: preWaterMl,
      windowLabel: "1h30 a 2h Antes do Treino",
      goalDescription:
        "Garantir glicemia estável, estoque de glicogênio hepático/muscular cheio e conforto gástrico (baixo teor de gorduras e fibras).",
      equivalences: [
        {
          title: "Opção 1 • Clássica Rápida (Energia Limpa)",
          timing: "pre",
          items: [
            `${preBananas} banana(s) prata/nanica amassada(s)`,
            `${preOatsGrams}g de aveia em flocos finos + 1 colher de sopa de mel`,
            `1 pote (170g) de iogurte natural desnatado ou ½ dose de Whey (${preProteinGrams}g proteína)`
          ],
          macrosSummary: `~${preCarbsGrams}g Carbo • ~${preProteinGrams}g Proteína`,
          practicalTip: "Excelente digestibilidade até 60–90 min antes da sessão."
        },
        {
          title: "Opção 2 • Salgada Leve",
          timing: "pre",
          items: [
            `${preBreadSlices} fatias de pão de forma ou tapioca média`,
            `2 ovos mexidos ou ${Math.round(preProteinGrams * 3)}g de frango desfiado / ricota leve`,
            `1 copo (200ml) de suco de uva integral ou laranja natural`
          ],
          macrosSummary: `~${preCarbsGrams}g Carbo • ~${preProteinGrams}g Proteína`,
          practicalTip: "Evitar queijos amarelos gordurosos ou frituras antes do treino."
        }
      ]
    },

    intraWorkout: {
      waterMlPerHour: intraWaterMlPerHour,
      totalSessionWaterMl: trainingExtraWaterMl,
      carbsGramsPerHour: intraCarbsPerHour,
      electrolytesRequired: activeScenario === "choque_jogo" || sessionDurationMinutes >= 75,
      windowLabel: "Durante a Sessão (A cada 15–20 min)",
      goalDescription:
        "Prevenir desidratação > 2% do peso corporal (que reduz a potência neural e TDF em até 12%) e preservar a velocidade de reação.",
      equivalences: [
        {
          title: "Protocolo de Hidratação Intra-Treino",
          timing: "intra",
          items: [
            `${trainingExtraWaterMl} ml de água fresca fracionada em pequenos goles a cada 15 min`,
            intraCarbsPerHour > 0
              ? `+ ${intraCarbsPerHour}g de carboidrato rápido (500ml de isotônico esportivo, maltodextrina ou 1 sachê de gel de carboidrato)`
              : "Apenas água mineral (sessão ≤ 60 min não exige carboidrato intra-treino)",
            activeScenario === "choque_jogo"
              ? "Adicionar 1 pitada de sal integral (ou 400mg de sódio) em dias quentes"
              : "Manter água refrigerada entre 10°C e 15°C para rápida absorção gástrica"
          ],
          macrosSummary: `${trainingExtraWaterMl} ml Água • ${intraCarbsPerHour}g Carbo/h`,
          practicalTip: "Nunca esperar sentir sede intensa: a sede já indica ~1,5% de desidratação."
        }
      ]
    },

    postWorkout: {
      proteinGPerKg: postProteinGPerKg,
      proteinGrams: postProteinGrams,
      leucineTargetGrams: Math.round((postProteinGrams * 0.1) * 10) / 10,
      carbsGPerKg: postCarbsGPerKg,
      carbsGrams: postCarbsGrams,
      carbToProteinRatio: activeScenario === "choque_jogo" ? "3:1 (Carbo:Prot)" : "2.5:1 (Carbo:Prot)",
      rehydrationMl: postRehydrationMl,
      windowLabel: "0 a 60 Minutos Após o Treino",
      goalDescription:
        "Ativar a via mTOR de síntese proteica miofibrilar (0,35 a 0,40 g/kg de proteína rica em leucina) e acelerar a ressíntese de glicogênio muscular.",
      equivalences: [
        {
          title: "Opção 1 • Shake Pós-Treino Imediato (Praticidade no Vestiário)",
          timing: "pos",
          items: [
            `${postWheyScoops} scoop(s) de Whey Protein Concentrado/Isolado (${postProteinGrams}g de proteína)`,
            `${Math.max(1, Math.round(postCarbsGrams / 28))} banana(s) + 30g de aveia + 1 colher de mel (ou ${postCarbsGrams}g de maltodextrina/dextrose em dias de choque)`,
            `${postRehydrationMl} ml de água nas próximas 2 horas`
          ],
          macrosSummary: `${postProteinGrams}g Proteína (${postProteinGPerKg}g/kg) • ${postCarbsGrams}g Carbo`,
          practicalTip: "Absorção rápida em 30 minutos; ideal logo após treinos de força/potência."
        },
        {
          title: "Opção 2 • Refeição Sólida Completa (Almoço / Jantar Pós-Treino)",
          timing: "pos",
          items: [
            `${postChickenGrams}g de peito de frango grelhado, peixe ou patinho bovino magro`,
            `${postRiceOrPastaGrams}g de arroz branco/integral, macarrão ou batata-doce/mandioca cozida`,
            `Vegetais variados + 1 colher de chá de azeite de oliva extra virgem`
          ],
          macrosSummary: `${postProteinGrams}g Proteína (${postProteinGPerKg}g/kg) • ${postCarbsGrams}g Carbo`,
          practicalTip: "Padrão ouro quando o treino termina próximo ao horário de almoço ou jantar."
        },
        {
          title: "Opção 3 • Lanche Proteico Sólido",
          timing: "pos",
          items: [
            `${postEggsCount} ovos inteiros mexidos + 2 fatias de queijo branco magro (ou 1 lata de atum)`,
            `${Math.max(2, Math.round(postCarbsGrams / 25))} fatias de pão integral/forma + 1 fruta média (mamão, maçã ou banana)`,
            `1 copo de 300ml de água de coco natural para reposição de potássio`
          ],
          macrosSummary: `${postProteinGrams}g Proteína • ${postCarbsGrams}g Carbo`,
          practicalTip: "Excelente combinação de aminoácidos essenciais e eletrólitos naturais."
        }
      ]
    },

    biomarkerAdjustments
  };
}
