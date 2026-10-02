/**
 * The two red lines: what they take out, what closes up, and what the song
 * does about it.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 4 October 2026: *"Dit sal goed wees dat daar twee ekstra rooi lyne is
 * waar mens 'n stuk kan uit cut, en 'n funksie om bloot net waar die curser is
 * te split. Dan ook die oomblik wanneer 'n mens 'n stuk uit cut moet die video
 * wat verder is die gaping toe maak en terug spring. Hier is die magneet
 * funksie baie belangrik, en ook die keuse van interlock net soos by
 * probooth."*
 *
 * ── Why this is arithmetic and not a browser probe ───────────────────────
 *
 * Because the ways it goes wrong are all off-by-one-piece, and a browser
 * cannot see them: a cut that takes four frames too many looks like a cut. The
 * three ways a span can meet a piece — swallowing it, clipping its head,
 * landing wholly inside it — all happen on one real cut, and the third makes
 * two pieces out of one.
 *
 * And the two clocks. The film loses seconds as it is cut; the song does not.
 * Recording a skip in film time would take the same seconds out of the music
 * twice, which is the kind of fault that is obvious in a number and nearly
 * impossible to hear.
 */
import {
  SHORTEST_SPAN, SHORTEST_WORDS, heldWords, pointsOf, spanReady, stretches,
  tidy, withSkip, wordsSpan,
} from '../app/lib/videospan';
import { pullTo } from '../app/lib/magnet';
import { cutOut, runs, splitHere, startsAt } from '../app/lib/videoedit';
import type { Edit, Piece } from '../app/lib/videoedit';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

const CLIP = { size: 1, type: 'video/mp4' } as unknown as Blob;
const piece = (id: string, from: number, to: number, over: Partial<Piece> = {}): Piece =>
  ({ id, clip: CLIP, name: id, from, to, ...over });

/** Three ten-second pieces: 0–10, 10–20, 20–30 on the film's clock. */
const three: Edit = {
  pieces: [piece('a', 0, 10), piece('b', 0, 10), piece('c', 0, 10)],
};

ok('three ten-second pieces make a thirty-second film',
  runs(three) === 30, `${runs(three)}`);

/* ── The lines ─────────────────────────────────────────────────────────── */

ok('two lines on top of each other are not a span',
  !spanReady({ from: 5, to: 5 }) && !spanReady(null) && !spanReady(undefined),
  'a cut that removes nothing still files a history step, which is a button'
  + ' that looks broken');

ok('  and a span has to be longer than a frame to count',
  !spanReady({ from: 5, to: 5 + SHORTEST_SPAN / 2 })
  && spanReady({ from: 5, to: 5 + SHORTEST_SPAN }),
  `${SHORTEST_SPAN}s, a hair under a frame at 24fps`);

ok('  and dragging the out-line past the in-line swaps them rather than sticking',
  tidy(9, 4).from === 4 && tidy(9, 4).to === 9 && tidy(4, 9).from === 4,
  'a line that stops moving when it meets the other one is a line that feels'
  + ' broken, and every editor swaps them');

/* ── Taking a span out: the three ways it meets a piece ────────────────── */

const whole = cutOut(three, { from: 10, to: 20 });
ok('a span that covers a piece exactly takes that piece and nothing else',
  whole.pieces.length === 2 && runs(whole) === 20,
  `${whole.pieces.length} pieces, ${runs(whole)}s`);

ok('  and the piece after it jumps back to where the gap was',
  startsAt(whole, whole.pieces[1].id) === 10,
  `${startsAt(whole, whole.pieces[1].id)} — "die video wat verder is [moet] die`
  + ' gaping toe maak en terug spring"');

const half = cutOut(three, { from: 5, to: 15 });
/* Three, not two, and writing two was my own arithmetic being wrong rather
   than the code's: cutting 5 to 15 out of three ten-second pieces keeps the
   HEAD of the first, the TAIL of the second, and the third untouched. */
ok('a span across a join clips the head of one and the tail of the other',
  half.pieces.length === 3 && Math.abs(runs(half) - 20) < 1e-9,
  `${half.pieces.length} pieces, ${runs(half)}s`);

ok('  and the piece the span never reached is left whole',
  Math.abs((half.pieces[2].to - half.pieces[2].from) - 10) < 1e-9,
  `${half.pieces[2].to - half.pieces[2].from}`);

