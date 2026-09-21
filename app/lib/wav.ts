/**
 * Writing an AudioBuffer out as a file every browser can play.
 *
 * Sixteen-bit PCM WAV, because it is the one container that needs no encoder,
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
 * Carli, 21 September 2026: *"Mono/stereo/dolby surround. Download type."*
 * The arithmetic is in `lib/channels.ts`, where a check can put numbers
 * through it; this only writes what comes back. Absent means stereo, which
 * is what every existing caller meant and still gets.
 */
export function encodeWav(buffer: AudioBuffer, layout: Layout = 'stereo'): Blob {
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
  return writeWav(folded, buffer.sampleRate);
}

/** The bytes, from channels that are already in the layout they will be in. */
export function writeWav(data: readonly Float32Array[], sampleRate: number): Blob {
  const channels = data.length;
  const frames = data[0]?.length ?? 0;
  const bytes = new ArrayBuffer(44 + frames * channels * 2);
  const view = new DataView(bytes);

  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };

  text(0, 'RIFF');
  view.setUint32(4, 36 + frames * channels * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, frames * channels * 2, true);

  let offset = 44;
  for (let i = 0; i < frames; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const sample = clamp(data[c][i]);
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([bytes], { type: 'audio/wav' });
}

