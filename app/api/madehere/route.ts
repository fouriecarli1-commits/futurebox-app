/**
 * Charging for something a room has just made on the device.
 *
 * ── Why a route at all, when nothing leaves the device ───────────────────
 *
 * Every other priced thing in this app charges on its way past the server to
 * a supplier. These two rooms have no supplier: `stitch.ts` paints frames
 * onto a canvas and `mixSession` renders audio offline, both in her own
 * browser, which is why they cost nothing to run and why all the work inside
 * them — the trimming, the fades, the faders, the looks — is free however
 * long somebody sits there.
 *
 * ── One route, two rooms, and why not two routes ─────────────────────────
 *
 * The cutting room and the Pro Booth ask the same question — *something was
 * made here, what does it cost* — and the answer differs only by which row of
 * `CREDITS` to read. Two routes would be two copies of the brake, the clamp,
 * the reference and the charge, and the day one of them gained a guard the
 * other would quietly not have it.
 *
 * It is called `madehere` and not `filmout`, which is what it was called for
 * a day: a route named after a film that also charges for mixes is a name
 * that means two things, which is the fault this repository keeps undoing.
 *
 * Carli, 1 October 2026: *"Onthou dat hierdie ook 'n betaalde produk is wat
 * krediete werd is."*
 *
 * So there is a price, charged at the one moment something is produced. That
 * needs a server, because a balance the browser could decide not to spend is
 * not a balance.
 *
 * ── Charged AFTER the film exists, and that is the whole design ──────────
 *
 * The obvious order is to charge first and refund if the render fails. It is
 * the wrong one here, twice over.
 *
 * A refund needs an amount, and the only place a later request could get one
 * is from the browser — so a client that paid for eight seconds could ask to
 * be refunded for half an hour. Guarding that means storing what was charged
 * against the reference and reading it back, which is a table and a migration
 * for a problem that disappears if the order is reversed.
 *
 * And reversing it is the honest order anyway: the render happens in a
 * browser, where it fails for reasons nobody here can see — a codec the
 * device does not have, a tab backgrounded mid-record, memory taken by a
 * camera app. Charging for a film that never arrived is the one unforgivable
 * version of this feature, and the way to never do it is to charge for a film
 * that HAS arrived.
 *
 * The cost of this order is that somebody who has run out of credits renders
 * before being told. The editor softens that by asking the price first, but
 * this answer is the authority: a film that cannot be paid for is not handed
 * over.
 *
 * ── What it cannot do ────────────────────────────────────────────────────
 *
 * It cannot stop a determined person keeping the file: the whole room runs on
 * their own machine and the blob exists in their tab before this is called.
 * Nothing server-side can change that, and pretending otherwise would mean
 * building enforcement that does not enforce. This charges the honest path,
 * which is the only path a browser-side product has.
 */

import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { charge } from '@/app/lib/server/credits';
import { CREDITS, perMinute } from '@/app/lib/credits';
import { billFor, NOTHING_IN_IT, type InTheFilm } from '@/app/lib/filmcost';

/** The longest thing this will price in one go, in seconds. */
const LONGEST = 60 * 30;

/**
 * What each room charges a minute, and the only place a kind is named.
 *
 * An unknown kind is refused rather than defaulted. A default here would mean
 * a room added later, whose name nobody remembered to add, charging whatever
 * the first row happens to be — silently, and in somebody's favour or ours
 * depending on the order of this object.
 */
const RATES: Readonly<Record<string, number>> = {
  film: CREDITS.filmOut,
  mix: CREDITS.mixOut,
};

