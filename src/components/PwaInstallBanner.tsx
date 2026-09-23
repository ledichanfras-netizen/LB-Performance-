import React, { useState, useEffect } from "react";
import { Download, Share2, PlusSquare, X, Smartphone, Apple, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PwaInstallBannerProps {
  deferredPrompt: any;
  onInstallHandled?: () => void;
}

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({
  deferredPrompt,
  onInstallHandled,
}) => {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  useEffect(() => {
    // 1. Check if running as standalone PWA
    const inStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    setIsStandalone(inStandalone);

    // 2. Detect OS
    const ua = navigator.userAgent || "";
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const android = /Android/.test(ua);

    setIsIOS(ios);
    setIsAndroid(android);

    // 3. Check dismiss state in localStorage
    const dismissedAt = localStorage.getItem("lb_pwa_banner_dismissed");
    const now = Date.now();
    // Re-show after 3 days if dismissed
    const isDismissedRecently = dismissedAt && now - parseInt(dismissedAt, 10) < 3 * 24 * 60 * 60 * 1000;

    if (!inStandalone && !isDismissedRecently) {
      // Small delay so user sees initial page render smoothly
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("lb_pwa_banner_dismissed", Date.now().toString());
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setIsVisible(false);
          if (onInstallHandled) onInstallHandled();
        }
      } catch (err) {
        console.error("Error triggering install prompt:", err);
      }
    } else if (isIOS) {
      setShowIosGuide(true);
    } else if (isAndroid) {
      setShowAndroidGuide(true);
    } else {
      setShowIosGuide(true);
    }
  };

  if (isStandalone || !isVisible) return null;

  return (
    <>
      {/* Floating High-Contrast Installation Banner */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="pwa-install-banner-card fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-[9990] bg-[#0c121e] border-2 border-[#39FF14] rounded-2xl p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl text-white"
          >
            {/* Ambient High-Luminance Glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#39FF14]/15 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start gap-3.5">
              {/* Logo / App Icon with High Contrast Frame */}
              <div className="w-12 h-12 rounded-xl bg-slate-900 border-2 border-[#39FF14]/60 shrink-0 flex items-center justify-center shadow-lg overflow-hidden">
                <img src="/pwa-192x192.svg" alt="LB Sports Logo" className="w-9 h-9 object-contain" />
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-[#39FF14] text-slate-950 px-2 py-0.5 rounded shadow-sm">
                    BAIXAR APLICATIVO
                  </span>
                  <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1">
                    {isIOS ? (
                      <span className="text-white flex items-center gap-1">
                        <Apple className="w-3.5 h-3.5 text-white" /> iPhone / iPad
                      </span>
                    ) : (
                      <span className="text-emerald-300 flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-300" /> Android
                      </span>
                    )}
                  </span>
                </div>

                <h4 className="font-black text-[15px] text-white leading-tight">
                  Instalar LB Performance HUB
                </h4>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed font-medium">
                  Instale na sua tela de início para acesso rápido, treinos em tela cheia e modo offline!
                </p>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleDismiss}
                className="absolute top-3 right-3 p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 pt-3.5 border-t border-slate-800 flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex-1 bg-[#39FF14] hover:bg-[#32e00f] text-slate-950 font-black text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(57,255,20,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-wider cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                <span>{deferredPrompt ? "Instalar Agora" : isIOS ? "Como Instalar no iPhone" : "Instalar no Aparelho"}</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="text-xs text-slate-300 hover:text-white px-3.5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors font-bold shrink-0 cursor-pointer"
              >
                Depois
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Installation Instructions Modal */}
      <AnimatePresence>
        {showIosGuide && (
          <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="pwa-install-guide-modal bg-[#0c121e] border-2 border-[#39FF14]/60 rounded-3xl w-full max-w-md p-6 shadow-2xl text-white relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-[#39FF14]/50 flex items-center justify-center shadow-md">
                    <Apple className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">Instalar no iPhone / iPad</h3>
                    <p className="text-xs text-slate-300 font-medium">Siga os 3 passos rápidos no Safari:</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowIosGuide(false)}
                  className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Steps */}
              <div className="py-5 space-y-3.5">
                {/* Step 1 */}
                <div className="flex items-start gap-3.5 bg-slate-900/90 border border-slate-700/80 p-3.5 rounded-2xl">
                  <div className="w-7 h-7 rounded-full bg-[#39FF14] text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                    1
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-white">
                      Toque no botão <span className="text-[#39FF14] font-black underline underline-offset-2">Compartilhar</span> no menu do Safari
                    </p>
                    <p className="text-slate-300 mt-1">
                      Fica na barra inferior do Safari no iPhone ou no topo do iPad.
                    </p>
                    <div className="mt-2.5 inline-flex items-center gap-2 bg-slate-800 text-[#39FF14] px-3 py-1.5 rounded-xl border border-slate-700">
                      <Share2 className="w-4 h-4 text-[#39FF14]" />
                      <span className="font-bold text-xs text-white">Ícone Compartilhar (quadrado com seta)</span>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3.5 bg-slate-900/90 border border-slate-700/80 p-3.5 rounded-2xl">
                  <div className="w-7 h-7 rounded-full bg-[#39FF14] text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                    2
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-white">
                      Role o menu para baixo e selecione <span className="text-[#39FF14] font-black underline underline-offset-2">"Adicionar à Tela de Início"</span>
                    </p>
                    <div className="mt-2.5 inline-flex items-center gap-2 bg-slate-800 text-slate-100 px-3 py-1.5 rounded-xl border border-slate-700">
                      <PlusSquare className="w-4 h-4 text-[#39FF14]" />
                      <span className="font-bold text-xs text-white">Adicionar à Tela de Início</span>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3.5 bg-slate-900/90 border border-slate-700/80 p-3.5 rounded-2xl">
                  <div className="w-7 h-7 rounded-full bg-[#39FF14] text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                    3
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-white">
                      Toque em <span className="text-[#39FF14] font-black underline underline-offset-2">"Adicionar"</span> no canto superior direito
                    </p>
                    <p className="text-slate-300 mt-1 font-medium">
                      Pronto! O aplicativo da LB Sports já estará na sua tela inicial como um app nativo.
                    </p>
                  </div>
                </div>
              </div>

              {/* Close Action */}
              <button
                type="button"
                onClick={() => {
                  setShowIosGuide(false);
                  handleDismiss();
                }}
                className="w-full bg-[#39FF14] hover:bg-[#32e00f] text-slate-950 font-black py-3.5 rounded-xl uppercase tracking-wider text-xs transition-all shadow-[0_0_20px_rgba(57,255,20,0.25)] cursor-pointer"
              >
                Entendi, Vou Adicionar! 🚀
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Android / General Instructions Modal */}
      <AnimatePresence>
        {showAndroidGuide && (
          <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="pwa-install-guide-modal bg-[#0c121e] border-2 border-emerald-400/60 rounded-3xl w-full max-w-md p-6 shadow-2xl text-white relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-emerald-400/50 flex items-center justify-center shadow-md">
                    <Smartphone className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">Instalar no Android</h3>
                    <p className="text-xs text-slate-300 font-medium">Instalação direta pelo Google Chrome:</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAndroidGuide(false)}
                  className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Steps */}
              <div className="py-5 space-y-3.5">
                <div className="flex items-start gap-3.5 bg-slate-900/90 border border-slate-700/80 p-3.5 rounded-2xl">
                  <div className="w-7 h-7 rounded-full bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                    1
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-white">
                      Toque nos <span className="text-emerald-400 font-black underline underline-offset-2">3 pontos (⋮)</span> no canto superior direito do Chrome
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 bg-slate-900/90 border border-slate-700/80 p-3.5 rounded-2xl">
                  <div className="w-7 h-7 rounded-full bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                    2
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-white">
                      Selecione <span className="text-emerald-400 font-black underline underline-offset-2">"Instalar aplicativo"</span> ou <span className="text-emerald-400 font-black underline underline-offset-2">"Adicionar à tela inicial"</span>
                    </p>
                    <p className="text-slate-300 mt-1 font-medium">
                      O ícone do aplicativo será adicionado à sua gaveta de aplicativos e tela inicial.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAndroidGuide(false);
                  handleDismiss();
                }}
                className="w-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black py-3.5 rounded-xl uppercase tracking-wider text-xs transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer"
              >
                Concluído 🚀
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

