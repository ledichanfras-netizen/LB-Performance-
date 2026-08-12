import { MMII_EXERCISES } from "./exercises_mmii";
import { MMSS_EXERCISES } from "./exercises_mmss";
import { POTENCIA_EXERCISES } from "./exercises_potencia";
import { CORE_EXERCISES } from "./exercises_core";
import { AGILITY_SPEED_EXERCISES } from "./exercises_agility_speed";
import { PREVENTIVE_EXERCISES } from "./exercises_preventive";

export interface EnrichedExercise {
  id: string;
  name: string;
  category: string; // MMII, MMSS, Potência, Core, Preventivo, Velocidade, Mobilidade, Agilidade
  muscleGroup: string;
  defaultReps: string;
  defaultWeight: string;
  isFavorite?: boolean;
  
  // Rich NASA/EXOS/Hawkin Dynamics Metadata
  movementPattern?: string; // e.g., Agachar (Squat), Dobradiça de Quadril (Hip Hinge), Passada (Lunge), etc.
  lateralType?: "Unilateral" | "Bilateral" | "N/A" | string;
  physicalQuality?: string; 
  kineticChain?: string;
  movementPlane?: string;
  equipment?: string; 
  difficulty?: "Iniciante" | "Intermediário" | "Avançado" | "Elite" | string;
  sports?: string[]; 
  seasonPhase?: string[]; 
  ageRange?: string[]; 
  physiologicalGoal?: string; 
  scientificEvidence?: string; 
  benefits?: string[]; 
  contraindications?: string[]; 
  commonErrors?: string[]; 
  progressions?: string[]; 
  regressions?: string[]; 
  relatedExercises?: string[]; 
  recommendedRpe?: string; 
  targetVelocity?: string; 
  recommendedRest?: string; 
  musclesInvolved?: string[]; 
  tags?: string[]; 
  imageUrl?: string;
  videoUrl?: string;

  // International Standard Optional Fields
  nameEn?: string;
  subcategory?: string;
  executionSteps?: string[];
  corrections?: string[];
  recommendedRir?: string;
  timeUnderTension?: string;
  defaultDuration?: string;
  defaultSets?: number;
  defaultRepsType?: 'reps' | 'time';
  defaultExecutionTime?: string;
  applicability?: string;
  evidenceLevel?: string;
}

