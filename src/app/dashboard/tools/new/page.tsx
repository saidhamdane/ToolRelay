import { createClient } from '@/lib/supabase/server';
import { getUserUsageContext } from '@/lib/usage';
import { NewToolForm } from './NewToolForm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function NewToolPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const usage = await getUserUsageContext(user.id);
  const atLimit = usage.toolCount >= usage.plan.maxTools;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Create a new tool</h1>
      <p className="text-sm text-slate-600 mt-1">
        Wrap an API endpoint into a public tool page and a proxy URL.
      </p>

      {atLimit ? (
        <div className="mt-8 card p-6 border-amber-200 bg-amber-50">
          <h2 className="font-semibold">You've hit your plan's tool limit</h2>
          <p className="text-sm text-slate-700 mt-1">
            Your {usage.plan.name} plan allows up to {usage.plan.maxTools}{' '}
            {usage.plan.maxTools === 1 ? 'tool' : 'tools'}.
          </p>
          <Link href="/pricing" className="btn-primary mt-4 inline-flex">
            Upgrade plan
          </Link>
        </div>
      ) : (
        <NewToolForm plan={usage.plan} />
      )}
    </div>
  );
}
