/**
 * How long an MP3 is, from its own frames.
 *
 * Every MPEG audio frame starts with a header that names its bitrate and
 * sample rate. A variable-bitrate file says how many frames it has in a Xing
 * (or Info, or VBRI) header inside the first frame, and that count is exact;
 * a constant-bitrate file — which is what the voice engines send — is its
 * size over its bitrate. A leading ID3 tag is skipped first, and a frame is
 * only believed when the next one starts where it says it ends, so a stray
 * pair of 0xFF bytes in a tag or a picture is not read as the start of sound.
 *
 * Pure: `server/audiolen.ts` reads the bytes and the size.
 */

const BITRATES_V1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const BITRATES_V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const RATES: Record<number, number[]> = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

interface Frame { readonly bitrate: number; readonly rate: number; readonly length: number; readonly samples: number; readonly v1: boolean; readonly mono: boolean }

/** A Layer III frame header at `at`, or null. */
function frameAt(bytes: Uint8Array, at: number): Frame | null {
  if (at + 4 > bytes.length) return null;
  if (bytes[at] !== 0xff || (bytes[at + 1] & 0xe0) !== 0xe0) return null;
  const version = (bytes[at + 1] >> 3) & 0b11;
  const layer = (bytes[at + 1] >> 1) & 0b11;
  if (version === 1 || layer !== 0b01) return null;
  const v1 = version === 3;
  const bitrate = (v1 ? BITRATES_V1 : BITRATES_V2)[(bytes[at + 2] >> 4) & 0x0f] ?? 0;
  const rate = RATES[version]?.[(bytes[at + 2] >> 2) & 0b11] ?? 0;
  if (!bitrate || !rate) return null;
  const padding = (bytes[at + 2] >> 1) & 1;
  const samples = v1 ? 1152 : 576;
  const length = Math.floor(((samples / 8) * bitrate * 1000) / rate) + padding;
  const mono = ((bytes[at + 3] >> 6) & 0b11) === 0b11;
  return { bitrate, rate, length, samples, v1, mono };
}

/** Seconds, or null when these bytes do not open like an MP3. */
export function mp3Seconds(bytes: Uint8Array, size: number): number | null {
  let start = 0;
  if (bytes.length >= 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const tag = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
    start = 10 + tag + ((bytes[5] & 0x10) ? 10 : 0);
  }
  for (let at = start; at + 4 <= bytes.length && at < start + 64 * 1024; at += 1) {
    const frame = frameAt(bytes, at);
    if (!frame) continue;
    const next = frameAt(bytes, at + frame.length);
    if (!next && at + frame.length + 4 <= bytes.length) continue;

    const side = frame.v1 ? (frame.mono ? 17 : 32) : (frame.mono ? 9 : 17);
    const tagAt = at + 4 + side;
    const word = String.fromCharCode(...bytes.subarray(tagAt, tagAt + 4));
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if ((word === 'Xing' || word === 'Info') && tagAt + 12 <= bytes.length && (view.getUint32(tagAt + 4) & 1)) {
      const frames = view.getUint32(tagAt + 8);
      if (frames > 0) return (frames * frame.samples) / frame.rate;
    }
    const vbriAt = at + 4 + 32;
    if (String.fromCharCode(...bytes.subarray(vbriAt, vbriAt + 4)) === 'VBRI' && vbriAt + 18 <= bytes.length) {
      const frames = view.getUint32(vbriAt + 14);
      if (frames > 0) return (frames * frame.samples) / frame.rate;
    }
    const seconds = ((size - at) * 8) / (frame.bitrate * 1000);
    return seconds > 0 && seconds < 86_400 ? seconds : null;
  }
  return null;
}
