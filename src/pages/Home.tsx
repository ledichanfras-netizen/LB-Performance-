
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Trophy, Zap, Activity } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-brand-primary/30 relative overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-brand-primary/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-secondary/5 rounded-full blur-[100px]"></div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 text-center max-w-2xl"
      >
        <div className="flex justify-center mb-8">
          <div className="w-28 h-28 bg-slate-900/90 rounded-[2.5rem] flex items-center justify-center p-3 shadow-[0_0_50px_rgba(57,255,20,0.35)] border border-brand-primary/30">
            <img src="/pwa-192x192.svg" className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(57,255,20,0.3)]" alt="LB Logo" />
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic mb-6">
          LB <span className="text-brand-primary">Performance</span>
        </h1>

        <p className="text-slate-400 text-lg md:text-xl font-bold tracking-tight mb-12">
          Acompanhe sua evolução física com dados reais e monitoramento de elite.
        </p>

        <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
          <button
            onClick={() => navigate('/hub')}
            className="group relative px-10 py-6 bg-brand-primary text-slate-950 font-black rounded-3xl text-[12px] uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(57,255,20,0.2)] hover:shadow-[0_25px_50px_rgba(57,255,20,0.3)] hover:-translate-y-1 transition-all flex items-center gap-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
            Entrar no Hub
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/venda')}
            className="px-10 py-6 bg-slate-900/50 border border-slate-800 text-brand-primary font-black rounded-3xl text-[12px] uppercase tracking-[0.2em] backdrop-blur-xl hover:bg-slate-800/80 transition-all"
          >
            Conhecer o Plano PRO
          </button>
        </div>

        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-50">
           <div className="flex flex-col items-center gap-2">
             <Trophy className="w-6 h-6 text-brand-primary" />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Elite Standards</span>
           </div>
           <div className="flex flex-col items-center gap-2">
             <Zap className="w-6 h-6 text-brand-primary" />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Real-time Data</span>
           </div>
           <div className="flex flex-col items-center gap-2">
             <Activity className="w-6 h-6 text-brand-primary" />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Peak Performance</span>
           </div>
           <div className="flex flex-col items-center gap-2">
             <div className="w-6 h-6 flex items-center justify-center border-2 border-brand-primary rounded-full text-[10px] font-black text-brand-primary">AI</div>
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Smart Insights</span>
           </div>
        </div>
      </motion.div>

      {/* Footer Citation */}
      <footer className="absolute bottom-8 text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] italic opacity-40">
        Precision in every heartbeat. v3.0
      </footer>
    </div>
  );
}
