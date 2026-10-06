/**
 * The capture for a tone she chose, handed to the lane that asked for it.
 *
 * The last server step of the chain: she pressed Browse TONE3000, signed in
 * on their page, picked an amp, and came back with a tone id. This turns
 * that id into the `.nam` text `lib/nam.ts` loads.
 *
 * ── Why the browser does not do this itself ──────────────────────────────
 *
 * It cannot, and that is the design rather than a limitation. Her TONE3000
 * token is kept server-side on purpose — `supabase/tone3000.sql` says at
 * length why a refresh token is not an hour of access to our app but lasting
 * access to somebody else's account — so the two calls that need it happen
 * here. What crosses back is the capture, which is a public file once you
 * are allowed to have it.
 *
 * ── Every refusal is a different thing to do ─────────────────────────────
 *
 * `signin` and `expired` are not errors in our app: they mean her TONE3000
 * sign-in is missing or old and the room should send her back through the
 * door. `gone` is a tone that is no longer there, which is theirs to
 * explain. `nonam` is an archive with no capture in it, which is a tone our
 * engine cannot use and is worth saying plainly rather than handing on an
 * empty file.
 */

import { callerFrom } from '@/app/lib/server/account';
import { captureFor, ready } from '@/app/lib/server/tone3000session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Their storage, a zip and an unpack. Not a quick call on a slow line. */
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  if (!ready()) return Response.json({ ready: false }, { status: 503 });

  const caller = await callerFrom(request);
  if (!caller) return Response.json({ ready: true, signedIn: false }, { status: 401 });

  const toneId = new URL(request.url).searchParams.get('tone') ?? '';
  /* Shape-checked before it is put in a path. Their ids are opaque to us, so
     what is refused is anything that could mean something to a URL rather
     than anything that fails to look like an id we recognise. */
  if (!toneId || !/^[A-Za-z0-9_-]{1,64}$/.test(toneId)) {
    return Response.json({ ready: true, why: 'tone' }, { status: 400 });
  }

  const got = await captureFor(caller.id, toneId);
  if (got.how === 'no') {
    /* Her sign-in being missing or old is a 409 and not a 401: a 401 here
       would read as OUR sign-in, and the room would send her to the wrong
       door. */
    const status = got.why === 'signin' || got.why === 'expired' ? 409 : 502;
    return Response.json({ ready: true, why: got.why, theirStatus: got.status }, { status });
  }

  return Response.json({ ready: true, name: got.name, nam: got.nam });
}