const STATIC_ENRICHED_LIBRARY: EnrichedExercise[] = [
  {
    id: "lib-1",
    name: "Agachamento Traseiro (Back Squat)",
    nameEn: "Barbell Back Squat",
    category: "MMII",
    subcategory: "Agachamentos / Barra",
    muscleGroup: "MMII / Quadríceps",
    defaultReps: "8",
    defaultWeight: "60kg",
    isFavorite: true,
    physicalQuality: "Força Máxima",
    kineticChain: "Fechada",
    movementPlane: "Sagital",
    equipment: "Barra Olímpica e Anilhas",
    difficulty: "Avançado",
    sports: ["Futebol", "Basquete", "Vôlei", "Powerlifting", "Levantamento Olímpico", "Geral"],
    seasonPhase: ["Preparação Geral", "Preparação Específica"],
    ageRange: ["Sub-17", "Sub-20", "Profissional", "Adultos"],
    physiologicalGoal: "Recrutamento de unidades motoras de alto limiar, força geral dos membros inferiores e adaptação estrutural de tendão patelar.",
    scientificEvidence: "Schoenfeld et al. (2010). 'Squatting Kinematics and Kinetics'. Journal of Strength and Conditioning Research.",
    benefits: ["Aumento drástico de força absoluta", "Melhora do salto vertical e acelerações", "Estímulo potente de rigidez de tendão"],
    contraindications: ["Dor lombar aguda em flexão", "Síndrome patelofemoral não controlada"],
    commonErrors: ["Valgo dinâmico de joelho na concêntrica", "Retroversão pélvica precoce ('butt wink')"],
    corrections: ["Focar em empurrar os joelhos para fora", "Manter o abdômen contraído e reduzir a profundidade"],
    progressions: ["Agachamento com Bandas de Acomodação", "Agachamento Excêntrico de 6s"],
    regressions: ["Agachamento Taça (Goblet Squat)", "Agachamento Caixa"],
    relatedExercises: ["Leg Press 45º Unilateral", "RDL com Barra"],
    recommendedRpe: "8-9.5",
    recommendedRir: "1-2",
    targetVelocity: "0.45 - 0.60 m/s",
    timeUnderTension: "3-1-1-0",
    recommendedRest: "2.5 - 3.5 min",
    defaultSets: 4,
    applicability: "Desenvolvimento da base de força absoluta em membros inferiores para atletas profissionais e adultos amadores.",
    evidenceLevel: "Nível I - Excelente (Recomendação Forte)",
    musclesInvolved: ["Glúteo Máximo", "Quadríceps Femoral", "Adutor Maior", "Eretores da Espinha"],
    tags: ["#ForçaMáxima", "#EXOS", "#VBT", "#TripleExtension", "#Barbell", "#Academia"],
    videoUrl: "https://www.youtube.com/watch?v=U0LgH7p28_E",
    imageUrl: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=600"
  },
  {
    id: "lib-2",
    name: "Flexão Nórdica (Nordic Hamstring)",
    nameEn: "Nordic Hamstring Exercise",
    category: "Preventivo",
    subcategory: "Prevenção / Peso Corporal",
    muscleGroup: "MMII / Posterior de Coxa",
    defaultReps: "6",
    defaultWeight: "BW",
    isFavorite: true,
    physicalQuality: "Força Relativa",
    kineticChain: "Fechada",
    movementPlane: "Sagital",
    equipment: "Peso Corporal (Suporte ou parceiro)",
    difficulty: "Elite",
    sports: ["Futebol", "Futsal", "Atletismo", "Rugby", "Corrida", "Geral"],
    seasonPhase: ["Preparação Geral", "Preparação Específica", "Competitivo"],
    ageRange: ["Sub-17", "Sub-20", "Profissional", "Adultos"],
    physiologicalGoal: "Aumento do comprimento do fascículo muscular do bíceps femoral de cabeça longa (BFLH) e hipertrofia excêntrica protetora contra lesões por estiramento.",
    scientificEvidence: "Petersen et al. (2011). 'The Nordic Hamstring Exercise Prevents Hamstring Injuries in Soccer Players'. American Journal of Sports Medicine.",
    benefits: ["Redução comprovada de até 70% nas lesões de posterior", "Melhoria drástica na frenagem no sprint", "Ganho massivo de força excêntrica"],
    contraindications: ["Estiramento agudo ativo de posterior de coxa", "Tendinopatia distal do bíceps femoral"],
    commonErrors: ["Flexão precoce de quadril", "Ausência de amortecimento terminal com as mãos"],
    corrections: ["Manter quadril totalmente estendido em linha reta", "Aparar a queda ativamente nos últimos graus"],
    progressions: ["Flexão Nórdica com carga abraçada", "Excêntrica Ultra-Lenta de 8s"],
    regressions: ["Flexão Nórdica com elástico de suporte", "Mesa Flexora Excêntrica"],
    relatedExercises: ["RDL com Barra", "Slider Hamstring Curls"],
    recommendedRpe: "9-10 (Foco Excêntrico)",
    recommendedRir: "0-1",
    targetVelocity: "Excêntrico ultra-lento",
    timeUnderTension: "5-0-1-0",
    recommendedRest: "2-3 min",
    defaultSets: 3,
    applicability: "Exercício padrão-ouro para reabilitação e prevenção de lesões de isquiotibiais em atletas de corrida, futebol e handebol.",
    evidenceLevel: "Nível I - Padrão Ouro (Recomendação Forte)",
    musclesInvolved: ["Bíceps Femoral (cabeça longa)", "Semitendinoso", "Semimembranoso", "Gastrocnêmio"],
    tags: ["#Excêntrico", "#PrevençãoLesão", "#FIFA11+", "#Desaceleração", "#Nordic", "#Bodyweight"],
    videoUrl: "https://www.youtube.com/watch?v=0k7yF0r5b_M",
    imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600"
  },
  {
    id: "lib-3",
    name: "Adução de Copenhagen (Copenhagen Adduction)",
    nameEn: "Copenhagen Adduction",
    category: "Preventivo",
    subcategory: "Prevenção / Isometria",
    muscleGroup: "MMII / Adutores",
    defaultReps: "10",
    defaultWeight: "BW",
    isFavorite: false,
    physicalQuality: "Estabilidade",
    kineticChain: "Fechada",
    movementPlane: "Frontal",
    equipment: "Banco e Peso Corporal",
    difficulty: "Intermediário",
    sports: ["Futebol", "Basquete", "Futsal", "Tênis", "Rugby", "Handebol"],
    seasonPhase: ["Preparação Geral", "Preparação Específica", "Competitivo"],
    ageRange: ["Sub-15", "Sub-17", "Sub-20", "Profissional", "Adultos"],
    physiologicalGoal: "Fortalecimento do complexo adutor (principalmente adutor longo) para estabilidade lombo-pélvica e prevenção de pubalgias atléticas.",
    scientificEvidence: "Haroy et al. (2019). 'The Copenhagen Adduction Exercise Reduces Groin Injuries'. British Journal of Sports Medicine.",
    benefits: ["Prevenção ativa de pubalgias", "Aumento da estabilidade lateral de quadril", "Equilíbrio de força adutor/abdutor"],
    contraindications: ["Lesão ativa de menisco colateral medial", "Fisgada aguda na virilha"],
    commonErrors: ["Rotação pélvica posterior ou inclinação do tronco", "Tocar o quadril bruscamente no chão"],
    corrections: ["Manter o corpo em linha reta (prancha lateral)", "Controlar a descida de forma isométrica"],
    progressions: ["Copenhagen alavanca longa (pé apoiado no banco)", "Copenhagen com carga adicional no tornozelo"],
    regressions: ["Copenhagen alavanca curta (joelho apoiado no banco)", "Adução no solo com bola suíça"],
    relatedExercises: ["Cadeira Adutora", "Slide Board Lateral"],
    recommendedRpe: "7-8",
    recommendedRir: "2",
    targetVelocity: "Controle Isométrico/Excêntrico",
    timeUnderTension: "2-2-2-0",
    recommendedRest: "90s - 2 min",
    defaultSets: 3,
    applicability: "Fundamental na preparação e reabilitação de atletas de campo e quadra com alta demanda de mudanças de direção e chutes.",
    evidenceLevel: "Nível I - Recomendação Clínica Forte",
    musclesInvolved: ["Adutor Longo", "Grácil", "Pectíneo", "Oblíquos Abdominais", "Glúteo Médio"],
    tags: ["#Pubalgia", "#CoreAtivo", "#PrevençãoGroin", "#EstabilidadePélvica", "#Copenhagen", "#Banco"]
  },
  {
    id: "lib-4",
    name: "Salto Contramovimento (CMJ)",
    nameEn: "Countermovement Jump (CMJ)",
    category: "Potência",
    subcategory: "Saltos / Pliometria",
    muscleGroup: "Potência / Saltos",
    defaultReps: "5",
    defaultWeight: "Livre",
    isFavorite: true,
    physicalQuality: "Potência",
    kineticChain: "Fechada",
    movementPlane: "Sagital",
    equipment: "Livre / Hawkin Force Plates",
    difficulty: "Intermediário",
    sports: ["Vôlei", "Basquete", "Futebol", "Atletismo", "Handebol", "Geral"],
    seasonPhase: ["Preparação Específica", "Competitivo", "Polimento"],
    ageRange: ["Sub-15", "Sub-17", "Sub-20", "Profissional", "Adultos"],
    physiologicalGoal: "Exploração do ciclo alongamento-encurtamento (SSC) lento para maximizar a potência concêntrica de extensão tripla.",
    scientificEvidence: "Cormie et al. (2011). 'Developing Maximal Neuromuscular Power'. Sports Medicine.",
    benefits: ["Otimização direta da altura do salto vertical", "Recrutamento de fibras musculares Tipo IIx", "Melhora da potência de frenagem"],
    contraindications: ["Tendinopatia patelar aguda", "Pós-operatório de LCA < 6 meses"],
    commonErrors: ["Valgo dinâmico na aterrissagem", "Contramovimento excessivamente lento ou profundo"],
    corrections: ["Aterrissar com os joelhos alinhados aos pés", "Executar a transição excêntrica-concêntrica rapidamente"],
    progressions: ["Salto Contramovimento com Halteres", "CMJ Continuado Rápido"],
    regressions: ["Squat Jump (Salto sem contramovimento)", "Subida Explosiva na Caixa"],
    relatedExercises: ["Squat Jump", "Drop Jump"],
    recommendedRpe: "9.5-10 (Intenção Máxima)",
    recommendedRir: "0",
    targetVelocity: "Máxima Explosiva",
    timeUnderTension: "Explosivo",
    recommendedRest: "2-3 min",
    defaultSets: 4,
    applicability: "Usado para desenvolvimento de potência de extensão tripla em basquete, vôlei e atletas de velocidade amadores ou de elite.",
    evidenceLevel: "Nível I - Altamente Recomendado",
    musclesInvolved: ["Glúteo Máximo", "Quadríceps Femoral", "Gastrocnêmio", "Sóleo"],
    tags: ["#Potência", "#JumpMetric", "#SSC", "#TripleExtension", "#Livre"]
  },
  {
    id: "lib-5",
    name: "Sprints com Trenó de Resistência",
    nameEn: "Resisted Sled Sprints",
    category: "Velocidade",
    subcategory: "Sprint / Trenó",
    muscleGroup: "Explosão / Velocidade",
    defaultReps: "4",
    defaultWeight: "15% BW",
    isFavorite: false,
    physicalQuality: "Aceleração",
    kineticChain: "Fechada",
    movementPlane: "Sagital",
    equipment: "Trenó com Cinto e Carga",
    difficulty: "Elite",
    sports: ["Futebol", "Futsal", "Atletismo", "Rugby", "Futebol Americano"],
    seasonPhase: ["Preparação Geral", "Preparação Específica"],
    ageRange: ["Sub-17", "Sub-20", "Profissional"],
    physiologicalGoal: "Aumento do vetor de força horizontal relativo ao solo, otimizando o impulso inicial na aceleração.",
    scientificEvidence: "Morin et al. (2016). 'Very Heavy Sled Training for Improving Sprint Acceleration'. IJSPP.",
    benefits: ["Melhoria drástica na aceleração inicial (0-10m)", "Otimização do ângulo corporal de projeção à frente", "Fortalecimento específico de extensores"],
    contraindications: ["Fisgada ou estiramento agudo de flexores", "Instabilidade crônica de tornozelo"],
    commonErrors: ["Excesso de carga que destrói a mecânica natural", "Tronco flexionado sem sustentação ativa do core"],
    corrections: ["Manter a carga entre 10-15% do peso corporal para velocidade", "Manter a coluna neutra e empurrar o chão para trás"],
    progressions: ["Trenó Pesado (30% BW)", "Sprint Contraste (Trenó + Livre)"],
    regressions: ["Sprints Curtos em Ladeira", "Corrida Resistida com Elástico"],
    relatedExercises: ["Sprint de 20m Livre", "Power Clean"],
    recommendedRpe: "10 (Esforço Neural Máximo)",
    recommendedRir: "0",
    targetVelocity: "Máxima Aceleração",
    timeUnderTension: "Explosivo",
    recommendedRest: "3-4 min (Recuperação ATP-CP)",
    defaultSets: 4,
    applicability: "Desenvolvimento específico de aceleração horizontal em esportes coletivos e velocistas olímpicos.",
    evidenceLevel: "Nível I - Altíssima Evidência",
    musclesInvolved: ["Glúteo Máximo", "Isquiotibiais", "Quadríceps", "Gastrocnêmio", "Eretores da Espinha"],
    tags: ["#Sprint", "#AceleraçãoHorizontal", "#MecânicaDeAceleração", "#EXOS", "#Trenó", "#Campo"]
  },
  {
    id: "lib-6",
    name: "RDL (Romanian Deadlift)",
    nameEn: "Romanian Deadlift (RDL)",
    category: "MMII",
    subcategory: "Dobradiça de Quadril / Barra",
    muscleGroup: "MMII / Cadeia Posterior",
    defaultReps: "10",
    defaultWeight: "50kg",
    isFavorite: false,
    physicalQuality: "Hipertrofia",
    kineticChain: "Fechada",
    movementPlane: "Sagital",
    equipment: "Barra Olímpica e Anilhas",
    difficulty: "Intermediário",
    sports: ["Futebol", "Basquete", "Vôlei", "Powerlifting", "CrossFit", "Geral"],
    seasonPhase: ["Preparação Geral", "Preparação Específica"],
    ageRange: ["Sub-15", "Sub-17", "Sub-20", "Profissional", "Adultos"],
    physiologicalGoal: "Fortalecimento funcional e hipertrofia excêntrica da dobradiça de quadril sob alongamento sob tensão.",
    scientificEvidence: "McAllister et al. (2014). 'Muscle Activation During Romanian Deadlift'. JSCR.",
    benefits: ["Fortalecimento do complexo glúteo/posterior", "Robustez da coluna lombar isométrica", "Excelente prevenção de estiramento excêntrico"],
    contraindications: ["Hérnia discal lombar ativa em flexão", "Instabilidade sacroilíaca severa"],
    commonErrors: ["Arredondamento da coluna torácica ou lombar", "Afastar a barra excessivamente do corpo"],
    corrections: ["Manter escápulas retraídas e empurrar o quadril para trás", "Deslizar a barra colada nas pernas"],
    progressions: ["Single Leg RDL com Halteres", "RDL Excêntrico Lento com Barra"],
    regressions: ["RDL com Halteres com apoio na parede", "Elevação Pélvica com Barra"],
    relatedExercises: ["Agachamento Traseiro", "Bom Dia (Good Morning)"],
    recommendedRpe: "7.5-8.5",
    recommendedRir: "1-3",
    targetVelocity: "0.55 - 0.70 m/s",
    timeUnderTension: "3-1-1-0",
    recommendedRest: "2 min",
    defaultSets: 4,
    applicability: "Fundamental para equilibrar a relação de forças Isquios/Quadríceps de atletas e prevenir lesões graves de LCA e posterior.",
    evidenceLevel: "Nível I - Recomendação Forte",
    musclesInvolved: ["Glúteo Máximo", "Bíceps Femoral", "Semimembranoso", "Eretores da Espinha"],
    tags: ["#HipHinge", "#CadeiaPosterior", "#ForçaBiológica", "#EXOS", "#Barbell", "#Academia"]
  },
  {
    id: "lib-7",
    name: "Drop Jump (Foco em RSI)",
    nameEn: "Drop Jump",
    category: "Potência",
    subcategory: "Pliometria / Caixa",
    muscleGroup: "Potência / Reatividade",
    defaultReps: "5",
    defaultWeight: "BW",
    isFavorite: true,
    physicalQuality: "Potência Reativa",
    kineticChain: "Fechada",
    movementPlane: "Sagital",
    equipment: "Caixa de 30-45cm",
    difficulty: "Elite",
    sports: ["Basquete", "Vôlei", "Atletismo", "Futebol", "Handebol"],
    seasonPhase: ["Preparação Específica", "Competitivo", "Polimento"],
    ageRange: ["Sub-17", "Sub-20", "Profissional"],
    physiologicalGoal: "Maximização da reatividade elástica muscular pelo Ciclo Alongamento-Encurtamento Rápido (SSC < 250ms), otimizando a rigidez do tornozelo.",
    scientificEvidence: "Flanagan et al. (2008). 'The Reactive Strength Index'. Strength & Conditioning Journal.",
    benefits: ["Ganho massivo de rigidez de tendão de Aquiles", "Redução drástica do tempo de contato com o solo", "Alta transferência para velocidade terminal de sprint"],
    contraindications: ["Incapacidade de amortecer pousos", "Fraturas de estresse ativas de membros inferiores"],
    commonErrors: ["Tempo de contato prolongado com afundamento do calcanhar", "Aterrissagem com colapso interno dos joelhos (valgo)"],
    corrections: ["Focar em 'pular rápido como se o solo fosse fogo'", "Manter joelhos firmes e alinhados para fora"],
    progressions: ["Drop Jump de caixas mais altas (60cm)", "Drop Jump Unilateral"],
    regressions: ["Saltos no lugar (Pogo Jumps) rápidos", "Saltos sobre barreiras baixas com pausa"],
    relatedExercises: ["Pogo Jumps", "CMJ"],
    recommendedRpe: "9.5-10 (Intenção Reativa)",
    recommendedRir: "0",
    targetVelocity: "Contato < 220ms",
    timeUnderTension: "Explosivo",
    recommendedRest: "2.5 - 3 min",
    defaultSets: 4,
    applicability: "Desenvolvimento de velocidade terminal, reatividade elástica e altura de salto em atletas olímpicos e profissionais de basquete e vôlei.",
    evidenceLevel: "Nível I - Padrão Ouro em Pliometria",
    musclesInvolved: ["Gastrocnêmio", "Sóleo", "Quadríceps Femoral", "Tendão de Aquiles"],
    tags: ["#Pliometria", "#RSI", "#FastSSC", "#AnkleStiffness", "#Caixa"]
  },
  {
    id: "lib-8",
    name: "Supino Reto com Barra",
    nameEn: "Barbell Bench Press",
    category: "MMSS",
    subcategory: "Empurrar / Barra",
    muscleGroup: "MMSS / Peitoral e Tríceps",
    defaultReps: "8",
    defaultWeight: "40kg",
    isFavorite: false,
    physicalQuality: "Força Máxima",
    kineticChain: "Fechada",
    movementPlane: "Sagital",
    equipment: "Banco Supino, Barra e Anilhas",
    difficulty: "Intermediário",
    sports: ["Basquete", "Rugby", "Futebol Americano", "Powerlifting", "Geral"],
    seasonPhase: ["Preparação Geral", "Preparação Específica"],
    ageRange: ["Sub-17", "Sub-20", "Profissional", "Adultos"],
    physiologicalGoal: "Melhoria da força absoluta de empurrão horizontal no membro superior e hipertrofia de peitorais e tríceps.",
    scientificEvidence: "Sakamoto et al. (2012). 'Effect of training volume and intensity on pectoralis activation'. JSCR.",
    benefits: ["Base sólida de empurrão para esportes de colisão", "Melhora de força de transferência do tronco", "Blindagem ativa do ombro"],
    contraindications: ["Impacto subacromial ativo no ombro", "Lesão aguda de peitoral maior"],
    commonErrors: ["Ausência de retração escapular ativa", "Trajetória com cotovelos abertos em 90 graus"],
    corrections: ["Encaixar as escápulas juntas e para baixo", "Manter os cotovelos em ângulo de 45 a 60 graus do corpo"],
    progressions: ["Supino com Halteres Explosivo", "Supino com Correntes de Resistência"],
    regressions: ["Flexão de Braço com Joelhos (Regressão)", "Supino com Halteres leve"],
    relatedExercises: ["Supino Inclinado Halteres", "Push Press"],
    recommendedRpe: "8-9",
    recommendedRir: "1-2",
    targetVelocity: "0.65 - 0.80 m/s",
    timeUnderTension: "3-0-1-0",
    recommendedRest: "2-3 min",
    defaultSets: 4,
    applicability: "Melhoria de força geral do tronco superior para atletas de colisão (rugby, basquete, handebol) e adultos amadores.",
    evidenceLevel: "Nível I - Altamente Consolidado",
    musclesInvolved: ["Peitoral Maior", "Deltoide Anterior", "Tríceps Braquial", "Serrátil Anterior"],
    tags: ["#EmpurrarHorizontal", "#UpperBody", "#ForçaAbsoluta", "#EXOS", "#Supino", "#Barbell", "#Academia"]
  },
  {
    id: "lib-9",
    name: "Remada Curvada Pronada",
    nameEn: "Bent-Over Row",
    category: "MMSS",
    subcategory: "Puxar / Barra",
    muscleGroup: "MMSS / Costas e Bíceps",
    defaultReps: "10",
    defaultWeight: "35kg",
    isFavorite: false,
    physicalQuality: "Hipertrofia",
    kineticChain: "Aberta",
    movementPlane: "Transversal",
    equipment: "Barra Olímpica e Anilhas",
    difficulty: "Intermediário",
    sports: ["Basquete", "Vôlei", "Natação", "Remo", "CrossFit", "Geral"],
    seasonPhase: ["Preparação Geral", "Preparação Específica"],
    ageRange: ["Sub-15", "Sub-17", "Sub-20", "Profissional", "Adultos"],
    physiologicalGoal: "Desenvolvimento da musculatura retratora das escápulas, equilibrando a cintura escapular contra ombro protuso em overhead.",
    scientificEvidence: "Fenwick et al. (2009). 'Comparison of different rowing exercises'. JSCR.",
    benefits: ["Prevenção de lesões no ombro (overhead)", "Robustez postural lombar e dorsal", "Equilíbrio anterior-posterior do tronco"],
    contraindications: ["Hérnia de disco lombar sob dor", "Instabilidade lombar severa"],
    commonErrors: ["Extensão do tronco com impulso ('roubo')", "Ausência de retração escapular no final"],
    corrections: ["Manter o tronco paralelo ao solo e imóvel", "Focar em puxar os cotovelos em direção ao teto"],
    progressions: ["Pendlay Row (saindo do solo de forma explosiva)", "Remada Curvada com Halteres Unilateral"],
    regressions: ["Remada no TRX Invertida", "Remada Neutra com Cabos no Pulley"],
    relatedExercises: ["Pull-Up (Barra Fixa)", "Remada Unilateral"],
    recommendedRpe: "7.5-8.5",
    recommendedRir: "2",
    targetVelocity: "0.60 - 0.75 m/s",
    timeUnderTension: "2-0-1-1",
    recommendedRest: "90s - 2 min",
    defaultSets: 4,
    applicability: "Fundamental na redução de lesões de ombro em esportes com arremessos ou movimentos de natação / saques repetitivos.",
    evidenceLevel: "Nível I - Excelente",
    musclesInvolved: ["Latíssimo do Dorso", "Trapézio Médio/Inferior", "Romboides", "Deltoide Posterior", "Bíceps Braquial"],
    tags: ["#PuxarHorizontal", "#UpperBody", "#EstabilidadeEscapular", "#EXOS", "#Barbell", "#Academia"]
  },
  {
    id: "lib-10",
    name: "Pallof Press",
    nameEn: "Cable Pallof Press",
    category: "Core",
    subcategory: "Estabilidade / Cabos",
    muscleGroup: "Core / Antirrotação",
    defaultReps: "12",
    defaultWeight: "15kg",
    isFavorite: false,
    physicalQuality: "Estabilidade",
    kineticChain: "Fechada",
    movementPlane: "Transversal",
    equipment: "Polia de Cabos / Elásticos",
    difficulty: "Iniciante",
    sports: ["Futebol", "Tênis", "Golfe", "Basquete", "Vôlei", "Geral"],
    seasonPhase: ["Preparação Geral", "Preparação Específica", "Competitivo"],
    ageRange: ["Sub-15", "Sub-17", "Sub-20", "Profissional", "Adultos", "Idosos"],
    physiologicalGoal: "Controle neuromuscular e rigidez abdominal reflexa contra forças rotacionais externas aplicadas ao tronco.",
    scientificEvidence: "McGill et al. (2009). 'Core Training Evidence-Based'. Strength and Conditioning Journal.",
    benefits: ["Blindagem ativa de vértebras lombares", "Melhor transferência de torque dinâmico (passes, chutes)", "Cinturão abdominal funcional"],
    contraindications: ["Fase aguda de hérnia de disco em rotação"],
    commonErrors: ["Rotação pélvica lateral compensatória", "Execução rápida demais sem sustentar a tensão extrema"],
    corrections: ["Manter quadris e pés congelados à frente", "Estender os braços lentamente sustentando 2s na ponta"],
    progressions: ["Pallof Press Unilateral (apoio em um pé)", "Pallof Press com passo lateral dinâmico"],
    regressions: ["Prancha Lateral Isométrica standard", "Pallof Press de joelhos (Kneeling)"],
    relatedExercises: ["Prancha Lateral", "Carregamento Fazendeiro Unilateral"],
    recommendedRpe: "7-8",
    recommendedRir: "2",
    targetVelocity: "Isométrico Controlado",
    timeUnderTension: "3-2-3-0",
    recommendedRest: "60s - 90s",
    defaultSets: 3,
    applicability: "Fundamental para estabilização de coluna e transferência de energia cinética em gestos esportivos de alta aceleração.",
    evidenceLevel: "Nível I - Altamente Recomendado",
    musclesInvolved: ["Oblíquos Interno e Externo", "Transverso do Abdômen", "Reto Abdominal", "Glúteo Médio"],
    tags: ["#AntiRotação", "#CoreStability", "#PillarPrep", "#EXOS", "#Cabos", "#Elásticos"]
  },
  {
    id: "lib-11",
    name: "Leg Press 45º",
    nameEn: "Leg Press 45 Degrees",
    category: "MMII",
    subcategory: "Empurrar / Máquina guiada",
    muscleGroup: "MMII / Quadríceps",
    defaultReps: "10",
    defaultWeight: "120kg",
    isFavorite: false,
    physicalQuality: "Hipertrofia",
    kineticChain: "Fechada",
    movementPlane: "Sagital",
    equipment: "Leg Press Máquina",
    difficulty: "Iniciante",
    sports: ["Futebol", "Basquete", "Futsal", "Ciclismo", "Adultos", "Idosos"],
    seasonPhase: ["Preparação Geral", "Preparação Específica"],
    ageRange: ["Sub-15", "Sub-17", "Sub-20", "Profissional", "Adultos", "Idosos"],
    physiologicalGoal: "Hipertrofia e força geral da musculatura extensora do joelho e quadril com restrição de demanda de estabilização axial da coluna.",
    scientificEvidence: "Escamilla et al. (2001). 'Effects of foot position on leg press'. MSSE.",
    benefits: ["Isolamento seguro de membros inferiores", "Menor sobrecarga na coluna lombar", "Excelente estímulo de hipertrofia"],
    contraindications: ["Hérnia lombar intolerante à flexão profunda", "Condropatia patelar grave"],
    commonErrors: ["Retroversão pélvica no final da excêntrica", "Hiperextensão súbita de joelhos no bloqueio concêntrico"],
    corrections: ["Limpar a descida antes do quadril descolar", "Sustentar a concêntrica antes da extensão total rígida"],
    progressions: ["Leg Press Unilateral", "Leg Press Excêntrico de 5s"],
    regressions: ["Leg Press Horizontal com elástico", "Agachamento Caixa sem peso"],
    relatedExercises: ["Agachamento Traseiro", "Agachamento Hack"],
    recommendedRpe: "8-9",
    recommendedRir: "1-2",
    targetVelocity: "Controlada",
    timeUnderTension: "3-0-1-0",
    recommendedRest: "2 min",
    defaultSets: 4,
    applicability: "Excelente alternativa para ganho estrutural e reabilitação de joelhos com baixa demanda espinhal e segurança absoluta.",
    evidenceLevel: "Nível I - Altíssima Evidência",
    musclesInvolved: ["Quadríceps Femoral", "Glúteo Máximo", "Adutor Maior", "Isquiotibiais"],
    tags: ["#Hipertrofia", "#ForçaGeral", "#MembrosInferiores", "#Academia", "#LegPress"]
  },
  {
    id: "lib-12",
    name: "Clean & Jerk (Arremesso)",
    nameEn: "Clean and Jerk",
    category: "Potência",
    subcategory: "Levantamento Olímpico / Barra",
    muscleGroup: "Potência / Explosão",
    defaultReps: "3",
    defaultWeight: "45kg",
    isFavorite: true,
    physicalQuality: "Força Explosiva",
    kineticChain: "Fechada",
    movementPlane: "Sagital",
    equipment: "Barra Olímpica e Anilhas",
    difficulty: "Elite",
    sports: ["Levantamento Olímpico", "CrossFit", "Futebol Americano", "Atletismo", "Rugby", "Geral"],
    seasonPhase: ["Preparação Geral", "Preparação Específica", "Competitivo"],
    ageRange: ["Sub-17", "Sub-20", "Profissional"],
    physiologicalGoal: "Desenvolvimento da potência mecânica global por meio de taxa de desenvolvimento de força (RFD) máxima de tripla extensão e recepção sob carga.",
    scientificEvidence: "Garhammer et al. (1993). 'A Review of Power Output Studies'. Medicine and Science in Sports.",
    benefits: ["Pico máximo de potência concêntrica de corpo inteiro", "Alta transferência para velocidade de aceleração horizontal", "Estabilidade integrada de core e escapular"],
    contraindications: ["Lesão ativa no punho ou ombro", "Restrição grave de flexão de quadril"],
    commonErrors: ["Puxada com braços dobrados precocemente", "Falta de extensão completa de quadril na transição"],
    corrections: ["Manter braços estendidos até a tripla extensão total", "Focar no quadril estendendo antes do encolhimento"],
    progressions: ["Clean & Jerk de Blocos", "Clean de Suspensão (Hang Clean)"],
    regressions: ["Power Clean parcial", "Remada Alta de Arranque + Agachamento"],
    relatedExercises: ["Power Clean", "Push Press"],
    recommendedRpe: "8.5-9.5 (Foco Técnico)",
    recommendedRir: "N/A - Gesto Balístico",
    targetVelocity: "1.2 - 1.5 m/s",
    timeUnderTension: "Balístico/Explosivo",
    recommendedRest: "3-4 min",
    defaultSets: 4,
    applicability: "Desenvolvimento de potência neural máxima de corpo inteiro para atletas de rendimento de elite e levantadores.",
    evidenceLevel: "Nível I - Recomendação Prática de Elite",
    musclesInvolved: ["Quadríceps", "Glúteo Máximo", "Isquiotibiais", "Deltoides", "Trapézio", "Sóleo"],
    tags: ["#LPO", "#ExplosãoTotal", "#RFD", "#TripleExtension", "#Barbell", "#Academia"]
  },
  {
    id: "lib-13",
    name: "Flexão de Braços (Push-Up)",
    nameEn: "Bodyweight Push-Up",
    category: "MMSS",
    subcategory: "Empurrar / Peso Corporal",
    muscleGroup: "MMSS / Peitoral e Tríceps",
    defaultReps: "15",
    defaultWeight: "BW",
    isFavorite: false,
    physicalQuality: "Resistência Muscular",
    kineticChain: "Fechada",
    movementPlane: "Sagital",
    equipment: "Peso Corporal",
    difficulty: "Iniciante",
    sports: ["Geral", "Crianças", "Adolescentes", "Idosos", "Reabilitação", "MMA", "Jiu-Jitsu"],
    seasonPhase: ["Preparação Geral", "Preparação Específica", "Recuperação"],
    ageRange: ["Sub-15", "Sub-17", "Sub-20", "Profissional", "Adultos", "Idosos", "Crianças"],
    physiologicalGoal: "Ganho de resistência muscular localizada e fortalecimento cinético fechado da cintura lombo-pélvica e escapular.",
    scientificEvidence: "Ebben et al. (2011). 'Kinematic and kinetic analysis of push-ups'. JSCR.",
    benefits: ["Livre de equipamentos", "Excelente recrutamento do serrátil anterior", "Baixa sobrecarga nas articulações traseiras"],
    contraindications: ["Disfunção do punho aguda", "Instabilidade glenoumeral dolorosa"],
    commonErrors: ["Quadril caído (hiperlordose)", "Abdução excessiva dos cotovelos (ombro em 90 graus)"],
    corrections: ["Contrair glúteos e abdômen firmemente", "Focar em direcionar os cotovelos para trás"],
    progressions: ["Flexão de braços com carga elástica", "Flexão de braços em apoios unilaterais"],
    regressions: ["Flexão inclinada na caixa ou parede", "Flexão de joelhos no solo"],
    relatedExercises: ["Supino com Halteres", "Dips (Paralelas)"],
    recommendedRpe: "6-8",
    recommendedRir: "2-3",
    targetVelocity: "Controlada",
    timeUnderTension: "2-1-1-0",
    recommendedRest: "60s - 90s",
    defaultSets: 3,
    applicability: "Excelente para a saúde articular de atletas iniciantes, reabilitação física, crianças, adolescentes e idosos.",
    evidenceLevel: "Nível I - Altamente Consolidado",
    musclesInvolved: ["Peitoral Maior", "Tríceps Braquial", "Deltoide Anterior", "Serrátil Anterior", "Reto Abdominal"],
    tags: ["#Bodyweight", "#Empurrar", "#CinturaEscapular", "#Iniciante", "#Livre"]
  },
  {
    id: "lib-14",
    name: "Barra Fixa Pronada (Pull-Up)",
    nameEn: "Pronated Pull-Up",
    category: "MMSS",
    subcategory: "Puxar / Peso Corporal",
    muscleGroup: "MMSS / Costas e Bíceps",
    defaultReps: "8",
    defaultWeight: "BW",
    isFavorite: false,
    physicalQuality: "Força Relativa",
    kineticChain: "Fechada",
    movementPlane: "Transversal",
    equipment: "Barra Fixa",
    difficulty: "Avançado",
    sports: ["Geral", "CrossFit", "Jiu-Jitsu", "Judô", "Escalada", "Basquete", "Vôlei"],
    seasonPhase: ["Preparação Geral", "Preparação Específica", "Competitivo"],
    ageRange: ["Sub-15", "Sub-17", "Sub-20", "Profissional", "Adultos"],
    physiologicalGoal: "Força funcional vertical de membros superiores de tração, com alta demanda de controle de carga interna corporal.",
    scientificEvidence: "Youdas et al. (2010). 'Electromyographic analysis of muscle activation during pull-ups'. JSCR.",
    benefits: ["Fortalecimento dorsal excepcional", "Aumento da pegada (força de preensão)", "Excelente transferência para escalada e judô"],
    contraindications: ["Disfunção do manguito rotador ativa", "Lesão medial de cotovelo (golfista)"],
    commonErrors: ["Execução incompleta sem estender cotovelos", "Balanço excessivo do corpo (kipping não intencional)"],
    corrections: ["Iniciar a puxada pela depressão das escápulas", "Controlar a descida sem balançar as pernas"],
    progressions: ["Barra Fixa com sobrecarga de cinturão", "Barra Fixa com pausa excêntrica lenta"],
    regressions: ["Barra Fixa assistida com elástico", "Remada Invertida no TRX"],
    relatedExercises: ["Remada Curvada", "Puxada Alta no Pulley"],
    recommendedRpe: "8-9.5",
    recommendedRir: "1-2",
    targetVelocity: "Controlada",
    timeUnderTension: "2-0-1-0",
    recommendedRest: "2 min",
    defaultSets: 4,
    applicability: "Fundamental para lutadores, ginastas, atletas de basquete/vôlei e praticantes de crossfit de rendimento.",
    evidenceLevel: "Nível I - Altamente Recomendado",
    musclesInvolved: ["Latíssimo do Dorso", "Trapézio Inferior", "Bíceps Braquial", "Braquiorradial", "Romboides"],
    tags: ["#PuxarVertical", "#UpperBody", "#ForçaRelativa", "#Bodyweight", "#BarraFixa"]
  },
  {
    id: "lib-15",
    name: "Corda Naval (Battle Rope Slams)",
    nameEn: "Battle Rope Slams",
    category: "Potência",
    subcategory: "Potência / Corda",
    muscleGroup: "Core / Ombros",
    defaultReps: "30s",
    defaultWeight: "Livre",
    isFavorite: false,
    physicalQuality: "Resistência Anaeróbia",
    kineticChain: "Fechada",
    movementPlane: "Sagital",
    equipment: "Corda Naval",
    difficulty: "Intermediário",
    sports: ["Geral", "MMA", "Jiu-Jitsu", "Boxe", "CrossFit", "Futebol", "Basquete"],
    seasonPhase: ["Preparação Geral", "Preparação Específica", "Competitivo"],
    ageRange: ["Sub-15", "Sub-17", "Sub-20", "Profissional", "Adultos"],
    physiologicalGoal: "Potência metabólica e resistência anaeróbia glicolítica nos membros superiores integrada com controle postural lombo-pélvico dinâmico.",
    scientificEvidence: "Ratamess et al. (2015). 'Comparison of metabolic costs of battle rope exercises'. JSCR.",
    benefits: ["Altíssima queima calórica e condicionamento", "Mínimo impacto articular", "Desenvolvimento de resistência muscular de tronco"],
    contraindications: ["Disfunção femoropatelar grave", "Artrite aguda de punhos/ombros"],
    commonErrors: ["Postura ereta sem flexão dos joelhos", "Bater a corda com os braços rígidos sem o core"],
    corrections: ["Manter quadris flexionados na posição de prontidão", "Focar em chicotear os braços usando o abdômen"],
    progressions: ["Slams rotacionais de corda", "Slams com passada lateral explosiva"],
    regressions: ["Slams alternados lentos sentado", "Chicotadas parciais leves"],
    relatedExercises: ["Kettlebell Swing", "Arremesso de Med Ball"],
    recommendedRpe: "8.5-10",
    recommendedRir: "N/A - Tempo",
    targetVelocity: "Máxima Cadência",
    timeUnderTension: "Tempo",
    recommendedRest: "60s - 90s",
    defaultSets: 3,
    applicability: "Otimização de VO2max, condicionamento anaeróbio e potência de luta em atletas de MMA/Jiu-Jitsu e adultos amadores.",
    evidenceLevel: "Nível II - Excelente recomendação",
    musclesInvolved: ["Deltoides", "Reto Abdominal", "Latíssimo do Dorso", "Eretores da Espinha", "Quadríceps"],
    tags: ["#BattleRopes", "#Condicionamento", "#PotênciaTronco", "#CordaNaval", "#Metabólico"]
  },
  {
    id: "lib-16",
    name: "Kettlebell Swing",
    nameEn: "Kettlebell Swing",
    category: "Potência",
    subcategory: "Dobradiça / Kettlebell",
    muscleGroup: "Potência / Cadeia Posterior",
    defaultReps: "12",
    defaultWeight: "16kg",
    isFavorite: true,
    physicalQuality: "Potência",
    kineticChain: "Fechada",
    movementPlane: "Sagital",
    equipment: "Kettlebell",
    difficulty: "Intermediário",
    sports: ["Geral", "Futebol", "Corrida", "MMA", "CrossFit", "Jiu-Jitsu", "Powerlifting"],
    seasonPhase: ["Preparação Geral", "Preparação Específica", "Competitivo"],
    ageRange: ["Sub-15", "Sub-17", "Sub-20", "Profissional", "Adultos", "Idosos"],
    physiologicalGoal: "Desenvolvimento da potência da cadeia posterior (extensão de quadril) e velocidade balística através da dobradiça pélvica rápida.",
    scientificEvidence: "Lake & Lauder (2012). 'Kettlebell swing training improves maximal and explosive strength'. JSCR.",
    benefits: ["Potência rápida de posterior e glúteos", "Altíssima transferência para sprints e saltos", "Excelente saúde cardiovascular articular"],
    contraindications: ["Lombalgia em extensão ativa", "Instabilidade frouxa glenoumeral"],
    commonErrors: ["Agachar em vez de dobrar o quadril (squatty swing)", "Puxar o peso usando a força dos ombros"],
    corrections: ["Empurrar quadril para trás com joelhos quase estáticos", "Empurrar com glúteos e deixar os braços soltos como cordas"],
    progressions: ["Double Kettlebell Swing", "Kettlebell Swing Unilateral"],
    regressions: ["RDL com Kettlebell controlado", "Glute Bridge isométrica"],
    relatedExercises: ["RDL com Barra", "CMJ"],
    recommendedRpe: "8-9 (Intenção Balística)",
    recommendedRir: "1-2",
    targetVelocity: "Máxima Balística",
    timeUnderTension: "Explosivo",
    recommendedRest: "90s - 2 min",
    defaultSets: 4,
    applicability: "Excelente desenvolvimento de aceleração, velocidade de quadril e reabilitação lombar de atletas profissionais e idosos ativos.",
    evidenceLevel: "Nível I - Excelente Evidência",
    musclesInvolved: ["Glúteo Máximo", "Isquiotibiais", "Eretores da Espinha", "Reto Abdominal", "Antebraço"],
    tags: ["#Kettlebell", "#Swing", "#PotênciaQuadril", "#Balístico", "#CadeiaPosterior"]
  },
  {
    id: "lib-17",
    name: "Arremesso de Medicine Ball",
    nameEn: "Rotational Medicine Ball Throw",
    category: "Potência",
    subcategory: "Arremessos / Medicine Ball",
    muscleGroup: "Potência / Core",
    defaultReps: "6",
    defaultWeight: "4kg",
    isFavorite: false,
    physicalQuality: "Potência",
    kineticChain: "Fechada",
    movementPlane: "Transversal",
    equipment: "Medicine Ball e Parede sólida",
    difficulty: "Intermediário",
    sports: ["Basquete", "Tênis", "Golfe", "Futebol", "Vôlei", "Handebol", "Arremessos"],
    seasonPhase: ["Preparação Específica", "Competitivo", "Polimento"],
    ageRange: ["Sub-15", "Sub-17", "Sub-20", "Profissional", "Adultos"],
    physiologicalGoal: "Desenvolvimento da potência rotacional de core, integrando o torque gerado nas pernas e quadris através do tronco superior.",
    scientificEvidence: "Earp et al. (2016). 'Relationship between rotational power metrics and athletic performance'. JSCR.",
    benefits: ["Transferência espetacular para saques e chutes", "Desenvolvimento de velocidade de giro de core", "Estímulo de coordenação multiarticular"],
    contraindications: ["Estiramento agudo oblíquo ativo", "Hérnia discal aguda"],
    commonErrors: ["Arremessar apenas com força de braços", "Falta de rotação do pé de trás (bloqueio do quadril)"],
    corrections: ["Iniciar o giro empurrando com o pé de apoio de trás", "Girar o quadril ativamente na direção do arremesso"],
    progressions: ["Med Ball Slam com passada lateral", "Med Ball Slam com salto rotacional"],
    regressions: ["Remada rotacional lenta com cabo", "Arremesso ajoelhado sem pé de apoio"],
    relatedExercises: ["Pallof Press", "Crossover de Cabos"],
    recommendedRpe: "9.5-10 (Intenção Explosiva)",
    recommendedRir: "0",
    targetVelocity: "Máxima Balística",
    timeUnderTension: "Explosivo",
    recommendedRest: "2 min",
    defaultSets: 4,
    applicability: "Crucial para tenistas, golfistas, lutadores e jogadores de futebol e basquete que dependem de mudanças rápidas de direção e rotação.",
    evidenceLevel: "Nível I - Altamente Recomendado",
    musclesInvolved: ["Oblíquos", "Transverso do Abdômen", "Quadril", "Peitoral Maior", "Deltoides"],
    tags: ["#MedBall", "#Arremessos", "#PotênciaRotacional", "#CoreAtivo", "#EXOS", "#Quadra"]
  },
  {
    id: "lib-18",
    name: "Caminhada do Fazendeiro (Farmer Walk)",
    nameEn: "Farmer's Walk",
    category: "Core",
    subcategory: "Estabilidade / Kettlebell",
    muscleGroup: "Core / Corpo Inteiro",
    defaultReps: "40m",
    defaultWeight: "24kg/lado",
    isFavorite: false,
    physicalQuality: "Estabilidade",
    kineticChain: "Fechada",
    movementPlane: "Mista",
    equipment: "Kettlebells ou Halteres Pesados",
    difficulty: "Iniciante",
    sports: ["Geral", "CrossFit", "Powerlifting", "Jiu-Jitsu", "Futebol Americano", "Idosos", "Adultos"],
    seasonPhase: ["Preparação Geral", "Preparação Específica"],
    ageRange: ["Sub-15", "Sub-17", "Sub-20", "Profissional", "Adultos", "Idosos"],
    physiologicalGoal: "Desenvolvimento da estabilidade dinâmica postural lombo-pélvica (antiflexão lateral) e ganho maciço de força de preensão manual.",
    scientificEvidence: "Stoppani et al. (2015). 'Spine loading and core activation during loaded carries'. Journal of Biomechanics.",
    benefits: ["Robustez funcional excepcional de core", "Grande aumento de força nos antebraços e pegada", "Alta transferência para o cotidiano (idodos e amadores)"],
    contraindications: ["Dor no punho não controlada", "Instabilidade atlantoaxial cervical"],
    commonErrors: ["Projeção do pescoço à frente (pescoço de ganso)", "Caminhar curvado (perda de alinhamento lombar)"],
    corrections: ["Manter olhar no horizonte e empurrar peito para cima", "Manter ombros encaixados para trás e abdômen ativado"],
    progressions: ["Farmer Walk Unilateral (Suitcase Carry)", "Farmer Walk em terreno irregular ou ladeira"],
    regressions: ["Isometria estática de pé com carga", "Farmer Walk leve com Halteres"],
    relatedExercises: ["Pallof Press", "Prancha Abdominal"],
    recommendedRpe: "8-9.5 (Sob Tensão)",
    recommendedRir: "N/A - Distância",
    targetVelocity: "Passos Curtos e Firmes",
    timeUnderTension: "Sob Tensão",
    recommendedRest: "90s - 2 min",
    defaultSets: 3,
    applicability: "Exercício fundamental de sustentação postural dinâmica para idosos, adultos amadores e atletas de força de elite.",
    evidenceLevel: "Nível I - Excelente Padrão Ouro",
    musclesInvolved: ["Reto Abdominal", "Oblíquos", "Eretores da Espinha", "Trapézio", "Quadríceps", "Antebraço"],
    tags: ["#FarmerWalk", "#Pegada", "#CoreStability", "#LoadedCarries", "#Kettlebell", "#Halteres"]
  },
  {
    id: "lib-19",
    name: "Agachamento Unilateral no BOSU",
    nameEn: "BOSU Single Leg Squat",
    category: "Mobilidade",
    subcategory: "Equilíbrio / BOSU",
    muscleGroup: "MMII / Estabilidade",
    defaultReps: "8/lado",
    defaultWeight: "BW",
    isFavorite: false,
    physicalQuality: "Equilíbrio",
    kineticChain: "Fechada",
    movementPlane: "Frontal",
    equipment: "BOSU",
    difficulty: "Avançado",
    sports: ["Geral", "Tênis", "Futebol", "Basquete", "Vôlei", "Esportes de Neve", "Corrida"],
    seasonPhase: ["Preparação Geral", "Preparação Específica", "Recuperação"],
    ageRange: ["Sub-15", "Sub-17", "Sub-20", "Profissional", "Adultos", "Idosos"],
    physiologicalGoal: "Controle proprioceptivo dinâmico e equilíbrio neuromuscular reativo do complexo tornozelo-joelho-quadril sob instabilidade controlada.",
    scientificEvidence: "Behm et al. (2010). 'The use of instability training in sports performance'. Sports Medicine.",
    benefits: ["Blindagem proprioceptiva contra entorses", "Fortalecimento de estabilizadores pélvicos profundos", "Reabilitação ativa pós-lesão ligamentar"],
    contraindications: ["Entorse de tornozelo recente na fase aguda", "Instabilidade patelar ativa dolorosa"],
    commonErrors: ["Valgo dinâmico de joelho acentuado", "Perda completa do equilíbrio com desvio de tronco"],
    corrections: ["Focar em alinhar o joelho ao segundo dedo do pé", "Executar de forma lenta e parcial se necessário"],
    progressions: ["Agachamento BOSU unilateral com carga leve", "Agachamento BOSU com olhos fechados"],
    regressions: ["Agachamento unilateral no solo firme", "Agachamento bilateral no BOSU"],
    relatedExercises: ["Agachamento Goblet", "Pogo Jumps"],
    recommendedRpe: "6-8",
    recommendedRir: "2-3",
    targetVelocity: "Controlada / Proprioceptiva",
    timeUnderTension: "4-2-2-0",
    recommendedRest: "60s - 90s",
    defaultSets: 3,
    applicability: "Fundamental para prevenção de entorse de tornozelo e reabilitação de LCA em atletas de campo/quadra, corredores e idosos ativos.",
    evidenceLevel: "Nível II - Altamente Indicado",
    musclesInvolved: ["Glúteo Médio", "Vasto Medial Oblíquo", "Tibial Anterior", "Sóleo", "Gastrocnêmio"],
    tags: ["#BOSU", "#Propriocepção", "#PrevençãoTornozelo", "#Equilíbrio", "#Livre"]
  },
  {
    id: "lib-20",
    name: "Deslocamento Lateral com Cones",
    nameEn: "Pro Agility 5-10-5 Cone Drill",
    category: "Agilidade",
    subcategory: "Mudança de Direção / Cones",
    muscleGroup: "Explosão / Agilidade",
    defaultReps: "4",
    defaultWeight: "Livre",
    isFavorite: true,
    physicalQuality: "Mudança de Direção",
    kineticChain: "Fechada",
    movementPlane: "Frontal",
    equipment: "Cones e fita métrica",
    difficulty: "Elite",
    sports: ["Futebol", "Basquete", "Futsal", "Tênis", "Rugby", "Handebol", "Futebol Americano"],
    seasonPhase: ["Preparação Específica", "Competitivo"],
    ageRange: ["Sub-15", "Sub-17", "Sub-20", "Profissional"],
    physiologicalGoal: "Otimização da capacidade de desaceleração excêntrica rápida, giro pélvico e aceleração concêntrica em outra direção.",
    scientificEvidence: "Sheppard & Young (2006). 'Agility literature review: classifications, factors and training'. Journal of Sports Sciences.",
    benefits: ["Ganho massivo de agilidade reativa e de plano lateral", "Melhor coordenação motora espacial", "Otimização do centro de gravidade"],
    contraindications: ["Disfunção femoropatelar inflamatória", "Instabilidade frouxa crônica de tornozelo"],
    commonErrors: ["Aterrissagem com pés cruzados", "Erigir o tronco completamente na frenagem (perda de gravidade)"],
    corrections: ["Manter quadril baixo e base de apoio larga", "Tocar o cone amortecendo o peso e empurrar lateralmente"],
    progressions: ["Agilidade com estímulo de reação visual", "Deslocamento lateral em terreno inclinado"],
    regressions: ["Corrida lateral sem cones e de velocidade reduzida", "Passadas laterais com elástico no tornozelo"],
    relatedExercises: ["Copenhagen Adduction", "Drop Jump"],
    recommendedRpe: "9.5-10 (Intenção Extrema)",
    recommendedRir: "0",
    targetVelocity: "Máxima Aceleração/Desaceleração",
    timeUnderTension: "Explosivo",
    recommendedRest: "2.5 - 3 min",
    defaultSets: 4,
    applicability: "Otimização de agilidade e velocidade de troca de direção (COD) para jogadores profissionais e amadores de esportes coletivos e quadra.",
    evidenceLevel: "Nível I - Excelente Padrão Esportivo",
    musclesInvolved: ["Glúteo Médio", "Adutores", "Quadríceps Femoral", "Isquiotibiais", "Sóleo"],
    tags: ["#Agilidade", "#COD", "#Desaceleração", "#Cones", "#Campo", "#Quadra"]
  }
];

