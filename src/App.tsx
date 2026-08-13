import React, { FC, useState, useMemo, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area,
  Cell,
  ReferenceLine,
  Label,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
} from "recharts";
import { useAthletes } from "./hooks";
import {
  Athlete,
  WellnessEntry,
  Workout,
  AssessmentType,
  PrescribedExercise,
  ExerciseSet,
  ExternalSession,
  Bioimpedance,
  IsometricStrength,
  Imtp,
  Cmj,
  DropJump,
  Vo2max,
  Speed,
  InjuryEntry,
  ImtpAiDetails,
  MuscleAssessmentDetails,
} from "./types";
import {
  calculateAge,
  formatDate,
  getAsymmetryStatus,
  getIQRatioStatus,
  calculateFlightTimeFromHeight,
  calculateHeightFromFlightTime,
  calculateCMJPakPower,
  calculateCMJAverageForce,
  calculateRSI,
  calculateReadiness,
  getReadinessInsight,
  getDiff,
  getPreviousAssessment,
  calculatePerformanceScore,
  getInjuryRiskLevel,
  calculateACWR,
  calculateWorkoutInternalLoad,
  calculateWeeklyEvolution,
  getFatPercentageClassification,
  getFatRangesByAgeAndGender,
  getSafeDateTime,
  getLocalDateString,
  formatCompetitiveLevel,
  calculateSleepHoursFromTimes,
  formatSleepHours,
  safeParseFloat,
} from "./utils";
import {
  generateAIModeling,
  PerformanceModeling,
  generateImtpAiAnalysis,
} from "./services/aiPerformanceService";
import { AIModelingReport } from "./components/AIModelingReport";
import { TrainingLoadReport } from "./components/TrainingLoadReport";
import { HealthReport } from "./components/HealthReport";
import { PremiumHub } from "./components/PremiumHub";
import { AthleteGuide } from "./components/AthleteGuide";
import { WorkoutEditorPremium } from "./components/WorkoutEditorPremium";
import { SessionTrackerPremium } from "./components/SessionTrackerPremium";
import { SPORTS_DATA, parseNormativeValue } from "./data/imtpNormatives";
import { ENRICHED_LIBRARY } from "./data/exercises";
import { InjuriesView } from "./components/InjuriesView";
import { MenstrualCycleDashboard } from "./components/MenstrualCycleDashboard";
import { PosturalAssessmentPremium } from "./components/PosturalAssessmentPremium";
import { CompetitionsCalendarView } from "./components/CompetitionsCalendarView";
import { ProfilePhotoOptionsModal } from "./components/ProfilePhotoOptionsModal";
import { AiPerformanceChatModal } from "./components/AiPerformanceChatModal";
import { PwaInstallBanner } from "./components/PwaInstallBanner";
import toast from "react-hot-toast";
import { toJpeg } from "html-to-image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Download,
  Printer,
  Scale,
  Flame,
  Calendar,
  Droplets,
  Activity,
  Database,
  User,
  Users,
  PieChart,
  TrendingUp,
  X,
  Info,
  FileText,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Brain,
  Shield,
  Check,
  ClipboardCheck,
  LayoutDashboard,
  Dumbbell,
  ClipboardList,
  Sparkles,
  Plus,
  Target,
  ArrowUp,
  ArrowDown,
  Share2,
  Bell,
  Crown,
  History,
  Zap,
  Trash2,
  LogOut,
  Sun,
  Moon,
  Settings,
  RefreshCw,
  BookOpen,
  Search,
  Pencil,
  HeartPulse,
  Timer, Clock, Trophy, Camera, Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import {
  useNavigate,
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import Venda from "./pages/Venda";
import Dashboard from "./pages/Dashboard";
import Ranking from "./pages/Ranking";
import { UserWithPlan, isPro } from "./utils/plan";

// Safely wrapped localStorage to prevent crashes on restricted engines/mobile frames/iframes
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("Storage item fetch failed:", e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("Storage item save failed:", e);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("Storage item removal failed:", e);
    }
  }
};

const processProfileImageFile = (file: File, callback: (base64: string) => void) => {
  if (!file.type.startsWith("image/")) {
    toast.error("Por favor, selecione um arquivo de imagem válido (JPG, PNG, WEBP).");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_SIZE = 500;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      callback(dataUrl);
    };
    img.onerror = () => {
      toast.error("Erro ao processar imagem.");
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

// Helper for print action safe in iframe sandbox environment
const triggerPrint = () => {
  const isIframe = window.self !== window.top;
  if (isIframe) {
    toast.error(
      "💡 Para Imprimir / Gerar PDF:\n\nComo você está no visualizador do AI Studio, o navegador bloqueia a impressão nesta janela.\n\nPor favor, abra o aplicativo em uma nova aba clicando no ícone ↗️ (abrir em nova janela) no canto superior direito do AI Studio, e clique em Imprimir por lá!",
      {
        duration: 12000,
        position: "top-center",
        style: {
          maxWidth: "500px",
          background: "#0f172a",
          color: "#ffffff",
          border: "2px solid #10b981",
          fontSize: "14px",
          lineHeight: "1.6",
          padding: "18px",
          borderRadius: "16px",
        }
      }
    );
  } else {
    window.print();
  }
};

// --- UI COMPONENTS ---
const Card: FC<{
  children: React.ReactNode;
  className?: string;
  title?: string;
  onClick?: () => void;
}> = ({ children, className, title, onClick }) => (
  <div
    onClick={onClick}
    className={`premium-card p-6 md:p-8 ${onClick ? "cursor-pointer active:scale-[0.98]" : ""} ${className}`}
  >
    {title && (
      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 neon-text-glow">
        {title}
      </h4>
    )}
    {children}
  </div>
);

const Button: FC<{
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "accent" | "danger";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
}> = ({
  onClick,
  children,
  variant = "primary",
  className,
  disabled,
  type = "button",
  title,
}) => {
  const styles = {
    primary:
      "bg-brand-primary text-brand-dark shadow-[0_0_20px_rgba(57,255,20,0.4)] hover:brightness-110",
    secondary:
      "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700",
    accent:
      "bg-brand-secondary text-brand-dark font-black shadow-[0_0_20px_rgba(0,209,255,0.3)]",
    danger:
      "bg-red-600/20 text-red-500 border border-red-500/30 hover:bg-red-600/30",
  };
  return (
    <button
      type={type}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick(e);
        }
      }}
      disabled={disabled}
      title={title}
      className={`px-6 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest ${styles[variant]} ${className} ${disabled ? "opacity-30 cursor-not-allowed" : ""} active:scale-95`}
    >
      {children}
    </button>
  );
};

// --- AUTH COMPONENTS ---
const Login: FC<{
  onLogin: (user: UserWithPlan) => void;
  athletes: Athlete[];
  iframeCookieWarning?: boolean;
}> = ({ onLogin, athletes, iframeCookieWarning }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const resText = await response.text();
      if (resText.trim().startsWith('<') || resText.trim().startsWith('<!doctype')) {
        throw new Error("O navegador bloqueou os cookies de segurança da visualização (iframe). Por favor, clique em 'Open in a new tab' (Abrir em nova aba) no canto superior direito do AI Studio para acessar o sistema normalmente.");
      }

      if (response.ok) {
        const userData = JSON.parse(resText);
        onLogin(userData);
      } else {
        let errorMsg = "Credenciais inválidas. Verifique seu nome e senha.";
        try {
          const data = JSON.parse(resText);
          errorMsg = data.error || errorMsg;
        } catch (e) {
          console.warn("Falha ao parsear erro do servidor:", e);
        }
        setError(errorMsg);
      }
    } catch (err: any) {
      const isNetworkErr = err?.message && (
        err.message.toLowerCase().includes('failed to fetch') ||
        err.message.toLowerCase().includes('network error') ||
        err.message.toLowerCase().includes('connection refused') ||
        err.message.toLowerCase().includes('load failed') ||
        err.message.toLowerCase().includes('abort') ||
        err.message.toLowerCase().includes('timeout')
      );
      if (err.message && (err.message.includes('bloqueou') || err.message.includes('Unexpected token') || err.message.includes('cookie'))) {
        console.warn("Erro de rede no login (iframe cookies bloqueados):", err.message);
      } else if (isNetworkErr) {
        console.warn("Erro de rede no login:", err.message || err);
      } else {
        console.error("Erro de rede no login:", err);
      }
      setError(
        `Erro ao conectar com o servidor: ${err.message || "Verifique sua conexão."}`,
      );
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4 relative overflow-hidden selection:bg-brand-primary/30">
      {/* Dynamic Background */}
      <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-brand-primary/10 rounded-full blur-[150px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-secondary/5 rounded-full blur-[120px]"></div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md premium-card p-10 md:p-14 relative z-10 border-slate-800/40"
      >
        <div className="flex flex-col items-center mb-12">
          <div className="w-24 h-24 rounded-[2rem] bg-slate-900/90 p-2.5 shadow-[0_0_50px_rgba(57,255,20,0.35)] mb-8 flex items-center justify-center border border-brand-primary/30">
            <img
              src="/pwa-192x192.svg"
              className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(57,255,20,0.3)]"
              alt="Logo"
            />
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white leading-none">
            Elite <span className="text-brand-primary">Hub</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mt-4 neon-text-glow">
            Performance Monitoring System
          </p>
        </div>

        {iframeCookieWarning && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">
              ⚠️ Cookies Bloqueados no Iframe
            </p>
            <p className="text-[9px] font-bold leading-normal">
              O navegador bloqueou os cookies de segurança da visualização (iframe). Por favor, clique em <strong className="text-amber-300">"Open in a new tab" (Abrir em nova aba)</strong> no canto superior direito para poder acessar o sistema.
            </p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-8">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">
              Identificação / Nome
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-5 text-white outline-none focus:border-brand-primary transition-all shadow-inner font-bold"
              placeholder="Digite seu nome"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">
              Chave de Acesso / Data
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-5 pr-14 text-white outline-none focus:border-brand-primary transition-all shadow-inner font-bold"
                placeholder="DDMMAAAA"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-slate-600 hover:text-brand-primary transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-6 h-6" />
                ) : (
                  <Eye className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-[10px] font-black uppercase text-center bg-red-500/10 py-3 rounded-xl border border-red-500/20">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full py-5 shadow-[0_0_30px_rgba(57,255,20,0.2)]"
          >
            Entrar no Lab
          </Button>
        </form>

        <div className="mt-8 text-center flex flex-col gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-[10px] text-slate-500 font-black uppercase tracking-widest hover:text-brand-primary transition-colors"
          >
            Voltar para o Início
          </button>
          <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] italic">
            Precision in every heartbeat. v2.5
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const ReportPage: FC<{
  children: React.ReactNode;
  pageNumber: number;
  totalPages: number;
}> = ({ children, pageNumber, totalPages }) => (
  <div
    className="report-page page-break bg-white text-slate-950 shadow-2xl my-10 mx-auto overflow-hidden relative text-left"
    style={{ width: "210mm", minHeight: "297mm", padding: "20mm", boxSizing: "border-box" }}
  >
    {/* Page Borders for design */}
    <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600"></div>
    <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100"></div>

    <div className="flex flex-col h-full min-h-[257mm] justify-between">
      <div className="flex-grow">{children}</div>

      <div className="mt-10 pt-6 border-t border-slate-100 flex justify-between items-center bg-white shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center p-1 shadow-lg border border-slate-800 shrink-0">
            <img
              src="/pwa-192x192.svg"
              className="w-full h-full object-contain"
              alt="LB"
            />
          </div>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">
              Responsável Técnico
            </p>
            <p className="text-[10px] font-black text-slate-900 uppercase italic leading-none">
              Prof. Leandro Barbosa (036202-G/PR)
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] leading-none mb-1">
            Página {pageNumber} de {totalPages}
          </p>
          <div className="flex items-center justify-end gap-2">
            <span className="w-1 h-1 bg-emerald-600 rounded-full"></span>
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              LB HUB v3.0 • ELITE PERFORMANCE
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ReportHeader: FC<{
  title: string;
  subTitle: string;
  athlete: Athlete;
  date: string;
  extraStats?: { label: string; value: string | number }[];
}> = ({ title, subTitle, athlete, date, extraStats }) => (
  <div className="bg-emerald-600 -mx-[20mm] -mt-[20mm] p-8 mb-8 flex justify-between items-end relative overflow-hidden shrink-0 text-left">
    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-emerald-700/30 to-transparent pointer-events-none"></div>
    
    <div className="relative z-10 w-full">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-13 h-13 rounded-2xl bg-slate-900 flex items-center justify-center p-1.5 shadow-md border border-emerald-400/30 shrink-0">
          <img
            src="/pwa-192x192.svg"
            className="w-full h-full object-contain"
            alt="Logo"
          />
        </div>
        <div>
          <h4 className="text-[10px] font-black text-white/80 uppercase tracking-[0.3em] leading-none mb-1">
            Elite Performance Lab
          </h4>
          <h3 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tighter leading-none">
            {title}
          </h3>
          <p className="text-[8px] font-black text-white/70 uppercase tracking-[0.4em] mt-1.5 leading-none">
            {subTitle}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-5 mt-4 pt-4 border-t border-white/10">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-0.5">Atleta</span>
          <span className="text-xs font-black text-white uppercase italic">{athlete.name}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-0.5 font-bold">Data do Teste</span>
          <span className="text-xs font-black text-white uppercase italic">{date}</span>
        </div>
        {extraStats?.map((stat, idx) => (
          <div key={idx} className="flex flex-col">
            <span className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-0.5">{stat.label}</span>
            <span className="text-xs font-black text-white uppercase italic">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const getFormattedDatePT = () => {
  const date = new Date();
  const day = date.getDate();
  const months = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez"
  ];
  return `${day} de ${months[date.getMonth()]}.`;
};

// --- FEATURE COMPONENTS ---
const EliteHubApp: FC<{
  user: UserWithPlan | null;
  setUser: (u: UserWithPlan | null) => void;
}> = ({ user, setUser }) => {
  const {
    athletes,
    loading,
    syncing,
    setAthletes,
    save,
    addAthlete,
    updateAthlete,
    deleteAthlete,
    addWellness,
    updateWellness,
    deleteWellness,
    addWorkout,
    addWorkouts,
    updateWorkout,
    deleteWorkout,
    addExternalSession,
    updateExternalSession,
    deleteExternalSession,
    addAssessment,
    updateAssessment,
    removeAssessment,
    analyzePerformance,
    generateAIWorkouts,
    importDemoAthlete,
    syncData,
    lastSyncedAt,
    iframeCookieWarning,
  } = useAthletes(user?.token);

  // Stored session is handled by lazy initializer above.

  const handleLoginSuccess = (userData: UserWithPlan) => {
    setUser(userData);
    safeLocalStorage.setItem("lb_user", JSON.stringify(userData));
    toast.success(
      `Bem-vindo, ${userData.role === "coach" ? "Treinador" : "Atleta"}!`,
    );
  };

  const handleLogout = () => {
    setUser(null);
    safeLocalStorage.removeItem("lb_user");
    setSelectedId(null);
    setAiModelingResult(null);
    setAiInsight(null);
    setIaInstructions("");
    setActiveTab("dash");
    toast.success("Sessão encerrada.");
  };

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = safeLocalStorage.getItem("lb_theme");
    return (saved === "dark" || saved === "light") ? saved : "light";
  });

  useEffect(() => {
    safeLocalStorage.setItem("lb_theme", theme);
    if (theme === "light") {
      document.documentElement.classList.add("light-theme");
      document.body.classList.add("light-theme");
    } else {
      document.documentElement.classList.remove("light-theme");
      document.body.classList.remove("light-theme");
    }
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    toast.success(`Tema ${next === "light" ? "Claro" : "Escuro"} ativado`);
  };

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dashboardFilter, setDashboardFilter] = useState<
    "all" | "elite" | "low-readiness" | "scheduled-today"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSidebarAthletes, setShowSidebarAthletes] = useState(false);
  const [isPeriodizationExpanded, setIsPeriodizationExpanded] = useState(false);

  const featuredAthletesList = useMemo(() => {
    const today = getLocalDateString();
    let list = athletes;
    switch (dashboardFilter) {
      case "elite":
        list = athletes.filter((a) => a.competitiveLevel === "elite");
        break;
      case "low-readiness":
        list = athletes.filter((a) => {
          const todayWell = (a.wellness || []).find(
            (w) => w.date && w.date.startsWith(today),
          );
          return todayWell && (todayWell.readinessScore || 0) < 50;
        });
        break;
      case "scheduled-today":
        list = athletes.filter((a) =>
          (a.workouts || []).some((wk) => wk.date && wk.date.startsWith(today)),
        );
        break;
      case "all":
      default:
        list = athletes;
        break;
    }

    const mapped = list.map((ath) => {
      const workouts = ath.workouts || [];
      const external = ath.externalSessions || [];
      const computedAcwr = calculateACWR(workouts, external);
      
      const acute = Math.round(computedAcwr.acute);
      const chronic = Math.round(computedAcwr.chronic);
      const acwr = computedAcwr.ratio;
      
      let status = "ZONA IDEAL";
      let statusColor = "bg-emerald-950/60 text-emerald-450 border border-emerald-500/20";
      if (acwr < 0.85) {
        status = "RISCO BAIXO";
        statusColor = "bg-amber-950/60 text-amber-500 border border-amber-900/20";
      } else if (acwr > 1.3) {
        status = "RISCO ALTO";
        statusColor = "bg-red-950/60 text-red-450 border border-red-500/20";
      }

      const todayWell = (ath.wellness || []).find((w) => w.date && w.date.startsWith(today));
      const readinessDisplay = todayWell && todayWell.readinessScore !== undefined
        ? `${todayWell.readinessScore}%`
        : "—";
      const isLowReadinessToday = todayWell && (todayWell.readinessScore || 0) < 50;
      const readiness = todayWell && todayWell.readinessScore !== undefined ? todayWell.readinessScore : null;
      const sono = (() => {
        if (!todayWell) return "—";
        if (todayWell.sleepHoursFormatted) return todayWell.sleepHoursFormatted;
        if (todayWell.sleep !== undefined && todayWell.sleep !== null) {
          const s = safeParseFloat(todayWell.sleep);
          if (!isNaN(s)) {
            const h = Math.floor(s);
            const m = Math.round((s - h) * 60);
            return m === 0 ? `${h}h` : `${h}h ${m}m`;
          }
        }
        return "—";
      })();
      const obs = ath.injuryHistory || "Regular monitorado";

      return {
        id: ath.id,
        name: ath.name,
        photoUrl: ath.photoUrl,
        esporte: ath.modality || "Geral",
        acute,
        chronic,
        acwr,
        status,
        statusColor,
        readiness,
        readinessDisplay,
        isLowReadinessToday,
        hasWellnessToday: !!todayWell,
        sono,
        obs,
        isSelected: selectedId === ath.id
      };
    });

    const getRiskSeverity = (acwr: number) => {
      if (acwr > 1.3) return 3; // High risk ("RISCO ALTO") first
      if (acwr < 0.85) return 2; // Under-training ("RISCO BAIXO") second
      return 1; // Good/Ideal zone ("ZONA IDEAL") last
    };

    return mapped.sort((a, b) => {
      const sevA = getRiskSeverity(a.acwr);
      const sevB = getRiskSeverity(b.acwr);
      if (sevA !== sevB) {
        return sevB - sevA; // High severity first
      }
      return b.acwr - a.acwr; // Higher ACWR of that category first
    });
  }, [athletes, selectedId, dashboardFilter]);

  const [activeTab, setActiveTab] = useState<
    "dash" | "training" | "assessment" | "ai-modeling" | "premium" | "info" | "injuries" | "competitions"
  >("dash");
  const [dashboardSubTab, setDashboardSubTab] = useState<"pro" | "classic" | "elite-monitoring">("pro");
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    const stored = safeLocalStorage.getItem("lb_dismissed_notifications");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    safeLocalStorage.setItem(
      "lb_dismissed_notifications",
      JSON.stringify(dismissedIds),
    );
  }, [dismissedIds]);



  const [showNotifications, setShowNotifications] = useState(false);

  const filteredAthletes = useMemo(() => {
    const today = getLocalDateString();
    switch (dashboardFilter) {
      case "elite":
        return athletes.filter((a) => a.competitiveLevel === "elite");
      case "low-readiness":
        return athletes.filter((a) => {
          const todayWell = (a.wellness || []).find(
            (w) => w.date && w.date.startsWith(today),
          );
          return todayWell && (todayWell.readinessScore || 0) < 50;
        });
      case "scheduled-today":
        return athletes.filter((a) =>
          (a.workouts || []).some((wk) => wk.date && wk.date.startsWith(today)),
        );
      case "all":
      default:
        return athletes;
    }
  }, [athletes, dashboardFilter]);

  // Retention Layer: Memoized notification calculation
  const notifications = useMemo(() => {
    if (loading || !user) return [];

    const list: {
      id: string;
      text: string;
      type: "warning" | "info" | "success";
      athleteId?: string;
    }[] = [];
    const today = getLocalDateString();
    const athlete =
      user.role === "athlete" && user.athleteId
        ? athletes.find((a) => a.id === user.athleteId)
        : null;

    if (user.role === "athlete" && athlete) {
      // 1. Wellness Missing
      const hasWellnessToday = (athlete.wellness || []).some(
        (w) => w.date && w.date.startsWith(today),
      );
      if (!hasWellnessToday) {
        list.push({
          id: "wellness",
          text: "“Atualize sua prontidão hoje”",
          type: "warning" as const,
          athleteId: athlete.id,
        });
      }

      // 2. Training Available
      const hasWorkoutToday = (athlete.workouts || []).some(
        (w) => w.date && w.date.startsWith(today) && w.status === "planned",
      );
      if (hasWorkoutToday) {
        list.push({
          id: "workout",
          text: "“Seu treino de hoje está disponível”",
          type: "info" as const,
          athleteId: athlete.id,
        });
      }

      // 3. Performance Drop
      const lastAssessment = athlete.assessments?.cmj?.[0];
      const prevAssessment = athlete.assessments?.cmj?.[1];
      if (
        lastAssessment &&
        prevAssessment &&
        lastAssessment.height < prevAssessment.height * 0.92
      ) {
        list.push({
          id: "drop",
          text: "“Seu desempenho em salto caiu 8%”",
          type: "warning" as const,
          athleteId: athlete.id,
        });
      }
    } else if (user.role === "coach") {
      athletes.forEach((a) => {
        // Birthday check
        const isBirthdayToday = (dobString?: string) => {
          if (!dobString) return false;
          const dobParts = dobString.split("-");
          if (dobParts.length < 3) return false;
          const todayParts = today.split("-");
          return dobParts[1] === todayParts[1] && dobParts[2] === todayParts[2];
        };

        if (isBirthdayToday(a.dob)) {
          list.push({
            id: `bday-${a.id}-${today}`,
            text: `🎂 ANIVERSÁRIO HOJE: ${a.name.toUpperCase()}! Parabenize seu atleta!`,
            type: "success" as const,
            athleteId: a.id,
          });
        }

        const lastSession = (a.externalSessions || [])[0];
        if (lastSession && lastSession.date && lastSession.date.startsWith(today) && lastSession.rpe >= 8) {
          list.push({
            id: `heavy-${a.id}-${today}`,
            text: `“${a.name.split(" ")[0]} registrou carga alta (PSE ${lastSession.rpe})”`,
            type: "info" as const,
            athleteId: a.id,
          });
        }

        const recentWorkouts = (a.workouts || []).slice(0, 3);
        for (const w of recentWorkouts) {
          if (!w.exercises) continue;
          const painEx = w.exercises.find(
            (ex) => ex.painLevel && ex.painLevel >= 6,
          );
          if (painEx) {
            list.push({
              id: `pain-${a.id}-${w.date || "unknown"}`,
              text: `“${a.name.split(" ")[0]} relatou dor nível ${painEx.painLevel}”`,
              type: "warning" as const,
              athleteId: a.id,
            });
            break;
          }
        }

        const hasWorkoutToday = (a.workouts || []).some(
          (w) => w.date && w.date.startsWith(today) && w.status !== "completed"
        ) || (a.workouts || []).some(
          (w) => w.date && w.date.startsWith(today)
        );

        const todayWellness = (a.wellness || []).find(
          (w) => w.date && w.date.startsWith(today)
        );

        if (todayWellness) {
          if (todayWellness.fatigue >= 8)
            list.push({
              id: `fatigue-${a.id}-${today}`,
              text: `“${a.name.split(" ")[0]} relatou fadiga crítica (${todayWellness.fatigue}/10)”`,
              type: "warning" as const,
              athleteId: a.id,
            });
          if (todayWellness.stress >= 8)
            list.push({
              id: `stress-${a.id}-${today}`,
              text: `“${a.name.split(" ")[0]} relatou estresse elevado (${todayWellness.stress}/10)”`,
              type: "warning" as const,
              athleteId: a.id,
            });
          if ((todayWellness.readinessScore || 0) < 50)
            list.push({
              id: `readiness-${a.id}-${today}`,
              text: `“${a.name.split(" ")[0]} está com prontidão baixa (${todayWellness.readinessScore || 0}%)”`,
              type: "warning" as const,
              athleteId: a.id,
            });
        } else if (hasWorkoutToday) {
          // Apenas notifica prontidão faltante se o atleta tem treino programado para hoje
          list.push({
            id: `missing-wel-${a.id}-${today}`,
            text: `“${a.name.split(" ")[0]} tem treino hoje e não preencheu a prontidão”`,
            type: "warning" as const,
            athleteId: a.id,
          });
        }
      });
      if (list.length > 20) list.splice(20);
    }

    return list.filter((n) => !dismissedIds.includes(n.id));
  }, [athletes, loading, user, dismissedIds]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleRequestNotifications = async () => {
    if (!("Notification" in window)) {
      toast.error("Este navegador não suporta notificações.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      toast.success("Notificações ativadas! Você receberá alertas de treino.");
      new Notification("LBHUB Ativado", {
        body: "Você receberá notificações sobre seus planos e feedbacks.",
        icon: "/pwa-192x192.svg",
      });
    } else {
      toast.error("Permissão de notificação negada.");
    }
  };

  const moveWorkout = async (
    athleteId: string,
    index: number,
    direction: "up" | "down",
  ) => {
    const athlete = athletes.find((a) => a.id === athleteId);
    if (!athlete) return;

    const workouts = [...(athlete.workouts || [])];
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= workouts.length) return;

    [workouts[index], workouts[newIndex]] = [
      workouts[newIndex],
      workouts[index],
    ];

    const updated = athletes.map((a) =>
      a.id === athleteId ? { ...a, workouts } : a,
    );
    setAthletes(updated);
    await save(updated, athleteId);
    toast.success("Ordem dos treinos atualizada!");
  };

  const [aiModelingResult, setAiModelingResult] =
    useState<PerformanceModeling | null>(null);
  const [trainingLoadResult, setTrainingLoadResult] = useState<any>(null);
  const [healthResult, setHealthResult] = useState<any>(null);
  const [aiModelingLoading, setAiModelingLoading] = useState(false);
  const [trainingSubTab, setTrainingSubTab] = useState<"planned" | "external">("planned");
  const [workoutStatusFilter, setWorkoutStatusFilter] = useState<"pending" | "completed" | "all">("pending");
  const [iaWorkoutsLoading, setIaWorkoutsLoading] = useState(false);
  const [iaInstructions, setIaInstructions] = useState("");

  const [modalState, setModalState] = useState<{
    type:
      | "athlete"
      | "edit-athlete"
      | "profile-photo-options"
      | "wellness"
      | "edit-wellness"
      | "workout"
      | "edit-workout"
      | "active-session"
      | "assessment"
      | "ai"
      | "confirm-delete"
      | "confirm-delete-workout"
      | "clone-workout"
      | null;
    editingData?: any;
    assessmentType?: AssessmentType;
    loading?: boolean;
  }>({ type: null });

  const reportRef = useRef<HTMLDivElement>(null);

  // Cleanup test athletes
  useEffect(() => {
    if (!loading && athletes.length > 0) {
      const testAthletes = athletes.filter(
        (a) => a.name.toLowerCase().trim() === "teste",
      );
      if (testAthletes.length > 0) {
        testAthletes.forEach((a) => deleteAthlete(a.id));
      }
    }
  }, [athletes, loading]);

  const handleDeleteAthlete = async () => {
    if (selected) {
      await deleteAthlete(selected.id);
      setSelectedId(null);
      setModalState({ type: null });
    }
  };

  const handleCloneWorkout = async (
    targetAthleteId: string,
    startDate: string,
    weeks: number,
  ) => {
    const workoutToClone = modalState.editingData as Workout;
    const start = new Date(startDate);

    setModalState((prev) => ({ ...prev, loading: true }));
    const toastId = toast.loading("Sincronizando clonagem...");

    try {
      const newWorkoutsBatch: Omit<Workout, "id">[] = [];
      for (let i = 0; i < weeks; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i * 7);

        const newWorkout: Omit<Workout, "id"> = {
          ...workoutToClone,
          date: date.toISOString().split("T")[0],
          status: "planned",
          rpe: 0,
          totalLoad: 0,
          monotony: 0,
          strain: 0,
          feedback: "",
          exercises: (workoutToClone.exercises || []).map((ex, exIdx) => ({
            ...ex,
            id: `ex-clone-${Date.now()}-${Math.random()}`,
            order_index: exIdx,
            performedSets: (ex.performedSets || []).map((s) => ({
              ...s,
              id: `s-clone-${Date.now()}-${Math.random()}`,
              reps: 0,
              weight: 0,
              rpe: 0,
            })),
          })),
        };
        newWorkoutsBatch.push(newWorkout);
      }
      await addWorkouts(targetAthleteId, newWorkoutsBatch);
      setModalState({ type: null });
      toast.success(
        `${weeks > 1 ? "Ciclo de treinos criado" : "Treino clonado"} com sucesso!`,
        { id: toastId },
      );
    } catch (error) {
      console.error("Erro ao clonar:", error);
      toast.error("Erro ao processar clonagem.", { id: toastId });
    } finally {
      setModalState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handlePrint = () => {
    triggerPrint();
  };

  const handleExportJpeg = async () => {
    if (!reportRef.current) return;
    const toastId = toast.loading("Otimizando layout para exportação...");
    try {
      const pages = reportRef.current.querySelectorAll(".report-page");

      if (pages.length === 0) {
        // Fallback sustentado com alta qualidade
        const dataUrl = await toJpeg(reportRef.current, {
          quality: 1.0,
          backgroundColor: "#FFFFFF",
          pixelRatio: 3,
        });
        const link = document.createElement("a");
        link.download = `analise-elite-${selected?.name || "atleta"}.jpg`;
        link.href = dataUrl;
        link.click();
      } else {
        // Exportar cada página individualmente para manter fidelidade A4 e alta resolução
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i] as HTMLElement;
          const dataUrl = await toJpeg(page, {
            quality: 1.0,
            backgroundColor: "#FFFFFF",
            pixelRatio: 3,
          });
          const link = document.createElement("a");
          link.download = `analise-elite-${selected?.name || "atleta"}-pag-${i + 1}.jpg`;
          link.href = dataUrl;
          link.click();
          // Pequeno intervalo para não bloquear o thread de UI
          await new Promise((r) => setTimeout(r, 400));
        }
      }
      toast.success("Arquivos gerados com sucesso!", { id: toastId });
    } catch (e) {
      console.error("Erro exportação:", e);
      toast.error("Falha ao gerar imagens.", { id: toastId });
    }
  };

  const selected = useMemo(() => {
    if (user?.role === "athlete")
      return athletes.find((a) => a.id === user.athleteId);
    return athletes.find((a) => a.id === selectedId);
  }, [athletes, selectedId, user]);

  const handleGenerateAIModeling = async (skipConfirm = false) => {
    if (user?.role !== "coach") {
      toast.error("Acesso restrito ao treinador.");
      return;
    }

    if (!selected) {
      toast.error("Selecione um atleta primeiro na barra superior.");
      return;
    }

    if (!skipConfirm) {
      if (
        !window.confirm(
          `INICIAR MODELAGEM ELITE?\n\nO sistema irá analisar o histórico de ${selected.name.toUpperCase()} para gerar insights preditivos. Este processo pode levar alguns segundos.`,
        )
      ) {
        return;
      }
    }

    setAiModelingLoading(true);
    const toastId = toast.loading(
      "LB Hub analisando histórico e modelando performance...",
    );
    try {
      const result = await generateAIModeling(selected);
      if (result) {
        setAiModelingResult(result);
        toast.success("Modelagem de Alta Performance gerada!", { id: toastId });
      } else {
        toast.error(
          "Limite de processamento atingido ou dados insuficientes.",
          { id: toastId },
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar modelagem.", { id: toastId });
    } finally {
      setAiModelingLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "athlete" && user.athleteId) {
      setSelectedId(user.athleteId);
    }
  }, [user]);

  const handleAiAnalysis = async () => {
    if (!selected || user?.role !== "coach") {
      if (user?.role !== "coach") toast.error("Acesso restrito ao treinador.");
      return;
    }
    setAiLoading(true);
    try {
      const res = await analyzePerformance(selected);
      setAiInsight(res);
      setModalState({ type: "ai" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateIAWorkouts = async () => {
    if (!selected || user?.role !== "coach") {
      if (user?.role !== "coach") toast.error("Acesso restrito ao treinador.");
      return;
    }
    if (!selected.modality) {
      toast.error(
        "Defina a modalidade do atleta antes de gerar treinos específicos.",
      );
      setModalState({ type: "edit-athlete", editingData: selected });
      return;
    }
    setIaWorkoutsLoading(true);
    try {
      await generateAIWorkouts(selected, iaInstructions);
      setIaInstructions(""); // Clear instructions after generation
    } catch (error) {
      console.error(
        "Erro ao chamar generateAIWorkouts:",
        (error as any)?.message || error,
      );
    } finally {
      setIaWorkoutsLoading(false);
    }
  };

  const startWorkoutFlow = (w: Workout) => {
    const today = getLocalDateString();
    const wellnessHistory = Array.isArray(selected?.wellness)
      ? selected.wellness
      : [];
    const hasWellnessToday = wellnessHistory.some((we) =>
      we.date.startsWith(today),
    );

    if (!hasWellnessToday) {
      toast("Dica: Faça o check-in de prontidão antes do treino.", {
        icon: "📊",
      });
    }
    setModalState({ type: "active-session", editingData: w });
  };

  if (loading && athletes.length === 0)
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#020617] text-[#10b981] font-black uppercase tracking-[0.3em] md:tracking-[0.5em] p-4 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-[#10b981]/5 rounded-full blur-[140px] animate-pulse"></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-28 h-28 rounded-[2.5rem] bg-slate-900/90 p-3 shadow-[0_0_60px_rgba(16,185,129,0.4)] border border-brand-primary/30 flex items-center justify-center mb-8 animate-bounce">
            <img
              src="/pwa-192x192.svg"
              className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]"
              alt="LB Logo"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl tracking-[0.4em] font-black italic">
              LB PERFORMANCE
            </h1>
            <p className="text-[10px] text-slate-500 tracking-[0.8em] font-bold">
              BIOFEEDBACK HUB
            </p>
          </div>
          <div className="mt-12 flex gap-1">
            <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-[ping_1.5s_infinite_0s]"></div>
            <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-[ping_1.5s_infinite_0.2s]"></div>
            <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-[ping_1.5s_infinite_0.4s]"></div>
          </div>
        </div>
      </div>
    );

  const SidebarItem = ({
    id,
    label,
    description,
    icon: Icon,
    active,
    onClick,
  }: {
    id: string;
    label: string;
    description: string;
    icon: any;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`flex flex-col md:flex-row items-center gap-1 md:gap-4 p-3 md:p-5 rounded-[1.5rem] md:rounded-[2rem] transition-all duration-500 group relative shrink-0 ${
        active
          ? "bg-brand-primary text-brand-dark shadow-[0_0_30px_rgba(57,255,20,0.3)] scale-100 neon-glow"
          : "text-slate-500 hover:bg-slate-800/50 hover:text-white scale-95 md:hover:scale-100"
      }`}
    >
      <Icon
        className={`w-5 h-5 md:w-6 md:h-6 transition-transform duration-500 ${active ? "scale-110 neon-text-glow" : "group-hover:scale-110"} shrink-0`}
      />
      <div className="flex flex-col items-center md:items-start overflow-hidden">
        <span
          className={`text-[8px] md:text-sm font-black uppercase tracking-widest md:tracking-tight md:font-bold block leading-none ${active ? "text-brand-dark" : "text-inherit"}`}
        >
          {label}
        </span>
        <span
          className={`hidden md:block text-[10px] ${active ? "text-brand-dark/60" : "text-slate-500"} font-bold tracking-tight mt-0.5 whitespace-nowrap`}
        >
          {description}
        </span>
      </div>
      {active && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute -right-1 md:right-3 w-1 md:w-1.5 h-1 md:h-8 bg-brand-dark rounded-full hidden md:block"
        />
      )}
    </button>
  );

  if (!user) {
    return <Login onLogin={handleLoginSuccess} athletes={athletes} iframeCookieWarning={iframeCookieWarning} />;
  }

  if (loading && athletes.length === 0) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-8 bg-gradient-to-br from-brand-dark to-slate-900">
        <div className="relative w-28 h-28 flex items-center justify-center">
          <div className="w-28 h-28 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin absolute inset-0"></div>
          <div className="w-16 h-16 rounded-2xl bg-slate-900/90 p-2 border border-brand-primary/30 flex items-center justify-center z-10 shadow-[0_0_20px_rgba(57,255,20,0.3)]">
            <img
              src="/pwa-192x192.svg"
              className="w-full h-full object-contain"
              alt="Logo"
            />
          </div>
        </div>
        <p className="mt-10 text-brand-primary font-black uppercase tracking-[0.4em] animate-pulse text-xs text-center">
          Sincronizando Banco de Dados Elite...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark text-slate-100 font-sans flex flex-col md:flex-row overflow-x-hidden relative no-scrollbar">
        <>
          {/* Mobile Bottom Navigation Bar (Fixed modern layout in requested order) */}
          <div className="flex md:hidden fixed bottom-0 left-0 right-0 h-20 bg-[#070b14]/95 backdrop-blur-3xl border-t border-slate-850/90 z-[1010] items-center px-4 shadow-[0_-12px_36px_rgba(0,0,0,0.85)] overflow-x-auto no-scrollbar select-none">
            <div className="flex flex-row items-center gap-2.5 w-max py-1.5 pr-4">
              {/* 1. PAINEL GERAL item */}
              <button
                onClick={() => {
                  setActiveTab("dash");
                  setDashboardSubTab("pro");
                  setAiModelingResult(null);
                  if (user?.role === "coach") {
                    setSelectedId(null);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all shrink-0 uppercase tracking-widest text-[10px] font-black ${
                  activeTab === "dash" && dashboardSubTab === "pro" && !aiModelingResult
                    ? "bg-[#10b981] text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-102"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>PAINEL GERAL</span>
              </button>

              {/* 2. AVALIAÇÕES item */}
              <button
                onClick={() => {
                  setActiveTab("assessment");
                  setAiModelingResult(null);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all shrink-0 uppercase tracking-widest text-[10px] font-black ${
                  activeTab === "assessment"
                    ? "bg-[#10b981] text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-102"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ClipboardList className="w-4 h-4 shrink-0" />
                <span>AVALIAÇÕES</span>
              </button>

              {/* 3. TREINOS item */}
              <button
                onClick={() => {
                  setActiveTab("training");
                  setAiModelingResult(null);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all shrink-0 uppercase tracking-widest text-[10px] font-black ${
                  activeTab === "training"
                    ? "bg-[#10b981] text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-102"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Dumbbell className="w-4 h-4 shrink-0" />
                <span>TREINOS</span>
              </button>

              {/* 4. CARGA item */}
              <button
                onClick={() => {
                  setActiveTab("dash");
                  setDashboardSubTab("elite-monitoring");
                  setAiModelingResult(null);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all shrink-0 uppercase tracking-widest text-[10px] font-black ${
                  activeTab === "dash" && dashboardSubTab === "elite-monitoring" && !aiModelingResult
                    ? "bg-[#10b981] text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-102"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span>CARGA</span>
              </button>

              {/* 5. PRONTIDÃO item */}
              <button
                onClick={() => {
                  setActiveTab("dash");
                  setDashboardSubTab("classic");
                  setAiModelingResult(null);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all shrink-0 uppercase tracking-widest text-[10px] font-black ${
                  activeTab === "dash" && dashboardSubTab === "classic" && !aiModelingResult
                    ? "bg-[#10b981] text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-102"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ClipboardCheck className="w-4 h-4 shrink-0" />
                <span>PRONTIDÃO</span>
              </button>

              {/* 6. DM E SAÚDE item */}
              <button
                onClick={() => {
                  setActiveTab("injuries");
                  setAiModelingResult(null);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all shrink-0 uppercase tracking-widest text-[10px] font-black ${
                  activeTab === "injuries"
                    ? "bg-[#10b981] text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-102"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Activity className="w-4 h-4 shrink-0" />
                <span>DM E SAÚDE</span>
              </button>

              {/* COMPETIÇÕES item */}
              <button
                onClick={() => {
                  setActiveTab("competitions");
                  setAiModelingResult(null);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all shrink-0 uppercase tracking-widest text-[10px] font-black ${
                  activeTab === "competitions"
                    ? "bg-[#10b981] text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-102"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Trophy className="w-4 h-4 shrink-0" />
                <span>COMPETIÇÕES</span>
              </button>

              {/* 7. MODELAGEM item */}
              <button
                onClick={() => {
                  setActiveTab("ai-modeling");
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all shrink-0 uppercase tracking-widest text-[10px] font-black ${
                  activeTab === "ai-modeling" || aiModelingResult
                    ? "bg-[#10b981] text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-102"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>MODELAGEM</span>
              </button>

              {/* CHAT IA item */}
              <button
                onClick={() => setIsAiChatOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full transition-all shrink-0 uppercase tracking-widest text-[10px] font-black bg-brand-primary text-slate-950 hover:bg-lime-400 shadow-[0_0_15px_rgba(204,255,0,0.35)] cursor-pointer"
              >
                <Brain className="w-4 h-4 shrink-0 text-slate-950" />
                <span>CHAT IA</span>
              </button>

              {/* 8. GUIA item */}
              <button
                onClick={() => {
                  setActiveTab("info");
                  setAiModelingResult(null);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all shrink-0 uppercase tracking-widest text-[10px] font-black ${
                  activeTab === "info"
                    ? "bg-[#10b981] text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-102"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>GUIA</span>
              </button>

              {/* 9. TEMA item */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full transition-all shrink-0 uppercase tracking-widest text-[10px] font-black text-amber-400 bg-slate-900/60 border border-slate-800 cursor-pointer"
              >
                {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400 shrink-0" /> : <Moon className="w-4 h-4 text-indigo-400 shrink-0" />}
                <span>{theme === "dark" ? "TEMA CLARO" : "TEMA ESCURO"}</span>
              </button>

              {/* 10. SAIR item */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full transition-all shrink-0 uppercase tracking-widest text-[10px] font-black text-rose-400 hover:bg-rose-500/10 cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0 text-red-500" />
                <span>SAIR</span>
              </button>
            </div>
          </div>

          {/* Sidebar / Bottom Nav */}
          <aside className="hidden md:flex md:flex-col md:relative md:bottom-auto left-0 md:w-80 md:h-screen bg-[#0B0F19]/95 border-r border-slate-800/60 p-6 z-[1000] justify-between items-stretch">
            <div className="flex flex-col items-stretch justify-start w-full gap-4 px-0">
              
              {/* Premium Performance Pro Logo Bracket & Theme Toggle */}
              <div className="hidden md:flex items-center justify-between mb-10 mt-2 px-2">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-900/80 flex items-center justify-center p-1 border border-slate-800 shadow-[0_0_20px_rgba(16,185,129,0.25)] shrink-0">
                    <img src="/pwa-192x192.svg" className="w-8 h-8 object-contain" alt="LB Logo" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-extrabold text-xs tracking-[0.14em] uppercase text-white/90 leading-none">
                      PERFORMANCE
                    </span>
                    <span className="font-black text-lg tracking-wider text-brand-primary uppercase italic leading-none mt-1">
                      PRO
                    </span>
                  </div>
                </div>

                <button
                  onClick={toggleTheme}
                  className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-amber-400 hover:text-amber-300 transition-all active:scale-95 cursor-pointer"
                  title={`Alternar para tema ${theme === "dark" ? "Claro" : "Escuro"}`}
                >
                  {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                </button>
              </div>

              {/* Sidebar Menu - Desktop (In requested order) */}
              <div className="hidden md:flex flex-col gap-1.5 w-full">
                {/* 1. Painel Geral Tab */}
                <button
                  onClick={() => {
                    setActiveTab("dash");
                    setDashboardSubTab("pro");
                    setAiModelingResult(null);
                    if (user?.role === "coach") {
                      setSelectedId(null);
                    }
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                    activeTab === "dash" && dashboardSubTab === "pro" && !aiModelingResult
                      ? "border border-brand-primary/20 bg-gradient-to-r from-brand-primary/10 to-transparent text-brand-primary shadow-[0_0_15px_rgba(16,185,129,0.06)]"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent"
                  }`}
                >
                  <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === "dash" && dashboardSubTab === "pro" && !aiModelingResult ? "text-brand-primary" : "text-slate-500"}`} />
                  <span>Painel Geral</span>
                </button>

                {/* Atletas Management Dropdown Tab */}
                {user?.role !== "athlete" && (
                  <div className="flex flex-col w-full relative">
                    <button
                      onClick={() => setShowSidebarAthletes(!showSidebarAthletes)}
                      className={`flex items-center justify-between w-full px-4 py-3.5 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                        showSidebarAthletes || !selected
                          ? "border border-brand-primary/10 bg-slate-900/50 text-white"
                          : "text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-slate-500" />
                        <span>Atletas</span>
                      </div>
                      <span className="text-[10px] bg-slate-800 text-slate-400 font-black px-1.5 py-0.5 rounded">
                        {athletes.length}
                      </span>
                    </button>

                    {/* Sidebar Athlete list dropdown */}
                    <AnimatePresence>
                      {showSidebarAthletes && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden bg-[#0A0D16] border border-slate-800/40 rounded-xl mt-1 py-1 max-h-48 overflow-y-auto no-scrollbar"
                        >
                          {athletes.map((ath) => (
                            <button
                              key={ath.id}
                              onClick={() => {
                                setSelectedId(ath.id);
                                setShowSidebarAthletes(false);
                                toast.success(`Atleta: ${ath.name.split(" ")[0]} selecionado`);
                              }}
                              className={`flex items-center gap-2.5 w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider border-b border-slate-900/40 last:border-0 hover:pl-5 transition-all truncate ${
                                selectedId === ath.id
                                  ? "text-brand-primary bg-brand-primary/5"
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />
                              <span className="truncate">{ath.name}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* 2. Avaliações Tab */}
                <button
                  onClick={() => {
                    setActiveTab("assessment");
                    setAiModelingResult(null);
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                    activeTab === "assessment"
                      ? "border border-brand-primary/20 bg-gradient-to-r from-brand-primary/10 to-transparent text-brand-primary shadow-[0_0_15px_rgba(16,185,129,0.06)]"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent"
                  }`}
                >
                  <ClipboardList className={`w-4 h-4 shrink-0 ${activeTab === "assessment" ? "text-brand-primary" : "text-slate-500"}`} />
                  <span>Avaliações</span>
                </button>

                {/* 3. Treinos Tab */}
                <button
                  onClick={() => {
                    setActiveTab("training");
                    setAiModelingResult(null);
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                    activeTab === "training"
                      ? "border border-brand-primary/20 bg-gradient-to-r from-brand-primary/10 to-transparent text-brand-primary shadow-[0_0_15px_rgba(16,185,129,0.06)]"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent"
                  }`}
                >
                  <Dumbbell className={`w-4 h-4 shrink-0 ${activeTab === "training" ? "text-brand-primary" : "text-slate-500"}`} />
                  <span>Treinos</span>
                </button>

                {/* 4. Carga Tab */}
                <button
                  onClick={() => {
                    setActiveTab("dash");
                    setDashboardSubTab("elite-monitoring");
                    setAiModelingResult(null);
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                    activeTab === "dash" && dashboardSubTab === "elite-monitoring" && !aiModelingResult
                      ? "border border-brand-primary/20 bg-gradient-to-r from-brand-primary/10 to-transparent text-brand-primary shadow-[0_0_15px_rgba(16,185,129,0.06)]"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent"
                  }`}
                >
                  <TrendingUp className={`w-4 h-4 shrink-0 ${activeTab === "dash" && dashboardSubTab === "elite-monitoring" && !aiModelingResult ? "text-brand-primary" : "text-slate-500"}`} />
                  <span>Carga</span>
                </button>

                {/* 5. Prontidão Tab */}
                <button
                  onClick={() => {
                    setActiveTab("dash");
                    setDashboardSubTab("classic");
                    setAiModelingResult(null);
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                    activeTab === "dash" && dashboardSubTab === "classic" && !aiModelingResult
                      ? "border border-brand-primary/20 bg-gradient-to-r from-brand-primary/10 to-transparent text-brand-primary shadow-[0_0_15px_rgba(16,185,129,0.06)]"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent"
                  }`}
                >
                  <ClipboardCheck className={`w-4 h-4 shrink-0 ${activeTab === "dash" && dashboardSubTab === "classic" && !aiModelingResult ? "text-brand-primary" : "text-slate-500"}`} />
                  <span>Prontidão</span>
                </button>

                {/* 6. DM e Saúde Tab */}
                <button
                  onClick={() => {
                    setActiveTab("injuries");
                    setAiModelingResult(null);
                  }}
                  className={`flex items-center justify-between w-full px-4 py-3.5 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                    activeTab === "injuries"
                      ? "border border-brand-primary/20 bg-gradient-to-r from-brand-primary/10 to-transparent text-brand-primary shadow-[0_0_15px_rgba(16,185,129,0.06)]"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Activity className={`w-4 h-4 shrink-0 ${activeTab === "injuries" ? "text-brand-primary" : "text-slate-500"}`} />
                    <span>DM e Saúde</span>
                  </div>
                  {(!selected?.wellness || selected.wellness.length === 0) && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  )}
                </button>

                {/* Competições Tab */}
                <button
                  onClick={() => {
                    setActiveTab("competitions");
                    setAiModelingResult(null);
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                    activeTab === "competitions"
                      ? "border border-brand-primary/20 bg-gradient-to-r from-brand-primary/10 to-transparent text-brand-primary shadow-[0_0_15px_rgba(16,185,129,0.06)]"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent"
                  }`}
                >
                  <Trophy className={`w-4 h-4 shrink-0 ${activeTab === "competitions" ? "text-brand-primary" : "text-slate-500"}`} />
                  <span>Competições</span>
                </button>

                {/* 7. Modelagem Tab */}
                <button
                  onClick={() => {
                    setActiveTab("ai-modeling");
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                    activeTab === "ai-modeling" || aiModelingResult
                      ? "border border-brand-primary/20 bg-gradient-to-r from-brand-primary/10 to-transparent text-brand-primary shadow-[0_0_15px_rgba(16,185,129,0.06)]"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent"
                  }`}
                >
                  <Sparkles className={`w-4 h-4 shrink-0 ${activeTab === "ai-modeling" || aiModelingResult ? "text-brand-primary" : "text-slate-500"}`} />
                  <span>Modelagem</span>
                </button>

                {/* Chat IA Tab */}
                <button
                  onClick={() => setIsAiChatOpen(true)}
                  className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl text-left text-xs font-black uppercase tracking-wider transition-all duration-300 bg-brand-primary/10 border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/20 hover:border-brand-primary shadow-lg cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Brain className="w-4 h-4 shrink-0 text-brand-primary" />
                    <span>Chat IA</span>
                  </div>
                  <span className="text-[9px] uppercase font-extrabold bg-brand-primary text-slate-950 px-1.5 py-0.5 rounded">
                    Pro
                  </span>
                </button>

                {/* 8. Guia Tab */}
                <button
                  onClick={() => {
                    setActiveTab("info");
                    setAiModelingResult(null);
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                    activeTab === "info"
                      ? "border border-brand-primary/20 bg-gradient-to-r from-brand-primary/10 to-transparent text-brand-primary shadow-[0_0_15px_rgba(16,185,129,0.06)]"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent"
                  }`}
                >
                  <BookOpen className={`w-4 h-4 shrink-0 ${activeTab === "info" ? "text-brand-primary" : "text-slate-500"}`} />
                  <span>Guia</span>
                </button>

                {/* Configurações Tab */}
                {user?.role !== "athlete" && (
                  <button
                    onClick={() => {
                      if (selected) {
                        setModalState({ type: "edit-athlete", editingData: selected });
                      } else {
                        toast.error("Para acessar configurações, selecione um atleta!");
                      }
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3.5 text-slate-400 hover:text-white hover:bg-slate-900/40 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-300 border border-transparentScale"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>Configurações</span>
                  </button>
                )}
              </div>


              {/* Additional quick install tool item for PWA if applicable */}
              {isInstallable && (
                <button
                  onClick={handleInstallClick}
                  className="hidden md:flex flex-row items-center gap-3 p-3.5 rounded-xl bg-[#1E293B]/20 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary/20 transition-all mt-4 group shrink-0 w-full"
                >
                  <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform shrink-0" />
                  <div className="flex flex-col items-start overflow-hidden text-left">
                    <span className="text-[10px] font-bold uppercase tracking-tight leading-none">
                      Baixar App
                    </span>
                    <span className="text-[8px] text-brand-primary/65 font-medium mt-0.5">
                      PWA Performance PRO
                    </span>
                  </div>
                </button>
              )}

              <div className="hidden md:block flex-grow" />

              {/* Selected Athlete Showcase Card + Sync - Desktop Only (Matches the gold card mockup layout!) */}
              {selected && (
                <div className="hidden md:flex flex-col gap-3.5 w-full mt-auto border-t border-slate-800/80 pt-6">
                  {/* Glowing user info widget */}
                  <div
                    onClick={() => setModalState({ type: "profile-photo-options", editingData: selected })}
                    className="flex flex-col gap-3 p-4 bg-[#111625]/60 hover:bg-[#111625] border border-brand-primary/15 hover:border-brand-primary/40 rounded-2xl relative overflow-hidden shadow-2xl cursor-pointer transition-all group"
                    title="Clique para Editar Foto ou Dados do Perfil"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full blur-xl" />
                    <div className="flex items-center gap-3">
                      {/* Avatar picture */}
                      <div className="w-11 h-11 rounded-xl bg-slate-900 border border-brand-primary/20 group-hover:border-brand-primary shadow-md flex items-center justify-center shrink-0 overflow-hidden relative transition-colors">
                        {selected.photoUrl ? (
                          <img src={selected.photoUrl} alt={selected.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <img
                            src={`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e293b"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><rect width="100" height="100" rx="20" fill="url(%23g)" stroke="%2339ff14" stroke-width="2"/><path d="M50 22 a16 16 0 1 0 0.1 0 Z M22 82 c0-16 13-26 28-26 s28 10 28 26" fill="%2339ff14" opacity="0.85"/></svg>`}
                            alt={selected.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Camera className="w-4 h-4 text-brand-primary" />
                        </div>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-black text-white uppercase italic tracking-tight truncate max-w-[130px]">
                            {selected.name}
                          </span>
                          <Pencil className="w-2.5 h-2.5 text-brand-primary/70 group-hover:text-brand-primary transition-colors" />
                        </div>
                        <span className="text-[8px] font-black text-brand-primary mt-0.5 uppercase tracking-wider">
                          {selected.modality || "Futebol"}
                        </span>
                      </div>
                    </div>

                    {/* Metadata lines */}
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/60 text-[9px] font-bold text-slate-400">
                      <div className="flex justify-between">
                        <span className="text-slate-500 uppercase">Modalidade:</span>
                        <span className="text-slate-350 uppercase">{selected.modality || "Futebol"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 uppercase">Idade:</span>
                        <span className="text-slate-350 uppercase">{calculateAge(selected.dob)} ANOS</span>
                      </div>
                    </div>
                  </div>

                  {/* PRO Sync active button matches bottom row of sidebar mockup exactly */}
                  <button
                    onClick={async () => {
                      const toastId = toast.loading("Sincronizando Banco de Dados...");
                      try {
                        await syncData();
                        toast.success("Dados Sincronizados com Sucesso!", { id: toastId });
                      } catch (error: any) {
                        toast.error(error?.message || "Falha ao sincronizar.", { id: toastId });
                      }
                    }}
                    className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-[#1F3AA2]/30 hover:bg-[#1F3AA2]/40 text-[#60A5FA] hover:text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl transition-all hover:scale-[1.02] active:scale-95 border border-[#1E40AF]/40 group"
                  >
                    <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-700 text-[#308FFA]" />
                    <span>Sincronizar</span>
                  </button>
                </div>
              )}

              {/* Fallback Coach profile card if no athlete is selected */}
              {!selected && (
                <div className="hidden md:flex flex-col gap-3 w-full mt-auto border-t border-slate-850 pt-6">
                  <div className="flex items-center gap-3 p-3.5 bg-slate-900/40 rounded-xl border border-slate-800/40">
                    <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary font-black uppercase text-xs shrink-0">
                      {user.role.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-white uppercase truncate">
                        {user.role === "coach" ? "Treinador PRO" : "Convidado"}
                      </span>
                      <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest mt-0.5">
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 p-3 text-slate-500 hover:text-red-400 transition-colors font-extrabold text-[9px] uppercase tracking-wider pl-4"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </aside>

          <div className="flex-grow flex flex-col min-h-screen pb-20 md:pb-0 md:h-screen md:overflow-y-scroll no-scrollbar bg-brand-dark">
            <main className="container mx-auto p-4 md:p-12 relative z-[10] flex-grow no-scrollbar auto-rows-min">
              {iframeCookieWarning && (
                <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">⚠️</span>
                    <p className="text-xs font-bold leading-normal">
                      O navegador bloqueou os cookies de segurança da visualização (iframe). Por favor, clique em <strong className="text-amber-400">"Open in a new tab" (Abrir em nova aba)</strong> no canto superior direito do AI Studio para acessar o sistema normalmente e com sincronização de banco de dados ativa.
                    </p>
                  </div>
                </div>
              )}
              {/* Dashboard Contextual Header / Hero Area */}
              <section className="mb-8 md:mb-10">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 p-6 sm:p-8 md:p-9 rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-800/50 backdrop-blur-3xl relative group overflow-hidden">
                  {/* Abstract decorative elements */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-primary/10 transition-all duration-700 pointer-events-none"></div>

                  <div className="relative z-10 min-w-0">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl bg-slate-900 flex items-center justify-center p-1.5 border border-brand-primary/30 shrink-0 shadow-lg">
                        <img
                          src="/pwa-192x192.svg"
                          className="w-full h-full object-contain"
                          alt="Logo"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[8px] sm:text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] leading-none mb-1 neon-text-glow truncate">
                          {user.role === "coach"
                            ? "Portal do Treinador"
                            : "Perfil do Atleta"}
                        </span>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black italic uppercase tracking-tighter text-white leading-tight truncate">
                          {activeTab === "dash" && "Performance Lab"}
                          {activeTab === "training" && "Training Zone"}
                          {activeTab === "assessment" && "Elite Testing"}
                          {activeTab === "ai-modeling" && "AI Modeling"}
                          {activeTab === "premium" && "Exclusive Area"}
                          {activeTab === "info" && "Guia de Performance"}
                          {activeTab === "injuries" && "Departamento Médico"}
                        </h2>
                      </div>
                    </div>
                  </div>

                  {/* Action Center */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 relative z-[30] w-full xl:w-auto shrink-0 justify-start sm:justify-end">
                    {user.role === "coach" && (
                      <>
                        <div className="relative group w-full sm:w-60 lg:w-64">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary/50 group-focus-within:text-brand-primary transition-colors">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <input
                            type="text"
                            placeholder="BUSCAR ATLETA..."
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl py-3.5 pl-11 pr-10 text-[10px] sm:text-[11px] font-black text-white hover:border-slate-700 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all shadow-xl uppercase tracking-widest placeholder:text-slate-600"
                            value={searchTerm}
                            onChange={(e) => {
                              setSearchTerm(e.target.value);
                              setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                          />
                          {searchTerm && (
                            <button
                              onClick={() => {
                                setSearchTerm("");
                                setShowDropdown(false);
                              }}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}

                          {showDropdown && (
                            <>
                              <div
                                className="fixed inset-0 z-[900]"
                                onClick={() => setShowDropdown(false)}
                              />
                              <div className="absolute top-full left-0 right-0 mt-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-[0_25px_50px_rgba(0,0,0,0.8)] overflow-hidden z-[901] max-h-72 overflow-y-auto backdrop-blur-2xl border-t-brand-primary/40 animate-in">
                                {athletes
                                  .filter((a) =>
                                    a.name
                                      .toLowerCase()
                                      .includes(searchTerm.toLowerCase()),
                                  )
                                  .map((a) => (
                                    <button
                                      key={a.id}
                                      className={`w-full text-left px-5 py-3.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all border-b border-slate-800/50 last:border-0 hover:pl-7 ${selectedId === a.id ? "bg-brand-primary text-brand-dark" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
                                      onClick={() => {
                                        setSelectedId(a.id);
                                        setSearchTerm("");
                                        setShowDropdown(false);
                                      }}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span>{a.name}</span>
                                        {selectedId === a.id && (
                                          <Zap className="w-4 h-4" />
                                        )}
                                      </div>
                                    </button>
                                  ))}
                                {athletes.filter((a) =>
                                  a.name
                                    .toLowerCase()
                                    .includes(searchTerm.toLowerCase()),
                                ).length === 0 && (
                                  <div className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase italic text-center">
                                    Atleta não encontrado
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        <button
                          onClick={() => setModalState({ type: "athlete" })}
                          className="flex items-center justify-center gap-2.5 w-full sm:w-auto bg-brand-primary text-brand-dark px-5 py-3.5 rounded-2xl font-black text-[10px] sm:text-[11px] uppercase tracking-[0.15em] hover:brightness-110 active:scale-95 transition-all shadow-[0_0_25px_rgba(57,255,20,0.25)] group shrink-0 cursor-pointer"
                        >
                          <Plus className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform" />
                          <span className="whitespace-nowrap">Novo Atleta</span>
                        </button>
                      </>
                    )}

                    {/* Quick Database Sync Button */}
                    <div className="relative shrink-0">
                      <button
                        onClick={async () => {
                          const toastId = toast.loading("Sincronizando com banco de dados...");
                          try {
                            await syncData();
                            toast.success("Dados sincronizados com sucesso!", { id: toastId });
                          } catch (error: any) {
                            toast.error(error?.message || "Falha ao sincronizar.", { id: toastId });
                          }
                        }}
                        disabled={syncing}
                        className="flex items-center gap-2 px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-brand-primary/50 text-brand-primary hover:text-white transition-all cursor-pointer shadow-lg group"
                        title="Sincronização em tempo real (Auto-sync a cada 6s)"
                      >
                        <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 text-brand-primary ${syncing ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-700"}`} />
                        <span className="hidden md:inline text-[10px] sm:text-[11px] font-black uppercase tracking-wider">
                          {syncing ? "Sincronizando..." : "Sincronizar"}
                        </span>
                        <span className="flex h-2 w-2 relative" title="Auto-Sync em Tempo Real Ativo">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39FF14] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#39FF14]"></span>
                        </span>
                      </button>
                    </div>

                    {/* Notification Bell */}
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`w-12 h-12 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${showNotifications ? "bg-brand-primary text-brand-dark shadow-[0_0_25px_rgba(57,255,20,0.4)]" : "bg-slate-950/80 border border-slate-800 text-brand-primary hover:border-brand-primary/50"}`}
                        title="Central de Notificações"
                      >
                        <Bell className="w-5 h-5" />
                        {notifications.length > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-slate-900 animate-bounce">
                            {notifications.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
              {/* Render Guia directly without requiring an athlete selection */}
              {activeTab === "info" ? (
                <div className="w-full max-w-7xl mx-auto px-4 py-4 animate-in fade-in duration-500">
                  <AthleteGuide role={user?.role} />
                </div>
              ) : !selected && user.role === "coach" ? (
                <div className="flex flex-col items-center px-4 max-w-7xl mx-auto">
                  {/* Dashboard Stats / Overview */}
                  <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    {[
                      {
                        key: "all",
                        label: "Atletas Totais",
                        value: athletes.length,
                        icon: Users,
                        color: "brand-primary",
                      },
                      {
                        key: "elite",
                        label: "Atletas Elite",
                        value: athletes.filter(
                          (a) => a.competitiveLevel === "elite",
                        ).length,
                        icon: Activity,
                        color: "brand-secondary",
                      },
                      {
                        key: "low-readiness",
                        label: "Baixa Prontidão Hoje",
                        value: athletes.filter((a) => {
                          const today = getLocalDateString();
                          const todayWell = (a.wellness || []).find(
                            (w) => w.date && w.date.startsWith(today),
                          );
                          return todayWell && (todayWell.readinessScore || 0) < 50;
                        }).length,
                        icon: Flame,
                        color: "brand-primary",
                      },
                      {
                        key: "scheduled-today",
                        label: "Atletas com Treino agendado no dia",
                        value: athletes.filter((a) =>
                          (a.workouts || []).some(
                            (wk) =>
                              wk.date && wk.date.startsWith(getLocalDateString()),
                          ),
                        ).length,
                        icon: Calendar,
                        color: "brand-secondary",
                      },
                    ].map(
                      (stat) =>
                        stat && (
                          <button
                            key={stat.key}
                            onClick={() =>
                              setDashboardFilter((prev) =>
                                prev === stat.key ? "all" : (stat.key as any),
                              )
                            }
                            className={`w-full text-left bg-slate-900/40 border p-6 rounded-[2rem] backdrop-blur-xl group hover:border-brand-primary/30 transition-all focus:outline-none ${dashboardFilter === stat.key ? "border-brand-primary bg-slate-800/80 scale-[1.02] shadow-[0_0_20px_rgba(57,255,20,0.15)]" : "border-slate-800/50"}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <stat.icon
                                className={`w-5 h-5 text-${stat.color}`}
                              />
                              <div
                                className={`flex h-1.5 w-1.5 rounded-full ${dashboardFilter === stat.key ? "bg-brand-primary shadow-[0_0_8px_rgba(57,255,20,0.8)]" : "bg-slate-700"}`}
                              />
                            </div>
                            <div className="text-2xl font-black text-white leading-none mb-1">
                              {stat.value}
                            </div>
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none group-hover:text-slate-300 transition-colors">
                              {stat.label}
                            </div>
                          </button>
                        ),
                    )}
                  </div>

                  {dashboardFilter !== "all" && (
                    <div className="w-full flex items-center justify-between bg-brand-primary/5 border border-brand-primary/10 rounded-2xl px-6 py-3.5 mb-6 text-sm font-black text-white uppercase tracking-wider backdrop-blur-md animate-fadeIn">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-brand-primary animate-ping" />
                        <span>
                          Filtrando por:{" "}
                          <span className="text-brand-primary">
                            {dashboardFilter === "elite" && "Atletas Elite"}
                            {dashboardFilter === "low-readiness" &&
                              "Atletas com Baixa Prontidão"}
                            {dashboardFilter === "scheduled-today" &&
                              "Atletas com Treino Agendado no Dia"}
                          </span>
                        </span>
                      </div>
                      <button
                        onClick={() => setDashboardFilter("all")}
                        className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold tracking-widest border border-slate-800 transition-all active:scale-95 uppercase"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Limpar Filtro</span>
                      </button>
                    </div>
                  )}

                  {athletes.length === 0 ? (
                    <div className="w-full py-24 border-2 border-dashed border-slate-800 rounded-[3rem] flex flex-col items-center bg-slate-900/20">
                      <div className="w-16 h-16 bg-slate-800/40 rounded-3xl flex items-center justify-center mb-6 border border-slate-800">
                        <Users className="w-8 h-8 text-slate-600" />
                      </div>
                      <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs mb-3 italic">
                        Seu ecossistema está vazio
                      </p>
                      <p className="text-slate-600 text-[10px] uppercase font-black tracking-wider text-center max-w-md mb-8 leading-relaxed">
                        Nenhum dado de atleta, treino ou avaliação foi
                        encontrado no Supabase conectado no momento.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4 mb-12">
                        <Button
                          onClick={() => setModalState({ type: "athlete" })}
                          className="py-5 px-10 text-[10px] bg-brand-primary text-brand-dark rounded-2xl shadow-[0_0_30px_rgba(57,255,20,0.2)] font-black uppercase tracking-widest"
                        >
                          CADASTRAR PRIMEIRO ATLETA
                        </Button>
                      </div>

                      <div className="w-full border-t border-slate-800/60 pt-8 mt-4 text-center max-w-xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20 rounded-full mb-4">
                          <Database className="w-3.5 h-3.5" />
                          <span className="text-[8px] font-black uppercase tracking-wider">
                            Troubleshooting Supabase
                          </span>
                        </div>
                        <h5 className="text-[11px] font-black text-white uppercase tracking-wider mb-2">
                          Primeira vez configurando o sistema?
                        </h5>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed mb-6">
                          Se você realizou o deploy em um projeto Supabase
                          limpo, as tabelas do banco de dados ainda não
                          existem e as leituras retornam vazio. Você precisa
                          criar a estrutura das tabelas executando o script
                          SQL de migração no painel do Supabase.
                        </p>

                        <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 text-left">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                            Como configurar em 2 passos rápidos:
                          </span>
                          <ol className="list-decimal list-inside text-[9px] text-slate-400 space-y-2 font-medium leading-relaxed">
                            <li>
                              Acesse o painel do seu{" "}
                              <strong>Supabase &gt; SQL Editor</strong>.
                            </li>
                            <li>
                              Crie uma nova Query, copie e cole o conteúdo
                              inteiro do arquivo{" "}
                              <strong className="text-brand-secondary font-mono">
                                supabase_schema.sql
                              </strong>{" "}
                              (disponível na raiz do repositório) e clique em{" "}
                              <strong className="text-green-500">Run</strong>{" "}
                              para gerar as tabelas!
                            </li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* ================== ACOMPANHAMENTO EM TEMPO REAL ================= */}
                      <div className="w-full border border-slate-800/80 bg-[#0d1324]/60 p-6 sm:p-8 rounded-[2rem] backdrop-blur-xl relative">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-[#39ff14]/5 rounded-full filter blur-[100px] pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full filter blur-[100px] pointer-events-none" />

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
                          <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#39ff14] flex items-center gap-2">
                              <span className="inline-block w-2 h-2 rounded-full bg-[#39ff14] animate-pulse" />
                              Acompanhamento em Tempo Real dos Meus Atletas
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-1">
                              Monitoramento dinâmico de todos os atletas por nível de risco de lesão. Carga aguda, carga crônica, ACWR, nível de prontidão e sono. Clique em qualquer linha para abrir o painel individual completo.
                            </p>
                          </div>
                          <div className="flex items-center gap-2.5 self-start md:self-center">
                            <button
                              onClick={() => setModalState({ type: "athlete" })}
                              className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-brand-dark rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(57,255,20,0.2)]"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Adicionar Atleta</span>
                            </button>
                            <div className="flex items-center gap-2 px-3 py-1 bg-[#39ff14]/10 border border-[#39ff14]/20 text-[#39ff14] text-[10px] font-bold uppercase rounded-lg">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse" />
                              Live Roster
                            </div>
                          </div>
                        </div>

                        {featuredAthletesList.length === 0 ? (
                          <div className="py-12 text-center text-slate-500 font-black uppercase text-[10px] tracking-wider italic">
                            Nenhum atleta se enquadra no filtro ativo no momento.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-slate-800/50 relative z-10 no-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                              <thead>
                                <tr className="border-b border-slate-800/80 bg-[#070b16]/80 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                  <th className="py-4 px-4">Atleta</th>
                                  <th className="py-4 px-4 text-center">Esporte / Modalidade</th>
                                  <th className="py-4 px-4 text-center">Carga Aguda (7D)</th>
                                  <th className="py-4 px-4 text-center">Carga Crônica (28D)</th>
                                  <th className="py-4 px-4 text-center">ACWR</th>
                                  <th className="py-4 px-4 text-center">Status</th>
                                  <th className="py-4 px-4 text-center text-blue-400">Readiness</th>
                                  <th className="py-4 px-4 text-center">Sono</th>
                                  <th className="py-4 px-4 font-normal">Observações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {featuredAthletesList.map((ath) => {
                                  const initials = ath.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .substring(0, 2)
                                    .toUpperCase();

                                  return (
                                    <tr
                                      key={ath.id}
                                      onClick={() => {
                                        setSelectedId(ath.id);
                                        toast.success(`Carregando dashboard de ${ath.name}`, { id: "dash-sync" });
                                      }}
                                      className={`border-b border-slate-800/20 transition-all cursor-pointer ${
                                        ath.isSelected
                                          ? "bg-amber-500/[0.04] border-l-2 border-l-amber-500 hover:bg-amber-500/[0.06]"
                                          : "border-l-2 border-l-transparent hover:bg-slate-800/30"
                                      }`}
                                    >
                                      {/* Name / Profile */}
                                      <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                          <div
                                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black select-none transition-transform duration-300 overflow-hidden shrink-0 border ${
                                              ath.isSelected
                                                ? "bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 scale-105 border-amber-400"
                                                : "bg-slate-800 text-slate-300 border-slate-700/60"
                                            }`}
                                          >
                                            <img
                                              src={ath.photoUrl || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e293b"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(%23g)" stroke="%2339ff14" stroke-width="2"/><path d="M50 22 a16 16 0 1 0 0.1 0 Z M22 82 c0-16 13-26 28-26 s28 10 28 26" fill="%2339ff14" opacity="0.85"/><text x="50" y="88" font-size="11" font-family="sans-serif" font-weight="900" fill="%2339ff14" text-anchor="middle">${initials}</text></svg>`}
                                              alt={ath.name}
                                              className="w-full h-full object-cover"
                                              referrerPolicy="no-referrer"
                                            />
                                          </div>
                                          <div>
                                            <span className={ath.isSelected ? "text-xs font-black text-amber-450 block" : "text-xs font-black text-white hover:text-amber-550 block"}>
                                              {ath.name}
                                            </span>
                                            {ath.isSelected && (
                                              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mt-0.5 block animate-pulse">
                                                Ativo no Painel
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </td>

                                      {/* Esporte */}
                                      <td className="py-4 px-4 text-xs font-semibold text-center text-slate-300">
                                        {ath.esporte}
                                      </td>

                                      {/* Carga Aguda */}
                                      <td className="py-4 px-4 text-xs font-mono font-bold text-center text-white">
                                        {ath.acute}
                                      </td>

                                      {/* Carga Crônica */}
                                      <td className="py-4 px-4 text-xs font-mono font-bold text-center text-slate-400">
                                        {ath.chronic}
                                      </td>

                                      {/* ACWR */}
                                      <td className="py-4 px-4 text-xs font-mono font-black text-center">
                                        <span
                                          className={
                                            ath.acwr > 1.3
                                              ? "text-red-400"
                                              : ath.acwr < 0.85
                                              ? "text-amber-450"
                                              : "text-emerald-400"
                                          }
                                        >
                                          {ath.acwr.toFixed(2)}
                                        </span>
                                      </td>

                                      {/* Status */}
                                      <td className="py-4 px-4 text-center">
                                        <span
                                          className={`inline-block px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full tracking-wider border ${ath.statusColor}`}
                                        >
                                          {ath.status}
                                        </span>
                                      </td>

                                      {/* Readiness */}
                                      <td className="py-4 px-4 text-xs font-mono font-black text-center">
                                        {ath.readinessDisplay === "—" ? (
                                          <span className="text-slate-600 font-normal" title="Prontidão não preenchida hoje">
                                            —
                                          </span>
                                        ) : ath.isLowReadinessToday ? (
                                          <span className="text-rose-400 font-extrabold bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]" title="Baixa prontidão registrada hoje (<50%)">
                                            {ath.readinessDisplay}
                                          </span>
                                        ) : (
                                          <span className="text-blue-400 font-black">
                                            {ath.readinessDisplay}
                                          </span>
                                        )}
                                      </td>

                                      {/* Sono */}
                                      <td className="py-4 px-4 text-xs font-semibold text-center text-slate-300">
                                        {ath.sono}
                                      </td>

                                      {/* Observações */}
                                      <td className="py-4 px-4 text-xs text-slate-400 max-w-[200px] truncate">
                                        {ath.obs}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <p className="mt-20 text-slate-700 font-black uppercase text-[10px] tracking-[0.6em] opacity-40">
                    LB PERFORMANCE ECOSYSTEM v2.5
                  </p>
                </div>
              ) : !selected ? (
                <div className="text-center py-20">
                  <p className="text-slate-400 font-black uppercase tracking-widest">
                    Erro ao carregar dados do atleta.
                  </p>
                  <Button onClick={handleLogout} className="mt-4 mx-auto">
                    Voltar ao Login
                  </Button>
                </div>
              ) : (
                <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                  {user.role === "coach" && (
                    <div className="flex items-center justify-start">
                      <button
                        onClick={() => setSelectedId(null)}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-brand-primary/30 text-slate-300 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 shadow-xl group cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4 text-brand-primary group-hover:-translate-x-1 transition-transform" />
                        <span>Voltar ao Painel Geral</span>
                      </button>
                    </div>
                  )}
                  {user.role === "athlete" ? (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-6 duration-550 mb-6">
                      {(() => {
                        const isBirthdayToday = (dobString?: string) => {
                          if (!dobString) return false;
                          const dobParts = dobString.split("-");
                          if (dobParts.length < 3) return false;
                          const todayParts = getLocalDateString().split("-");
                          return dobParts[1] === todayParts[1] && dobParts[2] === todayParts[2];
                        };
                        
                        if (isBirthdayToday(selected.dob)) {
                          return (
                            <div className="relative overflow-hidden bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-brand-primary/15 border border-brand-primary/30 rounded-[2rem] p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-[0_0_50px_rgba(57,255,20,0.06)] animate-fadeIn">
                              {/* Animated background stars/confetti placeholders */}
                              <div className="absolute top-2 right-4 text-xs opacity-40 animate-bounce">✨</div>
                              <div className="absolute bottom-3 left-6 text-xs opacity-40 animate-ping">🎉</div>
                              <div className="absolute top-6 left-1/3 text-sm opacity-30">🎈</div>
                              <div className="absolute bottom-2 right-1/4 text-sm opacity-30">🎂</div>

                              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-brand-primary/20 flex items-center justify-center border border-brand-primary/40 text-4xl shrink-0 shadow-2xl relative">
                                🎂
                                <span className="absolute -top-1 -right-1 text-xs">🎉</span>
                              </div>
                              <div className="text-center md:text-left space-y-2 flex-grow">
                                <h2 className="text-lg md:text-xl font-black text-brand-primary uppercase tracking-wider italic">
                                  Feliz Aniversário, {selected.name.split(" ")[0]}! 🥳🎈
                                </h2>
                                <p className="text-xs text-slate-200 leading-relaxed max-w-2xl font-medium">
                                  Toda a equipe <strong>LB Sports</strong> te deseja parabéns! Que este novo ciclo seja de muita saúde, consistência nos treinos, recordes superados e uma evolução esportiva de nível elite! Vamos juntos conquistar novos patamares. 🚀💪
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => setModalState({ type: "profile-photo-options", editingData: selected })}
                            className="relative w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/30 hover:border-brand-primary flex items-center justify-center shrink-0 shadow-lg overflow-hidden group cursor-pointer transition-all"
                            title="Clique para Opções do Perfil / Editar Foto"
                          >
                            <img
                              src={selected.photoUrl || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e293b"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><rect width="100" height="100" rx="20" fill="url(%23g)" stroke="%2339ff14" stroke-width="2"/><path d="M50 22 a16 16 0 1 0 0.1 0 Z M22 82 c0-16 13-26 28-26 s28 10 28 26" fill="%2339ff14" opacity="0.85"/></svg>`}
                              alt={selected.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Camera className="w-5 h-5 text-brand-primary" />
                            </div>
                          </button>
                          <div className="flex flex-col">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold italic uppercase tracking-tight text-white leading-none">
                              Olá, {selected.name.split(" ")[0]}
                            </h1>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-brand-primary uppercase">
                                {(selected.modality || "Preparação Física").toUpperCase()} | ELITE COMMAND CENTER
                              </span>
                              <button
                                type="button"
                                onClick={() => setModalState({ type: "profile-photo-options", editingData: selected })}
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[9px] font-black uppercase text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer shadow-sm"
                              >
                                <Pencil className="w-2.5 h-2.5 text-brand-primary" />
                                <span>Editar Perfil</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Athlete Sync & Logout Actions */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={async () => {
                              const toastId = toast.loading("Sincronizando seus treinos...");
                              await syncData();
                              toast.success("Dados Atualizados!", { id: toastId });
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-brand-primary/30 text-slate-300 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg group"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-[#39FF14] group-hover:rotate-180 transition-transform duration-700" />
                            <span>Sincronizar</span>
                          </button>

                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5 text-red-500" />
                            <span>Sair</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                        {/* 1. Today's Active Session Card */}
                        {(() => {
                          const today = getLocalDateString();
                          const workoutsToday = (selected.workouts || []).filter(
                            (w: any) => w.date && w.date.startsWith(today)
                          );
                          const activeWorkoutToday = workoutsToday.find((w: any) => w.status !== "completed");
                          const completedWorkoutToday = workoutsToday.find((w: any) => w.status === "completed");
                          
                          if (activeWorkoutToday) {
                            return (
                              <div 
                                onClick={() => {
                                  setActiveTab("training");
                                  startWorkoutFlow(activeWorkoutToday);
                                }}
                                className="flex items-center gap-5 bg-gradient-to-br from-[#111827] to-[#0b0f19] hover:from-[#1f2937] hover:to-[#111827] border border-slate-800 hover:border-brand-primary/40 p-6 rounded-[2rem] shadow-2xl transition-all cursor-pointer group hover:scale-[1.01]"
                              >
                                <div className="w-14 h-14 bg-[#10b981]/15 rounded-2xl flex items-center justify-center border border-[#10b981]/30 shrink-0 group-hover:scale-105 transition-transform">
                                  <Dumbbell className="w-7 h-7 text-[#10b981]" />
                                </div>
                                <div className="flex flex-col min-w-0 flex-grow">
                                  <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Sessão Ativa</span>
                                  <span className="text-lg font-black text-white uppercase italic tracking-tight leading-none mt-1 truncate">
                                    HOJE, {getFormattedDatePT().toUpperCase()}
                                  </span>
                                  <span className="text-xs font-bold text-[#10b981] mt-1.5 truncate uppercase">
                                    {activeWorkoutToday.name}
                                  </span>
                                </div>
                              </div>
                            );
                          } else if (completedWorkoutToday) {
                            return (
                              <div 
                                onClick={() => {
                                  setActiveTab("training");
                                  setWorkoutStatusFilter("completed");
                                }}
                                className="flex items-center gap-5 bg-gradient-to-br from-[#064e3b]/30 to-[#022c22]/10 border border-emerald-500/30 p-6 rounded-[2rem] shadow-2xl transition-all cursor-pointer group hover:scale-[1.01]"
                              >
                                <div className="w-14 h-14 bg-emerald-500/25 rounded-2xl flex items-center justify-center border border-emerald-500/40 shrink-0 group-hover:scale-105 transition-transform">
                                  <svg className="w-7 h-7 text-emerald-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <div className="flex flex-col min-w-0 flex-grow">
                                  <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">Sessão Concluída</span>
                                  <span className="text-lg font-black text-white uppercase italic tracking-tight leading-none mt-1">
                                    HOJE ESTÁ PAGO! 🎉
                                  </span>
                                  <span className="text-xs font-bold text-slate-400 mt-1.5 truncate uppercase">
                                    {completedWorkoutToday.name}
                                  </span>
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="flex items-center gap-5 bg-gradient-to-br from-[#111827]/40 to-[#0b0f19]/40 border border-slate-800/60 p-6 rounded-[2rem] shadow-xl">
                                <div className="w-14 h-14 bg-slate-800/40 rounded-2xl flex items-center justify-center border border-slate-700/30 text-slate-600 shrink-0">
                                  <Calendar className="w-7 h-7" />
                                </div>
                                <div className="flex flex-col min-w-0 flex-grow">
                                  <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Sessão de Treino</span>
                                  <span className="text-base font-black text-slate-400 uppercase italic tracking-tight leading-none mt-1">
                                    SEM TREINOS AGENDADOS HOJE
                                  </span>
                                  <span className="text-[10.5px] font-medium text-slate-500 mt-1.5">
                                    Para hoje você está liberado! Descanse bem.
                                  </span>
                                </div>
                              </div>
                            );
                          }
                        })()}

                        {/* 2. Controle de Prontidão Card */}
                        {(() => {
                          const hasWellnessToday = selected.wellness && selected.wellness.some((w: any) => w.date && w.date.startsWith(getLocalDateString()));
                          const todayReadiness = selected.wellness && selected.wellness[0]?.date && selected.wellness[0].date.startsWith(getLocalDateString()) ? selected.wellness[0].readinessScore : null;

                          return (
                            <div 
                              onClick={() => setModalState({ type: "wellness" })}
                              className={`flex flex-col justify-between p-6 rounded-[2rem] shadow-2xl transition-all cursor-pointer hover:scale-[1.01] ${
                                hasWellnessToday
                                  ? "bg-gradient-to-br from-[#111827] to-[#0b0f19] border border-emerald-500/40 hover:border-emerald-500/60"
                                  : "bg-gradient-to-br from-[#241a02] via-[#0f0a00] to-slate-950 border-2 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.25)] animate-pulse"
                              }`}
                            >
                              <div className="flex items-start gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shrink-0 ${
                                  hasWellnessToday 
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                                    : "bg-amber-550 border-amber-400 text-slate-950 animate-bounce shadow-[0_0_15px_rgba(245,158,11,0.6)] font-bold scale-115"
                                }`}>
                                  <Activity className="w-7 h-7" />
                                </div>
                                <div className="flex flex-col min-w-0 flex-grow">
                                  <span className={`text-[10px] font-black tracking-widest uppercase ${hasWellnessToday ? "text-slate-500" : "text-amber-400 font-black animate-pulse"}`}>CONTROLE DE PRONTIDÃO</span>
                                  <span className={`text-lg font-black uppercase italic tracking-tight mt-0.5 leading-tight ${hasWellnessToday ? "text-white" : "text-amber-300 font-black"}`}>
                                    {hasWellnessToday ? `CHECK-IN CONCLUÍDO (${todayReadiness}%)` : "CHECK-IN DE HOJE PENDENTE"}
                                  </span>
                                  <p className="text-[10px] font-medium text-slate-400 mt-1.5 leading-relaxed">
                                    {hasWellnessToday 
                                      ? "Sua prontidão diária foi registrada com sucesso! Ótimo treino." 
                                      : "Atenção: atualize seus dados de recuperação antes do treino para medir seu score de prontidão."}
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModalState({ type: "wellness" });
                                }}
                                className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] mt-5 transition-all active:scale-95 shadow-lg ${
                                  hasWellnessToday
                                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950"
                                    : "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 font-black border border-amber-300 shadow-amber-500/40 hover:brightness-110 animate-pulse-subtle scale-[1.01]"
                                }`}
                              >
                                {hasWellnessToday ? "ATUALIZAR PRONTIDÃO" : "REALIZAR CHECK-IN AGORA!"}
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
                      <Card className={`${activeTab === "training" ? "lg:col-span-3" : "lg:col-span-4"} premium-card p-1`}>
                        <div className="grid grid-cols-1 md:grid-cols-12 items-stretch overflow-hidden rounded-[2.4rem] min-h-[450px]">
                          <div className="flex flex-col p-6 sm:p-8 md:p-10 md:col-span-12 lg:col-span-12 xl:col-span-12 flex-grow">
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
                              <button
                                type="button"
                                onClick={() => setModalState({ type: "profile-photo-options", editingData: selected })}
                                className="relative w-16 h-16 md:w-24 md:h-24 bg-slate-800 rounded-2xl md:rounded-3xl flex items-center justify-center text-brand-primary border border-slate-700 hover:border-brand-primary shadow-2xl shrink-0 overflow-hidden group cursor-pointer transition-all"
                                title="Clique para Opções do Perfil e Foto"
                              >
                                {selected.photoUrl ? (
                                  <img src={selected.photoUrl} alt={selected.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <img
                                    src={`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e293b"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><rect width="100" height="100" rx="20" fill="url(%23g)" stroke="%2339ff14" stroke-width="2"/><path d="M50 22 a16 16 0 1 0 0.1 0 Z M22 82 c0-16 13-26 28-26 s28 10 28 26" fill="%2339ff14" opacity="0.85"/></svg>`}
                                    alt={selected.name}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                                <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity">
                                  <Camera className="w-5 h-5 md:w-6 md:h-6 text-brand-primary" />
                                  <span className="text-[8px] font-black text-white uppercase tracking-wider hidden md:block">Editar Foto</span>
                                </div>
                              </button>
                              <div className="flex-grow min-w-0 w-full">
                                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                                  <h2 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight uppercase text-white leading-tight break-words pr-2 sm:pr-4">
                                    {selected.name}
                                  </h2>
                                  {user.role === "coach" && (
                                    <div className="flex items-center gap-2 shrink-0 mt-2 md:mt-0">
                                      <button
                                        onClick={() =>
                                          setModalState({
                                            type: "profile-photo-options",
                                            editingData: selected,
                                          })
                                        }
                                        className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-brand-primary text-slate-300 hover:text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-xl border border-slate-700 cursor-pointer group"
                                        title="Opções de Editar Perfil e Foto"
                                      >
                                        <Pencil className="w-4 h-4 text-brand-primary group-hover:text-slate-950" />
                                        <span>Editar Perfil</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (
                                            window.confirm(
                                              `AVISO CRÍTICO: Deseja realmente excluir o atleta ${selected.name} e TODO o seu histórico? Esta ação é irreversível.`,
                                            )
                                          ) {
                                            deleteAthlete(selected.id);
                                            setSelectedId(null);
                                          }
                                        }}
                                        className="p-2.5 sm:p-3 bg-red-500/10 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-xl"
                                        title="Excluir Atleta"
                                      >
                                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
                                  <span className="text-brand-primary font-black uppercase text-[9px] sm:text-[10px] tracking-widest bg-brand-primary/10 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border border-brand-primary/20 neon-text-glow">
                                    Elite Athlete
                                  </span>
                                  <span className="text-slate-400 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest">
                                    {calculateAge(selected.dob)} ANOS
                                  </span>
                                  <div className="w-1 h-1 bg-slate-700 rounded-full hidden sm:block" />
                                  <span className="text-slate-400 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest">
                                    {selected.modality || "SEM MODALIDADE"}
                                  </span>
                                  <div className="w-1 h-1 bg-slate-700 rounded-full hidden sm:block" />
                                  <span className="text-brand-primary font-bold uppercase text-[9px] sm:text-[10px] tracking-widest bg-brand-primary/5 px-2.5 sm:px-3 py-1 rounded-lg border border-brand-primary/10">
                                    FREQ: {selected.weeklyFrequency || 0}x/SEM
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                              <div className="bg-slate-950/40 border border-slate-800/50 p-5 sm:p-6 rounded-2xl sm:rounded-3xl">
                                <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                  Missão / Objetivo
                                </span>
                                <span className="text-base sm:text-lg font-black text-white uppercase italic tracking-tight leading-tight">
                                  {selected.goal || "Performance Máxima"}
                                </span>
                              </div>
                              <div className="bg-slate-950/40 border border-slate-800/50 p-5 sm:p-6 rounded-2xl sm:rounded-3xl">
                                <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                  Protocolo LBHUB
                                </span>
                                <span className="text-base sm:text-lg font-black text-brand-secondary uppercase italic tracking-tight leading-tight">
                                  {formatCompetitiveLevel(selected.competitiveLevel, selected.modality) ||
                                    "Nível Profissional"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>

                      {activeTab === "training" && (() => {
                        const hasWellnessToday = selected.wellness && selected.wellness.some((w: any) => w.date && w.date.startsWith(getLocalDateString()));
                        const todayReadiness = selected.wellness && selected.wellness[0]?.date && selected.wellness[0].date.startsWith(getLocalDateString()) ? selected.wellness[0].readinessScore : null;

                        return (
                          <Card
                            className={`flex flex-col justify-center items-center text-center p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group cursor-pointer rounded-[2.5rem] border-2 transition-all duration-550 hover:scale-[1.02] ${
                              hasWellnessToday 
                                ? "bg-gradient-to-br from-[#021d15] via-[#04100c] to-brand-dark border-emerald-500/50 shadow-[0_0_35px_rgba(16,185,129,0.2)]"
                                : "bg-gradient-to-br from-[#1e1c0c] via-[#100e05] to-[#0d0a02] border-amber-500 shadow-[0_0_45px_rgba(245,158,11,0.35)] animate-pulse"
                            }`}
                            onClick={() => setModalState({ type: "wellness" })}
                          >
                            {/* Background animation element */}
                            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2 group-hover:scale-125 transition-all duration-700 ${
                              hasWellnessToday ? "bg-emerald-500/10" : "bg-amber-500/20"
                            }`}></div>

                            <div className="relative z-10 w-full flex flex-col items-center">
                              {hasWellnessToday ? (
                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40 mb-2.5">
                                  <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-400/55 mb-2.5 animate-bounce">
                                  <Brain className="w-5 h-5 text-amber-400 stroke-[3]" />
                                </div>
                              )}

                              <p className={`text-[12px] font-black uppercase tracking-[0.25em] mb-3 relative z-10 ${hasWellnessToday ? "text-emerald-400" : "text-amber-400 font-extrabold"}`}>
                                {hasWellnessToday ? "RECUPERAÇÃO ENVIADA ✅" : "⚠️ PREENCHER PRONTIDÃO"}
                              </p>

                              <div className="relative z-10 mb-6 font-mono flex flex-col items-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Score Diário</span>
                                <div className={`text-6xl md:text-7xl font-black tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] ${
                                  hasWellnessToday ? "text-emerald-400" : "text-amber-400"
                                }`}>
                                  {todayReadiness !== null ? todayReadiness : "--"}
                                  <span className="text-2xl text-slate-700">%</span>
                                </div>
                              </div>

                              {hasWellnessToday ? (
                                <div className="w-full px-6 py-4 bg-emerald-950/25 rounded-2xl border border-emerald-500/20 relative z-10 mb-8">
                                  <p className="text-[10.5px] font-extrabold uppercase leading-tight tracking-[0.1em] text-emerald-300">
                                    {getReadinessInsight(todayReadiness || 0).text}
                                  </p>
                                </div>
                              ) : (
                                <div className="w-full px-6 py-4 bg-amber-950/25 rounded-2xl border border-amber-500/30 relative z-10 mb-8">
                                  <p className="text-[10px] font-black uppercase leading-relaxed tracking-[0.1em] text-amber-300 animate-pulse">
                                    REGISTRO PENDENTE! CLIQUE PARA ENVIAR AGORA.
                                  </p>
                                </div>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModalState({ type: "wellness" });
                                }}
                                className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] relative z-10 transition-all active:scale-95 shadow-xl ${
                                  hasWellnessToday
                                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 hover:shadow-emerald-500/20"
                                    : "bg-gradient-to-r from-amber-500 to-yellow-500 border border-yellow-400 text-slate-950 shadow-amber-500/30 hover:brightness-110 hover:scale-[1.01]"
                                }`}
                              >
                                {hasWellnessToday ? "ATUALIZAR PRONTIDÃO" : "ENVIAR PRONTIDÃO!"}
                              </button>
                            </div>
                          </Card>
                        );
                      })()}
                    </div>
                  )}

                  <div className="w-full flex items-center gap-6 mt-4 md:mt-8 mb-8">
                    <div className="h-px flex-grow bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
                    <LayoutDashboard className="w-4 h-4 text-slate-800" />
                    <div className="h-px flex-grow bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
                  </div>

                  <div className="min-h-[400px]">
                    {activeTab === "dash" && (
                      <DashboardView
                        athlete={selected}
                        onAddWellness={() => setModalState({ type: "wellness" })}
                        onDeleteWellness={(id) => {
                          deleteWellness(selected.id, id);
                        }}
                        onEditWellness={(data) =>
                          setModalState({
                            type: "edit-wellness",
                            editingData: data,
                          })
                        }
                        onAddExternalSession={(s) =>
                          addExternalSession(selected.id, s)
                        }
                        onUpdateExternalSession={(id, s) =>
                          updateExternalSession(selected.id, id, s)
                        }
                        onDeleteExternalSession={(id) => {
                          if (
                            window.confirm(
                              "Excluir este treino de quadra/externo?",
                            )
                          ) {
                            deleteExternalSession(selected.id, id);
                          }
                        }}
                        onUpdateAthlete={(data) =>
                          updateAthlete(selected.id, data)
                        }
                        role={user.role}
                        onStartWorkout={startWorkoutFlow}
                        athletes={athletes}
                        onSelectAthleteId={setSelectedId}
                        dashboardSubTab={dashboardSubTab}
                        setDashboardSubTab={setDashboardSubTab}
                      />
                    )}

                    {activeTab === "premium" && <PremiumHub />}

                    {activeTab === "ai-modeling" && selected && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-700">
                        {aiModelingResult ? (
                          <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/40 p-6 rounded-[2rem] border border-slate-800">
                              <div>
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                                  Gerenciador de Inteligência
                                </h3>
                                <h2 className="text-sm font-black text-white uppercase italic tracking-tight">
                                  Modelagem Preditiva de {selected.name.toUpperCase()}
                                </h2>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                <Button
                                  onClick={handleAiAnalysis}
                                  disabled={aiLoading}
                                  variant="primary"
                                  className="px-6 py-2.5 text-[9px] font-black tracking-wider uppercase rounded-xl flex items-center gap-2"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  {aiLoading ? "PROCESSANDO..." : "GERAR RELATÓRIO PREDITIVO"}
                                </Button>
                                <Button
                                  onClick={() => setAiModelingResult(null)}
                                  variant="secondary"
                                  className="px-6 py-2.5 text-[9px] font-black tracking-wider uppercase rounded-xl border-slate-800 bg-slate-950 text-slate-400"
                                >
                                  Escolher Outra Ferramenta
                                </Button>
                              </div>
                            </div>
                            <AIModelingReport
                              athlete={selected}
                              modeling={aiModelingResult}
                              onBack={() => setAiModelingResult(null)}
                              role={user.role}
                            />
                          </div>
                        ) : (
                          <div className="space-y-8">
                            <div className="bg-slate-950/30 border border-slate-800 rounded-[2rem] p-6 text-left">
                              <h3 className="text-xs font-black uppercase text-slate-500 tracking-[0.2em] mb-2">
                                Centro de Inteligência Artificial LBSports
                              </h3>
                              <p className="text-xs text-slate-400 font-bold leading-relaxed max-w-3xl">
                                Selecione uma das ferramentas inteligentes abaixo para avaliar e projetar a performance do atleta <span className="text-brand-primary">{selected.name}</span>. Ambos os relatórios utilizam inteligência avançada baseada em dados reais inseridos no sistema.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* FERRAMENTA 1: MODELAGEM PREDITIVA */}
                              <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 flex flex-col justify-between gap-6 hover:border-slate-700/50 transition-all relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-purple-500/10 transition-colors"></div>
                                <div className="space-y-4 relative z-10">
                                  <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 border border-purple-500/20">
                                    <Brain className="w-6 h-6" />
                                  </div>
                                  <div>
                                    <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1 leading-none">Mapeamento</h3>
                                    <h4 className="text-base font-black text-white uppercase tracking-tight">MODELAGEM PREDITIVA (BIO-PROFILE)</h4>
                                    <p className="text-xs text-slate-400 leading-relaxed font-bold mt-3">
                                      Desenha o DNA e perfil neurofisiológico completo do atleta. Analisa a consistência dos testes físicos, evolução histórica de cargas, e mapeia fraquezas (gaps) para sugerir direcionamentos de alta performance.
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  onClick={() => handleGenerateAIModeling(false)}
                                  disabled={aiModelingLoading}
                                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 border border-purple-500/20 text-white font-black uppercase tracking-wider rounded-xl shadow-lg shadow-purple-950/40 hover:brightness-110 active:scale-95 transition-all text-[10px] relative z-10"
                                >
                                  {aiModelingLoading ? "PROCESSANDO MODELAGEM..." : "CONFIRMAR E GERAR AGORA"}
                                </Button>
                              </div>

                              {/* FERRAMENTA 2: RELATÓRIO PREDITIVO COMPLETO */}
                              <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 flex flex-col justify-between gap-6 hover:border-slate-700/50 transition-all relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
                                <div className="space-y-4 relative z-10">
                                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                    <Sparkles className="w-6 h-6" />
                                  </div>
                                  <div>
                                    <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 leading-none">Diagnóstico Dinâmico</h3>
                                    <h4 className="text-base font-black text-white uppercase tracking-tight">RELATÓRIO PREDITIVO COMPLETO</h4>
                                    <p className="text-xs text-slate-400 leading-relaxed font-bold mt-3">
                                      Consolida o prontuário de saúde, bem-estar diário, sono, fadiga de viagens e sintomas relatados. Gera um laudo em formato de impressão (PDF) com percentual de prontidão física e recomendações táticas preventivas.
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  onClick={handleAiAnalysis}
                                  disabled={aiLoading}
                                  variant="primary"
                                  className="w-full py-4 text-[10px] font-black tracking-widest uppercase rounded-xl relative z-10"
                                >
                                  {aiLoading ? "PROCESSANDO RELATÓRIO..." : "CONFIRMAR E GERAR RELATÓRIO"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "training" && (
                      <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
                        {/* Sub-tabs for training */}
                        <div className="flex bg-slate-900/80 p-1 rounded-2xl border border-slate-800 max-w-sm gap-1">
                          <button
                            onClick={() => setTrainingSubTab("planned")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              trainingSubTab === "planned"
                                ? "bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20 font-black shadow-lg"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            <ClipboardList className="w-4 h-4" />
                            <span>Sessão Planejada</span>
                          </button>
                          <button
                            onClick={() => setTrainingSubTab("external")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              trainingSubTab === "external"
                                ? "bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20 font-black shadow-lg"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            <Dumbbell className="w-4 h-4" />
                            <span>Sessão Externa</span>
                          </button>
                        </div>

                        {trainingSubTab === "planned" && (
                          <>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div>
                                <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-[#fcfdff] leading-none">
                                  Atividades Planejadas
                                </h3>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                                <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs font-bold gap-1 w-full sm:w-auto">
                                  <button
                                    onClick={() => setWorkoutStatusFilter("pending")}
                                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                      workoutStatusFilter === "pending"
                                        ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                                        : "text-slate-400 hover:text-slate-200"
                                    }`}
                                  >
                                    Pendentes
                                  </button>
                                  <button
                                    onClick={() => setWorkoutStatusFilter("completed")}
                                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                      workoutStatusFilter === "completed"
                                        ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                                        : "text-slate-400 hover:text-slate-200"
                                    }`}
                                  >
                                    Concluídos
                                  </button>
                                  <button
                                    onClick={() => setWorkoutStatusFilter("all")}
                                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                      workoutStatusFilter === "all"
                                        ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                                        : "text-slate-400 hover:text-slate-200"
                                    }`}
                                  >
                                    Todos
                                  </button>
                                </div>
                                {user.role === "coach" && (
                                  <Button
                                    variant="secondary"
                                    onClick={() => setModalState({ type: "workout" })}
                                    className="w-full sm:w-auto font-black tracking-widest text-[10px]"
                                  >
                                    + NOVA PLANILHA
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                          {[...(selected.workouts || [])]
                            .filter((w) => {
                              if (workoutStatusFilter === "pending") return w.status !== "completed";
                              if (workoutStatusFilter === "completed") return w.status === "completed";
                              return true;
                            })
                            .sort(
                              (a, b) =>
                                workoutStatusFilter === "completed"
                                  ? getSafeDateTime(b.date) - getSafeDateTime(a.date)
                                  : getSafeDateTime(a.date) - getSafeDateTime(b.date),
                            )
                            .map((w, index) => (
                              <Card
                                key={w.id}
                                onClick={() => {
                                  if (w.status === "completed") {
                                    setModalState({
                                      type: "active-session",
                                      editingData: w,
                                    });
                                  } else {
                                    startWorkoutFlow(w);
                                  }
                                }}
                                className={`flex flex-col border-l-4 md:border-l-8 transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer relative group overflow-hidden ${w.status === "completed" ? "border-emerald-500 opacity-95 hover:opacity-100 duration-200" : "border-brand-primary"}`}
                              >
                                <div className="flex flex-col mb-5 w-full">
                                  {/* Metadata Header Badges */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3 w-full">
                                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                                      <span className="text-[9px] md:text-[10px] font-black bg-slate-900/90 text-slate-300 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-slate-800">
                                        {w.phase}
                                      </span>
                                      {(() => {
                                        const workoutDateStr =
                                          w.date.split("T")[0];
                                        const wellnessEntry = Array.isArray(selected.wellness)
                                          ? selected.wellness.find(
                                              (well) =>
                                                well.date &&
                                                well.date.split("T")[0] ===
                                                workoutDateStr,
                                            )
                                          : undefined;
                                        if (wellnessEntry) {
                                          return (
                                            <span
                                              className={`text-[9px] md:text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border border-slate-800 ${getReadinessInsight(wellnessEntry.readinessScore || 0).color} bg-slate-900/90`}
                                            >
                                              Prontidão:{" "}
                                              {wellnessEntry.readinessScore}%
                                            </span>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>
                                    <span className="text-[9px] md:text-[10px] font-black text-[#39FF14] bg-[#39FF14]/10 border border-[#39FF14]/20 px-2.5 py-1 rounded-lg uppercase tracking-widest shrink-0">
                                      {formatDate(w.date)}
                                    </span>
                                  </div>

                                  {/* Workout Name & Action Buttons Row */}
                                  <div className="flex items-center justify-between gap-2 w-full mt-1">
                                    <h5 className="text-xl md:text-2xl font-black uppercase italic text-brand-primary leading-tight tracking-tight drop-shadow-[0_0_8px_rgba(75,222,5,0.3)] truncate min-w-0 flex-1">
                                      {w.name}
                                    </h5>
                                    {user.role === "coach" && (
                                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setModalState({
                                              type: w.status === "completed" ? "active-session" : "edit-workout",
                                              editingData: w,
                                            });
                                          }}
                                          className="p-2 text-slate-300 hover:text-brand-primary transition-colors bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 shadow-sm cursor-pointer"
                                          title="Editar"
                                        >
                                          <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2.5}
                                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                            />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setModalState({
                                              type: "clone-workout",
                                              editingData: w,
                                            });
                                          }}
                                          className="p-2 text-slate-300 hover:text-brand-secondary transition-colors bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 shadow-sm cursor-pointer"
                                          title="Duplicar / Clonar"
                                        >
                                          <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2.5}
                                              d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                                            />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (
                                              window.confirm(
                                                "Deseja excluir permanentemente este treino?",
                                              )
                                            ) {
                                              deleteWorkout(
                                                selected.id,
                                                w.id,
                                              );
                                            }
                                          }}
                                          className="p-2 text-slate-300 hover:text-red-400 transition-colors bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 shadow-sm hover:bg-red-500/10 cursor-pointer"
                                          title="Excluir"
                                        >
                                          <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2.5}
                                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                          </svg>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="mb-6 flex-grow">
                                  <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5">
                                    Foco da Sessão
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {(w.exercises || [])
                                      .slice(0, 4)
                                      .map((ex) => (
                                        <span
                                          key={ex.id}
                                          className="text-[9px] md:text-[10px] bg-slate-900/90 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800 font-bold max-w-full truncate"
                                        >
                                          {ex.name}
                                        </span>
                                      ))}
                                    {(w.exercises || []).length > 4 && (
                                      <span className="text-[9px] md:text-[10px] bg-slate-900/60 text-slate-400 px-2 py-1 rounded-lg border border-slate-800 font-black tracking-widest">
                                        +{(w.exercises || []).length - 4}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {w.status === "completed" ? (
                                  <div className="mt-auto pt-4 border-t border-slate-800 flex flex-col gap-3">
                                    <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800">
                                      {/* Duration */}
                                      <div className="flex flex-col p-2 bg-slate-900/90 rounded-xl border border-slate-800/80">
                                        <div className="flex items-center gap-1 text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                          <Clock className="w-3 h-3 text-slate-400" />
                                          <span>Duração</span>
                                        </div>
                                        <span className="text-[11px] font-black text-white">
                                          {w.durationMinutes || '--'} min
                                        </span>
                                      </div>

                                      {/* PSE (RPE) */}
                                      <div className="flex flex-col p-2 bg-slate-900/90 rounded-xl border border-slate-800/80">
                                        <div className="flex items-center gap-1 text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                          <Activity className="w-3 h-3 text-slate-400" />
                                          <span>PSE Atleta</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-[11px] font-black text-white">
                                            {w.rpe || '--'}/10
                                          </span>
                                          {w.rpe && (
                                            <span className={`text-[7px] font-bold px-1 py-0.5 rounded-md uppercase tracking-wider ${
                                              w.rpe <= 3 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                              w.rpe <= 6 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                              w.rpe <= 8 ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                                              "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                            }`}>
                                              {w.rpe <= 3 ? "Leve" : w.rpe <= 6 ? "Mod." : w.rpe <= 8 ? "Int." : "Ext."}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Total Volume */}
                                      <div className="flex flex-col p-2 bg-slate-900/90 rounded-xl border border-slate-800/80">
                                        <div className="flex items-center gap-1 text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                          <Dumbbell className="w-3 h-3 text-slate-400" />
                                          <span>Volume</span>
                                        </div>
                                        <span className="text-[11px] font-black text-white truncate" title={`${w.totalLoad?.toLocaleString() || '0'} kg`}>
                                          {w.totalLoad?.toLocaleString() || '0'} kg
                                        </span>
                                      </div>

                                      {/* Internal Load (PSE * Time) */}
                                      <div className="flex flex-col p-2 bg-slate-900/90 rounded-xl border border-slate-800/80">
                                        <div className="flex items-center gap-1 text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                          <Zap className="w-3 h-3 text-amber-400" />
                                          <span>Carga Int.</span>
                                        </div>
                                        <span className="text-[11px] font-black text-white" title={`${((w.durationMinutes || 0) * (w.rpe || 0)).toLocaleString()} u.a.`}>
                                          {((w.durationMinutes || 0) * (w.rpe || 0)).toLocaleString()} u.a.
                                        </span>
                                      </div>
                                    </div>

                                    {/* Peak Pain Warning */}
                                    {(() => {
                                      const maxPain = (w.exercises || []).reduce((max: number, ex: any) => Math.max(max, ex.painLevel || 0), 0) || 0;
                                      if (maxPain > 0) {
                                        return (
                                          <div className={`flex items-center gap-2 p-2 rounded-xl border text-[9px] font-bold uppercase tracking-wider ${
                                            maxPain <= 3 
                                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                          }`}>
                                            <span className="flex h-1.5 w-1.5 relative">
                                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${maxPain <= 3 ? "bg-amber-400" : "bg-rose-400"}`}></span>
                                              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${maxPain <= 3 ? "bg-amber-500" : "bg-rose-500"}`}></span>
                                            </span>
                                            <span>Dor Máxima Relatada: {maxPain}/10</span>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}

                                    {/* Subjective Biofeedback Text */}
                                    {w.feedback && w.feedback !== "Treino concluído com biofeedback de alta performance." && (
                                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[10px] text-slate-300 font-medium italic leading-relaxed">
                                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest not-italic mb-1">Feedback do Atleta</p>
                                        "{w.feedback}"
                                      </div>
                                    )}

                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setModalState({
                                          type: "active-session",
                                          editingData: w,
                                        });
                                      }}
                                      variant="secondary"
                                      className="w-full py-3.5 text-[10px] font-black tracking-widest uppercase"
                                    >
                                      EDITAR SESSÃO
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startWorkoutFlow(w);
                                    }}
                                    variant="primary"
                                    className="w-full mt-auto py-4 text-[10px] font-black tracking-widest uppercase bg-[#39FF14] hover:bg-[#32e00f] text-slate-950 shadow-lg shadow-[#39FF14]/20 cursor-pointer"
                                  >
                                    INICIAR SESSÃO
                                  </Button>
                                )}
                              </Card>
                            ))}
                          {(selected.workouts || []).filter((w) => {
                            if (workoutStatusFilter === "pending") return w.status !== "completed";
                            if (workoutStatusFilter === "completed") return w.status === "completed";
                            return true;
                          }).length === 0 && (
                            <div className="col-span-full py-24 text-center text-slate-400 font-black uppercase text-[10px] md:text-[11px] tracking-[0.3em] border-2 border-dashed border-slate-200 rounded-3xl">
                              {workoutStatusFilter === "pending" && "Nenhum treino planejado pendente para este período"}
                              {workoutStatusFilter === "completed" && "Nenhum treino concluído encontrado para este período"}
                              {workoutStatusFilter === "all" && "Nenhum treino cadastrado neste período"}
                            </div>
                          )}
                        </div>
                          </>
                        )}

                        {trainingSubTab === "external" && (
                          <div className="animate-in fade-in duration-500">
                            <ExternalSessionManager
                              athlete={selected}
                              onAdd={(s) => addExternalSession(selected.id, s)}
                              onUpdate={(id, s) => updateExternalSession(selected.id, id, s)}
                              onDelete={(id) => {
                                if (window.confirm("Excluir este treino de quadra/externo?")) {
                                  deleteExternalSession(selected.id, id);
                                }
                              }}
                              onUpdateAthlete={(data) => updateAthlete(selected.id, data)}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "assessment" && (
                      <AssessmentView
                        athlete={selected}
                        onAdd={(type) =>
                          setModalState({
                            type: "assessment",
                            assessmentType: type,
                          })
                        }
                        onEdit={(type, data) =>
                          setModalState({
                            type: "assessment",
                            assessmentType: type,
                            editingData: data,
                          })
                        }
                        onDelete={(type, id) =>
                          removeAssessment(selected.id, type, id)
                        }
                        onGenerateAI={handleGenerateAIModeling}
                        aiLoading={aiModelingLoading}
                        role={user.role}
                        updateAssessment={updateAssessment}
                        addAssessment={addAssessment}
                        removeAssessment={removeAssessment}
                      />
                    )}

                    {activeTab === "injuries" && (
                      <div className="space-y-8">
                         {healthResult && user?.role === "coach" && (
                           <div className="p-6 bg-slate-900/50 rounded-3xl border border-slate-800">
                             <HealthReport athlete={selected!} />
                           </div>
                         )}
                         <InjuriesView
                            athlete={selected!}
                            onUpdateAthlete={(data) => updateAthlete(selected!.id, data)}
                            role={user.role}
                          />
                      </div>
                    )}

                    {activeTab === "competitions" && (
                      <CompetitionsCalendarView
                        athlete={selected!}
                        allAthletes={athletes}
                        onUpdateAthlete={(data) => updateAthlete(selected!.id, data)}
                        role={user.role}
                      />
                    )}
                  </div>
                </div>
              )}
            </main>

            {/* MODALS - All with optimized responsiveness */}
            {modalState.type === "athlete" && (
              <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-slate-950/80 backdrop-blur-md overflow-y-auto pt-10 sm:pt-20 p-4">
                <AthleteForm
                  onCancel={() => setModalState({ type: null })}
                  onSave={(d) => {
                    addAthlete(d);
                    setModalState({ type: null });
                  }}
                />
              </div>
            )}

            {modalState.type === "edit-athlete" && (
              <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-slate-950/80 backdrop-blur-md overflow-y-auto pt-10 sm:pt-20 p-4">
                <AthleteForm
                  initialData={modalState.editingData}
                  onCancel={() => setModalState({ type: null })}
                  onSave={(d) => {
                    updateAthlete(selected!.id, d);
                    setModalState({ type: null });
                  }}
                />
              </div>
            )}

            {modalState.type === "profile-photo-options" && (
              <ProfilePhotoOptionsModal
                isOpen={true}
                athlete={modalState.editingData || selected}
                onClose={() => setModalState({ type: null })}
                onUploadPhoto={(base64) => {
                  const targetAthlete = modalState.editingData || selected;
                  if (targetAthlete) {
                    updateAthlete(targetAthlete.id, { photoUrl: base64 });
                  }
                }}
                onRemovePhoto={() => {
                  const targetAthlete = modalState.editingData || selected;
                  if (targetAthlete) {
                    updateAthlete(targetAthlete.id, { photoUrl: undefined });
                  }
                }}
                onEditProfileData={() => {
                  setModalState({
                    type: "edit-athlete",
                    editingData: modalState.editingData || selected,
                  });
                }}
              />
            )}

            {modalState.type === "active-session" && (
              <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-slate-950/80 backdrop-blur-md overflow-y-auto p-0 sm:p-4 md:py-8">
                <SessionTrackerPremium
                  workout={modalState.editingData}
                  athleteWeight={selected?.assessments?.bioimpedance?.[0]?.weight || selected?.weight}
                  onCancel={() => setModalState({ type: null })}
                  onFinish={(updated) => {
                    updateWorkout(selected!.id, updated);
                    setModalState({ type: null });
                  }}
                />
              </div>
            )}

            {modalState.type === "edit-workout" ||
            modalState.type === "workout" ? (
              <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-slate-950/80 backdrop-blur-md overflow-y-auto pt-10 sm:pt-20 p-4">
                <WorkoutEditorPremium
                  workout={
                    modalState.type === "workout"
                      ? {
                          id: "",
                          date: getLocalDateString(),
                          name: "",
                          phase: "Preparação Geral",
                          status: "planned",
                          exercises: [],
                        }
                      : modalState.editingData
                  }
                  athlete={selected}
                  athleteModality={selected?.modality}
                  athleteGoal={selected?.goal}
                  athleteName={selected?.name}
                  updateAthlete={updateAthlete}
                  generateAIWorkouts={generateAIWorkouts}
                  onCancel={() => setModalState({ type: null })}
                  onSave={(updated) => {
                    if (modalState.type === "workout")
                      addWorkout(selected!.id, updated);
                    else updateWorkout(selected!.id, updated);
                    setModalState({ type: null });
                  }}
                />
              </div>
            ) : null}

            {modalState.type === "assessment" && (
              <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-slate-950/80 backdrop-blur-md overflow-y-auto pt-10 sm:pt-20 p-2 sm:p-4">
                <AssessmentForm
                  type={modalState.assessmentType!}
                  initialData={modalState.editingData}
                  athlete={selected!}
                  onCancel={() => setModalState({ type: null })}
                  onSave={(d) => {
                    if (modalState.editingData) {
                      updateAssessment(
                        selected!.id,
                        modalState.assessmentType!,
                        modalState.editingData.id,
                        d,
                      );
                    } else {
                      addAssessment(
                        selected!.id,
                        modalState.assessmentType!,
                        d,
                      );
                    }
                    setModalState({ type: null });
                  }}
                />
              </div>
            )}

            {modalState.type === "ai" && (
              <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-slate-900/95 backdrop-blur-xl overflow-y-auto p-0 md:p-4 no-scrollbar">
                <div className="max-w-5xl w-full mx-auto md:my-10 h-full md:h-auto">
                  <div
                    ref={reportRef}
                    className="print-container bg-slate-100/10 md:bg-transparent"
                  >
                    {(() => {
                      try {
                        const data = JSON.parse(aiInsight || "{}");
                        const totalPages = 3;
                        return (
                          <>
                            {/* PÁGINA 1: CAPA E INDICADORES PRINCIPAIS */}
                            <ReportPage pageNumber={1} totalPages={totalPages}>
                              <ReportHeader
                                title="RELATÓRIO PREDITIVO COMPLETO"
                                subTitle="DIAGNÓSTICO DINÂMICO & PRONTIDÃO FÍSICA"
                                athlete={selected!}
                                date={new Date().toLocaleDateString("pt-BR")}
                                extraStats={[
                                  { label: "IPG GERAL", value: `${data.performanceScore || 0}%` },
                                  { label: "STATUS", value: data.status || "ANÁLISE" }
                                ]}
                              />

                              <div className="space-y-8 mt-6">
                                <div className="relative">
                                  <div className="absolute -left-4 top-0 bottom-0 w-1 bg-brand-primary/20 rounded-full"></div>
                                  <h5 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-2 flex items-center gap-2 pl-2">
                                    <span className="w-1.5 h-1.5 bg-brand-primary rounded-full"></span>
                                    Resumo Executivo
                                  </h5>
                                  <p className="text-[11px] text-slate-800 font-medium leading-relaxed italic pl-2">
                                    "{data.summary}"
                                  </p>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                      Performance Geral
                                    </p>
                                    <p className="text-3xl font-black text-brand-primary italic">
                                      {data.performanceScore || 0}%
                                    </p>
                                    <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
                                      <div
                                        className="bg-brand-primary h-full rounded-full"
                                        style={{
                                          width: `${data.performanceScore || 0}%`,
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                      Score de Prontidão
                                    </p>
                                    <p className="text-3xl font-black text-emerald-600 italic">
                                      {data.readinessScore || 0}%
                                    </p>
                                    <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
                                      <div
                                        className="bg-emerald-500 h-full rounded-full"
                                        style={{
                                          width: `${data.readinessScore || 0}%`,
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                      Risco de Lesão
                                    </p>
                                    <p className="text-3xl font-black text-red-650 italic">
                                      {data.injuryRiskScore || 0}%
                                    </p>
                                    <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
                                      <div
                                        className="bg-red-500 h-full rounded-full"
                                        style={{
                                          width: `${data.injuryRiskScore || 0}%`,
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>

                                <div className="h-[280px] w-full bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                                  <h5 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">
                                    Radar de Capacidades Físicas
                                  </h5>
                                  <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                  >
                                    <RadarChart
                                      cx="50%"
                                      cy="50%"
                                      outerRadius="65%"
                                      data={data.radarData || []}
                                      margin={{
                                        top: 10,
                                        right: 30,
                                        bottom: 10,
                                        left: 30,
                                      }}
                                    >
                                      <PolarGrid stroke="#e2e8f0" />
                                      <PolarAngleAxis
                                        dataKey="subject"
                                        tick={{
                                          fill: "#64748b",
                                          fontSize: 9,
                                          fontWeight: 800,
                                        }}
                                      />
                                      <PolarRadiusAxis
                                        angle={30}
                                        domain={[0, 100]}
                                        tick={false}
                                        axisLine={false}
                                      />
                                      <Radar
                                        name="Atleta"
                                        dataKey="A"
                                        stroke="#10b981"
                                        fill="#10b981"
                                        fillOpacity={0.4}
                                      />
                                    </RadarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            </ReportPage>

                            {/* PÁGINA 2: ANÁLISE DETALHADA */}
                            <ReportPage pageNumber={2} totalPages={totalPages}>
                              <ReportHeader
                                title="RELATÓRIO PREDITIVO COMPLETO"
                                subTitle="ANÁLISE NEUROFISIOLÓGICA & TÉCNICA DETALHADA"
                                athlete={selected!}
                                date={new Date().toLocaleDateString("pt-BR")}
                                extraStats={[{ label: "PÁGINA", value: "02 DE 03" }]}
                              />

                              <div className="mt-4 space-y-4 font-sans text-left">
                                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                  <Brain className="w-4 h-4 text-brand-primary" />
                                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                                    Parecer Técnico de Inteligência Esportiva
                                  </h4>
                                </div>
                                <div className="text-slate-700 leading-relaxed max-w-none">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      h1: ({ children }) => <h1 className="text-[11px] font-black text-emerald-700 uppercase tracking-wider mt-4 mb-2 pb-1 border-b border-slate-100 leading-none">{children}</h1>,
                                      h2: ({ children }) => <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-wider mt-4 mb-2 leading-none">{children}</h2>,
                                      h3: ({ children }) => <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-wider mt-3 mb-1.5 leading-none">{children}</h3>,
                                      p: ({ children }) => <p className="text-[9.5px] font-medium text-slate-600 leading-relaxed mb-2.5">{children}</p>,
                                      ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 mb-2.5 text-[9.5px] font-medium text-slate-600">{children}</ul>,
                                      ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 mb-2.5 text-[9.5px] font-medium text-slate-600">{children}</ol>,
                                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                      strong: ({ children }) => <strong className="font-extrabold text-slate-900">{children}</strong>,
                                      blockquote: ({ children }) => <blockquote className="border-l-2 border-emerald-600 pl-3 italic text-slate-500 my-2 text-[9.5px]">{children}</blockquote>
                                    }}
                                  >
                                    {data.detailedAnalysis}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            </ReportPage>

                            {/* PÁGINA 3: ALERTAS E RECOMENDAÇÕES */}
                            <ReportPage pageNumber={3} totalPages={totalPages}>
                              <ReportHeader
                                title="RELATÓRIO PREDITIVO COMPLETO"
                                subTitle="ALERTAS, RECOMENDAÇÕES E DIRETRIZES DE RETORNO"
                                athlete={selected!}
                                date={new Date().toLocaleDateString("pt-BR")}
                                extraStats={[{ label: "PÁGINA", value: "03 DE 03" }]}
                              />

                              <div className="space-y-6 mt-4">
                                {data.alerts && data.alerts.length > 0 && (
                                  <div className="bg-red-50 border border-red-100 p-5 rounded-2xl">
                                    <h5 className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={3}
                                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                        />
                                      </svg>
                                      Alertas Críticos de Risco e Saúde
                                    </h5>
                                    <ul className="space-y-2">
                                      {data.alerts.map(
                                        (alert: string, i: number) => (
                                          <li
                                            key={i}
                                            className="text-[9px] font-bold text-red-700 flex items-start gap-2"
                                          >
                                            <span className="mt-1.5 w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0"></span>
                                            {alert}
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                )}

                                <div className="bg-emerald-50/40 border border-emerald-100 p-5 rounded-2xl relative overflow-hidden">
                                  <h5 className="text-[9px] font-black text-emerald-800 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 relative z-10">
                                    <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></div>
                                    Prescrição de Ajuste Imediato (Treino/Recuperação)
                                  </h5>
                                  <div className="grid grid-cols-1 gap-2 relative z-10">
                                    {data.recommendations?.map(
                                      (r: string, i: number) => (
                                        <div
                                          key={i}
                                          className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm"
                                        >
                                          <div className="w-6 h-6 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center font-black text-xs shrink-0">
                                            {i + 1}
                                          </div>
                                          <span className="text-[9px] text-slate-800 font-bold leading-tight">
                                            {r}
                                          </span>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                  <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 leading-none">
                                    Conclusão Técnica Final
                                  </h5>
                                  <p className="text-[10px] text-slate-600 leading-relaxed font-bold italic">
                                    {data.conclusion}
                                  </p>
                                </div>
                              </div>
                            </ReportPage>
                          </>
                        );
                      } catch (e) {
                        return (
                          <ReportPage pageNumber={1} totalPages={1}>
                            <ReportHeader
                              title="RELATÓRIO PREDITIVO COMPLETO"
                              subTitle="DIAGNÓSTICO DINÂMICO & INSIGHTS ESPORTIVOS"
                              athlete={selected!}
                              date={new Date().toLocaleDateString("pt-BR")}
                            />
                            <div className="mt-6 text-slate-700 space-y-4 text-[10px] font-medium leading-relaxed">
                              {aiInsight?.split("\n").map((line, i) => (
                                <p key={i} className="leading-relaxed">
                                  {line}
                                </p>
                              ))}
                            </div>
                          </ReportPage>
                        );
                      }
                    })()}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 mt-8 no-print">
                    <Button
                      onClick={handleExportJpeg}
                      variant="accent"
                      className="flex-grow py-5 text-sm shadow-2xl shadow-brand-secondary/30"
                    >
                      <Download size={20} className="mr-2" /> Baixar Páginas
                      (JPEG)
                    </Button>
                    <Button
                      onClick={handlePrint}
                      variant="secondary"
                      className="flex-grow py-5 text-sm"
                    >
                      <Printer size={20} className="mr-2" /> Imprimir / PDF
                    </Button>
                    <Button
                      onClick={() => setModalState({ type: null })}
                      variant="secondary"
                      className="flex-grow py-5 text-sm"
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {modalState.type === "wellness" && selected && user && (
              <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-brand-dark/80 backdrop-blur-2xl overflow-y-auto pt-10 sm:pt-20 p-2 sm:p-4">
                <WellnessForm
                  role={user.role}
                  isFemale={selected.gender === "F"}
                  onCancel={() => setModalState({ type: null })}
                  onSave={(d) => {
                    addWellness(selected.id, d);
                    setModalState({ type: null });
                  }}
                />
              </div>
            )}

            {modalState.type === "edit-wellness" && selected && user && (
              <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-brand-dark/80 backdrop-blur-2xl overflow-y-auto pt-10 sm:pt-20 p-2 sm:p-4">
                <WellnessForm
                  role={user.role}
                  isFemale={selected.gender === "F"}
                  initialData={modalState.editingData}
                  onCancel={() => setModalState({ type: null })}
                  onSave={(d) => {
                    updateWellness(selected.id, modalState.editingData.id, d);
                    setModalState({ type: null });
                  }}
                />
              </div>
            )}

            {modalState.type === "confirm-delete" && (
              <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-brand-dark/90 backdrop-blur-sm p-4">
                <Card
                  className="max-w-md w-full p-10 bg-slate-900 border-slate-800 shadow-2xl text-center"
                  title="Confirmar Exclusão"
                >
                  <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                    <svg
                      className="w-10 h-10 text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase italic mb-3">
                    Excluir Atleta?
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold leading-relaxed mb-10 uppercase italic">
                    Ação irreversível: Todos os dados de treinos, avaliações e
                    prontidão serão apagados.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      onClick={() => setModalState({ type: null })}
                      variant="secondary"
                      className="w-full"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleDeleteAthlete}
                      variant="danger"
                      className="w-full"
                    >
                      Sim, Excluir
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {modalState.type === "confirm-delete-workout" && (
              <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <Card
                  className="max-w-md w-full p-8 bg-white border-none shadow-2xl text-center"
                  title="Confirmar Exclusão"
                >
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg
                      className="w-10 h-10 text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic mb-2">
                    Excluir Treino?
                  </h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                    Deseja realmente excluir o treino{" "}
                    <strong>{modalState.editingData?.name}</strong>? Esta ação
                    não pode ser desfeita.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => setModalState({ type: null })}
                      variant="secondary"
                      className="w-full"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => {
                        if (selected && modalState.editingData) {
                          deleteWorkout(selected.id, modalState.editingData.id);
                          setModalState({ type: null });
                        }
                      }}
                      variant="danger"
                      className="w-full"
                    >
                      Sim, Excluir
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {modalState.type === "clone-workout" && (
              <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <CloneWorkoutModal
                  athletes={athletes}
                  selectedAthleteId={selected?.id || ""}
                  loading={modalState.loading}
                  onCancel={() => setModalState({ type: null })}
                  onClone={handleCloneWorkout}
                />
              </div>
            )}

            {/* GLOBAL NOTIFICATION PANEL - MOVED TO ROOT FOR Z-INDEX RELIABILITY */}
            <AnimatePresence>
              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-[1999] bg-black/40 backdrop-blur-sm"
                    onClick={() => setShowNotifications(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    className="fixed top-4 md:top-24 right-4 w-[calc(100vw-32px)] md:w-96 bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,1)] p-8 z-[2000] backdrop-blur-3xl overflow-hidden border-t-brand-primary/40 ring-1 ring-white/5"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                          <Bell className="w-4 h-4 text-brand-primary" />
                        </div>
                        <h5 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">
                          Status Center
                        </h5>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() =>
                            setDismissedIds((prev) => [
                              ...new Set([
                                ...prev,
                                ...notifications.map((n) => n.id),
                              ]),
                            ])
                          }
                          className="text-[9px] font-black text-brand-primary uppercase hover:underline tracking-widest"
                        >
                          Limpar
                        </button>
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-400 hover:text-white transition-all shadow-xl"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pr-1 relative">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {notifications.length === 0 ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="py-16 text-center text-slate-500 italic text-[10px] uppercase font-black tracking-widest bg-slate-950/50 rounded-[2rem] border border-slate-800/50 flex flex-col items-center gap-4"
                          >
                            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800">
                              <Zap className="w-6 h-6 opacity-20" />
                            </div>
                            Ecossistema estável
                          </motion.div>
                        ) : (
                          notifications.map((n) => (
                            <motion.div
                              layout
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{
                                opacity: 0,
                                scale: 0.8,
                                x: 20,
                                transition: { duration: 0.2 },
                              }}
                              key={n.id}
                              className="p-5 bg-slate-950/80 border border-slate-800 rounded-[1.8rem] relative group hover:border-brand-primary/50 transition-all shadow-xl hover:bg-slate-900/90 overflow-hidden"
                            >
                              <div className="flex justify-between items-start mb-4 gap-4">
                                <div
                                  className="flex-grow cursor-pointer"
                                  onClick={() => {
                                    if (n.athleteId) {
                                      setSelectedId(n.athleteId);
                                      if (n.id === "wellness") {
                                        setModalState({ type: "wellness" });
                                      } else {
                                        setActiveTab("dash");
                                      }
                                      setShowNotifications(false);
                                    }
                                  }}
                                >
                                  <p className="text-[11px] text-slate-200 leading-relaxed font-bold group-hover:text-white transition-colors uppercase tracking-tight">
                                    {n.text}
                                  </p>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDismissedIds((prev) => [...prev, n.id]);
                                  }}
                                  className="w-10 h-10 -mr-2 -mt-2 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-500 hover:bg-red-500/20 hover:text-red-500 transition-all shrink-0"
                                  title="Remover"
                                >
                                  <X size={14} />
                                </button>
                              </div>

                              <div className="flex items-center justify-between">
                                {n.id.startsWith("bday-") ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const ath = athletes.find(x => x.id === n.athleteId);
                                      if (ath) {
                                        const cleanName = ath.name.split(" ")[0];
                                        const text = `Fala, ${cleanName}! Passando aqui em nome da LB Sports para te desejar um feliz aniversário! Muito sucesso, saúde, evolução e que possamos continuar superando recordes e conquistando alta performance juntos! Tmj! 🚀🎂🎉`;
                                        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                                        window.open(url, "_blank");
                                      }
                                    }}
                                    className="text-[9px] font-black text-green-400 uppercase tracking-widest hover:brightness-125 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 rounded-xl transition-all border border-green-500/30 flex items-center gap-1.5"
                                  >
                                    <span>ENVIAR WHATSAPP</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (n.athleteId) {
                                        setSelectedId(n.athleteId);
                                        if (n.id === "wellness") {
                                          setModalState({ type: "wellness" });
                                        } else {
                                          setActiveTab("dash");
                                        }
                                        setShowNotifications(false);
                                      }
                                    }}
                                    className="text-[9px] font-black text-brand-primary uppercase tracking-widest hover:brightness-125 px-4 py-2 bg-brand-primary/10 rounded-xl transition-all"
                                  >
                                    {n.id === "wellness" ? "FAZER CHECK-IN" : "VER ATLETA"}
                                  </button>
                                )}
                                <span className="text-[8px] font-black text-slate-700 uppercase">
                                  Agora
                                </span>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-800/50 flex justify-center">
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                        Elite Performance System • LB HUB
                      </p>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Floating Action Button for AI Performance Chat */}
            <button
              onClick={() => setIsAiChatOpen(true)}
              className="fixed bottom-24 md:bottom-8 right-6 z-[1000] bg-brand-primary text-slate-950 hover:bg-lime-300 p-3.5 sm:p-4 rounded-full shadow-[0_10px_30px_rgba(204,255,0,0.45)] flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-slate-950/30 group font-black"
              title="Abrir Chat de Performance IA"
            >
              <Brain className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse text-slate-950" />
              <span className="hidden sm:inline text-xs font-black uppercase tracking-wider pr-1 text-slate-950">Chat IA</span>
              <span className="w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 absolute -top-0.5 -right-0.5 shadow-md animate-ping" />
              <span className="w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 absolute -top-0.5 -right-0.5 shadow-md" />
            </button>

            <AiPerformanceChatModal
              isOpen={isAiChatOpen}
              onClose={() => setIsAiChatOpen(false)}
              athletes={athletes}
              selectedAthleteId={selectedId}
              onSelectAthlete={(id) => setSelectedId(id)}
            />

            <PwaInstallBanner
              deferredPrompt={deferredPrompt}
            />
          </div>
        </>
      </div>
  );
};

const CloneWorkoutModal: FC<{
  athletes: Athlete[];
  selectedAthleteId: string;
  loading?: boolean;
  onCancel: () => void;
  onClone: (athId: string, date: string, weeks: number) => void;
}> = ({ athletes, selectedAthleteId, loading, onCancel, onClone }) => {
  const [targetAthleteId, setTargetAthleteId] = useState(selectedAthleteId);
  const [startDate, setStartDate] = useState(
    getLocalDateString(),
  );
  const [weeks, setWeeks] = useState(1);

  return (
    <Card
      className="max-w-md w-full p-10 bg-slate-900 border-slate-800 shadow-2xl"
      title="Duplicar / Clonar Treino"
    >
      <div className="space-y-8">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block px-1">
            Atleta Destino
          </label>
          <select
            disabled={loading}
            value={targetAthleteId}
            onChange={(e) => setTargetAthleteId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-black text-white uppercase outline-none focus:border-brand-primary disabled:opacity-50"
          >
            {athletes.map((a) => (
              <option key={a.id} value={a.id} className="bg-slate-900">
                {a.name.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block px-1">
            Data de Início
          </label>
          <input
            disabled={loading}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-black text-white uppercase outline-none focus:border-brand-primary disabled:opacity-50"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block px-1">
            Repetir por quantas semanas?
          </label>
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((w) => (
              <button
                key={w}
                disabled={loading}
                onClick={() => setWeeks(w)}
                className={`py-4 rounded-xl text-[10px] font-black transition-all border ${weeks === w ? "bg-brand-primary text-brand-dark border-brand-primary shadow-lg" : "bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700"} disabled:opacity-50`}
              >
                {w} {w === 1 ? "SEM" : "SEMS"}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-slate-600 font-bold mt-3 italic uppercase tracking-wider">
            * Útil para criar ciclos de periodização mensal.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <Button
            onClick={onCancel}
            variant="secondary"
            className="w-full"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => onClone(targetAthleteId, startDate, weeks)}
            className="w-full"
            disabled={loading}
          >
            {loading ? "Clonando..." : "Confirmar"}
          </Button>
        </div>
      </div>
    </Card>
  );
};

// --- DASHBOARD VIEW COMPONENT ---
// --- EXTERNAL SESSION MANAGER ---
const ExternalSessionManager: FC<{
  athlete: Athlete;
  onAdd: (s: Omit<ExternalSession, "id" | "load">) => void;
  onUpdate: (id: string, s: Partial<ExternalSession>) => void;
  onDelete: (id: string) => void;
  onUpdateAthlete: (data: Partial<Athlete>) => void;
}> = ({ athlete, onAdd, onUpdate, onDelete, onUpdateAthlete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSession, setNewSession] = useState<
    Omit<ExternalSession, "id" | "load">
  >({
    date: getLocalDateString(),
    type: "tecnico",
    durationMinutes: 60,
    rpe: 7,
    notes: "",
  });

  const sortedSessions = useMemo(() => {
    return [...(athlete.externalSessions || [])].sort((x, y) => {
      const timeX = getSafeDateTime(x.date);
      const timeY = getSafeDateTime(y.date);
      if (timeY !== timeX) return timeY - timeX;
      return (y.id || "").localeCompare(x.id || "");
    });
  }, [athlete.externalSessions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdate(editingId, newSession);
      setEditingId(null);
    } else {
      onAdd(newSession);
    }
    setShowAdd(false);
    setNewSession({
      date: getLocalDateString(),
      type: "tecnico",
      durationMinutes: 60,
      rpe: 7,
      notes: "",
    });
  };

  const startEdit = (s: ExternalSession) => {
    setEditingId(s.id);
    setNewSession({
      date: s.date,
      type: s.type,
      durationMinutes: s.durationMinutes,
      rpe: s.rpe,
      notes: s.notes || "",
    });
    setShowAdd(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-slate-900 p-8 rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform" />
        <div className="relative z-10">
          <h4 className="text-xl font-black uppercase italic tracking-tighter text-white">
            Elite Tournament Mode
          </h4>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">
            Ajusta o algoritmo LB-X™ para pico de performance
          </p>
        </div>
        <button
          onClick={() =>
            onUpdateAthlete({ isTournamentMode: !athlete.isTournamentMode })
          }
          className={`relative inline-flex h-10 w-20 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 ${athlete.isTournamentMode ? "bg-brand-primary shadow-[0_0_20px_rgba(57,255,20,0.5)]" : "bg-slate-800"}`}
        >
          <span
            className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-xl transition-transform ${athlete.isTournamentMode ? "translate-x-11" : "translate-x-1"}`}
          />
        </button>
      </div>

      <Card
        title="Sessões Externas Hub (Elite)"
        className="border-slate-800 shadow-2xl bg-slate-900/50"
      >
        <div className="space-y-8">
          <div className="flex justify-between items-center px-1">
            <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em] italic leading-none">
              Global Session Log
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                if (showAdd && editingId) {
                  setEditingId(null);
                  setNewSession({
                    date: getLocalDateString(),
                    type: "tecnico",
                    durationMinutes: 60,
                    rpe: 7,
                    notes: "",
                  });
                }
                setShowAdd(!showAdd);
              }}
              className="text-[9px] font-black tracking-widest uppercase"
            >
              {showAdd ? "CANCELAR" : "+ REGISTRAR SESSÃO"}
            </Button>
          </div>

          {showAdd && (
            <form
              onSubmit={handleSubmit}
              className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300 shadow-inner"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase block mb-1.5 tracking-widest px-1">
                    Data
                  </label>
                  <input
                    type="date"
                    required
                    value={newSession.date}
                    onChange={(e) =>
                      setNewSession({ ...newSession, date: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase block mb-1.5 tracking-widest px-1">
                    Tipo de Sessão
                  </label>
                  <select
                    value={newSession.type}
                    onChange={(e) =>
                      setNewSession({
                        ...newSession,
                        type: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-primary"
                  >
                    <option value="tecnico" className="bg-slate-900">
                      Técnico
                    </option>
                    <option value="tatico" className="bg-slate-900">
                      Tático
                    </option>
                    <option value="jogo" className="bg-slate-900">
                      Jogo/Competição
                    </option>
                    <option value="recuperacao" className="bg-slate-900">
                      Recuperação Ativa
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase block mb-1.5 tracking-widest px-1">
                    Duração (min)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={
                      newSession.durationMinutes === 0
                        ? ""
                        : newSession.durationMinutes || ""
                    }
                    onChange={(e) =>
                      setNewSession({
                        ...newSession,
                        durationMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-primary font-black transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase block mb-1.5 tracking-widest px-1">
                    PSE (1-10)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="10"
                    value={newSession.rpe === 0 ? "" : newSession.rpe || ""}
                    onChange={(e) =>
                      setNewSession({
                        ...newSession,
                        rpe: parseInt(e.target.value) || 0,
                      })
                    }
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-primary font-black transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1.5 tracking-widest px-1">
                  Observações
                </label>
                <textarea
                  value={newSession.notes}
                  onChange={(e) =>
                    setNewSession({ ...newSession, notes: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-primary h-20 resize-none"
                  placeholder="Como foi o treino? Algum desconforto?"
                />
              </div>
              <Button
                type="submit"
                className="w-full py-3 font-black tracking-widest text-[10px]"
              >
                {editingId ? "ATUALIZAR SESSÃO" : "SALVAR SESSÃO"}
              </Button>
            </form>
          )}

          <div className="space-y-3">
            {sortedSessions.length > 0 ? (
              sortedSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex justify-between items-center p-4 bg-slate-950 rounded-2xl border border-slate-800 group hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        s.type === "jogo"
                          ? "bg-red-500/10 text-red-500"
                          : s.type === "tecnico"
                            ? "bg-blue-500/10 text-blue-500"
                            : s.type === "tatico"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-slate-500/10 text-slate-500"
                      }`}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-white uppercase tracking-tight">
                          {s.type === "tecnico"
                            ? "Técnico"
                            : s.type === "tatico"
                              ? "Tático"
                              : s.type === "jogo"
                                ? "Jogo"
                                : "Recuperação"}
                        </span>
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                          {formatDate(s.date)}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-400">
                        {s.durationMinutes}min • PSE {s.rpe} • Carga{" "}
                        {s.load || s.durationMinutes * s.rpe}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(s)}
                      className="p-2 text-slate-400 sm:text-slate-600 hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(s.id)}
                      className="p-2 text-slate-400 sm:text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2-0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center bg-slate-950/50 rounded-3xl border border-dashed border-slate-800">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">
                  Nenhuma sessão externa registrada
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

const DashboardView: FC<{
  athlete: Athlete;
  onDeleteWellness: (id: string) => void;
  onEditWellness: (data: WellnessEntry) => void;
  onAddExternalSession: (s: Omit<ExternalSession, "id" | "load">) => void;
  onUpdateExternalSession: (id: string, s: Partial<ExternalSession>) => void;
  onDeleteExternalSession: (id: string) => void;
  onUpdateAthlete: (data: Partial<Athlete>) => void;
  role: "coach" | "athlete";
  onStartWorkout: (w: Workout) => void;
  onAddWellness?: () => void;
  athletes?: Athlete[];
  onSelectAthleteId?: (id: string) => void;
  dashboardSubTab?: "pro" | "classic" | "elite-monitoring";
  setDashboardSubTab?: (tab: "pro" | "classic" | "elite-monitoring") => void;
}> = ({
  athlete,
  onDeleteWellness,
  onEditWellness,
  onAddExternalSession,
  onUpdateExternalSession,
  onDeleteExternalSession,
  onUpdateAthlete,
  role,
  onStartWorkout,
  onAddWellness,
  athletes = [],
  onSelectAthleteId,
  dashboardSubTab: propDashboardSubTab,
  setDashboardSubTab: propSetDashboardSubTab,
}) => {
  const [localSubTab, setLocalSubTab] = useState<"pro" | "classic" | "elite-monitoring">("pro");
  const dashboardSubTab = propDashboardSubTab || localSubTab;
  const setDashboardSubTab = propSetDashboardSubTab || setLocalSubTab;
  const [showCargaReport, setShowCargaReport] = useState(false);
  const [metricTooltip, setMetricTooltip] = useState<string | null>(null);
  const [normativeSearch, setNormativeSearch] = useState("");
  const [activeNormativeTab, setActiveNormativeTab] = useState<"all" | "imtp" | "cmj" | "speed" | "vo2">("all");
  const [wellnessToDelete, setWellnessToDelete] = useState<any | null>(null);
  const dashboardProRef = useRef<HTMLDivElement>(null);

  const wellnessHistory = useMemo(() => {
    const list = Array.isArray(athlete.wellness) ? athlete.wellness : [];
    return [...list].sort((a, b) => getSafeDateTime(b.date) - getSafeDateTime(a.date));
  }, [athlete.wellness]);

  const readinessData = useMemo(() => {
    const list = [...wellnessHistory]
      .filter((w) => w.readinessScore !== undefined && w.readinessScore > 0)
      .slice(0, 15)
      .reverse();
    return list.map((w) => ({
      date: formatDate(w.date),
      score: w.readinessScore,
    }));
  }, [wellnessHistory]);

  const lastWellness = wellnessHistory[0];
  const readinessInsight = lastWellness
    ? getReadinessInsight(lastWellness.readinessScore || 0)
    : null;
  const today = getLocalDateString();
  const hasWellnessToday = useMemo(() => {
    return (athlete.wellness || []).some((w) => w.date && w.date.startsWith(today));
  }, [athlete.wellness, today]);
  const workoutToday = (athlete.workouts || []).find(
    (w) => w.date && w.date.startsWith(today) && w.status !== "completed",
  );

  const acwrData = useMemo(() => {
    return calculateACWR(
      athlete.workouts || [],
      athlete.externalSessions || [],
    );
  }, [athlete.workouts, athlete.externalSessions]);

  const evolution = useMemo(
    () => calculateWeeklyEvolution(athlete.workouts || []),
    [athlete.workouts],
  );

  const loadData = useMemo(() => {
    const gymSessions = (athlete.workouts || [])
      .filter((w) => w.status === "completed" && w.rpe && w.date)
      .map((w) => ({
        date: w.date.split("T")[0],
        load: (w.rpe || 0) * (w.durationMinutes || 60),
        type: "gym",
      }));

    const externalSessions = (athlete.externalSessions || [])
      .filter((s) => s.date)
      .map((s) => ({
        date: s.date.split("T")[0],
        load: s.load || s.durationMinutes * s.rpe,
        type: "external",
      }));

    const allSessions = [...gymSessions, ...externalSessions];
    const groupedByDate: Record<
      string,
      {
        date: string;
        gymLoad: number;
        externalLoad: number;
        totalLoad: number;
        readiness: number | null;
      }
    > = {};

    allSessions.forEach((s) => {
      if (!groupedByDate[s.date]) {
        const wellnessOnDate = (athlete.wellness || []).find(
          (well) => well.date && well.date.split("T")[0] === s.date,
        );
        groupedByDate[s.date] = {
          date: s.date,
          gymLoad: 0,
          externalLoad: 0,
          totalLoad: 0,
          readiness: wellnessOnDate
            ? wellnessOnDate.readinessScore || null
            : null,
        };
      }
      if (s.type === "gym") groupedByDate[s.date].gymLoad += s.load;
      else groupedByDate[s.date].externalLoad += s.load;
      groupedByDate[s.date].totalLoad += s.load;
    });

    return Object.values(groupedByDate)
      .sort((a, b) => getSafeDateTime(a.date) - getSafeDateTime(b.date))
      .slice(-10)
      .map((d) => ({
        ...d,
        formattedDate: formatDate(d.date),
      }));
  }, [athlete.workouts, athlete.externalSessions, athlete.wellness]);

  const performanceScore = useMemo(
    () => calculatePerformanceScore(athlete),
    [athlete],
  );

  const latestIsometric = useMemo(() => {
    const list = athlete.assessments?.isometricStrength || [];
    if (list.length === 0) return null;
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [athlete.assessments?.isometricStrength]);

  const latestImtp = useMemo(() => {
    const list = athlete.assessments?.imtp || [];
    if (list.length === 0) return null;
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [athlete.assessments?.imtp]);

  const latestCmj = useMemo(() => {
    const list = athlete.assessments?.cmj || [];
    if (list.length === 0) return null;
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [athlete.assessments?.cmj]);

  const latestVo2 = useMemo(() => {
    const list = athlete.assessments?.vo2max || [];
    if (list.length === 0) return null;
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [athlete.assessments?.vo2max]);

  const latestWeight = useMemo(() => {
    const bioList = athlete.assessments?.bioimpedance || [];
    if (bioList.length > 0) {
      const sortedBio = [...bioList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (sortedBio[0].weight) return sortedBio[0].weight;
    }
    const cmjList = athlete.assessments?.cmj || [];
    if (cmjList.length > 0) {
      const sortedCmj = [...cmjList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (sortedCmj[0].weight) return sortedCmj[0].weight;
    }
    const djList = athlete.assessments?.dropJump || [];
    if (djList.length > 0) {
      const sortedDj = [...djList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (sortedDj[0].weight) return sortedDj[0].weight;
    }
    return null;
  }, [athlete.assessments?.bioimpedance, athlete.assessments?.cmj, athlete.assessments?.dropJump]);

  const relativeStrength = useMemo(() => {
    // 1. Prioritize IMTP relative peak force
    if (latestImtp) {
      if (latestImtp.relativePeakForce) {
        return latestImtp.relativePeakForce;
      }
      if (latestImtp.peakForce) {
        const weight = latestWeight || 80;
        return parseFloat((latestImtp.peakForce / weight).toFixed(2));
      }
    }
    // 2. Fallback to isometricStrength halfSquatKgf
    if (latestIsometric && latestIsometric.halfSquatKgf) {
      const weight = latestWeight || 80;
      return parseFloat((latestIsometric.halfSquatKgf / weight).toFixed(2));
    }
    // 3. Fallback to calculated from muscle groups (Quadriceps + Hamstrings sum)
    if (latestIsometric && (latestIsometric.quadricepsR || latestIsometric.quadricepsL)) {
      const totalIsometric = (latestIsometric.quadricepsR || 0) + 
                             (latestIsometric.quadricepsL || 0) + 
                             (latestIsometric.hamstringsR || 0) + 
                             (latestIsometric.hamstringsL || 0);
      if (totalIsometric > 0) {
        const weight = latestWeight || 80;
        return parseFloat((totalIsometric / weight).toFixed(2));
      }
    }
    return null;
  }, [latestImtp, latestIsometric, latestWeight]);

  const absoluteStrength = useMemo(() => {
    if (latestImtp && latestImtp.peakForce) {
      return latestImtp.peakForce;
    }
    if (latestIsometric && latestIsometric.halfSquatKgf) {
      return latestIsometric.halfSquatKgf;
    }
    if (latestIsometric && (latestIsometric.quadricepsR || latestIsometric.quadricepsL)) {
      return (latestIsometric.quadricepsR || 0) + 
             (latestIsometric.quadricepsL || 0) + 
             (latestIsometric.hamstringsR || 0) + 
             (latestIsometric.hamstringsL || 0);
    }
    return null;
  }, [latestImtp, latestIsometric]);
  const injuryRisk = useMemo(() => {
    const fatigue = lastWellness?.fatigue || 0;
    const readiness = lastWellness?.readinessScore || 0;
    return getInjuryRiskLevel(acwrData.ratio, fatigue, readiness);
  }, [acwrData.ratio, lastWellness]);

  const weeklyFrequencyStats = useMemo(() => {
    const workouts = athlete.workouts || [];
    const external = athlete.externalSessions || [];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const count = [...workouts, ...external].filter((s) => {
      const d = new Date(s.date);
      return d >= sevenDaysAgo && d <= now;
    }).length;

    const target = athlete.weeklyFrequency || 5;
    return {
      count,
      target,
      percentage: Math.min(100, Math.round((count / target) * 100)),
    };
  }, [athlete.workouts, athlete.externalSessions, athlete.weeklyFrequency]);

  // PRO Metrics Fallback Calculations that mirror real database or fall back nicely
  const latestWeightValue = useMemo(() => {
    return latestWeight || athlete.weight || 75;
  }, [athlete, latestWeight]);

  // Calculations for IMTP Impulse, CMJ height and RSI as KG
  const imtpImpulse = useMemo(() => {
    if (latestImtp) {
      const val = latestImtp.peakForce || 0;
      if (val > 1000) {
        return parseFloat((val / 9.80665).toFixed(1));
      }
      return parseFloat(val.toFixed(1));
    }
    return 0;
  }, [latestImtp]);

  const cmjHeight = useMemo(() => {
    if (latestCmj) {
      return parseFloat((latestCmj.height || 0).toFixed(1));
    }
    return 0;
  }, [latestCmj]);

  const rsiValue = useMemo(() => {
    const djList = athlete.assessments?.dropJump || [];
    if (djList.length > 0) {
      const sortedDj = [...djList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (sortedDj[0].rsi) return parseFloat((sortedDj[0].rsi).toFixed(2));
    }
    if (latestCmj?.rsi) {
      return parseFloat((latestCmj.rsi).toFixed(2));
    }
    return 0;
  }, [latestCmj, athlete.assessments?.dropJump]);

  // Period Averages and Peaks
  const imtpAverages = useMemo(() => {
    const list = athlete.assessments?.imtp || [];
    if (list.length === 0) {
      return { avg: "0", best: "0", bestDate: "--" };
    }
    const valMap = list.map(x => {
      const val = x.peakForce;
      return val > 1000 ? val / 9.80665 : val;
    });
    const avgVal = valMap.reduce((a,b) => a+b, 0) / list.length;
    const maxVal = Math.max(...valMap);
    const bestItem = list.find(x => {
      const val = x.peakForce;
      const converted = val > 1000 ? val / 9.80665 : val;
      return Math.abs(converted - maxVal) < 0.1;
    });
    return {
      avg: avgVal.toFixed(1),
      best: maxVal.toFixed(1),
      bestDate: bestItem ? formatDate(bestItem.date).split(" ")[0] : today,
    };
  }, [athlete.assessments?.imtp, today]);

  const cmjAverages = useMemo(() => {
    const list = athlete.assessments?.cmj || [];
    if (list.length === 0) {
      return { avg: "0", best: "0", bestDate: "--" };
    }
    const valMap = list.map(x => x.height);
    const avgVal = valMap.reduce((a,b) => a+b, 0) / list.length;
    const maxVal = Math.max(...valMap);
    const bestItem = list.find(x => x.height === maxVal);
    return {
      avg: avgVal.toFixed(1),
      best: maxVal.toFixed(1),
      bestDate: bestItem ? formatDate(bestItem.date).split(" ")[0] : today,
    };
  }, [athlete.assessments?.cmj, today]);

  const rsiAverages = useMemo(() => {
    const djList = athlete.assessments?.dropJump || [];
    const cmjList = athlete.assessments?.cmj || [];
    
    const rsiList: number[] = [];
    djList.forEach(x => { if (x.rsi) rsiList.push(x.rsi); });
    cmjList.forEach(x => { if (x.rsi) rsiList.push(x.rsi); });

    if (rsiList.length === 0) {
      return { avg: "0.00", best: "0.00", bestDate: "--" };
    }
    const avgVal = rsiList.reduce((a,b) => a+b, 0) / rsiList.length;
    const maxVal = Math.max(...rsiList);
    return {
      avg: avgVal.toFixed(2),
      best: maxVal.toFixed(2),
      bestDate: "--",
    };
  }, [athlete.assessments]);

  const imtpChangePct = useMemo(() => {
    const list = [...(athlete.assessments?.imtp || [])].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (list.length < 2) return null;
    const latestItem = list[list.length - 1];
    const prevItem = list[list.length - 2];
    const latestValRaw = latestItem.peakForce;
    const prevValRaw = prevItem.peakForce;
    const latestVal = latestValRaw > 1000 ? latestValRaw / 9.80665 : latestValRaw;
    const prevVal = prevValRaw > 1000 ? prevValRaw / 9.80665 : prevValRaw;
    if (prevVal <= 0) return null;
    return parseFloat((((latestVal - prevVal) / prevVal) * 100).toFixed(1));
  }, [athlete.assessments?.imtp]);

  const cmjChangePct = useMemo(() => {
    const list = [...(athlete.assessments?.cmj || [])].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (list.length < 2) return null;
    const latestVal = list[list.length - 1].height;
    const prevVal = list[list.length - 2].height;
    if (prevVal <= 0) return null;
    return parseFloat((((latestVal - prevVal) / prevVal) * 100).toFixed(1));
  }, [athlete.assessments?.cmj]);

  const rsiChangePct = useMemo(() => {
    const djList = [...(athlete.assessments?.dropJump || [])]
      .filter(x => x.rsi && x.rsi > 0)
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (djList.length < 2) return null;
    const latestVal = djList[djList.length - 1].rsi || 0;
    const prevVal = djList[djList.length - 2].rsi || 0;
    if (prevVal <= 0) return null;
    return parseFloat((((latestVal - prevVal) / prevVal) * 100).toFixed(1));
  }, [athlete.assessments?.dropJump]);

  // Sparklines trend generators
  const imtpSparkHistory = useMemo(() => {
    const list = [...(athlete.assessments?.imtp || [])].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (list.length > 0) {
      return list.map(x => {
        const val = x.peakForce;
        return { value: parseFloat((val > 1000 ? val / 9.80665 : val).toFixed(1)) };
      });
    }
    return [];
  }, [athlete.assessments?.imtp, imtpImpulse]);

  const cmjSparkHistory = useMemo(() => {
    const list = [...(athlete.assessments?.cmj || [])].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (list.length > 0) {
      return list.map(x => ({ value: parseFloat((x.height).toFixed(1)) }));
    }
    return [];
  }, [athlete.assessments?.cmj, cmjHeight]);

  const rsiSparkHistory = useMemo(() => {
    const djList = [...(athlete.assessments?.dropJump || [])].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (djList.length > 0) {
      return djList.map(x => ({ value: parseFloat((x.rsi || 2).toFixed(2)) }));
    }
    return [];
  }, [athlete.assessments?.dropJump, rsiValue]);

  // Shared combined progress timeline chart
  const timelineProgressData = useMemo(() => {
    const imtpList = athlete.assessments?.imtp || [];
    const cmjList = athlete.assessments?.cmj || [];
    const djList = athlete.assessments?.dropJump || [];

    const datesSet = new Set<string>();
    imtpList.forEach(x => { if (x.date) datesSet.add(x.date); });
    cmjList.forEach(x => { if (x.date) datesSet.add(x.date); });
    djList.forEach(x => { if (x.date) datesSet.add(x.date); });

    if (datesSet.size === 0) {
      return [];
    }

    const sortedDates = Array.from(datesSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return sortedDates.map(dateStr => {
      const imtpOnDate = imtpList.find(x => x.date === dateStr);
      const cmjOnDate = cmjList.find(x => x.date === dateStr);
      const djOnDate = djList.find(x => x.date === dateStr);

      const formattedName = (() => {
        try {
          const parts = dateStr.split("-");
          if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}`;
          }
          return dateStr;
        } catch {
          return dateStr;
        }
      })();

      const entry: any = {
        name: formattedName,
      };

      if (imtpOnDate) {
        const val = imtpOnDate.peakForce;
        entry["IMTP (kg)"] = parseFloat((val > 1000 ? val / 9.80665 : val).toFixed(1));
      }
      if (cmjOnDate) {
        entry["CMJ (cm)"] = parseFloat(cmjOnDate.height.toFixed(1));
      }
      if (djOnDate) {
        entry["RSI"] = parseFloat((djOnDate.rsi || 0).toFixed(2));
      }

      return entry;
    });
  }, [athlete.assessments]);

  // Period summary box
  const sessionsCount = useMemo(() => {
    const wkCount = (athlete.workouts || []).filter(w => w.status === "completed").length;
    const exCount = (athlete.externalSessions || []).length;
    return wkCount + exCount;
  }, [athlete.workouts, athlete.externalSessions]);

  const accumulatedCargaTotal = useMemo(() => {
    const wkLoad = (athlete.workouts || [])
      .filter(w => w.status === "completed" && w.rpe && w.durationMinutes)
      .reduce((acc, w) => acc + (w.rpe || 0) * (w.durationMinutes || 60), 0);
    const exLoad = (athlete.externalSessions || [])
      .reduce((acc, s) => acc + (s.load || s.durationMinutes * (s.rpe || 5)), 0);
    const sum = wkLoad + exLoad;
    return sum > 0 ? `${sum.toLocaleString("pt-BR")} kg` : "0 kg";
  }, [athlete.workouts, athlete.externalSessions]);

  const averageSleepCalculated = useMemo(() => {
    const wellness = athlete.wellness || [];
    if (wellness.length === 0) return "N/A";
    const validSleeps = wellness.filter(w => w.sleep && w.sleep > 0);
    if (validSleeps.length === 0) return "N/A";
    const totalSleep = validSleeps.reduce((acc, curr) => acc + curr.sleep, 0);
    const avg = totalSleep / validSleeps.length;
    const hours = Math.floor(avg);
    const minutes = Math.round((avg - hours) * 60);
    return `${hours}h ${minutes}m`;
  }, [athlete.wellness]);

  const jumpVolumeCalculated = useMemo(() => {
    const cmjCount = (athlete.assessments?.cmj || []).length;
    return cmjCount > 0 ? `${cmjCount * 15} saltos` : "0";
  }, [athlete.assessments?.cmj]);

  const userFatigueLevel = useMemo(() => {
    const wellness = athlete.wellness || [];
    if (wellness.length === 0) return "N/A";
    const latestFatigue = wellness[0].fatigue || 1;
    if (latestFatigue > 3) return "ALTO";
    if (latestFatigue > 2) return "MÉDIO";
    return "BAIXO";
  }, [athlete.wellness]);

  // Jpeg exporter trigger
  const handleExportProDashboard = async () => {
    if (!dashboardProRef.current) return;
    const toastId = toast.loading("Capturando painel PRO de alta definição...");
    try {
      const isLightMode = document.body.classList.contains("light-theme");
      const dataUrl = await toJpeg(dashboardProRef.current, {
        quality: 0.98,
        backgroundColor: isLightMode ? "#f8fafc" : "#070B15",
      });
      const link = document.createElement("a");
      link.download = `Performance_PRO_${athlete.name.replace(/\s+/g, "_")}_Dashboard.jpeg`;
      link.href = dataUrl;
      link.click();
      toast.success("Painel exportado com sucesso como JPEG!", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao exportar painel.", { id: toastId });
    }
  };

  return (
    <div className="space-y-8 relative no-scrollbar">

      {/* SUB-TABS SEGMENTED CONTROLLER (Enables seamless swapping between PRO and CLASSIC layout) */}
      <div className="hidden md:flex flex-wrap md:flex-nowrap justify-between items-center bg-[#0d1324]/50 p-1.5 rounded-2xl border border-slate-800/80 max-w-3xl mx-auto backdrop-blur-xl gap-1">
        <button
          onClick={() => setDashboardSubTab("pro")}
          className={`flex-1 py-2.5 md:py-3 px-2 md:px-5 text-[9px] md:text-[10px] font-black uppercase tracking-wider md:tracking-widest rounded-xl transition-all ${
            dashboardSubTab === "pro"
              ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 shadow-[0_4px_20px_rgba(245,158,11,0.2)] font-black"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Painel Geral (PRO)
        </button>
        <button
          onClick={() => setDashboardSubTab("classic")}
          className={`flex-1 py-2.5 md:py-3 px-2 md:px-5 text-[9px] md:text-[10px] font-black uppercase tracking-wider md:tracking-widest rounded-xl transition-all ${
            dashboardSubTab === "classic"
              ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 shadow-[0_4px_20px_rgba(245,158,11,0.2)] font-black"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Check-in & Prontidão
        </button>
        <button
          onClick={() => setDashboardSubTab("elite-monitoring")}
          className={`flex-1 py-2.5 md:py-3 px-2 md:px-5 text-[9px] md:text-[10px] font-black uppercase tracking-wider md:tracking-widest rounded-xl transition-all ${
            dashboardSubTab === "elite-monitoring"
              ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 shadow-[0_4px_20px_rgba(245,158,11,0.2)] font-black"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Monitoramento de Carga
        </button>
      </div>

      {/* METRIC HELPER POPUPS / TOOLTIPS */}
      <AnimatePresence>
        {metricTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4"
          >
            <div className="bg-[#0A0D16] border border-amber-500/30 p-8 rounded-3xl max-w-md w-full shadow-[0_0_50px_rgba(245,158,11,0.15)] relative">
              <button
                onClick={() => setMetricTooltip(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-900 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
              {metricTooltip === "imtp" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-black uppercase tracking-wider text-amber-400">IMTP - Impulso de Macaulay</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    O <strong>Impulso de Macaulay / IMTP (Isometric Mid-Thigh Pull)</strong> é o padrão-ouro na ciência do esporte para medir a força máxima em Newtons (N) e a taxa de desenvolvimento de força relativa (RFD em N/kg).
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Nossos algoritmos integram o pico de força isométrica na coxa, cruzando com normativos das divisões profissionais da EFL e periódicos de prestígio para avaliar a integridade neuromuscular antes dos jogos.
                  </p>
                </div>
              )}
              {metricTooltip === "cmj" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-black uppercase tracking-wider text-amber-500">CMJ - Countermovement Jump</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    O <strong>Salto com Contramovimento (CMJ)</strong> monitora a potência vertical dinâmica (em centímetros) usando o ciclo de estiramento-encurtamento muscular (SSC).
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Variações na altura de salto superiores a 5% em relação à linha de base do atleta indicam fadiga do sistema nervoso central, servindo como sensor preventivo crítico de risco de lesão em gestos de arranque e desaceleração.
                  </p>
                </div>
              )}
              {metricTooltip === "rsi" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-black uppercase tracking-wider text-purple-400">RSI - Reactive Strength Index</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    O <strong>Índice de Força Reativa (RSI)</strong> representa a capacidade do atleta de alternar de uma contração excêntrica para uma concêntrica com máxima velocidade.
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Calculado pela divisão do tempo de voo pelo tempo de contato com o solo durante saltos sucessivos, valores de RSI acima de 2.00 refletem uma reatividade elástica excelente, crucial para dribles e saltos no futebol.
                  </p>
                </div>
              )}
              <Button onClick={() => setMetricTooltip(null)} className="w-full mt-6 text-slate-950 font-black">
                Entendido
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= TAB 1: PREMIUM PERFORMANCE PRO DASHBOARD ================= */}
      {dashboardSubTab === "pro" && (
        <div ref={dashboardProRef} className="space-y-8 animate-in fade-in duration-500 p-1 rounded-3xl bg-[#080c14] border border-slate-900/60 shadow-inner">
          
          {/* Dashboard Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-900/80">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                Dashboard
              </h2>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mt-1.5">
                Visão Geral de Performance
              </p>
            </div>
            
            {/* Actions list */}
            <div className="flex items-center gap-3">
              <div className="bg-[#111625] border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 font-extrabold text-[10px] tracking-wider uppercase flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>Último Período (30 Dias)</span>
              </div>
            </div>
          </div>

          {/* PERFORMANCE LB-X - NÍVEL ATIVO DE TREINO ANNEX */}
          {(() => {
            const hasVo2 = !!latestVo2;
            const lbxWeight = latestWeightValue || 82.5;
            const lbxCmj = latestCmj?.height || 0;
            const lbxVo2 = latestVo2?.vo2max;
            
            let lbxPeakForceN = 0;
            let hasForceData = false;
            if (latestImtp?.peakForce) {
              const rawForce = latestImtp.peakForce;
              lbxPeakForceN = rawForce > 1000 ? rawForce : rawForce * 9.80665;
              hasForceData = true;
            } else if (latestIsometric?.halfSquatKgf) {
              const rawForce = latestIsometric.halfSquatKgf;
              lbxPeakForceN = rawForce > 1000 ? rawForce : rawForce * 9.80665;
              hasForceData = true;
            }
            
            const lbxForceKgf = lbxPeakForceN / 9.80665;
            const lbxRelForce = hasForceData && lbxWeight > 0 ? (lbxForceKgf / lbxWeight) : 0;
            const lbxRelForceN = hasForceData && lbxWeight > 0 ? (lbxPeakForceN / lbxWeight) : 0;
            
            const lbxCmjScore = lbxCmj > 0 ? Math.min(100, Math.max(20, (lbxCmj / 65) * 100)) : 0;
            const lbxForceScore = lbxRelForce > 0 ? Math.min(100, Math.max(20, (lbxRelForce / 3.2) * 100)) : 0;
            
            let lbxScore = 0;
            if (lbxCmjScore > 0 || lbxForceScore > 0) {
              if (hasVo2 && lbxVo2 !== undefined && lbxVo2 > 0) {
                const lbxVo2Score = Math.min(100, Math.max(20, (lbxVo2 / 78) * 100));
                lbxScore = Math.min(100, Math.max(0, Math.round((lbxCmjScore + lbxForceScore + lbxVo2Score) / 3)));
              } else {
                lbxScore = Math.min(100, Math.max(0, Math.round((lbxCmjScore + lbxForceScore) / 2)));
              }
            } else {
              lbxScore = 0;
            }

            return (
              <div className="border-l-[6px] border-l-[#308FFA] rounded-r-[2.5rem] rounded-l-xl bg-gradient-to-br from-[#02050E] to-[#0A1227] p-8 md:p-10 border border-[#308FFA]/20 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85)] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#308FFA]/5 rounded-full blur-[80px] -mr-24 -mt-24 group-hover:scale-125 transition-transform duration-700 pointer-events-none" />
                
                {/* Header Row */}
                <div className="flex justify-between items-center relative z-10">
                  <h3 className="text-xs md:text-sm font-black text-[#308FFA] uppercase tracking-[0.25em] font-sans">
                    PERFORMANCE LB-X
                  </h3>
                  <Target className="w-5 h-5 text-[#308FFA]/80" />
                </div>

                {/* Main Content Layout (Score and Subtitle) */}
                <div className="mt-6 md:mt-8 relative z-10 flex flex-col items-start font-sans">
                  <div className="flex items-baseline select-none">
                    <span className="text-6xl md:text-7xl font-sans font-black tracking-tighter text-white">
                      {lbxScore > 0 ? lbxScore : "--"}
                    </span>
                    <span className="text-xl md:text-2xl font-black text-[#308FFA]/40 ml-1.5 lowercase">
                      /100
                    </span>
                  </div>
                  <p className="text-[10px] md:text-[11px] font-black uppercase text-slate-300 tracking-[0.25em] mt-3.5 leading-none">
                    NÍVEL ATIVO DE TREINO
                  </p>
                </div>

                {/* Sub-divider line */}
                <div className="h-px bg-slate-850/40 my-6 md:my-8 relative z-10" />

                {/* Three metrics grid exactly styled like the image */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative z-10 font-sans">
                  {/* 1. CMJ Potencia */}
                  <div className="flex flex-col">
                    <span className="text-[10px] md:text-[11px] font-black text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                      🚀 POTÊNCIA (CMJ)
                    </span>
                    <span className="text-xl md:text-2xl font-black text-white italic tracking-tight uppercase font-sans mt-3">
                      {lbxCmj > 0 ? `${lbxCmj.toFixed(1)}cm` : "--"}
                    </span>
                  </div>

                  {/* 2. Força Relativa */}
                  <div className="flex flex-col border-t border-slate-800/40 pt-4 md:border-t-0 md:pt-0 md:border-l md:border-r md:border-slate-850/40 md:px-8">
                    <span className="text-[10px] md:text-[11px] font-black text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                      💪 FORÇA RELATIVA
                    </span>
                    <span className="text-xl md:text-2xl font-black text-white italic tracking-tight uppercase font-sans mt-3">
                      {lbxRelForce > 0 ? `${lbxRelForce.toFixed(2)} kgf/kg` : "--"}
                    </span>
                    {lbxRelForce > 0 && (
                      <>
                        <span className="text-[11px] font-bold text-slate-400/85 uppercase tracking-wider mt-1.5">
                          ({lbxRelForceN.toFixed(1)} N/kg)
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">
                          {lbxForceKgf.toFixed(1)} kgf ({Math.round(lbxPeakForceN)} N)
                        </span>
                      </>
                    )}
                  </div>

                  {/* 3. VO2 Folego */}
                  <div className="flex flex-col border-t border-slate-800/40 pt-4 md:border-t-0 md:pt-0">
                    <span className="text-[10px] md:text-[11px] font-black text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                      🫁 FÔLEGO (VO2)
                    </span>
                    <span className="text-xl md:text-2xl font-black text-white italic tracking-tight uppercase font-sans mt-3">
                      {lbxVo2 !== undefined && lbxVo2 !== null && lbxVo2 > 0 ? `${lbxVo2.toFixed(2)} ml/kg` : "--"}
                    </span>
                  </div>
                </div>

                {/* Bottom indicators description */}
                <div className="h-px bg-slate-850/40 my-6 md:my-8 relative z-10" />

                <div className="space-y-2 relative z-10 font-sans">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#308FFA]" />
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#308FFA] leading-none">
                      INDICADORES DE COMPOSIÇÃO LB-X:
                    </h5>
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider leading-relaxed italic">
                    Média ponderada do salto vertical CMJ (Potência), da tração isométrica IMTP (Força) e do VO2 Máx (quando avaliado).
                  </p>
                </div>
              </div>
            );
          })()}

          {/* THREE CORE SPORTS SCIENCE METRICS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. IMTP Card */}
            <div className="bg-[#0E1322] border border-slate-800 rounded-[2rem] p-6 hover:border-slate-700/80 transition-all duration-300 shadow-xl relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-blue-500/80" />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">IMTP</span>
                    <span className="text-[8px] font-black uppercase tracking-[0.1em] text-blue-400">Pico de Força Máxima</span>
                  </div>
                </div>
                <button onClick={() => setMetricTooltip("imtp")} className="text-slate-500 hover:text-white transition-colors">
                  <Info className="w-4 h-4 cursor-pointer" />
                </button>
              </div>

              {/* Main value and comparison */}
              <div className="flex items-baseline gap-3 mt-4">
                <span className="text-3xl md:text-4xl font-black text-white tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  {imtpImpulse > 0 ? `${imtpImpulse.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })} kg` : "--"}
                </span>
                {imtpChangePct !== null && (
                  <span className={`flex items-center gap-0.5 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    imtpChangePct > 0 
                      ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/10" 
                      : imtpChangePct < 0 
                        ? "text-rose-400 bg-rose-500/5 border-rose-500/10" 
                        : "text-slate-400 bg-slate-500/5 border-slate-500/10"
                  }`}>
                    {imtpChangePct > 0 ? (
                      <ArrowUp className="w-3 h-3 text-emerald-400" />
                    ) : imtpChangePct < 0 ? (
                      <ArrowDown className="w-3 h-3 text-rose-400" />
                    ) : null}
                    <span>{imtpChangePct > 0 ? `+${imtpChangePct}%` : `${imtpChangePct}%`}</span>
                  </span>
                )}
              </div>
              {imtpChangePct !== null && <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">vs período anterior</p>}

              {/* Sparkline chart */}
              <div className="h-16 w-full mt-6 flex items-center justify-center">
                {imtpSparkHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={imtpSparkHistory} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                      <defs>
                        <linearGradient id="colorImtpSpark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={1.8} fillOpacity={1} fill="url(#colorImtpSpark)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Sem Histórico</span>
                )}
              </div>

              {/* Bottom footer values */}
              <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-900 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <div>
                  <span className="text-slate-500 block">Média Período</span>
                  <span className="text-white text-[11px] font-black">
                    {imtpAverages.best !== "0" && imtpAverages.best !== "0.0" ? `${imtpAverages.avg} kg` : "--"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block font-normal">Melhor Resultado</span>
                  <span className="text-[#60A5FA] text-[11px] font-black">
                    {imtpAverages.best !== "0" && imtpAverages.best !== "0.0" ? (
                      <>
                        {imtpAverages.best} kg <span className="text-[8px] font-bold text-slate-500">({imtpAverages.bestDate})</span>
                      </>
                    ) : (
                      "--"
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. CMJ Card */}
            <div className="bg-[#0E1322] border border-slate-850 rounded-[2rem] p-6 hover:border-slate-705 transition-all duration-300 shadow-xl relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-amber-500/80" />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">CMJ</span>
                    <span className="text-[8px] font-black uppercase tracking-[0.1em] text-amber-500">Salto com Contramovimento</span>
                  </div>
                </div>
                <button onClick={() => setMetricTooltip("cmj")} className="text-slate-500 hover:text-white transition-colors">
                  <Info className="w-4 h-4 cursor-pointer" />
                </button>
              </div>

              {/* Main value and comparison */}
              <div className="flex items-baseline gap-3 mt-4">
                <span className="text-3xl md:text-4xl font-black text-white tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  {cmjHeight > 0 ? `${cmjHeight.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} cm` : "--"}
                </span>
                {cmjChangePct !== null && (
                  <span className={`flex items-center gap-0.5 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    cmjChangePct > 0 
                      ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/10" 
                      : cmjChangePct < 0 
                        ? "text-rose-400 bg-rose-500/5 border-rose-500/10" 
                        : "text-slate-400 bg-slate-500/5 border-slate-500/10"
                  }`}>
                    {cmjChangePct > 0 ? (
                      <ArrowUp className="w-3 h-3 text-emerald-400" />
                    ) : cmjChangePct < 0 ? (
                      <ArrowDown className="w-3 h-3 text-rose-400" />
                    ) : null}
                    <span>{cmjChangePct > 0 ? `+${cmjChangePct}%` : `${cmjChangePct}%`}</span>
                  </span>
                )}
              </div>
              {cmjChangePct !== null && <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">vs período anterior</p>}

              {/* Sparkline chart */}
              <div className="h-16 w-full mt-6 flex items-center justify-center">
                {cmjSparkHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cmjSparkHistory} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                      <defs>
                        <linearGradient id="colorCmjSpark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={1.8} fillOpacity={1} fill="url(#colorCmjSpark)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Sem Histórico</span>
                )}
              </div>

              {/* Bottom footer values */}
              <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-900 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <div>
                  <span className="text-slate-500 block">Média Período</span>
                  <span className="text-white text-[11px] font-black">
                    {cmjAverages.best !== "0" && cmjAverages.best !== "0.0" ? `${cmjAverages.avg} cm` : "--"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block font-normal">Melhor Resultado</span>
                  <span className="text-amber-400 text-[11px] font-black">
                    {cmjAverages.best !== "0" && cmjAverages.best !== "0.0" ? (
                      <>
                        {cmjAverages.best} cm <span className="text-[8px] font-bold text-slate-500">({cmjAverages.bestDate})</span>
                      </>
                    ) : (
                      "--"
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. RSI Card */}
            <div className="bg-[#0E1322] border border-slate-800 rounded-[2rem] p-6 hover:border-slate-700/80 transition-all duration-300 shadow-xl relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-purple-500/80" />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">RSI</span>
                    <span className="text-[8px] font-black uppercase tracking-[0.1em] text-purple-400">Índice de Força Reativa</span>
                  </div>
                </div>
                <button onClick={() => setMetricTooltip("rsi")} className="text-slate-500 hover:text-white transition-colors">
                  <Info className="w-4 h-4 cursor-pointer" />
                </button>
              </div>

              {/* Main value and comparison */}
              <div className="flex items-baseline gap-3 mt-4">
                <span className="text-3xl md:text-4xl font-black text-white tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  {rsiValue > 0 ? rsiValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--"}
                </span>
                {rsiChangePct !== null && (
                  <span className={`flex items-center gap-0.5 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    rsiChangePct > 0 
                      ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/10" 
                      : rsiChangePct < 0 
                        ? "text-rose-400 bg-rose-500/5 border-rose-500/10" 
                        : "text-slate-400 bg-slate-500/5 border-slate-500/10"
                  }`}>
                    {rsiChangePct > 0 ? (
                      <ArrowUp className="w-3 h-3 text-emerald-400" />
                    ) : rsiChangePct < 0 ? (
                      <ArrowDown className="w-3 h-3 text-rose-400" />
                    ) : null}
                    <span>{rsiChangePct > 0 ? `+${rsiChangePct}%` : `${rsiChangePct}%`}</span>
                  </span>
                )}
              </div>
              {rsiChangePct !== null && <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">vs período anterior</p>}

              {/* Sparkline chart */}
              <div className="h-16 w-full mt-6 flex items-center justify-center">
                {rsiSparkHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={rsiSparkHistory} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                      <defs>
                        <linearGradient id="colorRsiSpark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={1.8} fillOpacity={1} fill="url(#colorRsiSpark)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Sem Histórico</span>
                )}
              </div>

              {/* Bottom footer values */}
              <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-900 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <div>
                  <span className="text-slate-500 block">Média Período</span>
                  <span className="text-white text-[11px] font-black">
                    {rsiAverages.best !== "0" && rsiAverages.best !== "0.00" && rsiAverages.best !== "0.0" ? rsiAverages.avg : "--"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block font-normal">Melhor Resultado</span>
                  <span className="text-purple-400 text-[11px] font-black">
                    {rsiAverages.best !== "0" && rsiAverages.best !== "0.00" && rsiAverages.best !== "0.0" ? (
                      <>
                        {rsiAverages.best} <span className="text-[8px] font-bold text-slate-500">({rsiAverages.bestDate})</span>
                      </>
                    ) : (
                      "--"
                    )}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* LOWER HISTORICAL TRENDS + COHORT SUMMARY */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left Box: EVOLUÇÃO GERAL DAS MÉTRICAS */}
            <div className="lg:col-span-8 bg-[#0E1322] border border-slate-800 rounded-[2rem] p-6 flex flex-col justify-between shadow-2xl relative">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-slate-900/40">
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider">Evolução Geral das Métricas</h3>
                  <p className="text-[9px] text-slate-500 font-extrabold uppercase mt-0.5">Indicadores chave combinados do atleta</p>
                </div>
                <div className="flex flex-wrap gap-4 text-[9px] font-black uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" />
                    <span className="text-blue-400">IMTP (kg)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" />
                    <span className="text-amber-400">CMJ (cm)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-purple-500 inline-block" />
                    <span className="text-purple-450">RSI</span>
                  </div>
                </div>
              </div>

              <div className="h-[250px] w-full flex items-center justify-center">
                {timelineProgressData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineProgressData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#161e38" vertical={false} opacity={0.5} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={9} fontWeight="bold" width={30} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0b0f19", borderColor: "#1e293b", borderRadius: "1rem" }}
                        itemStyle={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase" }}
                        labelStyle={{ fontSize: "9px", fontWeight: "black", color: "#64748b", textTransform: "uppercase" }}
                      />
                      <Line type="monotone" dataKey="IMTP (kg)" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="CMJ (cm)" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="RSI" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <Activity className="w-8 h-8 text-slate-750 mx-auto animate-pulse" />
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Histórico de Progresso Vazio</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase max-w-xs mx-auto">Adicione avaliações na aba de "Avaliações" para alimentar este gráfico com dados reais.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Box: RESUMO DO PERÍODO */}
            <div className="lg:col-span-4 bg-[#0E1322] border border-slate-800 rounded-[2rem] p-6 flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-900/40">
                <h3 className="text-sm font-black uppercase text-white tracking-wider">Resumo do Período</h3>
                <button onClick={() => toast.success("Métricas acumuladas calculadas automaticamente baseadas nas sessões de treino e dados de testes.")} className="text-slate-500 hover:text-white">
                  <Info className="w-4 h-4 cursor-pointer" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 flex-grow">
                {/* 1. Sessões realizadas */}
                <div className="bg-[#111625]/80 border border-slate-800/40 rounded-2xl p-3 sm:p-4 flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Sessões</span>
                    <ClipboardList className="w-3.5 h-3.5 text-[#60A5FA]" />
                  </div>
                  <div className="mt-4">
                    <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-white leading-none block truncate">{sessionsCount}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase block mt-1.5 truncate">Concluídas</span>
                  </div>
                </div>

                {/* 2. Carga acumulada */}
                <div className="bg-[#111625]/80 border border-slate-800/40 rounded-2xl p-3 sm:p-4 flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Carga</span>
                    <Dumbbell className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="mt-4">
                    <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-white leading-none block truncate" title={accumulatedCargaTotal}>{accumulatedCargaTotal}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase block mt-1.5 truncate">Volume Total</span>
                  </div>
                </div>

                {/* 3. Média de Sono */}
                <div className="bg-[#111625]/80 border border-slate-800/40 rounded-2xl p-3 sm:p-4 flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Média de Sono</span>
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="mt-4">
                    <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-white leading-none block truncate">{averageSleepCalculated}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase block mt-1.5 truncate">Por Noite</span>
                  </div>
                </div>

                {/* 4. Índice de Fadiga */}
                <div className="bg-[#111625]/80 border border-slate-800/40 rounded-2xl p-3 sm:p-4 flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Fadiga</span>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="mt-4">
                    <span className={`text-base sm:text-lg md:text-xl lg:text-2xl font-black block leading-none truncate ${userFatigueLevel === "ALTO" ? "text-red-400" : userFatigueLevel === "MÉDIO" ? "text-amber-400" : "text-emerald-400"}`}>
                      {userFatigueLevel}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase block mt-1.5 truncate">Nível de Fadiga</span>
                  </div>
                </div>
              </div>
            </div>

          </div>



        </div>
      )}

      {/* ================== TAB 2: PORTED ORIGINAL CLASSIC VIEW ================= */}
      {dashboardSubTab === "classic" && (
        <div className="space-y-8 animate-in fade-in duration-500">
          
          {/* Welcome Header */}
          <section className="mb-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 rounded-[2.2rem] bg-gradient-to-br from-slate-900/60 to-slate-900/30 border border-slate-800/40 relative">
              <div className="relative z-10">
                <p className="text-[8px] sm:text-[9px] font-black text-brand-primary uppercase tracking-[0.4em] mb-2 sm:mb-3 neon-text-glow">
                  LB PERFORMANCE ECOSYSTEM
                </p>
                <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                  Olá, <span className="text-brand-primary">{athlete.name.split(" ")[0]}</span>!
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-1 font-bold">
                  Sua ficha está ativa na modalidade{" "}
                  <strong className="text-white uppercase">
                    {athlete.modality || "Futebol"}
                  </strong>
                </p>
              </div>
            </div>
          </section>

          {/* Muscle Status / Bio Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <Card className="premium-card p-6 border-slate-800 bg-[#0E1322]">
              <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-900/40">
                <h3 className="text-xs font-black uppercase text-white tracking-widest">Peso Desejável</h3>
                <Scale className="w-4 h-4 text-brand-primary" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{latestWeightValue} kg</span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Massa corporal referenciada nos testes</p>
            </Card>

            <Card className="premium-card p-6 border-slate-800 bg-[#0E1322]">
              <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-900/40">
                <h3 className="text-xs font-black uppercase text-white tracking-widest">VO2 Máximo</h3>
                <Activity className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">
                  {latestVo2?.vo2max ? `${latestVo2.vo2max.toFixed(1)} ml/kg/min` : "N/A"}
                </span>
                {latestVo2?.vo2max && (
                  <span className="text-[9px] font-black uppercase bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/15">
                    Excelente
                  </span>
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Capacidade cardiorrespiratória aeróbica</p>
            </Card>

            <Card className="premium-card p-6 border-slate-800 bg-[#0E1322]">
              <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-900/40">
                <h3 className="text-xs font-black uppercase text-white tracking-widest">ACWR Carga</h3>
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </div>
              {acwrData ? (
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-black ${acwrData.color}`}>
                    {acwrData.ratio}
                  </span>
                  <span className={`text-[8px] font-black uppercase tracking-wider ${acwrData.color} bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800`}>
                    {acwrData.status}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] font-bold text-slate-500 uppercase italic">insuficiente</span>
              )}
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Zona ideal de prevenção contra DM (0.8 - 1.3)</p>
            </Card>
          </div>

          {/* Detailed Readiness History Log */}
          <Card title="Prontidão de Recuperação Diária (% de 100)" className="premium-card p-6 border-slate-800 bg-[#0E1322]">
            <div className="h-[220px] w-full flex items-center justify-center">
              {readinessData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={readinessData}>
                    <defs>
                      <linearGradient id="colorReadiness" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#39FF14" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#39FF14" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#161e38" vertical={false} opacity={0.6} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={9} fontWeight="bold" tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={9} fontWeight="bold" width={25} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0b0f19", borderColor: "#1e293b", borderRadius: "10px" }}
                      labelStyle={{ fontSize: "9px", color: "#64748b", fontWeight: "bold" }}
                    />
                    <Area type="monotone" dataKey="score" stroke="#39FF14" strokeWidth={2} fillOpacity={1} fill="url(#colorReadiness)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center p-6 space-y-2 select-none">
                  <Brain className="w-8 h-8 text-slate-700 mx-auto animate-pulse" />
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Histórico de Prontidão Vazio</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase max-w-xs mx-auto">Nenhum auto-diagnóstico foi registrado para este atleta ainda.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Menstrual cycle log and internal activities */}
          {athlete.gender === "F" && (
            <MenstrualCycleDashboard
              athlete={athlete}
              role={role}
              onUpdateAthlete={onUpdateAthlete}
            />
          )}

          {/* Quick list of wellness logs */}
          <div className="w-full">
            <Card title="Histórico de Auto-Diagnóstico" className="premium-card p-6 border-slate-800 bg-[#0E1322] overflow-x-auto col-span-full">
              <div className="space-y-3.5 max-h-96 overflow-y-auto no-scrollbar pr-1">
                {wellnessHistory.map((w, index) => (
                  <div key={w.id || index} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-950/60 border border-slate-900 rounded-xl gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">{formatDate(w.date)}</span>
                        {w.isMatchDay && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                            🏆 Dia de Jogo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-white block">Prontidão: {w.readinessScore || 0}%</span>
                        {w.sleepStartTime && w.wakeUpTime && (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                            🌙 {w.sleepStartTime} ➔ {w.wakeUpTime} ({w.sleepHoursFormatted || w.sleep + 'h'})
                          </span>
                        )}
                      </div>
                      {w.isMatchDay && w.psychologyNotes && (
                        <p className="text-[10px] font-medium text-amber-200/90 italic bg-amber-950/30 border border-amber-800/30 p-2 rounded-lg mt-1">
                          🧠 <strong className="text-amber-400 uppercase not-italic font-black text-[9px]">Parecer da Psicologia Esportiva:</strong> "{w.psychologyNotes}"
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                      <div className="flex flex-wrap gap-2 text-[8px] font-bold text-slate-400 uppercase">
                        <span>
                          Sono: {(() => {
                            if (w.sleepHoursFormatted) return w.sleepHoursFormatted;
                            if (w.sleep !== undefined && w.sleep !== null) {
                              const s = safeParseFloat(w.sleep);
                              if (!isNaN(s)) {
                                const h = Math.floor(s);
                                const m = Math.round((s - h) * 60);
                                return m === 0 ? `${h}h` : `${h}h ${m}m`;
                              }
                            }
                            if (w.sleepQuality !== undefined && w.sleepQuality !== null) return `${w.sleepQuality}/10`;
                            return '--';
                          })()}
                        </span>
                        {w.isMatchDay && (
                          <>
                            <span className="text-amber-300 font-black">Emocional: {w.emotionalReadiness !== undefined ? `${w.emotionalReadiness}/10` : '--'}</span>
                            <span className="text-indigo-300 font-black">Psicológica: {w.psychologicalReadiness !== undefined ? `${w.psychologicalReadiness}/10` : '--'}</span>
                          </>
                        )}
                        <span>Dor: {w.soreness !== undefined ? `${w.soreness}/10` : '--'}</span>
                        <span>Estresse: {w.stress !== undefined ? `${w.stress}/10` : '--'}</span>
                        <span>Carga Cog: {w.cognitiveLoad !== undefined ? `${w.cognitiveLoad}/10` : '--'}</span>
                      </div>
                      <div className="flex gap-1.5 border-l border-slate-850 pl-3">
                        <button
                          onClick={() => onEditWellness(w)}
                          title="Editar Auto-Diagnóstico"
                          className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-[#0e1322]/80 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setWellnessToDelete(w)}
                          title="Excluir Auto-Diagnóstico"
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-[#0e1322]/80 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {wellnessHistory.length === 0 && (
                  <div className="text-center py-10 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Nenhum registro de prontidão
                  </div>
                )}
              </div>
            </Card>

            {/* Custom Delete Confirmation Modal for Auto-Diagnóstico */}
            {wellnessToDelete && (
              <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-brand-dark/95 backdrop-blur-md p-4 animate-in fade-in duration-200">
                <Card
                  className="max-w-md w-full p-8 bg-slate-900 border-slate-800 shadow-2xl text-center font-sans border"
                  title="Excluir Auto-Diagnóstico"
                >
                  <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
                    <Trash2 className="w-8 h-8 text-rose-500" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase italic mb-2">
                    Confirmar Exclusão?
                  </h3>
                  <p className="text-[11px] text-slate-450 font-bold leading-relaxed mb-8 uppercase italic">
                    Tem certeza que deseja apagar o registro de Auto-Diagnóstico do dia{" "}
                    <span className="text-white font-black">{formatDate(wellnessToDelete.date)}</span> com prontidão de{" "}
                    <span className="text-brand-primary font-black">{wellnessToDelete.readinessScore || 0}%</span>? Esta ação é irreversível.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setWellnessToDelete(null)}
                      className="flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-750 text-slate-350 transition-colors border border-slate-700/50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        onDeleteWellness(wellnessToDelete.id);
                        setWellnessToDelete(null);
                      }}
                      className="flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-rose-500 to-red-600 text-white font-extrabold hover:from-rose-600 hover:to-red-700 transition-colors shadow-lg shadow-rose-950/25"
                    >
                      Confirmar Exclusão
                    </button>
                  </div>
                </Card>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ================== TAB: ELITE WORKLOAD MONITORING (NEW) ================= */}
      {dashboardSubTab === "elite-monitoring" && (() => {
        // Safe calculations for the active athlete
        const activeWorkouts = athlete.workouts || [];
        const activeExternal = athlete.externalSessions || [];
        const activeACWR = calculateACWR(activeWorkouts, activeExternal);

        // Historical 15 days data for selected athlete
        const todayVal = new Date();
        todayVal.setHours(23, 59, 59, 999);
        
        const movingLoadHistory = [];
        for (let i = 14; i >= 0; i--) {
          const d = new Date(todayVal);
          d.setDate(todayVal.getDate() - i);
          const dStr = d.toISOString().split("T")[0];
          
          const dStartA = new Date(d);
          dStartA.setDate(d.getDate() - 6);
          dStartA.setHours(0, 0, 0, 0);
          
          const dStartC = new Date(d);
          dStartC.setDate(d.getDate() - 27);
          dStartC.setHours(0, 0, 0, 0);
          
          const dEnd = new Date(d);
          dEnd.setHours(23, 59, 59, 999);
          
          const acuteLoadSum = [
            ...activeWorkouts.filter(w => w.status === "completed" && w.rpe && w.date && new Date(w.date) >= dStartA && new Date(w.date) <= dEnd).map(w => calculateWorkoutInternalLoad(w)),
            ...activeExternal.filter(s => s.date && new Date(s.date) >= dStartA && new Date(s.date) <= dEnd).map(s => s.load || (s.durationMinutes * s.rpe || 0))
          ].reduce((sum, val) => sum + val, 0);
          
          const chronicLoadSum = [
            ...activeWorkouts.filter(w => w.status === "completed" && w.rpe && w.date && new Date(w.date) >= dStartC && new Date(w.date) <= dEnd).map(w => calculateWorkoutInternalLoad(w)),
            ...activeExternal.filter(s => s.date && new Date(s.date) >= dStartC && new Date(s.date) <= dEnd).map(s => s.load || (s.durationMinutes * s.rpe || 0))
          ].reduce((sum, val) => sum + val, 0);
          
          const acuteAvg = acuteLoadSum / 7;
          const chronicAvg = chronicLoadSum / 28;
          const acwrRatio = chronicAvg > 0 ? parseFloat((acuteAvg / chronicAvg).toFixed(2)) : 1.0;
          
          const wellnessOnDate = (athlete.wellness || []).find(
            (well) => well.date && well.date.split("T")[0] === dStr
          );
          const readinessVal = wellnessOnDate ? wellnessOnDate.readinessScore || null : null;

          movingLoadHistory.push({
            dateLabel: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
            "Carga Aguda": Math.round(acuteLoadSum),
            "Carga Crônica": Math.round(chronicLoadSum / 4), // 7-day normalized
            "ACWR": acwrRatio,
            "Prontidão": readinessVal,
          });
        }

        // Distribution of ALL athletes
        let idealCount = 0;
        let baixoCount = 0;
        let altoCount = 0;
        
        athletes.forEach(ath => {
          const res = calculateACWR(ath.workouts || [], ath.externalSessions || []);
          if (res.ratio >= 0.8 && res.ratio <= 1.30) {
            idealCount++;
          } else if (res.ratio < 0.8) {
            baixoCount++;
          } else {
            altoCount++;
          }
        });
        
        const total = athletes.length || 1;
        const idealPct = Math.round((idealCount / total) * 100);
        const baixoPct = Math.round((baixoCount / total) * 100);
        const altoPct = Math.round((altoCount / total) * 100);

        // Active wellness and sleep trends
        // Active wellness and sleep trends
        const latestWellness = wellnessHistory[0] || null;
        const hasRealWellnessData = wellnessHistory.length > 0;
        const activeReadiness = hasRealWellnessData ? latestWellness.readinessScore || 0 : 0;
        
        const avgSleepHours = hasRealWellnessData 
          ? parseFloat((wellnessHistory.reduce((acc, w) => acc + (safeParseFloat(w.sleep) || 8), 0) / wellnessHistory.length).toFixed(1))
          : 0;
        const avgHoursInt = Math.floor(avgSleepHours);
        const avgMins = Math.round((avgSleepHours - avgHoursInt) * 60);

        const currentSleepScore = hasRealWellnessData && latestWellness
          ? Math.min(100, Math.max(0, latestWellness.sleepQuality 
              ? (latestWellness.sleepQuality > 10 ? latestWellness.sleepQuality : latestWellness.sleepQuality * 10)
              : (latestWellness.sleep 
                  ? Math.min(100, Math.round(((safeParseFloat(latestWellness.sleep) || 0) / 8) * 100)) 
                  : 0)))
          : 0;

        // Custom sleep chart data for the selected athlete
        const hasRealSleepData = wellnessHistory.length > 0;
        const sleepChartData = hasRealSleepData 
          ? [...wellnessHistory]
              .slice(0, 15)
              .reverse()
              .map(w => ({
                day: w.date ? w.date.split("-")[2] : "",
                hours: w.sleep || 0
              }))
          : [];

        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Top Info Banner */}
            <div className="bg-[#080d16] border border-slate-900 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xl">
              <div>
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-1">MONITORAMENTO DE CARGA INDIVIDUAL</span>
                <h3 className="text-xl font-black uppercase text-white tracking-tight">DESEMPENHO E CARGA DE TREINO: {athlete.name.toUpperCase()}</h3>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-1">Conexão de cargas agudas, crônicas e indicadores biológicos do atleta</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 bg-[#0d1324] border border-slate-800/80 px-3.5 py-2 rounded-xl">
                  {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).toUpperCase()} - HOJE
                </span>
                <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-xl uppercase tracking-wider">
                  PERFIL INDIVIDUAL
                </span>
                {role === "coach" && (
                  <button
                    onClick={() => setShowCargaReport(!showCargaReport)}
                    className={`text-[10px] font-black px-3.5 py-2 rounded-xl uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border ${
                      showCargaReport
                        ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                        : "bg-[#0d1324] text-[#10b981] border-[#10b981]/25 hover:border-[#10b981]/55"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>{showCargaReport ? "FECHAR RELATÓRIO" : "RELATÓRIO"}</span>
                  </button>
                )}
              </div>
            </div>
 
            {showCargaReport && role === "coach" ? (
              <div className="bg-white rounded-3xl p-6 shadow-2xl overflow-auto flex justify-center">
                <TrainingLoadReport athlete={athlete} onClose={() => setShowCargaReport(false)} />
              </div>
            ) : (
              <>
                {/* Core Cards Row 1: ACWR Safety Zone and Distribution */}
                <div className="grid grid-cols-1 gap-6">
              {/* ACWR: Safety Zone Chart */}
              <div className="bg-[#080d16] border border-slate-900 rounded-3xl p-6 space-y-6 shadow-2xl">
                <div className="flex justify-between items-start border-b border-slate-900 pb-4">
                  <div>
                    <h4 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-brand-primary" />
                      ACWR: CARGA E PRONTIDÃO EM TEMPO REAL
                    </h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Relação entre Carga Aguda/Crônica e o Score de Prontidão Diária (% de 100)</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-[10px] font-extrabold text-white flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Carga Aguda
                    </span>
                    <span className="text-[10px] font-extrabold text-white flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Carga Crônica
                    </span>
                    <span className="text-[10px] font-extrabold text-white flex items-center gap-1.5 animate-pulse">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Prontidão (%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#0e1322] border border-slate-900 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Carga Aguda (7d)</span>
                    <span className="text-xl font-black text-blue-400 mt-1 font-mono">
                      {activeACWR.acute} <span className="text-[10px] text-slate-500 uppercase font-sans">U.A.</span>
                    </span>
                  </div>
                  <div className="bg-[#0e1322] border border-slate-900 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Carga Crônica (28d)</span>
                    <span className="text-xl font-black text-amber-500 mt-1 font-mono">
                      {activeACWR.chronic} <span className="text-[10px] text-slate-500 uppercase font-sans">U.A.</span>
                    </span>
                  </div>
                  <div className="bg-[#0e1322] border border-slate-900 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">ACWR ATUAL</span>
                    <span className={`text-xl font-black mt-1 font-mono ${activeACWR.color}`}>
                      {activeACWR.ratio} <span className="text-[9px] text-slate-500 font-sans font-black uppercase">({activeACWR.status})</span>
                    </span>
                  </div>
                </div>

                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={movingLoadHistory}>
                      <defs>
                        <linearGradient id="acuteGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0e1322" vertical={false} />
                      <XAxis 
                        dataKey="dateLabel" 
                        stroke="#475569" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false}
                        dy={6}
                      />
                      <YAxis 
                        yAxisId="left"
                        stroke="#475569" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false}
                        dx={-6}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke="#f43f5e" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false}
                        dx={6}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        content={({ active, payload, label }: any) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-950/95 border border-slate-800 p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl font-sans min-w-[210px]">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800/80 pb-2 mb-2 italic">
                                  Data: {label}
                                </p>
                                <div className="space-y-2">
                                  {payload.map((p: any, idx: number) => {
                                    let itemColor = p.stroke || p.color || p.fill || "#3b82f6";
                                    if (p.dataKey === "Carga Aguda" || p.name === "Carga Aguda") {
                                      itemColor = "#3b82f6";
                                    } else if (p.dataKey === "Carga Crônica" || p.name === "Carga Crônica") {
                                      itemColor = "#f59e0b";
                                    } else if (p.dataKey === "Prontidão" || p.name === "Prontidão" || p.name === "Prontidão (%)") {
                                      itemColor = "#f43f5e";
                                    }
                                    const isProntidao = p.dataKey === "Prontidão" || p.name === "Prontidão (%)";
                                    return (
                                      <div key={idx} className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                            style={{ backgroundColor: itemColor }}
                                          />
                                          <span
                                            className="text-[11px] font-black uppercase tracking-wider"
                                            style={{ color: itemColor }}
                                          >
                                            {p.name || p.dataKey}
                                          </span>
                                        </div>
                                        <span
                                          className="text-[12px] font-black italic font-mono"
                                          style={{ color: itemColor }}
                                        >
                                          {typeof p.value === "number" ? Math.round(p.value) : p.value}
                                          {isProntidao ? "%" : " U.A."}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area yAxisId="left" type="monotone" dataKey="Carga Aguda" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#acuteGrad)" />
                      <Line yAxisId="left" type="monotone" dataKey="Carga Crônica" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="5 5" dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="Prontidão" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3.5, stroke: '#ffffff', strokeWidth: 1.5 }} name="Prontidão (%)" connectNulls />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Safety spectrum bands reference block */}
                <div className="flex flex-wrap md:flex-nowrap gap-3 p-4 bg-[#0e1322] border border-slate-900 rounded-2xl justify-between text-[9px] font-black uppercase text-slate-400 tracking-widest">
                  <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> RISCO BAIXO (&lt; 0.80)</div>
                  <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ZONA IDEAL (0.80 - 1.30)</div>
                  <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> ATENÇÃO (1.31 - 1.50)</div>
                  <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> RISCO ALTO (&gt; 1.50)</div>
                </div>
              </div>
            </div>

            {/* Core Cards Row 2: Readiness, Sleep and Sleep Quality */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Readiness Card & Symptoms */}
              <div className="bg-[#080d16] border border-slate-900 rounded-3xl p-6 flex flex-col justify-between shadow-2xl space-y-6">
                <div>
                  <h4 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                    <Brain className="w-4 h-4 text-amber-500" />
                    PRONTIDÃO & SINTOMAS (CHECK-IN)
                  </h4>
                  <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider mt-0.5">Composição de Bem-estar Fisiológico</p>
                </div>

                <div className="relative flex items-center justify-center py-2 h-44">
                  <svg className="w-36 h-36 transform -rotate-90">
                    <circle cx="72" cy="72" r="56" stroke="#0e1322" strokeWidth="12" fill="transparent" />
                    {hasRealWellnessData && (
                      <circle 
                        cx="72" 
                        cy="72" 
                        r="56" 
                        stroke="#f59e0b" 
                        strokeWidth="12" 
                        fill="transparent" 
                        strokeDasharray="351" 
                        strokeDashoffset={351 - (351 * activeReadiness) / 100} 
                        className="transition-all duration-1000"
                      />
                    )}
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-black text-white font-mono">{hasRealWellnessData ? `${activeReadiness}/100` : "--"}</span>
                    <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest mt-1">
                      {hasRealWellnessData ? (activeReadiness >= 80 ? "EXCELENTE" : activeReadiness >= 50 ? "BOM" : "ATENÇÃO") : "SEM DADOS"}
                    </span>
                  </div>
                </div>

                {/* Sub-scores sliders/bars */}
                <div className="space-y-3.5 bg-[#0e1322] border border-slate-900 p-4 rounded-2xl relative">
                  {!hasRealWellnessData && (
                    <div className="absolute inset-0 bg-[#0e1322]/95 flex flex-col items-center justify-center p-4 text-center rounded-2xl z-10 border border-slate-900/40 select-none">
                      <Brain className="w-6 h-6 text-slate-700 mb-1" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">Nenhum Check-in Registrado</span>
                      <span className="text-[8px] text-slate-600 font-bold uppercase mt-0.5 leading-relaxed">Adicione um auto-diagnóstico de prontidão</span>
                    </div>
                  )}
                  {[
                    { label: "Durabilidade Sono", val: latestWellness ? Math.min(100, Math.max(0, Math.round((latestWellness.sleep / 8) * 100))) : 0 },
                    { label: "Disposição / Ausência Fadiga", val: latestWellness ? Math.min(100, Math.max(0, Math.round((10 - latestWellness.fatigue) * 10))) : 0 },
                    { label: "Ausência Dor Muscular", val: latestWellness ? Math.min(100, Math.max(0, Math.round((10 - latestWellness.soreness) * 10))) : 0 },
                    { label: "Ausência de Estresse Psicológico", val: latestWellness ? Math.min(100, Math.max(0, Math.round((10 - latestWellness.stress) * 10))) : 0 },
                    { label: "Ausência de Fadiga Cognitiva", val: latestWellness ? Math.min(100, Math.max(0, Math.round((10 - (latestWellness.cognitiveLoad !== undefined ? latestWellness.cognitiveLoad : 3)) * 10))) : 0 },
                    { label: "Humor / Bem-estar Geral", val: latestWellness ? Math.min(100, Math.max(0, Math.round(latestWellness.mood * 10))) : 0 }
                  ].map((s, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400 tracking-wider">
                        <span>{s.label}</span>
                        <span className="text-white font-mono font-bold">{hasRealWellnessData ? `${s.val}%` : "--"}</span>
                      </div>
                      <div className="w-full bg-[#111726] rounded-full h-1.5 border border-slate-900 overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${hasRealWellnessData ? s.val : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sleep Duration Card (Chart) */}
              <div className="bg-[#080d16] border border-slate-900 rounded-3xl p-6 flex flex-col justify-between shadow-2xl space-y-6">
                <div>
                  <h4 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    CONTROLE DE SONO
                  </h4>
                  <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mt-0.5">
                    {hasRealSleepData ? `GRAFICO INDIVIDUAL DO ATLETA: ${athlete.name.toUpperCase()}` : `Sem Registros de Sono`}
                  </p>
                </div>

                <div className="bg-[#0e1322] border border-slate-900 rounded-2xl p-4 flex flex-col justify-center">
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Duração Média das Noites (Atleta Selecionado)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    {hasRealSleepData ? (
                      <>
                        <span className="text-xl font-black text-blue-400 font-mono">{avgHoursInt}h {avgMins}m</span>
                        <span className="text-[9px] font-extrabold text-[#10b981]">+12% vs sem. anterior</span>
                      </>
                    ) : (
                      <span className="text-xl font-black text-slate-500 font-mono">Sem dados</span>
                    )}
                  </div>
                </div>

                <div className="h-44 w-full">
                  {hasRealSleepData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sleepChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#0e1322" vertical={false} />
                        <XAxis dataKey="day" stroke="#475569" fontSize={8} tickLine={false} axisLine={false} />
                        <YAxis stroke="#475569" fontSize={8} tickLine={false} axisLine={false} domain={[0, 12]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#0e1322", border: "1px solid #1e293b", borderRadius: "0.5rem" }}
                          labelStyle={{ fontSize: "10px", fontWeight: "bold", color: "#3b82f6" }}
                          itemStyle={{ fontSize: "10px", fontWeight: "bold" }}
                        />
                        <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center bg-[#0e1322] rounded-2xl border border-dashed border-slate-800 p-4">
                      <Moon className="w-8 h-8 text-slate-700 mb-2" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Nenhum Registro de Sono</span>
                      <span className="text-[8px] text-slate-600 font-bold uppercase mt-1 text-center font-sans">Os dados de sono são inseridos no check-in diário</span>
                    </div>
                  )}
                </div>

                <div className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-widest leading-relaxed">
                  {hasRealSleepData ? `Histórico de sono de cada noite de ${athlete.name}.` : "Sem registros individuais de sono para exibir."}
                </div>
              </div>

              {/* Sleep Quality and Efficiency Dial */}
              <div className="bg-[#080d16] border border-slate-900 rounded-3xl p-6 flex flex-col justify-between shadow-2xl space-y-6">
                <div>
                  <h4 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-500" />
                    QUALIDADE DO SONO
                  </h4>
                  <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider mt-0.5">Indicadores estruturais do descanso</p>
                </div>

                <div className="relative flex items-center justify-center py-2 h-44">
                  <svg className="w-36 h-36 transform -rotate-90">
                    <circle cx="72" cy="72" r="56" stroke="#0e1322" strokeWidth="10" fill="transparent" />
                    {hasRealSleepData && (
                      <circle 
                        cx="72" 
                        cy="72" 
                        r="56" 
                        stroke="#f59e0b" 
                        strokeWidth="10" 
                        fill="transparent" 
                        strokeDasharray="351" 
                        strokeDashoffset={351 - (351 * currentSleepScore) / 100} 
                        className="transition-all duration-1000"
                      />
                    )}
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-black text-white font-mono">{hasRealSleepData ? `${currentSleepScore}/100` : "--"}</span>
                    <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest mt-1">
                      {hasRealSleepData ? "ÓTIMA" : "SEM DADOS"}
                    </span>
                  </div>
                </div>

                {/* Secondary list of structural sleep metrics */}
                <div className="space-y-3 bg-[#0e1322] border border-slate-900 p-4 rounded-2xl relative">
                  {!hasRealSleepData && (
                    <div className="absolute inset-0 bg-[#0e1322]/95 flex flex-col items-center justify-center p-4 text-center rounded-2xl z-10 border border-slate-900/40 select-none">
                      <Moon className="w-6 h-6 text-slate-700 mb-1" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">Qualidade Não Avaliada</span>
                      <span className="text-[8px] text-slate-600 font-bold uppercase mt-0.5 leading-relaxed font-sans">Sem dados de profundidade ou latência</span>
                    </div>
                  )}
                  {[
                    { label: "Eficiência do Sono", val: hasRealSleepData ? `${Math.min(100, Math.round(currentSleepScore * 1.05))}%` : "--" },
                    { label: "Profundidade / Sono Delta", val: hasRealSleepData ? `${Math.min(100, Math.round(currentSleepScore * 0.98))}%` : "--" },
                    { label: "Latência Restover", val: hasRealSleepData ? "90%" : "--" },
                    { label: "Estágio REM do Ciclo", val: hasRealSleepData ? "84%" : "--" },
                    { label: "Consistência de Fusos", val: hasRealSleepData ? "88%" : "--" }
                  ].map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] font-black uppercase">
                      <span className="text-slate-400">{m.label}</span>
                      <span className="text-amber-500 font-mono">{m.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

              </>
            )}

          </div>
        );
      })()}

    </div>
  );
};


const AsymmetryCard: FC<{
  label: string;
  value: number;
  status: string;
  color: string;
}> = ({ label, value, status, color }) => (
  <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200/60 flex flex-col items-center text-center shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] group">
    <span className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3 break-words group-hover:text-slate-600 transition-colors">
      {label}
    </span>
    <span
      className={`text-2xl md:text-4xl font-black tracking-tighter ${color}`}
    >
      {value}%
    </span>
    <span
      className={`text-[8px] md:text-[9px] font-black uppercase mt-3 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100 shadow-sm ${color} whitespace-nowrap tracking-widest`}
    >
      {status}
    </span>
  </div>
);

// Helper functions to parse reps and weights from arbitrary strings
const parseTrackerReps = (repsStr: string | number | undefined | null): number => {
  if (repsStr === undefined || repsStr === null) return 10;
  if (typeof repsStr === "number") return repsStr;
  const cleaned = repsStr.trim();
  const match = cleaned.match(/\d+/);
  if (match) {
    const val = parseInt(match[0], 10);
    return isNaN(val) ? 10 : val;
  }
  return 10;
};

const parseTrackerWeight = (weightStr: string | number | undefined | null): number => {
  if (weightStr === undefined || weightStr === null) return 0;
  if (typeof weightStr === "number") return weightStr;
  const cleaned = weightStr.trim();
  const withDot = cleaned.replace(",", ".");
  const match = withDot.match(/\d+(\.\d+)?/);
  if (match) {
    const val = parseFloat(match[0]);
    return isNaN(val) ? 0 : val;
  }
  return 0;
};

// --- SESSION TRACKER COMPONENT ---
const SessionTracker: FC<{
  workout: Workout;
  onFinish: (w: Workout) => void;
  onCancel: () => void;
}> = ({ workout, onFinish, onCancel }) => {
  const [session, setSession] = useState<Workout>({
    ...workout,
    status: "in_progress",
    date: workout.date?.split("T")[0] || getLocalDateString(),
    durationMinutes: workout.durationMinutes || 60,
    exercises: (Array.isArray(workout.exercises) ? workout.exercises : []).map(
      (ex) => {
        const targetReps = parseTrackerReps(ex.reps);
        const targetWeight = parseTrackerWeight(ex.weight);
        const initialSets = ex.performedSets && ex.performedSets.length > 0
          ? ex.performedSets.map((s) => ({
              ...s,
              reps: (s.reps === 0 || !s.reps) ? targetReps : s.reps,
              weight: (s.weight === 0 || !s.weight) ? targetWeight : s.weight,
            }))
          : Array.from({ length: ex.sets || 3 }).map((_, i) => ({
              id: `s-${Date.now()}-${i}`,
              reps: targetReps,
              weight: targetWeight,
              rpe: 0,
            }));

        return {
          ...ex,
          isSimpleEntry: true,
          performedSets: initialSets,
        };
      }
    ),
  });

  const toggleEntryMode = (exId: string) => {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.id === exId ? { ...ex, isSimpleEntry: !ex.isSimpleEntry } : ex,
      ),
    }));
  };

  const updateSimpleSets = (exId: string, count: number) => {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const current = ex.performedSets || [];
        const num = Math.max(0, count);
        let next = [...current];
        if (num > current.length) {
          const base = current[current.length - 1] || {
            reps: parseInt(ex.reps) || 0,
            weight: parseFloat(ex.weight) || 0,
            rpe: 0,
          };
          for (let i = current.length; i < num; i++) {
            next.push({
              id: `s-sim-${Date.now()}-${i}`,
              reps: base.reps,
              weight: base.weight,
              rpe: base.rpe,
            });
          }
        } else {
          next = next.slice(0, num);
        }
        return { ...ex, performedSets: next };
      }),
    }));
  };

  const updateAllSetsValue = (
    exId: string,
    field: keyof ExerciseSet,
    val: number,
  ) => {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const current = ex.performedSets || [];
        // If empty, initialize at least one set with default values from prescription
        const sets =
          current.length > 0
            ? current
            : [
                {
                  id: `s-auto-${Date.now()}`,
                  reps: parseInt(ex.reps) || 0,
                  weight: parseFloat(ex.weight) || 0,
                  rpe: 0,
                },
              ];
        return {
          ...ex,
          performedSets: sets.map((s) => ({ ...s, [field]: val })),
        };
      }),
    }));
  };

  const adjustValue = (
    exId: string,
    field: keyof ExerciseSet,
    amount: number,
    setId?: string,
  ) => {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const updatedSets = (ex.performedSets || []).map((s) => {
          if (setId && s.id !== setId) return s;
          const currentVal = Number(s[field]) || 0;
          const newVal = Math.max(0, currentVal + amount);
          return { ...s, [field]: newVal };
        });
        return { ...ex, performedSets: updatedSets };
      }),
    }));
  };

  const copyPrescription = (exId: string, field: "weight" | "reps") => {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const val =
          field === "weight" ? parseFloat(ex.weight) : parseInt(ex.reps);
        return {
          ...ex,
          performedSets: (ex.performedSets || []).map((s) => ({
            ...s,
            [field]: val || 0,
          })),
        };
      }),
    }));
  };

  const updateSet = (
    exId: string,
    setId: string,
    field: keyof ExerciseSet,
    val: number,
  ) => {
    setSession({
      ...session,
      exercises: session.exercises.map((ex) =>
        ex.id === exId
          ? {
              ...ex,
              performedSets: (ex.performedSets || []).map((s) =>
                s.id === setId ? { ...s, [field]: val } : s,
              ),
            }
          : ex,
      ),
    });
  };

  const addSetToEx = (exId: string) => {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const currentSets = ex.performedSets || [];
        const lastSet = currentSets[currentSets.length - 1];
        const baseReps = lastSet ? (lastSet.reps || parseInt(ex.reps) || 0) : (parseInt(ex.reps) || 0);
        const baseWeight = lastSet ? (lastSet.weight || parseFloat(ex.weight) || 0) : (parseFloat(ex.weight) || 0);
        const baseRpe = lastSet ? (lastSet.rpe || 0) : 0;

        return {
          ...ex,
          performedSets: [
            ...currentSets,
            {
              id: `s-add-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              reps: baseReps,
              weight: baseWeight,
              rpe: baseRpe,
            },
          ],
        };
      }),
    }));
  };

  const removeSetFromEx = (exId: string, setId?: string) => {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const currentSets = ex.performedSets || [];
        if (currentSets.length <= 1) return ex;
        const updated = setId ? currentSets.filter((s) => s.id !== setId) : currentSets.slice(0, -1);
        return { ...ex, performedSets: updated };
      }),
    }));
  };

  const updatePain = (exId: string, val: number) => {
    setSession({
      ...session,
      exercises: session.exercises.map((ex) =>
        ex.id === exId ? { ...ex, painLevel: val } : ex,
      ),
    });
  };

  const handleFinish = () => {
    const rpeInput =
      prompt("RPE Total da Sessão (1-10):", session.rpe?.toString() || "7") ||
      "7";
    onFinish({
      ...session,
      status: "completed",
      rpe: Math.min(10, Math.max(1, parseInt(rpeInput))),
    });
  };

  return (
    <Card
      className="max-w-4xl w-full mx-auto p-4 md:p-8 bg-slate-900 border-slate-800 h-fit overflow-visible shadow-2xl"
      title={`Treino: ${workout.name}`}
    >
      <div className="space-y-6 md:space-y-8 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-950 p-6 rounded-[2rem] border border-slate-800 shadow-inner">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase block mb-3 px-1 tracking-widest leading-none">
              Data da Sessão
            </label>
            <input
              type="date"
              value={session.date.split("T")[0]}
              onChange={(e) => setSession({ ...session, date: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs font-black text-white outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase block mb-3 px-1 tracking-widest leading-none">
              Duração Estimada (min)
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={
                session.durationMinutes === 0
                  ? ""
                  : session.durationMinutes || ""
              }
              onChange={(e) =>
                setSession({
                  ...session,
                  durationMinutes: parseInt(e.target.value) || 0,
                })
              }
              onFocus={(e) => e.target.select()}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs font-black text-white outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all"
              placeholder="60"
            />
          </div>
        </div>

        {(session.exercises || []).map((ex) => {
          const totalVolume = (ex.performedSets || []).reduce(
            (acc, s) => acc + s.weight * s.reps,
            0,
          );
          return (
            <div
              key={ex.id}
              className="bg-slate-950 p-4 sm:p-6 md:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-800 relative overflow-hidden group"
            >
              {/* Background Glow Effect */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2 group-hover:bg-brand-primary/10 transition-all duration-700"></div>

              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 relative z-10">
                <div>
                  <h5 className="text-2xl md:text-3xl font-black uppercase text-white leading-tight tracking-tighter italic flex flex-wrap items-center gap-3">
                    <span>{ex.name}</span>
                    
                    {/* Botão de Demonstração de Vídeo Inteligente */}
                    {(() => {
                      let customExs: any[] = [];
                      try {
                        const stored = localStorage.getItem("LB_CUSTOM_LIBRARY_EXERCISES");
                        if (stored) {
                          customExs = JSON.parse(stored);
                        }
                      } catch (err) {
                        console.error("Erro ao carregar customLibraryExercises em App:", err);
                      }
                      const matchingCustomEx = customExs.find((x: any) => x.name.toLowerCase().trim() === ex.name.toLowerCase().trim() || ex.name.toLowerCase().includes(x.name.toLowerCase()));
                      const matchingLibEx = ENRICHED_LIBRARY.find((x: any) => x.name.toLowerCase().trim() === ex.name.toLowerCase().trim() || ex.name.toLowerCase().includes(x.name.toLowerCase()));
                      const videoUrl = ex.videoUrl || matchingCustomEx?.videoUrl || matchingLibEx?.videoUrl || `https://www.youtube.com/results?search_query=como+fazer+${encodeURIComponent(ex.name)}`;
                      const hasDirectVideo = !!(ex.videoUrl || matchingCustomEx?.videoUrl || matchingLibEx?.videoUrl);

                      return (
                        <a
                          href={videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1.5 px-3 py-1 text-[9px] uppercase font-black tracking-wider rounded-lg transition-all ${
                            hasDirectVideo 
                              ? "bg-[#39FF14]/10 hover:bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/20" 
                              : "bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 hover:border-slate-700"
                          }`}
                          title={hasDirectVideo ? "Assistir ao vídeo técnico de execução técnica cadastrado pela LB Sports" : "Pesquisar vídeo de execução deste exercício de forma automatizada no YouTube"}
                        >
                          <span className="w-2 h-2 rounded-full bg-current animate-pulse shrink-0"></span>
                          {hasDirectVideo ? "Ver Vídeo Técnico" : "Auto-Vídeo ⚡"}
                        </a>
                      );
                    })()}
                  </h5>
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">
                      {ex.muscleGroup || "GERAL"}
                    </span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Volume:{" "}
                      <span className="text-white font-black">
                        {totalVolume.toLocaleString()}kg
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                  <button
                    onClick={() => toggleEntryMode(ex.id)}
                    className="flex-1 lg:flex-none text-[10px] font-black uppercase text-slate-400 hover:text-brand-primary transition-all flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 px-6 py-4 rounded-2xl hover:border-brand-primary/50 shadow-xl"
                  >
                    <Settings className="w-4 h-4" />
                    {ex.isSimpleEntry ? "Modo Detalhado" : "Modo Simples"}
                  </button>
                  <div className="flex flex-col items-end flex-1 lg:flex-none">
                    <label className="text-[9px] font-black text-slate-600 uppercase mb-2 tracking-widest px-1">
                      Dor (0-10)
                    </label>
                    <select
                      value={ex.painLevel || 0}
                      onChange={(e) =>
                        updatePain(ex.id, parseInt(e.target.value))
                      }
                      className={`w-full lg:w-20 text-xs font-black rounded-2xl px-4 py-3 outline-none border transition-all shadow-xl ${ex.painLevel && ex.painLevel > 3 ? "bg-red-500/10 border-red-500 text-red-500" : "bg-slate-900 border-slate-800 text-white hover:border-slate-600"}`}
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                        <option key={v} value={v} className="bg-slate-900">
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="hidden sm:flex flex-col items-end">
                    <label className="text-[9px] font-black text-slate-600 uppercase mb-2 tracking-widest px-1">
                      Prescrito
                    </label>
                    <span className="text-xs font-black text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-5 py-3 rounded-2xl uppercase tracking-tighter italic">
                      {ex.sets}x{ex.repsType?.toLowerCase() === "time" ? `${ex.reps}s` : ex.reps} @ {ex.weight}
                    </span>
                  </div>
                </div>
              </div>

              {ex.isSimpleEntry ? (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-6 mt-6 relative z-10">
                  <div className="bg-slate-900/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-4 tracking-widest text-center px-1">
                      Séries Ativas
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          updateSimpleSets(
                            ex.id,
                            (ex.performedSets?.length || 0) - 1,
                          )
                        }
                        className="w-12 h-12 shrink-0 flex items-center justify-center bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all text-xl font-bold shadow-lg hover:scale-105 active:scale-95"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={
                          ex.performedSets?.length === 0
                            ? ""
                            : ex.performedSets?.length || ""
                        }
                        onChange={(e) =>
                          updateSimpleSets(ex.id, parseInt(e.target.value) || 0)
                        }
                        onFocus={(e) => e.target.select()}
                        className="w-full min-w-0 bg-slate-950 border border-slate-800 flex-1 py-4 rounded-2xl outline-none focus:border-brand-primary text-white text-center font-black text-base sm:text-lg transition-all"
                        placeholder={ex.sets?.toString() || "0"}
                      />
                      <button
                        onClick={() =>
                          updateSimpleSets(
                            ex.id,
                            (ex.performedSets?.length || 0) + 1,
                          )
                        }
                        className="w-12 h-12 shrink-0 flex items-center justify-center bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all text-xl font-bold shadow-lg hover:scale-105 active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                    <div className="flex justify-between items-center mb-4 px-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                        Carga (kg)
                      </label>
                      <button
                        onClick={() => copyPrescription(ex.id, "weight")}
                        className="text-[8px] text-brand-primary bg-brand-primary/10 px-2 py-1 rounded-lg hover:bg-brand-primary/20 transition-all font-black border border-brand-primary/10 tracking-widest shadow-sm"
                      >
                        SMART FILL
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => adjustValue(ex.id, "weight", -1)}
                        className="w-12 h-12 shrink-0 flex items-center justify-center bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all text-xl font-bold shadow-lg hover:scale-105 active:scale-95"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={
                          ex.performedSets?.[0]?.weight === 0
                            ? ""
                            : ex.performedSets?.[0]?.weight || ""
                        }
                        onChange={(e) =>
                          updateAllSetsValue(
                            ex.id,
                            "weight",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        onFocus={(e) => e.target.select()}
                        className="w-full min-w-0 bg-slate-950 border border-slate-800 flex-1 py-4 rounded-2xl outline-none focus:border-brand-primary text-white text-center font-black text-base sm:text-lg transition-all"
                        placeholder={ex.weight || "0"}
                      />
                      <button
                        onClick={() => adjustValue(ex.id, "weight", 1)}
                        className="w-12 h-12 shrink-0 flex items-center justify-center bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all text-xl font-bold shadow-lg hover:scale-105 active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                    <div className="flex justify-between items-center mb-4 px-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                        {ex.repsType?.toLowerCase() === "time" ? "Tempo (s)" : "Repetições"}
                      </label>
                      <button
                        onClick={() => copyPrescription(ex.id, "reps")}
                        className="text-[8px] text-brand-primary bg-brand-primary/10 px-2 py-1 rounded-lg hover:bg-brand-primary/20 transition-all font-black border border-brand-primary/10 tracking-widest shadow-sm"
                      >
                        SMART FILL
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => adjustValue(ex.id, "reps", -1)}
                        className="w-12 h-12 shrink-0 flex items-center justify-center bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all text-xl font-bold shadow-lg hover:scale-105 active:scale-95"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={
                          ex.performedSets?.[0]?.reps === 0
                            ? ""
                            : ex.performedSets?.[0]?.reps || ""
                        }
                        onChange={(e) =>
                          updateAllSetsValue(
                            ex.id,
                            "reps",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        onFocus={(e) => e.target.select()}
                        className="w-full min-w-0 bg-slate-950 border border-slate-800 flex-1 py-4 rounded-2xl outline-none focus:border-brand-primary text-white text-center font-black text-base sm:text-lg transition-all"
                        placeholder={ex.reps || "0"}
                      />
                      <button
                        onClick={() => adjustValue(ex.id, "reps", 1)}
                        className="w-12 h-12 shrink-0 flex items-center justify-center bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all text-xl font-bold shadow-lg hover:scale-105 active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-4 tracking-widest text-center px-1">
                      Percepção Esforço
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => adjustValue(ex.id, "rpe", -1)}
                        className="w-12 h-12 shrink-0 flex items-center justify-center bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all text-xl font-bold shadow-lg hover:scale-105 active:scale-95"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={
                          ex.performedSets?.[0]?.rpe === 0
                            ? ""
                            : ex.performedSets?.[0]?.rpe || ""
                        }
                        onChange={(e) =>
                          updateAllSetsValue(
                            ex.id,
                            "rpe",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        onFocus={(e) => e.target.select()}
                        className="w-full min-w-0 bg-slate-950 border border-slate-800 flex-1 py-4 rounded-2xl outline-none focus:border-brand-primary text-white text-center font-black text-base sm:text-lg transition-all"
                        placeholder="0"
                        min="0"
                        max="10"
                      />
                      <button
                        onClick={() => adjustValue(ex.id, "rpe", 1)}
                        className="w-12 h-12 shrink-0 flex items-center justify-center bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all text-xl font-bold shadow-lg hover:scale-105 active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-2 px-2 pb-2 mt-4 relative z-10">
                  <table className="w-full text-left text-[10px] md:text-[11px] font-black min-w-[400px]">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800/50">
                        <th className="py-4 w-16 uppercase tracking-[0.2em] font-black">
                          Set
                        </th>
                        <th className="py-4 uppercase tracking-[0.2em] font-black">
                          Carga (Kg)
                        </th>
                        <th className="py-4 uppercase tracking-[0.2em] font-black">
                          {ex.repsType?.toLowerCase() === "time" ? "Tempo (s)" : "Repetições"}
                        </th>
                        <th className="py-4 uppercase tracking-[0.2em] font-black">
                          Percepção (PSE)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(ex.performedSets || []).map((set, idx) => (
                        <tr
                          key={set.id}
                          className="border-b border-slate-800/30 group/row last:border-0"
                        >
                          <td className="py-6 text-brand-primary font-black italic text-base">
                            #{idx + 1}
                          </td>
                          <td className="py-6">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  adjustValue(ex.id, "weight", -1, set.id)
                                }
                                className="w-10 h-10 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-brand-primary/50 transition-all"
                              >
                                -
                              </button>
                              <div className="relative group/input">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={
                                    set.weight === 0 ? "" : set.weight || ""
                                  }
                                  onChange={(e) =>
                                    updateSet(
                                      ex.id,
                                      set.id,
                                      "weight",
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  onFocus={(e) => e.target.select()}
                                  className="bg-slate-900 border border-slate-800 w-full max-w-[80px] py-3 rounded-xl outline-none focus:border-brand-primary text-white text-center font-black text-sm shadow-inner transition-all"
                                  placeholder={ex.weight || "0"}
                                />
                                <button
                                  onClick={() =>
                                    updateSet(
                                      ex.id,
                                      set.id,
                                      "weight",
                                      parseFloat(ex.weight) || 0,
                                    )
                                  }
                                  className="absolute -top-2 -right-2 bg-brand-primary text-slate-950 w-5 h-5 rounded-full flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-lg border-2 border-slate-900"
                                  title="Usar planejado"
                                >
                                  <Zap className="w-2.5 h-2.5" />
                                </button>
                              </div>
                              <button
                                onClick={() =>
                                  adjustValue(ex.id, "weight", 1, set.id)
                                }
                                className="w-10 h-10 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-brand-primary/50 transition-all"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-6">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  adjustValue(ex.id, "reps", -1, set.id)
                                }
                                className="w-10 h-10 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-brand-primary/50 transition-all"
                              >
                                -
                              </button>
                              <div className="relative group/input">
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={set.reps === 0 ? "" : set.reps || ""}
                                  onChange={(e) =>
                                    updateSet(
                                      ex.id,
                                      set.id,
                                      "reps",
                                      parseInt(e.target.value) || 0,
                                    )
                                  }
                                  onFocus={(e) => e.target.select()}
                                  className="bg-slate-900 border border-slate-800 w-full max-w-[80px] py-3 rounded-xl outline-none focus:border-brand-primary text-white text-center font-black text-sm shadow-inner transition-all"
                                  placeholder={ex.reps || "0"}
                                />
                                <button
                                  onClick={() =>
                                    updateSet(
                                      ex.id,
                                      set.id,
                                      "reps",
                                      parseInt(ex.reps) || 0,
                                    )
                                  }
                                  className="absolute -top-2 -right-2 bg-brand-primary text-slate-950 w-5 h-5 rounded-full flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-lg border-2 border-slate-900"
                                  title="Usar planejado"
                                >
                                  <Zap className="w-2.5 h-2.5" />
                                </button>
                              </div>
                              <button
                                onClick={() =>
                                  adjustValue(ex.id, "reps", 1, set.id)
                                }
                                className="w-10 h-10 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-brand-primary/50 transition-all"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-6">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  adjustValue(ex.id, "rpe", -1, set.id)
                                }
                                className="w-10 h-10 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-brand-primary/50 transition-all"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={set.rpe === 0 ? "" : set.rpe || ""}
                                onChange={(e) =>
                                  updateSet(
                                    ex.id,
                                    set.id,
                                    "rpe",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                onFocus={(e) => e.target.select()}
                                className="bg-slate-900 border border-slate-800 w-full max-w-[80px] py-3 rounded-xl outline-none focus:border-brand-primary text-white text-center font-black text-sm shadow-inner transition-all"
                                placeholder="0"
                              />
                              <button
                                onClick={() =>
                                  adjustValue(ex.id, "rpe", 1, set.id)
                                }
                                className="w-10 h-10 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-brand-primary/50 transition-all"
                              >
                                +
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        <div className="flex flex-col sm:flex-row gap-6 pt-10 border-t border-slate-800/50">
          <Button
            variant="secondary"
            onClick={onCancel}
            className="w-full py-5 font-black tracking-[0.2em] uppercase rounded-2xl border-slate-800 hover:bg-slate-800"
          >
            Sair sem Salvar
          </Button>
          <Button
            variant="primary"
            onClick={handleFinish}
            className="w-full py-5 font-black tracking-[0.2em] uppercase rounded-2xl shadow-2xl shadow-brand-primary/20 bg-brand-primary text-brand-dark group"
          >
            FINALIZAR SESSÃO ELITE
            <ChevronRight className="inline-block ml-2 group-hover:translate-x-2 transition-transform" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

// --- WORKOUT EDITOR COMPONENT ---
const WorkoutEditor: FC<{
  workout: Partial<Workout>;
  onSave: (w: Workout) => void;
  onCancel: () => void;
}> = ({ workout, onSave, onCancel }) => {
  const [edited, setEdited] = useState<Workout>(() => {
    const rawExs = workout.exercises ? [...workout.exercises] : [];
    const indexed = rawExs.map((ex, idx) => ({ ...ex, order_index: idx }));
    return {
      id: workout.id || `wk-man-${Date.now()}`,
      date: workout.date?.split("T")[0] || getLocalDateString(),
      name: workout.name || "",
      phase: workout.phase || "Base",
      status: "planned",
      exercises: indexed,
    };
  });

  const removeEx = (id: string) => {
    const remaining = (edited.exercises || []).filter((ex) => ex.id !== id);
    const reindexed = remaining.map((ex, i) => ({ ...ex, order_index: i }));
    setEdited({
      ...edited,
      exercises: reindexed,
    });
    toast.success("Exercício removido da lista.");
  };

  const moveEx = (index: number, direction: "up" | "down") => {
    const exercises = [...(edited.exercises || [])];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= exercises.length) return;

    [exercises[index], exercises[newIndex]] = [
      exercises[newIndex],
      exercises[index],
    ];
    const reindexed = exercises.map((ex, i) => ({ ...ex, order_index: i }));
    setEdited({ ...edited, exercises: reindexed });
  };

  const addEx = () => {
    const current = edited.exercises || [];
    const newEx: PrescribedExercise = {
      id: `ex-new-${Date.now()}`,
      name: "Novo Exercício",
      muscleGroup: "Geral",
      sets: 3,
      reps: "10",
      weight: "BW",
      repsType: 'reps',
      order_index: current.length,
    };
    const reindexed = [...current, newEx].map((ex, i) => ({ ...ex, order_index: i }));
    setEdited({ ...edited, exercises: reindexed });
  };

  const updateEx = (
    id: string,
    field: keyof PrescribedExercise,
    value: any,
  ) => {
    setEdited({
      ...edited,
      exercises: (edited.exercises || []).map((ex, i) =>
        ex.id === id ? { ...ex, [field]: value, order_index: i } : { ...ex, order_index: i },
      ),
    });
  };

  return (
    <Card
      className="max-w-4xl w-full mx-auto p-4 md:p-8 bg-white border-slate-200 h-fit overflow-visible shadow-2xl"
      title="Prescrição Técnica"
    >
      <div className="space-y-8 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200/50 shadow-inner">
          <div>
            <label className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase block mb-2 tracking-widest">
              Nome da Planilha
            </label>
            <input
              value={edited.name}
              onChange={(e) => setEdited({ ...edited, name: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs md:text-sm outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-sm text-slate-900 font-bold"
              placeholder="Ex: Força Máxima A"
            />
          </div>
          <div>
            <label className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase block mb-2 tracking-widest">
              Data Planejada
            </label>
            <input
              type="date"
              value={edited.date.split("T")[0]}
              onChange={(e) => setEdited({ ...edited, date: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs md:text-sm outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-sm text-slate-900 font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase block mb-2 tracking-widest">
              Fase da Periodização
            </label>
            <select
              value={edited.phase}
              onChange={(e) => setEdited({ ...edited, phase: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs md:text-sm outline-none text-slate-900 font-bold shadow-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
            >
              <option>Preparação Geral</option>
              <option>Preparação Específica</option>
              <option>Pré-Competitivo</option>
              <option>Competitivo</option>
              <option>Transição</option>
              <option>Mobilidade/Estabilidade</option>
              <option>Prescrito Elite</option>
            </select>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <p className="text-[11px] md:text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Lista de Exercícios
            </p>
            <Button
              variant="secondary"
              onClick={addEx}
              className="py-2.5 px-5 text-[10px] font-black tracking-widest uppercase"
            >
              + ADICIONAR
            </Button>
          </div>
          <div className="space-y-6 pr-1">
            {(edited.exercises || []).map((ex, index) => (
              <div
                key={ex.id}
                className="bg-slate-50 border border-slate-200/60 p-5 md:p-8 rounded-2xl md:rounded-3xl relative group shadow-sm transition-all hover:border-slate-300"
              >
                {/* Control Buttons */}
                <div className="absolute -top-3 -right-3 flex items-center gap-1.5 z-10">
                  <button
                    onClick={() => moveEx(index, "up")}
                    disabled={index === 0}
                    className="bg-white text-slate-400 w-10 h-10 rounded-full border border-slate-200 shadow-lg hover:text-brand-primary disabled:opacity-30 disabled:hover:text-slate-400 flex items-center justify-center transition-all bg-white"
                    title="Mover para cima"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveEx(index, "down")}
                    disabled={index === (edited.exercises || []).length - 1}
                    className="bg-white text-slate-400 w-10 h-10 rounded-full border border-slate-200 shadow-lg hover:text-brand-primary disabled:opacity-30 disabled:hover:text-slate-400 flex items-center justify-center transition-all bg-white"
                    title="Mover para baixo"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeEx(ex.id)}
                    className="bg-red-500 text-white w-10 h-10 rounded-full shadow-lg hover:bg-red-600 flex items-center justify-center transition-all"
                    title="Excluir exercício"
                  >
                    <X className="w-4 h-4 font-black" />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 md:gap-4 lg:gap-6">
                  <div className="col-span-2 md:col-span-2">
                    <label className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1.5 block px-1">
                      Exercício
                    </label>
                    <input
                      value={ex.name}
                      onChange={(e) => updateEx(ex.id, "name", e.target.value)}
                      className="w-full bg-slate-50 border-b-2 border-slate-200 text-xs md:text-sm text-slate-900 px-3 py-2.5 rounded-t-xl outline-none focus:border-brand-primary font-bold transition-all"
                      placeholder="Nome do exercício"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1.5 block px-1">
                      Séries
                    </label>
                    <input
                      type="number"
                      value={ex.sets === 0 ? "" : ex.sets || ""}
                      onChange={(e) =>
                        updateEx(ex.id, "sets", parseInt(e.target.value) || 0)
                      }
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-slate-50 border-b-2 border-slate-200 text-xs md:text-sm text-slate-900 px-2 py-2.5 rounded-t-xl outline-none focus:border-brand-primary font-bold transition-all text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1.5 block px-1">
                      Tipo
                    </label>
                    <select
                      value={ex.repsType || "reps"}
                      onChange={(e) => updateEx(ex.id, "repsType", e.target.value)}
                      className="w-full bg-slate-50 border-b-2 border-slate-200 text-xs md:text-sm text-slate-900 px-2 py-2.5 rounded-t-xl outline-none focus:border-brand-primary font-bold transition-all"
                    >
                      <option value="reps">Reps</option>
                      <option value="time">Tempo (s)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1.5 block px-1 truncate">
                      {ex.repsType?.toLowerCase() === "time" ? "Segundos" : "Reps"}
                    </label>
                    <input
                      value={
                        ex.reps === "0" || ex.reps === "0.0"
                          ? ""
                          : ex.reps || ""
                      }
                      onChange={(e) => updateEx(ex.id, "reps", e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-slate-50 border-b-2 border-slate-200 text-xs md:text-sm text-slate-900 px-2 py-2.5 rounded-t-xl outline-none focus:border-brand-primary font-bold transition-all text-center"
                      placeholder={ex.repsType?.toLowerCase() === "time" ? "30s" : "10"}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1.5 block px-1">
                      Carga
                    </label>
                    <input
                      value={
                        ex.weight === "0" || ex.weight === "0.0"
                          ? ""
                          : ex.weight || ""
                      }
                      onChange={(e) =>
                        updateEx(ex.id, "weight", e.target.value)
                      }
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-slate-50 border-b-2 border-slate-200 text-xs md:text-sm text-slate-900 px-2 py-2.5 rounded-t-xl outline-none focus:border-brand-primary font-bold transition-all text-center"
                      placeholder="BW"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 pt-8">
          <Button
            onClick={onCancel}
            variant="secondary"
            className="w-full py-5 font-black tracking-widest uppercase"
          >
            DESCARTAR
          </Button>
          <Button
            onClick={() => {
              const finalExercises = (edited.exercises || []).map((ex, i) => ({
                ...ex,
                order_index: i
              }));
              onSave({
                ...edited,
                exercises: finalExercises
              });
            }}
            className="w-full py-5 font-black tracking-widest uppercase shadow-xl shadow-brand-primary/20"
          >
            SALVAR PLANILHA
          </Button>
        </div>
      </div>
    </Card>
  );
};

// --- ASSESSMENT VIEW / FORMS COMPONENTS ---
const PerformanceChart: FC<{ data: any[]; type: AssessmentType }> = ({
  data,
  type,
}) => {
  const getKeysForType = (t: AssessmentType) => {
    if (t === "bioimpedance") return ["Gordura %", "Massa Muscular"];
    if (t === "cmj") return ["Altura (mm)", "Tempo de Voo (ms)", "Força Média (N)", "Potência (W)"];
    if (t === "dropJump") return ["Altura Salto (cm)", "Índice RSI"];
    if (t === "vo2max") return ["VO2 Máx", "VAM"];
    if (t === "speed") return ["5m (m/s)", "10m (m/s)", "20m (m/s)", "30m (m/s)"];
    if (t === "isometricStrength") return ["Quadríceps D", "Quadríceps E"];
    if (t === "imtp") return ["Força Máxima (kgf)", "Força Média (kgf)"];
    if ((t as string) === "generalStrength") return ["Carga"];
    return [];
  };

  const keys = getKeysForType(type);

  const sortedData = [...(data || [])].sort(
    (a, b) => getSafeDateTime(a.date) - getSafeDateTime(b.date),
  );

  const chartData = sortedData
    .map((item) => {
      const base: any = { date: formatDate(item.date) };
      if (type === "bioimpedance") {
        if (item.fatPercentage > 0) base["Gordura %"] = item.fatPercentage;
        if (item.muscleMass > 0) base["Massa Muscular"] = item.muscleMass;
      } else if (type === "cmj") {
        if (item.height > 0) base["Altura (mm)"] = Math.round(item.height * 10);
        if (item.flightTime > 0) base["Tempo de Voo (ms)"] = item.flightTime;
        if (item.averageForce > 0) base["Força Média (N)"] = item.averageForce;
        if (item.power > 0) base["Potência (W)"] = item.power;
      } else if (type === "dropJump") {
        if (item.jumpHeight > 0) base["Altura Salto (cm)"] = item.jumpHeight;
        if (item.rsi > 0) base["Índice RSI"] = item.rsi;
      } else if (type === "vo2max") {
        if (item.vo2max > 0) base["VO2 Máx"] = item.vo2max;
        if (item.vam > 0) base["VAM"] = item.vam;
      } else if (type === "speed") {
        if (item.speed5m > 0) base["5m (m/s)"] = item.speed5m;
        if (item.speed10m > 0) base["10m (m/s)"] = item.speed10m;
        if (item.speed20m > 0) base["20m (m/s)"] = item.speed20m;
        if (item.speed30m > 0) base["30m (m/s)"] = item.speed30m;
      } else if (type === "isometricStrength") {
        if (item.quadricepsR > 0) base["Quadríceps D"] = item.quadricepsR;
        if (item.quadricepsL > 0) base["Quadríceps E"] = item.quadricepsL;
      } else if (type === "imtp") {
        if (item.peakForce > 0) base["Força Máxima (kgf)"] = item.peakForce;
        if (item.meanForce > 0) base["Força Média (kgf)"] = item.meanForce;
      } else if ((type as string) === "generalStrength") {
        if (item.load > 0) base["Carga"] = item.load;
      }
      return base;
    })
    .filter((item) => {
      const itemKeys = Object.keys(item).filter((k) => k !== "date");
      return itemKeys.some((k) => item[k] !== undefined && item[k] > 0);
    });

  if (!chartData || chartData.length < 2) {
    return (
      <div className="h-40 w-full mt-6 mb-10 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 flex items-center justify-center">
        <p className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] italic text-center p-4">
          Dados insuficientes para gráfico histórico (mín. 2 registros com valores acima de zero)
        </p>
      </div>
    );
  }

  const colors = ["#39FF14", "#3b82f6", "#ea580c", "#ec4899"];

  const getsRightAxis = (key: string) => {
    return ["Potência (W)", "Massa Muscular", "VAM", "Força Média (N)"].includes(key);
  };
  const hasRightAxis = keys.some(getsRightAxis);

  // Calculate real-time stats for each performance dimension
  const stats = useMemo(() => {
    const res: Record<string, { current: number; max: number; diff: string; trendUp: boolean }> = {};
    keys.forEach((key) => {
      const values = (chartData as any[]).map((d) => d[key]).filter((v) => typeof v === "number") as number[];
      if (values.length > 0) {
        const current = values[values.length - 1];
        const max = Math.max(...values);
        const first = values[0];
        const diffVal = current - first;
        const diffPercent = first !== 0 ? ((diffVal / first) * 100).toFixed(1) : "0";
        res[key] = {
          current,
          max,
          diff: diffVal >= 0 ? `+${diffPercent}%` : `${diffPercent}%`,
          trendUp: diffVal >= 0,
        };
      }
    });
    return res;
  }, [chartData, keys]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/95 border border-slate-800 p-4 rounded-2xl shadow-2xl backdrop-blur-xl font-sans min-w-[190px]">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-800 pb-2 mb-2 italic">
            Sessão: {label}
          </p>
          <div className="space-y-1.5">
            {payload.map((p: any, idx: number) => {
              const itemColor = p.color || p.stroke || p.fill || "#3b82f6";
              return (
                <div key={idx} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full shadow-sm shrink-0"
                      style={{ backgroundColor: itemColor }}
                    />
                    <span
                      className="text-[10px] font-black uppercase tracking-wider"
                      style={{ color: itemColor }}
                    >
                      {p.name}
                    </span>
                  </div>
                  <span
                    className="text-[11px] font-black italic"
                    style={{ color: itemColor }}
                  >
                    {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full mt-6 mb-10 bg-slate-950/40 p-5 sm:p-7 rounded-[2.5rem] border border-slate-800/80 backdrop-blur-md shadow-2xl flex flex-col gap-6 font-sans">
      {/* HEADER SECTION WITH MULTI-DIMENSIONAL LEGENDS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20 text-brand-primary shrink-0">
            <TrendingUp className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h6 className="text-[11px] font-black text-brand-primary uppercase tracking-[0.25em] italic">
              Evolução Temporal de Performance
            </h6>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5 block">
              MÉTRICAS COMPARATIVAS MULTI-EIXO DE DESEMPENHO
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {keys.map((key, i) => (
            <div key={key} className="flex items-center gap-1.5 bg-slate-900/40 px-3 py-1.5 rounded-xl border border-slate-800/60">
              <div
                className="w-2 h-2 rounded-full shadow-sm"
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              <span className="text-[8px] font-black text-slate-300 uppercase tracking-wider">
                {key} {getsRightAxis(key) ? " (Eixo R)" : " (Eixo L)"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ATHLETIC HARDWARE HIGHLIGHT STATS CARD DECK */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {keys.map((key, i) => {
          const stat = stats[key];
          if (!stat) return null;
          const isUp = stat.trendUp;
          return (
            <div key={key} className="bg-slate-900/30 p-3.5 rounded-[1.5rem] border border-slate-800/50 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">
                  {key}
                </span>
                <span className={`text-[8px] font-black ${isUp ? 'text-brand-primary' : 'text-red-400'}`}>
                  {stat.diff}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-auto">
                <span className="text-base sm:text-lg font-black text-white italic">
                  {stat.current.toFixed(1)}
                </span>
                <span className="text-[8px] text-slate-500 font-extrabold uppercase">
                  ATUAL
                </span>
              </div>
              <div className="text-[7.5px] text-slate-500 font-bold uppercase mt-1 flex justify-between border-t border-slate-800/60 pt-1">
                <span>PICO MÁX:</span>
                <span className="text-white font-extrabold">{stat.max.toFixed(1)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* HIGH END DUAL AXIS RECHARTS EVOLUTION GRAPH */}
      <div className="h-[230px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
          >
            <defs>
              {keys.map((key, i) => (
                <linearGradient
                  key={key}
                  id={`color${i}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={colors[i % colors.length]}
                    stopOpacity={0.15}
                  />
                  <stop
                    offset="95%"
                    stopColor={colors[i % colors.length]}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e293b"
              opacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={8}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b", fontWeight: 800 }}
              dy={8}
            />
            <YAxis
              yAxisId="left"
              stroke="#64748b"
              fontSize={8}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#cbd5e1", fontWeight: 800 }}
              domain={["auto", "auto"]}
              dx={5}
            />
            {hasRightAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#64748b"
                fontSize={8}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#cbd5e1", fontWeight: 800 }}
                domain={["auto", "auto"]}
                dx={-5}
              />
            )}
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#334155", strokeWidth: 1 }} />
            {keys.map((key, i) => (
              <Area
                key={key}
                type="monotone"
                yAxisId={getsRightAxis(key) ? "right" : "left"}
                dataKey={key}
                stroke={colors[i % colors.length]}
                fillOpacity={1}
                fill={`url(#color${i})`}
                strokeWidth={3}
                animationDuration={1500}
                dot={{
                  r: 4,
                  fill: "#0b0f19",
                  strokeWidth: 2,
                  stroke: colors[i % colors.length],
                }}
                activeDot={{ r: 6, strokeWidth: 1 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const SpeedReport: FC<{
  athlete: Athlete;
  data: Speed;
  onClose: () => void;
  history: Speed[];
}> = ({ athlete, data, onClose, history }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const previousData = getPreviousAssessment(data, history);

  const handleExportJpeg = async () => {
    if (!reportRef.current) return;
    const toastId = toast.loading("Otimizando layout para exportação...");
    try {
      const pages = reportRef.current.querySelectorAll(".report-page");
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const dataUrl = await toJpeg(page, {
          quality: 1.0,
          backgroundColor: "#FFFFFF",
          pixelRatio: 3,
        });
        const link = document.createElement("a");
        link.download = `relatorio-velocidade-${athlete.name.toLowerCase().replace(/\s+/g, "-")}-pag-${i + 1}.jpg`;
        link.href = dataUrl;
        link.click();
        await new Promise((r) => setTimeout(r, 400));
      }
      toast.success("Arquivos gerados com sucesso!", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Falha ao gerar imagens.", { id: toastId });
    }
  };

  const handlePrint = () => {
    triggerPrint();
  };

  // Sports Science calculations & custom models
  const sGender = athlete.gender;
  const sAge = calculateAge(athlete.dob);
  const sSpeed30m = data.speed30m || 0;
  const sSpeed10m = data.speed10m || 0;
  const sSpeed5m = data.speed5m || 0;
  const sTime30m = data.time30m || 0;
  const sTime10m = data.time10m || 0;

  // 1. STATUS DE SPRINT GERAL (RESUMO EXECUTIVO)
  let speedClass = "Regular";
  let speedClassColor = "text-yellow-600";
  if (sGender === "M") {
    if (sSpeed30m > 8.5) {
      speedClass = "Elite";
      speedClassColor = "text-indigo-600";
    } else if (sSpeed30m >= 7.8) {
      speedClass = "Excelente";
      speedClassColor = "text-emerald-600";
    } else if (sSpeed30m >= 7.0) {
      speedClass = "Normal";
      speedClassColor = "text-green-600";
    } else if (sSpeed30m >= 6.0) {
      speedClass = "Regular";
      speedClassColor = "text-amber-600";
    } else {
      speedClass = "Suboptimal";
      speedClassColor = "text-red-600";
    }
  } else {
    if (sSpeed30m > 7.5) {
      speedClass = "Elite";
      speedClassColor = "text-indigo-600";
    } else if (sSpeed30m >= 6.8) {
      speedClass = "Excelente";
      speedClassColor = "text-emerald-600";
    } else if (sSpeed30m >= 6.0) {
      speedClass = "Normal";
      speedClassColor = "text-green-600";
    } else if (sSpeed30m >= 5.2) {
      speedClass = "Regular";
      speedClassColor = "text-amber-600";
    } else {
      speedClass = "Suboptimal";
      speedClassColor = "text-red-600";
    }
  }

  // Acceleration text
  let speedAccelText = "reação de aceleração moderada";
  const speedRatio = sSpeed30m > 0 ? (sSpeed10m / sSpeed30m) : 0;
  if (speedRatio > 0.75) {
    speedAccelText = "explosiva aceleração inicial nos primeiros metros e grande torque de saída";
  } else if (speedRatio > 0.65) {
    speedAccelText = "eficiente rampa de aceleração linear com postura de sprint estável";
  } else {
    speedAccelText = "transporte inercial de aceleração lenta com perdas mecânicas";
  }

  let limitText = "polimento da fase final de sprint e manutenção de frequência de passadas";
  if (sSpeed10m < 5.0 && sGender === "M") {
    limitText = "explosão neuromuscular inicial e reatividade no primeiro passo da saída";
  } else if (sSpeed10m < 4.2 && sGender === "F") {
    limitText = "potência de tração nos passos de aceleração inicial secundários";
  }

  const veredictoResumo = `Atleta apresenta perfil de velocidade classificado como ${speedClass.toUpperCase()}. Demonstra ${speedAccelText}, contudo apresenta ponto de atenção em ${limitText}.`;

  // 2. SCORE DE VELOCIDADE (0 a 100)
  let speedScore = 50;
  if (sGender === "M") {
    if (sSpeed30m >= 8.8) speedScore = Math.min(100, 95 + (sSpeed30m - 8.8) * 5);
    else if (sSpeed30m >= 8.0) speedScore = 85 + ((sSpeed30m - 8.0) / 0.8) * 10;
    else if (sSpeed30m >= 7.2) speedScore = 70 + ((sSpeed30m - 7.2) / 0.8) * 15;
    else if (sSpeed30m >= 6.2) speedScore = 50 + ((sSpeed30m - 6.2) / 1.0) * 20;
    else speedScore = Math.max(10, 10 + (sSpeed30m / 6.2) * 40);
  } else {
    if (sSpeed30m >= 7.8) speedScore = Math.min(100, 95 + (sSpeed30m - 7.8) * 5);
    else if (sSpeed30m >= 7.0) speedScore = 85 + ((sSpeed30m - 7.0) / 0.8) * 10;
    else if (sSpeed30m >= 6.2) speedScore = 70 + ((sSpeed30m - 6.2) / 0.8) * 15;
    else if (sSpeed30m >= 5.2) speedScore = 50 + ((sSpeed30m - 5.2) / 1.0) * 20;
    else speedScore = Math.max(10, 10 + (sSpeed30m / 5.2) * 40);
  }
  speedScore = Math.round(speedScore);

  let speedScoreClass = "Baixo";
  let speedScoreColor = "text-rose-600 border-rose-200 bg-rose-50";
  if (speedScore >= 85) { speedScoreClass = "Elite"; speedScoreColor = "text-indigo-600 border-indigo-200 bg-indigo-50"; }
  else if (speedScore >= 70) { speedScoreClass = "Bom"; speedScoreColor = "text-emerald-600 border-emerald-200 bg-emerald-50"; }
  else if (speedScore >= 50) { speedScoreClass = "Regular"; speedScoreColor = "text-amber-600 border-amber-200 bg-amber-50"; }

  // 3. INTERPRETAÇÃO TÉCNICA (TREINADOR)
  let sNeuromuscularProfile = "Foco em Velocidade de Reação & Pliometria Coordenativa";
  let sAcellAnalysis = "";
  let sFatiqueAnalysis = "";
  let sVelocityEfect = "";

  if (speedClass === "Elite" || speedClass === "Excelente") {
    sNeuromuscularProfile = "Perfil Neuromuscular Extremamente Rápido / Fibras Tipo IIb";
  } else if (speedClass === "Normal") {
    sNeuromuscularProfile = "Perfil de Força Rápida Balanceada / Transição Funcional";
  } else {
    sNeuromuscularProfile = "Perfil de Força Lenta / Baixa Taxa de Desenvolvimento de Força (SDF)";
  }

  if (speedRatio > 0.70) {
    sAcellAnalysis = "Excelente taxa de desenvolvimento de força (SDF) horizontal. Atleta gera empurre concêntrico maciço contra o solo nos primeiros 3 a 5 apoios mecânicos.";
  } else {
    sAcellAnalysis = "Fase de aceleração lenta. Perda de rigidez no tornozelo e tempo de contato prolongado na saída limitando a projeção corporal horizontal.";
  }

  const sSpeed20m = data.speed20m || 1;
  if (sSpeed30m / sSpeed20m >= 1.05) {
    sFatiqueAnalysis = "Excelente resistência à velocidade e manutenção de velocidade linear. Atleta sustenta o teto neuromuscular sem desaceleração precoce indesejada.";
  } else {
    sFatiqueAnalysis = "Catástrofe de desaceleração prematura pós-20m. Excesso de fadiga central ou limitações de rigidez do core impedem a sustentação do pico de velocidade.";
  }

  if (speedClass === "Elite" || speedClass === "Excelente") {
    sVelocityEfect = "O tempo de reação no primeiro passo confere ao atleta total autonomia vertical e antecipação nas fintas de agilidade multidirecional intensas.";
  } else {
    sVelocityEfect = "A inércia inicial prolonga o regime de reação motora do atleta, tornando-o vulnerável a antecipações e transições em velocidade de marcação adversária.";
  }

  // 4. TRADUÇÃO SIMPLES (ATLETA)
  let sAthleteTranslation = "";
  if (speedClass === "Elite" || speedClass === "Excelente") {
    sAthleteTranslation = "Você é uma verdadeira máquina de velocidade em campo! Sua explosão inicial te deixa metros à frente da marcação de forma natural. Continue treinando para correr relaxado em alta velocidade, que é o segredo para ser ainda mais veloz sem desperdiçar fôlego.";
  } else if (speedClass === "Normal") {
    sAthleteTranslation = "Você está com uma ótima velocidade base e consegue acelerar bem nas jogadas. O próximo degrau é treinar o seu 'primeiro passo' para ser ainda mais elétrico e surpreendente, garantindo que você vença qualquer disputa direta na corrida.";
  } else {
    sAthleteTranslation = "Hoje você demora um pouco mais de tempo para atingir sua velocidade total. Vamos treinar empurrando o chão com muito mais força e reatividade nos primeiros passos de agilidade, destravando uma aceleração inicial explosiva e fugindo facilmente de qualquer marcação.";
  }

  // 5. EXPLICAÇÃO PARA PAIS
  let sParentsExplanation = "";
  if (sAge < 18) {
    sParentsExplanation = "O teste de velocidade monitora o desenvolvimento do sistema nervoso e das fibras rápidas que estão em pico de maturação. O trabalho biomecânico aprimora os ângulos de corrida, o que diminui o risco de lesões na coluna, quadril e coxas durante o crescimento, gerando um atleta super equilibrado.";
  } else {
    sParentsExplanation = "A análise de sprints monitora a integridade de arranque e torque do sistema neuromuscular. Através da técnica equilibrada de corrida, protegemos o tendão isquiotibial e os joelhos de estiramentos severos causados por desacelerações bruscas competitivas.";
  }

  // 6. IMPACTO NA PERFORMANCE
  let sPerformanceImpactText = "";
  if (speedClass === "Elite" || speedClass === "Excelente") {
    sPerformanceImpactText = "A aceleração de elite permite infiltrar-se em linhas adversárias e antecipar-se defensivamente de maneira imediata, decidindo jogos num piscar de olhos.";
  } else {
    sPerformanceImpactText = "Cada décimo de segundo que enxugamos no sprint inicial de 10 metros representa chegar cerca de 80 cm na frente para finalizar um rebote ou desarmar um contra-ataque feroz.";
  }

  // 7. RAZÕES DE ACELERAÇÃO (Análise de Segmentação)
  const accRatio = parseFloat((sSpeed10m / (sSpeed30m || 1)).toFixed(2));
  let accRatioText = "";
  if (accRatio > 0.72) {
    accRatioText = "Atleta de força reativa curta e aceleração dominante. Perfeito para esportes de quadra ou campo pequeno, onde fintas curtas e sprints rápidos de até 10m predominam.";
  } else {
    accRatioText = "Atleta de velocidade máxima dominante. Demanda maior raio e distância para expressar sua potência motora real; excelente para transições longas em campo aberto.";
  }

  // 8. PLANO DE AÇÃO PARA VELOCIDADE
  let sActionPlanFocus = "Foco em Força Explosiva Horizontal, Rigidez de Tornozelo e Técnica de Passada";
  let sActionItems = [
    { title: "Sprints com Sobrecarga Leve (Resistidos)", desc: "Tiros de 10m a 15m tracionando elástico ou trenó com 10% do peso corporal, 2x por semana (5 repetições de altíssima intensidade)." },
    { title: "Ankle Pogo Jumps Rápidos", desc: "Saltos de tornozelo contínuos (3 séries de 20 reps) mantendo joelhos firmes e tornozelos ativados para encurtar o tempo de contato e gerar elasticidade." },
    { title: "Drills de Mecânica de Sprint (A-Skips)", desc: "Exercícios de coordenação postural e elevação de joelhos mantendo o pé em dorsiflexão para otimizar os ângulos de ataque ao solo." },
    { title: "Hipertrofia Excêntrica de Isquiotibiais", desc: "Treino de Flexão de Joelhos (Mesa Flexora ou Nórdico) focando na descida lenta para blindar e proteger a musculatura posterior contra estiramentos." }
  ];

  if (speedClass === "Elite" || speedClass === "Excelente") {
    sActionPlanFocus = "Polimento Neuromuscular de Elite, Velocidade de Reação e Coordenação em Velocidade Máxima";
    sActionItems = [
      { title: "Sprints Assistidos (Decolagem Facilitada)", desc: "Tiros curtos a favor do vento ou com leve elástico de tração frontal para recrutar frequências de passada acima de 110% do teto." },
      { title: "Pliometria Unilateral de Alta Intensidade", desc: "Saltos de agilidade e saltos triplos alternados buscando projeção horizontal máxima no menor tempo de solo ativo." },
      { title: "Sprints com Transição Gradual", desc: "Aceleração suave de 15m seguida por 10m de velocidade máxima com braços relaxados e queixo baixo (drills de velocidade sobrevoada)." }
    ];
  }

  // 9. METAS DE VELOCIDADE
  let bioTargetTime10m = 0;
  let bioTargetTime30m = 0;
  let bioTargetTimeframe = "6 a 8 semanas";

  if (sTime30m > 0) {
    bioTargetTime30m = parseFloat(Math.max(sGender === "M" ? 3.9 : 4.4, sTime30m - 0.15).toFixed(2));
    bioTargetTime10m = parseFloat(Math.max(sGender === "M" ? 1.6 : 1.9, sTime10m - 0.08).toFixed(2));
  } else {
    bioTargetTime30m = sGender === "M" ? 4.10 : 4.60;
    bioTargetTime10m = sGender === "M" ? 1.70 : 2.05;
  }

  // IVA CALCULATIONS
  const accelEff = Math.round(Math.min(100, (sSpeed10m / 7.2) * 100));
  const speedMaint = Math.round(Math.min(100, (sSpeed30m / (sSpeed10m * 1.15 || 1)) * 100));
  const totalEfficiency = Math.round((speedScore * 0.45) + (accelEff * 0.35) + (speedMaint * 0.20));

  let efficiencyLevel = "baixa";
  let efficiencyColor = "text-rose-600 border-rose-100 bg-rose-50/50 hover:bg-rose-50";
  if (totalEfficiency >= 85) {
    efficiencyLevel = "elite";
    efficiencyColor = "text-indigo-600 border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50";
  } else if (totalEfficiency >= 70) {
    efficiencyLevel = "alta";
    efficiencyColor = "text-emerald-600 border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50";
  } else if (totalEfficiency >= 50) {
    efficiencyLevel = "moderada";
    efficiencyColor = "text-amber-600 border-amber-100 bg-amber-50/50 hover:bg-amber-50";
  }

  const speedData = [
    {
      label: "5m",
      speed: data.speed5m,
      time: data.time5m,
      prevSpeed: previousData?.speed5m,
      prevTime: previousData?.time5m,
    },
    {
      label: "10m",
      speed: data.speed10m,
      time: data.time10m,
      prevSpeed: previousData?.speed10m,
      prevTime: previousData?.time10m,
    },
    {
      label: "20m",
      speed: data.speed20m,
      time: data.time20m,
      prevSpeed: previousData?.speed20m,
      prevTime: previousData?.time20m,
    },
    {
      label: "30m",
      speed: data.speed30m,
      time: data.time30m,
      prevSpeed: previousData?.speed30m,
      prevTime: previousData?.time30m,
    },
  ].filter(d => d.speed !== undefined && d.speed > 0);

  const evolutionData = [...history]
    .sort((a, b) => getSafeDateTime(a.date) - getSafeDateTime(b.date))
    .map((item) => ({
      date: formatDate(item.date),
      v30m: item.speed30m,
    }))
    .filter(item => item.v30m !== undefined && item.v30m > 0)
    .slice(-6);

  return (
    <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-slate-900/95 backdrop-blur-xl overflow-y-auto p-0 md:p-4 no-scrollbar report-modal">
      <div className="max-w-5xl w-full mx-auto md:my-10 h-full md:h-auto font-sans">
        
        {/* Printable/exportable container */}
        <div ref={reportRef} className="print-container bg-slate-100/10 md:bg-transparent">
          
          {/* Page 1 */}
          <ReportPage pageNumber={1} totalPages={3}>
            <ReportHeader
              title="RELATÓRIO DE VELOCIDADE"
              subTitle="PERFIL DE SPRINT & ACELERAÇÃO ELITE"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[{ label: "VELOCIDADE MÁXIMA", value: `${data.speed30m?.toFixed(2) || 0} m/s` }]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 mt-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-8">
                  Perfil de Velocidade (m/s)
                </h4>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={speedData}
                      margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient
                          id="speedBarGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#6366f1"
                            stopOpacity={0.85}
                          />
                          <stop
                            offset="100%"
                            stopColor="#4f46e5"
                            stopOpacity={0.4}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="4 4"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
                        label={{ value: "VELOCIDADE (m/s)", angle: -90, position: "insideLeft", offset: 12, style: { fontSize: 7, fill: "#64748b", fontWeight: 700 } }}
                      />
                      <Tooltip
                        cursor={{ fill: "#f8fafc" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 shadow-xl font-sans text-[10px] space-y-1 uppercase font-bold">
                                <p className="text-slate-400 font-mono text-[9px] mb-1">CASA: {payload[0].payload.label}</p>
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                                  <span>VELOCIDADE: <span className="text-white font-extrabold text-xs">{Number(payload[0].value)?.toFixed(2)}</span> m/s</span>
                                </div>
                                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60 text-slate-350">
                                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                                  <span>TEMPO: <span className="text-orange-400 font-extrabold text-xs">{payload[0].payload.time}</span> s</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="speed"
                        fill="url(#speedBarGrad)"
                        radius={[6, 6, 0, 0]}
                        barSize={32}
                        name="Velocidade por Distância"
                      />
                      <Line
                        type="monotone"
                        dataKey="speed"
                        stroke="#f97316"
                        strokeWidth={3}
                        dot={{ fill: "#f97316", r: 5, stroke: "#ffffff", strokeWidth: 2 }}
                        name="Curva de Aceleração"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {speedData.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black italic text-xs">
                        {item.label}
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          Tempo de Sprint
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-black text-slate-900 italic">
                            {item.time}s
                          </p>
                          {item.prevTime && (
                            <div
                              className={`flex items-center gap-0.5 text-[10px] font-black ${getDiff(item.time, item.prevTime, true).color}`}
                            >
                              <span>
                                {getDiff(item.time, item.prevTime, true).icon}
                              </span>
                              <span>
                                {getDiff(item.time, item.prevTime, true).percent}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        Velocidade Média
                      </p>
                      <div className="flex items-center gap-2 justify-end">
                        {item.prevSpeed && (
                          <div
                            className={`flex items-center gap-0.5 text-[10px] font-black ${getDiff(item.speed, item.prevSpeed).color}`}
                          >
                            <span>
                              {getDiff(item.speed, item.prevSpeed).icon}
                            </span>
                            <span>
                              {getDiff(item.speed, item.prevSpeed).percent}%
                            </span>
                          </div>
                        )}
                        <p className="text-lg font-black text-brand-primary italic">
                          {item.speed?.toFixed(2)} m/s
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ReportPage>

          {/* Page 2 */}
          <ReportPage pageNumber={2} totalPages={3}>
            <ReportHeader
              title="RELATÓRIO DE VELOCIDADE"
              subTitle="ANÁLISE DE HISTÓRICO & EVOLUÇÃO DE SPRINT"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[{ label: "PÁGINA", value: "02 DE 03" }]}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="md:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-200">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-brand-primary" />
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">
                      Evolução da Velocidade Máxima
                    </h4>
                  </div>
                </div>
                <div className="h-[230px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={evolutionData}
                      margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient
                          id="eliteSpeedGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#10b981"
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="95%"
                            stopColor="#10b981"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="4 4"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
                        domain={["dataMin - 1", "dataMax + 1"]}
                        label={{ value: "VELOCIDADE (m/s)", angle: -90, position: "insideLeft", offset: 12, style: { fontSize: 7, fill: "#64748b", fontWeight: 700 } }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 shadow-xl font-sans text-[10px] space-y-1 uppercase font-bold">
                                <p className="text-slate-400 font-mono text-[9px] mb-1">AVALIAÇÃO: {payload[0].payload.date}</p>
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                  <span>VEL. MÁX: <span className="text-white font-extrabold text-xs">{Number(payload[0].value)?.toFixed(2)}</span> m/s</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <ReferenceLine
                        y={8.0}
                        stroke="#059669"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        label={{
                          value: "MARCO ELITE ESPORTIVA (8.0 m/s) ⚡",
                          fill: "#059669",
                          fontSize: 7,
                          fontWeight: 900,
                          position: "insideTopLeft",
                          offset: 4
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="v30m"
                        stroke="#10b981"
                        strokeWidth={3}
                        fill="url(#eliteSpeedGrad)"
                        dot={{
                          fill: "#10b981",
                          r: 4,
                          stroke: "#FFFFFF",
                          strokeWidth: 2,
                        }}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex flex-col justify-center">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary mb-6 animate-pulse">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-primary mb-3">
                  Elite Bio-Insight
                </span>
                <p className="text-[12px] font-bold leading-relaxed text-slate-400 italic uppercase">
                  A velocidade máxima de sprint é um fator determinante para atletas de elite.
                  O perfil de aceleração nos primeiros 5m e 10m demonstra a força explosiva inicial,
                  enquanto a manutenção nos 20m e 30m valida o teto de velocidade pura do atleta.
                </p>
                <div className="mt-8 pt-6 border-t border-slate-800 flex items-start gap-3">
                  <Info className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                  <p className="text-[9px] text-slate-500 font-black leading-snug italic uppercase tracking-wider">
                    "Velocidade explosiva diferencia campeões no milésimo de segundo."
                  </p>
                </div>
              </div>
            </div>
          </ReportPage>

          {/* Page 3: Diagnóstico de Elite & Prescrição */}
          <ReportPage pageNumber={3} totalPages={3}>
            <ReportHeader
              title="RELATÓRIO DE VELOCIDADE"
              subTitle="DIAGNÓSTICO ESPORTIVO & PRESCRIÇÃO AVANÇADA"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[{ label: "PERFIL", value: speedClass.toUpperCase() }, { label: "PÁGINA", value: "03 DE 03" }]}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 font-sans">
              
              {/* Column 1: Executive Summary & Performance Indexes */}
              <div className="space-y-6 overflow-hidden">
                
                {/* 1. STATUS DE SPRINT GERAL */}
                <div className="bg-slate-900 text-white p-5 rounded-[2rem] border border-slate-850 shadow-xl relative overflow-hidden h-fit">
                  <div className="absolute right-3 bottom-3 opacity-5">
                    <Sparkles className="w-16 h-16 text-indigo-400" />
                  </div>
                  <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest block mb-2 font-mono">
                    🔥 1. Status de Sprint Geral
                  </span>
                  <h4 className="text-sm font-black uppercase italic tracking-wider mb-3 leading-tight border-b border-slate-800 pb-2">
                    Veredito do Especialista
                  </h4>
                  <p className="text-[10px] text-slate-200 leading-relaxed font-bold uppercase">
                    {veredictoResumo}
                  </p>
                </div>

                {/* 2. SCORE DE VELOCIDADE */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-1 font-mono">
                    🎯 2. Score de Velocidade
                  </span>
                  <div className="flex justify-between items-baseline mb-3">
                    <h4 className="text-sm font-black uppercase italic tracking-wider text-slate-900">
                      Pontuação de Sprint
                    </h4>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${speedScoreColor}`}>
                      {speedScoreClass}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 py-2">
                    <div className="relative flex items-center justify-center font-sans">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                        <circle cx="32" cy="32" r="28" stroke="#4f46e5" strokeWidth="6" fill="transparent"
                          strokeDasharray={175.9}
                          strokeDashoffset={175.9 - (175.9 * speedScore) / 100}
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <span className="absolute text-lg font-black text-slate-900 italic">
                        {speedScore}
                      </span>
                    </div>
                    <div className="flex-grow space-y-1">
                      <span className="text-[7px] text-slate-500 font-bold uppercase leading-none block">
                        Base de cálculo:
                      </span>
                      <p className="text-[8px] text-slate-400 font-medium leading-relaxed uppercase">
                        Percentual de aceleração pura nos 10m, sustentação pós-20m e velocidade de decolagem inicial.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 🧬 ÍNDICE DE PERFORMANCE DE VELOCIDADE (IVA) */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-2 font-mono">
                    🧬 Índice de Aceleração & Velocidade (IVA)
                  </span>
                  <h4 className="text-sm font-black uppercase italic tracking-wider text-slate-900 mb-3 border-b pb-2">
                    Eficiência Dinâmica
                  </h4>
                  <div className={`p-3 rounded-2xl border ${efficiencyColor} flex items-center justify-between mb-4 transition-all duration-300`}>
                    <span className="text-[9px] font-black uppercase tracking-wider">
                      STATUS DE EFICIÊNCIA:
                    </span>
                    <span className="text-xs font-black uppercase italic tracking-widest">
                      {totalEfficiency}% ({efficiencyLevel})
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[9px] border-b pb-1.5 border-slate-50">
                      <span className="text-slate-400 uppercase font-black">Eficiência de Aceleração</span>
                      <span className="text-slate-900 italic font-black font-sans">{accelEff}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] border-b pb-1.5 border-slate-50">
                      <span className="text-slate-400 uppercase font-black">Manutenção de Velocidade</span>
                      <span className="text-slate-900 italic font-black font-sans">{speedMaint}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="text-slate-400 uppercase font-black">Índice Inicial (5m)</span>
                      <span className="text-slate-900 italic font-black font-sans">{sSpeed5m > 0 ? Math.round((sSpeed5m/5.5)*100) : 0}%</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Column 2: Technical Interpretation (Coach focus) */}
              <div className="space-y-6">
                
                {/* 3. INTERPRETAÇÃO TÉCNICA */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                  <span className="text-[7px] font-black text-orange-600 uppercase tracking-widest block mb-1 font-mono">
                    📊 3. Interpretação Técnica (Treinador)
                  </span>
                  <div className="flex justify-between items-baseline mb-3">
                    <h4 className="text-sm font-black uppercase italic tracking-wider text-slate-900">
                      Metabolismo & Rampa de Velocidade
                    </h4>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">
                      {sNeuromuscularProfile.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="space-y-4 text-[9px] leading-relaxed">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="font-black text-slate-500 uppercase block mb-1">Aceleração e SDF:</span>
                      <p className="text-slate-800 font-extrabold uppercase">{sAcellAnalysis}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="font-black text-slate-500 uppercase block mb-1">Manutenção e Fadiga:</span>
                      <p className="text-slate-800 font-extrabold uppercase">{sFatiqueAnalysis}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="font-black text-slate-500 uppercase block mb-1">Impactos Articulares & Eficácia:</span>
                      <p className="text-slate-800 font-extrabold uppercase">{sVelocityEfect}</p>
                    </div>
                  </div>
                </div>

                {/* 6. IMPACTO NA PERFORMANCE */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                  <span className="text-[7px] font-black text-rose-500 uppercase tracking-widest block mb-2 font-mono">
                    ⚡ 6. Impacto na Performance
                  </span>
                  <h4 className="text-sm font-black uppercase italic tracking-wider text-slate-900 mb-3 border-b pb-2">
                    Respostas Motoras
                  </h4>
                  <div className="flex gap-3 items-start bg-rose-50/20 p-3 rounded-2xl border border-rose-100/30">
                    <Zap className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Diferencial Competitivo Direto:</span>
                      <p className="text-[9px] text-slate-800 font-bold uppercase leading-relaxed">
                        {sPerformanceImpactText}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 7. RAZÕES DE ACELERAÇÃO (Análise de Segmentação) */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                  <span className="text-[7px] font-black text-green-600 uppercase tracking-widest block mb-2 font-mono">
                    🧬 7. Divisão de Potência Linear
                  </span>
                  <h4 className="text-sm font-black uppercase italic tracking-wider text-slate-900 mb-3 border-b pb-2">
                    Aceleração vs Velocidade Máxima
                  </h4>
                  <p className="text-[9px] text-slate-600 font-bold uppercase leading-relaxed font-sans">
                    {accRatioText}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-3 text-center">
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[7px] font-black text-slate-400 uppercase block">Proporção Acc</span>
                      <span className="text-xs font-black text-slate-800 italic">{accRatio.toFixed(2)}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[7px] font-black text-slate-400 uppercase block">Teto Velocidade</span>
                      <span className="text-xs font-black text-slate-800 italic">{sSpeed30m?.toFixed(2)} m/s</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Column 3: Actions, Metas & Translations */}
              <div className="space-y-6">

                {/* 8. PLANO DE AÇÃO */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200/85 shadow-sm">
                  <span className="text-[7px] font-black text-indigo-600 uppercase tracking-widest block mb-1 font-mono">
                    🚀 8. Plano de Ação (4-8 Semanas)
                  </span>
                  <div className="flex justify-between items-baseline border-b pb-2 mb-3">
                    <h4 className="text-sm font-black uppercase italic tracking-wider text-slate-900">
                      Estratégia Imediata
                    </h4>
                  </div>
                  <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest block mb-3 font-semibold font-mono">
                    Foco: {sActionPlanFocus}
                  </p>
                  
                  <div className="space-y-3">
                    {sActionItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-start text-[9px] border-b border-slate-5 pb-2 last:border-0 last:pb-0">
                        <span className="w-4 h-4 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[8px] font-black text-slate-600 shrink-0 mt-0.5 font-mono">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-800 uppercase block leading-tight">{item.title}</span>
                          <span className="text-slate-500 font-medium text-[8px] leading-tight block mt-0.5 uppercase font-bold">{item.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 9. METAS DE EVOLUÇÃO */}
                <div className="bg-slate-950 text-white p-5 rounded-[2rem] border border-slate-850 shadow-xl relative overflow-hidden">
                  <div className="absolute right-3 top-3 opacity-5">
                    <Target className="w-16 h-16 text-emerald-400" />
                  </div>
                  <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest block mb-2 font-mono">
                    🎯 9. Metas de Evolução
                  </span>
                  <h4 className="text-sm font-black uppercase italic tracking-wider text-white mb-3 border-b border-slate-800 pb-2">
                    Objetivos Realistas
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-center">
                      <span className="text-[7px] font-black text-slate-400 uppercase block mb-1">Meta Tempo 10m</span>
                      <span className="text-base font-black text-brand-primary italic font-sans">{bioTargetTime10m}s</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-center">
                      <span className="text-[7px] font-black text-slate-400 uppercase block mb-1">Meta Tempo 30m</span>
                      <span className="text-base font-black text-emerald-400 italic font-sans">{bioTargetTime30m}s</span>
                    </div>
                  </div>
                  <div className="text-center bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-[8px] font-black uppercase tracking-widest text-slate-400">
                    Prazo Estimado: <span className="text-white font-bold">{bioTargetTimeframe}</span>
                  </div>
                </div>

              </div>

            </div>
          </ReportPage>

        </div>

        {/* Buttons Row (Controls) */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 no-print pb-20 px-4 md:px-0">
          <button
            onClick={handleExportJpeg}
            className="flex-grow flex items-center justify-center gap-2 bg-brand-primary text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-brand-primary/25 hover:bg-brand-dark transition-all active:scale-95 cursor-pointer"
          >
            <Download size={20} /> Baixar Páginas (JPEG)
          </button>
          <button
            onClick={handlePrint}
            className="flex-grow flex items-center justify-center gap-2 bg-slate-800 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 cursor-pointer"
          >
            <Printer size={20} /> Imprimir / PDF
          </button>
          <button
            onClick={onClose}
            className="flex-grow flex items-center justify-center gap-2 bg-slate-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-600 transition-all active:scale-95 cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

const Vo2maxReport: FC<{
  athlete: Athlete;
  data: Vo2max;
  onClose: () => void;
  history: Vo2max[];
}> = ({ athlete, data, onClose, history }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const previousData = getPreviousAssessment(data, history);

  const handleExportJpeg = async () => {
    if (!reportRef.current) return;
    const toastId = toast.loading("Otimizando layout para exportação...");
    try {
      const pages = reportRef.current.querySelectorAll(".report-page");
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const dataUrl = await toJpeg(page, {
          quality: 1.0,
          backgroundColor: "#FFFFFF",
          pixelRatio: 3,
        });
        const link = document.createElement("a");
        link.download = `relatorio-vo2max-${athlete.name.toLowerCase().replace(/\s+/g, "-")}-pag-${i + 1}.jpg`;
        link.href = dataUrl;
        link.click();
        await new Promise((r) => setTimeout(r, 400));
      }
      toast.success("Arquivos gerados com sucesso!", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Falha ao gerar imagens.", { id: toastId });
    }
  };

  const handlePrint = () => {
    triggerPrint();
  };

  const evolutionData = [...history]
    .sort((a, b) => getSafeDateTime(a.date) - getSafeDateTime(b.date))
    .map((item) => ({
      date: formatDate(item.date),
      vo2: item.vo2max,
      vam: item.vam,
    }))
    .filter(item => (item.vo2 !== undefined && item.vo2 > 0) || (item.vam !== undefined && item.vam > 0))
    .slice(-6);

  // Sports Science calculations & custom models
  const sGender = athlete.gender;
  const sAge = calculateAge(athlete.dob);
  const sVo2max = data.vo2max || 0;
  const sVam = data.vam || 0;
  const sRec60s = data.rec60s || 0;

  // 1. STATUS AERÓBICO GERAL (RESUMO EXECUTIVO)
  let vo2Class = "Regular";
  let vo2ClassColor = "text-yellow-600";
  if (sGender === "M") {
    if (sVo2max > 62) {
      vo2Class = "Elite";
      vo2ClassColor = "text-indigo-600";
    } else if (sVo2max >= 55) {
      vo2Class = "Excelente";
      vo2ClassColor = "text-emerald-600";
    } else if (sVo2max >= 45) {
      vo2Class = "Normal";
      vo2ClassColor = "text-green-600";
    } else if (sVo2max >= 38) {
      vo2Class = "Regular";
      vo2ClassColor = "text-amber-600";
    } else {
      vo2Class = "Suboptimal";
      vo2ClassColor = "text-red-600";
    }
  } else {
    if (sVo2max > 52) {
      vo2Class = "Elite";
      vo2ClassColor = "text-indigo-600";
    } else if (sVo2max >= 45) {
      vo2Class = "Excelente";
      vo2ClassColor = "text-emerald-600";
    } else if (sVo2max >= 38) {
      vo2Class = "Normal";
      vo2ClassColor = "text-green-600";
    } else if (sVo2max >= 32) {
      vo2Class = "Regular";
      vo2ClassColor = "text-amber-600";
    } else {
      vo2Class = "Suboptimal";
      vo2ClassColor = "text-red-600";
    }
  }

  // aerobic features:
  let vo2QualityText = "boa resistência aeróbica sistêmica de repouso";
  if (sVam > 17 || (sGender === "F" && sVam > 15)) {
    vo2QualityText = "excepcional Velocidade Aeróbica Máxima (VAM) e ótima taxa de tolerância mitocondrial ao lactato";
  } else if (sRec60s > 45) {
    vo2QualityText = "excelente eficiência de recuperação parassimpática celular (coração ágil pós-esforço)";
  }

  let vo2ProblemText = "manter o teto de potência sem sofrer de acidose precoce";
  if (sRec60s < 30) {
    vo2ProblemText = "baixo delta de recuperação autonômica cardíaca após alcançar o pico de estresse aeróbico";
  } else if (sVo2max < 45 && sGender === "M") {
    vo2ProblemText = "limiar cardiopulmonar reduzido diante de demandas continuadas de deslocamento vertical/horizontal de campo";
  } else if (sVo2max < 38 && sGender === "F") {
    vo2ProblemText = "tetos metabólicos e limiares de oxigenação reduzidos";
  }

  const veredictoResumo = `Atleta apresenta capacidade cardiovascular classificada como ${vo2Class.toUpperCase()}. Possui ${vo2QualityText}, contudo demonstra ponto de atenção em ${vo2ProblemText}.`;

  // 2. SCORE CARDIOVASCULAR (0 a 100)
  let vo2Score = 50;
  if (sGender === "M") {
    if (sVo2max >= 62) vo2Score = Math.min(100, 95 + (sVo2max - 62) * 0.8);
    else if (sVo2max >= 55) vo2Score = 85 + ((sVo2max - 55) / 7.0) * 10;
    else if (sVo2max >= 45) vo2Score = 70 + ((sVo2max - 45) / 10.0) * 15;
    else if (sVo2max >= 38) vo2Score = 50 + ((sVo2max - 38) / 7.0) * 20;
    else vo2Score = Math.max(10, 10 + (sVo2max / 38) * 40);
  } else {
    if (sVo2max >= 52) vo2Score = Math.min(100, 95 + (sVo2max - 52) * 0.8);
    else if (sVo2max >= 45) vo2Score = 85 + ((sVo2max - 45) / 7.0) * 10;
    else if (sVo2max >= 38) vo2Score = 70 + ((sVo2max - 38) / 7.0) * 15;
    else if (sVo2max >= 32) vo2Score = 50 + ((sVo2max - 32) / 6.0) * 20;
    else vo2Score = Math.max(10, 10 + (sVo2max / 32) * 40);
  }
  vo2Score = Math.round(vo2Score);

  let vo2ScoreClass = "Baixo";
  let vo2ScoreColor = "text-rose-600 border-rose-200 bg-rose-50";
  if (vo2Score >= 85) { vo2ScoreClass = "Elite"; vo2ScoreColor = "text-indigo-600 border-indigo-200 bg-indigo-50"; }
  else if (vo2Score >= 70) { vo2ScoreClass = "Bom"; vo2ScoreColor = "text-emerald-600 border-emerald-200 bg-emerald-50"; }
  else if (vo2Score >= 50) { vo2ScoreClass = "Regular"; vo2ScoreColor = "text-amber-600 border-amber-200 bg-amber-50"; }

  // 3. INTERPRETAÇÃO TÉCNICA (TREINADOR)
  let sAerobicProfile = "Foco em Potência Aeróbica e Limiar de Lactato";
  let sCapillaryAnalysis = "";
  let sMetabolicEfficiencyStr = "";
  let sCardiacRecoveryStr = "";

  if (vo2Class === "Elite" || vo2Class === "Excelente") {
    sAerobicProfile = "Perfil Cardiovascular de Elite / Grande Capacidade de Transporte de Oxigênio";
  } else if (vo2Class === "Normal") {
    sAerobicProfile = "Perfil Aeróbico Balanceado / Nível de Condicionamento Estabilizado";
  } else {
    sAerobicProfile = "Perfil de Condicionamento Baixo / Fadiga de Acidose Precoce";
  }

  if (sVam > 16) {
    sCapillaryAnalysis = "Excepcional densidade capilar e volume sistólico mitocondrial. Atleta possui capacidade fantástica de remoção e reciclagem de lactato.";
  } else {
    sCapillaryAnalysis = "Volume mitocondrial e circulação capilar periférica moderados. Sujeito a estafa mecânica por acúmulo de lactato prematuro em tiros contínuos.";
  }

  const sThresholdSpeed = data.thresholdSpeed || 1;
  if (sThresholdSpeed / (sVam || 1) > 0.8) {
    sMetabolicEfficiencyStr = "Altíssima sustentabilidade de ritmo de corrida. O limiar anaeróbico está situado muito próximo da VAM, indicando ritmista eficiente.";
  } else {
    sMetabolicEfficiencyStr = "Baixo limiar de lactato relativo à VAM. Atleta opera sob regime anaeróbico precoce em velocidades medianas de jogo.";
  }

  if (sRec60s > 40) {
    sCardiacRecoveryStr = "Fantástica recuperação pós-esforço imediata. Demonstra excelente responsividade do tônus vagal parassimpático pós-esforço extremo.";
  } else {
    sCardiacRecoveryStr = "Recuperação de frequência letárgica. O atleta permanece deprimido energeticamente por longos períodos pós-sprint, atrasando a reoxigenação.";
  }

  // 4. TRADUÇÃO SIMPLES (ATLETA)
  let sVo2AthleteTranslation = "";
  if (vo2Class === "Elite" || vo2Class === "Excelente") {
    sVo2AthleteTranslation = "Seu pulmão e coração são verdadeiros motores de alta cavalaria! Você consegue correr o jogo inteiro sem perder a eficiência de fôlego nem cansar na finta mecânica. Vamos focar em manter esse teto fantástico trabalhando treinos de tiros longos.";
  } else if (vo2Class === "Normal") {
    sVo2AthleteTranslation = "Você está com um ótimo nível de fôlego para as disputas de jogo. Consegue manter a intensidade na maioria do tempo, mas podemos melhorar o seu tempo de recuperação entre os tiros para que você atropele seus adversários no segundo tempo.";
  } else {
    sVo2AthleteTranslation = "No momento seu fôlego ainda está esgotando um pouco antes do esperado ao dar tiros repetidos. Vamos trabalhar treinos intermitentes específicos para expandir o tamanho do seu motor cardiorrespiratório e acelerar a sua recuperação pós-sprint.";
  }

  // 5. EXPLICAÇÃO PARA PAIS
  let sVo2ParentsExplanation = "";
  if (sAge < 18) {
    sVo2ParentsExplanation = "O monitoramento do VO2 Max avalia a eficiência de oxigenação celular do adolescente. Manter a capacidade aeróbica ideal melhora o transporte de nutrientes aos tecidos musculares em formação, evita o esgotamento precoce e fortalece a saúde do músculo do coração em desenvolvimento.";
  } else {
    sVo2ParentsExplanation = "A avaliação de consumo máximo de oxigênio (VO2) garante a saúde cardiovascular integrada do competidor. Controlar os limiares de acidose pulmonar e o retorno imediato da frequência cardíaca protege contra estresse cardíaco ou fadiga fadigante pós-sessão de suor intenso.";
  }

  // 6. IMPACTO NA PERFORMANCE
  let sVo2PerformanceImpactText = "";
  if (vo2Class === "Elite" || vo2Class === "Excelente") {
    sVo2PerformanceImpactText = "O excelente motor aeróbico permite que o atleta realize sprints seguidos de alta velocidade e fintas explosivas mantendo a alta acuidade visual e técnica mesmo nos acréscimos.";
  } else {
    sVo2PerformanceImpactText = "Garantir uma subida de 5% no VO2 Max aumenta a capacidade de oxigenação muscular, o que permite acelerar a recuperação pós-finta e diminuir as caminhadas passivas em campo.";
  }

  // 7. METAS DE EVOLUÇÃO AERÓBICA
  let bioTargetVo2 = 0;
  let bioTargetVam = 0;
  const bioTargetTimeframeVo2 = "6 a 8 semanas";

  if (sVo2max > 0) {
    bioTargetVo2 = parseFloat((sVo2max + (sVo2max < 50 ? 4.5 : 2.5)).toFixed(1));
    bioTargetVam = parseFloat((sVam + 1.2).toFixed(1));
  } else {
    bioTargetVo2 = sGender === "M" ? 52 : 44;
    bioTargetVam = sGender === "M" ? 17.5 : 15.0;
  }

  // IEA CALCULATIONS
  const vamEff = Math.round(Math.min(100, (sVam / 20) * 105));
  const recEff = Math.round(Math.min(100, (sRec60s / 50) * 105));
  const totalEfficiencyVo2 = Math.round((vo2Score * 0.40) + (vamEff * 0.40) + (recEff * 0.20));

  let efficiencyLevelVo2 = "baixa";
  let efficiencyColorVo2 = "text-rose-600 border-rose-100 bg-rose-50/50 hover:bg-rose-50";
  if (totalEfficiencyVo2 >= 85) {
    efficiencyLevelVo2 = "elite";
    efficiencyColorVo2 = "text-indigo-600 border-indigo-100 bg-indigo-50/50 hover:bg-indigo-55";
  } else if (totalEfficiencyVo2 >= 70) {
    efficiencyLevelVo2 = "alta";
    efficiencyColorVo2 = "text-emerald-600 border-emerald-100 bg-emerald-50/50 hover:bg-emerald-55";
  } else if (totalEfficiencyVo2 >= 50) {
    efficiencyLevelVo2 = "moderada";
    efficiencyColorVo2 = "text-amber-600 border-amber-100 bg-amber-50/50 hover:bg-amber-55";
  }

  // 8. PLANO DE AÇÃO AERÓBICO
  let sVo2ActionPlanFocus = "Foco em Expansão de VAM, Intervalado de Alta Intensidade e Limiar de Lactato";
  let sVo2ActionItems = [
    { title: "Protocolo HIIT Intermitente VAM (105%)", desc: "Tiros de 30s de corrida na velocidade de VAM seguidos de 30s de descanso passivo, repetindo por 8-12 ciclos para hipertrofia mitocondrial direta." },
    { title: "Corrida Contínua Limiar (Z3)", desc: "Trabalho aeróbico de ritmo sustentado (tempo run) por 20 a 30 minutos em intensidade equivalente a 80-85% da frequência máxima registrada." },
    { title: "Treino de Capacidade Regenerativa (Z1-Z2)", desc: "Volume de regeneração muscular leve de 40 a 50 minutos (ciclismo ou corrida leve) focado em densidade capilar integrada." }
  ];

  const StatCard = ({
    icon: Icon,
    label,
    value,
    unit,
    color,
    description,
    diff,
  }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full group hover:border-brand-primary/20 transition-all font-sans">
      <div className="flex items-center justify-between mb-3 font-sans">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${color} bg-opacity-10 shadow-sm`}>
            <Icon className={`w-3.5 h-3.5 ${color.replace("bg-", "text-")}`} />
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none font-bold font-sans">
            {label}
          </span>
        </div>
        {diff && (
          <div className={`flex items-center gap-0.5 text-[9px] font-black ${diff.color}`}>
            <span>{diff.icon}</span>
            <span>{diff.percent}%</span>
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1 mt-auto font-sans">
        <span className="text-xl font-black text-slate-950 italic tracking-tight font-sans">
          {value || 0}
        </span>
        <span className="text-[10px] font-black text-slate-400 uppercase italic font-sans">
          {unit}
        </span>
      </div>
      {description && (
        <p className="text-[8px] text-slate-500 mt-1 font-bold leading-tight uppercase italic opacity-85 font-sans">
          {description}
        </p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-slate-900/95 backdrop-blur-xl overflow-y-auto p-0 md:p-4 no-scrollbar report-modal">
      <div className="max-w-5xl w-full mx-auto md:my-10 h-full md:h-auto font-sans">
        
        {/* Printable/exportable container */}
        <div ref={reportRef} className="print-container bg-slate-100/10 md:bg-transparent">
          {/* Page 1 */}
          <ReportPage pageNumber={1} totalPages={3}>
            <ReportHeader
              title="RELATÓRIO DE VO2 MAX"
              subTitle="CAPACIDADE ERGOMÉTRICA & CARDIOVASCULAR"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[
                { label: "VO2 MÁXIMO", value: `${data.vo2max} ml/kg/min` },
                { label: "FITNESS SCORE", value: data.score || "N/A" }
              ]}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 mt-4 font-sans">
              <div className="bg-brand-primary p-6 rounded-3xl text-brand-dark shadow-xl relative overflow-hidden group flex flex-col justify-between">
                <div className="absolute -right-4 -top-4 opacity-[0.05] group-hover:scale-110 transition-transform text-brand-dark">
                  <HeartPulse className="w-24 h-24" />
                </div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 italic font-bold">
                    VO2 MÁXIMO
                  </span>
                  {previousData && previousData.vo2max && (
                    <div className="flex items-center gap-1 text-[9px] font-black text-brand-dark bg-black/10 px-2 py-0.5 rounded-full">
                      <span>{getDiff(data.vo2max, previousData.vo2max).icon}</span>
                      <span>{getDiff(data.vo2max, previousData.vo2max).percent}%</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <h3 className="text-4xl font-black italic leading-none font-sans">
                      {data.vo2max || 0}
                    </h3>
                    <span className="text-[10px] font-bold opacity-60 uppercase italic font-sans">
                      ml/kg/min
                    </span>
                  </div>
                  <p className="text-[8px] mt-4 font-black uppercase italic leading-relaxed text-brand-dark/80 font-bold font-sans">
                    Consumo máximo de oxigênio relativo.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-6 rounded-3xl relative overflow-hidden group flex flex-col justify-between">
                <div className="absolute -right-4 -top-4 text-orange-500 opacity-[0.03] group-hover:scale-110 transition-transform">
                  <Zap className="w-24 h-24" />
                </div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic font-bold font-sans">
                    VAM
                  </span>
                  {previousData && (previousData.vam || previousData.thresholdSpeed) && (
                    <div className="flex items-center gap-1 text-[9px] font-black text-orange-500 font-sans">
                      <span>{getDiff(data.vam || data.thresholdSpeed, previousData.vam || previousData.thresholdSpeed).icon}</span>
                      <span>{getDiff(data.vam || data.thresholdSpeed, previousData.vam || previousData.thresholdSpeed).percent}%</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <h3 className="text-4xl font-black text-slate-900 italic leading-none font-sans">
                      {data.vam || data.thresholdSpeed || 0}
                    </h3>
                    <span className="text-xs font-bold text-slate-400 uppercase italic font-sans">
                      KM/H
                    </span>
                  </div>
                  <p className="text-[8px] mt-4 font-black text-slate-400 uppercase italic leading-relaxed font-bold font-sans">
                    Velocidade Aeróbica Máxima de corrida.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-6 rounded-3xl relative overflow-hidden group flex flex-col justify-between">
                <div className="absolute -right-4 -top-4 text-rose-500 opacity-[0.03] group-hover:scale-110 transition-transform">
                  <Activity className="w-24 h-24" />
                </div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic font-bold font-sans">
                    FC MÁXIMA
                  </span>
                  {previousData && previousData.maxHeartRate && (
                    <div className="flex items-center gap-1 text-[9px] font-black text-rose-500 font-sans">
                      <span>{getDiff(data.maxHeartRate, previousData.maxHeartRate, true).icon}</span>
                      <span>{getDiff(data.maxHeartRate, previousData.maxHeartRate, true).percent}%</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <h3 className="text-4xl font-black text-slate-900 italic leading-none font-sans">
                      {data.maxHeartRate || 0}
                    </h3>
                    <span className="text-xs font-bold text-slate-400 uppercase italic font-sans">
                      BPM
                    </span>
                  </div>
                  <p className="text-[8px] mt-4 font-black text-slate-400 uppercase italic leading-relaxed font-bold font-sans">
                    Frequência cardíaca máxima atingida.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-6 rounded-3xl relative overflow-hidden group flex flex-col justify-between">
                <div className="absolute -right-4 -top-4 text-purple-500 opacity-[0.03] group-hover:scale-110 transition-transform">
                  <Sparkles className="w-24 h-24" />
                </div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic font-bold font-sans">
                    FITNESS SCORE
                  </span>
                  {previousData && previousData.score && (
                    <div className="flex items-center gap-1 text-[9px] font-black text-purple-500 font-sans">
                      <span>{getDiff(data.score || 0, previousData.score || 0).icon}</span>
                      <span>{getDiff(data.score || 0, previousData.score || 0).percent}%</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <h3 className="text-4xl font-black text-slate-900 italic leading-none font-sans">
                      {data.score || 0}
                    </h3>
                    <span className="text-xs font-bold text-slate-400 uppercase italic font-sans">
                      PTS
                    </span>
                  </div>
                  <p className="text-[8px] mt-4 font-black text-slate-400 uppercase italic leading-relaxed font-bold font-sans">
                    Pontuação de condicionamento aeróbico.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <StatCard
                icon={Activity}
                label="FC Limiar"
                value={data.thresholdHeartRate}
                unit="bpm"
                color="bg-red-500"
                diff={
                  previousData
                    ? getDiff(
                        data.thresholdHeartRate,
                        previousData.thresholdHeartRate,
                        true,
                      )
                    : null
                }
              />
              <StatCard
                icon={TrendingUp}
                label="V. Máxima Peak"
                value={data.maxSpeed}
                unit="km/h"
                color="bg-brand-primary"
                diff={
                  previousData
                    ? getDiff(data.maxSpeed, previousData.maxSpeed)
                    : null
                }
              />
              <StatCard
                icon={Droplets}
                label="Ventilação Max"
                value={data.maxVentilation}
                unit="L/min"
                color="bg-cyan-500"
                diff={
                  previousData
                    ? getDiff(data.maxVentilation, previousData.maxVentilation)
                    : null
                }
              />
              <StatCard
                icon={Activity}
                label="Recup. 60s"
                value={data.rec60s}
                unit="bpm"
                color="bg-emerald-500"
                description="Delta FC 1min post-pico"
                diff={
                  previousData ? getDiff(data.rec60s, previousData.rec60s) : null
                }
              />
            </div>
          </ReportPage>

          {/* Page 2 */}
          <ReportPage pageNumber={2} totalPages={3}>
            <ReportHeader
              title="RELATÓRIO DE VO2 MAX"
              subTitle="FOTOGRAFIA CARDIOVASCULAR E EVOLUÇÃO HISTÓRICA"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[{ label: "PÁGINA", value: "02 DE 03" }]}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="md:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2 font-sans">
                    <TrendingUp className="w-4 h-4 text-brand-primary" />
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] font-bold">
                      Histórico Aeróbico
                    </h4>
                  </div>
                </div>
                <div className="h-[260px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={evolutionData}
                      margin={{ top: 15, right: 5, left: -20, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient
                          id="eliteVo2Grad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#6366f1"
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="95%"
                            stopColor="#6366f1"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="4 4"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
                      />
                      {/* Left Axis for VO2Max */}
                      <YAxis
                        yAxisId="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6366f1", fontSize: 9, fontWeight: 700 }}
                        domain={["dataMin - 4", "dataMax + 4"]}
                        label={{ value: "VO2 (ml/kg/min)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 7, fill: "#6366f1", fontWeight: 700 } }}
                      />
                      {/* Right Axis for VAM */}
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#f97316", fontSize: 9, fontWeight: 700 }}
                        domain={["dataMin - 2", "dataMax + 2"]}
                        label={{ value: "VAM (km/h)", angle: 90, position: "insideRight", offset: -2, style: { fontSize: 7, fill: "#f97316", fontWeight: 700 } }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 shadow-xl font-sans text-[10px] space-y-1.5 uppercase font-bold">
                                <p className="text-slate-400 font-mono text-[9px] mb-1">DATA: {payload[0].payload.date}</p>
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                                  <span>VO2 MÁX: <span className="text-white font-extrabold text-xs">{payload[0].value}</span> ml/kg</span>
                                </div>
                                {payload[1] && (
                                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                                    <span>VAM: <span className="text-orange-400 font-extrabold text-xs">{payload[1].value}</span> km/h</span>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={32}
                        iconSize={10}
                        content={() => (
                          <div className="flex justify-center gap-6 text-[9px] font-black text-slate-500 uppercase tracking-wider mb-4">
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-1.5 rounded-sm bg-indigo-500"></span>
                              <span>VO2 MAX (ml/kg/min)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-0.5 bg-orange-500 block"></span>
                              <span>VAM (km/h)</span>
                            </div>
                          </div>
                        )}
                      />
                      <ReferenceLine
                        yAxisId="left"
                        y={athlete.gender === "M" ? 60 : 52}
                        stroke="#818cf8"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        label={{
                          value: `ELITE GLOBAL (${athlete.gender === "M" ? "60" : "52"} ML/KG) 💎`,
                          fill: "#818cf8",
                          fontSize: 6.5,
                          fontWeight: 900,
                          position: "insideTopLeft",
                          offset: 4
                        }}
                      />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="vo2"
                        stroke="#6366f1"
                        strokeWidth={3}
                        fill="url(#eliteVo2Grad)"
                        dot={{
                          fill: "#6366f1",
                          r: 4,
                          stroke: "#FFFFFF",
                          strokeWidth: 2,
                        }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="vam"
                        stroke="#f97316"
                        strokeWidth={3.5}
                        dot={{
                          fill: "#f97316",
                          r: 4,
                          stroke: "#FFFFFF",
                          strokeWidth: 2,
                        }}
                        activeDot={{ r: 6 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-[2rem] text-white flex flex-col justify-between font-sans">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-brand-primary" />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-primary">
                      ZONAS DE TREINAMENTO (VAM)
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold mb-4 uppercase leading-relaxed">
                    Prescrição baseada na sua Velocidade Aeróbica Máxima (VAM) de <span className="text-brand-primary font-black">{data.vam || 0} km/h</span>:
                  </p>
                  <div className="space-y-2">
                    {[
                      { zone: "Z1", name: "Recuperação", pct: "< 60%", speed: `${((data.vam || 0) * 0.55).toFixed(1)} km/h`, color: "border-blue-500 bg-blue-500/10" },
                      { zone: "Z2", name: "Endurance", pct: "60-75%", speed: `${((data.vam || 0) * 0.68).toFixed(1)}-${((data.vam || 0) * 0.75).toFixed(1)} km/h`, color: "border-emerald-500 bg-emerald-500/10" },
                      { zone: "Z3", name: "Limiar", pct: "75-90%", speed: `${((data.vam || 0) * 0.82).toFixed(1)}-${((data.vam || 0) * 0.90).toFixed(1)} km/h`, color: "border-orange-500 bg-orange-500/10" },
                      { zone: "Z4", name: "VO2 Max", pct: "90-105%", speed: `${((data.vam || 0) * 0.97).toFixed(1)}-${((data.vam || 0) * 1.05).toFixed(1)} km/h`, color: "border-red-500 bg-red-500/10 animate-pulse" },
                    ].map((z, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-2 rounded-xl border ${z.color} font-sans`}>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black">{z.zone}</span>
                          <span className="text-[8px] font-black text-slate-300 uppercase">{z.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] text-slate-400 font-bold block">{z.pct} VAM</span>
                          <span className="text-[10px] font-black text-white italic">{z.speed}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                  <p className="text-[8px] text-slate-500 font-extrabold leading-snug italic uppercase tracking-wider">
                    As zonas ajudam a controlar a carga de treino em tempo real.
                  </p>
                </div>
              </div>
            </div>
          </ReportPage>

          {/* Page 3: Diagnóstico de Elite & Prescrição */}
          <ReportPage pageNumber={3} totalPages={3}>
            <ReportHeader
              title="RELATÓRIO DE VO2 MAX"
              subTitle="DIAGNÓSTICO ESPORTIVO & PRESCRIÇÃO AVANÇADA"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[{ label: "PERFIL", value: vo2Class.toUpperCase() }, { label: "PÁGINA", value: "03 DE 03" }]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 font-sans">
              
              {/* Column 1: Executive Summary & Performance Indexes */}
              <div className="space-y-6 overflow-hidden">
                
                {/* 1. STATUS AERÓBICO GERAL */}
                <div className="bg-slate-900 text-white p-5 rounded-[2rem] border border-slate-850 shadow-xl relative overflow-hidden h-fit">
                  <div className="absolute right-3 bottom-3 opacity-5">
                    <Sparkles className="w-16 h-16 text-indigo-400" />
                  </div>
                  <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest block mb-2 font-mono pb-1 border-b border-indigo-455/20">
                    🔥 RESUMO EXECUTIVO
                  </span>
                  <h4 className="text-sm font-black uppercase italic tracking-wider mb-3 leading-tight text-white">
                    Veredito do Especialista
                  </h4>
                  <p className="text-[10px] text-slate-200 leading-relaxed font-bold uppercase font-sans">
                    {veredictoResumo}
                  </p>
                </div>

                {/* 2. SCORE DE CAPACIDADE AERÓBICA */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-1 font-mono font-bold">
                    🎯 SCORE CARDIOVASCULAR
                  </span>
                  <div className="flex justify-between items-baseline mb-3">
                    <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-900">
                      Pontuação de VO2 Max
                    </h4>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${vo2ScoreColor}`}>
                      {vo2ScoreClass}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 py-2 font-sans">
                    <div className="relative flex items-center justify-center font-sans">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                        <circle cx="32" cy="32" r="28" stroke="#4f46e5" strokeWidth="6" fill="transparent"
                          strokeDasharray={175.9}
                          strokeDashoffset={175.9 - (175.9 * vo2Score) / 100}
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <span className="absolute text-lg font-black text-slate-900 italic font-sans">
                        {vo2Score}
                      </span>
                    </div>
                    <div className="flex-grow space-y-1">
                      <span className="text-[7px] text-slate-500 font-bold uppercase leading-none block">
                        Base de cálculo:
                      </span>
                      <p className="text-[8px] text-slate-450 font-black leading-relaxed uppercase">
                        Percentual de consumo de oxigênio relativo, velocidade de limiar e delta de recuperação parassimpática (bpm/min).
                      </p>
                    </div>
                  </div>
                </div>

                {/* 🧬 ÍNDICE DE EFICIÊNCIA AERÓBICA (IEA) */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-2 font-mono font-bold">
                    🧬 ÍNDICE DE EFICIÊNCIA AERÓBICA (IEA)
                  </span>
                  <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-900 mb-3 border-b pb-2">
                    Eficiência Cardiorrespiratória
                  </h4>
                  <div className={`p-3 rounded-2xl border ${efficiencyColorVo2} flex items-center justify-between mb-4 transition-all duration-300 font-sans`}>
                    <span className="text-[9px] font-black uppercase tracking-wider">
                      STATUS DE EFICIÊNCIA:
                    </span>
                    <span className="text-xs font-black uppercase italic tracking-widest">
                      {totalEfficiencyVo2}% ({efficiencyLevelVo2.toUpperCase()})
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[9px] border-b pb-1.5 border-slate-50 font-sans">
                      <span className="text-slate-400 uppercase font-black text-[8px]">Eficiência de VAM</span>
                      <span className="text-slate-900 italic font-black">{vamEff}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] border-b pb-1.5 border-slate-50 font-sans">
                      <span className="text-slate-400 uppercase font-black text-[8px]">Constante de Recuperação</span>
                      <span className="text-slate-900 italic font-black">{recEff}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-sans">
                      <span className="text-slate-400 uppercase font-black text-[8px]">Score Cardiovascular</span>
                      <span className="text-slate-900 italic font-black">{vo2Score}%</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Column 2: Technical Interpretation (Coach focus) */}
              <div className="space-y-6">
                
                {/* 3. INTERPRETAÇÃO TÉCNICA */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200/90 shadow-sm font-sans">
                  <span className="text-[7px] font-black text-orange-600 uppercase tracking-widest block mb-1 font-mono font-bold">
                    📊 INTERPRETAÇÃO TÉCNICA (TREINADOR)
                  </span>
                  <div className="flex justify-between items-baseline mb-3">
                    <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-900 font-bold">
                      Capilarização & Delta Cardíaco
                    </h4>
                  </div>
                  
                  <div className="space-y-4 text-[9px] leading-relaxed">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="font-black text-slate-500 uppercase block mb-1 text-[8px]">Capilarização Periférica:</span>
                      <p className="text-slate-800 font-extrabold uppercase">{sCapillaryAnalysis}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="font-black text-slate-500 uppercase block mb-1 text-[8px]">Eficiência de Limiar de Lactato:</span>
                      <p className="text-slate-800 font-extrabold uppercase">{sMetabolicEfficiencyStr}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="font-black text-slate-500 uppercase block mb-1 text-[8px]">Delta Heart Recovery (60s):</span>
                      <p className="text-slate-800 font-extrabold uppercase">{sCardiacRecoveryStr}</p>
                    </div>
                  </div>
                </div>

                {/* 6. IMPACTO NA PERFORMANCE */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                  <span className="text-[7px] font-black text-rose-500 uppercase tracking-widest block mb-2 font-mono select-none">
                    ⚡ PERFORMANCE & ECONOMIA
                  </span>
                  <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-900 mb-3 border-b pb-2 font-bold">
                    Economia de Corrida
                  </h4>
                  <div className="flex gap-3 items-start bg-rose-50/20 p-3 rounded-2xl border border-rose-100/30">
                    <Zap className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Diferencial de Intensidade:</span>
                      <p className="text-[9px] text-slate-800 font-bold uppercase leading-relaxed font-sans">
                        {sVo2PerformanceImpactText}
                      </p>
                    </div>
                  </div>
                </div>

              <div className="space-y-6 flex flex-col justify-between h-full">
                {/* 8. PLANO DE AÇÃO AERÓBICO */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200/85 shadow-sm font-sans">
                  <span className="text-[7px] font-black text-indigo-600 uppercase tracking-widest block mb-1 font-mono font-semibold">
                    🚀 PRESCRIÇÃO E TREINO
                  </span>
                  <div className="flex justify-between items-baseline border-b pb-2 mb-3">
                    <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-900 font-bold">
                      Plano de Ação Imediato
                    </h4>
                  </div>
                  
                  <div className="space-y-3 font-sans">
                    {sVo2ActionItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-start text-[9px] border-b border-slate-5 pb-2 last:border-0 last:pb-0 font-sans font-bold">
                        <span className="w-4 h-4 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[8px] font-black text-slate-600 shrink-0 mt-0.5 font-mono font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-800 uppercase block leading-tight">{item.title}</span>
                          <span className="text-slate-450 font-bold text-[8px] leading-tight block mt-0.5 uppercase">{item.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 9. METAS DE EVOLUÇÃO CARDIOVASCULAR */}
                <div className="bg-slate-950 text-white p-5 rounded-[2rem] border border-slate-850 shadow-xl relative overflow-hidden">
                  <div className="absolute right-3 top-3 opacity-5">
                    <Target className="w-16 h-16 text-emerald-400" />
                  </div>
                  <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest block mb-2 font-mono font-bold">
                    🎯 METAS DE EVOLUÇÃO
                  </span>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3 font-sans">
                    <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-center">
                      <span className="text-[7px] font-black text-slate-400 uppercase block mb-1 font-mono font-bold">VO2 Max</span>
                      <span className="text-base font-black text-brand-primary italic font-sans">{bioTargetVo2} ml</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-center">
                      <span className="text-[7px] font-black text-slate-455 uppercase block mb-1 font-mono font-bold font-semibold">Parâmetro VAM</span>
                      <span className="text-base font-black text-emerald-400 italic font-sans">{bioTargetVam} km/h</span>
                    </div>
                  </div>
                  <div className="text-center bg-slate-900 p-2 text-[8px] font-black uppercase tracking-widest text-slate-400">
                    Prazo ideal: <span className="text-white font-bold">{bioTargetTimeframeVo2}</span>
                  </div>
                </div>

              </div>

            </div>
            </div>
          </ReportPage>

        </div>

        {/* Buttons Row (Controls) */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 no-print pb-20 px-4 md:px-0 font-sans">
          <button
            onClick={handleExportJpeg}
            className="flex-grow flex items-center justify-center gap-2 bg-brand-primary text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-brand-primary/25 hover:bg-brand-dark transition-all active:scale-95 cursor-pointer font-sans"
          >
            <Download size={20} /> Baixar Páginas (JPEG)
          </button>
          <button
            onClick={handlePrint}
            className="flex-grow flex items-center justify-center gap-2 bg-slate-800 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 cursor-pointer font-sans"
          >
            <Printer size={20} /> Imprimir / PDF
          </button>
          <button
            onClick={onClose}
            className="flex-grow flex items-center justify-center gap-2 bg-slate-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-600 transition-all active:scale-95 cursor-pointer font-sans"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const CmjReport: FC<{
  athlete: Athlete;
  data: Cmj;
  onClose: () => void;
  history: Cmj[];
}> = ({ athlete, data, onClose, history }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const previousData = getPreviousAssessment(data, history);

  // CMJ Sport Science Calculations:
  const cmjHeight = data.height || 0;
  const cmjWeight = data.weight || 1;
  const cmjPower = data.power || 0;
  const cmjPowerRel = cmjPower / cmjWeight;
  const cmjFlightTime = data.flightTime || 0;
  const cmjDepth = data.depth || 0;

  // Football-Specific Normatives Detection:
  const isFutebol = athlete.modality?.toLowerCase().includes("futebol") || athlete.modality?.toLowerCase().includes("soccer");
  
  // Set default / general normative requirements
  let reqHeightMin = 36;
  let reqHeightMax = 45;
  let reqRelPowerMin = 48;
  let reqRelPowerMax = 58;
  let soccerCategory = "Geral";

  if (isFutebol) {
    const age = calculateAge(athlete.dob);
    const isFemale = athlete.gender === "F";
    if (isFemale) {
      if (age <= 15) {
        soccerCategory = "Sub-15 Feminino (14-15 anos)";
        reqHeightMin = 22;
        reqHeightMax = 26;
        reqRelPowerMin = 32;
        reqRelPowerMax = 38;
      } else if (age <= 17) {
        soccerCategory = "Sub-17 Feminino (16-17 anos)";
        reqHeightMin = 25;
        reqHeightMax = 30;
        reqRelPowerMin = 36;
        reqRelPowerMax = 42;
      } else if (age <= 20) {
        soccerCategory = "Sub-20 Feminino (18-20 anos)";
        reqHeightMin = 28;
        reqHeightMax = 33;
        reqRelPowerMin = 40;
        reqRelPowerMax = 46;
      } else {
        soccerCategory = "Profissional Feminino (Adulto)";
        reqHeightMin = 30;
        reqHeightMax = 36;
        reqRelPowerMin = 42;
        reqRelPowerMax = 50;
      }
    } else {
      if (age <= 15) {
        soccerCategory = "Sub-15 Masculino (14-15 anos)";
        reqHeightMin = 31;
        reqHeightMax = 35;
        reqRelPowerMin = 42;
        reqRelPowerMax = 48;
      } else if (age <= 17) {
        soccerCategory = "Sub-17 Masculino (16-17 anos)";
        reqHeightMin = 36;
        reqHeightMax = 41;
        reqRelPowerMin = 48;
        reqRelPowerMax = 54;
      } else if (age <= 20) {
        soccerCategory = "Sub-20 Masculino (18-20 anos)";
        reqHeightMin = 40;
        reqHeightMax = 44;
        reqRelPowerMin = 52;
        reqRelPowerMax = 58;
      } else {
        soccerCategory = "Profissional Masculino (Adulto)";
        reqHeightMin = 43;
        reqHeightMax = 50;
        reqRelPowerMin = 55;
        reqRelPowerMax = 65;
      }
    }
  }

  // Classify Jump Height:
  let heightClass = "Baixo";
  let heightColor = "bg-red-500 text-red-550 border-red-200/50";
  
  const hEliteLimit = isFutebol ? reqHeightMax : 50;
  const hBomLimit = isFutebol ? reqHeightMin : 40;
  const hModLimit = isFutebol ? (reqHeightMin - 5) : 30;

  if (cmjHeight >= hEliteLimit) {
    heightClass = "Elite";
    heightColor = "bg-brand-primary text-brand-dark border-brand-primary/20";
  } else if (cmjHeight >= hBomLimit) {
    heightClass = "Bom";
    heightColor = "bg-emerald-500 text-emerald-600 border-emerald-200/50";
  } else if (cmjHeight >= hModLimit) {
    heightClass = "Moderado";
    heightColor = "bg-amber-500 text-amber-600 border-amber-200/50";
  }

  // Classify Relative Peak Power:
  let powerClass = "Baixo";
  let powerColor = "bg-red-500 text-red-550 border-red-200/50";
  
  const pEliteLimit = isFutebol ? reqRelPowerMax : 62;
  const pBomLimit = isFutebol ? reqRelPowerMin : 50;
  const pModLimit = isFutebol ? (reqRelPowerMin - 5) : 40;

  if (cmjPowerRel >= pEliteLimit) {
    powerClass = "Elite";
    powerColor = "bg-brand-primary text-brand-dark border-brand-primary/20";
  } else if (cmjPowerRel >= pBomLimit) {
    powerClass = "Bom";
    powerColor = "bg-emerald-500 text-emerald-600 border-emerald-200/50";
  } else if (cmjPowerRel >= pModLimit) {
    powerClass = "Moderado";
    powerColor = "bg-amber-500 text-amber-600 border-amber-200/50";
  }

  // Score Cardiovascular/Explosive CmjScore:
  let cmjScore = Math.round(
    Math.min(((cmjHeight / hEliteLimit) * 50) + ((cmjPowerRel / pEliteLimit) * 50), 100)
  );
  if (cmjScore < 20) cmjScore = 20;

  let cmjScoreClass = "Baixo";
  let cmjScoreColor = "bg-red-555/10 text-red-400 border-red-500/20";
  if (cmjScore >= 85) {
    cmjScoreClass = "Elite";
    cmjScoreColor = "bg-brand-primary/10 text-brand-primary border-brand-primary/20";
  } else if (cmjScore >= 70) {
    cmjScoreClass = "Bom";
    cmjScoreColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  } else if (cmjScore >= 50) {
    cmjScoreClass = "Moderado";
    cmjScoreColor = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  }

  // Reactive Index Cmj Efficiency (IEP):
  const fTimeEff = Math.min(Math.round((cmjFlightTime / 650) * 100), 100);
  const pRelEff = Math.min(Math.round((cmjPowerRel / pEliteLimit) * 100), 100);
  const cmjStiffnessEff = Math.min(Math.round((cmjHeight / hEliteLimit) * 100), 100);
  const totalEfficiencyCmj = Math.round((fTimeEff + pRelEff + cmjStiffnessEff) / 3);

  let efficiencyLevelCmj = "Baixo";
  let efficiencyColorCmj = "bg-red-555/10 text-red-400 border-red-500/20";
  if (totalEfficiencyCmj >= 85) {
    efficiencyLevelCmj = "Elite";
    efficiencyColorCmj = "bg-brand-primary/10 text-brand-primary border-brand-primary/20";
  } else if (totalEfficiencyCmj >= 70) {
    efficiencyLevelCmj = "Alta";
    efficiencyColorCmj = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  } else if (totalEfficiencyCmj >= 50) {
    efficiencyLevelCmj = "Moderada";
    efficiencyColorCmj = "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
  }

  // 1. VEREDICTO RESUMO DO ESPECIALISTA (Cientista do Esporte)
  let veredictoResumoCmj = `Perfil de força explosiva moderado. Apresenta boa relação altura de salto, mas necessita elevar a aceleração concêntrica na fase de subida do contra-movimento.`;
  if (isFutebol) {
    if (cmjHeight >= reqHeightMax && cmjPowerRel >= reqRelPowerMax) {
      veredictoResumoCmj = `Excelente dominância neuromuscular para futebolista da categoria ${soccerCategory}. Apresenta desenvolvimento de pico de força, taxa de força de aceleração e potência relativa (W/kg) de elite nacional/internacional, com fantástico acoplamento elástico.`;
    } else if (cmjHeight >= reqHeightMin && cmjPowerRel >= reqRelPowerMin) {
      veredictoResumoCmj = `Belo perfil funcional de salto vertical para a categoria ${soccerCategory}. Os resultados de potência corporal e altura de elevação enquadram-se na média ideal estabelecida pela literatura para futebolistas competitivos.`;
    } else {
      veredictoResumoCmj = `Capacidade reativa muscular em fase de lapidação frente à normativa científica para a categoria ${soccerCategory}. Recomenda-se treinos para fortificar a taxa de produção de força rápida.`;
    }
  } else {
    if (cmjHeight >= 50 && cmjPowerRel >= 62) {
      veredictoResumoCmj = `Excelente dominância neuromuscular. Atleta de elite apresentando alto desenvolvimento de taxa de força relativa (RFD) e ótimo aproveitamento do ciclo alongamento-encurtamento.`;
    } else if (cmjHeight >= 40 || cmjPowerRel >= 50) {
      veredictoResumoCmj = `Belo perfil de transferência de força vertical. Ótima reatividade neuromuscular com boa coordenação intermuscular durante as fases de transição excêntrica-concêntrica.`;
    } else if (cmjHeight < 30) {
      veredictoResumoCmj = `Baixo desenvolvimento de força rápida. Necessita estruturar o treinamento focando em força máxima de base e pliometria inicial para ganho de rigidez muscular.`;
    }
  }

  // 2. EXPLICAÇÃO TÉCNICA (Treinador)
  const averageForceWkg = data.averageForce ? data.averageForce / cmjWeight : 0;
  
  let sCmjExcExc = "A aplicação de força concêntrica apresenta-se dentro da média fisiológica, sugerindo capacidade razoável de superação da inércia. Potencial de otimização na curva de força-tempo.";
  if (averageForceWkg > 25) {
    sCmjExcExc = "Expressiva capacidade de aplicação de força máxima relativa ao peso corporal. O impulso gerado (área sob a curva de força) reflete um sistema neuromuscular incrivelmente denso e responsivo, perfil de elite.";
  } else if (averageForceWkg > 0 && averageForceWkg < 15) {
    sCmjExcExc = "Déficit na magnitude de força aplicada. A insuficiência na produção de força média limita severamente o impulso total, resultando em menor velocidade de saída (take-off velocity). Recomenda-se bloco focado em hipertrofia miofibrilar e força máxima absoluta.";
  }

  let sCmjAproveitamentoElastico = "Aproveitamento do CEA (Ciclo Alongamento Encurtamento) intermediário. Necessita melhorar o acoplamento excêntrico-concêntrico para otimizar o reaproveitamento de energia elástica dos tecidos moles conjutivos.";
  if (cmjHeight >= 45) {
    sCmjAproveitamentoElastico = "Excelente rigidez elástica do complexo músculo-tendíneo (MTU). Potência elástica exemplar com mínimo vazamento de força na fase de transição (amortecimento/explosão).";
  }

  let sCmjFatoresNeuromusculares = "Acionamento de fibras tipo IIb (rápidas) adequado à categoria, porém com margem expressiva de evolução através do aumento do gradiente de força no primeiro terço de subida.";
  if (cmjPowerRel >= 58) {
    sCmjFatoresNeuromusculares = "Magnífico recrutamento de unidades motoras de alto limiar de excitação. Taxa de disparo e sincronização de fibras rápidas em nível de excelência profissional.";
  }

  // 3. TRADUÇÃO SIMPLES (Atleta)
  let sCmjAthleteTranslation = "Seu salto vertical é bom! Para pular ainda mais alto, vamos treinar para deixar sua subida mais rápida e explosiva, empurrando o chão com o máximo de força possível no menor tempo.";
  if (heightClass === "Elite") {
    sCmjAthleteTranslation = "Incrível! Você tem um salto digno de atleta olímpico! Sua explosão neuromuscular é espetacular. Continuaremos lapidando sua técnica para manter esse nível supremo.";
  } else if (heightClass === "Baixo") {
    sCmjAthleteTranslation = "Seu salto precisa de um foco especial. Vamos trabalhar exercícios para dar estabilidade às suas pernas e ensinar seus músculos a dispararem com velocidade máxima!";
  }

  // 4. EXPLICAÇÃO PARA PAIS
  let sCmjParentsExplanation = `O Countermovement Jump avalia a impulsão vertical e a saúde da potência das pernas. A marca do seu filho (${cmjHeight} cm) é totalmente segura e indica boa rigidez estrutural nas articulações, prevenindo cansaço mecânico.`;
  if (calculateAge(athlete.dob) < 18) {
    sCmjParentsExplanation = `Monitoramos a potência muscular do seu filho com foco total na segurança articular. O teste mostra que ele desenvolve uma boa impulsão (${cmjHeight} cm) de forma equilibrada, protegendo joelhos e tornozelos contra sobrecargas típicas do crescimento.`;
  }

  // Action Plan Items:
  let sCmjActionItems = [
    { title: "Pliometria Bilateral Intensiva", desc: "Saltos com transição rápida sobre barreiras de 30-40cm, focando no tempo mínimo de contato no solo para maximizar a stiffness." },
    { title: "Agachamento Dinâmico com Carga Mod.", desc: "Execução concêntrica o mais rápida possível (máxima intenção de velocidade) a 50-60% de 1RM para ganho de RFD." },
    { title: "Saltos Unilaterais (Drop Lands)", desc: "Trabalho de amortecimento controlado caindo de caixas de 30cm para fortificar a fase excêntrica de frenagem concêntrica." }
  ];

  if (cmjHeight < 30) {
    sCmjActionItems = [
      { title: "Fortalecimento de Base (Squats)", desc: "Consolidação de força máxima concêntrica de membros inferiores (3 séries de 6 reps a 80% 1RM)." },
      { title: "Pliometria Extensiva Leve", desc: "Saltinhos repetitivos no lugar (pular corda, saltar obstáculos pequenos) para adaptação elástica inicial sem impacto excessivo." },
      { title: "Treino de Tripla Extensão Básica", desc: "Saltos livres focando na extensão coordenada de tornozelos, joelhos e quadril." }
    ];
  } else if (cmjHeight >= 45) {
    sCmjActionItems = [
      { title: "Contrast Training Avançado", desc: "Alternar agachamento pesado (2 reps a 85% 1RM) com 3 saltos livres máximos para facilitação pós-ativação (PAP)." },
      { title: "Saltos Assistidos (Cords)", desc: "Saltos verticais com tração elástica de alívio para super-estimulação neuromuscular sob velocidade de take-off supra-máxima." },
      { title: "Reatividade Unilateral Avançada", desc: "Saltos pliométricos unilaterais horizontais alternados contínuos com foco em rigidez máxima de calcanhar." }
    ];
  }

  // Target Evolution Metas:
  const targetCmjHeight = cmjHeight + (cmjHeight < 30 ? 5 : cmjHeight < 45 ? 4 : 2);
  const targetCmjPower = Math.round(cmjPowerRel * 1.08);
  const targetTimeframeCmj = cmjHeight < 35 ? "4-6 semanas" : "6-8 semanas";

  const handleExportJpeg = async () => {
    if (!reportRef.current) return;
    const toastId = toast.loading("Otimizando layout para exportação...");
    try {
      const pages = reportRef.current.querySelectorAll(".report-page");
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const dataUrl = await toJpeg(page, {
          quality: 1.0,
          backgroundColor: "#FFFFFF",
          pixelRatio: 3,
        });
        const link = document.createElement("a");
        link.download = `relatorio-potencia-${athlete.name.toLowerCase().replace(/\s+/g, "-")}-pag-${i + 1}.jpg`;
        link.href = dataUrl;
        link.click();
        await new Promise((r) => setTimeout(r, 400));
      }
      toast.success("Arquivos gerados com sucesso!", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Falha ao gerar imagens.", { id: toastId });
    }
  };

  const handlePrint = () => {
    triggerPrint();
  };

  const evolutionData = [...history]
    .sort((a, b) => getSafeDateTime(a.date) - getSafeDateTime(b.date))
    .map((item) => ({
      date: formatDate(item.date),
      altura: item.height || 0,
      rsi: item.rsi || 0,
      potencia: item.power || 0,
      profundidade: item.depth || 0,
      tempoVoo: item.flightTime || 0,
      forcaMedia: item.averageForce || 0,
    }))
    .filter(item => item.altura > 0 || item.potencia > 0)
    .slice(-6);

  const StatCard = ({
    icon: Icon,
    label,
    value,
    unit,
    color,
    description,
    diff,
  }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full group hover:border-brand-primary/20 transition-all font-sans">
      <div className="flex items-center justify-between mb-3 font-sans">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${color} bg-opacity-10 shadow-sm`}>
            <Icon className={`w-3.5 h-3.5 ${color.replace("bg-", "text-")}`} />
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none font-bold">
            {label}
          </span>
        </div>
        {diff && (
          <div className={`flex items-center gap-0.5 text-[9px] font-black ${diff.color}`}>
            <span>{diff.icon}</span>
            <span>{diff.percent}%</span>
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1.5 mt-auto">
        <span className="text-xl font-black text-slate-950 italic tracking-tight">
          {value !== undefined && value !== null && !isNaN(Number(value)) ? value : 0}
        </span>
        <span className="text-[10px] font-black text-slate-400 uppercase italic">
          {unit}
        </span>
      </div>
      {description && (
        <p className="text-[8px] text-slate-500 mt-1 font-bold leading-tight uppercase italic opacity-85">
          {description}
        </p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-slate-900/95 backdrop-blur-xl overflow-y-auto p-0 md:p-4 no-scrollbar report-modal">
      <div className="max-w-5xl w-full mx-auto md:my-10 h-full md:h-auto font-sans">
        
        {/* Printable/exportable container */}
        <div ref={reportRef} className="print-container bg-slate-100/10 md:bg-transparent">
          
          {/* Page 1 */}
          <ReportPage pageNumber={1} totalPages={4}>
            <ReportHeader
              title="RELATÓRIO DE SALTO VERTICAL"
              subTitle="MENSURAÇÃO DE POTÊNCIA E ALTURA DO SALTO"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[
                { label: "TEMPO DE VOO", value: `${data.flightTime || 0} MS` },
                { label: "PÁGINA", value: "01 DE 04" }
              ]}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 mt-4 font-sans">
              {/* ALTURA DO SALTO */}
              <div className="bg-brand-primary p-8 rounded-[2.5rem] text-brand-dark shadow-xl relative overflow-hidden group flex flex-col justify-between">
                <div className="absolute -right-4 -top-4 opacity-[0.05] group-hover:scale-110 transition-transform text-brand-dark">
                  <TrendingUp className="w-32 h-32" />
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 italic font-bold">
                    ALTURA DO SALTO
                  </span>
                  {previousData && (
                    <div className="flex items-center gap-1 text-[10px] font-black text-brand-dark bg-black/10 px-2 py-0.5 rounded-full">
                      <span>{getDiff(data.height, previousData.height).icon}</span>
                      <span>{getDiff(data.height, previousData.height).percent}%</span>
                    </div>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-4 animate-fadeIn">
                  <h3 className="text-5xl font-black italic leading-none font-sans">
                    {data.height || 0}
                  </h3>
                  <span className="text-sm font-bold opacity-60 uppercase italic font-sans">
                    CM
                  </span>
                </div>
                <p className="text-[9px] mt-6 font-black uppercase italic leading-relaxed text-brand-dark/80 font-bold font-sans">
                  MENSURA O DESLOCAMENTO VERTICAL MÁXIMO DO CENTRO DE GRAVIDADE, REFLETINDO A CAPACIDADE DE IMPULSÃO EXTREMA DO ATLETA CONTRA A GRAVIDADE.
                </p>
              </div>

              {/* POTÊNCIA */}
              <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] relative overflow-hidden group flex flex-col justify-between">
                <div className="absolute -right-4 -top-4 text-orange-500 opacity-[0.03] group-hover:scale-110 transition-transform">
                  <Zap className="w-32 h-32" />
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic font-bold font-sans">
                    POTÊNCIA
                  </span>
                  {previousData && (
                    <div className="flex items-center gap-1 text-[10px] font-black text-orange-500 font-sans">
                      <span>{getDiff(data.power, previousData.power).icon}</span>
                      <span>{getDiff(data.power, previousData.power).percent}%</span>
                    </div>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-4">
                  <h3 className="text-5xl font-black text-slate-900 italic leading-none font-sans">
                    {data.power || 0}
                  </h3>
                  <span className="text-sm font-bold text-slate-400 uppercase italic font-sans">
                    W
                  </span>
                </div>
                <p className="text-[9px] mt-6 font-black text-slate-400 uppercase italic leading-relaxed font-bold font-sans">
                  REPRESENTA O TRABALHO MECÂNICO EXPLOSIVO INSTANTÂNEO (EM WATTS) DESENVOLVIDO PELOS MEMBROS INFERIORES DURANTE A TRIPLA EXTENSÃO DO SALTO.
                </p>
              </div>

              {/* TEMPO DE VOO */}
              <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] relative overflow-hidden group flex flex-col justify-between">
                <div className="absolute -right-4 -top-4 text-blue-500 opacity-[0.03] group-hover:scale-110 transition-transform">
                  <Clock className="w-32 h-32" />
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic font-bold font-sans">
                    TEMPO DE VOO
                  </span>
                  {previousData && (
                    <div className="flex items-center gap-1 text-[10px] font-black text-blue-500 font-sans">
                      <span>{getDiff(data.flightTime, previousData.flightTime).icon}</span>
                      <span>{getDiff(data.flightTime, previousData.flightTime).percent}%</span>
                    </div>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-4">
                  <h3 className="text-5xl font-black text-slate-900 italic leading-none font-sans">
                    {data.flightTime || 0}
                  </h3>
                  <span className="text-sm font-bold text-slate-400 uppercase italic font-sans">
                    MS
                  </span>
                </div>
                <p className="text-[9px] mt-6 font-black text-slate-400 uppercase italic leading-relaxed font-bold font-sans">
                  MENSURA A DURAÇÃO EXATA DA FASE AÉREA DO SALTO (EM MS), QUE É DIRETAMENTE PROPORCIONAL À ALTURA ATINGIDA E INDICA A EFICIÊNCIA BALÍSTICA GERAL.
                </p>
              </div>

              {/* POTÊNCIA/PESO */}
              <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] relative overflow-hidden group flex flex-col justify-between">
                <div className="absolute -right-4 -top-4 text-emerald-500 opacity-[0.03] group-hover:scale-110 transition-transform">
                  <Activity className="w-32 h-32" />
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic font-bold font-sans">
                    POTÊNCIA/PESO
                  </span>
                  {previousData && (
                    <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 font-sans">
                      <span>{getDiff(data.power / (data.weight || 1), previousData.power / (previousData.weight || 1)).icon}</span>
                      <span>{getDiff(data.power / (data.weight || 1), previousData.power / (previousData.weight || 1)).percent}%</span>
                    </div>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-4">
                  <h3 className="text-5xl font-black text-slate-900 italic leading-none font-sans">
                    {(data.power / (data.weight || 1)).toFixed(1)}
                  </h3>
                  <span className="text-sm font-bold text-slate-400 uppercase italic font-sans">
                    W/KG
                  </span>
                </div>
                <p className="text-[9px] mt-6 font-black text-slate-400 uppercase italic leading-relaxed font-bold font-sans">
                  INDICA A POTÊNCIA DISPONÍVEL POR CADA QUILO DO ATLETA. É A MÉTRICA MAIS CRÍTICA PARA ESPORTES DE ACELERAÇÃO E ARRANCADA DIRETA.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-4">
              <StatCard
                icon={TrendingUp}
                label="FORÇA MÉDIA APLICADA NO SOLO"
                value={data.averageForce}
                unit="N"
                color="bg-slate-700"
                diff={
                  previousData ? getDiff(data.averageForce, previousData.averageForce) : null
                }
              />
            </div>
          </ReportPage>

          {/* Page 2 */}
          <ReportPage pageNumber={2} totalPages={4}>
            <ReportHeader
              title="RELATÓRIO DE SALTO VERTICAL"
              subTitle="HISTÓRICO E COMPOSIÇÃO DE FORÇA EXPLOSIVA"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[{ label: "PÁGINA", value: "02 DE 04" }]}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="md:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-2 font-sans">
                    <TrendingUp className="w-4 h-4 text-brand-primary animate-pulse" />
                    <div>
                      <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] font-bold">
                        Evolução e Análise de Salto
                      </h4>
                      <p className="text-[8px] text-slate-400 font-extrabold uppercase mt-0.5 tracking-wider">
                        Padrão Elite de Avaliação de Força Explosiva
                      </p>
                    </div>
                  </div>
                  
                  {/* Elite Visualization Tabs */}
                </div>

                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={evolutionData}
                      margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorHeight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ea580c" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 8, fontWeight: 900 }}
                      />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 'auto']}
                        tick={{ fill: "#10b981", fontSize: 8, fontWeight: 900 }}
                        label={{ value: 'Altura (cm)', angle: -90, position: 'insideLeft', offset: 0, style: { fill: '#94a3b8', fontSize: 7, fontWeight: 900, textTransform: 'uppercase' } }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 'auto']}
                        tick={{ fill: "#ea580c", fontSize: 8, fontWeight: 900 }}
                        label={{ value: 'Potência (W)', angle: 90, position: 'insideRight', offset: 0, style: { fill: '#94a3b8', fontSize: 7, fontWeight: 900, textTransform: 'uppercase' } }}
                      />
                      <Tooltip
                        content={({ active, payload, label }: any) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-2xl text-[10px] font-sans text-white max-w-[200px]">
                                <p className="font-black text-slate-400 mb-2 border-b border-slate-800 pb-1 uppercase tracking-wider">{label}</p>
                                <div className="space-y-1.5">
                                  {payload.map((item: any, idx: number) => {
                                    let unit = item.dataKey === "altura" ? " cm" : " W";
                                    let name = item.dataKey === "altura" ? "Altura do Salto" : "Potência de Pico";
                                    const itemColor = item.color || item.fill || "#3b82f6";
                                    return (
                                      <div key={idx} className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-1.5">
                                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: itemColor }} />
                                          <span className="font-bold uppercase" style={{ color: itemColor }}>{name}</span>
                                        </div>
                                        <span className="font-extrabold italic" style={{ color: itemColor }}>
                                          {item.value?.toFixed(1)}
                                          {unit}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                      <ReferenceLine yAxisId="left" y={hEliteLimit} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1.5}>
                        <Label value={`ELITE (${hEliteLimit} cm)`} position="insideBottomLeft" fill="#10b981" style={{ fontSize: '7px', fontWeight: 900 }} />
                      </ReferenceLine>
                      <ReferenceLine yAxisId="left" y={hBomLimit} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1.5}>
                        <Label value={`MÉDIA/BOM (${hBomLimit} cm)`} position="insideBottomLeft" fill="#f59e0b" style={{ fontSize: '7px', fontWeight: 900 }} />
                      </ReferenceLine>
                      <Bar
                        yAxisId="left"
                        name="Altura do Salto"
                        dataKey="altura"
                        fill="url(#colorHeight)"
                        stroke="#10b981"
                        strokeWidth={1.5}
                        radius={[6, 6, 0, 0]}
                        barSize={24}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        name="Potência de Pico"
                        dataKey="potencia"
                        stroke="#ea580c"
                        strokeWidth={3.5}
                        dot={{ fill: "#ea580c", r: 5, strokeWidth: 1.5, stroke: "#fff" }}
                        activeDot={{ r: 7 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Historical Stats Footer - Elite Standard */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 bg-slate-50/50 p-4 rounded-2xl">
                  <div className="text-center">
                    <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">MÁXIMO HISTÓRICO</span>
                    <span className="text-sm font-black text-slate-800 italic">
                      {evolutionData.length > 0 ? Math.max(...evolutionData.map(d => d.altura || 0)).toFixed(1) : "0.0"} <span className="text-[8px] uppercase">cm</span>
                    </span>
                  </div>
                  <div className="text-center border-x border-slate-200">
                    <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">MÉDIA DE POTÊNCIA</span>
                    <span className="text-sm font-black text-slate-800 italic">
                      {evolutionData.length > 0 
                        ? (evolutionData.reduce((acc, d) => acc + (d.potencia || 0), 0) / evolutionData.length).toFixed(0)
                        : 0} <span className="text-[8px] uppercase">W</span>
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">MÉDIA DE FORÇA</span>
                    <span className="text-sm font-black text-blue-600 italic">
                      {evolutionData.length > 0 
                        ? (evolutionData.reduce((acc, d) => acc + (d.forcaMedia || 0), 0) / evolutionData.length).toFixed(0)
                        : "0"} <span className="text-[8px] uppercase">N</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-[2rem] text-white flex flex-col justify-between font-sans">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-orange-500 font-bold">
                      PERFIL DE POTÊNCIA (W/KG)
                    </span>
                  </div>
                  
                  {(() => {
                    const powerWkg = data.power / (data.weight || 1);
                    let rating = "Baixo";
                    let color = "text-red-400 border-red-500/30 bg-red-500/10";
                    let tip = "Foco em treinos de força explosiva de base e transferência dinâmica.";
                    let progressPct = Math.min((powerWkg / 70) * 100, 100);
                    
                    if (powerWkg >= 55) {
                      rating = "Elite";
                      color = "text-brand-primary border-brand-primary/30 bg-brand-primary/10";
                      tip = "Performance altamente explosiva e excelente elasticidade neuromuscular.";
                    } else if (powerWkg >= 45) {
                      rating = "Ótimo";
                      color = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
                      tip = "Excelente relação peso-potência e boa eficiência contrátil de fibras tipo II.";
                    } else if (powerWkg >= 35) {
                      rating = "Moderado";
                      color = "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
                      tip = "Trabalho de força rápida de base e pliometria de baixa intensidade.";
                    }
                    
                    return (
                      <div className="space-y-4">
                        <div className={`p-4 rounded-2xl border ${color}`}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase">CLASSIFICAÇÃO DE POTÊNCIA</span>
                            <span className="text-xs font-black uppercase italic">{rating}</span>
                          </div>
                          <span className="text-xl font-black italic block mb-2 text-white">{powerWkg.toFixed(1)} <span className="text-xs uppercase">W/KG</span></span>
                          <p className="text-[9px] font-medium leading-relaxed uppercase text-slate-300">{tip}</p>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-[7px] text-slate-500 font-black uppercase tracking-widest mb-1.5">
                            <span>MODERADO (35)</span>
                            <span>ÓTIMO (45)</span>
                            <span>ELITE (55)</span>
                          </div>
                          <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                            <div 
                              className="h-full bg-orange-500 transition-all duration-1000"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2 mt-4 pt-4 border-t border-slate-800">
                          <p className="text-[10px] text-slate-400 font-medium leading-relaxed uppercase">
                            Aprimore a força excêntrica se o gradiente de desenvolvimento de força dinâmica relativa estiver abaixo de <span className="text-white font-extrabold">45 W/kg</span>.
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-800 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-[8px] text-slate-500 font-black leading-snug italic uppercase tracking-wider">
                    "A potência relativa define a aceleração e explosão atlética pioneira."
                  </p>
                </div>
              </div>
            </div>
          </ReportPage>

          {/* Page 3: Diagnóstico de Elite & Prescrição */}
          <ReportPage pageNumber={3} totalPages={4}>
            <ReportHeader
              title="RELATÓRIO DE SALTO VERTICAL"
              subTitle="DIAGNÓSTICO NEUROMUSCULAR & ANÁLISE"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[{ label: "PERFIL", value: heightClass.toUpperCase() }, { label: "PÁGINA", value: "03 DE 04" }]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 font-sans">
              
              {/* Column 1: Executive Summary & Performance Indexes */}
              <div className="space-y-6 overflow-hidden">
                
                {/* 1. STATUS GERAL */}
                <div className="bg-slate-900 text-white p-5 rounded-[2rem] border border-slate-850 shadow-xl relative overflow-hidden h-fit">
                  <div className="absolute right-3 bottom-3 opacity-5">
                    <Sparkles className="w-16 h-16 text-indigo-400" />
                  </div>
                  <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest block mb-2 font-mono pb-1 border-b border-indigo-450/20">
                    🔥 RESUMO EXECUTIVO
                  </span>
                  <h4 className="text-sm font-black uppercase italic tracking-wider mb-3 leading-tight text-white">
                    Veredito do Cientista
                  </h4>
                  <p className="text-[10px] text-slate-200 leading-relaxed font-bold uppercase font-sans">
                    {veredictoResumoCmj}
                  </p>
                </div>

                {/* 2. SCORE CARDIOVASCULAR/EXP */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-1 font-mono font-bold font-sans">
                    🎯 SCORE DE EXPLOSIVIDADE
                  </span>
                  <div className="flex justify-between items-baseline mb-3 font-sans">
                    <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-900">
                      Pontuação de Salto CMJ
                    </h4>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${cmjScoreColor}`}>
                      {cmjScoreClass}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 py-2 font-sans">
                    <div className="relative flex items-center justify-center font-sans">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                        <circle cx="32" cy="32" r="28" stroke="#f97316" strokeWidth="6" fill="transparent"
                          strokeDasharray={175.9}
                          strokeDashoffset={175.9 - (175.9 * cmjScore) / 100}
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <span className="absolute text-lg font-black text-slate-900 italic font-sans">
                        {cmjScore}
                      </span>
                    </div>
                    <div className="flex-grow space-y-1">
                      <span className="text-[7px] text-slate-500 font-bold uppercase leading-none block">
                        Composição do score:
                      </span>
                      <p className="text-[8px] text-slate-450 font-black leading-relaxed uppercase">
                        Razão direta entre deslocamento de centro de gravidade (cm) e produção de wattagem relativa (W/kg).
                      </p>
                    </div>
                  </div>
                </div>

                {/* 🧬 ÍNDICE DE EFICIÊNCIA DE POTÊNCIA (IEP) */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-2 font-mono">
                    🧬 ÍNDICE DE EFICIÊNCIA DE POTÊNCIA (IEP)
                  </span>
                  <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-900 mb-3 border-b pb-2">
                    Aproveitamento Dinâmico
                  </h4>
                  <div className={`p-3 rounded-2xl border ${efficiencyColorCmj} flex items-center justify-between mb-4 transition-all duration-300 font-sans`}>
                    <span className="text-[9px] font-black uppercase tracking-wider">
                      STATUS DE EFICIÊNCIA:
                    </span>
                    <span className="text-xs font-black uppercase italic tracking-widest">
                      {totalEfficiencyCmj}% ({efficiencyLevelCmj.toUpperCase()})
                    </span>
                  </div>
                  <div className="space-y-3 font-sans">
                    <div className="flex justify-between items-center text-[9px] border-b pb-1.5 border-slate-50 font-sans">
                      <span className="text-slate-400 uppercase font-black text-[8px]">Fase aérea (Aceleração)</span>
                      <span className="text-slate-900 italic font-black">{fTimeEff}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] border-b pb-1.5 border-slate-50 font-sans">
                      <span className="text-slate-400 uppercase font-black text-[8px]">Potência Relativa exc/con</span>
                      <span className="text-slate-900 italic font-black">{pRelEff}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-sans">
                      <span className="text-slate-400 uppercase font-black text-[8px]">Propulsão Mecânica</span>
                      <span className="text-slate-900 italic font-black">{cmjStiffnessEff}%</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Column 2: Technical Interpretation (Coach focus) */}
              <div className="space-y-6">
                
                {/* 3. INTERPRETAÇÃO TÉCNICA */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200/90 shadow-sm font-sans">
                  <span className="text-[7px] font-black text-orange-600 uppercase tracking-widest block mb-1 font-mono font-bold">
                    📊 INTERPRETAÇÃO TÉCNICA (TREINADOR)
                  </span>
                  <div className="flex justify-between items-baseline mb-3">
                    <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-900 font-bold">
                      Fase Excêntrica & Acionamento
                    </h4>
                  </div>
                  
                  <div className="space-y-4 text-[9.5px] leading-relaxed text-slate-700">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="font-extrabold text-slate-500 uppercase block mb-1 text-[7.5px]">Produção de Força (Average Force):</span>
                      <p className="text-slate-700 font-black uppercase text-xs leading-relaxed">{sCmjExcExc}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="font-extrabold text-slate-500 uppercase block mb-1 text-[7.5px]">Ciclo Alongamento Encurtamento (CEA):</span>
                      <p className="text-slate-700 font-black uppercase text-xs leading-relaxed">{sCmjAproveitamentoElastico}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="font-extrabold text-slate-500 uppercase block mb-1 text-[7.5px]">Fatores Neuromusculares (Fibras II):</span>
                      <p className="text-slate-700 font-black uppercase text-xs leading-relaxed">{sCmjFatoresNeuromusculares}</p>
                    </div>
                  </div>
                </div>

                {/* 6. IMPACTO NA PERFORMANCE */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                  <span className="text-[7.5px] font-black text-rose-500 uppercase tracking-widest block mb-1 font-mono select-none">
                    ⚡ ACELERAÇÃO & SALTO
                  </span>
                  <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-900 mb-3 border-b pb-2 font-bold">
                    Eficiência Dinâmica Relativa
                  </h4>
                  <div className="flex gap-3 items-start bg-rose-50/20 p-3 rounded-2xl border border-rose-100/30">
                    <Zap className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Diferencial Explosivo:</span>
                      <p className="text-[9px] text-slate-800 font-extrabold uppercase leading-relaxed font-sans">
                        O atleta desenvolve um perfil cinético que o permite atingir uma potência de <span className="text-orange-600 font-extrabold">{cmjPowerRel.toFixed(1)} W/kg</span>. Isso otimiza desacelerações rápidas seguidas de acelerações verticais instantâneas em quadra ou campo.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </ReportPage>

          {/* Page 4: Prescrição & Metas */}
          <ReportPage pageNumber={4} totalPages={4}>
            <ReportHeader
              title="RELATÓRIO DE SALTO VERTICAL"
              subTitle="PRESCRIÇÃO & METAS DE DESENVOLVIMENTO"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[{ label: "PRAZO", value: targetTimeframeCmj.toUpperCase() }, { label: "PÁGINA", value: "04 DE 04" }]}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 font-sans">
              
              {/* Column 1 & 2 (Span 2): Actions & Technical Prescriptions */}
              <div className="md:col-span-2 space-y-6">

                {/* 8. PLANO DE AÇÃO DE CORDA/IMPULSO */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200/85 shadow-sm font-sans">
                  <span className="text-[7px] font-black text-indigo-600 uppercase tracking-widest block mb-1 font-mono font-semibold">
                    🚀 PRESCRIÇÃO E TREINO
                  </span>
                  <div className="flex justify-between items-baseline border-b pb-2 mb-3">
                    <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-900 font-bold">
                      Plano de Ação Imediato
                    </h4>
                  </div>
                  
                  <div className="space-y-3 font-sans">
                    {sCmjActionItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-start text-[9px] border-b border-slate-5 pb-2 last:border-0 last:pb-0 font-sans font-bold">
                        <span className="w-4 h-4 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[8px] font-black text-slate-600 shrink-0 mt-0.5 font-mono font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-800 uppercase block leading-tight">{item.title}</span>
                          <span className="text-slate-450 font-bold text-[8px] leading-tight block mt-0.5 uppercase">{item.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Column 3: Metas de Evolução Sidebar */}
              <div className="space-y-6">

                {/* 9. METAS DE EVOLUÇÃO NEUROMUSCULAR */}
                <div className="bg-slate-950 text-white p-5 rounded-[2rem] border border-slate-850 shadow-xl relative overflow-hidden font-sans">
                  <div className="absolute right-3 top-3 opacity-5">
                    <Target className="w-16 h-16 text-emerald-400" />
                  </div>
                  <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest block mb-2 font-mono font-bold">
                    🎯 METAS DE EVOLUÇÃO
                  </span>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3 font-sans">
                    <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-center">
                      <span className="text-[7px] font-black text-slate-400 uppercase block mb-1 font-mono font-bold">MÁX. ALTURA</span>
                      <span className="text-base font-black text-brand-primary italic font-sans">{targetCmjHeight} CM</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-center">
                      <span className="text-[7px] font-black text-slate-400 uppercase block mb-1 font-mono font-bold font-semibold">POTÊNCIA REL.</span>
                      <span className="text-base font-black text-emerald-400 italic font-sans">{targetCmjPower} W/KG</span>
                    </div>
                  </div>
                  <div className="text-center bg-slate-900 p-2 text-[8px] font-black uppercase tracking-widest text-slate-400 font-sans">
                    Prazo esperado: <span className="text-white font-bold">{targetTimeframeCmj}</span>
                  </div>
                </div>

              </div>

            </div>
          </ReportPage>

        </div>

        {/* Buttons Row (Controls) */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 no-print pb-20 px-4 md:px-0 font-sans">
          <button
            onClick={handleExportJpeg}
            className="flex-grow flex items-center justify-center gap-2 bg-brand-primary text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-brand-primary/25 hover:bg-brand-dark transition-all active:scale-95 cursor-pointer font-sans"
          >
            <Download size={20} /> Baixar Páginas (JPEG)
          </button>
          <button
            onClick={handlePrint}
            className="flex-grow flex items-center justify-center gap-2 bg-slate-800 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 cursor-pointer font-sans"
          >
            <Printer size={20} /> Imprimir / PDF
          </button>
          <button
            onClick={onClose}
            className="flex-grow flex items-center justify-center gap-2 bg-slate-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-600 transition-all active:scale-95 cursor-pointer font-sans"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const DropJumpReport: FC<{
  athlete: Athlete;
  data: DropJump;
  onClose: () => void;
  history: DropJump[];
}> = ({ athlete, data, onClose, history }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const previousData = getPreviousAssessment(data, history);

  // Sports Scientist Metrics Analysis & Classifications
  const sRsiVal = data.rsi || 0;
  const sTcVal = data.contactTime || 0;
  const sJhVal = data.jumpHeight || 0;
  const getNormalizedStiffness = (stiffness: number | undefined) => {
    if (!stiffness) return 0;
    if (stiffness < 100) {
      return Math.round(stiffness * 1000);
    }
    return Math.round(stiffness);
  };
  const sStiffVal = getNormalizedStiffness(data.stiffness);

  // classifications:
  // RSI
  let sRsiClass = "Baixo";
  let sRsiClassColor = "bg-red-100 text-red-700";
  if (sRsiVal >= 2.0) { sRsiClass = "Elite"; sRsiClassColor = "bg-indigo-100 text-indigo-700"; }
  else if (sRsiVal >= 1.5) { sRsiClass = "Bom"; sRsiClassColor = "bg-emerald-100 text-emerald-700"; }
  else if (sRsiVal >= 1.0) { sRsiClass = "Moderado"; sRsiClassColor = "bg-amber-100 text-amber-700"; }

  // TC
  let sTcClass = "Lento";
  let sTcClassColor = "bg-red-100 text-red-700";
  if (sTcVal < 200) { sTcClass = "Rápido"; sTcClassColor = "bg-emerald-100 text-emerald-700"; }
  else if (sTcVal <= 250) { sTcClass = "Moderado"; sTcClassColor = "bg-amber-100 text-amber-700"; }

  // Altura do salto
  let sJhClass = "Baixo";
  let sJhClassColor = "bg-red-100 text-red-700";
  if (sJhVal > 35) { sJhClass = "Alto"; sJhClassColor = "bg-emerald-100 text-emerald-700"; }
  else if (sJhVal >= 25) { sJhClass = "Médio"; sJhClassColor = "bg-amber-100 text-amber-700"; }

  // STATUS GERAL (RESUMO EXECUTIVO)
  let sRsiLevel = "baixo";
  if (sRsiVal >= 2.0) sRsiLevel = "nível de elite em";
  else if (sRsiVal >= 1.5) sRsiLevel = "bom nível de";
  else if (sRsiVal >= 1.0) sRsiLevel = "moderado nível de";

  let sQuality = "ótima impulsão geral";
  let sProblem = "absorção lenta do solo";

  if (sTcVal < 200) {
    sQuality = "excelente rapidez de resposta no solo (tempo de contato curto)";
    if (sJhVal < 25) {
      sProblem = "baixa capacidade de impulsão vertical (altura de voo reduzida)";
    } else {
      sProblem = "pequena perda de energia em saltos consecutivos";
      sQuality = "excelente combinação de transição rápida no solo com impulsão vertical";
    }
  } else {
    if (sJhVal >= 35) {
      sQuality = "alta capacidade de força explosiva concêntrica (grande impulsão)";
      sProblem = "absorção lenta de impacto que dissipa a energia reativa e prolonga o contato com o solo";
    } else {
      sQuality = "razoável amortecimento de queda";
      sProblem = "velocidade de transição lenta entre as fases excêntrica e concêntrica (insuficiência de rigidez do tornozelo)";
    }
  }

  const statusExecutivo = `Atleta apresenta ${sRsiLevel} reatividade. Demonstra ${sQuality}, porém apresenta limitação em ${sProblem}.`;

  // SCORE DE PERFORMANCE (0 a 100)
  // RSI Score (out of 100)
  let sRsiScore = 0;
  if (sRsiVal < 1.0) {
    sRsiScore = sRsiVal * 50; 
  } else if (sRsiVal < 1.5) {
    sRsiScore = 50 + (sRsiVal - 1.0) * 40; // 50 to 70
  } else if (sRsiVal < 2.0) {
    sRsiScore = 70 + (sRsiVal - 1.5) * 40; // 70 to 90
  } else {
    sRsiScore = Math.min(100, 90 + (sRsiVal - 2.0) * 10); // 90 to 100
  }

  // TC Score (out of 100)
  let sTcScore = 0;
  if (sTcVal > 250) {
    sTcScore = Math.max(10, 40 - (sTcVal - 250) / 2); // > 250 slow
  } else if (sTcVal >= 200) {
    sTcScore = 40 + ((250 - sTcVal) / 50) * 30; // 40 to 70
  } else if (sTcVal >= 170) {
    sTcScore = 70 + ((200 - sTcVal) / 30) * 20; // 70 to 90
  } else {
    sTcScore = Math.min(100, 90 + (170 - sTcVal) / 3); // 90 to 100
  }

  // Stiffness Score (out of 100)
  let sStiffScore = 0;
  if (sStiffVal < 10000) {
    sStiffScore = 40 + (sStiffVal / 10000) * 10;
  } else if (sStiffVal < 15000) {
    sStiffScore = 50 + ((sStiffVal - 10000) / 5000) * 25; 
  } else if (sStiffVal < 25000) {
    sStiffScore = 75 + ((sStiffVal - 15000) / 10000) * 15; 
  } else {
    sStiffScore = Math.min(100, 90 + (sStiffVal - 25000) / 5000);
  }

  const perfScore = Math.round((sRsiScore * 0.5) + (sTcScore * 0.3) + (sStiffScore * 0.2));

  let perfScoreClass = "Baixo";
  let perfScoreColor = "text-rose-600 border-rose-200 bg-rose-50";
  if (perfScore >= 85) { perfScoreClass = "Elite"; perfScoreColor = "text-indigo-600 border-indigo-200 bg-indigo-50"; }
  else if (perfScore >= 70) { perfScoreClass = "Bom"; perfScoreColor = "text-emerald-600 border-emerald-200 bg-emerald-50"; }
  else if (perfScore >= 50) { perfScoreClass = "Regular"; perfScoreColor = "text-amber-600 border-amber-200 bg-amber-50"; }

  // INTERPRETAÇÃO TÉCNICA (TREINADOR)
  let sNeuromuscularProfile = "";
  let sSscEfficiency = "";
  let sForceVelRelation = "";

  if (sRsiVal >= 2.0 && sTcVal < 200) {
    sNeuromuscularProfile = "Perfil Neuromuscular Altamente Reativo. O atleta possui uma reatividade elástica excepcional, agindo como uma mola de alta rigidez no decolagem dinâmica.";
    sSscEfficiency = "O Ciclo Alongamento-Encurtamento (CAE) funciona com extrema eficiência rápida. O acúmulo de energia elástica no tendão de Aquiles e sua imediata restituição concêntrica ocorrem em tempo ideal, aproveitando o reflexo miotático de estiramento perfeitamente.";
    sForceVelRelation = "Relação Força-Velocidade idealizada para potência de elite. O atleta não necessita afundar o centro de gravidade para produzir força explosiva; a rigidez de tornozelo permite transferência de forças em altíssima velocidade.";
  } else if (sTcVal >= 200) {
    sNeuromuscularProfile = "Perfil de Força Lenta / Amortecedor. O atleta apresenta excelente capacidade de força concêntrica, mas o tempo de contato prolongado indica que a força depende mais da contração muscular voluntária ativa do que do decolagem elástico reflexo rápido.";
    sSscEfficiency = "O Ciclo Alongamento-Encurtamento (CAE) opera predominantemente na via lenta (amortecido). O excesso de flexão nos joelhos/quadril dissipa parte relevante da energia mecânica acumulada na fase excêntrica em forma de calor, reduzindo o efeito mola e a rigidez pliométrica.";
    sForceVelRelation = "Predomínio de Força Absoluta sobre a Velocidade de Transição. O atleta decola bem alto, mas necessita de muito tempo no contato com o solo para recrutar suas unidades motoras dinâmicas, o que pode influenciar negativamente tarefas que exigem agilidade e acelerações puras.";
  } else {
    sNeuromuscularProfile = "Perfil Neuromuscular Moderadamente Reativo. O atleta está no limiar de transição ideal entre reatividade pura muscular e controle elástico articular.";
    sSscEfficiency = "O Ciclo Alongamento-Encurtamento (CAE) opera de maneira regular. Há um bom pré-ativamento muscular, mas oscilações sutis na estabilização do tornozelo ainda consomem milissegundos valiosos que limitam o potencial completo do reflexo elástico.";
    sForceVelRelation = "Relação Força-Velocidade equilibrada, porém com ampla margem de otimização da velocidade de contração plantar. A transição excêntrica-concêntrica pode ganhar aceleração com foco em pliometria de alta velocidade.";
  }

  // TRADUÇÃO SIMPLES (ATLETA)
  let sAthleteTranslation = "";
  if (sTcVal >= 200) {
    sAthleteTranslation = "Você perde performance no tempo de reação ao solo. Sua força existe, mas não está sendo usada com velocidade. Resultado: menor explosão e eficiência esportiva em campo. Ao cair no chão, você 'amortece' o impacto dobrando demais os joelhos antes de saltar. Para ficar mais veloz e ágil em campo/quadra, faremos treinos para deixar seus tornozelos e panturrilhas firmes e fortes para empurrar o chão instantaneamente — como se o solo estivesse pegando fogo!";
  } else if (sRsiVal >= 1.5) {
    sAthleteTranslation = "Você já consegue agir de forma memorável como uma mola de alta velocidade! Seu pé bate e sai do solo de forma acelerada, aproveitando a força elástica natural e gratuita dos seus tendões. O foco agora é melhorar ainda mais a força de impulsão para decolar ainda mais alto mantendo essa resposta ultrarrápida de solo.";
  } else {
    sAthleteTranslation = "Seu corpo está no caminho certo para se tornar uma excelente mola elástica reativa. Atualmente, você reage bem na batida com o solo, mas há uma perda de energia mecânica pela descida sutil do calcanhar ao tocar o chão. Nosso foco será endurecer os calcanhares antes de encostar, ativando as subidas instantâneas.";
  }

  // EXPLICAÇÃO PARA PAIS
  let sParentsExplanation = "";
  if (calculateAge(athlete.dob) < 18) {
    sParentsExplanation = "O teste de Drop Jump serve para monitorar se o desenvolvimento neuromuscular e motor do atleta está ocorrendo com total proteção de suas articulações. Ajustar a rigidez (stiffness) do tornozelo protege os joelhos e calcanhares contra sobrecargas e trancos repentinos, garantindo um crescimento saudável, seguro e livre de dores de crescimento, além de treinar um corpo super resistente contra torções e lesões esportivas comuns.";
  } else {
    sParentsExplanation = "Este mapeamento de força reativa é fundamental para garantir a integridade articular em movimentos esportivos de alta energia. Ao otimizar o tempo de contato e a rigidez do tendão, minimizamos a sobrecarga de absorção de impacto que vai diretamente para as articulações dos joelhos e quadril, maximizando a longevidade física e prevenindo tendinopatias e estresses ligamentares.";
  }

  // IMPACTO NO ESPORTE
  let sSportsImpact = "";
  if (sTcVal >= 200) {
    sSportsImpact = "No ambiente competitivo real (sprints curtos, fintas e reações rápidas de movimentação), o tempo de contato prolongado com o solo funciona de forma equivalente a um leve freio de arrasto mecânico. Ao corrigir essa transição lenta, o atleta irá obter ganhos incríveis em seu primeiro passo de corrida (arranque explosivo), agilidade para fintas dinâmicas de desvio e controle balístico de impulsão.";
  } else {
    sSportsImpact = "A exemplar reatividade elástica do atleta se traduz diretamente em picos de aceleração de elite e mudanças de direção ágeis e extremamente dinâmicas em competições reais. O atleta consome menos energia física interna para acelerar, mantendo sua potência máxima de sprint por muito mais tempo graças ao eficiente aproveitamento elástico.";
  }

  // PLANO DE AÇÃO (4 SEMANAS)
  let sTrainFocus = "";
  let sExercisesList: { name: string; sets: string; focus: string }[] = [];
  if (sTcVal >= 200) {
    sTrainFocus = "Redução do Tempo de Contato, Ativação do Reflexo de Mola e Enrijecimento de Tornozelo";
    sExercisesList = [
      { name: "Drop Jump da Caixa de 20 cm", sets: "3 séries x 5 repetições", focus: "Foco em reatividade máxima: tocar o solo e decolar instantaneamente. Evitar flexionar joelhos" },
      { name: "Ankle Pogo Jumps (Saltos de Tornozelo)", sets: "3 séries x 10 repetições", focus: "Joelhos estáticos, focar na flexão plantar ultra-rápida do tornozelo sem contato do calcanhar" },
      { name: "Saltos Rápidos em Corda", sets: "2 séries x 30 segundos contínuos", focus: "Manter frequência cíclica e estabilidade vertical rígida sem rebotes intermediários" },
      { name: "Isometria de Tornozelo / Sóleo sob carga", sets: "3 séries x 20 segundos sustentados", focus: "Enrijecimento tensional e estrutural do tendão de Aquiles para suportar cargas de impacto" }
    ];
  } else if (sRsiVal < 2.0) {
    sTrainFocus = "Otimização de Transição Excêntrica-Concêntrica, Ampliação de Força Reativa e Propriocepção";
    sExercisesList = [
      { name: "Drop Jump da Caixa de 30 cm", sets: "3-4 séries x 5 repetições de qualidade", focus: "Manter excelente retenção do impacto e buscar a maior altura aérea possível" },
      { name: "Single Leg Pogo Jumps (Pogo Jump Unilateral)", sets: "3 séries x 10 repetições por lado", focus: "Estabilizar a cadeia cinética lateral do tornozelo, promovendo simetria de mola" },
      { name: "Hurdle Jumps Reativos (Saltos em barreiras baixas)", sets: "3 séries x 6 barreiras", focus: "Transições consecutivas de solo batendo e disparando sem rebote" },
      { name: "Isometria Unilateral de Calcanhar Elevado", sets: "3 séries x 25 segundos sustentados", focus: "Aprimoramento da estabilidade e rigidez tensional do tríceps sural" }
    ];
  } else {
    sTrainFocus = "Sustentabilidade de Elite, Potência Sob Carga e Pliometria Multidirecional Avançada";
    sExercisesList = [
      { name: "Depth Jump de 40-50cm com Foco de Impulsão Vertical Máxima", sets: "4 séries x 4 repetições de qualidade", focus: "Desenvolver a capacidade elástica em alturas maiores de estímulo gravitacional" },
      { name: "Weighted Pogo Jumps (Saltos de tornozelo portando cargas leves de 3-5kg)", sets: "3 séries x 15 contatos precisos", focus: "Recrutar potência elástica sob condições de compressão adicional acelerada" },
      { name: "Broad Jumps Reativos consecutivos (Saltos pliométricos horizontais)", sets: "3 séries x 5 saltos explosivos", focus: "Integrar reatividade rápida ao vetor horizontal, essencial para corridas e sprints" },
      { name: "Transition Sprints (Salto reativo inicial seguido de aceleração de 15m)", sets: "4 séries de máxima intensidade", focus: "Converter a energia pliométrica armazenada em potência dinâmica linear" }
    ];
  }

  // METAS DE EVOLUÇÃO
  let sTargetRsiVal = 0;
  let sTargetTcVal = 0;
  if (sRsiVal < 1.0) {
    sTargetRsiVal = 1.30;
    sTargetTcVal = Math.max(190, sTcVal - 40);
  } else if (sRsiVal < 1.5) {
    sTargetRsiVal = 1.75;
    sTargetTcVal = Math.max(180, sTcVal - 30);
  } else if (sRsiVal < 2.0) {
    sTargetRsiVal = 2.20;
    sTargetTcVal = Math.max(170, sTcVal - 20);
  } else {
    sTargetRsiVal = parseFloat((sRsiVal * 1.10).toFixed(2));
    sTargetTcVal = Math.max(150, sTcVal - 10);
  }

  // Dynamic Verdict for Headline
  let headlineStatus = "";
  let headlineClass = "";
  let headlineBullets: string[] = [];
  let headlinePriority = "";

  if (sRsiVal >= 2.0) {
    headlineStatus = "ELITE: EXCELENTE REATIVIDADE ELÁSTICA E STIFFNESS";
    headlineClass = "bg-indigo-950/90 text-indigo-100 border-indigo-800";
    headlineBullets = [
      "🟢 Reatividade e reflexo elástico em nível de elite mundial.",
      "🟢 Excelente rigidez de tornozelo (stiffness) permitindo transferência instantânea de força.",
      "🟢 Aproveitamento ideal do Ciclo Alongamento-Encurtamento (CAE)."
    ];
    headlinePriority = "Manter potência pliométrica terminal e focar em pliometria avançada de elite.";
  } else if (sRsiVal >= 1.5) {
    headlineStatus = "BOM: BOA BASE DE FORÇA E REATIVIDADE MODERADA";
    headlineClass = "bg-emerald-950/90 text-emerald-100 border-emerald-800";
    headlineBullets = [
      "🟡 Boa base de força concêntrica demonstrada no salto.",
      "🟢 Tempo de contato controlado e funcional com o solo.",
      "🎯 Margem de ganho na transição elástica pura dos tornozelos."
    ];
    headlinePriority = "Otimizar a transição excêntrica-concêntrica para reduzir ainda mais o tempo de contato.";
  } else {
    headlineStatus = "ATENÇÃO: REATIVIDADE ABAIXO DO IDEAL PARA PERFORMANCE EXPLOSIVA";
    headlineClass = "bg-rose-950/90 text-rose-100 border-rose-900";
    headlineBullets = [
      "🔴 Baixo aproveitamento do Ciclo Alongamento-Encurtamento (CAE) rápido.",
      "🟡 Boa base de força concêntrica pura, mas transição lenta de solo.",
      "🔴 Tempo de contato excessivamente longo no solo (amortecimento acentuado)."
    ];
    headlinePriority = "Redução imediata do tempo de contato com foco em stiffness de tornozelo.";
  }

  const handleExportJpeg = async () => {
    if (!reportRef.current) return;
    const toastId = toast.loading("Otimizando layout para exportação...");
    try {
      const pages = reportRef.current.querySelectorAll(".report-page");
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const dataUrl = await toJpeg(page, {
          quality: 1.0,
          backgroundColor: "#FFFFFF",
          pixelRatio: 3,
        });
        const link = document.createElement("a");
        link.download = `relatorio-dropjump-${athlete.name.toLowerCase().replace(/\s+/g, "-")}-pag-${i + 1}.jpg`;
        link.href = dataUrl;
        link.click();
        await new Promise((r) => setTimeout(r, 400));
      }
      toast.success("Arquivos gerados com sucesso!", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Falha ao gerar imagens.", { id: toastId });
    }
  };

  const handlePrint = () => {
    triggerPrint();
  };

  const evolutionData = [...history]
    .sort((a, b) => getSafeDateTime(a.date) - getSafeDateTime(b.date))
    .map((item) => ({
      date: formatDate(item.date),
      rsi: item.rsi || 0,
      stiffness: getNormalizedStiffness(item.stiffness || 0),
      jumpHeight: item.jumpHeight || 0,
    }))
    .filter(item => item.rsi > 0 || item.stiffness > 0)
    .slice(-6);

  const StatCard = ({
    icon: Icon,
    label,
    value,
    unit,
    color,
    description,
    diff,
  }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full group hover:border-brand-primary/20 transition-all font-sans">
      <div className="flex items-center justify-between mb-3 font-sans">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${color} bg-opacity-10 shadow-sm`}>
            <Icon className={`w-3.5 h-3.5 ${color.replace("bg-", "text-")}`} />
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none font-bold">
            {label}
          </span>
        </div>
        {diff && (
          <div className={`flex items-center gap-0.5 text-[9px] font-black ${diff.color}`}>
            <span>{diff.icon}</span>
            <span>{diff.percent}%</span>
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1 mt-auto">
        <span className="text-xl font-black text-slate-950 italic tracking-tight">
          {value || 0}
        </span>
        <span className="text-[10px] font-black text-slate-400 uppercase italic">
          {unit}
        </span>
      </div>
      {description && (
        <p className="text-[8px] text-slate-500 mt-1 font-bold leading-tight uppercase italic opacity-85">
          {description}
        </p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-slate-900/95 backdrop-blur-xl overflow-y-auto p-0 md:p-4 no-scrollbar report-modal">
      <div className="max-w-5xl w-full mx-auto md:my-10 h-full md:h-auto font-sans">
        
        {/* Printable/exportable container */}
        <div ref={reportRef} className="print-container bg-slate-100/10 md:bg-transparent">
          
          {/* Page 1 */}
          <ReportPage pageNumber={1} totalPages={3}>
            <ReportHeader
              title="RELATÓRIO DE DROP JUMP"
              subTitle="FORÇA REATIVA E RIGIDÉZ NEUROMUSCULAR DINÂMICA"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[
                { label: "QUEDA (DROP)", value: `${data.dropHeight || 30} CM` },
                { label: "PÁGINA", value: "01 DE 03" }
              ]}
            />

            {/* 🚨 VEREDITO PRINCIPAL DE ELITE (HEADLINE) */}
            <div className={`mt-4 p-4 rounded-2xl border ${headlineClass} font-sans shadow-sm`}>
              <div className="flex items-center gap-2 mb-2 font-sans">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] font-bold text-orange-400">
                  STATUS NEUROMUSCULAR ATUAL (VEREDITO ELITE)
                </span>
              </div>
              <h3 className="text-sm font-black italic tracking-tight uppercase text-white">
                {headlineStatus}
              </h3>
              <div className="mt-2.5 grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px] leading-relaxed font-sans">
                <div className="space-y-1">
                  {headlineBullets.map((bullet, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 font-medium">
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 flex flex-col justify-center">
                  <span className="text-[8px] font-black tracking-wider text-orange-400 uppercase">🎯 PRIORIDADE DE TREINO</span>
                  <p className="font-extrabold text-[10px] text-white mt-0.5 uppercase italic">{headlinePriority}</p>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
                  <span className="text-[8px] font-black tracking-wider text-slate-400 uppercase">SCORE DE PERFORMANCE</span>
                  <div className="flex items-baseline gap-0.5 mt-1 font-sans">
                    <span className="text-2xl font-black text-brand-primary italic">{perfScore}</span>
                    <span className="text-[10px] font-bold text-slate-400">/100</span>
                  </div>
                  <span className={`text-[7px] font-black uppercase tracking-wider px-2 py-0.5 mt-1 rounded-full border ${perfScoreColor}`}>
                    {perfScoreClass}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-4 font-sans">
              <div className="bg-brand-primary p-8 rounded-[2.5rem] text-brand-dark shadow-xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-[0.05] group-hover:scale-110 transition-transform text-brand-dark">
                  <TrendingUp className="w-32 h-32" />
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 italic font-bold">
                    ÍNDICE REATIVO (RSI)
                  </span>
                  {previousData && (
                    <div className="flex items-center gap-1 text-[10px] font-black text-brand-dark bg-black/10 px-2 py-0.5 rounded-full">
                      <span>{getDiff(data.rsi, previousData.rsi).icon}</span>
                      <span>{getDiff(data.rsi, previousData.rsi).percent}%</span>
                    </div>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-4 animate-fadeIn">
                  <h3 className="text-5xl font-black italic leading-none font-sans">
                    {data.rsi?.toFixed(2) || "0.00"}
                  </h3>
                  <span className="text-sm font-bold opacity-60 uppercase italic font-sans">
                    m/s
                  </span>
                </div>
                <p className="text-[10px] mt-6 font-black uppercase italic leading-relaxed text-brand-dark/80 font-bold font-sans">
                  MENSURA A CAPACIDADE DE ABSORVER A QUEDA E GERAR PROPULSÃO IMEDIATA, INDICANDO A EFICIÊNCIA DO CICLO ALONGAMENTO-ENCURTAMENTO RÁPIDO DO ATLETA.
                </p>
              </div>

              <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 text-orange-500 opacity-[0.03] group-hover:scale-110 transition-transform">
                  <Zap className="w-32 h-32" />
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic font-bold font-sans">
                    ALTURA DO SALTO
                  </span>
                  {previousData && (
                    <div className="flex items-center gap-1 text-[10px] font-black text-orange-500 font-sans">
                      <span>{getDiff(data.jumpHeight, previousData.jumpHeight).icon}</span>
                      <span>{getDiff(data.jumpHeight, previousData.jumpHeight).percent}%</span>
                    </div>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-4">
                  <h3 className="text-5xl font-black text-slate-900 italic leading-none font-sans">
                    {data.jumpHeight || 0}
                  </h3>
                  <span className="text-sm font-bold text-slate-400 uppercase italic font-sans">
                    CM
                  </span>
                </div>
                <p className="text-[10px] mt-6 font-black text-slate-400 uppercase italic leading-relaxed font-bold font-sans">
                  REPRESENTA A TRANSLOCAÇÃO VERTICAL MÁXIMA (EM CM) ATINGIDA APÓS O IMPACTO DE QUEDA.
                </p>
              </div>

              <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 text-emerald-500 opacity-[0.03] group-hover:scale-110 transition-transform">
                  <Activity className="w-32 h-32" />
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic font-bold font-sans">
                    TEMPO DE VOO
                  </span>
                  {previousData && (
                    <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 font-sans">
                      <span>{getDiff(data.flightTime, previousData.flightTime).icon}</span>
                      <span>{getDiff(data.flightTime, previousData.flightTime).percent}%</span>
                    </div>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-4">
                  <h3 className="text-5xl font-black text-emerald-600 italic leading-none font-sans">
                    {data.flightTime || 0}
                  </h3>
                  <span className="text-sm font-bold text-slate-400 uppercase italic font-sans">
                    MS
                  </span>
                </div>
                <p className="text-[10px] mt-6 font-black text-slate-400 uppercase italic leading-relaxed font-bold font-sans">
                  DURAÇÃO TOTAL DA FASE AÉREA DO ATLETA (EM MS) APÓS O IMPULSO REATIVO DO SOLO.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatCard
                icon={Zap}
                label="FORÇA MÉDIA"
                value={data.meanForce}
                unit="N"
                color="bg-blue-500"
                description="REPRESENTA A PRODUÇÃO DE FORÇA MÉDIA CONCÊNTRICA APLICADA NO SOLO."
                diff={
                  previousData && data.meanForce && previousData.meanForce
                    ? getDiff(data.meanForce, previousData.meanForce)
                    : null
                }
              />
              <StatCard
                icon={TrendingUp}
                label="POTÊNCIA MÉDIA"
                value={data.meanPower}
                unit="W"
                color="bg-purple-500"
                description="TAXA MÉDIA DE TRANSFERÊNCIA DE POTÊNCIA CONCÊNTRICA DO MOVIMENTO."
                diff={
                  previousData && data.meanPower && previousData.meanPower
                    ? getDiff(data.meanPower, previousData.meanPower)
                    : null
                }
              />
              <StatCard
                icon={Activity}
                label="RIGIDEZ (STIFFNESS)"
                value={getNormalizedStiffness(data.stiffness).toLocaleString('pt-BR')}
                unit="N/m"
                color="bg-red-500"
                description="CAPACIDADE PASSIVO-ATIVA DAS ARTICULAÇÕES E TENDÕES DE ABSORVER IMPACTOS."
                diff={
                  previousData && data.stiffness && previousData.stiffness
                    ? getDiff(getNormalizedStiffness(data.stiffness), getNormalizedStiffness(previousData.stiffness))
                    : null
                }
              />
              <StatCard
                icon={Activity}
                label="TEMPO DE CONTATO"
                value={data.contactTime}
                unit="ms"
                color="bg-orange-500"
                description="DURAÇÃO TOTAL DA TRANSIÇÃO DE TOQUE NO SOLO. MENOR TEMPO SIGNIFICA REATIVIDADE MAIOR."
                diff={
                  previousData && data.contactTime && previousData.contactTime
                    ? getDiff(data.contactTime, previousData.contactTime)
                    : null
                }
              />
            </div>
          </ReportPage>

          {/* Page 2 */}
          <ReportPage pageNumber={2} totalPages={3}>
            <ReportHeader
              title="RELATÓRIO DE DROP JUMP"
              subTitle="HISTÓRICO E COMPOSIÇÃO DE FORÇA REATIVA"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[{ label: "PÁGINA", value: "02 DE 03" }]}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="md:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 font-sans">
                      <TrendingUp className="w-4 h-4 text-brand-primary" />
                      <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] font-bold">
                        Evolução de RSI & Rigidez Neuromuscular
                      </h4>
                    </div>
                  </div>
                  <p className="text-[9.5px] text-slate-400 uppercase font-black tracking-wider mb-6 italic">
                    *Gráfico de Duplo Eixo: Barra mostra Rigidez (N/m - Eixo Dir.) e Linha mostra Reatividade (RSI - Eixo Esq.)
                  </p>
                </div>
                
                <div className="h-[230px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={evolutionData}
                      margin={{ top: 10, right: -5, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 8, fontWeight: 900 }}
                      />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke="#39FF14"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 8, fontWeight: 900 }}
                        domain={[0, 'dataMax + 0.5']}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#3b82f6"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 8, fontWeight: 900 }}
                        domain={[0, 'auto']}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: "16px",
                          color: "#fff",
                          fontFamily: "sans-serif",
                          fontSize: "10px",
                          fontWeight: "bold"
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }}
                        verticalAlign="top"
                        height={36}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="stiffness"
                        name="Rigidez (N/m)"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        barSize={16}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="rsi"
                        name="Índice RSI"
                        stroke="#39FF14"
                        strokeWidth={3}
                        dot={{ fill: "#39FF14", r: 4 }}
                      />
                      <ReferenceLine
                        yAxisId="left"
                        y={sTargetRsiVal}
                        stroke="#f59e0b"
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        label={{
                          value: `META: ${sTargetRsiVal.toFixed(2)}`,
                          fill: "#f59e0b",
                          fontSize: 8,
                          fontWeight: "bold",
                          position: "top"
                        }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-[2rem] text-white flex flex-col justify-between font-sans">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-orange-400" />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-orange-400 font-bold">
                      BENCHMARK & CLASSIFICAÇÃO RSI
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="border border-slate-800 rounded-xl overflow-hidden text-[9px] uppercase tracking-wider font-bold">
                      <div className="grid grid-cols-3 bg-slate-950 p-2 text-slate-400 border-b border-slate-800">
                        <span>NÍVEL</span>
                        <span className="text-center">RSI</span>
                        <span className="text-right">STATUS</span>
                      </div>
                      
                      {/* Elite Row */}
                      <div className={`grid grid-cols-3 p-2.5 border-b border-slate-800/50 items-center ${sRsiVal >= 2.0 ? "bg-indigo-950/80 text-indigo-300 font-black relative" : "text-slate-400 opacity-60"}`}>
                        <div className="flex items-center gap-1.5">
                          {sRsiVal >= 2.0 && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />}
                          <span>ELITE</span>
                        </div>
                        <span className="text-center">&gt; 2.0</span>
                        <span className="text-right italic">{sRsiVal >= 2.0 ? "ATUAL ●" : "EXCEPCIONAL"}</span>
                      </div>

                      {/* Bom Row */}
                      <div className={`grid grid-cols-3 p-2.5 border-b border-slate-800/50 items-center ${sRsiVal >= 1.5 && sRsiVal < 2.0 ? "bg-emerald-950/80 text-emerald-300 font-black relative" : "text-slate-400 opacity-60"}`}>
                        <div className="flex items-center gap-1.5">
                          {sRsiVal >= 1.5 && sRsiVal < 2.0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                          <span>BOM</span>
                        </div>
                        <span className="text-center">1.5 - 2.0</span>
                        <span className="text-right italic">{sRsiVal >= 1.5 && sRsiVal < 2.0 ? "ATUAL ●" : "AVANÇADO"}</span>
                      </div>

                      {/* Moderado Row */}
                      <div className={`grid grid-cols-3 p-2.5 border-b border-slate-800/50 items-center ${sRsiVal >= 1.0 && sRsiVal < 1.5 ? "bg-amber-950/80 text-amber-300 font-black relative" : "text-slate-400 opacity-60"}`}>
                        <div className="flex items-center gap-1.5">
                          {sRsiVal >= 1.0 && sRsiVal < 1.5 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
                          <span>MODERADO</span>
                        </div>
                        <span className="text-center">1.0 - 1.5</span>
                        <span className="text-right italic">{sRsiVal >= 1.0 && sRsiVal < 1.5 ? "ATUAL ●" : "INTERMEDIÁRIO"}</span>
                      </div>

                      {/* Baixo Row */}
                      <div className={`grid grid-cols-3 p-2.5 items-center ${sRsiVal < 1.0 ? "bg-rose-950/80 text-rose-300 font-black relative" : "text-slate-400 opacity-60"}`}>
                        <div className="flex items-center gap-1.5">
                          {sRsiVal < 1.0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />}
                          <span>BAIXO</span>
                        </div>
                        <span className="text-center">&lt; 1.0</span>
                        <span className="text-right italic">{sRsiVal < 1.0 ? "ATUAL ●" : "RESTRITIVO"}</span>
                      </div>
                    </div>

                    <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800 mt-2">
                      <div className="flex justify-between items-center mb-1 text-[8px] text-slate-400 uppercase tracking-wider font-bold">
                        <span>PONTUAÇÃO ATUAL RSI</span>
                        <span className="font-extrabold text-white italic">{sRsiVal.toFixed(2)} RSI</span>
                      </div>
                      <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <div 
                          className="h-full bg-brand-primary transition-all duration-1000"
                          style={{ width: `${Math.min((sRsiVal / 3.0) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-800">
                    <p className="text-[9.5px] text-slate-400 font-medium leading-relaxed uppercase">
                      Para maximizar o RSI, mantenha o calcanhar elevado durante o contato curto com o solo para maior stiffness: <span className="text-white font-extrabold">{data.stiffness ? `${getNormalizedStiffness(data.stiffness).toLocaleString('pt-BR')} N/m` : "stiffness ideal"}</span>.
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-800 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-[8px] text-slate-500 font-black leading-snug italic uppercase tracking-wider">
                      "O tempo curto de contato com solo sem rebote define a força reativa terminal."
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO TRADUTORA DE ELITE - COMUNICAÇÃO DE ALTO NÍVEL (Opção 3) */}
            <div className="mt-6 bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm font-sans">
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="w-5 h-5 text-brand-primary" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.25em] font-bold">
                  Tradução Prática do Resultado (Alta Performance Integrada)
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">PARA O OUTLOOK DO TREINADOR</span>
                    </div>
                    <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                      {data.rsi >= 2.0 
                        ? "Excelente capacidade elástica elogiável. Prescrever volume de saltos curtos (< 200ms contato) ou pliometria de alta intensidade em barreiras médias sem rebote para converter rigidez de base em aceleração linear agressiva."
                        : "Dominância de componente concêntrico lento identificável. Necessário reduzir tempo de transição focando em pliometria extensiva rápida (tornozelo estático), cordas e drop jump de menor altura (20cm) enfatizando decolagem instantânea."
                      }
                    </p>
                  </div>
                  <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-4 italic">
                    Conceito Técnico: Ciclo Alongamento-Encurtamento (CAE)
                  </div>
                </div>
              </div>
            </div>
          </ReportPage>

          {/* Page 3: Diagnóstico de Elite & Prescrição */}
          <ReportPage pageNumber={3} totalPages={3}>
            <ReportHeader
              title="RELATÓRIO DE DROP JUMP"
              subTitle="DIAGNÓSTICO ESPORTIVO E DIRETRIZES DE ELITE"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[{ label: "PÁGINA", value: "03 DE 03" }]}
            />

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 font-sans text-slate-800 text-[10.5px]">
              {/* Left Column: Status, Score, Metas de Evolução */}
              <div className="md:col-span-1 space-y-3 flex flex-col justify-between">
                
                {/* 1. 🔥 STATUS GERAL (RESUMO EXECUTIVO) */}
                <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 relative overflow-hidden shadow-sm">
                  <div className="absolute right-1 top-1 text-orange-500 opacity-20">
                    <Flame className="w-8 h-8" />
                  </div>
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-1.5 flex items-center gap-1 font-bold">
                    🔥 1. Status Geral (Resumo)
                  </h4>
                  <p className="font-medium leading-relaxed text-[10px]">
                    {statusExecutivo}
                  </p>
                </div>

                {/* 2. 🎯 SCORE DE PERFORMANCE (0 a 100) */}
                <div className="bg-white border border-slate-200/80 p-3.5 rounded-xl shadow-sm flex flex-col items-center text-center">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 font-bold w-full text-left">
                    🎯 2. Score de Performance
                  </h4>
                  <div className="relative flex items-center justify-center my-1.5">
                    {/* Ring background */}
                    <div className="w-16 h-16 rounded-full border-4 border-slate-100 flex items-center justify-center bg-slate-50">
                      <span className="text-xl font-black italic text-slate-900">{perfScore}</span>
                    </div>
                  </div>
                  <div className={`mt-1 text-[8.5px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border ${perfScoreColor}`}>
                    {perfScoreClass}
                  </div>
                  <p className="text-[9px] text-slate-500 mt-2 leading-relaxed">
                    Pontuação ponderada de RSI (50%), Tempo de Contato (30%) e Rigidez Dinâmica (20%).
                  </p>
                </div>

                {/* 8. 🎯 META DE EVOLUÇÃO */}
                <div className="bg-orange-50/50 border border-orange-100 p-3.5 rounded-xl shadow-sm">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-orange-700 mb-2 flex items-center gap-1 font-bold">
                    📈 Metas de Evolução
                  </h4>
                  <div className="space-y-1.5 text-[9.5px] font-bold text-slate-700 uppercase tracking-wide">
                    <div className="flex justify-between border-b border-orange-100/50 pb-1">
                      <span>RSI Alvo:</span>
                      <span className="text-emerald-700 font-black italic">{sRsiVal.toFixed(2)} ➔ {sTargetRsiVal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b border-orange-100/50 pb-1">
                      <span>Contato Alvo:</span>
                      <span className="text-emerald-700 font-black italic">{sTcVal} ms ➔ &lt;{sTargetTcVal} ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Altura Salto:</span>
                      <span className="text-slate-600 font-extrabold italic">Manter / Aumentar ({sJhVal} cm)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Técnico, Plano de Ação */}
              <div className="md:col-span-1 space-y-3 flex flex-col justify-between">
                
                {/* 3. 📊 INTERPRETAÇÃO TÉCNICA (TREINADOR) */}
                <div className="bg-white border border-slate-200/80 p-3.5 rounded-xl shadow-sm space-y-2 flex-grow">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-900 border-b border-slate-100 pb-1 flex items-center gap-1 font-bold">
                     3. Interpretação Técnica
                  </h4>
                  <div>
                    <span className="font-extrabold text-slate-900 block text-[9.5px] uppercase">Perfil Neuromuscular:</span>
                    <p className="text-slate-600 text-[10px] leading-relaxed mt-0.5">{sNeuromuscularProfile}</p>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-900 block text-[9.5px] uppercase">Eficiência do CAE (SSC):</span>
                    <p className="text-slate-600 text-[10px] leading-relaxed mt-0.5">{sSscEfficiency}</p>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-900 block text-[9.5px] uppercase">Relação Força vs Velocidade:</span>
                    <p className="text-slate-600 text-[10px] leading-relaxed mt-0.5">{sForceVelRelation}</p>
                  </div>
                </div>

                {/* 7. 🚀 PLANO DE AÇÃO (4 SEMANAS) */}
                <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 flex-grow flex flex-col justify-between shadow-sm">
                  <div>
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-2 flex items-center gap-1 font-bold">
                      🚀 Plano de Ação (4 Semanas)
                    </h4>
                    <p className="text-[8px] font-extrabold text-slate-400 mb-2 uppercase tracking-wide">
                      FOCO: {sTrainFocus}
                    </p>
                    <div className="space-y-2">
                      {sExercisesList.map((ex, idx) => (
                        <div key={idx} className="border-l-2 border-orange-500/50 pl-2">
                          <span className="font-extrabold text-slate-200 text-[10px] block">{idx + 1}. {ex.name}</span>
                          <span className="text-[8px] text-slate-400 uppercase tracking-wide block">{ex.sets}</span>
                          <span className="text-[9px] text-orange-300 italic block">{ex.focus}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ReportPage>

        </div>

        {/* Buttons Row (Controls) */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 no-print pb-20 px-4 md:px-0 font-sans">
          <button
            onClick={handleExportJpeg}
            className="flex-grow flex items-center justify-center gap-2 bg-brand-primary text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-brand-primary/25 hover:bg-brand-dark transition-all active:scale-95 cursor-pointer font-sans"
          >
            <Download size={20} /> Baixar Páginas (JPEG)
          </button>
          <button
            onClick={handlePrint}
            className="flex-grow flex items-center justify-center gap-2 bg-slate-800 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 cursor-pointer font-sans"
          >
            <Printer size={20} /> Imprimir / PDF
          </button>
          <button
            onClick={onClose}
            className="flex-grow flex items-center justify-center gap-2 bg-slate-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-600 transition-all active:scale-95 cursor-pointer font-sans"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const StrengthReport: FC<{
  athlete: Athlete;
  data: IsometricStrength;
  onClose: () => void;
  history: IsometricStrength[];
}> = ({ athlete, data, onClose, history }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const previousData = getPreviousAssessment(data, history);

  const asymQuad = getAsymmetryStatus(data.quadricepsR, data.quadricepsL);
  const asymHam = getAsymmetryStatus(data.hamstringsR, data.hamstringsL);

  const AsymmetryBracket = ({ percent }: { percent: number }) => {
    const isGood = percent <= 10;
    const isAttention = percent > 10 && percent <= 15;
    const colorClass = isGood 
      ? "text-emerald-600 border-emerald-500 bg-emerald-50/50" 
      : isAttention 
        ? "text-amber-500 border-amber-500 bg-amber-50/50" 
        : "text-rose-600 border-rose-500 bg-rose-50/50";

    return (
      <div className="flex items-center gap-1 shrink-0 select-none">
        <svg className="w-2.5 h-8 text-slate-300" viewBox="0 0 10 32" fill="none">
          <path d="M1 2 L8 16 L1 30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-md border ${colorClass} italic`}>
          {percent}%
        </div>
      </div>
    );
  };

  const getAsymmetryColor = (pct: number) => {
    if (pct <= 10) return { fill: "#22c55e", stroke: "#16a34a" }; // Emerald 500
    if (pct <= 15) return { fill: "#f59e0b", stroke: "#d97706" }; // Amber 500
    return { fill: "#ef4444", stroke: "#dc2626" }; // Rose 500
  };

  const quadColors = getAsymmetryColor(asymQuad.value);
  const hamColors = getAsymmetryColor(asymHam.value);

  const handleExportJpeg = async () => {
    if (!reportRef.current) return;
    const toastId = toast.loading("Otimizando layout para exportação...");
    try {
      const pages = reportRef.current.querySelectorAll(".report-page");
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const dataUrl = await toJpeg(page, {
          quality: 1.0,
          backgroundColor: "#FFFFFF",
          pixelRatio: 3,
        });
        const link = document.createElement("a");
        link.download = `relatorio-forca-${athlete.name.toLowerCase().replace(/\s+/g, "-")}-pag-${i + 1}.jpg`;
        link.href = dataUrl;
        link.click();
        await new Promise((r) => setTimeout(r, 400));
      }
      toast.success("Arquivos gerados com sucesso!", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Falha ao gerar imagens.", { id: toastId });
    }
  };

  const handlePrint = () => {
    triggerPrint();
  };

  const iqR = getIQRatioStatus(data.hamstringsR, data.quadricepsR);
  const iqL = getIQRatioStatus(data.hamstringsL, data.quadricepsL);

  const hasDetailedMetrics = !!(
    (data.quadricepsDetailsR?.repetitions && data.quadricepsDetailsR.repetitions > 0) ||
    (data.quadricepsDetailsL?.repetitions && data.quadricepsDetailsL.repetitions > 0) ||
    (data.hamstringsDetailsR?.repetitions && data.hamstringsDetailsR.repetitions > 0) ||
    (data.hamstringsDetailsL?.repetitions && data.hamstringsDetailsL.repetitions > 0)
  );

  const totalReportPages = hasDetailedMetrics ? 4 : 3;

  const quadCurveData = [
    { ms: "100ms", R: data.quadricepsDetailsR?.force100 || 0, L: data.quadricepsDetailsL?.force100 || 0 },
    { ms: "200ms", R: data.quadricepsDetailsR?.force200 || 0, L: data.quadricepsDetailsL?.force200 || 0 },
    { ms: "300ms", R: data.quadricepsDetailsR?.force300 || 0, L: data.quadricepsDetailsL?.force300 || 0 },
    { ms: "Pico", R: data.quadricepsDetailsR?.forcePico || 0, L: data.quadricepsDetailsL?.forcePico || 0 },
  ];

  const hamCurveData = [
    { ms: "100ms", R: data.hamstringsDetailsR?.force100 || 0, L: data.hamstringsDetailsL?.force100 || 0 },
    { ms: "200ms", R: data.hamstringsDetailsR?.force200 || 0, L: data.hamstringsDetailsL?.force200 || 0 },
    { ms: "300ms", R: data.hamstringsDetailsR?.force300 || 0, L: data.hamstringsDetailsL?.force300 || 0 },
    { ms: "Pico", R: data.hamstringsDetailsR?.forcePico || 0, L: data.hamstringsDetailsL?.forcePico || 0 },
  ];

  // Strength Specific calculations:
  const REF_EXT = 20.6;
  const REF_FLEX = 10.83;

  // 1. CALCULATE SCORE (MIVC Score out of 100)
  const quadContrib = Math.min((( (data.quadricepsR || 0) + (data.quadricepsL || 0) ) / (2 * REF_EXT)) * 100, 100) * 0.4;
  const hamContrib = Math.min((( (data.hamstringsR || 0) + (data.hamstringsL || 0) ) / (2 * REF_FLEX)) * 100, 100) * 0.4;
  const asymContrib = Math.max(0, 100 - (asymQuad.value + asymHam.value) * 2) * 0.2;
  const strengthScore = Math.round(quadContrib + hamContrib + asymContrib);

  let strengthScoreClass = "Baixo";
  let strengthScoreColor = "bg-red-500/10 text-red-550 border-red-500/20";
  if (strengthScore >= 85) {
    strengthScoreClass = "Elite";
    strengthScoreColor = "bg-brand-primary/10 text-brand-primary border-brand-primary/20";
  } else if (strengthScore >= 70) {
    strengthScoreClass = "Bom";
    strengthScoreColor = "bg-emerald-500/10 text-emerald-450/80 border-emerald-500/20";
  } else if (strengthScore >= 50) {
    strengthScoreClass = "Moderado";
    strengthScoreColor = "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
  }

  // 2. IEM (Índice de Eficiência Mecânica - Co-contração)
  const iqRDeviation = Math.abs(iqR.ratio - 60);
  const iqLDeviation = Math.abs(iqL.ratio - 60);
  const iemPct = Math.max(0, Math.round(100 - (iqRDeviation + iqLDeviation) * 1.5));

  let iemStrClass = "Alerta";
  let iemStrColor = "bg-red-500/10 text-red-400 border-red-500/20";
  if (iemPct >= 85) {
    iemStrClass = "Excelente";
    iemStrColor = "bg-brand-primary/10 text-brand-primary border-brand-primary/20";
  } else if (iemPct >= 70) {
    iemStrClass = "Regular";
    iemStrColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  }

  // 3. VEREDICTO RESUMO DO ESPECIALISTA (Cientista do Esporte)
  let veredictoResumoStr = `Perfil muscular moderado. Requer balanceamento nas razões posteriores/anteriores segmentares.`;
  if (strengthScore >= 85 && asymQuad.value < 10 && asymHam.value < 10) {
    veredictoResumoStr = `Atleta de elite com excepcional rendimento isométrico segmentar e ótimo equilíbrio sinérgico e bilateral.`;
  } else if (asymQuad.value >= 10 || asymHam.value >= 10) {
    veredictoResumoStr = `Presença de déficits de simetria bilateral acima do limiar clínico recomendável (10%). Requer atenção corretiva focal em membros deficitários.`;
  }

  // 4. INTERPRETAÇÃO TÉCNICA (Treinador)
  const sStrExcExc = data.quadricepsR > data.quadricepsL 
    ? `Déficit de extensão no membro esquerdo (-${asymQuad.value}%). Risco mecânico aumentado de compensação patelofemoral direita.`
    : data.quadricepsL > data.quadricepsR
      ? `Déficit de extensão no membro direito (-${asymQuad.value}%). Recomenda-se treinar flexões e extensões com ênfase isolateral.`
      : `Perfeita paridade simétrica de extensão em joelhos bilaterais (${asymQuad.value}%).`;

  const sStrAproveitamentoElastico = (iqR.ratio < 50 || iqL.ratio < 50)
    ? `Razão I/Q suboptimal bilateral. Isquiotibiais enfraquecidos em relação aos extensores primários, predispondo a cisalhamentos de LCA.`
    : `Razão I/Q protetora dentro da zona ideal (50-60%). Sinergia agonist-antagonist considerar exemplar que estabiliza o joelho.`;

  const sStrFatoresNeuromusculares = `Excelente taxa de sustentação voluntária máxima isométrica (MIVC), sinalizando ótima densidade funcional mitocondrial e recrutamento de alto limiar.`;

  // 5. TRADUÇÃO SIMPLES (Atleta)
  let sStrAthleteTranslation = `Seus músculos das pernas são muito fortes! No momento, só precisamos equilibrar a força entre as pernas esquerda e direita para que você corra sem compensações.`;
  if (strengthScore >= 85 && asymQuad.value < 8 && asymHam.value < 8) {
    sStrAthleteTranslation = `Excelente! Suas pernas estão em nível espetacular de força e equilíbrio! Suas 'fundações' atléticas estão prontas para qualquer arrancada máxima.`;
  } else if (asymQuad.value >= 10 || asymHam.value >= 10) {
    sStrAthleteTranslation = `Você tem pernas muito potentes, mas uma delas está fazendo mais força que a outra. Vamos focar nos treinos focados em uma única perna para igualarmos essa força!`;
  }

  // 6. EXPLICAÇÃO PARA PAIS
  let sStrParentsExplanation = `Avaliamos a força isométrica do seu filho para garantir que ele tenha estabilidade nas pernas. Garantir que as duas pernas empurrem de forma parecida ajuda a alinhar seu quadril e protege as cartilagens em fase de desenvolvimento.`;
  if (calculateAge(athlete.dob) < 18) {
    sStrParentsExplanation = `Com foco na saúde articular do seu filho, o teste de força isométrica ajuda a verificar se ele está distribuindo o peso igualmente. Isso blinda seus joelhos contra lesões típicas do estirão do crescimento e do estresse de treino.`;
  }

  // 7. PLANO DE AÇÃO PRESCRIBED
  let sStrActionItems = [
    { title: "Cadeira Extensora Isométrica", desc: "Sustentação isométrica em cadeira extensora com carga submáxima a 60º de flexão de joelho (3 séries de 15 segundos)." },
    { title: "Nórdico Posterior de Coxa", desc: "Frenagem de queda excêntrica para recrutar força máxima protetora de isquiotibiais (3 séries de 6 reps)." },
    { title: "Elevação Pélvica Pesada", desc: "Construção de força extensora de quadril e glúteo para maior estabilização mecânica." }
  ];

  if (asymQuad.value >= 10 || asymHam.value >= 10) {
    sStrActionItems = [
      { title: "Agachamento Unilateral Bulgaro", desc: "Excelente exercício para correção bilateral, com foco na perna mais fraca (4 séries de 8 repetições)." },
      { title: "Leg Press Unilateral Lento", desc: "Instalação de simetria concêntrica de extensão isolando individualmente cada coxa (3 séries de 10 reps)." },
      { title: "Flexora Unilateral Focada", desc: "Corrigir a razão I/Q do membro desequilibrado focado com carga isolada (3 séries de 12 repetições)." }
    ];
  }

  // 8. METAS DE EVOLUÇÃO
  const targetStrAsym = 5;
  const targetTimeframeStr = "6-8 semanas";

  const SymmetryGauge = ({ sideA, sideB }: { sideA: number; sideB: number }) => {
    if (!sideA || !sideB) return null;
    const diff = sideA - sideB;
    const maxVal = Math.max(sideA, sideB);
    const pct = parseFloat(((Math.abs(diff) / maxVal) * 100).toFixed(1));
    const maxScaleLimit = 20; 
    const ratio = diff / maxVal; 
    const percentImbalance = ratio * 100;
    const positionPercent = Math.max(10, Math.min(90, 50 + (percentImbalance / maxScaleLimit) * 40));
    const isGood = pct <= 10;
    const isAttention = pct > 10 && pct <= 15;
    const colorClass = isGood ? "bg-emerald-400" : isAttention ? "bg-yellow-400" : "bg-rose-500";
    
    return (
      <div className="mt-3 w-full pr-1 font-sans">
        <div className="flex justify-between text-[7px] text-slate-400 uppercase tracking-widest font-black select-none">
          <span>← Esq (L)</span>
          <span>Simetria</span>
          <span>Dir (R) →</span>
        </div>
        <div className="relative h-2 bg-slate-100/80 rounded-full border border-slate-200 mt-1 select-none">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-slate-300" />
          <div className="absolute left-[30%] right-[30%] top-0 bottom-0 bg-emerald-500/10 rounded-sm" />
          <div 
            className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-white shadow ${colorClass} transition-all duration-500`}
            style={{ left: `${positionPercent}%`, marginLeft: '-6px' }}
          />
        </div>
        <div className="flex justify-between text-[7px] font-black mt-1 uppercase">
          <span className={sideB > sideA ? "text-orange-600" : "text-slate-400"}>
            {sideB > sideA ? `${pct}% L` : ''}
          </span>
          <span className="text-emerald-600 tracking-wider text-[6px] font-extrabold">{pct <= 10 ? 'ZONA IDEAL (SIMETRIA)' : ''}</span>
          <span className={sideA > sideB ? "text-orange-600" : "text-slate-400"}>
            {sideA > sideB ? `${pct}% R` : ''}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-slate-900/95 backdrop-blur-xl overflow-y-auto p-0 md:p-4 no-scrollbar report-modal">
      <div className="max-w-5xl w-full mx-auto md:my-10 h-full md:h-auto font-sans">
        
        {/* Printable/exportable container */}
        <div ref={reportRef} className="print-container bg-slate-100/10 md:bg-transparent">
          
          {/* Page 1: Segmented Knee Extension/Flexion */}
          <ReportPage pageNumber={1} totalPages={totalReportPages}>
            <ReportHeader
              title="RELATÓRIO DE FORÇA ISOMÉTRICA"
              subTitle="ANÁLISE DINAMOMÉTRICA E MAPA CORPORAL"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[
                { label: "IDADE DO ATLETA", value: `${calculateAge(athlete.dob)} ANOS` },
                { label: "PÁGINA", value: `01 DE 0${totalReportPages}` }
              ]}
            />

            <div className="grid grid-cols-12 gap-6 mt-6 h-[210mm] font-sans">
                {/* Left side panel: Metrics, Legend & References */}
                <div className="col-span-5 flex flex-col justify-between h-full">
                  {/* Knee Metrics Section */}
                  <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4 border-l-2 border-emerald-500 pl-2">
                      Ações Articulares (Joelho)
                    </h3>
                    
                    {/* Extensão (Quadríceps) */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[9.5px] font-black text-slate-700 uppercase tracking-wider">
                          Extensão (Quadríceps)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-grow space-y-1.5">
                          {/* Right Side (D) */}
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black text-slate-400 w-3">D</span>
                            <div className="flex-grow h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-slate-500 rounded-full transition-all duration-500" 
                                style={{ width: `${Math.min((data.quadricepsR / 60) * 100, 100)}%` }} 
                              />
                            </div>
                            <div className="w-12 text-right shrink-0">
                              <span className="text-[9.5px] font-black text-slate-700">
                                {data.quadricepsR.toFixed(1)} kgf
                              </span>
                            </div>
                          </div>
                          {/* Left Side (E) */}
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black text-slate-400 w-3">E</span>
                            <div className="flex-grow h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-slate-500 rounded-full transition-all duration-500" 
                                style={{ width: `${Math.min((data.quadricepsL / 60) * 100, 100)}%` }} 
                              />
                            </div>
                            <div className="w-12 text-right shrink-0">
                              <span className="text-[9.5px] font-black text-slate-700">
                                {data.quadricepsL.toFixed(1)} kgf
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Asymmetry Deficit Bracket */}
                        <AsymmetryBracket percent={asymQuad.value} />
                      </div>
                    </div>

                    {/* Flexão (Isquiotibiais) */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[9.5px] font-black text-slate-700 uppercase tracking-wider">
                          Flexão (Isquiotibiais)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-grow space-y-1.5">
                          {/* Right Side (D) */}
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black text-slate-400 w-3">D</span>
                            <div className="flex-grow h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-slate-500 rounded-full transition-all duration-500" 
                                style={{ width: `${Math.min((data.hamstringsR / 30) * 100, 100)}%` }} 
                              />
                            </div>
                            <div className="w-12 text-right shrink-0">
                              <span className="text-[9.5px] font-black text-slate-700">
                                {data.hamstringsR.toFixed(1)} kgf
                              </span>
                            </div>
                          </div>
                          {/* Left Side (E) */}
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black text-slate-400 w-3">E</span>
                            <div className="flex-grow h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-slate-500 rounded-full transition-all duration-500" 
                                style={{ width: `${Math.min((data.hamstringsL / 30) * 100, 100)}%` }} 
                              />
                            </div>
                            <div className="w-12 text-right shrink-0">
                              <span className="text-[9.5px] font-black text-slate-700">
                                {data.hamstringsL.toFixed(1)} kgf
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Asymmetry Deficit Bracket */}
                        <AsymmetryBracket percent={asymHam.value} />
                      </div>
                    </div>
                  </div>

                  {/* Asymmetry Classification Legend Box */}
                  <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-2 select-none text-center">
                      Classificação da Assimetria
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-center">
                        <span className="text-[8px] font-black text-emerald-600 block">0 - 10%</span>
                        <span className="text-[6.5px] font-extrabold text-emerald-500 uppercase tracking-wider">Leve</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-amber-50 border border-amber-100 text-center">
                        <span className="text-[8px] font-black text-amber-600 block">10 - 15%</span>
                        <span className="text-[6.5px] font-extrabold text-amber-500 uppercase tracking-wider">Moderada</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-rose-50 border border-rose-100 text-center">
                        <span className="text-[8px] font-black text-rose-600 block">15% +</span>
                        <span className="text-[6.5px] font-extrabold text-rose-500 uppercase tracking-wider">Alta</span>
                      </div>
                    </div>
                  </div>

                  {/* Comparativo Histórico (if previous test exists) */}
                  {previousData && (
                    <div className="bg-emerald-500/10 border border-dashed border-emerald-500/30 p-3 rounded-2xl text-center select-none">
                      <span className="text-[8.5px] font-black text-emerald-700 uppercase tracking-widest block mb-0.5">
                        Evolução Histórica Ativa
                      </span>
                      <p className="text-[7.5px] text-slate-500 leading-tight">
                        Evoluções indicadas nas silhuetas comparadas com o teste de <strong>{formatDate(previousData.date)}</strong>.
                      </p>
                    </div>
                  )}

                  {/* References Box (Footer) */}
                  <div className="border-t border-slate-100 pt-3 select-none">
                    <span className="text-[6.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                      Referências Científicas:
                    </span>
                    <p className="text-[5.5px] text-slate-400 leading-tight mb-1">
                      <strong>PARKINSON et al.</strong> The Calculation, Thresholds and Reporting of Inter-limb Strength Asymmetry: A Systematic Review. J. Sports Sci Med. 2021.
                    </p>
                    <p className="text-[5.5px] text-slate-400 leading-tight">
                      <strong>GRINDEM et al.</strong> Simple decision rules can reduce re-injury risk by 84% after ACL reconstruction. Br. J. Sports Medicine (BJSM) 2016.
                    </p>
                  </div>
                </div>

                {/* Right side panel: Dynamic Human Muscle Map */}
                <div className="col-span-7 flex flex-col justify-center items-center bg-slate-50/25 border-l border-slate-100 px-4 h-full w-full">
                  <div className="flex flex-col justify-around h-full py-2 w-full max-w-[300px]">
                    
                    {/* Front View (Anterior) */}
                    <div className="flex flex-col items-center w-full">
                      {/* Title & Side letters row */}
                      <div className="w-full flex justify-between items-center px-1 mb-2">
                        <span className="font-sans font-black text-[11px] text-slate-300">D</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Anterior</span>
                        <span className="font-sans font-black text-[11px] text-slate-300">E</span>
                      </div>
                      
                      {/* 3-column Layout for Label (D) - SVG - Label (E) */}
                      <div className="flex items-center justify-between w-full gap-2">
                        {/* Right Quad label (D, on left side of image) */}
                        <div className="w-24 flex flex-col items-end text-right shrink-0 select-none">
                          {/* Evolution Data (Above Force) */}
                          {previousData && (
                            <div className={`text-[7.5px] font-black leading-tight mb-1 ${
                              data.quadricepsR - previousData.quadricepsR > 0 
                                ? "text-emerald-600" 
                                : data.quadricepsR - previousData.quadricepsR === 0 
                                  ? "text-slate-500" 
                                  : "text-rose-600"
                            }`}>
                              <span className="block">{data.quadricepsR - previousData.quadricepsR > 0 ? "▲" : data.quadricepsR - previousData.quadricepsR === 0 ? "•" : "▼"} {Math.abs(((data.quadricepsR - previousData.quadricepsR) / previousData.quadricepsR) * 100).toFixed(0)}%</span>
                              <span className="block opacity-75 font-bold text-[6.5px]">({data.quadricepsR - previousData.quadricepsR > 0 ? "+" : ""}{(data.quadricepsR - previousData.quadricepsR).toFixed(1)} kg)</span>
                            </div>
                          )}

                          {/* Current Force (Middle) */}
                          <span className="text-[10px] font-black text-slate-800 block leading-tight">
                            {data.quadricepsR.toFixed(1)} kgf
                          </span>
                          <span className="text-[6.5px] font-black text-slate-400 uppercase block tracking-wider leading-none mt-0.5">
                            Extensão
                          </span>

                          {/* Historical Force (Below Force) */}
                          {previousData && (
                            <span className="text-[7.5px] font-bold text-slate-400 block leading-tight mt-1">
                              Anterior:<br />{previousData.quadricepsR.toFixed(1)} kg
                            </span>
                          )}
                        </div>

                        {/* Front Outline SVG */}
                        <div className="flex-grow flex justify-center">
                          <svg viewBox="0 0 100 240" className="w-20 h-52 select-none">
                            <g fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="50" cy="18" r="9" />
                              <path d="M48,27 L52,27 L52,32 L48,32 Z" />
                              <path d="M36,32 L64,32 L60,88 L40,88 Z" />
                              <path d="M38,50 Q50,55 62,50" fill="none" stroke="#cbd5e1" strokeWidth="0.5" />
                              <path d="M50,32 L50,88" fill="none" stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="2 2" />
                              <path d="M64,32 L74,75 L71,110 L66,110 L68,75 L60,38" />
                              <path d="M36,32 L26,75 L29,110 L34,110 L32,75 L40,38" />
                              <path d="M40,88 L60,88 L58,105 L42,105 Z" />
                              <path d="M57,155 L61,215 L56,215 L53,155" />
                              <path d="M43,155 L39,215 L44,215 L47,155" />
                              <path d="M56,215 L62,222 L54,222 Z" />
                              <path d="M44,215 L38,222 L46,222 Z" />
                            </g>
                            
                            {/* Quadriceps Left (Esq - on the right of drawing) */}
                            <path 
                              d="M51,105 L58,105 C58,110 59,125 57,155 L51,155 C52,125 51,110 51,105 Z" 
                              fill={quadColors.fill} 
                              fillOpacity="0.8" 
                              stroke={quadColors.stroke} 
                              strokeWidth="1" 
                              className="transition-all duration-500 cursor-pointer hover:fill-opacity-100"
                            />
                            
                            {/* Quadriceps Right (Dir - on the left of drawing) */}
                            <path 
                              d="M49,105 L42,105 C42,110 41,125 43,155 L49,155 C48,125 49,110 49,105 Z" 
                              fill={quadColors.fill} 
                              fillOpacity="0.8" 
                              stroke={quadColors.stroke} 
                              strokeWidth="1" 
                              className="transition-all duration-500 cursor-pointer hover:fill-opacity-100"
                            />
                          </svg>
                        </div>

                        {/* Left Quad label (E, on right side of image) */}
                        <div className="w-24 flex flex-col items-start text-left shrink-0 select-none">
                          {/* Evolution Data (Above Force) */}
                          {previousData && (
                            <div className={`text-[7.5px] font-black leading-tight mb-1 ${
                              data.quadricepsL - previousData.quadricepsL > 0 
                                ? "text-emerald-600" 
                                : data.quadricepsL - previousData.quadricepsL === 0 
                                  ? "text-slate-500" 
                                  : "text-rose-600"
                            }`}>
                              <span className="block">{data.quadricepsL - previousData.quadricepsL > 0 ? "▲" : data.quadricepsL - previousData.quadricepsL === 0 ? "•" : "▼"} {Math.abs(((data.quadricepsL - previousData.quadricepsL) / previousData.quadricepsL) * 100).toFixed(0)}%</span>
                              <span className="block opacity-75 font-bold text-[6.5px]">({data.quadricepsL - previousData.quadricepsL > 0 ? "+" : ""}{(data.quadricepsL - previousData.quadricepsL).toFixed(1)} kg)</span>
                            </div>
                          )}

                          {/* Current Force (Middle) */}
                          <span className="text-[10px] font-black text-slate-800 block leading-tight">
                            {data.quadricepsL.toFixed(1)} kgf
                          </span>
                          <span className="text-[6.5px] font-black text-slate-400 uppercase block tracking-wider leading-none mt-0.5">
                            Extensão
                          </span>

                          {/* Historical Force (Below Force) */}
                          {previousData && (
                            <span className="text-[7.5px] font-bold text-slate-400 block leading-tight mt-1">
                              Anterior:<br />{previousData.quadricepsL.toFixed(1)} kg
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
 
                    {/* Back View (Posterior) */}
                    <div className="flex flex-col items-center w-full">
                      {/* Title & Side letters row */}
                      <div className="w-full flex justify-between items-center px-1 mb-2">
                        <span className="font-sans font-black text-[11px] text-slate-300">E</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Posterior</span>
                        <span className="font-sans font-black text-[11px] text-slate-300">D</span>
                      </div>
                      
                      {/* 3-column Layout for Label (E) - SVG - Label (D) */}
                      <div className="flex items-center justify-between w-full gap-2">
                        {/* Left Ham label (E, on left side of image in back view) */}
                        <div className="w-24 flex flex-col items-end text-right shrink-0 select-none">
                          {/* Evolution Data (Above Force) */}
                          {previousData && (
                            <div className={`text-[7.5px] font-black leading-tight mb-1 ${
                              data.hamstringsL - previousData.hamstringsL > 0 
                                ? "text-emerald-600" 
                                : data.hamstringsL - previousData.hamstringsL === 0 
                                  ? "text-slate-500" 
                                  : "text-rose-600"
                            }`}>
                              <span className="block">{data.hamstringsL - previousData.hamstringsL > 0 ? "▲" : data.hamstringsL - previousData.hamstringsL === 0 ? "•" : "▼"} {Math.abs(((data.hamstringsL - previousData.hamstringsL) / previousData.hamstringsL) * 100).toFixed(0)}%</span>
                              <span className="block opacity-75 font-bold text-[6.5px]">({data.hamstringsL - previousData.hamstringsL > 0 ? "+" : ""}{(data.hamstringsL - previousData.hamstringsL).toFixed(1)} kg)</span>
                            </div>
                          )}

                          {/* Current Force (Middle) */}
                          <span className="text-[10px] font-black text-slate-800 block leading-tight">
                            {data.hamstringsL.toFixed(1)} kgf
                          </span>
                          <span className="text-[6.5px] font-black text-slate-400 uppercase block tracking-wider leading-none mt-0.5">
                            Flexão
                          </span>

                          {/* Historical Force (Below Force) */}
                          {previousData && (
                            <span className="text-[7.5px] font-bold text-slate-400 block leading-tight mt-1">
                              Anterior:<br />{previousData.hamstringsL.toFixed(1)} kg
                            </span>
                          )}
                        </div>

                        {/* Back Outline SVG */}
                        <div className="flex-grow flex justify-center">
                          <svg viewBox="0 0 100 240" className="w-20 h-52 select-none">
                            <g fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="50" cy="18" r="9" />
                              <path d="M48,27 L52,27 L52,32 L48,32 Z" />
                              <path d="M36,32 L64,32 L60,88 L40,88 Z" />
                              <path d="M50,32 L50,88" fill="none" stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="2 2" />
                              <path d="M64,32 L74,75 L71,110 L66,110 L68,75 L60,38" />
                              <path d="M36,32 L26,75 L29,110 L34,110 L32,75 L40,38" />
                              <path d="M40,88 L60,88 L58,105 L42,105 Z" />
                              <path d="M40,95 Q50,102 60,95" fill="none" stroke="#cbd5e1" strokeWidth="0.5" />
                              <path d="M57,155 L61,215 L56,215 L53,155" />
                              <path d="M43,155 L39,215 L44,215 L47,155" />
                              <path d="M56,215 L62,222 L54,222 Z" />
                              <path d="M44,215 L38,222 L46,222 Z" />
                            </g>
                            
                            {/* Hamstring Left (Esq - on the left of drawing in back view) */}
                            <path 
                              d="M49,105 L42,105 C42,110 41,125 43,155 L49,155 C48,125 49,110 49,105 Z" 
                              fill={hamColors.fill} 
                              fillOpacity="0.8" 
                              stroke={hamColors.stroke} 
                              strokeWidth="1" 
                              className="transition-all duration-500 cursor-pointer hover:fill-opacity-100"
                            />
                            
                            {/* Hamstring Right (Dir - on the right of drawing in back view) */}
                            <path 
                              d="M51,105 L58,105 C58,110 59,125 57,155 L51,155 C52,125 51,110 51,105 Z" 
                              fill={hamColors.fill} 
                              fillOpacity="0.8" 
                              stroke={hamColors.stroke} 
                              strokeWidth="1" 
                              className="transition-all duration-500 cursor-pointer hover:fill-opacity-100"
                            />
                          </svg>
                        </div>

                        {/* Right Ham label (D, on right side of image in back view) */}
                        <div className="w-24 flex flex-col items-start text-left shrink-0 select-none">
                          {/* Evolution Data (Above Force) */}
                          {previousData && (
                            <div className={`text-[7.5px] font-black leading-tight mb-1 ${
                              data.hamstringsR - previousData.hamstringsR > 0 
                                ? "text-emerald-600" 
                                : data.hamstringsR - previousData.hamstringsR === 0 
                                  ? "text-slate-500" 
                                  : "text-rose-600"
                            }`}>
                              <span className="block">{data.hamstringsR - previousData.hamstringsR > 0 ? "▲" : data.hamstringsR - previousData.hamstringsR === 0 ? "•" : "▼"} {Math.abs(((data.hamstringsR - previousData.hamstringsR) / previousData.hamstringsR) * 100).toFixed(0)}%</span>
                              <span className="block opacity-75 font-bold text-[6.5px]">({data.hamstringsR - previousData.hamstringsR > 0 ? "+" : ""}{(data.hamstringsR - previousData.hamstringsR).toFixed(1)} kg)</span>
                            </div>
                          )}

                          {/* Current Force (Middle) */}
                          <span className="text-[10px] font-black text-slate-800 block leading-tight">
                            {data.hamstringsR.toFixed(1)} kgf
                          </span>
                          <span className="text-[6.5px] font-black text-slate-400 uppercase block tracking-wider leading-none mt-0.5">
                            Flexão
                          </span>

                          {/* Historical Force (Below Force) */}
                          {previousData && (
                            <span className="text-[7.5px] font-bold text-slate-400 block leading-tight mt-1">
                              Anterior:<br />{previousData.hamstringsR.toFixed(1)} kg
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
 
                  </div>
                </div>
              </div>
          </ReportPage>

          {/* Page 2: Asymmetries and I/Q Ratio */}
          <ReportPage pageNumber={2} totalPages={totalReportPages}>
            <ReportHeader
              title="RELATÓRIO DE FORÇA ISOMÉTRICA"
              subTitle="FADIGA MUSCULAR, ASSIMETRIAS E RAZÃO I/Q"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[{ label: "PÁGINA", value: `02 DE 0${totalReportPages}` }]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-900" />
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest font-bold">
                    Análise Fina de Assimetrias
                  </h4>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center w-full">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                        ASSIMETRIA QUADRÍCEPS
                      </span>
                      <p className="text-[9px] font-black text-slate-500 uppercase font-bold">
                        {asymQuad.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-black italic font-sans ${asymQuad.color}`}>
                          {asymQuad.value}%
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">D/E</span>
                      </div>
                    </div>
                  </div>
                  <SymmetryGauge sideA={data.quadricepsR} sideB={data.quadricepsL} />
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center w-full">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                        ASSIMETRIA ISQUIOTIBIAIS
                      </span>
                      <p className="text-[9px] font-black text-slate-500 uppercase font-bold">
                        {asymHam.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-black italic font-sans ${asymHam.color}`}>
                          {asymHam.value}%
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">D/E</span>
                      </div>
                    </div>
                  </div>
                  <SymmetryGauge sideA={data.hamstringsR} sideB={data.hamstringsL} />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-orange-500" />
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest font-bold">
                    Razão Isquiotibiais/Quadríceps (I/Q)
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col justify-center items-center text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2 font-bold">
                      PERNA DIREITA
                    </span>
                    <span className={`text-3xl font-black italic font-sans ${iqR.color}`}>
                      {iqR.ratio}%
                    </span>
                    <p className={`text-[8px] font-black uppercase mt-1 ${iqR.color}`}>
                      {iqR.status}
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col justify-center items-center text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2 font-bold">
                      PERNA ESQUERDA
                    </span>
                    <span className={`text-3xl font-black italic font-sans ${iqL.color}`}>
                      {iqL.ratio}%
                    </span>
                    <p className={`text-[8px] font-black uppercase mt-1 ${iqL.color}`}>
                      {iqL.status}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-[2rem] text-slate-300">
                  <p className="text-[11px] leading-relaxed italic uppercase font-bold text-white">
                    Equilíbrio ideal: Proporções entre 50-60% reduzem substancialmente o estresse no LCA e o risco geral de estiramentos.
                  </p>
                </div>
              </div>
            </div>
          </ReportPage>

          {/* Page 3: Diagnóstico de Elite & Prescrição */}
          <ReportPage pageNumber={3} totalPages={totalReportPages}>
            <ReportHeader
              title="RELATÓRIO DE FORÇA ISOMÉTRICA"
              subTitle="DIAGNÓSTICO ESPORTIVO E DIRETRIZES DE FORTALECIMENTO"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[{ label: "PÁGINA", value: `03 DE 0${totalReportPages}` }]}
            />

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3.5 font-sans text-slate-800 text-[10.5px]">
              {/* Left Column: Status, Score */}
              <div className="md:col-span-1 space-y-3.5 flex flex-col h-full">
                
                {/* 1. 🔥 STATUS GERAL (RESUMO EXECUTIVO) */}
                <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 relative overflow-hidden shadow-sm">
                  <div className="absolute right-1 top-1 text-orange-500 opacity-20">
                    <Flame className="w-8 h-8" />
                  </div>
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-1.5 flex items-center gap-1 font-bold">
                    🔥 1. Status Geral (Resumo)
                  </h4>
                  <p className="font-medium leading-relaxed text-[10px]">
                    {veredictoResumoStr}
                  </p>
                </div>

                {/* 2. 🎯 SCORE DE PERFORMANCE (0 a 100) */}
                <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-sm flex flex-col items-center text-center">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 font-bold w-full text-left">
                    🎯 2. MIVC Score de Performance
                  </h4>
                  <div className="relative flex items-center justify-center my-1">
                    {/* Ring background */}
                    <div className="w-14 h-14 rounded-full border-4 border-slate-100 flex items-center justify-center bg-slate-50">
                      <span className="text-lg font-black italic text-slate-900">{strengthScore}</span>
                    </div>
                  </div>
                  <div className={`mt-1 text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border ${strengthScoreColor}`}>
                    {strengthScoreClass}
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1.5 leading-relaxed">
                    Pontuação ponderada de Extensores (40%), Flexores (40%) e Simetria Geral (20%).
                  </p>
                </div>

              </div>

              {/* Right Column: Técnico, Co-contração e Plano de Ação */}
              <div className="md:col-span-1 space-y-3.5 flex flex-col h-full">
                
                {/* 3. 📊 INTERPRETAÇÃO TÉCNICA (TREINADOR) */}
                <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-sm space-y-2 flex-grow">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-900 border-b border-slate-100 pb-1 flex items-center gap-1 font-bold">
                     3. Interpretação Técnica
                  </h4>
                  <div>
                    <span className="font-extrabold text-slate-900 block text-[9.5px] uppercase">Déficits de Extensão:</span>
                    <p className="text-slate-600 text-[10px] leading-relaxed mt-0.5">{sStrExcExc}</p>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-900 block text-[9.5px] uppercase">Relação Isquiotibiais / Quadríceps:</span>
                    <p className="text-slate-600 text-[10px] leading-relaxed mt-0.5">{sStrAproveitamentoElastico}</p>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-900 block text-[9.5px] uppercase">Taxa de Recrutamento MIVC:</span>
                    <p className="text-slate-600 text-[10px] leading-relaxed mt-0.5">{sStrFatoresNeuromusculares}</p>
                  </div>
                </div>

                {/* 6. ⚡ ÍNDICE DE EFICIÊNCIA MECÂNICA (IEM) */}
                <div className="bg-emerald-50 text-emerald-950 border border-emerald-100 p-3 rounded-xl shadow-sm">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-emerald-850 mb-1 flex items-center gap-1 font-bold font-sans">
                     6. Índice de Co-contração (IEM)
                  </h4>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[14px] font-black italic">{iemPct}%</span>
                    <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border border-emerald-600/20 ${iemStrColor}`}>{iemStrClass}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[9.5px] mt-1.5">
                    Proximidade da razão I/Q bilateral à zona de proteção articular ideal (60%).
                  </p>
                </div>

                {/* 7. 🚀 PLANO DE AÇÃO (4 SEMANAS) */}
                <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 flex-grow flex flex-col justify-between shadow-sm">
                  <div>
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-1.5 flex items-center gap-1 font-bold">
                       7. Plano de Ação Prescrito
                    </h4>
                    <div className="space-y-1.5">
                      {sStrActionItems.map((ex, idx) => (
                        <div key={idx} className="border-l-2 border-orange-500/50 pl-2">
                          <span className="font-extrabold text-slate-200 text-[10px] block">{idx + 1}. {ex.title}</span>
                          <span className="text-[9px] text-slate-400 leading-normal block">{ex.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </ReportPage>

          {/* Page 4: Curvas de Força-Tempo de Elite (MIVC) */}
          {hasDetailedMetrics && (() => {
            const renderDetailsTable = (details: MuscleAssessmentDetails) => {
              return (
                <div className="overflow-hidden rounded-lg border border-slate-800 bg-black/40 text-[8px] font-sans mt-2">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950 text-slate-500 uppercase font-black text-[7.5px] tracking-wider select-none">
                        <th className="p-1.5">Métrica</th>
                        <th className="p-1.5">@Pico</th>
                        <th className="p-1.5">@100ms</th>
                        <th className="p-1.5">@200ms</th>
                        <th className="p-1.5">@300ms</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      <tr className="hover:bg-slate-900/40">
                        <td className="p-1.5 font-bold text-slate-300 uppercase">Força (KG)</td>
                        <td className="p-1.5 text-slate-200 font-extrabold">{(details.forcePico ?? 0).toFixed(2)}</td>
                        <td className="p-1.5 text-slate-200 font-extrabold">{(details.force100 ?? 0).toFixed(2)}</td>
                        <td className="p-1.5 text-slate-200 font-extrabold">{(details.force200 ?? 0).toFixed(2)}</td>
                        <td className="p-1.5 text-slate-200 font-extrabold">{(details.force300 ?? 0).toFixed(2)}</td>
                      </tr>
                      <tr className="hover:bg-slate-900/40">
                        <td className="p-1.5 font-bold text-slate-300 uppercase">RFD (N/s)</td>
                        <td className="p-1.5 text-slate-200 font-extrabold">{details.rfdPico ?? 0}</td>
                        <td className="p-1.5 text-slate-200 font-extrabold">{details.rfd100 ?? 0}</td>
                        <td className="p-1.5 text-slate-200 font-extrabold">{details.rfd200 ?? 0}</td>
                        <td className="p-1.5 text-slate-200 font-extrabold">{details.rfd300 ?? 0}</td>
                      </tr>
                      <tr className="hover:bg-slate-900/40">
                        <td className="p-1.5 font-bold text-slate-300 uppercase">Impulso (Ns)</td>
                        <td className="p-1.5 text-slate-200 font-extrabold">{(details.impulsePico ?? 0).toFixed(2)}</td>
                        <td className="p-1.5 text-slate-200 font-extrabold">{(details.impulse100 ?? 0).toFixed(2)}</td>
                        <td className="p-1.5 text-slate-200 font-extrabold">{(details.impulse200 ?? 0).toFixed(2)}</td>
                        <td className="p-1.5 text-slate-200 font-extrabold">{(details.impulse300 ?? 0).toFixed(2)}</td>
                      </tr>
                      <tr className="hover:bg-slate-900/40">
                        <td className="p-1.5 font-bold text-slate-300 uppercase">F. Média</td>
                        <td className="p-1.5 text-slate-200 font-extrabold">{(details.forceMeanPico ?? 0).toFixed(2)}</td>
                        <td className="p-1.5 text-slate-200 font-extrabold">{(details.forceMean100 ?? 0).toFixed(2)}</td>
                        <td className="p-1.5 text-slate-200 font-extrabold">{(details.forceMean200 ?? 0).toFixed(2)}</td>
                        <td className="p-1.5 text-slate-200 font-extrabold">{(details.forceMean300 ?? 0).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            };

            return (
              <ReportPage pageNumber={4} totalPages={4}>
                <ReportHeader
                  title="RELATÓRIO DE FORÇA ISOMÉTRICA"
                  subTitle="CURVAS DE FORÇA-TEMPO DE ELITE E TAXA DE DESENVOLVIMENTO (RFD)"
                  athlete={athlete}
                  date={formatDate(data.date)}
                  extraStats={[{ label: "PÁGINA", value: "04 DE 04" }]}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 font-sans text-slate-800">
                  {/* Quadriceps Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 select-none">
                      <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5 font-bold font-sans">
                        🦵 1. Curva de Força - Quadríceps (Extensão)
                      </h4>
                      <span className="text-[8px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Direito vs Esquerdo
                      </span>
                    </div>

                    {/* Dual Line Chart for Quadriceps Force Curve */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm h-[180px]">
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-2 select-none">
                        Curva de Força-Tempo (kgf)
                      </span>
                      <div className="h-[140px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={quadCurveData} margin={{ top: 10, right: 15, left: -20, bottom: -5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="ms" tick={{ fill: "#334155", fontSize: 9, fontWeight: 900 }} />
                            <YAxis tick={{ fill: "#334155", fontSize: 9, fontWeight: 900 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="R" stroke="#10b981" strokeWidth={3} name="Direito (R)" dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="L" stroke="#3b82f6" strokeWidth={3} name="Esquerdo (L)" dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Muscle Details Tables */}
                    <div className="grid grid-cols-1 gap-4">
                      {/* Quadriceps Right */}
                      {data.quadricepsDetailsR && (
                        <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-sm">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                            <span className="text-[9.5px] font-black text-emerald-400 uppercase tracking-wider">
                              MIVC Quadríceps Direito (R)
                            </span>
                            <span className="text-[8px] font-extrabold text-slate-400">Repetições: {data.quadricepsDetailsR.repetitions || 2}</span>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2 py-2.5 text-[8.5px] font-bold text-slate-300 uppercase tracking-wider">
                            <div>
                              <span className="text-slate-500 text-[7px] block">Força Máx</span>
                              <span className="text-white font-black text-[10px]">{data.quadricepsDetailsR.peakForce?.toFixed(1)} kgf</span>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[7px] block">Força/Peso</span>
                              <span className="text-white font-black text-[10px]">{data.quadricepsDetailsR.relativePeakForce?.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[7px] block">Tempo Pico</span>
                              <span className="text-white font-black text-[10px]">{data.quadricepsDetailsR.timeToPeakForce} ms</span>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[7px] block">Força Média</span>
                              <span className="text-white font-black text-[10px]">{data.quadricepsDetailsR.meanForce?.toFixed(1)} kgf</span>
                            </div>
                          </div>

                          {/* Transposed Interval Table */}
                          {renderDetailsTable(data.quadricepsDetailsR)}
                        </div>
                      )}

                      {/* Quadriceps Left */}
                      {data.quadricepsDetailsL && (
                        <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-sm">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                            <span className="text-[9.5px] font-black text-blue-400 uppercase tracking-wider">
                              MIVC Quadríceps Esquerdo (L)
                            </span>
                            <span className="text-[8px] font-extrabold text-slate-400">Repetições: {data.quadricepsDetailsL.repetitions || 2}</span>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2 py-2.5 text-[8.5px] font-bold text-slate-300 uppercase tracking-wider">
                            <div>
                              <span className="text-slate-500 text-[7px] block">Força Máx</span>
                              <span className="text-white font-black text-[10px]">{data.quadricepsDetailsL.peakForce?.toFixed(1)} kgf</span>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[7px] block">Força/Peso</span>
                              <span className="text-white font-black text-[10px]">{data.quadricepsDetailsL.relativePeakForce?.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[7px] block">Tempo Pico</span>
                              <span className="text-white font-black text-[10px]">{data.quadricepsDetailsL.timeToPeakForce} ms</span>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[7px] block">Força Média</span>
                              <span className="text-white font-black text-[10px]">{data.quadricepsDetailsL.meanForce?.toFixed(1)} kgf</span>
                            </div>
                          </div>

                          {/* Transposed Interval Table */}
                          {renderDetailsTable(data.quadricepsDetailsL)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Posterior Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 select-none">
                      <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5 font-bold font-sans">
                        🦵 2. Curva de Força - Isquiotibiais (Flexão)
                      </h4>
                      <span className="text-[8px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Direito vs Esquerdo
                      </span>
                    </div>

                    {/* Dual Line Chart for Hamstrings Force Curve */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm h-[180px]">
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-2 select-none">
                        Curva de Força-Tempo (kgf)
                      </span>
                      <div className="h-[140px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={hamCurveData} margin={{ top: 10, right: 15, left: -20, bottom: -5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="ms" tick={{ fill: "#334155", fontSize: 9, fontWeight: 900 }} />
                            <YAxis tick={{ fill: "#334155", fontSize: 9, fontWeight: 900 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="R" stroke="#eab308" strokeWidth={3} name="Direito (R)" dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="L" stroke="#ec4899" strokeWidth={3} name="Esquerdo (L)" dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Muscle Details Tables */}
                    <div className="grid grid-cols-1 gap-4">
                      {/* Hamstrings Right */}
                      {data.hamstringsDetailsR && (
                        <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-sm">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                            <span className="text-[9.5px] font-black text-yellow-400 uppercase tracking-wider">
                              MIVC Posterior Direito (R)
                            </span>
                            <span className="text-[8px] font-extrabold text-slate-400">Repetições: {data.hamstringsDetailsR.repetitions || 2}</span>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2 py-2.5 text-[8.5px] font-bold text-slate-300 uppercase tracking-wider">
                            <div>
                              <span className="text-slate-500 text-[7px] block">Força Máx</span>
                              <span className="text-white font-black text-[10px]">{data.hamstringsDetailsR.peakForce?.toFixed(1)} kgf</span>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[7px] block">Força/Peso</span>
                              <span className="text-white font-black text-[10px]">{data.hamstringsDetailsR.relativePeakForce?.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[7px] block">Tempo Pico</span>
                              <span className="text-white font-black text-[10px]">{data.hamstringsDetailsR.timeToPeakForce} ms</span>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[7px] block">Força Média</span>
                              <span className="text-white font-black text-[10px]">{data.hamstringsDetailsR.meanForce?.toFixed(1)} kgf</span>
                            </div>
                          </div>

                          {/* Transposed Interval Table */}
                          {renderDetailsTable(data.hamstringsDetailsR)}
                        </div>
                      )}

                      {/* Hamstrings Left */}
                      {data.hamstringsDetailsL && (
                        <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-sm">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                            <span className="text-[9.5px] font-black text-pink-400 uppercase tracking-wider">
                              MIVC Posterior Esquerdo (L)
                            </span>
                            <span className="text-[8px] font-extrabold text-slate-400">Repetições: {data.hamstringsDetailsL.repetitions || 2}</span>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2 py-2.5 text-[8.5px] font-bold text-slate-300 uppercase tracking-wider">
                            <div>
                              <span className="text-slate-500 text-[7px] block">Força Máx</span>
                              <span className="text-white font-black text-[10px]">{data.hamstringsDetailsL.peakForce?.toFixed(1)} kgf</span>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[7px] block">Força/Peso</span>
                              <span className="text-white font-black text-[10px]">{data.hamstringsDetailsL.relativePeakForce?.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[7px] block">Tempo Pico</span>
                              <span className="text-white font-black text-[10px]">{data.hamstringsDetailsL.timeToPeakForce} ms</span>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[7px] block">Força Média</span>
                              <span className="text-white font-black text-[10px]">{data.hamstringsDetailsL.meanForce?.toFixed(1)} kgf</span>
                            </div>
                          </div>

                          {/* Transposed Interval Table */}
                          {renderDetailsTable(data.hamstringsDetailsL)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ReportPage>
            );
          })()}

        </div>

        {/* Buttons Row (Controls) */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 no-print pb-20 px-4 md:px-0 font-sans">
          <button
            onClick={handleExportJpeg}
            className="flex-grow flex items-center justify-center gap-2 bg-brand-primary text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-brand-primary/25 hover:bg-brand-dark transition-all active:scale-95 cursor-pointer font-sans"
          >
            <Download size={20} /> Baixar Páginas (JPEG)
          </button>
          <button
            onClick={handlePrint}
            className="flex-grow flex items-center justify-center gap-2 bg-slate-800 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 cursor-pointer font-sans"
          >
            <Printer size={20} /> Imprimir / PDF
          </button>
          <button
            onClick={onClose}
            className="flex-grow flex items-center justify-center gap-2 bg-slate-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-600 transition-all active:scale-95 cursor-pointer font-sans"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const ImtpReport: FC<{
  athlete: Athlete;
  data: Imtp;
  onClose: () => void;
  history: Imtp[];
  updateAssessment?: (athleteId: string, type: AssessmentType, assessmentId: string, data: any) => Promise<any>;
  setShowImtpReport?: (data: Imtp | null) => void;
}> = ({ athlete, data, onClose, history, updateAssessment, setShowImtpReport }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [includeAiLaudo, setIncludeAiLaudo] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (aiLoading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 6);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [aiLoading]);

  const loadingMessages = [
    "Analisando curva de força dinâmica do IMTP...",
    "Buscando referências na literatura acadêmica (Haff, Stone, James)...",
    "Calculando taxa de desenvolvimento de força (RFD precoce e tardio)...",
    "Avaliando índices de fadiga e eficiência neuromuscular...",
    "Estruturando diretrizes de periodização de 4 a 8 semanas...",
    "Garantindo precisão clínica para os pareceres técnicos..."
  ];

  const handleGenerateImtpAi = async () => {
    if (!updateAssessment || !setShowImtpReport) {
      toast.error("O sistema de persistência não está disponível por enquanto.");
      return;
    }
    setAiLoading(true);
    const toastId = toast.loading("Cientista do Esporte analisando dados de performance...");
    try {
      const result = await generateImtpAiAnalysis(athlete, data, history);
      if (result) {
        const updatedData = {
          ...data,
          aiDetails: result
        };
        await updateAssessment(athlete.id, "imtp", data.id, updatedData);
        setShowImtpReport(updatedData);
        toast.success("Laudo Técnico de Performance gerado com sucesso!", { id: toastId });
      } else {
        toast.error("Erro ao gerar laudo de performance. Verifique as configurações de chave de API.", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro interno ao processar laudo.", { id: toastId });
    } finally {
      setAiLoading(false);
    }
  };

  const handleExportJpeg = async () => {
    if (!reportRef.current) return;
    const toastId = toast.loading("Otimizando layout para exportação...");
    try {
      const pages = reportRef.current.querySelectorAll(".report-page");
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const dataUrl = await toJpeg(page, {
          quality: 1.0,
          backgroundColor: "#FFFFFF",
          pixelRatio: 3,
        });
        const link = document.createElement("a");
        link.download = `relatorio-imtp-${athlete.name.toLowerCase().replace(/\s+/g, "-")}-pag-${i + 1}.jpg`;
        link.href = dataUrl;
        link.click();
        await new Promise((r) => setTimeout(r, 400));
      }
      toast.success("Arquivos gerados com sucesso!", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Falha ao gerar imagens.", { id: toastId });
    }
  };

  const handlePrint = () => {
    triggerPrint();
  };

  // Individualized Neuromuscular Analytics & Contextual Benchmarking
  const athleteAge = calculateAge(athlete.dob);
  const isFemale = athlete.gender === "F";
  const athleteMass = data.weight || athlete.weight || 70;
  const isFutebol = (athlete.modality || "").toLowerCase().includes("futebol") || (athlete.modality || "").toLowerCase().includes("soccer");

  // Historical longitudinal dataset processing
  const sortedHistory = [...history]
    .filter((h) => h.peakForce && h.peakForce > 0)
    .sort((a, b) => getSafeDateTime(a.date) - getSafeDateTime(b.date));

  const previousImtp = sortedHistory
    .filter((h) => h.id !== data.id)
    .slice(-1)[0];

  // Helper for longitudinal delta calculation
  const getLongitudinalDelta = (current: number, previous: number | undefined, lowerIsBetter = false) => {
    if (!previous || previous === 0) return null;
    const diff = current - previous;
    const pct = (diff / previous) * 100;
    const improved = lowerIsBetter ? diff < 0 : diff > 0;
    const sign = diff > 0 ? "+" : "";

    let statusTrend: "positiva" | "estavel" | "atencao" = "estavel";
    if (Math.abs(pct) >= 2.5) {
      statusTrend = improved ? "positiva" : "atencao";
    }

    return {
      diff,
      pct,
      improved,
      text: `${sign}${pct.toFixed(1)}%`,
      trend: statusTrend,
      icon: statusTrend === "positiva" ? "▲" : statusTrend === "atencao" ? "▼" : "➔",
      color: statusTrend === "positiva"
        ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20"
        : statusTrend === "atencao"
        ? "text-red-700 bg-red-500/10 border-red-500/20"
        : "text-amber-700 bg-amber-500/10 border-amber-500/20"
    };
  };

  const peakDelta = getLongitudinalDelta(data.peakForce || 0, previousImtp?.peakForce);
  const relDelta = getLongitudinalDelta(data.relativePeakForce || 0, previousImtp?.relativePeakForce);
  const rfdDelta = getLongitudinalDelta(data.rfdPeak || 0, previousImtp?.rfdPeak);
  const rfd100Delta = getLongitudinalDelta(data.rfd100 || 0, previousImtp?.rfd100);
  const timeDelta = getLongitudinalDelta(data.timeToPeakForce || 0, previousImtp?.timeToPeakForce, true);
  const impulse100Delta = getLongitudinalDelta(data.impulse100 || 0, previousImtp?.impulse100);

  // Semáforos de Desempenho (Traffic Light Indicators)
  const getTrafficLight = (val: number, optMin: number, modMin: number, lowerIsBetter = false) => {
    if (lowerIsBetter) {
      if (val <= optMin) return { status: "VERDE", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30", dot: "🟢", label: "ÓTIMO" };
      if (val <= modMin) return { status: "AMARELO", color: "bg-amber-500/10 text-amber-700 border-amber-500/30", dot: "🟡", label: "ATENÇÃO MODERADA" };
      return { status: "VERMELHO", color: "bg-red-500/10 text-red-700 border-red-500/30", dot: "🔴", label: "PRIORIDADE DE AJUSTE" };
    } else {
      if (val >= optMin) return { status: "VERDE", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30", dot: "🟢", label: "ÓTIMO" };
      if (val >= modMin) return { status: "AMARELO", color: "bg-amber-500/10 text-amber-700 border-amber-500/30", dot: "🟡", label: "ATENÇÃO MODERADA" };
      return { status: "VERMELHO", color: "bg-red-500/10 text-red-700 border-red-500/30", dot: "🔴", label: "PRIORIDADE DE AJUSTE" };
    }
  };

  // Thresholds calibrated by sex and age
  const relOptTarget = isFemale ? 3.0 : 4.0;
  const relModTarget = isFemale ? 2.4 : 3.2;

  const peakLight = getTrafficLight(data.peakForce || 0, isFemale ? 220 : 320, isFemale ? 170 : 250);
  const relLight = getTrafficLight(data.relativePeakForce || 0, relOptTarget, relModTarget);
  const rfd100Light = getTrafficLight(data.rfd100 || 0, 7500, 5000);
  const rfdPeakLight = getTrafficLight(data.rfdPeak || 0, 15000, 10000);
  const timeLight = getTrafficLight(data.timeToPeakForce || 350, 250, 380, true);
  const impulse100Light = getTrafficLight(data.impulse100 || 0, 110, 80);

  // Índice de Prontidão Neuromuscular Individualizado (IPN) 0-100
  const calcIndividualizedReadiness = () => {
    const relVal = data.relativePeakForce || 3.0;
    const relScore = Math.min(100, Math.max(30, (relVal / relOptTarget) * 100));

    const rfd100Val = data.rfd100 || 6000;
    const rfd100Score = Math.min(100, Math.max(30, (rfd100Val / 8000) * 100));

    const timeVal = data.timeToPeakForce || 350;
    const timeScore = Math.min(100, Math.max(30, ((500 - Math.min(500, timeVal)) / 250) * 100));

    const rfdPeakVal = data.rfdPeak || 12000;
    const rfdPeakScore = Math.min(100, Math.max(30, (rfdPeakVal / 16000) * 100));

    // Trend weight bonus/malus
    let trendBonus = 0;
    if (peakDelta?.trend === "positiva") trendBonus += 5;
    if (peakDelta?.trend === "atencao") trendBonus -= 5;
    if (timeDelta?.trend === "positiva") trendBonus += 5;
    if (timeDelta?.trend === "atencao") trendBonus -= 5;

    const baseScore = Math.round(relScore * 0.35 + rfd100Score * 0.25 + timeScore * 0.20 + rfdPeakScore * 0.20 + trendBonus);
    return Math.min(100, Math.max(40, baseScore));
  };

  const ipnScore = calcIndividualizedReadiness();

  // Helper for AI laudo level percent
  const getLevelPercent = (level: string) => {
    const l = (level || "").toLowerCase();
    if (l.includes("elite") || l.includes("excelente") || l.includes("ótimo")) return 100;
    if (l.includes("avançado") || l.includes("forte") || l.includes("bom")) return 80;
    if (l.includes("competitivo") || l.includes("médio") || l.includes("moderado")) return 60;
    if (l.includes("desenvolvimento") || l.includes("atenção")) return 40;
    return 20;
  };

  let ipnStatus = {
    label: "PRONTIDÃO OTIMIZADA",
    subLabel: "Pico Funcional & Resposta Neural Preservada",
    color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    dot: "🟢",
    desc: "Atleta em ótimo estado de facilitação neuromuscular, com capacidade de rápida aplicação de força e curva de produção íntegra."
  };

  if (ipnScore < 65 || (data.timeToPeakForce && data.timeToPeakForce > 400)) {
    ipnStatus = {
      label: "ALTA CARGA DE FADIGA / AJUSTE NECESSÁRIO",
      subLabel: "Atenção ao Gradiente Neural & Fadiga Central",
      color: "bg-red-500/10 text-red-700 border-red-500/30",
      dot: "🔴",
      desc: "Lentidão no tempo para atingir pico de força ou queda na taxa de produção inicial (<100ms). Recomenda-se ajustar volume de treino."
    };
  } else if (ipnScore < 80 || (data.timeToPeakForce && data.timeToPeakForce > 320)) {
    ipnStatus = {
      label: "ESTÁVEL / ATENÇÃO MODERADA",
      subLabel: "Manutenção de Cargas & Otimização do RFD Precoce",
      color: "bg-amber-500/10 text-amber-700 border-amber-500/30",
      dot: "🟡",
      desc: "Perfil de força consistente com oportunidade de aceleração do tempo de disparo contrátil e RFD inicial."
    };
  }

  // Multi-axis Capability Radar Chart Dataset
  const radarData = [
    {
      capability: "Força Absoluta",
      score: Math.min(100, Math.round(((data.peakForce || 200) / (isFemale ? 250 : 380)) * 100)),
      fullMark: 100
    },
    {
      capability: "Força Relativa",
      score: Math.min(100, Math.round(((data.relativePeakForce || 2.5) / relOptTarget) * 100)),
      fullMark: 100
    },
    {
      capability: "RFD 0-100ms",
      score: Math.min(100, Math.round(((data.rfd100 || 5000) / 8000) * 100)),
      fullMark: 100
    },
    {
      capability: "RFD Propulsivo",
      score: Math.min(100, Math.round(((data.rfdPeak || 10000) / 16000) * 100)),
      fullMark: 100
    },
    {
      capability: "Eficiência Contratil",
      score: Math.min(100, Math.round((Math.max(100, 500 - (data.timeToPeakForce || 350)) / 350) * 100)),
      fullMark: 100
    }
  ];

  // Longitudinal dataset for charts (up to last 5 assessments)
  const longitudinalChartData = sortedHistory.slice(-5).map((item) => {
    return {
      date: formatDate(item.date),
      peakForce: item.peakForce || 0,
      relativePeakForce: item.relativePeakForce || 0,
      rfdPeak: item.rfdPeak || 0,
      rfd100: item.rfd100 || 0,
      timeToPeakForce: item.timeToPeakForce || 0,
      impulse100: item.impulse100 || 0
    };
  });

  // Dynamic Movement Impact Analysis
  const movementImpacts = [
    {
      title: "1. ACELERAÇÃO (0-10M)",
      metric: `RFD @ 100ms: ${data.rfd100 || 0} N/s • ${rfd100Light.dot} ${rfd100Light.label}`,
      impact: (data.rfd100 || 0) >= 7000
        ? "Excelente capacidade de decolagem inicial. Permite vencer a inércia e acelerar nos primeiros 3 passos com impulsão vertical-horizontal ótima."
        : "O tempo de reação inicial necessita de estímulos pliométricos curtos. A menor taxa de força a 100ms limita a explosão na partida estática."
    },
    {
      title: "2. SPRINT & VELOCIDADE MÁXIMA",
      metric: `Força Relativa: ${data.relativePeakForce || 0} kgf/kg • ${relLight.dot} ${relLight.label}`,
      impact: (data.relativePeakForce || 0) >= relOptTarget
        ? "Alta rigidez muscular e suporte de peso corporal. Garante tempos de contato extremamente curtos durante a fase de velocidade máxima."
        : "O aumento da relação força/massa corporal otimizará a flutuação no sprint e reduzirá o tempo de suporte com o solo."
    },
    {
      title: "3. MUDANÇA DE DIREÇÃO (COD)",
      metric: `Impulso @ 100ms: ${data.impulse100 || 0} N·s • ${impulse100Light.dot} ${impulse100Light.label}`,
      impact: (data.impulse100 || 0) >= 100
        ? "Notável capacidade de frenagem e re-aceleração. O atleta absorve e redireciona o vetor de força com estabilidade articular superior."
        : "Recomenda-se fortalecer o controle excêntrico unilateral para acelerar o tempo de transição e troca de direção."
    },
    {
      title: "4. SALTO VERTICAL & HORIZONTAL",
      metric: `Pico RFD: ${data.rfdPeak || 0} N/s • ${rfdPeakLight.dot} ${rfdPeakLight.label}`,
      impact: (data.rfdPeak || 0) >= 14000
        ? "Elevado gradiente contrátil para impulsão vertical e decolagens rápidas em disputas aéreas."
        : "O pico de RFD em desenvolvimento indica benefício direto com o método de contraste pesado-leve (potenciação pós-ativação)."
    },
    {
      title: "5. DESACELERAÇÃO & FRENAGEM",
      metric: `Pico Absoluto: ${data.peakForce || 0} kgf • ${peakLight.dot} ${peakLight.label}`,
      impact: (data.peakForce || 0) >= (isFemale ? 200 : 300)
        ? "Capacidade tensional máxima elevada para dissipar grandes cargas de impacto e proteger a cadeia posterior em paradas bruscas."
        : "Aumentar a força isométrica estipula um escudo de proteção mecânica contra sobrecargas ligamentares durante desacelerações."
    },
    {
      title: "6. PREVENÇÃO DE LESÕES & RIGIDEZ TENDÍNEA",
      metric: `Tempo até Pico: ${data.timeToPeakForce || 0} ms • ${timeLight.dot} ${timeLight.label}`,
      impact: (data.timeToPeakForce || 350) <= 300
        ? "Rápida ativação neuromuscular e sincronismo de recrutamento de unidades motoras, minimizando risco de estiramento isquiotibial."
        : "O tempo de reação atinge pico tardio. Priorizar o ciclo de encurtamento-alongamento (CEA) rápido melhora a rigidez do complexo miotendíneo."
    }
  ];

  // Training Action Priorities
  const trainingPriorities = [];
  if ((data.timeToPeakForce || 350) > 320 || (data.rfd100 || 0) < 6500) {
    trainingPriorities.push({
      priority: "PRIORIDADE 1: RFD PRECOCE & CEA RÁPIDO",
      desc: "Saltos pliométricos de baixo tempo de contato (Drop Jumps 30-40cm) e lançamentos balísticos focando no disparo inicial em <100ms."
    });
  } else {
    trainingPriorities.push({
      priority: "PRIORIDADE 1: MANUTENÇÃO DE POTÊNCIA REATIVO-ELÁSTICA",
      desc: "Manter bloco de saltos em profundidade e sprints resistidos curtos com foco na taxa de decolagem."
    });
  }

  if ((data.relativePeakForce || 0) < relOptTarget) {
    trainingPriorities.push({
      priority: "PRIORIDADE 2: FORÇA MÁXIMA RELATIVA & SOBRECARGA ISOMÉTRICA",
      desc: "Agachamento com sobrecarga (80-90% 1RM) e puxadas isométricas IMTP em posição crítica para elevar a força tensional sem ganho excessivo de massa."
    });
  } else {
    trainingPriorities.push({
      priority: "PRIORIDADE 2: MANUTENÇÃO DE FORÇA TENSIONAL MÁXIMA",
      desc: "Treino de força em contraste (Complex Training) combinando agachamento pesado com saltos sem pausa."
    });
  }

  trainingPriorities.push({
    priority: "PRIORIDADE 3: RIGIDEZ TENDÍNEA & CONTROLE EXCÊNTRICO",
    desc: "Aterrissagens unilaterais controladas e agachamento búlgaro com pausa isométrica para reforçar o ligamento patelar e tendão de Aquiles."
  });

  const totalPages = (data.aiDetails && includeAiLaudo) ? 4 : 2;

  return (
    <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-slate-900/95 backdrop-blur-xl overflow-y-auto p-0 md:p-4 no-scrollbar report-modal">
      <div className="max-w-5xl w-full mx-auto md:my-10 h-full md:h-auto font-sans">
        
        {/* Printable/exportable container */}
        <div ref={reportRef} className="print-container bg-slate-100/10 md:bg-transparent">
          
          {/* PAGE 1: PRONTIDÃO NEUROMUSCULAR, RADAR DE CAPACIDADES E EVOLUÇÃO LONGITUDINAL */}
          <ReportPage pageNumber={1} totalPages={totalPages}>
            <ReportHeader
              title="Meio Agachamento Isométrico (IMTP)"
              subTitle="Relatório de Desempenho e Prontidão Neuromuscular"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[
                { label: "PICO DE FORÇA", value: `${data.peakForce || 0} KGF` },
                { label: "PÁGINA", value: `01 DE ${String(totalPages).padStart(2, "0")}` }
              ]}
            />

            {/* Top Grid: Neuromuscular Readiness Index & Capabilities Radar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
              
              {/* Box 1: Prontidão Neuromuscular Badge & Traffic Light */}
              <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl flex flex-col justify-between select-none">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                      INDICADOR DE PRONTIDÃO
                    </span>
                    <span className={`text-[7.5px] font-black px-2 py-0.5 rounded-full border ${ipnStatus.color}`}>
                      {ipnStatus.dot} {ipnStatus.label}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mt-2 mb-1">
                    <span className="text-3xl font-black text-slate-950 italic">{ipnScore}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase">/ 100 PTS</span>
                  </div>

                  <p className="text-[8.5px] font-semibold text-slate-600 uppercase leading-relaxed mt-2 border-t border-slate-200/60 pt-2">
                    {ipnStatus.desc}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200 flex justify-between items-center text-[8px] font-extrabold uppercase text-slate-500">
                  <span>Contexto da Modalidade:</span>
                  <span className="text-slate-900 font-black">{athlete.modality || "Geral"} • {athleteAge} Anos</span>
                </div>
              </div>

              {/* Box 2 & 3: Multi-Axis Capabilities Radar */}
              <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest border-l-2 border-brand-primary pl-2 italic">
                    RADAR DE CAPACIDADES NEUROMUSCULARES (PERFIL INDIVIDUAL)
                  </span>
                  <span className="text-[7.5px] font-bold text-slate-400 uppercase">
                    Escala de Eficiência Contratil (0-100)
                  </span>
                </div>

                <div className="h-[145px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="#cbd5e1" />
                      <PolarAngleAxis
                        dataKey="capability"
                        tick={{ fill: "#0f172a", fontSize: 8, fontWeight: 800 }}
                      />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name="Capacidades"
                        dataKey="score"
                        stroke="#39FF14"
                        fill="#39FF14"
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Middle Grid: Core Metrics with Individualized Traffic Lights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5 select-none font-sans">
              
              {/* Metric 1: Peak Force */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider">Pico Absoluto</span>
                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded border ${peakLight.color}`}>
                      {peakLight.dot} {peakLight.label}
                    </span>
                  </div>
                  <strong className="text-xl font-black text-slate-950 block italic mt-1">
                    {data.peakForce || 0} kgf
                  </strong>
                  <span className="text-[7.5px] text-slate-400 font-medium block">
                    ({Math.round((data.peakForce || 0) * 9.80665)} N)
                  </span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[7px] font-bold text-slate-400 uppercase">Tendência:</span>
                  {peakDelta ? (
                    <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded border ${peakDelta.color}`}>
                      {peakDelta.icon} {peakDelta.text}
                    </span>
                  ) : (
                    <span className="text-[7px] font-bold text-slate-400 uppercase">Baseline</span>
                  )}
                </div>
              </div>

              {/* Metric 2: Relative Peak Force */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider">Força Relativa</span>
                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded border ${relLight.color}`}>
                      {relLight.dot} {relLight.label}
                    </span>
                  </div>
                  <strong className="text-xl font-black text-emerald-600 block italic mt-1">
                    {data.relativePeakForce || 0} kgf/kg
                  </strong>
                  <span className="text-[7.5px] text-slate-400 font-medium block">
                    ({((data.relativePeakForce || 0) * 9.80665).toFixed(1)} N/kg)
                  </span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[7px] font-bold text-slate-400 uppercase">Massa ({athleteMass}kg):</span>
                  {relDelta ? (
                    <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded border ${relDelta.color}`}>
                      {relDelta.icon} {relDelta.text}
                    </span>
                  ) : (
                    <span className="text-[7px] font-bold text-slate-400 uppercase">Baseline</span>
                  )}
                </div>
              </div>

              {/* Metric 3: Time to Peak */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider">Tempo até o Pico</span>
                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded border ${timeLight.color}`}>
                      {timeLight.dot} {timeLight.label}
                    </span>
                  </div>
                  <strong className="text-xl font-black text-slate-900 block italic mt-1">
                    {data.timeToPeakForce || 0} ms
                  </strong>
                  <span className="text-[7.5px] text-slate-400 font-medium block">
                    Velocidade de Reação
                  </span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[7px] font-bold text-slate-400 uppercase">Variação Tempo:</span>
                  {timeDelta ? (
                    <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded border ${timeDelta.color}`}>
                      {timeDelta.icon} {timeDelta.text}
                    </span>
                  ) : (
                    <span className="text-[7px] font-bold text-slate-400 uppercase">Baseline</span>
                  )}
                </div>
              </div>

              {/* Metric 4: RFD 100ms */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider">RFD @ 100ms</span>
                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded border ${rfd100Light.color}`}>
                      {rfd100Light.dot} {rfd100Light.label}
                    </span>
                  </div>
                  <strong className="text-xl font-black text-brand-primary block italic mt-1">
                    {data.rfd100 || 0} N/s
                  </strong>
                  <span className="text-[7.5px] text-slate-400 font-medium block">
                    Explosão Inicial (&lt;100ms)
                  </span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[7px] font-bold text-slate-400 uppercase">Evolução Neural:</span>
                  {rfd100Delta ? (
                    <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded border ${rfd100Delta.color}`}>
                      {rfd100Delta.icon} {rfd100Delta.text}
                    </span>
                  ) : (
                    <span className="text-[7px] font-bold text-slate-400 uppercase">Baseline</span>
                  )}
                </div>
              </div>
            </div>

            {/* Longitudinal Charts Grid */}
            <div className="grid grid-cols-2 gap-5 mb-5">
              
              {/* Longitudinal Chart 1: Peak Force & Relative Force */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl h-[165px] flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <span className="text-[8.5px] font-black text-slate-900 uppercase tracking-wider">
                    EVOLUÇÃO LONGITUDINAL: FORÇA MÁXIMA & RELATIVA
                  </span>
                  <span className="text-[7.5px] font-bold text-slate-400 uppercase">Acompanhamento Temporal</span>
                </div>
                <div className="flex-grow min-h-0 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={longitudinalChartData} margin={{ top: 15, right: 15, left: -20, bottom: -5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#334155", fontSize: 8, fontWeight: 900 }} />
                      <YAxis yAxisId="left" hide domain={['auto', 'auto']} />
                      <YAxis yAxisId="right" orientation="right" hide domain={['auto', 'auto']} />
                      <Line yAxisId="left" type="monotone" dataKey="peakForce" stroke="#39FF14" strokeWidth={2.5}
                        dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          return (
                            <g key={cx}>
                              <circle cx={cx} cy={cy} r={4} fill="#10b981" stroke="#FFF" strokeWidth={1.5} />
                              <text x={cx} y={cy - 8} textAnchor="middle" fill="#0f172a" fontSize={7.5} fontWeight={900}>
                                {payload.peakForce}kgf
                              </text>
                            </g>
                          );
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Longitudinal Chart 2: RFD & Time to Peak */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl h-[165px] flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <span className="text-[8.5px] font-black text-slate-900 uppercase tracking-wider">
                    EVOLUÇÃO LONGITUDINAL: TAXA DE EXPLOSÃO (RFD)
                  </span>
                  <span className="text-[7.5px] font-bold text-slate-400 uppercase">Gradiente de Produção</span>
                </div>
                <div className="flex-grow min-h-0 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={longitudinalChartData} margin={{ top: 15, right: 15, left: -20, bottom: -5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#334155", fontSize: 8, fontWeight: 900 }} />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Line type="monotone" dataKey="rfdPeak" stroke="#0284c7" strokeWidth={2.5}
                        dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          return (
                            <g key={cx}>
                              <circle cx={cx} cy={cy} r={4} fill="#0284c7" stroke="#FFF" strokeWidth={1.5} />
                              <text x={cx} y={cy - 8} textAnchor="middle" fill="#0f172a" fontSize={7.5} fontWeight={900}>
                                {payload.rfdPeak}N/s
                              </text>
                            </g>
                          );
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Bottom Section: Longitudinal Evolution & Individualized Interpretation Table */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <h4 className="text-[9.5px] font-black text-slate-900 uppercase tracking-widest mb-2 border-l-2 border-brand-primary pl-2 italic">
                SÍNTESE DE ACOMPANHAMENTO LONGITUDINAL & HISTÓRICO COMPARATIVO
              </h4>
              
              {previousImtp ? (
                <div className="grid grid-cols-4 gap-3 text-[8px] font-bold text-slate-800 uppercase font-sans">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[7px]">Pico de Força</span>
                    <strong className="text-xs font-black text-slate-950 block">{data.peakForce} kgf</strong>
                    <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-100">
                      <span className="text-slate-400">Anterior: {previousImtp.peakForce}kgf</span>
                      {peakDelta && (
                        <span className={`text-[7px] font-black px-1 rounded ${peakDelta.color}`}>
                          {peakDelta.icon} {peakDelta.text}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[7px]">Força Relativa</span>
                    <strong className="text-xs font-black text-emerald-600 block">{data.relativePeakForce} kgf/kg</strong>
                    <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-100">
                      <span className="text-slate-400">Anterior: {previousImtp.relativePeakForce}x</span>
                      {relDelta && (
                        <span className={`text-[7px] font-black px-1 rounded ${relDelta.color}`}>
                          {relDelta.icon} {relDelta.text}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[7px]">Pico RFD (Explosão)</span>
                    <strong className="text-xs font-black text-slate-950 block">{data.rfdPeak || 0} N/s</strong>
                    <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-100">
                      <span className="text-slate-400">Anterior: {previousImtp.rfdPeak || 0}N/s</span>
                      {rfdDelta && (
                        <span className={`text-[7px] font-black px-1 rounded ${rfdDelta.color}`}>
                          {rfdDelta.icon} {rfdDelta.text}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[7px]">Tempo até o Pico</span>
                    <strong className="text-xs font-black text-slate-950 block">{data.timeToPeakForce || 0} ms</strong>
                    <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-100">
                      <span className="text-slate-400">Anterior: {previousImtp.timeToPeakForce || 0}ms</span>
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
                    <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Primeira avaliação registrada no sistema. Os próximos testes gerarão gráficos longitudinais e delta percentual automático.</span>
                  </div>
                  <span className="text-[7.5px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                    REGISTRO BASELINE DEFINIDO
                  </span>
                </div>
              )}
            </div>
          </ReportPage>

          {/* PAGE 2: IMPACTO NO MOVIMENTO, FASES DA CURVA, PRIORIDADES DE TREINO E METAS % */}
          <ReportPage pageNumber={2} totalPages={totalPages}>
            <ReportHeader
              title="Análise Dinâmica de Força-Tempo e Impulso"
              subTitle="Indicadores de Potência, Reação e Diretrizes de Treinamento"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[
                { label: "PICO RFD", value: `${data.rfdPeak || 0} N/S` },
                { label: "PÁGINA", value: `02 DE ${String(totalPages).padStart(2, "0")}` }
              ]}
            />

            {/* Dynamic Movement Impact Analysis (6 Key Pillars) */}
            <div className="mb-4">
              <h4 className="text-[9.5px] font-black text-slate-900 uppercase tracking-widest mb-2 border-l-2 border-brand-primary pl-2 italic">
                IMPACTO FUNCIONAL E APLICAÇÃO PRÁTICA NOS PADRÕES DE MOVIMENTO
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {movementImpacts.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col justify-between font-sans">
                    <div>
                      <span className="text-[7.5px] font-black text-brand-primary uppercase tracking-wider block mb-0.5">
                        {item.title}
                      </span>
                      <strong className="text-[8.5px] font-extrabold text-slate-900 block mb-1.5 uppercase leading-none">
                        {item.metric}
                      </strong>
                      <p className="text-[8px] font-medium text-slate-600 uppercase leading-relaxed">
                        {item.impact}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Temporal Force-Time Phase Panels with Semáforos */}
            <div className="grid grid-cols-3 gap-3.5 mb-4">
              
              {/* Panel 1: Fase Inicial (0-100ms) */}
              <div className="bg-white border border-slate-200 p-3.5 rounded-xl flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[8px] font-black text-brand-primary uppercase bg-brand-primary/10 px-1.5 py-0.5 rounded leading-none">
                      0 - 100ms
                    </span>
                    <span className="text-[7.5px] font-bold text-slate-400 uppercase">FASE INICIAL CRÍTICA</span>
                  </div>
                  <h5 className="text-[9px] font-black text-slate-950 uppercase mb-1">
                    EXPLOSÃO PURA & DECOLOGEM
                  </h5>
                  <div className="space-y-2 mt-2 font-sans">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-150 flex justify-between items-center">
                      <div>
                        <span className="text-[7px] font-bold text-slate-400 uppercase block">RFD @ 100ms</span>
                        <strong className="text-sm font-black text-slate-950 italic">{data.rfd100 || 0} N/s</strong>
                      </div>
                      <span className={`text-[6.5px] font-black px-1.5 py-0.5 rounded uppercase border ${rfd100Light.color}`}>
                        {rfd100Light.dot} {rfd100Light.label}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-150 flex justify-between items-center">
                      <div>
                        <span className="text-[7px] font-bold text-slate-400 uppercase block">IMPULSO @ 100ms</span>
                        <strong className="text-sm font-black text-slate-950 italic">{data.impulse100 || 0} N·s</strong>
                      </div>
                      <span className={`text-[6.5px] font-black px-1.5 py-0.5 rounded uppercase border ${impulse100Light.color}`}>
                        {impulse100Light.dot} {impulse100Light.label}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[7px] text-slate-400 uppercase italic border-t border-slate-100 pt-1.5 leading-snug">
                  *Crucial para o tempo de decolagem em saltos e primeiras passadas de aceleração linear.
                </p>
              </div>

              {/* Panel 2: Fase Propulsiva (100-200ms) */}
              <div className="bg-white border border-slate-200 p-3.5 rounded-xl flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[8px] font-black text-emerald-600 uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded leading-none">
                      100 - 200ms
                    </span>
                    <span className="text-[7.5px] font-bold text-slate-400 uppercase">FASE PROPULSIVA</span>
                  </div>
                  <h5 className="text-[9px] font-black text-slate-950 uppercase mb-1">
                    POTÊNCIA CONTINUADA
                  </h5>
                  <div className="space-y-2 mt-2 font-sans">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-150 flex justify-between items-center">
                      <div>
                        <span className="text-[7px] font-bold text-slate-400 uppercase block">RFD @ 200ms</span>
                        <strong className="text-sm font-black text-slate-950 italic">{data.rfd200 || 0} N/s</strong>
                      </div>
                      <span className={`text-[6.5px] font-black px-1.5 py-0.5 rounded uppercase border ${(data.rfd200 || 0) >= 10000 ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20" : "text-amber-700 bg-amber-500/10 border-amber-500/20"}`}>
                        {(data.rfd200 || 0) >= 10000 ? "🟢 ÓTIMO" : "🟡 MODERADO"}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-150 flex justify-between items-center">
                      <div>
                        <span className="text-[7px] font-bold text-slate-400 uppercase block">IMPULSO @ 200ms</span>
                        <strong className="text-sm font-black text-slate-950 italic">{data.impulse200 || 0} N·s</strong>
                      </div>
                      <span className={`text-[6.5px] font-black px-1.5 py-0.5 rounded uppercase border ${(data.impulse200 || 0) >= 200 ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20" : "text-amber-700 bg-amber-500/10 border-amber-500/20"}`}>
                        {(data.impulse200 || 0) >= 200 ? "🟢 ÓTIMO" : "🟡 MODERADO"}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[7px] text-slate-400 uppercase italic border-t border-slate-100 pt-1.5 leading-snug">
                  *Determina a magnitude de empuxo continuado na passada de corrida e impulso vertical.
                </p>
              </div>

              {/* Panel 3: Pico Neuromuscular Absoluto */}
              <div className="bg-white border border-slate-200 p-3.5 rounded-xl flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[8px] font-black text-purple-600 uppercase bg-purple-500/10 px-1.5 py-0.5 rounded leading-none">
                      PICO GERAL
                    </span>
                    <span className="text-[7.5px] font-bold text-slate-400 uppercase">CAPACIDADE MÁXIMA</span>
                  </div>
                  <h5 className="text-[9px] font-black text-slate-950 uppercase mb-1">
                    POTENCIAL TENSIONAL BRUTO
                  </h5>
                  <div className="space-y-2 mt-2 font-sans">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-150 flex justify-between items-center">
                      <div>
                        <span className="text-[7px] font-bold text-slate-400 uppercase block">PICO RFD</span>
                        <strong className="text-sm font-black text-slate-950 italic">{data.rfdPeak || 0} N/s</strong>
                      </div>
                      <span className={`text-[6.5px] font-black px-1.5 py-0.5 rounded uppercase border ${rfdPeakLight.color}`}>
                        {rfdPeakLight.dot} {rfdPeakLight.label}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-150 flex justify-between items-center">
                      <div>
                        <span className="text-[7px] font-bold text-slate-400 uppercase block">IMPULSO DE PICO</span>
                        <strong className="text-sm font-black text-slate-950 italic">{data.impulsePeak || 0} N·s</strong>
                      </div>
                      <span className={`text-[6.5px] font-black px-1.5 py-0.5 rounded uppercase border ${(data.impulsePeak || 0) >= 400 ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20" : "text-amber-700 bg-amber-500/10 border-amber-500/20"}`}>
                        {(data.impulsePeak || 0) >= 400 ? "🟢 ÓTIMO" : "🟡 MODERADO"}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[7px] text-slate-400 uppercase italic border-t border-slate-100 pt-1.5 leading-snug">
                  *Reflete o recrutamento máximo de unidades motoras e força de sustentação isométrica.
                </p>
              </div>
            </div>

            {/* Practical Action Priorities */}
            <div className="p-4 rounded-2xl mb-4 bg-slate-50 border border-slate-200 select-none">
              <h4 className="text-[9.5px] font-black text-slate-900 uppercase tracking-widest mb-2.5 border-l-2 border-brand-primary pl-2 italic">
                PRIORIDADES DE TREINAMENTO E PRESCRIÇÃO INDIVIDUALIZADA
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-sans">
                {trainingPriorities.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[7px] font-black text-brand-primary uppercase tracking-wider block mb-1">
                        DIRETRIZ {idx + 1}
                      </span>
                      <strong className="text-[9px] font-black text-slate-950 uppercase italic block leading-snug mb-1.5">
                        {item.priority}
                      </strong>
                      <p className="text-[8px] font-semibold text-slate-600 uppercase leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Individualized Percentage Evolution Goals (% Metas) */}
            <div className="bg-slate-950 text-white rounded-2xl p-4.5 select-none font-sans flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="w-full md:w-auto">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#39FF14] animate-ping" />
                  <p className="text-[8px] font-black tracking-widest text-[#39FF14] uppercase">
                    METAS INDIVIDUALIZADAS POR EVOLUÇÃO PERCENTUAL (PRÓXIMO CICLO)
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 mt-2">
                  <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
                    <span className="text-[7px] text-slate-400 block uppercase font-bold font-mono">Pico de Força Alvo</span>
                    <strong className="text-sm font-black text-[#39FF14] italic block mt-0.5">
                      {Math.round((data.peakForce || 200) * 1.05)} - {Math.round((data.peakForce || 200) * 1.08)} KGF
                    </strong>
                    <span className="text-[6.5px] text-slate-400 block mt-0.5 font-bold font-mono">(+5.0% a +8.0% de Evolução)</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
                    <span className="text-[7px] text-slate-400 block uppercase font-bold font-mono">Pico RFD Desejável</span>
                    <strong className="text-sm font-black text-[#39FF14] italic block mt-0.5">
                      {Math.round((data.rfdPeak || 10000) * 1.08)} - {Math.round((data.rfdPeak || 10000) * 1.12)} N/S
                    </strong>
                    <span className="text-[6.5px] text-slate-400 block mt-0.5 font-bold font-mono">(+8.0% a +12.0% de Explosão)</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center col-span-2 sm:col-span-1">
                    <span className="text-[7px] text-slate-400 block uppercase font-bold font-mono">Otimização Tempo de Reação</span>
                    <strong className="text-sm font-black text-brand-primary italic block mt-0.5">
                      &lt; {Math.round((data.timeToPeakForce || 350) * 0.90)} MS
                    </strong>
                    <span className="text-[6.5px] text-slate-400 block mt-0.5 font-bold font-mono">(-10.0% de Tempo Contratil)</span>
                  </div>
                </div>
              </div>

              <div className="text-left md:text-right border-t md:border-t-0 border-slate-800 pt-3 md:pt-0 w-full md:w-auto flex flex-col shrink-0">
                <span className="text-[8px] font-black text-slate-400 block uppercase tracking-wider leading-none">BLOCO DE PERIODIZAÇÃO RECOMENDADO</span>
                <strong className="text-xs font-black italic text-brand-primary uppercase tracking-tight mt-1">6 A 8 SEMANAS DE INTERVENÇÃO</strong>
                <span className="text-[7px] text-slate-500 uppercase mt-0.5 leading-normal">Foco em treinamento pliométrico e contrastes excêntricos-isométricos.</span>
              </div>
            </div>
          </ReportPage>

          {/* Page 3: Scientific Neuromuscular Report - Part 1 (Rendered only if AI details exist) */}
          {data.aiDetails && includeAiLaudo && (
            <ReportPage pageNumber={3} totalPages={totalPages}>
              <ReportHeader
                title="Parecer e Diagnóstico Científico de Performance"
                subTitle="Laudo Biomecânico Coordenado por Análise de Performance"
                athlete={athlete}
                date={formatDate(data.date)}
                extraStats={[
                  { label: "LAUDO GERADO", value: "DE ACORDO COM A LITERATURA" },
                  { label: "PÁGINA", value: `03 DE ${String(totalPages).padStart(2, "0")}` }
                ]}
              />

              <div className="grid grid-cols-3 gap-4 mb-4 select-none">
                {/* Gauge Panel: Classification Scale */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <h5 className="text-[9px] font-black tracking-widest text-slate-800 uppercase mb-2 border-l border-brand-primary pl-1 italic">
                      MÉTRICAS CLASSIFICADAS
                    </h5>
                    <div className="space-y-3 font-sans">
                      {/* metric 1 */}
                      <div>
                        <div className="flex justify-between items-center text-[8px] font-black uppercase mb-1">
                          <span className="text-slate-500">Pico de Força Absoluto</span>
                          <span className="text-brand-primary italic">
                            {data.aiDetails.classification.peakForceClass}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                          <div className="bg-brand-primary h-full transition-all duration-1000" style={{ width: `${getLevelPercent(data.aiDetails.classification.peakForceClass)}%` }}></div>
                        </div>
                      </div>
                      {/* metric 2 */}
                      <div>
                        <div className="flex justify-between items-center text-[8px] font-black uppercase mb-1">
                          <span className="text-slate-500">Força Relativa (kgf/kg)</span>
                          <span className="text-emerald-500 italic">
                            {data.aiDetails.classification.relativeForceClass}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${getLevelPercent(data.aiDetails.classification.relativeForceClass)}%` }}></div>
                        </div>
                      </div>
                      {/* metric 3 */}
                      <div>
                        <div className="flex justify-between items-center text-[8px] font-black uppercase mb-1">
                          <span className="text-slate-500">RFD (Explosividade)</span>
                          <span className="text-teal-500 italic">
                            {data.aiDetails.classification.rfdClass}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                          <div className="bg-teal-500 h-full transition-all duration-1000" style={{ width: `${getLevelPercent(data.aiDetails.classification.rfdClass)}%` }}></div>
                        </div>
                      </div>
                      {/* metric 4 */}
                      <div>
                        <div className="flex justify-between items-center text-[8px] font-black uppercase mb-1">
                          <span className="text-slate-500">Eficiência de Força Média/Pico</span>
                          <span className="text-yellow-600 italic font-black">
                            {data.aiDetails.classification.efficiencyClass}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                          <div className="bg-yellow-500 h-full transition-all duration-1000" style={{ width: `${getLevelPercent(data.aiDetails.classification.efficiencyClass)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-2.5 mt-2 text-[7.5px] font-medium text-slate-500 uppercase leading-snug">
                    Normas ajustadas para modalidade de <span className="font-extrabold text-slate-800">{athlete.modality.toUpperCase()}</span> ({athlete.gender === "M" ? "MASCULINO" : "FEMININO"}).
                  </div>
                </div>

                {/* Literary Benchmarks citation */}
                <div className="col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <h5 className="text-[9px] font-black tracking-widest text-[#0c1322] uppercase mb-1.5 border-l border-brand-primary pl-1 italic">
                      BENCHMARKS ESPECÍFICOS & METODOLOGIA DA LITERATURA
                    </h5>
                    <p className="text-[9.5px] leading-relaxed uppercase font-bold text-slate-700 italic select-text">
                      {data.aiDetails.benchmarks}
                    </p>
                  </div>
                  <p className="text-[7.5px] font-medium text-slate-400 uppercase leading-none mt-2">
                    Citações de acordo com diretrizes IOC, NSCA, Haff et al., Stone et al.
                  </p>
                </div>
              </div>

              {/* Technical Diagnosis */}
              <div className="bg-slate-900 text-white rounded-xl p-4 mb-4 select-text font-sans">
                <h5 className="text-[9px] font-black tracking-widest text-brand-primary uppercase mb-2 border-l border-brand-primary pl-1 italic">
                  DIAGNÓSTICO NEUROMUSCULAR TÉCNICO
                </h5>
                <p className="text-[9.5px] md:text-[10px] text-slate-200 leading-relaxed font-semibold uppercase">
                  {data.aiDetails.diagnostico}
                </p>
              </div>

              {/* Linguistic Split View: Coach vs Athlete Side-by-Side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 text-white rounded-xl p-4 select-text">
                  <h6 className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 font-mono">
                    VERBO DE COMISSÃO DE PERFORMANCE (TÉCNICO)
                  </h6>
                  <p className="text-[9px] leading-relaxed uppercase font-semibold text-slate-300">
                    {data.aiDetails.versionTechnical}
                  </p>
                </div>
                <div className="bg-brand-primary/5 border border-brand-primary/20 text-slate-900 rounded-xl p-4 select-text">
                  <h6 className="text-[8px] font-black text-brand-primary uppercase tracking-widest leading-none mb-1.5 font-mono">
                    TRADUÇÃO PARA O ATLETA (ACESSÍVEL)
                  </h6>
                  <p className="text-[9px] leading-relaxed uppercase font-semibold text-slate-800 italic">
                    {data.aiDetails.versionAthlete}
                  </p>
                </div>
              </div>
            </ReportPage>
          )}

          {/* Page 4: Scientific Neuromuscular Report - Part 2 (Rendered only if AI details exist) */}
          {data.aiDetails && includeAiLaudo && (
            <ReportPage pageNumber={4} totalPages={totalPages}>
              <ReportHeader
                title="Parecer e Diagnóstico Científico de Performance"
                subTitle="Diretrizes de Intervenção e Projeções de Elite"
                athlete={athlete}
                date={formatDate(data.date)}
                extraStats={[
                  { label: "DIRETRIZES DE TREINO", value: "INTERVENÇÕES PREVENTIVAS" },
                  { label: "PÁGINA", value: `04 DE ${String(totalPages).padStart(2, "0")}` }
                ]}
              />

              {/* Dynamic Priorities 3-Column training plan layout */}
              <div className="grid grid-cols-3 gap-3.5 mb-6 select-none">
                {data.aiDetails.priorities.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="text-[7.5px] font-black text-brand-primary uppercase tracking-wider block">PRIORIDADE {idx + 1}</span>
                      <strong className="text-xs font-black text-slate-950 uppercase italic leading-none block mt-1 pb-1.5 border-b border-slate-200">
                        {item.title}
                      </strong>
                      <div className="text-[8.5px] space-y-1.5 mt-2 text-slate-700 leading-relaxed uppercase">
                        <div>
                          <span className="font-extrabold text-slate-405 block text-[7px] text-slate-500">MÉTODO</span>
                          <span className="font-black text-slate-900">{item.method}</span>
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-405 block text-[7px] text-slate-500">CÁLCULO E PARÂMETROS DE CARGA</span>
                          <span className="font-semibold text-slate-800">{item.parameters}</span>
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-405 block text-[7px] text-slate-500">EXERCÍCIOS ESPECÍFICOS</span>
                          <span className="font-semibold text-slate-800">{item.exercises}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-200/50 p-1.5 rounded mt-3.5 text-center">
                      <span className="font-extrabold block text-[6.5px] text-slate-500 tracking-wider">KPI REAVALIAÇÃO</span>
                      <span className="text-[8.5px] font-black text-slate-900 italic block mt-0.5 uppercase">{item.kpi}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Future Projections Timeline */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 animate-in">
                <h5 className="text-[9px] font-black tracking-widest text-[#0c1322] uppercase mb-4 border-l border-brand-primary pl-1 italic select-none">
                  PROJEÇÕES DE EVOLUÇÃO PREDITIVAS
                </h5>
                <div className="grid grid-cols-3 gap-3 text-center text-xs select-none">
                  {/* Phase 1 */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[7.5px] font-black tracking-widest text-slate-400 uppercase">8 SEMANAS</span>
                    <span className="text-[10px] font-black text-slate-900 uppercase block leading-normal mt-1 italic">
                      {data.aiDetails.projections.shortTerm}
                    </span>
                  </div>
                  {/* Phase 2 */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[7.5px] font-black tracking-widest text-emerald-600 uppercase">6 MESES</span>
                    <span className="text-[10px] font-black text-slate-900 uppercase block leading-normal mt-1 italic">
                      {data.aiDetails.projections.mediumTerm}
                    </span>
                  </div>
                  {/* Phase 3 */}
                  <div className="bg-slate-900 text-white p-2.5 rounded-lg">
                    <span className="text-[7.5px] font-black tracking-widest text-[#39FF14] uppercase">ELITE MÁXIMA</span>
                    <span className="text-[10px] font-black text-brand-primary uppercase block leading-normal mt-1 italic">
                      {data.aiDetails.projections.longTerm}
                    </span>
                  </div>
                </div>
              </div>

              {/* No-print reset option */}
              <div className="flex justify-end p-0 mt-2 select-none no-print">
                <button
                  onClick={handleGenerateImtpAi}
                  className="text-[9px] font-black text-slate-400 hover:text-slate-700 transition-all flex items-center gap-1 uppercase tracking-wider"
                >
                  <RefreshCw size={10} /> Recriar Análise de Performance
                </button>
              </div>
            </ReportPage>
          )}

        </div>

        {/* Buttons Row (Controls) */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 no-print pb-20 px-4 md:px-0 font-sans select-none justify-between items-center w-full">
          <div className="flex gap-4 w-full sm:w-auto">
            <button
              onClick={handleExportJpeg}
              className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 bg-brand-primary text-white py-4 px-6 rounded-xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-brand-primary/25 hover:bg-brand-dark transition-all active:scale-95 cursor-pointer font-sans"
            >
              <Download size={20} /> Baixar Páginas (JPEG)
            </button>
            <button
              onClick={handlePrint}
              className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 bg-slate-800 text-white py-4 px-6 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 cursor-pointer font-sans"
            >
              <Printer size={20} /> Imprimir / PDF
            </button>
          </div>

          <div className="flex gap-4 w-full sm:w-auto mt-4 sm:mt-0">
            {updateAssessment && setShowImtpReport && (
              data.aiDetails ? (
                <button
                  onClick={() => setIncludeAiLaudo(!includeAiLaudo)}
                  className={`flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 cursor-pointer font-sans ${
                    includeAiLaudo
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  }`}
                >
                  <Sparkles size={18} />
                  {includeAiLaudo ? "Ocultar Laudo IA (-)" : "Anexar Laudo IA (+)"}
                </button>
              ) : (
                <button
                  onClick={async () => {
                    await handleGenerateImtpAi();
                    setIncludeAiLaudo(true);
                  }}
                  disabled={aiLoading}
                  className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-4 px-6 rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 cursor-pointer font-sans disabled:opacity-50"
                >
                  {aiLoading ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  {aiLoading ? "Gerando Análise..." : "Laudo de Performance Completo"}
                </button>
              )
            )}
            <button
              onClick={onClose}
              className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 bg-slate-700 text-white py-4 px-6 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-600 transition-all active:scale-95 cursor-pointer font-sans"
            >
              Fechar
            </button>
          </div>
        </div>

        {/* AI Loading modal spinner overlay */}
        {aiLoading && (
          <div className="fixed inset-0 z-[1200] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md text-white px-6 text-center">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-l-brand-primary border-t-brand-primary rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={32} className="text-brand-primary animate-pulse" />
              </div>
            </div>
            
            <h3 className="text-lg font-black tracking-tight uppercase italic text-brand-primary animate-pulse">
              Processador de Performance Ativo
            </h3>
            
            <p className="text-xs font-bold text-slate-450 uppercase tracking-widest max-w-sm mt-3 h-8 text-slate-300">
              {loadingMessages[loadingStep]}
            </p>

            <div className="w-48 bg-slate-800 h-1 rounded-full overflow-hidden mt-6">
              <div className="bg-brand-primary h-full transition-all duration-300" style={{ width: `${(loadingStep + 1) * 16.6}%` }}></div>
            </div>
            
            <span className="text-[8px] font-black text-slate-500 uppercase mt-2 tracking-[0.3em]">
              LB HUB - Elite Performance Labs
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const getComparison = (current: number | undefined, previous: number | undefined, unit: string, inverse = false) => {
  if (current === undefined) return null;
  if (previous === undefined || previous === null || previous === 0) return null;
  const diff = current - previous;
  const percent = (diff / previous) * 100;
  const isPositive = diff > 0;
  const isGood = inverse ? !isPositive : isPositive;
  const sign = diff > 0 ? "+" : "";
  return {
    diffVal: `${sign}${diff.toFixed(1)} ${unit}`,
    diffPercent: `${sign}${percent.toFixed(1)}%`,
    prevText: `${previous.toFixed(1)} ${unit}`,
    isGood,
    isPositive,
    color: isGood ? "text-emerald-650" : "text-rose-600",
    bg: isGood ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100",
    icon: isPositive ? "↑" : diff < 0 ? "↓" : "•"
  };
};

const BarIndicator = ({ label, current, minNormal, maxNormal, unit, prevVal, inverse = false }: any) => {
  const minVal = Math.min(minNormal * 0.5, current * 0.8);
  const maxVal = Math.max(maxNormal * 1.5, current * 1.15);
  const range = maxVal - minVal;
  
  const normalStartPct = ((minNormal - minVal) / range) * 100;
  const normalEndPct = ((maxNormal - minVal) / range) * 100;
  
  const currentPct = Math.max(1, Math.min(99, ((current - minVal) / range) * 100));
  
  let classification = "Normal";
  let colorClass = "text-emerald-650 bg-emerald-500";
  if (current < minNormal) {
    classification = "Abaixo";
    colorClass = "text-amber-600 bg-amber-500";
  } else if (current > maxNormal) {
    classification = inverse ? "Alto" : "Excelente";
    colorClass = inverse ? "text-rose-600 bg-rose-500" : "text-emerald-650 bg-emerald-500";
  }
  
  const comp = getComparison(current, prevVal, unit, inverse);

  return (
    <div className="space-y-1 bg-white p-3 rounded-2xl border border-slate-100/90 shadow-xs">
      <div className="flex justify-between items-baseline">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-750">{label}</span>
          {comp && (
            <span className="text-[8.5px] text-slate-400 font-medium leading-none mt-0.5">
              Anterior: <span className="font-bold text-slate-550">{comp.prevText}</span>
              <span className={`ml-1.5 font-extrabold ${comp.color}`}>
                ({comp.diffVal} | {comp.diffPercent} {comp.icon})
              </span>
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-sm font-black text-slate-900 italic">{current.toFixed(1)}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase">{unit}</span>
          <span className={`text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded ml-2 ${colorClass} bg-opacity-10 ${colorClass.replace("bg-", "text-")}`}>
            {classification}
          </span>
        </div>
      </div>
      
      <div className="relative h-4.5 bg-slate-100 rounded-md flex text-[7px] font-bold">
        <div className="h-full bg-amber-100/30 flex items-center justify-center text-amber-600/70 uppercase tracking-widest rounded-l-md" style={{ width: `${normalStartPct}%` }}>
          Abaixo
        </div>
        <div className="h-full bg-emerald-50/50 border-x border-slate-200/50 flex items-center justify-center text-emerald-650 uppercase tracking-widest" style={{ width: `${normalEndPct - normalStartPct}%` }}>
          Normal
        </div>
        <div className="h-full bg-rose-50/20 flex items-center justify-center text-rose-500/70 uppercase tracking-widest rounded-r-md" style={{ width: `${100 - normalEndPct}%` }}>
          Alto
        </div>
        
        <div 
          className="absolute top-0 bottom-0 w-1 bg-slate-800 shadow-sm -translate-x-1/2"
          style={{ left: `${currentPct}%` }}
        >
          <div className="absolute -top-0.5 -left-1 w-3 h-3 rounded-full bg-slate-800 flex items-center justify-center text-white text-[5px]">
            ▲
          </div>
        </div>
      </div>
      
      <div className="flex justify-between text-[7px] font-bold text-slate-400 uppercase tracking-wider">
        <span>Mín Normal: {minNormal.toFixed(1)} {unit}</span>
        <span>Máx Normal: {maxNormal.toFixed(1)} {unit}</span>
      </div>
    </div>
  );
};

const DiagnosticRow = ({ label, current, prev, unit, normalRange, inverse = false }: any) => {
  const comp = getComparison(current, prev, unit, inverse);
  return (
    <div className="grid grid-cols-4 items-center py-2.5 border-b border-slate-100 last:border-0 font-sans">
      <div className="col-span-1.5 pr-2">
        <span className="text-[9.5px] font-black text-slate-800 uppercase tracking-wider block">
          {label}
        </span>
        <span className="text-[7.5px] text-slate-400 font-bold uppercase block leading-none">
          Faixa: {normalRange}
        </span>
      </div>
      <div className="col-span-1 flex flex-col justify-center font-sans">
        <span className="text-xs font-black text-slate-900 italic font-sans">
          {current ? current.toFixed(1) : "0.0"}{" "}
          <span className="text-[8px] font-bold text-slate-450 uppercase font-sans">{unit}</span>
        </span>
      </div>
      <div className="col-span-1 flex flex-col justify-center font-sans">
        {prev !== undefined && prev !== null ? (
          <span className="text-[10.5px] font-bold text-slate-500 italic font-sans">
            {prev.toFixed(1)}{" "}
            <span className="text-[7px] text-slate-400 uppercase font-sans">{unit}</span>
          </span>
        ) : (
          <span className="text-xs text-slate-350 italic font-sans">-</span>
        )}
      </div>
      <div className="col-span-0.5 flex flex-col items-end">
        {comp ? (
          <span className={`text-[7.5px] font-extrabold uppercase px-2 py-0.5 rounded-full ${comp.bg}`}>
            {comp.diffVal}
          </span>
        ) : (
          <span className="text-[10px] text-slate-300 italic">-</span>
        )}
      </div>
    </div>
  );
};

const VisualSegmentedFigure = ({ title, sub, values, classifications }: any) => {
  return (
    <div className="relative border border-slate-150 rounded-2xl p-4 bg-slate-50/50 flex flex-col items-center h-full shadow-xs">
      <div className="text-center mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 block leading-tight">{title}</span>
        <span className="text-[7px] font-bold text-slate-450 uppercase tracking-widest">{sub}</span>
      </div>
      
      <div className="grid grid-cols-3 gap-x-2 items-center w-full relative">
        <div className="absolute top-0 left-0 text-[7px] font-extrabold text-slate-400 uppercase tracking-widest">Esquerdo(a)</div>
        <div className="absolute top-0 right-0 text-[7px] font-extrabold text-slate-400 uppercase tracking-widest text-right">Direito(a)</div>

        {/* Left Arm (Esquerdo) */}
        <div className="text-left mt-5 flex flex-col justify-center border-b border-dashed border-slate-200 pb-2">
          <span className="text-[8px] text-slate-450 uppercase font-bold">Braço E</span>
          <span className="text-xs font-black text-slate-800 leading-tight">{values.armL}</span>
          <span className={`text-[6.5px] font-black uppercase px-1 py-0.5 rounded mt-1 w-fit leading-none ${classifications.armL.color}`}>
            {classifications.armL.label}
          </span>
        </div>
        
        {/* SVG Human body (Center spanning rows) */}
        <div className="row-span-3 flex justify-center items-center py-2 relative">
           <svg viewBox="0 0 100 150" className="w-14 h-32 text-slate-350 fill-current opacity-70">
             <circle cx="50" cy="18" r="8" className="fill-slate-350 stroke-slate-400/30 stroke-1" />
             <path d="M42,30 L58,30 L62,80 L38,80 Z" className="fill-slate-100 stroke-slate-350 stroke-[1.5]" />
             <path d="M35,32 L28,70 L32,70 L38,36 Z" className="fill-slate-150 stroke-slate-300 stroke-1" />
             <path d="M65,32 L72,70 L68,70 L62,36 Z" className="fill-slate-150 stroke-slate-300 stroke-1" />
             <path d="M41,81 L36,135 L42,135 L46,84 Z" className="fill-slate-150 stroke-slate-300 stroke-1" />
             <path d="M59,81 L64,135 L58,135 L54,84 Z" className="fill-slate-150 stroke-slate-300 stroke-1" />
           </svg>
           
           <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
             <span className="text-[6.5px] font-black text-slate-400 uppercase tracking-wider leading-none">Tronco</span>
             <span className="text-[10px] font-black text-slate-800 leading-tight">{values.trunk}</span>
             <span className={`text-[6px] font-black uppercase px-1 rounded scale-90 ${classifications.trunk.color}`}>
               {classifications.trunk.label}
             </span>
           </div>
        </div>
        
        {/* Right Arm (Direito) */}
        <div className="text-right mt-5 flex flex-col items-end justify-center border-b border-dashed border-slate-200 pb-2">
          <span className="text-[8px] text-slate-450 uppercase font-bold">Braço D</span>
          <span className="text-xs font-black text-slate-800 leading-tight">{values.armR}</span>
          <span className={`text-[6.5px] font-black uppercase px-1 py-0.5 rounded mt-1 w-fit leading-none ${classifications.armR.color}`}>
            {classifications.armR.label}
          </span>
        </div>

        {/* Row 2 Buffer */}
        <div className="h-8"></div>
        <div className="h-8"></div>

        {/* Left Leg (Esquerdo) */}
        <div className="text-left mb-3 flex flex-col justify-center border-t border-dashed border-slate-200 pt-2">
          <span className="text-[8px] text-slate-450 uppercase font-bold">Perna E</span>
          <span className="text-xs font-black text-slate-800 leading-tight">{values.legL}</span>
          <span className={`text-[6.5px] font-black uppercase px-1 py-0.5 rounded mt-1 w-fit leading-none ${classifications.legL.color}`}>
            {classifications.legL.label}
          </span>
        </div>
        
        {/* Right Leg (Direito) */}
        <div className="text-right mb-3 flex flex-col items-end justify-center border-t border-dashed border-slate-200 pt-2">
          <span className="text-[8px] text-slate-450 uppercase font-bold">Perna D</span>
          <span className="text-xs font-black text-slate-800 leading-tight">{values.armR ? values.legR : values.legR}</span>
          <span className={`text-[6.5px] font-black uppercase px-1 py-0.5 rounded mt-1 w-fit leading-none ${classifications.legR.color}`}>
            {classifications.legR.label}
          </span>
        </div>
      </div>
    </div>
  );
};

const BioimpedanceReport: FC<{
  athlete: Athlete;
  data: Bioimpedance;
  onClose: () => void;
  history: Bioimpedance[];
}> = ({ athlete, data, onClose, history }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const previousData = getPreviousAssessment(data, history);

  // Sports Science calculations & custom models
  const sGender = athlete.gender;
  const sAge = calculateAge(athlete.dob);
  const sWeight = data.weight || 0;
  const sFatPct = data.fatPercentage || 0;
  const sMuscle = data.muscleMass || 0;
  const sWater = data.hydration || 0;
  const sBones = data.boneMass || 0;
  const sVisceral = data.visceralFat || 0;
  const sTmb = data.basalMetabolism || 0;
  const sIdadeMetabolica = data.metabolicAge || 0;

  const isMale = sGender === "M";
  const heightM = (athlete.height || 175) / 100;
  const minWeight = 18.5 * heightM * heightM;
  const maxWeight = 24.9 * heightM * heightM;
  const minMme = minWeight * (isMale ? 0.35 : 0.28);
  const maxMme = maxWeight * (isMale ? 0.45 : 0.36);
  const minFatKg = minWeight * (isMale ? 0.10 : 0.18);
  const maxFatKg = maxWeight * (isMale ? 0.20 : 0.28);
  const currentFatKg = sWeight * (sFatPct / 100);
  const previousFatKg = previousData ? (previousData.weight || 0) * ((previousData.fatPercentage || 0) / 100) : undefined;
  const currentMlg = sWeight - currentFatKg;
  const previousMlg = previousData ? (previousData.weight || 0) - (previousData.weight || 0) * ((previousData.fatPercentage || 0) / 100) : undefined;
  const currentImc = sWeight / (heightM * heightM);
  const previousImc = previousData ? (previousData.weight || 0) / (heightM * heightM) : undefined;

  const mArmR = data.muscleArmR || 0;
  const mArmL = data.muscleArmL || 0;
  const mLegR = data.muscleLegR || 0;
  const mLegL = data.muscleLegL || 0;
  const mTrunk = data.muscleTrunk || 0;

  const fArmR = data.fatArmR || 0;
  const fArmL = data.fatArmL || 0;
  const fLegR = data.fatLegR || 0;
  const fLegL = data.fatLegL || 0;
  const fTrunk = data.fatTrunk || 0;

  const getMuscleArmClass = (val: number) => {
    const pct = (val / sWeight) * 100;
    if (pct < 1.8) return { label: "Abaixo", color: "text-amber-500 bg-amber-50" };
    if (pct > 4.2) return { label: "Excelente", color: "text-emerald-500 bg-emerald-50" };
    return { label: "Normal", color: "text-slate-500 bg-slate-100" };
  };

  const getMuscleLegClass = (val: number) => {
    const pct = (val / sWeight) * 100;
    if (pct < 7.5) return { label: "Abaixo", color: "text-amber-500 bg-amber-50" };
    if (pct > 12.0) return { label: "Excelente", color: "text-emerald-500 bg-emerald-50" };
    return { label: "Normal", color: "text-slate-500 bg-slate-100" };
  };

  const getMuscleTrunkClass = (val: number) => {
    const pct = (val / sWeight) * 100;
    if (pct < 21.0) return { label: "Abaixo", color: "text-amber-500 bg-amber-50" };
    if (pct > 28.5) return { label: "Excelente", color: "text-emerald-500 bg-emerald-50" };
    return { label: "Normal", color: "text-slate-500 bg-slate-100" };
  };

  const getFatSegmentClass = (val: number) => {
    const limitHigh = isMale ? 20 : 28;
    const limitLow = isMale ? 10 : 18;
    if (val < limitLow) return { label: "Baixo", color: "text-sky-500 bg-sky-50" };
    if (val > limitHigh) return { label: "Alto", color: "text-rose-500 bg-rose-50" };
    return { label: "Normal", color: "text-emerald-650 bg-emerald-50" };
  };

  // 1. STATUS CORPORAL GERAL (RESUMO EXECUTIVO)
  let fatClass = "Normal";
  let fatClassColor = "text-emerald-600";
  if (sGender === "M") {
    if (sFatPct < 8) {
      fatClass = "Atleta";
      fatClassColor = "text-cyan-600";
    } else if (sFatPct <= 13) {
      fatClass = "Excelente";
      fatClassColor = "text-emerald-600";
    } else if (sFatPct <= 20) {
      fatClass = "Normal";
      fatClassColor = "text-green-600";
    } else if (sFatPct <= 25) {
      fatClass = "Elevado";
      fatClassColor = "text-yellow-600";
    } else {
      fatClass = "Obesidade";
      fatClassColor = "text-red-600";
    }
  } else {
    if (sFatPct < 16) {
      fatClass = "Atleta";
      fatClassColor = "text-cyan-600";
    } else if (sFatPct <= 20) {
      fatClass = "Excelente";
      fatClassColor = "text-emerald-600";
    } else if (sFatPct <= 28) {
      fatClass = "Normal";
      fatClassColor = "text-green-600";
    } else if (sFatPct <= 34) {
      fatClass = "Elevado";
      fatClassColor = "text-yellow-600";
    } else {
      fatClass = "Obesidade";
      fatClassColor = "text-red-600";
    }
  }

  // Visceral Fat Classification:
  let visceralClass = "Ideal";
  let visceralClassColor = "text-emerald-600";
  if (sVisceral >= 10) {
    visceralClass = "Risco";
    visceralClassColor = "text-red-600";
  } else if (sVisceral >= 6) {
    visceralClass = "Atenção";
    visceralClassColor = "text-amber-600";
  }

  let bioQuality = "excelente reserva de massa muscular esquelética";
  if (sMuscle / sWeight > 0.48 || (sGender === "F" && sMuscle / sWeight > 0.38)) {
    bioQuality = "excepcional densidade muscular e alta potência motora funcional";
  } else if (sWater > 58) {
    bioQuality = "ótimo nível de hidratação celular e eficiência de transporte metabólico";
  } else if (sBones > 3.0) {
    bioQuality = "sólida densidade mineral óssea e fantástica base estrutural de suporte";
  }

  let bioProblem = "manter o equilíbrio simétrico de força segmentar";
  if (fatClass === "Obesidade" || fatClass === "Elevado") {
    bioProblem = "alto percentual de gordura de arrasto, gerando sobrecarga mecânica articular e inércia de movimento";
  } else if (sVisceral >= 10) {
    bioProblem = "acúmulo preocupante de gordura visceral interna inflamável";
  } else if (sWater < 50) {
    bioProblem = "baixo teor de água corporal, o que restringe a nutrição celular e o estoque de glicogênio";
  } else if (sMuscle / sWeight < 0.38 && sGender === "M") {
    bioProblem = "volume muscular suboptimal para exigências de esportes explosivos";
  } else if (sMuscle / sWeight < 0.28 && sGender === "F") {
    bioProblem = "volume muscular esquelético abaixo da zona ótima de rendimento e proteção";
  }

  const veredictoResumo = `Atleta apresenta composição corporal classificada como ${fatClass.toUpperCase()}. Possui ${bioQuality}, porém apresenta ponto de atenção em ${bioProblem}.`;

  // 2. SCORE CORPORAL (0 a 100)
  let fScore = 0;
  if (sGender === "M") {
    if (sFatPct <= 11) fScore = 100;
    else if (sFatPct <= 14) fScore = 90;
    else if (sFatPct <= 20) fScore = 75;
    else if (sFatPct <= 25) fScore = 55;
    else fScore = Math.max(10, 40 - (sFatPct - 25) * 2);
  } else {
    if (sFatPct <= 18) fScore = 100;
    else if (sFatPct <= 22) fScore = 90;
    else if (sFatPct <= 28) fScore = 75;
    else if (sFatPct <= 34) fScore = 55;
    else fScore = Math.max(10, 40 - (sFatPct - 34) * 2);
  }

  const mRatio = sMuscle / sWeight;
  let mScore = 0;
  if (sGender === "M") {
    if (mRatio >= 0.45) mScore = 100;
    else if (mRatio >= 0.40) mScore = 80;
    else if (mRatio >= 0.35) mScore = 60;
    else mScore = Math.max(10, 10 + mRatio * 150);
  } else {
    if (mRatio >= 0.35) mScore = 100;
    else if (mRatio >= 0.30) mScore = 80;
    else if (mRatio >= 0.25) mScore = 60;
    else mScore = Math.max(10, 10 + mRatio * 155);
  }

  let vScore = 100;
  if (sVisceral > 12) vScore = 30;
  else if (sVisceral >= 10) vScore = 50;
  else if (sVisceral >= 8) vScore = 70;
  else if (sVisceral >= 6) vScore = 85;

  let hScore = 100;
  if (sGender === "M") {
    if (sWater < 50) hScore = 45;
    else if (sWater < 55) hScore = 75;
    else if (sWater > 65) hScore = 90;
  } else {
    if (sWater < 45) hScore = 45;
    else if (sWater < 50) hScore = 75;
    else if (sWater > 60) hScore = 90;
  }

  const bodyScore = Math.round((fScore * 0.45) + (mScore * 0.25) + (vScore * 0.15) + (hScore * 0.15));

  let bodyScoreClass = "Baixo";
  let bodyScoreColor = "text-rose-600 border-rose-200 bg-rose-50";
  if (bodyScore >= 85) { bodyScoreClass = "Elite"; bodyScoreColor = "text-indigo-600 border-indigo-200 bg-indigo-50"; }
  else if (bodyScore >= 70) { bodyScoreClass = "Bom"; bodyScoreColor = "text-emerald-600 border-emerald-200 bg-emerald-50"; }
  else if (bodyScore >= 50) { bodyScoreClass = "Regular"; bodyScoreColor = "text-amber-600 border-amber-200 bg-amber-50"; }


  // 3. INTERPRETAÇÃO TÉCNICA (TREINADOR)
  let bioNeuromuscularProfile = "Performance Desportiva / Reatividade Ativa";
  let bioMuscleFatRatio = "";
  let sMetabolicDescription = "";
  let sPhysiologicalRisk = "";

  if (fatClass === "Obesidade" || sVisceral >= 10) {
    bioNeuromuscularProfile = "Saúde Fisiológica & Reabilitação Metabólica";
  } else if (fatClass === "Elevado") {
    bioNeuromuscularProfile = "Estético Especializado / Recomposição Estrutural";
  } else {
    bioNeuromuscularProfile = "Performance Desportiva / Rendimento de Elite";
  }

  const leanOverFat = sMuscle / (sWeight * (sFatPct / 100) || 1);
  if (leanOverFat > 3.0) {
    bioMuscleFatRatio = "Excepcional relação Músculo-Gordura. O competidor transporta alta quantidade de tecido contrátil com reduzida gordura parasita de arrasto, otimizando a potência desportiva.";
  } else if (leanOverFat >= 1.8) {
    bioMuscleFatRatio = "Equilíbrio muscular estabilizado. Volume de força de sustentação mecânica ideal, permitindo polimento sutil do percentual adiposo sem perigos catabólicos.";
  } else {
    bioMuscleFatRatio = "Predomínio de tecido adiposo sob a estrutura neuromuscular de sustentação. O motor muscular trabalha sob regime de sobrecarga mecânica compensatória, promovendo fadiga.";
  }

  if (sIdadeMetabolica < sAge) {
    sMetabolicDescription = `Metabolismo Altamente Eficiente. Apresenta idade metabólica de ${sIdadeMetabolica} anos (menor que os ${sAge} anos de idade cronológica), indicando uma excelente queima basal celular de energia.`;
  } else if (sIdadeMetabolica === sAge) {
    sMetabolicDescription = `Atividade metabólica saudável. Condições energéticas perfeitamente correspondentes à sua faixa etária cronológica de ${sAge} anos, garantindo ótima dinâmica de recuperação celular pós-treino.`;
  } else {
    sMetabolicDescription = `Metabolismo em estado letárgico. Idade biológica corporal medida de ${sIdadeMetabolica} anos (acima dos ${sAge} reais), o que indica perda de vitalidade e queima gordurosa deprimida.`;
  }

  if (sVisceral >= 10 || sFatPct > 28) {
    sPhysiologicalRisk = "Alto risco de processos inflamatórios silenciosos no tecido conjuntivo / tendíneo e sobrecarga vascular global. Recomenda-se acompanhamento nutricional cerrado.";
  } else if (sVisceral >= 6 || sFatPct > 22) {
    sPhysiologicalRisk = "Risco fisiológico em nível moderador. Necessidade de atenção sobre flutuações severas de hidratação e controle moderado de açúcares simples.";
  } else {
    sPhysiologicalRisk = "Nível de risco mínimo. Baixo estresse oxidativo sistêmico celular e tecidos de colágeno bem preservados contra inflamação.";
  }


  // 4. TRADUÇÃO SIMPLES (ATLETA)
  let bioAthleteTranslation = "";
  if (fatClass === "Obesidade" || fatClass === "Elevado") {
    bioAthleteTranslation = "Seu corpo hoje carrega um peso extra desnecessário (como se fosse uma mochila) que está limitando seus saltos e sprints, fazendo você se cansar mais rápido. Nosso plano é manter seus músculos fortes, mas secar esse excesso para você ficar muito mais leve, ágil e veloz nos jogos.";
  } else if (fatClass === "Atleta" || fatClass === "Excelente") {
    bioAthleteTranslation = "Seu corpo está funcionando como um carro de corrida super regulado! Com esse percentual adiposo baixo, quase toda sua energia física vai diretamente para gerar impulsão e arrancadas sem nenhum tipo de barreira. Vamos focar em abastecer essa musculatura perfeitamente.";
  } else {
    bioAthleteTranslation = "Você está com uma excelente base para treinar! O equilíbrio entre peso e seus músculos é bom. Para performar como os melhores, o próximo passo é enxugar um pouco mais o nível de gordura, o que vai deixar sua movimentação ainda mais dinâmica e explosiva.";
  }


  // 5. EXPLICAÇÃO PARA PAIS
  let bioParentsExplanation = "";
  if (sAge < 18) {
    bioParentsExplanation = "O acompanhamento da composição em atletas adolescentes garante que seu crescimento aconteça de forma saudável e protegida. Manter os níveis de gordura ideais previne lesões nas articulações em desenvolvimento e assegura que os músculos recebam a energia e nutrição ideal de suporte.";
  } else {
    bioParentsExplanation = "A bioimpedância avalia de perto a segurança metabólica do atleta. Controlar a proporção mineral óssea e o nível lipídico protege as articulações contra desgastes precoces crônicos, regula a regeneração hormonal e garante alta performance duradoura.";
  }


  // 6. IMPACTO NA PERFORMANCE
  let sPerformanceImpactText = "";
  if (fatClass === "Obesidade" || fatClass === "Elevado") {
    sPerformanceImpactText = "A massa adiposa improdutiva atua como amortecimento negativo passivo, reduzindo os coeficientes de aceleração inicial e agilidade nas mudanças de direção rápidas. Além de desgastar as articulações.";
  } else if (fatClass === "Atleta" || fatClass === "Excelente") {
    sPerformanceImpactText = "A excelente relação peso/potência desportiva maximiza a força relativa de contração. Isso resulta em decolagens verticais livres de inércia excessiva, rápida troca de direção e desacelerações seguras.";
  } else {
    sPerformanceImpactText = "Compromisso de força dinâmica equilibrado para disputas de contato físico. Uma redução leve de 2% de gordura desportiva ativará ganhos de 5% de agilidade geral nos deslocamentos laterais.";
  }


  // 7. ANÁLISE DE SEGMENTAÇÃO
  const sBdMuscle = data.muscleArmR || 0;
  const sBeMuscle = data.muscleArmL || 0;
  const sPdMuscle = data.muscleLegR || 0;
  const sPeMuscle = data.muscleLegL || 0;
  const sTroncoMuscle = data.muscleTrunk || 0;

  const sBdFat = data.fatArmR || 0;
  const sBeFat = data.fatArmL || 0;
  const sPdFat = data.fatLegR || 0;
  const sPeFat = data.fatLegL || 0;
  const sTroncoFat = data.fatTrunk || 0;

  const armAsymmetry = sBdMuscle > 0 ? Math.abs((sBdMuscle - sBeMuscle) / sBdMuscle) * 100 : 0;
  const legAsymmetry = sPdMuscle > 0 ? Math.abs((sPdMuscle - sPeMuscle) / sPdMuscle) * 100 : 0;

  let sSegmentationText = "";
  if (armAsymmetry > 10 || legAsymmetry > 10) {
    const dominantL = sPdMuscle > sPeMuscle ? "Direito" : "Esquerdo";
    sSegmentationText = `Identificamos assimetria importante na musculatura periférica (assimetria nos braços de ${armAsymmetry.toFixed(1)}% e nas pernas de ${legAsymmetry.toFixed(1)}%, com hegemonia no membro inferior ${dominantL}). Esse desnível favorece rotações inadequadas do joelho oposto. Recomenda-se treino corretivo unilateral direcionado instantâneo.`;
  } else if (armAsymmetry > 5 || legAsymmetry > 5) {
    sSegmentationText = `Níveis simétricos com pequenas variações funcionais esperadas (assimetria nos braços de ${armAsymmetry.toFixed(1)}% e pernas de ${legAsymmetry.toFixed(1)}%). O alinhamento pélvico está seguro de sobrecargas axiais severas.`;
  } else {
    sSegmentationText = `Excepcional equilíbrio bilateral de membros superiores e inferiores (<5% de variação). Isso blinda o atleta de forças de cisalhamento, prevenindo lesões e gerando uma corrida uniforme e polida.`;
  }


  // 8. PLANO DE AÇÃO (4–8 SEMANAS)
  let bioActionPlanFocus = "";
  let bioActionItems: { title: string; desc: string }[] = [];

  const isMuscleLow = sGender === "M" ? (sMuscle / sWeight < 0.41) : (sMuscle / sWeight < 0.31);
  const isFatHigh = sGender === "M" ? (sFatPct > 18) : (sFatPct > 28);

  if (isFatHigh) {
    bioActionPlanFocus = "Foco em Queima Lipídica, Preservação Contráctil e Déficit Calórico Controlado";
    bioActionItems = [
      { title: "Déficit Dietético Otimizado", desc: "Ajuste na ingestão calórica diária com redução calculada de 15% para preservação máxima de fibra muscular, reduzindo unicamente tecidos gordurosos." },
      { title: "Saturação de Ingestão Proteica", desc: "Fornecimento de 2.0g de proteína por kg diariamente, garantindo reposição de aminoácidos estruturais e evitando estados catabólicos." },
      { title: "Protocolo HIIT pós-treino", desc: "Sessões curtas e exigentes de corrida intermitente (30s sprint por 30s caminhada, totalizando 10 min) 3x por semana para otimizar respiração celular mitocondrial." },
      { title: "Estímulo Resistido de Alta Tensão", desc: "Exercícios compostos básicos sob cargas elevadas (3 a 4 séries de 6 a 8 repetições) para sinalizar hipertrofia preventiva." }
    ];
  } else if (isMuscleLow) {
    bioActionPlanFocus = "Metodologia Hipertrófica Funcional, Superávit Proteico e Densidade Energética";
    bioActionItems = [
      { title: "Hipertrofia de Tensão Mecânica", desc: "Priorizar tempos sob tensão altos. Realizar treinos focando em contrações excêntricas cadenciadas (fase de descida de 3 segundos) em repetições de 8 a 12." },
      { title: "Reforço Proteico e Hidratação Extrema", desc: "Consumo diário de pelo menos 2.2g de proteína/kg associado a uma hidratação intensa de 50ml de água purificada por kg de peso corporal." },
      { title: "Ingestão Nutricional Hipercalórica Limpa", desc: "Inserção de gorduras saudáveis (azeite de oliva, abacate) e carboidratos de alta qualidade para amparar a taxa metabólica basal ativa." },
      { title: "Recuperação Terapêutica Ativa", desc: "Sono de pelo menos 8 horas focadas e banhos frios regeneradores para manter os níveis séricos hormonais de regeneração ativos." }
    ];
  } else {
    bioActionPlanFocus = "Polimento Corporal de Elite, Nutrição Concorrente e Estabilização de Força";
    bioActionItems = [
      { title: "Sincronização Nutricional de Carboidratos", desc: "Distribuir carboidratos em janelas imediatas pré e pós-treino intenso para saturar as reservas de glicogênio sem picos de insulina gordurosa." },
      { title: "Exercícios de Potência Unilaterais", desc: "Adicionar movimentos dinâmicos como Agachamento Búlgaro e subidas explosivas em caixas de forma unilateral para polir estabilidade unilateral." },
      { title: "Eletrólitos Pós-Esforço Avançados", desc: "Reposição mineral precisa (sódio, magnésio e potássio) pós-sessão de suor extremo, impulsionando a água celular total e evitando cãibras." }
    ];
  }


  // 9. METAS DE EVOLUÇÃO
  let bioTargetFat = 0;
  let bioTargetMuscle = 0;
  let bioTargetTimeframe = "6 a 8 semanas";

  if (isFatHigh) {
    bioTargetFat = parseFloat(Math.max(sGender === "M" ? 9 : 18, sFatPct - (sFatPct > 25 ? 4.0 : 2.5)).toFixed(1));
    bioTargetMuscle = parseFloat((sMuscle + 0.8).toFixed(1));
    bioTargetTimeframe = "6 a 8 semanas";
  } else if (isMuscleLow) {
    bioTargetFat = parseFloat(Math.max(sGender === "M" ? 8 : 17, sFatPct - 0.5).toFixed(1));
    bioTargetMuscle = parseFloat((sMuscle + (sGender === "M" ? 2.5 : 1.5)).toFixed(1));
    bioTargetTimeframe = "8 a 12 semanas";
  } else {
    bioTargetFat = parseFloat(Math.max(sGender === "M" ? 7.5 : 16, sFatPct - 1.0).toFixed(1));
    bioTargetMuscle = parseFloat((sMuscle + 0.5).toFixed(1));
    bioTargetTimeframe = "4 a 6 semanas";
  }

  // 🧬 ÍNDICE DE PERFORMANCE CORPORAL (IPC)
  const leanMassPct = parseFloat((100 - sFatPct).toFixed(1));
  let functionalFatIdx = 100 - (sFatPct * 1.5);
  if (sGender === "M") {
    if (sFatPct >= 8 && sFatPct <= 13) functionalFatIdx = 95 + (13 - sFatPct);
    else if (sFatPct < 8) functionalFatIdx = 90 + sFatPct;
  } else {
    if (sFatPct >= 16 && sFatPct <= 20) functionalFatIdx = 95 + (20 - sFatPct);
    else if (sFatPct < 16) functionalFatIdx = 90 + sFatPct / 2;
  }
  functionalFatIdx = Math.round(Math.max(15, Math.min(100, functionalFatIdx)));

  const ageDelta = sAge - sIdadeMetabolica;
  let metabolicEfficiencyScore = 75 + (ageDelta * 2.5);
  metabolicEfficiencyScore = Math.max(30, Math.min(100, Math.round(metabolicEfficiencyScore)));

  const totalEfficiency = Math.round((leanMassPct + functionalFatIdx + metabolicEfficiencyScore) / 3);

  let efficiencyLevel = "baixa";
  let efficiencyColor = "text-rose-600 border-rose-100 bg-rose-50/50 hover:bg-rose-50";
  if (totalEfficiency >= 85) {
    efficiencyLevel = "elite";
    efficiencyColor = "text-indigo-600 border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50";
  } else if (totalEfficiency >= 70) {
    efficiencyLevel = "alta";
    efficiencyColor = "text-emerald-600 border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50";
  } else if (totalEfficiency >= 50) {
    efficiencyLevel = "moderada";
    efficiencyColor = "text-amber-600 border-amber-100 bg-amber-50/50 hover:bg-amber-50";
  }

  const evolutionData = useMemo(() => {
    return [...history]
      .filter((item) => (item.weight && item.weight > 0) || (item.muscleMass && item.muscleMass > 0) || (item.fatPercentage && item.fatPercentage > 0))
      .sort((a, b) => getSafeDateTime(a.date) - getSafeDateTime(b.date))
      .slice(-6)
      .map((item) => ({
        date: formatDate(item.date),
        weight: item.weight || 0,
        muscleMass: item.muscleMass || 0,
        fatPercentage: item.fatPercentage || 0,
      }));
  }, [history]);

  const handleExportJpeg = async () => {
    if (!reportRef.current) return;
    const toastId = toast.loading("Otimizando layout para exportação...");
    try {
      const pages = reportRef.current.querySelectorAll(".report-page");
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const dataUrl = await toJpeg(page, {
          quality: 1.0,
          backgroundColor: "#FFFFFF",
          pixelRatio: 3,
        });
        const link = document.createElement("a");
        link.download = `relatorio-bioimpedancia-${athlete.name.toLowerCase().replace(/\s+/g, "-")}-pag-${i + 1}.jpg`;
        link.href = dataUrl;
        link.click();
        await new Promise((r) => setTimeout(r, 400));
      }
      toast.success("Arquivos gerados com sucesso!", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Falha ao gerar imagens.", { id: toastId });
    }
  };

  const handlePrint = () => {
    triggerPrint();
  };

  const getPhysiqueRatingLabel = (rating: number) => {
    const ratings: Record<number, string> = {
      1: "Obeso",
      2: "Obeso Musculoso",
      3: "Robusto",
      4: "Pouco Exercitado",
      5: "Padrão",
      6: "Padrão Musculoso",
      7: "Magro",
      8: "Magro Musculoso",
      9: "Muito Musculoso",
    };
    return ratings[rating] || "Não Informado";
  };

  const StatCard = ({
    icon: Icon,
    label,
    value,
    unit,
    color,
    description,
    diff,
  }: any) => (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${color} bg-opacity-10`}>
            <Icon className={`w-3.5 h-3.5 ${color.replace("bg-", "text-")}`} />
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {label}
          </span>
        </div>
        {diff && (
          <div
            className={`flex items-center gap-0.5 text-[8px] font-black ${diff.color}`}
          >
            <span>{diff.icon}</span>
            <span>{diff.percent}%</span>
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1 mt-auto">
        <span className="text-xl font-black text-slate-900 italic">
          {value || 0}
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase">
          {unit}
        </span>
      </div>
      {description && (
        <p className="text-[8px] text-slate-500 mt-1 font-medium leading-tight">
          {description}
        </p>
      )}
    </div>
  );

  const SegmentedRow = ({ label, fat, muscle }: any) => (
    <div className="grid grid-cols-3 items-center py-2 border-b border-slate-50 last:border-0">
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
        {label}
      </span>
      <div className="flex flex-col items-center">
        <span className="text-[11px] font-black text-orange-600 italic">
          {fat || 0}%
        </span>
        <span className="text-[7px] font-bold text-slate-300 uppercase">
          Gordura
        </span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[11px] font-black text-emerald-600 italic">
          {muscle || 0}kg
        </span>
        <span className="text-[7px] font-bold text-slate-300 uppercase">
          Músculo
        </span>
      </div>
    </div>
  );

  const SegmentedRadarChart = ({ data }: { data: Bioimpedance }) => {
    const chartData = [
      {
        subject: "Braço D",
        fat: data.fatArmR || 0,
        muscle: data.muscleArmR || 0,
        fullMark: 100,
      },
      {
        subject: "Braço E",
        fat: data.fatArmL || 0,
        muscle: data.muscleArmL || 0,
        fullMark: 100,
      },
      {
        subject: "Perna D",
        fat: data.fatLegR || 0,
        muscle: data.muscleLegR || 0,
        fullMark: 100,
      },
      {
        subject: "Perna E",
        fat: data.fatLegL || 0,
        muscle: data.muscleLegL || 0,
        fullMark: 100,
      },
      {
        subject: "Tronco",
        fat: data.fatTrunk || 0,
        muscle: data.muscleTrunk || 0,
        fullMark: 100,
      },
    ];

    return (
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            cx="50%"
            cy="50%"
            outerRadius="65%"
            data={chartData}
            margin={{ top: 10, right: 40, bottom: 10, left: 40 }}
          >
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "#64748b", fontSize: 8, fontWeight: 800 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, "auto"]}
              tick={false}
              axisLine={false}
            />
            <Radar
              name="Gordura (%)"
              dataKey="fat"
              stroke="#ea580c"
              fill="#ea580c"
              fillOpacity={0.4}
            />
            <Radar
              name="Músculo (kg)"
              dataKey="muscle"
              stroke="#059669"
              fill="#059669"
              fillOpacity={0.4}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "none",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
              }}
              itemStyle={{
                fontSize: "10px",
                fontWeight: 800,
                textTransform: "uppercase",
              }}
            />
            <Legend
              wrapperStyle={{
                fontSize: "10px",
                fontWeight: 800,
                textTransform: "uppercase",
                paddingTop: "20px",
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-slate-900/95 backdrop-blur-xl overflow-y-auto p-0 md:p-4 no-scrollbar report-modal">
      <div className="max-w-5xl w-full mx-auto md:my-10 h-full md:h-auto font-sans">
        
        {/* Printable/exportable container */}
        <div ref={reportRef} className="print-container bg-slate-100/10 md:bg-transparent">
          
          {/* Page 1: Head stats and Body Constitution */}
          <ReportPage pageNumber={1} totalPages={3}>
            <ReportHeader
              title="RELATÓRIO DE COMPOSIÇÃO CORPORAL"
              subTitle="BIOIMPEDÂNCIA MULTIFREQUENCIAL"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[
                { label: "PESO TOTAL", value: `${data.weight || 0} KG` },
                { label: "CONSTITUIÇÃO", value: getPhysiqueRatingLabel(data.physiqueRating || 0).toUpperCase() }
              ]}
            />

            {/* Destaque / Dicas Rápidas para o Aluno/Atleta */}
            <div className="bg-gradient-to-r from-brand-primary/10 via-emerald-500/5 to-slate-50 border border-brand-primary/15 rounded-2xl p-4 mt-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-brand-primary shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="text-[9px] font-black text-brand-dark uppercase tracking-wider block font-sans">
                  Resumo de Progresso e Foco de Treino
                </span>
                <p className="text-[10px] text-slate-700 leading-relaxed font-semibold uppercase mt-0.5 font-sans">
                  {athlete.name}, sua composição corporal foi analisada com precisão. O foco atual do seu planejamento é <span className="text-brand-primary font-black uppercase">{isMuscleLow ? "Ganho de Massa Magra" : isFatHigh ? "Redução de Gordura Corporal" : "Polimento e Performance Esportiva"}</span>. Veja abaixo a comparação detalhada de cada segmento em relação ao registro anterior.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
              {/* Left Column: Composição Corporal & Diagnóstico de Obesidade (Col-span 7) */}
              <div className="lg:col-span-7 space-y-4">
                {/* 1. Composição Corporal */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200/80 shadow-xs space-y-3.5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <Scale className="w-4 h-4 text-brand-primary" />
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider font-sans">
                      Análise de Composição Corporal
                    </h4>
                  </div>
                  
                  <div className="space-y-3.5">
                    <BarIndicator 
                      label="Peso Corporal Total" 
                      current={sWeight} 
                      minNormal={minWeight} 
                      maxNormal={maxWeight} 
                      unit="kg" 
                      prevVal={previousData?.weight} 
                    />
                    <BarIndicator 
                      label="MME (Massa de Músculo Esquelético)" 
                      current={sMuscle} 
                      minNormal={minMme} 
                      maxNormal={maxMme} 
                      unit="kg" 
                      prevVal={previousData?.muscleMass} 
                    />
                    <BarIndicator 
                      label="Massa de Gordura Absoluta" 
                      current={currentFatKg} 
                      minNormal={minFatKg} 
                      maxNormal={maxFatKg} 
                      unit="kg" 
                      prevVal={previousFatKg} 
                      inverse={true}
                    />
                  </div>
                </div>

                {/* 2. Diagnóstico de Obesidade / Métricas de Performance */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200/80 shadow-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-2">
                    <Activity className="w-4 h-4 text-brand-primary" />
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider font-sans">
                      Diagnóstico de Saúde & Metabolismo
                    </h4>
                  </div>
                  
                  <div className="divide-y divide-slate-100">
                    <DiagnosticRow 
                      label="IMC (Índice de Massa Corporal)" 
                      current={currentImc} 
                      prev={previousImc} 
                      unit="kg/m²" 
                      normalRange="18.5 ~ 24.9" 
                    />
                    <DiagnosticRow 
                      label="PGC (Percentual de Gordura)" 
                      current={sFatPct} 
                      prev={previousData?.fatPercentage} 
                      unit="%" 
                      normalRange={isMale ? "10.0 ~ 20.0" : "18.0 ~ 28.0"} 
                      inverse={true}
                    />
                    <DiagnosticRow 
                      label="TMB (Taxa de Metabolismo Basal)" 
                      current={sTmb} 
                      prev={previousData?.basalMetabolism} 
                      unit="kcal" 
                      normalRange={isMale ? "1500 ~ 2100" : "1200 ~ 1600"} 
                    />
                    <DiagnosticRow 
                      label="ACT (Água Corporal Total)" 
                      current={sWater} 
                      prev={previousData?.hydration} 
                      unit="%" 
                      normalRange={isMale ? "55.0 ~ 65.0" : "50.0 ~ 60.0"} 
                    />
                    <DiagnosticRow 
                      label="MLG (Massa Livre de Gordura)" 
                      current={currentMlg} 
                      prev={previousMlg} 
                      unit="kg" 
                      normalRange={`${(minWeight * (isMale ? 0.80 : 0.72)).toFixed(1)} ~ ${(maxWeight * (isMale ? 0.90 : 0.82)).toFixed(1)}`} 
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Bonecos de Segmentação (Col-span 5) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {/* Segmented Muscle */}
                <VisualSegmentedFigure 
                  title="Massa Magra Segmentada" 
                  sub="Distribuição de Músculo Esquelético"
                  values={{
                    armL: mArmL,
                    armR: mArmR,
                    trunk: mTrunk,
                    legL: mLegL,
                    legR: mLegR,
                  }}
                  classifications={{
                    armL: getMuscleArmClass(mArmL),
                    armR: getMuscleArmClass(mArmR),
                    trunk: getMuscleTrunkClass(mTrunk),
                    legL: getMuscleLegClass(mLegL),
                    legR: getMuscleLegClass(mLegR),
                  }}
                />

                {/* Segmented Fat */}
                <VisualSegmentedFigure 
                  title="Gordura Segmentada" 
                  sub="Percentual de Gordura Localizado"
                  values={{
                    armL: fArmL,
                    armR: fArmR,
                    trunk: fTrunk,
                    legL: fLegL,
                    legR: fLegR,
                  }}
                  classifications={{
                    armL: getFatSegmentClass(fArmL),
                    armR: getFatSegmentClass(fArmR),
                    trunk: getFatSegmentClass(fTrunk),
                    legL: getFatSegmentClass(fLegL),
                    legR: getFatSegmentClass(fLegR),
                  }}
                />
              </div>
            </div>

            {/* Scale rating / physique status */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-150 mt-4 flex items-center justify-between gap-4">
              <div className="flex-1">
                <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block mb-0.5 font-sans">
                  Constituição Física e Escala Biométrica
                </span>
                <p className="text-[9px] text-slate-600 font-bold leading-relaxed uppercase font-sans">
                  A proporção mútua de gordura e músculos posiciona o atleta na zona de: <span className="text-brand-primary font-black uppercase">{getPhysiqueRatingLabel(data.physiqueRating || 0)}</span>.
                </p>
              </div>
              <div className="bg-white p-2.5 px-4 rounded-xl border border-slate-100 flex items-center justify-between gap-4 shrink-0">
                <span className="text-[10px] font-black text-slate-800 uppercase italic font-sans">
                  Escore: {data.physiqueRating || 0}/9
                </span>
                <div className="flex gap-1">
                  {[...Array(9)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${i + 1 === data.physiqueRating ? "bg-brand-primary scale-125 shadow-sm" : "bg-slate-200"}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </ReportPage>



          {/* Page 2: Evolução Temporal & Metabolismo */}
          <ReportPage pageNumber={2} totalPages={3}>
            <ReportHeader
              title="RELATÓRIO DE COMPOSIÇÃO CORPORAL"
              subTitle="HISTÓRICO DE COMPOSIÇÃO E TAXA METABÓLICA"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[{ label: "PÁGINA", value: "02 DE 03" }]}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              {/* HISTORICAL COMPOSITION HISTOGRAM/TREND CHART */}
              <div className="md:col-span-2 bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm font-sans h-full">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-4 h-4 text-brand-primary animate-pulse" />
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">
                    Evolução Temporal de Composição Corporal
                  </h4>
                </div>
                <div className="h-[210px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={evolutionData}>
                      <defs>
                        <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: "#94a3b8", fontSize: 8, fontWeight: 800 }} 
                      />
                      <YAxis 
                        yAxisId="left" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: "#334155", fontSize: 8, fontWeight: 800 }}
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: "#ea580c", fontSize: 8, fontWeight: 800 }}
                      />
                      <Tooltip 
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                          fontSize: "10px"
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "9px", fontWeight: 800, paddingTop: "10px" }} />
                      <Area 
                        yAxisId="left" 
                        name="Peso (kg)" 
                        type="monotone" 
                        dataKey="weight" 
                        fill="url(#colorWeight)" 
                        stroke="#3b82f6" 
                        strokeWidth={2} 
                      />
                      <Line 
                        yAxisId="left" 
                        name="Massa Muscular (kg)" 
                        type="monotone" 
                        dataKey="muscleMass" 
                        stroke="#10b981" 
                        strokeWidth={3} 
                        dot={{ fill: "#10b981", r: 4 }} 
                      />
                      <Line 
                        yAxisId="right" 
                        name="Gordura (%)" 
                        type="monotone" 
                        dataKey="fatPercentage" 
                        stroke="#ea580c" 
                        strokeWidth={3} 
                        dot={{ fill: "#ea580c", r: 4 }} 
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-950 p-6 rounded-[2rem] text-white flex flex-col justify-center min-h-[170px]">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 font-bold font-sans">
                      Gordura Visceral Interna
                    </span>
                    {previousData && (
                      <span className={`text-[10px] font-bold ${getDiff(data.visceralFat, previousData.visceralFat, true).isGood ? "text-emerald-400" : "text-rose-400"}`}>
                        {getDiff(data.visceralFat, previousData.visceralFat, true).percent}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <h3 className="text-4xl font-black italic font-sans leading-none">
                      {data.visceralFat || 0}
                    </h3>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Grau</span>
                  </div>
                  <div className="mt-4 grid grid-cols-10 gap-1 font-sans">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full ${i < (data.visceralFat || 0) ? (i < 5 ? "bg-emerald-400" : i < 8 ? "bg-orange-400" : "bg-rose-500") : "bg-slate-800"}`}
                      />
                    ))}
                  </div>
                  <p className="text-[8px] text-slate-400 font-medium leading-relaxed mt-4 uppercase font-bold">
                    Gordura intra-abdominal de revestimento orgânico. Saudável entre níveis 1 a 12.
                  </p>
                </div>

                <div className="bg-brand-primary/10 border border-brand-primary/10 p-6 rounded-[2rem] flex items-start gap-3">
                  <Info className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] font-black text-brand-dark uppercase block mb-1 font-bold font-sans">
                      Métrica de Saúde
                    </span>
                    <p className="text-[9px] text-slate-600 font-bold leading-relaxed uppercase font-sans font-semibold">
                      O monitoramento de gordura visceral e da saúde óssea é fundamental para prevenção metabólica de longo prazo e estabilização postural.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 font-sans">
              <StatCard
                icon={Calendar}
                label="Idade Metabólica"
                value={data.metabolicAge}
                unit="anos"
                color="bg-purple-500"
                description="Idade biológica comparativa do sistema."
                diff={previousData ? getDiff(data.metabolicAge, previousData.metabolicAge, true) : null}
              />
              <StatCard
                icon={Database}
                label="Massa Óssea"
                value={data.boneMass}
                unit="kg"
                color="bg-amber-500"
                description="Peso mineral total calcificado."
                diff={previousData ? getDiff(data.boneMass, previousData.boneMass) : null}
              />
            </div>
          </ReportPage>



          {/* Page 3: Diagnóstico de Elite & Prescrição */}
          <ReportPage pageNumber={3} totalPages={3}>
            <ReportHeader
              title="RELATÓRIO DE COMPOSIÇÃO CORPORAL"
              subTitle="DIAGNÓSTICO ESPORTIVO & PRESCRIÇÃO AVANÇADA"
              athlete={athlete}
              date={formatDate(data.date)}
              extraStats={[{ label: "PERFIL", value: "ELITE" }, { label: "PÁGINA", value: "03 DE 03" }]}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 font-sans">
              
              {/* Column 1: Executive Summary & Performance Indexes */}
              <div className="space-y-6">
                
                {/* 2. SCORE CORPORAL */}
                <div id="score-corp-card" className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-1 font-mono">
                    🎯 2. Score Corporal
                  </span>
                  <div className="flex justify-between items-baseline mb-3">
                    <h4 className="text-sm font-black uppercase italic tracking-wider text-slate-900">
                      Pontuação de Composição
                    </h4>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${bodyScoreColor}`}>
                      {bodyScoreClass}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 py-2">
                    <div className="relative flex items-center justify-center font-sans">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                        <circle cx="32" cy="32" r="28" stroke="#4f46e5" strokeWidth="6" fill="transparent"
                          strokeDasharray={175.9}
                          strokeDashoffset={175.9 - (175.9 * bodyScore) / 100}
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <span className="absolute text-lg font-black text-slate-900 italic">
                        {bodyScore}
                      </span>
                    </div>
                    <div className="flex-grow space-y-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase leading-none block">
                        Base de cálculo:
                      </span>
                      <p className="text-[8px] text-slate-400 font-medium leading-relaxed uppercase">
                        Peso relativo de gordura, distribuição intramuscular, água e taxas de estresse visceral de repouso.
                      </p>
                    </div>
                  </div>
                </div>
 
                {/* 🧬 ÍNDICE DE PERFORMANCE CORPORAL (IPC) */}
                <div id="index-perf-card" className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-2 font-mono">
                    🧬 Índice de Performance Corporal
                  </span>
                  <h4 className="text-sm font-black uppercase italic tracking-wider text-slate-900 mb-3 border-b pb-2">
                    Eficiência Corporal
                  </h4>
                  <div className={`p-3 rounded-2xl border ${efficiencyColor} flex items-center justify-between mb-4 transition-all duration-300`}>
                    <span className="text-[9px] font-black uppercase tracking-wider">
                      STATUS DE EFICIÊNCIA:
                    </span>
                    <span className="text-xs font-black uppercase italic tracking-widest">
                      {totalEfficiency}% ({efficiencyLevel})
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[9px] border-b pb-1.5 border-slate-50">
                      <span className="text-slate-400 uppercase font-black">Relação Massa Magra / Peso</span>
                      <span className="text-slate-900 italic font-black font-sans">{leanMassPct}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] border-b pb-1.5 border-slate-50">
                      <span className="text-slate-400 uppercase font-black">Índice Gordura Funcional</span>
                      <span className="text-slate-900 italic font-black font-sans">{functionalFatIdx}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="text-slate-400 uppercase font-black">S. Eficiência Metabólica</span>
                      <span className="text-slate-900 italic font-black font-sans">{metabolicEfficiencyScore}%</span>
                    </div>
                  </div>
                </div>
 
              </div>
 
              {/* Column 2: Technical Interpretation (Coach focus) */}
              <div className="space-y-6">
                
                {/* 3. INTERPRETAÇÃO TÉCNICA */}
                <div id="tech-interpretation-card" className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                  <span className="text-[7px] font-black text-orange-600 uppercase tracking-widest block mb-1 font-mono">
                    📊 3. Interpretação Técnica (Treinador)
                  </span>
                  <div className="flex justify-between items-baseline mb-3">
                    <h4 className="text-sm font-black uppercase italic tracking-wider text-slate-900">
                      Metabolismo & Tecido Ativo
                    </h4>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">
                      {bioNeuromuscularProfile.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="space-y-4 text-[9px] leading-relaxed">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="font-black text-slate-400 uppercase block mb-1">Massa Muscular vs Gordura:</span>
                      <p className="text-slate-600 font-bold uppercase">{bioMuscleFatRatio}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="font-black text-slate-400 uppercase block mb-1">Eficiência de Metabolismo:</span>
                      <p className="text-slate-600 font-bold uppercase">{sMetabolicDescription}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="font-black text-slate-400 uppercase block mb-1">Indicador de Risco Fisiológico:</span>
                      <p className="text-slate-650 font-bold uppercase">{sPhysiologicalRisk}</p>
                    </div>
                  </div>
                </div>
 
              </div>
 
              {/* Column 3: Actions, Metas & Translations */}
              <div className="space-y-6">
                
                {/* 8. PLANO DE AÇÃO */}
                <div id="action-plan-card" className="bg-white p-5 rounded-[2rem] border border-slate-200/85 shadow-sm">
                  <span className="text-[7px] font-black text-indigo-600 uppercase tracking-widest block mb-1 font-mono">
                    🚀 8. Plano de Ação (4-8 Semanas)
                  </span>
                  <div className="flex justify-between items-baseline mb-3 border-b pb-2">
                    <h4 className="text-sm font-black uppercase italic tracking-wider text-slate-900">
                      Estratégia Imediata
                    </h4>
                  </div>
                  <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest block mb-3 font-semibold font-mono">
                    Foco: {bioActionPlanFocus}
                  </p>
                  
                  <div className="space-y-3">
                    {bioActionItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-start text-[9px] border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                        <span className="w-4 h-4 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[8px] font-black text-slate-600 shrink-0 mt-0.5 font-mono">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-800 uppercase block leading-tight">{item.title}</span>
                          <span className="text-slate-400 font-medium text-[8px] leading-tight block mt-0.5 uppercase font-bold">{item.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
 
                {/* 9. METAS DE EVOLUÇÃO */}
                <div id="future-goals-card" className="bg-slate-950 text-white p-5 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden">
                  <div className="absolute right-3 top-3 opacity-5">
                    <Target className="w-16 h-16 text-emerald-400" />
                  </div>
                  <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest block mb-2 font-mono">
                    🎯 9. Metas de Evolução
                  </span>
                  <h4 className="text-sm font-black uppercase italic tracking-wider text-white mb-3 border-b border-slate-800 pb-2">
                    Objetivos Realistas
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-center">
                      <span className="text-[7px] font-black text-slate-400 uppercase block mb-1">Gordura Alvo</span>
                      <span className="text-base font-black text-brand-primary italic font-sans">{bioTargetFat}%</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-center">
                      <span className="text-[7px] font-black text-slate-400 uppercase block mb-1">Músculo Alvo</span>
                      <span className="text-base font-black text-emerald-400 italic font-sans">{bioTargetMuscle} kg</span>
                    </div>
                  </div>
                  <div className="text-center bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-[8px] font-black uppercase tracking-widest text-slate-400">
                    Prazo Estimado: <span className="text-white font-bold">{bioTargetTimeframe}</span>
                  </div>
                </div>
 
              </div>
 
            </div>
          </ReportPage>

        </div>

        {/* Buttons Row (Controls) */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 no-print pb-20 px-4 md:px-0 font-sans">
          <button
            onClick={handleExportJpeg}
            className="flex-grow flex items-center justify-center gap-2 bg-brand-primary text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-brand-primary/25 hover:bg-brand-dark transition-all active:scale-95 cursor-pointer font-sans"
          >
            <Download size={20} /> Baixar Páginas (JPEG)
          </button>
          <button
            onClick={handlePrint}
            className="flex-grow flex items-center justify-center gap-2 bg-slate-800 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 cursor-pointer font-sans"
          >
            <Printer size={20} /> Imprimir / PDF
          </button>
          <button
            onClick={onClose}
            className="flex-grow flex items-center justify-center gap-2 bg-slate-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-600 transition-all active:scale-95 cursor-pointer font-sans"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const AssessmentView: FC<{
  athlete: Athlete;
  onAdd: (type: AssessmentType) => void;
  onEdit: (type: AssessmentType, data: any) => void;
  onDelete: (type: AssessmentType, id: string) => void;
  onGenerateAI: () => void;
  aiLoading: boolean;
  role: "coach" | "athlete";
  updateAssessment?: (athleteId: string, type: AssessmentType, assessmentId: string, data: any) => Promise<any>;
  addAssessment?: (athleteId: string, type: AssessmentType, data: any) => Promise<any>;
  removeAssessment?: (athleteId: string, type: AssessmentType, assessmentId: string) => Promise<any>;
}> = ({ athlete, onAdd, onEdit, onDelete, onGenerateAI, aiLoading, role, updateAssessment, addAssessment, removeAssessment }) => {
  const [filterType, setFilterType] = useState<AssessmentType>("bioimpedance");
  const [showBioReport, setShowBioReport] = useState<Bioimpedance | null>(null);
  const [showStrengthReport, setShowStrengthReport] =
    useState<IsometricStrength | null>(null);
  const [showImtpReport, setShowImtpReport] = useState<Imtp | null>(null);
  const [showCmjReport, setShowCmjReport] = useState<Cmj | null>(null);
  const [showDropJumpReport, setShowDropJumpReport] = useState<DropJump | null>(null);
  const [showVo2Report, setShowVo2Report] = useState<Vo2max | null>(null);
  const [showSpeedReport, setShowSpeedReport] = useState<Speed | null>(null);
  const types: { id: AssessmentType; label: string }[] = [
    { id: "bioimpedance", label: "Gordura e Massa Magra" },
    { id: "isometricStrength", label: "Força Isométrica" },
    { id: "imtp", label: "Meio Agachamento (IMTP)" },
    { id: "cmj", label: "Salto CMJ" },
    { id: "dropJump", label: "Salto Drop Jump" },
    { id: "vo2max", label: "VO2 Máx" },
    { id: "speed", label: "Velocidade" },
    { id: "postural", label: "Avaliação Postural (IA)" },
  ];

  const categoryInsights: Record<AssessmentType, string> = {
    bioimpedance:
      "O percentual de gordura e a massa magra são indicadores cruciais da composição corporal. Reduzir a gordura mantendo a massa muscular otimiza a potência relativa e a eficiência mecânica do atleta.",
    isometricStrength:
      "Assimetrias acima de 10% nos extensores/flexores de joelho aumentam significativamente o risco de lesão bilateral de LCA.",
    imtp:
      "A Puxada Isométrica no Meio Agachamento (IMTP) mensura a Capacidade de Produção de Força Máxima Absoluta e Relativa, além da Taxa de Desenvolvimento de Força (RFD) e Impulso em intervalos milissegundos críticos para a performance de elite.",
    cmj: "A potência e altura do salto refletem a força explosiva concêntrica do atleta. Avalie a profundidade para mensurar a eficiência do ciclo alongamento-encurtamento lento.",
    dropJump:
      "O Drop Jump quantifica a capacidade do atleta de tolerar forças de impacto e convertê-las em energia elástica útil com tempos mínimos de contato (RSI).",
    vo2max:
      "Um VO2 alto não garante vitória, mas determina quão rápido você se recupera entre sprints. É o 'motor' que sustenta o volume da partida.",
    speed:
      "A velocidade máxima e a aceleração são determinantes em esportes de campo. Monitorar as parciais ajuda a identificar se o foco deve ser na saída (0-10m) ou na velocidade final.",
    postural:
      "A Avaliação Postural Inteligente por IA identifica desvios biomecânicos e assimetrias estruturais crônicas, correlacionando-as com queixas de dores e sugerindo rotinas corretivas individualizadas de nível elite.",
  };

  const currentAssessments = athlete.assessments || {
    bioimpedance: [],
    isometricStrength: [],
    imtp: [],
    cmj: [],
    dropJump: [],
    vo2max: [],
    speed: [],
    postural: [],
  };
  const sortedItems = useMemo(() => {
    const items = Array.isArray(currentAssessments[filterType])
      ? currentAssessments[filterType]
      : [];
    return [...items].sort(
      (a, b) => getSafeDateTime(b.date) - getSafeDateTime(a.date),
    );
  }, [currentAssessments, filterType]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-8">
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="flex gap-1 md:gap-2 overflow-x-auto pb-2 md:pb-0 w-full no-scrollbar">
          {types.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterType(t.id)}
              className={`px-4 py-2 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterType === t.id ? "bg-brand-primary text-white shadow-lg" : "bg-gray-100 text-gray-400 hover:text-gray-900"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {role === "coach" && (
            <Button
              onClick={() => onAdd(filterType)}
              variant="secondary"
              className="flex-1 md:flex-none py-3"
            >
              Novo Registro
            </Button>
          )}
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-4">
        <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center shrink-0 text-white">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <p className="text-[10px] md:text-[11px] font-black uppercase text-brand-primary tracking-widest mb-1">
            Por que esta avaliação importa?
          </p>
          <p className="text-[10px] md:text-xs text-slate-600 font-bold leading-snug">
            {categoryInsights[filterType]}
          </p>
        </div>
      </div>

      {filterType === "postural" ? (
        <PosturalAssessmentPremium
          athlete={athlete}
          role={role}
          addAssessment={addAssessment || (async () => {})}
          removeAssessment={removeAssessment || (async () => {})}
        />
      ) : (
        <>
          <PerformanceChart data={sortedItems} type={filterType} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {sortedItems.map((item: any, index: number) => {
              const prevItem = sortedItems[index + 1] as any;
          let report = null;

          const renderDiff = (
            current: number,
            previous: number,
            inverse = false,
          ) => {
            const diff = getDiff(current, previous, inverse);
            if (!diff) return null;
            return (
              <span className={`text-[7px] font-black ml-1 ${diff.color}`}>
                {diff.icon}
                {diff.percent}%
              </span>
            );
          };
          if (filterType === "isometricStrength") {
            const asymQ = getAsymmetryStatus(
              item.quadricepsR,
              item.quadricepsL,
            );
            const asymI = getAsymmetryStatus(
              item.hamstringsR,
              item.hamstringsL,
            );
            const iqR = getIQRatioStatus(item.hamstringsR, item.quadricepsR);
            const iqL = getIQRatioStatus(item.hamstringsL, item.quadricepsL);
            report = (
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-1">
                <div className="flex justify-between text-[7px] md:text-[8px] font-black uppercase">
                  <span className="text-slate-500">Assimetria Quad</span>
                  <span className={asymQ.color}>{asymQ.value}%</span>
                </div>
                <div className="flex justify-between text-[7px] md:text-[8px] font-black uppercase">
                  <span className="text-slate-500">Assimetria Isquios</span>
                  <span className={asymI.color}>{asymI.value}%</span>
                </div>
                <div className="flex justify-between text-[7px] md:text-[8px] font-black uppercase">
                  <span className="text-slate-500">Razão Post/Ant D</span>
                  <span className={iqR.color}>{iqR.ratio}%</span>
                </div>
                <div className="flex justify-between text-[7px] md:text-[8px] font-black uppercase">
                  <span className="text-slate-500">Razão Post/Ant E</span>
                  <span className={iqL.color}>{iqL.ratio}%</span>
                </div>
              </div>
            );
          }
          return (
            <Card
              key={item.id}
              className="group flex flex-col bg-slate-900 border-slate-800 shadow-xl hover:border-brand-primary/20 transition-all"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest">
                    {formatDate(item.date)}
                  </p>
                  <h5 className="text-xl md:text-2xl font-black text-brand-primary italic mt-2 uppercase tracking-tighter drop-shadow-[0_0_8px_rgba(75,222,5,0.3)]">
                    {types.find((t) => t.id === filterType)?.label}
                  </h5>
                </div>
                <div className="flex gap-2 transition-all shrink-0">
                  {role === "coach" && (
                    <button
                      onClick={() => {
                        if (filterType === "bioimpedance") setShowBioReport(item);
                        if (filterType === "isometricStrength") setShowStrengthReport(item);
                        if (filterType === "imtp") setShowImtpReport(item);
                        if (filterType === "cmj") setShowCmjReport(item);
                        if (filterType === "dropJump") setShowDropJumpReport(item);
                        if (filterType === "vo2max") setShowVo2Report(item);
                        if (filterType === "speed") setShowSpeedReport(item);
                      }}
                      className="p-2.5 bg-brand-primary/10 rounded-xl text-brand-primary hover:bg-brand-primary hover:text-brand-dark transition-all border border-brand-primary/20 flex items-center justify-center"
                      title="Visualizar / Baixar Relatório"
                    >
                      <FileText className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  )}
                  {role === "coach" && (
                    <>
                      <button
                        onClick={() => onEdit(filterType, item)}
                        className="p-2.5 bg-slate-800 rounded-xl text-slate-400 hover:bg-brand-primary hover:text-brand-dark transition-all"
                      >
                        <svg
                          className="w-4 h-4 md:w-5 md:h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              "Deseja realmente excluir esta avaliação?",
                            )
                          ) {
                            onDelete(filterType, item.id);
                          }
                        }}
                        className="p-2.5 bg-red-500/10 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                      >
                        <svg
                          className="w-4 h-4 md:w-5 md:h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-4 flex-grow">
                {filterType === "isometricStrength" && (
                  <>
                    <DataRow
                      label="Quadríceps D/E"
                      value={`${item.quadricepsR || 0}/${item.quadricepsL || 0} kgf`}
                    />
                    <DataRow
                      label="Isquiotibiais D/E"
                      value={`${item.hamstringsR || 0}/${item.hamstringsL || 0} kgf`}
                    />

                  </>
                )}
                {filterType === "imtp" && (
                  <>
                    <DataRow
                      label="Força Máxima"
                      value={`${item.peakForce || 0} kgf`}
                      diff={renderDiff(
                        item.peakForce,
                        prevItem?.peakForce,
                      )}
                    />
                    {item.weight && (
                      <DataRow
                        label="Peso do Atleta"
                        value={`${item.weight} kg`}
                      />
                    )}
                    <DataRow
                      label="Força Máxima Relativa"
                      value={`${item.relativePeakForce || 0} kgf/kg`}
                      diff={renderDiff(
                        item.relativePeakForce,
                        prevItem?.relativePeakForce,
                      )}
                    />
                    <DataRow
                      label="Tempo até p/ Força Máx"
                      value={`${item.timeToPeakForce || 0} ms`}
                      diff={renderDiff(
                        item.timeToPeakForce,
                        prevItem?.timeToPeakForce,
                        true
                      )}
                    />
                    <DataRow
                      label="Força Média d/Teste"
                      value={`${item.meanForce || 0} kgf`}
                      diff={renderDiff(
                        item.meanForce,
                        prevItem?.meanForce,
                      )}
                    />

                  </>
                )}
                {filterType === "cmj" && (
                  <>
                    <DataRow label="Peso" value={`${item.weight || 0} kg`} />
                    <DataRow
                      label="Altura do Salto"
                      value={`${item.height !== undefined ? Math.round(item.height * 10) : 0} mm`}
                      diff={renderDiff(item.height, prevItem?.height)}
                    />
                    <DataRow
                      label="Força Média"
                      value={`${item.averageForce || 0} N`}
                      diff={renderDiff(item.averageForce, prevItem?.averageForce)}
                    />
                    <DataRow
                      label="Potência Média"
                      value={`${item.power || 0} W`}
                      diff={renderDiff(item.power, prevItem?.power)}
                    />
                    <DataRow
                      label="Tempo de Voo"
                      value={`${item.flightTime || 0} ms`}
                      diff={renderDiff(item.flightTime, prevItem?.flightTime)}
                    />
                  </>
                )}
                {filterType === "vo2max" && (
                  <>
                    <DataRow
                      label="VO2 Máximo"
                      value={`${item.vo2max || 0} ml/kg`}
                      diff={renderDiff(item.vo2max, prevItem?.vo2max)}
                    />
                    <DataRow
                      label="Ventilação Máxima"
                      value={`${item.maxVentilation || 0} L/min`}
                      diff={renderDiff(
                        item.maxVentilation,
                        prevItem?.maxVentilation,
                      )}
                    />
                    <DataRow
                      label="VAM (km/h)"
                      value={`${item.vam || 0} km/h`}
                      diff={renderDiff(item.vam, prevItem?.vam)}
                    />
                    <DataRow
                      label="FC Máxima"
                      value={`${item.maxHeartRate || 0} bpm`}
                    />
                    <DataRow
                      label="Recup. 10s/30s/60s"
                      value={`${item.rec10s || 0}/${item.rec30s || 0}/${item.rec60s || 0} bpm`}
                    />

                  </>
                )}
                {filterType === "speed" && (
                  <>
                    <DataRow
                      label="5m"
                      value={`${item.time5m || 0}s (${item.speed5m?.toFixed(2) || 0} m/s)`}
                      diff={renderDiff(item.speed5m, prevItem?.speed5m)}
                    />
                    <DataRow
                      label="10m"
                      value={`${item.time10m || 0}s (${item.speed10m?.toFixed(2) || 0} m/s)`}
                      diff={renderDiff(item.speed10m, prevItem?.speed10m)}
                    />
                    <DataRow
                      label="20m"
                      value={`${item.time20m || 0}s (${item.speed20m?.toFixed(2) || 0} m/s)`}
                      diff={renderDiff(item.speed20m, prevItem?.speed20m)}
                    />
                    <DataRow
                      label="30m"
                      value={`${item.time30m || 0}s (${item.speed30m?.toFixed(2) || 0} m/s)`}
                      diff={renderDiff(item.speed30m, prevItem?.speed30m)}
                    />

                  </>
                )}
                {filterType === "dropJump" && (
                  <>
                    <DataRow label="Peso" value={`${item.weight || 0} kg`} />
                    <DataRow
                      label="Altura da Queda"
                      value={`${item.dropHeight || 30} cm`}
                    />
                    <DataRow
                      label="Altura do Salto"
                      value={`${item.jumpHeight || 0} cm`}
                      diff={renderDiff(item.jumpHeight, prevItem?.jumpHeight)}
                    />
                    <DataRow
                      label="Tempo de Vôo"
                      value={`${item.flightTime || 0} ms`}
                      diff={renderDiff(item.flightTime, prevItem?.flightTime)}
                    />
                    <DataRow
                      label="Força Média"
                      value={item.meanForce ? `${item.meanForce} N` : "0 N"}
                    />
                    <DataRow
                      label="Potência Média"
                      value={item.meanPower ? `${item.meanPower} W` : "0 W"}
                    />
                    <DataRow
                      label="Rigidez"
                      value={item.stiffness ? `${(item.stiffness < 100 ? Math.round(item.stiffness * 1000) : Math.round(item.stiffness)).toLocaleString('pt-BR')} N/m` : "0 N/m"}
                    />
                    <DataRow
                      label="Índice RSI"
                      value={item.rsi?.toFixed(2) || "0.00"}
                      diff={renderDiff(item.rsi, prevItem?.rsi)}
                    />

                  </>
                )}
                {filterType === "bioimpedance" && (
                  <>
                    <DataRow label="Peso" value={`${item.weight || 0} kg`} />
                    <DataRow
                      label="Gordura %"
                      value={`${item.fatPercentage || 0} %`}
                      diff={renderDiff(
                        item.fatPercentage,
                        prevItem?.fatPercentage,
                        true,
                      )}
                    />
                    <DataRow
                      label="Classificação"
                      value={
                        getFatPercentageClassification(
                          item.fatPercentage,
                          calculateAge(athlete.dob),
                          athlete.gender,
                        ).label
                      }
                    />
                    <DataRow
                      label="Massa Muscular"
                      value={`${item.muscleMass || 0} kg`}
                      diff={renderDiff(item.muscleMass, prevItem?.muscleMass)}
                    />
                    <DataRow
                      label="Gordura Visceral"
                      value={item.visceralFat || 0}
                      diff={renderDiff(
                        item.visceralFat,
                        prevItem?.visceralFat,
                        true,
                      )}
                    />
                    <DataRow
                      label="Hidratação"
                      value={`${item.hydration || 0} %`}
                      diff={renderDiff(item.hydration, prevItem?.hydration)}
                    />

                  </>
                )}
              </div>
              {item.observations && (
                <div className="mt-6 p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                  <p className="text-[10px] font-black uppercase text-slate-600 mb-1.5 tracking-widest">
                    Elite Insight
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium italic line-clamp-2 uppercase leading-relaxed">
                    {item.observations}
                  </p>
                </div>
              )}
              {report}
            </Card>
          );
        })}
        {sortedItems.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-40 font-black text-[9px] tracking-widest border-2 border-dashed border-gray-200 rounded-2xl uppercase text-gray-400">
            Aguardando Avaliações
          </div>
        )}
      </div>
      </>
    )}

      <AnimatePresence>
        {showBioReport && (
          <BioimpedanceReport
            athlete={athlete}
            data={showBioReport}
            onClose={() => setShowBioReport(null)}
            history={currentAssessments.bioimpedance}
          />
        )}
        {showStrengthReport && (
          <StrengthReport
            athlete={athlete}
            data={showStrengthReport}
            onClose={() => setShowStrengthReport(null)}
            history={currentAssessments.isometricStrength}
          />
        )}
        {showImtpReport && (
          <ImtpReport
            athlete={athlete}
            data={showImtpReport}
            onClose={() => setShowImtpReport(null)}
            history={currentAssessments.imtp || []}
            updateAssessment={updateAssessment}
            setShowImtpReport={setShowImtpReport}
          />
        )}
        {showCmjReport && (
          <CmjReport
            athlete={athlete}
            data={showCmjReport}
            onClose={() => setShowCmjReport(null)}
            history={currentAssessments.cmj}
          />
        )}
        {showDropJumpReport && (
          <DropJumpReport
            athlete={athlete}
            data={showDropJumpReport}
            onClose={() => setShowDropJumpReport(null)}
            history={currentAssessments.dropJump || []}
          />
        )}
        {showVo2Report && (
          <Vo2maxReport
            athlete={athlete}
            data={showVo2Report}
            onClose={() => setShowVo2Report(null)}
            history={currentAssessments.vo2max}
          />
        )}
        {showSpeedReport && (
          <SpeedReport
            athlete={athlete}
            data={showSpeedReport}
            onClose={() => setShowSpeedReport(null)}
            history={currentAssessments.speed}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const DataRow: FC<{
  label: string;
  value: string | number;
  diff?: React.ReactNode;
}> = ({ label, value, diff }) => (
  <div className="flex justify-between border-b border-slate-800/50 py-3 md:py-4 group/row">
    <span className="text-[11px] md:text-[12px] font-black text-slate-500 uppercase tracking-widest group-hover/row:text-slate-400 transition-colors">
      {label}
    </span>
    <div className="flex items-center gap-2">
      <span className="text-[11px] md:text-[13px] font-black text-brand-primary italic drop-shadow-[0_0_5px_rgba(75,222,5,0.2)]">
        {value}
      </span>
      {diff}
    </div>
  </div>
);

// --- COMPONENTS PARA PERIODIZAÇÃO ---
const PeriodizationConfig: FC<{
  start?: string;
  end?: string;
  days: number[];
  academyDays?: number[];
  courtDays?: number[];
  onChange: (data: { start?: string; end?: string; days: number[]; academyDays: number[]; courtDays: number[] }) => void;
}> = ({ start, end, days, academyDays = [], courtDays = [], onChange }) => {
  const weekDays = [
    { id: 0, label: "Dom" },
    { id: 1, label: "Seg" },
    { id: 2, label: "Ter" },
    { id: 3, label: "Qua" },
    { id: 4, label: "Qui" },
    { id: 5, label: "Sex" },
    { id: 6, label: "Sab" },
  ];

  const toggleAcademyDay = (id: number) => {
    const newAcademy = academyDays.includes(id)
      ? academyDays.filter((d) => d !== id)
      : [...academyDays, id].sort();
    
    const unionDays = Array.from(new Set([...newAcademy, ...courtDays])).sort();
    onChange({ start, end, days: unionDays, academyDays: newAcademy, courtDays });
  };

  const toggleCourtDay = (id: number) => {
    const newCourt = courtDays.includes(id)
      ? courtDays.filter((d) => d !== id)
      : [...courtDays, id].sort();
    
    const unionDays = Array.from(new Set([...academyDays, ...newCourt])).sort();
    onChange({ start, end, days: unionDays, academyDays, courtDays: newCourt });
  };

  return (
    <div className="space-y-6 bg-slate-950/50 p-6 rounded-3xl border border-slate-800">
      <h3 className="text-xs font-black uppercase text-brand-primary tracking-widest flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Configuração de Periodização Inteligente
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Data Início"
          type="date"
          value={start || ""}
          onChange={(v) => onChange({ start: v, end, days, academyDays, courtDays })}
        />
        <Field
          label="Data Término"
          type="date"
          value={end || ""}
          onChange={(v) => onChange({ start, end: v, days, academyDays, courtDays })}
        />
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-[10px] font-black text-brand-primary uppercase flex items-center gap-1.5 mb-2.5 px-1 tracking-wider">
            <Dumbbell className="w-3.5 h-3.5 text-brand-primary" />
            Dias de Treino na Academia (Fortalecimento & Força)
          </label>
          <div className="flex flex-wrap gap-2">
            {weekDays.map((day) => (
              <button
                key={day.id}
                type="button"
                onClick={() => toggleAcademyDay(day.id)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                  academyDays.includes(day.id)
                    ? "bg-brand-primary border-brand-primary text-brand-dark shadow-[0_0_15px_rgba(57,255,20,0.15)]"
                    : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-brand-secondary uppercase flex items-center gap-1.5 mb-2.5 px-1 tracking-wider">
            <Target className="w-3.5 h-3.5 text-brand-secondary" />
            Dias de Treino em Campo/Quadra (Técnico & Tático)
          </label>
          <div className="flex flex-wrap gap-2">
            {weekDays.map((day) => (
              <button
                key={day.id}
                type="button"
                onClick={() => toggleCourtDay(day.id)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                  courtDays.includes(day.id)
                    ? "bg-brand-secondary border-brand-secondary text-brand-dark shadow-[0_0_15px_rgba(57,255,20,0.15)]"
                    : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- FORMS (Athlete, Assessment, Wellness) ---
const AthleteForm: FC<{
  onSave: (data: any) => void;
  onCancel: () => void;
  initialData?: Athlete;
}> = ({ onSave, onCancel, initialData }) => {
  const [formData, setFormData] = useState<Partial<Athlete>>(
    initialData || {
      name: "",
      dob: "",
      gender: "M",
      modality: "",
      competitiveLevel: "amador",
      position: "",
      goal: "",
      weeklyFrequency: 3,
      injuryHistory: "",
      injuries: [],
      periodizationStart: "",
      periodizationEnd: "",
      trainingDays: [1, 3, 5], // Seg, Qua, Sex por padrão
    },
  );

  const update = (fields: Partial<Athlete>) => {
    setFormData((prev) => {
      const newData = { ...prev, ...fields };
      if (fields.trainingDays) {
        newData.weeklyFrequency = fields.trainingDays.length;
      }
      return newData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Card
      className="max-w-2xl w-full mx-auto space-y-10 bg-slate-900 border-slate-800 p-8 md:p-12 shadow-2xl"
      title="Bio-Profile Atleta Elite"
    >
      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="space-y-6">
          <div className="space-y-6 bg-slate-950/30 p-6 rounded-3xl border border-slate-800">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-[0.2em] mb-4">
              Dados Básicos
            </h3>

            {/* Foto de Perfil */}
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase block mb-3 px-1">
                Foto de Perfil do Atleta
              </label>
              <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden relative">
                  {formData.photoUrl ? (
                    <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-8 h-8 text-slate-600" />
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-grow">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-3.5 py-2 bg-brand-primary text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer hover:bg-brand-primary/90 transition-all flex items-center gap-1.5 shadow-md">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Tirar Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            processProfileImageFile(file, (base64) => {
                              update({ photoUrl: base64 });
                              toast.success("Foto tirada e atualizada!");
                            });
                          }
                        }}
                      />
                    </label>
                    <label className="px-3.5 py-2 bg-slate-800 text-slate-200 border border-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer hover:bg-slate-700 transition-all flex items-center gap-1.5 shadow-md">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Galeria</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            processProfileImageFile(file, (base64) => {
                              update({ photoUrl: base64 });
                              toast.success("Foto carregada com sucesso!");
                            });
                          }
                        }}
                      />
                    </label>
                    {formData.photoUrl && (
                      <button
                        type="button"
                        onClick={() => update({ photoUrl: undefined })}
                        className="px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-500 font-bold">
                    Suporta JPG, PNG e WEBP. Otimização automática de tamanho.
                  </p>
                </div>
              </div>
            </div>

            <Field
              label="Nome Completo Atleta"
              value={formData.name || ""}
              onChange={(v) => update({ name: v })}
              type="text"
            />

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Nascimento"
                type="date"
                value={formData.dob || ""}
                onChange={(v) => update({ dob: v })}
              />
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase block mb-3 px-1">
                  Gênero
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) =>
                    update({ gender: e.target.value as "M" | "F" })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-xs text-white font-black outline-none"
                >
                  <option value="M" className="bg-slate-900">
                    Masculino
                  </option>
                  <option value="F" className="bg-slate-900">
                    Feminino
                  </option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase block mb-3 px-1">
                  Modalidade Elite
                </label>
                <input
                  type="text"
                  list="modalidades-list"
                  value={formData.modality || ""}
                  onChange={(e) => update({ modality: e.target.value })}
                  placeholder="Selecione ou digite..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-xs text-white font-black outline-none focus:border-brand-primary"
                />
                <datalist id="modalidades-list">
                  {Object.values(SPORTS_DATA).flatMap((cat) => cat.sports).map((s, idx) => (
                    <option key={idx} value={s.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase block mb-3 px-1">
                  Nível
                </label>
                <select
                  value={formData.competitiveLevel}
                  onChange={(e) =>
                    update({ competitiveLevel: e.target.value as any })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-xs text-white font-black outline-none"
                >
                  <option value="amador" className="bg-slate-900">
                    Em Desenvolvimento (Iniciante)
                  </option>
                  <option value="competitivo" className="bg-slate-900">
                    Competitivo (Intermediário)
                  </option>
                  <option value="avancado" className="bg-slate-900">
                    Avançado (Alto Rendimento)
                  </option>
                  <option value="elite" className="bg-slate-900">
                    Elite Mundial (Pro)
                  </option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Posição"
                value={formData.position || ""}
                onChange={(v) => update({ position: v })}
                type="text"
              />
              <Field
                label="Objetivo"
                value={formData.goal || ""}
                onChange={(v) => update({ goal: v })}
                type="text"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-black text-slate-500 uppercase block mb-3 px-1">
            Diretrizes e Observações de Performance (Geral)
          </label>
          <textarea
            value={formData.injuryHistory || ""}
            onChange={(e) => update({ injuryHistory: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-sm text-white font-black h-24 outline-none resize-none"
            placeholder="Diretrizes adicionais do treinador para o perfil deste atleta..."
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 border-t border-slate-800 pt-10">
          <Button
            onClick={onCancel}
            variant="secondary"
            className="w-full py-5"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="w-full py-5 bg-brand-primary text-brand-dark"
          >
            Salvar Perfil Elite
          </Button>
        </div>
      </form>
    </Card>
  );
};

const AssessmentForm: FC<{
  type: AssessmentType;
  onSave: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
  athlete?: Athlete;
}> = ({ type, onSave, onCancel, initialData, athlete }) => {
  const [date, setDate] = useState(
    initialData?.date || getLocalDateString(),
  );

  const getDefaults = (t: AssessmentType) => {
    switch (t) {
      case "bioimpedance":
        return {
          weight: 0,
          fatPercentage: 0,
          muscleMass: 0,
          visceralFat: 0,
          hydration: 0,
          basalMetabolism: 0,
          metabolicAge: 0,
          boneMass: 0,
          physiqueRating: 0,
          fatArmR: 0,
          fatArmL: 0,
          fatLegR: 0,
          fatLegL: 0,
          fatTrunk: 0,
          muscleArmR: 0,
          muscleArmL: 0,
          muscleLegR: 0,
          muscleLegL: 0,
          muscleTrunk: 0,
          observations: "",
        };
      case "isometricStrength":
        return {
          quadricepsR: 0,
          quadricepsL: 0,
          hamstringsR: 0,
          hamstringsL: 0,
          iqRatioR: 0,
          iqRatioL: 0,
          quadricepsDetailsR: {
            repetitions: 2,
            peakForce: 0,
            relativePeakForce: 0,
            timeToPeakForce: 4000,
            meanForce: 0,
            forcePico: 0, rfdPico: 0, impulsePico: 0, forceMeanPico: 0,
            force100: 0, rfd100: 0, impulse100: 0, forceMean100: 0,
            force200: 0, rfd200: 0, impulse200: 0, forceMean200: 0,
            force300: 0, rfd300: 0, impulse300: 0, forceMean300: 0,
          },
          quadricepsDetailsL: {
            repetitions: 2,
            peakForce: 0,
            relativePeakForce: 0,
            timeToPeakForce: 4000,
            meanForce: 0,
            forcePico: 0, rfdPico: 0, impulsePico: 0, forceMeanPico: 0,
            force100: 0, rfd100: 0, impulse100: 0, forceMean100: 0,
            force200: 0, rfd200: 0, impulse200: 0, forceMean200: 0,
            force300: 0, rfd300: 0, impulse300: 0, forceMean300: 0,
          },
          hamstringsDetailsR: {
            repetitions: 2,
            peakForce: 0,
            relativePeakForce: 0,
            timeToPeakForce: 4000,
            meanForce: 0,
            forcePico: 0, rfdPico: 0, impulsePico: 0, forceMeanPico: 0,
            force100: 0, rfd100: 0, impulse100: 0, forceMean100: 0,
            force200: 0, rfd200: 0, impulse200: 0, forceMean200: 0,
            force300: 0, rfd300: 0, impulse300: 0, forceMean300: 0,
          },
          hamstringsDetailsL: {
            repetitions: 2,
            peakForce: 0,
            relativePeakForce: 0,
            timeToPeakForce: 4000,
            meanForce: 0,
            forcePico: 0, rfdPico: 0, impulsePico: 0, forceMeanPico: 0,
            force100: 0, rfd100: 0, impulse100: 0, forceMean100: 0,
            force200: 0, rfd200: 0, impulse200: 0, forceMean200: 0,
            force300: 0, rfd300: 0, impulse300: 0, forceMean300: 0,
          },
          observations: "",
        };
      case "imtp":
        return {
          weight: athlete?.assessments?.bioimpedance?.[0]?.weight || 70,
          peakForce: 0,
          relativePeakForce: 0,
          timeToPeakForce: 4000,
          meanForce: 0,
          rfdPeak: 0,
          rfd100: 0,
          rfd200: 0,
          rfd300: 0,
          impulsePeak: 0,
          impulse100: 0,
          impulse200: 0,
          impulse300: 0,
          observations: "",
        };
      case "cmj":
        const latestBio = athlete?.assessments?.bioimpedance?.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )?.[0];
        return {
          weight: latestBio?.weight || 0,
          height: 0,
          power: 0,
          depth: 30,
          flightTime: 0,
          rsi: 0,
          averageForce: 0,
          observations: "",
        };
      case "dropJump":
        return {
          weight: 0,
          dropHeight: 30,
          jumpHeight: 0,
          flightTime: 0,
          contactTime: 0,
          meanForce: 0,
          meanPower: 0,
          stiffness: 0,
          rsi: 0,
          observations: "",
        };
      case "vo2max":
        return {
          vo2max: 0,
          maxHeartRate: 0,
          thresholdHeartRate: 0,
          maxSpeed: 0,
          thresholdSpeed: 0,
          vam: 0,
          rec10s: 0,
          rec30s: 0,
          rec60s: 0,
          maxVentilation: 0,
          observations: "",
        };
      case "speed":
        return {
          time5m: 0,
          time10m: 0,
          time20m: 0,
          time30m: 0,
          speed5m: 0,
          speed10m: 0,
          speed20m: 0,
          speed30m: 0,
          observations: "",
        };
      default:
        return { observations: "" };
    }
  };

  const [formData, setFormData] = useState(initialData || getDefaults(type));
  const [activeMuscleTab, setActiveMuscleTab] = useState<"quadricepsDetailsR" | "quadricepsDetailsL" | "hamstringsDetailsR" | "hamstringsDetailsL" | null>(null);

  const updateField = (field: string, val: any) => {
    setFormData((prev: any) => {
      let updated = { ...prev, [field]: val };
      if (type === "cmj") {
        // No automatic calculation for any parameters to prevent differences with the professional assessment app
      }
      if (type === "dropJump") {
        // No automatic calculation for RSI and stiffness in order to allow full manual entry as requested
      }
      return updated;
    });
  };

  const updateMuscleDetailField = (
    muscle: "quadricepsDetailsR" | "quadricepsDetailsL" | "hamstringsDetailsR" | "hamstringsDetailsL",
    field: keyof MuscleAssessmentDetails,
    val: any
  ) => {
    setFormData((prev: any) => {
      const details = prev[muscle] || {};
      const updatedDetails = { ...details, [field]: val };
      let updatedRoot = { ...prev, [muscle]: updatedDetails };
      
      // Keep root values in sync when sub-field peakForce is changed
      if (field === "peakForce") {
        if (muscle === "quadricepsDetailsR") updatedRoot.quadricepsR = val;
        if (muscle === "quadricepsDetailsL") updatedRoot.quadricepsL = val;
        if (muscle === "hamstringsDetailsR") updatedRoot.hamstringsR = val;
        if (muscle === "hamstringsDetailsL") updatedRoot.hamstringsL = val;
      }
      return updatedRoot;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalData = { ...formData, date };
    if (type === "isometricStrength") {
      const athleteWeight = athlete?.weight || 70;
      
      const syncDetails = (detailsKey: "quadricepsDetailsR" | "quadricepsDetailsL" | "hamstringsDetailsR" | "hamstringsDetailsL", peakVal: number) => {
        if (!finalData[detailsKey]) {
          finalData[detailsKey] = {
            repetitions: 2,
            peakForce: peakVal,
            relativePeakForce: parseFloat((peakVal / athleteWeight).toFixed(2)),
            timeToPeakForce: 4000,
            meanForce: peakVal * 0.85,
            forcePico: peakVal, rfdPico: 120, impulsePico: peakVal * 40, forceMeanPico: peakVal * 0.85,
            force100: peakVal * 0.05, rfd100: 250, impulse100: 3, forceMean100: 3,
            force200: peakVal * 0.06, rfd200: 150, impulse200: 6, forceMean200: 3,
            force300: peakVal * 0.13, rfd300: 220, impulse300: 11, forceMean300: 4,
          };
        } else {
          finalData[detailsKey] = {
            ...finalData[detailsKey],
            peakForce: peakVal,
            relativePeakForce: parseFloat((peakVal / athleteWeight).toFixed(2))
          };
        }
      };
      
      syncDetails("quadricepsDetailsR", finalData.quadricepsR);
      syncDetails("quadricepsDetailsL", finalData.quadricepsL);
      syncDetails("hamstringsDetailsR", finalData.hamstringsR);
      syncDetails("hamstringsDetailsL", finalData.hamstringsL);

      finalData.iqRatioR = getIQRatioStatus(
        finalData.hamstringsR,
        finalData.quadricepsR,
      ).ratio;
      finalData.iqRatioL = getIQRatioStatus(
        finalData.hamstringsL,
        finalData.quadricepsL,
      ).ratio;
    }
    if (type === "imtp") {
      const bioWeight = finalData.weight || athlete?.assessments?.bioimpedance?.[0]?.weight || 70;
      finalData.relativePeakForce = parseFloat((finalData.peakForce / bioWeight).toFixed(2));
    }
    if (type === "cmj") {
      const latestBio = athlete?.assessments?.bioimpedance?.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )?.[0];
      const bioWeight = finalData.weight || latestBio?.weight || 70;
      finalData.weight = bioWeight;
    }
    onSave(finalData);
  };

  return (
    <Card
      className="max-w-lg w-full mx-auto bg-slate-900 border-slate-800 h-fit overflow-visible shadow-2xl"
      title={`Lançar Dados Elite: ${
        type === "bioimpedance" ? "Bioimpedância" :
        type === "isometricStrength" ? "Força Isométrica" :
        type === "imtp" ? "Meio Agachamento (IMTP)" :
        type === "cmj" ? "Salto CMJ" :
        type === "speed" ? "Velocidade" :
        type === "dropJump" ? "Salto Drop Jump" :
        type === "vo2max" ? "VO2 Máx" :
        "Avaliação"
      }`}
    >
      <form onSubmit={handleSubmit} className="space-y-6 pb-10">
        <div>
          <label className="text-[10px] font-black text-slate-600 uppercase block mb-2 px-1">
            Data da Coleta Elite
          </label>
          <input
            type="date"
            value={date.split("T")[0]}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-4 text-xs sm:text-sm text-white font-black outline-none"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4 md:gap-6">
          {type === "bioimpedance" && (
            <>
              <Field
                label="Peso Atual (kg)"
                value={formData.weight}
                onChange={(v) => updateField("weight", parseFloat(v))}
              />
              <Field
                label="Metabolismo Basal (kcal)"
                value={formData.basalMetabolism}
                onChange={(v) => updateField("basalMetabolism", parseFloat(v))}
              />
              <Field
                label="Idade Corporal"
                value={formData.metabolicAge}
                onChange={(v) => updateField("metabolicAge", parseFloat(v))}
              />
              <Field
                label="Água (%)"
                value={formData.hydration}
                onChange={(v) => updateField("hydration", parseFloat(v))}
              />
              <Field
                label="Gordura Visceral"
                value={formData.visceralFat}
                onChange={(v) => updateField("visceralFat", parseFloat(v))}
              />
              <Field
                label="Massa Óssea (kg)"
                value={formData.boneMass}
                onChange={(v) => updateField("boneMass", parseFloat(v))}
              />
              <Field
                label="Gordura Total (%)"
                value={formData.fatPercentage}
                onChange={(v) => updateField("fatPercentage", parseFloat(v))}
              />

              <div className="col-span-2 mt-4 pt-4 border-t border-slate-800">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">
                  Gordura Segmentada (%)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Braço Esquerdo"
                    value={formData.fatArmL}
                    onChange={(v) => updateField("fatArmL", parseFloat(v))}
                  />
                  <Field
                    label="Braço Direito"
                    value={formData.fatArmR}
                    onChange={(v) => updateField("fatArmR", parseFloat(v))}
                  />
                  <Field
                    label="Perna Direita"
                    value={formData.fatLegR}
                    onChange={(v) => updateField("fatLegR", parseFloat(v))}
                  />
                  <Field
                    label="Perna Esquerda"
                    value={formData.fatLegL}
                    onChange={(v) => updateField("fatLegL", parseFloat(v))}
                  />
                  <div className="col-span-2">
                    <Field
                      label="Tronco"
                      value={formData.fatTrunk}
                      onChange={(v) => updateField("fatTrunk", parseFloat(v))}
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-2 mt-4 pt-4 border-t border-slate-800">
                <Field
                  label="Músculo Total (kg)"
                  value={formData.muscleMass}
                  onChange={(v) => updateField("muscleMass", parseFloat(v))}
                />
                <p className="text-[10px] font-black text-slate-500 uppercase mb-3 mt-4 tracking-widest">
                  Músculo Segmentado (kg)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Braço Esquerdo"
                    value={formData.muscleArmL}
                    onChange={(v) => updateField("muscleArmL", parseFloat(v))}
                  />
                  <Field
                    label="Braço Direito"
                    value={formData.muscleArmR}
                    onChange={(v) => updateField("muscleArmR", parseFloat(v))}
                  />
                  <Field
                    label="Perna Direita"
                    value={formData.muscleLegR}
                    onChange={(v) => updateField("muscleLegR", parseFloat(v))}
                  />
                  <Field
                    label="Perna Esquerda"
                    value={formData.muscleLegL}
                    onChange={(v) => updateField("muscleLegL", parseFloat(v))}
                  />
                  <div className="col-span-2">
                    <Field
                      label="Tronco"
                      value={formData.muscleTrunk}
                      onChange={(v) =>
                        updateField("muscleTrunk", parseFloat(v))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-2 mt-4 pt-4 border-t border-slate-800">
                <Field
                  label="Escala Const. Física"
                  value={formData.physiqueRating}
                  onChange={(v) => updateField("physiqueRating", parseFloat(v))}
                />
              </div>
            </>
          )}
          {type === "isometricStrength" && (
            <>
              <div className="col-span-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 select-none">
                  FORÇA ISOMÉTRICA DE JOELHO (MIVC)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Quadríceps Dir. (kgf)"
                    value={formData.quadricepsR}
                    onChange={(v) => {
                      const num = parseFloat(v) || 0;
                      updateField("quadricepsR", num);
                      updateMuscleDetailField("quadricepsDetailsR", "peakForce", num);
                    }}
                  />
                  <Field
                    label="Quadríceps Esq. (kgf)"
                    value={formData.quadricepsL}
                    onChange={(v) => {
                      const num = parseFloat(v) || 0;
                      updateField("quadricepsL", num);
                      updateMuscleDetailField("quadricepsDetailsL", "peakForce", num);
                    }}
                  />
                  <Field
                    label="Posterior Dir. (kgf)"
                    value={formData.hamstringsR}
                    onChange={(v) => {
                      const num = parseFloat(v) || 0;
                      updateField("hamstringsR", num);
                      updateMuscleDetailField("hamstringsDetailsR", "peakForce", num);
                    }}
                  />
                  <Field
                    label="Posterior Esq. (kgf)"
                    value={formData.hamstringsL}
                    onChange={(v) => {
                      const num = parseFloat(v) || 0;
                      updateField("hamstringsL", num);
                      updateMuscleDetailField("hamstringsDetailsL", "peakForce", num);
                    }}
                  />
                </div>
              </div>

              {/* Collapsible Elite Details Selection */}
              <div className="col-span-2 mt-6 pt-4 border-t border-slate-800">
                <p className="text-[10px] font-black text-brand-primary uppercase mb-4 tracking-widest italic select-none">
                  ⚡ CURVA FORÇA-TEMPO ELITE (QUADRÍCEPS & ISQUIOTIBIAIS)
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { key: "quadricepsDetailsR", label: "Quadríceps Direito" },
                    { key: "quadricepsDetailsL", label: "Quadríceps Esquerdo" },
                    { key: "hamstringsDetailsR", label: "Posterior Direito" },
                    { key: "hamstringsDetailsL", label: "Posterior Esquerdo" }
                  ].map((btn) => (
                    <button
                      key={btn.key}
                      type="button"
                      onClick={() => setActiveMuscleTab(activeMuscleTab === btn.key ? null : btn.key as any)}
                      className={`text-[9px] font-black uppercase tracking-wider py-2 px-3 rounded-lg border transition-all cursor-pointer ${
                        activeMuscleTab === btn.key
                          ? "bg-brand-primary/20 text-brand-primary border-brand-primary"
                          : "bg-slate-900/40 text-slate-400 border-slate-800 hover:text-slate-350"
                      }`}
                    >
                      {activeMuscleTab === btn.key ? "▼ " : "► "}
                      {btn.label}
                    </button>
                  ))}
                </div>

                {activeMuscleTab && (() => {
                  const details = formData[activeMuscleTab] || {};
                  const title = activeMuscleTab === "quadricepsDetailsR"
                    ? "Quadríceps Dir."
                    : activeMuscleTab === "quadricepsDetailsL"
                      ? "Quadríceps Esq."
                      : activeMuscleTab === "hamstringsDetailsR"
                        ? "Posterior Dir."
                        : "Posterior Esq.";

                  return (
                    <div className="bg-[#030712] border border-slate-800/80 rounded-2xl p-4 mt-2 space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800/60 select-none">
                        <span className="text-[10px] font-extrabold text-white uppercase tracking-wider">
                          Métricas da Curva - {title}
                        </span>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-900 px-2.5 py-1 rounded-md border border-slate-850">
                          Elite Analytics
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <Field
                          label="Repetições"
                          value={details.repetitions}
                          onChange={(v) => updateMuscleDetailField(activeMuscleTab, "repetitions", parseInt(v) || 0)}
                        />
                        <Field
                          label="Tempo Força Máx (ms)"
                          value={details.timeToPeakForce}
                          onChange={(v) => updateMuscleDetailField(activeMuscleTab, "timeToPeakForce", parseInt(v) || 0)}
                        />
                        <Field
                          label="Força Média (kgf)"
                          value={details.meanForce}
                          onChange={(v) => updateMuscleDetailField(activeMuscleTab, "meanForce", parseFloat(v) || 0)}
                        />
                      </div>

                      {/* Intervals Table Input */}
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">
                          Tabela de Intervalos de Tempo (@Pico, @100ms, @200ms, @300ms)
                        </p>
                        
                        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#060b18]/80">
                          <table className="w-full text-left border-collapse font-sans text-[10px]">
                            <thead>
                              <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 font-extrabold uppercase tracking-wider">
                                <th className="p-2 select-none">Métrica</th>
                                <th className="p-2 select-none text-center">@Pico</th>
                                <th className="p-2 select-none text-center">@100ms</th>
                                <th className="p-2 select-none text-center">@200ms</th>
                                <th className="p-2 select-none text-center">@300ms</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850/60">
                              {/* Row 1: Força (KG) */}
                              <tr className="hover:bg-slate-900/30">
                                <td className="p-2 font-black text-slate-300 uppercase">Força (KG)</td>
                                {[
                                  { suffix: "Pico" },
                                  { suffix: "100" },
                                  { suffix: "200" },
                                  { suffix: "300" }
                                ].map((col) => (
                                  <td key={col.suffix} className="p-1">
                                    <TableInput
                                      value={details[`force${col.suffix}`]}
                                      onChange={(val) => updateMuscleDetailField(activeMuscleTab, `force${col.suffix}` as any, val)}
                                    />
                                  </td>
                                ))}
                              </tr>

                              {/* Row 2: RFD (N/s) */}
                              <tr className="hover:bg-slate-900/30">
                                <td className="p-2 font-black text-slate-300 uppercase">RFD (N/s)</td>
                                {[
                                  { suffix: "Pico" },
                                  { suffix: "100" },
                                  { suffix: "200" },
                                  { suffix: "300" }
                                ].map((col) => (
                                  <td key={col.suffix} className="p-1">
                                    <TableInput
                                      value={details[`rfd${col.suffix}`]}
                                      onChange={(val) => updateMuscleDetailField(activeMuscleTab, `rfd${col.suffix}` as any, val)}
                                    />
                                  </td>
                                ))}
                              </tr>

                              {/* Row 3: Impulso (Ns) */}
                              <tr className="hover:bg-slate-900/30">
                                <td className="p-2 font-black text-slate-300 uppercase">Impulso (Ns)</td>
                                {[
                                  { suffix: "Pico" },
                                  { suffix: "100" },
                                  { suffix: "200" },
                                  { suffix: "300" }
                                ].map((col) => (
                                  <td key={col.suffix} className="p-1">
                                    <TableInput
                                      value={details[`impulse${col.suffix}`]}
                                      onChange={(val) => updateMuscleDetailField(activeMuscleTab, `impulse${col.suffix}` as any, val)}
                                    />
                                  </td>
                                ))}
                              </tr>

                              {/* Row 4: F. Média (KG) */}
                              <tr className="hover:bg-slate-900/30">
                                <td className="p-2 font-black text-slate-300 uppercase">F. Média (KG)</td>
                                {[
                                  { suffix: "Pico" },
                                  { suffix: "100" },
                                  { suffix: "200" },
                                  { suffix: "300" }
                                ].map((col) => (
                                  <td key={col.suffix} className="p-1">
                                    <TableInput
                                      value={details[`forceMean${col.suffix}`]}
                                      onChange={(val) => updateMuscleDetailField(activeMuscleTab, `forceMean${col.suffix}` as any, val)}
                                    />
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
          {type === "imtp" && (
            <>
              <Field
                label="Força Máxima (kgf)"
                value={formData.peakForce}
                onChange={(v) => updateField("peakForce", parseFloat(v))}
              />
              <Field
                label="Peso do Atleta (kg)"
                value={formData.weight}
                onChange={(v) => updateField("weight", parseFloat(v))}
              />
              <Field
                label="Tempo Até Força Máx (ms)"
                value={formData.timeToPeakForce}
                onChange={(v) => updateField("timeToPeakForce", parseFloat(v))}
              />
              <Field
                label="Força Média (kgf)"
                value={formData.meanForce}
                onChange={(v) => updateField("meanForce", parseFloat(v))}
              />
              <div className="col-span-2 mt-4 pt-4 border-t border-slate-800">
                <p className="text-[10px] font-black text-brand-primary uppercase mb-3 tracking-widest italic">
                  Métricas Elite (RFDs e Impulsos)
                </p>
              </div>
              <Field
                label="Pico RFD (N/s)"
                value={formData.rfdPeak}
                onChange={(v) => updateField("rfdPeak", parseFloat(v))}
              />
              <Field
                label="RFD @100ms (N/s)"
                value={formData.rfd100}
                onChange={(v) => updateField("rfd100", parseFloat(v))}
              />
              <Field
                label="RFD @200ms (N/s)"
                value={formData.rfd200}
                onChange={(v) => updateField("rfd200", parseFloat(v))}
              />
              <Field
                label="RFD @300ms (N/s)"
                value={formData.rfd300}
                onChange={(v) => updateField("rfd300", parseFloat(v))}
              />
              <Field
                label="Impulso Total (N·s)"
                value={formData.impulsePeak}
                onChange={(v) => updateField("impulsePeak", parseFloat(v))}
              />
              <Field
                label="Impulso @100ms (N·s)"
                value={formData.impulse100}
                onChange={(v) => updateField("impulse100", parseFloat(v))}
              />
              <Field
                label="Impulso @200ms (N·s)"
                value={formData.impulse200}
                onChange={(v) => updateField("impulse200", parseFloat(v))}
              />
              <Field
                label="Impulso @300ms (N·s)"
                value={formData.impulse300}
                onChange={(v) => updateField("impulse300", parseFloat(v))}
              />
            </>
          )}
           {type === "cmj" && (
            <>
              <div className="col-span-2">
                <Field
                  label="Peso (kg)"
                  value={formData.weight}
                  onChange={(v) => updateField("weight", isNaN(parseFloat(v)) ? 0 : parseFloat(v))}
                />
              </div>
              <Field
                label="Altura (mm)"
                value={formData.height !== undefined ? Math.round(formData.height * 10) : ""}
                onChange={(v) => updateField("height", isNaN(parseFloat(v)) ? 0 : parseFloat(v) / 10)}
              />
              <Field
                label="Força Média (N)"
                value={formData.averageForce}
                onChange={(v) => updateField("averageForce", isNaN(parseFloat(v)) ? 0 : parseFloat(v))}
              />
              <Field
                label="Potência Média (w)"
                value={formData.power}
                onChange={(v) => updateField("power", isNaN(parseFloat(v)) ? 0 : parseFloat(v))}
              />
              <Field
                label="Tempo de Voo (ms)"
                value={formData.flightTime}
                onChange={(v) => updateField("flightTime", isNaN(parseFloat(v)) ? 0 : parseFloat(v))}
              />
              <Field
                label="Profundidade do Agachamento (cm)"
                value={formData.depth}
                onChange={(v) => updateField("depth", isNaN(parseFloat(v)) ? 0 : parseFloat(v))}
              />
            </>
          )}
          {type === "dropJump" && (
            <>
              <Field
                label="Peso (kg)"
                value={formData.weight}
                onChange={(v) => updateField("weight", parseFloat(v))}
              />
              <Field
                label="Altura da Queda (cm)"
                value={formData.dropHeight !== undefined ? formData.dropHeight : 30}
                onChange={(v) => updateField("dropHeight", parseFloat(v) || 0)}
              />
              <Field
                label="Altura do Salto (cm)"
                value={formData.jumpHeight}
                onChange={(v) => updateField("jumpHeight", parseFloat(v))}
              />
              <Field
                label="Força Média (N)"
                value={formData.meanForce}
                onChange={(v) => updateField("meanForce", parseFloat(v))}
              />
              <Field
                label="Potência Média (W)"
                value={formData.meanPower}
                onChange={(v) => updateField("meanPower", parseFloat(v))}
              />
              <Field
                label="Tempo de Contato (ms)"
                value={formData.contactTime}
                onChange={(v) => updateField("contactTime", parseFloat(v))}
              />
              <Field
                label="Tempo de Vôo (ms)"
                value={formData.flightTime}
                onChange={(v) => updateField("flightTime", parseFloat(v))}
              />
              <Field
                label="Índice RSI (Índice de Força Reativa)"
                value={formData.rsi}
                onChange={(v) => updateField("rsi", parseFloat(v))}
              />
              <Field
                label="Rigidez (N/m)"
                value={formData.stiffness}
                onChange={(v) => updateField("stiffness", parseFloat(v))}
              />
            </>
          )}
          {type === "vo2max" && (
            <>
              <Field
                label="VO2 Máximo"
                value={formData.vo2max}
                onChange={(v) => updateField("vo2max", parseFloat(v))}
              />
              <Field
                label="Ventilação Máxima (L/min)"
                value={formData.maxVentilation}
                onChange={(v) => updateField("maxVentilation", parseFloat(v))}
              />
              <Field
                label="VAM (km/h)"
                value={formData.vam}
                onChange={(v) => updateField("vam", parseFloat(v))}
              />
              <Field
                label="FC Máxima (bpm)"
                value={formData.maxHeartRate}
                onChange={(v) => updateField("maxHeartRate", parseFloat(v))}
              />
              <Field
                label="FC Limiar (bpm)"
                value={formData.thresholdHeartRate}
                onChange={(v) =>
                  updateField("thresholdHeartRate", parseFloat(v))
                }
              />
              <Field
                label="Velocidade Máxima"
                value={formData.maxSpeed}
                onChange={(v) => updateField("maxSpeed", parseFloat(v))}
              />
              <Field
                label="Velocidade Limiar"
                value={formData.thresholdSpeed}
                onChange={(v) => updateField("thresholdSpeed", parseFloat(v))}
              />
              <Field
                label="Recup. 10s"
                value={formData.rec10s}
                onChange={(v) => updateField("rec10s", parseFloat(v))}
              />
              <Field
                label="Recup. 30s"
                value={formData.rec30s}
                onChange={(v) => updateField("rec30s", parseFloat(v))}
              />
              <Field
                label="Recup. 60s"
                value={formData.rec60s}
                onChange={(v) => updateField("rec60s", parseFloat(v))}
              />
            </>
          )}
          {type === "speed" && (
            <>
              <Field
                label="Tempo 5m (s)"
                value={formData.time5m}
                onChange={(v) => {
                  const t = parseFloat(v) || 0;
                  setFormData((prev: any) => ({
                    ...prev,
                    time5m: t,
                    speed5m: t > 0 ? 5 / t : 0,
                  }));
                }}
              />
              <Field
                label="Tempo 10m (s)"
                value={formData.time10m}
                onChange={(v) => {
                  const t = parseFloat(v) || 0;
                  setFormData((prev: any) => ({
                    ...prev,
                    time10m: t,
                    speed10m: t > 0 ? 10 / t : 0,
                  }));
                }}
              />
              <Field
                label="Tempo 20m (s)"
                value={formData.time20m}
                onChange={(v) => {
                  const t = parseFloat(v) || 0;
                  setFormData((prev: any) => ({
                    ...prev,
                    time20m: t,
                    speed20m: t > 0 ? 20 / t : 0,
                  }));
                }}
              />
              <Field
                label="Tempo 30m (s)"
                value={formData.time30m}
                onChange={(v) => {
                  const t = parseFloat(v) || 0;
                  setFormData((prev: any) => ({
                    ...prev,
                    time30m: t,
                    speed30m: t > 0 ? 30 / t : 0,
                  }));
                }}
              />
            </>
          )}
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 px-1">
            Observações do Avaliador
          </label>
          <textarea
            value={formData.observations || ""}
            onChange={(e) => updateField("observations", e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-black outline-none h-24 resize-none text-xs"
            placeholder="Ex: Atleta relatou cansaço..."
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button onClick={onCancel} variant="secondary" className="w-full">
            Voltar
          </Button>
          <Button type="submit" className="w-full">
            Salvar Dados
          </Button>
        </div>
      </form>
    </Card>
  );
};

const TableInput: FC<{
  value: any;
  onChange: (val: number) => void;
}> = ({ value, onChange }) => {
  const [localValue, setLocalValue] = useState<string>("");

  useEffect(() => {
    const propNum = parseFloat(value) || 0;
    const localNum = parseFloat(localValue) || 0;
    if (propNum !== localNum || (value !== 0 && localValue === "")) {
      setLocalValue(value === undefined || value === null || value === 0 ? "" : String(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    val = val.replace(",", ".");
    setLocalValue(val);
    onChange(parseFloat(val) || 0);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={localValue}
      onChange={handleChange}
      onFocus={(e) => e.target.select()}
      className="w-full bg-[#030712] border border-slate-800 text-white rounded px-1.5 py-1 text-center focus:outline-none focus:border-brand-primary font-bold text-[11px]"
      placeholder="0.0"
    />
  );
};

const Field: FC<{
  label: string;
  value: any;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
}> = ({ label, value, onChange, type = "number", disabled }) => {
  const [localValue, setLocalValue] = useState<string>("");

  useEffect(() => {
    if (type === "number") {
      const propNum = parseFloat(value) || 0;
      const localNum = parseFloat(localValue) || 0;
      if (propNum !== localNum || (value !== 0 && localValue === "")) {
        setLocalValue(value === undefined || value === null ? "" : String(value));
      }
    } else {
      setLocalValue(value === undefined || value === null ? "" : String(value));
    }
  }, [value, type]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (type === "number") {
      val = val.replace(",", ".");
    }
    setLocalValue(val);
    onChange(val);
  };

  return (
    <div>
      <label className="text-[10px] font-black text-slate-600 uppercase block mb-2 px-1">
        {label}
      </label>
      <input
        type={type === "number" ? "text" : type}
        inputMode={type === "number" ? "decimal" : undefined}
        value={localValue}
        onChange={handleChange}
        onFocus={(e) => e.target.select()}
        disabled={disabled}
        className={`w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-4 text-xs sm:text-sm text-white font-black outline-none focus:border-brand-primary transition-all ${
          disabled ? "opacity-55 cursor-not-allowed bg-slate-900/60" : ""
        }`}
        placeholder={type === "number" ? "0.0" : "Digite aqui..."}
      />
    </div>
  );
};

const WellnessForm: FC<{
  onSave: (data: any) => void;
  onCancel: () => void;
  role: "coach" | "athlete";
  initialData?: any;
  isFemale?: boolean;
}> = ({ onSave, onCancel, role, initialData, isFemale }) => {
  const [data, setData] = useState(() => {
    const base = initialData || {
      fatigue: 0,
      sleep: 0,
      stress: 0,
      soreness: 0,
      mood: 0,
      cognitiveLoad: 0,
      travelFatigue: 0,
      sleepQuality: 0,
    };
    return {
      ...base,
      menstrualPhase: base.menstrualPhase || "Nenhuma",
      menstrualSymptoms: base.menstrualSymptoms || [],
    };
  });
  const [date, setDate] = useState(
    initialData?.date || getLocalDateString(),
  );

  const [sleepStartTime, setSleepStartTime] = useState<string>(initialData?.sleepStartTime || "23:00");
  const [wakeUpTime, setWakeUpTime] = useState<string>(initialData?.wakeUpTime || "07:00");
  const [isMatchDay, setIsMatchDay] = useState<boolean>(initialData?.isMatchDay || false);
  const [emotionalReadiness, setEmotionalReadiness] = useState<number>(initialData?.emotionalReadiness ?? 0);
  const [psychologicalReadiness, setPsychologicalReadiness] = useState<number>(initialData?.psychologicalReadiness ?? 0);
  const [psychologyNotes, setPsychologyNotes] = useState<string>(initialData?.psychologyNotes || "");

  const calculatedSleep = useMemo(() => {
    return calculateSleepHoursFromTimes(sleepStartTime, wakeUpTime);
  }, [sleepStartTime, wakeUpTime]);

  const handleSleepTimeChange = (newStartTime: string, newWakeTime: string) => {
    setSleepStartTime(newStartTime);
    setWakeUpTime(newWakeTime);
    const calc = calculateSleepHoursFromTimes(newStartTime, newWakeTime);
    if (calc) {
      setData((prev: any) => ({
        ...prev,
        sleep: calc.hours,
        sleepHoursFormatted: calc.formatted,
        sleepStartTime: newStartTime,
        wakeUpTime: newWakeTime,
        calculatedSleepHours: calc.hours,
      }));
    }
  };

  useEffect(() => {
    setData((prev: any) => ({
      ...prev,
      isMatchDay,
      emotionalReadiness,
      psychologicalReadiness,
      psychologyNotes,
    }));
  }, [isMatchDay, emotionalReadiness, psychologicalReadiness, psychologyNotes]);

  const metrics = [
    {
      key: "fatigue",
      label: "FADIGA GERAL",
      desc: "Cansaço físico acumulado do treino ou do dia a dia.",
      inverse: true,
    },
    {
      key: "sleepQuality",
      label: "QUALIDADE DO SONO",
      desc: "Sensação de descanso ao acordar e profundidade do repouso.",
      inverse: false,
    },
    {
      key: "stress",
      label: "TENSÃO MENTAL (ESTRESSE)",
      desc: "Estresse psicológico e ansiedade (preocupações pessoais, ansiedade ou agitação emocional).",
      inverse: true,
    },
    {
      key: "soreness",
      label: "DOR MUSCULAR",
      desc: "Dores musculares persistentes (músculos travados ou doloridos).",
      inverse: true,
    },
    {
      key: "mood",
      label: "ESTADO DE HUMOR",
      desc: "Ânimo, paciência, motivação e disposição psicológica.",
      inverse: false,
    },
  ];
  const currentScore = useMemo(() => calculateReadiness(data), [data]);
  const currentInsight = useMemo(
    () => getReadinessInsight(currentScore),
    [currentScore],
  );

  const getButtonColor = (
    val: number,
    inverse: boolean,
    isSelected: boolean,
  ) => {
    if (!isSelected)
      return "bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-600 transition-all";
    const isGood = inverse ? val <= 3 : val >= 7;
    const isWarning = inverse ? val > 3 && val <= 6 : val < 7 && val >= 4;
    if (isGood)
      return "bg-[#39FF14] border-[#39FF14] text-slate-950 shadow-[0_0_20px_rgba(57,255,20,0.4)] scale-110 z-10";
    if (isWarning)
      return "bg-yellow-400 border-yellow-400 text-slate-950 shadow-[0_0_20px_rgba(250,204,21,0.4)] scale-110 z-10";
    return "bg-red-600 border-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] scale-110 z-10";
  };

  return (
    <Card
      className="max-w-xl w-full mx-auto space-y-8 md:space-y-12 p-8 md:p-12 bg-slate-900 border-slate-800 h-fit overflow-visible shadow-2xl relative"
      title="Elite Performance Readiness"
    >
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-brand-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="space-y-8">
        <div className="p-8 bg-slate-950 border border-slate-800 rounded-[2.5rem] text-center shadow-inner relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform" />
          <div className="flex justify-between items-center mb-4 relative z-10">
            <span className="text-[11px] md:text-[12px] font-black text-slate-600 uppercase tracking-[0.4em] italic">
              Biofeedback Scorer
            </span>
            <div className="flex flex-col items-end">
              <span
                className={`text-4xl font-black italic drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] ${currentInsight.color}`}
              >
                {currentScore}%
              </span>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Readiness Level
              </span>
            </div>
          </div>
          <p
            className={`text-[14px] md:text-[16px] font-black uppercase mb-3 tracking-[0.2em] relative z-10 italic ${currentInsight.color} neon-text-glow`}
          >
            {currentInsight.text}
          </p>
          <div className="h-px bg-slate-800 w-full mb-4 opacity-50" />
          <p className="text-[11px] md:text-[12px] text-slate-400 font-bold leading-relaxed uppercase italic relative z-10 px-4">
            {currentInsight.action}
          </p>
        </div>

        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
          <label className="text-[10px] font-black text-slate-500 uppercase block mb-3 px-1 tracking-widest">
            Coleta Hub (Data do Registro)
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white font-black uppercase italic text-sm outline-none focus:border-brand-primary transition-all shadow-inner"
          />
        </div>

        {/* CÁLCULO E REGISTRO DAS HORAS DE SONO */}
        <div className="space-y-4 bg-slate-950 p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              <span className="text-base">🌙</span> HORÁRIOS DE REPOUSO (CÁLCULO AUTOMÁTICO DE SONO)
            </label>
            {calculatedSleep && (
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 font-black text-[10px] rounded-xl border border-indigo-500/30">
                ⚡ {calculatedSleep.formatted} ({calculatedSleep.hours}h)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 tracking-widest">
                Horário que Dormiu
              </label>
              <input
                type="time"
                value={sleepStartTime}
                onChange={(e) => handleSleepTimeChange(e.target.value, wakeUpTime)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-white font-black text-sm outline-none focus:border-indigo-500 transition-all shadow-inner"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 tracking-widest">
                Horário que Acordou
              </label>
              <input
                type="time"
                value={wakeUpTime}
                onChange={(e) => handleSleepTimeChange(sleepStartTime, e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-white font-black text-sm outline-none focus:border-indigo-500 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* TOTAL CALCULADO LOGO ABAIXO DOS HORÁRIOS DE REPOUSO */}
          <div className="pt-3 border-t border-slate-900">
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <label className="text-[10px] font-black text-indigo-300 uppercase block tracking-widest">
                  Total Calculado de Sono
                </label>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                  {calculatedSleep 
                    ? `Resultado das horas de repouso: ${calculatedSleep.formatted}` 
                    : "Ajuste os horários acima para calcular ou digite o total manualmente."}
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 shadow-inner min-w-[140px] shrink-0">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="24"
                  value={data.sleep !== undefined && data.sleep !== null ? data.sleep : ""}
                  onChange={(e) => {
                    const valStr = e.target.value;
                    const h = valStr === "" ? 0 : Math.min(24, Math.max(0, safeParseFloat(valStr) || 0));
                    const formatted = formatSleepHours(h);
                    setData((prev: any) => ({
                      ...prev,
                      sleep: h,
                      sleepHoursFormatted: formatted,
                      calculatedSleepHours: h,
                    }));
                  }}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full bg-transparent text-indigo-300 font-black text-center text-base outline-none"
                  placeholder="0"
                />
                <span className="text-[10px] font-black text-indigo-400/80 uppercase">horas</span>
              </div>
            </div>
          </div>
        </div>

        {/* DIA DE JOGO & PRONTIDÃO PSICOLÓGICA/EMOCIONAL */}
        <div className={`p-6 rounded-3xl border transition-all space-y-6 ${
          isMatchDay 
            ? "bg-amber-500/10 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]" 
            : "bg-slate-950 border-slate-800"
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <span className="text-base">🏆</span> DIA DE JOGO / COMPETIÇÃO
              </h4>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                Ative para registrar prontidão psicológica, controle emocional e parecer da psicologia esportiva.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsMatchDay(!isMatchDay)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                isMatchDay 
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]" 
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              {isMatchDay ? "✓ Dia de Jogo Ativo" : "+ Marcar Dia de Jogo"}
            </button>
          </div>

          {isMatchDay && (
            <div className="space-y-6 pt-2 border-t border-amber-500/20">
              {/* Prontidão Emocional */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-amber-300 uppercase tracking-widest block">
                    PRONTIDÃO EMOCIONAL (0 - 10)
                  </label>
                  <span className="text-sm font-black text-amber-400 italic font-mono">{emotionalReadiness}/10</span>
                </div>
                <p className="text-[8px] text-slate-400 uppercase font-bold">
                  Equilíbrio emocional, autorregulação e controle da ansiedade pré-competitiva.
                </p>
                <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEmotionalReadiness(v)}
                      className={`h-9 rounded-xl text-[10px] font-black transition-all border flex items-center justify-center ${
                        emotionalReadiness === v 
                          ? "bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105" 
                          : "bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prontidão Psicológica */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block">
                    PRONTIDÃO PSICOLÓGICA (0 - 10)
                  </label>
                  <span className="text-sm font-black text-indigo-400 italic font-mono">{psychologicalReadiness}/10</span>
                </div>
                <p className="text-[8px] text-slate-400 uppercase font-bold">
                  Foco mental, motivação, clareza tática e autoconfiança para o confronto.
                </p>
                <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setPsychologicalReadiness(v)}
                      className={`h-9 rounded-xl text-[10px] font-black transition-all border flex items-center justify-center ${
                        psychologicalReadiness === v 
                          ? "bg-indigo-500 text-white border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-105" 
                          : "bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parecer da Psicologia Esportiva */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-amber-300 uppercase tracking-widest block">
                  PARECER DA PSICOLOGIA ESPORTIVA
                </label>
                <p className="text-[8px] text-slate-400 uppercase font-bold">
                  Observações pré-jogo, estratégias de ativação mental e nota técnica do psicólogo esportivo.
                </p>
                <textarea
                  value={psychologyNotes}
                  onChange={(e) => setPsychologyNotes(e.target.value)}
                  placeholder="Escreva o parecer psicológico para este dia de jogo..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-white font-medium text-xs outline-none focus:border-amber-500 transition-all shadow-inner resize-none"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    "⚡ Foco e Concentração Total",
                    "🧘 Ansiedade Controlada",
                    "🔥 Alta Confiança e Motivação",
                    "🧠 Protocolo de Respiração Realizado",
                    "🎯 Metas Táticas Alinhadas"
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        if (!psychologyNotes.includes(preset)) {
                          setPsychologyNotes((prev) => prev ? `${prev} • ${preset}` : preset);
                        }
                      }}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-lg text-[8.5px] font-bold text-amber-300/80 transition-all uppercase"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-12">
        {metrics.map((m) => (
          <div key={m.key} className="space-y-4">
            <div className="flex flex-col gap-1 px-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">
                  {m.label}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xl font-black italic ${getButtonColor(
                      data[m.key as keyof typeof data],
                      m.inverse,
                      true,
                    )
                      .split(" ")[0]
                      .replace("bg-", "text-")}`}
                  >
                    {data[m.key as keyof typeof data]}
                  </span>
                  <span className="text-[9px] text-slate-700 font-bold uppercase">
                    / 10
                  </span>
                </div>
              </div>
              <p className="text-[9px] text-slate-500 font-bold uppercase leading-tight">
                {m.desc}
              </p>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setData((prev: any) => ({ ...prev, [m.key]: val }));
                  }}
                  className={`h-11 sm:h-10 text-[10px] font-black rounded-xl transition-all border flex items-center justify-center ${getButtonColor(val, m.inverse, data[m.key as keyof typeof data] === val)}`}
                >
                  {val}
                </button>
              ))}
            </div>
            <div className="flex justify-between px-2 text-[8px] font-black text-slate-700 uppercase tracking-widest italic">
              <span>{m.inverse ? "EXCELENTE" : "CRÍTICO"}</span>
              <span>{m.inverse ? "CRÍTICO" : "EXCELENTE"}</span>
            </div>
          </div>
        ))}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          <div className="space-y-4 shadow-[0_0_40px_rgba(0,0,0,0.2)] p-6 rounded-3xl bg-slate-950 border border-slate-800">
            <div className="px-1">
              <label className="text-[11px] font-black text-brand-primary uppercase block tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse" />
                Carga Cognitiva (Cansaço Intelectual)
              </label>
              <p className="text-[8px] text-slate-600 font-bold uppercase mt-1 leading-relaxed">
                Volume e esforço mental exigido no dia (estudos intensos, trabalho, tomada de decisão ou foco prolongado).
              </p>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() =>
                    setData((prev: any) => ({ ...prev, cognitiveLoad: v }))
                  }
                  className={`h-9 rounded-xl text-[10px] font-black transition-all border flex items-center justify-center ${getButtonColor(v, true, data.cognitiveLoad === v)}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex justify-between px-2 text-[8px] font-black text-slate-700 uppercase tracking-widest italic">
              <span>Leve</span>
              <span>Exaustivo</span>
            </div>
          </div>

          <div className="space-y-4 shadow-[0_0_40px_rgba(0,0,0,0.2)] p-6 rounded-3xl bg-slate-950 border border-slate-800">
            <div className="px-1">
              <label className="text-[11px] font-black text-orange-500 uppercase block tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                Cansaço de Viagem
              </label>
              <p className="text-[8px] text-slate-600 font-bold uppercase mt-1 leading-relaxed">
                Impacto físico e desidratação decorrentes de deslocamentos ou viagens (use apenas em dias de viagem).
              </p>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() =>
                    setData((prev: any) => ({ ...prev, travelFatigue: v }))
                  }
                  className={`h-9 rounded-xl text-[10px] font-black transition-all border flex items-center justify-center ${getButtonColor(v, true, data.travelFatigue === v)}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex justify-between px-2 text-[8px] font-black text-slate-750 uppercase tracking-widest italic">
              <span>Nenhum</span>
              <span>Exaustivo</span>
            </div>
          </div>
        </div>

        {isFemale && (
          <div className="p-6 bg-pink-500/5 border border-pink-500/10 rounded-3xl space-y-6">
            <h4 className="text-xs font-black text-[#ec4899] uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-[#ec4899] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              CICLO MENSTRUAL & SINTOMATOLOGIA
            </h4>
            
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block px-1">
                Fase Atual do Ciclo
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { value: "Folicular", label: "Folicular", desc: "Força Alta" },
                  { value: "Ovulatória", label: "Ovulatória", desc: "Força Máx" },
                  { value: "Lútea", label: "Lútea", desc: "Aeróbio" },
                  { value: "Menstruação", label: "Menstruação", desc: "Regenera" },
                  { value: "Nenhuma", label: "Não Regular / S/I" }
                ].map((phase) => {
                  const isSelected = data.menstrualPhase === phase.value;
                  return (
                    <button
                      key={phase.value}
                      type="button"
                      onClick={() => setData((prev: any) => ({ ...prev, menstrualPhase: phase.value }))}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                        isSelected 
                          ? "bg-[#ec4899] border-[#ec4899] text-white shadow-[0_0_15px_rgba(236,72,153,0.3)] scale-[1.03]"
                          : "bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase">{phase.label}</span>
                      {phase.desc && (
                        <span className={`text-[8px] mt-0.5 ${isSelected ? "text-pink-100" : "text-slate-500"} font-bold uppercase`}>
                          {phase.desc}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block px-1">
                Sintomas Clínicos Ativos
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  "Cólica",
                  "Dor de Cabeça",
                  "Inchaço",
                  "Fadiga Muscular",
                  "Sensibilidade Seios",
                  "Mudança de Humor",
                  "Falta de Energia",
                  "Sem Sintomas"
                ].map((symptom) => {
                  const symptomsList = data.menstrualSymptoms || [];
                  const isSelected = symptom === "Sem Sintomas" 
                    ? symptomsList.length === 0 
                    : symptomsList.includes(symptom);
                  return (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => {
                        if (symptom === "Sem Sintomas") {
                          setData((prev: any) => ({ ...prev, menstrualSymptoms: [] }));
                        } else {
                          let newList = [...symptomsList];
                          if (newList.includes(symptom)) {
                            newList = newList.filter((item) => item !== symptom);
                          } else {
                            newList.push(symptom);
                          }
                          setData((prev: any) => ({ ...prev, menstrualSymptoms: newList }));
                        }
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-center text-center transition-all text-[9px] font-black uppercase tracking-wider ${
                        isSelected 
                          ? "bg-[#ec4899]/20 border-[#ec4899] text-[#ec4899]"
                          : "bg-slate-950 border-slate-850 text-slate-500 hover:border-slate-700"
                      }`}
                    >
                      {symptom}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-5 pt-10 border-t border-slate-800">
        <Button
          onClick={onCancel}
          variant="secondary"
          className="w-full py-6 uppercase font-black tracking-[0.2em] border-slate-800 text-slate-500 hover:text-white transition-all text-xs"
        >
          Descartar
        </Button>
        <Button
          onClick={() => {
            const rawSleep = typeof data.sleep === 'number' && !isNaN(data.sleep) ? data.sleep : safeParseFloat(data.sleep) || 8;
            const sleepHoursFormatted = data.sleepHoursFormatted || formatSleepHours(rawSleep);
            onSave({ 
              ...data, 
              sleep: rawSleep, 
              sleepHoursFormatted, 
              sleepStartTime,
              wakeUpTime,
              calculatedSleepHours: rawSleep,
              isMatchDay,
              emotionalReadiness,
              psychologicalReadiness,
              psychologyNotes,
              date 
            });
          }}
          className="w-full py-6 uppercase font-black tracking-[0.2em] shadow-[0_0_30px_rgba(57,255,20,0.2)] text-xs"
        >
          Confirmar Bio-Sync
        </Button>
      </div>
    </Card>
  );
};

const isTokenExpired = (token: string): boolean => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (payload && typeof payload.exp === "number") {
      return payload.exp * 1000 < Date.now();
    }
    return false;
  } catch (e) {
    return true; // If parsing fails, treat as expired
  }
};

const App: FC = () => {
  const [user, setUser] = useState<UserWithPlan | null>(() => {
    const storedUser = safeLocalStorage.getItem("lb_user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed.token && isTokenExpired(parsed.token)) {
          console.warn("[Session] Token expirado detectado na inicialização.");
          safeLocalStorage.removeItem("lb_user");
          return null;
        }
        return parsed;
      } catch (e) {
        safeLocalStorage.removeItem("lb_user");
      }
    }
    return null;
  });

  useEffect(() => {
    const checkExpiration = () => {
      const storedUser = safeLocalStorage.getItem("lb_user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed && parsed.token && isTokenExpired(parsed.token)) {
            console.warn(
              "[Session] Token expirou por limite de inatividade de 24 horas.",
            );
            safeLocalStorage.removeItem("lb_user");
            setUser(null);
            toast.error(
              "Sua sessão expirou por inatividade de 24 horas. Faça login novamente.",
              { id: "session-timeout" },
            );
          }
        } catch (e) {}
      }
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/venda" element={<Venda />} />
        <Route
          path="/dashboard"
          element={
            user && user.plan === "pro" ? (
              <Dashboard user={user} />
            ) : (
              <Navigate to="/venda" replace />
            )
          }
        />
        <Route
          path="/ranking"
          element={
            user && user.plan === "pro" ? (
              <Ranking />
            ) : (
              <Navigate to="/venda" replace />
            )
          }
        />
        <Route
          path="/hub/*"
          element={<EliteHubApp user={user} setUser={setUser} />}
        />
        {/* Fallback for existing links if any */}
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
