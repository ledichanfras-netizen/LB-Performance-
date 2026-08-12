import React from 'react';
import { 
  HeartPulse, 
  Shield, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Heart, 
  Smile, 
  Award, 
  Bone
} from 'lucide-react';
import { Athlete } from '../types';
import { safeParseFloat } from '../utils';
import { DynamicReportEngine, ReportBlock } from './DynamicReportEngine';

interface HealthReportProps {
  athlete: Athlete;
  onClose?: () => void;
}

export const HealthReport: React.FC<HealthReportProps> = ({ athlete, onClose }) => {
  const reportDate = new Date().toLocaleDateString('pt-BR');

  // Calculate wellness stats
  const lastWellness = athlete.wellness && athlete.wellness.length > 0 
    ? [...athlete.wellness].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  const averageWellness = athlete.wellness && athlete.wellness.length > 0
    ? {
        sleep: parseFloat((athlete.wellness.reduce((sum, w) => sum + (safeParseFloat(w.sleep) || 0), 0) / athlete.wellness.length).toFixed(1)),
        soreness: parseFloat((athlete.wellness.reduce((sum, w) => sum + (w.soreness || 0), 0) / athlete.wellness.length).toFixed(1)),
        fatigue: parseFloat((athlete.wellness.reduce((sum, w) => sum + (w.fatigue || 0), 0) / athlete.wellness.length).toFixed(1)),
        readiness: parseFloat((athlete.wellness.reduce((sum, w) => sum + (w.readinessScore || 0), 0) / athlete.wellness.length).toFixed(1)),
      }
    : { sleep: 0, soreness: 0, fatigue: 0, readiness: 0 };

  const currentInjuries = athlete.injuries?.filter(i => i.status === 'Ativa' || i.status === 'Observação') || [];

  // Deduce clinical situations based on real injuries or poor stats
  let clinicalSeverityStatus = "ESTÁVEL & APTO";
  let whatIsWrong = "Não há anomalias musculares ou inflamações agudas reportadas. Todos os canais cinéticos estão no padrão de prontidão esperado.";
  let whereToImprove = "Otimizar recrutamento motor fino. Adicionar foco em flexores do quadril e fortalecimento excêntrico profundo no final dos treinos de média carga.";
  let preventAction = "Manter rotina normal. Realizar liberação miofascial manual leve pós-treinos mais longos.";
  let rehabStageVal = "Plena Atividade (Sem Restrição)";

  if (currentInjuries.length > 0) {
    const mainInjury = currentInjuries[0];
    clinicalSeverityStatus = `RESTRIÇÃO (${mainInjury.severity?.toUpperCase() || "MODERADA"})`;
    whatIsWrong = `Presença de sobrecarga mecânica na região: ${mainInjury.location || "Membro Inferior"}. O atleta reporta dor ao realizar movimentos de tração e pliometria lateral, influenciando no índice de força útil.`;
    whereToImprove = "Restaurar amplitude de movimento (ROM) sem dor, restabelecer equilíbrio de torque isocinético quadríceps/isquiotibiais e reduzir o cisalhamento articular.";
    preventAction = `Seguir estritamente o protocolo no estágio ${mainInjury.rehabStage || "Fisioterapia"}. Evitar picos de rotação mecânica unilateral em quadra/campo.`;
    rehabStageVal = mainInjury.rehabStage || "Reabilitação Médica";
  } else if (averageWellness.soreness > 3.0) {
    clinicalSeverityStatus = "FADIGA ACUMULADA / DM";
    whatIsWrong = "Índice de dor muscular tardia (DOMS) acima do limiar adaptativo seguro. Tecidos musculares sob contratura protetora residual devido ao alto volume acumulado.";
    whereToImprove = "Permitir supercompensação celular através de ciclos regenerativos curtos e banho frio de imersão.";
    preventAction = "Reduzir volume mecânico na musculação, focando em ativações articulares isométricas livres de alta oscilação.";
    rehabStageVal = "Prevenção Preventiva (DM)";
  }

  const blocks: ReportBlock[] = [
    {
      id: 'prevencao',
      section: 'Importância Preventiva',
      content: (
        <div className="space-y-4 bg-slate-50 border border-slate-200/80 p-5 rounded-2xl text-left">
          <div className="flex items-center gap-2 text-rose-600">
            <Shield className="w-4.5 h-4.5 text-emerald-600" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-750">
              Importância do Monitoramento Biopsicossocial e DM
            </h4>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-semibold">
            O acompanhamento ativo do departamento médico por meio de escalas visual-analógicas (VAS) de dor muscular tardia (DOMS), estresse percebido e qualidade de sono fornece uma análise biológica profunda do atleta de elite. O desequilíbrio na homeostase celular está diretamente associado a picos de fadiga mecânica, fragilizando o tecido conjuntivo (tendões, fáscias e ligamentos).
          </p>
          <p className="text-xs text-slate-700 leading-relaxed font-semibold">
            A triagem ortopédica proativa detecta micro-lesões nos estágios iniciais, permitindo intervenções cinesioterapêuticas e fisioterápicas rápidas. Isso previne lesões graves de grau II e III que comumente causam afastamentos longos e perda de performance competitiva.
          </p>
        </div>
      )
    },
    {
      id: 'lesoes',
      section: 'Triagem de Lesões',
      content: (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-rose-600 mb-1">
            <Bone className="w-4 h-4 text-emerald-650" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-750">
              Triagem de Afastamentos Clínicos / Lesões Ativas
            </h3>
          </div>
          
          {currentInjuries.length > 0 ? (
            <div className="space-y-3">
              {currentInjuries.map((injury, index) => (
                <div key={injury.id || index} className="p-5 bg-rose-50/50 border border-rose-200 rounded-xl text-left flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 text-[7.5px] font-black uppercase rounded bg-rose-100 text-rose-700 border border-rose-200">
                        {injury.severity?.toUpperCase() || 'MODERADA'}
                      </span>
                      <span className="px-2 py-0.5 text-[7.5px] font-black uppercase rounded bg-rose-200 text-rose-800">
                        {injury.status?.toUpperCase() || 'ATIVA'}
                      </span>
                      {injury.location && (
                        <span className="px-2 py-0.5 text-[7.5px] font-black uppercase rounded bg-slate-100 text-slate-600 font-mono border border-slate-200">
                          {injury.location.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-black text-slate-900 mb-1">{injury.description}</h4>
                    {injury.notes && (
                      <p className="text-[11px] text-slate-600 leading-relaxed font-semibold italic border-l-2 border-rose-200 pl-2.5">
                        "{injury.notes}"
                      </p>
                    )}
                  </div>
                  <div className="md:text-right flex flex-col justify-between items-start md:items-end border-t md:border-t-0 border-slate-100 pt-3 md:pt-0 shrink-0 min-w-[150px]">
                    <div>
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Tratamento</span>
                      <span className="text-[10px] font-black text-slate-800 uppercase font-mono bg-white border border-slate-200 px-2 py-0.5 rounded inline-block">
                        {injury.rehabStage || "Fisioterapia"}
                      </span>
                    </div>
                    {injury.estimatedReturnDate && (
                      <div className="mt-2">
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">Retorno Previsto</span>
                        <span className="text-[9.5px] font-bold text-slate-700 font-mono">{injury.estimatedReturnDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-center">
              <p className="text-xs font-black text-emerald-700 uppercase tracking-wider mb-1">Ausência de Lesões Ativas Registradas</p>
              <p className="text-[10.5px] text-slate-500 font-bold leading-normal">
                Não constam lesões musculoesqueléticas ou afastamentos de departamento médico pendentes. O atleta está apto e liberado para treinamento tático e físico de alta intensidade.
              </p>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'biomarcadores',
      section: 'Perfil de Bem-Estar',
      forcePageBreak: true,
      content: (
        <div className="grid grid-cols-12 gap-5 text-left">
          {/* Horizontal bars chart in SVG */}
          <div className="col-span-7 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Equilíbrio Biológico</span>
              <p className="text-[10px] font-bold text-slate-500">Níveis Médios de Prontidão (Wellness)</p>
            </div>

            <div className="relative w-full py-2">
              <svg className="w-full h-auto max-h-[140px]" viewBox="0 0 500 150">
                {(() => {
                  const items = [
                    { label: "QUALIDADE DE SONO", score: Math.min(5, averageWellness.sleep || 4.2), color: "#6366f1" },
                    { label: "AUSÊNCIA DE DOR", score: Math.min(5, 5 - (averageWellness.soreness || 1.8)), color: "#10b981" },
                    { label: "NÍVEL DE DISPOSIÇÃO", score: Math.min(5, 5 - (averageWellness.fatigue || 2.1)), color: "#f59e0b" },
                    { label: "PRONTIDÃO GERAL (%/100)", score: Math.min(5, ((averageWellness.readiness || 78) / 100) * 5), color: "#f43f5e" }
                  ];

                  return items.map((item, index) => {
                    const rowHeight = 32;
                    const y = index * rowHeight + 10;
                    const maxBarWidth = 300;
                    const progressWidth = (item.score / 5) * maxBarWidth;

                    return (
                      <g key={index}>
                        <text x="5" y={y + 11} className="fill-slate-700 font-sans text-[8.5px] font-black" textAnchor="start">
                          {item.label}
                        </text>

                        <rect x="150" y={y + 3} width={maxBarWidth} height="9" rx="4.5" fill="#f1f5f9" />
                        <rect x="150" y={y + 3} width={progressWidth} height="9" rx="4.5" fill={item.color} />

                        <text x="495" y={y + 11} className="fill-slate-900 font-mono text-[10px] font-black" textAnchor="end">
                          {item.label.includes("%") ? `${(averageWellness.readiness || 78).toFixed(0)}%` : `${item.score.toFixed(1)}/5`}
                        </text>
                      </g>
                    );
                  });
                })()}
              </svg>
            </div>

            <div className="border-t border-slate-100 pt-2.5 flex gap-3 text-[7.5px] font-black text-slate-400 uppercase tracking-wider justify-center">
              <span>• SONO (AZUL)</span>
              <span>• DOR (VERDE)</span>
              <span>• ENERGIA (AMARELO)</span>
              <span>• PRONTIDÃO (ROSA)</span>
            </div>
          </div>

          {/* Ultimo relato */}
          <div className="col-span-5 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <Smile className="w-4 h-4 text-emerald-600" />
                <h4 className="text-[10px] font-black text-slate-900 uppercase">Último Feedback de Wellness</h4>
              </div>
              
              {lastWellness ? (
                <div className="space-y-3 border-t border-slate-100 pt-2.5">
                  <div>
                    <span className="text-[7.5px] font-black text-slate-400 block uppercase">Data do Relatório</span>
                    <span className="text-[10px] font-black text-slate-800 font-mono bg-slate-50 border border-slate-200 px-2 py-0.5 rounded inline-block mt-0.5">
                      {new Date(lastWellness.date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[7.5px] font-black text-slate-400 block uppercase mb-0.5">Sintomas Detalhados</span>
                    <p className="text-[11px] text-slate-600 font-bold leading-normal italic">
                      "Estresse de <strong className="text-slate-900">{lastWellness.stress || 2}/10</strong>, dor tardia de <strong className="text-slate-900">{lastWellness.soreness || 2}/10</strong> e sono de <strong className="text-slate-900">{lastWellness.sleepHoursFormatted || lastWellness.sleep + 'h'}</strong>
                      {lastWellness.sleepStartTime && lastWellness.wakeUpTime ? ` (${lastWellness.sleepStartTime} ➔ ${lastWellness.wakeUpTime})` : ''}."
                    </p>
                  </div>
                  {lastWellness.isMatchDay && (
                    <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-left space-y-1">
                      <span className="text-[8px] font-black text-amber-700 uppercase tracking-wider block">🏆 DIA DE JOGO / COMPETIÇÃO</span>
                      <div className="flex gap-3 text-[9.5px] font-bold text-slate-800">
                        <span>Emocional: <strong className="text-amber-600">{lastWellness.emotionalReadiness ?? '--'}/10</strong></span>
                        <span>Psicológica: <strong className="text-indigo-600">{lastWellness.psychologicalReadiness ?? '--'}/10</strong></span>
                      </div>
                      {lastWellness.psychologyNotes && (
                        <p className="text-[9.5px] text-slate-700 italic border-l-2 border-amber-400 pl-2 mt-1">
                          "{lastWellness.psychologyNotes}"
                        </p>
                      )}
                    </div>
                  )}
                  {lastWellness.menstrualPhase && lastWellness.menstrualPhase !== 'Nenhuma' && (
                    <div className="bg-rose-50/50 p-2.5 rounded-lg border border-rose-100">
                      <span className="text-[7px] font-black text-rose-600 block uppercase mb-0.5">Fase Hormonal do Ciclo</span>
                      <span className="text-[10px] font-black text-slate-900 uppercase italic">{lastWellness.menstrualPhase}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <p className="text-[10px] font-bold uppercase">Sem registros nesta semana.</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-2 text-[8px] text-slate-400 font-bold leading-tight">
              Dados autorreportados pelo atleta via dispositivo móvel.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'diagnostico_clinico',
      section: 'Diagnóstico & Objetivos',
      content: (
        <div className="grid grid-cols-2 gap-5 text-left">
          {/* O que está errado */}
          <div className="p-5 bg-orange-50/30 border border-orange-150 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600 shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <span className="text-[7px] font-black text-orange-500 block uppercase tracking-wider">Fatores Limitantes</span>
                  <h4 className="text-[10px] font-black text-slate-900 uppercase">O que está inadequado na Biomecânica?</h4>
                </div>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-bold border-t border-slate-100 pt-3 italic">
                "{whatIsWrong}"
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-150 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
              <p className="text-[8px] text-orange-700 font-bold uppercase tracking-wide">
                Processo Clínico: {rehabStageVal.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Onde melhorar */}
          <div className="p-5 bg-rose-50/30 border border-rose-150 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0">
                  <TrendingUp className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <span className="text-[7px] font-black text-rose-500 block uppercase tracking-wider">Objetivos de Recuperação</span>
                  <h4 className="text-[10px] font-black text-slate-900 uppercase">Onde focar para regeneração tecidual?</h4>
                </div>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-bold border-t border-slate-100 pt-3 italic">
                "{whereToImprove}"
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-150 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-ping" />
              <p className="text-[8px] text-rose-700 font-bold uppercase tracking-wide">
                Vigilância Estrutural: ACOMPANHAMENTO DIÁRIO
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'plano_multidisciplinar',
      section: 'Plano de Tratamento',
      forcePageBreak: true,
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 text-left">
            <Award className="w-4.5 h-4.5 text-emerald-600" />
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
              Plano Clínico Adotado (Vigilância de Saúde de Elite)
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-4 text-left">
            {/* Fisioterapia */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-1.5 mb-2.5 border-b border-slate-100 pb-2">
                <Activity className="w-3.5 h-3.5 text-rose-500" />
                <h5 className="text-[9px] font-black text-slate-900 uppercase">1. Fisioterapia Desportiva</h5>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-semibold mb-3">
                Eletroanalgesia direcionada e drenagem de fáscias para eliminar congestões e acelerar o fluxo linfático residual.
              </p>
              <div className="bg-white p-2 border border-slate-200/80 rounded-lg">
                <span className="text-[7px] font-black text-slate-400 block uppercase mb-0.5">Ação Preventiva:</span>
                <span className="text-[9.5px] font-bold text-slate-800 leading-relaxed">{preventAction}</span>
              </div>
            </div>

            {/* Estabilização */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-1.5 mb-2.5 border-b border-slate-100 pb-2">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <h5 className="text-[9px] font-black text-slate-900 uppercase">2. Estabilização Isométrica</h5>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-semibold mb-3">
                Recalibração neuromuscular proprioceptiva e co-contrações em superfícies estáveis/instáveis para reforço articular.
              </p>
              <div className="bg-white p-2 border border-slate-200/80 rounded-lg">
                <span className="text-[7px] font-black text-slate-400 block uppercase mb-0.5">Rotina:</span>
                <span className="text-[9.5px] font-bold text-slate-800 leading-relaxed">Ciclos isométricos de 45s por quadrante, 4 séries ao dia.</span>
              </div>
            </div>

            {/* Suporte Ortomolecular */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-1.5 mb-2.5 border-b border-slate-100 pb-2">
                <Heart className="w-3.5 h-3.5 text-indigo-500" />
                <h5 className="text-[9px] font-black text-slate-900 uppercase">3. Fisiologia de Síntese</h5>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-semibold mb-3">
                Suplementação específica de colágeno UC-II e condroprotetores para acelerar a cicatrização de condrócitos nas cartilagens.
              </p>
              <div className="bg-white p-2 border border-slate-200/80 rounded-lg">
                <span className="text-[7px] font-black text-slate-400 block uppercase mb-0.5">Ortomolecular:</span>
                <span className="text-[9.5px] font-bold text-slate-800 leading-relaxed">Suplementar 40mg UC-II + 1000mg Vitamina C pela manhã em jejum.</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mt-6 text-[10px] text-slate-500 leading-normal font-bold text-center italic">
            "Este laudo de triagem serve como base de apoio técnico para subsidiar a tomada de decisão da comissão técnica e do staff de performance do clube."
          </div>
        </div>
      )
    }
  ];

  return (
    <DynamicReportEngine
      athlete={athlete}
      reportTitle="RELATÓRIO FISIOPATOLÓGICO CLÍNICO & DE DM"
      reportSubTitle="TRIAGEM DE LESÕES, CONTROLE DE INFECÇÕES E SUPORTE DE ORGÃOS"
      extraStats={[
        { label: "STATUS CLÍNICO", value: clinicalSeverityStatus },
        { label: "TRATAMENTO", value: rehabStageVal.toUpperCase() }
      ]}
      blocks={blocks}
      onClose={onClose || (() => {})}
    />
  );
};
