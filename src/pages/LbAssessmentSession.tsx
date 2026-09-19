import React, { useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, CheckCircle2, ClipboardCheck, Dumbbell, Gauge, HeartPulse, Plus, ShieldCheck, Timer, UserRound, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { lbFeatureFlags } from "../metodo-lb/featureFlags";

type AthleteOption = { id: string; name: string; modality?: string };
type ActiveLbSession = {
  sessionGroupId: string;
  sessions: Array<{ id: string; test_type: string; quality_flag: string; protocol_version: string }>;
};

const TESTS = [
  { code: "IMTP", label: "IMTP", icon: Dumbbell, description: "Força máxima, impulso e TDF" },
  { code: "CMJ", label: "CMJ", icon: Zap, description: "Salto e potência neuromuscular" },
  { code: "DROP_JUMP", label: "Drop Jump", icon: Activity, description: "RSI e estratégia reativa" },
  { code: "ISOMETRIC_STRENGTH", label: "Força Q/I", icon: ShieldCheck, description: "Força bilateral e assimetrias" },
  { code: "SPEED", label: "Velocidade", icon: Timer, description: "Sprint e perfil de aceleração" },
  { code: "VO2", label: "VO₂", icon: HeartPulse, description: "Capacidade cardiorrespiratória" },
  { code: "BIOIMPEDANCE", label: "Bioimpedância", icon: Gauge, description: "Composição corporal" },
] as const;

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
  const [activeSession, setActiveSession] = useState<ActiveLbSession | null>(null);

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

  if (!lbFeatureFlags.coreWorkflow) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6"><div className="max-w-lg text-center"><ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-4"/><h1 className="text-2xl font-black uppercase">Método LB protegido</h1><p className="text-slate-400 mt-3">O módulo AVALIAR ainda não está habilitado neste ambiente.</p></div></div>;
  }

  if (activeSession) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <header className="border-b border-slate-800 bg-slate-950/95 sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
            <button onClick={() => navigate("/hub")} className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest"><ArrowLeft className="w-4 h-4"/> Hub</button>
            <div className="text-right"><p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.3em]">Método LB • AVALIAR</p><h1 className="text-lg md:text-xl font-black uppercase italic">Sessão em andamento</h1></div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
          <section className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 md:p-8">
            <div className="flex items-start gap-4"><div className="w-12 h-12 rounded-2xl bg-emerald-400 text-slate-950 flex items-center justify-center shrink-0"><CheckCircle2 className="w-6 h-6"/></div><div><p className="text-xs font-black text-emerald-400 uppercase tracking-[0.25em]">Sessão iniciada</p><h2 className="text-2xl md:text-3xl font-black mt-1">{athlete?.name || "Atleta"}</h2><p className="text-slate-400 mt-2">Agora registre cada avaliação da bateria. O núcleo LB já preservou o contexto e a qualidade desta sessão.</p></div></div>
          </section>
          <section className="grid md:grid-cols-2 gap-4">
            {activeSession.sessions.map((session, index) => {
              const test = TESTS.find(t => t.code === session.test_type);
              const Icon = test?.icon || ClipboardCheck;
              return <div key={session.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-start gap-4"><div className="w-11 h-11 rounded-xl bg-slate-950 text-emerald-400 flex items-center justify-center"><Icon className="w-5 h-5"/></div><div className="flex-1"><div className="flex justify-between gap-3"><div><p className="font-black text-lg">{test?.label || session.test_type}</p><p className="text-xs text-slate-500 mt-1">{test?.description}</p></div><span className="h-fit px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[9px] font-black uppercase tracking-wider">Pendente</span></div>
                <div className="mt-5 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-xl bg-slate-950 p-3"><p className="text-slate-600 uppercase font-black">Protocolo</p><p className="text-slate-300 mt-1">{session.protocol_version}</p></div><div className="rounded-xl bg-slate-950 p-3"><p className="text-slate-600 uppercase font-black">Qualidade</p><p className="text-slate-300 mt-1">{QUALITY.find(q=>q.value===session.quality_flag)?.label || session.quality_flag}</p></div></div>
                <button onClick={() => setSaveMessage(`${test?.label || session.test_type}: formulário específico será conectado à avaliação legada na próxima etapa.`)} className="w-full mt-4 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20">Abrir avaliação {index + 1}</button></div></div>
              </div>;
            })}
          </section>
          {saveMessage && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">{saveMessage}</div>}
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => { setActiveSession(null); setSelectedTests([]); setSaveMessage(""); }} className="px-5 py-3 rounded-xl border border-slate-700 text-slate-300 text-xs font-black uppercase tracking-widest">Nova Sessão</button>
            <button disabled className="px-5 py-3 rounded-xl bg-slate-800 text-slate-500 text-xs font-black uppercase tracking-widest cursor-not-allowed">INTERPRETAR • após concluir avaliações</button>
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
