/**
 * Writing an AudioBuffer out as an MP3, at a bitrate or under a size.
 *
 * ── Why, after a year of WAV only ────────────────────────────────────────
 *
 * The owner, 18 October 2026: a file size to choose at every export —
 * *"menend 1mb ens."* — and, asked whether that meant adding an MP3 encoder
 * to the booth: *"Ja, doen al drie."* A WAV is the sound written down
 * sample by sample, so its size is fixed by its length — a minute of CD
 * stereo is ten megabytes whatever is on it — and a limit on a WAV is a
 * limit on how long the song may be. An MP3 is what every phone, platform
 * and messaging app takes, and its size is its bitrate times its length,
 * which is a number that can be chosen.
 *
 * WAV stays the default and stays in `wav.ts`: it is what a studio hands
 * another studio. This is the way to send it to people.
 *
 * ── The encoder ──────────────────────────────────────────────────────────
 *
 * `@breezystack/lamejs`, LAME in plain JavaScript (LGPL-3.0, used as the
 * separate library it ships as). No WebAssembly and no worker file to host,
 * so it runs wherever the booth runs. It is not fast — roughly twenty times
 * faster than the song plays on a phone — so the work is cut into slices and
 * the page is given a breath between them, and the button says it is busy.
 *
 * Loaded only when somebody actually saves an MP3: half a megabyte of
 * encoder is not something to make every visitor of the booth download.
 */
import { foldTo, type Layout } from './channels';

/** The bitrates an MP3 is written at, in kilobits a second, best first. */
export const KBPS = [320, 256, 192, 160, 128, 96, 64, 48, 32] as const;
export type Kbps = (typeof KBPS)[number];
/** Without a limit: 256, which nobody hears as different from the WAV. */
export const KBPS_DEFAULT: Kbps = 256;

/** How big an MP3 at `kbps` is for `seconds` of sound, in bytes. */
export function mp3Bytes(seconds: number, kbps: number): number {
  if (!(seconds > 0) || !(kbps > 0)) return 0;
  return Math.ceil((seconds * kbps * 1000) / 8);
}

/**
 * The best bitrate whose file comes in under `most` bytes.
 *
 * A twentieth is left for the frame headers and the encoder's own rounding.
 * Never above `ceiling` — a limit makes a file smaller, not better — and the
 * lowest bitrate when even that is too big, with `fits` saying so.
 */
export function kbpsUnder(
  seconds: number,
  most: number | null | undefined,
  ceiling: Kbps = KBPS_DEFAULT,
): { readonly kbps: Kbps; readonly fits: boolean } {
  if (!most || !(seconds > 0)) return { kbps: ceiling, fits: true };
  const room = (most * 8 * 0.95) / seconds / 1000;
  const found = KBPS.find((one) => one <= ceiling && one <= room);
  return found ? { kbps: found, fits: true } : { kbps: KBPS[KBPS.length - 1], fits: false };
}

const SLICE = 1152 * 40;

const toShorts = (data: Float32Array, from: number, to: number): Int16Array => {
  const out = new Int16Array(to - from);
  for (let i = from; i < to; i += 1) {
    const value = Math.max(-1, Math.min(1, data[i]));
    out[i - from] = value < 0 ? value * 0x8000 : value * 0x7fff;
  }
  return out;
};

/**
 * The MP3. `layout` folds it the way the WAV would be folded, so mono is
 * one channel and a smaller file, and the surround fold is still two.
 */
export async function encodeMp3(buffer: AudioBuffer, kbps: number, layout: Layout = 'stereo'): Promise<Blob> {
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const source: Float32Array[] = [];
  for (let c = 0; c < Math.min(2, buffer.numberOfChannels); c += 1) source.push(buffer.getChannelData(c));
  const folded = source.length === 1 && layout !== 'surround'
    ? [source[0]]
    : foldTo(layout, source[0], source[source.length - 1]);
  const channels = folded.length >= 2 ? 2 : 1;
  const encoder = new Mp3Encoder(channels, buffer.sampleRate, kbps);
  const parts: Uint8Array[] = [];
  const frames = folded[0]?.length ?? 0;
  for (let from = 0; from < frames; from += SLICE) {
    const to = Math.min(frames, from + SLICE);
    const left = toShorts(folded[0], from, to);
    const made = channels === 2
      ? encoder.encodeBuffer(left, toShorts(folded[1], from, to))
      : encoder.encodeBuffer(left);
    if (made.length) parts.push(made.slice());
    /* A breath for the page, so the button can say "rendering" and the
       phone does not decide the tab has hung. */
    if ((from / SLICE) % 8 === 7) await new Promise((done) => setTimeout(done, 0));
  }
  const tail = encoder.flush();
  if (tail.length) parts.push(tail.slice());
  return new Blob(parts as BlobPart[], { type: 'audio/mpeg' });
}
