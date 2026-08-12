
export interface UserWithPlan {
  role: 'coach' | 'athlete';
  athleteId?: string;
  token?: string;
  plan?: 'free' | 'pro';
}

export type SideOption = 'Direito' | 'Esquerdo' | 'Bilateral';
export type PainTypeOption = 'Muscular' | 'Articular' | 'Tendão' | 'Ligamento' | 'Trauma' | 'Dor Tardia (DOMS)';
export type EvolutionStatusOption = 'Iniciou' | 'Aumentou' | 'Melhorou' | 'Resolvido';

export interface BodyMapRecord {
  id: string;
  date: string;
  regionId: string;
  regionName: string;
  side: SideOption;
  painLevel: number; // 0-10
  painType: PainTypeOption;
  evolution: EvolutionStatusOption;
  startDate?: string;
  notes?: string;
  recordedBy?: 'atleta' | 'coach' | 'fisioterapeuta';
}

export interface MedicalExam {
  id: string;
  date: string;
  title: string;
  category: 'Ressonância' | 'Ultrassom' | 'Raio-X' | 'Tomografia' | 'Exame de Sangue' | 'Laudo Médico' | 'Laudo Fisioterapêutico' | 'Outro';
  fileUrl: string;
  fileName: string;
  fileType: 'pdf' | 'image';
  fileSize?: string;
  notes?: string;
  injuryId?: string;
  recordedBy?: 'atleta' | 'coach' | 'fisioterapeuta' | string;
}

export interface InjuryEntry {
  id: string;
  date: string;
  description: string;
  status: 'Ativa' | 'Recuperada' | 'Observação';
  notes?: string;
  location?: 'Joelho' | 'Tornozelo' | 'Coxa Posterior' | 'Coxa Anterior' | 'Panturrilha' | 'Coluna/Lombar' | 'Ombro' | 'Pé/Articulação' | 'Outro' | string;
  severity?: 'Leve' | 'Moderada' | 'Grave' | 'Cirúrgica';
  estimatedReturnDate?: string;
  rehabStage?: 'Fisioterapia' | 'Transição Física' | 'Treino Assistido' | 'Retorno Pleno';
  side?: SideOption;
  painLevel?: number;
  painType?: PainTypeOption;
  evolution?: EvolutionStatusOption;
  startDate?: string;
  regionId?: string;
  examIds?: string[];
}

export type SportOption = 'Futebol' | 'Vôlei' | 'Basquete' | 'Tênis' | 'Corrida / Atletismo' | 'Ciclismo' | 'Natação' | 'Triatlo' | 'Handebol' | 'Outro';
export type MatchTypeOption = 'Jogo / Partida' | 'Prova / Corrida' | 'Torneio / Etapa' | 'Amistoso' | 'Treino Tático / Simulado';
export type MatchPriorityOption = 'A' | 'B' | 'C'; // A = Alvo Principal, B = Preparatória, C = Secundária
export type MatchResultOption = 'Vitória' | 'Derrota' | 'Empate' | 'Concluído' | 'Pódio' | 'DNF' | 'Pendente';

export interface SportSpecificData {
  // Coleta de Modalidades de Coletivo / Quadra (Futebol, Vôlei, Basquete, Handebol)
  minutesPlayed?: number;
  goalsScored?: number;
  assists?: number;
  setsPlayed?: number;
  pointsScored?: number;
  
  // Coleta de Modalidades Endurance / Individuais (Corrida, Ciclismo, Natação, Tênis)
  distanceKm?: number;
  paceAvg?: string; // e.g. "4:15 min/km"
  elevationGainMeters?: number;
  rankPosition?: string; // e.g. "3º Geral", "1º Categoria"
  gamesWon?: number;
  firstServePct?: number;
}

export interface MatchEvent {
  id: string;
  athleteId: string;
  title: string;
  sport: SportOption;
  type: MatchTypeOption;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  opponentOrEventName?: string;
  location?: string;
  venueType: 'Casa' | 'Fora' | 'Neutro';
  priority: MatchPriorityOption;
  status: 'Agendado' | 'Concluído' | 'Cancelado';
  
  // Coleta Pré-Jogo / Pré-Prova
  preGameTargetReadiness?: number; // e.g. 80
  preGameReadinessScore?: number; // Real collected on match day
  preGameCheckinDone?: boolean;
  preGameNotes?: string;

  // Coleta Pós-Jogo / Pós-Prova
  result?: MatchResultOption;
  scoreOrTime?: string; // e.g. "3x1", "2h45min", "6-3 / 6-4"
  durationMinutes?: number;
  postRpe?: number; // 0-10 (PSE Pós)
  postLoad?: number; // duration * RPE
  sorenessPost?: number; // 1-5
  travelFatiguePost?: number; // 1-5
  sportSpecificData?: SportSpecificData;
  postGameNotes?: string;
}

