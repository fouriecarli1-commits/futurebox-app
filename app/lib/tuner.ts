/**
 * The voice tuner: a sung line pulled onto the notes of the song's key.
 *
 * The owner, 20 October 2026, reading the effects desk: *"Ek sien die woorde
 * sê, die gate, vocoder ens. Is nog nie gebou nie. Kan ons werk maak
 * daarvan."* The gate and the vocoder are graphs of ordinary nodes and live in
 * `fx.ts`. A tuner is not: it has to hear the pitch before it can move it,
 * and no node does that. So it is a press, like "Clean with AI": the lane is
 * read, tuned here on the phone, and written back as the lane's sound — which
 * keeps the rule `fx.ts` is built on, that what you hear is what is in the
 * file, because after the press it IS the file. Undo puts the old sound back.
 * Nothing leaves the device and nothing is charged.
 *
 * ── How ──────────────────────────────────────────────────────────────────
 *
 * Hearing: YIN (de Cheveigné and Kawahara, 2002) on a copy of the voice at a
 * quarter of the rate, every ten milliseconds. A voice sits between 70 and
 * 1000 Hz, and a quarter of 44.1 kHz still holds that comfortably while
 * costing a sixteenth of the work.
 *
 * Moving: TD-PSOLA. The voice is cut into grains two periods long, one on
 * every cycle of the wave, and laid down again closer together to go up or
 * further apart to go down. The grains are taken from where they are in
 * time, so the line keeps its length and its words land where they did.
 * What is not sung — a breath, an "s" — is laid back exactly as it was.
 *
 * Pure: arrays in, arrays out, so `check:tuner` can hold it without a browser.
 */

export type TuneScale = 'chromatic' | 'major' | 'minor';

export interface TuneHow {
  /** The key's note, 0 for C to 11 for B. Ignored for `chromatic`. */
  readonly root: number;
  readonly scale: TuneScale;
  /** 0 leaves it alone, 1 puts every note exactly on. */
  readonly strength: number;
}

export const SCALE_STEPS: Readonly<Record<TuneScale, readonly number[]>> = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

export const TUNE_DEFAULT: TuneHow = { root: 0, scale: 'chromatic', strength: 0.8 };

const LOWEST = 70;
const HIGHEST = 1000;
/** How sure YIN has to be before a frame counts as sung. */
const SURE = 0.15;
/** Quieter than this and there is nothing to tune. */
const QUIET = 0.008;