export async function POST(request: Request): Promise<Response> {
  /* Braked before anything is charged, like every other route that spends:
     a retry loop is stopped here rather than after the money. */
  const flood = refuseIfTooMany('madehere', request, GENERATION);
  if (flood) return flood;

  let body: {
    seconds?: unknown; ref?: unknown; kind?: unknown; inIt?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'bad_request', message: 'Could not read that.' }, { status: 400 });
  }

  const kind = typeof body.kind === 'string' ? body.kind : '';
  const rate = RATES[kind];
  if (!rate) {
    return Response.json(
      { error: 'bad_kind', message: 'Could not read that.' },
      { status: 400 },
    );
  }

  const asked = Number(body.seconds);
  if (!Number.isFinite(asked) || asked <= 0) {
    return Response.json(
      { error: 'no_length', message: 'A film with no length is not a film.' },
      { status: 400 },
    );
  }
  /* Clamped rather than refused. A browser reporting a silly length is a bug
     on our side, and refusing somebody's finished film over it is a worse
     answer than charging for half an hour. */
  const seconds = Math.min(asked, LONGEST);

  /* The reference makes a retry idempotent: the same film, charged twice
     because the answer was lost on a bad connection, is one charge. */
  const ref = typeof body.ref === 'string' && body.ref.length > 0 && body.ref.length <= 80
    ? body.ref
    : null;
  if (!ref) {
    return Response.json({ error: 'no_ref', message: 'Could not read that.' }, { status: 400 });
  }

  /* ── What is in the film, and who decides what it costs ────────────────

     Carli, 3 October 2026: *"elke element wat op die video editing gebruik word
     [moet] krediete dra."*

     The browser sends COUNTS — how many pieces carry words, how many joins are
     not straight cuts, whether there is a mark and a track. It does not send a
     price, and nothing below reads one. `billFor` is the same function the
     editor ran to put a number on the button, so the figure somebody agreed to
     and the figure charged are the same arithmetic rather than two copies of
     it.

     Every count is clamped here rather than trusted. A browser reporting
     nine hundred captions is a bug on our side or a hand on the wire, and the
     answer to both is the same: it cannot cost more than the film can hold.
     One element per second of film is already far beyond anything real.

     Only the cutting room sends this. A mix has no captions, so the Booth's
     charge stays exactly what it was — `perMinute` of `mixOut`. */
  const price = kind === 'film'
    ? billFor(inItFrom(body.inIt, seconds)).total
    : perMinute(seconds, rate);
  const paid = await charge(request, price, `madehere.${kind}`, `madehere:${kind}:${ref}`);
  if (!paid.ok) return paid.response;

  return Response.json({ ok: true, credits: price });
}

/**
 * The counts off a request, clamped to what a film of this length can hold.
 *
 * Anything unreadable is nought rather than refused: a film that arrived is
 * handed over, and the worst a missing count can do is charge less. Refusing
 * somebody's finished work over a malformed number would be the one
 * unforgivable version of this route, which is the same reason the length above
 * is clamped rather than rejected.
 */
function inItFrom(raw: unknown, seconds: number): InTheFilm {
  if (!raw || typeof raw !== 'object') return { ...NOTHING_IN_IT, seconds };
  const sent = raw as Record<string, unknown>;
  /* One element per second is already far past anything a person makes, and it
     is a ceiling that scales with the film rather than a constant that would be
     wrong at both ends. */
  const most = Math.max(1, Math.floor(seconds));
  const count = (what: unknown): number => {
    const one = Number(what);
    return Number.isFinite(one) && one > 0 ? Math.min(Math.floor(one), most) : 0;
  };
  return {
    seconds,
    words: count(sent.words),
    looks: count(sent.looks),
    joins: count(sent.joins),
    mark: sent.mark === true,
    under: sent.under === true,
  };
}

/** What something of this length would cost, so a room can say so first. */
export function GET(request: Request): Response {
  const url = new URL(request.url);
  const rate = RATES[url.searchParams.get('kind') ?? ''] ?? 0;
  const asked = Number(url.searchParams.get('seconds') ?? '0');
  const seconds = Number.isFinite(asked) && asked > 0 ? Math.min(asked, LONGEST) : 0;
  return Response.json({
    perMinute: rate,
    credits: rate > 0 && seconds > 0 ? perMinute(seconds, rate) : 0,
  });
}
