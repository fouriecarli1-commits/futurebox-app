'use client';

/**
 * A spectrogram: time across, pitch up, loudness as colour.
 *
 * The owner, 26 October 2026: *"Kan ons ook 'n spectogram in ons probooth
 * en video editor in bou?"* A waveform shows how loud a sound is; a
 * spectrogram shows what is IN it — where the voice sits, where the bass
 * is, where a hiss or a hum lives — which is what somebody cleaning a take
 * or choosing a cut actually wants to see.
 *
 * ── Computed here, on the device ──────────────────────────────────────
 *
 * A short-time Fourier transform over the decoded sound: a Hann window of
 * `FRAME` samples, hopped so that there are about as many frames as there
 * are columns asked for, and each frame's spectrum folded onto `bins` rows
 * spaced by pitch rather than by hertz — a hertz-spaced picture gives half
 * its height to what is above 10 kHz, where nothing anybody mixes lives.
 * Rows run from `LOW` to `HIGH` hertz, bottom to top, and the whole picture
 * is scaled in decibels against its own loudest cell, so a quiet take reads
 * as clearly as a loud one. Nothing leaves the phone and nothing is charged.
 *
 * The transform is a plain radix-2 FFT written out below rather than
 * pulled in: it is forty lines, it has no dependency to break, and
 * `check:spectrogram` holds it to a sine landing in the right row.
 */

export interface Spectrogram {
  /** `bins` rows by `columns` cells, row 0 at the BOTTOM (lowest pitch), 0…255. */
  readonly cells: Uint8Array;
  readonly columns: number;
  readonly bins: number;
  /** The sound's real length, in seconds. */
  readonly duration: number;
}

/** The FFT frame, in samples. 2048 at 44.1 kHz is 21 Hz per raw bin. */
export const FRAME = 2048;
/** The lowest and highest pitch drawn, in hertz. */
export const LOW = 40;
export const HIGH = 16000;
/** The most columns a picture is ever drawn with; past that it is work for nothing. */
const MOST = 2400;

/** In-place complex FFT, radix 2. `re` and `im` are both of length `n`, a power of two. */
export function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const step = (-2 * Math.PI) / size;
    const half = size >> 1;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k += 1) {
        const angle = step * k;
        const wr = Math.cos(angle);
        const wi = Math.sin(angle);
        const a = start + k;
        const b = a + half;
        const xr = re[b] * wr - im[b] * wi;
        const xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
      }
    }
  }
}

const windows = new Map<number, Float32Array>();
function hann(n: number): Float32Array {
  const had = windows.get(n);
  if (had) return had;
  const w = new Float32Array(n);
  for (let i = 0; i < n; i += 1) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  windows.set(n, w);
  return w;
}

/** Which raw FFT bin each drawn row starts at, for a log-pitch ladder of `bins` rows. */
export function rowEdges(bins: number, sampleRate: number, frame = FRAME): Float64Array {
  const edges = new Float64Array(bins + 1);
  const perBin = sampleRate / frame;
  const ratio = Math.log(HIGH / LOW);
  for (let r = 0; r <= bins; r += 1) {
    const hz = LOW * Math.exp((ratio * r) / bins);
    edges[r] = hz / perBin;
  }
  return edges;
}

/**
 * The picture of a decoded sound.
 *
 * @param columns  how many cells across; drawn one per pixel column.
 * @param bins     how many rows; 48 is readable at forty pixels tall.
 */
