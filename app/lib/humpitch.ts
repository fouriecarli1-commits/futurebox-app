/**
 * The pitch of a hum, frame by frame, with how sure each reading is.
 *
 * ── Why this exists beside `lib/tune.ts` ─────────────────────────────────
 *
 * `pitchTrack` in `lib/tune.ts` was built for the voice tuner, which needs
 * the pitch of a note that is already being held. A hum asks something
 * harder: where the voice is at all, which octave it is in when the hum is
 * an "mmm" with almost no harmonics, and which of two readings is right when
 * they disagree by exactly an octave. A tracker that answers each frame on
 * its own gets those wrong one frame at a time, and a melody with one frame
 * an octave out is a melody with a wrong note in it.
 *
 * So this follows probabilistic YIN (Mauch and Dixon, 2014), which is the
 * method the research settled on for exactly this signal:
 *
 *   1. YIN's cumulative-mean-normalised difference for every frame, which
 *      is a dip at every lag the sound repeats at.
 *   2. Every dip is a CANDIDATE, not an answer. Each gets a probability by
 *      asking, over a spread of thresholds, "is this the first dip under
 *      the line?" — which is YIN's own octave rule (prefer the shortest
 *      period that repeats well) made soft instead of all-or-nothing.
 *   3. A Viterbi pass picks one candidate per frame, or "no pitch", so that
 *      the path is the one that is likely AND continuous. An octave jump for
 *      one frame costs more than it explains, so it is not taken.
 *
 * ── What is deliberately simpler than the paper ──────────────────────────
 *
 * The paper's hidden states are 480 pitch bins. Here they are the frame's
 * own candidates (at most five) plus "unvoiced", which is the same idea at a
 * hundredth of the work — enough to run on a phone over a two-minute hum in
 * well under a second. The threshold spread is a Beta(2, 18), the paper's
 * own middle choice.
 *
 * ── Why it runs at a quarter of the rate first ───────────────────────────
 *
 * A voice's fundamental is under 1.1 kHz, so the search runs on a copy
 * filtered and decimated to about 11 kHz: sixteen times less arithmetic.
 * Lag steps are coarse there, so the chosen candidate is measured again at
 * the full rate (`refine`), which is where the cents come from.
 *
 * Everything here fills arrays and calls nothing, so `check:humpitch` can
 * drive it on synthetic hums whose answers are known.
 */

import { HOP_S } from './tune';

/** The lowest note looked for: a low male hum sits around 80 Hz. */
export const LOW_HZ = 55;
/** The highest: a high soprano hum is under a kilohertz. */
export const HIGH_HZ = 1100;
/** The rate the search runs at, roughly. */
const WORK_HZ = 11_000;
/** Seconds of sound each frame compares against itself. */
const WINDOW_S = 0.03;
/** At most this many candidates are kept per frame. */
const MOST = 5;
/** Below this level a frame is silence and has no candidates at all. */
const QUIET = 0.004;

export interface PitchFrames {
  /** Hertz per frame, 0 where no pitch was chosen. */
  readonly hz: Float32Array;
  /** The same as a fractional MIDI number, NaN where no pitch was chosen. */
  readonly midi: Float32Array;
  /** How likely the chosen pitch is, 0–1. Zero where none was chosen. */
  readonly sure: Float32Array;
  /** Seconds between frames. */
  readonly hop: number;
}

export const midiOf = (hz: number): number => 69 + 12 * Math.log2(hz / 440);

/* ── The thresholds, and how much each is believed ──────────────────────

   Twenty lines from 0.025 to 0.5. A dip that is under the line at the
   strict thresholds is believed a lot; one that only gets under at the
   lenient end is believed a little. The weights are a Beta(2, 18), whose
   mean is 0.1 — YIN's own classic threshold. */
const LINES: readonly { at: number; weight: number }[] = (() => {
  const raw: { at: number; weight: number }[] = [];
  for (let i = 1; i <= 20; i += 1) {
    const at = i * 0.025;
    raw.push({ at, weight: at * (1 - at) ** 17 });
  }
  const total = raw.reduce((sum, one) => sum + one.weight, 0);
  return raw.map((one) => ({ at: one.at, weight: one.weight / total }));
})();

/**
 * A copy at roughly 11 kHz, low-passed properly on the way down.
 *
 * A windowed sinc rather than a block average: a hum's harmonics above the
 * new Nyquist would otherwise fold back as frequencies that are not
 * harmonics of anything, and those make false dips.
 */
