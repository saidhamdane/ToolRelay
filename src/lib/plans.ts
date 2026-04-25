export type PlanId = 'free' | 'pro';

export interface PlanLimits {
  id: PlanId;
  name: string;
  maxTools: number;
  maxRunsPerMonth: number;
  allowsPrivateTools: boolean;
  allowsCustomAuthHeaders: boolean;
  priceUsd: number;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: 'free',
    name: 'Free',
    maxTools: 1,
    maxRunsPerMonth: 100,
    allowsPrivateTools: false,
    allowsCustomAuthHeaders: false,
    priceUsd: 0,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    maxTools: 10,
    maxRunsPerMonth: 10_000,
    allowsPrivateTools: true,
    allowsCustomAuthHeaders: true,
    priceUsd: 19,
  },
};

export function getPlan(plan: string | null | undefined): PlanLimits {
  if (plan === 'pro') return PLANS.pro;
  return PLANS.free;
}

export function isActiveSubscriptionStatus(status: string | null | undefined) {
  return status === 'active' || status === 'trialing';
}

export function startOfCurrentMonthIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
