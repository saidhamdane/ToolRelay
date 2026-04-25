import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 mt-16">
      <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between text-sm text-slate-600">
        <div>© {new Date().getFullYear()} ToolRelay</div>
        <div className="flex gap-4">
          <Link href="/pricing" className="hover:text-slate-900">
            Pricing
          </Link>
          <Link href="/terms" className="hover:text-slate-900">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-slate-900">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
