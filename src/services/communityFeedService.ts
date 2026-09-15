import { SocialFeedPost, Workout, Athlete } from "../types";

const FEED_STORAGE_KEY = "lbsports_community_feed_v1";

// O Mural Social inicia vazio, aguardando postagens reais dos atletas da equipe
const DEFAULT_SEED_POSTS: SocialFeedPost[] = [];

export const getCommunityFeed = (): SocialFeedPost[] => {
  try {
    const raw = localStorage.getItem(FEED_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Filtrar quaisquer postagens simuladas/seed que foram salvas anteriormente
    const realPosts = parsed.filter(
      (p: any) =>
        p &&
        typeof p.id === "string" &&
        !p.id.startsWith("post-seed-") &&
        !p.workoutId?.startsWith("w-seed-") &&
        p.athleteName !== "Gabriel Silva" &&
        p.athleteName !== "Larissa Souza"
    );

    // Se houver resquícios de postagens fake no cache do usuário, limpar e persistir apenas os reais
    if (realPosts.length !== parsed.length) {
      localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(realPosts));
    }

    return realPosts;
  } catch (err) {
    console.error("Erro ao ler feed da comunidade:", err);
    return [];
  }
};

export const clearCommunityFeed = (): SocialFeedPost[] => {
  try {
    localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify([]));
  } catch (err) {
    console.error("Erro ao limpar feed da comunidade:", err);
  }
  return [];
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
