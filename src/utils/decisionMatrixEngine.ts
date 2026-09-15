import { Athlete, Workout, ExternalSession, DecisionMatrixRow } from "../types";
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
    targetBenchmark: "Faixa Estável: ≥ 1.80 kgf/kg (≥ 18 N/kg Masc) | ≥ 1.50 kgf/kg (≥ 15 N/kg Fem)",
    context: "Atleta em formação motora ou retornando de transição/pausa prolongada",
    hypothesis: "Força de suporte abaixo da faixa funcional estável; necessita de lastro miofibrilar para amortecer impactos e aterrissagens",
    priority: "Media",
    intervention: "Bloco de Base Estrutural e Força Geral: Agachamento progressivo (70-80% 1RM), Levantamento Terra/Trap Bar e fortalecimento de cadeia posterior",
    practicalDetails: [
      "Agachamento Traseiro / Trap Bar: 3-4 séries x 5-6 reps @ 75-80% 1RM com controle excêntrico",
      "Isometria Superada no Rack (posição do IMTP a 130-140°): 3 séries x 5 segundos de contração firme",
      "Acessórios de Cadeia Posterior (RDL, Elevação Pélvica, Panturrilha): 3 séries x 8 reps"
    ],
    monitoring: "IMTP a cada 3 a 4 semanas (reavaliação com célula de carga)",
    transfer: "Sustentação física em aterrissagens, estabilidade pélvica e resiliência articular",
    evidenceReference: "Suchomel et al. (2016), Comfort et al. (2019, 2024), Parâmetros LB Sports"
  },
  {
    id: "master-imtp-normal-estavel",
    category: "forca_maxima",
    finding: "IMTP Funcional Estável (1.80 a 2.60 kgf/kg Masc | 1.50 a 2.20 kgf/kg Fem)",
    targetBenchmark: "Faixa Estável: 1.80 a 2.60 kgf/kg (Masc) | 1.50 a 2.20 kgf/kg (Fem)",
    context: "Atleta com excelente equilíbrio de força relativa para esportes coletivos e de salto",
    hypothesis: "Força de suporte consolidada e segura; janela ideal para priorizar taxa de subida de força (RFD), aceleração e potência reativa",
    priority: "Normal",
    intervention: "Manutenção Econômica de Força com Foco em Força Rápida e RFD: Cargas submáximas (75-82% 1RM) com foco na máxima intenção concêntrica e transferências balísticas",
    practicalDetails: [
      "Agachamento com Foco em Velocidade: 3 séries x 3-4 reps @ 75-80% 1RM com fase concêntrica máxima",
      "Jump Squats com Barra Hexagonal ou Halteres (15-20% peso corporal)",
      "Pliometria e Treinamento do Ciclo Alongamento-Encurtamento (CAE)"
    ],
    monitoring: "Monitoramento de manutenção a cada 4 a 6 semanas",
    transfer: "Eficiência mecânica nos saltos e sprints sem acúmulo de peso morto ou lentidão",
    evidenceReference: "Suchomel et al. (2016), Turner et al. (2020)"
  },
  {
    id: "master-imtp-otimizado",
    category: "forca_maxima",
    finding: "IMTP Otimizado / Alto Nível (≥ 2.60 kgf/kg Masc | ≥ 2.20 kgf/kg Fem)",
    targetBenchmark: "≥ 2.60 kgf/kg (≥ 26 N/kg Masc) | ≥ 2.20 kgf/kg (≥ 22 N/kg Fem)",
    context: "Atleta com níveis superiores de força relativa em relação ao peso corporal",
    hypothesis: "Força máxima consolidada em patamar de elite; não constitui gargalo para gestos esportivos",
    priority: "Normal",
    intervention: "Manutenção em Microdoses e Foco Pleno em Potência Balística e Reatividade Elástica",
    practicalDetails: [
      "Agachamento Pesado de Manutenção: 2 séries x 2-3 reps @ 85% 1RM (1x/semana)",
      "Pliometria de Alto Nível (Drop Jumps e Saltos Reativos)",
      "Transferência específica para velocidade e impulsão"
    ],
    monitoring: "Reavaliação a cada 6 a 8 semanas",
    transfer: "Preservação da robustez mecânica com prontidão neural máxima para velocidade e impulsão",
    evidenceReference: "Stone et al. (2004), Suchomel et al. (2016)"
  },

  // 2. TAXA DE DESENVOLVIMENTO DE FORÇA (TDF / RFD)
  {
    id: "master-tdf-baixa",
    category: "taxa_desenvolvimento_forca",
    finding: "TDF / RFD Baixa (Tempo até pico > 400 ms ou RFD100 reduzida)",
    targetBenchmark: "Pico em < 250 ms | RFD100 explosiva",
    context: "Atleta com boa força máxima, mas lentidão no arranque ou sprint inicial",
    hypothesis: "Taxa de disparo neural lenta e sincronização insuficiente de unidades motoras rápidas (Tipo IIx)",
    priority: "Alta",
    intervention: "Treinamento de Força Rápida (Ballistic Training), Isometria de Taxa Explosiva e Saltos com Carga Leve",
    practicalDetails: [
      "Jump Squats com Barra Hexagonal: 4 séries x 4 reps a máxima velocidade",
      "Isometria Explosiva ('empurrar o chão o mais rápido possível'): 4 x 3s",
      "Kettlebell Swings Pesados e Arremessos de Medicine Ball: 3 x 5 reps"
    ],
    monitoring: "Cálculo de RFD nos primeiros 100-200ms a cada quinzena",
    transfer: "Arranque inicial de sprint (0 a 10m), antecipação em disputas de bola e primeiro passo reativo",
    evidenceReference: "Aagaard et al. (2002), Maffiuletti et al. (2016)"
  },

  // 3. POTÊNCIA CONCÊNTRICA E CMJ
  {
    id: "master-cmj-baixo-potencia",
    category: "potencia_cmj",
    finding: "CMJ Baixo (< 35 cm Masc / < 25 cm Fem) com Base de Força Regular",
    targetBenchmark: "≥ 42 cm (Masc) | ≥ 30 cm (Fem)",
    context: "Atleta com pouca impulsão vertical e baixa potência relativa (< 48 W/kg)",
    hypothesis: "Déficit de coordenação intermuscular no contra-movimento e baixa potência concêntrica de membros inferiores",
    priority: "Alta",
    intervention: "Complex Training / PAP (Potenciação Pós-Ativação) alternando força e saltos livres",
    practicalDetails: [
      "Contraste Francês: Agachamento pesado (2 reps @ 85%) + 3 Saltos Verticais sobre barreira",
      "Agachamentos com máxima aceleração concêntrica (50-60% 1RM)",
      "Drop Lands com foco em frenagem e re-explosão imediata"
    ],
    monitoring: "CMJ quinzenal (altura e potência pico via Sayers)",
    transfer: "Duelos aéreos, saltos de bloqueio/cabeceio e aceleração de corrida",
    evidenceReference: "Sayers et al. (1999), Claudino et al. (2017)"
  },
  {
    id: "master-cmj-queda-fadiga",
    category: "potencia_cmj",
    finding: "Queda Aguda no CMJ (> 5% a 8% em relação à linha de base)",
    targetBenchmark: "Variação < ± 3% da média do atleta",
    context: "Atleta em semana competitiva intensa ou após sequência de jogos/treinos",
    hypothesis: "Fadiga neuromuscular aguda do Sistema Nervoso Central (SNC) ou depleção de substratos",
    priority: "Alta",
    intervention: "Ajuste Imediato de Carga: redução de volume mecânico (-30%), deload ativo e reforço de sono",
    practicalDetails: [
      "Vetar treinos de saltos de alta intensidade e sprints máximos por 48h",
      "Sessão regenerativa: mobilidade, hidroterapia ou liberação miofascial suave",
      "Aumentar suporte de carboidratos pós-sessão e monitorar horas de sono"
    ],
    monitoring: "CMJ diário ou pré-treino até restabelecer a linha de base",
    transfer: "Preservação física, prevenção de lesões por fadiga e recuperação da prontidão de jogo",
    evidenceReference: "Gathercole et al. (2014), Cormack et al. (2008)"
  },

  // 4. FORÇA REATIVA & DROP JUMP (STIFFNESS)
  {
    id: "master-dj-lento-stiffness",
    category: "forca_reativa_dj",
    finding: "Drop Jump Lento (Tempo de Contato > 220 ms / RSI < 1.5)",
    targetBenchmark: "Tc < 200 ms | RSI ≥ 2.0 (Elite)",
    context: "Atleta com boa impulsão em salto simples, mas perda de velocidade no chão",
    hypothesis: "Baixa rigidez (stiffness) do tornozelo e tendão de Aquiles; Ciclo Alongamento-Encurtamento (CAE) excessivamente amortecido",
    priority: "Alta",
    intervention: "Pliometria Rápida de Solo Rígido: Pogo Jumps, saltos com calcanhar elevado e drop jumps de 20-30cm",
    practicalDetails: [
      "Ankle Pogo Jumps (sem flexão de joelho): 3 séries x 10-12 contatos rápidos (< 180 ms)",
      "Drop Jump da caixa de 20-25cm com foco em 'chão quente' (sair imediatamente): 3 x 5 reps",
      "Isometria pesada de sóleo/gastrocnêmio em pé (plantar flexão sustentada): 3 x 20s"
    ],
    monitoring: "Drop Jump e RSI a cada 2 semanas",
    transfer: "Eficiência de corrida (menor gasto energético por passada), fintas dinâmicas e transições ágeis",
    evidenceReference: "Flanagan & Comyns (2008), Young (1995)"
  },
  {
    id: "master-dj-voo-baixo",
    category: "forca_reativa_dj",
    finding: "Drop Jump com Tc Curto (< 190 ms) mas Altura de Salto Baixa (< 25 cm)",
    targetBenchmark: "Altura > 32 cm com Tc < 200 ms",
    context: "Atleta muito rápido no solo, mas sem impulso vertical suficiente para projetar o corpo",
    hypothesis: "Excelente reatividade do tornozelo, porém falta de força concêntrica de impulsão de quadril/joelho",
    priority: "Media",
    intervention: "Combinar Pliometria com Força Excêntrica-Concêntrica de cadeia extensora",
    practicalDetails: [
      "Depth Jumps de 35cm com foco em impulsão aérea máxima",
      "Agachamento com salto e barra guiada (Jump Squat)",
      "Treino de tripla extensão agressiva (tornozelo-joelho-quadril)"
    ],
    monitoring: "RSI e altura de voo quinzenal",
    transfer: "Capacidade de decolar em duelos dinâmicos mantendo a resposta ágil de solo",
    evidenceReference: "Markovic et al. (2007)"
  },

  // 5. ASSIMETRIA E PREVENÇÃO DE LESÕES
  {
    id: "master-assimetria-quad-ham",
    category: "assimetria_prevencao",
    finding: "Assimetria Bilateral Elevada (> 12% a 15% entre membros)",
    targetBenchmark: "Assimetria ≤ 10%",
    context: "Atleta em fase de retorno de lesão (RTP) ou desequilíbrio unilateral crônico",
    hypothesis: "Inibição artrogênica muscular, histórico de estiramento ou dominância mecânica exacerbada",
    priority: "Alta",
    intervention: "Treinamento Unilateral Prioritário (compensação do membro deficitário com 2:1 no volume)",
    practicalDetails: [
      "Agachamento Búlgaro (RFESS): 4 séries lado deficitário x 2 séries lado dominante",
      "Single Leg Romanian Deadlift (RDL Unilateral): 3 séries x 6-8 reps",
      "Saltos e aterrissagens unilaterais (Single-leg drop lands) com foco em simetria de frenagem"
    ],
    monitoring: "Dinamometria isométrica ou salto unilateral (Single Leg Hop) a cada 2-3 semanas",
    transfer: "Proteção contra recidiva de lesão, desaceleração segura em mudanças de direção bruscas",
    evidenceReference: "Croisier et al. (2008), Impellizzeri et al. (2007)"
  },
  {
    id: "master-razao-iq-critica",
    category: "assimetria_prevencao",
    finding: "Razão Isquiotibiais / Quadríceps Crítica (Razão I:Q < 50%)",
    targetBenchmark: "Razão I:Q entre 50% e 60%",
    context: "Atleta com quadríceps hipertrofiado ou dominante sem suporte de cadeia posterior",
    hypothesis: "Força de frenagem dos isquiotibiais insuficiente para proteger o Ligamento Cruzado Anterior (LCA)",
    priority: "Critica",
    intervention: "Fortalecimento Excêntrico Intenso de Isquiotibiais e Ponte com Flexão de Joelho",
    practicalDetails: [
      "Nordic Hamstring Exercise: 3 séries de 4 a 6 repetições controladas na descida",
      "Stiff com halteres com foco no alongamento sob tensão: 3 x 8 reps",
      "Flexão de joelho nórdica assistida ou em máquina deitada: 3 x 8 reps"
    ],
    monitoring: "Dinamometria de flexão/extensão mensal",
    transfer: "Prevenção direta de ruptura de LCA e estiramentos agudos de bíceps femoral em sprints",
    evidenceReference: "Al Attar et al. (2017), Baroni et al. (2020)"
  },

  // 6. VELOCIDADE E SPRINT
  {
    id: "master-sprint-aceleracao-10m",
    category: "velocidade_sprint",
    finding: "Aceleração 10m Lenta (Ratio V10m / V30m < 0.65 ou tempo 10m > 1.85s Masc)",
    targetBenchmark: "Tempo 10m < 1.70s | Ratio > 0.70",
    context: "Atleta com dificuldade em vencer o primeiro passo ou sair da marcação curta",
    hypothesis: "Ineficiência na aplicação de força horizontal e ângulo de projeção do centro de massa elevado precocemente",
    priority: "Alta",
    intervention: "Sprints Resistidos com Trenó Pesado (Heavy Sled Sprint) e saltos horizontais unipodais",
    practicalDetails: [
      "Sled Sprints com carga de 30-40% do peso corporal: 4-5 tiros de 10 a 15 metros",
      "Saídas de blocos em diferentes posturas (de joelhos, em 3 apoios): 4 repetições",
      "Broad Jumps (Salto em distância parado) com aterrissagem estável: 3 x 4 reps"
    ],
    monitoring: "Fotocélula de 5m e 10m a cada 3 semanas",
    transfer: "Primeiro passo veloz, ultrapassagem da marcação e transição ataque-defesa ágil",
    evidenceReference: "Morin et al. (2016), Petrakos et al. (2016)"
  },
  {
    id: "master-sprint-desaceleracao-precoce",
    category: "velocidade_sprint",
    finding: "Desaceleração Precoce pós-20m (Ratio V30m / V20m < 1.02)",
    targetBenchmark: "Ratio V30m / V20m ≥ 1.05",
    context: "Atleta com arranque satisfatório, mas que perde o pico de velocidade nos 20-30 metros",
    hypothesis: "Fadiga neuromuscular de sustentação postural, técnica de corrida com frenagem ou rigidez de core deficiente",
    priority: "Media",
    intervention: "Treino de Velocidade Máxima Efetiva (Flying Sprints de 20 a 30m com entrada lançada)",
    practicalDetails: [
      "Flying Sprints (15m de aceleração + 15m a velocidade máxima com postura ereta): 4 repetições",
      "Exercícios educativos de mecânica de corrida ('Wicket runs' com minibarretas)",
      "Fortalecimento estático de core (Pranchas antiextensão sob perturbação dinâmica)"
    ],
    monitoring: "Parciais de 20m e 30m mensais",
    transfer: "Sustentação de sprints longos em contra-ataques e coberturas defensivas de profundidade",
    evidenceReference: "Haugen et al. (2014), Clark et al. (2014)"
  },

  // 7. CAPACIDADE AERÓBICA & VO2MAX
  {
    id: "master-vo2-baixo",
    category: "capacidade_aerobica",
    finding: "VO2 Máximo Baixo (< 45 ml/kg/min Masc / < 38 Fem) ou VAM < 14 km/h",
    targetBenchmark: "≥ 55 ml/kg/min (Masc) | ≥ 45 ml/kg/min (Fem)",
    context: "Atleta que demonstra perda de rendimento e lentidão nos minutos finais das partidas",
    hypothesis: "Capacidade mitocondrial e volume sistólico cardíaco insuficientes para o transporte e reciclagem de oxigênio",
    priority: "Alta",
    intervention: "Treinamento Intervalado de Alta Intensidade (HIIT longo e curto) com base na VAM",
    practicalDetails: [
      "HIIT Curto: Tiros de 15s a 115% da VAM com 15s de recuperação passiva (2 blocos de 8 min)",
      "HIIT Longo: 4 séries de 3 minutos a 90-95% da FCmáx com 2 min de recuperação ativa",
      "Jogos Reduzidos (Small-Sided Games - SSG) em campos amplos"
    ],
    monitoring: "Teste de VAM (T-Car ou Yo-Yo) a cada 6 semanas",
    transfer: "Menor perda de precisão técnica no final da partida e aceleração da recuperação entre tiros",
    evidenceReference: "Buchheit & Laursen (2013), Bangsbo et al. (2008)"
  },

  // 8. CONTROLE DE CARGA & RECUPERAÇÃO
  {
    id: "master-acwr-zona-perigo",
    category: "controle_carga_recuperacao",
    finding: "ACWR Elevado (> 1.5 - Zona de Perigo Extremo)",
    targetBenchmark: "ACWR entre 0.8 e 1.3 (Sweet Spot)",
    context: "Pico agudo de volume/intensidade nos últimos 7 dias sem sustentação crônica prévia",
    hypothesis: "Sobrecarga de fadiga aguda com desequilíbrio metabólico; risco relativo de lesão tecidual multiplicado por 2x a 4x",
    priority: "Critica",
    intervention: "Deload Imediato de Carga: corte de 40% a 50% do volume na sessão seguinte e veto a estímulos máximos",
    practicalDetails: [
      "Substituir treino de choque por treino regenerativo ou técnico de baixa rotação",
      "Vetar sprints e saltos de intensidade máxima nas próximas 48 a 72 horas",
      "Crioterapia de imersão (10 min a 10°C) e ênfase na reposição glicídica e hidratação"
    ],
    monitoring: "Carga diária (sRPE) e cálculo contínuo do ACWR",
    transfer: "Prevenção direta de estiramentos musculares, contraturas severas e lesões por sobreuso",
    evidenceReference: "Gabbett et al. (2016), Hulin et al. (2016)"
  },
  {
    id: "master-acwr-subtreinamento",
    category: "controle_carga_recuperacao",
    finding: "ACWR em Subtreinamento (< 0.8)",
    targetBenchmark: "ACWR entre 0.8 e 1.3",
    context: "Atleta que treinou substancialmente menos que o habitual nas últimas semanas",
    hypothesis: "Destreinamento funcional e perda de robustez física; suscetibilidade aumentada caso sofra aumento súbito de esforço",
    priority: "Media",
    intervention: "Incremento Progressivo Linear de Volume e Carga Mecânica (10% a 15% por semana)",
    practicalDetails: [
      "Aumentar progressivamente a minutagem das sessões principais de campo",
      "Adicionar trabalhos complementares de robustez tecidual e força geral",
      "Evitar saltos abruptos de carga para não gerar spikes de ACWR"
    ],
    monitoring: "ACWR semanal e acompanhamento de prontidão",
    transfer: "Construção de resiliência crônica e capacidade de tolerar períodos competitivos densos",
    evidenceReference: "Gabbett et al. (2016), Windt & Gabbett (2017)"
  },
  {
    id: "master-prontidao-baixa-hooper",
    category: "controle_carga_recuperacao",
    finding: "Prontidão / Hooper Score Baixo (< 50%)",
    targetBenchmark: "Readiness ≥ 70%",
    context: "Atleta relatando sono insuficiente (<6h), dores musculares intensas ou alto estresse mental",
    hypothesis: "Fadiga sistêmica acumulada, ativação simpática exacerbada e recuperação incompleta de tecidos moles",
    priority: "Alta",
    intervention: "Ajuste Autorregulado do Treino: modulação por RPE, redução de densidade e foco em recovery",
    practicalDetails: [
      "Permitir aquecimento estendido com mobilidade e liberação miofascial",
      "Reduzir 2 séries de cada exercício principal da sessão de força",
      "Orientação de higiene do sono (quarto escuro, sem telas 1h antes, suplementação com magnésio)"
    ],
    monitoring: "Hooper Index diário matinal",
    transfer: "Manutenção do foco cognitivo, redução do risco de lesão acidental e prontidão motora",
    evidenceReference: "Hooper & Mackinnon (1995), Saw et al. (2016)"
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
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  normalCount: number;
  overallStatus: "critico" | "atencao" | "estavel" | "excelente";
  executiveSummary: string;
}

