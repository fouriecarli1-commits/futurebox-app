/**
 * Writing an AudioBuffer out as a file every browser can play.
 *
 * PCM WAV (sixteen-bit unless a caller asks for 24 or 32 — see `Depth`), because it is the one container that needs no encoder,
 * no licence and no library — and because everything that produces audio in
 * this app (the sketch engine, the watermark, a vocal mixdown) has to end up
 * somewhere a plain <audio> element will accept.
 *
 * It lives on its own so there is exactly one of it. There were two.
 */

import { foldTo, type Layout } from './channels';

/** Anything outside ±1 would wrap around and click. */
function clamp(value: number): number {
  return value > 1 ? 1 : value < -1 ? -1 : value;
}

/**
 * The same file, in mono, stereo, or folded for a surround decoder.
 *
 * The owner, 21 September 2026: *"Mono/stereo/dolby surround. Download type."*
 * The arithmetic is in `lib/channels.ts`, where a check can put numbers
 * through it; this only writes what comes back. Absent means stereo, which
 * is what every existing caller meant and still gets.
 */
export function encodeWav(buffer: AudioBuffer, layout: Layout = 'stereo', depth: Depth = 16): Blob {
  const source: Float32Array[] = [];
  for (let c = 0; c < Math.min(2, buffer.numberOfChannels); c += 1) {
    source.push(buffer.getChannelData(c));
  }
  /* A one-channel buffer folded to stereo would be two copies of the same
     thing and twice the file for nothing, so mono in stays mono out — and
     the fold below is handed the same array twice, which is what it expects. */
  const folded = source.length === 1 && layout !== 'surround'
    ? [source[0]]
    : foldTo(layout, source[0], source[source.length - 1]);
  return writeWav(folded, buffer.sampleRate, depth);
}

/**
 * How many bits a sample is written with.
 *
 * The owner, 14 October 2026, from the ProBooth design she sent: the quality a
 * stem or a mix is downloaded in. 16 is CD and what every caller got before
 * — small, and plays anywhere. 24 is what a studio hands another studio:
 * the quiet end keeps its detail when somebody mixes it again. 32 is
 * floating point, the booth's own numbers written down unrounded, so a
 * louder-than-full peak survives to be turned down later rather than being
 * clipped here. Every caller that does not ask gets 16, exactly as before.
 */
export type Depth = 16 | 24 | 32;

/** The bytes, from channels that are already in the layout they will be in. */
export function writeWav(data: readonly Float32Array[], sampleRate: number, depth: Depth = 16): Blob {
  const channels = data.length;
  const frames = data[0]?.length ?? 0;
  const width = depth / 8;
  const size = frames * channels * width;
  const bytes = new ArrayBuffer(44 + size);
  const view = new DataView(bytes);

  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };

  text(0, 'RIFF');
  view.setUint32(4, 36 + size, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  /* 1 is whole numbers; 3 is IEEE floating point. */
  view.setUint16(20, depth === 32 ? 3 : 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * width, true);
  view.setUint16(32, channels * width, true);
  view.setUint16(34, depth, true);
  text(36, 'data');
  view.setUint32(40, size, true);

  let offset = 44;
  for (let i = 0; i < frames; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      if (depth === 32) {
        /* Unclamped on purpose: keeping what is over full scale is the
           reason to choose floating point. */
        view.setFloat32(offset, data[c][i], true);
      } else if (depth === 24) {
        const sample = clamp(data[c][i]);
        const whole = Math.round(sample < 0 ? sample * 0x800000 : sample * 0x7fffff);
        view.setUint8(offset, whole & 0xff);
        view.setUint8(offset + 1, (whole >> 8) & 0xff);
        view.setUint8(offset + 2, (whole >> 16) & 0xff);
      } else {
        const sample = clamp(data[c][i]);
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      }
      offset += width;
    }
  }
  return new Blob([bytes], { type: 'audio/wav' });
}
