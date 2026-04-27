import { NextResponse, type NextRequest } from 'next/server';
import { runTool } from '@/lib/run-tool';

const API_KEY_HEADER = 'x-toolrelay-key';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const maxDuration = 30;

async function handle(request: NextRequest, slug: string): Promise<NextResponse> {
  console.log('[run] handler entered', { slug, method: request.method });

  // Read the inbound body once. The shared executor will only forward it
  // when the tool's stored method is POST.
  let bodyText: string | null = null;
  if (request.method !== 'GET') {
    try {
      bodyText = await request.text();
    } catch {
      bodyText = '';
    }
  }

  const apiKey = (request.headers.get(API_KEY_HEADER) ?? '').trim() || null;

  const result = await runTool({ slug, apiKey, bodyText, logTag: '[run]' });

  if (result.kind === 'error') {
    return NextResponse.json(result.payload, { status: result.status });
  }

  // Forward upstream response. Prefer JSON when possible — fall back to
  // passthrough when upstream's content-type doesn't match its body.
  if (result.upstreamContentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(result.upstreamBody);
      return NextResponse.json(parsed, { status: result.status });
    } catch {
      // Upstream lied about its content-type; fall through to text passthrough.
    }
  }
  return new NextResponse(result.upstreamBody, {
    status: result.status,
    headers: { 'content-type': result.upstreamContentType },
  });
}

async function safeHandle(request: NextRequest, slug: string): Promise<NextResponse> {
  try {
    return await handle(request, slug);
  } catch (e: any) {
    console.error('[run] uncaught error:', e);
    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Unexpected error in proxy handler',
        details: e?.message ?? 'unknown',
      },
      { status: 500 }
    );
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
      'access-control-allow-headers': 'content-type, authorization, x-toolrelay-key',
      'access-control-max-age': '86400',
    },
  });
}
