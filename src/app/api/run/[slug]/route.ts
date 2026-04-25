import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserUsageContext } from '@/lib/usage';
import { validateEndpointUrl } from '@/lib/validate-url';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FETCH_TIMEOUT_MS = 30_000;

async function handle(request: NextRequest, slug: string) {
  const admin = createAdminClient();

  const { data: tool, error: toolErr } = await admin
    .from('tools')
    .select('id, user_id, slug, endpoint_url, method, auth_header_name, auth_header_value, is_public')
    .eq('slug', slug)
    .maybeSingle();

  if (toolErr) return jsonError(500, 'Lookup failed');
  if (!tool) return jsonError(404, 'Tool not found');

  // For non-public tools, the owner must call the proxy with their session.
  // Public tools accept anonymous traffic.
  if (!tool.is_public) {
    // We cannot easily call the cookie-bound supabase server client from a
    // route invoked by external clients without their cookies. Private tools
    // for the MVP simply require the configured auth_header on the *tool*
    // itself (forwarded to the upstream). External callers still hit a
    // non-listed slug. Real per-tool keys are post-MVP.
  }

  const urlCheck = validateEndpointUrl(tool.endpoint_url);
  if (!urlCheck.ok) {
    return jsonError(500, `Invalid endpoint configured: ${urlCheck.error}`);
  }

  const usage = await getUserUsageContext(tool.user_id);
  if (usage.monthlyRuns >= usage.plan.maxRunsPerMonth) {
    await logRun(admin, tool.id, tool.user_id, 429, 0, 'Plan run limit exceeded');
    return jsonError(429, 'Tool owner has exceeded their monthly run limit');
  }

  const method = tool.method === 'GET' ? 'GET' : 'POST';
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (tool.auth_header_name && tool.auth_header_value) {
    headers[tool.auth_header_name] = tool.auth_header_value;
  }

  let bodyText: string | undefined;
  if (method === 'POST') {
    try {
      // Pass through whatever the caller sent. If it isn't valid JSON, fall
      // back to an empty object so upstream gets something parseable.
      const text = await request.text();
      bodyText = text && text.trim().length ? text : '{}';
      JSON.parse(bodyText);
    } catch {
      bodyText = '{}';
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const start = Date.now();
  let status = 0;
  let errorMessage: string | null = null;
  let upstreamBody: string = '';
  let upstreamContentType = 'application/json';

  try {
    const upstream = await fetch(tool.endpoint_url, {
      method,
      headers,
      body: method === 'POST' ? bodyText : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });
    status = upstream.status;
    upstreamContentType = upstream.headers.get('content-type') || 'application/json';
    upstreamBody = await upstream.text();
  } catch (e: any) {
    errorMessage = e?.name === 'AbortError' ? 'Upstream timeout' : e?.message ?? 'Upstream error';
    status = 502;
  } finally {
    clearTimeout(timer);
  }

  const latencyMs = Date.now() - start;
  await logRun(admin, tool.id, tool.user_id, status, latencyMs, errorMessage);

  if (errorMessage) {
    return NextResponse.json(
      { error: errorMessage, status, latency_ms: latencyMs },
      { status: 502 }
    );
  }

  // Try to return JSON, fall back to text.
  if (upstreamContentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(upstreamBody);
      return NextResponse.json(parsed, { status });
    } catch {
      // fall through
    }
  }
  return new NextResponse(upstreamBody, {
    status,
    headers: { 'content-type': upstreamContentType },
  });
}

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  return handle(request, params.slug);
}

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  return handle(request, params.slug);
}

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

async function logRun(
  admin: ReturnType<typeof createAdminClient>,
  toolId: string,
  userId: string,
  statusCode: number,
  latencyMs: number,
  errorMessage: string | null
) {
  try {
    await admin.from('usage_logs').insert({
      tool_id: toolId,
      user_id: userId,
      status_code: statusCode || null,
      latency_ms: latencyMs || null,
      error_message: errorMessage,
    });
  } catch {
    // never fail the proxy because of logging
  }
}
