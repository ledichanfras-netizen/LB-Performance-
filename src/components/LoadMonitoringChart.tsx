import React, { useId } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type LoadHistoryPoint = { dateLabel: string; 'Carga Aguda': number; 'Carga Crônica': number; ACWR: number | null; Prontidão?: number | null };
const fmt = (n: number, digits = 0) => n.toLocaleString('pt-BR', { maximumFractionDigits: digits });
export default function LoadMonitoringChart({ history }: { history: LoadHistoryPoint[] }) {
  const id = useId().replace(/:/g, '');
  const latest = history[history.length - 1];
  const hasLoad = history.some(p => p['Carga Aguda'] > 0 || p['Carga Crônica'] > 0);
  const ratioMax = Math.max(2, Math.ceil(Math.max(...history.map(p => p.ACWR ?? 0), 0) * 2) / 2);
  const status = latest?.ACWR == null ? 'Sem dados' : latest.ACWR < .8 ? 'Baixo' : latest.ACWR <= 1.3 ? 'Ideal' : latest.ACWR <= 1.5 ? 'Atenção' : 'Risco alto';
  const zoneKey = latest?.ACWR == null ? 'none' : latest.ACWR < .8 ? 'low' : latest.ACWR <= 1.3 ? 'ideal' : latest.ACWR <= 1.5 ? 'attention' : 'risk';
  const zones = [
    { label: 'Baixo', range: '< 0,80', key: 'low' },
    { label: 'Ideal', range: '0,80–1,30', key: 'ideal' },
    { label: 'Atenção', range: '> 1,30–1,50', key: 'attention' },
    { label: 'Risco alto', range: '> 1,50', key: 'risk' },
  ];
  const tooltip = ({ active, payload, label }: any) => {
    const point = payload?.[0]?.payload as LoadHistoryPoint | undefined;
    return active && point ? <div className="lb-load-tooltip rounded-xl border p-3 text-xs shadow-xl"><p className="font-bold mb-2">{label}</p><p>Carga aguda: {fmt(point['Carga Aguda'])} UA</p><p>Carga crônica: {fmt(point['Carga Crônica'])} UA / semana</p><p>ACWR: {point.ACWR == null ? 'Sem dados' : fmt(point.ACWR,2)}</p>{point.Prontidão != null && <p>Prontidão: {fmt(point.Prontidão)}%</p>}</div> : null;
  };
  return <section className="lb-load-chart w-full min-w-0 rounded-3xl border p-4 sm:p-6 shadow-xl" aria-label="Monitoramento de carga e equilíbrio ACWR">
    <header><h4 className="text-base sm:text-lg font-black">Monitoramento de carga</h4><p className="text-xs mt-2">{history.length ? `${history[0].dateLabel} a ${latest.dateLabel} · evolução individual` : 'Evolução individual'}</p></header>
    <div className="grid grid-cols-3 gap-3 sm:gap-6 py-5 mt-2 border-b border-[var(--load-grid)]">
      <div className="min-w-0"><p className="text-xs lb-load-muted">Aguda · 7 dias</p><p className="text-xl sm:text-3xl font-black mt-2 break-words">{latest ? fmt(latest['Carga Aguda']) : '—'} <span className="lb-load-unit text-xs font-normal">UA</span></p></div>
      <div className="min-w-0"><p className="text-xs lb-load-muted">Crônica · 28 dias</p><p className="text-xl sm:text-3xl font-black mt-2 break-words">{latest ? fmt(latest['Carga Crônica']) : '—'} <span className="lb-load-unit text-xs font-normal">UA / semana</span></p></div>
      <div className="min-w-0"><p className="text-xs lb-load-muted">ACWR atual</p><p className="text-xl sm:text-3xl font-black mt-2">{latest?.ACWR == null ? '—' : fmt(latest.ACWR,2)}</p><span className="lb-load-status text-xs inline-block px-2 py-1 rounded-lg mt-2" data-zone={zoneKey}>{status === 'Ideal' ? 'Faixa ideal' : status}</span></div>
    </div>
    {hasLoad ? <>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-6 mb-3"><h5 className="text-sm font-black">Evolução das cargas</h5><div className="flex flex-wrap gap-4 text-xs lb-load-muted"><span className="inline-flex gap-2 items-center"><i className="lb-load-key" data-series="acute" />Aguda</span><span className="inline-flex gap-2 items-center"><i className="lb-load-key" data-series="chronic" />Crônica</span></div></div>
      <div className="h-[230px] sm:h-[280px] w-full min-w-0" role="img" aria-label="Evolução das cargas aguda e crônica em UA">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={history} syncId={id} syncMethod="index" margin={{ top:20, right:10, left:0, bottom:4 }}>
            <defs><linearGradient id={`load-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--load-acute)" stopOpacity={.12}/><stop offset="100%" stopColor="var(--load-acute)" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid stroke="var(--load-grid)" vertical={false} />
            <XAxis dataKey="dateLabel" hide height={0} padding={{ left:5, right:5 }} />
            <YAxis width={48} fontSize={11} stroke="var(--load-muted)" tickFormatter={v => fmt(Number(v))} tickLine={false} axisLine={false} tickCount={4} label={{ value:'UA', position:'insideTopLeft', dy:-20, fill:'var(--load-muted)', fontSize:11 }} />
            <Tooltip content={tooltip} />
            <Area type="linear" dataKey="Carga Aguda" stroke="var(--load-acute)" fill={`url(#load-${id})`} strokeWidth={2.5} isAnimationActive={false} />
            <Line type="linear" dataKey="Carga Crônica" stroke="var(--load-chronic)" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-5 mb-3"><h5 className="text-sm font-black">Equilíbrio de carga · ACWR</h5><span className="inline-flex gap-2 items-center text-xs lb-load-muted"><i className="lb-load-key" data-series="ratio" />Relação aguda / crônica</span></div>
      <div className="h-[170px] sm:h-[190px] w-full min-w-0" role="img" aria-label="Relação ACWR com destaque da faixa ideal de 0,80 a 1,30">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} syncId={id} syncMethod="index" margin={{ top:20, right:10, left:0, bottom:8 }}>
            <CartesianGrid stroke="var(--load-grid)" vertical={false} />
            <XAxis dataKey="dateLabel" fontSize={11} stroke="var(--load-muted)" minTickGap={35} tickMargin={10} axisLine={false} tickLine={false} padding={{ left:5, right:5 }} />
            <YAxis width={48} domain={[0,ratioMax]} ticks={[0,.8,1.3,ratioMax]} fontSize={11} stroke="var(--load-muted)" tickFormatter={v => fmt(Number(v),2)} minTickGap={10} tickLine={false} axisLine={false} label={{ value:'ACWR', position:'insideTopLeft', dy:-20, fill:'var(--load-muted)', fontSize:11 }} />
            <ReferenceArea y1={.8} y2={1.3} fill="var(--load-ideal)" fillOpacity={1} stroke="none" />
            <Tooltip content={tooltip} />
            <Line type="linear" dataKey="ACWR" stroke="var(--load-ratio)" strokeWidth={2.5} dot={false} activeDot={{ r:4 }} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </> : <p className="py-16 text-center text-sm">Sem cargas registradas neste período para exibir o gráfico.</p>}
    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 pt-4 border-t border-[var(--load-grid)] lb-load-muted" aria-label="Faixas de referência do ACWR">{zones.map(z => <span key={z.key} className="lb-load-zone text-xs inline-flex items-center gap-1.5" data-zone={z.key}><i className="lb-load-dot shrink-0" />{z.label} {z.range}</span>)}</div>
    <p className="text-xs mt-4 lb-load-muted">Carga crônica apresentada como equivalente semanal: total de 28 dias ÷ 4.</p>
  </section>;
}