export function determineMovementPattern(exercise: EnrichedExercise): string {
  if (exercise.movementPattern) return exercise.movementPattern;

  const name = (exercise.name || "").toLowerCase();
  const cat = (exercise.category || "").toLowerCase();
  const subcat = (exercise.subcategory || "").toLowerCase();
  const mGroup = (exercise.muscleGroup || "").toLowerCase();

  // Panturrilha (Calf)
  if (name.includes("panturrilha") || name.includes("calf") || name.includes("sóleo") || mGroup.includes("panturrilha")) {
    return "Panturrilha";
  }

  // Agachar (Squat)
  if (
    (name.includes("agachamento") || name.includes("squat") || name.includes("leg press") || name.includes("hack")) &&
    !name.includes("búlgaro") && !name.includes("bulgarian") && !name.includes("unilateral") && !name.includes("split") && !name.includes("lunge") && !name.includes("afundo") && !name.includes("avanço")
  ) {
    return "Agachar (Squat)";
  }

  // Dobradiça de Quadril (Hip Hinge)
  if (
    name.includes("deadlift") || name.includes("terra") || name.includes("rdl") || name.includes("romanian") ||
    name.includes("stiff") || name.includes("good morning") || name.includes("swing") || name.includes("hinge")
  ) {
    return "Dobradiça de Quadril (Hip Hinge)";
  }

  // Passada (Lunge) & Unilateral/Split Squat
  if (
    name.includes("lunge") || name.includes("avanço") || name.includes("afundo") ||
    name.includes("búlgaro") || name.includes("bulgarian") || name.includes("split") || name.includes("step-up") || name.includes("step up") || name.includes("step down") || name.includes("skater squat")
  ) {
    return "Passada (Lunge)";
  }

  // Dominância de Joelho
  if (
    name.includes("extensora") || name.includes("flexora") || name.includes("leg extension") || name.includes("leg curl") ||
    name.includes("nórdic") || name.includes("nordic") || name.includes("copenhagen") || name.includes("copenhague") || name.includes("adutor") || name.includes("adutores") || name.includes("cossaco") || name.includes("cossack")
  ) {
    return "Dominância de Joelho";
  }

  // Dominância de Quadril
  if (
    name.includes("hip thrust") || name.includes("elevação pélvica") || name.includes("glute bridge") || name.includes("glúteo") || name.includes("glute")
  ) {
    return "Dominância de Quadril";
  }

  // MMSS - Empurrar
  if (
    cat.includes("mmss") && (
      name.includes("supino") || name.includes("bench press") || name.includes("flexão") || name.includes("push-up") || name.includes("push up") ||
      name.includes("desenvolvimento") || name.includes("press") || name.includes("tríceps") || name.includes("triceps") || name.includes("elevacao lateral") || name.includes("elevação lateral") || name.includes("paralelas") || name.includes("dips")
    )
  ) {
    return "Membros Superiores - Empurrar";
  }

  // MMSS - Puxar
  if (
    cat.includes("mmss") && (
      name.includes("remada") || name.includes("row") || name.includes("barra fixa") || name.includes("pull-up") || name.includes("pull up") ||
      name.includes("puxada") || name.includes("pulley") || name.includes("face pull") || name.includes("bíceps") || name.includes("biceps") || name.includes("rosca") || name.includes("crucifixo inverso") || name.includes("y-raise")
    )
  ) {
    return "Membros Superiores - Puxar";
  }

  // Core / Estabilidade
  if (cat.includes("core") || subcat.includes("core") || name.includes("pallof") || name.includes("plank") || name.includes("prancha") || name.includes("abdominal") || name.includes("crunch") || name.includes("woodchop") || name.includes("farmer walk") || name.includes("caminhada do fazendeiro") || name.includes("suitcase") || name.includes("carry")) {
    return "Core / Estabilidade";
  }

  // Velocidade / Desaceleração
  if (cat.includes("velocidade") || subcat.includes("velocidade") || name.includes("sprint") || name.includes("corrida") || name.includes("backpedal") || name.includes("aceleração") || name.includes("desaceleração") || name.includes("stop") || name.includes("landing") || name.includes("drop") || name.includes("bounds")) {
    return "Velocidade / Desaceleração";
  }

  // Agilidade / COD
  if (cat.includes("agilidade") || subcat.includes("agilidade") || name.includes("shuttle") || name.includes("t-test") || name.includes("l-drill") || name.includes("star") || name.includes("zig-zag") || name.includes("shuffling") || name.includes("box agility") || name.includes("deslocamento lateral")) {
    return "Agilidade / COD";
  }

  // Preventivo / Mobilidade
  if (cat.includes("preventivo") || cat.includes("mobilidade") || subcat.includes("prevenção") || name.includes("alongamento") || name.includes("manguito") || name.includes("liberação") || name.includes("foam roller") || name.includes("slides") || name.includes("estabilização") || name.includes("dorsiflexão") || name.includes("monster walk")) {
    return "Preventivo / Mobilidade";
  }

  // Fallbacks by category
  if (cat.includes("mmii") || mGroup.includes("mmii") || mGroup.includes("quadríceps") || mGroup.includes("glúteo")) return "Agachar (Squat)";
  if (cat.includes("mmss") || mGroup.includes("mmss")) return "Membros Superiores - Empurrar";
  if (cat.includes("potencia") || cat.includes("potência")) return "Dominância de Quadril";
  if (cat.includes("core")) return "Core / Estabilidade";

  return "Outros";
}

