/**
 * The TONE3000 handshake where it touches the database.
 *
 * `tone3000.ts` is the arithmetic — making a PKCE pair, building the address,
 * reading the callback. This file is the half that remembers: who started a
 * handshake, with which verifier, and what came back.
 *
 * ── The constraint that shapes all of it ─────────────────────────────────
 *
 * An OAuth callback is a BROWSER REDIRECT. TONE3000 sends her back to our
 * address, and that request carries no `Authorization` header — browsers do
 * not add one to a redirect. This app knows exactly one way to tell who is
 * asking, `callerFrom(request)`, and it reads only a Bearer token. There is
 * no cookie session anywhere, on purpose.
 *
 * So the callback cannot ask who she is. The only thing joining the return
 * to the departure is the `state`, which makes it two things at once: the
 * CSRF check, and the thread saying whose handshake this is. That is not a
 * clever reuse — it is what is left when there is no cookie, and it is the
 * reason `cameBack()` tests the state before it reads anything else.
 *
 * ── What is deliberately not here ────────────────────────────────────────
 *
 * Refreshing. `renewWith()` builds the body and `tone3000.sql` has a column
 * for the rotated token, but nothing calls it yet, because nothing yet makes
 * a call old enough to need it. Writing the refresh path now would mean
 * writing a path no check can execute against a real expiry.
 */

import { admin } from './account';
import { resolveSurfaceId } from '../surfaces';
import { wrote } from './wrote';
import { cameBack, pkce, selectUrl, tradeFor, TOKEN, type CameBack } from './tone3000';

/**
 * The publishable key, read by its literal name.
 *
 * `NEXT_PUBLIC_` is correct here and would be a mistake on a secret: in
 * Next.js that prefix bakes the value into the JavaScript every visitor
 * downloads. This value is published by design — TONE3000 call it the
 * publishable key and say it is safe in a browser.
 */
export function clientId(): string {
  return process.env.NEXT_PUBLIC_TONE3000_CLIENT_ID ?? '';
}

/** Whether the handshake can run at all. */
export function ready(): boolean {
  return Boolean(clientId());
}

/**
 * Where TONE3000 sends her back.
 *
 * Taken from the request rather than from `SITE_HOST` so it matches whichever
 * of the registered hosts she is actually on — the domain or the vercel.app
 * address — without a second variable to keep in step. OAuth requires the
 * value to be IDENTICAL at the start and at the exchange, which is why both
 * ends call this one function instead of writing the string twice.
 *
 * A forged `Host` header could change it. That is not a hole here, because
 * TONE3000 only redirect to addresses on the allow-list in their settings:
 * a host we did not register is refused by them. Which is the whole reason
 * that list is filled in rather than left empty.
 */
export function backTo(request: Request): string {
  return `${new URL(request.url).origin}/api/tone3000/callback`;
}

/** Where she lands in the app afterwards, with a word about how it went. */
export function intoApp(request: Request, said: Record<string, string>): string {
  const at = new URL(request.url).origin;
  return `${at}/?${new URLSearchParams(said)}`;
}

/**
 * Start a handshake: remember the verifier against a fresh state, and say
 * where to send her.
 *
 * The row is written BEFORE she leaves. Written after, a fast return beats
 * our own insert and the callback finds nothing — which would read as a
 * mismatched state, meaning the one failure that looks exactly like an
 * attack is our own race.
 */
export async function begin(
  request: Request,
  owner: string,
  locale?: string,
  /**
   * The room she pressed the button in, so the callback can put her back.
   *
   * Resolved here rather than stored raw: whatever arrives becomes a real
   * room id or nothing. The value makes a round trip through somebody else's
   * service and comes back into an address we redirect a browser to, so the
   * one thing it must not be is a string we never looked at.
   */
  room?: string,
): Promise<{ readonly url: string } | { readonly why: string }> {
  const client = admin();
  if (!client) return { why: 'database' };
  if (!ready()) return { why: 'unconfigured' };

  const made = pkce();
  const { error } = await client
    .from('tone3000_pending')
    .insert({
      state: made.state,
      owner,
      verifier: made.verifier,
      room: resolveSurfaceId(room ?? '') ?? null,
    });
  if (error) return { why: 'database' };

  return {
    url: selectUrl({
      clientId: clientId(),
      redirectUri: backTo(request),
      pkce: made,
      locale,
    }),
  };
}

