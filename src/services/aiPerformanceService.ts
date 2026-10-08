import { formatImtpValue } from "../utils/imtpAnalysis";
import { getEffectiveSessionToken } from '../utils/supervisionSession';
import { Athlete } from "../types";

export interface PerformanceModeling {
  athleteProfileSummary: string;
  modelingAnalysis: string;
  strengths: {
    attribute: string;
    description: string;
  }[];
  criticalGaps: {
    gap: string;
    impact: string;
    action: string;
  }[];
  targetMetrics: {
    metric: string;
    currentValue: string;
    targetValue: string;
    rationale: string;
  }[];
  coachStrategy: string;
}

const getSessionToken=getEffectiveSessionToken;

function calculateAge(dobString: string): number {
  if (!dobString) return 20;
  try {
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  } catch (e) {
    return 20;
  }
}

function getNewestThree(arr: any[]): any[] {
  if (!arr || !Array.isArray(arr)) return [];
  return [...arr]
    .sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    })
    .slice(0, 3);
}

export async function generateAIModeling(athlete: Athlete): Promise<PerformanceModeling | null> {
  const token = getSessionToken();

  // Filter and prepare data to be concise for token usage
  // We sort in descending order (newest first) and slice(0, 3) to get the 3 most recent assessments
  const assessmentsSummary = {
    bioimpedance: getNewestThree(athlete.assessments?.bioimpedance),
    isometricStrength: getNewestThree(athlete.assessments?.isometricStrength),
    imtp: getNewestThree(athlete.assessments?.imtp),
    cmj: getNewestThree(athlete.assessments?.cmj),
    dropJump: getNewestThree(athlete.assessments?.dropJump),
    vo2max: getNewestThree(athlete.assessments?.vo2max),
    speed: getNewestThree(athlete.assessments?.speed),
  };

  const prompt = `
    Analise os dados deste atleta e crie um Relatório de Modelagem de Alta Performance.
    
    PERSONA:
    Você é um Treinador Elite da LB Sports. Seu tom deve ser técnico, preciso e autoritativo, como um Diretor de Performance explicando a situação real para o atleta ou seu treinador de campo.
    
    PARÂMETRO CRÍTICO (I/Q):
    Para qualquer análise de força ou equilíbrio muscular, utilize obrigatoriamente a faixa de 50% a 60% como o padrão I/Q (Isquios/Quadríceps) ideal.
    
    DADOS DO ATLETA:
    - Nome: ${athlete.name}
    - Esporte: ${athlete.modality}
    - Posição: ${athlete.position || 'Não especificada'}
    - Nível: ${athlete.competitiveLevel || 'Competitivo'}
    - Data Nasc: ${athlete.dob}
    
    AVALIAÇÕES RECENTES (JSON):
    ${JSON.stringify(assessmentsSummary)}
    
    OBJETIVO:
    Crie um modelo objetivo de como este atleta deve performar para seu perfil específico.
    Identifique exatamente onde ele está comparado a uma versão "elite" de si mesmo e quais métricas precisam mudar.
    
    REGRAS DE ESTILO:
    - Responda obrigatoriamente em português (pt-BR).
    - NÃO mencione termos como "IA", "Inteligência Artificial", "Algoritmo" ou que o relatório foi gerado por uma máquina.
    - O tom deve ser de um Treinador Elite / Diretor Técnico de Alta Performance analisando dados reais.
    - O relatório deve parecer um documento técnico profissional da LB Sports, sendo direto, pragmático e focado em resultados.
  `;

  try {
    const res = await fetch("/api/generate-ai-modeling", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ prompt, athleteId: athlete.id })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `Server returned ${res.status}`);
    }

    const data = await res.json();
    if (data && data.result) {
      const text = data.result.trim();
      const jsonStr = text.replace(/^```json\s*|```$/g, '').trim();
      return JSON.parse(jsonStr);
    }
    return null;
  } catch (error: any) {
    console.error("Critical Error in AI Modeling client fetch:", error);
    return null;
  }
}

