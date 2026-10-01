/**
 * Charging for a film the cutting room has just made.
 *
 * ── Why a route at all, when nothing leaves the device ───────────────────
 *
 * Every other priced thing in this app charges on its way past the server to
 * a supplier. The cutting room has no supplier: `stitch.ts` paints the frames
 * onto a canvas in her own browser, which is why the room costs nothing to
 * run and why all of it — the trimming, the fades, the looks, the words — is
 * free however long somebody sits there.
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

/** The longest film this will price in one go, in seconds. */
const LONGEST = 60 * 30;

export async function POST(request: Request): Promise<Response> {
  /* Braked before anything is charged, like every other route that spends:
     a retry loop is stopped here rather than after the money. */
  const flood = refuseIfTooMany('filmout', request, GENERATION);
  if (flood) return flood;

  let body: { seconds?: unknown; ref?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'bad_request', message: 'Could not read that.' }, { status: 400 });
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

  const price = perMinute(seconds, CREDITS.filmOut);
  const paid = await charge(request, price, 'filmout', `filmout:${ref}`);
  if (!paid.ok) return paid.response;

  return Response.json({ ok: true, credits: price });
}

/** What a film of this length would cost, so the room can say so first. */
export function GET(request: Request): Response {
  const asked = Number(new URL(request.url).searchParams.get('seconds') ?? '0');
  const seconds = Number.isFinite(asked) && asked > 0 ? Math.min(asked, LONGEST) : 0;
  return Response.json({
    perMinute: CREDITS.filmOut,
    credits: seconds > 0 ? perMinute(seconds, CREDITS.filmOut) : 0,
  });
}
