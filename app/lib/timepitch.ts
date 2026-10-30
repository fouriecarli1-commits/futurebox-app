/**
 * Time and pitch for any clip: faster or slower without changing its pitch,
 * higher or lower without changing its length, and read for its tempo and
 * key so it can be fitted to the session.
 *
 * The audit of 29 October 2026 against the studios every musician knows
 * found ProBooth could read a clip's tempo and set the SESSION to it, but
 * could not do the other half every one of them does: bend the clip to the
 * session. A loop at 96 brought into a song at 120 drifted off the grid by
 * the second bar, and a sample in A could not be moved to the song's C.
 *
 * `stretch.ts` already stretches a sung take, by cutting it at its own pitch
 * periods. That works for one voice and not for a loop with a chord and a
 * drum in it, which has no single period. This is WSOLA: the sound is cut
 * into overlapping windows, laid down at a different spacing, and each
 * window is slid a little until it lines up with the one before it, so the
 * waves join rather than cancel. Pitch is a stretch followed by a resample
 * back to the length it had: the stretch makes it longer, the resample makes
 * it short again and higher. Formants move with the pitch, as on a tape,
 * which is why the tool says so.
 *
 * Tempo is read from where the sound gets louder, as an autocorrelation of
 * those onsets; key from how much of each of the twelve notes is in it,
 * against the Krumhansl profiles. Both are estimates and are shown as such.
 */

/** How far one press may move a clip. */
export const MOST_SEMITONES = 12;
export const SLOWEST_SPEED = 0.5;
export const FASTEST_SPEED = 2;

export const clampSpeed = (speed: number): number =>
  Math.max(SLOWEST_SPEED, Math.min(FASTEST_SPEED, Number.isFinite(speed) && speed > 0 ? speed : 1));

/**
 * WSOLA: `channels` played `factor` times as long (2 is twice as long, half
 * the speed), pitch kept. The alignment is found on the first channel and
 * applied to every channel alike, so a stereo image stays where it was.
 */
export function stretched(channels: readonly Float32Array[], rate: number, factor: number): Float32Array[] {
  const length = channels[0]?.length ?? 0;
  if (!length || Math.abs(factor - 1) < 1e-4) return channels.map((one) => Float32Array.from(one));
  const out = Math.max(1, Math.round(length * factor));
  /* ~46 ms windows, half overlapping: long enough to hold a low note's wave,
     short enough that a drum hit is not smeared into two. */
  const size = 2 ** Math.round(Math.log2(rate * 0.046));
  const hop = size / 2;
  const reach = Math.round(rate * 0.012);
  const window = new Float32Array(size);
  for (let i = 0; i < size; i += 1) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size);
  const outs = channels.map(() => new Float32Array(out + size));
  const weight = new Float32Array(out + size);
  const lead = channels[0];
  const at = (i: number): number => (i >= 0 && i < length ? lead[i] : 0);
  let previous = 0;
  for (let put = 0; put < out; put += hop) {
    const ideal = Math.round(put / factor);
    let take = ideal;
    if (put > 0) {
      /* What would naturally follow the last window, and the start nearest
         `ideal` that sounds most like it. Coarse first, then to the sample. */
      const follow = previous + hop;
      const score = (start: number): number => {
        let sum = 0;
        for (let i = 0; i < hop; i += 8) sum += at(start + i) * at(follow + i);
        return sum;
      };
      let best = score(ideal);
      for (let d = -reach; d <= reach; d += 8) {
        const s = score(ideal + d);
        if (s > best) { best = s; take = ideal + d; }
      }
      const coarse = take;
      for (let d = -7; d <= 7; d += 1) {
        const s = score(coarse + d);
        if (s > best) { best = s; take = coarse + d; }
      }
    }
    previous = take;
    for (let c = 0; c < channels.length; c += 1) {
      const from = channels[c];
      const into = outs[c];
      for (let i = 0; i < size; i += 1) {
        const k = take + i;
        if (k >= 0 && k < length) into[put + i] += from[k] * window[i];
      }
    }
    for (let i = 0; i < size; i += 1) weight[put + i] += window[i];
  }
  return outs.map((one) => {
    const done = new Float32Array(out);
    for (let i = 0; i < out; i += 1) done[i] = weight[i] > 0.1 ? one[i] / weight[i] : one[i];
    return done;
  });
}

/** `samples` read `ratio` times as fast (linear interpolation): shorter and higher when over 1. */
export function resampled(samples: Float32Array, ratio: number): Float32Array {
  const out = new Float32Array(Math.max(1, Math.round(samples.length / ratio)));
  for (let i = 0; i < out.length; i += 1) {
    const x = i * ratio;
    const k = Math.floor(x);
    const f = x - k;
    const a = samples[k] ?? 0;
    const b = samples[k + 1] ?? a;
    out[i] = a + (b - a) * f;
  }
  return out;
}