/** The note a frequency is nearest, as a MIDI number with cents. */
export function midiOf(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

/** The note a sung pitch is pulled to, as a MIDI number. */
export function targetOf(midi: number, how: TuneHow): number {
  const steps = SCALE_STEPS[how.scale];
  const root = how.scale === 'chromatic' ? 0 : ((Math.round(how.root) % 12) + 12) % 12;
  let best = Math.round(midi);
  let gap = Infinity;
  for (let note = Math.floor(midi) - 2; note <= Math.ceil(midi) + 2; note += 1) {
    const degree = (((note - root) % 12) + 12) % 12;
    if (!steps.includes(degree)) continue;
    const away = Math.abs(note - midi);
    if (away < gap) {
      gap = away;
      best = note;
    }
  }
  const strength = Math.max(0, Math.min(1, how.strength));
  return midi + (best - midi) * strength;
}

/** One channel, the average of all of them. */
function monoOf(channels: readonly Float32Array[]): Float32Array {
  const length = channels[0]?.length ?? 0;
  const out = new Float32Array(length);
  for (const channel of channels) {
    for (let i = 0; i < length; i += 1) out[i] += channel[i] / channels.length;
  }
  return out;
}

/** A quarter-rate (or so) copy for hearing the pitch, averaged so it does not alias. */
function decimate(mono: Float32Array, step: number): Float32Array {
  const out = new Float32Array(Math.floor(mono.length / step));
  for (let i = 0; i < out.length; i += 1) {
    let sum = 0;
    for (let j = 0; j < step; j += 1) sum += mono[i * step + j];
    out[i] = sum / step;
  }
  return out;
}

/**
 * YIN on one frame: the period, in samples of `x`, or 0 when nothing is sung.
 * `size` samples are compared with themselves `tau` samples later.
 */
function yinAt(x: Float32Array, start: number, size: number, tauMin: number, tauMax: number): number {
  if (start + size + tauMax >= x.length) return 0;
  let power = 0;
  for (let j = 0; j < size; j += 1) power += x[start + j] * x[start + j];
  if (Math.sqrt(power / size) < QUIET) return 0;
  const d = new Float32Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau += 1) {
    let sum = 0;
    for (let j = 0; j < size; j += 1) {
      const diff = x[start + j] - x[start + j + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }
  /* Cumulative mean normalised difference: d(τ) against the mean of d up to τ. */
  let running = 0;
  const cmnd = new Float32Array(tauMax + 1);
  cmnd[0] = 1;
  for (let tau = 1; tau <= tauMax; tau += 1) {
    running += d[tau];
    cmnd[tau] = running > 0 ? (d[tau] * tau) / running : 1;
  }
  for (let tau = tauMin; tau < tauMax; tau += 1) {
    if (cmnd[tau] < SURE) {
      while (tau + 1 < tauMax && cmnd[tau + 1] < cmnd[tau]) tau += 1;
      /* A parabola through the dip and its neighbours, for a period finer
         than a whole sample — at a quarter rate a sample is a big step. */
      const a = cmnd[tau - 1];
      const b = cmnd[tau];
      const c = cmnd[tau + 1];
      const bend = a + c - 2 * b;
      return bend > 0 ? tau + (a - c) / (2 * bend) : tau;
    }
  }
  return 0;
}

export interface PitchTrack {
  /** Frequency per frame, 0 where nothing is sung. */
  readonly hz: Float32Array;
  /** Samples of the original between frames. */
  readonly hop: number;
}

/** What `trackPitch` needs to know before it starts, worked out once. */
function plan(channels: readonly Float32Array[], rate: number) {
  const mono = monoOf(channels);
  const step = Math.max(1, Math.round(rate / 11025));
  const low = decimate(mono, step);
  const lowRate = rate / step;
  const tauMin = Math.max(2, Math.floor(lowRate / HIGHEST));
  const tauMax = Math.ceil(lowRate / LOWEST);
  const size = Math.max(tauMax, Math.round(lowRate * 0.03));
  const lowHop = Math.max(1, Math.round(lowRate * 0.01));
  const frames = Math.max(0, Math.floor(low.length / lowHop));
  const raw = new Float32Array(frames);
  /* Centred on the frame, so frame f describes the sound at f hops. */
  const hear = (f: number): void => {
    const start = Math.max(0, f * lowHop - Math.round(size / 2));
    const period = yinAt(low, start, size, tauMin, tauMax);
    raw[f] = period > 0 ? lowRate / period : 0;
  };
  return { raw, frames, hear, hop: lowHop * step };
}

/** A median of five, so one frame that heard the octave does not jump. */
function steady(raw: Float32Array, frames: number, hop: number): PitchTrack {
  const hz = new Float32Array(frames);
  for (let f = 0; f < frames; f += 1) {
    const near: number[] = [];
    for (let k = f - 2; k <= f + 2; k += 1) if (k >= 0 && k < frames) near.push(raw[k]);
    near.sort((p, q) => p - q);
    hz[f] = raw[f] > 0 ? near[Math.floor(near.length / 2)] || raw[f] : 0;
  }
  return { hz, hop };
}

/** The pitch every ten milliseconds. */
export function trackPitch(channels: readonly Float32Array[], rate: number): PitchTrack {
  const { raw, frames, hear, hop } = plan(channels, rate);
  for (let f = 0; f < frames; f += 1) hear(f);
  return steady(raw, frames, hop);
}

/**
 * The same, a slice at a time, for a phone: three minutes of voice is a few
 * seconds of listening there, and a screen that freezes for them looks
 * broken. It gives the page back between slices and says how far it is.
 */
export async function trackPitchSoftly(
  channels: readonly Float32Array[],
  rate: number,
  onShare?: (share: number) => void,
): Promise<PitchTrack> {
  const { raw, frames, hear, hop } = plan(channels, rate);
  for (let f = 0; f < frames; f += 1) {
    hear(f);
    if (f % 400 === 399) {
      onShare?.(f / frames);
      await new Promise((go) => setTimeout(go, 0));
    }
  }
  onShare?.(1);
  return steady(raw, frames, hop);
}

/** The pitch of a whole stretch, for checks: the middle of the voiced frames. */
export function pitchOf(channels: readonly Float32Array[], rate: number): number {
  const { hz } = trackPitch(channels, rate);
  const sung = Array.from(hz).filter((one) => one > 0).sort((a, b) => a - b);
  return sung.length ? sung[Math.floor(sung.length / 2)] : 0;
}

/**
 * The voice, tuned. Same length, same number of channels.
 */
export function tune(
  channels: readonly Float32Array[],
  rate: number,
  how: TuneHow,
  /** Already heard, by `trackPitchSoftly`; heard here when not. */
  heard?: PitchTrack,
): Float32Array<ArrayBuffer>[] {
  const length = channels[0]?.length ?? 0;
  if (!length || how.strength <= 0) return channels.map((one) => new Float32Array(one));
  const { hz, hop } = heard ?? trackPitch(channels, rate);
  const frames = hz.length;

  /* How far each frame moves, smoothed so a note glides on rather than
     clicking from one ratio to the next. */
  const ratio = new Float32Array(frames).fill(1);
  let held = 1;
  for (let f = 0; f < frames; f += 1) {
    if (hz[f] <= 0) {
      held = 1;
      continue;
    }
    const midi = midiOf(hz[f]);
    const want = Math.pow(2, (targetOf(midi, how) - midi) / 12);
    held += (want - held) * 0.5;
    ratio[f] = held;
  }
  const frameAt = (sample: number): number => Math.min(frames - 1, Math.max(0, Math.round(sample / hop)));

  /* ── The marks: one on every cycle where it is sung, every 5 ms where not ── */
  const mono = monoOf(channels);
  const marks: { at: number; period: number; exact: number; ratio: number }[] = [];
  const quiet = Math.round(rate * 0.005);
  /** The loudest sample between two points. */
  const loudest = (from: number, to: number): number => {
    let at = from;
    let peak = -1;
    for (let i = Math.max(0, from); i < Math.min(length, to); i += 1) {
      const level = Math.abs(mono[i]);
      if (level > peak) {
        peak = level;
        at = i;
      }
    }
    return at;
  };
  let t = 0;
  let last = -1;
  while (t < length) {
    const f = frameAt(t);
    if (frames && hz[f] > 0) {
      const exact = Math.max(8, rate / hz[f]);
      const period = Math.round(exact);
      /* The first mark of a sung stretch on the loudest point of its first
         cycle; every one after it a period on, nudged only a little to the
         nearest peak. A wave with overtones has two or three peaks of almost
         the same height in a cycle, and searching the whole cycle each time
         hopped between them — the grains no longer came once a cycle and the
         voice came out an octave or two down. */
      const at = last < 0
        ? loudest(t, t + period)
        : loudest(last + period - Math.round(period * 0.1), last + period + Math.round(period * 0.1) + 1);
      marks.push({ at, period, exact, ratio: ratio[f] });
      last = at;
      t = at + period;
    } else {
      marks.push({ at: t, period: quiet, exact: quiet, ratio: 1 });
      last = -1;
      t += quiet;
    }
  }
  if (!marks.length) return channels.map((one) => new Float32Array(one));

  /* ── Laid back down: closer together to go up, further apart to go down ── */
  const outs = channels.map(() => new Float32Array(length));
  const weight = new Float32Array(length);
  let k = 0;
  let place = marks[0].at;
  while (place < length) {
    while (k + 1 < marks.length && Math.abs(marks[k + 1].at - place) <= Math.abs(marks[k].at - place)) k += 1;
    const mark = marks[k];
    const half = mark.period;
    for (let j = -half; j < half; j += 1) {
      const from = mark.at + j;
      const to = Math.round(place) + j;
      if (from < 0 || from >= length || to < 0 || to >= length) continue;
      const w = 0.5 - 0.5 * Math.cos((Math.PI * (j + half)) / half);
      for (let c = 0; c < channels.length; c += 1) outs[c][to] += channels[c][from] * w;
      weight[to] += w;
    }
    /* The exact period, not the whole samples the grain was cut to: laid at
       98 samples a 97.6-sample voice goes a few hertz flat on every note. */
    place += Math.max(1, mark.exact / Math.max(0.5, Math.min(2, mark.ratio)));
  }
  for (let i = 0; i < length; i += 1) {
    const w = Math.max(weight[i], 0.35);
    for (const out of outs) out[i] /= w;
  }
  return outs;
}
