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
  slidWords, tidy, withSkip, wordsSpan, wordsUp,
} from '../app/lib/videospan';
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { pullTo } from '../app/lib/magnet';
import { captionAt, cutFrom, cutOut, runs, splitHere, startsAt, wordsReach } from '../app/lib/videoedit';
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

/* ── Sliding a caption, which is where the runaway was ──────────────────

   Carli, 4 October 2026: *"Al haal ek die magnet af spring die teks nogsteeds
   rond asof die magnet aan is."* It was not the magnet — there is no magnet on
   that drag, which is why switching it off changed nothing.

   Given a sixty-second shot, so a runaway has room to run. The browser probe
   could not show this: its fixture clip is 2.4 seconds, a runaway hits the end
   of the shot within one move, and the clamp puts it exactly where a correct
   drag puts it. Reinstating the bug left that probe green. */

const SHOT = 60;
const began = { from: 10, to: 14 };

ok('sliding a caption moves it by exactly what the finger moved',
  slidWords(began, 6, SHOT).from === 16 && slidWords(began, 6, SHOT).to === 20,
  JSON.stringify(slidWords(began, 6, SHOT)));

ok('  and keeps its length, so moving is not resizing',
  slidWords(began, 6, SHOT).to - slidWords(began, 6, SHOT).from === 4,
  'clamping the two ends separately would stretch a block pushed against the'
  + ' start of its shot instead of stopping it');

/* The runaway, written out as the arithmetic it was. Each move applied the
   whole distance to the already-moved span, so three moves of six seconds put
   it 18 seconds further on instead of six. */
ok('  and a gesture is measured from where it STARTED, not from where it is now',
  (() => {
    let live = began;
    for (let i = 0; i < 3; i += 1) live = slidWords(began, 6, SHOT);
    return live.from === 16;
  })(),
  'applying the displacement to the live span on every pointermove is what'
  + ' made the caption accelerate away from the finger in growing jumps');

ok('  and it stops at the end of its shot rather than sliding past it',
  slidWords(began, 999, SHOT).to === SHOT
  && slidWords(began, 999, SHOT).from === SHOT - 4,
  JSON.stringify(slidWords(began, 999, SHOT)));

ok('  and at the start, the same way',
  slidWords(began, -999, SHOT).from === 0 && slidWords(began, -999, SHOT).to === 4,
  JSON.stringify(slidWords(began, -999, SHOT)));

/* ── When the words are up, asked once and answered once ───────────────────

   Carli, 4 October 2026: *"al maak ek die teks kleiner dat dit nie oor die
   hele video stuk strek nie, wys die teks steeds oor die hele video stuk."*

   She had dragged a caption's block in to half its clip and the room went on
   drawing the words over all of it. The export was right the whole time: the
   gate existed, written out inside `stitch.ts` and nowhere else, so the only
   way to find out that the room was lying was to pay for a render and watch
   it.

   One predicate now, asked by both. The rules below are about the predicate;
   the two after them are about there being no second copy of it, because a
   second copy is the whole fault. */

ok('a caption is up inside its own stretch',
  wordsUp({ from: 2, to: 5 }, 3)
  && wordsUp({ from: 2, to: 5 }, 2)
  && wordsUp({ from: 2, to: 5 }, 5),
  'both ends count as up — a caption that blinks off on the frame its own'
  + ' block ends is a caption that is one frame short of what she drew');

ok('  and down outside it',
  !wordsUp({ from: 2, to: 5 }, 1.9) && !wordsUp({ from: 2, to: 5 }, 5.1),
  'this is the whole request: a caption dragged in to half the clip is not on'
  + ' screen for the other half');

ok('a caption that was never timed is up for the whole shot',
  wordsUp({}, 0) && wordsUp({}, 999),
  'typed before the lane existed, or typed and never dragged — absent is not'
  + ' nought, and reading it as nought would blank every untimed caption in'
  + ' every film anybody has already made');

ok('  and one end on its own leaves the other open',
  wordsUp({ from: 3 }, 999) && !wordsUp({ from: 3 }, 2)
  && wordsUp({ to: 3 }, 0) && !wordsUp({ to: 3 }, 4),
  'a caption that comes up late and never goes down is a real thing to want');

const stitch = withoutComments(readFileSync('app/lib/stitch.ts', 'utf8'));
const room = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));

ok('the renderer asks the shared question rather than its own',
  /captions\.find\(\(one\) => wordsUp\(one, shown\)\)/.test(stitch)
  && !/captionFrom !== undefined/.test(stitch),
  'it had the right answer and kept it to itself for a day');

ok('  and the room asks one question for the whole film',
  /const said = captionAt\(edit, at\)/.test(room),
  'once a caption can outlive its own shot, "the piece under the playhead" and'
  + ' "the piece whose words are up" stop being the same thing — and a preview'
  + ' that asks the first shows nothing over every shot one is stretched'
  + ' across');

