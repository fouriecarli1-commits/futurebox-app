/**
 * The two red lines, and taking what is between them out.
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
 * Four things. Two lines, a split where the playhead is, the film closing up
 * behind a cut, and the magnet and interlock from the Pro Booth.
 *
 * ── Why the gap closing needs no code, and what does ──────────────────────
 *
 * The pieces in this room are laid end to end: a piece's start is the sum of
 * the lengths before it, which is what `startsAt` computes. There is no such
 * thing as a gap in the picture, so taking a span out closes it by
 * construction and everything after really does jump back.
 *
 * What does NOT close by itself is the song underneath. It is one track played
 * from `underFrom` straight through, so a shot that used to sit at twenty
 * seconds and now sits at fifteen hears different music. THAT is what the
 * interlock is for here, and it is the same idea as the booth's — see `link`
 * in `session.ts`: things that are locked together move together.
 *
 *   · Interlock ON — the song loses the same span, so every shot keeps the
 *     music it was cut to. The film and the track stay in step.
 *   · Interlock OFF — the song plays straight through and the film is simply
 *     shorter against it. Which is what you want when the music is a bed
 *     rather than something the cuts were made to.
 *
 * ── Why the magnet matters more here than in the booth ───────────────────
 *
 * In the booth a magnet saves you from a clip starting a frame late. Here the
 * two lines decide what is DELETED, and a line that lands two frames inside
 * the next shot takes two frames of it with the span — which shows up as a
 * flash in the finished film, after the cut, when it is expensive to find.
 *
 * So the points are every piece boundary, the playhead, and the two ends of
 * the film. `pullTo` in `magnet.ts` already does the arithmetic and does it
 * the way she has already approved; this only says what the points are.
 */

import { type Sticky } from './magnet';

/** A span of the film, in seconds on the film's own clock. */
export interface Span {
  readonly from: number;
  readonly to: number;
}

/**
 * The shortest span worth cutting.
 *
 * A hair under a frame at 24fps. Below this the two lines are on top of each
 * other and "cut" would remove nothing while still filing a history step,
 * which is a button that looks broken.
 */
export const SHORTEST_SPAN = 0.04;

/** Both lines down, the right way round, and far enough apart to mean anything. */
export function spanReady(span: Span | null | undefined): span is Span {
  if (!span) return false;
  if (!Number.isFinite(span.from) || !Number.isFinite(span.to)) return false;
  return span.to - span.from >= SHORTEST_SPAN;
}

/**
 * The span with its ends the right way round.
 *
 * Dragging the out-line to the left of the in-line is a thing people do, and
 * refusing it would mean a line that stops moving when it reaches the other
 * one. They swap instead, which is what every editor does and what a hand
 * expects.
 */
export function tidy(a: number, b: number): Span {
  return a <= b ? { from: a, to: b } : { from: b, to: a };
}

/**
 * What the two lines and the playhead can stick to.
 *
 * Every piece boundary — which is every cut in the film — plus nought, the
 * end, and the playhead. Deduplicated, because a boundary is the end of one
 * piece and the start of the next, and two points at the same second make
 * `pullTo` compare a number with itself.
 */
export function pointsOf(
  starts: readonly number[],
  total: number,
  head: number,
): readonly Sticky[] {
  const seen = new Set<number>();
  const points: Sticky[] = [];
  const add = (at: number, what: Sticky['what']): void => {
    if (!Number.isFinite(at) || at < 0 || at > total) return;
    const key = Math.round(at * 1000);
    if (seen.has(key)) return;
    seen.add(key);
    points.push({ at, what });
  };
  add(head, 'head');
  for (const one of starts) add(one, 'clip');
  add(0, 'clip');
  add(total, 'clip');
  return points;
}

