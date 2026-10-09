/**
 * The words Lyria sends with every song, and the fact that they reach anybody.
 *
 * ── What this is about ───────────────────────────────────────────────────
 *
 * Carli's own Model Garden page, 9 October 2026, shows Lyria answering with
 * three rows: two of type `text` and one of type `audio`. The two text rows
 * are the words it wrote and a description of what it made.
 *
 * `wordsIn` was written that day to read them, was exported, and was called
 * by **nothing**. Every song since 8 October has been paid for, has arrived
 * with its own words attached, and the words were read into an array and
 * dropped. It was found by grepping for its own name.
 *
 * So this file holds the one thing that matters: they are carried out of
 * `makeSong` and they reach the browser. A reader nobody calls is the
 * failure this is here to prevent happening twice.
 *
 * ── And the thing it refuses to assert ───────────────────────────────────
 *
 * Which row is the lyrics. The card shows `{"text": "LYRICS"}` and
 * `{"text": "DESCRIPTION"}` — those are the card's EXAMPLE VALUES, not
 * labels, and the rows carry no field saying which is which. The only thing
 * separating them is their order.
 *
 * Naming the first one `lyrics` would be a conclusion from a sample. The
 * cost of being wrong is a release that publishes the description as the
 * words, or a lyric video scrolling "A warm mid-tempo ballad with brushed
 * drums" across the screen on the beat. One real song settles it; until
 * then the rows stay rows, and this file asserts that they do.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { saidHeader, wordsIn } from '../app/lib/server/lyria.ts';
import { rowsFrom } from '../app/lib/sungwords.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/* ── 1. The reader, over the shape off her own page ───────────────────── */

const REAL = {
  status: 'completed',
  outputs: [
    { text: 'Ek ry alleen deur die Karoo\nDie son sak stil', type: 'text' },
    { text: 'A warm mid-tempo ballad with brushed drums.', type: 'text' },
    { mime_type: '', data: 'A'.repeat(2048), type: 'audio' },
  ],
};

ok('both text rows are read off the answer',
  wordsIn(REAL).length === 2, `${wordsIn(REAL).length}`);

ok('  and the audio row is not read as words',
  !wordsIn(REAL).some((one) => one.startsWith('AAAA')),
  'the audio is base64 and would be the longest "text" on the page');

ok('  and a song with no text rows reads as none rather than throwing',
  wordsIn({ outputs: [{ type: 'audio', data: 'x' }] }).length === 0
  && wordsIn({}).length === 0 && wordsIn(null).length === 0);

/* ── 2. They reach the browser ────────────────────────────────────────── */

const head = saidHeader(wordsIn(REAL));

ok('the words are handed over in a header',
  typeof head['X-Song-Words'] === 'string' && head['X-Song-Words'].length > 0);

/* ── Read back the way the browser reads it ──────────────────────────────

   These three read the decoded text directly and split it on a blank line,
   because that is how the rows were packed until 9 October 2026 — and that
   packing was wrong: **lyrics are nothing but blank lines**, so a song whose
   words contain one came through as two rows and the second half was read as
   a separate verse. The rows are JSON now, and these go through the same
   reader the browser uses rather than re-implementing it here. A check that
   unpacks a format by hand is a second implementation that can drift. */
/* `rowsFrom` takes a `Headers`, because that is what a browser has. The
   record `saidHeader` builds is what a route hands to `new Response`, so it
   goes through the same constructor here — reading the route's record with a
   hand-written getter would be a third implementation of the same thing. */
const asHeaders = (made: Record<string, string>): Headers => new Headers(made);

const unpacked = rowsFrom(asHeaders(head));

ok('  and the newlines survive, which is why it is base64',
  unpacked.some((one) => one.includes('\n')),
  'a header may not contain a newline, and lyrics are nothing but newlines');

ok('  and Afrikaans survives, which is the other reason',
  (() => {
    const out = rowsFrom(asHeaders(saidHeader(['My voëltjie sing ’n liedjie'])));
    return out.length === 1 && out[0] === 'My voëltjie sing ’n liedjie';
  })(),
  'a header may not carry a non-Latin-1 byte, and "voëltjie" is full of'
  + ' them — raw, it either throws or arrives mangled depending on the'
  + ' runtime, and mangled is the worse of the two');

ok('  and the two rows can be told apart after decoding',
  unpacked.length === 2,
  'joined by one newline, a row with a line break in it would be'
  + ' indistinguishable from two rows');

ok('    including a row with a BLANK line inside it, which every song has',
  (() => {
    const verse = 'Verse one, first line\nsecond line\n\nchorus line\nanother';
    const out = rowsFrom(asHeaders(saidHeader([verse, 'a second row'])));
    return out.length === 2 && out[0] === verse;
  })(),
  'the rows were joined with a blank line until 9 October 2026, and lyrics'
  + ' are nothing but blank lines — so one song arrived as three rows and'
  + ' the browser read a chorus as a separate verse. Nothing threw, and the'
  + ' count in the other header disagreed with the list silently');

ok('  and how many rows there are is said, not counted by guessing',
  head['X-Song-Words-Rows'] === '2', head['X-Song-Words-Rows'] ?? 'absent');

ok('a song with no words sends NO header rather than an empty one',
  Object.keys(saidHeader([])).length === 0
  && Object.keys(saidHeader(['', '  '])).length === 0,
  'a field present but empty means something different from a field absent,'
  + ' and only one of those is true');

/* ── 3. Both routes actually send it ──────────────────────────────────── */

for (const path of ['app/api/music/route.ts', 'app/api/google/music/route.ts']) {
  const route = withoutComments(readFileSync(path, 'utf8'));
  ok(`${path} hands the words over`,
    /\.\.\.saidHeader\(made\.said\)/.test(route),
    'a reader that is called by nothing is exactly what this file exists'
    + ' for, and it happened once already');
}

/* ── 4. Nothing claims to know which row is which ─────────────────────── */

const lib = withoutComments(readFileSync('app/lib/server/lyria.ts', 'utf8'));

ok('nothing names a row `lyrics` or `description`',
  !/\blyrics\s*[:=]/.test(lib) && !/\bdescription\s*[:=]/.test(lib),
  'the card shows those two words as EXAMPLE VALUES, not labels. The rows'
  + ' carry no field saying which is which, so the only thing separating'
  + ' them is order — and a release that published the description as the'
  + ' words is what a guess here costs');

ok('  and `said` is a list rather than a shape with named parts',
  /readonly said: readonly string\[\]/.test(lib),
  'the moment it becomes { lyrics, description } somebody has decided'
  + ' something a real song has not told them yet');

console.log(bad === 0
  ? '\ncheck:woorde — Lyria has been sending the words with every song since'
  + ' 8 October; they are read, carried out, and handed to the browser intact'
  + ' in base64, and nothing pretends to know yet which row is which.'
  : `\ncheck:woorde — ${bad} assertion(s) failed.`);
process.exit(bad === 0 ? 0 : 1);
