import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUserUsageContext } from '@/lib/usage';

export const dynamic = 'force-dynamic';

export default async function DashboardOverview() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const usage = await getUserUsageContext(user.id);

  const { data: tools } = await supabase
    .from('tools')
    .select('id, name, slug, is_public, method, created_at')
    .order('created_at', { ascending: false });

  const toolList = tools ?? [];
  const planLabel = usage.plan.name;
  const isFree = usage.plan.id === 'free';
  const atToolLimit = usage.toolCount >= usage.plan.maxTools;
  const runsPct = Math.min(100, Math.round((usage.monthlyRuns / usage.plan.maxRunsPerMonth) * 100));
  const atRunLimit = usage.monthlyRuns >= usage.plan.maxRunsPerMonth;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-600 break-all">Signed in as {user.email}</p>
        </div>
        <Link
          href="/dashboard/tools/new"
          className={atToolLimit ? 'btn-secondary' : 'btn-primary'}
          aria-disabled={atToolLimit}
        >
          {atToolLimit ? 'Tool limit reached' : 'New tool'}
        </Link>
      </div>

      {isFree && (
        <div className="rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 to-indigo-50 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-brand-900">You're on the Free plan</div>
            <p className="mt-1 text-sm text-slate-700">
              Upgrade to Pro for 10 tools, 10,000 runs/month, private tools with API keys, and
              custom auth headers.
            </p>
          </div>
          <Link href="/dashboard/plan" className="btn-primary whitespace-nowrap">
            Upgrade to Pro
          </Link>
        </div>
      )}

      {atRunLimit && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Monthly run limit reached.</strong> Calls to your proxy URLs will return{' '}
          <code className="font-mono">429 plan_limit_exceeded</code> until usage resets on the
          first of next month UTC.{' '}
          {isFree && (
            <Link href="/dashboard/plan" className="underline">
              Upgrade to Pro
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Plan" value={planLabel}>
          <Link href="/dashboard/plan" className="text-xs text-brand-700 hover:underline">
            {usage.plan.id === 'pro' ? 'Manage plan' : 'Upgrade to Pro'}
          </Link>
        </StatCard>
        <StatCard title="Tools" value={`${usage.toolCount} / ${usage.plan.maxTools}`}>
          <div className="h-1.5 mt-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-brand-600"
              style={{ width: `${Math.min(100, (usage.toolCount / usage.plan.maxTools) * 100)}%` }}
            />
          </div>
        </StatCard>
        <StatCard
          title="Runs this month"
          value={`${usage.monthlyRuns.toLocaleString()} / ${usage.plan.maxRunsPerMonth.toLocaleString()}`}
        >
          <div className="h-1.5 mt-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${runsPct}%` }} />
          </div>
        </StatCard>
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your tools</h2>
        </div>
        {toolList.length === 0 ? (
          <EmptyTools />
        ) : (
          <div className="mt-4 card divide-y divide-slate-200">
            {toolList.map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/tools/${t.id}`}
                className="flex items-center justify-between p-4 hover:bg-slate-50"
              >
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-slate-500 font-mono">/tool/{t.slug}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-slate-100 text-slate-700">{t.method}</span>
                  <span
                    className={`badge ${
                      t.is_public ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {t.is_public ? 'Public' : 'Private'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  children,
}: {
  title: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {children}
    </div>
  );
}

function EmptyTools() {
  return (
    <div className="mt-4 card p-10 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-brand-50 grid place-items-center text-brand-600 text-xl">
        ⚡
      </div>
      <h3 className="mt-4 text-lg font-semibold">No tools yet</h3>
      <p className="mt-1 text-sm text-slate-600 max-w-md mx-auto">
        Add your first API endpoint to generate a public tool page and a proxy URL agents can call.
      </p>
      <Link href="/dashboard/tools/new" className="btn-primary mt-6">
        Create your first tool
      </Link>
    </div>
  );
}
