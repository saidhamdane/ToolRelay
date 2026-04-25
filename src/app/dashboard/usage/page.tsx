import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUserUsageContext } from '@/lib/usage';

export const dynamic = 'force-dynamic';

export default async function UsagePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const usage = await getUserUsageContext(user.id);

  const { data: logs } = await supabase
    .from('usage_logs')
    .select('id, status_code, latency_ms, error_message, created_at, tool_id, tools(name, slug)')
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = logs ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usage</h1>
        <p className="text-sm text-slate-600 mt-1">
          {usage.monthlyRuns.toLocaleString()} of {usage.plan.maxRunsPerMonth.toLocaleString()} runs
          this month on the {usage.plan.name} plan.
        </p>
      </div>
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-center">
            <h3 className="font-semibold">No runs yet</h3>
            <p className="text-sm text-slate-600 mt-1">Calls to your proxy URL will show up here.</p>
            <Link href="/dashboard" className="btn-secondary mt-4 inline-flex">
              Back to dashboard
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3">When</th>
                <th className="text-left p-3">Tool</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Latency</th>
                <th className="text-left p-3">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((l: any) => (
                <tr key={l.id}>
                  <td className="p-3 font-mono text-xs">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="p-3">
                    {l.tools ? (
                      <Link href={`/dashboard/tools/${l.tool_id}`} className="text-brand-700 hover:underline">
                        {l.tools.name}
                      </Link>
                    ) : (
                      <span className="text-slate-400">deleted</span>
                    )}
                  </td>
                  <td className="p-3">
                    <StatusPill code={l.status_code} />
                  </td>
                  <td className="p-3">{l.latency_ms != null ? `${l.latency_ms} ms` : '—'}</td>
                  <td className="p-3 text-slate-600 truncate max-w-xs">{l.error_message || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatusPill({ code }: { code: number | null }) {
  if (code == null) return <span className="badge bg-slate-100 text-slate-700">—</span>;
  if (code >= 500) return <span className="badge bg-red-100 text-red-700">{code}</span>;
  if (code >= 400) return <span className="badge bg-amber-100 text-amber-700">{code}</span>;
  return <span className="badge bg-emerald-100 text-emerald-700">{code}</span>;
}
