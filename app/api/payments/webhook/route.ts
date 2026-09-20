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
import { recordPurchase } from '@/app/lib/server/account';
import { createClient } from '@supabase/supabase-js';
import type { Tier } from '@/app/lib/plans';
import { addonOfPlan, arrangementOf, payerOf } from '@/app/lib/server/paystack';
import { addonById } from '@/app/lib/addons';
import { addonPayer, grantAddon, rememberAddonPayer } from '@/app/lib/server/addons';
import { packById } from '@/app/lib/credits';
import { topUp } from '@/app/lib/server/credits';
import { accountFor, send } from '@/app/lib/server/email';
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
  /* The address and the language, in one lookup.

     A renewal arrives months later with nobody present — no browser, no
     request from the member — so the language cannot come from where it comes
     from everywhere else in this app. It is kept on the auth user and read
     back here; see `accountFor`. English when nothing was ever chosen, which
     is what the rest of the app defaults to as well. */
  const who = await accountFor(owner);
  if (!who) return;
  const letter = receiptLetter(
    { what, cents, reference, when: new Date(), renewal },
    who.lang,
  );
  await send({
    to: who.email,
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
      kind?: 'plan' | 'credits' | 'addon' | 'art' | 'commission' | 'bidpass';
      trackId?: string | null;
      tier?: Tier | null;
      pack?: string | null;
      addon?: string | null;
      /* Album art: which piece off the wall, or which commission offer. */
      work?: string | null;
      offer?: string | null;
    };
    /* Present when the charge belongs to a subscription, and absent — or an
       empty array, which is Paystack's way of saying "none" — when it does
       not. It is the only thing on a renewal that says *what* renewed. */
    plan?: { plan_code?: string } | unknown;
  };
}

/**
 * The plan code on a charge, where there is one.
 *
 * Paystack sends `plan` as an object for a subscription charge and as an empty
 * array for everything else, so this cannot assume a shape. Reading it wrongly
 * would not throw — it would quietly return nothing, and every add-on renewal
 * would be treated as a membership renewal.
 */
function planOfCharge(plan: unknown): string {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return '';
  const code = (plan as { plan_code?: unknown }).plan_code;
  return typeof code === 'string' ? code : '';
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

    /* Which arrangement renewed, before assuming it was a membership.

       This is the load-bearing line. A renewal carries none of our metadata,
       and the version of this branch that existed before add-ons read that as
       "a plan renewed" — so an R199 marketing month would have renewed
       somebody's Studio membership instead, quietly, every month. */
    const renewedAddon = addonOfPlan(planOfCharge(event.data.plan));
    if (renewedAddon) {
      const spec = addonById(renewedAddon);
      const holder =
        (await addonPayer(payer.customerCode)) ??
        (await ownerOfCustomer(payer.customerCode))?.owner ??
        null;
      if (!holder || !spec) return new Response('no owner', { status: 200 });
      await grantAddon(holder, renewedAddon, spec.days, reference);
      await receipt(holder, `${renewedAddon} add-on, one month`, cents, reference, true);
      return new Response('renewed', { status: 200 });
    }

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

  if (meta.kind === 'addon' && meta.addon) {
    /* How long a month is, read here from our own table. The charge only says
       which add-on was paid for; it does not get to say how long it lasts.
       `grant_addon` refuses a reference it has already counted, so a retried
       webhook cannot hand out two months for one payment. */
    const spec = addonById(meta.addon);
    if (spec) {
      await grantAddon(owner, spec.id, spec.days, reference);
      await receipt(owner, `${spec.id} add-on`, cents, reference, false);
      /* And write down whose customer code this is, so the renewal a month
         from now — which will carry none of this — has somewhere to go. */
      const payer = reference ? await payerOf(reference) : null;
      if (payer) await rememberAddonPayer(payer.customerCode, owner);
    }
    return new Response('ok', { status: 200 });
  }

  /* ── A piece of album art ────────────────────────────────────────────

     This is where a work becomes sold, and it is the ONLY place. Her rule
     is that every piece is unique and sells exactly once, and the two
     halves of keeping that true are here and in the database:

       `.is('sold_to', null)` makes the update conditional, so the second
       charge for the same piece changes no rows and writes no receipt.

       the partial unique index in `supabase/albumart.sql` catches the two
       that arrive in the same millisecond, which a conditional update on
       its own cannot.

     A refund for the loser of that race is a person's job, not a webhook's
     — so the console carries it, loudly, with the reference on it. */
  if (meta.kind === 'art' && meta.work) {
    const store = db();
    if (!store) return new Response('no database', { status: 200 });
    const { data, error } = await store
      .from('art_works')
      .update({ sold_to: owner, sold_at: new Date().toISOString() })
      .eq('id', meta.work)
      .is('sold_to', null)
      /* And the payer has to be the person who won it. The till checks
         this too, but a charge arrives here minutes later and carries
         only what it was started with — so the last word belongs to the
         row, where `won_by` was written when the clock ran out. */
      .eq('won_by', owner)
      .select('id, title');
    const sold = (data ?? []) as { id: string; title: string }[];
    if (error || sold.length === 0) {
      console.error(
        `[artmarket] paid for a piece that was already sold, or by somebody who did not win it.`
        + ` work=${meta.work} owner=${owner} reference=${reference} — this needs a refund.`,
      );
      return new Response('already sold', { status: 200 });
    }
    await receipt(owner, `Album art: ${sold[0].title}`, cents, reference, false);
    return new Response('ok', { status: 200 });
  }

  /* ── The bidder's pass ───────────────────────────────────────────────

     One row per person, and the primary key is the person — so a webhook
     that arrives twice for the same payment cannot make two, and an
     upsert is the whole of it. */
  if (meta.kind === 'bidpass') {
    const store = db();
    if (!store) return new Response('no database', { status: 200 });
    const { error } = await store
      .from('art_bidders')
      .upsert({ owner, reference }, { onConflict: 'owner' });
    if (error) {
      console.error(`[artmarket] the bidder pass did not save. owner=${owner} reference=${reference} error=${error.message}`);
      return new Response('not saved', { status: 200 });
    }
    await receipt(owner, 'Bidder pass', cents, reference, false);
    return new Response('ok', { status: 200 });
  }

  /* ── A commissioned one-off ──────────────────────────────────────────

     Paid, not accepted. Her order: *"as die betaling deur is, druk die
     koper accept"* — the buyer presses accept afterwards, and that is what
     starts the artist's clock. So this moves the offer to `paid` and
     stops; `/api/artmarket` refuses an accept on anything else, which is
     what makes the sequence a sequence rather than two buttons. */
  if (meta.kind === 'commission' && meta.offer) {
    const store = db();
    if (!store) return new Response('no database', { status: 200 });
    /* The error is read, not shrugged off: `?? []` on a failed update looks
       exactly like an offer that was not open, and the two need different
       words in the log — one is a person to refund, the other is a database
       to look at. */
    const { data, error } = await store
      .from('art_offers')
      .update({ state: 'paid' })
      .eq('id', meta.offer)
      .eq('state', 'offered')
      .select('id');
    if (error || ((data ?? []) as unknown[]).length === 0) {
      console.error(
        `[artmarket] paid for an offer that was not open. offer=${meta.offer} owner=${owner} reference=${reference}${error ? ` error=${error.message}` : ''}`,
      );
      return new Response('not open', { status: 200 });
    }
    await receipt(owner, 'Commissioned album art', cents, reference, false);
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
