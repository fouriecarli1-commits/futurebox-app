/**
 * Where a song actually changes.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Kan die studio ook nie 'n drag funksie hê, wat
 * ook natuurlike oorgange detect"*.
 *
 * The studio draws a song as blocks, and until now it got those blocks from
 * the composition plan the song was built from: the app told the music service
 * the verse was 72 seconds and the chorus 36, so it knew where every section
 * started without listening to anything. That is exact when it is right and
 * it is wrong in two situations, both common:
 *
 * **A song nobody here planned.** An upload, a track off the channel, anything
 * made before the plan was carried. No plan, so no blocks, so the studio shows
 * one undivided bar and the drag handles have nothing to snap to.
 *
 * **A plan the engine did not honour.** The plan is a request, not a
 * guarantee. Ask for 72 and the engine returns what the music wanted; the
 * blocks then sit a second or two off the music all the way down the song, and
 * every section a person jumps to starts in the wrong place. Nothing in the
 * app could see that, because the only thing it compared the plan against was
 * the plan.
 *
 * ── What it measures ─────────────────────────────────────────────────────
 *
 * One vector per frame, of two kinds at once:
 *
 *   - **where the energy is**, in octave-wide bands. A chorus is not the same
 *     shape as a verse: drums come in, the bass changes, the top opens up.
 *   - **which notes are sounding**, as the twelve pitch classes. A bridge
 *     usually goes somewhere harmonically even when it is the same loudness.
 *
 * Then, for each frame, how different the half-second after it is from the
 * half-second before it — cosine distance between the two averaged vectors.
 * That curve is small in the middle of a section and spikes where the music
 * turns over. The spikes are the transitions.
 *
 * ── Why a window either side rather than frame-to-frame ──────────────────
 *
 * Frame-to-frame difference is an onset detector: it fires on every snare. A
 * section boundary is not a loud moment, it is the moment either side of which
 * the music is *different*, and the only way to measure that is to compare
 * stretches. Half a second each way is long enough to average a bar's worth of
 * drums out and short enough to put the answer within a beat of the truth.
 *
 * ── What it does not claim ───────────────────────────────────────────────
 *
 * It finds where the music changes. It does not know a chorus from a verse,
 * and it never names a block. Naming is the plan's job or the person's; a
 * detector that guessed "chorus" would be wrong often and confidently, and
 * `check:oorgange` holds it to finding the *places* only.
 *
 * It also refuses rather than guesses. A song with nothing in it, a song too
 * short to hold a window either side, a flat drone — all of those answer with
 * an empty list, and the studio then says it could not hear the sections
 * rather than drawing invented ones.
 */

import { fft } from './listen';

/** The frame step, in seconds. Ten frames a second is a beat at 600 BPM. */
export const FRAME = 0.1;

/**
 * How far either side of a frame is compared, in seconds.
 *
 * Half a second averages a bar of drums at anything above 120 BPM and keeps
 * the answer inside a beat. Longer smears a boundary; shorter turns the curve
 * back into an onset detector.
 */
export const EITHER_SIDE = 0.5;

/**
 * How close two transitions may be before they are the same one, in seconds.
 *
 * A real boundary spikes across several frames, and the point is one answer
 * per boundary. Two seconds is shorter than any section anybody writes and
 * longer than the spread of one spike.
 */
export const APART = 2;

/** Nothing shorter than this can hold a window either side of a frame. */
export const SHORTEST = EITHER_SIDE * 4;

/**
 * The size of the window each frame's spectrum is taken over.
 *
 * A power of two, because the FFT is radix-2, and 2048 is about 46 ms at
 * 44 100 — long enough to resolve the bass, short enough not to average two
 * chords together.
 */
const WINDOW = 2048;

/** The band edges, in Hz: roughly an octave each, from the bass to the air. */
const BANDS = [0, 120, 250, 500, 1000, 2000, 4000, 8000, 22050];

/**
 * One frame's shape: where the energy is, and which notes are sounding.
 *
 * The two halves are scaled separately so that neither can drown the other —
 * the band energies of a loud chorus are numerically enormous beside twelve
 * pitch weights, and un-normalised the chroma would contribute nothing.
 */
