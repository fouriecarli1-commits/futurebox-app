/**
 * Landing the cuts on the beat.
 *
 * ── Why this is the difference ───────────────────────────────────────────
 *
 * The board could already add, remove, reorder, prompt, trim, caption and
 * stitch. What it could not do is the one thing that separates a music video
 * from a slideshow with a song over it: cut on the beat. A cut that lands
 * half a beat late is not subtly worse, it reads as an accident, and no
 * amount of better shots fixes it.
 *
 * ── What it is built on ──────────────────────────────────────────────────
 *
 * Both halves already existed and are proven. `tempoOf` in `lib/listen.ts` is
 * real beat detection — `check:listen` puts a click track at a stated tempo
 * through it and holds it to the answer. And every scene the stitcher takes
 * already carries its own `from`/`to` window, because the trim handles needed
 * it. So this is arithmetic between two things that work, not a new capability.
 *
 * ── The honest part ──────────────────────────────────────────────────────
 *
 * Beat detection on a real song is not the same problem as a click track. The
 * usual failure is not noise, it is landing on half or double the tempo — 140
 * read as 70 — which produces cuts that are musical and twice as long as
 * intended. That is why the number is shown and can be typed over rather than
 * applied silently: the app is better at measuring than at being sure, and the
 * person can hear which one is right in a second.
 */

/** Nothing musical lives outside this, and a reading outside it is a bad reading. */
export const SLOWEST = 40;
export const FASTEST = 200;

export function sane(bpm: number): boolean {
  return Number.isFinite(bpm) && bpm >= SLOWEST && bpm <= FASTEST;
}

/** How long one beat lasts, in seconds. */
export function beatOf(bpm: number): number {
  return 60 / bpm;
}

export interface Window {
  /** Where the shot starts inside its clip. */
  readonly from?: number;
  /** Where it ends. Undefined means the end of the clip. */
  readonly to?: number;
}

/**
 * The window this shot should have so that it lasts a whole number of beats.
 *
 * `real` is how long the clip actually turned out to be, which is not always
 * what was asked for — an engine that returns 4.8 seconds for a 5-second
 * request is normal, and trimming past the end produces a frozen frame rather
 * than an error.
 *
 * Returns null when nothing should change: an unusable tempo, a clip too
 * short to hold a single beat, or a window that is already on the beat. A
 * null is what keeps this from rewriting trims it cannot improve.
 */
export function snapped(window: Window, real: number, bpm: number): Window | null {
  if (!sane(bpm) || !Number.isFinite(real) || real <= 0) return null;

  const beat = beatOf(bpm);
  const from = Math.max(0, Math.min(window.from ?? 0, real));
  const to = Math.max(from, Math.min(window.to ?? real, real));
  const want = to - from;

  /* A clip that cannot hold one beat is left alone. Snapping it would either
     take it to nothing or stretch it past its own end. */
  if (real - from < beat) return null;

  /* Rounded, not floored: a window 5.6 beats long is meant to be six, and
     flooring every one of them makes the whole film a beat short a shot.

     Then, if that runs past the end of the clip, down to the largest whole
     number of beats that fits — never clamped to the clip's own end, because
     a window clamped to 4.8 seconds is exactly the off-beat cut this exists
     to remove. The early return above guarantees at least one beat fits, so
     the floor below is always at least one. */
  const wanted = Math.max(1, Math.round(want / beat));
  const beats = from + wanted * beat > real ? Math.floor((real - from) / beat) : wanted;
  const ended = from + beats * beat;

  /* Already there. Compared with a tolerance rather than exactly, because
     these are floats and a redundant write would mark the board changed on
     every render. */
  if (Math.abs(ended - to) < 0.01) return null;

  return { from, to: ended };
}

/** How long the film runs once every shot is on the beat. */
export function runsFor(windows: readonly Window[], reals: readonly number[]): number {
  return windows.reduce((total, one, index) => {
    const real = reals[index] ?? 0;
    const from = one.from ?? 0;
    const to = one.to ?? real;
    return total + Math.max(0, to - from);
  }, 0);
}
