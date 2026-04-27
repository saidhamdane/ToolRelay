import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { CopyButton } from '@/components/CopyButton';
import { getAppBaseUrl } from '@/lib/app-url';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'MCP integration — ToolRelay',
  description:
    'Turn any API into an MCP-ready tool for AI agents with ToolRelay. Public and private tools, per-tool API keys, plan limits, usage logs.',
};

export default function McpPage() {
  const appUrl = getAppBaseUrl();
  const exampleSlug = 'private-pro-test';
  const mcpEndpoint = `${appUrl}/api/mcp/${exampleSlug}`;
  const runEndpoint = `${appUrl}/api/run/${exampleSlug}`;

  const configJson = JSON.stringify(
    {
      name: exampleSlug,
      description: 'Example ToolRelay tool',
      endpoint: mcpEndpoint,
      method: 'POST',
      security: 'x-toolrelay-key required',
      headers: { 'x-toolrelay-key': 'trk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      input_schema: {
        type: 'object',
        properties: { message: { type: 'string' } },
        required: ['message'],
      },
    },
    null,
    2
  );

  const curlPrivate = `curl -i -X POST "${mcpEndpoint}" \\
  -H "Content-Type: application/json" \\
  -H "x-toolrelay-key: trk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\
  -d '{"arguments":{"message":"hello from an agent"}}'`;

  const curlPublic = `curl -i -X POST "${appUrl}/api/mcp/your-public-slug" \\
  -H "Content-Type: application/json" \\
  -d '{"arguments":{"message":"hello"}}'`;

  const metadataExample = `{
  "name": "${exampleSlug}",
  "description": "Example ToolRelay tool",
  "input_schema": { ... },
  "output_example": { ... },
  "method": "POST",
  "endpoint": "${mcpEndpoint}",
  "run_endpoint": "${runEndpoint}",
  "security": "x-toolrelay-key required"
}`;

  const wrappedResponse = `{
  "content": [
    { "type": "text", "text": "{\\"echoed\\":\\"hello from an agent\\"}" }
  ],
  "upstream_status": 200
}`;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16 space-y-12">
        <header className="text-center">
          <span className="badge bg-brand-100 text-brand-700">MCP integration</span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight">
            Turn any API into an MCP-ready tool
          </h1>
          <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
            ToolRelay's MCP mode exposes every tool you create as an MCP-compatible JSON
            endpoint. AI agents can discover the schema, call the tool with structured
            arguments, and receive a wrapped response — with auth, plan limits, and usage
            logging handled for you.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="btn-primary">
              Create your first MCP tool
            </Link>
            <Link href="/dashboard/tools/new" className="btn-secondary">
              Open the dashboard
            </Link>
          </div>
        </header>

        <section className="card p-6 sm:p-8">
          <h2 className="text-xl font-semibold">How a ToolRelay tool maps to MCP</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-700 list-disc list-inside">
            <li>
              The <strong>tool slug</strong> becomes the MCP tool <code className="font-mono">name</code>.
            </li>
            <li>
              The <strong>description</strong>, <strong>input_schema</strong>, and{' '}
              <strong>output_example</strong> you provide are returned by the metadata endpoint
              so agents can present and validate inputs.
            </li>
            <li>
              <strong>POST</strong> calls accept{' '}
              <code className="font-mono">{'{ "arguments": { ... } }'}</code>; ToolRelay forwards the
              arguments to your upstream URL and wraps the response.
            </li>
            <li>
              <strong>Public tools</strong> are open. <strong>Private tools</strong> require an{' '}
              <code className="font-mono">x-toolrelay-key</code> header.
            </li>
          </ul>
        </section>

        <section className="card p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">Endpoint URLs</h2>
          <p className="text-sm text-slate-600">
            Each tool you create exposes both an MCP endpoint and a raw HTTP proxy. They share the
            same auth, plan limits, and usage log writes — they only differ in response shape.
          </p>
          <div>
            <div className="label">MCP endpoint</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                readOnly
                value={mcpEndpoint}
                className="input font-mono text-xs"
              />
              <CopyButton value={mcpEndpoint} />
            </div>
          </div>
          <div>
            <div className="label">Raw HTTP proxy</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                readOnly
                value={runEndpoint}
                className="input font-mono text-xs"
              />
              <CopyButton value={runEndpoint} />
            </div>
          </div>
        </section>

        <section className="card p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">GET — tool metadata</h2>
          <p className="text-sm text-slate-600">
            <code className="font-mono">GET /api/mcp/[slug]</code> returns the tool's discovery
            payload. Agents can use this to populate their tool registry.
          </p>
          <div className="relative">
            <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre">
              {metadataExample}
            </pre>
            <div className="absolute top-2 right-2">
              <CopyButton value={metadataExample} />
            </div>
          </div>
        </section>

        <section className="card p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold">POST — call the tool</h2>
          <p className="text-sm text-slate-600">
            <code className="font-mono">POST /api/mcp/[slug]</code> accepts a JSON body with an{' '}
            <code className="font-mono">arguments</code> object. ToolRelay forwards the arguments
            to your upstream endpoint and returns the response wrapped in MCP-style content.
          </p>
          <div>
            <div className="label">Private tool example</div>
            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre">
                {curlPrivate}
              </pre>
              <div className="absolute top-2 right-2">
                <CopyButton value={curlPrivate} />
              </div>
            </div>
          </div>
          <div>
            <div className="label">Public tool example</div>
            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre">
                {curlPublic}
              </pre>
              <div className="absolute top-2 right-2">
                <CopyButton value={curlPublic} />
              </div>
            </div>
          </div>
          <div>
            <div className="label">Wrapped response</div>
            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre">
                {wrappedResponse}
              </pre>
              <div className="absolute top-2 right-2">
                <CopyButton value={wrappedResponse} />
              </div>
            </div>
          </div>
        </section>

        <section className="card p-6 sm:p-8 space-y-3">
          <h2 className="text-xl font-semibold">JSON config example</h2>
          <p className="text-sm text-slate-600">
            Drop this into an MCP client / agent config to register the tool by URL.
          </p>
          <div className="relative">
            <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre">
              {configJson}
            </pre>
            <div className="absolute top-2 right-2">
              <CopyButton value={configJson} />
            </div>
          </div>
        </section>

        <section className="card p-6 sm:p-8 space-y-3 border-amber-200 bg-amber-50/50">
          <h2 className="text-xl font-semibold">Security notes</h2>
          <ul className="text-sm text-slate-700 space-y-2 list-disc list-inside">
            <li>
              <strong>Private MCP tools</strong> require a per-tool API key
              (<code className="font-mono">trk_…</code>) sent as{' '}
              <code className="font-mono">x-toolrelay-key</code>. Missing → 401{' '}
              <code className="font-mono">unauthorized_missing_key</code>; wrong → 401{' '}
              <code className="font-mono">unauthorized_invalid_key</code>.
            </li>
            <li>
              <strong>Public MCP tools</strong> ignore the header and accept anonymous traffic.
            </li>
            <li>
              The full <code className="font-mono">trk_</code> key is shown exactly once on
              creation and on regeneration. Only the prefix and SHA-256 hash are persisted.
            </li>
            <li>
              The upstream <code className="font-mono">endpoint_url</code> and any custom
              auth-header value are <em>never</em> echoed by the metadata endpoint — agents only
              see the ToolRelay-facing surface.
            </li>
            <li>
              SSRF guard rejects localhost / private IP ranges. Every upstream call has a 25s
              timeout. All calls are written to <code className="font-mono">usage_logs</code>.
            </li>
          </ul>
        </section>

        <section className="card p-6 sm:p-8 space-y-3 border-slate-200">
          <h2 className="text-xl font-semibold">Known limitation</h2>
          <p className="text-sm text-slate-700">
            This is an MCP-ready JSON interface MVP. Full MCP protocol transports (SSE / stdio)
            and capability negotiation will land in a follow-up. Agents that can call HTTP JSON
            endpoints with custom headers can use ToolRelay tools today.
          </p>
        </section>

        <section className="text-center">
          <Link href="/signup" className="btn-primary">
            Create your first MCP tool
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