export function generateAthleteDecisionMatrix(
  athlete: Athlete,
  workouts?: Workout[],
  externalSessions?: ExternalSession[]
): AthleteDecisionReport {
  const activeRows: DecisionMatrixRow[] = [];
  const gender = athlete.gender || "M";
  const assessments = athlete.assessments || {};

  // 1. ANÁLISE DE IMTP
  const latestImtp = assessments.imtp?.slice(-1)[0];
  if (latestImtp) {
    const rawRelForce = latestImtp.relativePeakForce || 0;
    const timeToPeak = latestImtp.timeToPeakForce || 0;
    const peakForce = latestImtp.peakForce || 0;
    const athleteWeight = athlete.weight || latestImtp.weight || 75;

    // Normalização rigorosa das unidades:
    // Se o valor armazenado for < 10 (ex: 1.91), trata-se de kgf/kg (quilograma-força / kg corporal).
    // Se for >= 10 (ex: 18.7 ou 34.0), trata-se de N/kg.
    let relForceKgf = 0;
    if (rawRelForce > 0) {
      relForceKgf = rawRelForce < 10 ? rawRelForce : rawRelForce / 9.80665;
    } else if (peakForce > 0 && athleteWeight > 0) {
      relForceKgf = peakForce / athleteWeight;
    }
    const relForceNkg = relForceKgf * 9.80665;

    // Benchmarks calibrados para esportes coletivos e quadra/campo (Futebol, Vôlei, Basquete, Handebol):
    // - Faixa Estável: Masc 1.80 a 2.60 kgf/kg (~18 a 25.5 N/kg) | Fem 1.50 a 2.20 kgf/kg (~15 a 21.5 N/kg)
    // - Faixa Otimizada: Masc ≥ 2.60 kgf/kg (≥ 25.5 N/kg) | Fem ≥ 2.20 kgf/kg (≥ 21.5 N/kg)
    // - Base em Construção: Masc < 1.80 kgf/kg | Fem < 1.50 kgf/kg
    const isFemale = gender === "F";
    const minEstavelKgf = isFemale ? 1.50 : 1.80;
    const minEstavelNkg = isFemale ? 15.0 : 18.0;
    const targetOtimizadoKgf = isFemale ? 2.20 : 2.60;
    const targetOtimizadoNkg = isFemale ? 21.5 : 25.5;

    if (relForceKgf > 0) {
      if (relForceKgf < minEstavelKgf) {
        const isCritico = relForceKgf < (isFemale ? 1.20 : 1.40);

        activeRows.push({
          id: "dyn-imtp-base",
          category: "forca_maxima",
          finding: `IMTP em Construção de Base: ${relForceKgf.toFixed(2)} kgf/kg (${relForceNkg.toFixed(1)} N/kg)`,
          metricValue: `${relForceKgf.toFixed(2)} kgf/kg (${relForceNkg.toFixed(1)} N/kg)`,
          targetBenchmark: `Faixa Estável: ≥ ${minEstavelKgf.toFixed(2)} kgf/kg (≥ ${minEstavelNkg.toFixed(0)} N/kg)`,
          context: `${athlete.modality || "Esporte"} / ${gender === "M" ? "Masculino" : "Feminino"} • Força Relativa: ${relForceKgf.toFixed(2)}x peso corporal`,
          hypothesis: `Atleta em fase de estruturação de força de base (< ${minEstavelKgf.toFixed(2)} kgf/kg). Necessidade de lastro miofibrilar e estabilidade articular antes de elevar volumes de pliometria de alta intensidade.`,
          priority: isCritico ? "Alta" : "Media",
          intervention: "Bloco de Base Estrutural e Força Funcional: Agachamento progressivo (70-80% 1RM), Levantamento Terra/Trap Bar e fortalecimento de cadeia posterior.",
          practicalDetails: [
            "Agachamento Traseiro / Trap Bar: 3-4 séries x 5-6 reps @ 75-80% 1RM com controle excêntrico",
            "Isometria Superada no Rack (posição do IMTP a 130-140°): 3 séries x 5 segundos de contração firme",
            "Acessórios de Cadeia Posterior (RDL, Elevação Pélvica, Panturrilha): 3 séries x 8 reps"
          ],
          monitoring: "IMTP a cada 3-4 semanas (célula de carga)",
          transfer: "Suporte articular em aterrissagens, estabilidade pélvica e resiliência mecânica",
          evidenceReference: "Suchomel et al. (2016), Comfort et al. (2024)",
          status: "detectado"
        });
      } else if (relForceKgf >= minEstavelKgf && relForceKgf < targetOtimizadoKgf) {
        // Faixa Funcional Estável (ex: 1.91 kgf/kg no Voleibol)
        activeRows.push({
          id: "dyn-imtp-estavel",
          category: "forca_maxima",
          finding: `IMTP Funcional Estável: ${relForceKgf.toFixed(2)} kgf/kg (${relForceNkg.toFixed(1)} N/kg)`,
          metricValue: `${relForceKgf.toFixed(2)} kgf/kg (${relForceNkg.toFixed(1)} N/kg)`,
          targetBenchmark: `Faixa Estável: ${minEstavelKgf.toFixed(2)} a ${targetOtimizadoKgf.toFixed(2)} kgf/kg (${minEstavelNkg.toFixed(0)} a ${targetOtimizadoNkg.toFixed(0)} N/kg)`,
          context: `${athlete.modality || "Esporte"} / ${gender === "M" ? "Masculino" : "Feminino"} • Força de Suporte Consolidada`,
          hypothesis: `Força relativa adequada e equilibrada para as demandas do ${athlete.modality || "esporte"}. A base de suporte estável permite priorizar o desenvolvimento de taxa de subida de força (RFD), aceleração e potência reativa no salto.`,
          priority: "Normal",
          intervention: "Manutenção de Força com Foco em Força Rápida e RFD: Cargas submáximas (75-82% 1RM) com foco na máxima intenção concêntrica e transferências balísticas.",
          practicalDetails: [
            "Agachamento com Foco em Velocidade: 3 séries x 3 reps @ 75-80% 1RM (máxima velocidade concêntrica)",
            "Jump Squats com Barra Hexagonal (15-20% peso corporal): 3 séries x 4 reps",
            "Transferência direta para aterrissagens e impulsão específica da modalidade"
          ],
          monitoring: "Monitoramento a cada 4 a 6 semanas",
          transfer: "Eficiência mecânica nos saltos e sprints sem sobrepeso de massa muscular não-funcional",
          evidenceReference: "Suchomel et al. (2016), Turner et al. (2020)",
          status: "normal"
        });
      } else {
        // Faixa Otimizada / Alta Performance
        activeRows.push({
          id: "dyn-imtp-otimizado",
          category: "forca_maxima",
          finding: `IMTP Otimizado / Alto Nível: ${relForceKgf.toFixed(2)} kgf/kg (${relForceNkg.toFixed(1)} N/kg)`,
          metricValue: `${relForceKgf.toFixed(2)} kgf/kg (${relForceNkg.toFixed(1)} N/kg)`,
          targetBenchmark: `≥ ${targetOtimizadoKgf.toFixed(2)} kgf/kg (≥ ${targetOtimizadoNkg.toFixed(0)} N/kg)`,
          context: `${athlete.modality || "Esporte"} / ${gender === "M" ? "Masculino" : "Feminino"} • Força Relativa de Elite`,
          hypothesis: "Excelente capacidade de produção de força máxima em relação à massa corporal. Força não atua como fator limitante para a modalidade.",
          priority: "Normal",
          intervention: "Manutenção Econômica (1x/semana em microdoses) e Foco em Potência Balística e Reatividade Elástica",
          practicalDetails: [
            "Agachamento Pesado de Manutenção: 2 séries x 2-3 reps @ 85% 1RM (1x/semana)",
            "Jump Squats e Pliometria de Alto Nível (Drop Jumps)",
            "Transferência direta para gestos esportivos de explosão máxima"
          ],
          monitoring: "Reavaliação a cada 6 a 8 semanas",
          transfer: "Preservação da estabilidade mecânica com prontidão neural para velocidade e saltos",
          evidenceReference: "Suchomel et al. (2016), Comfort et al. (2024)",
          status: "otimo"
        });
      }
    }

    if (timeToPeak > 400) {
      activeRows.push({
        id: "dyn-imtp-tdf-lenta",
        category: "taxa_desenvolvimento_forca",
        finding: `Taxa de Desenvolvimento de Força (TDF) Lenta: ${timeToPeak} ms até pico`,
        metricValue: `${timeToPeak} ms`,
        targetBenchmark: "< 250 ms até o pico",
        context: "Transição neuromuscular lenta na decolagem do tiro ou salto",
        hypothesis: "Taxa de disparo neural inicial letárgica e baixa sincronização de unidades motoras rápidas",
        priority: "Alta",
        intervention: "Treino Balístico com Cargas Leves (Jump Squats) e Exercícios com Foco em Máxima Intenção de Velocidade",
        practicalDetails: [
          "Jump Squats com Barra Hexagonal: 4 séries x 4 reps com 20% do peso corporal",
          "Isometria Balística Rápida ('empurrar o mais rápido possível'): 3 x 3s",
          "Arremessos de Medicine Ball em rotação/frente: 3 x 6 reps"
        ],
        monitoring: "RFD100/200 a cada 2 semanas",
        transfer: "Primeiro passo explosivo de aceleração e reação imediata de finta",
        evidenceReference: "Aagaard et al. (2002), Maffiuletti et al. (2016)",
        status: "detectado"
      });
    }
  }

  // 2. ANÁLISE DE CMJ
  const cmjHistory = assessments.cmj || [];
  const latestCmj = cmjHistory.slice(-1)[0];
  const prevCmj = cmjHistory.length > 1 ? cmjHistory[cmjHistory.length - 2] : undefined;

  if (latestCmj) {
    const h = latestCmj.height || 0;
    const pRel = latestCmj.power && latestCmj.weight ? (latestCmj.power / latestCmj.weight) : 0;
    const minH = gender === "F" ? 25 : 35;
    const targetH = gender === "F" ? 30 : 42;

    if (h > 0 && h < minH) {
      activeRows.push({
        id: "dyn-cmj-baixo",
        category: "potencia_cmj",
        finding: `CMJ Abaixo do Ideal: ${h.toFixed(1)} cm (${pRel.toFixed(1)} W/kg)`,
        metricValue: `${h.toFixed(1)} cm`,
        targetBenchmark: `≥ ${targetH} cm`,
        context: "Potência concêntrica elástica de membros inferiores",
        hypothesis: "Baixa taxa de aceleração concêntrica na extensão tripla e déficit de potência relativa",
        priority: "Alta",
        intervention: "Treino Combinado de Potência (Complex Training) e Agachamentos Dinâmicos a 50-60% 1RM",
        practicalDetails: [
          "Contraste Francês: Agachamento pesado (2 reps) + 3 saltos livres",
          "Agachamentos com máxima velocidade concêntrica: 4 x 5 reps",
          "Pliometria extensiva moderada: saltos contínuos sobre barreiras baixas"
        ],
        monitoring: "CMJ quinzenal",
        transfer: "Potência de impulsão para cabeceios, bloqueios e decolagem de sprints",
        evidenceReference: "Sayers et al. (1999), Claudino et al. (2017)",
        status: "detectado"
      });
    }

    // Verificar se houve queda aguda de CMJ em relação ao teste anterior
    if (prevCmj && prevCmj.height && latestCmj.height) {
      const dropPct = ((prevCmj.height - latestCmj.height) / prevCmj.height) * 100;
      if (dropPct >= 5.0) {
        activeRows.push({
          id: "dyn-cmj-queda-aguda",
          category: "potencia_cmj",
          finding: `Queda Aguda no Salto CMJ: -${dropPct.toFixed(1)}% (${prevCmj.height}cm ➔ ${latestCmj.height}cm)`,
          metricValue: `-${dropPct.toFixed(1)}%`,
          targetBenchmark: "Variação < ±3%",
          context: "Oscilação pós-treino ou sequência densa de jogos",
          hypothesis: "Fadiga neuromuscular aguda do SNC acumulada e depleção metabólica local",
          priority: "Alta",
          intervention: "Ajuste de Carga Imediato: redução do volume de choque (-25%), deload regenerativo e sono",
          practicalDetails: [
            "Vetar exercícios de saltos de alta intensidade pelas próximas 48h",
            "Sessão regenerativa com mobilidade ativa e recuperação miofascial",
            "Reavaliação de CMJ antes da próxima sessão pesada de treino"
          ],
          monitoring: "CMJ no início de cada microciclo",
          transfer: "Evitar lesões de tecidos moles e restabelecer o teto de potência competitiva",
          evidenceReference: "Gathercole et al. (2014), Cormack et al. (2008)",
          status: "detectado"
        });
      }
    }
  }

  // 3. ANÁLISE DE DROP JUMP (STIFFNESS & FORÇA REATIVA)
  const latestDj = assessments.dropJump?.slice(-1)[0];
  if (latestDj) {
    const tc = latestDj.contactTime || 0;
    const rsi = latestDj.rsi || 0;

    if (tc > 220) {
      activeRows.push({
        id: "dyn-dj-lento",
        category: "forca_reativa_dj",
        finding: `Tempo de Contato Excessivo no Salto Reativo: ${tc} ms (RSI ${rsi.toFixed(2)})`,
        metricValue: `${tc} ms`,
        targetBenchmark: "< 200 ms (RSI ≥ 2.0)",
        context: "Eficiência do Ciclo Alongamento-Encurtamento (CAE rápido)",
        hypothesis: "Baixa rigidez elástica (stiffness) do tornozelo; absorção com flexão de joelho excessiva dissipando energia elástica",
        priority: "Alta",
        intervention: "Pliometria Rápida de Tornozelo: Ankle Pogos com joelho estático, saltos em corda rápidos e Drop Jumps baixos",
        practicalDetails: [
          "Ankle Pogo Jumps: 3 séries x 12 contatos instantâneos (< 180 ms)",
          "Drop Jump da caixa de 20cm: 3 séries x 5 repetições focando em 'chão quente'",
          "Isometria pesada de panturrilha/sóleo sustentada: 3 x 20s"
        ],
        monitoring: "RSI e tempo de contato a cada 2 semanas",
        transfer: "Agilidade em fintas de corpo, arrancadas e menor frenagem no início da corrida",
        evidenceReference: "Flanagan & Comyns (2008), Young (1995)",
        status: "detectado"
      });
    }
  }

  // 4. ANÁLISE DE FORÇA ISOMÉTRICA & ASSIMETRIA
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

    if (asymQuad > 12 || asymHam > 12) {
      const maxAsym = Math.max(asymQuad, asymHam);
      activeRows.push({
        id: "dyn-assimetria-elevada",
        category: "assimetria_prevencao",
        finding: `Assimetria Bilateral Crítica: ${maxAsym.toFixed(1)}% (Quad: ${asymQuad.toFixed(1)}% | Isquio: ${asymHam.toFixed(1)}%)`,
        metricValue: `${maxAsym.toFixed(1)}%`,
        targetBenchmark: "Assimetria ≤ 10%",
        context: "Equilíbrio de força entre membros inferiores",
        hypothesis: "Déficit acentuado de força unilateral; compensação cinemática mecânica que eleva o estresse articular no membro fraco",
        priority: "Alta",
        intervention: "Treinamento Unilateral Prioritário com volume 2:1 para o lado deficitário (Agachamento Búlgaro, RDL Unilateral)",
        practicalDetails: [
          "Agachamento Búlgaro: 4 séries lado deficitário x 2 séries lado dominante",
          "Stiff Unilateral (Single-Leg RDL): 3 x 8 reps com foco na estabilidade do quadril",
          "Saltos Unilaterais com aterrissagem controlada (Drop Lands): 3 x 5 por perna"
        ],
        monitoring: "Dinamometria e salto unilateral a cada 2-3 semanas",
        transfer: "Proteção ligamentar e muscular em desacelerações bruscas e mudanças de direção",
        evidenceReference: "Croisier et al. (2008), Impellizzeri et al. (2007)",
        status: "detectado"
      });
    }

    if ((iqR > 0 && iqR < 50) || (iqL > 0 && iqL < 50)) {
      const minIq = Math.min(iqR || 100, iqL || 100);
      activeRows.push({
        id: "dyn-razao-iq-critica",
        category: "assimetria_prevencao",
        finding: `Razão I:Q Abaixo do Limiar de Proteção: ${minIq.toFixed(1)}% (Direita: ${iqR.toFixed(1)}% | Esquerda: ${iqL.toFixed(1)}%)`,
        metricValue: `${minIq.toFixed(1)}%`,
        targetBenchmark: "Razão I:Q entre 50% e 60%",
        context: "Prevenção de Lesões de LCA e Isquiotibiais",
        hypothesis: "Quadríceps dominante sem contrapeso da cadeia posterior; incapacidade dos isquiotibiais de frear a translação tibial",
        priority: "Critica",
        intervention: "Fortalecimento Excêntrico Imediato de Isquiotibiais (Nordic Hamstrings, Stiff e Flexão Nórdica)",
        practicalDetails: [
          "Nordic Hamstring Exercise: 3 séries de 4 a 6 reps lentas na descida (3-4s)",
          "Stiff com Halteres ou Barra: 3 séries x 8 reps com boa cadência",
          "Glute Ham Raise ou Flexão de Joelho Unilateral: 3 x 8 reps"
        ],
        monitoring: "Dinamometria de flexão/extensão a cada 4 semanas",
        transfer: "Redução comprovada de até 51% em lesões de isquiotibiais e estabilização do joelho em sprints",
        evidenceReference: "Al Attar et al. (2017), Baroni et al. (2020)",
        status: "detectado"
      });
    }
  }

  // 5. ANÁLISE DE VELOCIDADE
  const latestSpeed = assessments.speed?.slice(-1)[0];
  if (latestSpeed) {
    const s10m = latestSpeed.speed10m || 0;
    const s30m = latestSpeed.speed30m || 0;
    const ratio = s30m > 0 ? (s10m / s30m) : 0;

    if (s30m > 0 && ratio < 0.65) {
      activeRows.push({
        id: "dyn-velocidade-aceleracao-baixa",
        category: "velocidade_sprint",
        finding: `Aceleração Inicial Lenta nos 10 Metros: Ratio ${ratio.toFixed(2)} (V10m: ${s10m.toFixed(1)} m/s vs V30m: ${s30m.toFixed(1)} m/s)`,
        metricValue: `Ratio ${ratio.toFixed(2)}`,
        targetBenchmark: "Ratio > 0.70 | Tempo 10m < 1.70s",
        context: "Fase de aceleração e saída da inércia",
        hypothesis: "Déficit na aplicação de força propulsiva horizontal e saída muito ereta da inércia",
        priority: "Alta",
        intervention: "Sprints Resistidos com Trenó (Heavy Sled) e Saltos Horizontais Unipodais",
        practicalDetails: [
          "Tiros com Trenó Resistido (carga de 25-35% do peso corporal): 4-5 tiros de 10m",
          "Broad Jumps e Boundings (saltos horizontais alternados): 3 x 5 saltos",
          "Treino de ângulos de saída e ataque agressivo de sola no solo"
        ],
        monitoring: "Fotocélula de 10m e 30m quinzenal",
        transfer: "Ganho de vantagens no arranque curto, fintas e primeiras passadas de disputa",
        evidenceReference: "Morin et al. (2016), Petrakos et al. (2016)",
        status: "detectado"
      });
    }
  }

  // 6. ANÁLISE DE CONTROLE DE CARGA (ACWR)
  const acwrData = calculateACWR(workouts || [], externalSessions || []);
  const acwr = typeof acwrData === "object" && acwrData !== null ? acwrData.ratio : Number(acwrData) || 0;
  if (acwr > 1.5) {
    activeRows.push({
      id: "dyn-acwr-perigo",
      category: "controle_carga_recuperacao",
      finding: `ACWR em Zona de Perigo Extremo: ${acwr.toFixed(2)}`,
      metricValue: `${acwr.toFixed(2)}`,
      targetBenchmark: "0.80 a 1.30 (Sweet Spot)",
      context: "Relação Carga Aguda (7d) vs Crônica (28d)",
      hypothesis: "Pico súbito de volume/intensidade nos últimos dias; fadiga aguda descompensada e risco de lesão multiplicado por 2x a 4x",
      priority: "Critica",
      intervention: "Deload Imediato: redução drástica de 40% a 50% no volume das próximas sessões e veto temporário a sprints máximos",
      practicalDetails: [
        "Substituição de sessão de choque por sessão regenerativa / mobilidade ativa",
        "Proibir sprints e saltos de intensidade máxima nas próximas 48 a 72h",
        "Atenção prioritária à qualidade de sono e reposição eletrolítica e energética"
      ],
      monitoring: "Monitoramento diário de sRPE e ACWR",
      transfer: "Prevenção direta de estiramentos musculares graves e sustentabilidade física no ciclo",
      evidenceReference: "Gabbett et al. (2016), Hulin et al. (2016)",
      status: "detectado"
    });
  } else if (acwr > 0 && acwr < 0.8) {
    activeRows.push({
      id: "dyn-acwr-subtreino",
      category: "controle_carga_recuperacao",
      finding: `ACWR em Subtreinamento: ${acwr.toFixed(2)}`,
      metricValue: `${acwr.toFixed(2)}`,
      targetBenchmark: "0.80 a 1.30",
      context: "Volume recente inferior à rotina crônica",
      hypothesis: "Destreinamento funcional gradual e perda de robustez; vulnerabilidade caso receba estímulos intensos repentinos",
      priority: "Media",
      intervention: "Progressão Gradual e Linear de Volume e Carga (aumento de 10% a 15% por semana)",
      practicalDetails: [
        "Aumentar progressivamente a duração das sessões principais de treino",
        "Inserir sessões coadjuvantes de força estrutural e robustez muscular",
        "Evitar picos abruptos nas próximas semanas para não gerar spikes de ACWR"
      ],
      monitoring: "ACWR semanal",
      transfer: "Reconstrução de capacidade física crônica para suportar o calendário competitivo",
      evidenceReference: "Windt & Gabbett (2017)",
      status: "detectado"
    });
  }

  // 7. ANÁLISE DE PRONTIDÃO / WELLNESS
  const wellnessList = Array.isArray(athlete.wellness) ? athlete.wellness : [];
  const latestWellness = wellnessList.length > 0 
    ? [...wellnessList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] 
    : null;
  const readinessScore = latestWellness 
    ? (typeof latestWellness.readinessScore === "number" ? latestWellness.readinessScore : calculateReadiness(latestWellness)) 
    : 0;

  if (readinessScore > 0 && readinessScore < 60) {
    activeRows.push({
      id: "dyn-readiness-baixa",
      category: "controle_carga_recuperacao",
      finding: `Prontidão Diária Reduzida: ${Math.round(readinessScore)}%`,
      metricValue: `${Math.round(readinessScore)}%`,
      targetBenchmark: "≥ 75%",
      context: "Recuperação biopsicossocial do atleta",
      hypothesis: "Acúmulo de fadiga sistêmica, débitos de sono ou dores musculares que reduzem a capacidade do sistema nervoso",
      priority: "Alta",
      intervention: "Modulação por Autoregulação: aquecimento estendido, diminuição de densidade e sessões de recovery",
      practicalDetails: [
        "Aumentar o tempo de aquecimento dinâmico em 10 minutos",
        "Reduzir 1 a 2 séries de exercícios principais com pesos pesados",
        "Reforçar a higiene do sono e protocolo de descompressão muscular"
      ],
      monitoring: "Check-in matinal sRPE e questionário Hooper",
      transfer: "Preservação da qualidade das sessões-chave e mitigação de microlesões por fadiga",
      evidenceReference: "Saw et al. (2016), McLean et al. (2010)",
      status: "detectado"
    });
  }

  // Se o atleta estiver excelente sem nenhum alerta crítico
  if (activeRows.length === 0) {
    activeRows.push({
      id: "dyn-atleta-balanceado",
      category: "forca_maxima",
      finding: "Perfil Atlético Equilibrado (Sem Alertas Críticos Ativos)",
      metricValue: "Estável",
      targetBenchmark: "Metas Atingidas",
      context: "Monitoramento de Rotina",
      hypothesis: "Atleta com excelente adaptação às cargas vigentes, simetria satisfatória e prontidão física adequada",
      priority: "Normal",
      intervention: "Manutenção do Ciclo de Treinamento Atual com Polimento Específico e Sobrecarga Progressiva Linear",
      practicalDetails: [
        "Manter rotina programada de força e potência",
        "Continuar monitoramento preventivo diário de cargas e saltos semanais"
      ],
      monitoring: "Monitoramento contínuo quinzenal",
      transfer: "Consistência de alto rendimento nos treinos e partidas oficiais",
      evidenceReference: "Suchomel et al. (2016)",
      status: "otimo"
    });
  }

  // Contagem de prioridades
  const criticalCount = activeRows.filter((r) => r.priority === "Critica").length;
  const highCount = activeRows.filter((r) => r.priority === "Alta").length;
  const mediumCount = activeRows.filter((r) => r.priority === "Media").length;
  const normalCount = activeRows.filter((r) => r.priority === "Normal" || r.priority === "Baixa").length;

  let overallStatus: "critico" | "atencao" | "estavel" | "excelente" = "estavel";
  if (criticalCount > 0) overallStatus = "critico";
  else if (highCount >= 2) overallStatus = "atencao";
  else if (activeRows.some((r) => r.status === "otimo")) overallStatus = "excelente";

  let executiveSummary = "";
  if (overallStatus === "critico") {
    executiveSummary = `Atenção Imediata: O atleta apresenta ${criticalCount} achado(s) crítico(s) com alto risco de lesão ou sobrecarga severa. Recomenda-se aplicar as intervenções prioritárias nas próximas 24 a 48 horas.`;
  } else if (overallStatus === "atencao") {
    executiveSummary = `O atleta apresenta ${highCount} pontos de intervenção com alta prioridade neuromuscular ou biomecânica. Ajustes nos blocos de treino são recomendados para destravar o potencial de transferência.`;
  } else if (overallStatus === "excelente") {
    executiveSummary = "O atleta encontra-se em excelente estado de equilíbrio neuromuscular, sem déficits de simetria ou sobrecarga de fadiga detectados nas avaliações recentes.";
  } else {
    executiveSummary = "Atleta com perfil atlético estável e consistente. As recomendações focam em manutenção e refinamento do gradiente de força e velocidade.";
  }

  return {
    athleteId: athlete.id,
    athleteName: athlete.name,
    generatedAt: new Date().toISOString(),
    activeRows,
    totalFindings: activeRows.length,
    criticalCount,
    highCount,
    mediumCount,
    normalCount,
    overallStatus,
    executiveSummary
  };
}
