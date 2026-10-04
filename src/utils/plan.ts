
export interface UserWithPlan {
  platformAdmin?: boolean;
  aiEnabled?: boolean;
  supervision?: boolean;
  supervisedName?: string;
  organizationId?: string;
  role: 'coach' | 'athlete';
  athleteId?: string;
  token?: string;
  plan?: 'free' | 'pro';
}

export function isPro(user: UserWithPlan | null): boolean {
  return user?.plan === 'pro';
}