export interface Athlete {
  id: string;
  name: string;
  dob: string;
  gender: 'M' | 'F';
  photoUrl?: string;
  injuryHistory: string; // Maintain for backward compatibility/summary
  injuries?: InjuryEntry[]; 
  bodyMapRecords?: BodyMapRecord[];
  medicalExams?: MedicalExam[];
  matches?: MatchEvent[];
  periodizationStart?: string; 
  periodizationEnd?: string;
  trainingDays?: number[]; // [0, 1, 2, 3, 4, 5, 6] for Sun-Sat
  academyDays?: number[]; // [0, 1, 2, 3, 4, 5, 6] for Sun-Sat (academia)
  courtDays?: number[]; // [0, 1, 2, 3, 4, 5, 6] for Sun-Sat (campo/quadra)
  modality: string; 
  team?: string;
  competitiveLevel?: 'amador' | 'competitivo' | 'elite';
  position?: string;
  category?: string;
  weight?: number;
  height?: number;
  goal?: string;
  weeklyFrequency?: number;
  isTournamentMode?: boolean;
  assessments: {
    bioimpedance: Bioimpedance[];
    isometricStrength: IsometricStrength[];
    imtp: Imtp[];
    cmj: Cmj[];
    dropJump: DropJump[];
    vo2max: Vo2max[];
    speed: Speed[];
    postural?: PosturalAssessment[];
  };
  wellness: WellnessEntry[];
  workouts: Workout[];
  externalSessions?: ExternalSession[];
}

export interface WellnessEntry {
  id: string;
  date: string;
  fatigue: number; 
  sleep: number;   
  stress: number;  
  soreness: number; 
  mood: number;    
  cognitiveLoad: number; 
  travelFatigue?: number; // 1-5
  sleepQuality?: number;  // 1-5
  readinessScore?: number; 
  menstrualPhase?: 'Folicular' | 'Ovulatória' | 'Lútea' | 'Menstruação' | 'Nenhuma';
  menstrualSymptoms?: string[];
  hrv?: number;
  sleepHoursFormatted?: string;
  sleepStartTime?: string;      // e.g. "23:00"
  wakeUpTime?: string;          // e.g. "07:00"
  calculatedSleepHours?: number; // e.g. 8.0
  isMatchDay?: boolean;
  emotionalReadiness?: number;  // 0-10
  psychologicalReadiness?: number; // 0-10
  psychologyNotes?: string;     // Parecer da Psicologia Esportiva
}

export interface ExternalSession {
  id: string;
  date: string;
  type: 'tecnico' | 'tatico' | 'jogo' | 'amistoso' | 'recuperacao';
  durationMinutes: number;
  rpe: number;
  notes?: string;
  load: number; // duration * rpe
}

export interface ExerciseSet {
  id: string;
  reps: number;
  weight: number;
  rpe: number; 
  isCompleted?: boolean;
}

export interface PrescribedExercise {
  id: string;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string; 
  repsType?: 'reps' | 'time';
  weight: string;
  rest?: string;
  notes?: string;
  performedSets?: ExerciseSet[]; 
  painLevel?: number; // 0-10
  isSimpleEntry?: boolean;
  order_index?: number;
  videoUrl?: string;
  imageUrl?: string;
}

export interface Workout {
  id: string;
  date: string;
  name: string;
  phase: string;
  status: 'planned' | 'completed' | 'in_progress';
  exercises: PrescribedExercise[];
  totalLoad?: number; 
  rpe?: number; 
  durationMinutes?: number; 
  monotony?: number; 
  strain?: number;   
  feedback?: string;
  trainerNotes?: string;
}

export interface Assessment {
  id: string;
  date: string;
  observations?: string;
}

export interface Bioimpedance extends Assessment {
  weight: number; 
  fatPercentage: number;
  muscleMass: number; 
  visceralFat: number;
  hydration: number; 
  basalMetabolism?: number;
  metabolicAge?: number;
  boneMass?: number;
  physiqueRating?: number;
  // Segmented Fat %
  fatArmR?: number;
  fatArmL?: number;
  fatLegR?: number;
  fatLegL?: number;
  fatTrunk?: number;
  // Segmented Muscle kg
  muscleArmR?: number;
  muscleArmL?: number;
  muscleLegR?: number;
  muscleLegL?: number;
  muscleTrunk?: number;
}

export interface MuscleAssessmentDetails {
  repetitions?: number;
  peakForce?: number;
  relativePeakForce?: number;
  timeToPeakForce?: number;
  meanForce?: number;
  
  // Pico values
  forcePico?: number;
  rfdPico?: number;
  impulsePico?: number;
  forceMeanPico?: number;
  
  // @100ms
  force100?: number;
  rfd100?: number;
  impulse100?: number;
  forceMean100?: number;
  
