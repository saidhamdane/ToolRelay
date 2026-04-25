# ToolRelay

Turn any API into an AI-agent-ready paid tool — in minutes.

ToolRelay wraps an API endpoint in a public tool page, a proxy URL agents can
call, usage tracking, and Stripe-billed subscription limits.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres + RLS)
- Stripe (Subscriptions + Checkout + Webhooks)
- Vercel-ready deployment

## Quickstart

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev
```

Open http://localhost:3000.

## Environment variables

Copy `.env.example` → `.env.local` and fill these in:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (server only — never ship to the browser) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_…`) |
| `NEXT_PUBLIC_STRIPE_PRICE_PRO` | Stripe Price ID for the Pro plan |
| `NEXT_PUBLIC_APP_URL` | Public URL (e.g. `http://localhost:3000` or your Vercel URL) |

## Database setup

The full schema lives at `supabase/migrations/0001_init.sql`. Apply it with
either of:

**Supabase SQL editor** — paste the file contents and run.

**Supabase CLI**:

```bash
supabase db push
```

This creates `profiles`, `tools`, `usage_logs`, and `subscriptions` with RLS
policies and a trigger that creates a profile row on auth signup.

## Stripe setup

1. Create a Product → recurring monthly Price for the Pro plan ($19/mo by
   default — adjust to taste). Copy its Price ID into `NEXT_PUBLIC_STRIPE_PRICE_PRO`.
2. Set up a webhook endpoint in the Stripe dashboard pointing at
   `https://YOUR_APP/api/stripe/webhook` for these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
3. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

For local testing:

```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

## Routes

### Pages

- `/` — landing page (hero, steps, use cases, pricing, FAQ, CTA)
- `/login`, `/signup` — Supabase auth (email/password)
- `/dashboard` — overview with plan, tool count, monthly runs, tools list
- `/dashboard/tools/new` — create a tool
- `/dashboard/tools/[id]` — tool detail, proxy URL, cURL, recent runs, delete
- `/dashboard/usage` — last 100 runs across all tools
- `/pricing` — Free vs Pro, upgrade button
- `/tool/[slug]` — public tool page with proxy URL & cURL example
- `/terms`, `/privacy` — legal

### API

- `POST /api/tools` — create a tool (auth required, plan limits enforced); the
  response includes the freshly-generated API key once
- `POST /api/tools/[id]/key` — regenerate the API key for a tool you own; the
  response includes the new plaintext key once
- `DELETE /api/tools/[id]` — delete a tool you own
- `GET /api/run/[slug]` & `POST /api/run/[slug]` — proxy that forwards to the
  configured endpoint, enforces monthly run caps, requires an
  `x-toolrelay-key` header for private tools, and logs each call
- `POST /api/stripe/checkout` — start a Pro upgrade Checkout session
- `POST /api/stripe/webhook` — Stripe webhook (subscription state sync)
- `GET /api/auth/callback` — email-confirm / OAuth callback

## Per-tool API keys

Every tool gets an API key on creation. The plaintext value is returned **once**
(in the create-tool response and shown on the form's success screen) and never
displayed again — only the prefix and creation timestamp are stored on disk.
The full key is hashed with SHA-256 before being persisted.

- **Public tools** are open by default and ignore the key — anyone with the
  slug can call the proxy.
- **Private tools** require the key on every request as the
  `x-toolrelay-key` header. Missing or invalid keys return a 401 and are
  recorded in `usage_logs` with `status_code: 401` and either
  `unauthorized_missing_key` or `unauthorized_invalid_key` in `error_message`.

You can regenerate a key from the tool detail page. Regeneration immediately
invalidates the previous key.

### Example calls

Public tool — no key needed:

```bash
curl -X POST "$NEXT_PUBLIC_APP_URL/api/run/public-tool" \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}'
```

Private tool — key required:

```bash
curl -X POST "$NEXT_PUBLIC_APP_URL/api/run/private-tool" \
  -H "Content-Type: application/json" \
  -H "x-toolrelay-key: trk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -d '{"message":"hello"}'
```

GET-method tools work the same way — just attach the header:

```bash
curl "$NEXT_PUBLIC_APP_URL/api/run/private-get-tool" \
  -H "x-toolrelay-key: trk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

## Plan limits

| | Free | Pro |
| --- | --- | --- |
| Tools | 1 | 10 |
| Runs / month | 100 | 10,000 |
| Private tools | – | ✓ |
| Custom auth headers | – | ✓ |
| Price | $0 | $19 / mo |

Limits are enforced server-side at create time and at every proxy call.

## Security notes

- `auth_header_value` is never displayed in the dashboard or public tool page
  after save (only a `••••••••` placeholder).
- Endpoint URLs are validated to reject `localhost`, `*.local`, `*.internal`,
  and private IPv4/IPv6 ranges to mitigate SSRF.
- Service-role Supabase access is restricted to API/server contexts (proxy and
  Stripe webhook); never exposed to the browser.
- The Stripe webhook verifies the signature against `STRIPE_WEBHOOK_SECRET`.
- Run cap is checked before each proxy call; over-quota requests are rejected
  with `429`.

## Troubleshooting `/api/run/[slug]`

The proxy returns structured JSON for every error, with the shape:

```json
{
  "error": "upstream_fetch_failed",
  "message": "Could not reach the upstream API",
  "upstream_host": "httpbin.org",
  "details": "ENOTFOUND: getaddrinfo ENOTFOUND ..."
}
```

Possible `error` codes and what they mean:

