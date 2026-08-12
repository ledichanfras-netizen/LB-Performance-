
export interface UserWithPlan {
  role: 'coach' | 'athlete';
  athleteId?: string;
  token?: string;
  plan?: 'free' | 'pro';
}

export function isPro(user: UserWithPlan | null): boolean {
  return user?.plan === 'pro';
}
