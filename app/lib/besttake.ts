/**
 * Which pass of a looped take is the best one: scored on the device, for the
 * whole take or for one marked phrase.
 *
 * Loop recording leaves one lane per pass, and comping (`regionComp` in
 * ProBooth) builds the best take from them a phrase at a time, if you know
 * which pass was best. A singer listening back to five passes of the same
 * line cannot hear the difference after the third. This listens for them,
 * on four things an engineer listens for:
 *
 * - **in tune**: how much of the singing sits within 25 cents of a note in
 *   the song's key (any semitone when the key is unknown);
 * - **steady**: how little the pitch wobbles within a held note;
 * - **all there**: how much of the phrase was sung, against the pass that
 *   sang the most of it, so a late entry or a missed word costs;
 * - **not clipped**: how much of it hit the top.
 *
 * The weights are a judgement and are written down here so they can be
 * argued with. The scores are shown next to each pass, so the person can
 * still choose another one.
 */
import { pitchTrack, HOP_S } from './tune';

export interface PassReading {
  /** Seconds that had a pitch in them. */
  readonly voiced: number;
  /** Share of the voiced frames within 25 cents of an allowed note. 0–1. */
  readonly inTune: number;
  /** Average distance from the nearest allowed note, cents. */
  readonly cents: number;
  /** Median wobble between neighbouring frames of the same note, cents. */
  readonly wobble: number;
  /** Share of samples at the top. */
  readonly clipped: number;
}

export interface PassScore extends PassReading {
  readonly id: string;
  /** 0–100. */
  readonly score: number;
  /** Share of the most-sung pass's voicing that this one has. 0–1. */
  readonly filled: number;
}

export const IN_TUNE_CENTS = 25;
/** Under this much pitched sound in every pass, there is nothing to choose them by. */
export const MIN_SUNG_S = 0.3;
export const WEIGHTS = { inTune: 0.45, steady: 0.2, filled: 0.25, clean: 0.1 } as const;

/** What one pass sounds like. `scale` is the pitch classes allowed, 0 = C; null allows every semitone. */
export function readPass(samples: Float32Array, rate: number, scale: readonly number[] | null): PassReading {
  let clipped = 0;
  for (let i = 0; i < samples.length; i += 1) if (Math.abs(samples[i]) >= 0.99) clipped += 1;
  const hop = Math.max(1, Math.round(HOP_S * rate));
  const track = pitchTrack(samples, rate, hop);
  const allowed = scale && scale.length ? scale : Array.from({ length: 12 }, (_, i) => i);
  let voiced = 0;
  let near = 0;
  let total = 0;
  const steps: number[] = [];
  let last: number | null = null;
  for (let i = 0; i < track.hz.length; i += 1) {
    const hz = track.hz[i];
    if (!(hz > 60 && hz < 1200) || track.score[i] < 0.5) { last = null; continue; }
    voiced += 1;
    const midi = 69 + 12 * Math.log2(hz / 440);
    let best = Infinity;
    for (let note = Math.floor(midi) - 1; note <= Math.ceil(midi) + 1; note += 1) {
      if (!allowed.includes(((note % 12) + 12) % 12)) continue;
      best = Math.min(best, Math.abs(midi - note) * 100);
    }
    total += best;
    if (best <= IN_TUNE_CENTS) near += 1;
    if (last !== null) {
      const step = Math.abs(midi - last) * 100;
      if (step < 100) steps.push(step);
    }
    last = midi;
  }
  steps.sort((a, b) => a - b);
  return {
    voiced: (voiced * hop) / rate,
    inTune: voiced ? near / voiced : 0,
    cents: voiced ? total / voiced : 0,
    wobble: steps.length ? steps[Math.floor(steps.length / 2)] : 0,
    clipped: samples.length ? clipped / samples.length : 0,
  };
}

/** Every pass scored against the others, best first. */
export function rankPasses(readings: readonly { readonly id: string; readonly reading: PassReading }[]): PassScore[] {
  const most = Math.max(0, ...readings.map((one) => one.reading.voiced));
  return readings
    .map(({ id, reading }) => {
      const filled = most > 0 ? reading.voiced / most : 0;
      const steady = 1 - Math.min(1, reading.wobble / 40);
      const clean = 1 - Math.min(1, reading.clipped * 200);
      const score = Math.round(100 * (
        WEIGHTS.inTune * reading.inTune + WEIGHTS.steady * steady + WEIGHTS.filled * filled + WEIGHTS.clean * clean
      ));
      return { ...reading, id, filled, score };
    })
    .sort((a, b) => b.score - a.score);
}
