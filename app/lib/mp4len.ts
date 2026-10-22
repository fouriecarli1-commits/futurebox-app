/**
 * How long an MP4 (or MOV, M4A) is, read from its own header.
 *
 * Every MP4 states its length in the `mvhd` box inside `moov`: a timescale
 * (ticks per second) and a duration in those ticks. The box sits at the
 * front of a file written for streaming and at the end of one written by a
 * camera or a recorder, so both ends are looked at. Found by its four
 * letters rather than by walking the box tree from the top: the tree can be
 * cut off at either end of what was read, and the letters cannot lie about
 * where the numbers are.
 *
 * Pure, so it can be tested on bytes; `server/audiolen.ts` reads the bytes.
 */

/** Seconds, or null when no believable `mvhd` is in these bytes. */
export function mp4Seconds(bytes: Uint8Array): number | null {
  for (let at = 4; at + 4 <= bytes.length; at += 1) {
    if (bytes[at] !== 0x6d || bytes[at + 1] !== 0x76 || bytes[at + 2] !== 0x68 || bytes[at + 3] !== 0x64) continue;
    const box = at + 4;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (box + 4 > bytes.length) return null;
    const version = bytes[box];
    let scale: number;
    let length: number;
    if (version === 1) {
      if (box + 4 + 28 > bytes.length) return null;
      scale = view.getUint32(box + 4 + 16);
      length = Number(view.getBigUint64(box + 4 + 20));
    } else if (version === 0) {
      if (box + 4 + 16 > bytes.length) return null;
      scale = view.getUint32(box + 4 + 8);
      length = view.getUint32(box + 4 + 12);
    } else {
      continue;
    }
    if (!scale || !Number.isFinite(length)) continue;
    const seconds = length / scale;
    /* Under a day, and something: a stray "mvhd" inside media data would
       otherwise be read as a film a thousand years long. */
    if (seconds > 0 && seconds < 86_400) return seconds;
  }
  return null;
}
