import { headers } from 'next/headers';

/**
 * Resolve the canonical base URL for displayed proxy/tool URLs.
 *
 * Order:
 *  1. NEXT_PUBLIC_APP_URL (production source of truth — set this to
 *     https://tool-relay.vercel.app or your custom domain).
 *  2. Reconstruct from the incoming request's host header. This catches the
 *     case where the env var is missing on a particular deploy and prevents
 *     the dashboard from showing stale or `localhost` URLs.
 *  3. Final fallback: http://localhost:3000 (only used outside a request).
 */
export function getAppBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/$/, '');

  try {
    const h = headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    if (host) {
      const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
      return `${proto}://${host}`;
    }
  } catch {
    // `headers()` is only available inside request scope. Fall through.
  }

  return 'http://localhost:3000';
}
