import React, { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Athlete } from '../types';
import { metricDateLabel, metricDay, metricTimeline } from '../utils/metricTimeline';

export default function MetricEvolution({ assessments, compact = false, athleteView = false }: { assessments: Athlete['assessments']; compact?: boolean; athleteView?: boolean }) {
  const [period, setPeriod] = useState(0);
  const series = useMemo(() => [
    { name: 'IMTP', unit: 'kgf', color: '#3b82f6', digits: 1, data: metricTimeline((assessments?.imtp || []).map(x => ({ date: x.date, value: x.peakForce > 1000 ? x.peakForce / 9.80665 : x.peakForce }))) },
    { name: 'CMJ', unit: 'cm', color: '#f59e0b', digits: 1, data: metricTimeline((assessments?.cmj || []).map(x => ({ date: x.date, value: x.height }))) },
    { name: 'RSI • Drop Jump', unit: '', color: '#a855f7', digits: 2, data: metricTimeline((assessments?.dropJump || []).map(x => ({ date: x.date, value: x.rsi ?? NaN }))) },
  ], [assessments]);
  const today = metricDay(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }))!;
  const visible = series.map(s => ({ ...s, data: s.data.filter(p => !period || (p.time >= today - (period - 1) * 86400000 && p.time <= today)) }));
  const times = visible.flatMap(s => s.data.map(p => p.time));
  const start = Math.min(...times);
  const end = Math.max(...times);
  const domain: [number, number] = start === end ? [start - 86400000, end + 86400000] : [start, end];
  const ticks = [...new Set(times)].sort((a, b) => a - b);
  const axisTicks = ticks.length <= 3 ? ticks : [ticks[0], ticks[Math.floor((ticks.length - 1) / 2)], ticks[ticks.length - 1]];

  return <div className="min-w-0 space-y-4">
    {compact && <p className="text-xs font-bold text-slate-400">Período dos históricos</p>}
    <div className="flex flex-wrap gap-2" aria-label="Período do gráfico">
      {[[30, '30 dias'], [90, '90 dias'], [180, '180 dias'], [0, 'Tudo']].map(([days, label]) => <button key={days} type="button" aria-pressed={period === days} onClick={() => setPeriod(Number(days))} className={`px-3 py-2 rounded-xl text-xs font-bold border ${period === days ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/40' : 'text-slate-400 border-slate-700'}`}>{label}</button>)}
    </div>
    <p className="text-xs text-slate-400">Cada métrica tem sua própria escala. Melhor tentativa de cada dia; toque nos pontos para ver os valores.</p>
    {times.length > 0 && <p className="text-xs font-bold text-slate-400">{metricDateLabel(start, true)} a {metricDateLabel(end, true)}</p>}
    {visible.map((s, index) => {
      const history = series[index].data;
      const latest = history[history.length - 1];
      const previous = history[history.length - 2];
      const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: s.digits, maximumFractionDigits: s.digits });
      const change = latest && previous ? (latest.value - previous.value) / previous.value * 100 : null;
      const chart = <>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold mb-2">
        <span className="text-slate-300">{s.name}{s.unit && ` (${s.unit})`}</span>
        <span className="text-slate-400">{s.data.length} {s.data.length === 1 ? 'dia avaliado' : 'dias avaliados'} no período</span>
      </div>
      {s.data.length ? <div className="h-[150px] w-full min-w-0" role="img" aria-label={`Evolução de ${s.name}, ${s.data.length} dias avaliados`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={s.data} margin={{ top: 10, right: 22, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#64748b" opacity={0.2} vertical={false} />
            <XAxis dataKey="time" type="number" scale="time" domain={domain} ticks={axisTicks} tickFormatter={v => metricDateLabel(Number(v))} minTickGap={24} tickMargin={10} stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
            <YAxis width={48} domain={['auto', 'auto']} tickCount={4} tickFormatter={v => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: s.digits })} stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
            <Tooltip content={({ active, payload }) => {
              const point = payload?.[0]?.payload;
              return active && point ? <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 shadow-xl text-xs max-w-[220px]">
                <p className="text-slate-300 mb-1">{metricDateLabel(point.time, true)}</p>
                <p className="text-white font-bold">{s.name}: {point.value.toLocaleString('pt-BR', { minimumFractionDigits: s.digits, maximumFractionDigits: s.digits })} {s.unit}</p>
                {point.count > 1 && <p className="text-slate-400 mt-1">Melhor de {point.count} registros no dia</p>}
              </div> : null;
            }} />
            <Line type="linear" dataKey="value" stroke={s.color} strokeWidth={2.5} dot={{ r: 4, fill: s.color, strokeWidth: 0 }} activeDot={{ r: 6 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div> : <p className="text-xs text-slate-500 py-5">Sem avaliações válidas neste período.</p>}
      </>;
      return <div key={s.name} className="min-w-0 border-t border-slate-800 pt-4">
        {compact ? <>
          <div className="flex flex-wrap justify-between items-start gap-3">
            <div><h4 className="text-sm font-black text-white">{athleteView ? ['Força · IMTP', 'Salto · CMJ', 'Força reativa · RSI'][index] : s.name}</h4><p className="text-xs text-slate-400 mt-1">{latest ? `Última avaliação: ${metricDateLabel(latest.time, true)}` : 'Sem avaliação registrada'}</p></div>
            <div className="text-right"><p className="text-xl font-black text-white">{latest ? `${fmt(latest.value)} ${s.unit}` : '—'}</p><p className="text-xs text-slate-400 mt-1">{previous ? athleteView ? `Anterior: ${fmt(previous.value)} ${s.unit}` : `${change! > 0 ? '+' : ''}${fmt(change!)}% vs. ${metricDateLabel(previous.time, true)}` : latest ? 'Primeira avaliação' : 'Aguardando dados'}</p></div>
          </div>
          <details className="mt-3"><summary className="text-xs font-black text-brand-primary cursor-pointer py-2">Ver histórico de {s.name}</summary><div className="mt-3">{chart}</div></details>
        </> : chart}
      </div>;
    })}
  </div>;
}
