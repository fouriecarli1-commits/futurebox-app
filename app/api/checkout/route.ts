/**
 * Starting a payment.
 *
 * The browser says what it wants to buy; this route decides what that costs and
 * asks the provider to open a checkout. The price is read from `plans.ts` on
 * the server, never taken from the request — a page that could name its own
 * price is a page that will eventually be asked to.
 *
 * Paystack is the provider. It settles in rand into a South African bank
 * account, takes cards and EFT, has a documented HTTP API, and does not require
 * a company registration to start. PayFast and Yoco are the obvious
 * alternatives; swapping means changing this file and the webhook, and nothing
 * else, which is why the rest of the app talks about "purchases" rather than
 * about Paystack.
 *
 * Nothing here charges anyone until PAYSTACK_SECRET_KEY is set. Without it the
 * route answers 503 with a reason the UI shows, the same as every other
 * service in this app.
 */

import { TIER_SPECS, type Tier } from '@/app/lib/plans';
import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { addonPlanCode, planCode } from '@/app/lib/server/paystack';
import { mayTopUp, packById } from '@/app/lib/credits';
import { addonById } from '@/app/lib/addons';
import { langOf, roomToSell } from '@/app/lib/server/elevenroom';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const PAYSTACK = 'https://api.paystack.co/transaction/initialize';

/** What can be bought, and what it costs. Decided here, in rand. */
type Want =
  | { kind: 'plan'; tier: Tier }
  | { kind: 'credits'; pack: string }
  | { kind: 'addon'; addon: string };

