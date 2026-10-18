/**
 * Loops in the live jam room: who is looping now, and the loop itself.
 *
 *   GET                 everybody else looping now — who, the tempo, how
 *                       many layers and when this loop started. No audio.
 *   GET ?who=<id>       that person's loop, to put into your own.
 *   POST { loop, fresh } "this is playing": written on the first pass and
 *                       then as a heartbeat. `fresh` says it is a new loop,
 *                       which brings the plus back on screens that already
 *                       added the last one.
 *   DELETE              "it stopped" — the plus goes away.
 *
 * Signed-in only, like posting to the room. The loop is cleaned by
 * `cleanLoop` before it is kept, and a row not seen for fifteen seconds is a
 * loop that is no longer playing. See `supabase/liveloops.sql` and
 * `lib/looper.ts`.
 */
import { admin, callerFrom } from '@/app/lib/server/account';
import { cleanLoop } from '@/app/lib/looper';
import { refuseIfTooMany } from '@/app/lib/server/brake';
import { wrote } from '@/app/lib/server/wrote';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A loop not heard from for this long has stopped. */
const STALE_MS = 15_000;
/** A heartbeat comes every few seconds; this is a generous ceiling on them. */
const BEATS = { perMinute: 40, perHour: 1200 };

const noStore = { 'Cache-Control': 'no-store' };

async function nameOf(client: NonNullable<ReturnType<typeof admin>>, owner: string): Promise<string> {
  const { data } = await client.from('creators').select('name, handle').eq('owner', owner).maybeSingle();
  const row = data as { name?: string | null; handle?: string | null } | null;
  return (row?.name || (row?.handle ? `@${row.handle}` : '') || '').slice(0, 40);
}

export async function GET(request: Request): Promise<Response> {
  const client = admin();
  if (!client) return Response.json({ ready: false, loops: [] }, { headers: noStore });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in to hear the room’s loops.' }, { status: 401 });

  const since = new Date(Date.now() - STALE_MS).toISOString();
  const who = new URL(request.url).searchParams.get('who');
  if (who) {
    if (!/^[0-9a-f-]{36}$/i.test(who)) return Response.json({ message: 'That is not somebody in the room.' }, { status: 400 });
    const { data, error } = await client
      .from('live_loops')
      .select('owner, name, loop, started_at')
      .eq('owner', who)
      .gt('seen_at', since)
      .maybeSingle();
    if (error) return Response.json({ message: 'The loop could not be read just now.' }, { status: 502 });
    const row = data as { owner: string; name: string; loop: unknown; started_at: string } | null;
    const loop = row ? cleanLoop(row.loop) : null;
    if (!row || !loop) return Response.json({ message: 'That loop has stopped.' }, { status: 404, headers: noStore });
    return Response.json({ who: row.owner, name: row.name, startedAt: row.started_at, loop }, { headers: noStore });
  }

  const { data, error } = await client
    .from('live_loops')
    .select('owner, name, bpm, layers, started_at')
    .gt('seen_at', since)
    .neq('owner', caller.id)
    .order('started_at', { ascending: false })
    .limit(12);
  if (error) return Response.json({ ready: false, loops: [] }, { headers: noStore });
  const loops = (data ?? []).map((one) => {
    const row = one as { owner: string; name: string; bpm: number; layers: number; started_at: string };
    return { who: row.owner, name: row.name, bpm: row.bpm, layers: row.layers, startedAt: row.started_at };
  });
  return Response.json({ ready: true, loops }, { headers: noStore });
}

export async function POST(request: Request): Promise<Response> {
  const flood = refuseIfTooMany('live-loops', request, BEATS);
  if (flood) return flood;
  const client = admin();
  if (!client) return Response.json({ message: 'This app has no accounts, so there is no room.' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in to share a loop with the room.' }, { status: 401 });

  let body: { loop?: unknown; fresh?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'That loop could not be read.' }, { status: 400 });
  }
  const loop = cleanLoop(body.loop);
  if (!loop) return Response.json({ message: 'There is nothing in that loop to share.' }, { status: 400 });

  const now = new Date().toISOString();
  const row = {
    owner: caller.id,
    name: await nameOf(client, caller.id),
    bpm: loop.bpm,
    layers: loop.layers.length,
    loop,
    seen_at: now,
    ...(body.fresh === true ? { started_at: now } : {}),
  };
  const { error } = await client.from('live_loops').upsert(row, { onConflict: 'owner' });
  if (error) return Response.json({ message: 'The room could not be told just now.' }, { status: 502 });
  return Response.json({ ok: true }, { headers: noStore });
}

export async function DELETE(request: Request): Promise<Response> {
  const client = admin();
  if (!client) return Response.json({ ok: true });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ ok: true });
  const gone = wrote(await client.from('live_loops').delete().eq('owner', caller.id), 'stopping a jam-room loop');
  /* A row that stays stops being shown fifteen seconds after its last
     heartbeat anyway, so this is said rather than retried. */
  return Response.json({ ok: gone }, { status: gone ? 200 : 502, headers: noStore });
}
