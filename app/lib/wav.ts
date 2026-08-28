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

/** A 16-bit PCM WAV of a buffer. The one format every browser plays back. */
/** Anything outside ±1 would wrap around and click. */
function clamp(value: number): number {
  return value > 1 ? 1 : value < -1 ? -1 : value;
}

export function encodeWav(buffer: AudioBuffer): Blob {
  const channels = Math.min(2, buffer.numberOfChannels);
  const frames = buffer.length;
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
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, frames * channels * 2, true);

  let offset = 44;
  const data: Float32Array[] = [];
  for (let c = 0; c < channels; c += 1) data.push(buffer.getChannelData(c));
  for (let i = 0; i < frames; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const sample = clamp(data[c][i]);
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([bytes], { type: 'audio/wav' });
}
