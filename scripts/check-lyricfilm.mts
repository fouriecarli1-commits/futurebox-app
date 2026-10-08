/**
 * A song's words hung on the film it plays under.
 *
 *   npm run check:lyricfilm
 *
 * ── What this holds, and how it differs from `check:lyriccut` ────────────
 *
 * `check:lyriccut` holds the case where the lines came inside one file and
 * the arithmetic never leaves that file. This holds the commoner and harder
 * case: a song on the FILM's clock, over shots she has already cut, where
 * which shot a line lands on depends on everything in front of it.
 *
 * Three things are measured rather than reasoned about:
 *
 *   **The film is exactly as long afterwards.** Added up, not argued.
 *   **Every cut she made is still there.** Listed before and after.
 *   **No shot ends up with two lines on it**, because a shot holds one
 *   caption and the second would silently replace the first.
 */
import { asTimed, lyricCount, lyricFilm } from '../app/lib/lyricfilm.ts';
import { lengthOfPiece, runs } from '../app/lib/videoedit.ts';
import type { Edit, Piece } from '../app/lib/videoedit.ts';
import type { Timed } from '../app/lib/timedtext.ts';
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const CLIP = { size: 1, type: 'video/mp4' } as unknown as Blob;
const piece = (id: string, from: number, to: number, over: Partial<Piece> = {}): Piece =>
  ({ id, clip: CLIP, name: id, from, to, holds: to, ...over });

/** Three ten-second shots: 0–10, 10–20, 20–30 on the film's clock. */
const three = (): Edit => ({ pieces: [piece('a', 0, 10), piece('b', 0, 10), piece('c', 0, 10)] });

const line = (from: number, to: number, text: string): Timed => ({ from, to, text });

const totalOf = (edit: Edit): number =>
  edit.pieces.reduce((sum, one) => sum + lengthOfPiece(one), 0);

/** Where each shot starts, on the film's clock. */
const edges = (edit: Edit): number[] => {
  const out: number[] = [];
  let at = 0;
  for (const one of edit.pieces) { out.push(at); at += lengthOfPiece(one); }
  return out;
};

const worded = (edit: Edit): { at: number; words: string }[] => {
  const out: { at: number; words: string }[] = [];
  let at = 0;
  for (const one of edit.pieces) {
    if (one.words) out.push({ at, words: one.words });
    at += lengthOfPiece(one);
  }
  return out;
};

/* ── 1. One line in each of her three shots ──────────────────────────── */

const song: readonly Timed[] = [
  line(2, 5, 'Ek sit hier stil'),
  line(12, 15, 'Daar buite in die gloed'),
  line(22, 25, 'Altyd vry'),
];
const cut = lyricFilm(three(), song);

ok('the film is exactly as long afterwards',
  Math.abs(totalOf(cut) - 30) < 1e-9,
  `${totalOf(cut)} instead of 30`);

ok('and `runs` agrees, which is what the clock draws',
  Math.abs(runs(cut) - 30) < 1e-9,
  String(runs(cut)));

ok('every cut she already made is still a cut',
  [0, 10, 20].every((one) => edges(cut).some((e) => Math.abs(e - one) < 1e-9)),
  `her cuts were 0, 10, 20; the film now breaks at ${edges(cut).join(', ')}`);

ok('a cut is added at every line and nowhere else',
  edges(cut).join(',') === '0,2,10,12,20,22',
  edges(cut).join(','));

ok('each line is on the shot that starts where it is sung',
  worded(cut).map((one) => `${one.at}:${one.words}`).join(' | ')
    === '2:Ek sit hier stil | 12:Daar buite in die gloed | 22:Altyd vry',
  JSON.stringify(worded(cut)));

ok('and no shot carries two lines',
  cut.pieces.filter((one) => one.words).length === 3,
  'a shot holds one caption, so a second line on it would replace the first');

ok('the lead-in before the singing keeps its own shot and no words',
  cut.pieces[0].words === undefined && Math.abs(lengthOfPiece(cut.pieces[0]) - 2) < 1e-9,
  `${lengthOfPiece(cut.pieces[0])}s, words ${JSON.stringify(cut.pieces[0].words)}`);

/* ── 2. The words go down when the singing stops ─────────────────────── */

const third = cut.pieces[5];
ok('a line is up for as long as it is sung, not for the whole shot',
  third.wordsFrom === 0 && Math.abs((third.wordsTo ?? 0) - 3) < 1e-9
  && Math.abs(lengthOfPiece(third) - 8) < 1e-9,
  `up ${third.wordsFrom}–${third.wordsTo} on an ${lengthOfPiece(third)}s shot`);

/* ── 3. Several lines inside one of her shots ─────────────────────────── */

const dense = lyricFilm(three(), [
  line(1, 3, 'one'), line(3, 5, 'two'), line(5, 7, 'three'),
]);
ok('three lines inside one shot become three shots',
  edges(dense).join(',') === '0,1,3,5,10,20',
  edges(dense).join(','));

