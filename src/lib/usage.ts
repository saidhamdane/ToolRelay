import { createAdminClient } from './supabase/admin';
import { getPlan, isActiveSubscriptionStatus, startOfCurrentMonthIso, type PlanLimits } from './plans';

export interface UserUsageContext {
  plan: PlanLimits;
  toolCount: number;
  monthlyRuns: number;
  subscriptionStatus: string | null;
}

export async function getUserUsageContext(userId: string): Promise<UserUsageContext> {
  const admin = createAdminClient();

  const [{ data: sub }, { count: toolCount }, { count: runCount }] = await Promise.all([
    admin
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .maybeSingle(),
    admin.from('tools').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    admin
      .from('usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfCurrentMonthIso()),
  ]);

  const planId = sub && isActiveSubscriptionStatus(sub.status) ? sub.plan : 'free';
  return {
    plan: getPlan(planId),
    toolCount: toolCount ?? 0,
    monthlyRuns: runCount ?? 0,
    subscriptionStatus: sub?.status ?? null,
  };
}
