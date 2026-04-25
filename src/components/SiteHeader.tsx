import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from './SignOutButton';

export async function SiteHeader() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-brand-600 text-white grid place-items-center font-bold">
            T
          </div>
          <span className="font-semibold tracking-tight">ToolRelay</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/pricing" className="btn-ghost">
            Pricing
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="btn-ghost">
                Dashboard
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
