/**
 * How long a piece of audio is, for the purpose of charging for it.
 *
 * Four jobs in this app send a whole file to ElevenLabs and are billed by the
 * minute of it: transcribing, taking the room out, saying it again in another
 * voice, and splitting it into stems. Until now each charged a flat two or
 * four credits however long the file was, which is fine for a thirty-second
 * take and is not fine at all for an hour-long recording — that one costs more
 * upstream than the whole month's plan and comes back charged at three rand.
 *
 * ── What can be trusted ─────────────────────────────────────────────────
 *
 * A WAV states its own length in its header, and the booth and the mixdown
 * both produce WAV, so for the files this app makes itself the server works it
 * out and takes nobody's word for it.
 *
 * Anything else — a webm from a browser recorder, an mp3 somebody uploaded —
 * cannot be measured here without a decoder, so the browser measures it and
 * says. That number could be wrong, by accident or on purpose, which is why
 * the caller also passes a ceiling: whatever is claimed, the charge is capped
 * at the longest file the route will accept, and the route's own size limit
 * bounds what can be sent in the first place. It is not a security boundary
 * and does not pretend to be one; it is an honest bill for an honest client
 * and a bounded loss for a dishonest one.
 */

import { wavSeconds } from '../pcmwav.ts';

/** Nothing is charged as less than this, so a two-second clip still costs. */
const FLOOR = 20;

export async function billedSeconds(
  audio: Blob,
  stated: number,
  ceiling: number,
): Promise<number> {
  // Enough for the header and any chunks in front of the samples.
  const head = new Uint8Array(await audio.slice(0, 4096).arrayBuffer());
  const exact = wavSeconds(head);
  if (exact !== null && exact > 0) return Math.min(Math.max(exact, FLOOR), ceiling);

  const said = Number.isFinite(stated) && stated > 0 ? stated : ceiling;
  return Math.min(Math.max(said, FLOOR), ceiling);
}
