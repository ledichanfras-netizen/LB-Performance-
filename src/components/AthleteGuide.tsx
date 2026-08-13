import React, { FC, useState, useMemo, useEffect } from 'react';
import { 
  Info, 
  LayoutDashboard, 
  Dumbbell, 
  ClipboardList, 
  Activity, 
  ShieldCheck, 
  Database, 
  Brain,
  Sparkles,
  BookOpen,
  Award,
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  Heart,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sliders,
  Edit3,
  Trash2,
  Copy,
  Plus,
  Video,
  Play,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IMTPNormativos } from './IMTPNormativos';
import { ENRICHED_LIBRARY, EnrichedExercise } from '../data/exercises';
import { toast } from 'react-hot-toast';
import { ExerciseEditorModal } from './ExerciseEditorModal';
import { getEmbedVideoInfo } from '../utils';

const GuideCard: FC<{ 
  icon: any, 
  title: string, 
  description: string, 
  importance: string,
  color: string 
}> = ({ icon: Icon, title, description, importance, color }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem] hover:border-brand-primary/30 transition-all group"
  >
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <h3 className="text-lg font-black text-white italic uppercase tracking-tighter mb-2 group-hover:text-brand-primary transition-colors">{title}</h3>
    <p className="text-xs text-slate-400 font-medium leading-relaxed mb-4">{description}</p>
    <div className="pt-4 border-t border-slate-800">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3 h-3 text-brand-primary" />
        <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest">Por que é vital?</span>
      </div>
      <p className="text-[10px] text-slate-500 italic font-medium leading-relaxed">{importance}</p>
    </div>
  </motion.div>
);

export interface AthleteGuideProps {
  role?: "coach" | "athlete";
}

