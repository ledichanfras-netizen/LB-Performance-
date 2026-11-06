import React from "react";
import { 
  TrendingUp, 
  Activity, 
  Gauge, 
  Award,
  Calendar
} from "lucide-react";
import { Athlete, Workout, ExternalSession } from "../types";
import { DynamicReportEngine, ReportBlock } from "./DynamicReportEngine";
import { calculateACWR } from "../utils";

interface TrainingLoadReportProps {
  athlete: Athlete;
  onClose?: () => void;
}

export const TrainingLoadReport: React.FC<TrainingLoadReportProps> = ({ athlete, onClose }) => {
  const workouts: Workout[] = athlete.workouts || [];
  const externalSessions: ExternalSession[] = athlete.externalSessions || [];
  
  const computedAcwr = calculateACWR(workouts, externalSessions);
  const acwr = computedAcwr.ratio;
  const acuteLoad = Math.round(computedAcwr.acute);
  const chronicLoad = Math.round(computedAcwr.chronic);

  const acwrStatus = computedAcwr.status;
  const acwrColor = acwr === null ? "text-slate-600 bg-slate-50 border-slate-100" : "text-blue-600 bg-blue-50 border-blue-100";
  const feedbackText = acwr === null ? "Histórico insuficiente ou carga crônica nula. Não é possível calcular a relação com confiabilidade." : "Relação entre a carga registrada nos últimos 7 dias e a média semanal dos últimos 28 dias. Não representa probabilidade de lesão nem diagnóstico de fadiga.";
  const actionText = "Confirme duração, PSE e dias sem treino. Decisões de treino exigem avaliação individual do treinador.";
  const explicacoes = ["Todas as sessões do mesmo dia são somadas.", "Sessões futuras não integram o cálculo.", "A ausência de registros pode subestimar a carga; confira a cobertura do histórico."];
  const solucoes = ["Registre as sessões e os dias de descanso.", "Confirme os dados antes de ajustar a carga."];

  // Build wellness map for matching dates
  const wellnessMap = new Map<string, number>();
  (athlete.wellness || []).forEach((w) => {
    if (w.date && w.readinessScore !== undefined) {
      const dateStr = (w.date || "").split('T')[0];
      wellnessMap.set(dateStr, w.readinessScore);
    }
  });

  // Combine and sort sessions to show recent trends in graph
  const allSessions = [
    ...workouts.filter((w) => w.status === "completed" && w.rpe && w.date).map((w) => ({
      date: w.date,
      load: (w.durationMinutes || 0) * (w.rpe || 0),
    })),
    ...externalSessions.filter((s) => s.date).map((s) => ({
      date: s.date,
      load: s.load || ((s.durationMinutes || 0) * (s.rpe || 0)),
    }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const recentSessionsWithLoad = allSessions.slice(-8).map((s) => {
    const sDateOnly = (s.date || "").split('T')[0];
    const readiness = wellnessMap.get(sDateOnly) || null;
    return {
      date: new Date(s.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      load: s.load,
      readiness: readiness,
    };
  });

  const blocks: ReportBlock[] = [
    {
      id: "metodologia",
      section: "Fundamentação Metodológica",
      content: (
        <div className="space-y-4 bg-slate-50 border border-slate-200 p-5 rounded-2xl text-left">
          <div className="flex items-center gap-2 text-emerald-650">
            <Calendar className="w-4.5 h-4.5 text-emerald-600" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-750 font-sans">
              Fundamentação Metodológica do ACWR e PSR
            </h4>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-semibold">
            O cálculo do <strong>Acute:Chronic Workload Ratio (ACWR)</strong> é o principal biomarcador cinético utilizado por clubes profissionais de elite em todo o mundo para monitorar o estresse físico e de fadiga. A carga aguda (soma do produto volume x intensidade das sessões dos últimos 7 dias) representa a <strong>Fadiga</strong> do atleta. A carga crônica (média semanal das sessões dos últimos 28 dias) expressa o nível de <strong>Aptidão</strong> (fitness).
          </p>
          <p className="text-xs text-slate-700 leading-relaxed font-semibold font-sans">
            O equilíbrio matemático entre Fadiga e Aptidão (Relação Aguda/Crônica) determina a prontidão mecânica do sistema motor. A literatura em medicina desportiva comprova que manter o ACWR dentro do "Sweet Spot" (0.8 a 1.3) protege o atleta e desenvolve resiliência mecânica sustentável.
          </p>
        </div>
      )
    },
    {
      id: "load_chart_block",
      section: "Tendências de Carga e Prontidão",
      content: (
        <div className="grid grid-cols-12 gap-5 text-left mt-4">
          {/* Load trends graph */}
          <div className="col-span-8 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5 font-sans">Visão de Ciclagem e Recuperação</span>
              <p className="text-[10px] font-bold text-slate-500 font-sans">Carga Externa vs. Prontidão Física (% de 100) nas Últimas Sessões</p>
            </div>

            {/* Custom SVG line-and-bar load trend chart */}
            <div className="relative w-full py-4 flex items-center justify-center">
              {recentSessionsWithLoad.length > 0 ? (
                <svg className="w-full h-auto max-h-[160px]" viewBox="0 0 500 150">
                  {/* Grid Lines */}
                  <line x1="50" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="55" x2="480" y2="55" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="90" x2="480" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="120" x2="480" y2="120" stroke="#cbd5e1" strokeWidth="1" />

                  {(() => {
                    const validLoads = recentSessionsWithLoad.map((d) => Number(d.load) || 0);
                    const maxLoad = Math.max(...validLoads, 600);
                    const points: string[] = [];
                    const readinessPoints: string[] = [];
                    const renderedElements: React.ReactNode[] = [];
                    const readinessDots: React.ReactNode[] = [];

                    recentSessionsWithLoad.forEach((d, idx) => {
                      const x = 50 + idx * (410 / (recentSessionsWithLoad.length - 1 || 1));
                      const loadVal = Number(d.load) || 0;
                      // Scale load to graph height (from y=20 to y=120, height = 100)
                      const valPercent = maxLoad > 0 ? loadVal / maxLoad : 0;
                      const y = Math.max(20, Math.min(120, 120 - valPercent * 90));

                      points.push(`${x},${y}`);

                      // Draw bar for load
                      renderedElements.push(
                        <g key={`bar-${idx}`}>
                          <rect 
                            x={x - 10} 
                            y={y} 
                            width="20" 
                            height={Math.max(0, 120 - y)} 
                            rx="3" 
                            fill="#10b981" 
                            fillOpacity="0.12" 
                            stroke="#10b981"
                            strokeWidth="1.2"
                          />
                          <text x={x} y="136" className="fill-slate-600 font-sans text-[8px] font-black" textAnchor="middle">
                            {d.date}
                          </text>
                          <text x={x} y={y - 5} className="fill-emerald-700 font-mono text-[8px] font-black" textAnchor="middle">
                            {Math.round(loadVal)}
                          </text>
                        </g>
                      );

                      // Calculate and prepare readiness dot/point
                      if (d.readiness !== null) {
                        const yReadiness = 120 - (d.readiness / 100) * 90;
                        readinessPoints.push(`${x},${yReadiness}`);
                        
                        readinessDots.push(
                          <g key={`readiness-dot-${idx}`}>
                            <circle 
                              cx={x} 
                              cy={yReadiness} 
                              r="4" 
                              fill="#f43f5e" 
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                            <text 
                              x={x} 
                              y={yReadiness - 6} 
                              className="fill-rose-650 font-mono text-[8px] font-black" 
                              textAnchor="middle"
                            >
                              {d.readiness}%
                            </text>
                          </g>
                        );
                      }
                    });

                    // Draw connect line for load
                    if (points.length > 1) {
                      renderedElements.unshift(
                        <polyline 
                          key="line" 
                          fill="none" 
                          stroke="#10b981" 
                          strokeWidth="2" 
                          strokeDasharray="4 2"
                          points={points.join(" ")} 
                        />
                      );
                    }

                    // Draw connect line for readiness
                    if (readinessPoints.length > 1) {
                      renderedElements.push(
                        <polyline 
                          key="readiness-line" 
                          fill="none" 
                          stroke="#f43f5e" 
                          strokeWidth="2.5" 
                          points={readinessPoints.join(" ")} 
                        />
                      );
                    }

                    // Add readiness dots on top
                    renderedElements.push(...readinessDots);

                    return renderedElements;
                  })()}
                </svg>
              ) : (
                <div className="py-12 text-center text-slate-400 w-full">
                  <p className="text-[10px] font-bold uppercase font-sans">Sem sessões registradas recentemente para traçar gráfico.</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-x-5 gap-y-1 text-[7.5px] font-black text-slate-400 uppercase tracking-wider justify-center font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-emerald-500/15 border border-emerald-500 rounded-sm inline-block"></span>
                BARRAS (CARGA TOTAL / SESSÃO)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 border-t border-dashed border-emerald-500 inline-block"></span>
                TRACEJADA (TENDÊNCIA DE CARGA)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                LINHA ROSA (PRONTIDÃO DO DIA %)
              </span>
            </div>
          </div>

          {/* Current indices statistics info */}
          <div className="col-span-4 flex flex-col gap-4">
            {/* Index card ACWR */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between flex-grow">
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5 font-sans">Relação Operacional</span>
                <h4 className="text-[10.5px] font-black text-slate-900 uppercase font-sans">ACWR do Atleta</h4>
              </div>

              <div className="py-4 text-center">
                <span className="text-4xl font-black text-emerald-600 font-mono italic tracking-tighter leading-none">
                  {acwr !== null ? acwr.toFixed(2) : "—"}
                </span>
                <span className={`text-[8px] font-black uppercase tracking-wider block px-2.5 py-1 rounded-full border mt-2.5 font-sans ${acwrColor}`}>
                  {acwrStatus}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-2.5 text-[8.5px] text-slate-400 font-medium leading-normal font-sans">
                Referência descritiva: <strong className="text-slate-600 font-bold font-sans">0.80 - 1.30</strong>. Relação elevada: <strong className="text-slate-600 font-bold font-sans">&gt; 1.50</strong>.
              </div>
            </div>

            {/* Micro and macro metrics */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between font-sans">
              <div className="space-y-3.5">
                <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider font-sans">Carga Aguda (7d)</span>
                  <span className="text-[11px] font-black text-slate-800 font-mono italic">{acuteLoad} u.a.</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider font-sans">Carga Crônica (28d)</span>
                  <span className="text-[11px] font-black text-slate-800 font-mono italic">{chronicLoad} u.a.</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider font-sans">Média RPE Geral</span>
                  <span className="text-[11px] font-black text-slate-800 font-mono italic">
                    {allSessions.length > 0 
                      ? (allSessions.reduce((sum, s) => sum + s.load, 0) / allSessions.length / 60).toFixed(1)
                      : "0.0"} /10
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "explicacoes_detalhadas",
      section: "Explicações Detalhadas",
      forcePageBreak: true,
      content: (
        <div className="space-y-4 text-left font-sans">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Gauge className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <span className="text-[8px] font-black text-amber-500 block uppercase tracking-wider">Mapeamento de Causa e Efeito</span>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                Explicações Técnicas e Diagnóstico Clínico
              </h3>
            </div>
          </div>

          <div className="bg-amber-50/30 border border-amber-100 p-5 rounded-2xl">
            <p className="text-xs text-amber-900 leading-relaxed font-bold italic">
              "{feedbackText}"
            </p>
          </div>

          <div className="space-y-3.5 mt-2">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Análise Multidimensional de Impacto:
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {explicacoes.map((exp, idx) => (
                <div key={idx} className="flex gap-3 items-start bg-slate-50 border border-slate-150 p-4 rounded-xl">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-750 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed font-semibold">
                    {exp}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: "solucoes_acao",
      section: "Soluções & Prescrições",
      content: (
        <div className="space-y-4 text-left font-sans mt-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Activity className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <span className="text-[8px] font-black text-emerald-600 block uppercase tracking-wider">Ações de Enfrentamento</span>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                Soluções Recomendadas e Plano de Ação Imediato
              </h3>
            </div>
          </div>

          <div className="bg-emerald-50/30 border border-emerald-100 p-5 rounded-2xl">
            <p className="text-xs text-emerald-900 leading-relaxed font-bold italic">
              "{actionText}"
            </p>
          </div>

          <div className="space-y-3.5 mt-2">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Protocolos de Correção e Ciclagem:
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {solucoes.map((sol, idx) => (
                <div key={idx} className="flex gap-3 items-start bg-slate-50 border border-slate-150 p-4 rounded-xl">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    ✓
                  </span>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed font-semibold">
                    {sol}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mt-6 text-[10px] text-slate-500 font-bold leading-relaxed text-center italic">
            "Este controle é atualizado automaticamente a cada sessão inserida no LB Hub, gerando feedbacks de alerta preventivos em tempo real para a comissão multidisciplinar."
          </div>
        </div>
      )
    }
  ];

  return (
    <DynamicReportEngine
      athlete={athlete}
      reportTitle="CONTROLE DE CARGA ACUMULADA & ACWR"
      reportSubTitle="MONITORAMENTO DIÁRIO DA RELAÇÃO FADIGA-APTIDÃO"
      extraStats={[
        { label: "ACWR ATUAL", value: acwr !== null ? acwr.toFixed(2) : "—" },
        { label: "STATUS ACWR", value: acwrStatus.toUpperCase() }
      ]}
      blocks={blocks}
      onClose={onClose || (() => {})}
      hideTOC={true}
    />
  );
};
