/**
 * Which of Lyria's two text rows is the words of the song?
 *
 * ── Why this page exists ─────────────────────────────────────────────────
 *
 * Lyria sends the lyrics it wrote with every song, and a description of what
 * it made, as two rows beside the audio. Which is which is settled only by
 * their ORDER — see `Made.said` in `lib/server/lyria.ts` for why guessing
 * that would be the same mistake that moved the Veo model id twice in one
 * afternoon.
 *
 * The first version of the answer to that was: "make a song and look at
 * `X-Song-Words` in the browser's network tab."
 *
 * Carli, 9 October 2026: *"Verduidelik beter wat ek moet doen?"*
 *
 * She is right and the instruction was the fault. Asking somebody to open
 * developer tools on a phone, decode base64 by eye and report a header is
 * not an instruction, it is a way of making a person do a machine's job.
 * Writing the page was always cheaper than explaining the network tab.
 *
 * So this makes ONE short song and prints the rows in order, in words, with
 * the one question that has to be answered under them.
 *
 * ── It costs about R1.28, and it says so first ───────────────────────────
 *
 * One Lyria song is $0.08 — the cheapest real measurement available on this
 * project. Nothing is spent without `?go=yes`, the same arrangement as
 * `/api/google/videotest`.
 *
 * ── Guarded ──────────────────────────────────────────────────────────────
 *
 * Behind the owner's own sign-in, or POST_SECRET — see `ownerdoor.ts`. It
 * spends money. Nothing of a member's is read: the song is thrown away and
 * only the text comes back.
 */

import { opened } from '@/app/lib/server/ownerdoor';
import { CHOSEN, configured as googleOn, project, region } from '@/app/lib/server/google';
import { makeSong } from '@/app/lib/server/lyria';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** A song is tens of seconds upstream. Not a quick call. */
export const maxDuration = 120;

/**
 * Deliberately a song with WORDS in it, and deliberately Afrikaans.
 *
 * Words, because a row of lyrics only exists if something was sung — an
 * instrumental would answer the question with one row and settle nothing.
 *
 * Afrikaans, because that is the language the answer is for: if Lyria writes
 * the words in English when asked in Afrikaans, that is worth knowing in the
 * same press and would otherwise take a second one.
 */
const ASK = 'A short, warm Afrikaans song about driving home at sunset.'
  + ' Simple sung words, two short verses.';

/** The most of each row to show. Enough to tell lyrics from a description. */
const SHOW = 400;

export async function GET(request: Request): Promise<Response> {
  const door = await opened(request);
  if (!door.open) return door.answer;

  const url = new URL(request.url);
  const go = url.searchParams.get('go') === 'yes';
  const here = `${url.origin}${url.pathname}`;

  if (!googleOn()) {
    return Response.json({
      ready: false,
      says: 'GOOGLE_VERTEX_KEY or GOOGLE_PROJECT is not set on this deployment,'
        + ' so there is nothing to ask. See docs/GOOGLE-OPSTEL.md.',
    });
  }

  if (!go) {
    return Response.json({
      ready: true,
      willSpend: true,
      says: 'This makes ONE short Afrikaans song and shows you the text Lyria'
        + ' sends back with it. It costs about $0.08 — call it R1.28 — and it'
        + ' answers the one question holding up the automatic lyric video:'
        + ' which of the two pieces of text is the WORDS, and which is the'
        + ' description. Add &go=yes to the address to spend it.',
      project: project(),
      region: region(),
      model: CHOSEN.music,
      pressToStart: `${here}?go=yes`,
    });
  }

  const made = await makeSong(ASK, '', undefined, CHOSEN.music);
  if (!made.ok) {
    return Response.json({
      ready: true,
      says: `Lyria would not make it, so nothing was measured. It answered`
        + ` ${made.status}: ${made.message}`,
    });
  }

  /* The rows, numbered, in the order they arrived. That order IS the
     finding; sorting or labelling them here would throw away the only
     thing this page exists to measure. */
  const rows = made.said.map((text, index) => ({
    row: index + 1,
    characters: text.length,
    lines: text.split('\n').length,
    /* A guess, shown AS a guess, so she can agree or disagree with it
       rather than having to work it out from scratch. Lyrics have many
       short lines and often repeat; a description is one paragraph of
       prose. It is stated as "looks like" because that is all it is. */
    looksLike: text.split('\n').length > 2 ? 'the words of a song' : 'a description',
    text: text.slice(0, SHOW) + (text.length > SHOW ? ' …' : ''),
  }));

  return Response.json({
    ready: true,
    howManyRows: rows.length,
    rows,
    says: rows.length === 0
      ? 'Lyria made the song and sent NO text with it. That is an answer too:'
        + ' there is nothing to build a lyric video from, and the words would'
        + ' have to come from somewhere else.'
      : rows.length === 1
        ? 'Only one piece of text came back. Tell me what it says and whether'
          + ' it is the words or a description.'
        : 'Two or more pieces of text came back. Look at them below and tell me'
          + ' which ROW NUMBER holds the words that are sung. That is the whole'
          + ' answer, and it unblocks the automatic lyric video.',
    /* Said out loud because it is a second finding in the same press, and
       one that decides whether the lyric video is worth building for
       Afrikaans at all. */
    alsoWorthSaying: 'The song was asked for in Afrikaans. If the words below'
      + ' came back in English, that is worth knowing now rather than after a'
      + ' lyric video has been built on them.',
    pressAgain: `${here}?go=yes`,
  });
}
