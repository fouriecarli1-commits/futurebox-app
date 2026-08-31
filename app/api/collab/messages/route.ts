/**
 * The room, once both people have agreed to be in it.
 *
 * Every read and every write checks the thread is **accepted** and that the
 * caller is one of its two people. That test is also in the row-level policy,
 * so it holds twice: the policy covers anything reading with a user's own
 * token, and this covers the server, which holds the service key and bypasses
 * policies entirely.
 *
 * Saying it once would have been enough for the code as it stands today. It is
 * said twice because the day somebody adds a route that reads this table with
 * the service key and forgets, the policy is what is left — and the promise
 * "you cannot message somebody who has not agreed" is not one to leave resting
 * on a single `if`.
 *
 * A song can be dropped in the room. The id travels, not the audio: what a
 * collaborator hears is still governed by whether its owner shared it, and
 * putting a file in a chat would quietly answer a licence question nobody
 * asked.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MOST = 200;
const LONGEST = 2_000;

/** The thread, if it is open to this person. Null for every other case. */
async function roomFor(
  client: NonNullable<ReturnType<typeof admin>>,
  id: string,
  caller: string,
): Promise<{ id: string; asked_by: string; asked_of: string } | null> {
  if (!id) return null;
  const { data } = await client
    .from('collabs')
    .select('id, asked_by, asked_of, state')
    .eq('id', id)
    .eq('state', 'accepted')
    .maybeSingle();
  const row = data as { id: string; asked_by: string; asked_of: string } | null;
  if (!row) return null;
  if (row.asked_by !== caller && row.asked_of !== caller) return null;
  return row;
}

export async function GET(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ messages: [] });
  const caller = await callerFrom(request);
  const client = admin();
  if (!caller || !client) return Response.json({ messages: [] }, { status: 401 });

  const id = new URL(request.url).searchParams.get('collab') ?? '';
  const room = await roomFor(client, id, caller.id);
  if (!room) return Response.json({ message: 'No room there.' }, { status: 403 });

  const { data } = await client
    .from('collab_messages')
    .select('id, owner, body, track_id, created_at')
    .eq('collab', id)
    .order('created_at', { ascending: true })
    .limit(MOST);

  return Response.json({
    messages: ((data ?? []) as Array<{
      id: number;
      owner: string;
      body: string;
      track_id: string | null;
      created_at: string;
    }>).map((one) => ({
      id: one.id,
      // Who said it, as the screen needs it: mine or theirs. The other
      // person's account id is not the browser's business.
      mine: one.owner === caller.id,
      body: one.body,
      trackId: one.track_id ?? undefined,
      at: one.created_at,
    })),
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  const client = admin();
  if (!caller || !client) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  let body: { collab?: string; body?: string; trackId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'Could not read that.' }, { status: 400 });
  }

  const room = await roomFor(client, String(body.collab ?? ''), caller.id);
  if (!room) return Response.json({ message: 'No room there.' }, { status: 403 });

  const said = String(body.body ?? '').trim().slice(0, LONGEST);
  const trackId = body.trackId ? String(body.trackId).slice(0, 120) : null;
  if (!said && !trackId) {
    return Response.json({ message: 'Say something, or bring a song.' }, { status: 400 });
  }

  const { data, error } = await client
    .from('collab_messages')
    .insert({ collab: room.id, owner: caller.id, body: said, track_id: trackId })
    .select('id, created_at')
    .maybeSingle();
  if (error || !data) return Response.json({ message: 'That did not send.' }, { status: 502 });

  const row = data as { id: number; created_at: string };
  return Response.json({ id: row.id, at: row.created_at, mine: true, body: said, trackId: trackId ?? undefined });
}
