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
import { planCode } from '@/app/lib/server/paystack';
import { mayTopUp, packById } from '@/app/lib/credits';
import { BIDDER_RAND } from '@/app/data/artmarket';
import { langOf, roomToSell } from '@/app/lib/server/elevenroom';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const PAYSTACK = 'https://api.paystack.co/transaction/initialize';

/** What can be bought, and what it costs. Decided here, in rand. */
type Want =
  | { kind: 'plan'; tier: Tier }
  | { kind: 'credits'; pack: string }
  /* A piece of album art off the wall. The request names WHICH piece; what
     it costs is read out of the row, like everything else here. */
  | { kind: 'art'; work: string }
  /* A commissioned one-off, at the price its artist named. */
  | { kind: 'commission'; offer: string }
  /* The once-off R50 that makes somebody a bidder. */
  | { kind: 'bidpass'; work: string };

/**
 * What this costs, decided on the server.
 *
 * `who` is the caller, needed because one of these prices is not a price
 * at all: a piece of album art is an auction, and only the person who won
 * it may be charged — for the amount they won it at.
 */
async function priceOf(want: Want, who: string): Promise<{ cents: number; label: string } | null> {
  if (want.kind === 'credits') {
    // The pack's price comes from the same table the panel showed, never from
    // the request. A page that can name its own price eventually will.
    const pack = packById(want.pack);
    if (!pack) return null;
    return { cents: pack.rand * 100, label: `${pack.credits} credits` };
  }
  /* ── Album art ─────────────────────────────────────────────────────

     The price is on the row, put there by the artist, and the row is read
     here. A sold piece is not for sale a second time — her whole rule —
     so it is refused at the till as well as hidden on the wall: the wall
     is a screen, and two people pressing buy in the same second are not
     looking at a screen.

     This is not the sold-once guarantee. That is the partial unique index
     in `supabase/albumart.sql`, which settles the race in the database.
     This is the polite refusal that stops most of them reaching it. */
  if (want.kind === 'art') {
    const db = admin();
    if (!db) return null;
    const { data } = await db
      .from('art_works')
      .select('title, rand, won_by, sold_to')
      .eq('id', want.work)
      .maybeSingle();
    const work = data as
      | { title: string; rand: number; won_by: string | null; sold_to: string | null }
      | null;
    if (!work || work.sold_to) return null;

    /* ── It is an auction, so the price is the winning bid ───────────

       Carli: *"Die R200 is die begin vir 'n bee rate … die hoogste bee
       wen die art binne 36 hours."* `rand` on the row is where the
       bidding OPENED. Charging it would sell a piece that went to R900
       for R200, which is the artist's money.

       And only the winner may pay. `won_by` is written once, by the
       route, when the clock runs out — never from a request — so this
       is a comparison against a fact and not against a claim. */
    if (work.won_by !== who) return null;
    const { data: standing } = await db
      .from('art_top_bids')
      .select('top')
      .eq('work', want.work)
      .maybeSingle();
    const top = (standing as { top: number } | null)?.top ?? null;
    if (top === null || top < work.rand) return null;
    return { cents: Math.round(top * 100), label: `Album art: ${work.title}` };
  }

  /* ── The bidder's pass ─────────────────────────────────────────────

     Carli: *"Elke persoon sal 'n R50 by in moet hê om te mag bee, want
     anders kan enige random mens die prys opstoot."*

     Fifty rand, once, from `app/data/artmarket.ts` like every other
     amount in this app — never from the request. Refused to somebody who
     already has it, so a second press cannot charge twice. */
  if (want.kind === 'bidpass') {
    const db = admin();
    if (!db) return null;
    /* Per piece. Carli, 20 September 2026: *"R50 buy in is per piece. Dit
       is nie vir elke bidding nie."* So the work is part of the question:
       already bought into THIS one is refused, already bought into
       another one is not. */
    const work = String(want.work ?? '');
    if (!work) return null;
    /* And it has to be a piece somebody could still bid on. A buy-in
       charged against a sold piece, or against a work id somebody
       invented, is R50 taken for nothing. */
    const { data: piece } = await db
      .from('art_works')
      .select('id, sold_to')
      .eq('id', work)
      .maybeSingle();
    if (!piece || (piece as { sold_to: string | null }).sold_to) return null;
    const { data } = await db
      .from('art_bidders')
      .select('owner')
      .eq('owner', who)
      .eq('work', work)
      .maybeSingle();
    if (data) return null;
    return { cents: BIDDER_RAND * 100, label: 'Buy-in to bid' };
  }

  /* And a commission, at the price its artist named and the buyer is
     looking at. Only an offer still standing — one already paid for, or
     turned down, is not a thing to pay for. */
  if (want.kind === 'commission') {
    const db = admin();
    if (!db) return null;
    const { data } = await db
      .from('art_offers')
      .select('rand, state')
      .eq('id', want.offer)
      .maybeSingle();
    const offer = data as { rand: number; state: string } | null;
    if (!offer || offer.state !== 'offered') return null;
    return { cents: Math.round(offer.rand * 100), label: 'Commissioned album art' };
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

  const price = await priceOf(want, caller.id);
  if (!price) {
    return Response.json({ error: 'unknown_item', message: 'Nothing is sold at that name.' }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  /* ── Back into the room she paid from ────────────────────────────────

     Carli, 21 September 2026: *"Met die album art wanneer die betaling
     terug kom is dit nie in dieselfde kamer nie. Ek betaal die R50 om die
     bid te begin, maar dan gebeur daar niks nie."*

     Every callback was `/?paid=1` — the front page, with nothing reading
     the flag. So she paid a real R50 at a real till and was put down on
     the doormat, in a studio that looked exactly as it had before, three
     taps away from the piece she had just bought the right to bid on.
     Nothing had gone wrong except that nobody had been brought back.

     Derived from WHAT was bought rather than taken from the request. A
     room name that arrives over the wire is a room name somebody can
     choose, and the till is the last place to accept one; the kind is
     already checked, so the room follows from it. Null for a plan or a
     pack of credits, which really do belong on the front page. */
  const back =
    want.kind === 'art' || want.kind === 'commission' || want.kind === 'bidpass'
      ? 'albumart'
      : null;
  /* ── And WHICH piece ──────────────────────────────────────────────────
   *
   * Carli, 22 September 2026: *"Daar is nerens 'n afdeling om verder te bid
   * op daardie spesifieke prent nie."*
   *
   * The bid button lives inside the opened piece, not on the wall. So
   * putting her back in the room and no further leaves her looking at a
   * grid, with the thing she just bought the right to bid on shut, and
   * nothing on screen that says "bid". The room is right and the answer is
   * still no.
   *
   * Unlike the room name this IS taken from the request — but only after
   * `priceOf` has accepted it, so it is an id she has just been charged
   * against rather than anything she could name. And re-opening a sheet is
   * not a privileged act: the wall is public and the piece is already on
   * it. */
  const piece =
    'work' in want && typeof want.work === 'string' && /^[\w-]{1,64}$/.test(want.work)
      ? want.work
      : null;
  let upstream: Response;
  try {
    upstream = await fetch(PAYSTACK, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: caller.email,
        amount: price.cents,
        currency: 'ZAR',
        callback_url: `${origin}/?paid=1${back ? `&room=${back}` : ''}`
          + `${back && piece ? `&piece=${encodeURIComponent(piece)}` : ''}`,
        // A plan turns this checkout into a subscription: Paystack charges it
        // now and again every month until it is cancelled. Sent only when the
        // account actually has a plan set up for that tier — without one the
        // charge still goes through, as a single month, which is what this
        // app did before subscriptions existed.
        ...(want.kind === 'plan' && planCode(want.tier)
          ? { plan: planCode(want.tier) }
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
          /* Which piece, and for whom. The webhook marks it sold; nothing
             in this app marks a piece sold on the strength of a browser
             saying the payment went through. */
          /* ── And the bid pass carries a piece too ──────────────────
 
             Carli, 23 September 2026, for the third time: *"die album art
             se bid het nogsteeds nie gewerk nie."* This line is why. It
             read `want.kind === 'art'`, so a `bidpass` went to Paystack
             with `work: null` — and the webhook, which requires it, logged
             "a buy-in arrived with no piece on it" and saved nothing.
 
             She was charged R50 and got nothing back. Every time.
 
             The comment that used to sit below said *"Nothing to name: the
             pass is one thing and there is one of it. The webhook reads
             `kind` alone."* That was true when the pass covered the whole
             market. It stopped being true when she said *"dit is nie vir
             elke bidding nie"* and the pass became per piece: the pricing
             above was changed to take a work, and the webhook was changed
             to demand one. This line was not, and the comment went on
             asserting the old arrangement over the top of it. */
          work: want.kind === 'art' || want.kind === 'bidpass' ? want.work : null,
          offer: want.kind === 'commission' ? want.offer : null,
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
