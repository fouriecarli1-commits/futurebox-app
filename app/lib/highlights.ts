/**
 * The best moments of a long shot, found by its sound, laid down as a reel.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * The owner, 16 October 2026, a clipper open on her phone: *"Let AI instantly
 * find and arrange your best moments."* Planned on the 17th as the one tool
 * from that list that needs nobody else's computer: the hooks room already
 * finds a moment in a video by where something arrives in its sound, and
 * this is the same reading done several times over one shot and put on the
 * clock as pieces she can still trim, move and take out.
 *
 * ── How a moment is chosen ───────────────────────────────────────────────
 *
 * Loudness in tenths of a second. A window scores for being full and,
 * more, for rising out of what came before — a laugh, a cheer, the beat
 * coming in, somebody starting to talk. The best windows are taken one at a
 * time, each kept clear of the ones already taken, until the reel is as long
 * as she asked for. Then each edge is moved to the quietest tenth near it, so
 * a cut lands on a breath rather than through a word, and the moments are put
 * back in the order they happened: a highlight reel tells the story forwards.
 *
 * A shot with no sound to read is not refused: its moments are spread evenly
 * across it, and the room says so, so nobody mistakes an even spread for a
 * choice.
 *
 * Pure arithmetic on numbers — `check:highlights` drives it without a browser.
 */
import type { Edit, Piece } from './videoedit';

/** Seconds per loudness reading. The hooks room reads at the same rate. */
export const TENTH = 0.1;

/** How long a reel can be asked to be, in seconds. */
export const REEL_LENGTHS = [15, 30, 60] as const;

export interface Moment {
  /** Where in the shot's own material, in seconds. */
  readonly from: number;
  readonly to: number;
  /** 0–1: how strongly it stood out, for the strip's little bar. */
  readonly score: number;
}

/** Loudness over time, one reading per `TENTH`, from a channel's samples. */
export function loudness(samples: Float32Array, rate: number): Float32Array {
  const per = Math.max(1, Math.floor(rate * TENTH));
  const count = Math.floor(samples.length / per);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    let sum = 0;
    for (let j = 0; j < per; j += 1) {
      const s = samples[i * per + j];
      sum += s * s;
    }
    out[i] = Math.sqrt(sum / per);
  }
  return out;
}

/** How long each moment is, for a reel of `seconds`: short reels cut quicker. */
export function momentLength(seconds: number): number {
  return seconds <= 15 ? 3 : seconds <= 30 ? 4 : 5;
}

/**
 * The best moments between `from` and `to` of a shot whose loudness is
 * `envelope` (readings from the start of the material), adding up to about
 * `seconds`, in the order they happen.
 */
export function bestMoments(envelope: Float32Array, from: number, to: number, seconds: number): Moment[] {
  const span = to - from;
  if (!(span > 0) || !(seconds > 0)) return [];
  /* Asked for more than there is: the whole shot is the reel. */
  if (span <= seconds) return [{ from, to, score: 1 }];
  const each = Math.min(momentLength(seconds), span);
  const count = Math.max(1, Math.round(seconds / each));
  const first = Math.max(0, Math.round(from / TENTH));
  const last = Math.min(envelope.length, Math.round(to / TENTH));
  const loudest = last > first ? Math.max(...Array.from(envelope.subarray(first, last))) : 0;
  if (!(loudest > 0)) return evenly(from, to, each, count);

  const width = Math.max(1, Math.round(each / TENTH));
  const back = Math.round(2 / TENTH);
  const scored: { at: number; score: number }[] = [];
  for (let start = first; start + width <= last; start += 1) {
    let full = 0;
    for (let i = start; i < start + width; i += 1) full += envelope[i];
    full /= width * loudest;
    let before = 0;
    let seen = 0;
    for (let i = Math.max(first, start - back); i < start; i += 1) { before += envelope[i]; seen += 1; }
    before = seen ? before / seen / loudest : 0;
    /* How loud its first half second is. Without it, every window that holds
       the whole of a moment scores the same, the earliest wins the tie, and
       a reel opens a second of nothing before each moment. */
    let opening = 0;
    const head = Math.min(width, Math.round(0.5 / TENTH));
    for (let i = start; i < start + head; i += 1) opening += envelope[i];
    opening /= head * loudest;
    scored.push({ at: start, score: full * 0.6 + Math.max(0, full - before) * 1.4 + opening * 0.3 });
  }
  scored.sort((a, b) => b.score - a.score || a.at - b.at);

  /* Taken best first, each kept a breath clear of the ones already taken. */
  const gap = Math.round(0.5 / TENTH);
  const taken: { at: number; score: number }[] = [];
  for (const one of scored) {
    if (taken.length >= count) break;
    if (taken.some((t) => one.at < t.at + width + gap && t.at < one.at + width + gap)) continue;
    taken.push(one);
  }
  const top = taken[0]?.score || 1;
  taken.sort((a, b) => a.at - b.at);
  /* The edges moved to the quietest tenth within half a second, never into a
     neighbour and never outside the shot. */
  const out: Moment[] = [];
  let floor = first;
  taken.forEach((one, k) => {
    const hi = k < taken.length - 1 ? taken[k + 1].at : last;
    /* The breath just before it: the quietest tenth in the half second
       before the window, the latest of equals, so the cut lands as close
       to the moment as the quiet allows. */
    const start = quietest(envelope, Math.max(floor, one.at - 5), one.at, true);
    const end = Math.max(start + 10, quietest(envelope, Math.max(start + 10, one.at + width - 2), Math.min(hi, one.at + width + 5)));
    floor = end;
    out.push({
      from: round(Math.max(from, start * TENTH)),
      to: round(Math.min(to, end * TENTH)),
      score: Math.max(0, Math.min(1, one.score / top)),
    });
  });
  return out;
}

/** Moments spread evenly across a shot with no sound to read. */
export function evenly(from: number, to: number, each: number, count: number): Moment[] {
  const span = to - from;
  const n = Math.max(1, Math.min(count, Math.floor(span / each)));
  const step = span / n;
  return Array.from({ length: n }, (_, k) => {
    const start = from + step * k + (step - each) / 2;
    return { from: round(start), to: round(start + each), score: 0 };
  });
}

/** The reading with the least sound in `[lo, hi]`: the earliest of equals, or the latest when asked. */
function quietest(envelope: Float32Array, lo: number, hi: number, latest = false): number {
  if (hi <= lo) return lo;
  const a = Math.max(0, lo);
  const b = Math.min(envelope.length - 1, hi);
  let at = a;
  for (let i = a; i <= b; i += 1) if (latest ? envelope[i] <= envelope[at] : envelope[i] < envelope[at]) at = i;
  return at;
}

const round = (n: number): number => Math.round(n * 100) / 100;

/**
 * The shot `id` replaced by its moments: one piece each, in its place, with
 * every look, word and movement the shot had. An unknown id, or no moments,
 * leaves the edit alone.
 */
export function reel(edit: Edit, id: string, moments: readonly Moment[]): Edit {
  const piece = edit.pieces.find((one) => one.id === id);
  if (!piece || !moments.length) return edit;
  const pieces: Piece[] = moments.map((m, k) => ({ ...piece, id: `${id}-m${k + 1}`, from: m.from, to: m.to }));
  return { ...edit, pieces: edit.pieces.flatMap((one) => (one.id === id ? pieces : [one])) };
}
