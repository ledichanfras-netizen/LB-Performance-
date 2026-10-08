import React from 'react';
import { TrendingUp, Target, Zap } from 'lucide-react';
import type { Athlete, Imtp } from '../types';
import { formatImtpValue, imtpChange, imtpValue, previousImtp as findPrevious } from '../utils/imtpAnalysis';

type Props = {athlete: Athlete; data: Imtp; history: Imtp[]; ReportPage?: React.ComponentType<any>; ReportHeader?: React.ComponentType<any>};
const DefaultPage = ({children}: any) => <section className="report-page">{children}</section>;
const DefaultHeader = ({title}: any) => <h1>{title}</h1>;
export default function ImtpReportPages({athlete,data,history,ReportPage=DefaultPage,ReportHeader=DefaultHeader}: Props) {
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
  const methodologicalDirectives = [
    {pillar:'DIRETRIZ 1: COMPARABILIDADE',priority:'MESMO PROTOCOLO',methodology:'Confirmar equipamento, posição, altura da barra, duração, instruções e processamento do sinal. RFD e impulso exigem definição consistente do início da força.',kpi:'Registros comparáveis e medidas presentes'},
    {pillar:'DIRETRIZ 2: EVOLUÇÃO INDIVIDUAL',priority:'CONFIRMAR A MUDANÇA',methodology:'Uma diferença percentual isolada não confirma adaptação ou fadiga. Confrontar com a variabilidade individual e repetir o teste quando necessário.',kpi:'Mudança acima da variação habitual'},
    {pillar:'DIRETRIZ 3: DECISÃO DE TREINO',priority:'CRUZAR COM O CONTEXTO ESPORTIVO',methodology:'Se quedas se repetirem, investigar recuperação e carga recente antes de ajustar o treino. Se houver evolução, verificar CMJ, velocidade e desempenho no esporte antes de progredir.',kpi:'Resposta consistente no teste e no esporte'}
  ];
  return <>
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

            {/* Painel Central dos 6 Resultados da Avaliação */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 mb-4.5 select-none font-sans">

              {/* Resultado 1: Pico de Força Absoluto */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-wider">Pico de Força Absoluto</span>
                    <span className="text-[7px] font-black px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-700 uppercase">
                      Força Máxima
                    </span>
                  </div>
                  <strong className="text-2xl font-black text-slate-950 block italic mt-1 leading-none">
                    {formatImtpValue(data.peakForce)} <span className="text-xs font-bold text-slate-500">kgf</span>
                  </strong>
                  <span className="text-[8px] text-slate-500 font-semibold block mt-1">
                    Equivalente: <strong className="text-slate-800 font-black">{equivalent(data.peakForce)} N</strong>
                  </span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[7px] font-bold text-slate-500 uppercase">Capacidade Tensional</span>
                  {peakDelta ? (
                    <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded border ${peakDelta.color}`}>
                      {peakDelta.icon} {peakDelta.text}
                    </span>
                  ) : (
                    <span className="text-[7px] font-bold text-slate-400 uppercase">Não comparável</span>
                  )}
                </div>
              </div>

              {/* Resultado 2: Força Relativa */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-wider">Força Relativa à Massa</span>
                    <span className="text-[7px] font-black px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 uppercase">
                      Força / Peso
                    </span>
                  </div>
                  <strong className="text-2xl font-black text-emerald-600 block italic mt-1 leading-none">
                    {formatImtpValue(data.relativePeakForce)} <span className="text-xs font-bold text-emerald-700">kgf/kg</span>
                  </strong>
                  <span className="text-[8px] text-slate-500 font-semibold block mt-1">
                    Equivalente: <strong className="text-slate-800 font-black">{equivalent(data.relativePeakForce)} N/kg</strong>
                  </span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[7px] font-bold text-slate-500 uppercase">Eficiência Relativa</span>
                  {relDelta ? (
                    <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded border ${relDelta.color}`}>
                      {relDelta.icon} {relDelta.text}
                    </span>
                  ) : (
                    <span className="text-[7px] font-bold text-slate-400 uppercase">Não comparável</span>
                  )}
                </div>
              </div>

              {/* Resultado 3: RFD Precoce @ 100ms */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-wider">Desenvolvimento de Força (RFD @ 100ms)</span>
                    <span className="text-[7px] font-black px-1.5 py-0.5 rounded border border-lime-200 bg-lime-50 text-lime-900 uppercase">
                      Janela de 100 ms
                    </span>
                  </div>
                  <strong className="text-2xl font-black text-brand-primary block italic mt-1 leading-none">
                    {formatImtpValue(data.rfd100)} <span className="text-xs font-bold text-slate-500">N/s</span>
                  </strong>
                  <span className="text-[8px] text-slate-500 font-semibold block mt-1">
                    Janela inicial: <strong className="text-slate-800 font-black">100 ms</strong>
                  </span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[7px] font-bold text-slate-500 uppercase">Taxa de Produção</span>
                  {rfd100Delta ? (
                    <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded border ${rfd100Delta.color}`}>
                      {rfd100Delta.icon} {rfd100Delta.text}
                    </span>
                  ) : (
                    <span className="text-[7px] font-bold text-slate-400 uppercase">Não comparável</span>
                  )}
                </div>
              </div>

              {/* Resultado 4: Tempo até o Pico */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-wider">Tempo até o Pico de Força</span>
                    <span className="text-[7px] font-black px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-700 uppercase">
                      Tempo até o Pico
                    </span>
                  </div>
                  <strong className="text-2xl font-black text-slate-900 block italic mt-1 leading-none">
                    {formatImtpValue(data.timeToPeakForce)} <span className="text-xs font-bold text-slate-500">ms</span>
                  </strong>
                  <span className="text-[8px] text-slate-500 font-semibold block mt-1">
                    Indicador complementar: <strong className="text-slate-800 font-black">Não substitui força inicial</strong>
                  </span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[7px] font-bold text-slate-500 uppercase">Tempo de Ativação</span>
                  {timeDelta ? (
                    <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded border ${timeDelta.color}`}>
                      {timeDelta.icon} {timeDelta.text}
                    </span>
                  ) : (
                    <span className="text-[7px] font-bold text-slate-400 uppercase">Não comparável</span>
                  )}
                </div>
              </div>

              {/* Resultado 5: Pico de RFD */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-wider">Pico de RFD</span>
                    <span className="text-[7px] font-black px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-700 uppercase">
                      Pico de Potência
                    </span>
                  </div>
                  <strong className="text-2xl font-black text-slate-950 block italic mt-1 leading-none">
                    {formatImtpValue(data.rfdPeak)} <span className="text-xs font-bold text-slate-500">N/s</span>
                  </strong>
                  <span className="text-[8px] text-slate-500 font-semibold block mt-1">
                    Gradiente Tensional: <strong className="text-slate-800 font-black">Pico Contratil</strong>
                  </span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[7px] font-bold text-slate-500 uppercase">Gradiente de Força</span>
                  {rfdDelta ? (
                    <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded border ${rfdDelta.color}`}>
                      {rfdDelta.icon} {rfdDelta.text}
                    </span>
                  ) : (
                    <span className="text-[7px] font-bold text-slate-400 uppercase">Não comparável</span>
                  )}
                </div>
              </div>

              {/* Resultado 6: Impulso Mecânico */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-wider">Impulso Mecânico (Área da Curva)</span>
                    <span className="text-[7px] font-black px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-700 uppercase">
                      Trabalho Mecânico
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <strong className="text-xl font-black text-slate-950 block italic leading-none">
                      {formatImtpValue(data.impulse100)} <span className="text-[10px] font-bold text-slate-500">N·s (100ms)</span>
                    </strong>
                  </div>
                  <span className="text-[8px] text-slate-500 font-semibold block mt-1">
                    Impulso @ 200ms: <strong className="text-slate-900 font-black">{formatImtpValue(data.impulse200)} N·s</strong>
                  </span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[7px] font-bold text-slate-500 uppercase">Força acumulada no tempo</span>
                  {impulse100Delta ? (
                    <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded border ${impulse100Delta.color}`}>
                      {impulse100Delta.icon} {impulse100Delta.text}
                    </span>
                  ) : (
                    <span className="text-[7px] font-bold text-slate-400 uppercase">Não comparável</span>
                  )}
                </div>
              </div>

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

          {/* PÁGINA 2: DIRETRIZES DE INTERVENÇÃO, PRIORIDADES E CAMINHO METODOLÓGICO */}
          <ReportPage pageNumber={2} totalPages={totalPages}>
            <ReportHeader
              title="Diretrizes de Intervenção e Metodologia de Treinamento"
              subTitle="Evolução individual, contexto de treino e acompanhamento"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[
                { label: "DIRETRIZ 1", value: methodologicalDirectives[0].priority.slice(0, 16) },
                { label: "PÁGINA", value: `02 DE ${String(totalPages).padStart(2, "0")}` }
              ]}
            />

            {/* Alinhamento Estratégico: Treinador & Atleta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4.5 select-none font-sans">

              {/* Para a Comissão Técnica / Treinador */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                    <Target size={14} className="text-brand-primary" />
                    <span className="text-[8px] font-black text-brand-primary uppercase tracking-widest">
                      PARECER TÉCNICO PARA O TREINADOR / PREPARADOR FÍSICO
                    </span>
                  </div>
                  <p className="text-[9px] font-medium text-slate-200 uppercase leading-relaxed">
                    {neuromuscularProfile.coachInterpretation}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center text-[7.5px] font-bold uppercase text-slate-400">
                  <span>Gestão de Carga:</span>
                  <span className="text-brand-primary font-black">Cruzar resultados com prontidão e carga recente</span>
                </div>
              </div>

              {/* Tradução Direta para o Atleta */}
              <div className="bg-emerald-50/70 border border-emerald-200 text-slate-900 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-emerald-200/60">
                    <Zap size={14} className="text-emerald-700" />
                    <span className="text-[8px] font-black text-emerald-800 uppercase tracking-widest">
                      TRADUÇÃO DIRETA PARA O ATLETA (APLICAÇÃO NO JOGO)
                    </span>
                  </div>
                  <p className="text-[9px] font-bold text-slate-800 uppercase leading-relaxed italic">
                    "{neuromuscularProfile.athleteTranslation}"
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-emerald-200/60 flex justify-between items-center text-[7.5px] font-extrabold uppercase text-emerald-800">
                  <span>Impacto Prático:</span>
                  <span className="font-black">Confirmar resposta no campo ou quadra</span>
                </div>
              </div>

            </div>

            {/* Diretrizes de Intervenção Metodológica (As 3 Prioridades Práticas) */}
            <div className="mb-4.5 select-none font-sans">
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[9.5px] font-black text-slate-900 uppercase tracking-widest border-l-2 border-brand-primary pl-2 italic">
                  CAMINHO METODOLÓGICO E PRIORIDADES DE PRESCRIÇÃO
                </span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">
                  Diretrizes Baseadas nos Resultados Reais
                </span>
              </div>

              <div className="space-y-3">
                {methodologicalDirectives.map((dir, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[7.5px] font-black text-brand-primary uppercase tracking-wider">
                          {dir.pillar}
                        </span>
                        <span className="text-[7px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-black uppercase">
                          PILAR 0{idx + 1}
                        </span>
                      </div>
                      <strong className="text-[10px] font-black text-slate-950 uppercase italic block mb-1.5 leading-snug">
                        {dir.priority}
                      </strong>
                      <p className="text-[8.5px] font-medium text-slate-700 uppercase leading-relaxed">
                        {dir.methodology}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[7.5px] uppercase font-sans">
                      <span className="font-black text-slate-500">Critério de Sucesso (KPI):</span>
                      <strong className="text-slate-900 font-extrabold">{dir.kpi}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-950 text-white rounded-2xl p-4.5 font-sans">
              <h3 className="text-[8px] font-black tracking-widest text-[#39FF14] uppercase mb-2">Observações e próximo acompanhamento</h3>
              <p className="text-[9px] whitespace-pre-wrap">{data.observations?.trim() || 'Não Informado'}</p>
              <p className="text-[8px] text-slate-400 mt-3">Definir metas e momento da reavaliação a partir do histórico individual, calendário e resposta ao treino. Manter o mesmo protocolo e confirmar mudanças antes de ajustar a prescrição.</p>
            </div>
          </ReportPage>

  </>;
}
