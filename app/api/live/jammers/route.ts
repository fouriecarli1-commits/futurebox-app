/**
 * The jam room's stage: who is in it, and as which character.
 *
 *   GET      everybody else on the stage now — who, their name, the character
 *            and colour they picked, their pulse tag, and whether they are
 *            looping and at what tempo. Never a picture.
 *   POST { look, tag, looping, bpm }
 *            "I am here, as this": written on the way in and then as a
 *            heartbeat. Answers with the name the room sees, so your own tile
 *            says exactly what everybody else's screen does.
 *   DELETE   "I left".
 *
 * The owner, 22 October 2026: somebody in the jam room hides completely
 * behind an animated character. A look is two words from fixed lists and is
 * cleaned here before it is kept, and again by every screen before it is
 * drawn (`lib/jamcharacters.ts`). The name is read from the creator's own row,
 * never taken from the request. Signed-in only, like the looper's room; a row
 * not seen for fifteen seconds is somebody who has gone. See
 * `supabase/livejammers.sql`.
 */
import { admin, callerFrom } from '@/app/lib/server/account';
import { refuseIfTooMany } from '@/app/lib/server/brake';
import { wrote } from '@/app/lib/server/wrote';
import { jamNameOf } from '@/app/lib/server/jamname';
import { TAG, cleanBpm, cleanLook } from '@/app/lib/jamcharacters';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Somebody not heard from for this long has left the stage. */
const STALE_MS = 15_000;
/** A heartbeat every few seconds, and a change of character now and then. */
const BEATS = { perMinute: 40, perHour: 1200 };
/** The most other people one stage draws. */
const MOST = 24;

const noStore = { 'Cache-Control': 'no-store' };

export async function GET(request: Request): Promise<Response> {
  const client = admin();
  if (!client) return Response.json({ ready: false, jammers: [] }, { headers: noStore });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in to be on the stage.' }, { status: 401 });

  const since = new Date(Date.now() - STALE_MS).toISOString();
  const { data, error } = await client
    .from('live_jammers')
    .select('owner, name, character, colour, tag, looping, bpm, seen_at')
    .gt('seen_at', since)
    .neq('owner', caller.id)
    .order('seen_at', { ascending: false })
    .limit(MOST);
  /* A project where `livejammers.sql` has not been run answers "not ready",
     not "nobody here": an empty stage and a missing table are different
     things, and the screen says which. */
  if (error) return Response.json({ ready: false, jammers: [] }, { headers: noStore });
  const jammers = (data ?? []).map((one) => {
    const row = one as { owner: string; name: string; character: string; colour: string; tag: string; looping: boolean; bpm: number | null };
    return {
      who: row.owner,
      name: row.name,
      look: cleanLook({ character: row.character, colour: row.colour }),
      tag: TAG.test(row.tag) ? row.tag : '',
      looping: row.looping === true,
      bpm: cleanBpm(row.bpm),
    };
  });
  return Response.json({ ready: true, jammers }, { headers: noStore });
}

export async function POST(request: Request): Promise<Response> {
  const flood = refuseIfTooMany('live-jammers', request, BEATS);
  if (flood) return flood;
  const client = admin();
  if (!client) return Response.json({ message: 'This app has no accounts, so there is no room.' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in to be on the stage.' }, { status: 401 });

  let body: { look?: unknown; tag?: unknown; looping?: unknown; bpm?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'That could not be read.' }, { status: 400 });
  }
  const look = cleanLook(body.look);
  const tag = typeof body.tag === 'string' && TAG.test(body.tag) ? body.tag : '';
  const name = await jamNameOf(client, caller.id);
  const row = {
    owner: caller.id,
    name,
    character: look.character,
    colour: look.colour,
    tag,
    looping: body.looping === true,
    bpm: cleanBpm(body.bpm),
    seen_at: new Date().toISOString(),
  };
  const { error } = await client.from('live_jammers').upsert(row, { onConflict: 'owner' });
  if (error) return Response.json({ ready: false, message: 'The stage could not be told just now.' }, { status: 502, headers: noStore });
  return Response.json({ ok: true, name }, { headers: noStore });
}

export async function DELETE(request: Request): Promise<Response> {
  const client = admin();
  if (!client) return Response.json({ ok: true });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ ok: true });
  const gone = wrote(await client.from('live_jammers').delete().eq('owner', caller.id), 'leaving the jam room stage');
  /* A row that stays drops off everybody's stage fifteen seconds after its
     last heartbeat anyway, so this is said rather than retried. */
  return Response.json({ ok: gone }, { status: gone ? 200 : 502, headers: noStore });
}
