import React, { useState, useEffect } from "react";
import {
  X,
  Flame,
  MessageCircle,
  Share2,
  Clock,
  Dumbbell,
  Activity,
  Zap,
  Send,
  Sparkles,
  Trophy,
  Filter,
  User,
  Heart,
  ChevronDown,
  Layers,
} from "lucide-react";
import { SocialFeedPost, Athlete, Workout } from "../types";
import {
  getCommunityFeed,
  toggleKudos,
  addCommentToPost,
} from "../services/communityFeedService";
import toast from "react-hot-toast";

interface CommunityFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { name?: string; role?: string } | null;
  currentAthlete?: Athlete;
  onShareWorkout?: (workout: Workout) => void;
}

export const CommunityFeedModal: React.FC<CommunityFeedModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentAthlete,
  onShareWorkout,
}) => {
  const [posts, setPosts] = useState<SocialFeedPost[]>([]);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [searchFilter, setSearchFilter] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setPosts(getCommunityFeed());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentUserName = currentUser?.name || currentAthlete?.name || "Atleta LB";

  const handleToggleKudos = (postId: string) => {
    const updated = toggleKudos(postId, currentUserName);
    setPosts(updated);
    toast("🔥 Kudos enviado!", {
      duration: 2000,
      style: {
        background: "#0f172a",
        color: "#39FF14",
        border: "1px solid rgba(57, 255, 20, 0.3)",
        fontWeight: "bold",
      },
    });
  };

  const handleSendComment = (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    const updated = addCommentToPost(postId, currentUserName, text);
    setPosts(updated);
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    setExpandedComments((prev) => ({ ...prev, [postId]: true }));
    toast.success("Comentário publicado!");
  };

  const filteredPosts = posts.filter((p) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      p.athleteName.toLowerCase().includes(term) ||
      p.workoutName.toLowerCase().includes(term) ||
      (p.modality && p.modality.toLowerCase().includes(term))
    );
  });

  const totalKudosGiven = posts.reduce((sum, p) => sum + (p.kudos?.length || 0), 0);

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#39FF14] p-0.5 shadow-[0_0_20px_rgba(57,255,20,0.3)]">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-[#39FF14]">
                <Flame className="w-5 h-5 fill-current" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#39FF14] bg-[#39FF14]/10 px-2 py-0.5 rounded border border-[#39FF14]/20">
                  Comunidade Elite
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {posts.length} treinos compartilhados
                </span>
              </div>
              <h3 className="text-xl font-black italic uppercase text-white tracking-tight">
                Mural Social LB • Estilo Strava
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats banner */}
        <div className="bg-slate-950/40 px-5 py-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1 font-bold">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Alta Performance Coletiva</span>
            </span>
            <span className="flex items-center gap-1 font-mono text-[#39FF14]">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{totalKudosGiven} Kudos dados</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Buscar atleta ou treino..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#39FF14] transition-colors w-48"
            />
          </div>
        </div>

        {/* Posts Feed */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-grow">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Flame className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-base font-bold text-white mb-1">Nenhum treino encontrado no feed</p>
              <p className="text-xs text-slate-500">
                Seja o primeiro a postar seu treino concluído no mural da LB Sports!
              </p>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const hasGivenKudos = post.kudos?.includes(currentUserName);
              const isExpanded = expandedComments[post.id];

              return (
                <div
                  key={post.id}
                  className="bg-slate-950/80 border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700/80 transition-all"
                >
                  {/* Post Header */}
                  <div className="p-4 flex items-center justify-between gap-3 border-b border-slate-800/60">
                    <div className="flex items-center gap-3">
                      {post.athletePhoto ? (
                        <img
                          src={post.athletePhoto}
                          alt={post.athleteName}
                          className="w-10 h-10 rounded-full object-cover border-2 border-slate-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-brand-primary font-black text-sm">
                          {post.athleteName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white uppercase tracking-tight">
                            {post.athleteName}
                          </h4>
                          {post.modality && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800 uppercase">
                              {post.modality}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="text-[#39FF14] font-semibold">{post.workoutName}</span>
                          <span>•</span>
                          <span>
                            {new Date(post.date).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Verified LB badge with logo */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800">
                      <img src="/pwa-192x192.svg" alt="LB" className="w-3.5 h-3.5 object-contain" />
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                        LB HUB
                      </span>
                    </div>
                  </div>

                  {/* Post Photo (if exists) */}
                  {post.photoUrl && (
                    <div className="relative max-h-96 overflow-hidden bg-slate-950 flex items-center justify-center">
                      <img
                        src={post.photoUrl}
                        alt="Treino"
                        className="w-full object-cover max-h-96"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                    </div>
                  )}

                  {/* Strava HUD Stats Bar */}
                  <div className="p-4 bg-slate-900/60 border-b border-slate-800/60">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {/* Duração */}
                      <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
                        <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                          <Clock className="w-3 h-3 text-[#39FF14]" />
                          <span>DURAÇÃO</span>
                        </div>
                        <span className="text-sm sm:text-base font-black text-white font-mono">
                          {post.durationMinutes} min
                        </span>
                      </div>

                      {/* Volume */}
                      <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
                        <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                          <Dumbbell className="w-3 h-3 text-[#39FF14]" />
                          <span>VOLUME</span>
                        </div>
                        <span className="text-sm sm:text-base font-black text-white font-mono truncate">
                          {post.totalLoad.toLocaleString()} kg
                        </span>
                      </div>

                      {/* PSE */}
                      <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
                        <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                          <Activity className="w-3 h-3 text-amber-400" />
                          <span>PSE ATLETA</span>
                        </div>
                        <span className="text-sm sm:text-base font-black text-white font-mono">
                          {post.rpe || 7}/10
                        </span>
                      </div>

                      {/* Carga Interna */}
                      <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
                        <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                          <Zap className="w-3 h-3 text-yellow-400" />
                          <span>CARGA INT.</span>
                        </div>
                        <span className="text-sm sm:text-base font-black text-white font-mono">
                          {(post.durationMinutes * (post.rpe || 7)).toLocaleString()} u.a.
                        </span>
                      </div>
                    </div>

                    {/* Caption */}
                    {post.caption && (
                      <p className="mt-3 text-xs text-slate-200 leading-relaxed font-medium">
                        "{post.caption}"
                      </p>
                    )}
                  </div>

                  {/* Social Actions (Kudos, Comments count, Share) */}
                  <div className="p-3 bg-slate-950/90 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      {/* Kudos Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleKudos(post.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                          hasGivenKudos
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                            : "bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <Flame
                          className={`w-4 h-4 ${hasGivenKudos ? "fill-amber-400 text-amber-400" : "text-slate-400"}`}
                        />
                        <span>{post.kudos?.length || 0} Kudos</span>
                      </button>

                      {/* Comments Toggle */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 text-slate-400" />
                        <span>{post.comments?.length || 0} Comentários</span>
                      </button>
                    </div>

                    {/* Kudos users preview */}
                    {post.kudos && post.kudos.length > 0 && (
                      <div className="text-[10px] text-slate-400 truncate max-w-[200px] hidden sm:block">
                        🔥 Curtido por <strong className="text-slate-200">{post.kudos.slice(0, 2).join(", ")}</strong>
                        {post.kudos.length > 2 && ` e mais ${post.kudos.length - 2}`}
                      </div>
                    )}
                  </div>

                  {/* Comments Section (Expanded) */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-950 border-t border-slate-800/80 space-y-3">
                      {post.comments && post.comments.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {post.comments.map((c) => (
                            <div
                              key={c.id}
                              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-xs"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-200">{c.userName}</span>
                                <span className="text-[9px] text-slate-500">
                                  {new Date(c.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-slate-300">{c.text}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">
                          Nenhum comentário ainda. Deixe o primeiro incentivo!
                        </p>
                      )}

                      {/* Comment Input */}
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="text"
                          placeholder="Deixe uma mensagem de incentivo..."
                          value={commentInputs[post.id] || ""}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSendComment(post.id);
                          }}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#39FF14] transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => handleSendComment(post.id)}
                          className="p-2 bg-[#39FF14]/15 hover:bg-[#39FF14]/25 text-[#39FF14] border border-[#39FF14]/30 rounded-xl transition-colors cursor-pointer"
                          title="Enviar comentário"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
