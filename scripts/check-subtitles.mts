/**
 * Subtitles from what is said, the word being said lit (`app/lib/subtitles.ts`,
 * docs/VIDEO-EDITOR-ROADMAP.md gap 2).
 *
 * Held here: every word lands on the FILM's clock through its shot's place
 * and speed; the words are grouped into short lines; the lit word is the one
 * being said; and the room's button reads the speech once, at the price on it.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { linesFrom, onFilm, subtitleAt, wordAt, MOST_WORDS } from '../app/lib/subtitles.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

/* Two shots: the first 3 s of film from 0, the second at 2x starting at 3 s on the film. */
const parts = [
  { at: 0, long: 3, film: 0, speed: 1 },
  { at: 3, long: 4, film: 3, speed: 2 },
];
ok('a second in the first shot is the same second of film', onFilm(parts, 1.5) === 1.5);
ok('  and one in a shot at 2x is half as far into it', onFilm(parts, 5) === 4);
ok('  and one in no shot is nowhere', onFilm(parts, 9) === null);

const words = [
  { text: 'We', start: 0.2, end: 0.4 }, { text: 'are', start: 0.45, end: 0.6 }, { text: 'live.', start: 0.65, end: 1 },
  { text: 'Turn', start: 1.1, end: 1.3 }, { text: 'it', start: 1.32, end: 1.4 }, { text: 'up', start: 1.45, end: 1.7 },
  { text: 'tonight', start: 2.6, end: 2.9 },
  { text: 'faster', start: 3.2, end: 3.6 },
];
const lines = linesFrom(words, parts);
ok('a full stop ends a line', lines[0]?.words.map((one) => one.text).join(' ') === 'We are live.', JSON.stringify(lines.map((one) => one.words.map((w) => w.text).join(' '))));
ok('  and a pause starts a new one', lines[1]?.words.map((one) => one.text).join(' ') === 'Turn it up' && lines[2]?.words[0].text === 'tonight');
ok('  a word in the 2x shot is timed on the film (3.2 s of voice is 3.1 s of film)', Math.abs((lines.flatMap((one) => one.words).find((w) => w.text === 'faster')?.from ?? 0) - 3.1) < 1e-6, JSON.stringify(lines.flatMap((one) => one.words)));
const many = linesFrom(Array.from({ length: 14 }, (_, k) => ({ text: 'go', start: k * 0.2, end: k * 0.2 + 0.15 })), [{ at: 0, long: 5, film: 0, speed: 1 }]);
ok(`  no line holds more than ${MOST_WORDS} words`, many.every((one) => one.words.length <= MOST_WORDS) && many.length === 3, String(many.map((one) => one.words.length)));
ok('a line close behind the one before is held up until it comes, not flickered off', lines[0].to === lines[1].from);
ok('the line up at a second is found', subtitleAt(lines, 1.2)?.words[0].text === 'Turn' && subtitleAt(lines, 10) === null);
ok('  and the lit word is the one being said', wordAt(lines[1], 1.35) === 1 && wordAt(lines[1], 1.0) === -1);

const room = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));
ok('the room reads the film\'s own speech, put together on the device', /speechOf\(/.test(room) && /fetch\('\/api\/transcribe'/.test(room));
ok('  priced per minute of speech, on the button', /perMinute\(Math\.max\(1, speechSeconds\), CREDITS\.transcribe\)/.test(room) && /creditsSaid\(subPrice, t\)/.test(room));
ok('  shown on the film as it will be cut', /data-editorsubnow/.test(room));
const cut = withoutComments(readFileSync('app/lib/stitch.ts', 'utf8'));
ok('the cut draws them on the film\'s own clock (each shot\'s seconds divided by its speed)', /drawSubtitle\(context, cut\.subtitles, filmLaid \+/.test(cut) && /filmLaid \+= Math\.max\(0, window\.to - window\.from\) \/ fast;/.test(cut));
const edit = withoutComments(readFileSync('app/lib/videoedit.ts', 'utf8'));
ok('  and they go into the cut from the edit', /subtitles: edit\.subtitles, subtitleLit: edit\.subtitleLit/.test(edit));

if (bad) {
  console.error(`\ncheck:subtitles — ${bad} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:subtitles — what is said becomes short lines on the film\'s clock, the word being said lit, in the room and in the cut.');