| `error` | HTTP | Meaning | Fix |
| --- | --- | --- | --- |
| `server_misconfigured` | 500 | `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_SUPABASE_URL` is missing in the deployment env | Set both vars on Vercel and redeploy |
| `tool_lookup_failed` | 500 | DB lookup failed (RLS / network / migrations not applied) | Check Supabase status; re-run `supabase/migrations/0001_init.sql` |
| `tool_not_found` | 404 | No `tools` row matches the slug | Verify the slug in the dashboard |
| `invalid_endpoint` | 500 | Saved `endpoint_url` was rejected by the SSRF guard (localhost, private IP, non-http(s)) | Edit the tool to use a public https URL |
| `unauthorized_missing_key` | 401 | Private tool was called without an `x-toolrelay-key` header | Send the header on every request |
| `unauthorized_invalid_key` | 401 | Header present but the value doesn't match the tool's stored hash | Send the current key; regenerate from the tool detail page if lost |
| `api_key_not_configured` | 401 | Tool is marked private but has no row in `tool_api_keys` | Open the tool detail page and click **Generate API key** |
| `auth_lookup_failed` | 500 | Could not query `tool_api_keys` (RLS / missing migration) | Apply `0002_tool_api_keys.sql` and check service-role permissions |
| `plan_limit_exceeded` | 429 | Owner is past their monthly run cap | Upgrade plan or wait for the reset |
| `upstream_fetch_failed` | 502 | Network / DNS / TLS error or non-HTTP response from upstream | See `details` for the underlying code (`ENOTFOUND`, `ECONNRESET`, `CERT_HAS_EXPIRED`, …) |
| `upstream_timeout` *(in `details`)* | 502 | Upstream took longer than 25s | Speed up the upstream or shorten its work |
| `internal_error` | 500 | Last-resort guard caught an unexpected throw — see `details` and Vercel logs | Open the Vercel function logs for the stack trace |

### Quick smoke test

After deploying, create a tool that proxies `https://httpbin.org/post`
(method `POST`, no auth header, public) and run:

```bash
curl -i -X POST "$NEXT_PUBLIC_APP_URL/api/run/<slug>" \
  -H 'Content-Type: application/json' \
  -d '{"message":"hello from ToolRelay"}'
```

Expected: `HTTP/2 200`, JSON response from httpbin echoing the body, and a
new row in `usage_logs` for that tool.

### Verifying the private-tool auth guard

After every deploy that touches `/api/run/[slug]`, walk through this checklist:

1. In the dashboard, create a tool (or open an existing one) and toggle it
   to **Private**. Confirm the tool detail page shows an amber warning if no
   key has been generated, then click **Generate API key** and copy the value.
   Confirm in Supabase that `tools.is_public` is the literal boolean `false`
   for that slug.

2. Hit the proxy **without** the header — must be 401:

   ```bash
   curl -i -X POST "$NEXT_PUBLIC_APP_URL/api/run/<slug>" \
     -H 'Content-Type: application/json' \
     -d '{"message":"test without key"}'
   # expected: HTTP/2 401
   # body: {"error":"unauthorized_missing_key", ...}
   ```

3. Hit it **with a wrong key** — must be 401, distinct code:

   ```bash
   curl -i -X POST "$NEXT_PUBLIC_APP_URL/api/run/<slug>" \
     -H 'Content-Type: application/json' \
     -H 'x-toolrelay-key: trk_definitely_not_real' \
     -d '{"message":"test wrong key"}'
   # expected: HTTP/2 401
   # body: {"error":"unauthorized_invalid_key", ...}
   ```

4. Hit it **with the real key** — must be 200 and proxied:

   ```bash
   curl -i -X POST "$NEXT_PUBLIC_APP_URL/api/run/<slug>" \
     -H 'Content-Type: application/json' \
     -H "x-toolrelay-key: $REAL_KEY" \
     -d '{"message":"hello"}'
   # expected: HTTP/2 200, httpbin's JSON echo
   ```

5. **Cross-check Vercel logs.** A successful private call must show, in order:

   ```
   [run] handler entered { slug: '<slug>', method: 'POST' }
   [run] private guard entered { slug: '<slug>', is_public: false, ... }
   [run] private guard passed { slug: '<slug>' }
   [run] before upstream fetch { slug: '<slug>', is_public: false, ... }
   ```

   If you see `[run] before upstream fetch` for a private tool *without* the
   `[run] private guard passed` line above it, the guard has been bypassed —
   open an issue. If you see no `[run] handler entered` line at all, Vercel
   is serving stale function output: redeploy with the cache cleared.

6. Confirm `usage_logs` has rows for steps 2, 3 and 4 with `status_code` 401,
   401, 200 respectively. Step 4 should also have a non-null `latency_ms`.

### Common fixes

- **All proxy calls 500 with no body** → `SUPABASE_SERVICE_ROLE_KEY` is not set
  in Vercel. Set it under Project Settings → Environment Variables, then redeploy.
- **`upstream_fetch_failed` with `ENOTFOUND`** → DNS issue or typo in the
  endpoint URL. Resolve the host locally and verify it's reachable.
- **`upstream_fetch_failed` with `CERT_HAS_EXPIRED`** → Upstream's TLS cert is
  invalid; ToolRelay does not bypass cert validation.
- **`upstream_fetch_failed` with no `details`** and short latency → Upstream
  closed the connection. Confirm it accepts the configured method (`GET` vs
  `POST`) and Content-Type.

The proxy's `upstream_host` field intentionally returns only the host (no
path) and `auth_header_value` is never logged or echoed back to clients.

## Deploy

The app is ready for Vercel. Set all env vars in the Vercel project, point
your Stripe webhook at `https://your-app.vercel.app/api/stripe/webhook`, and
push to the `main` branch.

## Scripts

```bash
npm run dev        # local dev server
npm run build      # production build
npm run start      # serve the production build
npm run lint       # next lint
npm run typecheck  # tsc --noEmit
```
