/**
 * The last stage of a mix: loudness in LUFS, a true-peak reading, and a
 * limiter that keeps every sample under the ceiling.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Found 29 October 2026, auditing ProBooth against what every serious studio
 * does: "Ceiling" said nothing goes above it, but it was one fixed gain worked
 * out from a measurement, and "Match the loudness" was the same gain. Both
 * were dropped the moment anything in the mix changed (the measurement went
 * stale), and an export after any edit had neither, with nothing said. And the
 * loudness was RMS, which is not what streaming services measure.
 *
 * Now the export measures the finished mix itself, every time, so there is
 * nothing to go stale:
 *
 *   1. the loudness, integrated LUFS by ITU-R BS.1770 (K-weighting, 400 ms
 *      blocks, the absolute and relative gates), which is the number Spotify,
 *      YouTube and Apple Music turn songs up and down by;
 *   2. the mix brought to the chosen target;
 *   3. a look-ahead limiter at the ceiling, so the gain never clips: it sees
 *      a peak coming a few milliseconds early and turns down smoothly into it,
 *      and lets go slowly after.
 */

/** Loudness targets, integrated LUFS. Each is what that place plays music at. */
export const TARGETS = [
  { id: 'stream', lufs: -14, name: ['pro.targetStream', 'Spotify, YouTube, TikTok'] },
  { id: 'apple', lufs: -16, name: ['pro.targetApple', 'Apple Music, podcasts'] },
  { id: 'loud', lufs: -9, name: ['pro.targetLoud', 'Loud, for clubs and radio'] },
] as const;
export type TargetId = (typeof TARGETS)[number]['id'];
export const lufsOfTarget = (id: TargetId | undefined): number =>
  (TARGETS.find((one) => one.id === id) ?? TARGETS[0]).lufs;

/** The most the loudness match will turn a quiet mix up, in dB. */
export const MOST_UP_DB = 18;

interface Biquad { b0: number; b1: number; b2: number; a1: number; a2: number }

/** BS.1770's two K-weighting filters, worked out for any sample rate. */
function kWeighting(rate: number): readonly [Biquad, Biquad] {
  /* Stage 1: the head's high shelf, +4 dB above about 1.7 kHz. */
  const f0 = 1681.974450955533;
  const G = 3.999843853973347;
  const Q = 0.7071752369554196;
  const K = Math.tan((Math.PI * f0) / rate);
  const Vh = 10 ** (G / 20);
  const Vb = Vh ** 0.4996667741545416;
  const a0 = 1 + K / Q + K * K;
  const shelf = {
    b0: (Vh + (Vb * K) / Q + K * K) / a0,
    b1: (2 * (K * K - Vh)) / a0,
    b2: (Vh - (Vb * K) / Q + K * K) / a0,
    a1: (2 * (K * K - 1)) / a0,
    a2: (1 - K / Q + K * K) / a0,
  };
  /* Stage 2: the RLB high-pass at about 38 Hz. */
  const f1 = 38.13547087602444;
  const Q1 = 0.5003270373238773;
  const K1 = Math.tan((Math.PI * f1) / rate);
  const a01 = 1 + K1 / Q1 + K1 * K1;
  const high = {
    b0: 1 / a01,
    b1: -2 / a01,
    b2: 1 / a01,
    a1: (2 * (K1 * K1 - 1)) / a01,
    a2: (1 - K1 / Q1 + K1 * K1) / a01,
  };
  return [shelf, high];
}

function filtered(data: Float32Array, f: Biquad): Float32Array {
  const out = new Float32Array(data.length);
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0;
  for (let i = 0; i < data.length; i += 1) {
    const x = data[i];
    const y = f.b0 * x + f.b1 * x1 + f.b2 * x2 - f.a1 * y1 - f.a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
}

/** Plain sound, as a list of channels and a rate, so a check can feed it numbers. */
export interface Sound {
  readonly channels: readonly Float32Array[];
  readonly rate: number;
}

export const soundOf = (buffer: AudioBuffer): Sound => ({
  channels: Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c)),
  rate: buffer.sampleRate,
});

/** Integrated loudness in LUFS. Silence is -Infinity. */
export function lufsOf(sound: Sound): number {
  const { rate } = sound;
  const [shelf, high] = kWeighting(rate);
  const weighted = sound.channels.slice(0, 2).map((one) => filtered(filtered(one, shelf), high));
  const block = Math.round(0.4 * rate);
  const step = Math.round(0.1 * rate);
  const length = weighted[0]?.length ?? 0;
  const powers: number[] = [];
  for (let start = 0; start + block <= length; start += step) {
    let sum = 0;
    for (const channel of weighted) {
      let s = 0;
      for (let i = start; i < start + block; i += 1) s += channel[i] * channel[i];
      sum += s / block;
    }
    powers.push(sum);
  }
  const loud = (p: number): number => -0.691 + 10 * Math.log10(p);
  const absolute = powers.filter((p) => p > 0 && loud(p) > -70);
  if (!absolute.length) return -Infinity;
  const mean = (list: readonly number[]): number => list.reduce((a, b) => a + b, 0) / list.length;
  const relative = loud(mean(absolute)) - 10;
  const gated = absolute.filter((p) => loud(p) > relative);
  return loud(mean(gated.length ? gated : absolute));
}