export function decimate(samples: Float32Array, rate: number): { data: Float32Array; rate: number; factor: number } {
  const factor = Math.max(1, Math.floor(rate / WORK_HZ));
  if (factor === 1) return { data: samples, rate, factor };
  const cutoff = 0.42 / factor;
  const half = factor * 8;
  const taps = new Float32Array(half * 2 + 1);
  let total = 0;
  for (let i = 0; i < taps.length; i += 1) {
    const n = i - half;
    const sinc = n === 0 ? 2 * cutoff : Math.sin(2 * Math.PI * cutoff * n) / (Math.PI * n);
    const blackman = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (taps.length - 1))
      + 0.08 * Math.cos((4 * Math.PI * i) / (taps.length - 1));
    taps[i] = sinc * blackman;
    total += taps[i];
  }
  for (let i = 0; i < taps.length; i += 1) taps[i] /= total || 1;
  const out = new Float32Array(Math.floor(samples.length / factor));
  for (let i = 0; i < out.length; i += 1) {
    const centre = i * factor;
    let sum = 0;
    for (let j = 0; j < taps.length; j += 1) {
      const at = centre + j - half;
      if (at >= 0 && at < samples.length) sum += samples[at] * taps[j];
    }
    out[i] = sum;
  }
  return { data: out, rate: rate / factor, factor };
}

/** YIN's normalised difference at every lag up to `most`, for one frame. */
function difference(data: Float32Array, at: number, width: number, most: number, out: Float32Array): void {
  out[0] = 1;
  let running = 0;
  for (let lag = 1; lag <= most; lag += 1) {
    let sum = 0;
    for (let j = 0; j < width; j += 1) {
      const d = data[at + j] - data[at + j + lag];
      sum += d * d;
    }
    running += sum;
    out[lag] = running > 0 ? (sum * lag) / running : 1;
  }
}

interface Candidate {
  /** Lag at the work rate, interpolated between samples. */
  readonly lag: number;
  readonly p: number;
}

/**
 * The dips of one frame, each with how likely it is to be the period.
 *
 * pYIN's first stage: for each threshold, the first dip under it is the
 * answer at that threshold; a dip's probability is the summed weight of the
 * thresholds it answers. A frame with no dip under any line gives its best
 * dip a token chance, so a breathy note is not thrown away outright.
 */
function candidatesOf(cmnd: Float32Array, low: number, high: number): Candidate[] {
  const dips: { lag: number; depth: number }[] = [];
  for (let lag = Math.max(2, low); lag < high; lag += 1) {
    if (cmnd[lag] < cmnd[lag - 1] && cmnd[lag] <= cmnd[lag + 1] && cmnd[lag] < 0.6) {
      dips.push({ lag, depth: cmnd[lag] });
    }
  }
  if (!dips.length) return [];
  const p = new Float32Array(dips.length);
  for (const line of LINES) {
    const first = dips.findIndex((one) => one.depth < line.at);
    if (first >= 0) p[first] += line.weight;
  }
  let best = 0;
  for (let i = 1; i < dips.length; i += 1) if (dips[i].depth < dips[best].depth) best = i;
  if (p.every((one) => one === 0)) p[best] = 0.01;

  const out: Candidate[] = [];
  dips.forEach((one, i) => {
    if (p[i] <= 0) return;
    /* Where the dip really sits, between two samples. */
    const a = cmnd[one.lag - 1];
    const b = cmnd[one.lag];
    const c = cmnd[one.lag + 1];
    const bend = a - 2 * b + c;
    const shift = bend > 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / bend)) : 0;
    out.push({ lag: one.lag + shift, p: p[i] });
  });
  return out.sort((x, y) => y.p - x.p).slice(0, MOST);
}

/**
 * The chosen period measured again at the full rate.
 *
 * At 11 kHz one lag step near A4 is about 70 cents; at 44.1 kHz it is under
 * twenty, and the parabola through the minimum takes it to a cent or two.
 */
function refine(samples: Float32Array, rate: number, at: number, roughLag: number, factor: number): number {
  const centre = roughLag * factor;
  const low = Math.max(2, Math.floor(centre - factor - 1));
  const high = Math.ceil(centre + factor + 1);
  const width = Math.round(WINDOW_S * rate);
  if (at + width + high + 1 >= samples.length) return rate / centre;
  const d = new Float64Array(high + 2);
  let best = -1;
  for (let lag = low - 1; lag <= high + 1; lag += 1) {
    let sum = 0;
    for (let j = 0; j < width; j += 1) {
      const diff = samples[at + j] - samples[at + j + lag];
      sum += diff * diff;
    }
    d[lag] = sum;
    if (lag >= low && lag <= high && (best < 0 || sum < d[best])) best = lag;
  }
  if (best < 0) return rate / centre;
  const a = d[best - 1];
  const b = d[best];
  const c = d[best + 1];
  const bend = a - 2 * b + c;
  const shift = bend > 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / bend)) : 0;
  return rate / (best + shift);
}

/**
 * The pitch of every frame.
 *
 * Frames sit every `HOP_S` seconds, the same grid `humnotes.ts` measures the
 * loudness on, so one index reads both.
 */