/**
 * Where the song has to skip, so the picture keeps its music.
 *
 * ── The part that is easy to get wrong ───────────────────────────────────
 *
 * A cut is made in the film's CURRENT clock, and the song runs on the
 * ORIGINAL one. Cut five seconds out at ten, then five more at ten again: the
 * second cut is at ten on a film that has already lost five, so in the song it
 * is at fifteen. Recording both as "ten" would take the same five seconds out
 * of the music twice and leave the second half of the film a cut behind.
 *
 * So a new skip is pushed forward by every skip already recorded that starts
 * at or before it. The list is kept sorted and in song time, which is the only
 * clock the renderer has.
 */
export function withSkip(
  already: readonly Span[],
  cut: Span,
): readonly Span[] {
  let shift = 0;
  for (const one of already) {
    if (one.from <= cut.from + shift) shift += one.to - one.from;
  }
  const moved: Span = { from: cut.from + shift, to: cut.to + shift };
  return [...already, moved].sort((a, b) => a.from - b.from);
}

/**
 * The song's surviving stretches, in song time, for a given length.
 *
 * The renderer schedules one source per stretch rather than one for the whole
 * track, which is how a skip is actually heard. Returned as {at, from, long}:
 * `at` is when it starts on the FILM's clock, `from` where to start in the
 * song, and `long` how much to play.
 */
export function stretches(
  skips: readonly Span[],
  startAt: number,
  filmLong: number,
): readonly { at: number; from: number; long: number }[] {
  const out: { at: number; from: number; long: number }[] = [];
  let film = 0;
  let song = Math.max(0, startAt);
  const sorted = [...skips].sort((a, b) => a.from - b.from);
  for (const skip of sorted) {
    if (skip.from < song) continue;
    const long = Math.min(skip.from - song, filmLong - film);
    if (long > 0) out.push({ at: film, from: song, long });
    film += Math.max(0, long);
    song = skip.to;
    if (film >= filmLong) return out;
  }
  if (film < filmLong) out.push({ at: film, from: song, long: filmLong - film });
  return out;
}

/**
 * Where a caption sits inside its own piece, with both ends filled in.
 *
 * Carli, 4 October 2026: *"Video editor se teks moet ook sy eie tydlyn hê. Dit
 * moet bo op die video tydlyn kom en dan ook gedrag kan word om die lengte van
 * die teks oor die video te bepaal."*
 *
 * The lane has to draw a block for every caption, including the ones typed
 * before this existed and never timed — and those have no numbers on them.
 * Absent means "the whole piece", so this fills that in rather than making
 * every caller write the same two `??`s and one of them forget.
 */
export function wordsSpan(
  piece: { readonly wordsFrom?: number; readonly wordsTo?: number },
  pieceLong: number,
  /**
   * How far past its own piece this caption may run, in seconds from the
   * piece's start.
   *
   * Carli, 5 October 2026: *"Dit wil wel nie verby een video stretch nie. As
   * hy op sy eie tydlyn is moet hy ruimte hê om verby 'n ander video te kan
   * stretch."*
   *
   * She is right, and the old ceiling was not a decision anybody made — the
   * caption was clamped to its own piece because the piece was the only thing
   * it knew about. A lane of its own is only a lane if something on it can
   * cross a cut.
   *
   * The default is the piece, so every caller that has not been taught about
   * the film behaves as it did. `wordsReach` in `videoedit.ts` works out the
   * real one: up to where the NEXT caption starts, and no further, because a
   * single lane with two things on the same second is not a lane.
   */
  reach: number = pieceLong,
): Span {
  const roof = Math.max(pieceLong, reach);
  /* The START still has to be inside its own piece. A caption belongs to the
     shot it comes up on — that is what keeps it with the shot when the shot is
     moved or something in front of it is cut — and one that could begin before
     its own picture would belong to nothing. */
  const from = Math.max(0, Math.min(piece.wordsFrom ?? 0, pieceLong));
  const to = Math.max(from, Math.min(piece.wordsTo ?? pieceLong, roof));
  return { from, to };
}

