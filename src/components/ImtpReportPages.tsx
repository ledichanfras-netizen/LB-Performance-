import { verifiedImtpView, legacyImtpNeedsReview } from '../utils/legacyImtp';
import React from 'react';
import { TrendingUp, Target, Zap } from 'lucide-react';
import type { Athlete, Imtp } from '../types';
import { imtpAthleteReport } from '../utils/imtpAthleteReport';
import { formatImtpValue, imtpChange, imtpValue, previousImtp as findPrevious } from '../utils/imtpAnalysis';

type Props = {athlete: Athlete; data: Imtp; history: Imtp[]; ReportPage?: React.ComponentType<any>; ReportHeader?: React.ComponentType<any>};
const DefaultPage = ({children}: any) => <section className="report-page">{children}</section>;
const DefaultHeader = ({title}: any) => <h1>{title}</h1>;
export default function ImtpReportPages({athlete,data,history,ReportPage=DefaultPage,ReportHeader=DefaultHeader}: Props) {
  const needsReview=legacyImtpNeedsReview(data);
  data=verifiedImtpView(data);history=history.map(verifiedImtpView);
  const previousImtp = findPrevious(data,history);
  const totalPages = 2;
  const birth = athlete.dob ? new Date(athlete.dob) : null;
  const tested = new Date(data.date);
  const age = birth && Number.isFinite(birth.getTime()) && Number.isFinite(tested.getTime()) ? tested.getUTCFullYear()-birth.getUTCFullYear()-(tested.getUTCMonth()<birth.getUTCMonth() || (tested.getUTCMonth()===birth.getUTCMonth() && tested.getUTCDate()<birth.getUTCDate()) ? 1 : 0) : null;
  const formatDate = (date: string) => {const match=/^(\d{4})-(\d{2})-(\d{2})/.exec(date);return match ? `${match[3]}/${match[2]}/${match[1]}` : 'Não Informado';};
  const equivalent = (value: unknown) => {const number=imtpValue(value);return number === null ? 'Não Informado' : formatImtpValue(number*9.80665);};
  const delta = (key: keyof Imtp) => {const value=imtpChange(data[key],previousImtp?.[key]);return value===null ? null : {text:`${value>0?'+':''}${value.toFixed(1).replace('.',',')}%`,icon:'',color:'text-slate-700 bg-slate-100 border-slate-200'};};
  const peakDelta=delta('peakForce'),relDelta=delta('relativePeakForce'),rfdDelta=delta('rfdPeak'),rfd100Delta=delta('rfd100'),timeDelta=delta('timeToPeakForce'),impulse100Delta=delta('impulse100');
  const neuromuscularProfile = {
    verdict: previousImtp ? `Comparação com ${formatDate(previousImtp.date)}. As variações descrevem mudanças individuais; confirmar protocolo e erro de medida antes de concluir.` : 'Primeira avaliação: estabelecer referência individual. Sem teste anterior, não é possível afirmar melhora ou queda.',
    coachInterpretation: 'Interpretar diferenças apenas entre medidas presentes em ambos os testes. Verificar se a mudança supera a variação habitual do atleta e o erro do teste. Dados ausentes são Não Informado, sem gerar quedas artificiais.',
    athleteTranslation: 'Vamos acompanhar sua evolução em relação aos seus próprios resultados e conferir como ela aparece nos treinos e no esporte.'
  };
  const athleteReport = imtpAthleteReport(data, previousImtp);
  return <>
    {needsReview&&<p role="status" className="p-3 border rounded text-sm">Registro legado pendente de revisão. Valores originais preservados; métricas derivadas não confirmadas não são usadas neste relatório.</p>}
          {/* PÁGINA 1: RESULTADOS BIOMÉTRICOS & DIAGNÓSTICO NEUROMUSCULAR */}
          <ReportPage pageNumber={1} totalPages={totalPages}>
            <ReportHeader
              title="Meio Agachamento Isométrico (IMTP)"
              subTitle="Força máxima, produção inicial de força e evolução individual"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[
                { label: "PICO DE FORÇA", value: `${formatImtpValue(data.peakForce)} KGF` },
                { label: "FORÇA RELATIVA", value: `${formatImtpValue(data.relativePeakForce)} KGF/KG` }
              ]}
            />

            {/* Veredito Executivo & Perfil Contrátil do Atleta */}
            <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl mb-4.5 select-none font-sans">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2 pb-2.5 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                    RESUMO DA AVALIAÇÃO INDIVIDUAL
                  </span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-800 uppercase leading-relaxed">
                    {neuromuscularProfile.verdict}
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl border border-slate-200 text-[8px] font-black uppercase text-slate-600 shrink-0">
                  <span>Modalidade: <strong className="text-slate-950">{athlete.modality || "Geral"}</strong></span>
                  <span className="text-slate-300">|</span>
                  <span>Idade: <strong className="text-slate-950">{age !== null && age >= 0 ? `${age} anos` : 'Não Informado'}</strong></span>
                  <span className="text-slate-300">|</span>
                  <span>Massa: <strong className="text-slate-950">{formatImtpValue(data.weight)} kg</strong></span>
                </div>
              </div>
            </div>

            {/* Cabeçalho da Seção de Dados da Avaliação */}
            <div className="flex justify-between items-center mb-2 px-0.5 select-none font-sans">
              <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest border-l-2 border-brand-primary pl-2 italic">
                DADOS DA AVALIAÇÃO NEUROMUSCULAR
              </span>
              <span className="text-[7.5px] font-bold text-slate-500 uppercase">
                Monitoramento Individual • Foco em Resolução de Problemas
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 font-sans">
              {[
                {label:'Força máxima',value:data.peakForce,unit:'kgf',change:peakDelta},
                {label:'Força relativa',value:data.relativePeakForce,unit:'kgf/kg',change:relDelta},
              ].map(item=><section key={item.label} className="bg-white border border-slate-200 rounded-2xl p-5"><h3 className="text-xs font-bold text-slate-600 mb-3">{item.label}</h3><p className="text-2xl font-black text-slate-900">{formatImtpValue(item.value)} <span className="text-xs">{item.unit}</span></p><p className="text-xs text-slate-600 mt-3">{item.change?`${item.change.text} vs. anterior`:'Não comparável'}</p></section>)}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 font-sans">
              <h3 className="text-[9.5px] font-black uppercase tracking-widest border-l-2 border-brand-primary pl-2 mb-3">Força, RFD e impulso nas janelas do teste</h3>
              <table className="w-full text-[8px] text-left"><thead><tr className="text-slate-500"><th className="py-1">Indicador</th><th>Pico / total</th><th>100 ms</th><th>200 ms</th><th>300 ms</th></tr></thead><tbody>{[
                ['Força (kgf)','peakForce','force100','force200','force300'],
                ['RFD (N/s)','rfdPeak','rfd100','rfd200','rfd300'],
                ['Impulso (N·s)','impulsePeak','impulse100','impulse200','impulse300']
              ].map(([label,...keys])=><tr key={label} className="border-t border-slate-200"><th className="py-2">{label}</th>{keys.map(key=><td key={key} className="font-bold">{formatImtpValue(data[key as keyof Imtp])}{delta(key as keyof Imtp) && <span className="block text-[7px] text-slate-500">{delta(key as keyof Imtp)!.text} vs. anterior</span>}</td>)}</tr>)}</tbody></table>
              <p className="text-[8px] font-bold mt-2">Força média: {formatImtpValue(data.meanForce)} kgf</p>
              <p className="text-[7.5px] text-slate-500 mt-2">Força em 100 ms, 200 ms e 300 ms: registrar os valores medidos. Ausências não representam zero.</p>
            </div>
            {/* Acompanhamento Longitudinal & Histórico Comparativo */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 select-none font-sans">
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[9.5px] font-black text-slate-900 uppercase tracking-widest border-l-2 border-brand-primary pl-2 italic">
                  ACOMPANHAMENTO TEMPORAL & LINHA DE BASE DA FORÇA ISOMÉTRICA
                </span>
                <span className="text-[7.5px] font-bold text-slate-400 uppercase">Evolução individual</span>
              </div>

              {previousImtp ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[8px] font-bold text-slate-800 uppercase">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[7px]">Pico de Força Absoluto</span>
                    <strong className="text-xs font-black text-slate-950 block">{formatImtpValue(data.peakForce)} kgf</strong>
                    <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-100">
                      <span className="text-slate-400">Anterior: {formatImtpValue(previousImtp.peakForce)}kgf</span>
                      {peakDelta && (
                        <span className={`text-[7px] font-black px-1 rounded ${peakDelta.color}`}>
                          {peakDelta.icon} {peakDelta.text}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[7px]">Força Relativa</span>
                    <strong className="text-xs font-black text-emerald-600 block">{formatImtpValue(data.relativePeakForce)} kgf/kg</strong>
                    <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-100">
                      <span className="text-slate-400">Anterior: {formatImtpValue(previousImtp.relativePeakForce)}x</span>
                      {relDelta && (
                        <span className={`text-[7px] font-black px-1 rounded ${relDelta.color}`}>
                          {relDelta.icon} {relDelta.text}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[7px]">Desenvolvimento de Força (RFD 100ms)</span>
                    <strong className="text-xs font-black text-brand-primary block">{formatImtpValue(data.rfd100)} N/s</strong>
                    <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-100">
                      <span className="text-slate-400">Anterior: {formatImtpValue(previousImtp.rfd100)}N/s</span>
                      {rfd100Delta && (
                        <span className={`text-[7px] font-black px-1 rounded ${rfd100Delta.color}`}>
                          {rfd100Delta.icon} {rfd100Delta.text}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[7px]">Tempo até o Pico</span>
                    <strong className="text-xs font-black text-slate-950 block">{formatImtpValue(data.timeToPeakForce)} ms</strong>
                    <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-100">
                      <span className="text-slate-400">Anterior: {formatImtpValue(previousImtp.timeToPeakForce)}ms</span>
                      {timeDelta && (
                        <span className={`text-[7px] font-black px-1 rounded ${timeDelta.color}`}>
                          {timeDelta.icon} {timeDelta.text}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-[8.5px] uppercase font-bold text-slate-600">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Primeira avaliação de IMTP registrada. Esta coleta estabelece a linha de base biomecânica (Baseline) para cálculo automático de deltas nas próximas reavaliações.</span>
                  </div>
                  <span className="text-[7.5px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                    BASELINE DEFINIDO
                  </span>
                </div>
              )}
            </div>
          </ReportPage>

          {/* PÁGINA 2: DEVOLUTIVA E ORIENTAÇÃO PARA O ATLETA */}
          <ReportPage pageNumber={2} totalPages={totalPages}>
            <ReportHeader
              title="Seu Resultado e Próximos Passos"
              subTitle="Entenda sua avaliação e o foco da sua preparação"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[
                { label: "ACOMPANHAMENTO", value: previousImtp ? "EVOLUÇÃO INDIVIDUAL" : "PONTO DE PARTIDA" },
                { label: "PÁGINA", value: `02 DE ${String(totalPages).padStart(2, "0")}` }
              ]}
            />

            <div className="font-sans space-y-4">
              <section className="bg-white border border-slate-200 rounded-2xl p-4">
                <h3 className="text-[10px] font-black text-emerald-800 uppercase tracking-wider mb-2">O que o teste mostrou</h3>
                <p className="text-[10px] text-slate-800 leading-relaxed">{athleteReport.showed}</p>
                <p className="text-[9px] text-slate-600 leading-relaxed mt-2">{athleteReport.comparison}</p>
              </section>

              <section className="px-1">
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-2">O que isso significa para você</h3>
                <p className="text-[10px] text-slate-700 leading-relaxed">{athleteReport.meaning}</p>
              </section>

              <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={16} className="text-emerald-700" />
                  <h3 className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Seu foco agora</h3>
                </div>
                <p className="text-[15px] font-black text-slate-950 leading-snug mb-4">{athleteReport.focus}</p>
                <div className="grid grid-cols-2 gap-4 border-t border-emerald-200 pt-3">
                  <div>
                    <h4 className="text-[9px] font-black text-emerald-800 uppercase mb-2">Manter</h4>
                    <p className="text-[9px] text-slate-800 leading-relaxed">{athleteReport.maintain}</p>
                  </div>
                  <div>
                    <h4 className="text-[9px] font-black text-emerald-800 uppercase mb-2">Desenvolver</h4>
                    <p className="text-[9px] text-slate-800 leading-relaxed">{athleteReport.develop}</p>
                  </div>
                </div>
              </section>

              <section className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={14} className="text-emerald-700" />
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Qual é o próximo passo?</h3>
                </div>
                <p className="text-[10px] text-slate-800 leading-relaxed">{athleteReport.next}</p>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <h4 className="text-[9px] font-black text-emerald-800 uppercase mb-1">Como vamos acompanhar</h4>
                  <p className="text-[9px] text-slate-700 leading-relaxed">{athleteReport.followUp}</p>
                </div>
              </section>

              <section className="px-1">
                <h3 className="text-[9px] font-black text-emerald-800 uppercase tracking-wider mb-2">Orientações e observações do treinador</h3>
                <p className="text-[9px] text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{data.observations?.trim() || 'Não informado'}</p>
              </section>
            </div>
          </ReportPage>

  </>;
}
