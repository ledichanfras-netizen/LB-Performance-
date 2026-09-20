import React, { useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, CheckCircle2, ClipboardCheck, Dumbbell, Gauge, HeartPulse, Plus, ShieldCheck, Timer, UserRound, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { lbFeatureFlags } from "../metodo-lb/featureFlags";

type AthleteOption = { id: string; name: string; modality?: string };
type CreatedLbSession = { id: string; athlete_id: string; test_type: string; assessed_at?: string; protocol_version: string; quality_flag: string; comparable_to_baseline: boolean };
type CreatedSession = { id: string; athlete_id: string; test_type: string; assessed_at?: string; protocol_version: string; quality_flag: string; comparable_to_baseline: boolean };
type ActiveSession = { sessionGroupId: string; sessions: CreatedSession[] };
type MetricInput = { metricCode: string; label: string; unit: string; valueNumeric: string };

const TESTS = [
  { code: "IMTP", label: "IMTP", icon: Dumbbell, description: "Força máxima, impulso e TDF" },
  { code: "CMJ", label: "CMJ", icon: Zap, description: "Salto e potência neuromuscular" },
  { code: "DROP_JUMP", label: "Drop Jump", icon: Activity, description: "RSI e estratégia reativa" },
  { code: "ISOMETRIC_STRENGTH", label: "Força Q/I", icon: ShieldCheck, description: "Força bilateral e assimetrias" },
  { code: "SPEED", label: "Velocidade", icon: Timer, description: "Sprint e perfil de aceleração" },
  { code: "VO2", label: "VO₂", icon: HeartPulse, description: "Capacidade cardiorrespiratória" },
  { code: "BIOIMPEDANCE", label: "Bioimpedância", icon: Gauge, description: "Composição corporal" },
] as const;

const METRIC_TEMPLATES: Record<string, Array<{ metricCode: string; label: string; unit: string }>> = {
  IMTP: [
    { metricCode: "PEAK_FORCE", label: "Força pico", unit: "N" },
    { metricCode: "IMPULSE", label: "Impulso", unit: "N·s" },
    { metricCode: "RFD", label: "TDF", unit: "N/s" },
  ],
  CMJ: [
    { metricCode: "JUMP_HEIGHT", label: "Altura do salto", unit: "cm" },
    { metricCode: "PEAK_POWER", label: "Potência pico", unit: "W" },
  ],
  DROP_JUMP: [
    { metricCode: "JUMP_HEIGHT", label: "Altura do salto", unit: "cm" },
    { metricCode: "CONTACT_TIME", label: "Tempo de contato", unit: "ms" },
    { metricCode: "RSI", label: "RSI", unit: "" },
  ],
  ISOMETRIC_STRENGTH: [
    { metricCode: "RIGHT_FORCE", label: "Força direita", unit: "kgf" },
    { metricCode: "LEFT_FORCE", label: "Força esquerda", unit: "kgf" },
    { metricCode: "ASYMMETRY", label: "Assimetria", unit: "%" },
  ],
  SPEED: [
    { metricCode: "TIME_20M", label: "Tempo 20 m", unit: "s" },
    { metricCode: "TIME_30M", label: "Tempo 30 m", unit: "s" },
  ],
  VO2: [
    { metricCode: "VO2MAX", label: "VO₂max", unit: "ml/kg/min" },
    { metricCode: "VVO2MAX", label: "vVO₂max", unit: "km/h" },
  ],
  BIOIMPEDANCE: [
    { metricCode: "BODY_MASS", label: "Massa corporal", unit: "kg" },
    { metricCode: "BODY_FAT", label: "Gordura corporal", unit: "%" },
    { metricCode: "MUSCLE_MASS", label: "Massa muscular", unit: "kg" },
  ],
};

const QUALITY = [
  { value: "VALID", label: "Válido", note: "Condições adequadas para interpretação." },
  { value: "CAUTION", label: "Atenção", note: "Interpretar com ressalvas registradas." },
  { value: "NON_COMPARABLE", label: "Não comparável", note: "Não usar comparação automática com baseline." },
  { value: "REPEAT", label: "Repetir", note: "Qualidade insuficiente para decisão." },
] as const;

const readStoredUser = () => {
  try { return JSON.parse(localStorage.getItem("lb_user") || "null"); } catch { return null; }
};

export default function LbAssessmentSession() {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<AthleteOption[]>([]);
  const [athleteId, setAthleteId] = useState("");
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [qualityFlag, setQualityFlag] = useState("VALID");
  const [protocolVersion, setProtocolVersion] = useState("LB v1.0");
  const [device, setDevice] = useState("");
  const [operator, setOperator] = useState("Prof. Leandro Barbosa");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [sessionGroupId, setSessionGroupId] = useState("");
  const [createdSessions, setCreatedSessions] = useState<CreatedLbSession[]>([]);
  const [activeTestId, setActiveTestId] = useState("");
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [metricInputs, setMetricInputs] = useState<MetricInput[]>([]);
  const [completedSessionIds, setCompletedSessionIds] = useState<string[]>([]);
  const [savingMetrics, setSavingMetrics] = useState(false);
  const [interpretMode, setInterpretMode] = useState(false);
  const [interpretSessions, setInterpretSessions] = useState<any[]>([]);
  const [loadingInterpret, setLoadingInterpret] = useState(false);

  useEffect(() => {
    const load = async () => {
      const user = readStoredUser();
      if (!user?.token) { setLoadError("Sessão expirada. Faça login novamente."); setLoading(false); return; }
      try {
        const response = await fetch("/api/ler", { headers: { Authorization: `Bearer ${user.token}` } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.athletes) ? data.athletes : [];
        setAthletes(list.map((a: any) => ({ id: a.id, name: a.name || "Atleta", modality: a.modality })));
        if (list.length === 1) setAthleteId(list[0].id);
      } catch (error: any) {
        setLoadError(`Não foi possível carregar os atletas: ${error?.message || "erro desconhecido"}`);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const athlete = useMemo(() => athletes.find(a => a.id === athleteId), [athletes, athleteId]);
  const toggleTest = (code: string) => setSelectedTests(prev => prev.includes(code) ? prev.filter(x => x !== code) : [...prev, code]);
  const canContinue = Boolean(athleteId && selectedTests.length && protocolVersion.trim());

  const startSession = async () => {
    if (!canContinue || saving) return;
    const user = readStoredUser();
    if (!user?.token) { setLoadError("Sessão expirada. Faça login novamente."); return; }
    setSaving(true);
    setLoadError("");
    setSaveMessage("");
    try {
      const response = await fetch("/api/lb/assessment-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          athleteId,
          testTypes: selectedTests,
          protocolVersion,
          qualityFlag,
          comparableToBaseline: qualityFlag === "VALID" || qualityFlag === "CAUTION",
          device,
          operatorName: operator,
          notes,
          context: { source: "lb-assessment-session-ui", methodStage: "AVALIAR" }
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
      const createdSession = { sessionGroupId: payload.sessionGroupId, sessions: payload.sessions || [] };
      setActiveSession(createdSession);
      setSaveMessage(`Sessão LB iniciada com ${createdSession.sessions.length || selectedTests.length} avaliação(ões).`);
    } catch (error: any) {
      setLoadError(`Não foi possível iniciar a Sessão LB: ${error?.message || "erro desconhecido"}`);
    } finally {
      setSaving(false);
    }
  };


  const openAssessment = (session: CreatedSession) => {
    const template = METRIC_TEMPLATES[session.test_type] || [{ metricCode: "RESULT", label: "Resultado", unit: "" }];
    setMetricInputs(template.map(item => ({ ...item, valueNumeric: "" })));
    setEditingSessionId(session.id);
    setLoadError("");
    setSaveMessage("");
  };

  const saveMetrics = async () => {
    if (!editingSessionId || savingMetrics) return;
    const user = readStoredUser();
    if (!user?.token) { setLoadError("Sessão expirada. Faça login novamente."); return; }
    const filled = metricInputs.filter(m => m.valueNumeric.trim() !== "");
    if (!filled.length) { setLoadError("Preencha ao menos uma métrica antes de salvar."); return; }
    setSavingMetrics(true);
    setLoadError("");
    try {
      const response = await fetch(`/api/lb/assessment-sessions/${encodeURIComponent(editingSessionId)}/metrics`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ metrics: filled.map(m => ({ metricCode: m.metricCode, valueNumeric: m.valueNumeric, unit: m.unit, isValid: true })) })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
      setCompletedSessionIds(prev => prev.includes(editingSessionId) ? prev : [...prev, editingSessionId]);
      setSaveMessage(`${payload.metrics?.length || filled.length} métrica(s) salvas no núcleo LB.`);
      setEditingSessionId(null);
      setMetricInputs([]);
    } catch (error: any) {
      setLoadError(`Não foi possível salvar a avaliação: ${error?.message || "erro desconhecido"}`);
    } finally { setSavingMetrics(false); }
  };



  const openInterpretation = async () => {
    if (!activeSession?.sessionGroupId || loadingInterpret) return;
    const user = readStoredUser();
    if (!user?.token) { setLoadError("Sessão expirada. Faça login novamente."); return; }
    setLoadingInterpret(true);
    setLoadError("");
    try {
      const response = await fetch(`/api/lb/assessment-sessions/${encodeURIComponent(activeSession.sessionGroupId)}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
      setInterpretSessions(payload.sessions || []);
      setInterpretMode(true);
    } catch (error: any) {
      setLoadError(`Não foi possível abrir INTERPRETAR: ${error?.message || "erro desconhecido"}`);
    } finally { setLoadingInterpret(false); }
  };

  const interpretationAlerts = useMemo(() => {
    const alerts: string[] = [];
    for (const session of interpretSessions) {
      const metrics = Array.isArray(session.metrics) ? session.metrics : [];
      const byCode = Object.fromEntries(metrics.map((m:any) => [m.metricCode, Number(m.valueNumeric)]));
      if (session.test_type === "ISOMETRIC_STRENGTH" && Number.isFinite(byCode.RIGHT_FORCE) && Number.isFinite(byCode.LEFT_FORCE) && Number.isFinite(byCode.ASYMMETRY)) {
        const maxForce = Math.max(Math.abs(byCode.RIGHT_FORCE), Math.abs(byCode.LEFT_FORCE));
        if (maxForce > 0) {
          const derived = Math.abs(byCode.RIGHT_FORCE - byCode.LEFT_FORCE) / maxForce * 100;
          if (Math.abs(derived - byCode.ASYMMETRY) > 1) alerts.push(`Força Q/I: assimetria informada (${byCode.ASYMMETRY.toFixed(1)}%) difere do cálculo simples pelo maior lado (${derived.toFixed(1)}%). Revisar fórmula/protocolo antes de interpretar.`);
        }
      }
      if (session.test_type === "IMTP") {
        const peak = metrics.find((m:any) => m.metricCode === "PEAK_FORCE");
        if (peak && peak.unit === "N" && Number(peak.valueNumeric) > 0 && Number(peak.valueNumeric) < 300) alerts.push("IMTP: Força pico está registrada em N com magnitude incomum para força total. Confirmar unidade/origem do valor antes de qualquer conclusão.");
      }
    }
    return alerts;
  }, [interpretSessions]);

  if (createdSessions.length > 0) {
    const completedCount = 0;
    const active = createdSessions.find(s => s.id === activeTestId) || createdSessions[0];
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <header className="border-b border-slate-800 bg-slate-950/95 sticky top-0 z-20 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
            <button onClick={() => navigate("/hub")} className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest"><ArrowLeft className="w-4 h-4"/> Hub</button>
            <div className="text-right"><p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.3em]">Sessão LB em andamento</p><h1 className="text-lg md:text-xl font-black uppercase italic">{athlete?.name || "Atleta"}</h1></div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
          <section className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-slate-900 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div><p className="text-xs font-black text-emerald-400 uppercase tracking-[0.25em]">AVALIAR • sessão criada</p><h2 className="text-2xl md:text-3xl font-black mt-2">{createdSessions.length} avaliações preparadas</h2><p className="text-slate-400 mt-2">A estrutura da sessão já foi salva. Abra cada teste para registrar suas métricas.</p></div>
              <div className="min-w-44 rounded-2xl bg-slate-950 border border-slate-800 p-4"><p className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Progresso</p><p className="text-2xl font-black mt-1">{completedCount}/{createdSessions.length}</p><div className="h-2 rounded-full bg-slate-800 mt-3 overflow-hidden"><div className="h-full bg-emerald-400" style={{width: `${createdSessions.length ? completedCount/createdSessions.length*100 : 0}%`}} /></div></div>
            </div>
          </section>
          {saveMessage && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-center gap-3"><CheckCircle2 className="w-5 h-5 shrink-0"/>{saveMessage}</div>}
          <section className="grid lg:grid-cols-[.8fr_1.2fr] gap-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 h-fit">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Avaliações da sessão</p>
              <div className="space-y-3">{createdSessions.map((session, index) => {
                const test = TESTS.find(t => t.code === session.test_type);
                const Icon = test?.icon || ClipboardCheck;
                const selected = active.id === session.id;
                return <button key={session.id} onClick={()=>setActiveTestId(session.id)} className={`w-full p-4 rounded-2xl border text-left transition-all ${selected ? "border-emerald-400 bg-emerald-400/10" : "border-slate-800 bg-slate-950"}`}><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selected ? "bg-emerald-400 text-slate-950" : "bg-slate-900 text-slate-400"}`}><Icon className="w-5 h-5"/></div><div className="min-w-0"><p className="font-black text-sm">{index+1}. {test?.label || session.test_type}</p><p className="text-[10px] text-amber-400 font-black uppercase tracking-wider mt-1">Pendente</p></div></div></button>
              })}</div>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">Avaliação selecionada</p>
              <h3 className="text-2xl font-black mt-2">{TESTS.find(t=>t.code===active.test_type)?.label || active.test_type}</h3>
              <p className="text-slate-400 mt-2">{TESTS.find(t=>t.code===active.test_type)?.description}</p>
              <div className="grid sm:grid-cols-2 gap-3 mt-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Protocolo</p><p className="font-black mt-2">{active.protocol_version}</p></div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Qualidade</p><p className="font-black mt-2">{QUALITY.find(q=>q.value===active.quality_flag)?.label || active.quality_flag}</p></div>
              </div>
              <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-6 text-center">
                <ClipboardCheck className="w-9 h-9 text-emerald-400 mx-auto"/>
                <h4 className="font-black mt-3">Registro de métricas</h4>
                <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">Esta sessão já está persistida no núcleo LB. O formulário específico de {TESTS.find(t=>t.code===active.test_type)?.label || active.test_type} será conectado nesta etapa.</p>
                <button disabled className="mt-5 px-5 py-3 rounded-xl bg-slate-800 text-slate-500 font-black uppercase tracking-widest text-xs cursor-not-allowed">Inserir resultados — próximo passo</button>
              </div>
              <div className="mt-6 flex flex-wrap gap-3"><button onClick={()=>{setCreatedSessions([]);setSessionGroupId("");setActiveTestId("");setSelectedTests([]);setSaveMessage("");}} className="px-4 py-3 rounded-xl border border-slate-700 text-xs font-black uppercase tracking-widest hover:border-slate-500">Nova sessão</button><span className="self-center text-[10px] text-slate-600">ID do grupo: {sessionGroupId || "registrado"}</span></div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (!lbFeatureFlags.coreWorkflow) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6"><div className="max-w-lg text-center"><ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-4"/><h1 className="text-2xl font-black uppercase">Método LB protegido</h1><p className="text-slate-400 mt-3">O módulo AVALIAR ainda não está habilitado neste ambiente.</p></div></div>;
  }


  if (activeSession) {
    const testLabel = (code: string) => TESTS.find(t => t.code === code)?.label || code;

    if (interpretMode) {
      return (
        <div className="min-h-screen bg-slate-950 text-white">
          <header className="border-b border-slate-800 bg-slate-950/95 sticky top-0 z-20 backdrop-blur">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
              <button onClick={() => setInterpretMode(false)} className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest"><ArrowLeft className="w-4 h-4"/> AVALIAR</button>
              <div className="text-right"><p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.3em]">Método LB Performance</p><h1 className="text-lg md:text-xl font-black uppercase italic">INTERPRETAR</h1></div>
            </div>
          </header>
          <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
            <section className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-slate-900 p-6 md:p-8">
              <p className="text-xs font-black text-emerald-400 uppercase tracking-[0.25em]">INTERPRETAR • etapa 2</p>
              <h2 className="text-2xl md:text-3xl font-black mt-2">Do número para a evidência.</h2>
              <p className="text-slate-400 mt-2 max-w-3xl">Primeiro validamos coerência, unidade, comparabilidade e limitações. Nenhum número isolado vira diagnóstico ou decisão automaticamente.</p>
            </section>
            {interpretationAlerts.length > 0 && <section className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-amber-300">Revisar antes de interpretar</p><div className="mt-3 space-y-2">{interpretationAlerts.map((a,i)=><p key={i} className="text-sm text-amber-100">• {a}</p>)}</div></section>}
            <section className="grid md:grid-cols-2 gap-4">
              {interpretSessions.map((session:any) => <div key={session.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Avaliação</p><h3 className="text-xl font-black mt-1">{testLabel(session.test_type)}</h3></div><span className="text-[9px] px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-black uppercase">{session.quality_flag}</span></div>
                <div className="mt-4 space-y-2">{(session.metrics || []).map((m:any)=><div key={m.id} className="flex items-center justify-between gap-4 rounded-xl bg-slate-950 border border-slate-800 px-4 py-3"><span className="text-xs text-slate-400">{m.metricCode}</span><span className="font-black">{m.valueNumeric ?? m.valueText} <span className="text-xs text-slate-500">{m.unit || ""}</span></span></div>)}</div>
                <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-500">Comparabilidade: <span className="text-white font-bold">{session.comparable_to_baseline ? "elegível" : "bloqueada"}</span></div>
              </div>)}
            </section>
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status da interpretação</p>
              <h3 className="text-xl font-black mt-2">{interpretationAlerts.length ? "Revisão técnica necessária" : "Dados coerentes para análise contextual"}</h3>
              <p className="text-sm text-slate-400 mt-2">A próxima camada adicionará comparador, ruído/MDC quando disponível, contexto esportivo, convergência entre testes, confiança e conclusão — antes de liberar DECIDIR.</p>
            </section>
          </main>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <header className="border-b border-slate-800 bg-slate-950/95 sticky top-0 z-20 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
            <button onClick={() => navigate("/hub")} className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest"><ArrowLeft className="w-4 h-4"/> Hub</button>
            <div className="text-right"><p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.3em]">Sessão em andamento</p><h1 className="text-lg md:text-xl font-black uppercase italic">LB Performance • AVALIAR</h1></div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
          <section className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div><p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">Sessão criada com sucesso</p><h2 className="text-2xl md:text-3xl font-black mt-2">{athlete?.name || "Atleta"}</h2><p className="text-slate-400 mt-1">{activeSession.sessions.length} avaliações • {protocolVersion} • {QUALITY.find(q=>q.value===qualityFlag)?.label}</p></div>
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-950 border border-emerald-500/20"><CheckCircle2 className="w-5 h-5 text-emerald-400"/><span className="text-xs font-black uppercase tracking-wider">Núcleo LB conectado</span></div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between gap-4 mb-5"><div><p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Bateria da sessão</p><h3 className="font-black text-xl mt-1">Avaliações selecionadas</h3></div><span className="text-xs text-slate-500">{completedSessionIds.length}/{activeSession.sessions.length} preenchidas</span></div>
            <div className="grid md:grid-cols-2 gap-3">
              {activeSession.sessions.map((session, index) => {
                const def = TESTS.find(t => t.code === session.test_type);
                const Icon = def?.icon || Activity;
                return <div key={session.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <div className="flex items-start gap-4"><div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><Icon className="w-5 h-5"/></div><div className="flex-1"><div className="flex items-center justify-between gap-3"><h4 className="font-black">{index + 1}. {testLabel(session.test_type)}</h4><span className={`text-[9px] px-2 py-1 rounded-full border font-black uppercase ${completedSessionIds.includes(session.id) ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-amber-500/10 border-amber-500/20 text-amber-300"}`}>{completedSessionIds.includes(session.id) ? "Preenchido" : "Pendente"}</span></div><p className="text-xs text-slate-500 mt-1">{def?.description || "Avaliação de performance"}</p></div></div>
                  <button onClick={() => openAssessment(session)} className="w-full mt-4 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20">{completedSessionIds.includes(session.id) ? "Editar resultados" : "Abrir avaliação"}</button>
                </div>
              })}
            </div>
          </section>

          {editingSessionId && (() => {
            const current = activeSession.sessions.find(s => s.id === editingSessionId);
            return <section className="rounded-3xl border border-emerald-500/30 bg-slate-900 p-6">
              <div className="flex items-center justify-between gap-4 mb-5"><div><p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Coleta de métricas</p><h3 className="text-xl font-black mt-1">{current ? testLabel(current.test_type) : "Avaliação"}</h3></div><button onClick={()=>{setEditingSessionId(null);setMetricInputs([])}} className="text-xs text-slate-400 hover:text-white">Fechar</button></div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{metricInputs.map((m,index)=><label key={m.metricCode} className="space-y-2"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{m.label}</span><div className="flex"><input inputMode="decimal" value={m.valueNumeric} onChange={e=>setMetricInputs(prev=>prev.map((item,i)=>i===index?{...item,valueNumeric:e.target.value.replace(",",".")}:item))} className="min-w-0 flex-1 bg-slate-950 border border-slate-700 rounded-l-xl px-4 py-3 text-sm outline-none focus:border-emerald-400" placeholder="0"/><span className="px-3 py-3 bg-slate-800 border border-l-0 border-slate-700 rounded-r-xl text-xs text-slate-400">{m.unit || "valor"}</span></div></label>)}</div>
              <div className="flex flex-col sm:flex-row gap-3 mt-6"><button onClick={saveMetrics} disabled={savingMetrics} className="px-5 py-3 rounded-xl bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-widest disabled:opacity-40">{savingMetrics ? "Salvando..." : "Salvar resultados"}</button><p className="text-[10px] text-slate-500 self-center">Os valores são armazenados como métricas brutas. A interpretação será uma etapa separada.</p></div>
            </section>
          })()}

          <section className="grid md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-[10px] text-slate-500 uppercase font-black">Qualidade</p><p className="font-black mt-1">{QUALITY.find(q=>q.value===qualityFlag)?.label}</p></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-[10px] text-slate-500 uppercase font-black">Comparabilidade</p><p className="font-black mt-1">{qualityFlag==="VALID"||qualityFlag==="CAUTION" ? "Elegível para análise" : "Bloqueada"}</p></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-[10px] text-slate-500 uppercase font-black">Próxima fase</p><p className="font-black mt-1 text-emerald-400">Coletar métricas</p></div>
          </section>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={openInterpretation} disabled={completedSessionIds.length !== activeSession.sessions.length || loadingInterpret} className="px-5 py-3 rounded-xl bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed">{loadingInterpret ? "Carregando..." : "Concluir AVALIAR → INTERPRETAR"}</button>
            <button onClick={() => { setActiveSession(null); setSelectedTests([]); setSaveMessage(""); }} className="px-5 py-3 rounded-xl border border-slate-700 text-xs font-black uppercase tracking-widest">Nova Sessão</button>
            <button onClick={() => navigate("/hub")} className="px-5 py-3 rounded-xl bg-slate-800 text-xs font-black uppercase tracking-widest">Voltar ao Hub</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950/95 sticky top-0 z-20 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <button onClick={() => navigate("/hub")} className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest"><ArrowLeft className="w-4 h-4"/> Hub</button>
          <div className="text-right"><p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.3em]">Método LB Performance</p><h1 className="text-lg md:text-xl font-black uppercase italic">Sessão de Avaliação</h1></div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <section className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-slate-900 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-400 text-slate-950 flex items-center justify-center shrink-0"><ClipboardCheck className="w-6 h-6"/></div>
            <div><p className="text-xs font-black text-emerald-400 uppercase tracking-[0.25em]">AVALIAR</p><h2 className="text-2xl md:text-3xl font-black mt-1">Qualidade antes da interpretação.</h2><p className="text-slate-400 mt-2 max-w-3xl">Organize os testes em uma única sessão, registre protocolo e contexto e defina se os dados são comparáveis antes de qualquer decisão.</p></div>
          </div>
        </section>

        {loadError && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{loadError}</div>}
        {saveMessage && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-center gap-3"><CheckCircle2 className="w-5 h-5 shrink-0"/>{saveMessage}</div>}

        <section className="grid lg:grid-cols-[1.35fr_.65fr] gap-6">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-center gap-3 mb-5"><UserRound className="w-5 h-5 text-emerald-400"/><h3 className="font-black uppercase tracking-wider">1. Atleta e contexto</h3></div>
              <div className="grid md:grid-cols-2 gap-4">
                <label className="space-y-2"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Atleta</span><select disabled={loading} value={athleteId} onChange={e=>setAthleteId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400"><option value="">{loading ? "Carregando..." : "Selecione"}</option>{athletes.map(a=><option key={a.id} value={a.id}>{a.name}{a.modality ? ` • ${a.modality}` : ""}</option>)}</select></label>
                <label className="space-y-2"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Versão do protocolo</span><input value={protocolVersion} onChange={e=>setProtocolVersion(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400"/></label>
                <label className="space-y-2"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Equipamento</span><input value={device} onChange={e=>setDevice(e.target.value)} placeholder="Ex.: célula de carga, plataforma..." className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400"/></label>
                <label className="space-y-2"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Avaliador</span><input value={operator} onChange={e=>setOperator(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400"/></label>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-center justify-between gap-3 mb-5"><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">2. Bateria</p><h3 className="font-black uppercase tracking-wider mt-1">Selecione os testes</h3></div><span className="text-xs font-black text-emerald-400">{selectedTests.length} selecionado(s)</span></div>
              <div className="grid sm:grid-cols-2 gap-3">{TESTS.map(test=>{const Icon=test.icon; const active=selectedTests.includes(test.code); return <button key={test.code} onClick={()=>toggleTest(test.code)} className={`text-left p-4 rounded-2xl border transition-all ${active ? "bg-emerald-400/10 border-emerald-400" : "bg-slate-950 border-slate-800 hover:border-slate-600"}`}><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? "bg-emerald-400 text-slate-950" : "bg-slate-900 text-slate-400"}`}><Icon className="w-5 h-5"/></div><div><p className="font-black text-sm">{test.label}</p><p className="text-[11px] text-slate-500 mt-1">{test.description}</p></div>{active && <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto"/>}</div></button>})}</div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">3. Qualidade da sessão</p>
              <div className="grid sm:grid-cols-2 gap-3 mt-4">{QUALITY.map(q=><button key={q.value} onClick={()=>setQualityFlag(q.value)} className={`p-4 rounded-2xl border text-left ${qualityFlag===q.value ? "border-emerald-400 bg-emerald-400/10" : "border-slate-800 bg-slate-950"}`}><p className="font-black text-sm">{q.label}</p><p className="text-[11px] text-slate-500 mt-1">{q.note}</p></button>)}</div>
              <label className="block mt-4 space-y-2"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Observações / limitações</span><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400 resize-none" placeholder="Condições do teste, dor, fadiga, alteração de protocolo, ambiente..."/></label>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 h-fit rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">Resumo da Sessão</p>
            <div className="mt-5 space-y-4 text-sm">
              <div className="pb-4 border-b border-slate-800"><p className="text-slate-500 text-xs">Atleta</p><p className="font-black mt-1">{athlete?.name || "Não selecionado"}</p><p className="text-xs text-slate-500">{athlete?.modality || "Modalidade não informada"}</p></div>
              <div className="pb-4 border-b border-slate-800"><p className="text-slate-500 text-xs">Testes</p><div className="flex flex-wrap gap-2 mt-2">{selectedTests.length ? selectedTests.map(t=><span key={t} className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-black">{t}</span>) : <span className="text-slate-600">Nenhum teste selecionado</span>}</div></div>
              <div className="pb-4 border-b border-slate-800"><p className="text-slate-500 text-xs">Qualidade</p><p className="font-black mt-1">{QUALITY.find(q=>q.value===qualityFlag)?.label}</p></div>
              <div><p className="text-slate-500 text-xs">Comparabilidade automática</p><p className={`font-black mt-1 ${qualityFlag==="VALID"||qualityFlag==="CAUTION" ? "text-emerald-400" : "text-amber-400"}`}>{qualityFlag==="VALID"||qualityFlag==="CAUTION" ? "Pode ser avaliada" : "Bloqueada por qualidade"}</p></div>
            </div>
            <button disabled={!canContinue || saving} onClick={startSession} className="w-full mt-6 py-4 rounded-2xl bg-emerald-400 text-slate-950 font-black uppercase tracking-widest text-xs disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"><Plus className="w-4 h-4"/> {saving ? "Criando Sessão..." : "Iniciar Sessão LB"}</button>
            <p className="text-[10px] text-slate-600 mt-3 leading-relaxed">A sessão é gravada exclusivamente pelo servidor no núcleo privado LB. Os registros legados permanecem intactos.</p>
          </aside>
        </section>
      </main>
    </div>
  );
}
