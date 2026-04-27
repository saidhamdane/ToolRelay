import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runTool } from '@/lib/run-tool';
import { getAppBaseUrl } from '@/lib/app-url';

const API_KEY_HEADER = 'x-toolrelay-key';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const maxDuration = 30;

// MCP-ready JSON interface MVP.
//
// GET  /api/mcp/[slug] -> tool metadata (name, description, schemas,
//                          endpoints, security model).
// POST /api/mcp/[slug] -> body { "arguments": {...} } is forwarded to the
//                          ToolRelay run pipeline; the upstream JSON is
//                          wrapped in MCP-style { content: [{ type, text }] }.
//
// Auth, plan caps, SSRF, timeout, and usage_logs are all delegated to the
// shared run-tool executor so /api/run and /api/mcp can never drift.

export async function GET(_request: NextRequest, { params }: { params: { slug: string } }) {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e: any) {
    return NextResponse.json(
      { error: 'server_misconfigured', message: e?.message ?? 'admin client unavailable' },
      { status: 500 }
    );
  }

  // Public-safe columns only — endpoint_url and auth_header_value never leak.
  const { data: tool, error } = await admin
    .from('tools')
    .select('slug, description, input_schema, output_example, is_public, method')
    .eq('slug', params.slug)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: 'tool_lookup_failed', message: error.message },
      { status: 500 }
    );
  }
  if (!tool) {
    return NextResponse.json(
      { error: 'tool_not_found', message: `No tool with slug "${params.slug}"` },
      { status: 404 }
    );
  }

  const appUrl = getAppBaseUrl();
  return NextResponse.json({
    name: tool.slug,
    description: tool.description ?? null,
    input_schema: tool.input_schema ?? null,
    output_example: tool.output_example ?? null,
    method: tool.method,
    endpoint: `${appUrl}/api/mcp/${tool.slug}`,
    run_endpoint: `${appUrl}/api/run/${tool.slug}`,
    security: tool.is_public ? 'public' : 'x-toolrelay-key required',
  });
}

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  console.log('[mcp] handler entered', { slug: params.slug });

  // Body shape: { arguments: {...} }. We also accept a raw object body so
  // legacy callers and curl one-liners work.
  let body: any = {};
  const raw = await request.text();
  if (raw && raw.trim().length) {
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: 'invalid_json', message: 'Request body must be valid JSON.' },
        { status: 400 }
      );
    }
  }

  const argsField = (body && typeof body === 'object' && body.arguments) || null;
  const argumentsObj =
    argsField && typeof argsField === 'object' ? argsField : body && typeof body === 'object' ? body : {};
  const argsBody = JSON.stringify(argumentsObj);

  const apiKey = (request.headers.get(API_KEY_HEADER) ?? '').trim() || null;

  const result = await runTool({
    slug: params.slug,
    apiKey,
    bodyText: argsBody,
    logTag: '[mcp]',
  });

  if (result.kind === 'error') {
    return NextResponse.json(result.payload, { status: result.status });
  }

  // Wrap upstream response in MCP-style content[]. If upstream returned JSON,
  // re-serialise it cleanly; otherwise embed the raw text as-is.
  let text = result.upstreamBody;
  if (result.upstreamContentType.includes('application/json')) {
    try {
      text = JSON.stringify(JSON.parse(result.upstreamBody));
    } catch {
      // Upstream lied about content-type; pass through original text.
    }
  }

  // upstream_status is non-MCP metadata that helps callers debug 5xx /
  // 4xx behaviour without re-parsing the wrapped text.
  return NextResponse.json({
    content: [{ type: 'text', text }],
    upstream_status: result.status,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization, x-toolrelay-key',
      'access-control-max-age': '86400',
    },
  });
}
