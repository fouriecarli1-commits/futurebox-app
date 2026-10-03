/**
 * The preview sounds like the film: the song plays under it, and a logo can
 * come off again.
 *
 * ── The fault ────────────────────────────────────────────────────────────
 *
 * Carli, 5 October 2026: *"Binne die video editor. Wanneer ek die musiek
 * tydlyn in sit en ek druk play, dan hoor mens nie die klank binne die video
 * nie."*
 *
 * The bed was mixed in `stitch.ts` and nowhere else, so it existed only in the
 * finished file. Laying a track under a film and pressing play gave silence,
 * and the only way to hear what she had made was to pay for the render —
 * which is the shape of fault this room keeps producing and the one that costs
 * her money to discover.
 *
 * ── Why "it plays" is not the assertion ──────────────────────────────────
 *
 * An element that plays the song from the top would pass any rule about the
 * song being audible, and would be wrong the moment the bed is scrubbed or a
 * stretch is cut out of it: the song does not run straight. `stretches` is
 * what the renderer schedules from, and the preview has to ask the SAME
 * function or the two drift — audibly, which is the kind nobody can point at.
 *
 * So most of what follows is arithmetic on `songSecond`, with the lines and
 * the scrub put through it.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { cutSong, songSecond, type Edit, type Piece } from '../app/lib/videoedit';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

const room = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));

/* ── Where the song is, at a second on the film's clock ────────────────── */

const shot = (id: string): Piece => ({ id, clip: new Blob(), name: id, from: 0, to: 10 });
const film: Edit = { pieces: [shot('a'), shot('b')], under: new Blob() };

ok('with the song at the top, the film and the song run together',
  songSecond(film, 0) === 0 && songSecond(film, 7) === 7,
  `${songSecond(film, 7)}`);

ok('a bed scrubbed along starts where she dragged it to',
  songSecond({ ...film, underFrom: 30 }, 0) === 30
  && songSecond({ ...film, underFrom: 30 }, 5) === 35,
  `${songSecond({ ...film, underFrom: 30 }, 5)} — the bed is scrubbed rather`
  + ' than moved, so what changes is WHICH PART of the song is under the film');

const cut = cutSong(film, { from: 4, to: 7 });

ok('a stretch cut out of the song makes it jump, in the preview too',
  songSecond(cut, 3) === 3 && songSecond(cut, 5) === 8,
  `${songSecond(cut, 5)} at five seconds — three seconds were taken out at`
  + ' four, so the song is three seconds further on than the film');

ok('  and the jump is the one the renderer schedules, not a second sum',
  /stretches\(edit\.underSkips/.test(withoutComments(readFileSync('app/lib/videoedit.ts', 'utf8'))),
  'a preview with its own copy of "where is the song now" drifts from the'
  + ' film the first time either is touched');

ok('a film with no song under it has no song position',
  songSecond({ pieces: [shot('a')] }, 1) === null,
  'nought is a position in a file; null is "there is nothing to play", and'
  + ' the preview has to be able to tell those apart');

ok('  and neither does a film that has run past the end of its song',
  songSecond(film, 999) === null,
  'the element would otherwise be seeked past its own duration on every'
  + ' frame of the last shot');

/* ── And the room really plays it ──────────────────────────────────────── */

ok('the room has the song under the preview',
  /data-editorbedsound/.test(room) && /<audio ref=\{bed\}/.test(room),
  'this is the request: "dan hoor mens nie die klank binne die video nie"');

ok('  kept on the film’s clock by the shared sum',
  /const want = songSecond\(edit, at\)/.test(room),
  'not played from the top — the song starts where she scrubbed it to and'
  + ' jumps wherever she has cut it');

ok('  and corrected rather than driven',
  /Math\.abs\(a\.currentTime - want\) > 0\.25/.test(room),
  '`at` changes a few times a second while the film plays, and setting'
  + ' `currentTime` on every one of those stutters the audio');

ok('  and stopped when the film is stopped',
  /if \(running\) \{ if \(a\.paused\) void a\.play/.test(room) && /else a\.pause\(\);/.test(room),
  'a bed still playing over a paused film is worse than no bed');

ok('  at the loudness she set for it',
  /a\.volume = Math\.max\(0, Math\.min\(1, \(edit\.underLoud \?\? 1\) \* duck\)\)/.test(room),
  'the slider that says how loud the track sits has to say it here as well,'
  + ' or she balances a mix against something that is not the mix. Times the'
  + ' duck since 5 October — `check:soundkeys` holds that half');

/* ── A logo can come off again ─────────────────────────────────────────── */

ok('a logo can be taken off',
  /data-editormarkoff/.test(room) && /setMark\(null\); setMarkName\(''\)/.test(room),
  'Carli: "daar is nie ’n knoppie om ’n logo uit te haal en te delete'
  + ' nie" — a one-way door, and reloading the page stopped clearing it on the'
  + ' day the room started remembering the project');

ok('  and taking it off takes it off the bill too',
  /billForEdit\(edit, Boolean\(mark\)\)/.test(room),
  'the price of a mark is read from the same state the picture is, so there'
  + ' is no way to be charged for a logo that is not on the film');

/* ── And the project can be put down ───────────────────────────────────── */

ok('there is a way to start a new project',
  /data-editornewproject/.test(room),
  'Carli: "om die huidige project weg te vat en met ’n nuwe een te begin".'
  + ' It became necessary the day the room started remembering: before that,'
  + ' leaving and coming back WAS a new project, badly');

ok('  and it takes two presses, not one',
  /if \(!starting\) \{ setStarting\(true\); return; \}/.test(room),
  'a mis-tap on a phone is one press, and the thing behind this one is an'
  + ' afternoon');

ok('  and one press of Back brings the whole project back',
  /commit\(\(\) => NOTHING\)/.test(room),
  'through `commit`, so it is a history step like everything else — the'
  + ' material is still on the pieces in memory, so the save that follows puts'
  + ' it straight back on the disk');

ok('  and it is only offered when there is something to put down',
  /\{edit\.pieces\.length > 0 && \([\s\S]{0,400}data-editornewproject/.test(room),
  'a Start over button on an empty clock is a button that does nothing, next'
  + ' to the two that are the actual way in');

if (bad) {
  console.error(`\ncheck:heardhere — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:heardhere — the song plays under the preview on the film’s own'
  + ' clock, a logo can be taken off again, and the project can be put down'
  + ' with one press of Back to bring it straight back.',
);
