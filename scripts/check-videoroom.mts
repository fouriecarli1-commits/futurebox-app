/**
 * The room called Musiekvideo can make a music video.
 *
 * ── What was wrong ───────────────────────────────────────────────────────
 *
 * "die music video het steeds nie 'n editing bar om woorde in te sit nie, en
 *  goeie video editing funksies nie."
 *
 * There are two video rooms. `MusicVideo` is the one behind the tab called
 * "Musiekvideo" — pick a song, then one clip with a length and a shape, and
 * that was all of it: 172 lines. `Storyboard` is the shot list, the look they
 * share, the words burned onto the picture, the trim and the stitcher — 940
 * lines, rendered only inside `VideoCanvas`, which is the tab called "Video
 * desk".
 *
 * So everything that makes a music video lived in the room next door to the
 * one named for it. When she asked for a scene window and it was built, it
 * was built into the board — in the room she was not standing in — and
 * reported as done.
 *
 * ── What this holds ──────────────────────────────────────────────────────
 *
 * That the room reaches the board, that it is the same board and not a second
 * copy, and that the board is handed the song the room already asked about
 * rather than asking a second time for one decision.
 *
 * And the captions, because they are the specific thing she named: the board
 * must still be able to put the words on the picture, and the stitcher must
 * still burn them in rather than carry a subtitle track that a phone gallery
 * would drop.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

const room = readFileSync(join(ROOT, 'app/components/MusicVideo.tsx'), 'utf8');
const board = readFileSync(join(ROOT, 'app/components/Storyboard.tsx'), 'utf8');
const stitch = readFileSync(join(ROOT, 'app/lib/stitch.ts'), 'utf8');
const page = readFileSync(join(ROOT, 'app/page.tsx'), 'utf8');

ok(
  'the music video room is what the Musiekvideo tab opens',
  /studioTab === 'video' && <MusicVideo/.test(page),
  'the tab opens something else now, so this check is about the wrong file',
);

ok(
  'and that room reaches the storyboard',
  /<Storyboard/.test(room),
  'the room offers a single clip and nothing that makes a music video',
);

ok(
  'the same board the desk uses, not a second copy',
  /from '\.\/Storyboard'/.test(room) &&
    /<Storyboard/.test(readFileSync(join(ROOT, 'app/components/VideoCanvas.tsx'), 'utf8')),
  'two boards drift apart, and the one she is in is the one that stops getting fixed',
);

ok(
  'the board is handed the song the room already chose',
  /songId=\{selected\.id\}/.test(room) && /readonly songId\?: string;/.test(board),
  'two pickers for one decision, in the room whose subject is that song',
);

ok(
  'and it does not ask for a song again when it was given one',
  /board\.shots\.length > 0 && !songId/.test(board),
  'the second picker is still there',
);

/* The words. This is the part she named, so it is asserted at both ends: the
   board can put them on, and the stitcher burns them into the picture. */
/* The bar itself, not the helper behind it. The first version asserted the
   helper's name, which the call sites satisfy even when the input is gone —
   and renaming only the declaration left it passing. She asked for a bar to
   type the words into, so the assertion is the input. */
ok(
  'the board has a field for typing the words onto each shot',
  /board\.captions && \(/.test(board) &&
    /id=\{`caption-\$\{shot\.id\}`\}/.test(board) &&
    /changed\(was, shot\.id, \{ caption: event\.target\.value \}\)/.test(board),
  'the caption bar is gone',
);
ok(
  'and it comes pre-filled, so the usual case is a switch and no typing',
  /value=\{captionOf\(shot\)\}/.test(board),
  'every shot would have to be typed out by hand',
);
ok(
  'and the stitcher burns them in rather than carrying a track a phone would drop',
  /readonly caption\?: string;/.test(stitch) && /Burned into the picture/.test(stitch),
  'a subtitle track is words nobody sees once it is on a phone',
);

/* One question, not both sets of furniture at once. She has asked more than
   once for rooms that are not busy. */
ok(
  'the room asks which of the two is being made rather than showing both',
  /making === 'film'/.test(room) && /making === 'clip'/.test(room),
  'a single clip and a whole film are different jobs',
);

if (failures > 0) {
  console.log(`\ncheck:videoroom — ${failures} assertion(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('\ncheck:videoroom — the room named for music videos can make one.');
}
