import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { CopyButton } from '@/components/CopyButton';

export const dynamic = 'force-dynamic';

export default async function PublicToolPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  // Public listing: select only safe columns. Never expose endpoint_url or
  // auth_header_value here — those are owner-only.
  const { data: tool } = await supabase
    .from('tools')
    .select('id, name, slug, description, method, input_schema, output_example, is_public, created_at')
    .eq('slug', params.slug)
    .eq('is_public', true)
    .maybeSingle();

  if (!tool) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const proxyUrl = `${appUrl}/api/run/${tool.slug}`;

  const exampleBody = tool.input_schema
    ? JSON.stringify(exampleFromSchema(tool.input_schema), null, 2)
    : '{}';

  const curl =
    tool.method === 'GET'
      ? `curl '${proxyUrl}'`
      : `curl -X POST '${proxyUrl}' \\\n  -H 'content-type: application/json' \\\n  -d '${exampleBody.replace(/\n\s*/g, ' ')}'`;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="badge bg-brand-100 text-brand-700">Public tool</span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">{tool.name}</h1>
            <p className="mt-1 font-mono text-sm text-slate-500">/tool/{tool.slug}</p>
          </div>
          <span className="badge bg-slate-100 text-slate-700">{tool.method}</span>
        </div>

        {tool.description && (
          <p className="mt-6 text-slate-700 leading-relaxed">{tool.description}</p>
        )}

        <section className="mt-10 card p-6">
          <h2 className="font-semibold">Call this tool</h2>
          <p className="text-sm text-slate-600 mt-1">
            AI agents and clients can hit the proxy URL below. ToolRelay forwards the request to the
            owner's API, logs usage, and returns the response.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <div className="label">Proxy URL</div>
              <div className="flex gap-2">
                <input readOnly value={proxyUrl} className="input font-mono text-xs" />
                <CopyButton value={proxyUrl} />
              </div>
            </div>
            <div>
              <div className="label">cURL</div>
              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre">
                  {curl}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton value={curl} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {tool.input_schema && (
          <section className="mt-6 card p-6">
            <h2 className="font-semibold">Input schema</h2>
            <pre className="mt-3 bg-slate-50 border border-slate-200 text-xs rounded-lg p-3 overflow-x-auto">
              {JSON.stringify(tool.input_schema, null, 2)}
            </pre>
          </section>
        )}

        {tool.output_example && (
          <section className="mt-6 card p-6">
            <h2 className="font-semibold">Example response</h2>
            <pre className="mt-3 bg-slate-50 border border-slate-200 text-xs rounded-lg p-3 overflow-x-auto">
              {JSON.stringify(tool.output_example, null, 2)}
            </pre>
          </section>
        )}

        <section className="mt-10 text-center">
          <p className="text-sm text-slate-500">
            Have your own API?{' '}
            <Link href="/signup" className="text-brand-700 hover:underline">
              Wrap it on ToolRelay
            </Link>
            .
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function exampleFromSchema(schema: any): unknown {
  if (!schema || typeof schema !== 'object') return {};
  if (schema.example) return schema.example;
  if (schema.type === 'object' && schema.properties && typeof schema.properties === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(schema.properties as Record<string, any>)) {
      out[k] = exampleFromSchema(v);
    }
    return out;
  }
  if (schema.type === 'string') return 'string';
  if (schema.type === 'number' || schema.type === 'integer') return 0;
  if (schema.type === 'boolean') return false;
  if (schema.type === 'array') return [];
  return {};
}
