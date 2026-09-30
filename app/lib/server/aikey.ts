/**
 * Whether the copilot key is not merely *set* but actually *accepted*.
 *
 * ── The fault this exists for ────────────────────────────────────────────
 *
 * Carli, 30 September 2026, with a screenshot of the Make tab: *"Copilot
 * doesnt want to work."* Twice, she asked for an eight-second shot; twice the
 * room answered **"The key this app uses was rejected. Nothing has been
 * charged."**
 *
 * That sentence comes from exactly one place — `aiFault` seeing an
 * `Anthropic.AuthenticationError` — so it says something precise: the key is
 * present, and Anthropic refused it. A missing key gives the other sentence,
 * "switched off for this app", from the `!process.env.ANTHROPIC_API_KEY`
 * guard every one of those routes runs first.
 *
 * And yet ten routes answered `GET` with:
 *
 *     { available: Boolean(process.env.ANTHROPIC_API_KEY) }
 *
 * **true**, for a key the supplier was refusing on every single call. Every
 * screen that asks "is the copilot available" was told yes, offered the
 * button, and sent her into a 502 — twice, because nothing on screen gave her
 * any reason to think it would fail the second time either.
 *
 * `Boolean(process.env.X)` measures whether somebody pasted something into
 * Vercel. It does not measure whether the thing they pasted works. That is the
 * same gap as a green check sitting next to the thing it is meant to test, and
 * it is the one this repository keeps meeting.
 *
 * ── What this does, and what it deliberately does not ────────────────────
 *
 * It remembers a refusal. The first call that comes back 401 flips this, and
 * from then on the rooms say the copilot is off rather than offering a button
 * that cannot work.
 *
 * It does **not** probe Anthropic to find out in advance. A validity call on
 * every availability check is a request per screen per load, to answer a
 * question whose answer changes about once a year. The first caller after a
 * bad key is deployed still meets the error — what changes is that the second
 * one does not, and that the owner is told.
 *
 * It resets on a cold start, and that is correct rather than a limitation:
 * a new deployment, or a key fixed in Vercel, starts fresh instances, so the
 * memory of a refusal cannot outlive the key that earned it.
 */

/**
 * Set once the supplier has refused this key.
 *
 * Module state, so it lives as long as the serverless instance does. Not a
 * database row: a wrong key is the owner's to fix in Vercel within minutes,
 * and a row would outlive the fix and need clearing by hand.
 */
let refused = false;

/** Called when the supplier answers 401. Idempotent, and never throws. */
export function noteKeyRefused(): void {
  if (refused) return;
  refused = true;
  /* The owner's line, not the member's. `aifault.ts` already logs this way
     for an empty balance, and for the same reason: the screen tells the
     member it is not their fault, and this is how the person who can fix it
     finds out which of the two it was. */
  console.error(
    'ai: ANTHROPIC_API_KEY is set but the supplier rejected it — the copilot is off ' +
      'in every room until the key in Vercel is replaced. A revoked key, a key with ' +
      'whitespace in it, or a Claude Code OAuth token pasted where an API key belongs ' +
      'all look exactly like this.',
  );
}

/**
 * Whether a room may offer the copilot.
 *
 * The answer every `GET` on an AI route should give, in place of
 * `Boolean(process.env.ANTHROPIC_API_KEY)`.
 */
export function copilotAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY) && !refused;
}
