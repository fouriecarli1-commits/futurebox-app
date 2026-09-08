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
 * ── And the other half: what they will actually charge ───────────────────
 *
 * Everything above is still OUR arithmetic — better arithmetic than a table,
 * because it is measured against real traffic, but inference all the same.
 * `GET /v1/user/subscription` skips the inference. It gives the number
 * ElevenLabs will take on the next invoice, and what is already being spent
 * beyond the plan.
 *
 * The two halves are the same question from both ends:
 *
 *     bill      what ElevenLabs will charge us
 *     perKind   what we charged members for that work
 *
 * and the gap between them is whether the month made a profit. That is the
 * thing Carli keeps asking for, and until now no page could answer it.
 *
 * `keyGuard` is the third, smaller thing on the page: whether the key is
 * fenced to the endpoints this app uses and whether it has a ceiling. It is a
 * READ. Nothing here creates, changes or deletes a key — see `keyGuards` in
 * `lib/server/eleven.ts` for why that line is drawn where it is.
 *
 * ── Guarded, like every page that reports on money ───────────────────────
 *
 * It refuses without `POST_SECRET` rather than defaulting to open, compared in
 * constant time. It carries totals and rates, never anybody's text or audio,
 * so it is safe to paste into a chat — which is what it is for.
 *
 * One thing it must keep never carrying: the key itself. `bill` and
 * `keyGuards` both allow-list their way out of ElevenLabs' answer rather than
 * passing it through, because this page's whole purpose is to be pasted
 * somewhere.
 */

import crypto from 'node:crypto';
import { admin } from '@/app/lib/server/account';
import { bill, configured, keyGuards, warningsFor } from '@/app/lib/server/eleven';
import { CREDITS } from '@/app/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/* Two reads against ElevenLabs on top of the database. The default ten seconds
   is enough on a good day and not enough on the day this page is most worth
   opening. */
export const maxDuration = 30;

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

  /* The two halves are fetched together and reported separately.

     They used to be one: a database that could not be read returned 503 and
     the page was over. That is now the wrong shape, because the half that
     answers Carli's actual question — what ElevenLabs will charge — does not
     touch the database at all. A missing table must not take the invoice down
     with it, and a refused key must not take the margin table down with it. */
  const [comparison, money, guard] = await Promise.all([
    readComparison(),
    configured() ? bill() : Promise.resolve(null),
    configured() ? keyGuards() : Promise.resolve(null),
  ]);

  const rows = comparison.rows;
  return Response.json({
    /* An empty answer is not a failure — it means no ElevenLabs work has been
       done since the table was created. Saying so beats an empty list that
       reads like something broke. */
    ready: rows.length > 0,
    why:
      rows.length > 0
        ? 'Characters per credit is the number. Watch it over months; a rise means the margin is slipping.'
        : 'Nothing has been recorded yet. Make one podcast read or voice change and open this again.',

    /* ── What ElevenLabs will charge ─────────────────────────────────────── */
    bill: money === null
      ? { message: 'The ElevenLabs key is not set on this deployment, so their own numbers cannot be read.' }
      : money.ok
        ? money.bill
        : { message: money.message, status: money.status },

    /* The sentences worth reading before the numbers. Written here rather than
       left for a reader to work out, because the whole point of this page is
       that somebody opens it once a month and sees the problem immediately. */
    warnings: money !== null && money.ok ? warningsFor(money.bill) : [],

    /* ── Whether the key is fenced in ────────────────────────────────────── */
    /* An empty list is an ANSWER, not an absence, and it needs saying in
       words. Carli's first real open of this page returned `[]`: the read
       succeeded and the workspace has no service accounts, which means the key
       in use is a personal key and the service-accounts restriction API does
       not apply to it at all. Left as a bare `[]` that reads as "nothing
       found", which is the opposite of useful — it is the thing that decides
       whether tightening the key is a script or three clicks in their console. */
    keyGuard: guard === null
      ? { message: 'No key set, so there is nothing to check.' }
      : !guard.ok
        ? { message: guard.message, status: guard.status }
        : guard.keys.length === 0
          ? {
              message:
                'The read worked and this workspace has no service accounts, so the key in use is a personal key. The permission list, the per-key credit ceiling and the IP restriction are all service-account features and do not apply to it. Restricting this key is a job in the ElevenLabs console, not something an API call here can do.',
              keys: [],
            }
          : guard.keys,

    /* ── What we charged for it ──────────────────────────────────────────── */
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
    /* Not fatal any more, so it has to be said out loud instead. */
    comparisonProblem: comparison.problem,
  });
}

/**
 * The margin table, or the reason there isn't one.
 *
 * Split out of `GET` when the invoice read was added: a missing table is now a
 * note on a page that still works, not the end of the request.
 */
async function readComparison(): Promise<{ rows: Row[]; problem: string | null }> {
  const db = admin();
  if (!db) {
    return { rows: [], problem: 'The database is not configured, so there is nothing to compare against.' };
  }
  const { data, error } = await db.from('eleven_price_check').select('*');
  if (error) {
    /* The most likely reason by far, and the one worth naming rather than
       relaying a Postgres string that means nothing to the person reading. */
    return {
      rows: [],
      problem: `Could not read the comparison — run supabase/eleven.sql (or supabase/ALMAL.sql) in Supabase first. (${error.message})`,
    };
  }
  return { rows: (data ?? []) as Row[], problem: null };
}