export async function generateImtpAiAnalysis(
  athlete: Athlete,
  imtpData: any,
  history: any[]
): Promise<any | null> {
  const token = getSessionToken();
  const age = calculateAge(athlete.dob);

  // Format history for context
  const historySummary = history.filter(h => h.id !== imtpData.id && new Date(h.date).getTime() < new Date(imtpData.date).getTime())
    .map(h => `- Data: ${h.date} | Pico: ${formatImtpValue(h.peakForce)} kgf | Relativa: ${formatImtpValue(h.relativePeakForce)} kgf/kg | Tempo: ${formatImtpValue(h.timeToPeakForce)} ms`)
    .join("\n");

  const prompt = `
    Analise os dados brutos de um teste IMTP (Isometric Mid-Thigh Pull) e gere uma análise altamente personalizada, clinicamente precisa e embasada pelas melhores referências científicas (Haff et al., Stone et al., James et al., IOC, NSCA guidelines).

    DADOS DO ATLETA:
    - Nome: ${athlete.name}
    - Modalidade esportiva: ${athlete.modality}
    - Gênero: ${athlete.gender === 'M' ? 'Masculino' : 'Feminino'}
    - Idade: ${age} anos
    - Nível competitivo: ${athlete.competitiveLevel || 'competitivo'}

    DADOS DO TESTE IMTP ATUAL:
    - Data do teste: ${imtpData.date}
    - Pico de força absoluta: ${formatImtpValue(imtpData.peakForce)} kgf
    - Força relativa (kgf/kg): ${formatImtpValue(imtpData.relativePeakForce)} kgf/kg
    - Tempo até o pico (ms): ${formatImtpValue(imtpData.timeToPeakForce)} ms
    - Força média do teste: ${formatImtpValue(imtpData.meanForce)} kgf
    - Força em 100 ms: ${formatImtpValue(imtpData.force100)} kgf
    - Força em 200 ms: ${formatImtpValue(imtpData.force200)} kgf
    - Força em 300 ms: ${formatImtpValue(imtpData.force300)} kgf
    - Pico RFD: ${formatImtpValue(imtpData.rfdPeak)} N/s
    - RFD a 100ms: ${formatImtpValue(imtpData.rfd100)} N/s
    - RFD a 200ms: ${formatImtpValue(imtpData.rfd200)} N/s
    - RFD a 300ms: ${formatImtpValue(imtpData.rfd300)} N/s
    - Impulso de Pico: ${formatImtpValue(imtpData.impulsePeak)} N·s
    - Impulso @ 100ms: ${formatImtpValue(imtpData.impulse100)} N·s
    - Impulso @ 200ms: ${formatImtpValue(imtpData.impulse200)} N·s
    - Impulso @ 300ms: ${formatImtpValue(imtpData.impulse300)} N·s

    HISTÓRICO DE TESTES ANTERIORES DO ATLETA (se houver):
    ${historySummary || "Nenhum teste anterior registrado."}

    REGRAS DE INTERPRETAÇÃO:
    Baseie as decisões na evolução individual dos testes anteriores, sem limiares universais por sexo ou modalidade.
    "Não Informado" representa ausência de medida, nunca zero ou deficiência. Não estime valores faltantes.
    Sem histórico comparável, estabeleça referência inicial e declare que não há conclusão longitudinal.
    Diferenças percentuais são descritivas. Sem erro típico do teste ou variabilidade individual, não afirme mudança relevante.
    Confirme protocolo, equipamento e processamento antes de comparar força, RFD e impulso.
    Não deduza taxa de disparo neural, sincronização de unidades motoras, risco de lesão ou transferência esportiva diretamente do IMTP.
    Use o esquema JSON existente: benchmarks deve explicar a referência individual; classification deve descrever evolução ou dados insuficientes em cada indicador, sem classificar em níveis de elite.
    diagnostico deve resumir achados e limitações; priorities deve apresentar decisões condicionais, cruzadas com prontidão, CMJ, velocidade e desempenho esportivo, sem prescrição automática baseada em número isolado.
    versionTechnical e versionAthlete devem comunicar as mesmas limitações com linguagem adequada. projections deve sugerir critérios de reavaliação, sem inventar metas percentuais ou prometer resultados.
    Responda em português brasileiro. Não apresente a análise como diagnóstico clínico ou assinatura profissional.
  `;

  try {
    const res = await fetch("/api/generate-imtp-ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ prompt, athleteId: athlete.id })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `Server returned ${res.status}`);
    }

    const data = await res.json();
    if (data && data.result) {
      const text = data.result.trim();
      const jsonStr = text.replace(/^```json\s*|```$/g, '').trim();
      return JSON.parse(jsonStr);
    }
    return null;
  } catch (error: any) {
    console.error("Critical Error in generateImtpAiAnalysis client fetch:", error);
    return null;
  }
}

export async function searchExercisesWithAi(query: string): Promise<{ exerciseIds: string[]; reasoning: string } | null> {
  const token = getSessionToken();
  try {
    const res = await fetch("/api/ai-search-exercises", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ query })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `Server returned ${res.status}`);
    }

    const data = await res.json();
    if (data && data.result) {
      return data.result;
    }
    return null;
  } catch (error: any) {
    console.error("Critical Error in searchExercisesWithAi:", error);
    return null;
  }
}

export async function prescribeWorkoutWithAi(params: {
  athleteId?: string;
  athleteData: string;
  objective: string;
  restrictions: string;
  timeAvailable: string;
  equipment: string;
  periodizationPhase: string;
  library?: any[];
}): Promise<any | null> {
  const token = getSessionToken();
  try {
    const res = await fetch("/api/ai-prescribe-workout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `Server returned ${res.status}`);
    }

    const data = await res.json();
    if (data && data.result) {
      return data.result;
    }
    return null;
  } catch (error: any) {
    console.error("Critical Error in prescribeWorkoutWithAi:", error);
    return null;
  }
}
