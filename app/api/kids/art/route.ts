/**
 * Asking Google to draw the pictures in the child's room. Hers, words only.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Kan jy asb nie op jou eie engine staat maak om
 * kreatiewe idees uit te dink vir die kids room nie. Jy is nie goed daarmee
 * nie. Jy sal moet ons google engines gebruik!"*
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
 * promised. `check:kinderkuns` drives this route and fails if a reference ever
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
import { DRAWINGS, askFor, drawingById } from '@/app/lib/kidsart';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/**
 * Twenty-three stills, asked for one after another.
 *
 * Longer than the logo bench because there are twenty-three and not four. A
 * press that dies halfway leaves the pictures it did make — the page keeps
 * what came back — but the ceiling has been charged for them, so the length
 * here is what stops it being charged for a sitting nobody sees.
 */
export const maxDuration = 800;

/**
 * Which pictures to draw: everything, or one of them again.
 *
 * Exported because it is the whole of what this route decides before it starts
 * spending, and `check:kinderkuns` drives it rather than reading it.
 *
 * A picture is named by BOTH its list and its id, because a topic and a sound
 * can share one — `happy` is a sound, and a topic could be called that
 * tomorrow. Named by id alone, the wrong one gets drawn and paid for.
 */
export function drawingsAsked(body: unknown):
readonly { readonly id: string; readonly of: 'topic' | 'sound' }[] | null {
  const said = body as { of?: unknown; id?: unknown } | null;
  if (said?.id === undefined && said?.of === undefined) {
    return DRAWINGS.map((one) => ({ id: one.id, of: one.of }));
  }
  const of = said?.of;
  if (typeof said?.id !== 'string' || (of !== 'topic' && of !== 'sound')) return null;
  if (!drawingById(said.id, of)) return null;
  return [{ id: said.id, of }];
}

export async function POST(request: Request): Promise<Response> {
  const flood = refuseIfTooMany('kids-art', request, GENERATION);
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
  const wanted = drawingsAsked(body);
  if (!wanted) {
    return Response.json(
      { error: 'bad_request', message: 'No such picture.' },
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
    id: string; of: 'topic' | 'sound'; said: readonly [string, string];
    ok: boolean; base64?: string; mime?: string; message?: string;
  }[] = [];

  for (const want of wanted) {
    const one = drawingById(want.id, want.of)!;
    /* Words only. `ask.from` is nothing, and it is spelled out in `askFor`
       rather than left off here, so that it is a value a check can read
       instead of an absence a check has to take on trust. */
    const ask = askFor(one);
    const made = await makePicture(ask.words, ask.from, ask.aspect);
    if (made.ok) {
      void note('image', PER_PICTURE, workingImage ?? CHOSEN.image, caller.id);
      drawn.push({
        id: one.id, of: one.of, said: one.says, ok: true,
        base64: made.image.toString('base64'), mime: made.type,
      });
    } else {
      /* One engine refusing is not the end of the sitting: the other three
         are still worth having, and a page that returns nothing because the
         fourth failed is a page that looks broken. */
      drawn.push({ id: one.id, of: one.of, said: one.says, ok: false, message: made.message });
    }
  }

  return Response.json({ drawn });
}
