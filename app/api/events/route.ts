/**
 * What happened, written down.
 *
 * The browser tells this route that somebody arrived, opened a masterclass,
 * read an article or rendered a video. Nothing here is trusted: the kind is
 * checked against a fixed list, the visitor id has to look like one this app
 * issued, and the database's own unique index — one person, one thing, one day
 * — is what makes the totals mean anything. A caller who sends the same event
 * a thousand times produces one row, and gets the same answer as the first
 * time, because from the counter's point of view nothing different happened.
 *
 * Songs and payments are deliberately not accepted here. Those are recorded by
 * the server at the moment it spends a credit or a webhook confirms money, in
 * tables the browser cannot reach at all. Letting a page claim "a song was
 * made" would make the one number with a cost behind it the easiest to fake.
 */

import { callerFrom } from '@/app/lib/server/account';
import { isEventKind, recordEvent } from '@/app/lib/server/stats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** As issued by the browser: 32 hex characters and nothing else. */
const VISITOR = /^[0-9a-f]{32}$/;

/** Long enough to name a track or a masterclass, short enough not to be a payload. */
const MAX_REF = 120;

/**
 * A ceiling per address, so one script cannot fill the table.
 *
 * This is per running instance, and a serverless deployment has several, so it
 * is a brake rather than a gate — the real protection is the unique index,
 * which makes a flood of identical events cost one row. This stops the flood
 * from costing a thousand database calls on the way to that one row.
 */
const PER_MINUTE = 60;
const seen = new Map<string, { count: number; until: number }>();

function tooMany(address: string): boolean {
  const now = Date.now();
  const entry = seen.get(address);
  if (!entry || now > entry.until) {
    seen.set(address, { count: 1, until: now + 60_000 });
    // The map would otherwise grow for as long as the instance lives.
    if (seen.size > 5_000) seen.forEach((value, key) => { if (now > value.until) seen.delete(key); });
    return false;
  }
  entry.count += 1;
  return entry.count > PER_MINUTE;
}

export async function POST(request: Request): Promise<Response> {
  const address =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  if (tooMany(address)) return new Response(null, { status: 429 });

  let body: { kind?: unknown; category?: unknown; ref?: unknown; visitor?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response(null, { status: 400 });
  }

  const kind = body.kind;
  const visitor = body.visitor;
  if (!isEventKind(kind)) return new Response(null, { status: 400 });
  if (typeof visitor !== 'string' || !VISITOR.test(visitor)) return new Response(null, { status: 400 });

  const text = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() ? value.trim().slice(0, MAX_REF) : null;

  // Signed in or not, the event counts. The account is attached when there is
  // one because it costs nothing here and answers "who" later; the counters
  // themselves never break it down by person.
  const caller = await callerFrom(request).catch(() => null);

  await recordEvent({
    kind,
    category: text(body.category),
    ref: text(body.ref),
    owner: caller ? caller.id : null,
    visitor,
  });

  // Nothing to say. The page is not waiting on this and must never be held up
  // by it — a counter is not worth a slower first paint.
  return new Response(null, { status: 204 });
}
