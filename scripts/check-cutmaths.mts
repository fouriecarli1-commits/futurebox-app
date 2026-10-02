/**
 * The clock under the cutting room, read with numbers.
 *
 * ── Why this exists, written the day it caught something ──────────────────
 *
 * `videoedit.ts` is where every number in that room comes from: how long a
 * piece is, where it starts, which piece is on screen at a second, where a
 * split lands. Until 3 October 2026 the only thing reading any of it was a
 * browser probe, and a browser probe asks "does it work" of one arrangement.
 *
 * Two bugs lived in `split` behind exactly that. Both were put there by making
 * `lengthOfPiece` divide by the speed, and both were invisible:
 *
 * 1. `split(edit, id, at)` takes a second on the FILM's clock. The editor was
 *    passing `piece.from + length / 2`, which is a position in the FILE. Those
 *    are the same number for an untrimmed first piece and for pieces that are
 *    contiguous slices of one file — which is every arrangement the probe ever
 *    built — and different for anything trimmed.
 *
 * 2. `split` then added that film offset straight onto `piece.from` without
 *    multiplying by the speed. A piece at two times covers two seconds of file
 *    per second of film, so splitting it in the middle cut a quarter of the way
 *    into the material.
 *
 * `check:editor` split one piece, at one times, untrimmed, and asserted the
 * film was still as long as it was — which is true wherever the cut lands. A
 * green check measuring the thing beside the real thing, for the third time
 * this week.
 *
 * So: numbers, here, where a trimmed piece at two times costs one line to
 * write.
 */
import {
  NOTHING, SHORTEST_PIECE, SHAPES,
  add, atSecond, change, cutFrom, drop, duplicate, fadesFor, filmSecond, lengthOfPiece,
  move, runs, split, startsAt,
  type Edit, type Piece,
} from '../app/lib/videoedit';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};
const near = (a: number, b: number, by = 0.001): boolean => Math.abs(a - b) < by;

/* A clip stands in for a Blob. Nothing in this module reads the bytes — it
   carries the reference and works in seconds — so a marker object is enough,
   and a real Blob would mean a browser for arithmetic that does not need one. */
const CLIP = { size: 1, type: 'video/mp4' } as unknown as Blob;
const piece = (id: string, from: number, to: number, rest: Partial<Piece> = {}): Piece => ({
  id, clip: CLIP, name: id, from, to, ...rest,
});

/* ── How long a piece is ───────────────────────────────────────────────── */

ok('a piece is as long as the window on it',
  lengthOfPiece(piece('a', 1, 5)) === 4);

ok('  and half as long at twice the speed, because that is what comes out',
  lengthOfPiece(piece('a', 1, 5, { speed: 2 })) === 2,
  `${lengthOfPiece(piece('a', 1, 5, { speed: 2 }))}s of film from four seconds of material`);

ok('  and twice as long at half the speed',
  lengthOfPiece(piece('a', 1, 5, { speed: 0.5 })) === 8);

ok('  and a backwards window is nought rather than negative',
  lengthOfPiece(piece('a', 5, 1)) === 0,
  'a negative length puts every block after it in the wrong place');

ok('  and an absurd speed is clamped rather than dividing by nearly nothing',
  Number.isFinite(lengthOfPiece(piece('a', 0, 4, { speed: 0 })))
  && lengthOfPiece(piece('a', 0, 4, { speed: 0 })) <= 40,
  `${lengthOfPiece(piece('a', 0, 4, { speed: 0 }))}s — a speed of nought is an infinite piece`);

/* ── Where a piece starts, which is the film's clock and not the file's ── */

const film: Edit = {
  pieces: [
    piece('one', 0, 3),
    piece('two', 10, 16, { speed: 2 }),
    piece('three', 2, 4),
  ],
};

ok('the film runs as long as its pieces added up, after their speeds',
  runs(film) === 3 + 3 + 2,
  `${runs(film)}s from a 3s, a 6s at 2x and a 2s`);

ok('  and a piece starts where the ones before it ended',
  startsAt(film, 'two') === 3 && startsAt(film, 'three') === 6,
  `two starts at ${startsAt(film, 'two')}, three at ${startsAt(film, 'three')}`);

ok('  and where a piece starts is NOT where its window starts',
  startsAt(film, 'two') !== film.pieces[1].from,
  'the film clock and the file clock are different clocks, which is the whole of'
  + ' the split bug this check was written for');

/* It answered the END OF THE FILM before this was written — eight seconds, for a
   piece that does not exist. A real number every caller could do arithmetic with
   and none of them could tell was meaningless. NaN cannot be quietly used:
   anything built on it is NaN, every comparison against it is false, and a block
   positioned at it does not appear, which is a fault somebody can see. */