ok('  with the right line on each, and the shot after them untouched',
  worded(dense).map((one) => one.words).join(',') === 'one,two,three'
  && Math.abs(totalOf(dense) - 30) < 1e-9,
  `${JSON.stringify(worded(dense))} and ${totalOf(dense)}s`);

/* ── 4. A line landing on a cut she already made ──────────────────────── */

const onEdge = lyricFilm(three(), [line(10, 13, 'on the cut')]);
ok('a line on an existing cut hangs on that shot and slices nothing off it',
  edges(onEdge).join(',') === '0,10,20' && worded(onEdge)[0]?.at === 10,
  `${edges(onEdge).join(',')} and ${JSON.stringify(worded(onEdge))}`);

/* ── 5. Lines too close together to be shots ──────────────────────────── */

const crammed = lyricFilm(three(), [
  line(2, 4, 'first'),
  /* Two hundredths of a second later. `splitHere` refuses a cut that would
     make a shot of four frames, so this line has no shot of its own. */
  line(2.02, 4, 'crammed'),
  line(6, 8, 'later'),
]);
ok('a line with no shot of its own does not overwrite the line before it',
  worded(crammed).map((one) => one.words).join(',') === 'first,later',
  `${JSON.stringify(worded(crammed))} — the earlier line is the one whose`
  + ' second the shot actually begins at');

ok('  and the film is still 30 seconds with her cuts intact',
  Math.abs(totalOf(crammed) - 30) < 1e-9
  && [0, 10, 20].every((one) => edges(crammed).some((e) => Math.abs(e - one) < 1e-9)),
  `${totalOf(crammed)}s, breaks at ${edges(crammed).join(',')}`);

/* ── 6. A line that runs past a cut she made ──────────────────────────── */

const over = lyricFilm(three(), [line(8, 14, 'over the cut')]);
const held = over.pieces.find((one) => one.words);
ok('a line running past a cut is clamped to its own shot',
  !!held && Math.abs((held.wordsTo ?? 0) - 2) < 1e-9,
  `${held?.wordsTo} on a ${held ? lengthOfPiece(held) : 0}s shot — a caption`
  + ' belongs to one shot and cannot follow a line across a cut');

/* ── 7. Nothing to hang ───────────────────────────────────────────────── */

const alone = three();
ok('a film with no lines comes back as itself',
  lyricFilm(alone, []) === alone,
  'so a caller can replace unconditionally');

for (const [what, lines] of [
  ['lines with no words in them', [line(2, 5, '   ')]],
  ['a line that ends before it starts', [line(5, 2, 'backwards')]],
  ['a line at a negative second', [line(-3, 2, 'before the film')]],
] as readonly [string, Timed[]][]) {
  ok(`  and so does one given ${what}`,
    lyricFilm(alone, lines) === alone,
    JSON.stringify(worded(lyricFilm(alone, lines))));
}

ok('a line past the end of the film changes nothing but is not an error',
  Math.abs(totalOf(lyricFilm(three(), [line(90, 95, 'after the end')])) - 30) < 1e-9
  && worded(lyricFilm(three(), [line(90, 95, 'after the end')])).length === 0,
  'there is no shot there to hang it on');

/* ── 8. Out of order ─────────────────────────────────────────────────── */

const shuffled = lyricFilm(three(), [
  line(22, 25, 'Altyd vry'), line(2, 5, 'Ek sit hier stil'), line(12, 15, 'Daar buite in die gloed'),
]);
ok('lines handed over in the wrong order still land in the right places',
  worded(shuffled).map((one) => `${one.at}:${one.words}`).join(' | ')
    === worded(cut).map((one) => `${one.at}:${one.words}`).join(' | '),
  JSON.stringify(worded(shuffled)));

/* ── What putting them in order actually protects ────────────────────────

   Not the assertion above. Removing the sort leaves that one green, because
   the cuts are the same set whichever order they are made in and each line is
   then looked up on its own. I had the claim in the wrong place and the check
   said so by staying green when the sort was taken out.

   What the sort protects is the ONE case where two lines compete for a shot:
   when a line is crammed against the one before it and gets no cut of its
   own, the shot goes to whichever of them is seen first. The earlier-sung
   line is the right answer — it is the one whose second the shot begins at —
   and without the sort it is simply whichever the caller listed first. */
const backwards = lyricFilm(three(), [
  line(2.02, 4, 'crammed'),
  line(2, 4, 'first'),
]);
ok('  and the earlier-sung line wins the shot, whichever was listed first',
  worded(backwards).map((one) => one.words).join(',') === 'first',
  `${JSON.stringify(worded(backwards))} — without putting them in order this`
  + ' is whichever the caller happened to list first, which is not a decision'
  + ' the caller should be making');

/* ── 9. A shot that plays at a speed ─────────────────────────────────── */

const fast: Edit = { pieces: [piece('q', 0, 20, { speed: 2 })] };
const sped = lyricFilm(fast, [line(2, 5, 'quick')]);
ok('a 20-second shot at double speed is 10 seconds of film',
  Math.abs(totalOf(fast) - 10) < 1e-9,
  String(totalOf(fast)));

