/**
 * What else it can become: a sticker pulled out of a photo, a photo woken
 * up, a picture made into a 3D model. `lib/becomes.ts` is the table.
 *
 *   POST { become, picture, tap?, words?, abroad, adult }
 *        `picture` is the photo as a data URI, made small on the phone
 *        (`BECOME_SIDE`). A quick one (the sticker) answers at once with
 *        its result as a data URI; a slow one answers with a sealed ticket.
 *   GET  ?ticket=…  → where a slow one is: waiting, done with its file's
 *        address, or failed with the credits given back once.
 *
 * Held as `/api/footage` holds the clips (`docs/FAL-TERME.md`):
 *
 *  - **Nothing is kept anywhere.** The picture goes inside the request, not
 *    through our storage or fal.ai's CDN; `X-Fal-Store-IO: 0` keeps fal.ai
 *    from storing the request; the quick answers come back as data URIs and
 *    the slow ones delete themselves from fal.ai's CDN within the hour.
 *  - **Both yeses, every time**, and never from an open kids room: the
 *    picture leaves South Africa, and fal.ai needs every user to be 18.
 *  - **The words are screened** strictly, as footage is: they change a
 *    member's own picture the way the words change their own clip.
 *  - **Charged before, given back once** when fal.ai fails or refuses.
 */
import { admin, callerFrom } from '@/app/lib/server/account';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { BECOME_IDS, BECOMES, becomeInput, type BecomeId, type Tap } from '@/app/lib/becomes';
import { charge, refund } from '@/app/lib/server/credits';
import { guard } from '@/app/lib/server/safety';
import { wrote } from '@/app/lib/server/wrote';
import { falNow, falProgress, falQueue, falReady, fileUrlOf, maskUrlOf } from '@/app/lib/server/fal';
import { seal, unseal } from '@/app/lib/server/falticket';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/* The sticker waits on fal.ai in the one call. */
export const maxDuration = 60;

/** A small JPEG or PNG of up to 1280 pixels is well under this. */
const MOST_PICTURE_CHARS = 3_500_000;
const PICTURE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

interface Ticket {
  readonly id: string;
  readonly become: BecomeId;
  readonly owner: string;
  readonly credits: number;
  readonly charged: boolean;
  readonly status: string;
  readonly result: string;
}

const off = (): Response => Response.json(
  { error: 'off', message: 'This is not switched on yet on this deployment.' },
  { status: 503 },
);

/** fal.ai's own screen stopped it: logged beside ours, never counted. */
async function noteRefusal(owner: string): Promise<void> {
  const client = admin();
  if (!client) return;
  wrote(await client.from('moderation_events').insert({
    owner,
    surface: 'footage',
    rule: 'engine',
    counts: false,
    decided_by: 'engine',
    excerpt: null,
  }), 'the fal.ai refusal');
}

const REFUSED = 'The engine would not work on this picture: its own safety check stopped it. Your credits are back.';
const FAILED = 'That did not work this time. Your credits are back — try again in a moment.';

