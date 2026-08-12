// Banco de Dados IMTP Normativos - V3.0 • ELITE PERFORMANCE
// Baseado em literatura científica peer-reviewed

export interface SportNormative {
  name: string;
  gender: string;
  dev: string;
  comp: string;
  adv: string;
  elite: string;
  rfdPriority: string;
  note: string;
  ref: string;
}

export interface SportsCategory {
  label: string;
  icon: string;
  sports: SportNormative[];
}

export const SPORTS_DATA: Record<string, SportsCategory> = {
  coletivos: {
    label: "Esportes Coletivos",
    icon: "⚽",
    sports: [
      { name: "Futebol", gender: "M", dev: "< 30", comp: "30–34", adv: "34–37", elite: "≥ 37", rfdPriority: "Alta", note: "RFD crítico para aceleração e mudança de direção", ref: "Tandfonline/EFL 2025" },
      { name: "Futebol", gender: "F", dev: "< 22", comp: "22–26", adv: "26–30", elite: "≥ 30", rfdPriority: "Alta", note: "Força relativa correlaciona com sprint e CMJ", ref: "Emmonds et al." },
      { name: "Futebol Juvenil", gender: "M ≤18", dev: "< 25", comp: "25–30", adv: "30–34", elite: "≥ 34", rfdPriority: "Alta", note: "Aplicar fator de maturação biológica", ref: "EFL Youth 2025" },
      { name: "Futebol Juvenil", gender: "F ≤18", dev: "< 18", comp: "18–22", adv: "22–26", elite: "≥ 26", rfdPriority: "Alta", note: "Baixa força relativa comum nessa faixa — foco em base", ref: "PMC 2025" },
      { name: "Basquetebol", gender: "M", dev: "< 28", comp: "28–33", adv: "33–38", elite: "≥ 38", rfdPriority: "Muito Alta", note: "Potência de salto e sprint determinam desempenho", ref: "DSI Study" },
      { name: "Basquetebol", gender: "F", dev: "< 22", comp: "22–27", adv: "27–32", elite: "≥ 32", rfdPriority: "Muito Alta", note: "Correlação com altura de salto e CMJ", ref: "DSI Study" },
      { name: "Voleibol", gender: "M", dev: "< 28", comp: "28–33", adv: "33–37", elite: "≥ 37", rfdPriority: "Muito Alta", note: "Pico de força correlaciona com potência de salto", ref: "NSCA / Literature" },
      { name: "Voleibol", gender: "F", dev: "< 22", comp: "22–27", adv: "27–31", elite: "≥ 31", rfdPriority: "Muito Alta", note: "RFD < 300ms ideal para bloqueio e ataque", ref: "NSCA / Literature" },
      { name: "Handebol", gender: "M", dev: "< 28", comp: "28–33", adv: "33–38", elite: "≥ 38", rfdPriority: "Alta", note: "Força + RFD essenciais para arremesso e contato", ref: "Striking Study 2024" },
      { name: "Handebol", gender: "F", dev: "< 22", comp: "22–27", adv: "27–32", elite: "≥ 32", rfdPriority: "Alta", note: "PF relativa ≥ 34 N/kg em jogadoras de elite mundial", ref: "Striking Study 2024" },
      { name: "Rugby (Backs)", gender: "M", dev: "< 28", comp: "28–33", adv: "33–39", elite: "≥ 39", rfdPriority: "Alta", note: "Backs: RFD e velocidade > força absoluta", ref: "PMC Rugby Review" },
      { name: "Rugby (Forwards)", gender: "M", dev: "< 25", comp: "25–30", adv: "30–36", elite: "≥ 36", rfdPriority: "Moderada", note: "Forwards: força absoluta e resistência > RFD", ref: "PMC Rugby Review" },
    ]
  },
  potencia: {
    label: "Atletismo e Velocidade",
    icon: "🏃",
    sports: [
      { name: "Velocista 100–200m", gender: "M", dev: "< 35", comp: "35–42", adv: "42–50", elite: "≥ 50", rfdPriority: "Crítica", note: "RFD < 150ms é o mais determinante para o desempenho", ref: "Stone et al.; Sprint Study" },
      { name: "Velocista 100–200m", gender: "F", dev: "< 28", comp: "28–35", adv: "35–42", elite: "≥ 42", rfdPriority: "Crítica", note: "Diferença de gênero diminui quando normalizada por PC", ref: "Sprint Study" },
      { name: "Meio-Fundista 400–800m", gender: "M", dev: "< 28", comp: "28–34", adv: "34–40", elite: "≥ 40", rfdPriority: "Alta", note: "Equilíbrio força/resistência; RFD < 300ms ideal", ref: "PMC 400m Sprinter" },
      { name: "Fundista 1500m+", gender: "M", dev: "< 22", comp: "22–28", adv: "28–33", elite: "≥ 33", rfdPriority: "Moderada", note: "Força relativa correlaciona com economia de corrida", ref: "Frontiers Physiology 2019" },
      { name: "Fundista 1500m+", gender: "F", dev: "< 18", comp: "18–24", adv: "24–29", elite: "≥ 29", rfdPriority: "Moderada", note: "Alta força relativa → menor dano muscular em provas longas", ref: "Literature" },
      { name: "Saltos (long/high/triple)", gender: "M", dev: "< 35", comp: "35–42", adv: "42–50", elite: "≥ 50", rfdPriority: "Crítica", note: "IMTP PF correlaciona fortemente com potência de salto", ref: "Stone et al." },
      { name: "Lançamento de Peso/Disco", gender: "M", dev: "< 38", comp: "38–45", adv: "45–55", elite: "≥ 55", rfdPriority: "Alta", note: "Força máxima absoluta dominante nessa modalidade", ref: "Stone et al." },
    ]
  },
  tenis: {
    label: "Tênis",
    icon: "🎾",
    sports: [
      { name: "Tênis", gender: "M", dev: "< 28", comp: "28–33", adv: "33–38", elite: "≥ 38", rfdPriority: "Muito Alta", note: "Explosividade e mudança de direção são determinantes. RFD < 250ms essencial para saques e sprints curtos no court", ref: "ATP Physical Index; J Sci Med Sport" },
      { name: "Tênis", gender: "F", dev: "< 22", comp: "22–27", adv: "27–32", elite: "≥ 32", rfdPriority: "Muito Alta", note: "Força relativa de MMII correlaciona com velocidade de saque e desempenho em rallies. RFD > força máxima lenta em importância", ref: "WTA S&C Literature; Frontiers Sports" },
      { name: "Tênis Juvenil", gender: "M ≤18", dev: "< 22", comp: "22–27", adv: "27–32", elite: "≥ 32", rfdPriority: "Alta", note: "Foco em desenvolvimento motor e RFD antes de força máxima absoluta", ref: "ITF Development; Sport Journal" },
      { name: "Tênis Juvenil", gender: "F ≤18", dev: "< 18", comp: "18–22", adv: "22–26", elite: "≥ 26", rfdPriority: "Alta", note: "Aplicar fator de maturação; CMJ e sprint correlacionam com ranking em jovens", ref: "Sport Journal 2020" },
    ]
  },
  corrida: {
    label: "Corrida de Rua",
    icon: "🏅",
    sports: [
      { name: "Maratona (42k)", gender: "M", dev: "< 22", comp: "22–27", adv: "27–33", elite: "≥ 33", rfdPriority: "Moderada", note: "Força relativa modera correlação com velocidade de prova (r=0,42). Alta força relativa → menor dano muscular e melhor economia de corrida", ref: "Frontiers Physiology 2019 (n=130)" },
      { name: "Maratona (42k)", gender: "F", dev: "< 18", comp: "18–23", adv: "23–28", elite: "≥ 28", rfdPriority: "Moderada", note: "Corredoras rápidas têm maior força relativa que lentas ao normalizar por PC. Foco em treino de força máxima melhora economia", ref: "Frontiers Physiology 2018; Literature" },
      { name: "Meia-Maratona (21k)", gender: "M", dev: "< 23", comp: "23–28", adv: "28–34", elite: "≥ 34", rfdPriority: "Moderada-Alta", note: "Combina necessidades aeróbias com maior componente de potência que a maratona. Força relativa associada ao pace", ref: "Biomechanics PMC 2025; Literature" },
      { name: "Meia-Maratona (21k)", gender: "F", dev: "< 19", comp: "19–24", adv: "24–29", elite: "≥ 29", rfdPriority: "Moderada-Alta", note: "Força isométrica de extensores de joelho é mais determinante que em provas longas. RFD moderado beneficia a fase de propulsão", ref: "Literature; PMC 2025" },
    ]
  },
  triatlo: {
    label: "Triathlon",
    icon: "🏊",
    sports: [
      { name: "Triathlon (Sprint/Olímpico)", gender: "M", dev: "< 22", comp: "22–28", adv: "28–33", elite: "≥ 33", rfdPriority: "Moderada", note: "Força relativa melhora economia de corrida e ciclismo. Treino de força máxima → melhor relação potência/peso", ref: "Sci Triathlon; Literature" },
      { name: "Triathlon (Sprint/Olímpico)", gender: "F", dev: "< 18", comp: "18–24", adv: "24–29", elite: "≥ 29", rfdPriority: "Moderada", note: "Menor PC relativo em triatletas femininas exige força relativa como métrica-chave. Ganhos de força sem ganho de massa são prioritários", ref: "Sci Triathlon; PMC Half-Iron 2019" },
      { name: "Triathlon (70.3 / Half-Iron)", gender: "F", dev: "< 17", comp: "17–22", adv: "22–27", elite: "≥ 27", rfdPriority: "Baixa-Moderada", note: "Foco em resistência de força. Força relativa protege contra fadiga muscular no segmento de corrida. Meta de força menor que modalidades de potência", ref: "PMC Half-Ironman 2019; Sci Triathlon" },
      { name: "Triathlon (Ironman Full)", gender: "F", dev: "< 16", comp: "16–21", adv: "21–25", elite: "≥ 25", rfdPriority: "Baixa", note: "Ultra-endurance: metas mais baixas são normais e esperadas. Força relativa previne lesão por overuse. RFD não é determinante primário", ref: "Sci Triathlon; Literature" },
    ]
  },
  combate: {
    label: "Esportes de Combate",
    icon: "🥊",
    sports: [
      { name: "Judô / Wrestling", gender: "M", dev: "< 30", comp: "30–36", adv: "36–42", elite: "≥ 42", rfdPriority: "Muito Alta", note: "PF relativo correlaciona com resultado competitivo (Kendall τ=0,249)", ref: "Striking Study 2024" },
      { name: "Judô / Wrestling", gender: "F", dev: "< 24", comp: "24–30", adv: "30–36", elite: "≥ 36", rfdPriority: "Muito Alta", note: "RFD 150ms é discriminador de nível competitivo em atletas de combate", ref: "Striking Study 2024" },
      { name: "Boxe / Muay Thai / MMA", gender: "M", dev: "< 28", comp: "28–34", adv: "34–38", elite: "≥ 38", rfdPriority: "Alta", note: "PF absoluta discrimina atletas de maior vs. menor nível de classificação", ref: "Striking Study 2024" },
      { name: "Boxe / Muay Thai / MMA", gender: "F", dev: "< 22", comp: "22–28", adv: "28–34", elite: "≥ 34", rfdPriority: "Alta", note: "Força relativa é melhor preditor que absoluta em combates femininos", ref: "Striking Study 2024" },
    ]
  },
  forca: {
    label: "Força e Potência",
    icon: "🏋️",
    sports: [
      { name: "Levantamento Olímpico", gender: "M", dev: "< 40", comp: "40–50", adv: "50–60", elite: "≥ 60", rfdPriority: "Muito Alta", note: "IMTP correlaciona com total olímpico (r=0,84). Referência-ouro para força máxima", ref: "Comfort et al.; Stone 25yr" },
      { name: "Levantamento Olímpico", gender: "F", dev: "< 32", comp: "32–40", adv: "40–50", elite: "≥ 50", rfdPriority: "Muito Alta", note: "PF relativa similar entre M e F quando normalizada por massa magra", ref: "Comfort et al. 2024" },
      { name: "Powerlifting / Força Geral", gender: "M", dev: "< 38", comp: "38–48", adv: "48–58", elite: "≥ 58", rfdPriority: "Moderada", note: "Força máxima absoluta predomina. RFD menos crítico que em esportes dinâmicos", ref: "Literature" },
      { name: "CrossFit / Força Funcional", gender: "M", dev: "< 28", comp: "28–35", adv: "35–42", elite: "≥ 42", rfdPriority: "Alta", note: "Equilíbrio entre força máxima, RFD e resistência de força", ref: "Northern Strength" },
      { name: "CrossFit / Força Funcional", gender: "F", dev: "< 22", comp: "22–28", adv: "28–35", elite: "≥ 35", rfdPriority: "Alta", note: "Mesma prioridade que masculino: equilíbrio nos três componentes", ref: "Northern Strength" },
    ]
  },
  aquatico: {
    label: "Aquáticos e Remo",
    icon: "🏊",
    sports: [
      { name: "Natação (velocidade)", gender: "M", dev: "< 26", comp: "26–32", adv: "32–38", elite: "≥ 38", rfdPriority: "Alta", note: "Força de MMII em saída de bloco e virada. RFD < 200ms relevante", ref: "Literature" },
      { name: "Natação (velocidade)", gender: "F", dev: "< 20", comp: "20–26", adv: "26–32", elite: "≥ 32", rfdPriority: "Alta", note: "Força relativa correlaciona com potência na saída e virada", ref: "Literature" },
      { name: "Remo", gender: "M", dev: "< 30", comp: "30–36", adv: "36–42", elite: "≥ 42", rfdPriority: "Alta", note: "Força máxima e resistência de força são igualmente importantes", ref: "NCAA Rowing Data" },
      { name: "Remo", gender: "F", dev: "< 24", comp: "24–30", adv: "30–36", elite: "≥ 36", rfdPriority: "Alta", note: "Correlação com potência de ergômetro e desempenho em 2000m", ref: "NCAA Rowing Data" },
    ]
  }
};