/**
 * The true peak, in dBFS: the highest the wave reaches between samples as
 * well as on them, read at four times the rate. A file can be under 0 dB on
 * every sample and still clip a phone's converter between two of them.
 */
export function truePeakDb(sound: Sound): number {
  const taps = 8;
  /* A windowed-sinc interpolator for the three points between each pair. */
  const kernels = [0.25, 0.5, 0.75].map((frac) => {
    const k: number[] = [];
    for (let n = -taps + 1; n <= taps; n += 1) {
      const x = n - frac;
      const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
      const w = 0.5 * (1 + Math.cos((Math.PI * x) / taps));
      k.push(sinc * w);
    }
    return k;
  });
  let top = 0;
  for (const data of sound.channels) {
    for (let i = 0; i < data.length; i += 1) {
      const v = Math.abs(data[i]);
      if (v > top) top = v;
      /* Between samples only where it could matter: near the top already. */
      if (v < top * 0.7 || i + taps >= data.length || i < taps) continue;
      for (const k of kernels) {
        let s = 0;
        for (let n = -taps + 1; n <= taps; n += 1) s += data[i + n] * k[n + taps - 1];
        if (Math.abs(s) > top) top = Math.abs(s);
      }
    }
  }
  return top > 0 ? 20 * Math.log10(top) : -Infinity;
}

/**
 * The sound turned up or down by `gainDb` and held under `ceilingDb`, new
 * channels; the input is not touched.
 *
 * The limiter looks `ahead` seconds ahead: the gain is already down by the
 * time a peak arrives, so it never has to snap, and comes back up over
 * `release` seconds. A last hard stop at the ceiling catches the rare sample
 * a smooth envelope cannot.
 */
export function limited(sound: Sound, gainDb: number, ceilingDb: number, ahead = 0.005, release = 0.08): Sound {
  const { rate } = sound;
  const gain = 10 ** (gainDb / 20);
  const ceiling = 10 ** (ceilingDb / 20);
  const length = sound.channels[0]?.length ?? 0;
  const look = Math.max(1, Math.round(ahead * rate));
  /* How much each sample has to come down by, across all channels. */
  const need = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    let v = 0;
    for (const channel of sound.channels) v = Math.max(v, Math.abs(channel[i] * gain));
    need[i] = v > ceiling ? ceiling / v : 1;
  }
  /* The smallest need within the look-ahead window, so the turn-down starts early. */
  const env = new Float32Array(length);
  const deque: number[] = [];
  for (let i = 0; i < length + look; i += 1) {
    if (i < length) {
      while (deque.length && need[deque[deque.length - 1]] >= need[i]) deque.pop();
      deque.push(i);
    }
    const at = i - look;
    if (at < 0) continue;
    while (deque.length && deque[0] < at) deque.shift();
    env[at] = deque.length ? need[deque[0]] : 1;
  }
  /* Smooth: down along a ramp the length of the look-ahead, up over the release. */
  const down = 1 / look;
  const up = 1 - Math.exp(-1 / (release * rate));
  let g = 1;
  const smooth = new Float32Array(length);
  for (let i = length - 1; i >= 0; i -= 1) {
    /* Backwards pass: start falling `look` samples before a dip. */
    g = Math.min(env[i], g + down);
    smooth[i] = g;
  }
  g = 1;
  for (let i = 0; i < length; i += 1) {
    g = smooth[i] < g ? smooth[i] : g + (smooth[i] - g) * up;
    smooth[i] = g;
  }
  const channels = sound.channels.map((channel) => {
    const out = new Float32Array(length);
    for (let i = 0; i < length; i += 1) {
      const v = channel[i] * gain * smooth[i];
      out[i] = v > ceiling ? ceiling : v < -ceiling ? -ceiling : v;
    }
    return out;
  });
  return { channels, rate };
}

/** What finishing did, said on the screen beside the export. */
export interface Finished {
  readonly sound: Sound;
  readonly lufsBefore: number;
  readonly lufsAfter: number;
  readonly truePeakDb: number;
  readonly gainDb: number;
}

/**
 * The mix finished for a file: to the target loudness when matching is on,
 * and under the ceiling always.
 */
export function finish(sound: Sound, master: { readonly ceilingDb: number; readonly matchLoudness: boolean; readonly target?: TargetId }): Finished {
  const lufsBefore = lufsOf(sound);
  const wanted = lufsOfTarget(master.target);
  const gainDb = master.matchLoudness && Number.isFinite(lufsBefore)
    ? Math.min(MOST_UP_DB, wanted - lufsBefore)
    : 0;
  /* The ceiling is a true-peak ceiling: aim the limiter a little under it,
     because the wave can go over between the samples it holds. */
  const out = limited(sound, gainDb, master.ceilingDb - 0.3);
  return { sound: out, lufsBefore, lufsAfter: lufsOf(out), truePeakDb: truePeakDb(out), gainDb };
}

/** A finished sound back into an AudioBuffer, for the encoders. */
export function bufferOf(sound: Sound, make: (channels: number, length: number, rate: number) => AudioBuffer): AudioBuffer {
  const buffer = make(sound.channels.length, sound.channels[0]?.length ?? 1, sound.rate);
  sound.channels.forEach((one, c) => buffer.copyToChannel(one as Float32Array<ArrayBuffer>, c));
  return buffer;
}
