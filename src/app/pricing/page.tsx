import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { PLANS } from '@/lib/plans';
import { createClient } from '@/lib/supabase/server';
import { UpgradeButton } from './UpgradeButton';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentPlan: 'free' | 'pro' = 'free';
  if (user) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .maybeSingle();
    if (sub && (sub.status === 'active' || sub.status === 'trialing') && sub.plan === 'pro') {
      currentPlan = 'pro';
    }
  }

  const tiers = [PLANS.free, PLANS.pro];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-4xl font-bold tracking-tight text-center">Pricing</h1>
        <p className="mt-3 text-slate-600 text-center">Pay only for what you need. Cancel any time.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {tiers.map((t) => {
            const isCurrent = currentPlan === t.id;
            return (
              <div
                key={t.id}
                className={`card p-8 ${t.id === 'pro' ? 'ring-2 ring-brand-600' : ''}`}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xl font-semibold">{t.name}</h3>
                  {isCurrent && <span className="badge bg-emerald-100 text-emerald-700">Current</span>}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-5xl font-bold">${t.priceUsd}</span>
                  <span className="text-slate-500">/mo</span>
                </div>
                <ul className="mt-6 space-y-2 text-sm text-slate-700">
                  {t.id === 'free' ? (
                    <>
                      <li>• 1 public MCP-ready tool</li>
                      <li>• 100 runs / month</li>
                      <li>• MCP endpoint + raw HTTP proxy</li>
                      <li>• Public tool page</li>
                      <li>• Basic usage logs</li>
                      <li>• Email support</li>
                    </>
                  ) : (
                    <>
                      <li>• 10 MCP-ready tools</li>
                      <li>• Private MCP tools</li>
                      <li>• Per-tool API keys (regenerate any time)</li>
                      <li>• 10,000 runs / month</li>
                      <li>• Custom upstream auth headers</li>
                      <li>• Full usage logs</li>
                      <li>• Stripe subscription billing</li>
                    </>
                  )}
                </ul>

                {t.id === 'free' ? (
                  user ? (
                    isCurrent ? (
                      <button disabled className="btn-secondary mt-8 w-full">
                        You're on Free
                      </button>
                    ) : (
                      <Link href="/dashboard" className="btn-secondary mt-8 w-full">
                        Go to dashboard
                      </Link>
                    )
                  ) : (
                    <Link href="/signup" className="btn-secondary mt-8 w-full">
                      Start free
                    </Link>
                  )
                ) : user ? (
                  isCurrent ? (
                    <button disabled className="btn-primary mt-8 w-full">
                      You're on Pro
                    </button>
                  ) : (
                    <div className="mt-8">
                      <UpgradeButton />
                    </div>
                  )
                ) : (
                  <Link href="/signup?upgrade=pro" className="btn-primary mt-8 w-full">
                    Sign up & upgrade
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
