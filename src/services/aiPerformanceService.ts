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

function getSessionToken(): string | null {
  try {
    const userStr = localStorage.getItem("lb_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user?.token || null;
    }
  } catch (e) {}
  return null;
}

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
      body: JSON.stringify({ prompt })
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
  const historySummary = history
    .map(h => `- Data: ${h.date} | Pico: ${h.peakForce} kgf | Relativa: ${h.relativePeakForce || 0} kgf/kg | Tempo: ${h.timeToPeakForce || 0} ms`)
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
    - Pico de força absoluta: ${imtpData.peakForce || 0} kgf
    - Força relativa (kgf/kg): ${imtpData.relativePeakForce || 0} kgf/kg
    - Tempo até o pico (ms): ${imtpData.timeToPeakForce || 0} ms
    - Força média do teste: ${imtpData.meanForce || 0} kgf
    - Pico RFD: ${imtpData.rfdPeak || 0} N/s
    - RFD a 100ms: ${imtpData.rfd100 || 0} N/s
    - RFD a 200ms: ${imtpData.rfd200 || 0} N/s
    - RFD a 300ms: ${imtpData.rfd300 || 0} N/s
    - Impulso de Pico: ${imtpData.impulsePeak || 0} N·s
    - Impulso @ 100ms: ${imtpData.impulse100 || 0} N·s
    - Impulso @ 200ms: ${imtpData.impulse200 || 0} N·s
    - Impulso @ 300ms: ${imtpData.impulse300 || 0} N·s

    HISTÓRICO DE TESTES ANTERIORES DO ATLETA (se houver):
    ${historySummary || "Nenhum teste anterior registrado."}

    OBJETIVOS E TAREFAS:
    Você deve preencher a resposta JSON de acordo com o esquema definido, nos seguintes blocos:
    1. BENCHMARKS INDIVIDUALIZADOS (campo benchmarks): Defina metas de referência baseadas na modalidade de esporte do atleta, gênero e competitividade. Cite as referências normativas da ciência do esporte (ex: Haff et al., Stone et al., James et al., valores IOC, NSCA guidelines).
    2. CLASSIFICAÇÃO DE PERFORMANCE ATUAL (campo classification): Classifique cada métrica abaixo em uma escala de 5 níveis: "Iniciante", "Em Desenvolvimento", "Competitivo", "Avançado", "Elite da Modalidade".
       - pico de força absoluta (peakForceClass)
       - força relativa (relativeForceClass)
       - rfd (rfdClass)
       - eficiência de força / razão média/pico (efficiencyClass)
    3. DIAGNÓSTICO NEUROMUSCULAR (campo diagnostico): Identifique o perfil neuromuscular dominante, as implicações no esporte do atleta e as limitações.
    4. PRESCRIÇÃO DA INTERVENÇÃO (campo priorities): 3 prioridades de treino urgentes com título, método, parâmetros de carga (intensidade, volume, reps), exercícios altamente específicos e indicador KPI de reavaliação.
    5. LINGUAGEM PARA O RELATÓRIO:
       - versionTechnical: Texto técnico objetivo para o preparador físico.
       - versionAthlete: Texto acessível, motivacional e claro exclusivamente para o atleta (retirar qualquer menção ou explicações para os pais).
    6. PROGRESÃO DE REAVALIAÇÕES (campo projections):
       - shortTerm (meta em 8 semanas)
       - mediumTerm (meta em 6 meses)
       - longTerm (meta de longo prazo nível elite na modalidade)

    Sua resposta deve ser estritamente em português brasileiro (pt-BR). NÃO use palavras de IA, geradores automáticos ou bots. Trate isso como um laudo assinado por um cientista do esporte da LB Sports.
  `;

  try {
    const res = await fetch("/api/generate-imtp-ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ prompt })
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
