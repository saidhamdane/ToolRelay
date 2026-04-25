import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { LoginForm } from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { redirect?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="card p-8">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-600">Log in to your ToolRelay account.</p>
          <LoginForm redirectTo={searchParams?.redirect} />
          <p className="mt-6 text-sm text-slate-600">
            New here?{' '}
            <Link href="/signup" className="text-brand-700 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
