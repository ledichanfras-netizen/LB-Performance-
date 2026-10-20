import React, { useMemo } from 'react';
import { Activity, CalendarDays, ClipboardCheck, Dumbbell, Target, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { Athlete, Workout, WellnessEntry } from '../types';
import { dashboardSummary, sessionLoad, validNumber } from '../utils/dashboardSummary';
import { metricDateLabel, metricDay } from '../utils/metricTimeline';
import MetricEvolution from './MetricEvolution';

type Props = { athlete: Athlete; role: 'coach' | 'athlete'; today: string; lbx: React.ReactNode; onAddWellness?: () => void; onEditWellness?: (entry: WellnessEntry) => void; onStartWorkout: (w: Workout) => void; onOpenWorkouts?: () => void; onOpenReadiness: () => void; onOpenLoad: () => void };
const section = 'lb-dashboard-card border rounded-[2rem] p-5 sm:p-6 min-w-0 shadow-xl';
const action = 'min-h-11 rounded-xl border border-brand-primary/30 bg-brand-primary/10 px-4 py-3 text-xs font-black text-brand-primary inline-flex items-center justify-center gap-2 hover:bg-brand-primary/20 transition-colors';
const number = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return <div className="min-w-0"><p className="text-xs font-bold text-slate-400">{label}</p><p className="text-xl sm:text-2xl font-black text-white mt-1 break-words">{value}</p>{note && <p className="text-xs text-slate-500 mt-1">{note}</p>}</div>;
}
export default function AthleteDashboardPanel({ athlete, role, today, lbx, onAddWellness, onEditWellness, onStartWorkout, onOpenWorkouts, onOpenReadiness, onOpenLoad }: Props) {
  const data = useMemo(() => dashboardSummary(athlete, today), [athlete, today]);
  const wellness = data.todayWellness;
  const isAthlete = role === 'athlete';
  const latestLoad = data.latestSession ? sessionLoad(data.latestSession) : null;
  const sleep = wellness?.sleepHoursFormatted || (validNumber(wellness?.calculatedSleepHours) ? `${Math.floor(wellness.calculatedSleepHours)}h ${Math.round((wellness.calculatedSleepHours % 1) * 60)}min` : validNumber(wellness?.sleep) ? `${number(wellness.sleep)}h` : 'Não informado');
  return <div className="lb-dashboard-panel space-y-6 min-w-0">
    <header className="flex flex-wrap justify-between items-start gap-3 pb-3 border-b border-slate-800">
      <div><p className="text-xs font-black uppercase tracking-widest text-brand-primary">LB Performance · {isAthlete ? 'Meu dia' : 'Painel do atleta'}</p><h2 className="text-xl sm:text-2xl font-black text-white mt-2 break-words">{isAthlete ? `Olá, ${(athlete.name || 'Atleta').split(' ')[0]}` : athlete.name}</h2><p className="text-xs text-slate-400 mt-1">{athlete.modality || 'Modalidade não informada'}</p></div>
      <span className="text-xs font-bold text-slate-400 inline-flex gap-2 items-center"><CalendarDays className="w-4 h-4" />{metricDateLabel(metricDay(today)!, true)}</span>
    </header>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
      <section data-tone="readiness" className={`${section} ${isAthlete ? 'order-2' : ''}`}>
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4"><h3 className="text-sm font-black text-white uppercase inline-flex gap-2 items-center"><Activity className="w-4 h-4 text-brand-primary" />{isAthlete ? 'Como você está hoje?' : 'Prontidão de hoje'}</h3><span className="text-xs font-bold text-slate-400">{wellness ? 'Respondida hoje' : 'Sem registro hoje'}</span></div>
        {wellness ? <>
          <div className="grid grid-cols-2 gap-4"><Stat label="Prontidão" value={validNumber(wellness.readinessScore) ? `${number(wellness.readinessScore)}%` : 'Não calculada'} /><Stat label="Sono informado" value={sleep} /></div>
          <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-800"><Stat label="Fadiga" value={validNumber(wellness.fatigue) ? `${wellness.fatigue}/10` : '—'} /><Stat label="Dor muscular" value={validNumber(wellness.soreness) ? `${wellness.soreness}/10` : '—'} /></div>
          <details className="mt-4 text-xs text-slate-400"><summary className="cursor-pointer py-2 font-bold text-brand-primary">Ver respostas e sintomas</summary><div className="space-y-2 mt-2"><p>Estresse: {wellness.stress ?? '—'}/10 · Qualidade do sono: {wellness.sleepQuality ?? '—'}/10</p>{athlete.gender === 'F' && wellness.menstrualPhase && wellness.menstrualPhase !== 'Nenhuma' && <p>Fase informada: {wellness.menstrualPhase}</p>}{athlete.gender === 'F' && !!wellness.menstrualSymptoms?.length && <p>Sintomas informados: {wellness.menstrualSymptoms.join(', ')}</p>}</div></details>
        </> : <p className="text-sm text-slate-400">{isAthlete ? 'Preencha sua prontidão para compartilhar como está se sentindo hoje.' : 'O atleta ainda não respondeu à prontidão de hoje.'}</p>}
        <div className="flex flex-wrap gap-2 mt-4">{isAthlete && onAddWellness && <button className={action} onClick={() => wellness && onEditWellness ? onEditWellness(wellness) : onAddWellness()}>{wellness ? 'Atualizar prontidão' : 'Responder prontidão'}</button>}<button className={action} onClick={onOpenReadiness}>Histórico de prontidão</button></div>
      </section>
      <section data-tone="training" className={`${section} ${isAthlete ? 'order-1' : ''}`}>
        <h3 className="text-sm font-black text-white uppercase inline-flex gap-2 items-center mb-4"><Dumbbell className="w-4 h-4 text-brand-primary" />{isAthlete ? 'Seu treino de hoje' : 'Treinos de hoje'}</h3>
        {data.todayWorkouts.length ? <div className="space-y-3">{data.todayWorkouts.map(w => <div key={w.id} className="rounded-2xl bg-slate-900/50 border border-slate-800 p-4 min-w-0"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-black text-white break-words">{w.name || 'Treino'}</p><span className="text-xs text-slate-400">{w.status === 'completed' ? 'Concluído' : w.status === 'in_progress' ? 'Em andamento' : 'Prescrito'}</span></div>{w.phase && <p className="text-xs text-slate-400 mt-2">{w.phase}</p>}{w.trainerNotes && <p className="text-xs text-slate-300 mt-2 whitespace-pre-wrap break-words">{w.trainerNotes}</p>}{isAthlete && w.status !== 'completed' && <button className={`${action} mt-3`} onClick={() => onStartWorkout(w)}>{w.status === 'in_progress' ? 'Continuar treino' : 'Iniciar treino'}<ChevronRight className="w-4 h-4" /></button>}</div>)}</div> : <p className="text-sm text-slate-400">Nenhum treino prescrito para hoje.</p>}
        {onOpenWorkouts && <button className={`${action} mt-4`} onClick={onOpenWorkouts}>{isAthlete ? 'Meus treinos' : 'Ver / prescrever treinos'}</button>}
        {data.latestSession && <div className="mt-5 pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-1"><p className="font-bold">Última sessão concluída · {metricDateLabel(metricDay(data.latestSession.date)!, true)}</p><p>PSE: {validNumber(data.latestSession.rpe) ? `${data.latestSession.rpe}/10` : 'Não informada'} · Duração: {validNumber(data.latestSession.durationMinutes) ? `${data.latestSession.durationMinutes} min` : 'Não informada'}</p><p>Carga interna: {latestLoad === null ? 'Dados incompletos' : `${number(latestLoad)} UA`}</p></div>}
      </section>
    </div>
    {lbx}
    <section data-tone="metrics" className={section}><h3 className="text-sm font-black text-white uppercase mb-2">{isAthlete ? 'Minha evolução' : 'Avaliações essenciais e evolução'}</h3><p className="text-xs text-slate-400 mb-5">Último resultado de cada capacidade. Abra o histórico para acompanhar a evolução.</p><MetricEvolution assessments={athlete.assessments} compact athleteView={isAthlete} /></section>
    <section data-tone="weekly" className={section}>
      <div className="flex flex-wrap justify-between gap-2 mb-5"><h3 className="text-sm font-black text-white uppercase inline-flex gap-2 items-center"><ClipboardCheck className="w-4 h-4 text-brand-primary" />{isAthlete ? 'Minha semana' : 'Resumo da semana'}</h3><span className="text-xs text-slate-400">{metricDateLabel(data.weekStart)} a {metricDateLabel(data.weekEnd)} · até hoje</span></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5"><Stat label="Treinos concluídos" value={`${data.completedCount} de ${data.scheduledCount}`} note="Prescritos até hoje" /><Stat label="Sessões externas" value={data.externalCount} note="Registradas nesta semana" /><Stat label="Carga interna" value={data.load === null ? '—' : `${number(data.load)} UA`} note={`${data.loadCoverage} de ${data.sessionCount} sessões com PSE e duração`} /><Stat label="PSE pendentes" value={data.pendingRpe} note="Sessões já concluídas" /></div>
      {data.previousPending > 0 && <p className="text-xs text-slate-400 mt-4">{data.previousPending} treino(s) de dias anteriores ainda sem conclusão registrada.</p>}
      <details className="mt-5 pt-4 border-t border-slate-800"><summary className="text-xs font-black text-brand-primary cursor-pointer py-2">Ver carga diária</summary>{data.load === null ? <p className="text-xs text-slate-400 py-4">Registre PSE e duração nas sessões concluídas para acompanhar a carga.</p> : <div className="h-48 mt-4 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.dailyLoads} margin={{ left: 0, right: 12, top: 8, bottom: 6 }}><CartesianGrid vertical={false} stroke="#64748b" opacity={0.2} /><XAxis dataKey="time" tickFormatter={t => metricDateLabel(Number(t))} fontSize={11} stroke="#94a3b8" minTickGap={15} /><YAxis width={46} fontSize={11} stroke="#94a3b8" /><Tooltip labelFormatter={t => metricDateLabel(Number(t), true)} formatter={v => [`${number(Number(v))} UA`, 'Carga interna']} contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: 12 }} /><Bar dataKey="load" fill="#10b981" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>}</details>
      <button className={`${action} mt-4`} onClick={onOpenLoad}>{isAthlete ? 'Ver minhas cargas' : 'Monitoramento de carga'}</button>
    </section>
    <section data-tone="goal" className={section}><h3 className="text-sm font-black text-white uppercase inline-flex gap-2 items-center mb-3"><Target className="w-4 h-4 text-brand-primary" />{isAthlete ? 'Meu objetivo' : 'Objetivo do atleta'}</h3><p className="text-sm text-slate-300 whitespace-pre-wrap break-words">{athlete.goal || 'Objetivo ainda não registrado no perfil.'}</p></section>
  </div>;
}
