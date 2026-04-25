import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <nav className="mb-6 flex gap-1 text-sm border-b border-slate-200 overflow-x-auto">
          <DashTab href="/dashboard" label="Overview" />
          <DashTab href="/dashboard/usage" label="Usage" />
          <DashTab href="/dashboard/tools/new" label="New tool" />
          <DashTab href="/dashboard/plan" label="Plan" />
        </nav>
        {children}
      </div>
      <SiteFooter />
    </>
  );
}

function DashTab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 -mb-px border-b-2 border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
    >
      {label}
    </Link>
  );
}
