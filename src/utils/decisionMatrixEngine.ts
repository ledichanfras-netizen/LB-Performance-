import {
  Athlete,
  Workout,
  ExternalSession,
  DecisionMatrixRow,
  AttentionSignal,
  DecisionConduct,
  DecisionConfidence
} from "../types";
import { calculateACWR, calculateReadiness } from "../utils";

// ==========================================
// MATRIZ MESTRE DE DECISÃO LB (REFERÊNCIA DE MENTORIA)
// ==========================================

export const MASTER_DECISION_MATRIX: DecisionMatrixRow[] = [
  // 1. FORÇA MÁXIMA & IMTP
  {
    id: "master-imtp-baixo-forca",
    category: "forca_maxima",
    finding: "IMTP em Construção de Base (< 1.80 kgf/kg / < 18 N/kg Masc | < 1.50 kgf/kg / < 15 N/kg Fem)",
    problemStatement: "Força de sustentação relativa abaixo do limiar ótimo para absorção de impacto",
    targetBenchmark: "Faixa Estável: ≥ 1.80 kgf/kg (≥ 18 N/kg Masc) | ≥ 1.50 kgf/kg (≥ 15 N/kg Fem)",
    context: "Atleta em formação motora ou retornando de transição/pausa prolongada",
    hypothesis: "Força de suporte abaixo da faixa funcional estável; necessita de lastro miofibrilar para amortecer impactos e aterrissagens",
    priority: "Media",
    confidence: "Alta",
    evidence: "Déficit relativo de força isométrica em relação à massa corporal",
    conduct: "dose_principal",
    intervention: "Bloco de Base Estrutural e Força Geral: Agachamento progressivo (70-80% 1RM), Levantamento Terra/Trap Bar e fortalecimento de cadeia posterior",
    practicalDetails: [
      "Agachamento Traseiro / Trap Bar: 3-4 séries x 5-6 reps @ 75-80% 1RM com controle excêntrico (intervalo 2-3 min)",
      "Isometria Superada no Rack (posição do IMTP a 130-140°): 3 séries x 5 segundos de contração máxima",
      "Acessórios de Cadeia Posterior (RDL, Elevação Pélvica, Panturrilha): 3 séries x 8 reps"
    ],
    monitoring: "IMTP a cada 3 a 4 semanas (célula de carga)",
    reassessmentTimeline: "3 a 4 semanas",
    transfer: "Sustentação física em aterrissagens, estabilidade pélvica e resiliência articular",
    evidenceReference: "Suchomel et al. (2016), Comfort et al. (2019, 2024), Parâmetros LB Sports"
  },
  {
    id: "master-imtp-normal-estavel",
    category: "forca_maxima",
    finding: "IMTP Funcional Estável (1.80 a 2.60 kgf/kg Masc | 1.50 a 2.20 kgf/kg Fem)",
    problemStatement: "Nenhum déficit crítico; base de força consolidada",
    targetBenchmark: "Faixa Estável: 1.80 a 2.60 kgf/kg (Masc) | 1.50 a 2.20 kgf/kg (Fem)",
    context: "Atleta com excelente equilíbrio de força relativa para esportes coletivos e de salto",
    hypothesis: "Força de suporte consolidada e segura; janela ideal para priorizar taxa de subida de força (RFD), aceleração e potência reativa",
    priority: "Normal",
    confidence: "Alta",
    evidence: "Valores funcionais consolidados dentro do Sweet Spot de força relativa",
    conduct: "monitorar",
    intervention: "Manutenção Econômica de Força com Foco em Força Rápida e RFD: Cargas submáximas (75-82% 1RM) com foco na máxima intenção concêntrica e transferências balísticas",
    practicalDetails: [
      "Agachamento com Foco em Velocidade: 3 séries x 3-4 reps @ 75-80% 1RM com fase concêntrica máxima",
      "Jump Squats com Barra Hexagonal ou Halteres (15-20% peso corporal)",
      "Pliometria e Treinamento do Ciclo Alongamento-Encurtamento (CAE)"
    ],
    monitoring: "Monitoramento de manutenção a cada 4 a 6 semanas",
    reassessmentTimeline: "4 a 6 semanas",
    transfer: "Eficiência mecânica nos saltos e sprints sem acúmulo de peso morto ou lentidão",
    evidenceReference: "Suchomel et al. (2016), Turner et al. (2020)"
  },
  {
    id: "master-imtp-otimizado",
    category: "forca_maxima",
    finding: "IMTP Otimizado / Alto Nível (≥ 2.60 kgf/kg Masc | ≥ 2.20 kgf/kg Fem)",
    problemStatement: "Força de pico de nível elite; sem gargalo de força pura",
    targetBenchmark: "≥ 2.60 kgf/kg (≥ 26 N/kg Masc) | ≥ 2.20 kgf/kg (≥ 22 N/kg Fem)",
    context: "Atleta com níveis superiores de força relativa em relação ao peso corporal",
    hypothesis: "Força máxima consolidada em patamar de elite; não constitui gargalo para gestos esportivos",
    priority: "Normal",
    confidence: "Alta",
    evidence: "Patamar de alto rendimento com força relativa superior a 2.6x peso corporal",
    conduct: "microdose",
    intervention: "Manutenção em Microdoses e Foco Pleno em Potência Balística e Reatividade Elástica",
    practicalDetails: [
      "Agachamento Pesado de Manutenção: 2 séries x 2-3 reps @ 85% 1RM (1x/semana em microdose)",
      "Pliometria de Alto Nível (Drop Jumps e Saltos Reativos)",
      "Transferência específica para velocidade e impulsão"
    ],
    monitoring: "Reavaliação a cada 6 a 8 semanas",
    reassessmentTimeline: "6 a 8 semanas",
    transfer: "Preservação da robustez mecânica com prontidão neural máxima para velocidade e impulsão",
    evidenceReference: "Stone et al. (2004), Suchomel et al. (2016)"
  },

  // 2. TAXA DE DESENVOLVIMENTO DE FORÇA (TDF / RFD)
  {
    id: "master-tdf-baixa",
    category: "taxa_desenvolvimento_forca",
    finding: "TDF / RFD Baixa (Tempo até pico > 400 ms ou RFD100 reduzida)",
    problemStatement: "Lentidão na produção de força nos primeiros 100-200ms de contato",
    targetBenchmark: "Pico em < 250 ms | RFD100 explosiva",
    context: "Atleta com boa força máxima, mas lentidão no arranque ou sprint inicial",
    hypothesis: "Taxa de disparo neural lenta e sincronização insuficiente de unidades motoras rápidas (Tipo IIx)",
    priority: "Alta",
    confidence: "Alta",
    evidence: "Tempo até pico > 400 ms em célula de carga / plataforma de força",
    conduct: "dose_principal",
    intervention: "Treinamento de Força Rápida (Ballistic Training), Isometria de Taxa Explosiva e Saltos com Carga Leve",
    practicalDetails: [
      "Jump Squats com Barra Hexagonal: 4 séries x 4 reps a máxima velocidade (20% peso corporal)",
      "Isometria Explosiva ('empurrar o chão o mais rápido possível'): 4 x 3s com descanso de 90s",
      "Kettlebell Swings Pesados e Arremessos de Medicine Ball: 3 x 5 reps"
    ],
    monitoring: "Cálculo de RFD nos primeiros 100-200ms a cada quinzena",
    reassessmentTimeline: "2 semanas",
    transfer: "Arranque inicial de sprint (0 a 10m), antecipação em disputas de bola e primeiro passo reativo",
    evidenceReference: "Aagaard et al. (2002), Maffiuletti et al. (2016)"
  },

  // 3. POTÊNCIA CONCÊNTRICA E CMJ
  {
    id: "master-cmj-baixo-potencia",
    category: "potencia_cmj",
    finding: "CMJ Baixo (< 35 cm Masc / < 25 cm Fem) com Base de Força Regular",
    problemStatement: "Baixa impulsão vertical e potência pico concêntrica reduzida",
    targetBenchmark: "≥ 42 cm (Masc) | ≥ 30 cm (Fem)",
    context: "Atleta com pouca impulsão vertical e baixa potência relativa (< 48 W/kg)",
    hypothesis: "Déficit de coordenação intermuscular no contra-movimento e baixa potência concêntrica de membros inferiores",
    priority: "Alta",
    confidence: "Alta",
    evidence: "Salto vertical CMJ abaixo da média da modalidade em tapete/plataforma",
    conduct: "dose_principal",
    intervention: "Complex Training / PAP (Potenciação Pós-Ativação) alternando força e saltos livres",
    practicalDetails: [
      "Contraste Francês: Agachamento pesado (2 reps @ 85%) + 3 Saltos Verticais sobre barreira",
      "Agachamentos com máxima aceleração concêntrica (50-60% 1RM): 4 x 4 reps",
      "Drop Lands com foco em frenagem e re-explosão imediata: 3 x 4 reps"
    ],
    monitoring: "CMJ quinzenal (altura e potência pico via Sayers)",
    reassessmentTimeline: "2 semanas",
    transfer: "Duelos aéreos, saltos de bloqueio/cabeceio e aceleração de corrida",
    evidenceReference: "Sayers et al. (1999), Claudino et al. (2017)"
  },
  {
    id: "master-cmj-queda-fadiga",
    category: "potencia_cmj",
    finding: "Queda Aguda no CMJ (> 5% a 8% em relação à linha de base)",
    problemStatement: "Fadiga neuromuscular aguda do SNC detectada no teste de salto",
    targetBenchmark: "Variação < ± 3% da média do atleta",
    context: "Atleta em semana competitiva intensa ou após sequência de jogos/treinos",
    hypothesis: "Fadiga neuromuscular aguda do Sistema Nervoso Central (SNC) ou depleção de substratos",
    priority: "Alta",
    confidence: "Alta",
    evidence: "Queda superior a 5% em relação à média das últimas 3 semanas",
    conduct: "microdose",
    isAttentionSignal: true,
    intervention: "Ajuste Imediato de Carga: redução de volume mecânico (-30%), deload ativo e reforço de sono",
    practicalDetails: [
      "Vetar treinos de saltos de alta intensidade e sprints máximos por 48h",
      "Sessão regenerativa: mobilidade, hidroterapia ou liberação miofascial suave",
      "Aumentar suporte de carboidratos pós-sessão e monitorar horas de sono"
    ],
    monitoring: "CMJ diário ou pré-treino até restabelecer a linha de base",
    reassessmentTimeline: "48 a 72 horas",
    transfer: "Preservação física, recuperação da prontidão de jogo e proteção tecidual",
    evidenceReference: "Gathercole et al. (2014), Cormack et al. (2008)"
  },

  // 4. FORÇA REATIVA & DROP JUMP (STIFFNESS)
  {
    id: "master-dj-lento-stiffness",
    category: "forca_reativa_dj",
    finding: "Drop Jump Lento (Tempo de Contato > 220 ms / RSI < 1.5)",
    problemStatement: "Amortecimento excessivo e baixa rigidez elástica de tornozelo",
    targetBenchmark: "Tc < 200 ms | RSI ≥ 2.0 (Elite)",
    context: "Atleta com boa impulsão em salto simples, mas perda de velocidade no chão",
    hypothesis: "Baixa rigidez (stiffness) do tornozelo e tendão de Aquiles; Ciclo Alongamento-Encurtamento (CAE) excessivamente amortecido",
    priority: "Alta",
    confidence: "Alta",
    evidence: "Tempo de contato em solo elevado (> 220ms) e RSI < 1.50",
    conduct: "microdose",
    intervention: "Pliometria Rápida de Solo Rígido: Pogo Jumps, saltos com calcanhar elevado e drop jumps de 20-30cm",
    practicalDetails: [
      "Ankle Pogo Jumps (sem flexão de joelho): 3 séries x 10-12 contatos rápidos (< 180 ms)",
      "Drop Jump da caixa de 20-25cm com foco em 'chão quente' (sair imediatamente): 3 x 5 reps",
      "Isometria pesada de sóleo/gastrocnêmio em pé (plantar flexão sustentada): 3 x 20s"
    ],
    monitoring: "Drop Jump e RSI a cada 2 semanas",
    reassessmentTimeline: "2 semanas",
    transfer: "Eficiência de corrida (menor gasto energético por passada), fintas dinâmicas e transições ágeis",
    evidenceReference: "Flanagan & Comyns (2008), Young (1995)"
  },

  // 5. ASSIMETRIA E PREVENÇÃO DE LESÕES
  {
    id: "master-assimetria-quad-ham",
    category: "assimetria_prevencao",
    finding: "Assimetria Bilateral Elevada (> 12% a 15% entre membros)",
    problemStatement: "Desequilíbrio de força entre perna direita e esquerda",
    targetBenchmark: "Assimetria ≤ 10%",
    context: "Atleta em fase de retorno de lesão (RTP) ou desequilíbrio unilateral crônico",
    hypothesis: "Inibição artrogênica muscular, histórico de estiramento ou dominância mecânica exacerbada",
    priority: "Alta",
    confidence: "Alta",
    evidence: "Diferença bilateral mensurada em dinamometria ou salto unilateral",
    conduct: "microdose",
    isAttentionSignal: true,
    intervention: "Treinamento Unilateral Prioritário (compensação do membro deficitário com 2:1 no volume)",
    practicalDetails: [
      "Agachamento Búlgaro (RFESS): 4 séries lado deficitário x 2 séries lado dominante (6-8 reps)",
      "Single Leg Romanian Deadlift (RDL Unilateral): 3 séries x 6-8 reps com cadência controlada",
      "Saltos e aterrissagens unilaterais (Single-leg drop lands) com foco em simetria de frenagem: 3 x 4 reps"
    ],
    monitoring: "Dinamometria isométrica ou salto unilateral a cada 2-3 semanas",
    reassessmentTimeline: "2 a 3 semanas",
    transfer: "Proteção contra recidivas, desaceleração segura em mudanças de direção bruscas",
    evidenceReference: "Croisier et al. (2008), Impellizzeri et al. (2007)"
  },
  {
    id: "master-razao-iq-critica",
    category: "assimetria_prevencao",
    finding: "Razão Isquiotibiais / Quadríceps Crítica (Razão I:Q < 50%)",
    problemStatement: "Isquiotibiais fracos em relação à força dos extensores do joelho",
    targetBenchmark: "Razão I:Q entre 50% e 60%",
    context: "Atleta com quadríceps hipertrofiado ou dominante sem suporte de cadeia posterior",
    hypothesis: "Força de frenagem dos isquiotibiais insuficiente para proteger o Ligamento Cruzado Anterior (LCA)",
    priority: "Critica",
    confidence: "Alta",
    evidence: "Razão funcional excêntrica/concêntrica I:Q inferior a 50%",
    conduct: "microdose",
    isAttentionSignal: true,
    intervention: "Fortalecimento Excêntrico Intenso de Isquiotibiais e Ponte com Flexão de Joelho",
    practicalDetails: [
      "Nordic Hamstring Exercise: 3 séries de 4 a 6 repetições controladas na descida (3-4s)",
      "Stiff com halteres com foco no alongamento sob tensão: 3 x 8 reps",
      "Flexão de joelho nórdica assistida ou em máquina deitada: 3 x 8 reps"
    ],
    monitoring: "Dinamometria de flexão/extensão mensal",
    reassessmentTimeline: "4 semanas",
    transfer: "Prevenção direta de estiramentos de isquiotibiais e estabilização de joelho em sprints",
    evidenceReference: "Al Attar et al. (2017), Baroni et al. (2020)"
  },

  // 6. VELOCIDADE E SPRINT
  {
    id: "master-sprint-aceleracao-10m",
    category: "velocidade_sprint",
    finding: "Aceleração 10m Lenta (Ratio V10m / V30m < 0.65 ou tempo 10m > 1.85s Masc)",
    problemStatement: "Falta de projeção e força horizontal nos primeiros metros de sprint",
    targetBenchmark: "Tempo 10m < 1.70s | Ratio > 0.70",
    context: "Atleta com dificuldade em vencer o primeiro passo ou sair da marcação curta",
    hypothesis: "Ineficiência na aplicação de força horizontal e ângulo de projeção do centro de massa elevado precocemente",
    priority: "Alta",
    confidence: "Moderada",
    evidence: "Fotocélula de 10 metros com tempo acima do referencial para a posição",
    conduct: "dose_principal",
    intervention: "Sprints Resistidos com Trenó Pesado (Heavy Sled Sprint) e saltos horizontais unipodais",
    practicalDetails: [
      "Sled Sprints com carga de 30-40% do peso corporal: 4-5 tiros de 10 a 15 metros",
      "Saídas de blocos em diferentes posturas (de joelhos, em 3 apoios): 4 repetições",
      "Broad Jumps (Salto em distância parado) com aterrissagem estável: 3 x 4 reps"
    ],
    monitoring: "Fotocélula de 5m e 10m a cada 3 semanas",
    reassessmentTimeline: "3 semanas",
    transfer: "Primeiro passo veloz, ultrapassagem da marcação e transição ataque-defesa ágil",
    evidenceReference: "Morin et al. (2016), Petrakos et al. (2016)"
  },

  // 7. CAPACIDADE AERÓBICA & VO2MAX
  {
    id: "master-vo2-baixo",
    category: "capacidade_aerobica",
    finding: "VO2 Máximo Baixo (< 45 ml/kg/min Masc / < 38 Fem) ou VAM < 14 km/h",
    problemStatement: "Queda prematura de rendimento e recuperação lenta entre estímulos",
    targetBenchmark: "≥ 55 ml/kg/min (Masc) | ≥ 45 ml/kg/min (Fem)",
    context: "Atleta que demonstra perda de rendimento e lentidão nos minutos finais das partidas",
    hypothesis: "Capacidade mitocondrial e volume sistólico cardíaco insuficientes para o transporte e reciclagem de oxigênio",
    priority: "Alta",
    confidence: "Moderada",
    evidence: "Teste de campo (Yo-Yo IR1 / T-Car) com VAM abaixo do perfil competitivo",
    conduct: "microdose",
    intervention: "Treinamento Intervalado de Alta Intensidade (HIIT longo e curto) com base na VAM",
    practicalDetails: [
      "HIIT Curto: Tiros de 15s a 115% da VAM com 15s de recuperação passiva (2 blocos de 8 min)",
      "HIIT Longo: 4 séries de 3 minutos a 90-95% da FCmáx com 2 min de recuperação ativa",
      "Jogos Reduzidos (Small-Sided Games - SSG) em campos com dimensões ampliadas"
    ],
    monitoring: "Teste de VAM (T-Car ou Yo-Yo) a cada 6 semanas",
    reassessmentTimeline: "6 semanas",
    transfer: "Menor perda de precisão técnica no final da partida e aceleração da recuperação entre tiros",
    evidenceReference: "Buchheit & Laursen (2013), Bangsbo et al. (2008)"
  },

  // 8. CONTROLE DE CARGA & RECUPERAÇÃO
  {
    id: "master-acwr-zona-perigo",
    category: "controle_carga_recuperacao",
    finding: "ACWR Elevado (> 1.5 - Sobrecarga Aguda Elevada)",
    problemStatement: "Carga aguda desproporcional à tolerância crônica acumulada",
    targetBenchmark: "ACWR entre 0.8 e 1.3 (Sweet Spot)",
    context: "Pico agudo de volume/intensidade nos últimos 7 dias sem sustentação crônica prévia",
    hypothesis: "Sobrecarga de fadiga aguda com desequilíbrio tecidual; vulnerabilidade neuromuscular aumentada",
    priority: "Critica",
    confidence: "Alta",
    evidence: "Razão de carga aguda:crônica superior a 1.50 nos últimos 7 dias",
    conduct: "microdose",
    isAttentionSignal: true,
    intervention: "Deload Imediato de Carga: corte de 40% a 50% do volume na sessão seguinte e veto a estímulos máximos",
    practicalDetails: [
      "Substituir treino de choque por treino regenerativo ou técnico de baixa rotação",
      "Vetar sprints e saltos de intensidade máxima nas próximas 48 a 72 horas",
      "Crioterapia de imersão (10 min a 10°C) e ênfase na reposição glicídica e hidratação"
    ],
    monitoring: "Carga diária (sRPE) e cálculo contínuo do ACWR",
    reassessmentTimeline: "Diário (24-48h)",
    transfer: "Prevenção de estiramentos, redução de fadiga residual e retorno ao Sweet Spot de adaptação",
    evidenceReference: "Gabbett et al. (2016), Hulin et al. (2016)"
  }
];