export const RFD_CLASSIFICATIONS = [
  { profile: "Potência Explosiva Elite", range: "< 200 ms", color: "#22c55e", desc: "Velocistas, saltadores, lutadores de nível olímpico" },
  { profile: "Potência Avançada", range: "200–400 ms", color: "#84cc16", desc: "Atletas de esportes coletivos bem treinados" },
  { profile: "Força Rápida Competitiva", range: "400–700 ms", color: "#eab308", desc: "Atletas funcionais com boa base de força" },
  { profile: "Força Máxima Lenta", range: "700–1500 ms", color: "#f97316", desc: "Perfil de força brute, sem explosividade" },
  { profile: "Dependência Lenta (Alerta)", range: "> 1500 ms", color: "#ef4444", desc: "Prioridade urgente em RFD e pliometria" },
];

export const AGE_FACTORS = [
  { range: "Sub-14", factor: "60–70%", note: "Use 60–70% das metas adultas da modalidade" },
  { range: "Sub-16", factor: "70–80%", note: "Maturação biológica impacta mais que idade cronológica" },
  { range: "Sub-18", factor: "80–90%", note: "Aproximação das metas adultas na fase final de maturação" },
  { range: "18–35 anos", factor: "100%", note: "Meta padrão da tabela — janela de pico de força" },
  { range: "35–45 anos (Master)", factor: "90–95%", note: "5–10% abaixo da meta padrão como Elite Master" },
  { range: "45+ anos", factor: "80–85%", note: "15–20% abaixo da meta padrão como Elite Master" },
];

