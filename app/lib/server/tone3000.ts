/**
 * The TONE3000 sign-in, worked out rather than fetched.
 *
 * ── What is in here and what is not ──────────────────────────────────────
 *
 * Everything in this file is arithmetic and string work: making a PKCE pair,
 * building the address she is sent to, and reading what comes back. None of
 * it calls anybody, which is why it can be written and held to a check
 * before a single credential exists.
 *
 * What is NOT here: where the verifier, the state and the tokens are kept.
 * That decision touches the account tables and is worth making once, with
 * the credentials in hand, rather than guessed at now.
 *
 * ── Why this is server-side at all ───────────────────────────────────────
 *
 * TONE3000's own examples do this in the browser and keep the verifier and
 * both tokens in `sessionStorage`. For a purely client-side app that is the
 * right sample. For us it is not, and not out of tidiness: any XSS reads
 * `sessionStorage`, and a refresh token is not a session that expires in an
 * hour — it is lasting access to somebody else's TONE3000 account. Their own
 * prose beside that sample says to store it securely.
 *
 * See `docs/TONE3000-API.md` for the whole chain and for the three questions
 * still with them.
 */

import { createHash, randomBytes } from 'node:crypto';

/**
 * Where their OAuth lives.
 *
 * The API host itself belongs to `suppliers.ts`. These two are the sign-in,
 * which is a different concern: no account credential passes through them,
 * they happen before any capability exists, and routing identity through a
 * capability router would be forcing it. Worth knowing that they share a
 * host with the API, so the day a TONE3000 entry lands in `SUPPLIERS`,
 * `check:seam` will see this file writing that host and say so. That is the
 * rule working, and the answer is a named exemption with this reason — not a
 * quiet edit to the rule.
 */
const AUTHORIZE = 'https://www.tone3000.com/api/v1/oauth/authorize';
export const TOKEN = 'https://www.tone3000.com/api/v1/oauth/token';

/**
 * What the cutting room asks for.
 *
 * `format=nam` because `lib/nam.ts` runs NAM captures, and the gears because
 * ProBooth's amp section is a guitar feature in its own words: *"most of what
 * a guitar recorded on a phone needs"*. `cab` and `space` are left out
 * because they are IR-shaped and nothing here loads an IR yet — see the note
 * in `docs/TONE3000-API.md` about how near that is.
 */
export const WANTS = { format: 'nam', gears: 'amp_amp-cab_pedal' } as const;

/** A verifier and the challenge derived from it. */
export interface Pkce {
  readonly verifier: string;
  readonly challenge: string;
  readonly state: string;
}

/** base64url: base64 with the two awkward characters swapped and no padding. */
function urlSafe(raw: Buffer): string {
  return raw.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * A fresh PKCE pair.
 *
 * Their sample builds the verifier from two `randomUUID()`s with the hyphens
 * stripped, which is 64 hex characters. This uses 64 random BYTES instead,
 * which is more entropy in fewer characters and is what RFC 7636 describes;
 * the hex-from-UUID shape carries about 128 bits where the bytes carry 512.
 * Both are legal — the verifier only has to be 43 to 128 unreserved
 * characters — and there is no reason to take the weaker one.
 */
export function pkce(): Pkce {
  const verifier = urlSafe(randomBytes(64));
  return {
    verifier,
    challenge: urlSafe(createHash('sha256').update(verifier).digest()),
    state: urlSafe(randomBytes(32)),
  };
}

/** Where to send her, for the flow that lets her browse and choose. */
export function selectUrl(opts: {
  readonly clientId: string;
  readonly redirectUri: string;
  readonly pkce: Pkce;
  /** Her language, because they ignore `Accept-Language` and say so. */
  readonly locale?: string;
}): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: 'code',
    code_challenge: opts.pkce.challenge,
    code_challenge_method: 'S256',
    state: opts.pkce.state,
    prompt: 'select_tone',
    format: WANTS.format,
    gears: WANTS.gears,
    /* A way out of their screens, which they recommend for in-app browsers,
       and the audition players — in an app about how things sound, hearing a
       capture before choosing it is not a nicety. */
    menubar: 'true',
    preview: 'true',
    ...(opts.locale ? { locale: opts.locale } : {}),
  });
  return `${AUTHORIZE}?${params}`;
}

/**
 * What came back, as one of four things rather than a bag of maybes.
 *
 * The three-way split on cancelling is theirs, not ours, and it is the part
 * that is easy to get wrong: pressing close in their menu bar returns
 * `canceled=true` INSTEAD of a tone, and a code may still be there if she had
 * already signed in. An app that sees `canceled` and simply returns throws
 * away a valid authorisation and asks her to sign in again tomorrow.
 */
export type CameBack =
  /** She chose one. */
  | { readonly how: 'chose'; readonly code: string; readonly toneId: string }
  /** She closed it, but is signed in — the code is still worth having. */
  | { readonly how: 'left'; readonly code: string }
  /** She closed it before signing in. Nothing to keep. */
  | { readonly how: 'gone' }
  /** Something was wrong, including a state that does not match. */
  | { readonly how: 'refused'; readonly why: string };

/**
 * Read the callback.
 *
 * `expected` is the state we sent, held server-side. It is checked FIRST and
 * before anything else is read, because that is what the check is for: a
 * mismatched state means this redirect may not be ours, and nothing in it
 * should be trusted — not the code, not the error, not the tone.
 */
export function cameBack(query: URLSearchParams, expected: string): CameBack {
  const state = query.get('state');
  if (!expected || state !== expected) {
    return { how: 'refused', why: 'state' };
  }

  const error = query.get('error');
  if (error) return { how: 'refused', why: error };

  const code = query.get('code');
  const toneId = query.get('tone_id');

  if (query.get('canceled') === 'true') {
    return code ? { how: 'left', code } : { how: 'gone' };
  }
  if (!code) return { how: 'gone' };
  /* No tone and not cancelled is a plain sign-in, which the standard flow
     does and Select should not. Treated as leaving rather than as choosing,
     because the one thing it must not do is hand the room an empty tone id. */
  if (!toneId) return { how: 'left', code };

  return { how: 'chose', code, toneId };
}

/** The body that trades the code for tokens. Form-encoded, as they ask. */
export function tradeFor(opts: {
  readonly code: string;
  readonly verifier: string;
  readonly redirectUri: string;
  readonly clientId: string;
}): URLSearchParams {
  return new URLSearchParams({
    grant_type: 'authorization_code',
    code: opts.code,
    code_verifier: opts.verifier,
    redirect_uri: opts.redirectUri,
    client_id: opts.clientId,
  });
}

/** And the body that renews one. Their refresh rotates: keep what comes back. */
export function renewWith(opts: {
  readonly refresh: string;
  readonly clientId: string;
}): URLSearchParams {
  return new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: opts.refresh,
    client_id: opts.clientId,
  });
}
