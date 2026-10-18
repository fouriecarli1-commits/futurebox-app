/**
 * The conduct count, for the owner, so a cut-off can be set from a number.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * The owner, 11 October 2026: *"ons moet 'n afsny punte hê."* A cut-off set
 * without a measurement is a cut-off set against an imagined customer. This
 * is the measurement, and it is the only reason `lib/server/conduct.ts`
 * writes anything at all.
 *
 * ── What it answers ──────────────────────────────────────────────────────
 *
 * How many, how many different people, and how they are distributed — because
 * the distribution is the whole decision. Thirty rows spread over thirty
 * people is one bad day each and no policy is needed. Thirty rows from two
 * people is two people, and a line drawn anywhere above two catches nobody
 * else.
 *
 * The worst case is reported as a count per person, never as a name or an
 * address: she does not need to know WHO in order to choose a number, and a
 * screen that tells her who invites deciding about a person before there is
 * a policy to decide by.
 *
 * ── Owner only, and 404 rather than 403 ─────────────────────────────────
 *
 * `opened()`, the shared owner door, rather than a key check written again
 * here. It takes both ways in — signed in as the owner, or `POST_SECRET` on
 * the address — it compares the secret in constant time, and it answers the
 * same way every other owner route does. A fourth hand-rolled comparison was
 * the first draft of this file and it was wrong: it read the key off the
 * query string and compared it with `!==`, which leaks the key one character
 * at a time to anybody patient.
 */
import { admin } from '@/app/lib/server/account';
import { opened } from '@/app/lib/server/ownerdoor';

export const runtime = 'nodejs';

/** How far back. Thirty days, to match the window the refusal ladder uses. */
const DAYS = 30;

export async function GET(request: Request): Promise<Response> {
  const door = await opened(request);
  if (!door.open) return door.answer;

  const db = admin();
  if (!db) {
    return Response.json(
      { error: 'no_accounts', message: 'There is no database configured, so nothing has been recorded.' },
      { status: 503 },
    );
  }

  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from('moderation_events')
    .select('owner, ip_hash, surface, created_at')
    .eq('rule', 'abuse')
    .gte('created_at', since);

  if (error) {
    /* The supplier's words go to the log, never into the answer — same rule
       as every other route here. */
    console.error('the conduct count', error.message);
    return Response.json(
      { error: 'unreadable', message: 'The count could not be read.' },
      { status: 503 },
    );
  }

  const rows = data ?? [];
  /* One person, as well as this can be known: the account where there is
     one, and the address where there is not. Hashed already, and it is
     counted here and never returned. */
  const perPerson = new Map<string, number>();
  const perSurface = new Map<string, number>();
  for (const row of rows) {
    const who = (row.owner as string | null) ?? `ip:${(row.ip_hash as string | null) ?? 'unknown'}`;
    perPerson.set(who, (perPerson.get(who) ?? 0) + 1);
    const where = (row.surface as string | null) ?? 'unknown';
    perSurface.set(where, (perSurface.get(where) ?? 0) + 1);
  }

  const counts = [...perPerson.values()].sort((a, b) => b - a);

  return Response.json({
    days: DAYS,
    /* Said plainly, because a zero here and a count that was never written
       look identical and only one of them means nothing is happening. */
    note: rows.length === 0
      ? 'Nothing recorded yet. That is either nobody swearing at it or nothing reaching this count — check again once the app has had real traffic.'
      : 'Counted only. Nothing has been refused, slowed or held against anybody.',
    total: rows.length,
    people: perPerson.size,
    /* The shape of the problem, which is the actual decision. */
    worstPerson: counts[0] ?? 0,
    median: counts.length ? counts[Math.floor(counts.length / 2)] : 0,
    moreThanThree: counts.filter((one) => one > 3).length,
    moreThanTen: counts.filter((one) => one > 10).length,
    byRoom: Object.fromEntries(perSurface),
  });
}
