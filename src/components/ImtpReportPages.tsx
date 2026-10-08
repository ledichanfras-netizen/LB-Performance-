import React from 'react';
import type { Athlete, Imtp } from '../types';
import { formatImtpValue, imtpChange, imtpMetrics, previousImtp } from '../utils/imtpAnalysis';

export default function ImtpReportPages({athlete,data,history}: {athlete: Athlete;data: Imtp;history: Imtp[]}) {
  const previous = previousImtp(data,history);
  const displayDate = (date: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : 'Não Informado';
  };
  const pageStyle = {background:'#fff',color:'#0f172a',width:'210mm',minHeight:'297mm',padding:'16mm',boxSizing:'border-box' as const};
  const header = (page: number) => <header className="border-b-4 border-emerald-600 pb-5 mb-6"><p className="text-emerald-700 font-black tracking-widest">LB PERFORMANCE · AVALIAÇÃO IMTP</p><h1 className="text-2xl font-black mt-2">{athlete.name}</h1><p className="text-sm mt-2">{athlete.modality} · {displayDate(data.date)} · Página {page}/2</p></header>;
  const changes = imtpMetrics.map(([key,label]) => ({key,label,pct:imtpChange(data[key],previous?.[key])})).filter(row => row.pct !== null);
  const pct = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1).replace('.',',')}%`;
  return <>
    <section className="report-page mx-auto mb-6 shadow-xl print:shadow-none" style={pageStyle}>
      {header(1)}
      <h2 className="text-lg font-bold mb-3">Resultados e evolução individual</h2>
      <p className="text-sm mb-5">Comparação: {previous ? displayDate(previous.date) : 'Primeiro registro — estabelecer referência individual'}. Valores ausentes e zeros históricos de preenchimento são apresentados como Não Informado.</p>
      <table className="w-full text-xs border-collapse"><thead><tr className="bg-emerald-50 text-left"><th className="p-2">Indicador</th><th className="p-2">Atual</th><th className="p-2">Anterior</th><th className="p-2">Variação</th></tr></thead><tbody>{imtpMetrics.map(([key,label,unit]) => {
        const change=imtpChange(data[key],previous?.[key]);
        return <tr key={key} className="border-b border-slate-200"><td className="py-2 px-2">{label}<span className="block text-slate-500">{unit}</span></td><td className="p-2 font-bold">{formatImtpValue(data[key])}</td><td className="p-2">{previous ? formatImtpValue(previous[key]) : 'Sem referência'}</td><td className="p-2">{change === null ? 'Não comparável' : pct(change)}</td></tr>;
      })}</tbody></table>
      <p className="text-xs mt-5">Força em kgf; RFD em N/s; impulso em N·s. A força relativa exige a massa corporal medida no teste. Confirmar com o equipamento se RFD e impulso representam janelas acumuladas e se há correção da força inicial.</p>
    </section>
    <section className="report-page mx-auto mb-6 shadow-xl print:shadow-none" style={pageStyle}>
      {header(2)}
      <h2 className="text-lg font-bold mb-4">Interpretação para a decisão de treino</h2>
      <div className="bg-emerald-50 rounded-xl p-5 mb-6"><h3 className="font-bold mb-2">{previous ? 'Leitura da evolução' : 'Referência inicial'}</h3><p className="text-sm">{!previous ? 'Este teste estabelece a referência do atleta. Sem avaliação anterior, não é possível afirmar melhora, queda ou estagnação.' : !changes.length ? 'Não há medidas preenchidas em ambas as avaliações para calcular a evolução. Completar as métricas antes de emitir conclusões.' : 'As variações abaixo descrevem diferenças entre avaliações. Não demonstram, por si só, adaptação ao treino ou perda de capacidade.'}</p>{changes.length > 0 && <ul className="mt-3 text-sm space-y-1">{changes.filter(row=>['peakForce','relativePeakForce','force100','force200','force300','impulse100','impulse200','rfd100'].includes(row.key)).map(row=><li key={row.key}>{row.label}: {pct(row.pct!)} em relação ao teste anterior.</li>)}</ul>}</div>
      <h3 className="font-bold mb-2">Como transformar a evolução em uma decisão</h3>
      <ol className="list-decimal pl-5 space-y-3 text-sm mb-6">
        <li>Confirmar comparabilidade: mesmo equipamento, posição, altura da barra, instruções, duração, força inicial e processamento do sinal.</li>
        <li>Verificar se a diferença supera a variação habitual do atleta e o erro do teste. Sem essa referência, registrar a mudança como descritiva e confirmar em nova avaliação.</li>
        <li>Se a força máxima se mantém e as medidas iniciais caem de forma repetida, investigar fadiga e a necessidade de ajustar volume ou estímulos de força rápida, junto à prontidão, CMJ e velocidade.</li>
        <li>Se a força máxima cai de forma repetida, verificar recuperação e condições de execução antes de modificar a prescrição. Confirmada a queda, revisar a dose de força e a recuperação.</li>
        <li>Se força máxima e produção inicial evoluem, avaliar a resposta no campo ou quadra antes de progredir a carga. O IMTP isolado não confirma transferência esportiva.</li>
      </ol>
      <h3 className="font-bold mb-2">Limites da interpretação</h3><p className="text-sm mb-6">Sem limites universais de “elite” ou “baixa explosividade”. O tempo até o pico é complementar e não substitui força e impulso nos primeiros milissegundos. O IMTP não mede diretamente taxa de disparo neural, sincronização de unidades motoras ou risco individual de lesão.</p>
      <h3 className="font-bold mb-2">Observações do treinador</h3><p className="text-sm whitespace-pre-wrap">{data.observations?.trim() || 'Não Informado'}</p>
      <footer className="border-t border-emerald-600 mt-8 pt-3 text-xs">LB Performance · Prof. Leandro Barbosa · Reavaliar com protocolo consistente e interpretar junto ao desempenho esportivo.</footer>
    </section>
  </>;
}