// ==========================================
// MOTOR DE DIAGNÓSTICO DO ATLETA (DINÂMICO)
// ==========================================

export interface AthleteDecisionReport {
  athleteId: string;
  athleteName: string;
  generatedAt: string;
  activeRows: DecisionMatrixRow[];
  attentionSignals: AttentionSignal[];
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  normalCount: number;
  conductSummary: {
    dosePrincipalCount: number;
    microdosesCount: number;
    monitorarCount: number;
  };
  overallStatus: "critico" | "atencao" | "estavel" | "excelente";
  executiveSummary: string;
}

export function generateAthleteDecisionMatrix(
  athlete: Athlete,
  workouts?: Workout[],
  externalSessions?: ExternalSession[]
): AthleteDecisionReport {
  const activeRows: DecisionMatrixRow[] = [];
  const attentionSignals: AttentionSignal[] = [];
  const gender = athlete.gender || "M";
  const assessments = athlete.assessments || {};

  // 1. ANÁLISE DE IMTP (FORÇA MÁXIMA & TDF)
  const imtpHistory = assessments.imtp || [];
  const latestImtp = imtpHistory.slice(-1)[0];
  const prevImtp = imtpHistory.length > 1 ? imtpHistory[imtpHistory.length - 2] : undefined;

  if (latestImtp) {
    const rawRelForce = latestImtp.relativePeakForce || 0;
    const timeToPeak = latestImtp.timeToPeakForce || 0;
    const peakForce = latestImtp.peakForce || 0;
    const athleteWeight = athlete.weight || latestImtp.weight || 75;

    let relForceKgf = 0;
    if (rawRelForce > 0) {
      relForceKgf = rawRelForce < 10 ? rawRelForce : rawRelForce / 9.80665;
    } else if (peakForce > 0 && athleteWeight > 0) {
      relForceKgf = peakForce / athleteWeight;
    }
    const relForceNkg = relForceKgf * 9.80665;

    const isFemale = gender === "F";
    const minEstavelKgf = isFemale ? 1.50 : 1.80;
    const minEstavelNkg = isFemale ? 15.0 : 18.0;
    const targetOtimizadoKgf = isFemale ? 2.20 : 2.60;
    const targetOtimizadoNkg = isFemale ? 21.5 : 25.5;

    // Longitudinal check if previous IMTP exists
    let longitudinalDiffStr = "";
    if (prevImtp) {
      const prevRelForce = prevImtp.relativePeakForce ? (prevImtp.relativePeakForce < 10 ? prevImtp.relativePeakForce : prevImtp.relativePeakForce / 9.80665) : 0;
      if (prevRelForce > 0 && relForceKgf > 0) {
        const diffPct = ((relForceKgf - prevRelForce) / prevRelForce) * 100;
        longitudinalDiffStr = diffPct >= 0 ? ` (+${diffPct.toFixed(1)}% vs teste anterior)` : ` (${diffPct.toFixed(1)}% vs teste anterior)`;
      }
    }

    if (relForceKgf > 0) {
      if (relForceKgf < minEstavelKgf) {
        const isCritico = relForceKgf < (isFemale ? 1.20 : 1.40);

        activeRows.push({
          id: "dyn-imtp-base",
          category: "forca_maxima",
          finding: `Força de Base / IMTP: ${relForceKgf.toFixed(2)} kgf/kg (${relForceNkg.toFixed(1)} N/kg)`,
          problemStatement: `Força isométrica relativa abaixo da meta funcional de sustentação (< ${minEstavelKgf.toFixed(2)} kgf/kg)`,
          metricValue: `${relForceKgf.toFixed(2)} kgf/kg (${relForceNkg.toFixed(1)} N/kg)`,
          targetBenchmark: `Faixa Estável: ≥ ${minEstavelKgf.toFixed(2)} kgf/kg (≥ ${minEstavelNkg.toFixed(0)} N/kg)`,
          context: `${athlete.modality || "Esporte"} / ${gender === "M" ? "Masculino" : "Feminino"} • Força Relativa: ${relForceKgf.toFixed(2)}x peso corporal`,
          hypothesis: `Atleta em fase de estruturação de força de base. Necessidade de lastro miofibrilar e estabilidade articular antes de elevar volumes de choque.`,
          priority: isCritico ? "Critica" : "Media",
          confidence: imtpHistory.length >= 2 ? "Alta" : "Moderada",
          evidence: `IMTP medido em ${relForceKgf.toFixed(2)} kgf/kg${longitudinalDiffStr}. Abaixo da meta de ${minEstavelKgf.toFixed(2)} kgf/kg.`,
          conduct: "dose_principal",
          intervention: "Bloco de Base Estrutural e Força Funcional: Agachamento progressivo (70-80% 1RM), Levantamento Terra/Trap Bar e fortalecimento de cadeia posterior.",
          practicalDetails: [
            "Agachamento Traseiro / Trap Bar: 3-4 séries x 5-6 reps @ 75-80% 1RM com controle excêntrico (intervalo 2-3 min)",
            "Isometria Superada no Rack (posição do IMTP a 130-140°): 3 séries x 5 segundos de contração firme",
            "Acessórios de Cadeia Posterior (RDL, Elevação Pélvica, Panturrilha): 3 séries x 8 reps"
          ],
          monitoring: "IMTP a cada 3-4 semanas (célula de carga)",
          reassessmentTimeline: "3 a 4 semanas",
          transfer: "Suporte articular em aterrissagens, estabilidade pélvica e resiliência mecânica",
          evidenceReference: "Suchomel et al. (2016), Comfort et al. (2024)",
          status: "detectado"
        });
      } else if (relForceKgf >= minEstavelKgf && relForceKgf < targetOtimizadoKgf) {
        activeRows.push({
          id: "dyn-imtp-estavel",
          category: "forca_maxima",
          finding: `Força Máxima / IMTP Funcional: ${relForceKgf.toFixed(2)} kgf/kg (${relForceNkg.toFixed(1)} N/kg)`,
          problemStatement: "Base de força consolidada; não constitui gargalo limitante no momento",
          metricValue: `${relForceKgf.toFixed(2)} kgf/kg (${relForceNkg.toFixed(1)} N/kg)`,
          targetBenchmark: `Faixa Estável: ${minEstavelKgf.toFixed(2)} a ${targetOtimizadoKgf.toFixed(2)} kgf/kg`,
          context: `${athlete.modality || "Esporte"} / ${gender === "M" ? "Masculino" : "Feminino"} • Força de Suporte Consolidada`,
          hypothesis: `Força relativa adequada e equilibrada para as demandas do ${athlete.modality || "esporte"}. A base de suporte estável permite priorizar taxa de subida de força (RFD), aceleração e potência reativa.`,
          priority: "Normal",
          confidence: "Alta",
          evidence: `IMTP estável em ${relForceKgf.toFixed(2)} kgf/kg${longitudinalDiffStr}. Atende aos padrões funcionais da modalidade.`,
          conduct: "monitorar",
          intervention: "Manutenção de Força com Foco em Força Rápida e RFD: Cargas submáximas (75-82% 1RM) com foco na máxima intenção concêntrica.",
          practicalDetails: [
            "Agachamento com Foco em Velocidade: 3 séries x 3 reps @ 75-80% 1RM (máxima velocidade concêntrica)",
            "Jump Squats com Barra Hexagonal (15-20% peso corporal): 3 séries x 4 reps",
            "Transferência direta para aterrissagens e impulsão específica da modalidade"
          ],
          monitoring: "Monitoramento a cada 4 a 6 semanas",
          reassessmentTimeline: "4 a 6 semanas",
          transfer: "Eficiência mecânica nos saltos e sprints sem sobrepeso de massa muscular não-funcional",
          evidenceReference: "Suchomel et al. (2016), Turner et al. (2020)",
          status: "normal"
        });
      } else {
        activeRows.push({
          id: "dyn-imtp-otimizado",
          category: "forca_maxima",
          finding: `Força Máxima / IMTP de Alto Nível: ${relForceKgf.toFixed(2)} kgf/kg (${relForceNkg.toFixed(1)} N/kg)`,
          problemStatement: "Força relativa em patamar de elite",
          metricValue: `${relForceKgf.toFixed(2)} kgf/kg (${relForceNkg.toFixed(1)} N/kg)`,
          targetBenchmark: `≥ ${targetOtimizadoKgf.toFixed(2)} kgf/kg (≥ ${targetOtimizadoNkg.toFixed(0)} N/kg)`,
          context: `${athlete.modality || "Esporte"} / ${gender === "M" ? "Masculino" : "Feminino"} • Força Relativa de Elite`,
          hypothesis: "Excelente capacidade de produção de força máxima em relação à massa corporal. Força não atua como fator limitante.",
          priority: "Normal",
          confidence: "Alta",
          evidence: `Nível de força superior (≥ ${targetOtimizadoKgf.toFixed(2)} kgf/kg)${longitudinalDiffStr}.`,
          conduct: "microdose",
          intervention: "Manutenção Econômica (1x/semana em microdose) e Foco Pleno em Potência Balística e Reatividade Elástica",
          practicalDetails: [
            "Agachamento Pesado de Manutenção: 2 séries x 2-3 reps @ 85% 1RM (1x/semana)",
            "Jump Squats e Pliometria de Alto Nível (Drop Jumps)",
            "Transferência direta para gestos esportivos de explosão máxima"
          ],
          monitoring: "Reavaliação a cada 6 a 8 semanas",
          reassessmentTimeline: "6 a 8 semanas",
          transfer: "Preservação da estabilidade mecânica com prontidão neural para velocidade e saltos",
          evidenceReference: "Suchomel et al. (2016), Comfort et al. (2024)",
          status: "otimo"
        });
      }
    }

    // TDF / RFD Análise
    if (timeToPeak > 400) {
      activeRows.push({
        id: "dyn-imtp-tdf-lenta",
        category: "taxa_desenvolvimento_forca",
        finding: `Força Rápida / TDF: Lenta (${timeToPeak} ms até pico)`,
        problemStatement: `Lentidão neuromuscular na subida de força (${timeToPeak} ms até o pico)`,
        metricValue: `${timeToPeak} ms`,
        targetBenchmark: "< 250 ms até o pico",
        context: "Transição neuromuscular na decolagem do tiro ou salto",
        hypothesis: "Taxa de disparo neural inicial lenta e sincronização insuficiente de unidades motoras rápidas",
        priority: "Alta",
        confidence: "Alta",
        evidence: `Tempo até pico de ${timeToPeak} ms (limiar ideal < 250 ms). Déficit na janela inicial de 100-200ms.`,
        conduct: "dose_principal",
        intervention: "Treino Balístico com Cargas Leves (Jump Squats) e Exercícios com Foco em Máxima Intenção de Velocidade",
        practicalDetails: [
          "Jump Squats com Barra Hexagonal: 4 séries x 4 reps com 20% do peso corporal (foco em máxima aceleração)",
          "Isometria Balística Rápida ('empurrar o mais rápido possível'): 3 x 3s",
          "Arremessos de Medicine Ball em rotação/frente: 3 x 6 reps"
        ],
        monitoring: "RFD100/200 a cada 2 semanas",
        reassessmentTimeline: "2 semanas",
        transfer: "Primeiro passo explosivo de aceleração e reação imediata de finta",
        evidenceReference: "Aagaard et al. (2002), Maffiuletti et al. (2016)",
        status: "detectado"
      });
    } else if (timeToPeak > 0) {
      activeRows.push({
        id: "dyn-imtp-tdf-estavel",
        category: "taxa_desenvolvimento_forca",
        finding: `Força Rápida / TDF: Estável (${timeToPeak} ms até pico)`,
        problemStatement: "Taxa de subida de força rápida e eficiente",
        metricValue: `${timeToPeak} ms`,
        targetBenchmark: "< 250 ms até o pico",
        context: "Disparo neuromuscular ágil",
        hypothesis: "Excelente sincronização de unidades motoras de contração rápida",
        priority: "Normal",
        confidence: "Alta",
        evidence: `Tempo de subida de força de ${timeToPeak} ms, dentro do padrão explosivo ideal.`,
        conduct: "monitorar",
        intervention: "Manutenção de Força Rápida com saltos e acelerações específicas",
        practicalDetails: [
          "Exercícios balísticos de manutenção no aquecimento: 2 séries x 4 saltos verticais com intenção máxima"
        ],
        monitoring: "Monitoramento quinzenal",
        reassessmentTimeline: "2 a 4 semanas",
        transfer: "Reatividade imediata no primeiro passo",
        evidenceReference: "Maffiuletti et al. (2016)",
        status: "normal"
      });
    }
  }

  // 2. ANÁLISE DE CMJ (POTÊNCIA VERTICAL & FADIGA)
  const cmjHistory = assessments.cmj || [];
  const latestCmj = cmjHistory.slice(-1)[0];
  const prevCmj = cmjHistory.length > 1 ? cmjHistory[cmjHistory.length - 2] : undefined;

  if (latestCmj) {
    const h = latestCmj.height || 0;
    const pRel = latestCmj.power && latestCmj.weight ? (latestCmj.power / latestCmj.weight) : 0;
    const minH = gender === "F" ? 28 : 38;
    const targetH = gender === "F" ? 32 : 44;

    let dropPct = 0;
    if (prevCmj && prevCmj.height && latestCmj.height) {
      dropPct = ((prevCmj.height - latestCmj.height) / prevCmj.height) * 100;
    }

    if (h > 0 && h < minH) {
      activeRows.push({
        id: "dyn-cmj-baixo",
        category: "potencia_cmj",
        finding: `Potência Concêntrica / CMJ: ${h.toFixed(1)} cm (${pRel > 0 ? pRel.toFixed(1) + " W/kg" : "Abaixo da meta"})`,
        problemStatement: `Altura de salto vertical abaixo do benchmark competitivo (< ${minH} cm)`,
        metricValue: `${h.toFixed(1)} cm`,
        targetBenchmark: `≥ ${targetH} cm`,
        context: "Potência concêntrica elástica de membros inferiores",
        hypothesis: "Baixa taxa de aceleração concêntrica na extensão tripla e déficit de potência relativa",
        priority: "Alta",
        confidence: cmjHistory.length >= 2 ? "Alta" : "Moderada",
        evidence: `CMJ atual em ${h.toFixed(1)} cm vs meta de ${targetH} cm.`,
        conduct: "dose_principal",
        intervention: "Treino Combinado de Potência (Complex Training) e Agachamentos Dinâmicos a 50-60% 1RM",
        practicalDetails: [
          "Contraste Francês: Agachamento pesado (2 reps @ 85%) + 3 saltos livres sobre barreira",
          "Agachamentos com máxima velocidade concêntrica: 4 x 4 reps @ 55% 1RM",
          "Pliometria extensiva moderada: saltos contínuos sobre barreiras baixas (3 x 6 reps)"
        ],
        monitoring: "CMJ quinzenal",
        reassessmentTimeline: "2 semanas",
        transfer: "Potência de impulsão para cabeceios, bloqueios e decolagem de sprints",
        evidenceReference: "Sayers et al. (1999), Claudino et al. (2017)",
        status: "detectado"
      });
    } else if (h >= minH) {
      activeRows.push({
        id: "dyn-cmj-estavel",
        category: "potencia_cmj",
        finding: `Potência / CMJ: Estável em ${h.toFixed(1)} cm (${pRel > 0 ? pRel.toFixed(1) + " W/kg" : "Consolidado"})`,
        problemStatement: "Potência de salto vertical em patamar estável",
        metricValue: `${h.toFixed(1)} cm`,
        targetBenchmark: `≥ ${minH} cm`,
        context: "Impulsão vertical funcional",
        hypothesis: "Boa eficiência de utilização da energia elástica no contramovimento",
        priority: "Normal",
        confidence: "Alta",
        evidence: `Salto vertical de ${h.toFixed(1)} cm atende aos critérios funcionais.`,
        conduct: "monitorar",
        intervention: "Manutenção de potência concêntrica através de saltos livres integrados ao aquecimento",
        practicalDetails: [
          "3 saltos verticais máximos na fase de ativação neural da sessão principal"
        ],
        monitoring: "CMJ quinzenal",
        reassessmentTimeline: "2 a 4 semanas",
        transfer: "Manutenção do alcance aéreo",
        evidenceReference: "Claudino et al. (2017)",
        status: "normal"
      });
    }

    // Verificar se houve queda aguda de CMJ em relação ao teste anterior
    if (dropPct >= 5.0) {
      attentionSignals.push({
        id: "att-cmj-queda",
        type: "queda_performance",
        title: `Queda Aguda no Salto Vertical (-${dropPct.toFixed(1)}%)`,
        severity: dropPct >= 8.0 ? "critico" : "atencao",
        description: `O atleta registrou queda de ${dropPct.toFixed(1)}% na altura de voo do CMJ (${prevCmj?.height}cm ➔ ${latestCmj.height}cm), sugerindo fadiga neuromuscular aguda do SNC.`,
        actionRecommendation: "Reduzir volume mecânico de choque em 25-30% e evitar saltos de alta densidade nas próximas 48 horas."
      });

      activeRows.push({
        id: "dyn-cmj-queda-aguda",
        category: "potencia_cmj",
        finding: `Queda Aguda no Salto CMJ: -${dropPct.toFixed(1)}% (${prevCmj?.height}cm ➔ ${latestCmj.height}cm)`,
        problemStatement: `Queda de rendimento neuromuscular aguda superior a 5% vs baseline anterior`,
        metricValue: `-${dropPct.toFixed(1)}%`,
        targetBenchmark: "Variação < ±3%",
        context: "Oscilação pós-treino ou sequência densa de jogos",
        hypothesis: "Fadiga neuromuscular aguda do SNC acumulada e depleção metabólica local",
        priority: dropPct >= 8.0 ? "Critica" : "Alta",
        confidence: "Alta",
        evidence: `Comparação longitudinal direta: ${prevCmj?.height} cm ➔ ${latestCmj.height} cm (-${dropPct.toFixed(1)}%).`,
        conduct: "microdose",
        isAttentionSignal: true,
        intervention: "Ajuste de Carga Imediato: redução do volume de choque (-25%), deload regenerativo e sono",
        practicalDetails: [
          "Vetar exercícios de saltos de alta intensidade pelas próximas 48h",
          "Sessão regenerativa com mobilidade ativa e recuperação miofascial",
          "Reavaliação de CMJ antes da próxima sessão pesada de treino"
        ],
        monitoring: "CMJ no início de cada microciclo",
        reassessmentTimeline: "48 a 72 horas",
        transfer: "Evitar lesões de tecidos moles e restabelecer o teto de potência competitiva",
        evidenceReference: "Gathercole et al. (2014), Cormack et al. (2008)",
        status: "detectado"
      });
    }
  }

  // 3. ANÁLISE DE DROP JUMP (CAE / RSI & STIFFNESS)
  const latestDj = assessments.dropJump?.slice(-1)[0];
  if (latestDj) {
    const tc = latestDj.contactTime || 0;
    const rsi = latestDj.rsi || 0;

    if (tc > 220 || (rsi > 0 && rsi < 1.6)) {
      activeRows.push({
        id: "dyn-dj-lento",
        category: "forca_reativa_dj",
        finding: `CAE / RSI e Rigidez de Tornozelo: Tc ${tc} ms (RSI ${rsi.toFixed(2)})`,
        problemStatement: `Tempo de contato em solo elevado (> 200 ms) com amortecimento excessivo`,
        metricValue: `${tc} ms (RSI ${rsi.toFixed(2)})`,
        targetBenchmark: "< 200 ms (RSI ≥ 2.0)",
        context: "Eficiência do Ciclo Alongamento-Encurtamento (CAE rápido)",
        hypothesis: "Baixa rigidez elástica (stiffness) do tornozelo; absorção com flexão excessiva de joelho dissipando energia mecânica",
        priority: "Alta",
        confidence: "Alta",
        evidence: `Tempo de solo de ${tc} ms com índice de força reativa (RSI) em ${rsi.toFixed(2)}.`,
        conduct: "microdose",
        intervention: "Pliometria Rápida de Tornozelo: Ankle Pogos com joelho estático, saltos em corda rápidos e Drop Jumps baixos",
        practicalDetails: [
          "Ankle Pogo Jumps: 3 séries x 12 contatos instantâneos (< 180 ms) no aquecimento",
          "Drop Jump da caixa de 20cm: 3 séries x 5 repetições focando em 'chão quente'",
          "Isometria pesada de panturrilha/sóleo sustentada em pé: 3 x 20s"
        ],
        monitoring: "RSI e tempo de contato a cada 2 semanas",
        reassessmentTimeline: "2 semanas",
        transfer: "Agilidade em fintas de corpo, arrancadas e menor frenagem no início da corrida",
        evidenceReference: "Flanagan & Comyns (2008), Young (1995)",
        status: "detectado"
      });
    } else if (tc > 0) {
      activeRows.push({
        id: "dyn-dj-estavel",
        category: "forca_reativa_dj",
        finding: `CAE / RSI Reativo: Estável (Tc ${tc} ms | RSI ${rsi.toFixed(2)})`,
        problemStatement: "Rigidez de tornozelo e força reativa no padrão ótimo",
        metricValue: `Tc ${tc} ms (RSI ${rsi.toFixed(2)})`,
        targetBenchmark: "Tc < 200 ms | RSI ≥ 2.0",
        context: "Ciclo Alongamento-Encurtamento rápido",
        hypothesis: "Excelente capacidade de aproveitamento do reflexo miotático e tendão de Aquiles",
        priority: "Normal",
        confidence: "Alta",
        evidence: `Tempo de solo veloz (${tc} ms) com resposta elástica eficiente.`,
        conduct: "monitorar",
        intervention: "Manutenção com pliometria de transferência esportiva",
        practicalDetails: [
          "2 séries de 8 pogos reativos antes de sprints"
        ],
        monitoring: "Drop Jump quinzenal",
        reassessmentTimeline: "2 a 4 semanas",
        transfer: "Economia de corrida e agilidade reativa",
        evidenceReference: "Flanagan & Comyns (2008)",
        status: "normal"
      });
    }
  }

  // 4. ANÁLISE DE FORÇA ISOMÉTRICA & ASSIMETRIAS (Q/I & BILATERAL)
  const latestIso = assessments.isometricStrength?.slice(-1)[0];
  if (latestIso) {
    const qR = latestIso.quadricepsR || 0;
    const qL = latestIso.quadricepsL || 0;
    const hR = latestIso.hamstringsR || 0;
    const hL = latestIso.hamstringsL || 0;

    const asymQuad = qR > 0 && qL > 0 ? (Math.abs(qR - qL) / Math.max(qR, qL)) * 100 : 0;
    const asymHam = hR > 0 && hL > 0 ? (Math.abs(hR - hL) / Math.max(hR, hL)) * 100 : 0;
    const iqR = qR > 0 ? (hR / qR) * 100 : 0;
    const iqL = qL > 0 ? (hL / qL) * 100 : 0;

    if (asymQuad > 10 || asymHam > 10) {
      const maxAsym = Math.max(asymQuad, asymHam);
      const isSevere = maxAsym >= 15;

      attentionSignals.push({
        id: "att-asym-critica",
        type: "assimetria",
        title: `Assimetria Bilateral Relevante (${maxAsym.toFixed(1)}%)`,
        severity: isSevere ? "critico" : "atencao",
        description: `Diferença de ${maxAsym.toFixed(1)}% entre membros inferiores (Quadríceps: ${asymQuad.toFixed(1)}% | Isquiotibiais: ${asymHam.toFixed(1)}%). Requer volume compensatório.`,
        actionRecommendation: "Aplicar protocolo unilateral 2:1 para o membro com déficit (Agachamento Búlgaro e RDL unilateral)."
      });

      activeRows.push({
        id: "dyn-assimetria-elevada",
        category: "assimetria_prevencao",
        finding: `Assimetria de Força Bilateral: ${maxAsym.toFixed(1)}% (Quad: ${asymQuad.toFixed(1)}% | Isquios: ${asymHam.toFixed(1)}%)`,
        problemStatement: `Desequilíbrio de força entre membros superior a 10% (limiar funcional seguro)`,
        metricValue: `${maxAsym.toFixed(1)}%`,
        targetBenchmark: "Assimetria ≤ 10%",
        context: "Equilíbrio de força entre membros inferiores",
        hypothesis: "Déficit de força unilateral; compensação cinemática mecânica que eleva o estresse articular no membro fraco",
        priority: isSevere ? "Critica" : "Alta",
        confidence: "Alta",
        evidence: `Dinamometria isométrica identificou ${maxAsym.toFixed(1)}% de assimetria entre as pernas.`,
        conduct: "microdose",
        isAttentionSignal: true,
        intervention: "Treinamento Unilateral Prioritário com volume 2:1 para o lado deficitário (Agachamento Búlgaro, RDL Unilateral)",
        practicalDetails: [
          "Agachamento Búlgaro: 4 séries lado deficitário x 2 séries lado dominante (6-8 reps)",
          "Stiff Unilateral (Single-Leg RDL): 3 x 8 reps com foco na estabilidade do quadril",
          "Saltos Unilaterais com aterrissagem controlada (Drop Lands): 3 x 5 por perna"
        ],
        monitoring: "Dinamometria e salto unilateral a cada 2-3 semanas",
        reassessmentTimeline: "2 a 3 semanas",
        transfer: "Proteção ligamentar e muscular em desacelerações bruscas e mudanças de direção",
        evidenceReference: "Croisier et al. (2008), Impellizzeri et al. (2007)",
        status: "detectado"
      });
    }

    if ((iqR > 0 && iqR < 50) || (iqL > 0 && iqL < 50)) {
      const minIq = Math.min(iqR || 100, iqL || 100);

      attentionSignals.push({
        id: "att-iq-critica",
        type: "assimetria",
        title: `Razão I:Q Abaixo do Limiar de Proteção (${minIq.toFixed(1)}%)`,
        severity: "critico",
        description: `Razão Isquiotibiais / Quadríceps em ${minIq.toFixed(1)}% (mínimo recomendado: 50%). Déficit de frenagem excêntrica dos flexores do joelho.`,
        actionRecommendation: "Inserir microdose de fortalecimento excêntrico (Nordic Hamstring) 2x por semana."
      });

      activeRows.push({
        id: "dyn-razao-iq-critica",
        category: "assimetria_prevencao",
        finding: `Razão Isquiotibiais / Quadríceps (I:Q): ${minIq.toFixed(1)}% (Dir: ${iqR.toFixed(1)}% | Esq: ${iqL.toFixed(1)}%)`,
        problemStatement: `Razão de força I:Q inferior ao limiar de segurança articular (< 50%)`,
        metricValue: `${minIq.toFixed(1)}%`,
        targetBenchmark: "Razão I:Q entre 50% e 60%",
        context: "Equilíbrio agonista/antagonista do joelho e proteção do LCA",
        hypothesis: "Quadríceps dominante sem contrapeso da cadeia posterior; incapacidade dos isquiotibiais de frear a translação tibial anterior em desacelerações",
        priority: "Critica",
        confidence: "Alta",
        evidence: `Razão I:Q em ${minIq.toFixed(1)}%. Limiar ideal deve superar 50-60%.`,
        conduct: "microdose",
        isAttentionSignal: true,
        intervention: "Fortalecimento Excêntrico Imediato de Isquiotibiais (Nordic Hamstrings, Stiff e Flexão Nórdica)",
        practicalDetails: [
          "Nordic Hamstring Exercise: 3 séries de 4 a 6 reps lentas na descida (3-4s)",
          "Stiff com Halteres ou Barra: 3 séries x 8 reps com boa cadência",
          "Glute Ham Raise ou Flexão de Joelho Unilateral: 3 x 8 reps"
        ],
        monitoring: "Dinamometria de flexão/extensão a cada 4 semanas",
        reassessmentTimeline: "4 semanas",
        transfer: "Redução comprovada de até 51% em lesões de isquiotibiais e estabilização do joelho em sprints",
        evidenceReference: "Al Attar et al. (2017), Baroni et al. (2020)",
        status: "detectado"
      });
    }
  }

  // 5. ANÁLISE DE VELOCIDADE (10M / 30M)
  const latestSpeed = assessments.speed?.slice(-1)[0];
  if (latestSpeed) {
    const s10m = latestSpeed.speed10m || 0;
    const s30m = latestSpeed.speed30m || 0;
    const ratio = s30m > 0 ? (s10m / s30m) : 0;

    if (s30m > 0 && ratio < 0.65) {
      activeRows.push({
        id: "dyn-velocidade-aceleracao-baixa",
        category: "velocidade_sprint",
        finding: `Velocidade / Aceleração 10m: Ratio ${ratio.toFixed(2)} (V10m: ${s10m.toFixed(1)} m/s)`,
        problemStatement: `Déficit de aceleração e força horizontal nos primeiros 10 metros`,
        metricValue: `Ratio ${ratio.toFixed(2)}`,
        targetBenchmark: "Ratio > 0.70 | Tempo 10m < 1.70s",
        context: "Fase de aceleração e saída da inércia",
        hypothesis: "Déficit na aplicação de força propulsiva horizontal e saída muito ereta da inércia",
        priority: "Alta",
        confidence: "Moderada",
        evidence: `Ratio V10m/V30m de ${ratio.toFixed(2)} (abaixo da meta de 0.70).`,
        conduct: "dose_principal",
        intervention: "Sprints Resistidos com Trenó (Heavy Sled) e Saltos Horizontais Unipodais",
        practicalDetails: [
          "Tiros com Trenó Resistido (carga de 25-35% do peso corporal): 4-5 tiros de 10m",
          "Broad Jumps e Boundings (saltos horizontais alternados): 3 x 5 saltos",
          "Treino de ângulos de saída e ataque agressivo de sola no solo"
        ],
        monitoring: "Fotocélula de 10m e 30m quinzenal",
        reassessmentTimeline: "3 semanas",
        transfer: "Ganho de vantagens no arranque curto, fintas e primeiras passadas de disputa",
        evidenceReference: "Morin et al. (2016), Petrakos et al. (2016)",
        status: "detectado"
      });
    } else if (s30m > 0) {
      activeRows.push({
        id: "dyn-velocidade-estavel",
        category: "velocidade_sprint",
        finding: `Velocidade / Aceleração: Estável (V10m: ${s10m.toFixed(1)} m/s | V30m: ${s30m.toFixed(1)} m/s)`,
        problemStatement: "Aceleração e velocidade máxima alinhadas aos benchmarks",
        metricValue: `${s30m.toFixed(1)} m/s`,
        targetBenchmark: "V10m/V30m > 0.70",
        context: "Eficiência mecânica de sprint",
        hypothesis: "Boa projeção horizontal do vetor de força",
        priority: "Normal",
        confidence: "Alta",
        evidence: `Tempos de 10m e 30m dentro do perfil ótimo.`,
        conduct: "monitorar",
        intervention: "Manutenção com sprints lançados e educativos mecânicos",
        practicalDetails: [
          "3 tiros de 20m com intenção máxima pós-aquecimento"
        ],
        monitoring: "Fotocélula mensal",
        reassessmentTimeline: "4 semanas",
        transfer: "Manutenção da velocidade de pico em campo",
        evidenceReference: "Morin et al. (2016)",
        status: "normal"
      });
    }
  }

  // 6. ANÁLISE DE CAPACIDADE AERÓBICA / VO2MAX
  const latestVo2 = assessments.vo2max?.slice(-1)[0];
  if (latestVo2) {
    const vo2Val = latestVo2.vo2max || 0;
    const vam = latestVo2.vam || 0;
    const minVo2 = gender === "F" ? 42 : 48;

    if (vo2Val > 0 && vo2Val < minVo2) {
      activeRows.push({
        id: "dyn-vo2-baixo",
        category: "capacidade_aerobica",
        finding: `Capacidade Aeróbica / VO2Max: ${vo2Val.toFixed(1)} ml/kg/min (VAM: ${vam > 0 ? vam.toFixed(1) + " km/h" : "--"})`,
        problemStatement: `Potência aeróbica e capacidade de recuperação intermitente abaixo da meta (< ${minVo2})`,
        metricValue: `${vo2Val.toFixed(1)} ml/kg/min`,
        targetBenchmark: `≥ ${minVo2 + 5} ml/kg/min`,
        context: "Sustentação aeróbica e remoção de metabólitos",
        hypothesis: "Capacidade oxidativa mitocondrial limitada gerando fadiga precoce no final das sessões",
        priority: "Alta",
        confidence: "Moderada",
        evidence: `VO2Max medido em ${vo2Val.toFixed(1)} ml/kg/min.`,
        conduct: "microdose",
        intervention: "HIIT Curto de Alta Intensidade baseado na VAM (15s @ 110% VAM x 15s passivo)",
        practicalDetails: [
          "HIIT Curto: 2 blocos de 6 minutos (15s @ 110% VAM / 15s recuperação passiva)",
          "Small-Sided Games (SSG) com foco em transições rápidas"
        ],
        monitoring: "Teste de VAM a cada 6 semanas",
        reassessmentTimeline: "6 semanas",
        transfer: "Manutenção da precisão técnica sob fadiga e recuperação entre sprints",
        evidenceReference: "Buchheit & Laursen (2013)",
        status: "detectado"
      });
    }
  }

  // 7. ANÁLISE DE CONTROLE DE CARGA (ACWR)
  const acwrData = calculateACWR(workouts || [], externalSessions || []);
  const acwr = typeof acwrData === "object" && acwrData !== null ? acwrData.ratio : Number(acwrData) || 0;
  if (acwr > 1.5) {
    attentionSignals.push({
      id: "att-acwr-elevado",
      type: "acwr_elevado",
      title: `Sobrecarga Aguda Severa (ACWR ${acwr.toFixed(2)})`,
      severity: "critico",
      description: `O índice Carga Aguda:Crônica atingiu ${acwr.toFixed(2)} (> 1.50 - Zona de Perigo Extremo). O risco tecidual por sobrecarga está acentuado.`,
      actionRecommendation: "Realizar deload imediato de 40-50% do volume na próxima sessão e suspender estímulos máximos."
    });

    activeRows.push({
      id: "dyn-acwr-perigo",
      category: "controle_carga_recuperacao",
      finding: `Controle de Carga / ACWR: ${acwr.toFixed(2)} (Zona de Sobrecarga Aguda)`,
      problemStatement: `Pico agudo de volume nos últimos 7 dias sem sustentação de lastro crônico prévio`,
      metricValue: `${acwr.toFixed(2)}`,
      targetBenchmark: "0.80 a 1.30 (Sweet Spot)",
      context: "Relação Carga Aguda (7d) vs Crônica (28d)",
      hypothesis: "Pico súbito de volume/intensidade nos últimos dias; fadiga aguda descompensada aumentando suscetibilidade tecidual",
      priority: "Critica",
      confidence: "Alta",
      evidence: `ACWR calculado em ${acwr.toFixed(2)} baseado nas sessões dos últimos 28 dias.`,
      conduct: "microdose",
      isAttentionSignal: true,
      intervention: "Deload Imediato: redução de 40% a 50% no volume das próximas sessões e veto temporário a sprints máximos",
      practicalDetails: [
        "Substituição de sessão de choque por sessão regenerativa / mobilidade ativa",
        "Proibir sprints e saltos de intensidade máxima nas próximas 48 a 72h",
        "Atenção prioritária à qualidade de sono e reposição eletrolítica e energética"
      ],
      monitoring: "Monitoramento diário de sRPE e ACWR",
      reassessmentTimeline: "Diário (24-48h)",
      transfer: "Prevenção de sobrecargas musculares e preservação do atleta no ciclo",
      evidenceReference: "Gabbett et al. (2016), Hulin et al. (2016)",
      status: "detectado"
    });
  }

  // 8. ANÁLISE DE PRONTIDÃO / WELLNESS & DOR
  const wellnessList = Array.isArray(athlete.wellness) ? athlete.wellness : [];
  const latestWellness = wellnessList.length > 0 
    ? [...wellnessList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] 
    : null;
  const readinessScore = latestWellness 
    ? (typeof latestWellness.readinessScore === "number" ? latestWellness.readinessScore : calculateReadiness(latestWellness)) 
    : 0;

  if (latestWellness && (latestWellness.soreness > 3 || latestWellness.fatigue > 3 || latestWellness.sleep < 3)) {
    attentionSignals.push({
      id: "att-prontidao-baixa",
      type: "prontidao_baixa",
      title: `Prontidão Diária Comprometida (${Math.round(readinessScore)}%)`,
      severity: readinessScore < 50 ? "critico" : "atencao",
      description: `Relato de dor muscular (${latestWellness.soreness}/5), fadiga elevada (${latestWellness.fatigue}/5) ou sono insuficiente (${latestWellness.sleep}/5).`,
      actionRecommendation: "Aplicar modulação autorregulada (RPE -2), estender aquecimento e priorizar recuperação."
    });
  }

  if (readinessScore > 0 && readinessScore < 60) {
    activeRows.push({
      id: "dyn-readiness-baixa",
      category: "controle_carga_recuperacao",
      finding: `Prontidão Diária / Hooper Score: ${Math.round(readinessScore)}%`,
      problemStatement: `Score de prontidão biopsicossocial abaixo do patamar ideal (< 60%)`,
      metricValue: `${Math.round(readinessScore)}%`,
      targetBenchmark: "≥ 75%",
      context: "Recuperação biopsicossocial do atleta",
      hypothesis: "Acúmulo de fadiga sistêmica, débitos de sono ou dores musculares que reduzem a capacidade do sistema nervoso",
      priority: "Alta",
      confidence: "Alta",
      evidence: `Check-in diário com índice de prontidão em ${Math.round(readinessScore)}%.`,
      conduct: "microdose",
      isAttentionSignal: true,
      intervention: "Modulação por Autorregulação: aquecimento estendido, diminuição de densidade e sessões de recovery",
      practicalDetails: [
        "Aumentar o tempo de aquecimento dinâmico em 10 minutos",
        "Reduzir 1 a 2 séries de exercícios principais com pesos pesados",
        "Reforçar a higiene do sono e protocolo de descompressão muscular"
      ],
      monitoring: "Check-in matinal sRPE e questionário Hooper",
      reassessmentTimeline: "Diário",
      transfer: "Preservação da qualidade das sessões-chave e mitigação de fadiga",
      evidenceReference: "Saw et al. (2016), McLean et al. (2010)",
      status: "detectado"
    });
  }

  // Se o atleta estiver excelente sem nenhum alerta crítico
  if (activeRows.length === 0) {
    activeRows.push({
      id: "dyn-atleta-balanceado",
      category: "forca_maxima",
      finding: "Perfil Atlético Equilibrado (Sem Déficits Críticos Detectados)",
      problemStatement: "Métricas consolidadas dentro das faixas estáveis da modalidade",
      metricValue: "Estável",
      targetBenchmark: "Metas Atingidas",
      context: "Monitoramento de Rotina",
      hypothesis: "Atleta com excelente adaptação às cargas vigentes, simetria satisfatória e prontidão física adequada",
      priority: "Normal",
      confidence: "Alta",
      evidence: "Avaliações recentes sem assimetrias ou perdas longitudinais de rendimento.",
      conduct: "monitorar",
      intervention: "Manutenção do Ciclo de Treinamento Atual com Polimento Específico e Sobrecarga Progressiva Linear",
      practicalDetails: [
        "Manter rotina programada de força e potência",
        "Continuar monitoramento preventivo diário de cargas e saltos semanais"
      ],
      monitoring: "Monitoramento contínuo quinzenal",
      reassessmentTimeline: "2 a 4 semanas",
      transfer: "Consistência de alto rendimento nos treinos e partidas oficiais",
      evidenceReference: "Suchomel et al. (2016)",
      status: "otimo"
    });
  }

  // Ajuste inteligente das condutas para garantir equilíbrio metodológico:
  // Máximo de 1 'dose_principal' por padrão (a de maior prioridade/gargalo),
  // até 2 'microdose' e o restante 'monitorar'.
  let assignedMain = false;
  activeRows.forEach((r) => {
    if (r.conduct === "dose_principal") {
      if (assignedMain) {
        r.conduct = "microdose";
      } else {
        assignedMain = true;
      }
    }
  });

  // Se nenhum item foi atribuído a dose principal e há itens de alta prioridade, definir o primeiro como dose principal
  if (!assignedMain) {
    const highItem = activeRows.find((r) => r.priority === "Critica" || r.priority === "Alta");
    if (highItem) {
      highItem.conduct = "dose_principal";
    }
  }

  // Contagem de prioridades e condutas
  const criticalCount = activeRows.filter((r) => r.priority === "Critica").length;
  const highCount = activeRows.filter((r) => r.priority === "Alta").length;
  const mediumCount = activeRows.filter((r) => r.priority === "Media").length;
  const normalCount = activeRows.filter((r) => r.priority === "Normal" || r.priority === "Baixa").length;

  const dosePrincipalCount = activeRows.filter((r) => r.conduct === "dose_principal").length;
  const microdosesCount = activeRows.filter((r) => r.conduct === "microdose").length;
  const monitorarCount = activeRows.filter((r) => r.conduct === "monitorar").length;

  let overallStatus: "critico" | "atencao" | "estavel" | "excelente" = "estavel";
  if (criticalCount > 0 || attentionSignals.some(s => s.severity === "critico")) overallStatus = "critico";
  else if (highCount >= 2 || attentionSignals.length > 0) overallStatus = "atencao";
  else if (activeRows.some((r) => r.status === "otimo")) overallStatus = "excelente";

  let executiveSummary = "";
  if (overallStatus === "critico") {
    executiveSummary = `Atenção Imediata: O atleta apresenta ${criticalCount} achado(s) prioritário(s) ou sinais de atenção de alta severidade. Recomenda-se aplicar as intervenções proporcionais selecionadas como Dose Principal e Microdoses.`;
  } else if (overallStatus === "atencao") {
    executiveSummary = `O atleta apresenta ${highCount} pontos de intervenção neuromuscular ou biomecânica com prioridade elevada. Ajustes nos blocos de treino são recomendados para destravar a transferência esportiva.`;
  } else if (overallStatus === "excelente") {
    executiveSummary = "O atleta encontra-se em excelente estado de equilíbrio neuromuscular, sem assimetrias críticas ou sobrecarga de fadiga detectadas nas avaliações recentes.";
  } else {
    executiveSummary = "Atleta com perfil atlético funcionalmente estável. As recomendações focam em manutenção econômica e refinamento do gradiente de força e velocidade.";
  }

  return {
    athleteId: athlete.id,
    athleteName: athlete.name,
    generatedAt: new Date().toISOString(),
    activeRows,
    attentionSignals,
    totalFindings: activeRows.length,
    criticalCount,
    highCount,
    mediumCount,
    normalCount,
    conductSummary: {
      dosePrincipalCount,
      microdosesCount,
      monitorarCount
    },
    overallStatus,
    executiveSummary
  };
}

