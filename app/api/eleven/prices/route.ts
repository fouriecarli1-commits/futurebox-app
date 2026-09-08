/**
 * Are we charging enough for the ElevenLabs work?
 *
 * ── The one number this page exists for ──────────────────────────────────
 *
 * This app charges credits by the minute. ElevenLabs charges by the character.
 * Nobody has ever compared the two against real traffic, because until now the
 * `character-cost` header they send back went into a log and nowhere else.
 *
 * `eleven_costs` now holds one row per call — what was done, what they
 * charged, what we charged — and `eleven_price_check` groups it by kind over
 * ninety days. The column that matters is **characters per credit**. If it
 * climbs, we are handing out more work per credit than we did, and the margin
 * is going the wrong way.
 *
 * ── Guarded, like every page that reports on money ───────────────────────
 *
 * It refuses without `POST_SECRET` rather than defaulting to open, compared in
 * constant time. It carries totals and rates, never anybody's text or audio,
 * so it is safe to paste into a chat — which is what it is for.
 */

import crypto from 'node:crypto';
import { admin } from '@/app/lib/server/account';
import { CREDITS } from '@/app/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sameSecret(given: string, wanted: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(wanted);
  // `timingSafeEqual` throws on a length mismatch, which is itself a leak.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

interface Row {
  what: string;
  calls: number;
  characters: number | null;
  credits: number | null;
  chars_per_credit: number | null;
  since: string | null;
}

export async function GET(request: Request): Promise<Response> {
  const wanted = process.env.POST_SECRET ?? '';
  const given = new URL(request.url).searchParams.get('key') ?? '';
  if (!wanted || !sameSecret(given, wanted)) return new Response('no', { status: 404 });

  const db = admin();
  if (!db) {
    return Response.json(
      { message: 'The database is not configured, so there is nothing to compare.' },
      { status: 503 },
    );
  }

  const { data, error } = await db.from('eleven_price_check').select('*');
  if (error) {
    /* The most likely reason by far, and the one worth naming rather than
       relaying a Postgres string that means nothing to the person reading. */
    return Response.json(
      {
        message:
          'Could not read the comparison. Run supabase/eleven.sql (or supabase/ALMAL.sql) in Supabase first.',
        detail: error.message,
      },
      { status: 503 },
    );
  }

  const rows = (data ?? []) as Row[];
  return Response.json({
    /* An empty answer is not a failure — it means no ElevenLabs work has been
       done since the table was created. Saying so beats an empty list that
       reads like something broke. */
    ready: rows.length > 0,
    why:
      rows.length > 0
        ? 'Characters per credit is the number. Watch it over months; a rise means the margin is slipping.'
        : 'Nothing has been recorded yet. Make one podcast read or voice change and open this again.',
    /* What the app asks, so the two sit on one screen instead of one here and
       one in the source. */
    weCharge: {
      read: CREDITS.read,
      voiceChange: CREDITS.voiceChange,
      clean: CREDITS.clean,
      clone: CREDITS.clone,
      stems: CREDITS.stems,
      song: CREDITS.song,
    },
    perKind: rows,
  });
}