/**
 * The clip at `speed` (2 is twice as fast) and `semitones` higher, in one
 * pass: stretched to the length the two together want, then resampled by
 * the pitch. Its length is the original over `speed`, whatever the pitch.
 */
export function timeAndPitch(
  channels: readonly Float32Array[],
  rate: number,
  speed: number,
  semitones: number,
): Float32Array[] {
  const fast = clampSpeed(speed);
  const shift = Math.max(-MOST_SEMITONES, Math.min(MOST_SEMITONES, Math.round(semitones)));
  const pitch = 2 ** (shift / 12);
  const longer = stretched(channels, rate, pitch / fast);
  if (shift === 0) return longer;
  const want = Math.max(1, Math.round((channels[0]?.length ?? 0) / fast));
  return longer.map((one) => {
    const back = resampled(one, pitch);
    if (back.length === want) return back;
    const exact = new Float32Array(want);
    exact.set(back.subarray(0, want));
    return exact;
  });
}

/* ── Reading a clip ─────────────────────────────────────────────────── */

/** A mono copy at a lower rate, enough for reading tempo and key. */
function reduced(channels: readonly Float32Array[], rate: number, want: number): { data: Float32Array; rate: number } {
  const step = Math.max(1, Math.floor(rate / want));
  const length = Math.floor((channels[0]?.length ?? 0) / step);
  const data = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    let sum = 0;
    for (const one of channels) for (let k = 0; k < step; k += 1) sum += one[i * step + k] ?? 0;
    data[i] = sum / (step * channels.length);
  }
  return { data, rate: rate / step };
}

/**
 * The tempo, in beats a minute, from where the sound gets louder. Folded
 * into 70–180, which is where a musician counts. Null when there is not
 * enough of a beat to count: a held note, a voice alone, silence.
 */
export function tempoOf(channels: readonly Float32Array[], rate: number): number | null {
  const { data, rate: low } = reduced(channels, rate, 11025);
  const hop = 128;
  /* Each loudness reading spans four hops, so a low note's own wave does not
     ripple through the readings and pass for a beat. */
  const span = hop * 4;
  const frames = Math.floor((data.length - span) / hop);
  if (frames < 128) return null;
  const energy = new Float32Array(frames);
  for (let f = 0; f < frames; f += 1) {
    let sum = 0;
    for (let i = 0; i < span; i += 1) sum += data[f * hop + i] ** 2;
    energy[f] = Math.log1p((1000 * sum) / span);
  }
  /* Rises only: a beat is a sound arriving, not one dying away. A rise of
     under a fiftieth of the loudest reading is a wobble, not an arrival. */
  let top = 0;
  for (let f = 0; f < frames; f += 1) top = Math.max(top, energy[f]);
  const onset = new Float32Array(frames);
  let mean = 0;
  for (let f = 1; f < frames; f += 1) {
    const rise = energy[f] - energy[f - 1];
    onset[f] = rise > top * 0.02 ? rise : 0;
    mean += onset[f];
  }
  mean /= frames;
  for (let f = 0; f < frames; f += 1) onset[f] = Math.max(0, onset[f] - mean);
  let zero = 0;
  for (let i = 0; i < frames; i += 1) zero += onset[i] * onset[i];
  zero /= frames;
  if (zero <= 1e-9) return null;
  const perSecond = low / hop;
  const strength = (bpm: number): number => {
    const lag = (60 / bpm) * perSecond;
    const k = Math.floor(lag);
    const f = lag - k;
    let a = 0;
    let b = 0;
    for (let i = 0; i + k + 1 < frames; i += 1) { a += onset[i] * onset[i + k]; b += onset[i] * onset[i + k + 1]; }
    return (a * (1 - f) + b * f) / Math.max(1, frames - k);
  };
  let best = 0;
  let bestScore = -Infinity;
  let raw = 0;
  for (let tenth = 600; tenth <= 2000; tenth += 5) {
    const bpm = tenth / 10;
    /* A beat is heard with its half and its double: count those too, and
       lean towards the tempi songs are written in, around 120. */
    const s = strength(bpm) + 0.5 * strength(bpm / 2) + 0.25 * strength(bpm * 2);
    const lean = Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.9) ** 2);
    if (s * lean > bestScore) { bestScore = s * lean; best = bpm; raw = strength(bpm); }
  }
  /* The beat has to repeat: a lag that lines up no better than chance is no tempo. */
  if (!(raw / zero > 0.15)) return null;
  let bpm = best;
  while (bpm < 70) bpm *= 2;
  while (bpm > 180) bpm /= 2;
  return Math.round(bpm * 10) / 10;
}