export function trackHum(samples: Float32Array, rate: number): PitchFrames {
  const hopFull = Math.max(1, Math.round(HOP_S * rate));
  const frames = Math.max(0, Math.floor(samples.length / hopFull));
  const hz = new Float32Array(frames);
  const midi = new Float32Array(frames).fill(Number.NaN);
  const sure = new Float32Array(frames);
  if (!frames) return { hz, midi, sure, hop: HOP_S };

  const work = decimate(samples, rate);
  const width = Math.max(32, Math.round(WINDOW_S * work.rate));
  const low = Math.max(2, Math.floor(work.rate / HIGH_HZ));
  const high = Math.ceil(work.rate / LOW_HZ);
  const cmnd = new Float32Array(high + 2);

  /* Stage one: every frame's candidates. */
  const each: Candidate[][] = [];
  for (let i = 0; i < frames; i += 1) {
    const at = Math.floor((i * hopFull) / work.factor);
    if (at + width + high + 2 > work.data.length) { each.push([]); continue; }
    let power = 0;
    for (let j = 0; j < width + high; j += 1) power += work.data[at + j] * work.data[at + j];
    if (Math.sqrt(power / (width + high)) < QUIET) { each.push([]); continue; }
    difference(work.data, at, width, high + 1, cmnd);
    each.push(candidatesOf(cmnd, low, high));
  }

  /* Stage two: one path through them.

     States per frame: each candidate, and "unvoiced" last. Scores are logs
     so a long hum does not underflow. Moving between two pitches costs in
     proportion to the jump, and an octave costs extra: a real leap of an
     octave in a melody is rare and well supported by the frames either side
     of it, while an octave ERROR is one frame that the frames around it do
     not agree with. Going in or out of voice costs a fixed amount, so a
     single doubtful frame inside a note does not end the note. */
  const SWITCH = Math.log(0.02);
  const STAY = Math.log(0.98);
  const jump = (a: number, b: number): number => {
    const semis = Math.abs(midiOf(work.rate / a) - midiOf(work.rate / b));
    const octave = Math.abs(semis - 12) < 0.7 || Math.abs(semis - 24) < 0.7 ? 2.5 : 0;
    return -(0.35 * Math.min(semis, 14) + octave);
  };
  const scores: Float64Array[] = [];
  const from: Int16Array[] = [];
  for (let i = 0; i < frames; i += 1) {
    const here = each[i];
    const voiced = here.reduce((sum, one) => sum + one.p, 0);
    const n = here.length + 1;
    const score = new Float64Array(n);
    const back = new Int16Array(n);
    const emit = (k: number): number => (k < here.length
      ? Math.log(Math.max(1e-6, here[k].p))
      : Math.log(Math.max(1e-6, 1 - Math.min(0.999, voiced))));
    if (i === 0) {
      for (let k = 0; k < n; k += 1) score[k] = emit(k);
    } else {
      const was = each[i - 1];
      const prev = scores[i - 1];
      for (let k = 0; k < n; k += 1) {
        let best = -Infinity;
        let arg = 0;
        for (let q = 0; q < prev.length; q += 1) {
          const meVoiced = k < here.length;
          const themVoiced = q < was.length;
          let move: number;
          if (meVoiced && themVoiced) move = STAY + jump(here[k].lag, was[q].lag);
          else if (!meVoiced && !themVoiced) move = STAY;
          else move = SWITCH;
          const total = prev[q] + move;
          if (total > best) { best = total; arg = q; }
        }
        score[k] = best + emit(k);
        back[k] = arg;
      }
      /* Kept near zero so a long take never runs out of precision. */
      let top = -Infinity;
      for (let k = 0; k < n; k += 1) top = Math.max(top, score[k]);
      for (let k = 0; k < n; k += 1) score[k] -= top;
    }
    scores.push(score);
    from.push(back);
  }

  let state = 0;
  const last = scores[frames - 1];
  for (let k = 1; k < last.length; k += 1) if (last[k] > last[state]) state = k;
  for (let i = frames - 1; i >= 0; i -= 1) {
    const here = each[i];
    if (state < here.length) {
      const chosen = here[state];
      const exact = refine(samples, rate, i * hopFull, chosen.lag, work.factor);
      if (exact >= LOW_HZ * 0.9 && exact <= HIGH_HZ * 1.1) {
        hz[i] = exact;
        midi[i] = midiOf(exact);
        /* The chosen dip's own probability: near one when every threshold
           agreed on it, small when only the lenient ones did. */
        sure[i] = Math.min(1, chosen.p);
      }
    }
    if (i > 0) state = from[i][state];
  }

  return { hz, midi, sure, hop: HOP_S };
}

/**
 * A median over voiced frames only, `half` either side.
 *
 * Unvoiced frames are left unvoiced and are never averaged into a note: a
 * NaN in the middle of a median is not a low number, it is no reading.
 */
export function medianVoiced(midi: Float32Array, half: number): Float32Array {
  const out = new Float32Array(midi.length).fill(Number.NaN);
  const window: number[] = [];
  for (let i = 0; i < midi.length; i += 1) {
    if (!Number.isFinite(midi[i])) continue;
    window.length = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(midi.length - 1, i + half); j += 1) {
      if (Number.isFinite(midi[j])) window.push(midi[j]);
    }
    window.sort((a, b) => a - b);
    out[i] = window[window.length >> 1];
  }
  return out;
}
