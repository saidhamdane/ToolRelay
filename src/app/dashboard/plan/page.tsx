import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUserUsageContext } from '@/lib/usage';
import { PLANS } from '@/lib/plans';
import { UpgradeButton } from '@/app/pricing/UpgradeButton';

export const dynamic = 'force-dynamic';

export default async function DashboardPlanPage({
  searchParams,
}: {
  searchParams?: { upgraded?: string; canceled?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const usage = await getUserUsageContext(user.id);
  const tiers = [PLANS.free, PLANS.pro];
  const isPro = usage.plan.id === 'pro';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Plan & billing</h1>
        <p className="text-sm text-slate-600 mt-1">
          You're currently on <strong>{usage.plan.name}</strong>
          {usage.subscriptionStatus && ` · status ${usage.subscriptionStatus}`}.
        </p>
      </div>

      {searchParams?.upgraded === '1' && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          <strong>Welcome to Pro.</strong> Your new limits are live. If your dashboard still shows
          Free, give Stripe a few seconds to send the webhook and refresh.
        </div>
      )}
      {searchParams?.canceled === '1' && (
        <div className="rounded-lg border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
          Checkout canceled — no charge. You can come back any time.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {tiers.map((t) => {
          const isCurrent = usage.plan.id === t.id;
          return (
            <div
              key={t.id}
              className={`card p-6 sm:p-8 ${t.id === 'pro' ? 'ring-2 ring-brand-600' : ''}`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-semibold">{t.name}</h3>
                {isCurrent && <span className="badge bg-emerald-100 text-emerald-700">Current</span>}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-bold">${t.priceUsd}</span>
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
                  </>
                ) : (
                  <>
                    <li>• 10 MCP-ready tools</li>
                    <li>• Private MCP tools with per-tool API keys</li>
                    <li>• 10,000 runs / month</li>
                    <li>• Custom upstream auth headers</li>
                    <li>• Full usage logs</li>
                    <li>• Stripe subscription billing</li>
                  </>
                )}
              </ul>

              <div className="mt-8">
                {t.id === 'free' ? (
                  isCurrent ? (
                    <button disabled className="btn-secondary w-full">
                      You're on Free
                    </button>
                  ) : (
                    <Link href="/dashboard" className="btn-secondary w-full">
                      Go to dashboard
                    </Link>
                  )
                ) : isPro ? (
                  <button disabled className="btn-primary w-full">
                    You're on Pro
                  </button>
                ) : (
                  <UpgradeButton />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-6">
        <h2 className="font-semibold">Plan limits in detail</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-4">Capability</th>
                <th className="py-2 px-4">Free</th>
                <th className="py-2 px-4">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <Row label="Tools" free="1" pro="10" />
              <Row label="Runs per month (UTC)" free="100" pro="10,000" />
              <Row label="Public tool pages" free="✓" pro="✓" />
              <Row label="Private tools" free="—" pro="✓" />
              <Row label="Per-tool API keys" free="—" pro="✓" />
              <Row label="Custom auth header (forwarded upstream)" free="—" pro="✓" />
              <Row label="Usage logs" free="✓" pro="✓" />
              <Row label="Stripe billing" free="—" pro="✓" />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Row({ label, free, pro }: { label: string; free: string; pro: string }) {
  return (
    <tr>
      <td className="py-2 pr-4">{label}</td>
      <td className="py-2 px-4 text-slate-700">{free}</td>
      <td className="py-2 px-4 font-medium text-slate-900">{pro}</td>
    </tr>
  );
}