export const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

/* Krumhansl–Kessler: how much each scale degree is heard in a major and a minor key. */
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/** How much of each of the twelve notes is in the clip, C first, by Goertzel over five octaves. */
export function chromaOf(channels: readonly Float32Array[], rate: number): number[] {
  const { data, rate: low } = reduced(channels, rate, 11025);
  const size = 4096;
  const chroma = new Array<number>(12).fill(0);
  /* At most ~90 windows spread through the clip: enough to hear the key, and
     a long song does not take long. */
  const windows = Math.floor(data.length / size);
  const every = Math.max(1, Math.floor(windows / 90));
  const hann = new Float32Array(size);
  for (let i = 0; i < size; i += 1) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size);
  for (let w = 0; w < windows; w += every) {
    const start = w * size;
    for (let midi = 40; midi < 100; midi += 1) {
      const hz = 440 * 2 ** ((midi - 69) / 12);
      if (hz >= low / 2) break;
      const coeff = 2 * Math.cos((2 * Math.PI * hz) / low);
      let s1 = 0;
      let s2 = 0;
      for (let i = 0; i < size; i += 1) {
        const s = data[start + i] * hann[i] + coeff * s1 - s2;
        s2 = s1;
        s1 = s;
      }
      chroma[midi % 12] += Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - coeff * s1 * s2));
    }
  }
  return chroma;
}

const correlation = (a: readonly number[], b: readonly number[]): number => {
  const ma = a.reduce((s, v) => s + v, 0) / a.length;
  const mb = b.reduce((s, v) => s + v, 0) / b.length;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i += 1) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
};

export interface ClipKey {
  /** 0 is C. */
  readonly root: number;
  readonly minor: boolean;
}

/** The key the twelve notes say, or null for a clip with no clear notes in it (a drum loop, silence). */
export function keyFromChroma(chroma: readonly number[]): ClipKey | null {
  const total = chroma.reduce((s, v) => s + v, 0);
  if (!(total > 0)) return null;
  let best: (ClipKey & { fit: number }) | null = null;
  for (let root = 0; root < 12; root += 1) {
    for (const minor of [false, true]) {
      const turned = chroma.map((_, i) => chroma[(i + root) % 12]);
      const fit = correlation(turned, minor ? MINOR : MAJOR);
      if (!best || fit > best.fit) best = { root, minor, fit };
    }
  }
  return best && best.fit > 0.5 ? { root: best.root, minor: best.minor } : null;
}

export const keyOfClip = (channels: readonly Float32Array[], rate: number): ClipKey | null =>
  keyFromChroma(chromaOf(channels, rate));

export const sayKey = (key: ClipKey): string => `${NOTE_NAMES[key.root]}${key.minor ? 'm' : ''}`;

/** A key as the session or a reading writes it ("A", "F#m", "Bb minor", "C major"), or null. */
export function keyOfName(name: string | null | undefined): ClipKey | null {
  const m = /^\s*([A-Ga-g])\s*([#♯b♭]?)\s*(min(?:or)?|maj(?:or)?|m)?/i.exec(name ?? '');
  if (!m) return null;
  const base = ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as const)[m[1].toUpperCase() as 'C'];
  const accidental = m[2] === '#' || m[2] === '♯' ? 1 : m[2] === 'b' || m[2] === '♭' ? -1 : 0;
  const minor = Boolean(m[3]) && !/^maj/i.test(m[3]);
  return { root: (base + accidental + 12) % 12, minor };
}

/**
 * The fewest semitones that move a clip in `from` into `to`, -6 to +6. A
 * minor clip goes to the relative minor of a major session and the other way
 * round, so a sad loop is not made happy by being moved.
 */
export function semitonesBetween(from: ClipKey, to: ClipKey): number {
  let target = to.root;
  if (from.minor && !to.minor) target = (to.root + 9) % 12;
  if (!from.minor && to.minor) target = (to.root + 3) % 12;
  const up = (target - from.root + 12) % 12;
  return up > 6 ? up - 12 : up;
}

/**
 * The speed that fits a clip at `clip` BPM to a session at `session` BPM,
 * taking the clip's double or half when that is the closer fit: a loop at 64
 * in a song at 128 is a half-time loop, not one to play twice as fast.
 */
export function speedToFit(clip: number, session: number): number {
  const options = [session / clip, session / (clip * 2), (session * 2) / clip];
  return options.reduce((best, one) => (Math.abs(Math.log2(one)) < Math.abs(Math.log2(best)) ? one : best));
}
