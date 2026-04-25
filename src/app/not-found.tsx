import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight">404</h1>
        <p className="mt-4 text-slate-600">That page doesn't exist or isn't public.</p>
        <Link href="/" className="btn-primary mt-8 inline-flex">
          Back to home
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
