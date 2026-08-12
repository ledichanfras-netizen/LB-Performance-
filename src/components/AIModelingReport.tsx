import React from 'react';
import { 
  Sparkles, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  Dna,
  Shield,
  Activity
} from 'lucide-react';
import { Athlete } from '../types';
import { PerformanceModeling } from '../services/aiPerformanceService';
import { DynamicReportEngine, ReportBlock } from './DynamicReportEngine';

interface AIModelingReportProps {
  athlete: Athlete;
  modeling: PerformanceModeling;
  onBack: () => void;
  role?: string;
}

export const AIModelingReport: React.FC<AIModelingReportProps> = ({ athlete, modeling, onBack, role }) => {
  const blocks: ReportBlock[] = [
    {
      id: 'sumario',
      section: 'Sumário Executivo',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100/60">
            <div className="text-left">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Modalidade</p>
              <p className="text-sm font-black text-slate-900 uppercase italic truncate">{athlete.modality}</p>
            </div>
            <div className="border-l border-slate-200 pl-4 text-left">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Equipe/Clube</p>
              <p className="text-sm font-black text-slate-900 uppercase italic truncate">{athlete.team || 'Elite Squad'}</p>
            </div>
            <div className="border-l border-slate-200 pl-4 text-left">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</p>
              <p className="text-sm font-black text-emerald-500 uppercase italic truncate">HIGH PERFORMANCE</p>
            </div>
          </div>

          <div className="space-y-3 text-left">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Sumário Executivo do Atleta</h3>
            </div>
            <div className="p-6 bg-emerald-50/20 rounded-2xl border border-emerald-100/40 relative">
              <p className="text-sm text-slate-800 leading-relaxed font-bold italic">
                "{modeling.athleteProfileSummary}"
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'dna',
      section: 'DNA & Mapeamento',
      content: (
        <div className="space-y-3 text-left">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-slate-900 rounded-full"></div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">DNA & Mapeamento de Performance</h3>
          </div>
          <div className="p-6 bg-slate-900 rounded-[2rem] border border-slate-800 relative overflow-hidden">
            <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none">
              <Dna className="w-24 h-24 text-white" />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-semibold">
              {modeling.modelingAnalysis}
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'gaps',
      section: 'Análise de Gaps',
      forcePageBreak: true,
      content: (
        <div className="grid grid-cols-2 gap-6 font-sans">
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Fortalezas de Elite</h3>
            </div>
            <div className="space-y-3">
              {modeling.strengths.slice(0, 3).map((s, idx) => (
                <div key={idx} className="p-4 bg-emerald-50/10 rounded-xl border border-emerald-100/30">
                  <h4 className="text-xs font-black text-emerald-900 uppercase italic mb-1 shrink-0">{s.attribute}</h4>
                  <p className="text-[10px] text-slate-600 font-bold leading-normal">{s.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 text-left">
            <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Gaps de Desenvolvimento</h3>
            </div>
            <div className="space-y-3">
              {modeling.criticalGaps.slice(0, 2).map((g, idx) => (
                <div key={idx} className="p-4 bg-white rounded-xl border border-slate-200">
                  <h4 className="text-xs font-black text-rose-900 uppercase italic border-b border-slate-100 pb-1 mb-2 leading-none">{g.gap}</h4>
                  <p className="text-[10px] text-slate-500 font-medium mb-2"><span className="font-extrabold uppercase text-[8px] tracking-tight text-slate-400">Impacto:</span> {g.impact}</p>
                  <div className="p-2.5 bg-slate-900 rounded-lg">
                    <p className="text-[9px] text-emerald-500 font-black"><span className="font-bold uppercase text-[7px] text-slate-500 tracking-wider">Protocolo:</span> {g.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'matrix',
      section: 'Matriz de Performance',
      forcePageBreak: true,
      content: (
        <div className="space-y-4 font-sans text-left">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Tabela de Indicadores e Racionais Técnicos</h3>
          </div>
          
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-3.5 text-[8px] font-black uppercase tracking-widest border-r border-slate-800">Métrica</th>
                  <th className="p-3.5 text-[8px] font-black uppercase tracking-widest border-r border-slate-800">Atual</th>
                  <th className="p-3.5 text-[8px] font-black text-emerald-500 uppercase tracking-widest border-r border-slate-800">Meta Target</th>
                  <th className="p-3.5 text-[8px] font-black uppercase tracking-widest">Racional Técnico / Linha do Tempo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modeling.targetMetrics.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-black text-slate-900 uppercase text-[9px] italic border-r border-slate-100">{m.metric}</td>
                    <td className="p-3.5 font-bold text-slate-500 text-[10px] border-r border-slate-100">{m.currentValue}</td>
                    <td className="p-3.5 border-r border-slate-100">
                      <div className="flex items-center gap-1 text-emerald-650 font-black text-[10px] italic">
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        {m.targetValue}
                      </div>
                    </td>
                    <td className="p-3.5 text-[9px] text-slate-600 font-medium leading-relaxed italic">{m.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    },
    {
      id: 'diretriz',
      section: 'Diretriz Estratégica',
      forcePageBreak: true,
      content: (
        <div className="space-y-6 font-sans text-left">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Estratégia do Treinador / Planejamento</h3>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden min-h-[100mm] flex flex-col justify-between">
            <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 blur-[80px] pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/30 font-bold">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-500">Protocolo de Implementação LB</span>
              </div>
              <p className="text-[13px] md:text-sm text-slate-200 leading-relaxed italic font-medium">
                "{modeling.coachStrategy}"
              </p>
            </div>

            <div className="border-t border-slate-800/80 pt-6 mt-6 flex flex-col sm:flex-row justify-between items-end gap-4">
              <div className="text-left">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Diretrizes Prescritas</p>
                <p className="text-[11px] font-bold text-slate-300">{new Date().toLocaleDateString("pt-BR")}</p>
              </div>
              <div className="text-right">
                <div className="border-b border-emerald-500/40 w-44 h-8 mb-1"></div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Assinatura Responsável Técnico</p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <DynamicReportEngine
      athlete={athlete}
      reportTitle="RELATÓRIO DE MODELAGEM"
      reportSubTitle="CONCEITO & SUMÁRIO EXECUTIVO"
      extraStats={[
        { label: "DIRETRIZ", value: "ALTA PERFORMANCE" },
        { label: "ESCALA", value: "ELITE" }
      ]}
      blocks={blocks}
      onClose={onBack}
    />
  );
};
