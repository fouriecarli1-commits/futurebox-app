/**
 * The part of every prompt that never changes, sent once instead of every time.
 *
 * ── Where this came from ─────────────────────────────────────────────────
 *
 * Carli, 19 September 2026, on finding out the writing help had stopped
 * because the model account was empty: *"Ek het nie geweet Copilot gaan
 * betaald moet wees nie?"*
 *
 * Looking at what we were actually paying for, none of the eleven routes was
 * caching anything. Every press sent the whole fixed instruction block down
 * the wire at full price, word for word the same as the press before it. The
 * help desk was the worst of it: the entire terms and privacy policy —
 * roughly 24 000 characters — re-sent with every single question somebody
 * asked.
 *
 * ── What caching is, and what it is not ──────────────────────────────────
 *
 * A cache read costs about a tenth of a fresh read. A cache *write* costs
 * about a quarter more than not caching at all. So this is a bet, not a free
 * win: it pays from the second press onward that shares the same prefix
 * inside the five-minute window, and it costs 25% more for a press that
 * stands alone.
 *
 * That bet is right for the way a room is used — somebody in Make a song
 * presses the wand, then the copilot, then the writing help, within a minute
 * of each other — and it is worth saying out loud rather than assuming,
 * because the failure mode is silent (see below).
 *
 * ── The silent failure this file is built around ─────────────────────────
 *
 * A prompt shorter than the model's floor — 512 tokens on this model — will
 * not cache, and nothing says so. No error, no warning: the marker is
 * accepted and simply does nothing. Six of the eleven routes here are under
 * that floor today. A single changed character anywhere in the prefix fails
 * the same silent way.
 *
 * So a cache that never hits is indistinguishable from one that always does,
 * except on the bill. That is the whole reason `notecache` exists: the app
 * reads back what actually happened and says it, rather than us believing
 * the marker did something. Nobody may claim a saving from this file without
 * a log line showing `read` above zero.
 */

/**
 * The system prompt as a cached block.
 *
 * The text must be byte-for-byte identical between calls or the cache misses
 * — which means it has to be a module-level constant, never anything built
 * per request. `check:caching` enforces that; it is far too easy to slip a
 * name or a date into a prompt and quietly lose the whole saving.
 */
export function cachedSystem(text: string): Array<{
  readonly type: 'text';
  readonly text: string;
  readonly cache_control: { readonly type: 'ephemeral' };
}> {
  return [{ type: 'text', text, cache_control: { type: 'ephemeral' } }];
}

/** Below this, the model will not make a cache entry at all, and says nothing. */
export const FLOOR_TOKENS = 512;

interface Used {
  readonly input_tokens?: number | null;
  readonly output_tokens?: number | null;
  readonly cache_read_input_tokens?: number | null;
  readonly cache_creation_input_tokens?: number | null;
}

/**
 * Say what the cache actually did, per call.
 *
 * Three outcomes worth telling apart, and the third is the one that matters:
 *
 *   read  — the saving is real, and this line is the proof of it
 *   wrote — the first press of a burst, paying 25% extra to set the entry up
 *   neither — the marker did nothing. Either the prompt is under the floor,
 *             or something in the prefix changed between calls. This is the
 *             failure that costs money while looking exactly like success,
 *             so it is the one that gets the loud line.
 */
export function notecache(where: string, used: Used | null | undefined): void {
  const read = used?.cache_read_input_tokens ?? 0;
  const wrote = used?.cache_creation_input_tokens ?? 0;
  const fresh = used?.input_tokens ?? 0;
  if (read === 0 && wrote === 0) {
    console.warn(
      `ai cache: ${where} cached NOTHING — ${fresh} tokens billed fresh.`
      + ` Either the prompt is under ${FLOOR_TOKENS} tokens, or its prefix changed between calls.`,
    );
    return;
  }
  console.log(`ai cache: ${where} — read ${read}, wrote ${wrote}, fresh ${fresh}`);
}
