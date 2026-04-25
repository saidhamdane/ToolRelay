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

- `POST /api/tools` — create a tool (auth required, plan limits enforced)
- `DELETE /api/tools/[id]` — delete a tool you own
- `GET /api/run/[slug]` & `POST /api/run/[slug]` — proxy that forwards to the
  configured endpoint, enforces monthly run caps, and logs each call
- `POST /api/stripe/checkout` — start a Pro upgrade Checkout session
- `POST /api/stripe/webhook` — Stripe webhook (subscription state sync)
- `GET /api/auth/callback` — email-confirm / OAuth callback

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
