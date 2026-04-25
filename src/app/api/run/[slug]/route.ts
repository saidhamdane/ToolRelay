import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserUsageContext } from '@/lib/usage';
import { validateEndpointUrl } from '@/lib/validate-url';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const FETCH_TIMEOUT_MS = 25_000;

interface ToolRow {
  id: string;
  user_id: string;
  slug: string;
  endpoint_url: string;
  method: 'GET' | 'POST';
  auth_header_name: string | null;
  auth_header_value: string | null;
  is_public: boolean;
}

type ProxyError = {
  error: string;
  message: string;
  upstream_host?: string;
  details?: string;
};

function errorJson(status: number, body: ProxyError) {
  return NextResponse.json(body, { status });
}

async function handle(request: NextRequest, slug: string): Promise<NextResponse> {
  // 1. Service-role client — fail loudly with structured JSON if env is wrong.
  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch (e: any) {
    console.error('[run] admin client init failed:', e?.message);
    return errorJson(500, {
      error: 'server_misconfigured',
      message:
        'Supabase service-role credentials are missing on the server. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the deployment environment.',
    });
  }

  // 2. Look up the tool by slug.
  let tool: ToolRow | null;
  try {
    const { data, error } = await admin
      .from('tools')
      .select(
        'id, user_id, slug, endpoint_url, method, auth_header_name, auth_header_value, is_public'
      )
      .eq('slug', slug)
      .maybeSingle();
    if (error) {
      console.error('[run] tool lookup error:', error.message);
      return errorJson(500, {
        error: 'tool_lookup_failed',
        message: 'Could not look up the tool',
        details: error.message,
      });
    }
    tool = (data as ToolRow | null) ?? null;
  } catch (e: any) {
    console.error('[run] tool lookup threw:', e?.message);
    return errorJson(500, {
      error: 'tool_lookup_failed',
      message: 'Could not reach the database',
      details: e?.message ?? 'unknown',
    });
  }

  if (!tool) {
    return errorJson(404, {
      error: 'tool_not_found',
      message: `No tool with slug "${slug}"`,
    });
  }

  // 3. Validate the configured endpoint (SSRF guard, http(s) only).
  const urlCheck = validateEndpointUrl(tool.endpoint_url);
  if (!urlCheck.ok) {
    return errorJson(500, {
      error: 'invalid_endpoint',
      message: 'The configured endpoint URL is not allowed',
      details: urlCheck.error,
    });
  }
  const upstreamUrl = urlCheck.url;
  const upstreamHost = upstreamUrl.host;

  // 4. Plan/usage gate. If the usage lookup itself fails, log and continue —
  // never block legitimate runs because the metering query had a hiccup.
  try {
    const usage = await getUserUsageContext(tool.user_id);
    if (usage.monthlyRuns >= usage.plan.maxRunsPerMonth) {
      await logRun(admin, tool.id, tool.user_id, 429, 0, 'plan_run_limit_exceeded');
      return errorJson(429, {
        error: 'plan_limit_exceeded',
        message: `Tool owner has used ${usage.monthlyRuns}/${usage.plan.maxRunsPerMonth} runs this month`,
        upstream_host: upstreamHost,
      });
    }
  } catch (e: any) {
    console.error('[run] usage context failed (continuing):', e?.message);
  }

  // 5. Build the upstream request.
  const method: 'GET' | 'POST' = tool.method === 'GET' ? 'GET' : 'POST';
  const headers: Record<string, string> = { accept: 'application/json' };
  if (method === 'POST') headers['content-type'] = 'application/json';
  if (tool.auth_header_name && tool.auth_header_value) {
    const headerName = tool.auth_header_name.trim();
    if (headerName) headers[headerName] = tool.auth_header_value;
  }

  let bodyText: string | undefined;
  if (method === 'POST') {
    try {
      const raw = await request.text();
      if (raw && raw.trim().length) {
        try {
          JSON.parse(raw);
          bodyText = raw;
        } catch {
          // Caller sent non-JSON. Wrap so upstream still gets valid JSON.
          bodyText = JSON.stringify({ raw });
        }
      } else {
        bodyText = '{}';
      }
    } catch {
      bodyText = '{}';
    }
  }

  // 6. Call upstream with a timeout. Capture the rich `error.cause` that Node
  // 18+ fetch attaches for DNS / TLS / network failures.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const start = Date.now();

  let status = 0;
  let upstreamBody = '';
  let upstreamContentType = 'application/json';
  let errorMessage: string | null = null;
  let errorDetails: string | null = null;

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      method,
      headers,
      body: method === 'POST' ? bodyText : undefined,
      signal: controller.signal,
      redirect: 'follow',
    });
    status = upstream.status;
    upstreamContentType = upstream.headers.get('content-type') || 'application/json';
    upstreamBody = await upstream.text();
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      errorMessage = 'upstream_timeout';
      errorDetails = `No response within ${FETCH_TIMEOUT_MS}ms`;
    } else {
      const cause = e?.cause as { code?: string; errno?: string | number; message?: string } | undefined;
      const code = cause?.code ?? cause?.errno;
      errorMessage = e?.message || 'fetch_failed';
      errorDetails = code
        ? `${code}${cause?.message ? `: ${cause.message}` : ''}`
        : cause?.message ?? null;
    }
    status = 502;
  } finally {
    clearTimeout(timer);
  }

  const latencyMs = Date.now() - start;

  // 7. Always log usage, even on failure.
  await logRun(
    admin,
    tool.id,
    tool.user_id,
    status > 0 ? status : null,
    latencyMs,
    errorMessage
  );

  if (errorMessage) {
    console.error('[run] upstream fetch failed', {
      slug,
      upstreamHost,
      latencyMs,
      errorMessage,
      errorDetails,
    });
    return errorJson(502, {
      error: 'upstream_fetch_failed',
      message: 'Could not reach the upstream API',
      upstream_host: upstreamHost,
      details: errorDetails ?? errorMessage,
    });
  }

  // 8. Forward upstream response. Prefer JSON when possible.
  if (upstreamContentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(upstreamBody);
      return NextResponse.json(parsed, { status });
    } catch {
      // Upstream lied about its content-type; pass through as text.
    }
  }
  return new NextResponse(upstreamBody, {
    status,
    headers: { 'content-type': upstreamContentType },
  });
}

async function safeHandle(request: NextRequest, slug: string): Promise<NextResponse> {
  try {
    return await handle(request, slug);
  } catch (e: any) {
    // Last-resort guard so the proxy never returns an empty 500.
    console.error('[run] uncaught error:', e);
    return errorJson(500, {
      error: 'internal_error',
      message: 'Unexpected error in proxy handler',
      details: e?.message ?? 'unknown',
    });
  }
}

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  return safeHandle(request, params.slug);
}

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  return safeHandle(request, params.slug);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
      'access-control-max-age': '86400',
    },
  });
}

async function logRun(
  admin: SupabaseClient,
  toolId: string,
  userId: string,
  statusCode: number | null,
  latencyMs: number,
  errorMessage: string | null
) {
  try {
    const { error } = await admin.from('usage_logs').insert({
      tool_id: toolId,
      user_id: userId,
      status_code: statusCode,
      latency_ms: latencyMs > 0 ? latencyMs : null,
      error_message: errorMessage,
    });
    if (error) console.error('[run] usage_logs insert error:', error.message);
  } catch (e: any) {
    console.error('[run] usage_logs insert threw:', e?.message);
  }
}
