/**
 * Words written out by listening, for a song nobody wrote words for.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 *   "Dit sal baie cool wees as iemand ook hulle eie liedjies kon oplaai om
 *    daai presies funksie te vervul."
 *
 * The selfie camera reads its lines off the song's lyric sheet. A song this
 * app made has one; a song somebody brought in from a file has neither words
 * nor times, so every rung of `lyrictime`'s ladder returned nothing — `evenly`
 * has no sheet to spread across.
 *
 * `heard` had been declared on that ladder since it was written, and nothing
 * ever produced one. It is produced now, and it is the only thing that answers
 * both halves at once: a transcription with a timestamp on every word is the
 * words *and* the times.
 *
 * ── What is worth checking ───────────────────────────────────────────────
 *
 * The grouping, because a wall of words is not something anybody sings along
 * to and the seams are where a line reads right or wrong. And the keeping,
 * because this costs credits per minute and paying twice for one answer is the
 * kind of bug nobody reports — they just stop pressing it.
 */
import { linesFromWords } from '../app/lib/lyrictime.ts';

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

/* ── A breath ends a line ───────────────────────────────────────────────── */

const sung = [
  { text: 'Ek', start: 1.0, end: 1.2 },
  { text: 'loop', start: 1.2, end: 1.5 },
  { text: 'alleen', start: 1.5, end: 2.0 },
  // Nearly a second of nothing: a breath, and the end of the line.
  { text: 'die', start: 3.0, end: 3.2 },
  { text: 'pad', start: 3.2, end: 3.5 },
  { text: 'is', start: 3.5, end: 3.7 },
  { text: 'lank', start: 3.7, end: 4.1 },
];
const lines = linesFromWords(sung);

ok('a gap between phrases becomes a line break', lines.length === 2, `${lines.length} lines`);
ok('the first line is the first phrase', lines[0]?.text === 'Ek loop alleen', lines[0]?.text);
ok('and the second is the second', lines[1]?.text === 'die pad is lank', lines[1]?.text);
ok('a line starts when its first word does', lines[0]?.start === 1.0, String(lines[0]?.start));
ok('and ends when its last word does', lines[0]?.end === 2.0, String(lines[0]?.end));
ok('only the first line opens the section', lines[0]?.opensSection === true && lines[1]?.opensSection === false);

/* ── And so does length, however fast somebody sings ────────────────────── */

const fast = Array.from({ length: 30 }, (_, i) => ({
  text: 'woord',
  start: i * 0.1,
  end: i * 0.1 + 0.09,
}));
const wrapped = linesFromWords(fast);
ok('a run with no gaps still breaks into readable lines', wrapped.length > 1, `${wrapped.length}`);
ok(
  'and no line is longer than a screen can hold',
  wrapped.every((one) => one.text.length <= 46),
  String(Math.max(...wrapped.map((one) => one.text.length))),
);

/* ── What a transcriber sends that is not a word ────────────────────────── */

/* The first draft of this put a six-tenths `(music)` event between the two
   words and then expected them on one line. They are not on one line, and they
   should not be: six tenths is the breath threshold, and the timings say there
   really was that much silence between them. The rule was right and the
   fixture was wrong — so the fixture is the thing that changed. */
const noisy = linesFromWords([
  { text: 'Hallo', start: 0, end: 0.4 },
  { text: ' ', start: 0.4, end: 0.4, type: 'spacing' },
  { text: '(music)', start: 0.4, end: 0.5, type: 'audio_event' },
  { text: 'wêreld', start: 0.5, end: 0.9 },
  { text: '', start: 0.9, end: 0.9 },
]);
ok('spacing is not a word', !/\s\s/.test(noisy[0]?.text ?? ''), noisy[0]?.text);
ok('a sound effect is not a word', !(noisy[0]?.text ?? '').includes('(music)'), noisy[0]?.text);
ok('and an empty one is dropped', noisy[0]?.text === 'Hallo wêreld', noisy[0]?.text);

/* And a real silence still breaks, even when a sound effect filled it. What
   was thrown away is the label, not the time it took. */
const filled = linesFromWords([
  { text: 'Hallo', start: 0, end: 0.4 },
  { text: '(music)', start: 0.4, end: 1.4, type: 'audio_event' },
  { text: 'wêreld', start: 1.4, end: 1.8 },
]);
ok('a long instrumental between two words still ends the line', filled.length === 2, `${filled.length}`);

ok('nothing at all comes back as nothing', linesFromWords([]).length === 0);

/* ── The answer is kept, and the screens ask for it ─────────────────────── */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');

const rule = read('app/lib/lyrictime.ts');
ok('a transcription is remembered against the song', /keep\(track\.id, timed\)/.test(rule));
ok(
  'and a remembered one is handed back rather than bought again',
  /remembered\?\.how === 'heard'/.test(rule),
  'this costs credits per minute',
);
ok('a failure is an answer, not a throw', /catch \{\s*return \{ lines: \[\], how: 'none' \}/.test(rule));

const follow = read('app/components/FollowWords.tsx');
ok('the camera says when a song has no words', /play\.noWords/.test(follow));
ok('and offers to listen to it', /play\.writeWords/.test(follow));
ok(
  'saying what a transcriber is before the money, not after',
  /play\.writeWordsWhy/.test(follow),
);
ok('with the cost on the button', /wordCost/.test(follow));

for (const screen of ['app/components/Channel.tsx', 'app/components/NowPlaying.tsx']) {
  const source = read(screen);
  ok(`${screen.split('/').pop()} passes the words handler`, /askWords=\{/.test(source));
  ok(`${screen.split('/').pop()} passes what it costs`, /wordCost=\{perMinute\(/.test(source));
}

if (failures) {
  console.error(`\ncheck:heard — ${failures} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:heard — a brought-in song can have its words written out, once, and read as lines.');