export function spectrogramOf(buffer: AudioBuffer, columns: number, bins = 48): Spectrogram {
  const want = Math.min(MOST, Math.max(8, Math.floor(columns) || 8));
  const rows = Math.max(8, Math.floor(bins) || 8);
  const length = buffer.length;
  /* Mono: the channels summed. A stereo picture would be two pictures, and
     what the eye is looking for — where the voice is — is in both. */
  const mono = new Float32Array(length);
  for (let c = 0; c < buffer.numberOfChannels; c += 1) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i += 1) mono[i] += data[i];
  }
  if (buffer.numberOfChannels > 1) for (let i = 0; i < length; i += 1) mono[i] /= buffer.numberOfChannels;

  const frame = Math.min(FRAME, 1 << Math.floor(Math.log2(Math.max(64, length))));
  const window = hann(frame);
  const edges = rowEdges(rows, buffer.sampleRate, frame);
  const re = new Float32Array(frame);
  const im = new Float32Array(frame);
  const power = new Float32Array(rows * want);
  const hop = Math.max(1, (length - frame) / Math.max(1, want - 1));

  for (let col = 0; col < want; col += 1) {
    const from = Math.min(Math.max(0, length - frame), Math.floor(col * hop));
    for (let i = 0; i < frame; i += 1) {
      re[i] = (mono[from + i] ?? 0) * window[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let r = 0; r < rows; r += 1) {
      const a = Math.max(1, Math.floor(edges[r]));
      const b = Math.max(a + 1, Math.ceil(edges[r + 1]));
      let sum = 0;
      let count = 0;
      for (let k = a; k < b && k < frame / 2; k += 1) {
        sum += re[k] * re[k] + im[k] * im[k];
        count += 1;
      }
      power[r * want + col] = count ? sum / count : 0;
    }
  }

  /* Decibels against the loudest cell, over a sixty-decibel range: below
     that is the noise floor of any phone recording, and drawing it would
     paint the whole picture a dim grey. */
  let loudest = 0;
  for (let i = 0; i < power.length; i += 1) if (power[i] > loudest) loudest = power[i];
  const cells = new Uint8Array(rows * want);
  if (loudest > 0) {
    const floor = loudest * 1e-6;
    for (let i = 0; i < power.length; i += 1) {
      const p = power[i];
      if (p <= floor) continue;
      const db = 10 * Math.log10(p / loudest);
      cells[i] = Math.round(Math.max(0, Math.min(1, 1 + db / 60)) * 255);
    }
  }
  return { cells, columns: want, bins: rows, duration: buffer.duration };
}

/** The same picture, from a file: decoded here, then `spectrogramOf`. */
export async function spectrogramOfBlob(blob: Blob, columns = 480, bins = 48): Promise<Spectrogram | null> {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const context = new Ctx();
    try {
      const decoded = await context.decodeAudioData(await blob.arrayBuffer());
      return spectrogramOf(decoded, columns, bins);
    } finally {
      await context.close();
    }
  } catch {
    return null;
  }
}

/**
 * The colour of a cell, 0…255 → a CSS colour. One ramp for the whole app:
 * near-black through the room's teal to a hot white, so the loud parts
 * read as hot and a hiss reads as a faint haze — the way every spectrogram
 * anybody has seen reads.
 */
export function heat(level: number): string {
  const v = Math.max(0, Math.min(255, level)) / 255;
  if (v < 0.35) { const t = v / 0.35; return `rgb(${Math.round(8 + 10 * t)},${Math.round(14 + 70 * t)},${Math.round(22 + 70 * t)})`; }
  if (v < 0.7) { const t = (v - 0.35) / 0.35; return `rgb(${Math.round(18 + 40 * t)},${Math.round(84 + 127 * t)},${Math.round(92 + 61 * t)})`; }
  const t = (v - 0.7) / 0.3;
  return `rgb(${Math.round(58 + 197 * t)},${Math.round(211 + 44 * t)},${Math.round(153 + 102 * t)})`;
}

/**
 * Paint a spectrogram into a box. `from`/`long` pick the part of the sound
 * the box shows, in seconds, the way `WaveBlock` reads them.
 */
export function paintSpectrogram(
  context: CanvasRenderingContext2D,
  picture: Spectrogram,
  wide: number,
  tall: number,
  from = 0,
  long?: number,
): void {
  const total = picture.duration > 0 ? picture.duration : 1;
  const start = Math.max(0, Math.min(from, total));
  const span = Math.max(0.01, Math.min(long ?? total - start, total - start));
  const rowTall = tall / picture.bins;
  context.fillStyle = heat(0);
  context.fillRect(0, 0, wide, tall);
  let last = -1;
  for (let x = 0; x < wide; x += 1) {
    const second = start + (x / wide) * span;
    const col = Math.min(picture.columns - 1, Math.max(0, Math.round((second / total) * (picture.columns - 1))));
    if (col === last && x > 0) { context.drawImage(context.canvas, x - 1, 0, 1, tall, x, 0, 1, tall); continue; }
    last = col;
    for (let r = 0; r < picture.bins; r += 1) {
      const level = picture.cells[r * picture.columns + col];
      if (level === 0) continue;
      context.fillStyle = heat(level);
      context.fillRect(x, tall - (r + 1) * rowTall, 1, Math.ceil(rowTall));
    }
  }
}
