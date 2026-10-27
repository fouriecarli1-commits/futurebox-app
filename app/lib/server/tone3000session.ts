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
import {
  API, cameBack, isTheirs, modelsPath, pkce, selectUrl, tradeFor, TOKEN, type CameBack,
} from './tone3000';

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

export interface TokenAnswer {
  readonly access_token?: string;
  readonly refresh_token?: string;
  readonly expires_in?: number;
}

/**
 * What to store for a token answer, or nothing when there is nothing to store.
 *
 * ── Why a refresh token is not required ──────────────────────────────────
 *
 * The owner, 11 October 2026, after the tables were created and the sign-in went
 * through: *"tone3000 werk nogsteeds nie"* — amps still would not come.
 *
 * This refused the WHOLE sign-in unless the answer carried a refresh token:
 *
 *     if (!got.access_token || !got.refresh_token) return refused
 *
 * We never ask for one. The authorisation request sends no `scope` at all,
 * and a provider that only issues refresh tokens for an offline scope — most
 * of them — answers with an access token and nothing else. Which is a
 * perfectly good hour of access, thrown away.
 *
 * And thrown away for a renewal that does not happen: `renewWith()` builds
 * the body for one and is called from nowhere in this app. So the old rule
 * traded a working sign-in for a capability we do not have.
 *
 * From the outside that is indistinguishable from the fault it was confused
 * with for two days — the sign-in succeeds, their page sends her back, the
 * row is never written, and every amp afterwards says *"sign in to TONE3000
 * again"*. Three different causes with one symptom, which is why the
 * callback now says `why=` in the address and why this is a function on its
 * own rather than a condition inside a sixty-line handler.
 *
 * So: an access token is the requirement. A refresh token is kept when it
 * comes and is null when it does not — `tone3000.sql` drops the NOT NULL for
 * exactly this, because a column that refuses the row is the same refusal
 * one layer down.
 *
 * @param now injected so a check can assert the expiry rather than race it.
 */
export function tokenRow(owner: string, got: TokenAnswer, now = Date.now()): {
  readonly owner: string;
  readonly access: string;
  readonly refresh: string | null;
  readonly dies_at: string;
  readonly updated_at: string;
} | null {
  if (!got.access_token) return null;
  /* An hour when they do not say. Short rather than generous on purpose: a
     guess that is too long means a token believed good and refused at the
     supplier, which reads as their outage rather than as our arithmetic. */
  const lasts = Number(got.expires_in) > 0 ? Number(got.expires_in) : 3600;
  return {
    owner,
    access: got.access_token,
    refresh: got.refresh_token ?? null,
    dies_at: new Date(now + lasts * 1000).toISOString(),
    updated_at: new Date(now).toISOString(),
  };
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

  const got = await answer.json() as TokenAnswer;
  const row = tokenRow(data.owner, got);
  if (!row) return { how: 'refused', why: 'exchange' };

  const { error } = await client.from('tone3000_tokens').upsert(row);
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


/**
 * The chosen tone, as a capture `lib/nam.ts` can load.
 *
 * ── One model at a time, the way they asked ──────────────────────────────
 *
 * Until 27 October this asked `GET /tones/{id}/download` for a zip of the
 * whole tone. Their API page says that route is for approved partners only
 * and answers 403 to everybody else, and their support asked on 13 October
 * for the per-model route instead. So: list the tone's models, take the
 * first NAM capture (an IR has no architecture and is passed over), and
 * fetch that one file by its `model_url`, with her token, because their page
 * says to pass it. The token goes to their own host and nowhere else
 * (`isTheirs`): a `model_url` that pointed anywhere else would be fetched
 * bare, so a member's sign-in can never end up on somebody else's server.
 */
export type Fetched =
  | { readonly how: 'got'; readonly name: string; readonly nam: string }
  /**
   * `status` is THEIR status code, carried out rather than swallowed.
   *
   * "TONE3000 refused the download" is six words that cover a 401, a 403, a
   * 429 and a 500 — a sign-in that is not what we think it is, a scope we
   * never asked for, too many tries, and their server having a bad minute.
   * Four different problems, four different answers, and from here they all
   * read the same. The owner hit this on 6 October with the whole journey
   * otherwise working.
   */
  | { readonly how: 'no'; readonly why: string; readonly status?: number };

export async function captureFor(owner: string, toneId: string): Promise<Fetched> {
  const client = admin();
  if (!client) return { how: 'no', why: 'database' };

  const { data } = await client
    .from('tone3000_tokens')
    .select('access, dies_at')
    .eq('owner', owner)
    .maybeSingle();
  if (!data?.access) return { how: 'no', why: 'signin' };
  /* Said rather than attempted. An expired token comes back as a 401 whose
     message is about authorisation, which reads like our own key being wrong
     — and the answer is for her to sign in to TONE3000 again, which only
     this branch can say. Renewal is `renewWith()` and is not wired yet. */
  if (new Date(data.dies_at).getTime() <= Date.now()) return { how: 'no', why: 'expired' };

  return captureWith(data.access, toneId);
}

/**
 * The two fetches, with the token handed in.
 *
 * Split from `captureFor` so a check can open it. The rule worth proving is
 * which call carries the credential and where it may go, and a function that
 * reads the database first cannot be opened without one.
 */
export async function captureWith(access: string, toneId: string): Promise<Fetched> {
  const listed = await fetch(`${API}${modelsPath(toneId)}`, {
    headers: { Authorization: `Bearer ${access}` },
  });
  if (!listed.ok) {
    return { how: 'no', why: listed.status === 404 ? 'gone' : 'refused', status: listed.status };
  }
  const said = await listed.json().catch(() => null) as { data?: { model_url?: unknown; name?: unknown; architecture_version?: unknown }[] } | null;
  const model = (said?.data ?? []).find((one) => typeof one.model_url === 'string' && one.architecture_version !== null && one.architecture_version !== '2');
  if (!model || typeof model.model_url !== 'string') return { how: 'no', why: 'nonam' };

  const file = await fetch(model.model_url, isTheirs(model.model_url) ? { headers: { Authorization: `Bearer ${access}` } } : {});
  if (!file.ok) return { how: 'no', why: 'store', status: file.status };
  const nam = await file.text();
  const name = typeof model.name === 'string' && model.name.trim() ? model.name.trim().slice(0, 80) : `Tone ${toneId}`;
  return { how: 'got', name, nam };
}