ok('  and the first keeps exactly its first five seconds',
  Math.abs((half.pieces[0].to - half.pieces[0].from) - 5) < 1e-9,
  `${half.pieces[0].to - half.pieces[0].from}`);

const inside = cutOut(three, { from: 12, to: 15 });
ok('a span wholly inside one piece leaves a head AND a tail, not a hole',
  inside.pieces.length === 4 && Math.abs(runs(inside) - 27) < 1e-9,
  `${inside.pieces.length} pieces, ${runs(inside)}s — one piece with a hole in`
  + ' it is not a thing a timeline can hold');

ok('  and the tail opens on a straight cut rather than a transition',
  inside.pieces[2].join === 'cut',
  `${inside.pieces[2].join} — it is no longer arriving from the piece it was`
  + ' built to arrive from');

/* ── Speed, which is where split and atSecond each went wrong once ─────── */

const fast: Edit = { pieces: [piece('f', 0, 20, { speed: 2 })] };
ok('a piece at two times is ten seconds of film from twenty of material',
  runs(fast) === 10, `${runs(fast)}`);

const cutFast = cutOut(fast, { from: 0, to: 5 });
ok('  and cutting its first five FILM seconds takes ten seconds of material',
  cutFast.pieces.length === 1 && cutFast.pieces[0].from === 10,
  `from ${cutFast.pieces[0]?.from} — film seconds are not file seconds, and`
  + ' both split and atSecond lost this multiplication once');

ok('  leaving five seconds of film',
  Math.abs(runs(cutFast) - 5) < 1e-9, `${runs(cutFast)}`);

/* ── Splitting where the playhead is ───────────────────────────────────── */

ok('splitting at the playhead makes two pieces out of the one under it',
  splitHere(three, 15).pieces.length === 4,
  `${splitHere(three, 15).pieces.length}`);

ok('  and the film is exactly as long as it was',
  Math.abs(runs(splitHere(three, 15)) - 30) < 1e-9,
  `${runs(splitHere(three, 15))} — a split moves no frames`);

ok('  and a playhead past the end splits nothing',
  splitHere(three, 99).pieces.length === 3,
  'answering "the last piece" would make the end of the film and a second'
  + ' after it the same place');

/* ── The magnet ────────────────────────────────────────────────────────── */

const points = pointsOf([0, 10, 20], 30, 14);
ok('the lines can stick to every cut in the film, the playhead and both ends',
  points.some((p) => p.at === 10) && points.some((p) => p.at === 14 && p.what === 'head')
  && points.some((p) => p.at === 0) && points.some((p) => p.at === 30),
  points.map((p) => `${p.at}${p.what === 'head' ? '*' : ''}`).join(' '));

ok('  and a boundary is one point, not two',
  points.filter((p) => p.at === 10).length === 1,
  'the end of one piece is the start of the next, and two points at one second'
  + ' make the magnet compare a number with itself');

ok('a line dropped near a cut takes the cut',
  pullTo(10.3, null, points, 0.5).at === 10,
  `${pullTo(10.3, null, points, 0.5).at} — a line two frames inside the next`
  + ' shot takes two frames of it with the span, which is a flash in the'
  + ' finished film');

ok('  and a line dropped in open space is left where the hand put it',
  pullTo(5, null, points, 0.5).at === 5,
  `${pullTo(5, null, points, 0.5).at}`);

/* ── The interlock, and the two clocks ─────────────────────────────────── */

const once = withSkip([], { from: 10, to: 15 });
ok('one cut records one skip, where it was made',
  once.length === 1 && once[0].from === 10 && once[0].to === 15,
  JSON.stringify(once));

const twice = withSkip(once, { from: 10, to: 15 });
ok('  and a second cut at the same place on the shortened film is later in the song',
  twice[1].from === 15 && twice[1].to === 20,
  JSON.stringify(twice)
  + ' — the film has already lost five seconds, so "ten" on its clock is'
  + ' fifteen on the song’s. Recording both as ten would take the same five'
  + ' seconds out of the music twice');

ok('  and a cut BEFORE an existing skip is not pushed by it',
  withSkip([{ from: 20, to: 25 }], { from: 5, to: 8 })[0].from === 5,
  'only skips at or before a cut have already moved it');

const runsOut = stretches([{ from: 10, to: 15 }], 0, 20);
ok('a song with a skip is played as two stretches, not one',
  runsOut.length === 2,
  JSON.stringify(runsOut) + ' — one BufferSource cannot jump a hole in the'
  + ' middle of itself, so a skip has to be more than one node');