export function determineLateralType(exercise: EnrichedExercise): "Unilateral" | "Bilateral" | "N/A" {
  if (exercise.lateralType === "Unilateral" || exercise.lateralType === "Bilateral" || exercise.lateralType === "N/A") {
    return exercise.lateralType;
  }

  const name = (exercise.name || "").toLowerCase();
  const subcat = (exercise.subcategory || "").toLowerCase();
  const cat = (exercise.category || "").toLowerCase();

  // If upper body/core/preventive that doesn't usually emphasize uni/bi split:
  if (cat.includes("core") || cat.includes("preventivo") || cat.includes("mobilidade")) {
    if (name.includes("unilateral") || name.includes("single leg") || name.includes("suitcase") || name.includes("one arm") || name.includes("unilateralmente") || name.includes("serrote")) {
      return "Unilateral";
    }
    return "Bilateral";
  }

  // Unilateral keywords
  if (
    name.includes("unilateral") || name.includes("single leg") || name.includes("one leg") || name.includes("revezado") ||
    name.includes("búlgaro") || name.includes("bulgarian") || name.includes("split") || name.includes("lunge") ||
    name.includes("afundo") || name.includes("avanço") || name.includes("serrote") || name.includes("lado") ||
    name.includes("each leg") || name.includes("/lado") || name.includes("rear foot") || name.includes("step-up") ||
    name.includes("step down") || name.includes("copenhague") || name.includes("copenhagen") || name.includes("skater")
  ) {
    return "Unilateral";
  }

  return "Bilateral";
}

