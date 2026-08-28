'use client';

/**
 * How long a song actually took, last time.
 *
 * "Making your song" with no end in sight is the complaint this answers, and
 * the tempting fix — a made-up "about 45 seconds" — is the wrong one. The music
 * service publishes no estimate and does not stream progress, so any number the
 * app states before the fact can only come from one place: what happened here
 * before.
 *
 * So the app measures its own runs and quotes them back. The first time, it says
 * it has nothing to go on, which is true and is better than a confident guess
 * that turns out to be half the real wait. After that the estimate is a median
 * of real runs on this device, and it says so.
 */

const KEY = 'fb.timings.v1';
const KEEP = 12;

interface Run {
  /** How long the song was asked to be. Longer songs take longer to write. */
  readonly asked: number;
  /** How long the wait actually was, in seconds. */
  readonly took: number;
}

function read(): Run[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Run[]) : [];
    return Array.isArray(parsed)
      ? parsed.filter((run) => typeof run?.asked === 'number' && typeof run?.took === 'number')
      : [];
  } catch {
    return [];
  }
}

/** Call once a generation has finished, with what it really took. */
export function remember(asked: number, took: number): void {
  if (!Number.isFinite(took) || took <= 0) return;
  try {
    const runs = read().concat({ asked, took }).slice(-KEEP);
    localStorage.setItem(KEY, JSON.stringify(runs));
  } catch {
    // A lost measurement costs an estimate, nothing more.
  }
}

export interface Estimate {
  /** Seconds. The middle of what past runs took, not the best or worst. */
  readonly seconds: number;
  /** How many runs it is based on, so the page can say how sure it is. */
  readonly runs: number;
}

/**
 * What to expect for a song of this length, or null when nothing is known.
 *
 * Runs at the same length are preferred and everything else is a fallback,
 * scaled by how much longer the song is — a three-minute song plainly takes
 * longer to write than a thirty-second one, and pretending otherwise would make
 * the first long song feel broken.
 *
 * The median rather than the mean, because one run that timed out at five
 * minutes would otherwise poison the estimate for every run after it.
 */
export function expect(asked: number): Estimate | null {
  const runs = read();
  if (!runs.length) return null;

  const same = runs.filter((run) => run.asked === asked);
  if (same.length) return { seconds: median(same.map((run) => run.took)), runs: same.length };

  const scaled = runs.map((run) => (run.took * asked) / Math.max(1, run.asked));
  return { seconds: median(scaled), runs: runs.length };
}

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return Math.max(1, Math.round(value));
}
