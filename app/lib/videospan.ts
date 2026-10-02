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
