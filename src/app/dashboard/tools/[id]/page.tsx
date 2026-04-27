import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAppBaseUrl } from '@/lib/app-url';
import { CopyButton } from '@/components/CopyButton';
import { DeleteToolButton } from './DeleteToolButton';
import { RegenerateKeyButton } from './RegenerateKeyButton';

export const dynamic = 'force-dynamic';

export default async function ToolDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: tool } = await supabase
    .from('tools')
    .select('id, name, slug, description, endpoint_url, method, auth_header_name, auth_header_value, input_schema, output_example, is_public, created_at')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!tool) notFound();

  const { data: logs } = await supabase
    .from('usage_logs')
    .select('id, status_code, latency_ms, error_message, created_at')
    .eq('tool_id', tool.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: keyRow } = await supabase
    .from('tool_api_keys')
    .select('key_prefix, created_at')
    .eq('tool_id', tool.id)
    .maybeSingle();

  const appUrl = getAppBaseUrl();
  const proxyUrl = `${appUrl}/api/run/${tool.slug}`;
  const mcpUrl = `${appUrl}/api/mcp/${tool.slug}`;
  const publicUrl = `${appUrl}/tool/${tool.slug}`;

  const exampleBody = JSON.stringify(
    tool.input_schema && typeof tool.input_schema === 'object'
      ? exampleFromSchema(tool.input_schema)
      : { hello: 'world' }
  );

  const keyHeaderLine = tool.is_public
    ? ''
    : ` \\\n  -H 'x-toolrelay-key: YOUR_KEY'`;

  const curlExample =
    tool.method === 'GET'
      ? `curl '${proxyUrl}'${keyHeaderLine}`
      : `curl -X POST '${proxyUrl}'${keyHeaderLine} \\\n  -H 'content-type: application/json' \\\n  -d '${exampleBody}'`;

  const mcpCurl = `curl -i -X POST '${mcpUrl}'${keyHeaderLine} \\\n  -H 'content-type: application/json' \\\n  -d '{"arguments":${exampleBody}}'`;

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mt-1">{tool.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
            <span className="badge bg-slate-100 text-slate-700">{tool.method}</span>
            <span
              className={`badge ${
                tool.is_public ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {tool.is_public ? 'Public' : 'Private'}
            </span>
            <span className="font-mono text-xs">/tool/{tool.slug}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {tool.is_public && (
            <Link href={`/tool/${tool.slug}`} className="btn-secondary">
              View public page
            </Link>
          )}
          <DeleteToolButton id={tool.id} />
        </div>
      </div>

      {tool.description && <p className="text-slate-700">{tool.description}</p>}

      <section className="card p-6 space-y-5">
        <h2 className="font-semibold">Endpoints</h2>
        <UrlRow label="Proxy URL (call this from agents)" value={proxyUrl} />
        {tool.is_public && <UrlRow label="Public tool page" value={publicUrl} />}
        <div>
          <div className="label">cURL example</div>
          <div className="relative">
            <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre">
              {curlExample}
            </pre>
            <div className="absolute top-2 right-2">
              <CopyButton value={curlExample} />
            </div>
          </div>
        </div>
      </section>

      <section className="card p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">MCP integration</h2>
            <span className="badge bg-brand-100 text-brand-700">MCP-ready</span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            POST {`{ "arguments": { … } }`} to the MCP endpoint and ToolRelay forwards the
            arguments to your upstream, returning an MCP-style{' '}
            <code className="font-mono">{`{ content: [{ type: "text", text }] }`}</code>{' '}
            wrapper.{' '}
            {tool.is_public ? (
              <span>This tool is public — no header required.</span>
            ) : (
              <span>
                Private tool —{' '}
                <code className="font-mono">x-toolrelay-key</code> required on every call.
              </span>
            )}
          </p>
        </div>
        <UrlRow label="MCP endpoint" value={mcpUrl} />
        <div>
          <div className="label">cURL example</div>
          <div className="relative">
            <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre">
              {mcpCurl}
            </pre>
            <div className="absolute top-2 right-2">
              <CopyButton value={mcpCurl} />
            </div>
          </div>
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">API key</h2>
            <p className="text-sm text-slate-600 mt-1">
              {tool.is_public
                ? 'Public tools are open by default — no API key required. Mark a tool private to enforce this key on every call.'
                : `Required on every call as the ${'`x-toolrelay-key`'} header.`}
            </p>
          </div>
        </div>
        {keyRow ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Prefix</div>
                <div className="font-mono text-sm">
                  {keyRow.key_prefix}
                  <span className="text-slate-400">••••••••••••••••••••</span>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Created {new Date(keyRow.created_at).toLocaleString()}
              </div>
            </div>
            <p className="help mt-2">
              The full key was shown only at generation time. Regenerate to get a new one — the
              previous key stops working immediately.
            </p>
          </div>
        ) : tool.is_public ? (
          <p className="text-sm text-slate-600">
            No API key on file yet. Generating one is optional for public tools.
          </p>
        ) : (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>This private tool has no API key configured.</strong> Calls to{' '}
            <code className="font-mono">/api/run/{tool.slug}</code> will return{' '}
            <code className="font-mono">401 api_key_not_configured</code> until you generate one.
          </div>
        )}
        <RegenerateKeyButton toolId={tool.id} hasKey={!!keyRow} />
      </section>

      <section className="card p-6 space-y-3">
        <h2 className="font-semibold">Configuration</h2>
        <DetailRow label="Endpoint" value={tool.endpoint_url} mono />
        <DetailRow label="Method" value={tool.method} />
        <DetailRow
          label="Auth header"
          value={
            tool.auth_header_name
              ? `${tool.auth_header_name}: ${tool.auth_header_value ? '••••••••' : '—'}`
              : 'None'
          }
        />
        {tool.input_schema && (
          <div>
            <div className="label">Input schema</div>
            <pre className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-3 overflow-x-auto">
              {JSON.stringify(tool.input_schema, null, 2)}
            </pre>
          </div>
        )}
        {tool.output_example && (
          <div>
            <div className="label">Output example</div>
            <pre className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-3 overflow-x-auto">
              {JSON.stringify(tool.output_example, null, 2)}
            </pre>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent runs</h2>
          <Link href="/dashboard/usage" className="text-sm text-brand-700 hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-3 card overflow-hidden">
          {!logs || logs.length === 0 ? (
            <div className="p-6 text-sm text-slate-500 text-center">No runs yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-3">When</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Latency</th>
                  <th className="text-left p-3">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="p-3 font-mono text-xs">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <StatusPill code={l.status_code} />
                    </td>
                    <td className="p-3">{l.latency_ms != null ? `${l.latency_ms} ms` : '—'}</td>
                    <td className="p-3 text-slate-600 truncate max-w-xs">{l.error_message || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function UrlRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="flex gap-2">
        <input readOnly value={value} className="input font-mono text-xs" />
        <CopyButton value={value} />
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <div className="text-xs uppercase tracking-wide text-slate-500 sm:w-32">{label}</div>
      <div className={mono ? 'font-mono text-sm break-all' : 'text-sm'}>{value}</div>
    </div>
  );
}

function StatusPill({ code }: { code: number | null }) {
  if (code == null) return <span className="badge bg-slate-100 text-slate-700">—</span>;
  if (code >= 500) return <span className="badge bg-red-100 text-red-700">{code}</span>;
  if (code >= 400) return <span className="badge bg-amber-100 text-amber-700">{code}</span>;
  return <span className="badge bg-emerald-100 text-emerald-700">{code}</span>;
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
