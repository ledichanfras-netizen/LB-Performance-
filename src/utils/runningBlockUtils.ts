import { PrescribedExercise, RunningBlock, RunningStep, RunningStepType } from '../types';

/**
 * Utilitários para Treinos Estruturados por Blocos e Passos (Corrida, Campo, Tiros e Intervalados)
 * Padrão esportivo de alto rendimento sem acoplamento a marcas comerciais.
 */

export function parseSecondsFromRestString(restStr?: string, defaultSec: number = 60): number {
  if (!restStr) return defaultSec;
  const s = restStr.toLowerCase().trim();
  if (s.includes("m") && s.includes("s")) {
    const parts = s.split("m");
    const m = parseInt(parts[0]) || 0;
    const sec = parseInt(parts[1]) || 0;
    return (m * 60) + sec;
  }
  if (s.includes("min") || s.includes("m")) {
    const m = parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
    return Math.round(m * 60);
  }
  if (s.includes("s") || s.includes("seg")) {
    return parseInt(s.replace(/[^0-9]/g, "")) || defaultSec;
  }
  const num = parseInt(s);
  return isNaN(num) ? defaultSec : num;
}

export function isFieldOrRunningExercise(ex: PrescribedExercise): boolean {
  if (ex.isStructuredRunning) return true;
  if (ex.runningBlocks && ex.runningBlocks.length > 0) return true;
  
  const fieldMethods = ['sprint_rsa', 'pyramid_field', 'fartlek', 'shuttle_run'];
  if (ex.executionMethod && fieldMethods.includes(ex.executionMethod)) return true;

  if (ex.repsType === 'meters') return true;

  const mode = ex.trainingMode;
  if (mode === 'speed' || mode === 'court') return true;

  const name = (ex.name || "").toLowerCase();
  const muscleGroup = (ex.muscleGroup || "").toLowerCase();
  const reps = (ex.reps || "").toLowerCase();

  const fieldKeywords = [
    "corrida", "tiro", "sprint", "rsa", "fartlek", "shuttle", "hiit",
    "aceleração", "desaceleração", "mudança de direção", "cod",
    "trote", "pista", "tração elástico", "trenó", "pro agility"
  ];

  const hasKeyword = fieldKeywords.some(kw => name.includes(kw) || muscleGroup.includes(kw));
  const hasMeterOrIntervalNotation = reps.includes("m") || reps.includes("x") || reps.includes("+") || reps.includes("-");

  if (hasKeyword && hasMeterOrIntervalNotation) return true;

  return false;
}

/**
 * Converte ou extrai blocos de treino estruturados a partir da prescrição do exercício
 */
