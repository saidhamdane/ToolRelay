import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SignupForm } from './SignupForm';

export default async function SignupPage() {
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
          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-slate-600">Start free — no credit card required.</p>
          <SignupForm />
          <p className="mt-6 text-sm text-slate-600">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-700 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
