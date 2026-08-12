import React from 'react';
import { motion } from 'motion/react';
import { 
  Crown, 
  CheckCircle2, 
  Zap, 
  Lock, 
  Star, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const PremiumHub: React.FC = () => {
  const handleSubscribe = (plan: string) => {
    toast.success(`Redirecionando para checkout do plano ${plan}...`);
    // Aqui integraria com Stripe ou outro gateway
  };

  const features = [
    { icon: Sparkles, text: "IA Ilimitada: Treinos gerados por Gemini Ultra" },
    { icon: TrendingUp, text: "Relatórios de Modelagem de Performance de Elite" },
    { icon: ShieldCheck, text: "Prevenção de Lesões via Machine Learning" },
    { icon: Users, text: "Acesso total para até 5 atletas (Equipe)" },
    { icon: Zap, text: "Sincronização em tempo real e Modo Offline" },
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[3rem] bg-slate-900 p-10 md:p-20 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/20 blur-[120px] pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-brand-secondary/10 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-primary/20 rounded-full border border-brand-primary/30 mb-8">
            <Crown className="w-4 h-4 text-brand-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-primary">LB Elite Experience</span>
          </div>
          
          <h1 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter sm:leading-tight mb-6">
            Eleve seu Potencial ao <span className="text-brand-primary">Próximo Nível</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed italic font-medium mb-10 max-w-2xl">
            Acesso exclusivo às ferramentas de elite utilizadas por atletas de alto rendimento. Inteligência Artificial, modelagem preditiva e gestão total da carga.
          </p>

          <button 
            onClick={() => handleSubscribe('PRO')}
            className="flex items-center gap-3 bg-brand-primary text-white px-8 py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-brand-dark transition-all hover:scale-105 active:scale-95 shadow-xl shadow-brand-primary/20"
          >
            Seja Elite Agora
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Plans Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Basic Plan */}
        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-xl flex flex-col group hover:border-brand-primary/30 transition-all">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Plano Starter</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Para atletas individuais</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-slate-900 tracking-tighter">Gratuito</span>
            </div>
          </div>

          <div className="space-y-4 mb-12 flex-grow">
            {[
              "Gestão de 1 Atleta",
              "Histórico de 30 dias",
              "Relatórios Básicos",
              "Check-ins de Wellness"
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-bold text-slate-600 italic">{f}</span>
              </div>
            ))}
          </div>

          <button className="w-full py-5 rounded-2xl border-2 border-slate-100 text-slate-400 font-black text-xs uppercase tracking-widest cursor-not-allowed">
            Plano Atual
          </button>
        </div>

        {/* Elite Plan */}
        <div className="bg-slate-900 rounded-[2.5rem] p-10 border-4 border-brand-primary shadow-2xl flex flex-col relative overflow-hidden group hover:scale-[1.02] transition-all">
          <div className="absolute top-4 right-4 rotate-12 opacity-10">
            <Crown className="w-32 h-32 text-white" />
          </div>
          
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div>
              <div className="inline-block px-3 py-1 bg-brand-primary text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-full mb-3">Recomendado</div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Plano Elite X</h3>
              <p className="text-xs font-bold text-brand-primary uppercase tracking-widest mt-1">Alta Performance Total</p>
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-black text-brand-primary uppercase">R$</span>
                <span className="text-4xl font-black text-white tracking-tighter">149</span>
                <span className="text-xs font-bold text-slate-400 uppercase">/mês</span>
              </div>
            </div>
          </div>

          <div className="space-y-5 mb-12 flex-grow relative z-10">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-4 group/item">
                <div className="p-2 bg-brand-primary/10 rounded-xl group-hover/item:bg-brand-primary/20 transition-colors">
                  <f.icon className="w-4 h-4 text-brand-primary" />
                </div>
                <span className="text-sm font-bold text-slate-300 italic group-hover/item:text-white transition-colors">{f.text}</span>
              </div>
            ))}
          </div>

          <button 
            onClick={() => handleSubscribe('ELITE')}
            className="w-full py-6 rounded-3xl bg-brand-primary text-white font-black text-sm uppercase tracking-widest hover:bg-brand-dark transition-all shadow-xl shadow-brand-primary/20 relative z-10"
          >
            Assinar Plano Elite
          </button>
        </div>
      </div>

      {/* Social Proof */}
      <div className="text-center space-y-6">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Confiança dos Melhores Atletas</p>
        <div className="flex flex-wrap justify-center gap-8 opacity-40 grayscale filter hover:grayscale-0 transition-all duration-500">
           {/* Placeholders for partner logos */}
           <div className="font-black italic text-xl text-slate-900 border-2 border-slate-900 px-4 py-1">ULTRA</div>
           <div className="font-black italic text-xl text-slate-900 border-2 border-slate-900 px-4 py-1">PEAK</div>
           <div className="font-black italic text-xl text-slate-900 border-2 border-slate-900 px-4 py-1">CORE</div>
           <div className="font-black italic text-xl text-slate-900 border-2 border-slate-900 px-4 py-1">VELOCITY</div>
        </div>
      </div>
    </div>
  );
};