export const LEVEL_COLORS = {
  dev: { bg: "bg-red-50 text-red-900 border-red-200", border: "#fca5a5", text: "#991b1b", label: "Em Desenvolvimento" },
  comp: { bg: "bg-amber-50 text-amber-950 border-amber-200", border: "#fcd34d", text: "#92400e", label: "Competitivo" },
  adv: { bg: "bg-blue-50 text-blue-900 border-blue-200", border: "#93c5fd", text: "#1e40af", label: "Avançado" },
  elite: { bg: "bg-emerald-50 text-emerald-950 border-emerald-200", border: "#86efac", text: "#14532d", label: "Elite" },
};

export function parseNormativeValue(str: string): number {
  const matches = str.match(/\d+/g);
  if (matches && matches.length > 0) {
    return parseFloat(matches[matches.length - 1]) / 10;
  }
  return 4.5;
}

export interface SoccerCmjNormativeRow {
  category: string;
  athleteHeight: string;
  jumpHeight: string;
  relPower: string;
  absPower: string;
}

export const SOCCER_CMJ_NORMATIVE: SoccerCmjNormativeRow[] = [
  { category: "Sub-15 (14-15 anos)", athleteHeight: "~1,70 m a 1,74 m", jumpHeight: "31 – 35 cm", relPower: "42 – 48 W/kg", absPower: "2.800 – 3.300 W" },
  { category: "Sub-17 (16-17 anos)", athleteHeight: "~1,75 m a 1,79 m", jumpHeight: "36 – 41 cm", relPower: "48 – 54 W/kg", absPower: "3.400 – 4.000 W" },
  { category: "Sub-20 (18-20 anos)", athleteHeight: "~1,78 m a 1,82 m", jumpHeight: "40 – 44 cm", relPower: "52 – 58 W/kg", absPower: "3.800 – 4.400 W" },
  { category: "Profissional (Adulto)", athleteHeight: "~1,80 m a 1,85 m", jumpHeight: "43 – 50+ cm", relPower: "55 – 65+ W/kg", absPower: "4.200 – 5.200+ W" }
];

