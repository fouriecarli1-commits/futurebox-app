/**
 * Reading a zip, because that is what comes back.
 *
 * ElevenLabs' stem separation answers with a zip archive holding one audio
 * file per stem, so getting at the instrumental means opening it. A whole zip
 * library is a lot of dependency for that, and this needs exactly one
 * direction of exactly two of the format's features: stored entries and
 * deflated ones. Node's zlib does the second, so what is left is the index.
 *
 * It reads the central directory at the end of the file rather than walking
 * the local headers from the front. That is the right way round: a local
 * header is allowed to say the sizes are "in the trailer", in which case
 * walking forwards means guessing where the next entry begins, while the
 * central directory always carries the real sizes and offsets.
 */

import { inflateRawSync } from 'zlib';

export interface Entry {
  readonly name: string;
  readonly bytes: Buffer;
}

/** End of central directory: the anchor everything else is found from. */
const END_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

function findEnd(buffer: Buffer): number {
  // It is at the end, but a zip comment can follow it, so it is searched for
  // backwards. The comment length is two bytes, so it cannot be further than
  // 22 + 65535 from the end.
  const earliest = Math.max(0, buffer.length - 22 - 0xffff);
  for (let at = buffer.length - 22; at >= earliest; at -= 1) {
    if (buffer.readUInt32LE(at) === END_SIGNATURE) return at;
  }
  return -1;
}

/**
 * Every file in the archive. An empty list means it was not a zip, which the
 * caller has to handle: an upstream that changes what it returns should say
 * something useful rather than throw a parse error at somebody singing.
 */
export function unzip(buffer: Buffer): Entry[] {
  if (buffer.length < 22) return [];
  const end = findEnd(buffer);
  if (end < 0) return [];

  const count = buffer.readUInt16LE(end + 10);
  let at = buffer.readUInt32LE(end + 16);
  const out: Entry[] = [];

  for (let n = 0; n < count; n += 1) {
    if (at + 46 > buffer.length || buffer.readUInt32LE(at) !== CENTRAL_SIGNATURE) break;
    const method = buffer.readUInt16LE(at + 10);
    const compressed = buffer.readUInt32LE(at + 20);
    const nameLength = buffer.readUInt16LE(at + 28);
    const extraLength = buffer.readUInt16LE(at + 30);
    const commentLength = buffer.readUInt16LE(at + 32);
    const localAt = buffer.readUInt32LE(at + 42);
    const name = buffer.toString('utf8', at + 46, at + 46 + nameLength);
    at += 46 + nameLength + extraLength + commentLength;

    // A directory, not a file.
    if (name.endsWith('/')) continue;
    if (localAt + 30 > buffer.length || buffer.readUInt32LE(localAt) !== LOCAL_SIGNATURE) continue;

    // The local header's own name and extra lengths, which are allowed to
    // differ from the central directory's, decide where the data starts.
    const localName = buffer.readUInt16LE(localAt + 26);
    const localExtra = buffer.readUInt16LE(localAt + 28);
    const from = localAt + 30 + localName + localExtra;
    const raw = buffer.subarray(from, from + compressed);

    try {
      out.push({ name, bytes: method === 0 ? Buffer.from(raw) : inflateRawSync(raw) });
    } catch {
      // One unreadable entry should not lose the others.
    }
  }
  return out;
}

/**
 * The entry whose name looks like one of these words.
 *
 * Matched on the file name rather than on position, because position in a zip
 * is not a promise. The names themselves are not documented anywhere I could
 * reach, so several spellings of the same idea are accepted.
 */
export function pick(entries: readonly Entry[], words: readonly string[]): Entry | null {
  for (const word of words) {
    const wanted = word.toLowerCase();
    const found = entries.find((entry) => entry.name.toLowerCase().includes(wanted));
    if (found) return found;
  }
  return null;
}
