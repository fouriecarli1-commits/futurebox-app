/**
 * "Browse TONE3000" — the door out.
 *
 * She presses an amp on a track; this says where to send her. It does not
 * redirect her itself: the room opens the address, because the room knows
 * whether to use the whole window or a tab, and a redirect from a fetch is
 * not something a browser lets a page follow in a useful way.
 *
 * This half IS authenticated, unlike the callback. It is called by the app
 * with her Supabase token in the usual header, so `callerFrom` works
 * normally here — and it has to, because the row it writes is what tells the
 * callback whose handshake this was.
 */

import { callerFrom } from '@/app/lib/server/account';
import { begin, ready } from '@/app/lib/server/tone3000session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  if (!ready()) return Response.json({ ready: false }, { status: 503 });

  const caller = await callerFrom(request);
  if (!caller) return Response.json({ ready: true, signedIn: false }, { status: 401 });

  /* Their screens ignore `Accept-Language` and say so, so her language is
     passed along explicitly or not at all. */
  const asked = new URL(request.url).searchParams.get('taal');
  const locale = asked === 'af' || asked === 'en' ? asked : undefined;

  /* The room she is standing in, so the callback can put her back in it.
     TONE3000 hand back only `state`, `code` and `tone_id`, so anything we
     want on the far side has to be remembered on this one. */
  const made = await begin(
    request, caller.id, locale,
    new URL(request.url).searchParams.get('room') ?? undefined,
  );
  if ('why' in made) return Response.json({ ready: true, why: made.why }, { status: 502 });

  return Response.json({ ready: true, url: made.url });
}