// ==========================================
// PRESCRIÇÃO AUTOMÁTICA A PARTIR DA MATRIZ LB
// ==========================================

export interface PrescribedWorkoutPayload {
  title: string;
  category: string;
  focus: string;
  rationale: string;
  mainDoseItems: DecisionMatrixRow[];
  microdoseItems: DecisionMatrixRow[];
  attentionSignals: AttentionSignal[];
  exercises: {
    name: string;
    block: "Aquecimento & Priming" | "Dose Principal (Foco)" | "Microdoses & Acessórios" | "Prevenção & Recovery";
    sets: number;
    reps: string;
    intensity: string;
    rest: string;
    notes?: string;
  }[];
}

export function generatePrescriptionPayloadFromDecisionMatrix(
  athlete: Athlete,
  rows: DecisionMatrixRow[],
  attentionSignals: AttentionSignal[] = []
): PrescribedWorkoutPayload {
  const mainDoseItems = rows.filter((r) => r.conduct === "dose_principal");
  const microdoseItems = rows.filter((r) => r.conduct === "microdose");

  const primaryFocus = mainDoseItems.length > 0 
    ? mainDoseItems.map((m) => m.finding.split(":")[0]).join(" + ")
    : "Manutenção Geral e Potência";

  const exercises: PrescribedWorkoutPayload["exercises"] = [];

  // 1. AQUECIMENTO & PRIMING (Baseado em Sinais de Atenção e Rigidez de Tornozelo)
  exercises.push({
    name: "Liberação Miofascial & Mobilidade Dinâmica de Tornozelo/Quadril",
    block: "Aquecimento & Priming",
    sets: 2,
    reps: "8-10 cada lado",
    intensity: "Leve / RPE 4",
    rest: "45s",
    notes: "Preparação articular e elevação de temperatura tecidual."
  });

  const djItem = microdoseItems.find((m) => m.category === "forca_reativa_dj");
  if (djItem) {
    exercises.push({
      name: "Ankle Pogo Jumps Reativos (Contato < 180ms)",
      block: "Aquecimento & Priming",
      sets: 3,
      reps: "10-12 contatos rápidos",
      intensity: "Intenção Máxima",
      rest: "60s",
      notes: "Priming neuromuscular e rigidez elástica do tendão de Aquiles."
    });
  }

  // 2. DOSE PRINCIPAL (FOCO DO BLOCO - 60-70% do volume e prioridade)
  mainDoseItems.forEach((item) => {
    if (item.category === "taxa_desenvolvimento_forca" || item.category === "velocidade_sprint") {
      exercises.push({
        name: "Jump Squats com Barra Hexagonal (Trap Bar)",
        block: "Dose Principal (Foco)",
        sets: 4,
        reps: "4 reps",
        intensity: "20% PC @ Máxima Intenção de Aceleração",
        rest: "2 min",
        notes: `Dose Principal: Taxa de Desenvolvimento de Força (TDF). Foco na explosão nos primeiros 100ms.`
      });
      exercises.push({
        name: "Isometria Superada Explosiva no Rack (Ângulo 130°)",
        block: "Dose Principal (Foco)",
        sets: 3,
        reps: "3 segundos de empurre máximo",
        intensity: "100% Intenção Máxima",
        rest: "90s",
        notes: `Taxa máxima de recrutamento de unidades motoras rápidas.`
      });
    } else if (item.category === "forca_maxima") {
      exercises.push({
        name: "Agachamento Traseiro / Trap Bar Deadlift",
        block: "Dose Principal (Foco)",
        sets: 4,
        reps: "5 reps",
        intensity: "78-82% 1RM (RIR 2)",
        rest: "2-3 min",
        notes: `Dose Principal: Construção de lastro de força estrutural e suporte miofibrilar.`
      });
      exercises.push({
        name: "RDL (Levantamento Terra Romeno)",
        block: "Dose Principal (Foco)",
        sets: 3,
        reps: "6 reps",
        intensity: "75% 1RM",
        rest: "2 min",
        notes: `Cadeia posterior e estabilidade lombo-pélvica.`
      });
    } else if (item.category === "potencia_cmj") {
      exercises.push({
        name: "Contraste Francês (Agachamento Pesado 85% 1RM + 3 Saltos Verticais)",
        block: "Dose Principal (Foco)",
        sets: 4,
        reps: "2 reps pesadas + 3 saltos livres",
        intensity: "Potenciação Pós-Ativação (PAP)",
        rest: "2.5 min",
        notes: `Dose Principal: Potência vertical concêntrica e aproveitamento elástico no CMJ.`
      });
    } else {
      exercises.push({
        name: "Bloco Principal de Força e Transferência Funcional",
        block: "Dose Principal (Foco)",
        sets: 4,
        reps: "5-6 reps",
        intensity: "75-80% 1RM",
        rest: "2 min",
        notes: `Intervenção direcionada: ${item.finding}`
      });
    }
  });

  // Se não houver dose principal selecionada, criar estímulo funcional padrão
  if (mainDoseItems.length === 0) {
    exercises.push({
      name: "Agachamento Dinâmico com Velocidade de Execução (VBT)",
      block: "Dose Principal (Foco)",
      sets: 3,
      reps: "4 reps",
      intensity: "75% 1RM",
      rest: "2 min",
      notes: "Manutenção econômica de força e potência funcional."
    });
  }

  // 3. MICRODOSES & ACESSÓRIOS (Estímulos Complementares / 15-20% do volume)
  microdoseItems.forEach((item) => {
    if (item.category === "assimetria_prevencao") {
      exercises.push({
        name: "Agachamento Búlgaro (RFESS Unilateral)",
        block: "Microdoses & Acessórios",
        sets: 3,
        reps: "6 reps (lado fraco 2x volume se assimetria > 12%)",
        intensity: "RPE 8",
        rest: "90s",
        notes: "Microdose compensatória de força unilateral e simetria de membros inferiores."
      });
      exercises.push({
        name: "Nordic Hamstring Exercise (Excêntrico de Isquiotibiais)",
        block: "Microdoses & Acessórios",
        sets: 3,
        reps: "5 reps lentas (descida 4s)",
        intensity: "Peso Corporal / Assistido",
        rest: "90s",
        notes: "Prevenção de estiramentos e melhora da razão I:Q de desaceleração."
      });
    } else if (item.category === "forca_reativa_dj" && !djItem) {
      exercises.push({
        name: "Drop Jumps de 25cm com Foco em Reatividade Imediata",
        block: "Microdoses & Acessórios",
        sets: 3,
        reps: "4 reps",
        intensity: "Intenção Máxima",
        rest: "90s",
        notes: "Microdose de rigidez tendínea."
      });
    } else if (item.category === "forca_maxima") {
      exercises.push({
        name: "Agachamento de Manutenção Rápida",
        block: "Microdoses & Acessórios",
        sets: 2,
        reps: "3 reps @ 85% 1RM",
        intensity: "Alta Carga / Baixo Volume",
        rest: "2 min",
        notes: "Microdose econômica para preservação de força máxima sem acúmulo de fadiga."
      });
    }
  });

  // 4. PREVENÇÃO & RECOVERY (Baseado em Sinais de Atenção)
  if (attentionSignals.some((s) => s.type === "prontidao_baixa" || s.type === "acwr_elevado")) {
    exercises.push({
      name: "Protocolo de Descompressão Lombar & Respiração Diafragmática",
      block: "Prevenção & Recovery",
      sets: 1,
      reps: "5 minutos",
      intensity: "Relaxamento Ativo",
      rest: "0",
      notes: "Ativação parassimpática e aceleração da recuperação sistêmica."
    });
  } else {
    exercises.push({
      name: "Prancha Frontal com Perturbação Dinâmica + Ponte Glúteo Unilateral",
      block: "Prevenção & Recovery",
      sets: 2,
      reps: "30s / 8 reps cada lado",
      intensity: "Isometria Estável",
      rest: "45s",
      notes: "Estabilidade do core e transferência rotacional de força."
    });
  }

  return {
    title: `Ficha Prescrita LB: ${primaryFocus}`,
    category: "Prescrição Baseada na Matriz de Decisão",
    focus: primaryFocus,
    rationale: `Prescrição gerada pelo Cérebro Central da Matriz de Decisão LB com ${mainDoseItems.length} Dose Principal e ${microdoseItems.length} Microdose(s) para ${athlete.name}.`,
    mainDoseItems,
    microdoseItems,
    attentionSignals,
    exercises
  };
}
