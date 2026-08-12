import React, { useState, useEffect, useRef } from "react";
import { Athlete } from "../types";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Paperclip,
  X,
  RefreshCw,
  Copy,
  Check,
  Brain,
  Shield,
  Zap,
  Flame,
  Activity,
  FileText,
  ChevronDown,
  Info,
  Maximize2,
  Minimize2,
  Lightbulb,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import toast from "react-hot-toast";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  images?: string[];
  athleteName?: string;
}

interface AiPerformanceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  athletes: Athlete[];
  selectedAthleteId?: string | null;
  onSelectAthlete?: (id: string) => void;
}

export const AiPerformanceChatModal: React.FC<AiPerformanceChatModalProps> = ({
  isOpen,
  onClose,
  athletes,
  selectedAthleteId,
  onSelectAthlete,
}) => {
  const [currentAthleteId, setCurrentAthleteId] = useState<string>(selectedAthleteId || "all");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("lb_ai_chat_history");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: "msg-welcome",
        role: "assistant",
        content: `Olá! Sou seu **Assistente de Performance & Medicina Esportiva de Elite da LB Sports**. 

Estou treinado para debater e responder questões técnicas com fundamentação científica sobre:
- 🏋️ **Prescrição & Metodologia de Treino** (VBT, Força, Potência, Pliometria)
- 🩹 **Fisioterapia, Lesões & Laudos de Exames** (RM, Ultrassom, Raio-X)
- 📊 **Gestão de Carga de Treino & Prevenção** (ACWR, Prontidão, HRV)
- 🍏 **Nutrição & Composição Corporal** (Bioimpedância, Hidratação)
- 🔬 **Análise de Testes Físicos** (IMTP, CMJ, Drop Jump, VO2max, Isocinético)

Como posso ajudar na tomada de decisão do seu atleta hoje?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
  });

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedAthleteId) {
      setCurrentAthleteId(selectedAthleteId);
    }
  }, [selectedAthleteId]);

  useEffect(() => {
    try {
      localStorage.setItem("lb_ai_chat_history", JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const currentAthlete = athletes.find((a) => a.id === currentAthleteId);

  // Build context summary for current athlete
  const buildAthleteContext = (ath?: Athlete): string => {
    if (!ath) {
      return "Nenhum atleta específico selecionado. O treinador está fazendo perguntas genéricas de metodologia, fisiologia ou ciências do esporte.";
    }

    const age = ath.dob ? new Date().getFullYear() - new Date(ath.dob).getFullYear() : "N/A";
    const recentWellness = ath.wellness && ath.wellness.length > 0 ? ath.wellness[0] : null;
    const recentImtp = ath.assessments?.imtp && ath.assessments.imtp.length > 0 ? ath.assessments.imtp[0] : null;
    const recentCmj = ath.assessments?.cmj && ath.assessments.cmj.length > 0 ? ath.assessments.cmj[0] : null;
    const recentDj = ath.assessments?.dropJump && ath.assessments.dropJump.length > 0 ? ath.assessments.dropJump[0] : null;
    const recentBio = ath.assessments?.bioimpedance && ath.assessments.bioimpedance.length > 0 ? ath.assessments.bioimpedance[0] : null;

    const injuriesSummary = ath.injuries && ath.injuries.length > 0
      ? ath.injuries.map(i => `- ${i.location || 'Localidade não especificada'} (${i.description || 'Lesão'}): Severidade ${i.severity || 'Leve'}, Status: ${i.status}, Início: ${i.startDate || i.date}${i.notes ? `, Observação: ${i.notes}` : ''}`).join('\n')
      : "Nenhuma lesão ativa cadastrada.";

    return `
ATLETA ATUAL SELECIONADO:
- Nome: ${ath.name}
- Modalidade: ${ath.modality || 'Esporte Geral'}
- Posição: ${ath.position || 'N/A'}
- Nível Competitivo: ${ath.competitiveLevel || 'Profissional/Competitivo'}
- Idade: ${age} anos | Gênero: ${ath.gender === 'F' ? 'Feminino' : 'Masculino'}
- Histórico de Lesões (Geral): ${ath.injuryHistory || 'Sem histórico prévio'}

LESÕES E EXAMES CADASTRADOS:
${injuriesSummary}

ÚLTIMO CHECK-IN DE WELLNESS:
${recentWellness ? `- Data: ${recentWellness.date} | Sono: ${recentWellness.sleep}h | Fadiga: ${recentWellness.fatigue}/5 | Estresse: ${recentWellness.stress}/5 | Dor Muscular: ${recentWellness.soreness}/5 | Prontidão: ${recentWellness.readinessScore || 'N/A'}%` : 'Nenhum check-in recente.'}

AVALIAÇÕES FÍSICAS RECENTES:
${recentImtp ? `- IMTP: Pico ${recentImtp.peakForce} kgf, Relativa ${recentImtp.relativePeakForce} kgf/kg, RFD Pico ${recentImtp.rfdPeak || 'N/A'}` : ''}
${recentCmj ? `- CMJ: Altura ${recentCmj.height} cm, Potência ${recentCmj.power} W, RSI ${recentCmj.rsi}` : ''}
${recentDj ? `- Drop Jump: Altura ${recentDj.jumpHeight} cm, Tempo Contato ${recentDj.contactTime} ms, RSI ${recentDj.rsi}` : ''}
${recentBio ? `- Bioimpedância: Peso ${recentBio.weight} kg, % Gordura ${recentBio.fatPercentage}%, Massa Magra ${recentBio.muscleMass} kg` : ''}

ÚLTIMOS TREINOS:
${ath.workouts && ath.workouts.length > 0 ? ath.workouts.slice(0, 3).map(w => `- ${w.date}: ${w.name} (Carga: ${w.totalLoad || 'N/A'}, PSE: ${w.rpe || 'N/A'})`).join('\n') : 'Sem treinos recentes.'}
`;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if ((!text || !text.trim()) && attachedImages.length === 0) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      images: attachedImages.length > 0 ? [...attachedImages] : undefined,
      athleteName: currentAthlete ? currentAthlete.name : undefined,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputMessage("");
    setAttachedImages([]);
    setIsLoading(true);

    try {
      const tokenStr = localStorage.getItem("lb_user");
      let token: string | null = null;
      if (tokenStr) {
        try { token = JSON.parse(tokenStr)?.token; } catch (e) {}
      }

      const athleteContext = buildAthleteContext(currentAthlete);

      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
            images: m.images,
          })),
          athleteContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status} ao consultar IA.`);
      }

      const data = await response.json();
      const replyText = data.result || "Não foi possível obter uma resposta no momento.";

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error("[AiChatModal] Erro:", error);
      toast.error(error.message || "Falha na comunicação com o assistente IA.");
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: "assistant",
          content: "❌ **Erro de Conexão**: Ocorreu um problema ao processar sua pergunta. Por favor, tente novamente em instantes.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Por favor, selecione apenas arquivos de imagem.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Tamanho da imagem excede o limite de 10MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setAttachedImages((prev) => [...prev, base64]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success("Resposta copiada para a área de transferência!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (window.confirm("Deseja limpar todo o histórico desta conversa?")) {
      const welcome: ChatMessage = {
        id: `msg-welcome-${Date.now()}`,
        role: "assistant",
        content: "Histórico reiniciado. Como posso ajudar agora?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages([welcome]);
      localStorage.removeItem("lb_ai_chat_history");
      toast.success("Histórico limpo!");
    }
  };

  const quickPrompts = [
    {
      label: "🩹 Reabilitação & RTP",
      prompt: "Com base nas lesões e exames do atleta selecionado, qual o protocolo de reabilitação neuromuscular e critérios de retorno ao esporte (RTP) recomendados?",
    },
    {
      label: "⚡ Carga & ACWR",
      prompt: "Como devo gerenciar a carga de treino desta semana considerando os níveis de fadiga e o histórico recente do atleta?",
    },
    {
      label: "🏋️ Polimento (Tapering)",
      prompt: "Monte uma estratégia de polimento (tapering) de 7 a 10 dias para otimizar a prontidão neuromuscular antes do próximo torneio.",
    },
    {
      label: "🔬 Análise IMTP / CMJ",
      prompt: "Analise a relação entre os testes de força e salto do atleta e aponte o principal elo fraco biomecânico.",
    },
  ];

  const markdownComponents = {
    p: ({ children }: any) => (
      <p className="mb-3 leading-relaxed text-slate-900 dark:text-slate-100 font-medium text-sm sm:text-base">
        {children}
      </p>
    ),
    strong: ({ children }: any) => (
      <strong className="font-black text-slate-950 dark:text-amber-200 bg-amber-400/25 dark:bg-amber-400/20 px-1.5 py-0.5 rounded border border-amber-500/30">
        {children}
      </strong>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc pl-5 my-2.5 space-y-1.5 text-slate-900 dark:text-slate-200 text-sm sm:text-base">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal pl-5 my-2.5 space-y-1.5 text-slate-900 dark:text-slate-200 text-sm sm:text-base">
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="leading-relaxed font-medium">
        {children}
      </li>
    ),
    h1: ({ children }: any) => (
      <h1 className="text-base sm:text-lg font-black mt-4 mb-2 text-slate-950 dark:text-white border-b-2 border-brand-primary/40 pb-1 uppercase tracking-wide">
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-sm sm:text-base font-black mt-3 mb-1.5 text-slate-950 dark:text-white border-b border-slate-300 dark:border-slate-800 pb-0.5">
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-xs sm:text-sm font-bold mt-2.5 mb-1 text-slate-900 dark:text-slate-200">
        {children}
      </h3>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-brand-primary pl-3 py-1.5 my-2.5 italic bg-brand-primary/10 dark:bg-slate-900/90 rounded-r text-slate-900 dark:text-slate-100 font-semibold">
        {children}
      </blockquote>
    ),
    code: ({ children }: any) => (
      <code className="bg-slate-200 dark:bg-slate-800 text-slate-950 dark:text-amber-300 px-1.5 py-0.5 rounded text-xs font-mono font-black">
        {children}
      </code>
    ),
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-3 rounded-xl border border-slate-300 dark:border-slate-800 shadow-md">
        <table className="w-full text-xs border-collapse">
          {children}
        </table>
      </div>
    ),
    th: ({ children }: any) => (
      <th className="bg-slate-200 dark:bg-slate-800 p-2.5 text-left font-black border-b border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white uppercase tracking-wider text-[11px]">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="p-2.5 border-b border-slate-200 dark:border-slate-800/80 text-slate-900 dark:text-slate-200 font-medium">
        {children}
      </td>
    ),
  };

  if (!isOpen) return null;


  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-2 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className={`bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col w-full overflow-hidden transition-all duration-300 ${
            isExpanded ? "max-w-6xl h-[92vh]" : "max-w-4xl h-[85vh] max-h-[800px]"
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-b border-slate-800/80 px-4 py-3 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-slate-950 shadow-lg shadow-brand-primary/20">
                  <Brain className="w-5 h-5 text-slate-950 font-black" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-black text-base tracking-wide flex items-center gap-2 uppercase italic">
                    Chat de Performance IA
                    <span className="text-[10px] uppercase font-black tracking-wider bg-brand-primary/20 text-brand-primary border border-brand-primary/30 px-2 py-0.5 rounded-full">
                      Padrão Mundial
                    </span>
                  </h3>
                </div>
                <p className="text-xs text-slate-400">Fisiologia, Carga, Reabilitação & Análise Estratégica</p>
              </div>
            </div>

            {/* Context Selector & Controls */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg px-2.5 py-1">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <select
                  value={currentAthleteId}
                  onChange={(e) => {
                    setCurrentAthleteId(e.target.value);
                    if (onSelectAthlete && e.target.value !== "all") {
                      onSelectAthlete(e.target.value);
                    }
                  }}
                  className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer pr-1"
                >
                  <option value="all" className="bg-slate-900 text-slate-200">
                    🌐 Sem atleta (Geral)
                  </option>
                  {athletes.map((ath) => (
                    <option key={ath.id} value={ath.id} className="bg-slate-900 text-slate-200">
                      👤 {ath.name} ({ath.modality || "Geral"})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={isExpanded ? "Reduzir janela" : "Expandir janela"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={handleClearHistory}
                className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                title="Limpar Histórico"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Context Banner */}
          <div className="bg-slate-900/90 border-b border-slate-800/60 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="font-semibold text-slate-300">Contexto Injetado:</span>
              {currentAthlete ? (
                <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded text-[11px]">
                  <Check className="w-3 h-3 text-amber-400" />
                  {currentAthlete.name} ({currentAthlete.modality}) • {currentAthlete.injuries?.length || 0} Lesões/Exames • Prontidão/Wellness
                </span>
              ) : (
                <span className="text-slate-500 italic">Perguntas gerais sem atleta atrelado</span>
              )}
            </div>
            <div className="sm:hidden w-full pt-1">
              <select
                value={currentAthleteId}
                onChange={(e) => setCurrentAthleteId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded p-1"
              >
                <option value="all">🌐 Sem atleta específico</option>
                {athletes.map((ath) => (
                  <option key={ath.id} value={ath.id}>
                    👤 {ath.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-950/50">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 max-w-3xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white shadow-md ${
                      isUser
                        ? "bg-slate-700 text-slate-200"
                        : "bg-gradient-to-tr from-indigo-600 to-purple-600 text-white"
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`space-y-1.5 max-w-[85%]`}>
                    {/* Header info */}
                    <div className={`flex items-center gap-2 text-[11px] text-slate-400 ${isUser ? "justify-end" : ""}`}>
                      <span className="font-semibold text-slate-300">
                        {isUser ? "Você (Treinador)" : "Assistente LB Sports"}
                      </span>
                      {msg.athleteName && (
                        <span className="bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded text-[10px]">
                          {msg.athleteName}
                        </span>
                      )}
                      <span>{msg.timestamp}</span>
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`p-4 sm:p-5 rounded-2xl text-sm sm:text-base leading-relaxed shadow-md border ${
                        isUser
                          ? "bg-brand-primary text-slate-950 font-bold border-brand-primary/60 rounded-tr-none shadow-brand-primary/10"
                          : "ai-assistant-bubble bg-slate-900/95 text-slate-100 border-slate-700/80 rounded-tl-none"
                      }`}
                    >
                      {/* Attached images preview if user uploaded */}
                      {msg.images && msg.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {msg.images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt="Anexo"
                              className="w-32 h-32 object-cover rounded-lg border border-slate-700/80 shadow"
                            />
                          ))}
                        </div>
                      )}

                      {/* Content rendering */}
                      {isUser ? (
                        <p className="whitespace-pre-wrap font-semibold text-slate-950">{msg.content}</p>
                      ) : (
                        <div className="max-w-none space-y-1">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* Action Bar for Assistant Message */}
                      {!isUser && (
                        <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-indigo-400" /> LB Sports Performance Intelligence
                          </span>
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 text-[11px]">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {isLoading && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 mr-auto">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shrink-0">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="p-4 rounded-2xl rounded-tl-none bg-slate-900 border border-slate-800 text-slate-300 text-sm flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Analisando dados fisiológicos e exames...</span>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="bg-slate-900 border-t border-slate-800/80 px-4 py-2.5 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1 uppercase tracking-wider shrink-0">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Sugestões Rápidas:
              </span>
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(qp.prompt)}
                  disabled={isLoading}
                  className="text-xs bg-slate-800 hover:bg-brand-primary text-slate-200 hover:text-slate-950 font-bold border border-slate-700/80 px-3 py-1.5 rounded-full transition-all whitespace-nowrap disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Attached Images Preview */}
          {attachedImages.length > 0 && (
            <div className="bg-slate-900 border-t border-slate-800/80 px-4 py-2 flex items-center gap-3">
              <span className="text-xs text-slate-400">Anexos para a IA:</span>
              <div className="flex gap-2">
                {attachedImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img src={img} alt="Anexo" className="w-12 h-12 object-cover rounded-lg border border-slate-700" />
                    <button
                      onClick={() => setAttachedImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                multiple
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800 disabled:opacity-50"
                title="Anexar imagem/gráfico para análise"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  currentAthlete
                    ? `Pergunte sobre treino, exames ou reabilitação de ${currentAthlete.name}...`
                    : "Pergunte sobre metodologia de treino, fisiologia ou exames..."
                }
                disabled={isLoading}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={isLoading || (!inputMessage.trim() && attachedImages.length === 0)}
                className="bg-brand-primary hover:bg-lime-300 text-slate-950 font-black px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-brand-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider text-xs"
              >
                <Send className="w-4 h-4 text-slate-950" />
                <span className="hidden sm:inline">Enviar</span>
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