/**
 * Is a caption up at `into` seconds into its own piece?
 *
 * ── Why this is a function and not two lines twice ───────────────────────
 *
 * Because it was two lines once, in `stitch.ts`, and NOWHERE in the room.
 *
 * Carli, 4 October 2026: *"al maak ek die teks kleiner dat dit nie oor die
 * hele video stuk strek nie, wys die teks steeds oor die hele video stuk."*
 *
 * She had dragged a caption's block in to half the clip and the room went on
 * showing the words over all of it. The export was right the whole time —
 * which is the worst shape this can take, because the only way to find out
 * what the film really does is to pay for it and watch it. The preview simply
 * drew the caption whenever there was one and never asked the clock.
 *
 * So the question lives here now and both of them ask it. A preview and a
 * renderer that each decide for themselves when words are up is two answers
 * to the same question, and this is what the second one costs.
 *
 * Both ends are optional and an absent end means that side is open —
 * `undefined` on both is "the whole shot", which is what a caption did before
 * it could be timed and is still right for one that was typed and not dragged.
 */
export const wordsUp = (
  ends: { readonly from?: number; readonly to?: number },
  into: number,
): boolean =>
  (ends.from === undefined || into >= ends.from)
  && (ends.to === undefined || into <= ends.to);

/**
 * The shortest a caption can be dragged to.
 *
 * Half a second, not a frame. A caption is something somebody has to READ, and
 * a word on the screen for two frames is a flicker — the limit here is the eye
 * rather than the encoder, which is why it is not `SHORTEST_SPAN`.
 */
export const SHORTEST_WORDS = 0.5;

/**
 * A caption's ends: it starts inside its own piece, and may run on as far as
 * `reach` lets it.
 *
 * The two ends are clamped against different ceilings on purpose. The start is
 * held inside the piece, so a caption always belongs to the shot it comes up
 * on. The end is held at `reach` — the start of the next caption, or the end
 * of the film — so one caption can run over the shots that follow without ever
 * landing on top of another.
 */
export function heldWords(
  from: number,
  to: number,
  pieceLong: number,
  reach: number = pieceLong,
): Span {
  const roof = Math.max(pieceLong, reach);
  const a = Math.max(0, Math.min(from, Math.max(0, pieceLong - SHORTEST_WORDS)));
  const b = Math.min(roof, Math.max(to, a + SHORTEST_WORDS));
  return { from: a, to: b };
}

/**
 * A caption slid along its own shot, keeping its length.
 *
 * ── Why this is here and not inside the drag handler ─────────────────────
 *
 * It was inside it, and it had the bug Carli reported on 4 October: *"Al haal
 * ek die magnet af spring die teks nogsteeds rond asof die magnet aan is."*
 * The displacement was applied to the span read from the LIVE piece on every
 * pointermove, while the distance was measured from the pointer's original
 * grab — so each move added the whole distance again to an already-moved
 * block, and it accelerated away in growing jumps.
 *
 * The fix is one word: the origin is the span at the START of the gesture. The
 * reason it is a function now is that the browser probe could not prove it. The
 * fixture clip is 2.4 seconds long, so a runaway hits the end of the shot
 * within one move and lands exactly where a correct drag lands — the clamp
 * hides the fault. Reinstating the bug left the probe green, which is the only
 * honest reason to move a rule somewhere it can be given a sixty-second shot
 * and no clamp at all.
 *
 * `began` is where the caption was when the finger went down. `by` is how far
 * the finger has travelled since, in seconds. Neither is read from anything
 * that moves while the gesture runs.
 */
export function slidWords(
  began: Span,
  by: number,
  pieceLong: number,
  reach: number = pieceLong,
): Span {
  const roof = Math.max(pieceLong, reach);
  const wide = Math.max(0, began.to - began.from);
  /* Against two ceilings, as `heldWords` is: the start may not leave the
     piece, and the end may not pass what the film leaves it. A caption longer
     than its own shot would otherwise be pinned at nought and could not be
     moved at all. */
  const want = Math.max(0, Math.min(began.from + by, Math.min(pieceLong, roof - wide)));
  return heldWords(want, want + wide, pieceLong, roof);
}
