/**
 * The payment provider telling us a charge succeeded.
 *
 * This is the only place a purchase is ever recorded. Not the checkout route,
 * and never the browser: a page that can grant itself an unlock is a page that
 * will. The person's browser being redirected back with `?paid=1` proves
 * nothing — they typed that URL, or Paystack did, and neither is a receipt.
 *
 * Every request here is verified before it is believed. Paystack signs the raw
 * body with the secret key using HMAC SHA-512 and sends the digest in
 * `x-paystack-signature`. If the digest does not match, the request did not
 * come from Paystack, whatever it says about itself. That check is the entire
 * security of this endpoint, so it happens before the body is even parsed as
 * meaning anything.
 */

import crypto from 'node:crypto';
import { admin, recordPurchase } from '@/app/lib/server/account';
import { createClient } from '@supabase/supabase-js';
import type { Tier } from '@/app/lib/plans';
import { arrangementOf, payerOf } from '@/app/lib/server/paystack';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PaystackEvent {
  event?: string;
  data?: {
    reference?: string;
    amount?: number;
    status?: string;
    metadata?: {
      owner?: string;
      kind?: 'open' | 'keep' | 'plan' | 'entry';
      trackId?: string | null;
      tier?: Tier | null;
      competitionId?: string | null;
    };
  };
}

/**
 * A paid entry into a competition.
 *
 * This is the only place a paid entry is ever written. The browser can start a
 * checkout but cannot record its outcome — an entry a page could claim to have
 * paid for is an entry that costs nothing.
 *
 * Somebody who already entered by the free route and then paid keeps their one
 * entry and it becomes a paid one; the unique constraint is on the person and
 * the competition, not on the route.
 */
async function recordEntry(owner: string, competitionId: string, reference: string): Promise<void> {
  const client = admin();
  if (!client) return;
  await client.from('entries').upsert(
    {
      id: `e-${Date.now()}-${owner.slice(0, 6)}`,
      competition_id: competitionId,
      owner,
      route: 'paid',
      paid_reference: reference,
    },
    { onConflict: 'competition_id,owner' },
  );
}

/**
 * Timing-safe comparison. A plain `===` on a signature leaks how much of it was
 * correct through how long the comparison took, which is enough to forge one
 * given patience.
 */
function signatureMatches(raw: string, sent: string, secret: string): boolean {
  const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(sent, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Starts or extends a membership. Only ever called after a verified charge. */
async function setMembership(owner: string, tier: Tier, reference: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !service) return;
  const db = createClient(url, service, { auth: { persistSession: false } });
  const renews = new Date();
  renews.setMonth(renews.getMonth() + 1);
  await db.from('memberships').upsert({
    owner,
    tier,
    renews_at: renews.toISOString(),
    reference,
    updated_at: new Date().toISOString(),
  });
}

/**
 * The service-role client, or null when this deployment has no database.
 *
 * Built where it is used rather than shared, which is how `setMembership`
 * already does it: the client carries no schema types here, so a shared one
 * would infer its rows as `never` and every insert would stop compiling.
 */
function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !service) return null;
  return createClient(url, service, { auth: { persistSession: false } });
}

/**
 * Write down the arrangement behind a subscription charge.
 *
 * The customer code is the important one: a renewal months from now carries
 * none of the checkout's metadata, so this row is the only thing that will
 * still know whose money that is. The subscription code and email token are
 * what a cancellation needs, and they exist on Paystack's side only after the
 * first charge has gone through — which is exactly when this runs.
 */
async function rememberArrangement(owner: string, tier: Tier, customerCode: string): Promise<void> {
  const client = db();
  if (!client) return;
  const arrangement = await arrangementOf(customerCode);
  await client.from('subscriptions').upsert({
    owner,
    customer_code: customerCode,
    subscription_code: arrangement?.subscriptionCode || null,
    email_token: arrangement?.emailToken || null,
    plan_code: arrangement?.planCode || null,
    tier: arrangement?.tier ?? tier,
    status: arrangement?.status ?? 'active',
    next_payment_at: arrangement?.nextPaymentAt ?? null,
    updated_at: new Date().toISOString(),
  });
}

/** Whose subscription this customer code belongs to, from the first charge. */
async function ownerOfCustomer(customerCode: string): Promise<{ owner: string; tier: Tier } | null> {
  const client = db();
  if (!client) return null;
  const { data } = await client
    .from('subscriptions')
    .select('owner, tier')
    .eq('customer_code', customerCode)
    .maybeSingle();
  const row = data as { owner?: string; tier?: Tier } | null;
  if (!row?.owner) return null;
  return { owner: row.owner, tier: (row.tier ?? 'maker') as Tier };
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return new Response('not configured', { status: 503 });

  // The raw body, byte for byte. Parsing first and re-serialising would change
  // it, and then the signature could never match.
  const raw = await request.text();
  const sent = request.headers.get('x-paystack-signature') ?? '';
  if (!sent || !signatureMatches(raw, sent, secret)) {
    return new Response('bad signature', { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(raw) as PaystackEvent;
  } catch {
    return new Response('bad body', { status: 400 });
  }

  if (event.event !== 'charge.success' || event.data?.status !== 'success') {
    // Anything else is noise we do not act on. Answering 200 stops Paystack
    // retrying an event we have deliberately ignored.
    return new Response('ignored', { status: 200 });
  }

  const meta = event.data.metadata ?? {};
  const owner = meta.owner;
  const reference = event.data.reference ?? '';
  const cents = event.data.amount ?? 0;

  if (!owner) {
    // No metadata means this was not started from a checkout of ours, which
    // for a signed charge means one thing: Paystack raised it themselves, from
    // a subscription. The customer code is asked for rather than read off the
    // event, and the row written at the first charge says whose it is.
    if (!reference) return new Response('no owner', { status: 200 });
    const payer = await payerOf(reference);
    if (!payer) return new Response('no owner', { status: 200 });

    const known = await ownerOfCustomer(payer.customerCode);
    if (!known) return new Response('no owner', { status: 200 });

    const arrangement = await arrangementOf(payer.customerCode);
    await setMembership(known.owner, arrangement?.tier ?? known.tier, reference);
    await rememberArrangement(known.owner, arrangement?.tier ?? known.tier, payer.customerCode);
    return new Response('renewed', { status: 200 });
  }

  if (meta.kind === 'plan' && meta.tier) {
    await setMembership(owner, meta.tier, reference);
    // Only where it really is a subscription: a tier with no Paystack plan set
    // up is a single month's charge and has no arrangement to remember.
    const payer = reference ? await payerOf(reference) : null;
    if (payer) await rememberArrangement(owner, meta.tier, payer.customerCode);
    return new Response('ok', { status: 200 });
  }

  if ((meta.kind === 'open' || meta.kind === 'keep') && meta.trackId) {
    await recordPurchase(owner, meta.trackId, meta.kind === 'keep' ? 'owned' : 'opened', cents, reference);
    return new Response('ok', { status: 200 });
  }

  if (meta.kind === 'entry' && meta.competitionId) {
    await recordEntry(owner, meta.competitionId, reference);
    return new Response('ok', { status: 200 });
  }

  return new Response('nothing to do', { status: 200 });
}
