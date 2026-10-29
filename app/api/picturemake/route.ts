/**
 * Make a picture (`lib/picturemake.ts`): four drafts, then the chosen one finished.
 *
 *   POST { step: 'draft', kind, look, mood, idea, abroad, adult }
 *        → { state: 'done', urls: [four pictures], credits }
 *   POST { step: 'final', kind, look, mood, idea, draft, abroad, adult }
 *        → { state: 'done', url, credits }
 *
 * The idea is screened as a picture prompt; both yeses (the words and the
 * draft go to fal.ai outside South Africa; 18 or older); charged before the
 * engine and given back when it fails. A draft sent back for finishing is
 * looked at first (`picturescreen`), because the phone could send any
 * picture as its "draft".
 */
import { callerFrom } from '@/app/lib/server/account';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { charge } from '@/app/lib/server/credits';
import { guard } from '@/app/lib/server/safety';
import { falNow, falReady, fileUrlOf } from '@/app/lib/server/fal';
import { screenPicture, SCREEN_REFUSED } from '@/app/lib/server/picturescreen';
import { DRAFT_CREDITS, DRAFT_MODEL, FINAL_CREDITS, FINAL_MODEL, choiceOf, draftInput, finalInput } from '@/app/lib/picturemake';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MOST_PICTURE_CHARS = 6_000_000;
const PICTURE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const FAILED = 'That did not work this time. Your credits are back — try again in a moment.';
const REFUSED = 'The engine would not draw that: its own safety check stopped it. Your credits are back.';

/** Every picture in an answer that drew several. */
function urlsOf(data: unknown): string[] {
  const list = (data as { images?: unknown } | null)?.images;
  if (!Array.isArray(list)) return [];
  return list
    .map((one) => (typeof one === 'string' ? one : (one as { url?: unknown } | null)?.url))
    .filter((url): url is string => typeof url === 'string' && /^(https:\/\/|data:)/.test(url));
}

export async function POST(request: Request): Promise<Response> {
  if (!falReady()) return Response.json({ message: 'Making pictures is not switched on yet. Nothing was charged.' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first — this uses credits.', signedIn: false }, { status: 401 });
  const flood = refuseIfTooMany('picturemake', request, GENERATION);
  if (flood) return flood;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const step = body?.step === 'final' ? 'final' : body?.step === 'draft' ? 'draft' : null;
  if (!step) return Response.json({ message: 'Say which step.' }, { status: 400 });
  if (body?.abroad !== true || body?.adult !== true) {
    return Response.json({ message: 'Both boxes have to be ticked: what you make goes to fal.ai outside South Africa, and this is for people of 18 and older.' }, { status: 400 });
  }
  const choice = choiceOf(body);
  if (!choice) return Response.json({ message: 'Pick what you are making, a look and a mood, and say the idea.' }, { status: 400 });

  const safe = await guard(request, choice.idea, 'picture', caller);
  if (!safe.ok) return safe.response;

  if (step === 'draft') {
    const paid = await charge(request, DRAFT_CREDITS, 'picturemake:draft');
    if (!paid.ok) return paid.response;
    const ran = await falNow(DRAFT_MODEL, draftInput(choice));
    const urls = ran.ok ? urlsOf(ran.data) : [];
    if (!ran.ok || !urls.length) {
      await paid.refund();
      if (!ran.ok) console.error(`[picturemake] ${DRAFT_MODEL} failed: ${ran.why}`);
      return Response.json({ state: ran.ok ? 'failed' : ran.refused ? 'refused' : 'failed', message: !ran.ok && ran.refused ? REFUSED : FAILED }, { status: !ran.ok && ran.refused ? 422 : 502 });
    }
    return Response.json({ state: 'done', urls, credits: DRAFT_CREDITS });
  }

  const draft = typeof body?.draft === 'string' ? body.draft : '';
  if (!draft || draft.length > MOST_PICTURE_CHARS || !PICTURE.test(draft)) {
    return Response.json({ message: 'Pick one of the drafts first.' }, { status: 400 });
  }
  const seen = await screenPicture(draft, 'picturemake:final');
  if (seen.state === 'refused') return Response.json({ message: SCREEN_REFUSED }, { status: 422 });
  const paid = await charge(request, FINAL_CREDITS, 'picturemake:final');
  if (!paid.ok) return paid.response;
  const ran = await falNow(FINAL_MODEL, finalInput(choice, draft));
  const url = ran.ok ? fileUrlOf(ran.data) : null;
  if (!ran.ok || !url) {
    await paid.refund();
    if (!ran.ok) console.error(`[picturemake] ${FINAL_MODEL} failed: ${ran.why}`);
    return Response.json({ state: 'failed', message: !ran.ok && ran.refused ? REFUSED : FAILED }, { status: !ran.ok && ran.refused ? 422 : 502 });
  }
  return Response.json({ state: 'done', url, credits: FINAL_CREDITS });
}
