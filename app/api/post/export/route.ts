/**
 * Taking a finished post off the device.
 *
 * ── Why a route at all, when nothing leaves the browser ──────────────────
 *
 * The picture is drawn on a canvas in the browser and saved from there. No
 * engine runs, no supplier is called, and the bytes never reach this server.
 * So this route does exactly one thing: it charges.
 *
 * Carli, 6 October 2026, on whether the image tools need a watermark:
 *
 *   "Onthou dat alles wat ons bied krediete kos, elke keer wanneer iets
 *    afgelaai word kos dit krediete, so 'n watermerk sal nie nodig wees
 *    nie, want hulle sal nie kan export sonder krediete nie."
 *
 * That is the better of the two answers. A watermark makes every post worse
 * in order to pay for itself; a credit on the way out leaves the picture
 * clean. See `CREDITS.postOut` for why it is one and not three.
 *
 * ── Charged BEFORE the picture is drawn, and that is deliberate ──────────
 *
 * The browser asks here first and only saves the file if the answer is yes.
 * A charge afterwards would be a charge somebody can decline by closing the
 * tab — and, worse, a save that happens and is sometimes not paid for is a
 * price nobody can reason about.
 *
 * `spend_credits` takes a charge once per reference, which is what makes
 * exporting the same post twice one charge rather than two. The reference is
 * the post's own id, made in the browser and kept for as long as that post
 * is open: change the words and it is the same post; start a new one and it
 * is not.
 *
 * ── What this cannot do, said plainly ────────────────────────────────────
 *
 * Nothing stops a screenshot of a canvas. The charge is the honest path's
 * price rather than a lock, and what it really prevents is a free account
 * used as an unlimited design studio — which a screenshot at phone
 * resolution is not.
 */

import { charge } from '@/app/lib/server/credits';
import { CREDITS } from '@/app/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { post?: unknown } | null;
  const post = String(body?.post ?? '').slice(0, 80);
  if (!post) {
    return Response.json(
      { message: 'That post has no id, so it cannot be charged for once rather than twice.' },
      { status: 400 },
    );
  }
  /* The id is the reference, so a second export of an unchanged post costs
     nothing. `charge` refuses with its own words and its own status — a
     signed-out caller, an empty balance, a plan that does not reach this —
     and those sentences are better than any this route could invent. */
  const paid = await charge(request, CREDITS.postOut, 'post', `post:${post}`);
  if (!paid.ok) return paid.response;
  return Response.json({ ok: true, credits: CREDITS.postOut });
}