ok('  and an unknown id starts nowhere, not at the end of the film',
  Number.isNaN(startsAt(film, 'nope')),
  `${startsAt(film, 'nope')} — a plausible second for a piece that is not there`
  + ' is the minus-one fault in another costume');

/* ── Which piece is on screen at a second ──────────────────────────────── */

ok('the first second of the film is in the first piece',
  atSecond(film, 1)?.piece.id === 'one');

ok('  and a second past the first cut is in the second piece',
  atSecond(film, 4)?.piece.id === 'two',
  `${atSecond(film, 4)?.piece.id} at 4s`);

/* The offset INTO the piece has to be a position in the file, because that is
   what a `<video>` is seeked to. One second of film into a 2x piece is two
   seconds of material. */
const inTwo = atSecond(film, 4);
ok('  and the offset it gives is a position in the FILE, scaled by the speed',
  inTwo !== null && near(inTwo.into, 10 + 2),
  `${inTwo?.into} where the window opens at 10 and one second of film into a 2x`
  + ' piece is two seconds of material');

ok('  and past the end of the film there is no piece rather than the last one',
  atSecond(film, 99) === null,
  'answering the last piece for a second past the end puts the playhead on a'
  + ' frame the film does not have');

/* ── Out through one clock and back through the other ─────────────────────

   The strongest thing in this file, and the cheapest.

   `atSecond` turns a second of film into a position in the material; `filmSecond`
   turns a position in the material back into a second of film. Going out and
   back has to land on the second it started from, at every speed — and it cannot
   unless BOTH of them scale by the speed, in opposite directions.

   Three places in this app were doing this conversion by hand before
   3 October 2026 and two of them were wrong, each one in a different direction:
   `atSecond` did not multiply, so the picture sat earlier in the shot than the
   line said, and the playhead's own tick did not divide, so the line ran at
   twice the rate of a 2x piece. A round trip catches either half on its own, and
   neither could be caught by a probe scrubbing a piece at one times — where the
   speed is one and scaling by it changes nothing. */
for (const speed of [0.5, 1, 1.5, 2, 4]) {
  const spun: Edit = {
    pieces: [piece('one', 0, 3), piece('two', 10, 16, { speed }), piece('three', 1, 3)],
  };
  const whole = runs(spun);
  const landed = [0.1, 1, whole / 3, whole / 2, whole - 0.1].every((second) => {
    const there = atSecond(spun, second);
    if (!there) return false;
    return near(filmSecond(spun, there.piece.id, there.into), second, 0.0001);
  });
  ok(`a second of film goes out to the material and back at ${speed}x`,
    landed,
    'the two conversions have to scale by the speed in opposite directions, and'
    + ' two of the three places doing it by hand had it wrong in two directions');
}

ok('  and a position in a piece that is not in the edit is nowhere',
  Number.isNaN(filmSecond(film, 'nope', 2)));

/* ── The split, which is where both bugs were ──────────────────────────── */

/* A trimmed second piece: `from` is 10 and it starts at 3 on the film's clock.
   Splitting it in the middle of ITSELF is at 3 + 1.5 on the film clock. */
const plain: Edit = { pieces: [piece('one', 0, 3), piece('two', 10, 16)] };
const halves = split(plain, 'two', startsAt(plain, 'two') + lengthOfPiece(plain.pieces[1]) / 2);

ok('splitting a trimmed piece in the middle makes two equal halves',
  halves.pieces.length === 3
  && near(lengthOfPiece(halves.pieces[1]), lengthOfPiece(halves.pieces[2])),
  `${halves.pieces.slice(1).map((one) => lengthOfPiece(one)).join('s and ')}s`);

ok('  and cuts the MATERIAL at the middle of the window, not of the film',
  near(halves.pieces[1].to, 13),
  `the cut is at ${halves.pieces[1].to} where the window runs 10 to 16`);

ok('  and the film is exactly as long as it was',
  near(runs(halves), runs(plain)),
  `${runs(plain)}s became ${runs(halves)}s`);

/* And the same piece at two times. One second of film is two of material, so
   the cut has to be multiplied by the speed on its way into the window. */
const fast: Edit = { pieces: [piece('one', 0, 3), piece('two', 10, 16, { speed: 2 })] };
const fastHalves = split(fast, 'two', startsAt(fast, 'two') + lengthOfPiece(fast.pieces[1]) / 2);

ok('splitting a piece at twice the speed also makes two equal halves',
  fastHalves.pieces.length === 3
  && near(lengthOfPiece(fastHalves.pieces[1]), lengthOfPiece(fastHalves.pieces[2])),
  `${fastHalves.pieces.slice(1).map((one) => lengthOfPiece(one)).join('s and ')}s of film`);

