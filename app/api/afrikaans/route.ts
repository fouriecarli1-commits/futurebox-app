/**
 * "This word did not come out right."
 *
 * ── Why this is the only way the dictionary gets good ────────────────────
 *
 * `app/lib/server/sayit.ts` says it about itself: an alias dictionary is easy
 * to build and impossible to build well, because what belongs in it has to
 * come from LISTENING. A list invented at a desk is a list of words a model
 * probably says fine.
 *
 * One person's ear found `-tjie`. Every member's ear finds the rest.
 *
 * Carli, 11 September 2026: "Kan ons dalk vir Afrikaanse generators vra om
 * vir ons terugvoer te gee as afrikaanse woorde nie reg uit kom nie? Dit kan
 * baie help."
 *
 * ── A report is a candidate, never a rule ────────────────────────────────
 *
 * Nothing here ever changes what anybody hears. The rules live in `sayit.ts`
 * as source and enter it through a commit somebody read. That is deliberate
 * and it is the whole safety property: crowd input written straight into a
 * pronunciation dictionary is how one person's joke ends up in everyone's
 * Afrikaans, on a paid account, in a voice that sounds like the owner's.
 *
 * So this writes a row and says "we will look", and the screen says the same.
 * Promising a fix for something nobody has read yet would be the third time
 * this app told somebody it had done something it had not.
 *
 * ── Why it does not ask which kind of fault it is ────────────────────────
 *
 * A member who hears something wrong does not know, and should not have to
 * know, whether the writer spelled it oddly or the voice read it oddly. Two
 * different files, one ear. The screen asks for the word and how it should
 * sound; `surface` and `spoken` are filled in by the code, and whoever reads
 * the list decides which of the two it is.
 */
import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { tooMany } from '@/app/lib/server/brake';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  /** The word that came out wrong. */
  word?: string;
  /** How it should sound, in ordinary letters. May be empty. */
  should?: string;
  /** Which room it happened in. */
  surface?: string;
  /** Heard, or read. */
  spoken?: boolean;
  /** The line it was in, so the word can be seen in context. */
  said?: string;
}

const LIMITS = { perMinute: 6, perHour: 40 };

export async function POST(request: Request): Promise<Response> {
  if (tooMany('afrikaans', request, LIMITS)) {
    return Response.json({ error: 'rate_limited', message: 'Too many at once.' }, { status: 429 });
  }
  if (!metered()) {
    return Response.json(
      { error: 'not_configured', message: 'Reports need an account service, which is not set up.' },
      { status: 503 },
    );
  }

  const caller = await callerFrom(request);
  if (!caller) {
    return Response.json({ error: 'signed_out', message: 'Sign in first.' }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: 'bad_request', message: 'Could not read that.' }, { status: 400 });
  }

  const word = (body.word ?? '').trim();
  if (!word || word.length > 80) {
    return Response.json({ error: 'bad_request', message: 'Which word?' }, { status: 400 });
  }

  const client = admin();
  if (!client) {
    return Response.json({ error: 'not_configured', message: 'No account service.' }, { status: 503 });
  }

  const { error } = await client.from('afrikaans_reports').insert({
    owner: caller.id,
    word,
    /* Trimmed rather than refused. Somebody typing a whole sentence into
       "how should it sound" has still told us something, and throwing it
       away over a length would be throwing away the only part that makes a
       report actionable. */
    should: (body.should ?? '').trim().slice(0, 120),
    surface: (body.surface ?? '').trim().slice(0, 40),
    spoken: body.spoken !== false,
    said: (body.said ?? '').trim().slice(0, 400),
  });

  if (error) {
    /* The one-a-day index, which is a rule in the table rather than a check
       in a route so nothing can miss it. Reported as a thank-you rather than
       as a failure: from where the person is standing they have already told
       us, and "you already said that" is a scolding for helping. */
    if (/duplicate key|unique/i.test(error.message)) {
      return Response.json({ ok: true, already: true });
    }
    /* The table not being there is not the member's problem and not a
       mystery either — it is `supabase/afrikaans.sql` not having been run. */
    if (/relation .* does not exist|schema cache/i.test(error.message)) {
      return Response.json(
        { error: 'not_configured', message: 'Reports are not switched on yet.' },
        { status: 503 },
      );
    }
    return Response.json({ error: 'unavailable', message: 'That could not be sent.' }, { status: 502 });
  }

  return Response.json({ ok: true });
}

function sameSecret(given: string, wanted: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(wanted);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * The list, for whoever is going to turn it into rules.
 *
 * Behind `POST_SECRET` like the other owner pages, because it is everybody's
 * reports rather than one person's, and because the point of it is to be read
 * by the one person who can commit to `sayit.ts`.
 *
 * Grouped by word and counted, since the number of separate people who
 * reported a word is the only ranking that matters — one person reporting ten
 * words and ten people reporting one word look identical in a raw list and
 * mean completely different things.
 */
export async function GET(request: Request): Promise<Response> {
  const wanted = process.env.POST_SECRET ?? '';
  const url = new URL(request.url);
  if (!wanted || !sameSecret(url.searchParams.get('key') ?? '', wanted)) {
    return new Response('no', { status: 404 });
  }

  const client = admin();
  if (!client) {
    return Response.json({ ok: false, why: 'No account service.' }, { status: 503 });
  }

  const { data, error } = await client
    .from('afrikaans_reports')
    .select('word, should, surface, spoken, said, owner, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return Response.json({ ok: false, why: error.message }, { status: 502 });
  }

  const rows = (data ?? []) as {
    word: string; should: string; surface: string; spoken: boolean; said: string;
    owner: string; created_at: string;
  }[];

  const byWord = new Map<string, { word: string; people: Set<string>; should: string[]; where: Set<string>; spoken: number }>();
  for (const one of rows) {
    const key = one.word.trim().toLowerCase();
    const held = byWord.get(key) ?? { word: one.word.trim(), people: new Set(), should: [], where: new Set(), spoken: 0 };
    held.people.add(one.owner);
    if (one.should.trim()) held.should.push(one.should.trim());
    if (one.surface) held.where.add(one.surface);
    if (one.spoken) held.spoken += 1;
    byWord.set(key, held);
  }

  const words = [...byWord.values()]
    .map((one) => ({
      word: one.word,
      /* People, not reports. The one-a-day index already stops a person
         reporting the same word twice in a day, and this is the number that
         decides what to fix first. */
      people: one.people.size,
      heard: one.spoken,
      suggested: [...new Set(one.should)].slice(0, 8),
      rooms: [...one.where],
    }))
    .sort((a, b) => b.people - a.people);

  return Response.json({
    ok: true,
    reports: rows.length,
    words,
    /* Said plainly, because a list like this invites exactly the shortcut it
       must not have. */
    next: 'These are candidates. Add the ones you agree with to app/lib/server/sayit.ts, ' +
      'then open /api/eleven/dictionary?key=… and paste the new version id into Vercel. ' +
      'Nothing here changes what anybody hears on its own, and it must not.',
  });
}
