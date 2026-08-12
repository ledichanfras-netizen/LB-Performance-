
import { Athlete, AssessmentType, WellnessEntry, Workout, PrescribedExercise, ExerciseSet } from './types';

export const generateModelAthlete = (): Athlete => {
  const id = `model-${Date.now()}`;
  const now = new Date();
  
  const generateDates = (days: number) => {
    return Array.from({ length: days }).map((_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - i);
      return d.toISOString().split('T')[0];
    });
  };

  const dates = generateDates(14);

  const wellness: WellnessEntry[] = dates.map((date, i) => ({
    id: `w-model-${i}`,
    date,
    fatigue: i % 3 === 0 ? 4 : 2,
    sleep: i % 4 === 0 ? 3 : 4,
    stress: 2,
    soreness: i % 2 === 0 ? 3 : 1,
    mood: 4,
    cognitiveLoad: 3,
    readinessScore: 75 - (i * 2)
  }));

  const workouts: Workout[] = [
    {
      id: `wk-model-1`,
      date: dates[1],
      name: 'Potência e Velocidade',
      phase: 'Competitiva',
      status: 'completed',
      rpe: 8,
      durationMinutes: 75,
      totalLoad: 600,
      monotony: 1.2,
      strain: 720,
      feedback: 'Senti um pouco de peso na posterior direita no final.',
      trainerNotes: 'Atleta respondeu bem aos sprints curtos.',
      exercises: [
        {
          id: `ex-model-1`,
          name: 'Sprints 10m',
          muscleGroup: 'Explosão',
          sets: 6,
          reps: '1',
          weight: 'BW',
          performedSets: [
            { id: 's1', reps: 1, weight: 0, rpe: 9 },
            { id: 's2', reps: 1, weight: 0, rpe: 9 },
            { id: 's3', reps: 1, weight: 0, rpe: 9 },
          ]
        },
        {
          id: `ex-model-2`,
          name: 'Agachamento Salto',
          muscleGroup: 'MMII',
          sets: 4,
          reps: '6',
          weight: '40kg',
          performedSets: [
            { id: 's4', reps: 6, weight: 40, rpe: 8 },
            { id: 's5', reps: 6, weight: 40, rpe: 8 },
          ]
        }
      ]
    },
    {
      id: `wk-model-2`,
      date: dates[3],
      name: 'Força Máxima',
      phase: 'Competitiva',
      status: 'completed',
      rpe: 9,
      durationMinutes: 60,
      totalLoad: 540,
      exercises: []
    }
  ];

  return {
    id,
    name: 'Lucas "The Beast" Silva',
    dob: '1998-05-15',
    gender: 'M',
    modality: 'Futebol',
    position: 'Atacante',
    competitiveLevel: 'elite',
    goal: 'Explosão e Potência',
    injuryHistory: 'Entorse tornozelo esquerdo (2024), Estiramento posterior coxa direita (2023)',
    weeklyFrequency: 5,
    wellness,
    workouts,
    assessments: {
      bioimpedance: [
        {
          id: `bio-1`,
          date: dates[2],
          weight: 82.5,
          fatPercentage: 9.8,
          muscleMass: 44.2,
          visceralFat: 3,
          hydration: 62.5,
          observations: 'Excelente estado de hidratação.'
        }
      ],
      isometricStrength: [
        {
          id: `str-1`,
          date: dates[2],
          halfSquatKgf: 340,
          quadricepsR: 325,
          quadricepsL: 318,
          hamstringsR: 185,
          hamstringsL: 162,
          iqRatioR: 0.57,
          iqRatioL: 0.51,
          observations: 'Assimetria detectada em isquiotibiais (L < R).'
        }
      ],
      imtp: [
        {
          id: `imtp-base`,
          date: dates[9],
          peakForce: 320,
          relativePeakForce: 3.90,
          timeToPeakForce: 275,
          meanForce: 230,
          rfdPeak: 11500,
          rfd100: 7200,
          rfd200: 9100,
          rfd300: 10800,
          impulsePeak: 390,
          impulse100: 85,
          impulse200: 172,
          impulse300: 265,
          observations: 'Primeiro teste. Força tensional promissora com tempo de reação muscular dentro do esperado.'
        },
        {
          id: `imtp-mid`,
          date: dates[6],
          peakForce: 365,
          relativePeakForce: 4.45,
          timeToPeakForce: 235,
          meanForce: 258,
          rfdPeak: 14800,
          rfd100: 8600,
          rfd200: 10500,
          rfd300: 12100,
          impulsePeak: 445,
          impulse100: 102,
          impulse200: 198,
          impulse300: 310,
          observations: 'Evolução consistente após bloco de treinamento de força explosiva.'
        },
        {
          id: `imtp-latest`,
          date: dates[2],
          peakForce: 412,
          relativePeakForce: 5.02,
          timeToPeakForce: 195,
          meanForce: 295,
          rfdPeak: 17400,
          rfd100: 10500,
          rfd200: 12900,
          rfd300: 15200,
          impulsePeak: 510,
          impulse100: 125,
          impulse200: 245,
          impulse300: 368,
          observations: 'Atleta alcançou padrão elite de classe mundial em pico de força e gradiente de RFD precoce com excelentes gradientes isométricos.'
        }
      ],
      cmj: [
        {
          id: `cmj-1`,
          date: dates[2],
          height: 48.5,
          power: 4250,
          depth: 35,
          flightTime: 0.628,
          rsi: 2.15,
          observations: 'Perfil de potência explosiva muito alto.'
        }
      ],
      vo2max: [
        {
          id: `vo2-1`,
          date: dates[5],
          vo2max: 62.4,
          maxHeartRate: 192,
          thresholdHeartRate: 174,
          maxSpeed: 20.8,
          thresholdSpeed: 16.5,
          vam: 19.5,
          observations: 'Capacidade aeróbica de elite para atacante.'
        }
      ],
      speed: [
        {
          id: `spd-1`,
          date: dates[2],
          time5m: 1.02,
          time10m: 1.68,
          time20m: 2.85,
          time30m: 3.92,
          speed5m: 4.9,
          speed10m: 5.95,
          speed20m: 7.02,
          speed30m: 7.65,
          observations: 'Aceleração inicial (0-10m) é o ponto mais forte.'
        }
      ],
      dropJump: []
    }
  };
};

