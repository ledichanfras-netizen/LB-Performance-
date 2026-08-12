
import React from 'react';
import { motion } from 'motion/react';
import { Check, ArrowRight, Star, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Venda() {
  const navigate = useNavigate();

  const features = [
    "Monitoramento de Força Máxima",
    "Estimativa de VO2 Máximo Profissional",
    "Analítica de Salto Vertical (CMJ)",
    "Relatórios de Evolução Semanal",
    "Protocolos de Recuperação IA",
    "Dashboard Exclusiv Elite Hub"
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-brand-primary/30 relative overflow-hidden p-6 md:p-12 lg:p-24 flex flex-col items-center">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-brand-secondary/5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-primary/5 rounded-full blur-[100px]"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full z-10"
      >
        <button 
          onClick={() => navigate('/')}
          className="mb-12 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] hover:text-brand-primary transition-colors flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Voltar
        </button>

        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic mb-4 leading-none">
          Evolua sua <span className="text-brand-secondary">Performance</span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl font-bold tracking-tight mb-16 max-w-2xl">
          Tenha acesso às mesmas ferramentas utilizadas pelos principais centros de treinamento de alto rendimento do mundo.
        </p>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div className="space-y-6">
            <h3 className="text-[12px] font-black text-white uppercase tracking-[0.4em] mb-8 flex items-center gap-4">
              <div className="w-8 h-px bg-brand-secondary"></div>
              Métricas Profissionais
            </h3>
            
            <ul className="space-y-6">
              {features.map((feature, idx) => (
                <motion.li 
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-6 h-6 rounded-lg bg-brand-secondary/10 flex items-center justify-center border border-brand-secondary/20 group-hover:scale-110 transition-transform">
                    <Check className="w-3 h-3 text-brand-secondary" />
                  </div>
                  <span className="text-[12px] font-black text-slate-300 uppercase tracking-widest leading-none">{feature}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="premium-card p-10 md:p-14 relative overflow-hidden border-brand-primary/30"
          >
            <div className="absolute top-0 right-0 p-6">
              <Crown className="w-8 h-8 text-brand-primary opacity-20" />
            </div>

            <h2 className="text-3xl font-black uppercase italic text-white mb-2">Plano <span className="text-brand-primary">PRO</span></h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-10">Otimização Total de Dados</p>

            <div className="mb-12">
              <div className="flex items-baseline gap-2">
                <span className="text-[14px] font-black text-slate-400 uppercase">R$</span>
                <span className="text-6xl font-black text-white italic tracking-tighter">29,90</span>
                <span className="text-[12px] font-black text-slate-500 uppercase tracking-widest">/mês</span>
              </div>
            </div>

            <button 
              onClick={() => window.open("https://wa.me/5543991704132?text=Quero%20assinar%20o%20LB%20Hub%20PRO")}
              className="w-full py-6 bg-brand-primary text-slate-950 font-black rounded-3xl text-[12px] uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(57,255,20,0.2)] hover:shadow-[0_25px_50px_rgba(57,255,20,0.3)] hover:-translate-y-1 transition-all mb-8"
            >
              Assinar via WhatsApp
            </button>

            <div className="flex items-center justify-center gap-6 opacity-40">
               <div className="flex items-center gap-1">
                 <Star className="w-3 h-3 text-brand-primary fill-brand-primary" />
                 <Star className="w-3 h-3 text-brand-primary fill-brand-primary" />
                 <Star className="w-3 h-3 text-brand-primary fill-brand-primary" />
                 <Star className="w-3 h-3 text-brand-primary fill-brand-primary" />
                 <Star className="w-3 h-3 text-brand-primary fill-brand-primary" />
               </div>
               <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Elite Performance Verified</span>
            </div>
            <div className="mt-8 pt-8 border-t border-white/5 text-center">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Já é um membro Elite?</p>
              <button 
                onClick={() => navigate('/hub')}
                className="text-[10px] font-black text-white uppercase tracking-widest hover:text-brand-primary transition-colors underline underline-offset-8"
              >
                Acessar minha conta
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

const Crown: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
  </svg>
);
