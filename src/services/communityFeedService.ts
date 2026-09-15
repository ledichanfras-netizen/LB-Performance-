import { SocialFeedPost, Workout, Athlete } from "../types";

const FEED_STORAGE_KEY = "lbsports_community_feed_v1";

const DEFAULT_SEED_POSTS: SocialFeedPost[] = [
  {
    id: "post-seed-1",
    workoutId: "w-seed-1",
    athleteId: "ath-gabriel",
    athleteName: "Gabriel Silva",
    athletePhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    modality: "Futebol Profissional",
    competitiveLevel: "Elite",
    workoutName: "Treino A • Potência & PAP (French Contrast)",
    phase: "Pré-Competitivo",
    date: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    durationMinutes: 58,
    totalLoad: 5240,
    rpe: 8,
    exercisesCount: 6,
    completedSetsCount: 18,
    caption: "Sessão sinistra de French Contrast hoje! Potência pura nas pernas para o jogo de sábado. ⚡💪 #LBSports #ElitePerformance",
    photoUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1080&auto=format&fit=crop&q=85",
    kudos: ["Coach Lucas", "Matheus Ramos", "Ana Paula"],
    comments: [
      {
        id: "c-1",
        userName: "Coach Lucas",
        text: "Ritmo absurdo hoje Gabriel! Transmissão neuromuscular impecável nos saltos.",
        timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "post-seed-2",
    workoutId: "w-seed-2",
    athleteId: "ath-larissa",
    athleteName: "Larissa Souza",
    athletePhoto: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
    modality: "Voleibol Feminino",
    competitiveLevel: "Nacional",
    workoutName: "Reatividade Elástica & RSI Drop Jump",
    phase: "Fase Específica",
    date: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    durationMinutes: 48,
    totalLoad: 3950,
    rpe: 7,
    exercisesCount: 5,
    completedSetsCount: 15,
    caption: "Foco total na reatividade de solo e desaceleração excêntrica. RSI batendo recorde pessoal hoje!",
    photoUrl: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1080&auto=format&fit=crop&q=85",
    kudos: ["Gabriel Silva", "Coach Lucas", "Mariana Rios", "Felipe Santos"],
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
];

export const getCommunityFeed = (): SocialFeedPost[] => {
  try {
    const raw = localStorage.getItem(FEED_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(DEFAULT_SEED_POSTS));
      return DEFAULT_SEED_POSTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(DEFAULT_SEED_POSTS));
      return DEFAULT_SEED_POSTS;
    }
    return parsed;
  } catch (err) {
    console.error("Erro ao ler feed da comunidade:", err);
    return DEFAULT_SEED_POSTS;
  }
};

export const saveCommunityFeed = (posts: SocialFeedPost[]): void => {
  try {
    localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(posts));
  } catch (err) {
    console.error("Erro ao salvar feed da comunidade:", err);
  }
};

export const publishWorkoutToFeed = (
  workout: Workout,
  athlete: Athlete,
  options?: {
    photoUrl?: string;
    caption?: string;
  }
): SocialFeedPost => {
  const posts = getCommunityFeed();
  
  // Verifica se já existe post deste workout para atualizar
  const existingIdx = posts.findIndex((p) => p.workoutId === workout.id);

  const completedSets = (workout.exercises || []).reduce((acc, ex) => {
    return acc + (ex.performedSets ? ex.performedSets.filter((s) => s.isCompleted !== false).length : ex.sets || 3);
  }, 0);

  const newPost: SocialFeedPost = {
    id: existingIdx >= 0 ? posts[existingIdx].id : `post-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    workoutId: workout.id,
    athleteId: athlete.id,
    athleteName: athlete.name,
    athletePhoto: athlete.photoUrl,
    modality: athlete.modality,
    competitiveLevel: athlete.competitiveLevel,
    workoutName: workout.name,
    phase: workout.phase,
    date: workout.date || new Date().toISOString(),
    durationMinutes: workout.durationMinutes || 60,
    totalLoad: workout.totalLoad || 0,
    rpe: workout.rpe || 7,
    exercisesCount: (workout.exercises || []).length,
    completedSetsCount: completedSets,
    photoUrl: options?.photoUrl || workout.photoUrl || undefined,
    caption: options?.caption || workout.socialCaption || `Treino finalizado na LB Sports: ${workout.name}! Foco na alta performance. ⚡`,
    kudos: existingIdx >= 0 ? posts[existingIdx].kudos : [],
    comments: existingIdx >= 0 ? posts[existingIdx].comments : [],
    createdAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    posts[existingIdx] = newPost;
  } else {
    posts.unshift(newPost);
  }

  saveCommunityFeed(posts);
  return newPost;
};

export const toggleKudos = (postId: string, userName: string): SocialFeedPost[] => {
  const posts = getCommunityFeed();
  const post = posts.find((p) => p.id === postId);
  if (!post) return posts;

  if (post.kudos.includes(userName)) {
    post.kudos = post.kudos.filter((u) => u !== userName);
  } else {
    post.kudos.push(userName);
  }

  saveCommunityFeed(posts);
  return [...posts];
};

export const addCommentToPost = (postId: string, userName: string, text: string): SocialFeedPost[] => {
  const posts = getCommunityFeed();
  const post = posts.find((p) => p.id === postId);
  if (!post || !text.trim()) return posts;

  if (!post.comments) post.comments = [];
  post.comments.push({
    id: `c-${Date.now()}`,
    userName,
    text: text.trim(),
    timestamp: new Date().toISOString(),
  });

  saveCommunityFeed(posts);
  return [...posts];
};

export const deletePost = (postId: string): SocialFeedPost[] => {
  const posts = getCommunityFeed().filter((p) => p.id !== postId);
  saveCommunityFeed(posts);
  return posts;
};
