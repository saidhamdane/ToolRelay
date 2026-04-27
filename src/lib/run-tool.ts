import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from './supabase/admin';
import { getUserUsageContext } from './usage';
import { validateEndpointUrl } from './validate-url';
import { hashApiKey } from './api-keys';

// Shared proxy executor used by both /api/run/[slug] (raw HTTP proxy) and
// /api/mcp/[slug] (MCP-style tool call). Centralises tool lookup, auth gate,
// SSRF validation, plan/usage cap, upstream fetch with timeout, and
// usage_logs writes so the two surfaces can never drift.

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

export interface RunToolInput {
  slug: string;
  /** Trimmed value of the x-toolrelay-key header, or null if absent. */
  apiKey: string | null;
  /** Raw POST body text from the caller. Ignored if the tool's method is GET. */
  bodyText: string | null;
  /** Tag used for diagnostic console logs (e.g. "[run]" or "[mcp]"). */
  logTag?: string;
}

export type RunToolErrorCode =
  | 'server_misconfigured'
  | 'tool_lookup_failed'
  | 'tool_not_found'
  | 'invalid_endpoint'
  | 'unauthorized_missing_key'
  | 'api_key_not_configured'
  | 'unauthorized_invalid_key'
  | 'auth_lookup_failed'
  | 'plan_limit_exceeded'
  | 'upstream_fetch_failed';

export type RunToolResult =
  | {
      kind: 'success';
      status: number;
      upstreamBody: string;
      upstreamContentType: string;
      upstreamHost: string;
      latencyMs: number;
    }
  | {
      kind: 'error';
      status: number;
      payload: {
        error: RunToolErrorCode;
        message: string;
        upstream_host?: string;
        details?: string;
      };
    };

