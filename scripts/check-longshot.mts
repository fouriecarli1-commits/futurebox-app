/**
 * The long-form board: every piece saveable, and a room that can speak.
 *
 * Carli, 23 September 2026: *"Gaan kyk na long shot in video. Elke klein
 * gedeelt moet 'n knoppie hê om net die stukkie af te laai. Dit wil ook
 * voorkom dat daai kamer glad nie klank wat praat genereer nie."*
 *
 * ── The second one is the one worth a check ──────────────────────────────
 *
 * It was not that the room could not speak. `VideoRequest.speak` has existed
 * since the single-clip composer got its switch, and the board simply never
 * sent it — one missing property on one request object. Every shot that
 * board has ever made came back silent, whatever the shot said and whatever
 * grade was paid for, and nothing anywhere failed: the quoted line was read
 * by `spokenLines`, printed as a subtitle, and never spoken.
 *
 * That is a capability that exists, is paid for, and is unreachable from one
 * of the two screens that should reach it — the same shape as the copilot
 * being told an operation did not exist, and as the brand kit's logo never
 * arriving on a clip. So the rule is general rather than about this board:
 * a screen that reads a shot's quoted lines and generates video must send
 * `speak`, or say in writing why it does not.
 *
 * And a clip paid to speak has to keep its voice all the way to the file,
 * which means two more things being true: the cut asks for that scene's
 * sound, and it asks per scene rather than for all of them.
 *
 *   npm run check:longshot
 */
import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const strip = (source: string): string =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, (had) => had.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (had, before) => before + ' '.repeat(had.length - before.length));

const board = strip(readFileSync('app/components/Storyboard.tsx', 'utf8'));
const cutter = strip(readFileSync('app/lib/stitch.ts', 'utf8'));
const model = strip(readFileSync('app/lib/storyboard.ts', 'utf8'));

/* ── 1. Every piece has its own way out ──────────────────────────────── */

ok('a shot can be saved on its own', /data-savepiece=/.test(board),
  'the room had one download on it, at the bottom, for the whole film — twelve shots'
  + ' were paid for one at a time and not one of them could be kept');
ok('  and what it hands over is the piece, not the raw generation',
  /shot\.from !== undefined \? \{ from: shot\.from \}/.test(board)
  && /words\.trim\(\) \? \{ caption: words \}/.test(board),
  'the trim and the caption are what the board SHOWS; a file without them is a'
  + ' different clip from the one on screen');
ok('  and hands over the file itself when nothing has been applied to it',
  /if \(!trimmed && !words\.trim\(\)\)/.test(board),
  're-encoding a clip to change nothing about it only costs quality');

/* ── 2. The room speaks ──────────────────────────────────────────────── */

/**
 * Every screen that both generates video and reads quoted lines.
 *
 * Named rather than counted: the fault was a screen that was never in
 * anybody's list, so a rule that checked "the screens we remembered" would
 * have passed on the day it was written and gone on passing.
 */
const SCREENS = ['app/components/VideoCanvas.tsx', 'app/components/Storyboard.tsx'];
const found = SCREENS.filter((path) => {
  const source = strip(readFileSync(path, 'utf8'));
  return /generateVideo\(/.test(source) && /spokenLines\(/.test(source);
});
ok('both screens that read a quoted line also generate video', found.length === SCREENS.length,
  `${found.length} of ${SCREENS.length} — a screen that stopped doing one of the two is no`
  + ' longer held to the rule below, which is how this fault got in');
/**
 * The object handed to `generateVideo`, braces matched.
 *
 * The first version of this rule searched the whole file for the literal
 * `speak: true`, and failed the composer — which passes `speak: willSpeak`
 * and has done since the day it got its switch. A rule that can only see
 * one spelling of a correct answer is a rule about spelling, which is the
 * thing this repo keeps catching itself doing. So the call is read.
 */
function requestIn(source: string): string {
  const at = source.indexOf('generateVideo(');
  if (at === -1) return '';
  const open = source.indexOf('{', at);
  if (open === -1) return '';
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return '';
}

for (const path of found) {
  const source = strip(readFileSync(path, 'utf8'));
  const request = requestIn(source);
  const name = path.replace('app/components/', '');
  ok(`  the request ${name} builds can be read`, request.length > 0,
    'the call was rewritten into a shape this cannot follow, so the rule below is'
    + ' measuring nothing');
  ok(`  ${name} sends speak with the request`,
    /\bspeak\b\s*:/.test(request),
    'it reads the quoted line and never asks for it to be said, so the words are'
    + ' printed on the screen with silence behind them');
}

/* ── 3. And the voice survives the cut ───────────────────────────────── */

ok('the cut carries a talking shot’s own sound', /sound: true/.test(board),
  'the shot speaks and the film is silent, which is the same fault one step later');
ok('  decided by the clip rather than by the switch',
  /board\.shots\[index\]\.spoke \?/.test(board) && /readonly spoke\?: boolean;/.test(model),
  'the switch can be turned off after a talking shot was paid for; reading it at'
  + ' cutting time mutes the voice she bought');
ok('  and the stitcher only unmutes the scenes that ask',
  /video\.muted = !talking;/.test(cutter) && /readonly sound\?: boolean;/.test(cutter),
  'unmuting every clip puts twelve generations of room tone under the song, which is'
  + ' why they were muted in the first place');
ok('  through the same graph the song goes through, because a canvas carries pictures only',
  /createMediaElementSource\(video\)\.connect\(destination\)/.test(cutter),
  'an unmuted element is still not on the recorded stream');

/* ── A rule that was here and is not ─────────────────────────────────
 *
 * There was a tenth rule: that the phrase "room tone" still appears in
 * `stitch.ts`, so the reason the clips are muted could not be deleted by
 * somebody who read the unmuting as "clip sound is carried".
 *
 * It was mutation-tested like the rest and it stayed green while the
 * header note was rewritten — because the same phrase had by then been
 * written into the note on `Scene.sound` as well. The rule was matching
 * the new comment, not the decision it was meant to protect.
 *
 * It is gone rather than made precise. A prose rule is a rule about
 * spelling; what it was really guarding — that a silent shot stays silent
 * — is held above, by reading the condition itself.
 */

if (failures) {
  console.error(`\ncheck:longshot — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:longshot — every shot can be saved on its own, and a shot with a line in it is asked to say it.');