export const AthleteGuide: FC<AthleteGuideProps> = ({ role = "coach" }) => {
  const [subTab, setSubTab] = useState<"guide" | "normatives" | "tables" | "library">("guide");
  const [normativeSearch, setNormativeSearch] = useState("");
  const [activeNormativeTab, setActiveNormativeTab] = useState<"all" | "imtp" | "cmj" | "speed" | "vo2">("all");

  // Library State
  const [libSearch, setLibSearch] = useState("");
  const [libCategory, setLibCategory] = useState<string>("ALL");
  const [libDifficulty, setLibDifficulty] = useState<string>("ALL");
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);

  // Load custom library and deleted exercises
  const [customLibraryExercises, setCustomLibraryExercises] = useState<EnrichedExercise[]>(() => {
    try {
      const stored = localStorage.getItem("LB_CUSTOM_LIBRARY_EXERCISES");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Erro ao carregar exercícios customizados:", e);
      return [];
    }
  });

  const [deletedExerciseIds, setDeletedExerciseIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("LB_DELETED_LIBRARY_EXERCISES");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Erro ao carregar exercícios deletados:", e);
      return [];
    }
  });

  // Keep state updated if other tabs change local storage
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const storedCustom = localStorage.getItem("LB_CUSTOM_LIBRARY_EXERCISES");
        if (storedCustom) setCustomLibraryExercises(JSON.parse(storedCustom));
        const storedDeleted = localStorage.getItem("LB_DELETED_LIBRARY_EXERCISES");
        if (storedDeleted) setDeletedExerciseIds(JSON.parse(storedDeleted));
      } catch (e) {
        console.error("Erro ao sincronizar localStorage:", e);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("custom-library-synced", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("custom-library-synced", handleStorageChange);
    };
  }, []);

  const combinedLibrary = useMemo(() => {
    const customMap = new Map(customLibraryExercises.map(ex => [ex.id, ex]));
    const list: EnrichedExercise[] = [];
    
    // Built-ins
    ENRICHED_LIBRARY.forEach(builtIn => {
      if (deletedExerciseIds.includes(builtIn.id)) return;
      if (customMap.has(builtIn.id)) {
        list.push(customMap.get(builtIn.id)!);
      } else {
        list.push(builtIn);
      }
    });
    
    // Custom news
    customLibraryExercises.forEach(custom => {
      if (deletedExerciseIds.includes(custom.id)) return;
      const isOverrideOfBuiltIn = ENRICHED_LIBRARY.some(b => b.id === custom.id);
      if (!isOverrideOfBuiltIn) {
        list.push(custom);
      }
    });
    
    return list;
  }, [customLibraryExercises, deletedExerciseIds]);

  // Modals / Confirmation States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<EnrichedExercise | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<EnrichedExercise | null>(null);
  const [exerciseToClone, setExerciseToClone] = useState<EnrichedExercise | null>(null);

  const handleSaveExercise = (updated: EnrichedExercise) => {
    let updatedList = [...customLibraryExercises];
    const index = updatedList.findIndex(x => x.id === updated.id);
    if (index >= 0) {
      updatedList[index] = updated;
    } else {
      updatedList.unshift(updated);
    }
    setCustomLibraryExercises(updatedList);
    localStorage.setItem("LB_CUSTOM_LIBRARY_EXERCISES", JSON.stringify(updatedList));
    
    // Trigger storage event so other components sync
    window.dispatchEvent(new Event("storage"));

    setIsEditorOpen(false);
    setExerciseToEdit(null);
    toast.success(`"${updated.name}" salvo com sucesso! 📚`);
  };

  const handleDeleteExercise = (id: string) => {
    const updatedDeleted = [...deletedExerciseIds, id];
    setDeletedExerciseIds(updatedDeleted);
    localStorage.setItem("LB_DELETED_LIBRARY_EXERCISES", JSON.stringify(updatedDeleted));
    
    // Also remove from custom lists if present
    const updatedCustom = customLibraryExercises.filter(x => x.id !== id);
    setCustomLibraryExercises(updatedCustom);
    localStorage.setItem("LB_CUSTOM_LIBRARY_EXERCISES", JSON.stringify(updatedCustom));
    
    // Trigger storage event
    window.dispatchEvent(new Event("storage"));

    setExerciseToDelete(null);
    toast.success("Exercício excluído da biblioteca.");
  };

  const handleCloneExercise = (item: EnrichedExercise) => {
    const newId = `custom-lib-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const cloned: EnrichedExercise = {
      ...item,
      id: newId,
      name: `${item.name} (CÓPIA)`,
      isFavorite: false,
    };
    
    const updatedList = [cloned, ...customLibraryExercises];
    setCustomLibraryExercises(updatedList);
    localStorage.setItem("LB_CUSTOM_LIBRARY_EXERCISES", JSON.stringify(updatedList));
    
    // Trigger storage event
    window.dispatchEvent(new Event("storage"));

    setExerciseToClone(null);
    toast.success(`"${item.name}" clonado com sucesso como "${cloned.name}"!`);
    
    // Automatically open editor on the cloned exercise so they can modify it
    setExerciseToEdit(cloned);
    setIsEditorOpen(true);
  };

  // Filter exercises using combinedLibrary
  const filteredExercises = useMemo(() => {
    return combinedLibrary.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(libSearch.toLowerCase()) ||
        (item.muscleGroup || "").toLowerCase().includes(libSearch.toLowerCase()) ||
        (item.movementPattern || "").toLowerCase().includes(libSearch.toLowerCase()) ||
        (item.equipment || "").toLowerCase().includes(libSearch.toLowerCase()) ||
        (item.musclesInvolved || []).some(m => m.toLowerCase().includes(libSearch.toLowerCase()));

      const matchesCategory = libCategory === "ALL" || item.category === libCategory;
      const matchesDifficulty = libDifficulty === "ALL" || item.difficulty === libDifficulty;

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [combinedLibrary, libSearch, libCategory, libDifficulty]);

  return (
    <div className="space-y-8 pb-20">
      {/* Sub tabs navigation */}
      <div className="flex flex-wrap md:flex-nowrap bg-slate-900/80 p-1 rounded-2xl border border-slate-800 max-w-2xl gap-1">
        <button
          onClick={() => setSubTab("guide")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            subTab === "guide"
              ? "bg-slate-800 text-white font-black"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Guia do Sistema</span>
        </button>
        <button
          onClick={() => setSubTab("library")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            subTab === "library"
              ? "bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20 font-black shadow-lg"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          <span>Biblioteca de Exercícios</span>
        </button>
        <button
          onClick={() => setSubTab("normatives")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            subTab === "normatives"
              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 font-black shadow-lg"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Normativos</span>
        </button>
        <button
          onClick={() => setSubTab("tables")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            subTab === "tables"
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black shadow-lg"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Tabelas</span>
        </button>
      </div>

      {subTab === "guide" && (
        <div className="space-y-12 animate-fadeIn">
          {/* Hero Section */}
          <div className="relative p-10 md:p-16 rounded-[3rem] overflow-hidden bg-gradient-to-br from-[#112d1b]/20 to-slate-900 border border-emerald-500/10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#39FF14]/5 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#39FF14]/10 rounded-full border border-[#39FF14]/20 mb-6">
                <Info className="w-3 h-3 text-[#39FF14]" />
                <span className="text-[9px] font-black text-[#39FF14] uppercase tracking-[0.2em]">Guia do Atleta Elite</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white italic uppercase tracking-tighter leading-tight mb-6">
                Sua jornada <span className="text-[#39FF14]">Elite</span> começa com dados precisos.
              </h1>
              <p className="text-sm md:text-lg text-slate-400 font-medium leading-relaxed">
                O LB HUB não é apenas um diário de treino. É um ecossistema de inteligência que utiliza seus dados para prever performance, mitigar riscos de lesão e otimizar cada segundo da sua preparação.
              </p>
            </div>
          </div>

          {/* Sections Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GuideCard 
              icon={LayoutDashboard}
              title="Painel Geral (Dashboard Hub)"
              color="bg-emerald-500 shadow-emerald-500/20"
              description="Sua sala de controle tático. Visualize em tempo real o seu radar individual de performance física, a prontidão do dia e o status global do seu condicionamento biológico."
              importance="Permite que você e a equipe de preparação vejam instantaneamente se você está na sua melhor forma para os treinos do dia."
            />
            <GuideCard 
              icon={Activity}
              title="Prontidão Isolada (Physiological Wellness)"
              color="bg-blue-500 shadow-blue-500/20"
              description="Check-in matinal de sono, fadiga, estresse e dor. Mantido puramente fisiológico para mapear sua recuperação corporal diária de forma autônoma."
              importance="Fundamental para medir o impacto acumulado do treinamento. Sem o check-in, as decisões sobre as suas cargas e limites diários são cegas."
            />
            <GuideCard 
              icon={Dumbbell}
              title="Treino e Sessões Externas (Training Logs)"
              color="bg-indigo-500 shadow-indigo-500/20"
              description="Acesse o seu treino planejado e registre também as Sessões Externas executadas fora do clube (treinos adicionais, academia alternativa, corrida ou fisioterapia)."
              importance="Unificar sessões externas e planejadas permite o cálculo exato do volume total e PSE (Percepção Subjetiva de Esforço), garantindo precisão absoluta no monitoramento de carga."
            />
            <GuideCard 
              icon={ClipboardList}
              title="Avaliações Ativas (Elite Testing)"
              color="bg-purple-500 shadow-purple-500/20"
              description="Acesso direto aos resultados reais de suas avaliações físicas ativas (CMJ, Sprints de velocidade e Força Isométrica IMTP) de forma pura, direta e sem a burocracia de relatórios lentos."
              importance="Garante visualização transparente do progresso e validação de adaptações neuromusculares e mecânicas em campo de alta intensidade."
            />
            <GuideCard 
              icon={ShieldCheck}
              title="DM & Saúde (Medical Care)"
              color="bg-red-500 shadow-red-500/20"
              description="Controle clínico centralizado de dores musculares agudas, lesões registradas pelo DM, diagnósticos e linha do tempo preditiva de retorno seguro aos gramados."
              importance="Evita o perigo de reincidências ou retorno precipitado, garantindo que você treine apenas sob condições médicas seguras e liberadas."
            />
            <GuideCard 
              icon={Database}
              title="Carga Individual e ACWR"
              color="bg-amber-500 shadow-amber-500/20"
              description="Cálculo matemático individualizado do índice de Carga Aguda vs. Crônica (ACWR). Analisa fadiga acumulada e qualidade ideal de repouso diário."
              importance="A IA calcula sua zona de risco. Se o seu índice passar de 1.5 (zona de perigo), o sistema sinaliza risco para programar o controle de sua intensidade."
            />
            <GuideCard 
              icon={Brain}
              title="Modelagem de Performance"
              color="bg-brand-secondary shadow-brand-secondary/20"
              description="Algoritmos de inteligência artificial calculam picos de esforço ideais, estimando o seu nível reativo e capacidades neuromusculares."
              importance="Prepara o atleta para atingir picos de potência nos momentos mais críticos da competição da temporada."
            />
          </div>

          {/* Call to Action */}
          <div className="bg-slate-900 border border-slate-800 p-8 md:p-12 rounded-[3rem] text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-brand-primary/5 opacity-50" />
            <div className="relative z-10 space-y-6">
              <Database className="w-12 h-12 text-[#39FF14] mx-auto mb-4" />
              <h2 className="text-2xl md:text-4xl font-black text-white italic uppercase tracking-tighter">O Dado é o Novo Combustível</h2>
              <p className="max-w-2xl mx-auto text-slate-400 text-sm md:text-base font-medium">
                Atletas de elite não deixam nada ao acaso. Alimentar o LB HUB diariamente é o compromisso que você assume com sua própria evolução. 
                <br className="hidden md:block" />
                <span className="text-[#39FF14]">Sem dados, somos apenas pessoas com opiniões. Com dados, somos Elite.</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {subTab === "normatives" && (
        <div className="animate-fadeIn">
          <IMTPNormativos />
        </div>
      )}

      {subTab === "tables" && (
        <div className="space-y-8 animate-fadeIn bg-[#080c14]/30 border border-slate-900/60 p-6 rounded-3xl shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-5">
            <div>
              <h3 className="text-base font-black uppercase text-white tracking-wider">Tabelas de Referência no Futebol Profissional</h3>
              <p className="text-[10px] font-bold text-amber-500 uppercase mt-0.5 tracking-wider">Normativos e Benchmarks Avançados para Pesquisa Rápida</p>
            </div>
            
            {/* Search Bar */}
            <div className="relative w-full md:w-72">
              <input
                type="text"
                value={normativeSearch}
                onChange={(e) => setNormativeSearch(e.target.value)}
                placeholder="Pesquisar categoria, posição..."
                className="w-full bg-[#0e1322] border border-slate-800 rounded-xl px-4 py-2 text-[11px] font-bold text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary"
              />
              <Search className="absolute right-3.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "Todas as Tabelas", color: "border-slate-800/60" },
              { id: "imtp", label: "Força Isométrica (IMTP)", color: "border-blue-900/40 text-blue-400" },
              { id: "cmj", label: "Salto Vertical (CMJ)", color: "border-amber-900/40 text-amber-400" },
              { id: "speed", label: "Velocidade Sprints (10m/30m)", color: "border-rose-900/40 text-rose-400" },
              { id: "vo2", label: "Resistência (VO2 Máximo)", color: "border-emerald-900/40 text-emerald-400" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveNormativeTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${
                  activeNormativeTab === tab.id
                    ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 border-amber-500 font-extrabold shadow-sm"
                    : `bg-[#0e1322] text-slate-400 hover:text-white ${tab.color}`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tables Container */}
          <div className="space-y-8">
            {/* 1. TABLE: FORÇA ISOMÉTRICA (IMTP) */}
            {(activeNormativeTab === "all" || activeNormativeTab === "imtp") && (
              <div className="bg-[#0e1322]/40 border border-slate-850 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-blue-500 rounded-full" />
                  <h4 className="text-xs font-black uppercase text-white tracking-wider">Tabela de Força Isométrica Máxima (IMTP)</h4>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#0e1322] text-[8px] font-black text-blue-400 uppercase tracking-widest border-b border-slate-800">
                      <tr>
                        <th className="p-3">Categoria / Idade</th>
                        <th className="p-3">Força Pico (Newtons - N)</th>
                        <th className="p-3">Força Pico (Kg Equivalente)</th>
                        <th className="p-3">Força Relativa (N/kg)</th>
                        <th className="p-3">Foco do Treinamento Neuromuscular</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/70 font-extrabold uppercase text-[10px] tracking-wide">
                      {[
                        { cat: "Sub-15 (14-15 anos)", force: "1.800 N – 2.300 N", kg: "183 kg – 234 kg", rel: "30 a 35 N/kg", desc: "Fase de maturação; desenvolvimento técnico, rítmico e estabilidade central (core)." },
                        { cat: "Sub-17 (16-17 anos)", force: "2.400 N – 2.900 N", kg: "245 kg – 296 kg", rel: "35 a 40 N/kg", desc: "Hipertrofia funcional neuromuscular; adaptação técnica de carga e força explosiva." },
                        { cat: "Sub-20 (18-20 anos)", force: "2.800 N – 3.300 N", kg: "285 kg – 336 kg", rel: "38 a 43 N/kg", desc: "Transição profissional de alta exigência; polimento de potência reativa e taxa de desenvolvimento de força (RFD)." },
                        { cat: "Profissional Adulto (21-35 anos)", force: "3.200 N – 4.250 N", kg: "326 kg – 433 kg", rel: "42 a 50+ N/kg", desc: "Consolidação biomecânica; resiliência a lesões, força rápida e picos de aceleração." }
                      ].filter(item => 
                        item.cat.toLowerCase().includes(normativeSearch.toLowerCase()) ||
                        item.desc.toLowerCase().includes(normativeSearch.toLowerCase())
                      ).map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#111625]/20 transition-colors">
                          <td className="p-3 text-white font-black">{row.cat}</td>
                          <td className="p-3 text-slate-350">{row.force}</td>
                          <td className="p-3 text-blue-400 font-mono">{row.kg}</td>
                          <td className="p-3">{row.rel}</td>
                          <td className="p-3 text-slate-450 normal-case font-medium text-[9px]">{row.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. TABLE: SALTO VERTICAL (CMJ) */}
            {(activeNormativeTab === "all" || activeNormativeTab === "cmj") && (
              <div className="bg-[#0e1322]/40 border border-slate-850 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-500 rounded-full" />
                  <h4 className="text-xs font-black uppercase text-white tracking-wider">Tabela de Potência Lateral & Altura de Salto (CMJ) por Posição</h4>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#0e1322] text-[8px] font-black text-amber-400 uppercase tracking-widest border-b border-slate-800">
                      <tr>
                        <th className="p-3">Posição Tática</th>
                        <th className="p-3">Altura CMJ Recomendada</th>
                        <th className="p-3">Índice de Força Reativa (RSI)</th>
                        <th className="p-3">Fator Limitante / Justificativa Biomecânica</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/70 font-extrabold uppercase text-[10px] tracking-wide">
                      {[
                        { pos: "Goleiro (GK)", cmj: "48 cm – 56 cm", rsi: "1.80 – 2.40", factor: "Necessita de potência crasso-explosiva e velocidade tripla extensão para defesas e saídas aéreas." },
                        { pos: "Zagueiro Central (CB)", cmj: "44 cm – 52 cm", rsi: "1.60 – 2.00", factor: "Importante para duelos aéreos defensivos e ofensivos; necessita de alta rigidez (stiffness) de tornozelo." },
                        { pos: "Lateral / Ala (FB)", cmj: "42 cm – 48 cm", rsi: "1.80 – 2.20", factor: "Demanda potência aliada à capacidade de sprints repetidos (RSA) e corrida de alta intensidade no corredor." },
                        { pos: "Meio-Campista (MF)", cmj: "38 cm – 46 cm", rsi: "1.70 – 2.10", factor: "Foco no controle de carga e deslocamento contínuo; perfil misto de resistência à força e potência de ciclo curto." },
                        { pos: "Extremo / Ponta (WG)", cmj: "45 cm – 53 cm", rsi: "1.90 – 2.50", factor: "Perfil highly explosive (Fast-twitch fiber dominating). Sprints rápidos de transição com transições ágeis." },
                        { pos: "Centroavante / Atacante (FW)", cmj: "45 cm – 54 cm", rsi: "1.75 – 2.30", factor: "Aceleração em curtas distâncias, finalizações dinâmicas e impulsão nos duelos dentro da grande área." }
                      ].filter(item => 
                        item.pos.toLowerCase().includes(normativeSearch.toLowerCase()) ||
                        item.factor.toLowerCase().includes(normativeSearch.toLowerCase())
                      ).map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#111625]/20 transition-colors">
                          <td className="p-3 text-white font-black">{row.pos}</td>
                          <td className="p-3 text-slate-350">{row.cmj}</td>
                          <td className="p-3 text-amber-400 font-mono">{row.rsi}</td>
                          <td className="p-3 text-slate-450 normal-case font-medium text-[9px]">{row.factor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. TABLE: VELOCIDADE & SPRINTS */}
            {(activeNormativeTab === "all" || activeNormativeTab === "speed") && (
              <div className="bg-[#0e1322]/40 border border-slate-850 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-rose-500 rounded-full" />
                  <h4 className="text-xs font-black uppercase text-white tracking-wider">Tabela de Limiares de Velocidade (Sprints de 10m e 30m)</h4>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#0e1322] text-[8px] font-black text-rose-400 uppercase tracking-widest border-b border-slate-800">
                      <tr>
                        <th className="p-3">Grupo / Categoria</th>
                        <th className="p-3">Aceleração Curta (10m)</th>
                        <th className="p-3">Velocidade Máxima (30m)</th>
                        <th className="p-3">Aplicação / Análise no Campo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/70 font-extrabold uppercase text-[10px] tracking-wide">
                      {[
                        { group: "Sub-15 Masculino", m10: "< 1.78s segundos", m30: "< 4.25s segundos", notes: "Treino focado em coordenação da passada, frequência de passos e força rápida básica." },
                        { group: "Sub-17 Masculino", m10: "< 1.70s segundos", m30: "< 4.10s segundos", notes: "Transição neuromuscular; focar na transição de postura da fase de aceleração para velocidade máxima." },
                        { group: "Sub-20 Masculino", m10: "< 1.65s segundos", m30: "< 3.98s segundos", notes: "Altíssima especificação; focar em potência horizontal de empurrão mecânico nos primeiros apoios." },
                        { group: "Profissional (Volantes / Zagueiros)", m10: "< 1.66s segundos", m30: "< 4.02s segundos", notes: "Perfis mais pesados ou de contenção tática dinâmica; foco em deslocamentos multidirecionais associados." },
                        { group: "Profissional (Laterais / Extremos / Atacantes)", m10: "< 1.58s segundos", m30: "< 3.82s segundos", notes: "Velocistas natos. Exigência extrema de força concêntrica horizontal rápida e taxa de produção de força." }
                      ].filter(item => 
                        item.group.toLowerCase().includes(normativeSearch.toLowerCase()) ||
                        item.notes.toLowerCase().includes(normativeSearch.toLowerCase())
                      ).map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#111625]/20 transition-colors">
                          <td className="p-3 text-white font-black">{row.group}</td>
                          <td className="p-3 text-slate-350">{row.m10}</td>
                          <td className="p-3 text-rose-450 font-mono">{row.m30}</td>
                          <td className="p-3 text-slate-450 normal-case font-medium text-[9px]">{row.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. TABLE: VO2 MÁXIMO */}
            {(activeNormativeTab === "all" || activeNormativeTab === "vo2") && (
              <div className="bg-[#0e1322]/40 border border-slate-850 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                  <h4 className="text-xs font-black uppercase text-white tracking-wider">Tabela de Limiares de Consumo de Oxigênio (VO2 Máximo)</h4>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#0e1322] text-[8px] font-black text-emerald-400 uppercase tracking-widest border-b border-slate-800">
                      <tr>
                        <th className="p-3">Posição de Jogo</th>
                        <th className="p-3">VO2 Máximo (ml/kg/min)</th>
                        <th className="p-3">Nível Estimado Yo-Yo IR1 / IR2</th>
                        <th className="p-3">Perfil de Desgaste Mecânico / Metábolico</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/70 font-extrabold uppercase text-[10px] tracking-wide">
                      {[
                        { pos: "Goleiro (GK)", vo2: "50 – 55 ml/kg/min", yoyo: "1.200m – 1.500m", notes: "Perfil majoritariamente alático e anaeróbio; capacidade aeróbia visa recuperação rápida inter-sprints." },
                        { pos: "Zagueiro Central (CB)", vo2: "55 – 60 ml/kg/min", yoyo: "1.600m – 2.000m", notes: "Exigência de corridas de alta intensidade intercaladas com marcações físicas intensas de estática." },
                        { pos: "Lateral / Ala (FB)", vo2: "62 – 68 ml/kg/min", yoyo: "2.100m – 2.500m+", notes: "Altíssimo volume de deslocamento longitudinal em alta intensidade (corredores externos contínuos)." },
                        { pos: "Meio-Campista (MF)", vo2: "64 – 72 ml/kg/min", yoyo: "2.200m – 2.800m+", notes: "Motores do time. Maior distância total percorrida (média 10-13km por partida); alta economia de corrida." },
                        { pos: "Extremo / Ponta (WG)", vo2: "60 – 66 ml/kg/min", yoyo: "2.000m – 2.400m", notes: "Alta resistência a sprints sucessivos intercalados com decréscimos rápidos de aceleração." },
                        { pos: "Centroavante (FW)", vo2: "56 – 62 ml/kg/min", yoyo: "1.600m – 2.100m", notes: "Excelente capacidade de se descolar em potência máxima explosiva; necessidade aeróbia secundária ao alático." }
                      ].filter(item => 
                        item.pos.toLowerCase().includes(normativeSearch.toLowerCase()) ||
                        item.notes.toLowerCase().includes(normativeSearch.toLowerCase())
                      ).map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#111625]/20 transition-colors">
                          <td className="p-3 text-white font-black">{row.pos}</td>
                          <td className="p-3 text-slate-350">{row.vo2}</td>
                          <td className="p-3 text-emerald-400 font-mono">{row.yoyo}</td>
                          <td className="p-3 text-slate-450 normal-case font-medium text-[9px]">{row.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="p-5 bg-[#0e1322] rounded-2xl border border-slate-900 text-[10px] text-slate-400 leading-relaxed font-bold">
            <span className="text-white uppercase block mb-1">💡 Como aplicar:</span>
            Utilize o campo de busca acima e as abas rápidas para fazer pesquisas comparativas instantâneas durante as triagens e planejamentos de cargas de treinamento de seus atletas.
          </div>
        </div>
      )}

      {subTab === "library" && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header */}
          <div className="border-b border-slate-900 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black uppercase text-white tracking-wider">Biblioteca de Exercícios Enriquecida</h3>
              <p className="text-[10px] font-bold text-brand-primary uppercase mt-0.5 tracking-wider">
                Exos & Hawkin Dynamics Standards • {filteredExercises.length} Exercícios Encontrados
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {role === "coach" && (
                <button
                  onClick={() => {
                    setExerciseToEdit(null);
                    setIsEditorOpen(true);
                  }}
                  className="bg-[#39FF14] hover:bg-[#32e00f] text-slate-950 font-black text-[10px] px-4 py-2.5 rounded-xl transition-all uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-[#39FF14]/10 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Novo Exercício</span>
                </button>
              )}

              {/* Quick search */}
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  value={libSearch}
                  onChange={(e) => setLibSearch(e.target.value)}
                  placeholder="Buscar por nome, músculo, padrão..."
                  className="w-full bg-[#0e1322] border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary"
                />
                <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
              </div>
            </div>
          </div>

          {/* Quick Category & Difficulty Filters */}
          <div className="bg-[#0e1322]/30 border border-slate-900/60 p-5 rounded-3xl space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-brand-primary" />
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Filtrar por Categoria Biomecânica</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "ALL", label: "Todos os Exercícios" },
                  { id: "MMII", label: "MMII (Membros Inferiores)" },
                  { id: "MMSS", label: "MMSS (Membros Superiores)" },
                  { id: "Potência", label: "Potência & Saltos" },
                  { id: "Core", label: "Core & Estabilidade" },
                  { id: "Preventivo", label: "Preventivos / Reabilitação" },
                  { id: "Velocidade", label: "Velocidade & Agilidade" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setLibCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                      libCategory === cat.id
                        ? "bg-brand-primary/10 text-brand-primary border-brand-primary/30 font-extrabold"
                        : "bg-[#0c101b] text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-900" />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Nível de Dificuldade</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "ALL", label: "Todos os Níveis" },
                  { id: "Iniciante", label: "Iniciante" },
                  { id: "Intermediário", label: "Intermediário" },
                  { id: "Avançado", label: "Avançado" },
                  { id: "Elite", label: "Elite" },
                ].map((diff) => (
                  <button
                    key={diff.id}
                    onClick={() => setLibDifficulty(diff.id)}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                      libDifficulty === diff.id
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/30 font-extrabold"
                        : "bg-[#0c101b] text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    {diff.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Exercises Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredExercises.map((item) => {
              const isExpanded = expandedExerciseId === item.id;
              return (
                <div 
                  key={item.id}
                  className={`bg-slate-900/40 border rounded-3xl transition-all overflow-hidden ${
                    isExpanded ? "border-brand-primary/40 shadow-[0_0_15px_rgba(57,255,20,0.04)]" : "border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  {/* Summary row */}
                  <div 
                    onClick={() => setExpandedExerciseId(isExpanded ? null : item.id)}
                    className="p-5 flex items-start justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                          item.category === "MMII" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          item.category === "MMSS" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                          item.category === "Potência" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          item.category === "Core" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                          item.category === "Preventivo" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                          "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          {item.category}
                        </span>
                        {item.difficulty && (
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">• {item.difficulty}</span>
                        )}
                        {item.videoUrl ? (
                          <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                            <Play className="w-2.5 h-2.5 fill-red-400" />
                            <span>Vídeo HD</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-500 border border-slate-700/50 text-[8px] font-bold uppercase tracking-widest flex items-center gap-1">
                            <Video className="w-2.5 h-2.5 text-slate-500" />
                            <span>Sem Vídeo</span>
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-white italic uppercase tracking-tight">{item.name}</h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Músculo Alvo: <span className="text-white font-bold">{item.muscleGroup || "Geral"}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {item.isFavorite && (
                        <Heart className="w-3.5 h-3.5 text-brand-primary fill-brand-primary shrink-0" />
                      )}
                      <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded block */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="border-t border-slate-800/80 overflow-hidden"
                      >
                        <div className="p-5 space-y-5 text-xs text-slate-300 bg-[#070c14]/40">
                          {/* DEMONSTRAÇÃO EM VÍDEO DO EXERCÍCIO */}
                          {(() => {
                            const videoInfo = getEmbedVideoInfo(item.videoUrl);
                            if (videoInfo) {
                              return (
                                <div className="space-y-2 bg-[#090e1a] p-4 rounded-2xl border border-red-500/25 shadow-2xl">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30 shrink-0">
                                        <Video className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <span className="text-[11px] font-black uppercase text-white tracking-wider block">
                                          Vídeo de Execução Técnica
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400">
                                          {videoInfo.type === 'youtube' ? 'YouTube HD' : videoInfo.type === 'vimeo' ? 'Vimeo HD' : 'Player de Vídeo'}
                                        </span>
                                      </div>
                                    </div>
                                    <a
                                      href={item.videoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105"
                                    >
                                      <span>Abrir Player Externo</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>

                                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl mt-2">
                                    {videoInfo.type === "direct" ? (
                                      <video src={videoInfo.embedUrl!} controls className="w-full h-full object-contain" />
                                    ) : videoInfo.embedUrl ? (
                                      <iframe
                                        src={videoInfo.embedUrl}
                                        title={`Vídeo: ${item.name}`}
                                        className="w-full h-full border-0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                      />
                                    ) : (
                                      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                                        <Video className="w-8 h-8 text-slate-600 mb-2" />
                                        <p className="text-xs text-slate-400 mb-3">Não foi possível incorporar este vídeo diretamente.</p>
                                        <a
                                          href={item.videoUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl transition-all"
                                        >
                                          Assistir Vídeo Externo ↗
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div className="bg-[#0e1322]/80 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-slate-800/80 text-slate-400 flex items-center justify-center shrink-0 border border-slate-700/60">
                                      <Video className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <div>
                                      <span className="text-[11px] font-black uppercase text-white tracking-wider block">
                                        Sem Vídeo de Execução Cadastrado
                                      </span>
                                      <p className="text-[9px] text-slate-400 font-medium">
                                        Consulte o vídeo no YouTube ou adicione o link no cadastro do exercício.
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                                    <a
                                      href={`https://www.youtube.com/results?search_query=como+fazer+${encodeURIComponent(item.name)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="px-3 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                      title="Buscar automaticamente no YouTube como realizar este exercício"
                                    >
                                      <Search className="w-3.5 h-3.5" />
                                      <span>Buscar no YouTube</span>
                                    </a>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExerciseToEdit(item);
                                        setIsEditorOpen(true);
                                      }}
                                      className="px-3 py-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/30 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                      title="Adicionar o link de vídeo para este exercício"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Add Link</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                          })()}

                          {/* Biomechanical Metadata Grid */}
                          <div className="grid grid-cols-2 gap-3 bg-[#0d1220]/60 p-4 rounded-2xl border border-slate-800">
                            {item.movementPattern && (
                              <div>
                                <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">Padrão de Movimento</span>
                                <span className="text-[10px] font-bold text-white uppercase">{item.movementPattern}</span>
                              </div>
                            )}
                            {item.physicalQuality && (
                              <div>
                                <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">Qualidade Física</span>
                                <span className="text-[10px] font-bold text-white uppercase">{item.physicalQuality}</span>
                              </div>
                            )}
                            {item.kineticChain && (
                              <div>
                                <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">Cadeia Cinética</span>
                                <span className="text-[10px] font-bold text-white uppercase">{item.kineticChain}</span>
                              </div>
                            )}
                            {item.equipment && (
                              <div>
                                <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">Equipamento</span>
                                <span className="text-[10px] font-bold text-white uppercase">{item.equipment}</span>
                              </div>
                            )}
                          </div>

                          {/* Default prescriptions */}
                          <div className="flex flex-wrap gap-4 text-[10px] bg-slate-900/60 p-3 rounded-xl border border-slate-850/60">
                            {(item.defaultSets || item.defaultReps) && (
                              <div>
                                <span className="text-slate-500 font-bold uppercase tracking-widest mr-1.5">Séries / Execução:</span>
                                <span className="text-white font-extrabold">
                                  {item.defaultSets ? `${item.defaultSets} Séries x ` : ""}
                                  {item.defaultReps}
                                  {item.defaultRepsType === "time" || item.defaultExecutionTime ? " ⏱️ (Tempo)" : " 🏋️"}
                                </span>
                              </div>
                            )}
                            {item.defaultWeight && (
                              <div>
                                <span className="text-slate-500 font-bold uppercase tracking-widest mr-1.5">Carga Base:</span>
                                <span className="text-[#39FF14] font-extrabold">{item.defaultWeight}</span>
                              </div>
                            )}
                            {item.recommendedRpe && (
                              <div>
                                <span className="text-slate-500 font-bold uppercase tracking-widest mr-1.5">PSE sugerida:</span>
                                <span className="text-amber-400 font-extrabold">{item.recommendedRpe}</span>
                              </div>
                            )}
                            {item.recommendedRest && (
                              <div>
                                <span className="text-slate-500 font-bold uppercase tracking-widest mr-1.5">Intervalo:</span>
                                <span className="text-blue-400 font-extrabold">{item.recommendedRest}</span>
                              </div>
                            )}
                          </div>

                          {/* Musculos envolvidos */}
                          {item.musclesInvolved && item.musclesInvolved.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Músculos Envolvidos</span>
                              <div className="flex flex-wrap gap-1">
                                {item.musclesInvolved.map((m, i) => (
                                  <span key={i} className="bg-slate-800 text-slate-300 text-[8px] font-bold px-2 py-0.5 rounded">
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Execucao */}
                          {item.executionSteps && item.executionSteps.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Passo a Passo de Execução</span>
                              <ol className="list-decimal list-inside space-y-1 text-[10px] font-medium leading-relaxed text-slate-400 font-sans">
                                {item.executionSteps.map((step, i) => (
                                  <li key={i} className="marker:text-brand-primary">{step}</li>
                                ))}
                              </ol>
                            </div>
                          )}

                          {/* Beneficios e erros */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {item.benefits && item.benefits.length > 0 && (
                              <div className="space-y-1.5 bg-[#0b1c11]/10 border border-emerald-950/40 p-3.5 rounded-xl">
                                <div className="flex items-center gap-1.5 text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span className="text-[9px] font-black uppercase tracking-wider">Benefícios e Adaptações</span>
                                </div>
                                <ul className="space-y-1 text-[9px] font-semibold text-slate-400 leading-relaxed list-disc list-inside">
                                  {item.benefits.map((b, i) => (
                                    <li key={i} className="marker:text-emerald-500">{b}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {item.commonErrors && item.commonErrors.length > 0 && (
                              <div className="space-y-1.5 bg-[#1a0e0e]/10 border border-rose-950/40 p-3.5 rounded-xl">
                                <div className="flex items-center gap-1.5 text-rose-400">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span className="text-[9px] font-black uppercase tracking-wider">Erros Comuns (Evitar)</span>
                                </div>
                                <ul className="space-y-1 text-[9px] font-semibold text-slate-400 leading-relaxed list-disc list-inside">
                                  {item.commonErrors.map((e, i) => (
                                    <li key={i} className="marker:text-rose-500">{e}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Progressões e Regressões */}
                          {(item.progressions || item.regressions) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] border-t border-slate-800/80 pt-3">
                              {item.regressions && item.regressions.length > 0 && (
                                <div>
                                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block mb-1">Regressão Clínica</span>
                                  <span className="text-slate-400 font-bold">{item.regressions.join(", ")}</span>
                                </div>
                              )}
                              {item.progressions && item.progressions.length > 0 && (
                                <div>
                                  <span className="text-[8px] font-black uppercase text-brand-primary tracking-wider block mb-1">Progressão de Sobrecarga</span>
                                  <span className="text-slate-400 font-bold">{item.progressions.join(", ")}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Botões de Ação para Biblioteca */}
                          {role === "coach" && (
                            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-850/65">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExerciseToEdit(item);
                                  setIsEditorOpen(true);
                                }}
                                className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Editar Exercício</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExerciseToClone(item);
                                }}
                                className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Clonar</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExerciseToDelete(item);
                                }}
                                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {filteredExercises.length === 0 && (
              <div className="col-span-2 text-center py-12 bg-slate-900/10 rounded-3xl border border-dashed border-slate-850">
                <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">Nenhum exercício encontrado na biblioteca com esses filtros.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <AnimatePresence>
        {exerciseToDelete && (
          <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0c111d] border border-slate-850 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-500">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h4 className="text-base font-black uppercase tracking-tight">Confirmar Exclusão</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                Tem certeza de que deseja excluir o exercício <strong className="text-white italic">"{exerciseToDelete.name.toUpperCase()}"</strong> da sua biblioteca?
              </p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                ⚠️ Essa ação é irreversível e removerá o exercício de todas as buscas futuras.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setExerciseToDelete(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-300 font-black text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteExercise(exerciseToDelete.id)}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-rose-600/10 cursor-pointer"
                >
                  Confirmar e Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM CLONE MODAL */}
      <AnimatePresence>
        {exerciseToClone && (
          <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0c111d] border border-slate-850 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-500">
                <Copy className="w-6 h-6 shrink-0" />
                <h4 className="text-base font-black uppercase tracking-tight">Clonar Exercício</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                Deseja criar uma cópia do exercício <strong className="text-white italic">"{exerciseToClone.name.toUpperCase()}"</strong> na sua biblioteca?
              </p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                💡 A cópia será gerada com o sufixo "(CÓPIA)" para que você possa editá-la livremente sem alterar o original.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setExerciseToClone(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-300 font-black text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleCloneExercise(exerciseToClone)}
                  className="px-5 py-2 bg-amber-500 text-slate-950 hover:bg-amber-400 font-black text-[9px] uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
                >
                  Clonar Exercício
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE EDIÇÃO / CRIAÇÃO */}
      <ExerciseEditorModal
        isOpen={isEditorOpen}
        exercise={exerciseToEdit}
        onClose={() => {
          setIsEditorOpen(false);
          setExerciseToEdit(null);
        }}
        onSave={handleSaveExercise}
      />
    </div>
  );
};