ok('  the first running up to the skip',
  runsOut[0].at === 0 && runsOut[0].from === 0 && runsOut[0].long === 10,
  JSON.stringify(runsOut[0]));

ok('  and the second starting after it, at the film second it belongs at',
  runsOut[1].at === 10 && runsOut[1].from === 15 && runsOut[1].long === 10,
  JSON.stringify(runsOut[1]));

ok('  and the stretches together are exactly as long as the film',
  Math.abs(runsOut.reduce((all, one) => all + one.long, 0) - 20) < 1e-9,
  'a song that runs past the end is a song the recorder never hears, and one'
  + ' that stops early is silence nobody asked for');

ok('a song with no skips is one stretch, as it always was',
  stretches([], 3, 20).length === 1 && stretches([], 3, 20)[0].from === 3,
  JSON.stringify(stretches([], 3, 20)));

/* ── The interlock is a CHOICE, which is the half that can be missed ───── */

const withSong: Edit = { ...three, under: CLIP };
ok('with the interlock on, a cut takes the same span out of the song',
  (cutOut(withSong, { from: 10, to: 20 }).underSkips ?? []).length === 1,
  'this is the default, because a cut made to the music is the common case');

ok('  and with it off, the song is left alone',
  (cutOut({ ...withSong, locked: false }, { from: 10, to: 20 }).underSkips ?? []).length === 0,
  'which is what you want when the music is a bed rather than something the'
  + ' cuts were made to');

ok('  and a film with no song records nothing either way',
  (cutOut(three, { from: 10, to: 20 }).underSkips ?? []).length === 0,
  'a skip list on a film with no track would survive one being added later and'
  + ' silently chop it');

ok('and the lines are put away once their span has been cut',
  cutOut({ ...three, span: { from: 10, to: 20 } }, { from: 10, to: 20 }).span === null,
  'two red lines still lying across a film that no longer has that span is an'
  + ' invitation to press cut again and take the wrong ten seconds');

/* ── The caption's own lane ────────────────────────────────────────────

   Carli, 4 October 2026: *"Video editor se teks moet ook sy eie tydlyn hê ...
   Dit kan nie die hele video bar vol wees nie, want teks is gewoonlik net daar
   vir gedeeltes van 'n video."* */

ok('a caption that was never timed is up for the whole shot',
  wordsSpan({}, 10).from === 0 && wordsSpan({}, 10).to === 10,
  'every caption typed before this existed has no numbers on it, and text that'
  + ' vanished the day it could be timed would be a feature taking something'
  + ' away');

ok('  and one that was timed keeps its own stretch',
  wordsSpan({ wordsFrom: 2, wordsTo: 5 }, 10).from === 2
  && wordsSpan({ wordsFrom: 2, wordsTo: 5 }, 10).to === 5,
  JSON.stringify(wordsSpan({ wordsFrom: 2, wordsTo: 5 }, 10)));

ok('  and a stretch longer than its shot is cut to the shot',
  wordsSpan({ wordsFrom: 0, wordsTo: 99 }, 10).to === 10,
  `${wordsSpan({ wordsFrom: 0, wordsTo: 99 }, 10).to} — a caption cannot be up`
  + ' after its own picture has gone');

ok('dragging a caption keeps it inside its shot',
  heldWords(-4, 99, 10).from === 0 && heldWords(-4, 99, 10).to === 10,
  JSON.stringify(heldWords(-4, 99, 10)));

ok('  and never squashes it below something anybody can read',
  heldWords(5, 5, 10).to - heldWords(5, 5, 10).from >= SHORTEST_WORDS,
  `${heldWords(5, 5, 10).to - heldWords(5, 5, 10).from}s — half a second, not a`
  + ' frame: the limit here is the eye rather than the encoder, because a'
  + ' caption is something somebody has to READ');

ok('  and a shot shorter than that still gives the caption the whole of it',
  heldWords(0, 0.2, 0.2).from === 0 && heldWords(0, 0.2, 0.2).to === 0.2,
  JSON.stringify(heldWords(0, 0.2, 0.2))
  + ' — refusing would mean a shot with words on it that cannot be timed');

if (bad) {
  console.error(`\ncheck:cutspan — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:cutspan — two lines take a span out, everything after it closes up,'
  + ' the lines stick to every cut in the film, and the song follows or does not,'
  + ' on her choice.',
);