  // @200ms
  force200?: number;
  rfd200?: number;
  impulse200?: number;
  forceMean200?: number;
  
  // @300ms
  force300?: number;
  rfd300?: number;
  impulse300?: number;
  forceMean300?: number;
}

export interface IsometricStrength extends Assessment {
  halfSquatKgf?: number;
  quadricepsR: number; 
  quadricepsL: number; 
  hamstringsR: number; 
  hamstringsL: number; 
  iqRatioR?: number; 
  iqRatioL?: number; 
  quadricepsDetailsR?: MuscleAssessmentDetails;
  quadricepsDetailsL?: MuscleAssessmentDetails;
  hamstringsDetailsR?: MuscleAssessmentDetails;
  hamstringsDetailsL?: MuscleAssessmentDetails;
}

export interface ImtpAiDetails {
  benchmarks: string;
  classification: {
    peakForceClass: string;
    relativeForceClass: string;
    rfdClass: string;
    efficiencyClass: string;
  };
  diagnostico: string;
  priorities: {
    title: string;
    method: string;
    parameters: string;
    exercises: string;
    kpi: string;
  }[];
  versionTechnical: string;
  versionAthlete: string;
  projections: {
    shortTerm: string;
    mediumTerm: string;
    longTerm: string;
  };
}

export interface Imtp extends Assessment {
  weight?: number;              // Peso do Atleta (kg)
  peakForce: number;            // Força Máxima (KG/KGF)
  relativePeakForce?: number;   // Força Máxima Relativa
  timeToPeakForce?: number;     // Tempo até a Força Máxima (ms)
  meanForce?: number;           // Força Média (KG/KGF)
  rfdPeak?: number;             // RFD Pico (N/s)
  rfd100?: number;              // RFD @ 100ms (N/s)
  rfd200?: number;              // RFD @ 200ms (N/s)
  rfd300?: number;              // RFD @ 300ms (N/s)
  impulsePeak?: number;         // Impulso total (Ns)
  impulse100?: number;          // Impulso @ 100ms (Ns)
  impulse200?: number;          // Impulso @ 200ms (Ns)
  impulse300?: number;          // Impulso @ 300ms (Ns)
  aiDetails?: ImtpAiDetails;    // Laudo Científico Avançado por IA
}

export interface Cmj extends Assessment {
  height: number; 
  power: number; 
  depth: number; 
  flightTime: number; 
  weight?: number;
  rsi?: number; 
  averageForce?: number;
}

export interface DropJump extends Assessment {
  weight?: number;          // Peso
  dropHeight: number;       // Altura da queda (pré-definida para 30cm)
  jumpHeight: number;       // Altura do salto
  flightTime: number;       // Tempo de vôo
  contactTime?: number;     // Tempo de contato (ms)
  meanForce?: number;       // Força Média
  meanPower?: number;       // Potência Média
  stiffness?: number;       // Rigidez
  rsi: number;              // RSI
}

export interface Vo2max extends Assessment {
  vo2max: number; 
  maxHeartRate: number; 
  thresholdHeartRate: number; 
  maxSpeed: number; 
  thresholdSpeed: number; 
  vam?: number; 
  rec10s?: number; 
  rec30s?: number; 
  rec60s?: number; 
  maxVentilation?: number; 
  score?: number; 
}

export interface Speed extends Assessment {
  time5m?: number;
  time10m?: number;
  time20m?: number;
  time30m?: number;
  speed5m?: number;
  speed10m?: number;
  speed20m?: number;
  speed30m?: number;
}

export type AssessmentType = 'bioimpedance' | 'isometricStrength' | 'imtp' | 'cmj' | 'dropJump' | 'vo2max' | 'speed' | 'postural';

export interface PosturalDeviation {
  regiao: string;
  desvio: string;
  gravidade: 'Leve' | 'Moderado' | 'Severo';
  compensacao: string;
}

export interface PosturalCorrectiveExercise {
  nome: string;
  series: string;
  tempo?: string;
  reps?: string;
  instrucoes: string;
}

export interface PosturalAiDetails {
  desvios: PosturalDeviation[];
  conclusao: string;
  exerciciosMobilidade: PosturalCorrectiveExercise[];
  exerciciosFortalecimento: PosturalCorrectiveExercise[];
  ergonomia: string[];
}

export interface PosturalAssessment extends Assessment {
  painZones: string[];
  presetType: string;
  notes?: string;
  photoAnterior?: string;
  photoLateral?: string;
  photoPosterior?: string;
  aiDetails?: PosturalAiDetails;
}

export interface IQRatioStatus {
  ratio: number;
  status: 'Ideal' | 'Atenção' | 'Desequilíbrio' | 'Risco Crítico';
  color: string;
}

export interface AsymmetryStatus {
  value: number;
  status: 'Aceitável' | 'Atenção' | 'Crítico';
  color: string;
}
