/**
 * One answer for every way a call to the model can fail.
 *
 * ── The bug this fixes ───────────────────────────────────────────────────
 *
 * Carli sent a screenshot of the Make-a-song room. Under "Write the next bit",
 * where four written ideas belong, the app had printed this:
 *
 *     400 {"type":"error","error":{"type":"invalid_request_error","message":
 *     "Your credit balance is too low to access the Anthropic API. Please go
 *     to Plans & Billing to upgrade or purchase credits."},"request_id":
 *     "req_011CfCoJoSkHDHCbJh3N6rhE..."
 *
 * Three separate faults in one line of screen:
 *
 *   1. A member is reading a supplier's console error. It is in English in an
 *      Afrikaans room, it names a billing page they have no account on, and
 *      it tells them to go and buy credits that are not theirs to buy.
 *   2. It carries a request_id. That is ours, it identifies our account's
 *      traffic, and it has no business on somebody else's phone.
 *   3. It says nothing true to the person reading it. What is true is "the
 *      writing help is off right now, through nothing you did" — and the
 *      owner needs to know it is the balance, not the code.
 *
 * The route did it with one line: `detail: \`${error.status}: ${error.message}\``.
 *
 * ── Why a shared function rather than a fix in that route ────────────────
 *
 * Ten routes call the model, each with its own hand-written catch. Nine were
 * already safe; one was not, and nothing stopped the tenth being written the
 * same way tomorrow. A fault map that every route shares is the only version
 * of this fix that stays fixed, and `check:aifault` fails the build if a route
 * calls Anthropic and catches it itself.
 *
 * ── An empty balance is its own answer ───────────────────────────────────
 *
 * `no_credit` is not cosmetic. An empty balance arrives as a 400
 * invalid_request_error — the same class as a malformed request — so without
 * matching it the room says "that request could not be read" over a request
 * that was perfectly fine. That sentence sends the owner to look for a bug in
 * their own code. The honest answer names the balance, tells the member it is
 * not theirs and that nothing was charged, and leaves the fixing to the owner.
 *
 * The match is on the supplier's wording, which can change. That is why the
 * fallback below it is a safe generic and not a throw: a reworded billing
 * error degrades to "could not be reached", never to a leak.
 */
import Anthropic from '@anthropic-ai/sdk';

/**
 * Whether this failure is an empty account rather than a bad request.
 *
 * Read the words, answer with a boolean, and let nothing out of this function
 * but that boolean — the message itself must not reach a caller.
 */
function outOfCredit(error: InstanceType<typeof Anthropic.APIError>): boolean {
  const said = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  if (said.includes('credit balance is too low')) return true;
  if (said.includes('billing') && said.includes('upgrade')) return true;
  return false;
}

/**
 * The refusal to send back when a model call throws.
 *
 * `reached` is the room's own "could not be reached" sentence — the only part
 * that differs per route, and the only English the client falls back to when
 * `refusalText` has no words of its own for the code.
 *
 * Nothing the supplier wrote is ever copied into the body. The code is what
 * the client reads; the sentence beside it is ours.
 */
export function aiFault(error: unknown, reached: string): Response {
  if (error instanceof Anthropic.AuthenticationError) {
    return Response.json(
      { error: 'bad_key', message: 'The key this app uses was rejected. Nothing has been charged.' },
      { status: 502 },
    );
  }
  if (error instanceof Anthropic.RateLimitError) {
    return Response.json(
      { error: 'rate_limited', message: 'Too many at once. Try again in a moment.' },
      { status: 429 },
    );
  }
  if (error instanceof Anthropic.APIError) {
    if (outOfCredit(error)) {
      /* Logged because this one is the owner's to act on and nobody else's.
         The member's screen says it is not their fault; this line is how the
         owner finds out it is the balance and not the code. */
      console.error('ai: the writing help is off — the model account has no credit left');
      return Response.json(
        {
          error: 'no_credit',
          message: 'The writing help is switched off right now. Nothing you did caused it and nothing has been charged.',
        },
        { status: 503 },
      );
    }
    if (error instanceof Anthropic.BadRequestError) {
      return Response.json({ error: 'bad_request', message: 'That request could not be read.' }, { status: 400 });
    }
    return Response.json({ error: 'api_error', message: reached }, { status: 502 });
  }
  return Response.json({ error: 'unknown', message: reached }, { status: 502 });
}
