/**
 * What the prompt cache actually saved — measured, not estimated.
 *
 * ── Why this page exists ─────────────────────────────────────────────────
 *
 * Prompt caching went on on 19 September 2026, and
 * `docs/MAANDELIKSE-KOSTE.md` deliberately recorded no saving from it:
 *
 *   *"'n Kas wat nooit tref nie lyk presies soos een wat altyd tref, behalwe
 *    op die rekening."*
 *
 * That is not caution, it is the failure mode. A prompt under the model's
 * 512-token floor will not cache and nothing says so — no error, no warning,
 * the marker is simply accepted and does nothing. A single changed character
 * in the prefix fails the same silent way. And the rate is a quarter DEARER
 * for a call that stands alone, so a cache that never hits does not merely
 * fail to save: it costs money.
 *
 * So the saving may not be argued for. It is read off calls that happened.
 *
 * ── What it can say, and what it refuses to say ──────────────────────────
 *
 * Every figure comes from `ai_costs`, one row per model call, written by
 * `notecache`. With no rows it says so and returns nothing — it does not
 * return zero, because a zero saving and no measurement look the same in a
 * table and only one of them means the cache is not working.
 *
 * The counterfactual is the honest one: every token read from the cache, and
 * every token written to it, would have been an ordinary fresh input token.
 * The tokens were sent either way; the cache only changes the rate.
 *
 * `nothings` is the column to read first. It counts calls where the marker
 * did nothing at all. If it stays high, the saving is not coming, and the
 * reason is one of the two named above.
 *
 * ── Guarded, like every page that reports on money ───────────────────────
 *
 * It refuses without `POST_SECRET` rather than defaulting to open, compared
 * in constant time — the same arrangement as `/api/eleven/prices`. It
 * carries totals only: no prompt, no answer, nobody's name. That is what
 * makes it safe to paste into a chat, which is what it is for.
 */

import crypto from 'node:crypto';
import { admin } from '@/app/lib/server/account';
import { FLOOR_TOKENS, MODEL, paid, saved, wouldHavePaid } from '@/app/data/aiprices';

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
  hits: number;
  nothings: number;
  input_tokens: number;
  output_tokens: number;
  cache_read: number;
  cache_write: number;
  first_at: string | null;
  last_at: string | null;
}

/** Two decimals, because these are rand and cents and not a measurement. */
const cents = (value: number): number => Math.round(value * 100) / 100;

export async function GET(request: Request): Promise<Response> {
  const wanted = process.env.POST_SECRET ?? '';
  const given = new URL(request.url).searchParams.get('key') ?? '';
  if (!wanted || !sameSecret(given, wanted)) return new Response('no', { status: 404 });

  const db = admin();
  if (!db) {
    return Response.json(
      { error: 'no_accounts', message: 'There is no database configured, so nothing has been recorded.' },
      { status: 503 },
    );
  }

  const { data, error } = await db.from('ai_cache_check').select('*');
  if (error) {
    /* Postgres' own words go to the log, never into the answer.
       `check:aifault` caught this line on its first run and it was right
       to: a supplier's error text on a screen is in the wrong language,
       names things that are not the reader's, and is the same leak
       whether the supplier is Anthropic or Postgres. The sentence the
       reader gets is ours, and it says the one thing they can act on. */
    console.error(`[aikoste] ai_cache_check could not be read: ${error.message}`);
    return Response.json(
      {
        error: 'not_set_up',
        message:
          'ai_costs is not in this project yet — run supabase/aikoste.sql. Until then nothing is being recorded.',
      },
      { status: 503 },
    );
  }

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) {
    /* Not zero. Nothing. The difference matters: a zero saving means the
       cache is failing, and no measurement means nobody has pressed
       anything since the table was made. A table showing R0,00 for the
       second case is a table that reports a failure that has not happened. */
    return Response.json({
      measured: false,
      message:
        'No model calls have been recorded yet. Use the app — the copilot, the help desk, a song — and read this again.',
      model: MODEL,
      floorTokens: FLOOR_TOKENS,
    });
  }

  const perRoute = rows.map((row) => {
    const used = {
      input: row.input_tokens ?? 0,
      output: row.output_tokens ?? 0,
      cacheRead: row.cache_read ?? 0,
      cacheWrite: row.cache_write ?? 0,
    };
    return {
      what: row.what,
      calls: row.calls,
      /* Of the calls, how many read the cache — and how many cached nothing
         at all, which is the silent failure. */
      hits: row.hits,
      nothings: row.nothings,
      tokens: used,
      randPaid: cents(paid(used)),
      randWithoutCache: cents(wouldHavePaid(used)),
      randSaved: cents(saved(used)),
      firstAt: row.first_at,
      lastAt: row.last_at,
    };
  });

  const total = perRoute.reduce(
    (sum, one) => ({
      calls: sum.calls + one.calls,
      hits: sum.hits + one.hits,
      nothings: sum.nothings + one.nothings,
      randPaid: sum.randPaid + one.randPaid,
      randWithoutCache: sum.randWithoutCache + one.randWithoutCache,
      randSaved: sum.randSaved + one.randSaved,
    }),
    { calls: 0, hits: 0, nothings: 0, randPaid: 0, randWithoutCache: 0, randSaved: 0 },
  );

  /* A month's worth, from however many days are actually in the table.

     Scaled rather than guessed, and it says how many days it is scaling
     from — because thirty days extrapolated from four hours is a number
     with a straight face and no weight behind it. Anything under a day is
     refused outright rather than multiplied by 180. */
  const first = perRoute.map((one) => one.firstAt).filter(Boolean).sort()[0] ?? null;
  const days = first ? (Date.now() - new Date(first).getTime()) / 86_400_000 : 0;
  const monthly =
    days >= 1
      ? {
          days: Math.round(days * 10) / 10,
          randPaid: cents((total.randPaid / days) * 30),
          randWithoutCache: cents((total.randWithoutCache / days) * 30),
          randSaved: cents((total.randSaved / days) * 30),
        }
      : null;

  return Response.json({
    measured: true,
    model: MODEL,
    floorTokens: FLOOR_TOKENS,
    /* The headline, said plainly so it cannot be misread off a table: how
       many of the recorded calls cached nothing at all. */
    silentFailures: total.nothings,
    perRoute,
    total: {
      ...total,
      randPaid: cents(total.randPaid),
      randWithoutCache: cents(total.randWithoutCache),
      randSaved: cents(total.randSaved),
    },
    monthly,
    /* Said out loud rather than left for the reader to work out, because
       the negative case is the one nobody expects and it is real: a burst
       of one call pays 25% extra to write an entry nothing ever reads. */
    note:
      total.randSaved < 0
        ? 'The cache has COST money so far. Every call wrote an entry that nothing read back inside five minutes.'
        : 'Saving measured against the same calls billed with no caching at all.',
  });
}
