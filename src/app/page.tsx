import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { PLANS } from '@/lib/plans';

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Steps />
        <UseCases />
        <Pricing />
        <Faq />
        <Cta />
      </main>
      <SiteFooter />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 via-white to-white" />
      <div className="mx-auto max-w-6xl px-4 pt-20 pb-16 sm:pt-28 sm:pb-24 text-center">
        <span className="badge bg-brand-100 text-brand-700 mb-6">New · MVP launch</span>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900">
          Turn any API into an{' '}
          <span className="bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
            AI-agent-ready
          </span>{' '}
          paid tool — in minutes.
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
          ToolRelay wraps your API endpoint in a public tool page, a proxy URL, usage tracking, and
          subscription billing. Ship a paid tool to AI agents and developers without writing
          another backend.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup" className="btn-primary text-base px-6 py-3">
            Start free
          </Link>
          <Link href="/pricing" className="btn-secondary text-base px-6 py-3">
            See pricing
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-500">No credit card required. 1 tool free forever.</p>
      </div>
    </section>
  );
}

function Steps() {
  const steps = [
    {
      n: 1,
      title: 'Add your API',
      body: 'Paste an endpoint URL, method, and optional auth header. Define inputs and a sample response.',
    },
    {
      n: 2,
      title: 'Get a tool page + proxy',
      body: 'ToolRelay generates /tool/your-slug and a /api/run/your-slug proxy that AI agents can call.',
    },
    {
      n: 3,
      title: 'Track usage and bill',
      body: 'Every call is logged. Plan limits enforce free vs Pro. Stripe handles subscriptions.',
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-3xl font-bold text-center tracking-tight">From endpoint to revenue in three steps</h2>
      <p className="mt-3 text-slate-600 text-center max-w-2xl mx-auto">
        You bring the API. ToolRelay handles distribution, metering, and billing.
      </p>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="card p-6">
            <div className="h-9 w-9 rounded-full bg-brand-600 text-white grid place-items-center font-bold">
              {s.n}
            </div>
            <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-slate-600 text-sm leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function UseCases() {
  const cases = [
    {
      title: 'Indie SaaS owners',
      body: 'Expose your existing API as a paid tool catalogued for AI agents — no new infra.',
    },
    {
      title: 'API hackers',
      body: 'Wrap public/free APIs into a polished, branded tool with rate limits and billing.',
    },
    {
      title: 'AI agent builders',
      body: 'Give your agents a stable proxy URL and a JSON schema they can call reliably.',
    },
    {
      title: 'Internal teams',
      body: 'Share private tools across your org with usage logging and per-plan caps.',
    },
  ];
  return (
    <section className="bg-slate-50 border-y border-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-bold text-center tracking-tight">Who it's for</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cases.map((c) => (
            <div key={c.title} className="card p-6">
              <h3 className="font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [PLANS.free, PLANS.pro];
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-3xl font-bold text-center tracking-tight">Simple pricing</h2>
      <p className="mt-3 text-slate-600 text-center">Start free. Upgrade when you need more tools or runs.</p>
      <div className="mt-10 grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
        {tiers.map((t) => (
          <div key={t.id} className={`card p-6 ${t.id === 'pro' ? 'ring-2 ring-brand-600' : ''}`}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-semibold">{t.name}</h3>
              {t.id === 'pro' && <span className="badge bg-brand-100 text-brand-700">Most popular</span>}
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold">${t.priceUsd}</span>
              <span className="text-slate-500">/mo</span>
            </div>
            <ul className="mt-6 space-y-2 text-sm text-slate-700">
              <li>• Up to {t.maxTools} {t.maxTools === 1 ? 'tool' : 'tools'}</li>
              <li>• {t.maxRunsPerMonth.toLocaleString()} runs per month</li>
              <li>• {t.allowsPrivateTools ? 'Private tools allowed' : 'Public tools only'}</li>
              <li>• {t.allowsCustomAuthHeaders ? 'Custom auth headers' : 'No custom auth headers'}</li>
            </ul>
            <Link href="/pricing" className={`mt-6 w-full ${t.id === 'pro' ? 'btn-primary' : 'btn-secondary'}`}>
              {t.id === 'pro' ? 'Upgrade to Pro' : 'Start free'}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  const items = [
    {
      q: 'How does the proxy work?',
      a: 'ToolRelay exposes /api/run/[slug]. When called, we look up the tool, verify the owner is within their plan, forward the request to your endpoint with optional auth headers, log latency, and return the response.',
    },
    {
      q: 'Where is my auth header stored?',
      a: 'Your auth header value is stored encrypted at rest by Supabase and is never shown again in the dashboard or public tool page once saved.',
    },
    {
      q: 'What counts as a run?',
      a: 'Every successful or failed call to /api/run/[slug] counts as one run. Usage resets on the first day of each month UTC.',
    },
    {
      q: 'Can I use ToolRelay for private internal tools?',
      a: 'Yes — Pro plans allow private tools. Public tools are visible at /tool/[slug] and can be discovered.',
    },
  ];
  return (
    <section className="bg-slate-50 border-y border-slate-200">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-3xl font-bold text-center tracking-tight">Frequently asked</h2>
        <div className="mt-8 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {items.map((it) => (
            <details key={it.q} className="group p-5">
              <summary className="cursor-pointer list-none flex items-start justify-between gap-4">
                <span className="font-medium">{it.q}</span>
                <span className="text-slate-400 group-open:rotate-45 transition">+</span>
              </summary>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-20 text-center">
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Ship a paid tool tonight.</h2>
      <p className="mt-4 text-slate-600">
        Wrap your first API endpoint and start collecting usage in under five minutes.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/signup" className="btn-primary text-base px-6 py-3">
          Create free account
        </Link>
        <Link href="/pricing" className="btn-secondary text-base px-6 py-3">
          Compare plans
        </Link>
      </div>
    </section>
  );
}