function shapeOf(samples: Float32Array, at: number, rate: number): Float32Array {
  const real = new Float32Array(WINDOW);
  const imag = new Float32Array(WINDOW);
  for (let i = 0; i < WINDOW; i += 1) {
    const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (WINDOW - 1));
    real[i] = (samples[at + i] ?? 0) * hann;
  }
  fft(real, imag);

  const bands = new Float32Array(BANDS.length - 1);
  const chroma = new Float32Array(12);
  for (let bin = 1; bin < WINDOW / 2; bin += 1) {
    const hz = (bin * rate) / WINDOW;
    const power = real[bin] * real[bin] + imag[bin] * imag[bin];
    for (let band = 0; band < bands.length; band += 1) {
      if (hz >= BANDS[band] && hz < BANDS[band + 1]) {
        bands[band] += power;
        break;
      }
    }
    if (hz >= 55 && hz <= 2000) {
      const note = Math.round(12 * Math.log2(hz / 440) + 69) % 12;
      chroma[(note + 12) % 12] += power;
    }
  }

  const out = new Float32Array(bands.length + 12);
  /* Log, because loudness is logarithmic and a linear band energy makes every
     frame of a loud passage look alike. */
  for (let i = 0; i < bands.length; i += 1) out[i] = Math.log1p(bands[i]);
  const mostChroma = Math.max(...chroma) || 1;
  for (let i = 0; i < 12; i += 1) out[bands.length + i] = chroma[i] / mostChroma;
  return out;
}

/** Cosine distance, 0 for the same shape and 1 for nothing in common. */
function apart(one: Float32Array, two: Float32Array): number {
  let dot = 0;
  let oneSize = 0;
  let twoSize = 0;
  for (let i = 0; i < one.length; i += 1) {
    dot += one[i] * two[i];
    oneSize += one[i] * one[i];
    twoSize += two[i] * two[i];
  }
  const size = Math.sqrt(oneSize) * Math.sqrt(twoSize);
  if (size <= 0) return 0;
  return 1 - dot / size;
}

/**
 * How much the music changes at every frame, as a curve.
 *
 * Exported because the studio draws it under the blocks: a person dragging a
 * handle can see where the music turns over, which is a better explanation of
 * why a handle snapped where it did than any sentence.
 */
export function noveltyOf(samples: Float32Array, rate: number): Float32Array {
  const hop = Math.max(1, Math.round(FRAME * rate));
  const frames = Math.floor((samples.length - WINDOW) / hop);
  if (frames <= 0) return new Float32Array(0);

  const shapes: Float32Array[] = [];
  for (let f = 0; f < frames; f += 1) shapes.push(shapeOf(samples, f * hop, rate));

  const reach = Math.max(1, Math.round(EITHER_SIDE / FRAME));
  const out = new Float32Array(frames);
  const mean = (from: number, to: number): Float32Array => {
    const sum = new Float32Array(shapes[0].length);
    for (let f = from; f < to; f += 1) {
      for (let i = 0; i < sum.length; i += 1) sum[i] += shapes[f][i];
    }
    const count = Math.max(1, to - from);
    for (let i = 0; i < sum.length; i += 1) sum[i] /= count;
    return sum;
  };

  for (let f = reach; f < frames - reach; f += 1) {
    out[f] = apart(mean(f - reach, f), mean(f, f + reach));
  }
  return out;
}

/**
 * The smallest cosine distance that counts as the music having changed.
 *
 * Measured rather than chosen. On a chord that does not change, the curve's
 * own noise tops out around 3.6e-4; the weakest real boundary any of
 * `check:oorgange`'s signals produces is 1.1e-2 — a change of chord, a change
 * of level, a chorus coming in. Thirty times apart, so this sits between them
 * with room on both sides.
 *
 * It is a floor and not the threshold. The threshold is whichever is higher,
 * this or the song's own noise (below), because this number is what stops a
 * clean drone answering with a list and the song's own noise is what works on
 * real music, where a vibrato and a hi-hat are a long way above 3.6e-4.
 */
const CHANGED = 2e-3;

