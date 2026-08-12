
import React, { useEffect } from 'react';
import { useDashboard } from "../hooks/useDashboard";
import { motion } from 'motion/react';
import { Activity, Zap, TrendingUp, ArrowLeft, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { UserWithPlan } from '../utils/plan';
import PerformanceChart from '../components/PerformanceChart';
import { pedirPermissao, notificar } from '../utils/notifications';

export default function Dashboard({ user }: { user: UserWithPlan | null }) {
  const { data, loading } = useDashboard();
  const navigate = useNavigate();

  useEffect(() => {
    pedirPermissao();
    
    const notificationTimeout = setTimeout(() => {
      notificar("LB Performance", "Hora de analisar sua evolução! 💪");
    }, 5000);

    return () => clearTimeout(notificationTimeout);
  }, []);

  if (!user || user.plan !== 'pro') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="premium-card p-12 max-w-md">
          <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-brand-primary" />
          </div>
          <h2 className="text-2xl font-black uppercase italic mb-4">Acesso <span className="text-brand-primary">Restrito</span></h2>
          <p className="text-slate-400 font-bold mb-8 italic">Este conteúdo é exclusivo para assinantes do Plano PRO.</p>
          <button 
            onClick={() => navigate('/venda')}
            className="w-full py-4 bg-brand-primary text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
          >
            Ver Plano PRO
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 selection:bg-brand-primary/30">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <button 
              onClick={() => navigate('/')}
              className="mb-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-brand-primary transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Início
            </button>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tighter uppercase italic text-white leading-none">
              Seu <span className="text-brand-primary">Desempenho</span>
            </h1>
          </div>
            <div className="flex items-center gap-2 sm:gap-4 w-full md:w-auto">
              <button 
                onClick={() => navigate('/ranking')}
                className="flex-1 md:flex-none px-3 md:px-6 py-3 bg-slate-800 text-brand-primary border border-slate-700 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
              >
                Ranking <Trophy className="w-4 h-4" />
              </button>
              <button 
                onClick={() => navigate('/hub')}
                className="flex-1 md:flex-none px-3 md:px-6 py-3 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary hover:text-slate-950 transition-all flex items-center justify-center gap-2"
              >
                <span className="hidden xs:inline sm:inline">Hub</span> <Zap className="w-4 h-4 fill-current" />
              </button>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-900 rounded-xl sm:rounded-2xl flex items-center justify-center border border-slate-800 shrink-0">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" />
              </div>
            </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Sincronizando com Supabase...</p>
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8"
            >
              <h3 className="text-[12px] font-black text-white uppercase tracking-[0.4em] mb-6 flex items-center gap-4">
                <div className="w-8 h-px bg-brand-primary"></div>
                Evolução de Força
              </h3>
              <PerformanceChart data={data} />
            </motion.div>

            {data.length > 0 ? (
              <div className="grid gap-6">
                {data.map((item, idx) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="premium-card p-8 group hover:border-brand-primary/30 transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                       <TrendingUp className="w-16 h-16 text-brand-primary" />
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                      <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 block">Data da Avaliação</span>
                        <h3 className="text-xl font-black text-white uppercase italic">
                          {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </h3>
                      </div>

                      <div className="flex flex-wrap gap-4 md:gap-12">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest mb-1">Força Isometric</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white italic">{item.forca}</span>
                            <span className="text-[10px] text-slate-500 font-bold">kgf</span>
                          </div>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-brand-secondary uppercase tracking-widest mb-1">VO2 Máximo</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white italic">{item.vo2}</span>
                            <span className="text-[10px] text-slate-500 font-bold">ml/kg/min</span>
                          </div>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest mb-1">Salto (CMJ)</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white italic">{item.cmj}</span>
                            <span className="text-[10px] text-slate-500 font-bold">cm</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex md:flex-col justify-end">
                         <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:bg-brand-primary group-hover:text-slate-950 transition-all">
                            <Zap className="w-5 h-5" />
                         </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-24 text-center border-2 border-dashed border-slate-900 rounded-[3rem]">
                 <p className="text-slate-500 font-black uppercase tracking-widest">Nenhuma métrica encontrada.</p>
                 <button 
                  onClick={() => navigate('/hub')}
                  className="mt-6 text-[10px] font-black text-brand-primary hover:underline uppercase tracking-widest"
                 >
                   Ir para o Elite Hub Completo
                 </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
