/**
 * A WAV header in front of raw PCM.
 *
 * `app/lib/wav.ts` already writes a WAV, but it takes an `AudioBuffer`, which
 * only exists in a browser. This is the other half of the same job: bytes that
 * arrived from somewhere already 16-bit and already at a known rate, needing
 * nothing but the forty-four bytes that make a player accept them.
 *
 * It exists because joining audio is where a long episode goes wrong. Two MP3
 * streams stuck together leave a seam you can hear and a duration in the header
 * that is a lie; two runs of raw PCM stuck together are one longer run of raw
 * PCM, exactly. So anything that has to be assembled from several requests asks
 * for PCM, concatenates, and puts a single header on the result — here.
 */

/** 16-bit mono, which is what the dialogue endpoint returns for `pcm_*`. */
const BITS = 16;

/** How long `bytes` of PCM lasts, in seconds. */
export function secondsOf(byteLength: number, rate: number, channels = 1): number {
  const perSecond = rate * channels * (BITS / 8);
  return perSecond > 0 ? byteLength / perSecond : 0;
}

/**
 * The same samples, with a header a player will accept.
 *
 * The four length fields are the ones worth getting right: `RIFF` carries
 * everything after itself, `data` carries only the samples, and the two are
 * thirty-six apart. Getting that pair wrong produces a file that plays and then
 * stops early, which is indistinguishable from audio that was cut short.
 */
export function wavOf(pcm: Uint8Array, rate: number, channels = 1): Uint8Array {
  const out = new Uint8Array(44 + pcm.length);
  const view = new DataView(out.buffer);
  const text = (at: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(at + i, value.charCodeAt(i));
  };
  const blockAlign = channels * (BITS / 8);

  text(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BITS, true);
  text(36, 'data');
  view.setUint32(40, pcm.length, true);
  out.set(pcm, 44);
  return out;
}

/** Several runs of PCM as one. Sample-exact, which is the whole point. */
export function joinPcm(parts: readonly Uint8Array[]): Uint8Array {
  let total = 0;
  for (const part of parts) total += part.length;
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