export function getOrGenerateRunningBlocks(ex: PrescribedExercise): RunningBlock[] {
  if (ex.runningBlocks && ex.runningBlocks.length > 0) {
    return ex.runningBlocks;
  }

  const numBlocks = Math.max(1, ex.sets || 1);
  const intraRest = ex.intraSetRest ?? 20;
  const blockRestSec = parseSecondsFromRestString(ex.rest, 120);
  const repsStr = (ex.reps || "").trim();

  // Caso 1: Tiros Curtos / RSA (ex: "5x 20m", "4x 30m")
  if (ex.executionMethod === 'sprint_rsa' || repsStr.toLowerCase().includes('x')) {
    // Tenta extrair repetições e distância
    const match = repsStr.match(/(\d+)\s*[xX]\s*(\d+)\s*m?/i);
    const count = match ? parseInt(match[1]) : 5;
    const distance = match ? parseInt(match[2]) : (parseInt(repsStr.replace(/[^0-9]/g, '')) || 20);

    const blocks: RunningBlock[] = [];
    for (let b = 1; b <= numBlocks; b++) {
      const steps: RunningStep[] = [];
      for (let r = 1; r <= count; r++) {
        steps.push({
          id: `step-sprint-${b}-${r}`,
          type: 'sprint',
          label: `Tiro ${r}/${count} • ${distance}m`,
          targetType: 'distance',
          targetValue: distance,
          targetUnit: 'm',
          intensityTarget: '100% Velocidade Máxima',
          notes: 'Esforço máximo de aceleração sem quebra de postura',
          isCompleted: false
        });

        // Micro-pausa após cada tiro (exceto o último do bloco, que tem descanso de bloco)
        if (r < count) {
          steps.push({
            id: `step-microrest-${b}-${r}`,
            type: 'recovery_rest',
            label: `Micro-Pausa • ${intraRest}s`,
            targetType: 'time',
            targetValue: intraRest,
            targetUnit: 's',
            intensityTarget: 'Caminhada lenta / Respiração profunda',
            notes: 'Recuperação dos estoques de fosfocreatina (ATP-CP)',
            isCompleted: false
          });
        }
      }

      blocks.push({
        id: `block-${b}`,
        name: `Bloco ${b} de ${numBlocks} (${count}x ${distance}m)`,
        repeatCount: 1,
        steps,
        blockRestSeconds: blockRestSec,
        blockRestLabel: `Recuperação Completa entre Blocos (${Math.round(blockRestSec / 60)}m${blockRestSec % 60 ? (blockRestSec % 60) + 's' : ''})`,
        notes: `Velocidade mantida em todos os tiros com densidade ideal.`,
        isCompleted: false
      });
    }
    return blocks;
  }

  // Caso 2: Pirâmide de Campo (ex: "10-20-30-40-30-20-10m")
  if (ex.executionMethod === 'pyramid_field' || repsStr.includes('-')) {
    const distances = repsStr
      .split(/[-–—]/)
      .map(part => parseInt(part.replace(/[^0-9]/g, '')))
      .filter(num => !isNaN(num) && num > 0);

    const pyramidDistances = distances.length > 0 ? distances : [10, 20, 30, 40, 30, 20, 10];
    const blocks: RunningBlock[] = [];

    for (let b = 1; b <= numBlocks; b++) {
      const steps: RunningStep[] = [];
      pyramidDistances.forEach((dist, idx) => {
        const isLast = idx === pyramidDistances.length - 1;
        const progressiveRest = Math.min(60, Math.max(15, Math.round(dist * 0.8)));

        steps.push({
          id: `step-pyr-${b}-${idx}`,
          type: 'sprint',
          label: `Tiro ${idx + 1}/${pyramidDistances.length} • ${dist}m`,
          targetType: 'distance',
          targetValue: dist,
          targetUnit: 'm',
          intensityTarget: dist <= 20 ? '100% Aceleração Explosiva' : '95-100% Velocidade Máxima',
          isCompleted: false
        });

        if (!isLast) {
          steps.push({
            id: `step-pyr-rest-${b}-${idx}`,
            type: 'recovery_rest',
            label: `Pausa Progressiva • ${progressiveRest}s`,
            targetType: 'time',
            targetValue: progressiveRest,
            targetUnit: 's',
            isCompleted: false
          });
        }
      });

      blocks.push({
        id: `block-pyr-${b}`,
        name: `Pirâmide ${b} de ${numBlocks} (${pyramidDistances.join(' - ')}m)`,
        repeatCount: 1,
        steps,
        blockRestSeconds: blockRestSec,
        blockRestLabel: `Descanso Pós-Pirâmide (${Math.round(blockRestSec / 60)}min)`,
        notes: `Volume da pirâmide: ${pyramidDistances.reduce((a, b) => a + b, 0)}m`,
        isCompleted: false
      });
    }
    return blocks;
  }

  // Caso 3: Fartlek / Treino Intermitente (ex: "12x (15s:15s)")
  if (ex.executionMethod === 'fartlek' || repsStr.includes(':')) {
    let repCount = 10;
    let workSec = 15;
    let restSec = 15;

    const countMatch = repsStr.match(/(\d+)\s*[xX]/);
    if (countMatch) repCount = parseInt(countMatch[1]);

    const ratioMatch = repsStr.match(/(\d+)\s*s?\s*:\s*(\d+)\s*s?/);
    if (ratioMatch) {
      workSec = parseInt(ratioMatch[1]);
      restSec = parseInt(ratioMatch[2]);
    }

    const blocks: RunningBlock[] = [];
    for (let b = 1; b <= numBlocks; b++) {
      const steps: RunningStep[] = [];
      for (let r = 1; r <= repCount; r++) {
        steps.push({
          id: `step-fartlek-work-${b}-${r}`,
          type: 'interval',
          label: `Estímulo ${r}/${repCount} • ${workSec}s`,
          targetType: 'time',
          targetValue: workSec,
          targetUnit: 's',
          intensityTarget: '>100% VAM (Intensidade Alta)',
          isCompleted: false
        });

        steps.push({
          id: `step-fartlek-rec-${b}-${r}`,
          type: 'recovery_active',
          label: `Trote Ativo • ${restSec}s`,
          targetType: 'time',
          targetValue: restSec,
          targetUnit: 's',
          intensityTarget: '50-60% VAM (Recuperação Ativa)',
          isCompleted: false
        });
      }

      blocks.push({
        id: `block-fartlek-${b}`,
        name: `Série Intermitente ${b} de ${numBlocks} (${repCount}x ${workSec}s:${restSec}s)`,
        repeatCount: 1,
        steps,
        blockRestSeconds: blockRestSec,
        blockRestLabel: `Intervalo entre Séries (${Math.round(blockRestSec / 60)}min)`,
        notes: `Tempo total de estímulo: ${(repCount * (workSec + restSec)) / 60} minutos.`,
        isCompleted: false
      });
    }
    return blocks;
  }

  // Caso 4: Shuttle Run / Pro Agility / COD (ex: "5+10+5m")
  if (ex.executionMethod === 'shuttle_run' || repsStr.includes('+')) {
    const blocks: RunningBlock[] = [];
    const count = 3;
    for (let b = 1; b <= numBlocks; b++) {
      const steps: RunningStep[] = [];
      for (let r = 1; r <= count; r++) {
        steps.push({
          id: `step-shuttle-${b}-${r}`,
          type: 'sprint',
          label: `Repetição ${r}/${count} • ${repsStr || '5-10-5m COD'}`,
          targetType: 'distance',
          targetValue: 20,
          targetUnit: 'm',
          intensityTarget: 'Aceleração Máxima com Frenagem Excêntrica Brusca',
          isCompleted: false
        });

        if (r < count) {
          steps.push({
            id: `step-shuttle-rest-${b}-${r}`,
            type: 'recovery_rest',
            label: `Pausa entre Tiros • ${intraRest}s`,
            targetType: 'time',
            targetValue: intraRest,
            targetUnit: 's',
            isCompleted: false
          });
        }
      }

      blocks.push({
        id: `block-shuttle-${b}`,
        name: `Série de Agilidade ${b} de ${numBlocks}`,
        repeatCount: 1,
        steps,
        blockRestSeconds: blockRestSec,
        blockRestLabel: `Descanso Completo Neuromuscular (${blockRestSec}s)`,
        notes: `Foco em centro de gravidade baixo e transição de desaceleração para aceleração.`,
        isCompleted: false
      });
    }
    return blocks;
  }

  // Caso Genérico / Default por Metros
  const parsedDist = parseInt(repsStr.replace(/[^0-9]/g, '')) || 50;
  const blocks: RunningBlock[] = [];
  for (let b = 1; b <= numBlocks; b++) {
    blocks.push({
      id: `block-gen-${b}`,
      name: `Bloco ${b} de ${numBlocks}`,
      repeatCount: 1,
      steps: [
        {
          id: `step-gen-${b}-1`,
          type: 'sprint',
          label: `Tiro de ${parsedDist}m`,
          targetType: 'distance',
          targetValue: parsedDist,
          targetUnit: 'm',
          intensityTarget: 'Velocidade Alta',
          isCompleted: false
        }
      ],
      blockRestSeconds: blockRestSec,
      blockRestLabel: `Pausa (${blockRestSec}s)`,
      isCompleted: false
    });
  }

  return blocks;
}

