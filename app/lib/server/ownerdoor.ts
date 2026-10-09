/**
 * The door the owner's own pages are behind.
 *
 * ── Why this is one file and not thirteen copies ─────────────────────────
 *
 * A dozen routes in this app answer a question only Carli has any business
 * asking — what Google has on her project, what ElevenLabs charged, what the
 * cache saved — and every one of them had the same forty lines pasted into
 * it: a constant-time compare, three places to look for the secret, a 404
 * rather than a 403, and a signed-in owner allowed through with no secret at
 * all.
 *
 * Forty lines of security, copied. The copies had already drifted — some
 * read the `authorization` header, some did not — and the next one to drift
 * would be the one that matters, silently, because every one of them answers
 * `404` whether it refused correctly or by accident.
 *
 * So it is written once. A route asks `await opened(request)` and gets back
 * either a way in or the exact `Response` it should return.
 *
 * ── The three places a secret is looked for, and why ─────────────────────
 *
 * `searchParams.get` URL-DECODES. A secret containing a `+` — which any
 * base64-ish string can — arrives as a SPACE, and the comparison fails for a
 * secret that was typed perfectly. That failure is invisible: the answer is
 * 404, the same answer as a wrong secret, and somebody spends an afternoon
 * re-reading a value that was right.
 *
 * So the raw query text is tried as well, and the header for anything that
 * is not a browser. All three go through the constant-time compare; an
 * attacker learns nothing from three attempts at one string they already
 * sent.
 *
 * ── Why a signed-in owner needs no secret ────────────────────────────────
 *
 * Carli, 8 October 2026, on being told to open `?key=<POST_SECRET>`:
 * *"maar dan gaan ek nou weer 'n password weggee wat ek weer gaan moet
 * verander."*
 *
 * She is right. A secret in a query string is a secret in the browser
 * history, in the access log, and in any screenshot of the address bar —
 * which is exactly how her Google key had to be rotated an hour earlier. So
 * a signed-in owner gets in on her session, which travels in a header where
 * nothing logs it and which she has already.
 *
 * The secret stays for everything that is not a person: a terminal, a
 * script, a check.
 */

import crypto from 'node:crypto';
import { callerFrom, metered } from '@/app/lib/server/account';
import { isOwnerEmail } from '@/app/lib/server/owners';

/** Either the door is open, or here is the answer the route must give. */
export type Door =
  | { readonly open: true; readonly as: 'owner' | 'secret' }
  | { readonly open: false; readonly answer: Response };

function sameSecret(given: string, wanted: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(wanted);
  /* `timingSafeEqual` throws on a length mismatch, which is itself a leak. */
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Being signed in as the owner, which is the way a PERSON should get in. */
async function ownerOf(request: Request): Promise<boolean> {
  if (!metered()) return false;
  const caller = await callerFrom(request);
  return !!caller?.email && isOwnerEmail(caller.email);
}

export async function opened(request: Request): Promise<Door> {
  /* The person first, because it is the one that costs her nothing. */
  if (await ownerOf(request)) return { open: true, as: 'owner' };

  const wanted = process.env.POST_SECRET ?? '';
  if (!wanted) {
    return {
      open: false,
      answer: Response.json(
        { error: 'no_secret', message: 'Sign in as the owner, or set POST_SECRET.' },
        { status: 503 },
      ),
    };
  }
  const url = new URL(request.url);
  const tries = [
    url.searchParams.get('key') ?? '',
    /^.*?[?&]key=([^&]*).*$/.exec(url.search)?.[1] ?? '',
    (request.headers.get('authorization') ?? '').replace(/^Bearer /, ''),
  ].filter(Boolean);
  if (tries.some((one) => sameSecret(one, wanted))) return { open: true, as: 'secret' };

  /* 404 rather than 403: a 403 confirms the address is worth attacking. */
  return { open: false, answer: new Response('no', { status: 404 }) };
}