export interface BiomechanicalDetails {
  scientificStars: number;
  evidenceLabel: string;
  force: number;         // Força Máxima
  rfd: number;           // Taxa de Produção de Força (RFD)
  power: number;         // Potência Explosiva
  hypertrophy: number;   // Estímulo de Hipertrofia
  stability: number;     // Estabilidade/Co-contração
  sportTransfer: number; // Índice de Transferência Esportiva
  soccerIndex: number;
  volleyIndex: number;
  runningIndex: number;
  basketballIndex: number;
  tennisIndex: number;
}

export function getBiomechanicalDetails(exercise: EnrichedExercise): BiomechanicalDetails {
  const name = (exercise.name || "").toLowerCase();
  const cat = (exercise.category || "").toLowerCase();
  const pattern = determineMovementPattern(exercise).toLowerCase();

  // Initialize defaults
  let d: BiomechanicalDetails = {
    scientificStars: 4,
    evidenceLabel: "Evidência Forte",
    force: 7,
    rfd: 6,
    power: 6,
    hypertrophy: 7,
    stability: 6,
    sportTransfer: 8,
    soccerIndex: 8,
    volleyIndex: 7,
    runningIndex: 8,
    basketballIndex: 7,
    tennisIndex: 7,
  };

  // Specific high-level rules
  if (name.includes("agachamento") || name.includes("squat") || name.includes("deadlift") || name.includes("terra") || name.includes("leg press")) {
    d.scientificStars = 5;
    d.evidenceLabel = "Evidência Muito Forte (Nível I)";
    d.force = 10;
    d.rfd = 7;
    d.power = 8;
    d.hypertrophy = 9;
    d.stability = 8;
    d.sportTransfer = 9;
    d.soccerIndex = 9;
    d.volleyIndex = 8;
    d.runningIndex = 9;
    d.basketballIndex = 8;
    d.tennisIndex = 8;
  } else if (name.includes("nordic") || name.includes("nórdico") || name.includes("copenhagen") || name.includes("copenhague")) {
    d.scientificStars = 5;
    d.evidenceLabel = "Evidência Muito Forte (Nível I - Prevenção)";
    d.force = 9;
    d.rfd = 8;
    d.power = 8;
    d.hypertrophy = 8;
    d.stability = 9;
    d.sportTransfer = 10;
    d.soccerIndex = 10;
    d.volleyIndex = 8;
    d.runningIndex = 10;
    d.basketballIndex = 8;
    d.tennisIndex = 9;
  } else if (name.includes("hip thrust") || name.includes("elevação pélvica")) {
    d.scientificStars = 5;
    d.evidenceLabel = "Evidência Muito Forte";
    d.force = 9;
    d.rfd = 8;
    d.power = 9;
    d.hypertrophy = 10;
    d.stability = 7;
    d.sportTransfer = 10;
    d.soccerIndex = 10;
    d.volleyIndex = 8;
    d.runningIndex = 10;
    d.basketballIndex = 8;
    d.runningIndex = 10;
  } else if (cat.includes("potencia") || cat.includes("potência") || name.includes("pliometria") || name.includes("salto") || name.includes("jump") || name.includes("clean") || name.includes("snatch")) {
    d.scientificStars = 5;
    d.evidenceLabel = "Evidência Excelente (Ciclo Alongamento-Encurtamento)";
    d.force = 6;
    d.rfd = 10;
    d.power = 10;
    d.hypertrophy = 4;
    d.stability = 8;
    d.sportTransfer = 10;
    d.soccerIndex = 9;
    d.volleyIndex = 10;
    d.runningIndex = 9;
    d.basketballIndex = 10;
    d.tennisIndex = 9;
  } else if (cat.includes("velocidade") || cat.includes("agilidade") || name.includes("sprint") || name.includes("cod") || name.includes("drills") || name.includes("corrida")) {
    d.scientificStars = 5;
    d.evidenceLabel = "Transferência Mecânica Direta";
    d.force = 5;
    d.rfd = 10;
    d.power = 9;
    d.hypertrophy = 3;
    d.stability = 9;
    d.sportTransfer = 10;
    d.soccerIndex = 10;
    d.volleyIndex = 8;
    d.runningIndex = 10;
    d.basketballIndex = 9;
    d.tennisIndex = 9;
  } else if (name.includes("bosu") || name.includes("instabilidade") || name.includes("bola suiça") || name.includes("disco de equilíbrio")) {
    d.scientificStars = 2;
    d.evidenceLabel = "Evidência Baixa para Força (Útil para reab)";
    d.force = 2;
    d.rfd = 1;
    d.power = 1;
    d.hypertrophy = 2;
    d.stability = 10;
    d.sportTransfer = 4;
    d.soccerIndex = 4;
    d.volleyIndex = 4;
    d.runningIndex = 3;
    d.basketballIndex = 4;
    d.tennisIndex = 5;
  } else if (cat.includes("core") || pattern.includes("core")) {
    d.scientificStars = 4;
    d.evidenceLabel = "Evidência Forte (Estabilidade de Tronco)";
    d.force = 4;
    d.rfd = 5;
    d.power = 5;
    d.hypertrophy = 5;
    d.stability = 10;
    d.sportTransfer = 8;
    d.soccerIndex = 8;
    d.volleyIndex = 9;
    d.runningIndex = 8;
    d.basketballIndex = 9;
    d.tennisIndex = 9;
  } else if (name.includes("rosca") || name.includes("biceps") || name.includes("triceps") || name.includes("elevação lateral") || name.includes("crucifixo") || name.includes("panturrilha em pé")) {
    d.scientificStars = 3;
    d.evidenceLabel = "Isolado (Baixa transferência funcional)";
    d.force = 6;
    d.rfd = 3;
    d.power = 3;
    d.hypertrophy = 9;
    d.stability = 3;
    d.sportTransfer = 5;
    d.soccerIndex = 5;
    d.volleyIndex = 5;
    d.runningIndex = 5;
    d.basketballIndex = 5;
    d.tennisIndex = 6;
  }

  return d;
}

const ALL_RAW_EXERCISES: EnrichedExercise[] = [
  ...STATIC_ENRICHED_LIBRARY,
  ...MMII_EXERCISES,
  ...MMSS_EXERCISES,
  ...POTENCIA_EXERCISES,
  ...CORE_EXERCISES,
  ...AGILITY_SPEED_EXERCISES,
  ...PREVENTIVE_EXERCISES
];

const seenNames = new Set<string>();
const rawFiltered = ALL_RAW_EXERCISES.filter(exercise => {
  const normalized = (exercise.name || "").trim().toLowerCase();
  if (!normalized) return false;
  if (seenNames.has(normalized)) {
    return false;
  }
  seenNames.add(normalized);
  return true;
});

export const ENRICHED_LIBRARY: EnrichedExercise[] = rawFiltered.map(ex => {
  const movementPattern = determineMovementPattern(ex);
  const lateralType = determineLateralType(ex);
  return {
    ...ex,
    movementPattern,
    lateralType
  };
});