export async function runTool(input: RunToolInput): Promise<RunToolResult> {
  const tag = input.logTag ?? '[run-tool]';
  console.log(`${tag} handler entered`, { slug: input.slug });

  // 1. Service-role client.
  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch (e: any) {
    console.error(`${tag} admin client init failed:`, e?.message);
    return {
      kind: 'error',
      status: 500,
      payload: {
        error: 'server_misconfigured',
        message:
          'Supabase service-role credentials are missing on the server. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the deployment environment.',
        details: e?.message,
      },
    };
  }

  // 2. Tool lookup.
  let tool: ToolRow | null;
  try {
    const { data, error } = await admin
      .from('tools')
      .select(
        'id, user_id, slug, endpoint_url, method, auth_header_name, auth_header_value, is_public'
      )
      .eq('slug', input.slug)
      .maybeSingle();
    if (error) {
      console.error(`${tag} tool lookup error:`, error.message);
      return {
        kind: 'error',
        status: 500,
        payload: {
          error: 'tool_lookup_failed',
          message: 'Could not look up the tool',
          details: error.message,
        },
      };
    }
    tool = (data as ToolRow | null) ?? null;
  } catch (e: any) {
    console.error(`${tag} tool lookup threw:`, e?.message);
    return {
      kind: 'error',
      status: 500,
      payload: {
        error: 'tool_lookup_failed',
        message: 'Could not reach the database',
        details: e?.message ?? 'unknown',
      },
    };
  }

  if (!tool) {
    return {
      kind: 'error',
      status: 404,
      payload: {
        error: 'tool_not_found',
        message: `No tool with slug "${input.slug}"`,
      },
    };
  }

  // 3. Hard auth guard. is_public must be the literal `true` to skip the
  // key check; everything else (false, null, undefined) flows through the
  // private path. Fail closed.
  const isPublic = tool.is_public === true;
  if (!isPublic) {
    console.log(`${tag} private guard entered`, {
      slug: tool.slug,
      is_public: tool.is_public,
      is_public_type: typeof tool.is_public,
    });

    if (!input.apiKey) {
      await logRun(admin, tool.id, tool.user_id, 401, 0, 'unauthorized_missing_key');
      return {
        kind: 'error',
        status: 401,
        payload: {
          error: 'unauthorized_missing_key',
          message: 'Private tool requires x-toolrelay-key.',
        },
      };
    }

    const presentedHash = hashApiKey(input.apiKey);

    const { data: keyRow, error: keyErr } = await admin
      .from('tool_api_keys')
      .select('tool_id, key_hash')
      .eq('tool_id', tool.id)
      .maybeSingle();

    if (keyErr) {
      console.error(`${tag} api key lookup error:`, keyErr.message);
      return {
        kind: 'error',
        status: 500,
        payload: {
          error: 'auth_lookup_failed',
          message: 'Could not validate API key',
          details: keyErr.message,
        },
      };
    }

    if (!keyRow) {
      await logRun(admin, tool.id, tool.user_id, 401, 0, 'api_key_not_configured');
      return {
        kind: 'error',
        status: 401,
        payload: {
          error: 'api_key_not_configured',
          message:
            'This private tool has no API key configured. The owner must generate one in the dashboard.',
        },
      };
    }

    if (keyRow.key_hash !== presentedHash) {
      await logRun(admin, tool.id, tool.user_id, 401, 0, 'unauthorized_invalid_key');
      return {
        kind: 'error',
        status: 401,
        payload: {
          error: 'unauthorized_invalid_key',
          message: 'Invalid API key for this tool.',
        },
      };
    }

    console.log(`${tag} private guard passed`, { slug: tool.slug });
  }

  // 4. SSRF guard.
  const urlCheck = validateEndpointUrl(tool.endpoint_url);
  if (!urlCheck.ok) {
    return {
      kind: 'error',
      status: 500,
      payload: {
        error: 'invalid_endpoint',
        message: 'The configured endpoint URL is not allowed',
        details: urlCheck.error,
      },
    };
  }
  const upstreamUrl = urlCheck.url;
  const upstreamHost = upstreamUrl.host;

  // 5. Plan/usage cap. Failure of the metering query alone never blocks a
  // run — log and continue.
  try {
    const usage = await getUserUsageContext(tool.user_id);
    if (usage.monthlyRuns >= usage.plan.maxRunsPerMonth) {
      await logRun(admin, tool.id, tool.user_id, 429, 0, 'plan_run_limit_exceeded');
      return {
        kind: 'error',
        status: 429,
        payload: {
          error: 'plan_limit_exceeded',
          message: `Tool owner has used ${usage.monthlyRuns}/${usage.plan.maxRunsPerMonth} runs this month`,
          upstream_host: upstreamHost,
        },
      };
    }
  } catch (e: any) {
    console.error(`${tag} usage context failed (continuing):`, e?.message);
  }

  // 6. Build upstream request.
  const method: 'GET' | 'POST' = tool.method === 'GET' ? 'GET' : 'POST';
  const headers: Record<string, string> = { accept: 'application/json' };
  if (method === 'POST') headers['content-type'] = 'application/json';
  if (tool.auth_header_name && tool.auth_header_value) {
    const headerName = tool.auth_header_name.trim();
    if (headerName) headers[headerName] = tool.auth_header_value;
  }

  let bodyToSend: string | undefined;
  if (method === 'POST') {
    const raw = input.bodyText ?? '';
    if (raw && raw.trim().length) {
      try {
        JSON.parse(raw);
        bodyToSend = raw;
      } catch {
        bodyToSend = JSON.stringify({ raw });
      }
    } else {
      bodyToSend = '{}';
    }
  }

  console.log(`${tag} before upstream fetch`, {
    slug: input.slug,
    is_public: tool.is_public,
    method,
    upstreamHost,
  });

  // 7. Upstream fetch with timeout.
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
      body: method === 'POST' ? bodyToSend : undefined,
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
      const cause = e?.cause as
        | { code?: string; errno?: string | number; message?: string }
        | undefined;
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

  // 8. Always log usage, success or failure.
  await logRun(
    admin,
    tool.id,
    tool.user_id,
    status > 0 ? status : null,
    latencyMs,
    errorMessage
  );

  if (errorMessage) {
    console.error(`${tag} upstream fetch failed`, {
      slug: input.slug,
      upstreamHost,
      latencyMs,
      errorMessage,
      errorDetails,
    });
    return {
      kind: 'error',
      status: 502,
      payload: {
        error: 'upstream_fetch_failed',
        message: 'Could not reach the upstream API',
        upstream_host: upstreamHost,
        details: errorDetails ?? errorMessage,
      },
    };
  }

  return {
    kind: 'success',
    status,
    upstreamBody,
    upstreamContentType,
    upstreamHost,
    latencyMs,
  };
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
    if (error) console.error('[run-tool] usage_logs insert error:', error.message);
  } catch (e: any) {
    console.error('[run-tool] usage_logs insert threw:', e?.message);
  }
}
