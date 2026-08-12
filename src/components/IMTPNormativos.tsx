import React, { FC, useState } from "react";
import { 
  SPORTS_DATA, 
  RFD_CLASSIFICATIONS, 
  AGE_FACTORS, 
  LEVEL_COLORS,
  SOCCER_CMJ_NORMATIVE
} from "../data/imtpNormatives";
import { 
  Search, 
  Award, 
  Activity, 
  TrendingUp, 
  Sparkles, 
  Zap, 
  Info,
  ChevronRight,
  Scale
} from 'lucide-react';
import { motion } from 'motion/react';

export const IMTPNormativos: FC = () => {
  const [activeTab, setActiveTabTab] = useState<string>("coletivos");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGender, setFilterGender] = useState("todos");

  // Age Calculator State
  const [calcAge, setCalcAge] = useState<number>(25);
  const [calcGender, setCalcGender] = useState<"M" | "F">("M");
  const [calcSportId, setCalcSportId] = useState<string>("Futebol");
  const [calcPeakForce, setCalcPeakForce] = useState<number>(310);
  const [calcWeight, setCalcWeight] = useState<number>(75);

  const currentCategory = SPORTS_DATA[activeTab];

  const getFilteredSports = () => {
    if (!currentCategory) return [];
    return currentCategory.sports.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const isFemale = s.gender.includes("F");
      const isMale = s.gender.includes("M");
      const matchGender =
        filterGender === "todos" ||
        (filterGender === "M" && isMale) ||
        (filterGender === "F" && isFemale);
      return matchSearch && matchGender;
    });
  };

  // Age factor getter
  const getAgeFactorInfo = (age: number) => {
    if (age < 14) return { factor: 0.65, label: "Sub-14 (60-70%)", desc: "Use 60–70% das metas adultas da modalidade" };
    if (age < 16) return { factor: 0.75, label: "Sub-16 (70-80%)", desc: "Maturação biológica impacta mais que idade cronológica" };
    if (age < 18) return { factor: 0.85, label: "Sub-18 (80-90%)", desc: "Aproximação das metas adultas na fase final de maturação" };
    if (age <= 35) return { factor: 1.0, label: "Adulto (100%)", desc: "Janela de pico de força ideal" };
    if (age <= 45) return { factor: 0.925, label: "Master 35-45 (90-95%)", desc: "5–10% abaixo da meta padrão como Elite Master" };
    return { factor: 0.825, label: "Master 45+ (80-85%)", desc: "15–20% abaixo da meta padrão como Elite Master" };
  };

  // Active Sport rows flattened for calculator
  const allSportsFlattened = Object.values(SPORTS_DATA).flatMap(cat => cat.sports);

  // Dynamic Calculator result
  const calculatedResult = () => {
    const ageFactorObj = getAgeFactorInfo(calcAge);
    
    // Find closest sport
    const matchedSport = allSportsFlattened.find(s => {
      const isFemaleRow = s.gender.includes("F");
      const genderMatch = calcGender === "F" ? isFemaleRow : !isFemaleRow;
      const isJuvenilRow = s.name.toLowerCase().includes("juvenil") || s.gender.includes("≤18");
      const isJuvenil = calcAge <= 18;
      const ageMatch = isJuvenil === isJuvenilRow || (!isJuvenilRow && !isJuvenil);
      const nameMatch = s.name.toLowerCase().includes(calcSportId.toLowerCase()) || calcSportId.toLowerCase().includes(s.name.replace(" Juvenil", "").toLowerCase());
      return nameMatch && genderMatch && ageMatch;
    }) || allSportsFlattened.find(s => {
      const isFemaleRow = s.gender.includes("F");
      return (calcGender === "F") === isFemaleRow;
    });

    if (!matchedSport) return null;

    // Parse values (convert from N/kg to kgf/kg by dividing by 10)
    const parseNumber = (str: string) => {
      const match = str.match(/\d+/g);
      return match ? parseFloat(match[match.length - 1]) / 10 : 3.0;
    };

    const baseElite = parseNumber(matchedSport.elite);
    const baseAdv = parseNumber(matchedSport.adv);
    const baseComp = parseNumber(matchedSport.comp);
    const baseDev = parseNumber(matchedSport.dev);

    // Apply age factor
    const adjElite = baseElite * ageFactorObj.factor;
    const adjAdv = baseAdv * ageFactorObj.factor;
    const adjComp = baseComp * ageFactorObj.factor;

    // Athlete stats
    const currentRelative = parseFloat((calcPeakForce / calcWeight).toFixed(2));
    
    let classification = "Em Desenvolvimento";
    let colorClass = "text-red-500 border-red-500/20 bg-red-500/10";
    
    if (currentRelative >= adjElite) {
      classification = "Elite Mundial / Pro";
      colorClass = "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
    } else if (currentRelative >= adjAdv) {
      classification = "Avançado / Alto Rendimento";
      colorClass = "text-blue-400 border-blue-500/20 bg-blue-500/10";
    } else if (currentRelative >= adjComp) {
      classification = "Competitivo / Treinado";
      colorClass = "text-yellow-400 border-yellow-500/20 bg-yellow-500/10";
    } else {
      classification = "Em Desenvolvimento";
      colorClass = "text-red-400 border-red-500/20 bg-red-500/10";
    }

    return {
      matchedSport,
      ageFactorObj,
      currentRelative,
      targets: {
        elite: adjElite.toFixed(2),
        adv: adjAdv.toFixed(2),
        comp: adjComp.toFixed(2),
        dev: baseDev.toFixed(2)
      },
      classification,
      colorClass
    };
  };

  const calcRes = calculatedResult();

  return (
    <div className="space-y-8 pb-20 font-sans text-slate-200">
      
      {/* Header Banner */}
      <div className="relative p-8 md:p-12 rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-[#112d1b] to-slate-900 border border-emerald-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-4">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">LB Performance Database v3.0</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white italic uppercase tracking-tighter leading-none">
              BANCO DE DADOS <span className="text-[#39FF14]">NORMADOS IMTP</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-3 max-w-2xl font-medium leading-relaxed">
              Base de dados científica exclusiva da LB Academy com parâmetros de força relativa (N/kg e kgf/kg) no Meio Agachamento Isométrico por modalidade, gênero e grupo etário.
            </p>
          </div>
          <div className="px-6 py-4 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shrink-0 text-center md:text-left">
            <span className="text-[9px] font-black text-slate-500 uppercase block tracking-widest">CATEGORIA DO SISTEMA</span>
            <span className="text-xl font-extrabold text-[#39FF14] italic">ELITE PERFORMANCE</span>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(SPORTS_DATA).map(([key, val]) => (
          <button
            key={key}
            onClick={() => { setActiveTabTab(key); setSearchQuery(""); setFilterGender("todos"); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 border transition-all cursor-pointer ${
              activeTab === key
                ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/15 font-black"
                : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            <span>{val.icon}</span>
            <span>{val.label}</span>
          </button>
        ))}
        <button
          onClick={() => setActiveTabTab("rfd")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 border transition-all cursor-pointer ${
            activeTab === "rfd"
              ? "bg-[#39FF14] text-slate-950 border-[#39FF14] shadow-lg shadow-emerald-500/15 font-black"
              : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white"
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-orange-400" />
          <span>⚡ RFD & Fatores Etários</span>
        </button>
        <button
          onClick={() => { setActiveTabTab("cmj_futebol"); setSearchQuery(""); setFilterGender("todos"); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 border transition-all cursor-pointer ${
            activeTab === "cmj_futebol"
              ? "bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/15 font-black"
              : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white"
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <span>⚽ CMJ Futebol</span>
        </button>
      </div>

      {activeTab === "rfd" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* RFD Column */}
          <div className="bg-slate-900/45 border border-slate-800/80 p-6 md:p-8 rounded-[2rem] space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <Zap className="w-5 h-5 text-[#39FF14]" />
              <h2 className="text-lg font-black uppercase text-white italic tracking-tight">Classificação Taxa de RFD (Tempo ao Pico)</h2>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              O tempo ideal de subida do vetor da curva de força para modalidades dinâmicas fica abaixo de 300ms. Valores altos indicam dominância de fibras tônicas lentas.
            </p>
            <div className="space-y-3">
              {RFD_CLASSIFICATIONS.map((r, i) => (
                <div key={i} className="flex p-4 bg-slate-950/50 rounded-2xl border border-slate-900 hover:border-slate-800 transition-all gap-4">
                  <div className="flex flex-col justify-center min-w-[110px]">
                    <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: r.color }}>{r.profile}</span>
                    <strong className="text-sm font-black italic block mt-0.5" style={{ color: r.color }}>{r.range}</strong>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-800 self-center" />
                  <div className="flex-grow flex items-center">
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl border border-[#ef4444]/25 bg-red-950/20 text-xs text-slate-300 leading-normal flex items-start gap-3">
              <Info className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-red-400 block font-black uppercase mb-1">Nota de Caso Prático:</strong>
                Tempo excessivo de contração isométrica (&gt;1500ms) sinaliza dependência de força lenta severa. Treinamentos devem priorizar pliometria intensa e contrastes rápidos.
              </div>
            </div>
          </div>

          {/* Age Factors Column */}
          <div className="bg-slate-900/45 border border-slate-800/80 p-6 md:p-8 rounded-[2rem] space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-black uppercase text-white italic tracking-tight">Multiplicadores por Faixa Etária</h2>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Multiplique a meta de força relativa adulta da modalidade pelo correspondente percentual para ajustar conforme o perfil hormonal, fisiológico ou maturacional do indivíduo.
            </p>
            <div className="space-y-3">
              {AGE_FACTORS.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-900 hover:border-slate-800 transition-all">
                  <div className="space-y-1">
                    <strong className="text-sm font-black text-white italic">{a.range}</strong>
                    <span className="text-[10px] text-slate-500 font-medium block">{a.note}</span>
                  </div>
                  <div className="px-3 py-1.5 bg-emerald-500/10 text-[#39FF14] font-black border border-emerald-500/20 rounded-xl text-sm italic">
                    {a.factor}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === "cmj_futebol" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Table Column (Left/Center) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/45 border border-slate-800/80 p-6 md:p-8 rounded-[2rem] space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <Activity className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-black uppercase text-white italic tracking-tight">Valores Médios de Referência de CMJ no Futebol Profissional</h2>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Compilando dados de estudos científicos recentes com futebolistas de elite (como os publicados no <em className="text-white">Journal of Sports Sciences</em> e investigações da <em className="text-white">English Football League</em>), a tabela abaixo apresenta os valores de referência para a Altura de Salto (CMJ), Potência Relativa (W/kg) e Potência Absoluta (Watts).
              </p>
              
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-4 font-bold">Categoria / Idade</th>
                      <th className="py-3.5 px-4 font-bold text-center">Altura Atleta</th>
                      <th className="py-3.5 px-4 font-bold text-center">Salto (CMJ)</th>
                      <th className="py-3.5 px-4 font-bold text-center">Pot. Relativa</th>
                      <th className="py-3.5 px-4 font-bold text-center">Pot. Absoluta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-xs text-slate-300 font-bold">
                    {SOCCER_CMJ_NORMATIVE.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/30 transition-all">
                        <td className="py-3.5 px-4 font-black text-white italic">{row.category}</td>
                        <td className="py-3.5 px-4 text-center text-slate-400">{row.athleteHeight}</td>
                        <td className="py-3.5 px-4 text-center text-[#39FF14] italic font-black">{row.jumpHeight}</td>
                        <td className="py-3.5 px-4 text-center text-indigo-400 italic font-black">{row.relPower}</td>
                        <td className="py-3.5 px-4 text-center text-amber-500 italic font-black">{row.absPower}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-950/10 text-xs text-slate-300 leading-normal flex items-start gap-3">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-indigo-400 block font-black uppercase mb-1">Aplicação no Planejamento:</strong>
                  Estes parâmetros do salto vertical permitem quantificar o nível neuromuscular específico e estruturar cargas com precisão bioclimática, separando reatividade tendínea de força propulsiva concêntrica pura.
                </div>
              </div>
            </div>
          </div>

          {/* Calculator Column (Right) */}
          <div className="space-y-6">
            <div className="bg-slate-900/40 border border-slate-800/85 p-6 rounded-[2rem] shadow-xl">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-5">
                <Scale className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-black uppercase text-white italic tracking-tight">Simulador CMJ Futebol</h3>
              </div>
              
              {/* Calculator Form */}
              <div className="space-y-4">
                
                {/* Category selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Categoria Alvo</label>
                  <select
                    value={calcSportId === "Futebol" ? "Profissional" : calcSportId}
                    onChange={e => setCalcSportId(e.target.value)}
                    className="w-full bg-slate-950 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                  >
                    <option value="Sub-15">Sub-15 (14-15 anos)</option>
                    <option value="Sub-17">Sub-17 (16-17 anos)</option>
                    <option value="Sub-20">Sub-20 (18-20 anos)</option>
                    <option value="Profissional">Profissional Adulto</option>
                  </select>
                </div>

                {/* Jump height input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Altura do Salto (cm)</label>
                  <input
                    type="number"
                    min={15}
                    max={100}
                    value={calcAge > 100 || calcAge < 10 ? 40 : calcAge}
                    onChange={e => setCalcAge(Math.min(100, Math.max(15, parseInt(e.target.value) || 0)))}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-slate-950 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                {/* Body Weight */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Peso Corporal (kg)</label>
                  <input
                    type="number"
                    min={30}
                    max={200}
                    value={calcWeight}
                    onChange={e => setCalcWeight(Math.min(200, Math.max(30, parseFloat(e.target.value) || 0)))}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-slate-950 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                {/* Absolute Power */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Potência Absoluta (Watts)</label>
                  <input
                    type="number"
                    min={500}
                    max={8500}
                    value={calcPeakForce < 500 || calcPeakForce > 8500 ? 4100 : calcPeakForce}
                    onChange={e => setCalcPeakForce(Math.min(8500, Math.max(500, parseInt(e.target.value) || 0)))}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-slate-950 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>

              {/* Soccer CMJ Simulator Output */}
              {(() => {
                const heightVal = calcAge > 100 || calcAge < 10 ? 40 : calcAge;
                const weightVal = calcWeight || 75;
                const powerVal = calcPeakForce < 500 || calcPeakForce > 8500 ? 4100 : calcPeakForce;
                const relPowerVal = parseFloat((powerVal / weightVal).toFixed(1));
                
                const targetSport = calcSportId === "Futebol" ? "Profissional" : calcSportId;

                // Get normative requirements
                let reqHeightMin = 43;
                let reqHeightMax = 50;
                let reqRelPowerMin = 55;
                let reqRelPowerMax = 65;
                let reqAbsPowerMin = 4200;
                let reqAbsPowerMax = 5200;

                if (targetSport === "Sub-15") {
                  reqHeightMin = 31; reqHeightMax = 35;
                  reqRelPowerMin = 42; reqRelPowerMax = 48;
                  reqAbsPowerMin = 2800; reqAbsPowerMax = 3300;
                } else if (targetSport === "Sub-17") {
                  reqHeightMin = 36; reqHeightMax = 41;
                  reqRelPowerMin = 48; reqRelPowerMax = 54;
                  reqAbsPowerMin = 3400; reqAbsPowerMax = 4000;
                } else if (targetSport === "Sub-20") {
                  reqHeightMin = 40; reqHeightMax = 44;
                  reqRelPowerMin = 52; reqRelPowerMax = 58;
                  reqAbsPowerMin = 3800; reqAbsPowerMax = 4400;
                }

                // Classification logic:
                let heightStatus = "Na Média";
                let heightColor = "text-yellow-450";
                if (heightVal < reqHeightMin) {
                  heightStatus = "Em Desenv.";
                  heightColor = "text-rose-400";
                } else if (heightVal > reqHeightMax) {
                  heightStatus = "Excelente / Elite";
                  heightColor = "text-[#39FF14]";
                }

                let relPowerStatus = "Na Média";
                let relPowerColor = "text-yellow-450";
                if (relPowerVal < reqRelPowerMin) {
                  relPowerStatus = "Em Desenv.";
                  relPowerColor = "text-rose-400";
                } else if (relPowerVal >= reqRelPowerMax) {
                  relPowerStatus = "Excelente / Elite";
                  relPowerColor = "text-[#39FF14]";
                }

                let absPowerStatus = "Na Média";
                let absPowerColor = "text-yellow-450";
                if (powerVal < reqAbsPowerMin) {
                  absPowerStatus = "Em Desenv.";
                  absPowerColor = "text-rose-400";
                } else if (powerVal >= reqAbsPowerMax) {
                  absPowerStatus = "Excelente / Elite";
                  absPowerColor = "text-[#39FF14]";
                }

                return (
                  <div className="mt-6 border-t border-slate-800 pt-6 space-y-5">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Potência Relativa Calculada</span>
                        <strong className="text-2xl font-black text-indigo-400 italic block mt-0.5">{relPowerVal} <span className="text-xs font-semibold not-italic text-slate-500">W/kg</span></strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-black text-slate-500 uppercase block tracking-wider">Potência Absoluta</span>
                        <strong className="text-base font-black text-amber-500 italic block mt-0.5">{powerVal} <span className="text-[10px] font-normal text-slate-500">W</span></strong>
                      </div>
                    </div>

                    <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-[11px] font-bold text-slate-300">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500 font-bold uppercase text-[9px]">Altura ({heightVal} cm):</span>
                        <span className={`italic ${heightColor}`}>{heightStatus}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-900">
                        <span className="text-slate-500 font-bold uppercase text-[9px]">Pot. Relativa ({relPowerVal} W/kg):</span>
                        <span className={`italic ${relPowerColor}`}>{relPowerStatus}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-900">
                        <span className="text-slate-500 font-bold uppercase text-[9px]">Pot. Absoluta ({powerVal} W):</span>
                        <span className={`italic ${absPowerColor}`}>{absPowerStatus}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-900 text-[10px] text-slate-400">
                        <span>Meta Altura {targetSport}:</span>
                        <span className="text-slate-300 font-black">{reqHeightMin} - {reqHeightMax} cm</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-900 text-[10px] text-slate-400">
                        <span>Meta Pot. Rel:</span>
                        <span className="text-slate-300 font-black">{reqRelPowerMin} - {reqRelPowerMax} W/kg</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Table Column (Left/Center) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Table Control */}
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar modalidade ou nota..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shrink-0 w-full md:w-auto">
                <button
                  onClick={() => setFilterGender("todos")}
                  className={`flex-grow md:flex-grow-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                    filterGender === "todos" ? "bg-slate-800 text-white font-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  TODOS
                </button>
                <button
                  onClick={() => setFilterGender("M")}
                  className={`flex-grow md:flex-grow-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                    filterGender === "M" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  ♂ MASC
                </button>
                <button
                  onClick={() => setFilterGender("F")}
                  className={`flex-grow md:flex-grow-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                    filterGender === "F" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  ♀ FEM
                </button>
              </div>
            </div>

            {/* List View */}
            <div className="space-y-4">
              {getFilteredSports().length === 0 ? (
                <div className="text-center py-12 bg-slate-900/20 rounded-[2.5rem] border border-slate-800">
                  <p className="text-slate-500 text-sm font-medium">Nenhuma modalidade correspondente encontrada.</p>
                </div>
              ) : (
                getFilteredSports().map((s, idx) => {
                  const devVal = parseFloat(s.dev.replace(/[^\d]/g, "")) / 10;
                  const eliteVal = parseFloat(s.elite.replace(/[^\d]/g, "")) / 10;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-900/30 border border-slate-800/80 rounded-[2rem] p-5 hover:border-emerald-500/20 hover:bg-slate-900/50 transition-all space-y-4 relative overflow-hidden group"
                    >
                      {/* Top banner */}
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h3 className="text-base font-black text-white italic uppercase tracking-tight">{s.name}</h3>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                              s.gender.includes("F") ? "bg-pink-500/10 text-pink-400 border-pink-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            }`}>
                              {s.gender}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 italic block mt-1 font-medium">Ref: {s.ref}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-black text-slate-500 uppercase block tracking-wider">PRIORIDADE RFD</span>
                          <span className={`text-xs font-black italic mt-0.5 block ${
                            s.rfdPriority.includes("Crítica") || s.rfdPriority.includes("Muito Alta") ? "text-orange-400" : "text-emerald-400"
                          }`}>
                            {s.rfdPriority}
                          </span>
                        </div>
                      </div>

                      {/* Normative thresholds display */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
                          <span className="text-[8px] font-black text-red-400 uppercase tracking-wider block">Dev (Iniciante)</span>
                          <strong className="text-base font-black italic block mt-0.5 text-red-500">{s.dev} <span className="text-[9px] font-normal not-italic text-slate-500">N/kg</span></strong>
                          <span className="text-[8.5px] font-semibold text-slate-500 block mt-0.5">{`(${devVal.toFixed(1)} kgf/kg)`}</span>
                        </div>

                        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
                          <span className="text-[8px] font-black text-yellow-400 uppercase tracking-wider block">Competitivo</span>
                          <strong className="text-base font-black italic block mt-0.5 text-yellow-500">{s.comp} <span className="text-[9px] font-normal not-italic text-slate-500">N/kg</span></strong>
                          <span className="text-[8.5px] font-semibold text-slate-500 block mt-0.5">
                            {`(${(parseFloat(s.comp.split("–")[0]) / 10).toFixed(1)} - ${(parseFloat(s.comp.split("–")[1]) / 10).toFixed(1)} kgf/kg)`}
                          </span>
                        </div>

                        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center flex flex-col justify-between">
                          <div>
                            <span className="text-[8px] font-black text-blue-400 uppercase tracking-wider block">Avançado</span>
                            <strong className="text-base font-black italic block mt-0.5 text-blue-400">{s.adv} <span className="text-[9px] font-normal not-italic text-slate-500">N/kg</span></strong>
                          </div>
                          <span className="text-[8.5px] font-semibold text-slate-500 block mt-0.5">
                            {`(${(parseFloat(s.adv.split("–")[0]) / 10).toFixed(1)} - ${(parseFloat(s.adv.split("–")[1]) / 10).toFixed(1)} kgf/kg)`}
                          </span>
                        </div>

                        <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-500/20 text-center">
                          <span className="text-[8px] font-black text-emerald-400 uppercase tracking-wider block">Elite</span>
                          <strong className="text-lg font-black italic block mt-0.5 text-[#39FF14]">{s.elite} <span className="text-[9px] font-normal not-italic text-slate-500">N/kg</span></strong>
                          <span className="text-[8.5px] font-semibold text-emerald-400/80 block mt-0.5">{`(≥ ${eliteVal.toFixed(1)} kgf/kg)`}</span>
                        </div>
                      </div>

                      {/* Note / Advice */}
                      <p className="text-xs text-slate-400 leading-normal font-medium bg-slate-950/30 p-3 rounded-xl border border-slate-900/60 group-hover:text-slate-300 transition-colors">
                        <strong className="text-emerald-400/90 tracking-wide font-extrabold uppercase mr-1">[Nota Técnica]</strong> 
                        {s.note}
                      </p>
                    </motion.div>
                  )
                })
              )}
            </div>
          </div>

          {/* Sidebar Calculator Column (Right) */}
          <div className="space-y-6">
            
            <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-[2rem] space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <Scale className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-black uppercase text-white italic tracking-tight">Análise de Nível Individual</h3>
              </div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Insira os dados do atleta para calcular dinamicamente a meta ideal ponderada pelo grupo de idade e gênero da modalidade física.
              </p>

              <div className="space-y-4">
                {/* Age Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Idade (anos)</label>
                  <input
                    type="number"
                    min={6}
                    max={80}
                    value={calcAge}
                    onChange={e => setCalcAge(Math.min(80, Math.max(6, parseInt(e.target.value) || 0)))}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-slate-950 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                {/* Gender Toggle */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Gênero</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCalcGender("M")}
                      className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border cursor-pointer ${
                        calcGender === "M"
                          ? "bg-slate-800 text-white border-slate-700"
                          : "bg-slate-950 text-slate-500 border-slate-800"
                      }`}
                    >
                      Masculino
                    </button>
                    <button
                      onClick={() => setCalcGender("F")}
                      className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border cursor-pointer ${
                        calcGender === "F"
                          ? "bg-slate-800 text-white border-slate-700"
                          : "bg-slate-950 text-slate-500 border-slate-800"
                      }`}
                    >
                      Feminino
                    </button>
                  </div>
                </div>

                {/* Sport Option Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Esporte / Modalidade</label>
                  <select
                    value={calcSportId}
                    onChange={e => setCalcSportId(e.target.value)}
                    className="w-full bg-slate-950 text-white font-bold text-xs uppercase tracking-wide px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                  >
                    <option value="Futebol">Futebol</option>
                    <option value="Basquetebol">Basquetebol</option>
                    <option value="Voleibol">Voleibol</option>
                    <option value="Handebol">Handebol</option>
                    <option value="Tênis">Tênis</option>
                    <option value="Rugby">Rugby / Contatos</option>
                    <option value="Velocista">Atletismo Velocista</option>
                    <option value="Fundista">Atletismo Longa Distância</option>
                    <option value="Maratona">Corrida de Rua (Maratona)</option>
                    <option value="Triathlon">Triatlo</option>
                    <option value="Judô">Judô / Lutar</option>
                    <option value="Levantamento Olímpico">L.P.O. Olímpico</option>
                    <option value="CrossFit">CrossFit / Funcional</option>
                    <option value="Natação">Natação Velocidade</option>
                    <option value="Remo">Remo Olímpico</option>
                  </select>
                </div>

                {/* Body Weight */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Peso Corporal (kg)</label>
                  <input
                    type="number"
                    min={30}
                    max={200}
                    value={calcWeight}
                    onChange={e => setCalcWeight(Math.min(200, Math.max(30, parseFloat(e.target.value) || 0)))}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-slate-950 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                {/* Abs Peak Force PeakForce */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Pico de Força Isométrica (kgf)</label>
                  <input
                    type="number"
                    min={50}
                    max={800}
                    value={calcPeakForce}
                    onChange={e => setCalcPeakForce(Math.min(800, Math.max(50, parseFloat(e.target.value) || 0)))}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-slate-950 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              {/* Calculator Output Display Card */}
              {calcRes && (
                <div className="mt-6 border-t border-slate-800 pt-6 space-y-5">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Desempenho Relativo</span>
                      <strong className="text-2xl font-black text-emerald-400 italic block mt-0.5">{calcRes.currentRelative} <span className="text-xs font-semibold not-italic text-slate-500">kgf/kg</span></strong>
                      <span className="text-[9.5px] font-bold text-slate-400 block mt-1">{`(${(calcRes.currentRelative * 10).toFixed(1)} N/kg)`}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-black text-slate-500 uppercase block tracking-wider">Fator de Idade</span>
                      <strong className="text-sm font-black text-indigo-400 block mt-0.5">{`${calcRes.ageFactorObj.factor * 100}%`}</strong>
                      <span className="text-[9px] text-slate-500 font-medium block mt-1">{calcRes.ageFactorObj.label}</span>
                    </div>
                  </div>

                  {/* Level output indicator */}
                  <div className={`border p-4 rounded-2xl text-center flex flex-col justify-center items-center ${calcRes.colorClass}`}>
                    <span className="text-[9px] font-black uppercase tracking-widest mb-1">CLASSIFICAÇÃO DE ADAPTAÇÃO</span>
                    <strong className="text-sm font-black uppercase italic tracking-tighter">{calcRes.classification}</strong>
                  </div>

                  {/* Compared to dynamic targets */}
                  <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-[11px] font-medium text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Meta Elite Ajustada por Idade:</span>
                      <strong className="text-[#39FF14] font-black">{calcRes.targets.elite} kgf/kg</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Meta Avançada Ajustada:</span>
                      <strong className="text-blue-400 font-extrabold">{calcRes.targets.adv} kgf/kg</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Meta Competitiva Ajustada:</span>
                      <strong className="text-yellow-400 font-extrabold">{calcRes.targets.comp} kgf/kg</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
