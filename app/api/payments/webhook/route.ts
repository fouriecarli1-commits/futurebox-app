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
import { packById } from '@/app/lib/credits';
import { topUp } from '@/app/lib/server/credits';
import { emailOf, send } from '@/app/lib/server/email';
import { receiptLetter } from '@/app/lib/server/letters';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Send the receipt, and never let it affect the answer to Paystack.
 *
 * Awaited rather than fired and forgotten: a serverless function that returns
 * before its promises settle gets frozen mid-send, and the letter is lost with
 * the claim already written — the one state where somebody is owed a receipt
 * and `mail_log` says it went. Waiting costs a few hundred milliseconds on a
 * webhook that is not user-facing.
 *
 * Every failure inside `send` is recorded rather than raised, so nothing here
 * needs a try. It returns void because there is no answer worth acting on: a
 * payment that succeeded is a payment that succeeded whether or not the
 * receipt got out.
 *
 * The dedupe key is Paystack's reference, which is unique per charge and is
 * the same across every retry of the same event. That is what makes a retried
 * webhook safe to answer twice.
 */
async function receipt(
  owner: string,
  what: string,
  cents: number,
  reference: string,
  renewal: boolean,
): Promise<void> {
  const to = await emailOf(owner);
  if (!to) return;
  /* English, and this is a real limitation rather than an oversight.

     A person chooses a language in the browser; the server never hears about
     it, and a renewal months later has no browser present at all. Guessing
     from an address or a name would be worse than a language somebody can
     read. Worth fixing by storing the choice against the account — noted in
     docs/GOING_LIVE.md rather than pretended away here. */
  const letter = receiptLetter(
    { what, cents, reference, when: new Date(), renewal },
    'en',
  );
  await send({
    to,
    subject: letter.subject,
    text: letter.text,
    kind: 'receipt',
    once: `receipt:${reference}`,
  });
}

interface PaystackEvent {
  event?: string;
  data?: {
    reference?: string;
    amount?: number;
    status?: string;
    metadata?: {
      owner?: string;
      kind?: 'plan' | 'credits';
      trackId?: string | null;
      tier?: Tier | null;
      pack?: string | null;
    };
  };
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
    const renewedTier = arrangement?.tier ?? known.tier;
    await setMembership(known.owner, renewedTier, reference);
    await rememberArrangement(known.owner, renewedTier, payer.customerCode);
    // The monthly one. Nobody is present for this — Paystack raised it — so
    // the receipt is the only thing that tells them it happened.
    await receipt(known.owner, `${renewedTier} plan, one month`, cents, reference, true);
    return new Response('renewed', { status: 200 });
  }

  if (meta.kind === 'plan' && meta.tier) {
    await setMembership(owner, meta.tier, reference);
    await receipt(owner, `${meta.tier} plan`, cents, reference, false);
    // Only where it really is a subscription: a tier with no Paystack plan set
    // up is a single month's charge and has no arrangement to remember.
    const payer = reference ? await payerOf(reference) : null;
    if (payer) await rememberArrangement(owner, meta.tier, payer.customerCode);
    return new Response('ok', { status: 200 });
  }

  if (meta.kind === 'credits' && meta.pack) {
    // How many credits that pack holds is read here, from our own table. The
    // charge only says which pack was paid for; it does not get to say how big
    // it was. `add_credits` refuses a reference it has already seen, so a
    // retried webhook cannot double it.
    const pack = packById(meta.pack);
    if (pack) {
      await topUp(owner, pack.credits, reference);
      await receipt(owner, `${pack.credits} credits`, cents, reference, false);
    }
    return new Response('ok', { status: 200 });
  }

  return new Response('nothing to do', { status: 200 });
}
