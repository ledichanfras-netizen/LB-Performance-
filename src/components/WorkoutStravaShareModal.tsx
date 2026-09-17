import React, { useState, useRef } from "react";
import { toJpeg, toPng } from "html-to-image";
import toast from "react-hot-toast";
import {
  X,
  Share2,
  Download,
  Camera,
  Upload,
  Sparkles,
  Clock,
  Dumbbell,
  Activity,
  Zap,
  Check,
  Copy,
  MessageCircle,
  Flame,
  Layers,
  Image as ImageIcon,
  RotateCcw,
  Sliders,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  MoveVertical,
  Minimize2,
  Eye,
} from "lucide-react";
import { Workout, Athlete } from "../types";
import { publishWorkoutToFeed } from "../services/communityFeedService";

interface WorkoutStravaShareModalProps {
  workout: Workout;
  athlete: Athlete;
  isOpen: boolean;
  onClose: () => void;
  onUpdateWorkout?: (updated: Workout) => void;
  onOpenFeed?: () => void;
}

type AspectRatio = "9:16" | "1:1";
type ThemePreset = "cyber-lime" | "dark-stealth" | "titanium-gold" | "electric-blue";
type CardBgStyle = "transparent" | "glass" | "solid";
type CardPosition = "top" | "center" | "bottom";
type TextColorMode = "white" | "black";

const THEME_STYLES: Record<
  ThemePreset,
  {
    name: string;
    bgClass: string;
    accentColor: string;
    badgeBg: string;
    borderAccent: string;
    glowShadow: string;
  }
> = {
  "cyber-lime": {
    name: "Cyber Lime",
    bgClass: "from-slate-950 via-[#031d13] to-slate-950",
    accentColor: "#39FF14",
    badgeBg: "bg-[#39FF14]/15 text-[#39FF14] border-[#39FF14]/30",
    borderAccent: "border-[#39FF14]/30",
    glowShadow: "shadow-[0_0_25px_rgba(57,255,20,0.25)]",
  },
  "dark-stealth": {
    name: "Dark Stealth",
    bgClass: "from-slate-950 via-[#0f172a] to-slate-950",
    accentColor: "#10b981",
    badgeBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    borderAccent: "border-emerald-500/30",
    glowShadow: "shadow-[0_0_25px_rgba(16,185,129,0.25)]",
  },
  "titanium-gold": {
    name: "Gold Elite",
    bgClass: "from-slate-950 via-[#1f1908] to-slate-950",
    accentColor: "#f59e0b",
    badgeBg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    borderAccent: "border-amber-500/30",
    glowShadow: "shadow-[0_0_25px_rgba(245,158,11,0.25)]",
  },
  "electric-blue": {
    name: "Electric Blue",
    bgClass: "from-slate-950 via-[#0a192f] to-slate-950",
    accentColor: "#38bdf8",
    badgeBg: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    borderAccent: "border-sky-500/30",
    glowShadow: "shadow-[0_0_25px_rgba(56,189,248,0.25)]",
  },
};

const MOTIVATIONAL_PRESETS = [
  "Missão cumprida! Alta performance sempre. ⚡",
  "Mais 1% todo dia. O processo não falha! 💪",
  "Treino de elite finalizado com maestria! 🔥",
  "Foco, intensidade e constância. 🎯",
  "Construindo a melhor versão na LB Sports. 🚀",
];