/**
 * Where the song changes, in seconds from the start.
 *
 * ── The threshold, and why it is two numbers ────────────────────────────
 *
 * A quiet acoustic track and a loud dance track have curves an order of
 * magnitude apart, so a single fixed number would find every boundary in one
 * and none in the other. And a number read purely off the song cannot tell a
 * song with no sections from a song with four, because the noise it measures
 * itself against is all it has. So it is both: `CHANGED`, which is where a
 * change stops being noise at all, and the song's own typical frame plus a
 * multiple of its own spread. The higher of the two wins.
 *
 * ── Median and deviation, not mean and standard deviation ───────────────
 *
 * The mean and the standard deviation are computed from the whole curve,
 * spikes included, so a song with two clear boundaries pulls its own
 * threshold up above the quieter of them and reports one. That is exactly
 * what happened: a three-part signal with changes at 6s and 12s answered 12s
 * alone, and the boundary it dropped was a real change of chord. The median
 * and the median absolute deviation describe the middle of a section and are
 * untroubled by how big the spikes are, which is the whole point.
 *
 * `most` is a ceiling, not a target. Asking for eight and being given three is
 * the detector saying there are three; padding the list out to eight is how a
 * feature like this starts lying.
 */
export function transitionsIn(
  samples: Float32Array,
  rate: number,
  { most = 12, sureness = 12 }: { most?: number; sureness?: number } = {},
): number[] {
  if (!Number.isFinite(rate) || rate <= 0) return [];
  if (samples.length / rate < SHORTEST) return [];

  const curve = noveltyOf(samples, rate);
  if (curve.length === 0) return [];

  const reach = Math.max(1, Math.round(EITHER_SIDE / FRAME));
  const live = Array.from(curve).slice(reach, curve.length - reach);
  if (live.length === 0) return [];

  const middle = (of: readonly number[]): number => {
    const sorted = [...of].sort((one, two) => one - two);
    return sorted[Math.floor(sorted.length / 2)];
  };
  const median = middle(live);
  const deviation = middle(live.map((one) => Math.abs(one - median)));
  const floor = Math.max(CHANGED, median + sureness * deviation);

  /* Peaks only: a frame higher than both its neighbours and above the floor.
     Then the strongest first, so that `most` keeps the clearest boundaries
     rather than the earliest ones. */
  const peaks: { at: number; height: number }[] = [];
  for (let f = reach + 1; f < curve.length - reach - 1; f += 1) {
    if (curve[f] < floor) continue;
    if (curve[f] <= curve[f - 1] || curve[f] < curve[f + 1]) continue;
    peaks.push({ at: f * FRAME, height: curve[f] });
  }
  peaks.sort((one, two) => two.height - one.height);

  const kept: number[] = [];
  for (const peak of peaks) {
    if (kept.length >= most) break;
    if (kept.some((one) => Math.abs(one - peak.at) < APART)) continue;
    kept.push(peak.at);
  }
  return kept.sort((one, two) => one - two);
}

/**
 * The nearest transition to a dragged handle, or the handle itself.
 *
 * This is the whole of "drag, and it lands on the music". `within` is how far
 * a handle may be pulled before it stops snapping: close enough and the music
 * wins, far enough and the person does. A snap with no escape from it is a
 * control somebody cannot use, which is why this returns the asked-for second
 * unchanged rather than the nearest boundary at any distance.
 */
export function snapTo(seconds: number, transitions: readonly number[], within = 0.6): number {
  if (!Number.isFinite(seconds)) return seconds;
  let best = seconds;
  let bestGap = within;
  for (const one of transitions) {
    const gap = Math.abs(one - seconds);
    if (gap <= bestGap) {
      bestGap = gap;
      best = one;
    }
  }
  return best;
}

/**
 * The sections a list of transitions cuts a song into, as `from`/`to` windows.
 *
 * Unnamed on purpose. See the file header: the detector finds places, and
 * calling one of them a chorus would be a guess wearing a label.
 */
export function windowsFrom(transitions: readonly number[], seconds: number): { from: number; to: number }[] {
  if (!Number.isFinite(seconds) || seconds <= 0) return [];
  const edges = [0, ...transitions.filter((one) => one > 0 && one < seconds), seconds]
    .sort((one, two) => one - two);
  const out: { from: number; to: number }[] = [];
  for (let i = 0; i + 1 < edges.length; i += 1) {
    if (edges[i + 1] - edges[i] <= 0) continue;
    out.push({ from: edges[i], to: edges[i + 1] });
  }
  return out;
}