ok('  so a line at the second second is two seconds into the FILM',
  worded(sped)[0]?.at === 2 && Math.abs(totalOf(sped) - 10) < 1e-9,
  `${JSON.stringify(worded(sped))}, ${totalOf(sped)}s`);

ok('  and how long it stays up is film time, which is what the caption uses',
  Math.abs((sped.pieces.find((one) => one.words)?.wordsTo ?? 0) - 3) < 1e-9,
  `${sped.pieces.find((one) => one.words)?.wordsTo} — three seconds of singing`
  + ' is three seconds on screen whatever the picture under it is doing');

/* ── 10. The counter counts what the cutter cuts ──────────────────────── */

ok('the number on the button is the number of lines hung',
  lyricCount(three(), song) === 3 && lyricCount(three(), []) === 0,
  `${lyricCount(three(), song)} against 3`);

ok('  and it does not count a caption she typed herself',
  lyricCount({ pieces: [piece('a', 0, 10, { words: 'mine' }), piece('b', 0, 10)] }, [line(2, 5, 'sung')]) === 1,
  'the offer says how many lines it will hang, not how many captions exist');

/* ── 11. A song's worth of lines ──────────────────────────────────────── */

const many: Timed[] = [];
for (let n = 0; n < 51; n += 1) many.push(line(12.3 + n * 3.07, 12.3 + n * 3.07 + 2.8, `line ${n + 1}`));
const whole = lyricFilm({ pieces: [piece('one', 0, 169)] }, many);

ok('fifty-one lines over one long shot give fifty-two shots',
  whole.pieces.length === 52,
  `${whole.pieces.length}`);

ok('  and the song is still 169 seconds, to the frame',
  Math.abs(totalOf(whole) - 169) < 1e-9,
  String(totalOf(whole)));

ok('  with all fifty-one lines on it and none lost to a shared shot',
  worded(whole).length === 51,
  `${worded(whole).length} lines landed`);

/* ── 12. The narrowing from `lyrictime`'s own shape ───────────────────── */

ok('a `TimedLine` from the timing ladder is the same three numbers',
  asTimed([{ text: 'x', start: 1, end: 2, section: 'Chorus', opensSection: true } as never])
    .map((one) => `${one.from}-${one.to}-${one.text}`).join('') === '1-2-x',
  JSON.stringify(asTimed([{ text: 'x', start: 1, end: 2 }])));

/* ── 13. The wire from the song to the button ─────────────────────────── */

/* These read the room's source and hold that the wire EXISTS, not that it
   works on a screen. `scripts/lyricfilm.mts`'s sibling,
   `scripts/check-lyriccut.mts`, has the note on why the press cannot be
   walked in a browser here. */

const room = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));

ok('the timings are asked for when her own song goes under the film',
  /void timeFor\(one, blob\)/.test(room),
  'the answer is kept and cannot change unless the file does, and a member who'
  + ' has just chosen a song is the one person who will wait a second for it');

ok('  and the offer is cleared when a song off the phone replaces it',
  (room.match(/setSung\(null\)/g) ?? []).length >= 2,
  'a song off the phone has no lyrics on file, and an offer that goes on'
  + ' describing the song before it is worse than no offer');

ok('the offer refuses the ladder\u2019s bottom rung',
  /sung\.how !== 'spread' && sung\.how !== 'none'/.test(room),
  'on `spread` the words are laid evenly with nothing measured — fine to draw'
  + ' on a screen, and fifty-two wrong edits to her film');

ok('  and says which rung it is standing on, in her words',
  /data-editorsonghow=\{sung\.how\}/.test(room)
  && /'edit\.songAligned'/.test(room) && /'edit\.songPhrases'/.test(room),
  'a member deciding whether to press this is entitled to know whether the'
  + ' timings were measured or worked out');

ok('the button is joined to the thing that cuts',
  /data-editorsonghang[\s\S]{0,120}?onClick=\{hangSong\}/.test(room),
  'a button wired to nothing looks identical in the markup to one wired to'
  + ' `hangSong`');

ok('cutting the film on the song is one step on the history',
  /const hangSong = useCallback\(\(\) => \{[\s\S]{0,300}?commit\(\(was\) => lyricFilm\(was, sung\.lines\)\)/.test(room),
  'it turns one shot into fifty-two; if that is not one undo it is fifty-two'
  + ' presses to get her film back');

ok('the count is worked out once per change and not on every render',
  /const sungHowMany = useMemo\(/.test(room),
  'the only honest count is to do the work and see, and on her own song that'
  + ' is fifty-one splits — not something to run while she types in the'
  + ' caption box underneath it');

ok('the bar is marked for this one too',
  /sungIsGood \? 'words' : null/.test(room),
  'the offer lives on one bench and nowhere else');

if (bad) {
  console.error(`\ncheck:lyricfilm — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:lyricfilm — a song under a film is cut into one shot per sung line,'
  + ' each line on the shot that starts where it is sung, with every cut she'
  + ' made still a cut and the film exactly as long.',
);