export const generateFeaturedAthletes = (): Athlete[] => {
  const now = new Date();
  const generateDates = (days: number) => {
    return Array.from({ length: days }).map((_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - i);
      return d.toISOString().split('T')[0];
    });
  };
  const dates = generateDates(30);

  // 1. Lucas Silva (Futebol)
  const lucas: Athlete = {
    id: "featured-lucas-silva",
    name: "Lucas Silva",
    dob: "1998-05-15",
    gender: "M",
    modality: "Futebol",
    position: "Atacante",
    competitiveLevel: "elite",
    injuryHistory: "Monitorar sinal de fadiga",
    weeklyFrequency: 5,
    weight: 82.5,
    wellness: [
      {
        id: "w-lucas-1",
        date: dates[0] + "T08:00:00Z",
        fatigue: 4,
        sleep: 4,
        stress: 3,
        soreness: 3,
        mood: 4,
        cognitiveLoad: 2,
        readinessScore: 76,
        hrv: 72,
        sleepHoursFormatted: "7h 10m"
      }
    ],
    workouts: [
      {
        id: "wk-lucas-1",
        date: dates[1] + "T10:00:00Z",
        name: "Treino de Potência",
        phase: "Competitiva",
        status: "completed",
        rpe: 8,
        durationMinutes: 75,
        totalLoad: 600,
        exercises: []
      },
      {
        id: "wk-lucas-2",
        date: dates[2] + "T10:00:00Z",
        name: "Força Explosiva",
        phase: "Competitiva",
        status: "completed",
        rpe: 7,
        durationMinutes: 60,
        totalLoad: 420,
        exercises: []
      }
    ],
    externalSessions: [
      {
        id: "ex-lucas-1",
        date: dates[0] + "T16:00:00Z",
        type: "tatico",
        durationMinutes: 90,
        rpe: 4,
        load: 360
      },
      {
        id: "ex-lucas-2",
        date: dates[5] + "T16:00:00Z",
        type: "tecnico",
        durationMinutes: 90,
        rpe: 5,
        load: 450
      }
    ],
    assessments: {
      bioimpedance: [{ id: "l-bio", date: dates[4], weight: 82.5, fatPercentage: 9.8, muscleMass: 44.2, visceralFat: 3, hydration: 62.5 }],
      isometricStrength: [{ id: "l-iso", date: dates[4], halfSquatKgf: 340, quadricepsR: 325, quadricepsL: 318, hamstringsR: 185, hamstringsL: 162 }],
      imtp: [{ id: "l-imtp", date: dates[4], peakForce: 365, relativePeakForce: 4.45, meanForce: 258, rfdPeak: 14800, timeToPeakForce: 235 }],
      cmj: [{ id: "l-cmj", date: dates[4], height: 48.5, power: 4250, rsi: 2.15, depth: 35, flightTime: 0.628 }],
      vo2max: [{ id: "l-vo2", date: dates[4], vo2max: 62.4, maxHeartRate: 192, thresholdHeartRate: 174, maxSpeed: 20.8, thresholdSpeed: 16.5 }],
      speed: [{ id: "l-speed", date: dates[4], time5m: 1.02, time10m: 1.68, time20m: 2.85, time30m: 3.92, speed5m: 4.9, speed10m: 5.95, speed20m: 7.02, speed30m: 7.65 }],
      dropJump: []
    }
  };

  // 2. Gustavo Mendes (Futebol)
  const gustavo: Athlete = {
    id: "featured-gustavo-mendes",
    name: "Gustavo Mendes",
    dob: "1999-08-20",
    gender: "M",
    modality: "Futebol",
    position: "Meio-Campo",
    competitiveLevel: "elite",
    injuryHistory: "Excelente equilíbrio",
    weeklyFrequency: 5,
    weight: 78.0,
    wellness: [
      {
        id: "w-gustavo-1",
        date: dates[0] + "T08:00:00Z",
        fatigue: 2,
        sleep: 5,
        stress: 1,
        soreness: 2,
        mood: 5,
        cognitiveLoad: 1,
        readinessScore: 85,
        hrv: 85,
        sleepHoursFormatted: "7h 45m"
      }
    ],
    workouts: [
      {
        id: "wk-gustavo-1",
        date: dates[1] + "T10:00:00Z",
        name: "Resistência de Força",
        phase: "Competitiva",
        status: "completed",
        rpe: 6,
        durationMinutes: 60,
        totalLoad: 360,
        exercises: []
      }
    ],
    externalSessions: [
      {
        id: "ex-gustavo-1",
        date: dates[2] + "T16:00:00Z",
        type: "tatico",
        durationMinutes: 60,
        rpe: 5,
        load: 300
      },
      {
        id: "ex-gustavo-2",
        date: dates[4] + "T16:00:00Z",
        type: "tecnico",
        durationMinutes: 60,
        rpe: 4,
        load: 240
      }
    ],
    assessments: {
      bioimpedance: [{ id: "g-bio", date: dates[5], weight: 78.0, fatPercentage: 10.2, muscleMass: 42.1, visceralFat: 2, hydration: 63.1 }],
      isometricStrength: [{ id: "g-iso", date: dates[5], halfSquatKgf: 310, quadricepsR: 295, quadricepsL: 290, hamstringsR: 170, hamstringsL: 165 }],
      imtp: [{ id: "g-imtp", date: dates[5], peakForce: 330, relativePeakForce: 4.23, meanForce: 240, rfdPeak: 13500, timeToPeakForce: 240 }],
      cmj: [{ id: "g-cmj", date: dates[5], height: 44.5, power: 3950, rsi: 2.05, depth: 32, flightTime: 0.602 }],
      vo2max: [{ id: "g-vo2", date: dates[5], vo2max: 58.5, maxHeartRate: 188, thresholdHeartRate: 170, maxSpeed: 19.5, thresholdSpeed: 15.8 }],
      speed: [{ id: "g-speed", date: dates[5], time5m: 1.05, time10m: 1.72, time20m: 2.91, time30m: 4.01, speed5m: 4.76, speed10m: 5.81, speed20m: 6.87, speed30m: 7.48 }],
      dropJump: []
    }
  };

  // 3. Rafael Costa (Corrida)
  const rafael: Athlete = {
    id: "featured-rafael-costa",
    name: "Rafael Costa",
    dob: "1994-03-12",
    gender: "M",
    modality: "Corrida",
    position: "Meio-Fundo",
    competitiveLevel: "elite",
    injuryHistory: "Aumentar carga gradualmente",
    weeklyFrequency: 6,
    weight: 68.5,
    wellness: [
      {
        id: "w-rafael-1",
        date: dates[0] + "T08:00:00Z",
        fatigue: 5,
        sleep: 3,
        stress: 4,
        soreness: 4,
        mood: 3,
        cognitiveLoad: 3,
        readinessScore: 68,
        hrv: 65,
        sleepHoursFormatted: "6h 30m"
      }
    ],
    workouts: [
      {
        id: "wk-rafael-1",
        date: dates[2] + "T10:00:00Z",
        name: "Força de Base",
        phase: "Preparatória",
        status: "completed",
        rpe: 7,
        durationMinutes: 90,
        totalLoad: 630,
        exercises: []
      }
    ],
    externalSessions: [
      {
        id: "ex-rafael-1",
        date: dates[1] + "T07:00:00Z",
        type: "tecnico",
        durationMinutes: 90,
        rpe: 6,
        load: 540
      },
      {
        id: "ex-rafael-2",
        date: dates[4] + "T07:00:00Z",
        type: "tecnico",
        durationMinutes: 45,
        rpe: 5,
        load: 225
      }
    ],
    assessments: {
      bioimpedance: [{ id: "r-bio", date: dates[6], weight: 68.5, fatPercentage: 7.5, muscleMass: 38.6, visceralFat: 1, hydration: 66.2 }],
      isometricStrength: [{ id: "r-iso", date: dates[6], halfSquatKgf: 245, quadricepsR: 220, quadricepsL: 215, hamstringsR: 130, hamstringsL: 125 }],
      imtp: [{ id: "r-imtp", date: dates[6], peakForce: 255, relativePeakForce: 3.72, meanForce: 195, rfdPeak: 10200, timeToPeakForce: 280 }],
      cmj: [{ id: "r-cmj", date: dates[6], height: 38.0, power: 3100, rsi: 1.82, depth: 28, flightTime: 0.556 }],
      vo2max: [{ id: "r-vo2", date: dates[6], vo2max: 69.8, maxHeartRate: 195, thresholdHeartRate: 178, maxSpeed: 22.1, thresholdSpeed: 18.2 }],
      speed: [{ id: "r-speed", date: dates[6], time5m: 1.15, time10m: 1.88, time20m: 3.12, time30m: 4.25, speed5m: 4.35, speed10m: 5.32, speed20m: 6.41, speed30m: 7.06 }],
      dropJump: []
    }
  };

  // 4. Bruno Almeida (Ciclismo)
  const bruno: Athlete = {
    id: "featured-bruno-almeida",
    name: "Bruno Almeida",
    dob: "1992-11-05",
    gender: "M",
    modality: "Ciclismo",
    position: "Velocista",
    competitiveLevel: "elite",
    injuryHistory: "Manter consistência",
    weeklyFrequency: 6,
    weight: 76.5,
    wellness: [
      {
        id: "w-bruno-1",
        date: dates[0] + "T08:00:00Z",
        fatigue: 3,
        sleep: 4,
        stress: 2,
        soreness: 3,
        mood: 4,
        cognitiveLoad: 2,
        readinessScore: 82,
        hrv: 80,
        sleepHoursFormatted: "7h 20m"
      }
    ],
    workouts: [
      {
        id: "wk-bruno-1",
        date: dates[3] + "T10:00:00Z",
        name: "Força Dinâmica coxa",
        phase: "Preparatória",
        status: "completed",
        rpe: 8,
        durationMinutes: 60,
        totalLoad: 480,
        exercises: []
      }
    ],
    externalSessions: [
      {
        id: "ex-bruno-1",
        date: dates[1] + "T08:00:00Z",
        type: "tecnico",
        durationMinutes: 120,
        rpe: 4,
        load: 480
      },
      {
        id: "ex-bruno-2",
        date: dates[5] + "T08:00:00Z",
        type: "recuperacao",
        durationMinutes: 60,
        rpe: 3,
        load: 180
      }
    ],
    assessments: {
      bioimpedance: [{ id: "b-bio", date: dates[7], weight: 76.5, fatPercentage: 8.9, muscleMass: 42.8, visceralFat: 2, hydration: 64.8 }],
      isometricStrength: [{ id: "b-iso", date: dates[7], halfSquatKgf: 325, quadricepsR: 300, quadricepsL: 305, hamstringsR: 175, hamstringsL: 180 }],
      imtp: [{ id: "b-imtp", date: dates[7], peakForce: 350, relativePeakForce: 4.58, meanForce: 250, rfdPeak: 14200, timeToPeakForce: 245 }],
      cmj: [{ id: "b-cmj", date: dates[7], height: 42.0, power: 3750, rsi: 1.95, depth: 30, flightTime: 0.585 }],
      vo2max: [{ id: "b-vo2", date: dates[7], vo2max: 71.2, maxHeartRate: 185, thresholdHeartRate: 168, maxSpeed: 21.5, thresholdSpeed: 17.5 }],
      speed: [{ id: "b-speed", date: dates[7], time5m: 1.10, time10m: 1.78, time20m: 2.98, time30m: 4.10, speed5m: 4.55, speed10m: 5.62, speed20m: 6.71, speed30m: 7.32 }],
      dropJump: []
    }
  };

  return [lucas, gustavo, rafael, bruno];
};
