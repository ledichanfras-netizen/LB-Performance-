import React from 'react';
import { useRanking } from "../hooks/useRanking";
import { motion } from 'motion/react';
import { Trophy, Medal, ArrowLeft, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Ranking() {
  const { ranking, loading } = useRanking();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 lg:p-24 selection:bg-brand-primary/30">
      <div className="max-w-2xl mx-auto">
        <header className="mb-12">
          <button 
            onClick={() => navigate('/dashboard')}
            className="mb-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] hover:text-brand-primary transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-brand-primary/10 rounded-2xl sm:rounded-3xl flex items-center justify-center border border-brand-primary/20 shrink-0">
               <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-brand-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase italic text-white leading-none">
              Elite <span className="text-brand-primary">Ranking</span>
            </h1>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Calculando Classificação...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ranking.map((user, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`premium-card p-6 flex items-center justify-between group hover:border-brand-primary/30 transition-all ${
                  index === 0 ? 'border-brand-primary/40 bg-brand-primary/5' : ''
                }`}
              >
                <div className="flex items-center gap-6">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[14px] ${
                    index === 0 ? 'bg-brand-primary text-slate-950' : 
                    index === 1 ? 'bg-slate-300 text-slate-950' :
                    index === 2 ? 'bg-amber-600 text-slate-950' :
                    'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}>
                    {index === 0 ? <Medal className="w-5 h-5" /> : index + 1}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h3 className="text-base sm:text-lg font-black uppercase italic text-white group-hover:text-brand-primary transition-colors truncate">
                      {user.athlete_name}
                    </h3>
                    <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest">Atleta de Elite</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-baseline gap-1 justify-end">
                    <span className="text-2xl font-black text-white italic">{user.forca}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">kgf</span>
                  </div>
                  <div className="flex items-center gap-1 justify-end opacity-40">
                     <Zap className="w-3 h-3 text-brand-primary fill-brand-primary" />
                     <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Power Level</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
