/**
 * All the words, as a sheet, and the button that is dark for a reason.
 *
 * ── What she reported ────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026, two things in one message:
 *
 *   *"by probooth se sound recording is die button donker en nie beskikbaar
 *   nie wat sê listen to songs words."*
 *
 *   *"Ek dink ook die liedjie se woord moet ook op 'n button beskikbaar wees,
 *   waar die hele liedjie se woorde kan op pop vir iemand wat so wil record
 *   en die woorde in die geheel wil sien."*
 *
 * The first is not a broken button. "Read the words off the song" is greyed
 * while the microphone is open, while it is already reading, and while
 * another paid tool on the screen is working — all three correct, and none
 * of them said so. **A button that is dark for a good reason and a button
 * that is broken look exactly the same.**
 *
 * The second is the teleprompter problem. The booth shows the line that is
 * due now, which is right while singing and wrong in the minute before,
 * when what somebody wants is the shape of the whole song.
 *
 * ── What can be silently wrong here ──────────────────────────────────────
 *
 * **The sheet finds no words and is drawn empty.** A song made before the
 * plan was stored has no `parts`, only a lyric string — and that is most of
 * what exists. An empty sheet reads as the words having been LOST, which is
 * worse than no button at all.
 *
 * **It numbers a section that appears once.** "Chorus 1" on a song with one
 * chorus is a number that means nothing, and somebody mid-take reads it as
 * there being a Chorus 2 they have missed.
 *
 * **It is taken away while recording.** It costs nothing, reads nothing and
 * sends nothing, and the middle of a take is exactly when somebody wants it.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { SECONDS_A_LINE, linesIn, roughly, sheetOf } from '../app/lib/wholesheet.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/* ── 1. It finds the words in either place ─────────────────────────────── */

const PARTS = [
  { name: 'Verse', lines: ['Die son sak oor die werf', 'en die stof gaan l\u00ea'], seconds: 20 },
  { name: 'Chorus', lines: ['Bly by my', 'bly by my vanaand'], seconds: 18 },
  { name: 'Verse', lines: ['Die honde slaap', 'die hek is toe'], seconds: 20 },
];

ok('a song with parts becomes a sheet',
  sheetOf(PARTS, null).length === 3,
  'a song made since the plan was stored carries its sections already named');

ok('  and a song with only a lyric string does too',
  sheetOf(null, '[Verse]\nOne line\nAnother\n\n[Chorus]\nThe hook').length === 2,
  'everything made before the plan, and anything typed straight into the'
  + ' words box, has only the string — and that is most of what exists');

ok('  and a blank line alone is enough to split it',
  sheetOf(null, 'One line\nAnother\n\nThe hook\nagain').length === 2,
  'a lyric with no [Chorus] markers in it is still a lyric with a shape');

ok('  and a song with no words at all makes no sheet',
  sheetOf(null, null).length === 0 && sheetOf([], '').length === 0
  && sheetOf([], '   \n  \n ').length === 0,
  'an empty sheet reads as the words having been LOST, which is worse than'
  + ' no button at all — so the room draws no button rather than an empty'
  + ' page');

ok('  and a part with a name and no lines is left out',
  sheetOf([{ name: 'Break', lines: [], seconds: 8 }], null).length === 0,
  'an instrumental break has nothing to read, and a heading with nothing'
  + ' under it is a gap somebody looks in for the missing words');

/* ── 2. The numbering, which is what somebody mid-take actually reads ──── */

const numbered = sheetOf(PARTS, null);
ok('a name that repeats is numbered',
  numbered[0].name === 'Verse 1' && numbered[2].name === 'Verse 2',
  'three verses in a row and somebody singing needs to know WHICH one');

ok('  and a name that appears once is not',
  numbered[1].name === 'Chorus',
  '"Chorus 1" on a song with one chorus is a number that means nothing, and'
  + ' it reads as there being a Chorus 2 that has been missed');

ok('  and the numbers run in the order they are sung',
  sheetOf(
    [...PARTS, { name: 'Verse', lines: ['A third one'], seconds: 10 }], null,
  ).map((one) => one.name).join(' ') === 'Verse 1 Chorus Verse 2 Verse 3',
  'out of order they are worse than absent');

/* ── 3. The counts under the title ─────────────────────────────────────── */

ok('the lines are counted across the whole song',
  linesIn(numbered) === 6,
  'the number under the title is the only thing that says how long this is');

ok('  and the rough length is coarse on purpose',
  roughly(numbered) === 6 * SECONDS_A_LINE && SECONDS_A_LINE >= 2,
  'a number to the second would be a promise this cannot keep, and somebody'
  + ' would plan a take around it');

/* ── 4. The room ───────────────────────────────────────────────────────── */

const booth = withoutComments(readFileSync('app/components/VocalBooth.tsx', 'utf8'));

ok('the booth says WHY the read button is dark',
  /data-boothreadwhy/.test(booth)
  && /booth\.readWhileLive/.test(booth)
  && /booth\.readWhileBusy/.test(booth),
  'greyed while the microphone is open, while it is reading, and while'
  + ' another tool works — all three correct, and a button dark for a good'
  + ' reason looks exactly like a broken one');

ok('  and only says it while it IS dark',
  /\{\(reading \|\| busy \|\| busyOrLive\) && \(/.test(booth),
  'a line of text explaining a button that works is noise on a screen that'
  + ' is already busy');

ok('the whole lyric is on a button of its own',
  /data-boothsheet\b/.test(booth) && /sheetOf\(/.test(booth),
  'the teleprompter shows the line that is due now, which is right while'
  + ' singing and wrong in the minute before');

ok('  and it is NOT taken away while recording',
  (() => {
    const at = booth.indexOf('data-boothsheet');
    const button = booth.slice(Math.max(0, at - 300), at + 300);
    return !/disabled=/.test(button);
  })(),
  'it costs nothing, reads nothing and sends nothing, and the middle of a'
  + ' take is exactly when somebody wants it');

ok('  and it is not drawn when there are no words',
  /sheet\.length > 0 && \(/.test(booth),
  'a button that opens an empty sheet reads as the words having been lost');

ok('  and it can be shut, two ways',
  /data-boothsheetshut/.test(booth) && /data-boothsheetout/.test(booth),
  'the one thing somebody does with a sheet they have finished with is tap'
  + ' away from it');

console.log(bad === 0
  ? '\n  All the words, in one place, and a dark button that says why.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);