/**
 * Totaliza a distância e estímulos em metros de uma lista de blocos
 */
export function calculateBlocksMetrics(blocks: RunningBlock[]): {
  totalDistanceMeters: number;
  totalSprintsCount: number;
  totalWorkTimeSeconds: number;
  totalRestTimeSeconds: number;
} {
  let totalDistanceMeters = 0;
  let totalSprintsCount = 0;
  let totalWorkTimeSeconds = 0;
  let totalRestTimeSeconds = 0;

  for (const block of blocks) {
    const repeats = Math.max(1, block.repeatCount || 1);
    for (let r = 0; r < repeats; r++) {
      for (const step of block.steps) {
        if (step.type === 'sprint' || step.type === 'interval') {
          totalSprintsCount++;
          if (step.targetUnit === 'm') {
            totalDistanceMeters += step.targetValue;
          } else if (step.targetUnit === 'km') {
            totalDistanceMeters += step.targetValue * 1000;
          } else if (step.targetUnit === 's') {
            totalWorkTimeSeconds += step.targetValue;
          } else if (step.targetUnit === 'min') {
            totalWorkTimeSeconds += step.targetValue * 60;
          }
        } else if (step.type === 'recovery_rest' || step.type === 'recovery_active') {
          if (step.targetUnit === 's') {
            totalRestTimeSeconds += step.targetValue;
          } else if (step.targetUnit === 'min') {
            totalRestTimeSeconds += step.targetValue * 60;
          }
        }
      }
      if (block.blockRestSeconds) {
        totalRestTimeSeconds += block.blockRestSeconds;
      }
    }
  }

  return {
    totalDistanceMeters,
    totalSprintsCount,
    totalWorkTimeSeconds,
    totalRestTimeSeconds
  };
}
