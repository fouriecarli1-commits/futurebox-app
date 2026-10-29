/**
 * Make my photo good (`lib/restore.ts`): repair, faces, or colour.
 *
 *   POST { restore, picture, abroad, adult }  → { state: 'done', url, credits }
 *
 * The same terms as `/api/become`: both yeses, the picture looked at first
 * (`lib/server/picturescreen.ts`), charged before the engine and given back
 * when it fails or refuses, answered in the one call with nothing kept on
 * fal.ai past the hour. Shut while `RESTORE_CLEARED` is false.
 */
import { callerFrom } from '@/app/lib/server/account';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { charge } from '@/app/lib/server/credits';
import { falNow, falReady, fileUrlOf } from '@/app/lib/server/fal';
import { screenPicture, SCREEN_REFUSED } from '@/app/lib/server/picturescreen';
import { RESTORE_CLEARED, RESTORE_IDS, RESTORES, restoreInput } from '@/app/lib/restore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MOST_PICTURE_CHARS = 3_500_000;
const PICTURE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export async function POST(request: Request): Promise<Response> {
  if (!RESTORE_CLEARED || !falReady()) {
    return Response.json({ message: 'Fixing old photos is not switched on yet. Nothing was charged.' }, { status: 503 });
  }
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first — this uses credits.', signedIn: false }, { status: 401 });
  const flood = refuseIfTooMany('restore', request, GENERATION);
  if (flood) return flood;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const id = RESTORE_IDS.find((one) => one === body?.restore);
  if (!id) return Response.json({ message: 'Say how to fix it.' }, { status: 400 });
  if (body?.abroad !== true || body?.adult !== true) {
    return Response.json({ message: 'Both boxes have to be ticked: the picture goes to fal.ai outside South Africa, and this is for people of 18 and older.' }, { status: 400 });
  }
  const picture = typeof body.picture === 'string' ? body.picture : '';
  if (!picture || picture.length > MOST_PICTURE_CHARS || !PICTURE.test(picture)) {
    return Response.json({ message: 'That picture could not be sent. Try a smaller one.' }, { status: 413 });
  }
  const seen = await screenPicture(picture, `restore:${id}`);
  if (seen.state === 'refused') return Response.json({ message: SCREEN_REFUSED }, { status: 422 });

  const spec = RESTORES[id];
  const paid = await charge(request, spec.credits, `restore:${id}`);
  if (!paid.ok) return paid.response;
  const ran = await falNow(spec.model, restoreInput(id, picture));
  if (!ran.ok) {
    await paid.refund();
    console.error(`[restore] ${spec.model} failed: ${ran.why}`);
    return Response.json({
      state: ran.refused ? 'refused' : 'failed',
      message: ran.refused
        ? 'The engine would not work on this picture: its own safety check stopped it. Your credits are back.'
        : 'That did not work this time. Your credits are back — try again in a moment.',
    }, { status: ran.refused ? 422 : 502 });
  }
  const url = fileUrlOf(ran.data);
  if (!url) {
    await paid.refund();
    return Response.json({ state: 'failed', message: 'Nothing came back for this photo. Your credits are back.' }, { status: 502 });
  }
  return Response.json({ state: 'done', url, credits: spec.credits });
}
