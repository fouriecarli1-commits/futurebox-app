/**
 * What this account keeps coming back to.
 *
 * ── Why it is on the account and not in the browser ──────────────────────
 *
 * The welcome screen's "another dubstep song today?" was read out of
 * `localStorage`. On a phone, on a second laptop, or after clearing site data
 * the app knew nothing about the person in front of it — and the copilot never
 * read any of it at all, so thirteen rooms of suggestions were shaped by
 * nothing.
 *
 * ── A rollup, deliberately not a log ─────────────────────────────────────
 *
 * One row per label with a count and a last-seen, not one row per event. A
 * minute-by-minute record of when somebody works is a behavioural profile;
 * what the app needs is "dubstep, eleven times, last on Tuesday". The timeline
 * is not kept because it is not written down, which is a thing the privacy
 * notice can say plainly rather than hedge.
 *
 * ── What is refused ──────────────────────────────────────────────────────
 *
 * A label longer than sixty characters, or one that is a whole prompt rather
 * than a genre. This is fed from free text somebody typed in a style box, and
 * a table of remembered sentences is a different and much worse thing than a
 * table of remembered genres.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { tooMany } from '@/app/lib/server/brake';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generous, because this is called in the ordinary course of using the app —
 * every song and every room — and stingy enough that a loop cannot fill the
 * table. Nobody working normally will reach it.
 */
const LIMITS = { perMinute: 60, perHour: 600 };

const KINDS = new Set(['genre', 'room']);

/** The longest a genre or a room name can sensibly be. */
const MOST = 60;

/**
 * A label worth remembering, or null.
 *
 * Genres arrive from a free-text style box, so "dark moody dubstep with a
 * broken beat and a female vocal" is a thing somebody will type. Remembering
 * that sentence would be both useless — it will never be typed again, so it
 * never reaches a count of two — and a worse thing to hold than a genre.
 */
function labelOf(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!clean || clean.length > MOST) return null;
  // Two words is a genre ("boom bap", "deep house"); five is a description.
  if (clean.split(' ').length > 4) return null;
  return clean;
}

export async function POST(request: Request): Promise<Response> {
  if (tooMany('taste', request, LIMITS)) {
    return Response.json({ error: 'rate_limited' }, { status: 429 });
  }
  if (!metered()) return Response.json({ noted: false, reason: 'not_configured' });

  const caller = await callerFrom(request);
  // Not an error: plenty of the app works signed out, and the rooms that call
  // this should not have to know whether anybody is signed in.
  if (!caller) return Response.json({ noted: false, reason: 'signed_out' });

  let body: { kind?: unknown; label?: unknown };
  try {
    body = (await request.json()) as { kind?: unknown; label?: unknown };
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const kind = typeof body.kind === 'string' ? body.kind : '';
  const label = labelOf(body.label);
  if (!KINDS.has(kind) || !label) {
    return Response.json({ noted: false, reason: 'not_worth_keeping' });
  }

  const client = admin();
  if (!client) return Response.json({ noted: false, reason: 'not_configured' });

  const { error } = await client.rpc('note_taste', {
    p_owner: caller.id,
    p_kind: kind,
    p_label: label,
  });
  /* A failure here is not worth telling anybody about and is certainly not
     worth failing the thing they were actually doing. The table not existing
     yet — `supabase/taste.sql` not run — lands here, and the app carries on
     reading the device instead. */
  if (error) return Response.json({ noted: false, reason: 'unavailable' });
  return Response.json({ noted: true });
}

export async function GET(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ taste: [], ready: false });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ taste: [], ready: false });

  const client = admin();
  if (!client) return Response.json({ taste: [], ready: false });

  const { data, error } = await client
    .from('taste')
    .select('kind,label,times,last_at')
    .eq('owner', caller.id)
    .order('times', { ascending: false })
    .limit(40);

  /* `ready: false` rather than an empty list, because they are different
     answers and the screen says different things about them: a new account has
     nothing yet, an app whose migration has not been run cannot know. The
     wallet was fixed for exactly this confusion. */
  if (error) return Response.json({ taste: [], ready: false });
  return Response.json({ taste: data ?? [], ready: true });
}

/** Stop remembering. Offered on the account screen. */
export async function DELETE(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ forgotten: false });
  const caller = await callerFrom(request);
  if (!caller) {
    return Response.json({ error: 'signed_out', message: 'Sign in first.' }, { status: 401 });
  }
  const client = admin();
  if (!client) return Response.json({ forgotten: false });

  const { error } = await client.rpc('forget_taste', { p_owner: caller.id });
  if (error) {
    return Response.json(
      { error: 'failed', message: 'That could not be cleared just now.' },
      { status: 502 },
    );
  }
  return Response.json({ forgotten: true });
}
