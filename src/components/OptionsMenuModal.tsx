import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  X,
  Bell,
  Shield,
  UserPlus,
  Settings,
  CreditCard,
  SlidersHorizontal,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Users,
  Trophy,
  LayoutDashboard,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { UserWithPlan, Athlete } from "../types";
import toast from "react-hot-toast";

interface OptionsMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserWithPlan | null;
  selectedAthlete?: Athlete | null;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
  onLogout?: () => void;
  exitSupervision?: () => void;
  supervisedUser?: UserWithPlan | null;
}

const textAlert = (a: any) =>
  a.days_left < 0
    ? `Vencido há ${Math.abs(a.days_left)} dia(s)`
    : a.days_left === 0
    ? "Vence hoje"
    : `Vence em ${a.days_left} dia(s)`;

export default function OptionsMenuModal({
  isOpen,
  onClose,
  user,
  selectedAthlete,
  theme,
  onToggleTheme,
  onLogout,
  exitSupervision,
  supervisedUser,
}: OptionsMenuModalProps) {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState<
    "overview" | "plans" | "supervision" | "invites" | "settings"
  >("overview");

  // Plan Renewal Alerts State
  const [renewalData, setRenewalData] = useState<any>(null);
  const [renewalLoading, setRenewalLoading] = useState(false);
  const [renewalError, setRenewalError] = useState("");
  const [renewalBusy, setRenewalBusy] = useState(false);
  const [renewalMessage, setRenewalMessage] = useState("");

  const apiRenewal = async (path: string, body?: any) => {
    if (!user?.token) return null;
    const r = await fetch("/api/billing/renewals/" + path, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${user.token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const result = await r.json();
    if (!r.ok) throw Error(result.error || "Falha ao carregar avisos de planos");
    return result;
  };

  const loadRenewals = async () => {
    if (!user?.token) return;
    setRenewalLoading(true);
    setRenewalError("");
    try {
      const data = await apiRenewal("alerts");
      setRenewalData(data);
    } catch (e: any) {
      setRenewalError(e.message);
    } finally {
      setRenewalLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user?.token) {
      loadRenewals();
    }
  }, [isOpen, user?.token]);

  const actRenewal = async (path: string, body: any) => {
    setRenewalBusy(true);
    setRenewalError("");
    setRenewalMessage("");
    try {
      await apiRenewal(path, body);
      await loadRenewals();
      setRenewalMessage("Solicitação atualizada com sucesso.");
      toast.success("Solicitação atualizada!");
    } catch (e: any) {
      setRenewalError(e.message);
      toast.error(e.message);
    } finally {
      setRenewalBusy(false);
    }
  };

  const alertCount =
    (renewalData?.alerts?.length || 0) +
    (renewalData?.admin ? renewalData?.requests?.length || 0 : 0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[3500] flex items-center justify-center p-3 sm:p-4 md:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0d121f] border border-slate-750/70 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden text-slate-100 z-10"
        >
          {/* Top Bar / Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-slate-900/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <span>Central de Opções & Gestão</span>
                  {alertCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                      {alertCount} aviso{alertCount > 1 ? "s" : ""}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400">
                  Avisos de planos, supervisão técnica, convites de alunos e configurações do sistema.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/60 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveSubTab("overview")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                activeSubTab === "overview"
                  ? "bg-brand-primary text-slate-950 shadow-md shadow-brand-primary/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Visão Geral</span>
            </button>

            <button
              onClick={() => setActiveSubTab("plans")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 relative ${
                activeSubTab === "plans"
                  ? "bg-brand-primary text-slate-950 shadow-md shadow-brand-primary/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Avisos de Planos</span>
              {alertCount > 0 && (
                <span className={`w-2 h-2 rounded-full ${activeSubTab === "plans" ? "bg-slate-950" : "bg-amber-400 animate-pulse"}`} />
              )}
            </button>

            <button
              onClick={() => setActiveSubTab("supervision")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                activeSubTab === "supervision"
                  ? "bg-brand-primary text-slate-950 shadow-md shadow-brand-primary/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Supervisão</span>
              {(user?.platformAdmin || supervisedUser) && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-500/30 font-bold">
                  PRO
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab("invites")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                activeSubTab === "invites"
                  ? "bg-brand-primary text-slate-950 shadow-md shadow-brand-primary/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Convites & Acessos</span>
            </button>

            <button
              onClick={() => setActiveSubTab("settings")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                activeSubTab === "settings"
                  ? "bg-brand-primary text-slate-950 shadow-md shadow-brand-primary/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configurações</span>
            </button>
          </div>

          {/* Modal Body / Tab Contents */}
          <div className="p-6 overflow-y-auto flex-grow max-h-[calc(92vh-150px)] no-scrollbar space-y-6">
            {/* TAB: OVERVIEW */}
            {activeSubTab === "overview" && (
              <div className="space-y-6">
                {/* Status Hero Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-[#10182b] to-slate-900 border border-slate-800 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-brand-primary/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                    <div>
                      <span className="text-[10px] font-black tracking-widest text-brand-primary uppercase">
                        Sessão Ativa
                      </span>
                      <h3 className="text-xl font-black text-white uppercase mt-0.5">
                        {user?.role === "coach" ? "Conta de Treinador" : "Conta de Atleta"}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Plano: <strong className="text-slate-200 uppercase">{user?.plan || "PRO"}</strong>
                        {user?.organizationId && ` · Org ID: ${user.organizationId.slice(0, 8)}...`}
                      </p>
                    </div>

                    {supervisedUser && (
                      <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span>Supervisão: {supervisedUser.supervisedName || "Treinador"}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Action Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {/* Plan Notices Card */}
                  <button
                    onClick={() => setActiveSubTab("plans")}
                    className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-800/70 border border-slate-800 hover:border-brand-primary/30 transition-all text-left group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
                        <Bell className="w-4 h-4" />
                      </div>
                      {alertCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                          {alertCount} ATIVO{alertCount > 1 ? "S" : ""}
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Em dia
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-white uppercase tracking-wider group-hover:text-brand-primary transition-colors">
                        Avisos de Planos
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {alertCount > 0
                          ? "Há alertas de vencimento ou renovação pendentes."
                          : "Status de faturamento e vigência da assinatura."}
                      </p>
                    </div>
                  </button>

                  {/* Supervision Card */}
                  <button
                    onClick={() => setActiveSubTab("supervision")}
                    className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-800/70 border border-slate-800 hover:border-brand-primary/30 transition-all text-left group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-105 transition-transform">
                        <Shield className="w-4 h-4" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-white uppercase tracking-wider group-hover:text-brand-primary transition-colors">
                        Supervisão Técnica
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {user?.platformAdmin
                          ? "Painel do supervisor de treinadores e organizações."
                          : "Status do vínculo técnico e coordenação."}
                      </p>
                    </div>
                  </button>

                  {/* Invites Card */}
                  <button
                    onClick={() => setActiveSubTab("invites")}
                    className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-800/70 border border-slate-800 hover:border-brand-primary/30 transition-all text-left group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-white uppercase tracking-wider group-hover:text-brand-primary transition-colors">
                        Convites & Alunos
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Gerar e gerenciar acessos de alunos e atletas.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Additional Quick Hub Links */}
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 px-1">
                    Acesso Rápido às Páginas
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {user?.role === "coach" && (
                      <button
                        onClick={() => {
                          onClose();
                          navigate("/configuracoes");
                        }}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-left transition-colors border border-slate-800 hover:border-slate-700"
                      >
                        <div className="flex items-center gap-3">
                          <Settings className="w-4 h-4 text-green-400" />
                          <div>
                            <span className="text-xs font-bold text-white block">Configurações Gerais</span>
                            <span className="text-[10px] text-slate-400">Preferências, logo e perfil</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onClose();
                        navigate("/assinaturas");
                      }}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-left transition-colors border border-slate-800 hover:border-slate-700"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-4 h-4 text-blue-400" />
                        <div>
                          <span className="text-xs font-bold text-white block">Minha Assinatura</span>
                          <span className="text-[10px] text-slate-400">Faturamento, planos e renovação</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>

                    {user?.platformAdmin && (
                      <button
                        onClick={() => {
                          onClose();
                          navigate("/supervisao");
                        }}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-left transition-colors border border-slate-800 hover:border-slate-700"
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="w-4 h-4 text-purple-400" />
                          <div>
                            <span className="text-xs font-bold text-white block">Painel do Supervisor</span>
                            <span className="text-[10px] text-slate-400">Supervisão de múltiplos treinadores</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </button>
                    )}

                    {user?.plan === "pro" && (
                      <button
                        onClick={() => {
                          onClose();
                          navigate("/ranking");
                        }}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-left transition-colors border border-slate-800 hover:border-slate-700"
                      >
                        <div className="flex items-center gap-3">
                          <Trophy className="w-4 h-4 text-amber-400" />
                          <div>
                            <span className="text-xs font-bold text-white block">Ranking de Atletas</span>
                            <span className="text-[10px] text-slate-400">Classificação e métricas</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PLANS & RENEWALS */}
            {activeSubTab === "plans" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
                      <Bell className="w-5 h-5 text-amber-400" />
                      <span>Avisos de Planos & Renovações</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Alertas de vigência nos últimos 7 dias, no vencimento e pós-vencimento. Horário de Brasília.
                    </p>
                  </div>
                  <button
                    onClick={loadRenewals}
                    disabled={renewalLoading}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${renewalLoading ? "animate-spin" : ""}`} />
                    <span>Atualizar</span>
                  </button>
                </div>

                {renewalError && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{renewalError}</span>
                  </div>
                )}

                {renewalMessage && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{renewalMessage}</span>
                  </div>
                )}

                {/* Alerts List */}
                {renewalLoading && !renewalData ? (
                  <div className="p-8 text-center text-slate-400 text-xs font-bold flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-brand-primary" />
                    <span>Carregando avisos de planos...</span>
                  </div>
                ) : renewalData?.alerts?.length > 0 ? (
                  <div className="space-y-3">
                    {renewalData.alerts.map((a: any) => (
                      <div
                        key={a.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          a.days_left <= 1
                            ? "bg-amber-950/20 border-amber-500/40"
                            : "bg-slate-900/80 border-slate-800"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${
                                  a.days_left < 0
                                    ? "bg-red-500"
                                    : a.days_left <= 3
                                    ? "bg-amber-400"
                                    : "bg-emerald-400"
                                }`}
                              />
                              <h4 className="font-bold text-sm text-white">
                                {renewalData.admin ? `${a.username} — ` : ""}
                                {a.plan_name}
                              </h4>
                            </div>
                            <p
                              className={`text-xs mt-1 font-bold ${
                                a.days_left <= 1 ? "text-amber-300" : "text-emerald-300"
                              }`}
                            >
                              {textAlert(a)} · Válido até{" "}
                              {new Date(a.valid_until).toLocaleDateString("pt-BR", {
                                timeZone: "America/Sao_Paulo",
                              })}
                            </p>
                            {!renewalData.admin && a.inherited && (
                              <p className="text-[11px] text-slate-400 mt-1">
                                Seu acesso acompanha a licença da organização do treinador.
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {renewalData.admin ? (
                              <button
                                onClick={() => {
                                  onClose();
                                  navigate("/assinaturas#cobrancas");
                                }}
                                className="px-4 py-2 rounded-xl bg-brand-primary text-slate-950 font-bold text-xs hover:bg-brand-primary/90 transition-all"
                              >
                                Gerenciar Assinatura
                              </button>
                            ) : renewalData.requests?.some((r: any) => r.subscription_id === a.id) ? (
                              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Solicitação enviada
                              </span>
                            ) : (
                              <button
                                disabled={renewalBusy}
                                onClick={() =>
                                  actRenewal("request", {
                                    subscriptionId: a.id,
                                    message:
                                      "Quero renovar meu acesso ou conhecer outro pacote disponível.",
                                  })
                                }
                                className="px-4 py-2 rounded-xl bg-brand-primary text-slate-950 font-black text-xs hover:bg-brand-primary/90 transition-all disabled:opacity-50"
                              >
                                Quero Renovar / Planos
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <h4 className="font-bold text-white text-sm">Nenhum aviso pendente</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Seu plano está com vigência regular. Não há vencimentos imediatos nos próximos 7 dias.
                    </p>
                  </div>
                )}

                {/* Admin Renewal Requests if any */}
                {renewalData?.admin && renewalData?.requests?.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-800">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                      Solicitações de Renovação Recebidas ({renewalData.requests.length})
                    </h4>
                    {renewalData.requests.map((r: any) => (
                      <div
                        key={r.id}
                        className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <h5 className="font-bold text-sm text-white">
                            {r.username} solicita renovação
                          </h5>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              r.status === "contacted"
                                ? "bg-blue-500/20 text-blue-300"
                                : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            {r.status === "contacted" ? "Contato realizado" : "Aguardando contato"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">{r.plan_name}</p>
                        <p className="text-xs text-slate-400 italic">"{r.message}"</p>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <button
                            disabled={renewalBusy}
                            onClick={() => actRenewal(`requests/${r.id}`, { status: "contacted" })}
                            className="px-3 py-1.5 rounded-lg bg-blue-600/30 text-blue-200 border border-blue-500/40 text-xs font-bold hover:bg-blue-600/50"
                          >
                            Marcar contato
                          </button>
                          <button
                            disabled={renewalBusy}
                            onClick={() => {
                              if (window.confirm("Concluir esta solicitação?")) {
                                void actRenewal(`requests/${r.id}`, { status: "closed" });
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600/30 text-emerald-200 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-600/50"
                          >
                            Concluir atendimento
                          </button>
                          <button
                            onClick={() => {
                              onClose();
                              navigate("/assinaturas#cobrancas");
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700"
                          >
                            Registrar pagamento
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      navigate("/assinaturas");
                    }}
                    className="flex items-center gap-2 text-xs font-bold text-brand-primary hover:underline"
                  >
                    <span>Abrir Página Completa de Assinaturas</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB: SUPERVISION */}
            {activeSubTab === "supervision" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
                      <Shield className="w-5 h-5 text-indigo-400" />
                      <span>Supervisão Técnica & Coordenação</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Controle de coordenação técnica, auditoria e supervisão de treinadores.
                    </p>
                  </div>
                </div>

                {supervisedUser ? (
                  <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-3">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                      <Shield className="w-5 h-5" />
                      <span>Modo de Supervisão Ativo — Somente Leitura</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Você está visualizando o aplicativo como <strong>{supervisedUser.supervisedName || "Treinador"}</strong>.
                      As alterações devem ser executadas pelo treinador responsável.
                    </p>
                    {exitSupervision && (
                      <button
                        onClick={() => {
                          exitSupervision();
                          onClose();
                          navigate("/supervisao");
                        }}
                        className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition-all cursor-pointer"
                      >
                        Encerrar Supervisão e Voltar
                      </button>
                    )}
                  </div>
                ) : user?.platformAdmin ? (
                  <div className="p-5 rounded-2xl bg-slate-900 border border-indigo-500/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-6 h-6 text-indigo-400" />
                        <div>
                          <h4 className="font-bold text-white text-sm">Você é Administrador da Plataforma</h4>
                          <p className="text-xs text-slate-400">Acesse o painel central para gerenciar treinadores e organizações vinculadas.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onClose();
                          navigate("/supervisao");
                        }}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center gap-2"
                      >
                        <span>Abrir Painel Supervisor</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-white text-sm">Vínculo de Treinador</h4>
                    <p className="text-xs text-slate-400">
                      Sua conta está integrada à organização técnica do clube/assessoria. Suas prescrições e avaliações são sincronizadas com a coordenação.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: INVITES & ACCESS */}
            {activeSubTab === "invites" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-emerald-400" />
                      <span>Convites de Alunos & Gestão de Acessos</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Crie acessos para seus atletas acessarem o aplicativo com usuário e senha.
                    </p>
                  </div>
                </div>

                {selectedAthlete && user?.role === "coach" && (
                  <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                        Atleta Selecionado no Momento
                      </span>
                      <h4 className="text-base font-black text-white mt-0.5">{selectedAthlete.name}</h4>
                      <p className="text-xs text-slate-400">{selectedAthlete.modality || "Futebol"}</p>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        navigate(`/acessos?athlete=${encodeURIComponent(selectedAthlete.id)}`);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center gap-2 shrink-0"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Gerar Convite para {selectedAthlete.name.split(" ")[0]}</span>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <button
                    onClick={() => {
                      onClose();
                      navigate("/acessos");
                    }}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-left transition-all group"
                  >
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 w-max mb-3 group-hover:scale-105 transition-transform">
                      <Users className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
                      Gerenciador Geral de Acessos
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Visualizar todos os convites pendentes, aceitos, revogar ou reenviar senhas.
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      navigate("/convite");
                    }}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-left transition-all group"
                  >
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 w-max mb-3 group-hover:scale-105 transition-transform">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-white text-sm group-hover:text-blue-300 transition-colors">
                      Página de Aceite de Convite
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Link público onde o atleta define a senha com o token de ativação.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* TAB: SETTINGS & PREFERENCES */}
            {activeSubTab === "settings" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-slate-300" />
                    <span>Configurações do Sistema & Preferências</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Personalize o tema da aplicação, veja dados da conta ou encerre a sessão.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Theme Toggle Button */}
                  {onToggleTheme && (
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">Tema do Sistema</h4>
                          <p className="text-xs text-slate-400">
                            Atualmente: {theme === "dark" ? "Modo Escuro (Dark Pro)" : "Modo Claro (Light)"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={onToggleTheme}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
                      >
                        Alternar para {theme === "dark" ? "Claro" : "Escuro"}
                      </button>
                    </div>
                  )}

                  {/* Coach Settings Link */}
                  {user?.role === "coach" && (
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-green-500/10 text-green-400">
                          <Settings className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">Configurações do Treinador</h4>
                          <p className="text-xs text-slate-400">Personalização de logo, marca e dados cadastrais</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onClose();
                          navigate("/configuracoes");
                        }}
                        className="px-4 py-2 rounded-xl bg-brand-primary text-slate-950 font-bold text-xs hover:bg-brand-primary/90 transition-all"
                      >
                        Abrir Configurações
                      </button>
                    </div>
                  )}

                  {/* Logout Action */}
                  {onLogout && (
                    <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
                          <LogOut className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-red-300 text-sm">Encerrar Sessão</h4>
                          <p className="text-xs text-slate-400">Desconectar do dispositivo atual com segurança</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onClose();
                          onLogout();
                        }}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all"
                      >
                        Sair
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <span>LB Performance System PRO</span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold transition-all"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
