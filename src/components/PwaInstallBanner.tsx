import React, { useState, useEffect } from "react";
import { Download, Share2, PlusSquare, X, CheckCircle2, Smartphone, Apple, Sparkles, ChevronRight, Info } from "lucide-react";
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
      {/* Floating Bottom/Top Installation Banner */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-[9990] bg-slate-950/95 border-2 border-brand-primary/40 rounded-2xl p-4 shadow-[0_15px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl text-white"
          >
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start gap-3">
              {/* Logo / App Icon */}
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-brand-primary/40 p-1.5 shrink-0 flex items-center justify-center shadow-md">
                <img src="/pwa-192x192.svg" alt="LB Sports Logo" className="w-full h-full object-contain" />
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-brand-primary text-slate-950 px-2 py-0.5 rounded">
                    BAIXAR APLICATIVO
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    {isIOS ? (
                      <span className="text-slate-300 flex items-center gap-0.5">
                        <Apple className="w-3 h-3 text-white" /> iPhone / iPad
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <Smartphone className="w-3 h-3 text-emerald-400" /> Android
                      </span>
                    )}
                  </span>
                </div>

                <h4 className="font-extrabold text-sm text-white leading-tight">
                  Instalar LB Performance HUB
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-snug">
                  Adicione à sua tela inicial para acesso rápido aos treinos, avaliações e alertas offline.
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-brand-primary hover:bg-lime-300 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 transition-all uppercase tracking-wider cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-950" />
                {deferredPrompt ? "Instalar Agora" : isIOS ? "Como Instalar no iPhone" : "Instalar no Aparelho"}
              </button>

              <button
                onClick={handleDismiss}
                className="text-xs text-slate-400 hover:text-slate-200 px-3 py-2.5 rounded-xl hover:bg-slate-800/50 transition-colors font-medium shrink-0"
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
          <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl text-white relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-brand-primary/40 flex items-center justify-center">
                    <Apple className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">Instalar no iPhone / iPad</h3>
                    <p className="text-xs text-slate-400">Siga os 3 passos simples no Safari</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowIosGuide(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Steps */}
              <div className="py-5 space-y-4">
                {/* Step 1 */}
                <div className="flex items-start gap-3.5 bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-brand-primary text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-slate-200">
                      Toque no botão <span className="text-brand-primary font-black">Compartilhar</span> no menu do Safari
                    </p>
                    <p className="text-slate-400 mt-0.5">
                      Fica na barra inferior do iPhone ou no topo do iPad.
                    </p>
                    <div className="mt-2 inline-flex items-center gap-2 bg-slate-800 text-brand-primary px-2.5 py-1 rounded-lg border border-slate-700">
                      <Share2 className="w-4 h-4 text-brand-primary" />
                      <span className="font-semibold text-[11px]">Ícone de Compartilhar</span>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3.5 bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-brand-primary text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-slate-200">
                      Role para baixo e selecione <span className="text-brand-primary font-black">"Adicionar à Tela de Início"</span>
                    </p>
                    <div className="mt-2 inline-flex items-center gap-2 bg-slate-800 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700">
                      <PlusSquare className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold text-[11px]">Adicionar à Tela de Início</span>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3.5 bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-brand-primary text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-slate-200">
                      Toque em <span className="text-brand-primary font-black">"Adicionar"</span> no canto superior direito
                    </p>
                    <p className="text-slate-400 mt-0.5">
                      O ícone da LB Sports aparecerá junto com seus outros aplicativos!
                    </p>
                  </div>
                </div>
              </div>

              {/* Close Action */}
              <button
                onClick={() => {
                  setShowIosGuide(false);
                  handleDismiss();
                }}
                className="w-full bg-brand-primary hover:bg-lime-300 text-slate-950 font-black py-3 rounded-xl uppercase tracking-wider text-xs transition-colors cursor-pointer"
              >
                Entendi, Vou Adicionar!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Android / General Instructions Modal */}
      <AnimatePresence>
        {showAndroidGuide && (
          <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl text-white relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-emerald-500/40 flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">Instalar no Android</h3>
                    <p className="text-xs text-slate-400">Instalação direta pelo navegador Chrome</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowAndroidGuide(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Steps */}
              <div className="py-5 space-y-4">
                <div className="flex items-start gap-3.5 bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-slate-200">
                      Toque nos <span className="text-emerald-400 font-black">3 pontos (⋮)</span> no canto superior do Chrome
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-slate-200">
                      Selecione <span className="text-emerald-400 font-black">"Instalar aplicativo"</span> ou <span className="text-emerald-400 font-black">"Adicionar à tela inicial"</span>
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowAndroidGuide(false);
                  handleDismiss();
                }}
                className="w-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black py-3 rounded-xl uppercase tracking-wider text-xs transition-colors cursor-pointer"
              >
                Concluído
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