ok('  and cuts the material halfway through it, not a quarter of the way in',
  near(fastHalves.pieces[1].to, 13),
  `the cut is at ${fastHalves.pieces[1].to} where halfway through a 10-to-16`
  + ' window is 13 — without multiplying by the speed it lands at 11.5');

ok('  and the halves keep the speed they were split out of',
  fastHalves.pieces[1].speed === 2 && fastHalves.pieces[2].speed === 2);

ok('  and the film is exactly as long as it was',
  near(runs(fastHalves), runs(fast)));

ok('a split too near an edge is refused rather than making a sliver',
  split(plain, 'two', startsAt(plain, 'two') + SHORTEST_PIECE / 2).pieces.length === 2,
  'a piece shorter than SHORTEST_PIECE is a block too thin to pick up again');

ok('  and splitting an id that is not there changes nothing',
  split(plain, 'nope', 1) === plain,
  'a new object for no change is a history step for nothing');

ok('  and the two halves have ids of their own',
  new Set(halves.pieces.map((one) => one.id)).size === 3,
  'two pieces with one id is a picker that picks whichever find reaches first');

/* ── A copy carries everything that was decided ────────────────────────── */

const decided: Edit = {
  pieces: [piece('one', 0, 4, {
    look: 'warm', words: 'Hallo', wordsSize: 0.09, wordsTurn: 15,
    speed: 1.5, sound: true, loud: 0.4, join: 'dissolve',
  })],
};
const copied = duplicate(decided, 'one');

ok('a copy is put straight after the piece it came from',
  copied.pieces.length === 2 && copied.pieces[0].id === 'one');

ok('  with every decision on it',
  (['look', 'words', 'wordsSize', 'wordsTurn', 'speed', 'sound', 'loud', 'join'] as const)
    .every((key) => copied.pieces[1][key] === decided.pieces[0][key]),
  'a copy that loses the grade and the caption is a copy of the file, not of the shot');

ok('  and an id of its own',
  copied.pieces[1].id !== 'one');

ok('  and copying nothing changes nothing',
  duplicate(decided, 'nope') === decided);

/* ── Moving, dropping, changing ────────────────────────────────────────── */

ok('a piece moved later swaps with the one after it',
  move(film, 'one', 'later').pieces.map((one) => one.id).join() === 'two,one,three');

ok('  and the last piece cannot be moved later off the end',
  move(film, 'three', 'later').pieces.map((one) => one.id).join() === 'one,two,three');

ok('  and the first cannot be moved earlier',
  move(film, 'one', 'earlier').pieces.map((one) => one.id).join() === 'one,two,three');

ok('  and moving never changes how long the film is',
  runs(move(film, 'two', 'later')) === runs(film));

ok('dropping a piece leaves the others alone',
  drop(film, 'two').pieces.map((one) => one.id).join() === 'one,three');

ok('  and changing an unknown id leaves the edit as it was',
  change(film, 'nope', { look: 'cold' }).pieces.every(
    (one, i) => one.look === film.pieces[i].look,
  ));

/* ── The fades, which may not add up to longer than the film ───────────── */

const long = fadesFor({ ...film, fadeIn: 5, fadeOut: 5 });
ok('two fades longer than the film together are shared down to fit it',
  long.in + long.out <= runs(film) + 0.001,
  `${long.in}s and ${long.out}s against a ${runs(film)}s film`);

ok('  and a fade on an empty film is nothing rather than NaN',
  fadesFor({ ...NOTHING, fadeIn: 2 }).in === 0);

/* ── And the cut handed to the renderer ────────────────────────────────── */

const cut = cutFrom({ ...decided, shape: 'wide' });
ok('the cut comes out in the shape the edit asked for',
  cut.width === SHAPES.wide.width && cut.height === SHAPES.wide.height);

ok('  and carries the join, the speed and the loudness through',
  cut.scenes[0].join === 'dissolve' && cut.scenes[0].speed === 1.5
  && cut.scenes[0].loud === 0.4);

ok('  and a hard cut is not carried at all, because it is what nothing means',
  cutFrom({ pieces: [piece('one', 0, 4, { join: 'cut' })] }).scenes[0].join === undefined,
  'a field on every scene of every film saying "nothing happens here"');

ok('  and a piece of no length is left out rather than rendered as nothing',
  cutFrom({ pieces: [piece('one', 2, 2)] }).scenes.length === 0);

if (bad) {
  console.error(`\ncheck:cutmaths — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:cutmaths — the film clock and the file clock stay apart, a trimmed'
  + ' piece at twice the speed splits in its own middle, and a copy is a copy of'
  + ' the shot rather than of the file.',
);