async function priceOf(want: Want): Promise<{ cents: number; label: string } | null> {
  if (want.kind === 'credits') {
    // The pack's price comes from the same table the panel showed, never from
    // the request. A page that can name its own price eventually will.
    const pack = packById(want.pack);
    if (!pack) return null;
    return { cents: pack.rand * 100, label: `${pack.credits} credits` };
  }
  if (want.kind === 'addon') {
    /* Same rule as a credit pack: the request names which add-on, never what
       it costs. `addons.ts` is the only place that number exists. */
    const addon = addonById(want.addon);
    if (!addon) return null;
    return { cents: addon.rand * 100, label: `${addon.id} add-on, a month` };
  }
  const spec = TIER_SPECS[want.tier];
  if (!spec || spec.rand === 0) return null;
  return { cents: spec.rand * 100, label: `${spec.name}, a month` };
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return Response.json(
      { error: 'no_provider', message: 'Payments are not switched on yet — nothing can be charged.' },
      { status: 503 },
    );
  }
  if (!metered()) {
    // Without accounts there is nobody to credit the purchase to, and an
    // untraceable payment is worse than no payment.
    return Response.json(
      { error: 'no_accounts', message: 'Accounts are not configured, so a purchase could not be recorded.' },
      { status: 503 },
    );
  }

  const caller = await callerFrom(request);
  if (!caller) {
    return Response.json({ error: 'signed_out', message: 'Sign in before paying.' }, { status: 401 });
  }

  let want: Want;
  try {
    want = (await request.json()) as Want;
  } catch {
    return Response.json({ error: 'bad_request', message: 'Could not read that.' }, { status: 400 });
  }

  /* ── Credits are for members who already pay ──────────────────────────

     Carli: "iemand kan nie krediete koop sonder 'n subscribed plan nie."

     `/api/credits` hides the shelf from a free member, and a hidden button is
     not a closed door: `pack` is a string in a body anybody can post. The
     same rule, enforced where the money actually moves.

     Said as a refusal with a reason rather than "unknown item", because it is
     not unknown — it is not for sale to them yet, and the next thing they
     need is the plans. */
  if (want.kind === 'credits' && !mayTopUp(caller.tier)) {
    return Response.json(
      {
        error: 'needs_plan',
        message: 'Extra credits are for members on a plan. Take a plan first — it includes credits every month.',
        needsPlan: true,
      },
      { status: 403 },
    );
  }

  /* ── Stop selling before you stop serving ─────────────────────────────
 
     The one brake that matters more than the rest. When the supplier's month
     is nearly spent, taking somebody's money for a plan sells them a product
     that will fail inside a fortnight. Refusing the sale costs a signup;
     taking it costs the member.
 
     Only NEW paid signups. A member already on a plan may top up and may move
     up: they are already inside the number the ceiling was reckoned against,
     and cutting them off mid-month is the failure this exists to prevent, not
     a defence against it. The free tier never reaches here at all, and is
     deliberately left wide open — it generates nothing and costs nothing.
 
     Fails open when the allowance cannot be read, like every other use of
     this. A supplier that will not answer must not close the till. */
  if (want.kind === 'plan' && (!caller.tier || caller.tier === 'free')) {
    const selling = await roomToSell();
    if (!selling.go) {
      return Response.json(
        {
          error: 'waiting_list',
          message:
            langOf(request) === 'af'
              ? 'Ons het hierdie maand se plek vir nuwe planne vol. Dit is nie \u2019n fout nie \u2014 ons verkoop nie meer as wat ons kan maak nie. Jou gratis rekening werk soos altyd, en ons laat weet sodra daar weer plek is.'
              : 'We are full for new plans this month. That is not an error \u2014 we do not sell more than we can make. Your free account works as always, and we will say when there is room again.',
          waitingList: true,
        },
        { status: 503 },
      );
    }
  }

  const price = await priceOf(want);
  if (!price) {
    return Response.json({ error: 'unknown_item', message: 'Nothing is sold at that name.' }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  let upstream: Response;
  try {
    upstream = await fetch(PAYSTACK, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: caller.email,
        amount: price.cents,
        currency: 'ZAR',
        callback_url: `${origin}/?paid=1`,
        // A plan turns this checkout into a subscription: Paystack charges it
        // now and again every month until it is cancelled. Sent only when the
        // account actually has a plan set up for that tier — without one the
        // charge still goes through, as a single month, which is what this
        // app did before subscriptions existed.
        ...(want.kind === 'plan' && planCode(want.tier)
          ? { plan: planCode(want.tier) }
          : {}),
        // And the same for an add-on, which is a monthly arrangement too.
        // Without a plan code it is a single month that runs out rather than
        // renews — the add-on's own `days`, honoured by `grant_addon`.
        ...(want.kind === 'addon' && addonPlanCode(want.addon)
          ? { plan: addonPlanCode(want.addon) }
          : {}),
        // Read back verbatim by the webhook. This is what ties a payment to a
        // person and a track; without it a successful charge has nowhere to go.
        metadata: {
          owner: caller.id,
          kind: want.kind,
          tier: want.kind === 'plan' ? want.tier : null,
          // The pack's name, not its size: the webhook looks the credits up
          // for itself, so a tampered checkout cannot buy a thousand for R99.
          pack: want.kind === 'credits' ? want.pack : null,
          // Which add-on, not how long it lasts: the webhook reads the length
          // out of our own table, so a tampered checkout cannot buy a year.
          addon: want.kind === 'addon' ? want.addon : null,
          label: price.label,
        },
      }),
    });
  } catch {
    return Response.json({ error: 'unreachable', message: 'Could not reach the payment service.' }, { status: 502 });
  }

  const payload = (await upstream.json().catch(() => ({}))) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; reference?: string };
  };

  if (!upstream.ok || !payload.status || !payload.data?.authorization_url) {
    return Response.json(
      { error: 'declined', message: payload.message ?? 'The payment service would not start that.' },
      { status: 502 },
    );
  }

  return Response.json({ url: payload.data.authorization_url, reference: payload.data.reference });
}

/** Whether a checkout can be started at all, for the UI to ask before offering. */
export async function GET(): Promise<Response> {
  return Response.json({ available: Boolean(process.env.PAYSTACK_SECRET_KEY) && metered() });
}
