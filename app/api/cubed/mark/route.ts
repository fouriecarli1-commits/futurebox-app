/**
 * Asking Google to draw the Cubed mark. Hers alone, and words only.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Vra ons google partner om vir ons logo te maak?
 * Joune is baie primitief."* Then: *"Het jy vir google gevra sonder jou
 * voorbeelde?"*
 *
 * ── Why this is a route in her own app ───────────────────────────────────
 *
 * Because the Google key lives in Vercel and nowhere else, which is the right
 * rule and not one worth bending for a logo. Nothing outside the deployment
 * can ask Google on her behalf. So the asking happens here, where the key
 * already is, and she presses it.
 *
 * ── The one rule ─────────────────────────────────────────────────────────
 *
 * No picture is sent. `makePicture` takes a reference image as its second
 * argument and this route never passes one. An image model handed a drawing
 * does not take inspiration from it, it reproduces it — and what would be
 * reproduced is a mark she has already turned down twice. Her question was
 * exactly this, and it deserves an answer that is enforced rather than
 * promised. `check:merklab` drives this route and fails if a reference ever
 * reaches it.
 *
 * ── The order ────────────────────────────────────────────────────────────
 *
 * Signed in → is this her → is there room under OUR Google ceiling → ask →
 * write down what it cost. The same order as every other Google route, for
 * the same reason: a ceiling that counts failures closes early for a reason
 * nobody can see, so the cost is written once the picture is in hand.
 *
 * Nobody is charged credits. This is the operator's own tool, run a handful
 * of times, and a charge on it would be the app billing her for its own logo.
 * The Google ceiling still applies, because that is her money either way —
 * it is the budget alert she asked for on 10 October, not a formality.
 */

import { callerFrom, callerIsOwner } from '@/app/lib/server/account';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { CHOSEN } from '@/app/lib/server/google';
import { enough, note } from '@/app/lib/server/googlespend';
import { PER_PICTURE, configured, makePicture, workingImage } from '@/app/lib/server/picture';
import { TAKES, askFor, takeById } from '@/app/lib/cubedwords';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Four stills. Each one is seconds, and they are asked for one after another. */
export const maxDuration = 300;

/**
 * Everything, or one of them again.
 *
 * Exported because it is the whole of what this route decides before it starts
 * spending, and `check:merklab` drives it rather than reading it.
 */
export function takesAsked(body: unknown): readonly string[] | null {
  const one = (body as { take?: unknown } | null)?.take;
  if (one === undefined) return TAKES.map((take) => take.id);
  if (typeof one !== 'string' || !takeById(one)) return null;
  return [one];
}

export async function POST(request: Request): Promise<Response> {
  const flood = refuseIfTooMany('cubed-mark', request, GENERATION);
  if (flood) return flood;

  const caller = await callerFrom(request);
  if (!caller) {
    return Response.json(
      { error: 'signed_out', message: 'Sign in first.' },
      { status: 401 },
    );
  }
  /* Not a secret room — a room with a meter in it. Anybody else pressing this
     would be spending her Google budget on her logo. */
  if (!callerIsOwner(caller)) {
    return Response.json(
      { error: 'not_yours', message: 'This one is the operator’s.' },
      { status: 403 },
    );
  }
  if (!configured()) {
    return Response.json(
      { error: 'no_google', message: 'Google is not set up on this deployment.' },
      { status: 503 },
    );
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const wanted = takesAsked(body);
  if (!wanted) {
    return Response.json(
      { error: 'bad_request', message: 'No such take.' },
      { status: 400 },
    );
  }

  const room = await enough('image', PER_PICTURE * wanted.length, caller.id);
  if (room) {
    return Response.json(
      { error: room.code, message: room.message, left: room.left },
      { status: 429 },
    );
  }

  const drawn: {
    id: string; said: readonly [string, string];
    ok: boolean; base64?: string; mime?: string; message?: string;
  }[] = [];

  for (const id of wanted) {
    const take = takeById(id)!;
    /* Words only. `ask.from` is nothing, and it is spelled out in `askFor`
       rather than left off here, so that it is a value a check can read
       instead of an absence a check has to take on trust. */
    const ask = askFor(take);
    const made = await makePicture(ask.words, ask.from, ask.aspect);
    if (made.ok) {
      void note('image', PER_PICTURE, workingImage ?? CHOSEN.image, caller.id);
      drawn.push({
        id, said: take.said, ok: true,
        base64: made.image.toString('base64'), mime: made.type,
      });
    } else {
      /* One engine refusing is not the end of the sitting: the other three
         are still worth having, and a page that returns nothing because the
         fourth failed is a page that looks broken. */
      drawn.push({ id, said: take.said, ok: false, message: made.message });
    }
  }

  return Response.json({ drawn });
}
