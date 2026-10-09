/**
 * The words a song came back with are kept, and only when they are words.
 *
 * ── The fault, one layer at a time ───────────────────────────────────────
 *
 * Google's music model sends the lyrics it sang along with the audio.
 *
 * On 9 October `lib/server/lyria.ts` recorded that `wordsIn` — the function
 * that reads them out — was exported and called by nothing: *"The app paid
 * for every song, Google sent the words with every one, and they were read
 * into an array and dropped on the floor."* That was fixed, and the route
 * began sending them to the browser in a header.
 *
 * Nothing in the browser read the header. The same fault, one layer up,
 * found the same way — by grepping for the name of the thing that was
 * supposed to be using it.
 *
 * ── Why a classifier and not a question ──────────────────────────────────
 *
 * The rows arrive unlabelled: a song can come back with its lyrics, a
 * description of what was made, a refusal, or several of those. `lyria.ts`
 * left it as *"the FIRST REAL SONG says which is which"*, which meant asking
 * Carli to look at a row and tell me what it was. She has already said what
 * that feels like, about a different question of mine: *"ek weet eintlik
 * glad nie wat jy soek nie."*
 *
 * So the app reads the shape, and the cost of being wrong — named in
 * `lyria.ts` — is why it refuses rather than guesses: *"a release that
 * published the description where the lyrics should be, or a lyric video
 * that scrolls 'A warm mid-tempo ballad with brushed drums' across the
 * screen on the beat."*
 *
 * ── Why this is driven ───────────────────────────────────────────────────
 *
 * Because a classifier has no failure mode that looks like one. It returns a
 * string either way. The rows below are the four shapes that actually
 * arrive, and what matters is the GAP between them — a wide gap is what
 * makes a fixed bar safe instead of a tuned number.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { ENOUGH, readingOf, rowsFrom, sungWordsIn } from '../app/lib/sungwords.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nThe words a song came back with, kept only when they are words\n');

const LYRIC = `[Verse]\nEk sit hier stil en word van alles waar\nDaar buite in die vroeë lig se gloed\nEn alles wat ek was is nou net lug\nEk vlieg\n\n[Chorus]\nAltyd vry\nAltyd vry`;
const BARE = `Ek vlieg vanaand\nDie wind is koud\nMy hart is oop\nEk gaan nie terug`;
const DESC = 'A warm mid-tempo ballad with brushed drums and a close, breathy vocal. The arrangement builds to a full chorus with layered harmonies.';
const REFUSAL = 'I cannot generate music in the style of a named artist.';

/* ── 1. The four shapes ──────────────────────────────────────────────── */

ok('a lyric sheet with section markers reads as lyrics',
  readingOf(LYRIC).score >= ENOUGH,
  `${readingOf(LYRIC).score.toFixed(2)} against a bar of ${ENOUGH}`);

ok('  and one without any markers does too',
  readingOf(BARE).score >= ENOUGH,
  `${readingOf(BARE).score.toFixed(2)} — markers are evidence, not the test:`
  + ' plenty of engines send the words with no [Verse] in them, and a sheet'
  + ' that needs one is a sheet that works on one engine');

ok('  while a description does not',
  readingOf(DESC).score < ENOUGH,
  `${readingOf(DESC).score.toFixed(2)} — this is the one that matters: a`
  + ' release with "A warm mid-tempo ballad with brushed drums" printed on'
  + ' it where the words should be');

ok('  and neither does a refusal',
  readingOf(REFUSAL).score < ENOUGH,
  `${readingOf(REFUSAL).score.toFixed(2)} — a refusal scrolling across a`
  + ' lyric video is worse than no lyric video');

/* The gap is the property, not the numbers. A bar sitting in a narrow gap is
   a number somebody tuned, and it moves the first time an engine phrases
   something differently. */
const gap = Math.min(readingOf(LYRIC).score, readingOf(BARE).score)
  - Math.max(readingOf(DESC).score, readingOf(REFUSAL).score);
ok('  and the gap between them is wide enough for a fixed bar',
  gap > 0.25,
  `${gap.toFixed(2)} between the worst lyric sheet and the best non-lyric —`
  + ' a narrow gap means the bar is tuned rather than safe, and it moves the'
  + ' first time an engine phrases something differently');

/* ── 2. Picking among them ───────────────────────────────────────────── */

ok('the lyrics are picked out from among the other rows',
  Boolean(sungWordsIn([DESC, LYRIC, REFUSAL])?.startsWith('[Verse]')),
  'the wrong row was picked out of three, which is the ordinary case: an'
  + ' engine sends a description AND the words');

ok('  and a song that sent only a description has no lyrics',
  sungWordsIn([DESC]) === null && sungWordsIn([DESC, REFUSAL]) === null,
  'the best of a bad set was taken — a row has to clear a bar, not merely'
  + ' beat the others, or every song gets "lyrics" whatever came back');

ok('  and nothing at all is nothing',
  sungWordsIn([]) === null && sungWordsIn(['', '   ']) === null,
  'an empty set produced a string, which is a lyric sheet made of nothing');

/* ── 3. The header, both halves of it ────────────────────────────────── */

/* Packed the way `saidHeader` packs it, so this breaks if either side moves
   without the other. */
const packed = Buffer.from(JSON.stringify([DESC, LYRIC]), 'utf8').toString('base64');
const rows = rowsFrom(new Headers({ 'X-Song-Words': packed }));
ok('the rows come back out of the header the server packs',
  rows.length === 2 && rows[1].startsWith('[Verse]'),
  `${rows.length} row(s) — a header may hold neither a newline nor a`
  + ' non-Latin-1 byte, and Afrikaans lyrics are full of both, so the two'
  + ' sides have to agree about base64 and about the separator');

/* The assertion that found it. A lyric sheet has a blank line between its
   verse and its chorus, and `\n\n` was the row separator — so one sheet came
   back as two rows and the reader kept the verse and lost the chorus. */
ok('  and a lyric sheet with a blank line in it stays ONE row',
  rows[1].includes('[Verse]') && rows[1].includes('[Chorus]'),
  'the sheet was split at its own blank line, so the chorus is a separate'
  + ' row — and the reader keeps whichever scores higher and silently loses'
  + ' the rest, which looks like a short song rather than like a bug');

ok('  and Afrikaans survives the round trip',
  rows.join(' ').includes('vroeë'),
  'the accented letters came back wrong, which is the whole reason the'
  + ' header is base64 rather than the words themselves');

ok('  and a header that will not decode is simply no words',
  rowsFrom(new Headers({ 'X-Song-Words': '!!!not base64!!!' })).length === 0
  && rowsFrom(new Headers()).length === 0,
  'a bad header throws, which takes down the song that arrived with it');

/* ── 4. Nothing is overwritten ───────────────────────────────────────── */

const room = withoutComments(readFileSync('app/components/MakeMusic.tsx', 'utf8'));
const call = withoutComments(readFileSync('app/lib/engines.ts', 'utf8'));

ok('the engine call reads the header at all',
  /sungWordsIn\s*\(/.test(call) && /rowsFrom\s*\(/.test(call),
  'the words arrive and nothing looks at them — which is the fault this'
  + ' whole file is about, at the layer it was found on');

ok('  and the room keeps them only where it has none of its own',
  /if \(result\.sung && !lyrics\.trim\(\)\)/.test(room),
  "somebody who wrote their own lyrics has them overwritten by the engine's"
  + ' reading of them, which is the app correcting her');

ok('  and the track carries hers first',
  /lyrics: lyrics\.trim\(\) \|\| sungBack/.test(room),
  'the engine\'s words win over the ones she typed');

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);