/** What the callback worked out, for the route to turn into a redirect. */
export type Landed =
  | { readonly how: 'chose'; readonly toneId: string; readonly room?: string }
  | { readonly how: 'left'; readonly room?: string }
  | { readonly how: 'gone' }
  | { readonly how: 'refused'; readonly why: string };

/**
 * What the four outcomes say in the address she lands on.
 *
 * Pulled out of the route so a check can execute it. In the route it was
 * three nested conditionals that no check could reach without standing up a
 * browser redirect, which is how a mapping ends up with a case nobody has
 * ever seen — and one of these four is the case nobody sees: `af`, the
 * closed window that still carried a usable authorisation.
 *
 * Deliberately terse. `?t3k=no&why=state` is all the address carries: a
 * message that told apart "no such state" from "a state belonging to
 * somebody else" would be a message written for whoever is testing the lock.
 */
export function landing(landed: Landed): Record<string, string> {
  /* The room rides along on the two outcomes that have something to show.
     Not on `gone` or `refused`: moving her into a room to tell her nothing
     happened is worse than leaving her where she is. */
  const back: Record<string, string> = 'room' in landed && landed.room ? { room: landed.room } : {};
  if (landed.how === 'chose') return { t3k: 'ja', tone: landed.toneId, ...back };
  if (landed.how === 'left') return { t3k: 'af', ...back };
  if (landed.how === 'gone') return { t3k: 'weg' };
  return { t3k: 'no', why: landed.why };
}

/**
 * Finish a handshake.
 *
 * The pending row is looked up by state and DELETED in the same step,
 * whatever the outcome. A state is good once: left behind, it is a replayable
 * authorisation and a verifier lying around. Deleted even when the answer is
 * `gone`, because a handshake she walked away from is still finished.
 */
export async function finish(
  query: URLSearchParams,
  /**
   * The SAME address we sent at the start. OAuth requires the exchange to
   * repeat it exactly, and TONE3000 do not send it back in the callback — it
   * has to be rebuilt, which is why both ends go through `backTo()`. Read
   * from the callback query instead, as the first draft did, it would simply
   * be empty and the exchange would fail with an error about the code.
   */
  redirectUri: string,
): Promise<Landed> {
  const client = admin();
  if (!client) return { how: 'refused', why: 'database' };

  const state = query.get('state') ?? '';
  /* Nothing is read from the query before the row is found: a state we have
     never issued gets the same answer as one that does not match, and gets
     it without the error, the code or the tone being looked at. */
  const { data } = await client
    .from('tone3000_pending')
    .select('owner, verifier, room')
    .eq('state', state)
    .maybeSingle();
  if (!data) return { how: 'refused', why: 'state' };

  /* The answer is taken, not thrown away. A delete that quietly fails leaves
     a state that can be replayed and a verifier lying about — the two things
     this line exists to prevent. `tone3000_sweep()` would clear it within the
     quarter hour, but a failure here is worth seeing rather than waiting out.
     `check:writes` caught this discarded. */
  const cleared = await client.from('tone3000_pending').delete().eq('state', state);
  wrote(cleared, 'the finished TONE3000 handshake');

  const read: CameBack = cameBack(query, state);
  if (read.how === 'refused' || read.how === 'gone') return read;

  const answer = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: tradeFor({
      code: read.code,
      verifier: data.verifier,
      redirectUri,
      clientId: clientId(),
    }),
  });
  if (!answer.ok) return { how: 'refused', why: 'exchange' };

  const got = await answer.json() as {
    access_token?: string; refresh_token?: string; expires_in?: number;
  };
  if (!got.access_token || !got.refresh_token) {
    return { how: 'refused', why: 'exchange' };
  }

  const { error } = await client.from('tone3000_tokens').upsert({
    owner: data.owner,
    access: got.access_token,
    refresh: got.refresh_token,
    dies_at: new Date(Date.now() + (got.expires_in ?? 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) return { how: 'refused', why: 'database' };

  /* Resolved AGAIN on the way out, not trusted because we wrote it. The row
     is ours, but a value that is about to be interpolated into a redirect is
     checked where it is used — a column somebody can reach is a column
     somebody can set. */
  const room = resolveSurfaceId(data.room ?? '') ?? undefined;
  return read.how === 'chose'
    ? { how: 'chose', toneId: read.toneId, room }
    : { how: 'left', room };
}
