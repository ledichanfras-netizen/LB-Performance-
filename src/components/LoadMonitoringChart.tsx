import React, { useId } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type LoadHistoryPoint = { dateLabel: string; 'Carga Aguda': number; 'Carga Crônica': number; ACWR: number | null; Prontidão?: number | null };
const fmt = (n: number, digits = 0) => n.toLocaleString('pt-BR', { maximumFractionDigits: digits });
export default function LoadMonitoringChart({ history }: { history: LoadHistoryPoint[] }) {
  const id = useId().replace(/:/g, '');
  const latest = history[history.length - 1];
  const hasLoad = history.some(p => p['Carga Aguda'] > 0 || p['Carga Crônica'] > 0);
  const ratioMax = Math.max(2.5, Math.ceil(Math.max(...history.map(p => p.ACWR ?? 0), 0) * 2) / 2 + 0.25);
  const status = latest?.ACWR == null ? 'Sem dados' : latest.ACWR < .8 ? 'Baixo' : latest.ACWR <= 1.3 ? 'Ideal' : latest.ACWR <= 1.5 ? 'Atenção' : 'Risco alto';
  const zones = [
    { label: 'Baixo', range: '< 0,80', from: 0, to: .8, key: 'low' },
    { label: 'Ideal', range: '0,80–1,30', from: .8, to: 1.3, key: 'ideal' },
    { label: 'Atenção', range: '> 1,30–1,50', from: 1.3, to: 1.5, key: 'attention' },
    { label: 'Risco alto', range: '> 1,50', from: 1.5, to: ratioMax, key: 'risk' },
  ];
  return <section className="lb-load-chart w-full min-w-0 rounded-3xl border p-4 sm:p-6 shadow-xl" aria-label="Monitoramento de carga e faixas do ACWR">
    <header className="mb-5"><h4 className="text-sm sm:text-base font-black uppercase">ACWR · Monitoramento de carga</h4><p className="text-xs mt-2">Faixas de referência do ACWR no eixo direito. Cargas em UA no eixo esquerdo.</p></header>
    <div className="grid grid-cols-1 min-[380px]:grid-cols-3 gap-3 mb-5">
      {[{ label: 'Carga aguda · 7 dias', value: latest ? `${fmt(latest['Carga Aguda'])} UA` : '—', tone: 'acute' }, { label: 'Carga crônica · 28 dias', value: latest ? `${fmt(latest['Carga Crônica'])} UA` : '—', tone: 'chronic' }, { label: 'ACWR atual', value: latest?.ACWR == null ? '—' : fmt(latest.ACWR, 2), tone: 'ratio' }].map(item => <div key={item.tone} className="lb-load-stat rounded-2xl p-3 min-w-0"><p className="text-xs font-bold flex items-center gap-2"><span className="lb-load-swatch shrink-0" style={{ background: `var(--load-${item.tone})` }} />{item.label}</p><p className="text-xl sm:text-2xl font-black mt-2 break-words">{item.value}</p>{item.tone === 'ratio' && <p className="text-xs mt-1">{status}</p>}</div>)}
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3 text-xs font-bold" aria-label="Legenda das curvas">
      {[['acute','Carga aguda'],['chronic','Carga crônica'],['ratio','ACWR']].map(([key,label]) => <span key={key} className="inline-flex items-center gap-2"><span className="lb-load-swatch" style={{ background: `var(--load-${key})` }} />{label}</span>)}
    </div>
    {hasLoad ? <div className="h-[320px] sm:h-[400px] w-full min-w-0" role="img" aria-label="Carga aguda e crônica em UA e relação ACWR com faixas Baixo, Ideal, Atenção e Risco alto">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={history} margin={{ top: 24, right: 0, left: 0, bottom: 10 }}>
          <defs><linearGradient id={`load-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--load-acute)" stopOpacity={.18}/><stop offset="100%" stopColor="var(--load-acute)" stopOpacity={.01}/></linearGradient></defs>
          <XAxis dataKey="dateLabel" fontSize={11} stroke="var(--load-muted)" minTickGap={30} tickMargin={10} axisLine={false} tickLine={false} padding={{ left: 7, right: 7 }} />
          <YAxis yAxisId="load" width={45} fontSize={10} stroke="var(--load-muted)" tickFormatter={v => fmt(Number(v))} tickLine={false} axisLine={false} label={{ value:'UA', position:'insideTopLeft', dy:-20, fill:'var(--load-muted)', fontSize:11 }} />
          <YAxis yAxisId="ratio" orientation="right" width={40} domain={[0,ratioMax]} ticks={[0,.8,1.3,1.5,2,ratioMax]} fontSize={10} stroke="var(--load-muted)" tickFormatter={v => fmt(Number(v),2)} minTickGap={12} tickLine={false} axisLine={false} label={{ value:'ACWR', position:'insideTopRight', dy:-20, fill:'var(--load-muted)', fontSize:11 }} />
          {zones.map(z => <ReferenceArea key={z.key} yAxisId="ratio" y1={z.from} y2={z.to} fill={`var(--load-zone-${z.key})`} fillOpacity={1} stroke="none" ifOverflow="hidden" label={{ value:z.label, position:'insideRight', fill:'var(--load-text)', fontSize:11, fontWeight:700, className:'lb-load-band-label' }} />)}
          <CartesianGrid stroke="var(--load-grid)" vertical={false} strokeDasharray="3 4" />
          {[.8,1.3,1.5].map(value => <ReferenceLine key={value} yAxisId="ratio" y={value} stroke="var(--load-grid)" strokeDasharray="3 4" />)}
          <Tooltip content={({ active, payload, label }) => {
            const point = payload?.[0]?.payload as LoadHistoryPoint | undefined;
            return active && point ? <div className="lb-load-tooltip rounded-xl border p-3 text-xs shadow-xl"><p className="font-bold mb-2">{label}</p><p>Carga aguda: {fmt(point['Carga Aguda'])} UA</p><p>Carga crônica: {fmt(point['Carga Crônica'])} UA</p><p>ACWR: {point.ACWR == null ? 'Sem dados' : fmt(point.ACWR,2)}</p>{point.Prontidão != null && <p>Prontidão: {fmt(point.Prontidão)}%</p>}</div> : null;
          }} />
          <Area yAxisId="load" type="linear" dataKey="Carga Aguda" stroke="var(--load-acute)" fill={`url(#load-${id})`} strokeWidth={2.5} isAnimationActive={false} />
          <Line yAxisId="load" type="linear" dataKey="Carga Crônica" stroke="var(--load-chronic)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          <Line yAxisId="ratio" type="linear" dataKey="ACWR" stroke="var(--load-ratio)" strokeWidth={2} strokeDasharray="5 3" dot={false} activeDot={{ r:4 }} connectNulls={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div> : <p className="py-16 text-center text-sm">Sem cargas registradas neste período para exibir o gráfico.</p>}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4" aria-label="Faixas de referência do ACWR">{zones.map(z => <div key={z.key} className="lb-load-zone rounded-xl px-3 py-2" data-zone={z.key}><p className="text-xs font-black">{z.label}</p><p className="text-xs mt-1">{z.range}</p></div>)}</div>
    <p className="text-xs mt-4">Carga crônica apresentada como equivalente semanal: total de 28 dias ÷ 4.</p>
  </section>;
}
