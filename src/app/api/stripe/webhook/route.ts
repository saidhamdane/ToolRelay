import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Missing webhook secret' }, { status: 500 });

  const sig = request.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });

  const body = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e: any) {
    return NextResponse.json({ error: `Invalid signature: ${e.message}` }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId =
          (session.metadata?.supabase_user_id as string | undefined) ||
          (session.client_reference_id as string | undefined);
        if (!userId) break;

        const subId = session.subscription as string | null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertSubscription(admin, userId, sub);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId =
          (sub.metadata?.supabase_user_id as string | undefined) ||
          (await findUserIdByCustomer(admin, sub.customer as string));
        if (!userId) break;
        await upsertSubscription(admin, userId, sub);
        break;
      }
      default:
        break;
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function findUserIdByCustomer(
  admin: ReturnType<typeof createAdminClient>,
  customerId: string
): Promise<string | null> {
  const { data } = await admin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function upsertSubscription(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  sub: Stripe.Subscription
) {
  const isActive = sub.status === 'active' || sub.status === 'trialing';
  await admin.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: sub.customer as string,
      stripe_subscription_id: sub.id,
      status: sub.status,
      plan: isActive ? 'pro' : 'free',
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    },
    { onConflict: 'user_id' }
  );
}
