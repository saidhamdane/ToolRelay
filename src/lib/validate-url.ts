// Validate user-supplied endpoint URLs. Rejects internal/private targets to
// avoid SSRF (server-side request forgery) abuse via the proxy.
export function validateEndpointUrl(raw: string): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: 'Invalid URL' };
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, error: 'Only http(s) URLs are allowed' };
  }

  const host = url.hostname.toLowerCase();

  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return { ok: false, error: 'Localhost or internal hosts are not allowed' };
  }

  // Block obvious private IPv4 ranges. This is best-effort — production
  // deployments should also resolve DNS server-side and re-check the IP.
  const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const [a, b] = [parseInt(ipv4[1], 10), parseInt(ipv4[2], 10)];
    if (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 0
    ) {
      return { ok: false, error: 'Private/internal IP ranges are not allowed' };
    }
  }

  // IPv6 link-local / loopback / ULA
  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) {
    return { ok: false, error: 'Private IPv6 ranges are not allowed' };
  }

  return { ok: true, url };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/.test(slug);
}