export const WorkoutStravaShareModal: React.FC<WorkoutStravaShareModalProps> = ({
  workout,
  athlete,
  isOpen,
  onClose,
  onUpdateWorkout,
  onOpenFeed,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [theme, setTheme] = useState<ThemePreset>("cyber-lime");
  const [photoUrl, setPhotoUrl] = useState<string | null>(workout.photoUrl || null);
  const [cardBgStyle, setCardBgStyle] = useState<CardBgStyle>("transparent"); // Sem Fundo (Padrão para encaixar na foto)
  const [cardPosition, setCardPosition] = useState<CardPosition>("bottom"); // Topo, Centro, Rodapé
  const cardScale = 75; // Fixo no tamanho Pequeno (75%)
  const [textColorMode, setTextColorMode] = useState<TextColorMode>("white"); // "white" ou "black"
  const [glassOpacity, setGlassOpacity] = useState<number>(20); // 10% a 50% de transparência do vidro
  const [overlayDarkness, setOverlayDarkness] = useState<number>(15); // 0 - 90 % (suave para fotos)
  const [caption, setCaption] = useState<string>(
    workout.socialCaption || workout.feedback || "Treino concluído com foco total na performance! ⚡"
  );
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [showRpe, setShowRpe] = useState<boolean>(true);
  const [showInternalLoad, setShowInternalLoad] = useState<boolean>(true);
  const [showExercisesCount, setShowExercisesCount] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPostedToFeed, setIsPostedToFeed] = useState<boolean>(Boolean(workout.isPostedToFeed));

  if (!isOpen) return null;

  const currentTheme = THEME_STYLES[theme];
  const isBlackText = textColorMode === "black";

  // Calculate training stats
  const duration = workout.durationMinutes || 60;
  const totalLoad = workout.totalLoad || 0;
  const rpe = workout.rpe || 7;
  const internalLoad = duration * rpe;

  const totalCompletedSets = (workout.exercises || []).reduce((acc, ex) => {
    return acc + (ex.performedSets ? ex.performedSets.filter((s) => s.isCompleted !== false).length : ex.sets || 3);
  }, 0);
  const totalExercises = (workout.exercises || []).length;

  // Format date nicely
  const formatDateLabel = (dStr: string) => {
    try {
      const parts = dStr.split("T")[0].split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).toUpperCase();
      }
    } catch {
      // fallback
    }
    return new Date().toLocaleDateString("pt-BR").toUpperCase();
  };

  // Image Upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem válido.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoUrl(result);
      toast.success("Foto adicionada ao card!");
    };
    reader.readAsDataURL(file);
  };

  // Generate Image Blob (supports transparent PNG or high-res JPEG)
  const generateImageBlob = async (forcePng?: boolean): Promise<{ blob: Blob; dataUrl: string; isPng: boolean } | null> => {
    if (!cardRef.current) return null;
    const isTransparent = forcePng ?? (!photoUrl || cardBgStyle === "transparent" || cardBgStyle === "glass");
    const toastId = toast.loading(
      isTransparent ? "Renderizando Sticker Transparente (PNG)..." : "Renderizando Imagem do Treino HD..."
    );
    try {
      setIsGenerating(true);
      let dataUrl: string;
      if (isTransparent) {
        dataUrl = await toPng(cardRef.current, {
          cacheBust: true,
          pixelRatio: 3,
          backgroundColor: undefined, // Preserves alpha transparency
        });
      } else {
        dataUrl = await toJpeg(cardRef.current, {
          quality: 0.96,
          pixelRatio: 2.5,
          cacheBust: true,
        });
      }

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      toast.dismiss(toastId);
      return { blob, dataUrl, isPng: isTransparent };
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
      toast.error("Não foi possível gerar a imagem.", { id: toastId });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  // Native Share (Mobile / Instagram / WhatsApp)
  const handleShareNative = async () => {
    const isTransparent = !photoUrl && cardBgStyle === "transparent";
    const result = await generateImageBlob(isTransparent);
    if (!result) return;

    const athleteSlug = athlete.name.toLowerCase().replace(/\s+/g, "-");
    const ext = result.isPng ? "png" : "jpg";
    const mimeType = result.isPng ? "image/png" : "image/jpeg";
    const file = new File(
      [result.blob],
      `treino-lbsports-${athleteSlug}-${Date.now()}.${ext}`,
      { type: mimeType }
    );

    const shareText = `⚡ Treino Concluído na LB Sports!\n⏱️ Duração: ${duration}min | 📊 Volume: ${totalLoad.toLocaleString()}kg | PSE: ${rpe}/10 | Carga: ${internalLoad} u.a.\n"${caption}"\n#LBSports #HighPerformance #TreinoConcluído`;

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Treino Concluído • LB Sports",
          text: shareText,
        });
        toast.success("Compartilhado com sucesso!");
      } catch (err: any) {
        if (err.name !== "AbortError") {
          fallbackDownload(result.dataUrl, result.isPng);
        }
      }
    } else {
      fallbackDownload(result.dataUrl, result.isPng);
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success(
          result.isPng
            ? "Sticker transparente baixado! Cole na sua foto nos Stories do Instagram."
            : "Imagem baixada e legenda copiada! Cole no seu Instagram ou WhatsApp.",
          { duration: 5000 }
        );
      } catch {
        toast.success("Download concluído em alta resolução!");
      }
    }
  };

  // Direct Download (Sticker PNG or Full Image)
  const handleDownload = async (forcePng = false) => {
    const result = await generateImageBlob(forcePng);
    if (!result) return;
    fallbackDownload(result.dataUrl, result.isPng);
    toast.success(
      result.isPng
        ? "Sticker transparente (PNG) baixado com sucesso! Cole nos Stories do Instagram."
        : "Imagem baixada com sucesso!"
    );
  };

  const fallbackDownload = (dataUrl: string, isPng = false) => {
    const link = document.createElement("a");
    const safeName = workout.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    link.download = `treino-lbsports-${safeName}.${isPng ? "png" : "jpg"}`;
    link.href = dataUrl;
    link.click();
  };

  // Copy Image / Sticker to Clipboard
  const handleCopyImage = async () => {
    const isTransparent = !photoUrl && cardBgStyle === "transparent";
    const result = await generateImageBlob(isTransparent);
    if (!result) return;

    try {
      if (navigator.clipboard && (window as any).ClipboardItem) {
        const item = new (window as any).ClipboardItem({ [result.blob.type]: result.blob });
        await navigator.clipboard.write([item]);
        toast.success(
          result.isPng
            ? "Sticker copiado! Abra o Instagram Stories e cole diretamente sobre sua foto."
            : "Imagem copiada para a Área de Transferência!"
        );
      } else {
        toast.error("Seu navegador não suporta copiar imagens diretamente.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível copiar a imagem.");
    }
  };

  // WhatsApp Share
  const handleWhatsAppShare = () => {
    const msg = `⚡ *TREINO CONCLUÍDO • LB SPORTS*\n\n🏋️ *Treino:* ${workout.name}\n👤 *Atleta:* ${athlete.name}\n⏱️ *Tempo:* ${duration} min\n💪 *Volume Total:* ${totalLoad.toLocaleString()} kg\n🔥 *PSE Atleta:* ${rpe}/10\n📊 *Carga Interna:* ${internalLoad} u.a.\n\n💬 _"${caption}"_\n\n🏆 *LB Sports • Centro de Performance e Avaliação Física*`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  // Post to Internal Community Feed
  const handlePostToCommunity = () => {
    try {
      publishWorkoutToFeed(workout, athlete, {
        photoUrl: photoUrl || undefined,
        caption: caption,
      });

      const updatedWorkout: Workout = {
        ...workout,
        photoUrl: photoUrl || workout.photoUrl,
        socialCaption: caption,
        isPostedToFeed: true,
      };

      if (onUpdateWorkout) {
        onUpdateWorkout(updatedWorkout);
      }

      setIsPostedToFeed(true);
      toast.success("🎉 Treino publicado no Mural Social da LB Sports com sucesso!");
    } catch (err) {
      console.error("Erro ao postar no feed:", err);
      toast.error("Erro ao publicar no Mural da LB.");
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#39FF14]/10 border border-[#39FF14]/30 flex items-center justify-center text-[#39FF14] shadow-[0_0_15px_rgba(57,255,20,0.2)]">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#39FF14] bg-[#39FF14]/10 px-2 py-0.5 rounded-md border border-[#39FF14]/20">
                  Card de Treino & Stories
                </span>
                <span className="text-[10px] font-bold text-slate-400">Card & Sticker Oficial LB</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black italic uppercase text-white tracking-tight">
                Postar Treino Realizado
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split view (Left: Card Preview, Right: Customization Controls) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-6 overflow-y-auto flex-grow">
          {/* Left Column: Preview of the Athletic Card / Transparent Sticker */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center bg-slate-950/70 p-4 sm:p-6 rounded-2xl border border-slate-800/80">
            <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-400 font-bold">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                <Sparkles className="w-3.5 h-3.5 text-[#39FF14]" />
                {!photoUrl && cardBgStyle === "transparent" ? "Sticker Transparente (PNG)" : "Card com Foto"}
              </span>
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                {aspectRatio === "9:16" ? "Story (9:16)" : "Feed (1:1)"}
              </span>
            </div>

            {/* Preview Frame with Transparency Checkerboard */}
            <div className="relative w-full flex items-center justify-center p-2">
              <div
                className="relative rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 border border-slate-800/80"
                style={{
                  aspectRatio: aspectRatio === "9:16" ? "9 / 16" : "1 / 1",
                  maxHeight: aspectRatio === "9:16" ? "540px" : "420px",
                  maxWidth: aspectRatio === "9:16" ? "304px" : "420px",
                  width: "100%",
                  backgroundColor: photoUrl
                    ? "#030712"
                    : cardBgStyle === "transparent" || cardBgStyle === "glass"
                    ? isBlackText
                      ? "#f1f5f9"
                      : "#0f172a"
                    : "#030712",
                  backgroundImage:
                    !photoUrl && (cardBgStyle === "transparent" || cardBgStyle === "glass")
                      ? isBlackText
                        ? `linear-gradient(45deg, #cbd5e1 25%, transparent 25%),
                           linear-gradient(-45deg, #cbd5e1 25%, transparent 25%),
                           linear-gradient(45deg, transparent 75%, #cbd5e1 75%),
                           linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)`
                        : `linear-gradient(45deg, #1e293b 25%, transparent 25%),
                           linear-gradient(-45deg, #1e293b 25%, transparent 25%),
                           linear-gradient(45deg, transparent 75%, #1e293b 75%),
                           linear-gradient(-45deg, transparent 75%, #1e293b 75%)`
                      : undefined,
                  backgroundSize: !photoUrl && (cardBgStyle === "transparent" || cardBgStyle === "glass") ? "24px 24px" : undefined,
                  backgroundPosition: !photoUrl && (cardBgStyle === "transparent" || cardBgStyle === "glass") ? "0 0, 0 12px, 12px -12px, -12px 0px" : undefined,
                }}
              >
                {/* Mode Indicator Badge */}
                <div className="absolute top-3 left-3 z-20 pointer-events-none">
                  {!photoUrl && (cardBgStyle === "transparent" || cardBgStyle === "glass") ? (
                    <span
                      className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-sm shadow border ${
                        isBlackText
                          ? "bg-white/90 text-slate-950 border-slate-300"
                          : "bg-slate-950/80 text-[#39FF14] border-[#39FF14]/40"
                      }`}
                    >
                      {cardBgStyle === "glass" ? "Vidro Fosco Transparente" : "Fundo 100% Transparente"} • {isBlackText ? "Dados em Preto" : "Dados em Branco"}
                    </span>
                  ) : photoUrl ? (
                    <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-950/80 text-white border border-white/20 backdrop-blur-sm shadow">
                      Foto Ativa {cardBgStyle === "glass" ? "• Vidro Fosco" : ""} • {isBlackText ? "Dados em Preto" : "Dados em Branco"}
                    </span>
                  ) : null}
                </div>

                {/* The Capturable Element (NO DARK BACKGROUND when transparent or glass!) */}
                <div
                  ref={cardRef}
                  id="strava-share-card"
                  className="relative w-full h-full select-none flex flex-col overflow-hidden"
                  style={{
                    backgroundColor: photoUrl
                      ? undefined
                      : cardBgStyle === "solid"
                      ? "#030712"
                      : "transparent",
                  }}
                >
                  {/* Photo Layer if uploaded */}
                  {photoUrl && (
                    <img
                      src={photoUrl}
                      alt="Foto de Treino"
                      crossOrigin="anonymous"
                      className="absolute inset-0 w-full h-full object-cover z-0"
                    />
                  )}

                  {/* Dark Vignette Overlay for Photo Contrast */}
                  {photoUrl && overlayDarkness > 0 && (
                    <div
                      className="absolute inset-0 z-[1] pointer-events-none transition-opacity duration-200"
                      style={{
                        backgroundColor: `rgba(3, 7, 18, ${overlayDarkness / 100})`,
                      }}
                    />
                  )}

                  {/* Solid dark theme background ONLY when user explicitly chose 'solid' card without photo */}
                  {!photoUrl && cardBgStyle === "solid" && (
                    <div className={`absolute inset-0 bg-gradient-to-br ${currentTheme.bgClass} z-0`} />
                  )}

                  {/* Dynamic Positioning HUD Container (top, center, bottom) */}
                  <div
                    className={`relative z-[2] w-full h-full p-4 sm:p-5 flex flex-col transition-all duration-300 pointer-events-none ${
                      cardPosition === "top"
                        ? "justify-start pt-6 sm:pt-8"
                        : cardPosition === "center"
                        ? "justify-center"
                        : "justify-end pb-6 sm:pb-8"
                    }`}
                  >
                    {/* The Clean Sticker Element with Fixed 75% Scale (Pequeno) */}
                    <div
                      className="w-full pointer-events-auto transition-all duration-200 flex flex-col items-center"
                      style={{
                        transform: "scale(0.75)",
                        transformOrigin:
                          cardPosition === "top"
                            ? "top center"
                            : cardPosition === "bottom"
                            ? "bottom center"
                            : "center center",
                      }}
                    >
                      {/* Sticker Box (Transparent by default or Glass) */}
                      <div
                        className={`w-full flex flex-col items-center transition-all ${
                          cardBgStyle === "glass"
                            ? isBlackText
                              ? "rounded-3xl p-4 sm:p-5 border border-black/10"
                              : "rounded-3xl p-4 sm:p-5 border border-white/15"
                            : cardBgStyle === "solid" && photoUrl
                            ? isBlackText
                              ? "bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-lg"
                              : "bg-black rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-lg"
                            : "p-1 bg-transparent" // 100% LIMPO E TRANSPARENTE
                        }`}
                        style={
                          cardBgStyle === "glass"
                            ? {
                                backgroundColor: isBlackText
                                  ? `rgba(255, 255, 255, ${glassOpacity / 100})`
                                  : `rgba(0, 0, 0, ${glassOpacity / 100})`,
                                backdropFilter: "blur(12px)",
                                WebkitBackdropFilter: "blur(12px)",
                              }
                            : undefined
                        }
                      >
                        {/* 1. LOGO OFICIAL LB SPORTS (SEM FUNDO PRETO E SEM BRILHOS) */}
                        <div className="flex flex-col items-center justify-center text-center w-full mb-3">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-1">
                            <img
                              src="/lb-logo-clean.png"
                              alt="LB Sports"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 justify-center">
                            <span
                              data-color={isBlackText ? "black" : "white"}
                              className={`font-black text-xl sm:text-2xl tracking-wider uppercase italic ${
                                isBlackText ? "text-black" : "text-white"
                              }`}
                              style={{ color: isBlackText ? "#000000" : "#ffffff" }}
                            >
                              LB SPORTS
                            </span>
                            <span
                              className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded font-mono"
                              style={{
                                backgroundColor: isBlackText ? "#000000" : "#39FF14",
                                color: isBlackText ? "#ffffff" : "#020617",
                              }}
                            >
                              HUB
                            </span>
                          </div>
                        </div>

                        {/* 2. AS 4 INFORMAÇÕES MAIS IMPORTANTES DO TREINO (TEMPO, VOLUME, ESFORÇO, CARGA) */}
                        <div className="w-full grid grid-cols-2 gap-x-6 gap-y-3.5 my-2 text-center">
                          {/* TEMPO */}
                          <div className="flex flex-col items-center">
                            <div
                              data-color={isBlackText ? "black" : "white"}
                              className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${
                                isBlackText ? "text-black" : "text-white"
                              }`}
                              style={{ color: isBlackText ? "#000000" : "#ffffff" }}
                            >
                              <Clock className="w-3.5 h-3.5 stroke-[2.5]" style={{ color: isBlackText ? "#000000" : "#ffffff" }} />
                              <span>TEMPO</span>
                            </div>
                            <span
                              data-color={isBlackText ? "black" : "white"}
                              className={`text-3xl sm:text-4xl font-black font-mono tracking-tight leading-none mt-0.5 ${
                                isBlackText ? "text-black" : "text-white"
                              }`}
                              style={{ color: isBlackText ? "#000000" : "#ffffff" }}
                            >
                              {duration}
                              <span
                                data-color={isBlackText ? "black" : "white"}
                                className={`text-xs sm:text-sm font-black ml-1 ${
                                  isBlackText ? "text-black/80" : "text-white/90"
                                }`}
                                style={{ color: isBlackText ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.9)" }}
                              >
                                min
                              </span>
                            </span>
                          </div>

                          {/* VOLUME */}
                          {showVolume && (
                            <div className="flex flex-col items-center">
                              <div
                                data-color={isBlackText ? "black" : "white"}
                                className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${
                                  isBlackText ? "text-black" : "text-white"
                                }`}
                                style={{ color: isBlackText ? "#000000" : "#ffffff" }}
                              >
                                <Dumbbell className="w-3.5 h-3.5 stroke-[2.5]" style={{ color: isBlackText ? "#000000" : "#ffffff" }} />
                                <span>VOLUME</span>
                              </div>
                              <span
                                data-color={isBlackText ? "black" : "white"}
                                className={`text-3xl sm:text-4xl font-black font-mono tracking-tight leading-none mt-0.5 ${
                                  isBlackText ? "text-black" : "text-white"
                                }`}
                                style={{ color: isBlackText ? "#000000" : "#ffffff" }}
                              >
                                {totalLoad.toLocaleString()}
                                <span
                                  data-color={isBlackText ? "black" : "white"}
                                  className={`text-xs sm:text-sm font-black ml-1 ${
                                    isBlackText ? "text-black/80" : "text-white/90"
                                  }`}
                                  style={{ color: isBlackText ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.9)" }}
                                >
                                  kg
                                </span>
                              </span>
                            </div>
                          )}

                          {/* ESFORÇO */}
                          {showRpe && (
                            <div className="flex flex-col items-center">
                              <div
                                data-color={isBlackText ? "black" : "white"}
                                className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${
                                  isBlackText ? "text-black" : "text-white"
                                }`}
                                style={{ color: isBlackText ? "#000000" : "#ffffff" }}
                              >
                                <Activity className="w-3.5 h-3.5 stroke-[2.5]" style={{ color: isBlackText ? "#000000" : "#ffffff" }} />
                                <span>ESFORÇO</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 leading-none">
                                <span
                                  data-color={isBlackText ? "black" : "white"}
                                  className={`text-3xl sm:text-4xl font-black font-mono tracking-tight leading-none ${
                                    isBlackText ? "text-black" : "text-white"
                                  }`}
                                  style={{ color: isBlackText ? "#000000" : "#ffffff" }}
                                >
                                  {rpe}
                                  <span
                                    data-color={isBlackText ? "black" : "white"}
                                    className={`text-xs sm:text-sm font-black ${
                                      isBlackText ? "text-black/80" : "text-white/90"
                                    }`}
                                    style={{ color: isBlackText ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.9)" }}
                                  >
                                    /10
                                  </span>
                                </span>
                                <span
                                  className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider"
                                  style={{
                                    backgroundColor: isBlackText ? "#000000" : "#39FF14",
                                    color: isBlackText ? "#ffffff" : "#020617",
                                  }}
                                >
                                  {rpe <= 3 ? "Leve" : rpe <= 6 ? "Mod." : rpe <= 8 ? "Intenso" : "Máx."}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* CARGA */}
                          {showInternalLoad && (
                            <div className="flex flex-col items-center">
                              <div
                                data-color={isBlackText ? "black" : "white"}
                                className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${
                                  isBlackText ? "text-black" : "text-white"
                                }`}
                                style={{ color: isBlackText ? "#000000" : "#ffffff" }}
                              >
                                <Zap className="w-3.5 h-3.5 stroke-[2.5]" style={{ color: isBlackText ? "#000000" : "#ffffff" }} />
                                <span>CARGA INT.</span>
                              </div>
                              <span
                                data-color={isBlackText ? "black" : "white"}
                                className={`text-3xl sm:text-4xl font-black font-mono tracking-tight leading-none mt-0.5 ${
                                  isBlackText ? "text-black" : "text-white"
                                }`}
                                style={{ color: isBlackText ? "#000000" : "#ffffff" }}
                              >
                                {internalLoad.toLocaleString()}
                                <span
                                  data-color={isBlackText ? "black" : "white"}
                                  className={`text-xs sm:text-sm font-black ml-1 ${
                                    isBlackText ? "text-black/80" : "text-white/90"
                                  }`}
                                  style={{ color: isBlackText ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.9)" }}
                                >
                                  u.a.
                                </span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 3. A FRASE ABAIXO DAS MÉTRICAS */}
                        {caption && (
                          <div className="w-full text-center px-4 mt-2">
                            <p
                              data-color={isBlackText ? "black" : "white"}
                              className={`text-xs sm:text-sm italic font-black leading-snug max-w-xs mx-auto ${
                                isBlackText ? "text-black" : "text-white"
                              }`}
                              style={{ color: isBlackText ? "#000000" : "#ffffff" }}
                            >
                              "{caption}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 text-center mt-2">
              {!photoUrl
                ? "💡 Fundo transparente ativo. Baixe o sticker em PNG para colar nos seus Stories ou carregue sua foto ao lado."
                : "💡 Sua foto está carregada com o sticker da LB Sports sobreposto."}
            </p>
          </div>

          {/* Right Column: Customization Controls & Export Actions */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {/* 1. Foto do Treino / Fundo Transparente */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-[11px] font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#39FF14]" />
                  1. Foto do Treino / Transparência
                </label>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUrl(null);
                      setCardBgStyle("transparent");
                      toast.success("Foto removida. Fundo 100% transparente ativo!");
                    }}
                    className="text-[10px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Remover Foto (Fundo Transparente)
                  </button>
                )}
              </div>

              {/* Upload Trigger */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-700/80 hover:border-[#39FF14]/50 transition-all text-xs font-bold cursor-pointer group"
                >
                  <Upload className="w-4 h-4 text-[#39FF14] group-hover:scale-110 transition-transform" />
                  <span>Carregar Minha Foto</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPhotoUrl(null);
                    setCardBgStyle("transparent");
                    toast.success("Modo Sticker Transparente ativado!");
                  }}
                  className={`flex items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    !photoUrl && cardBgStyle === "transparent"
                      ? "bg-[#39FF14]/15 text-[#39FF14] border-[#39FF14]/40 shadow-[0_0_15px_rgba(57,255,20,0.15)]"
                      : "bg-slate-900 text-slate-300 hover:text-white border-slate-800"
                  }`}
                >
                  <Eye className="w-4 h-4 text-[#39FF14]" />
                  <span>Sem Fundo (PNG)</span>
                </button>
              </div>

              {/* Style: Transparent vs Glass */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setCardBgStyle("transparent")}
                  className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    cardBgStyle === "transparent"
                      ? "bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/40"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  Sem Fundo (Clean)
                </button>
                <button
                  type="button"
                  onClick={() => setCardBgStyle("glass")}
                  className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    cardBgStyle === "glass"
                      ? "bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/40"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  Vidro Fosco Transparente
                </button>
              </div>

              {/* Glass Opacity Slider when glass is selected */}
              {cardBgStyle === "glass" && (
                <div className="pt-2 mt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                    <span>Opacidade do Vidro (Fundo Transparente)</span>
                    <span className="font-mono text-[#39FF14]">{glassOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="5"
                    value={glassOpacity}
                    onChange={(e) => setGlassOpacity(Number(e.target.value))}
                    className="w-full accent-[#39FF14] bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 mt-0.5 font-mono">
                    <span>10% (Ultra translúcido)</span>
                    <span>20% (Padrão)</span>
                    <span>50% (Contraste)</span>
                  </div>
                </div>
              )}

              {/* Photo Darkness Overlay Slider */}
              {photoUrl && (
                <div className="pt-2 mt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                    <span>Escurecer Foto para Contraste</span>
                    <span className="font-mono text-[#39FF14]">{overlayDarkness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={overlayDarkness}
                    onChange={(e) => setOverlayDarkness(Number(e.target.value))}
                    className="w-full accent-[#39FF14] bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* 2. Cor dos Dados & Texto (Branco vs Preto) */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#39FF14]" />
                  2. Cor dos Dados & Números
                </label>
                <span className="text-[10px] font-bold text-slate-400">
                  {textColorMode === "white" ? "⚪ Modo Branco" : "⚫ Modo Preto"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setTextColorMode("white");
                    toast.success("Números em Branco selecionados!");
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    textColorMode === "white"
                      ? "bg-white text-slate-950 ring-2 ring-white"
                      : "bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white border-2 border-slate-400 shrink-0" />
                  <span>Números em Branco</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTextColorMode("black");
                    toast.success("Números em Preto selecionados!");
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    textColorMode === "black"
                      ? "bg-slate-950 text-white border-2 border-[#39FF14]"
                      : "bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-black border-2 border-white shrink-0" />
                  <span>Números em Preto</span>
                </button>
              </div>

              <p className="text-[9.5px] text-slate-400 mt-2.5 font-medium">
                {textColorMode === "white"
                  ? "💡 Use a cor Branca quando sua foto ou fundo for escuro para contraste perfeito."
                  : "💡 Use a cor Preta quando sua foto ou fundo for claro, branco ou ao ar livre."}
              </p>
            </div>

            {/* 3. Posição no Card / Foto (Topo, Centro, Rodapé) */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <label className="text-[11px] font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5 mb-2.5">
                <MoveVertical className="w-3.5 h-3.5 text-[#39FF14]" />
                3. Localização na Foto (Posição)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCardPosition("top")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    cardPosition === "top"
                      ? "bg-[#39FF14]/15 text-[#39FF14] border border-[#39FF14]/40 shadow-[0_0_12px_rgba(57,255,20,0.15)]"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>Topo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCardPosition("center")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    cardPosition === "center"
                      ? "bg-[#39FF14]/15 text-[#39FF14] border border-[#39FF14]/40 shadow-[0_0_12px_rgba(57,255,20,0.15)]"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <MoveVertical className="w-3.5 h-3.5" />
                  <span>Centro</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCardPosition("bottom")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    cardPosition === "bottom"
                      ? "bg-[#39FF14]/15 text-[#39FF14] border border-[#39FF14]/40 shadow-[0_0_12px_rgba(57,255,20,0.15)]"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>Rodapé</span>
                </button>
              </div>
            </div>

            {/* 4. Formato (Story 9:16 vs Feed 1:1) */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <label className="text-[11px] font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5 mb-2.5">
                <Sliders className="w-3.5 h-3.5 text-[#39FF14]" />
                4. Formato da Imagem
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAspectRatio("9:16")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    aspectRatio === "9:16"
                      ? "bg-[#39FF14]/15 text-[#39FF14] border border-[#39FF14]/40 shadow-[0_0_15px_rgba(57,255,20,0.15)]"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <div className="w-3 h-5 border-2 border-current rounded-sm" />
                  <span>Story / Status (9:16)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio("1:1")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    aspectRatio === "1:1"
                      ? "bg-[#39FF14]/15 text-[#39FF14] border border-[#39FF14]/40 shadow-[0_0_15px_rgba(57,255,20,0.15)]"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <div className="w-4 h-4 border-2 border-current rounded-sm" />
                  <span>Feed / Post (1:1)</span>
                </button>
              </div>
            </div>

            {/* 6. Frase Abaixo das Métricas */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <label className="text-[11px] font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5 mb-2">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                6. Frase Abaixo das Métricas
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={120}
                rows={2}
                placeholder="Escreva uma frase de motivação ou biofeedback..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#39FF14] transition-colors resize-none mb-2"
              />
              <div className="flex flex-wrap gap-1.5">
                {MOTIVATIONAL_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCaption(preset)}
                    className="text-[9px] font-bold px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                  >
                    "{preset.slice(0, 26)}..."
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Ações Principais de Exportação & Download */}
            <div className="space-y-2.5 pt-1">
              {/* Botão Primário: Se sem foto -> Baixar Sticker PNG; Se com foto -> Compartilhar Native */}
              {!photoUrl ? (
                <button
                  type="button"
                  onClick={() => handleDownload(true)}
                  disabled={isGenerating}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#10b981] to-[#39FF14] hover:from-[#059669] hover:to-[#22c55e] text-slate-950 font-black text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(57,255,20,0.35)] flex items-center justify-center gap-2.5 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Download className="w-5 h-5 shrink-0" />
                  <span>BAIXAR STICKER TRANSPARENTE (PNG)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleShareNative}
                  disabled={isGenerating}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#10b981] to-[#39FF14] hover:from-[#059669] hover:to-[#22c55e] text-slate-950 font-black text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(57,255,20,0.35)] flex items-center justify-center gap-2.5 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Share2 className="w-5 h-5 shrink-0" />
                  <span>COMPARTILHAR NO INSTAGRAM / WHATSAPP</span>
                </button>
              )}

              <div className="grid grid-cols-3 gap-2">
                {/* Baixar Sticker PNG (sempre acessível) */}
                <button
                  type="button"
                  onClick={() => handleDownload(true)}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-1.5 py-3 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold uppercase tracking-wider border border-slate-700 transition-all cursor-pointer"
                  title="Baixar apenas o sticker transparente em PNG"
                >
                  <Download className="w-4 h-4 text-[#39FF14]" />
                  <span>Sticker PNG</span>
                </button>

                {/* Copiar Imagem */}
                <button
                  type="button"
                  onClick={handleCopyImage}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-1.5 py-3 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold uppercase tracking-wider border border-slate-700 transition-all cursor-pointer"
                  title="Copiar sticker ou imagem para colar direto nos Stories"
                >
                  <Copy className="w-4 h-4 text-sky-400" />
                  <span>Copiar</span>
                </button>

                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="flex items-center justify-center gap-1.5 py-3 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold uppercase tracking-wider border border-slate-700 transition-all cursor-pointer"
                  title="Enviar estatísticas no WhatsApp"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp</span>
                </button>
              </div>

              {/* Publicar no Mural Social */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#39FF14]/10 text-[#39FF14] flex items-center justify-center shrink-0 border border-[#39FF14]/20">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-wider leading-tight">
                      Mural dos Atletas LB
                    </p>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Poste seu treino para a comunidade da assessoria
                    </p>
                  </div>
                </div>

                {isPostedToFeed ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Publicado</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handlePostToCommunity}
                    className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[#39FF14] text-xs font-black uppercase tracking-wider border border-slate-700 hover:border-[#39FF14]/40 transition-all cursor-pointer shrink-0"
                  >
                    Publicar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
