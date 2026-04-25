import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe';
import { getAppBaseUrl } from '@/lib/app-url';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO?.trim();
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!stripeKey) {
    return NextResponse.json(
      {
        error: 'stripe_not_configured',
        message: 'STRIPE_SECRET_KEY is not set on the server.',
      },
      { status: 500 }
    );
  }
  if (!priceId) {
    return NextResponse.json(
      {
        error: 'stripe_price_not_configured',
        message: 'NEXT_PUBLIC_STRIPE_PRICE_PRO is not set on the server.',
      },
      { status: 500 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in before starting checkout.' },
      { status: 401 }
    );
  }

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch (e: any) {
    return NextResponse.json(
      { error: 'stripe_init_failed', message: e?.message ?? 'Could not init Stripe' },
      { status: 500 }
    );
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e: any) {
    return NextResponse.json(
      {
        error: 'server_misconfigured',
        message: e?.message ?? 'Supabase admin client unavailable',
      },
      { status: 500 }
    );
  }

  const appUrl = getAppBaseUrl();

  // Reuse existing Stripe customer if we already have one for this user.
  const { data: existing } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  let customerId = existing?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await admin.from('subscriptions').upsert(
      {
        user_id: user.id,
        stripe_customer_id: customer.id,
        plan: 'free',
        status: 'incomplete',
      },
      { onConflict: 'user_id' }
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/plan?upgraded=1`,
      cancel_url: `${appUrl}/dashboard/plan?canceled=1`,
      allow_promotion_codes: true,
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id },
      subscription_data: { metadata: { supabase_user_id: user.id } },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: 'checkout_failed',
        message: e?.message ?? 'Stripe rejected the checkout request',
      },
      { status: 500 }
    );
  }
}
