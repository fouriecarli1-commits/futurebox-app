/**
 * The trim window is real, and the preview plays what the film will play.
 *
 * ── What she sent ────────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026, with a screenshot of the video desk: *"I just made
 * a video with speech. No sound is coming out."*
 *
 * The screenshot carried the second fault as well, which she had not
 * mentioned because the room told her nothing was wrong: the card read
 * **"Trim it 8.0s of 8.0s"**, both handles were hard right, and "Play just
 * this bit" did nothing at all.
 *
 * ── Three faults, stacked ────────────────────────────────────────────────
 *
 * **The preview was silent by construction.** `<video muted>`, hard-coded,
 * so every shot played without sound — including one that had been paid to
 * speak. `muted` exists to satisfy a browser's autoplay rule, and this
 * element plays from a button press, so the rule never applied to it. It was
 * a reflex, and it threw away the one thing she was checking.
 *
 * **The window could be nothing.** The start handle ran to `length`. The
 * rule under it pushed the end along rather than letting them cross — end =
 * start + one step — but `to` is then clamped to the clip's length, so
 * dragging the start to the last frame of an 8-second clip gave from = 8 and
 * to = 8. The guard was written and undone one line later by a clamp.
 *
 * **And the readout lied about it.** `to > from ? to - from : length` —
 * the fallback fires in exactly the case the window is empty, and reports
 * the whole clip. So the room said eight seconds and played none of it.
 *
 * ── Why these are driven, not read ───────────────────────────────────────
 *
 * Because every one of them is a rule that was already written down and then
 * contradicted somewhere else. Reading the code for "do the handles cross"
 * finds the comment saying they cannot. The only honest instrument is to
 * move them and look at where they end up — so the handle logic is lifted
 * into `lib/trimwindow.ts` and driven here, from both ends, including the
 * drag that caused this.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { endMoved, startMoved, windowOf } from '../app/lib/trimwindow.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nThe trim window is real, and the preview plays what the film plays\n');

/* ── 1. The drag from her screenshot ─────────────────────────────────── */

const LENGTH = 8;
const STEP = 0.8;

/* Dragging the start all the way to the right of an 8-second clip. */
const dragged = startMoved({ from: 0, to: LENGTH }, LENGTH, LENGTH, STEP);
const after = windowOf(dragged, LENGTH);

ok('dragging the start to the far right still leaves something to play',
  after.trimmed > 0,
  `from ${after.from} to ${after.to} — a window of ${after.trimmed}s, which is`
  + ' the state in her screenshot: both handles at the end, nothing between'
  + ' them, and a play button that seeks to the end and stops on the next'
  + ' frame');

ok('  and the start cannot land on the end of the clip',
  after.from < LENGTH,
  `the start is at ${after.from} on a ${LENGTH}s clip — there is no film`
  + ' after it');

/* And the same from the other end. */
const other = windowOf(endMoved({ from: 0, to: LENGTH }, 0, LENGTH, STEP), LENGTH);
ok('  and dragging the end to the far left does not push the start below zero',
  other.from >= 0 && other.trimmed > 0,
  `from ${other.from} to ${other.to} — a negative start reads as "Starts at`
  + ' -0.8s" on the card and seeks nowhere');

/* ── 2. The readout cannot report a window that is not there ─────────── */

const lying = windowOf({ from: LENGTH, to: LENGTH }, LENGTH);
ok('an empty window is reported as empty, not as the whole clip',
  lying.trimmed === 0 && lying.empty,
  `a window from ${LENGTH} to ${LENGTH} reads as ${lying.trimmed}s — the old`
  + ' arithmetic fell back to the clip length in exactly the case the window'
  + ' was nothing, so the room said eight seconds and played none of it');

ok('  and a normal window is still its own length',
  windowOf({ from: 2, to: 6 }, LENGTH).trimmed === 4,
  'the honest case broke while fixing the dishonest one');

ok('  and a window saved wider than the clip is cut to it',
  windowOf({ from: 1, to: 99 }, LENGTH).to === LENGTH,
  'a board restored from storage can carry anything, and a `to` past the end'
  + ' seeks past the end');

/* ── 3. The preview plays what the film will play ────────────────────── */

const board = withoutComments(readFileSync('app/components/Storyboard.tsx', 'utf8'));

ok('the preview is not silent by construction',
  !/<video[^>]*\smuted(\s|\/|>)/.test(board),
  'a bare `muted` is back on a preview that plays from a button press — the'
  + " autoplay rule it exists for never applied here, and it threw away the"
  + ' one thing she was checking for');

ok('  and is muted exactly when the film will be',
  /muted=\{!shot\.spoke\}/.test(board),
  '`stitch.ts` carries a scene\'s own sound only when the shot was asked to'
  + ' speak, so a preview with any other rule either plays sound the film'
  + ' will not carry or hides sound it will');

ok('  and says so when it is',
  /data-trimsilent/.test(board),
  'a shot that will go into the film without sound previews silently and'
  + ' explains nothing, which is the same report arriving a second time');

/* And the card uses this arithmetic rather than a second copy of it. Without
   this assertion everything above is driving a library the room does not
   call, which is the shape of a check that is green while measuring
   something adjacent. */
ok('  and the card reads its window from the shared arithmetic',
  /windowOf\s*\(/.test(board) && /startMoved\s*\(/.test(board) && /endMoved\s*\(/.test(board),
  `${[!/windowOf\s*\(/.test(board) && 'windowOf', !/startMoved\s*\(/.test(board) && 'startMoved',
      !/endMoved\s*\(/.test(board) && 'endMoved'].filter(Boolean).join(', ')} not called —`
  + ' the room keeps its own copy of the rule, so everything driven above is'
  + ' a library nothing uses');

ok('  and the play button does nothing on an empty window rather than seeming broken',
  /if \(to <= from\) return;/.test(board),
  'the preview seeks to the end and pauses a frame later, which looks exactly'
  + ' like a button that does not work');

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);
