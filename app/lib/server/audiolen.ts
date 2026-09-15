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

/**
 * How long it is, when that can be known — for refusing rather than charging.
 *
 * `billedSeconds` clamps to a ceiling and falls back to that ceiling when it
 * has nothing to go on, which is right for a bill (the bounded loss above)
 * and wrong for a refusal: a file whose length nobody knows would be refused
 * as too long. So this returns `null` in that case and the caller lets it
 * through, which is the same position we were in before the check existed.
 *
 * Exact for a WAV, because the header says so. Otherwise the browser's
 * number, which can be wrong — but a client that understates its length to
 * slip past an upstream ceiling only earns itself the upstream's own error,
 * so there is nothing to defend here.
 */
export async function knownSeconds(audio: Blob, stated: number): Promise<number | null> {
  const head = new Uint8Array(await audio.slice(0, 4096).arrayBuffer());
  const exact = wavSeconds(head);
  if (exact !== null && exact > 0) return exact;
  return Number.isFinite(stated) && stated > 0 ? stated : null;
}

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
