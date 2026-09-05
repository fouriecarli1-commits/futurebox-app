/**
 * Asking somebody to work with you, and answering.
 *
 * Three rules, and each is enforced here rather than promised by a screen.
 *
 * **You ask by handle, never by id.** The radar hands the browser a name and
 * an @handle and nothing else; the account behind it is resolved on this side.
 * A page that knew everybody's user id could enumerate the whole membership,
 * and there is no reason for it to know.
 *
 * **One thread per pair.** The unique index is on the two people sorted, so it
 * does not matter who asked — asking somebody who already asked you finds the
 * existing thread instead of opening a second one, which is what a person
 * expects and what stops a request being used to nag.
 *
 * **Only the person asked may answer.** Obvious, and the sort of thing that is
 * obvious right up until it is written as `.eq('id', id)` with no second
 * condition.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { filterSafe } from '@/app/lib/server/filtersafe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  asked_by: string;
  asked_of: string;
  state: string;
  because: string;
  created_at: string;
  answered_at: string | null;
}

/** Names for a set of accounts, so a thread is a person and not a uuid. */
async function namesFor(
  client: NonNullable<ReturnType<typeof admin>>,
  owners: readonly string[],
): Promise<Map<string, { name: string; handle: string }>> {
  if (!owners.length) return new Map();
  const { data } = await client
    .from('creators')
    .select('owner, name, handle')
    .in('owner', owners as string[]);
  return new Map(
    ((data ?? []) as Array<{ owner: string; name: string; handle: string | null }>).map((one) => [
      one.owner,
      { name: one.name || 'Someone', handle: one.handle ? `@${one.handle}` : '' },
    ]),
  );
}


export async function GET(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ signedIn: false, ready: false, threads: [] });
  const caller = await callerFrom(request);
  const client = admin();
  if (!caller || !client) return Response.json({ signedIn: false, ready: false, threads: [] });

  // Refused rather than sent. An id that is not a UUID is not a caller this
  // app made, and building a filter out of it is the one thing worth not doing.
  if (!filterSafe(caller.id)) {
    return Response.json({ signedIn: false, ready: false, threads: [] });
  }

  const { data, error } = await client
    .from('collabs')
    .select('id, asked_by, asked_of, state, because, created_at, answered_at')
    .or(`asked_by.eq.${caller.id},asked_of.eq.${caller.id}`)
    .order('created_at', { ascending: false });

  // A failed read is not an empty list, and the difference is the whole
  // reason this feature looked broken for weeks: with `supabase/collab.sql`
  // never run, `data` comes back null, the room drew "no collaborations yet",
  // and nobody could tell that from having none. The same mistake the credit
  // balance made, and it is not being made twice.
  if (error) {
    return Response.json({
      signedIn: true,
      ready: false,
      threads: [],
      message:
        'Collaboration is not switched on for this app yet — its tables are missing. Run supabase/collab.sql.',
    });
  }

  const rows = (data ?? []) as Row[];

  const others = rows.map((row) => (row.asked_by === caller.id ? row.asked_of : row.asked_by));
  const names = await namesFor(client, Array.from(new Set(others)));

  return Response.json({
    signedIn: true,
    ready: true,
    threads: rows.map((row) => {
      const other = row.asked_by === caller.id ? row.asked_of : row.asked_by;
      const who = names.get(other);
      return {
        id: row.id,
        state: row.state,
        because: row.because,
        // Which side of it you are on decides what the screen offers: the
        // person asked gets Accept and Decline, the asker gets "waiting".
        mine: row.asked_by === caller.id,
        name: who?.name ?? 'Someone',
        handle: who?.handle ?? '',
        createdAt: row.created_at,
      };
    }),
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  const client = admin();
  if (!caller || !client) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  let body: { handle?: string; because?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'Could not read that.' }, { status: 400 });
  }

  const handle = String(body.handle ?? '').replace(/^@/, '').trim().toLowerCase();
  if (!handle) return Response.json({ message: 'Who did you want to ask?' }, { status: 400 });

  const { data: them } = await client
    .from('creators')
    .select('owner')
    .eq('handle', handle)
    .maybeSingle();
  const other = (them as { owner?: string } | null)?.owner;
  if (!other) return Response.json({ message: 'Nobody here goes by that name.' }, { status: 404 });
  if (other === caller.id) {
    return Response.json({ message: 'That is you.' }, { status: 400 });
  }

  // Already a thread, either way round. Handing back the existing one is the
  // useful answer — the person wanted to reach somebody, and they can.
  if (!filterSafe(caller.id) || !filterSafe(other)) {
    return Response.json({ message: 'That request could not be read.' }, { status: 400 });
  }

  const { data: already, error: lookupFailed } = await client
    .from('collabs')
    .select('id, state')
    .or(
      `and(asked_by.eq.${caller.id},asked_of.eq.${other}),` +
        `and(asked_by.eq.${other},asked_of.eq.${caller.id})`,
    )
    .maybeSingle();

  // Without this the missing table read as "no thread yet", the insert below
  // then failed, and the answer was a vague "that could not be sent" — which
  // sounds like the other person's problem rather than an unrun migration.
  if (lookupFailed) {
    return Response.json(
      { message: 'Collaboration is not switched on for this app yet. Run supabase/collab.sql.' },
      { status: 503 },
    );
  }
  if (already) {
    const row = already as { id: string; state: string };
    return Response.json({ id: row.id, state: row.state, existing: true });
  }

  const { data: made, error } = await client
    .from('collabs')
    .insert({
      asked_by: caller.id,
      asked_of: other,
      because: String(body.because ?? '').slice(0, 300),
    })
    .select('id, state')
    .maybeSingle();
  if (error || !made) {
    return Response.json({ message: 'That could not be sent.' }, { status: 502 });
  }
  const row = made as { id: string; state: string };
  return Response.json({ id: row.id, state: row.state });
}

export async function PATCH(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  const client = admin();
  if (!caller || !client) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  let body: { id?: string; answer?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'Could not read that.' }, { status: 400 });
  }

  const id = String(body.id ?? '');
  const answer = String(body.answer ?? '');
  if (!id || (answer !== 'accepted' && answer !== 'declined')) {
    return Response.json({ message: 'Accept it or decline it.' }, { status: 400 });
  }

  // `asked_of` is the whole check. Without it anybody holding a thread id
  // could accept on somebody else's behalf, and the id travels to both sides.
  const { data, error } = await client
    .from('collabs')
    .update({ state: answer, answered_at: new Date().toISOString() })
    .eq('id', id)
    .eq('asked_of', caller.id)
    .eq('state', 'asked')
    .select('id, state')
    .maybeSingle();

  // A missing table and a request that is not yours both leave `data` null,
  // and telling somebody a request is not theirs when the feature is simply
  // switched off sends them looking for a problem they do not have.
  if (error) {
    return Response.json(
      { message: 'Collaboration is not switched on for this app yet. Run supabase/collab.sql.' },
      { status: 503 },
    );
  }
  if (!data) {
    return Response.json({ message: 'That is not yours to answer.' }, { status: 403 });
  }

  return Response.json(data);
}
