/**
 * How many times somebody's own songs have been listened to.
 *
 *   "As ons top liedjies uitwys uit ons eie engine, track dit dan die
 *    hoeveelheid listens per liedjie?"
 *
 * It did not, and the reason is worth keeping in view: `events` carries a
 * unique index over (kind, listener, thing, day), and that index is the whole
 * reason the chart is honest — it is what stops somebody pressing their own
 * song to the top. It also threw the repeats away, so the number a maker
 * actually wants had nowhere to come from.
 *
 * `supabase/listens.sql` puts a counter on the row that already existed. The
 * chart still counts rows, so it still counts listeners and is unchanged; this
 * reads the sum of the counters.
 *
 * ── Two numbers, and both of them ────────────────────────────────────────
 *
 * `listens` is how many times. `listeners` is how many people. Showing only
 * the first would make a song one person played forty times look like a song
 * forty people heard — the precise lie the chart's index exists to prevent,
 * reintroduced one screen over. So the route answers both and the screen shows
 * both.
 *
 * ── Yours only ───────────────────────────────────────────────────────────
 *
 * The function takes an owner and this route passes the caller's own id and
 * nothing a request can influence. Somebody else's numbers are not a smaller
 * version of this answer; they are not this answer at all.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface Listened {
  /** The song's id. */
  readonly ref: string;
  /** How many times it has been played. */
  readonly listens: number;
  /** How many people played it — one per person per day. */
  readonly listeners: number;
  /** The last day anybody did, as `YYYY-MM-DD`, or null. */
  readonly lastDay: string | null;
}

export async function GET(request: Request): Promise<Response> {
  if (!metered()) {
    // No accounts, so no plays to attribute. Empty rather than an error: a
    // screen that shows nothing is right here, and an error would be a fault
    // reported where there is none.
    return Response.json({ songs: [] });
  }

  const caller = await callerFrom(request);
  if (!caller) {
    return Response.json({ error: 'signed_out', message: 'Sign in to see this.' }, { status: 401 });
  }

  const client = admin();
  if (!client) return Response.json({ songs: [] });

  const { data, error } = await client.rpc('listens_for', {
    want_owner: caller.id,
    days: 3650,
  });
  if (error) {
    /* The file has not been run yet. Said as a state rather than as a failure,
       because nothing is broken — the counting simply has not been switched
       on, and the screen can say that instead of showing a zero that looks
       like nobody listened. */
    return Response.json({ songs: [], counting: false });
  }

  const rows = Array.isArray(data) ? (data as ReadonlyArray<Record<string, unknown>>) : [];
  const songs: Listened[] = rows.map((row) => ({
    ref: String(row.ref ?? ''),
    listens: Number(row.listens) || 0,
    listeners: Number(row.listeners) || 0,
    lastDay: typeof row.last_day === 'string' ? row.last_day : null,
  }));

  return Response.json({ songs, counting: true });
}
