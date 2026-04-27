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
        <ValueGrid />
        <Steps />
        <McpExample />
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
        <span className="badge bg-brand-100 text-brand-700 mb-6">MCP-ready · MVP</span>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900">
          Turn any API into an{' '}
          <span className="bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
            MCP server
          </span>{' '}
          for AI agents
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
          ToolRelay wraps your existing APIs into secure, logged, rate-limited MCP-ready tools —
          with API keys, usage limits, and Stripe billing built in.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup" className="btn-primary text-base px-6 py-3">
            Create your first MCP tool
          </Link>
          <Link href="/mcp" className="btn-secondary text-base px-6 py-3">
            See MCP integration
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-500">No credit card required. 1 tool free forever.</p>
      </div>
    </section>
  );
}

function ValueGrid() {
  const items = [
    {
      title: 'API to MCP in minutes',
      body: 'Paste an endpoint URL, pick public or private, and ToolRelay generates an MCP-style tool surface plus a raw HTTP proxy. No agent SDK to wire up.',
    },
    {
      title: 'Secure by default',
      body: 'Private tools require a per-tool x-toolrelay-key. SSRF guard rejects internal hosts, every call has a 25s timeout, and auth header values are stored server-side and never echoed.',
    },
    {
      title: 'Built for monetization',
      body: 'Free vs Pro plan limits enforced server-side, Stripe Checkout + webhook for billing, and usage logs you can audit per tool and per month.',
    },
    {
      title: 'Works with agents',
      body: 'Plug the MCP endpoint URL into Claude, an MCP client, or any automation workflow. Public tools are open; private tools accept the API key as a header.',
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-3xl font-bold text-center tracking-tight">
        Everything you need to ship a paid MCP tool
      </h2>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.title} className="card p-6">
            <h3 className="font-semibold">{it.title}</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{it.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Steps() {
  const steps = [
    {
      n: 1,
      title: 'Add your API',
      body: 'Paste an endpoint, method, and optional upstream auth header. Define inputs and a sample response.',
    },
    {
      n: 2,
      title: 'Get an MCP-ready tool',
      body: 'ToolRelay generates /api/mcp/your-slug for agents and /api/run/your-slug as a raw HTTP proxy.',
    },
    {
      n: 3,
      title: 'Track usage and bill',
      body: 'Every call is logged with status and latency. Plan limits enforce Free vs Pro. Stripe handles subscriptions.',
    },
  ];
  return (
    <section className="bg-slate-50 border-y border-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-bold text-center tracking-tight">
          From endpoint to MCP tool in three steps
        </h2>
        <p className="mt-3 text-slate-600 text-center max-w-2xl mx-auto">
          You bring the API. ToolRelay handles the agent surface, metering, and billing.
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
      </div>
    </section>
  );
}

function McpExample() {
  const example = `curl -X POST 'https://www.toolrelay.online/api/mcp/your-slug' \\
  -H 'Content-Type: application/json' \\
  -H 'x-toolrelay-key: trk_…' \\
  -d '{"arguments":{"message":"hello from an agent"}}'`;
  return (
    <section className="mx-auto max-w-4xl px-4 py-16">
      <h2 className="text-3xl font-bold text-center tracking-tight">Call it like an MCP tool</h2>
      <p className="mt-3 text-slate-600 text-center max-w-2xl mx-auto">
        Every tool exposes an MCP-ready JSON endpoint. Agents POST{' '}
        <code className="font-mono">{'{ arguments: { … } }'}</code> and get back the upstream
        response wrapped in a content array.
      </p>
      <div className="mt-8 card overflow-hidden">
        <pre className="bg-slate-900 text-slate-100 text-xs p-5 overflow-x-auto whitespace-pre">
          {example}
        </pre>
      </div>
      <div className="mt-6 text-center">
        <Link href="/mcp" className="text-brand-700 hover:underline text-sm font-medium">
          Read the MCP integration guide →
        </Link>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [PLANS.free, PLANS.pro];
  return (
    <section id="pricing" className="bg-slate-50 border-y border-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-bold text-center tracking-tight">Simple pricing</h2>
        <p className="mt-3 text-slate-600 text-center">
          Start free with a public MCP tool. Upgrade when you need private tools or more runs.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
          {tiers.map((t) => (
            <div key={t.id} className={`card p-6 ${t.id === 'pro' ? 'ring-2 ring-brand-600' : ''}`}>
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-semibold">{t.name}</h3>
                {t.id === 'pro' && (
                  <span className="badge bg-brand-100 text-brand-700">Most popular</span>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold">${t.priceUsd}</span>
                <span className="text-slate-500">/mo</span>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-slate-700">
                {t.id === 'free' ? (
                  <>
                    <li>• 1 public MCP-ready tool</li>
                    <li>• 100 runs / month</li>
                    <li>• Public tool page + MCP endpoint</li>
                    <li>• Basic usage logs</li>
                  </>
                ) : (
                  <>
                    <li>• 10 MCP-ready tools</li>
                    <li>• Private MCP tools</li>
                    <li>• Per-tool API keys</li>
                    <li>• 10,000 runs / month</li>
                    <li>• Custom upstream auth headers</li>
                    <li>• Full usage logs</li>
                  </>
                )}
              </ul>
              <Link
                href="/pricing"
                className={`mt-6 w-full ${t.id === 'pro' ? 'btn-primary' : 'btn-secondary'}`}
              >
                {t.id === 'pro' ? 'Upgrade to Pro' : 'Start free'}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const items = [
    {
      q: 'What does "MCP-ready" actually mean here?',
      a: 'Every ToolRelay tool exposes a /api/mcp/[slug] endpoint. GET returns the tool metadata (name, description, schemas, security model). POST accepts { "arguments": { … } } and forwards to your upstream, returning the response wrapped in MCP-style { content: [{ type: "text", text }] }. Full MCP transport support (SSE/stdio) is on the roadmap.',
    },
    {
      q: 'How is a private MCP tool secured?',
      a: 'Private tools require a per-tool key (prefix trk_…) sent as the x-toolrelay-key header. Missing/invalid keys return a 401 with a structured error code, and unauthorized attempts are written to your usage_logs.',
    },
    {
      q: 'Where is the upstream auth header stored?',
      a: 'Server-side in Postgres (encrypted at rest by Supabase). The value is forwarded to your upstream on every call but is never displayed in the dashboard or logged in usage_logs after save.',
    },
    {
      q: 'What counts as a run?',
      a: 'Every call to /api/mcp/[slug] or /api/run/[slug] counts as one run, success or failure. Plan caps reset on the first of each month UTC.',
    },
  ];
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
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
    </section>
  );
}

function Cta() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-20 text-center">
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
        Ship your first MCP tool tonight.
      </h2>
      <p className="mt-4 text-slate-600">
        Wrap any API endpoint into a secure, logged, billable tool that AI agents can call. In
        under five minutes.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/signup" className="btn-primary text-base px-6 py-3">
          Create your first MCP tool
        </Link>
        <Link href="/mcp" className="btn-secondary text-base px-6 py-3">
          See MCP integration
        </Link>
      </div>
    </section>
  );
}
