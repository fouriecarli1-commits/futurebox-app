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

/** How many decibels below the loud end the picture reaches before black. */
const RANGE_DB = 66;
/** The rows a lane asks for: enough to tell a voice from a cymbal at a glance. */
export const LANE_BINS = 96;

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
  /* Against the loud end of the picture rather than its single loudest
     cell: one drum hit used to set the scale for three minutes of song and
     leave everything else dim (the owner, 28 October 2026: "Die spectogram
     moet seker beter lyk ... meer detail op hê en kleure"). */
  let loudest = 0;
  {
    const sorted = Float32Array.from(power).sort();
    loudest = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.997))] || sorted[sorted.length - 1] || 0;
  }
  const cells = new Uint8Array(rows * want);
  if (loudest > 0) {
    const floor = loudest * 1e-6;
    for (let i = 0; i < power.length; i += 1) {
      const p = power[i];
      if (p <= floor) continue;
      const db = 10 * Math.log10(p / loudest);
      cells[i] = Math.round(Math.max(0, Math.min(1, 1 + db / RANGE_DB)) * 255);
    }
  }
  return { cells, columns: want, bins: rows, duration: buffer.duration };
}

/** The same picture, from a file: decoded here, then `spectrogramOf`. */
export async function spectrogramOfBlob(blob: Blob, columns = 1600, bins = LANE_BINS): Promise<Spectrogram | null> {
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
 * The colours a level passes through, quiet to loud: night blue, violet,
 * magenta, orange, amber, near white. Several hues rather than one teal, so
 * a level can be told from the next by colour as well as by brightness, and
 * each step is lighter than the last, so it still reads in black and white.
 */
const RAMP: readonly (readonly [number, number, number, number])[] = [
  [0, 4, 6, 16],
  [0.16, 27, 12, 64],
  [0.34, 92, 26, 140],
  [0.52, 186, 44, 128],
  [0.68, 238, 92, 64],
  [0.84, 250, 178, 60],
  [1, 255, 250, 222],
];

/** The colour of a cell, 0…255, as red, green and blue. */
export function heatRgb(level: number): readonly [number, number, number] {
  const v = Math.max(0, Math.min(255, level)) / 255;
  for (let i = 1; i < RAMP.length; i += 1) {
    const [at, r, g, b] = RAMP[i];
    if (v <= at) {
      const [was, r0, g0, b0] = RAMP[i - 1];
      const t = (v - was) / (at - was);
      return [Math.round(r0 + (r - r0) * t), Math.round(g0 + (g - g0) * t), Math.round(b0 + (b - b0) * t)];
    }
  }
  const last = RAMP[RAMP.length - 1];
  return [last[1], last[2], last[3]];
}

/**
 * The colour of a cell, 0…255 → a CSS colour. One ramp for the whole app
 * (`RAMP`), so the loud parts read as hot and a hiss reads as a faint haze —
 * the way every spectrogram anybody has seen reads.
 */
export function heat(level: number): string {
  const [r, g, b] = heatRgb(level);
  return `rgb(${r},${g},${b})`;
}

/**
 * The picture as pixels, one per cell, the highest pitch in the TOP row —
 * so it can be put on a canvas once and then stretched into any lane.
 */
export function pixelsOf(picture: Spectrogram): Uint8ClampedArray {
  const { columns, bins, cells } = picture;
  const out = new Uint8ClampedArray(columns * bins * 4);
  for (let r = 0; r < bins; r += 1) {
    const y = bins - 1 - r;
    for (let c = 0; c < columns; c += 1) {
      const [red, green, blue] = heatRgb(cells[r * columns + c]);
      const i = (y * columns + c) * 4;
      out[i] = red; out[i + 1] = green; out[i + 2] = blue; out[i + 3] = 255;
    }
  }
  return out;
}

const images = new WeakMap<Spectrogram, HTMLCanvasElement>();
/**
 * The picture on a small canvas of its own, made once per picture.
 *
 * Painting is then one `drawImage` per lane, stretched to fit: the booth
 * redraws every lane on every render while it plays, and a few thousand
 * rectangles a lane, four times a second, is the kind of work a phone
 * notices. The stretch is also what makes it right at any pixel density —
 * the first version copied columns of its own canvas and, with the canvas
 * scaled for a dense screen, copied them from the wrong place.
 */
export function imageOf(picture: Spectrogram): HTMLCanvasElement | null {
  const had = images.get(picture);
  if (had) return had;
  if (typeof document === 'undefined') return null;
  const sheet = document.createElement('canvas');
  sheet.width = picture.columns;
  sheet.height = picture.bins;
  const context = sheet.getContext('2d');
  if (!context) return null;
  const pixels = context.createImageData(picture.columns, picture.bins);
  pixels.data.set(pixelsOf(picture));
  context.putImageData(pixels, 0, 0);
  images.set(picture, sheet);
  return sheet;
}

/**
 * Paint a spectrogram into a box, in the context's own units. `from`/`long`
 * pick the part of the sound the box shows, in seconds, the way `WaveBlock`
 * reads them; `x`/`wide` place it, so a lane that goes round four times can
 * paint the same window four times side by side.
 */
export function paintSpectrogram(
  context: CanvasRenderingContext2D,
  picture: Spectrogram,
  wide: number,
  tall: number,
  from = 0,
  long?: number,
  x = 0,
): void {
  const sheet = imageOf(picture);
  if (!sheet) return;
  const total = picture.duration > 0 ? picture.duration : 1;
  const start = Math.max(0, Math.min(from, total));
  const span = Math.max(0.01, Math.min(long ?? total - start, total - start));
  const sx = (start / total) * picture.columns;
  const sw = Math.max(1, (span / total) * picture.columns);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(sheet, sx, 0, Math.min(sw, picture.columns - sx), picture.bins, x, 0, wide, tall);
}

/* ── What it says, in words ─────────────────────────────────────────────
   The owner, 28 October 2026: *"wat is die doel van dit? Moet dit iets vir
   die editor sê?"* It should. Read off the same picture, on the device: the
   quiet gaps (where to cut), and whether the bottom or the top of the sound
   stands out (boomy, thin, sharp or dull). Plain sentences, a few at most. */

export interface SpectrumNote {
  readonly kind: 'gaps' | 'boomy' | 'thin' | 'sharp' | 'dull' | 'even';
  /** For `gaps`: where each quiet stretch starts, in seconds. */
  readonly at?: readonly number[];
}

/** The pitch, in hertz, at the middle of a row. */
function rowHz(row: number, bins: number): number {
  return LOW * (HIGH / LOW) ** ((row + 0.5) / bins);
}

export function readSpectrum(picture: Spectrogram): SpectrumNote[] {
  const { cells, columns, bins, duration } = picture;
  if (!columns || !bins) return [];
  /* Back to power: a cell is decibels over `RANGE_DB`. */
  const power = (v: number): number => (v ? 10 ** (((v / 255) - 1) * RANGE_DB / 10) : 0);
  let low = 0; let mid = 0; let high = 0;
  const column = new Float64Array(columns);
  for (let r = 0; r < bins; r += 1) {
    const hz = rowHz(r, bins);
    for (let c = 0; c < columns; c += 1) {
      const p = power(cells[r * columns + c]);
      column[c] += p;
      if (hz < 250) low += p; else if (hz < 4000) mid += p; else high += p;
    }
  }
  const all = low + mid + high;
  if (all <= 0) return [];
  const notes: SpectrumNote[] = [];

  /* Quiet stretches of half a second or more, against the loud end of the song. */
  const sorted = Float64Array.from(column).sort();
  const loud = sorted[Math.floor(sorted.length * 0.9)] || 0;
  const perColumn = duration / columns;
  const gaps: number[] = [];
  let run = 0;
  for (let c = 0; c <= columns; c += 1) {
    const quiet = c < columns && column[c] < loud * 0.02;
    if (quiet) run += 1;
    else {
      const start = c - run;
      if (run * perColumn >= 0.5 && start > 0 && c < columns) gaps.push(start * perColumn);
      run = 0;
    }
  }
  if (gaps.length) notes.push({ kind: 'gaps', at: gaps.slice(0, 4) });

  const lowShare = low / all;
  const highShare = high / all;
  if (lowShare > 0.6) notes.push({ kind: 'boomy' });
  else if (lowShare < 0.08) notes.push({ kind: 'thin' });
  if (highShare > 0.22) notes.push({ kind: 'sharp' });
  else if (highShare < 0.01) notes.push({ kind: 'dull' });
  if (!notes.some((one) => one.kind !== 'gaps')) notes.push({ kind: 'even' });
  return notes;
}