export async function POST(request: Request): Promise<Response> {
  if (!falReady()) return off();
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first — this uses credits.', signedIn: false }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ message: 'Could not read that.' }, { status: 400 });
  }

  const flood = refuseIfTooMany('become', request, GENERATION);
  if (flood) return flood;

  const id = BECOME_IDS.find((one) => one === body.become);
  if (!id) return Response.json({ message: 'Say what it should become.' }, { status: 400 });
  const spec = BECOMES[id];

  /* No refusal for an account that has a kids room. It refused the
     owner herself on 27 October 2026 ("This is not in the kids room"),
     because a parent who has set up a kids room is still an adult in the
     Photo Editor. The kids room never reaches these tools (no kids screen
     draws them; `check:falwire` holds that), and the 18-or-older tick is
     asked of whoever is at the screen. */
  if (body.abroad !== true || body.adult !== true) {
    return Response.json({ message: 'Both boxes have to be ticked: the picture goes to fal.ai outside South Africa, and this is for people of 18 and older.' }, { status: 400 });
  }

  const picture = typeof body.picture === 'string' ? body.picture : '';
  if (!picture || picture.length > MOST_PICTURE_CHARS || !PICTURE.test(picture)) {
    return Response.json({ message: 'That picture could not be sent. Try a smaller one.' }, { status: 413 });
  }
  const words = typeof body.words === 'string' ? body.words.trim().slice(0, 200) : '';
  const rawTap = body.tap as Partial<Tap> | undefined;
  const tap = rawTap && Number.isFinite(rawTap.x) && Number.isFinite(rawTap.y)
    ? { x: Math.max(0, Number(rawTap.x)), y: Math.max(0, Number(rawTap.y)) }
    : undefined;
  if (id === 'sticker' && !tap && !words) return Response.json({ message: 'Tap the thing to pull out.' }, { status: 400 });

  if (words) {
    const screened = await guard(request, words, 'footage', caller);
    if (!screened.ok) return screened.response;
  }

  const paid = await charge(request, spec.credits, `become:${id}`);
  if (!paid.ok) return paid.response;

  const input = becomeInput(id, picture, { tap, words });

  if (spec.now) {
    const ran = await falNow(spec.model, input);
    if (!ran.ok) {
      await paid.refund();
      console.error(`[become] ${spec.model} failed: ${ran.why}`);
      if (ran.refused) {
        await noteRefusal(caller.id);
        return Response.json({ state: 'refused', message: REFUSED }, { status: 422 });
      }
      return Response.json({ state: 'failed', message: FAILED }, { status: 502 });
    }
    const url = spec.gives === 'mask' ? maskUrlOf(ran.data) : fileUrlOf(ran.data);
    if (!url) {
      await paid.refund();
      return Response.json({ state: 'failed', message: 'Nothing was found there. Tap the middle of the thing. Your credits are back.' }, { status: 404 });
    }
    return Response.json({ state: 'done', url, credits: spec.credits });
  }

  const sent = await falQueue(spec.model, input);
  if ('error' in sent) {
    await paid.refund();
    console.error(`[become] ${spec.model} would not take the job: ${sent.error}`);
    return Response.json({ message: 'The engine would not take that just now. Nothing was charged.' }, { status: 502 });
  }
  const ticket: Ticket = {
    id: sent.id,
    become: id,
    owner: caller.id,
    credits: spec.credits,
    charged: paid.owner !== null,
    status: sent.status,
    result: sent.result,
  };
  return Response.json({ ticket: seal(ticket), credits: spec.credits });
}

/** Give the credits back once for a job that did not happen. */
async function giveBack(ticket: Ticket): Promise<void> {
  if (!ticket.charged) return;
  const client = admin();
  const ref = `become:${ticket.id}`;
  if (client) {
    const { data } = await client.from('credit_entries').select('id').eq('owner', ticket.owner).eq('ref', ref).eq('reason', 'refund').limit(1);
    if (data && data.length) return;
  }
  await refund(ticket.owner, ticket.credits, ref);
}

export async function GET(request: Request): Promise<Response> {
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });
  const ticket = unseal<Ticket>(new URL(request.url).searchParams.get('ticket') ?? '');
  if (!ticket || ticket.owner !== caller.id) return Response.json({ message: 'That is not a job of yours.' }, { status: 403 });

  const now = await falProgress(ticket.status, ticket.result);
  if (now.state === 'waiting') return Response.json({ state: 'waiting' });
  if (now.state === 'done') return Response.json({ state: 'done', url: now.url });

  await giveBack(ticket);
  console.error(`[become] ${BECOMES[ticket.become].model} job ${ticket.id} failed: ${now.why}`);
  if (now.refused) {
    await noteRefusal(caller.id);
    return Response.json({ state: 'refused', message: REFUSED });
  }
  return Response.json({ state: 'failed', message: FAILED });
}
