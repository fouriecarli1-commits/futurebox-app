/**
 * One video room, and the song arrives in it.
 *
 * ── What she decided ─────────────────────────────────────────────────────
 *
 * "Ek wonder of die musiekvideo bar nie heeltemal moet weg val nie? Al die
 *  opsies is in die video desk. Dan moet jy seker maak in make a song as mens
 *  druk op maak 'n musiek video dat moet die skerm herlei na videodesk toe en
 *  die liedjie moet dan klaar in daardie desk ingegooi word."
 *
 * There were two. `MusicVideo` was the tab called Musiekvideo — pick a song,
 * then one clip with a length and a shape. Everything that makes a music
 * video — the shot list, the look they share, the words burned onto the
 * picture, the trim, the stitcher, the presenter — was in the Video desk next
 * to it. Two rooms for one job, and the one named for the job did the smaller
 * half of it.
 *
 * ── What this holds ──────────────────────────────────────────────────────
 *
 * That the second room is actually gone rather than merely unlinked — a room
 * still rendered somewhere is a room somebody reaches — that the offer after
 * a song goes to the desk, and that the song goes with it. A hand-off that
 * lands her in the right room and then asks which song she meant is the same
 * failure in a smaller place.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

const page = readFileSync(join(ROOT, 'app/page.tsx'), 'utf8');
const desk = readFileSync(join(ROOT, 'app/components/VideoCanvas.tsx'), 'utf8');
const board = readFileSync(join(ROOT, 'app/components/Storyboard.tsx'), 'utf8');
const stitch = readFileSync(join(ROOT, 'app/lib/stitch.ts'), 'utf8');
const surfaces = readFileSync(join(ROOT, 'app/lib/surfaces.ts'), 'utf8');

/* ── The second room is gone ───────────────────────────────────────────── */

ok(
  'the music video room is gone, not merely unlinked',
  !existsSync(join(ROOT, 'app/components/MusicVideo.tsx')),
  'the component is still there, so something can still render it',
);
ok('and nothing renders it', !/MusicVideo/.test(page));
ok(
  'and the copilot is not told about a room that does not exist',
  !/^\s+video: \{/m.test(surfaces) && !/"video",/.test(surfaces),
  'a surface with no room is an operation the copilot offers and nothing takes',
);

/* ── The hand-off ──────────────────────────────────────────────────────── */

ok(
  'the offer after a song goes to the desk',
  /setVideoSong\(madeTrack\.id\);[\s\S]{0,120}goToRoom\('canvas'\)/.test(page),
  'it still sends her to the old room, or sends her without the song',
);
ok(
  'and the desk is handed that song',
  /songId=\{videoSong\}/.test(page) && /songId\?: string;/.test(desk),
  'she lands in the right room and is asked which song she meant',
);
ok(
  'which the desk passes to the board',
  /songId=\{songId\}/.test(desk),
  'the desk holds the song and the board still asks for one',
);
ok(
  'and the board does not ask again when it was given one',
  /\{!songId && \(/.test(board),
  'two pickers for one decision',
);
/* The claim is that the board stops asking once the desk has answered, and
   `!songId` is the whole of it. The first version of this line also required
   `board.shots.length > 0`, which is a different rule — that the picker is
   hidden until a shot is written — and pinning it in here made this assertion
   go red for removing it. That gate was the reason "die video desk het nie 'n
   opsie om liedjies te kies nie" was a fair description of a desk that had
   one, so it is gone deliberately, and a check should not hold a bug in place
   by describing it. */
ok(
  'the next step out of Make a song is the desk',
  /next: \{ to: "canvas", en: "Put a video to it"/.test(surfaces),
  'the copilot still offers a room that is gone',
);

/* ── What the desk has to keep ─────────────────────────────────────────── */

ok(
  'the board has a field for typing the words onto each shot',
  /board\.captions && \(/.test(board) &&
    /id=\{`caption-\$\{shot\.id\}`\}/.test(board) &&
    /changed\(was, shot\.id, \{ caption: event\.target\.value \}\)/.test(board),
  'the caption bar is gone',
);
ok(
  'pre-filled, so the usual case is a switch and no typing',
  /value=\{captionOf\(shot\)\}/.test(board),
);
ok(
  'and the stitcher burns them in rather than carrying a track a phone would drop',
  /readonly caption\?: string;/.test(stitch) && /Burned into the picture/.test(stitch),
);
ok(
  'the lipsync panel is in the desk',
  /<Presenter/.test(desk),
  'she asked for it to be here',
);

/*
 * And that it says what it is. It is a lipsync model given a photograph and a
 * *spoken* reading; nobody has put a sung take through it, and this panel now
 * sits beside a storyboard, where the obvious assumption is that it will
 * lipsync a singer. Saying so is the difference between a tool and a promise.
 */
const presenter = readFileSync(join(ROOT, 'app/components/Presenter.tsx'), 'utf8');
ok(
  'and says it is built for a spoken script, not for singing',
  /pres\.notSinging/.test(presenter),
  'beside a storyboard, an unlabelled lipsync button reads as lipsync for your song',
);

if (failures > 0) {
  console.log(`\ncheck:videoroom — ${failures} assertion(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('\ncheck:videoroom — one video room, and the song arrives in it.');
}