ok('  and the preview is gated on the answer, not merely computing it',
  /\{wordsNow\.said && \(/.test(room),
  'a number worked out and not used is the shape this bug already had once');

/* ── Room to run past its own shot ─────────────────────────────────────────

   Carli, 5 October 2026: *"Dit wil wel nie verby een video stretch nie. As hy
   op sy eie tydlyn is moet hy ruimte hê om verby 'n ander video te kan
   stretch."*

   The old ceiling was never a decision: a caption was clamped to its own piece
   because the piece was the only thing the span knew about. A lane of its own
   is only a lane if something on it can cross a cut. */

ok('a caption can be dragged past the end of its own shot',
  wordsSpan({ wordsFrom: 1, wordsTo: 9 }, 4, 12).to === 9,
  `${wordsSpan({ wordsFrom: 1, wordsTo: 9 }, 4, 12).to} on a four-second shot`
  + ' with twelve seconds of film left to run');

ok('  but it still has to start inside it',
  wordsSpan({ wordsFrom: 9, wordsTo: 11 }, 4, 12).from === 4,
  'a caption belongs to the shot it comes up on — that is what keeps it with'
  + ' the shot when the shot is moved — and one that could begin before its'
  + ' own picture would belong to nothing');

ok('  and it stops where the film does',
  wordsSpan({ wordsFrom: 0, wordsTo: 99 }, 4, 12).to === 12,
  `${wordsSpan({ wordsFrom: 0, wordsTo: 99 }, 4, 12).to}`);

ok('  and an untimed caption is still exactly its own shot',
  wordsSpan({}, 4, 12).from === 0 && wordsSpan({}, 4, 12).to === 4,
  'every caption ever typed would otherwise silently grow to the end of the'
  + ' film the day this shipped');

ok('dragging an end past the reach stops at it rather than refusing',
  heldWords(0, 99, 4, 12).to === 12 && heldWords(0, 6, 4, 12).to === 6,
  JSON.stringify(heldWords(0, 99, 4, 12)));

ok('  and moving a long caption keeps its length',
  slidWords({ from: 0, to: 8 }, 2, 4, 12).to - slidWords({ from: 0, to: 8 }, 2, 4, 12).from === 8,
  JSON.stringify(slidWords({ from: 0, to: 8 }, 2, 4, 12)));

/* ── And it stops where the next one starts ──────────────────────────────

   One words lane, so two captions on the same second is not a lane: it is two
   pieces of text drawn on top of each other in the same place on the frame,
   both unreadable. `wordsReach` makes the overlap impossible rather than ugly,
   which is also what lets the renderer stay simple — at most one is ever up. */

const oneShot = (
  id: string,
  words?: string,
  from?: number,
  to?: number,
): Piece => ({
  id,
  clip: new Blob(),
  name: id,
  from: 0,
  to: 4,
  ...(words ? { words } : {}),
  ...(from !== undefined ? { wordsFrom: from } : {}),
  ...(to !== undefined ? { wordsTo: to } : {}),
});

/* Three four-second shots. The first carries a caption stretched to nine
   seconds — over the whole of the silent second shot and a second into the
   third — and the third has its own caption starting two seconds in, so there
   is a one-second gap between them where nothing is up. */
const trio: Edit = {
  pieces: [oneShot('a', 'one', 0, 9), oneShot('b'), oneShot('c', 'two', 2)],
};

ok('a caption reaches up to where the next one comes up',
  wordsReach(trio, 'a') === 10,
  `${wordsReach(trio, 'a')} — four of its own, four of the silent shot, and`
  + ' two more to where the next caption begins');

ok('  and never onto it',
  wordsSpan(trio.pieces[0], 4, wordsReach(trio, 'a')).to <= 10,
  'two captions on one second is two pieces of text in the same place on the'
  + ' frame, both unreadable');

ok('the last caption in a film reaches its end',
  wordsReach(trio, 'c') === 4,
  `${wordsReach(trio, 'c')} — nothing follows it, so the film is the ceiling`);

/* ── And the FILM really carries it across the cut ─────────────────────────

   The assertions above are about the edit. This one is about what the renderer
   is handed, which is where the request actually lands: a caption that stops at
   its own scene boundary in the cut is a caption she dragged across two shots
   and that appears over one.

   The renderer plays one scene at a time and only knows how far into THAT
   scene it is, so a caption arriving from earlier reaches it with a negative
   start. `cutFrom` is the one place that knows both clocks. */
const told = cutFrom(trio);

ok('the cut hands the stretched caption to the shot after it too',
  told.scenes[1]?.captions?.length === 1
  && told.scenes[1]?.captions?.[0]?.text === 'one',
  `${told.scenes[1]?.captions?.length ?? 0} captions on the silent second shot`
  + ' — this is the whole request, measured on what the renderer is given');

ok('  with a start before the shot began, which is what carrying over means',
  told.scenes[1]?.captions?.[0]?.from === -4
  && told.scenes[1]?.captions?.[0]?.to === 5,
  JSON.stringify(told.scenes[1]?.captions?.[0]));

ok('a shot can be handed one arriving and one of its own',
  told.scenes[2]?.captions?.length === 2
  && told.scenes[2]?.captions?.[0]?.text === 'one'
  && told.scenes[2]?.captions?.[1]?.text === 'two',
  `${told.scenes[2]?.captions?.length ?? 0} — the case a single caption field`
  + ' on a scene cannot express, and the reason there is a list');

ok('  and the two never overlap',
  (told.scenes[2]?.captions?.[0]?.to ?? 0) <= (told.scenes[2]?.captions?.[1]?.from ?? 0),
  `${told.scenes[2]?.captions?.[0]?.to} then ${told.scenes[2]?.captions?.[1]?.from}`);

ok('a caption that was never stretched still only reaches its own shot',
  cutFrom({ pieces: [oneShot('x', 'solo'), oneShot('y')] })
    .scenes[1]?.captions === undefined,
  'every film already made would otherwise grow its captions to the end on'
  + ' the day this shipped');

ok('which caption is up is asked of the film, not of a piece',
  captionAt(trio, 6)?.id === 'a' && captionAt(trio, 11)?.id === 'c'
  && captionAt(trio, 9.5) === null,
  'at six seconds the playhead is over the SECOND shot and the words are the'
  + ' first shot\u2019s — the case the preview used to draw nothing for');

if (bad) {
  console.error(`\ncheck:cutspan — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:cutspan — two lines take a span out, everything after it closes up,'
  + ' the lines stick to every cut in the film, and the song follows or does not,'
  + ' on her choice.',
);
