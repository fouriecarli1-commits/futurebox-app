/**
 * Your account and your songs, kept somewhere other than one laptop.
 *
 * Everything in FutureBox works without this file. Tracks live in IndexedDB and
 * the app signs you in locally, which is fine until you open it on your phone
 * and your channel is empty. This is the layer that fixes that, using Supabase
 * for auth, a `tracks` row per song and a Storage bucket for the audio itself.
 *
 * It is optional by design. `configured()` answers false when the two public
 * environment variables are missing, and every caller checks before reaching
 * for it — so an unconfigured app behaves exactly as it did before, on-device
 * and offline, rather than erroring at you about a service you never set up.
 *
 * To turn it on:
 *   1. Make a project at supabase.com. The free tier is enough.
 *   2. Run `supabase/schema.sql` in the project's SQL editor. It creates the
 *      table, the bucket and the row-level policies that keep one person's
 *      songs out of another person's channel.
 *   3. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 *
 * The anon key is meant to be public — it is safe in the browser precisely
 * because the policies in the schema, not the key, decide what a request may
 * read or write. Never put the service-role key here.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Track } from './library';

const BUCKET = 'tracks';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

let client: SupabaseClient | null = null;

/** True when this deployment has a Supabase project behind it. */
export function configured(): boolean {
  return Boolean(url && anonKey);
}

function getClient(): SupabaseClient | null {
  if (!configured()) return null;
  if (!client) client = createClient(url, anonKey);
  return client;
}

/**
 * The language on the account, asked of the server rather than the session.
 *
 * ── Why not `currentAccount()` ───────────────────────────────────────────
 *
 * That reads `getSession()`, which is the token in this browser's storage and
 * carries the copy of `user_metadata` that was current when the session was
 * issued. On the device that made the change that is fine — the library
 * refreshes it in place. On a different device it is exactly wrong: the
 * session may predate the choice, so the one case this exists for is the one
 * case the cached copy cannot answer.
 *
 * `getUser()` asks the server. That is a network call, which is why it is a
 * separate function rather than a field on `currentAccount` — this is called
 * once, on a browser with nothing stored, and never on a hot path.
 *
 * Null means "no answer", not "English": a person who has never chosen and a
 * person whose account could not be reached are different, and only one of
 * them should stop this browser following its own guess.
 */
export async function accountLanguage(): Promise<'en' | 'af' | null> {
  const supabase = getClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    const said = (data.user?.user_metadata as { lang?: unknown } | undefined)?.lang;
    return said === 'af' || said === 'en' ? said : null;
  } catch {
    return null;
  }
}

/**
 * Remember which language somebody reads, against their account.
 *
 * ── Why the account and not just this browser ────────────────────────────
 *
 * `lib/i18n.tsx` keeps the choice in localStorage, which is right for the page
 * in front of them and useless to a server. A renewal receipt is sent months
 * later with no browser present at all — the payment webhook has a uuid and
 * nothing else — so every one of them went out in English whoever it was for.
 *
 * `user_metadata` is where a uuid can reach. It is not a table because there
 * is no per-account settings table here and one string does not earn a
 * migration, a policy and a second thing to keep in step; and because
 * `lib/server/email.ts` already fetches this user to find the address, so the
 * language rides along in a call the receipt path was making anyway.
 *
 * Quietly false when nobody is signed in. Somebody reading the landing page in
 * Afrikaans has no account to write to and has not done anything wrong.
 */
export async function rememberLanguage(lang: 'en' | 'af'): Promise<boolean> {
  const supabase = getClient();
  if (!supabase) return false;
  const account = await currentAccount();
  if (!account) return false;
  const { error } = await supabase.auth.updateUser({ data: { lang } });
  return !error;
}

/**
 * The storage half of the same client, for callers outside this file.
 *
 * `getClient` stays private because everything else here is a considered
 * operation — push a track, pull the audio, delete an account — and handing
 * the raw client out invites a query written somewhere the policies were not
 * thought about. Storage is the exception: a bucket's policies are the whole
 * of its access control, so `app/lib/avatar.ts` uploading with the person's
 * own session is exactly as safe as this file doing it, and one shared client
 * means one session rather than two that can disagree about who is signed in.
 */
export function getStorageClient(): SupabaseClient['storage'] | null {
  return getClient()?.storage ?? null;
}

export interface Account {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly handle: string;
  /**
   * Which language they read, when they have ever said.
   *
   * Undefined means nothing was ever chosen, which is different from English:
   * one is a person who has not been asked and the other is a person who
   * answered. `i18n.tsx` follows this only on a device with nothing stored, so
   * that difference decides whether a laptop opens in Afrikaans.
   */
  readonly lang?: 'en' | 'af';
}

function toAccount(user: {
  id: string;
  email?: string | null;
  user_metadata?: { lang?: unknown } | null;
}): Account {
  const email = user.email ?? '';
  const name = email.split('@')[0] || 'creator';
  const said = user.user_metadata?.lang;
  return {
    id: user.id,
    email,
    name,
    handle: `@${name}`,
    ...(said === 'af' || said === 'en' ? { lang: said } : {}),
  };
}

/** The signed-in account, or null. Null also when Supabase is not configured. */
export async function currentAccount(): Promise<Account | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  return user ? toAccount(user) : null;
}

/**
 * `account: null` with `ok: true` means the sign-up landed but there is no
 * session yet — Supabase is waiting on the confirmation email. That is not a
 * failure, and it is not being signed in either. Treating it as signed in is
 * exactly the bug this shape exists to prevent.
 */
/**
 * The current access token, for calling our own server routes.
 *
 * The routes that spend money verify this with Supabase before they spend
 * anything, so a request without it is treated as signed out rather than as
 * trusted. Null when there is no session — which is the honest answer, not an
 * error.
 */
export async function accessToken(): Promise<string | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export type AuthResult = { ok: true; account: Account | null } | { ok: false; message: string };

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const supabase = getClient();
  if (!supabase) return { ok: false, message: 'Accounts are not switched on for this app yet.' };
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, message: error.message };
  // With email confirmation on, Supabase still returns a user — but no session.
  // The session is what every later request is authorised by, so it, not the
  // user object, decides whether this person is signed in.
  return { ok: true, account: data.session?.user ? toAccount(data.session.user) : null };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const supabase = getClient();
  if (!supabase) return { ok: false, message: 'Accounts are not switched on for this app yet.' };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message };
  return { ok: true, account: data.user ? toAccount(data.user) : null };
}

/**
 * Signing in with a Google account.
 *
 * This is a redirect, not a request: the browser leaves for Google and comes
 * back to `redirectTo` with a session already in place, so there is nothing to
 * await and no account to hand back — `onAccountChange` fires on return and
 * every screen picks it up from there.
 *
 * It works only once Google is switched on as a provider in the Supabase
 * project, with this app's address in that project's redirect list. Until then
 * Supabase answers with a message saying exactly that, which is passed
 * straight through rather than replaced with a guess.
 */
/**
 * The query mark that says this page load is the end of a sign-in.
 *
 * A word rather than a token: it is not a secret and it grants nothing. All it
 * does is tell the app that the person in front of it has just arrived rather
 * than come back, which changes only what screen they land on.
 */
export const ARRIVED = 'welcome';

/**
 * Was this page load the return leg of a sign-in?
 *
 * Answers once and clears the mark out of the address bar, so a refresh or a
 * shared link does not re-trigger a welcome for somebody who has been here for
 * an hour.
 */
export function justArrived(): boolean {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  if (url.searchParams.get(ARRIVED) !== '1') return false;
  url.searchParams.delete(ARRIVED);
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  return true;
}

/**
 * The sign-ins this app knows how to draw, in the order they are offered.
 *
 * Ordered by who actually has one, not by preference: Google first because
 * most people are already signed into it on the device in their hand, Apple
 * second because on an iPhone it is the one that needs no typing, then
 * Facebook.
 *
 * A provider being listed here means this app can draw its button. Whether it
 * *works* is a separate question with a separate answer — see `providersOn`.
 */
export const PROVIDERS = ['google', 'apple', 'facebook'] as const;

export type Provider = (typeof PROVIDERS)[number];

/**
 * Which of them the Supabase project actually has switched on.
 *
 * Asked rather than assumed, and this is the whole reason the buttons are not
 * simply hard-coded. Every provider needs its own developer account, its own
 * client id and secret, and its own redirect list on the other company's
 * console — none of which this app can do for itself. A button for a provider
 * nobody has configured does not fail politely; it sends somebody out to a
 * consent screen that refuses them and drops them back with an error they
 * cannot act on.
 *
 * `/auth/v1/settings` is a public, unauthenticated endpoint on every Supabase
 * project that lists exactly this. Ask it once, draw what it says.
 *
 * A project that cannot be reached answers `[]` rather than a guess: no
 * buttons is a worse screen than three, and a broken one is worse than both.
 */
export async function providersOn(): Promise<Provider[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!response.ok) return [];
    const said = (await response.json()) as { external?: Record<string, unknown> };
    const on = said.external ?? {};
    return PROVIDERS.filter((one) => on[one] === true);
  } catch {
    return [];
  }
}

export async function signInWith(
  provider: Provider,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getClient();
  if (!supabase) return { ok: false, message: 'Accounts are not switched on for this app yet.' };
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      /* Back to wherever they started, not to a hard-coded address: this app
         runs on a preview domain and a real one, and a fixed redirect sends
         half the people to the wrong site after a successful sign-in.

         Marked, because the return is a page load and a page load is
         indistinguishable from coming back to a tab. Without the mark, signing
         in with Google put somebody back on the feed with a session and no
         greeting — which is what a returning visitor should get and is exactly
         wrong for somebody who has just signed in. The marker is read once and
         wiped out of the address bar; see `ARRIVED` below. */
      redirectTo:
        typeof window === 'undefined'
          ? undefined
          : `${window.location.origin}${window.location.pathname}?${ARRIVED}=1`,
    },
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** The one that was here before the others, kept so nothing else has to move. */
export async function signInWithGoogle(): Promise<{ ok: true } | { ok: false; message: string }> {
  return signInWith('google');
}

export async function signOut(): Promise<void> {
  const supabase = getClient();
  if (supabase) await supabase.auth.signOut();
}

/** Calls back whenever the session changes, including in another tab. */
export function onAccountChange(handler: (account: Account | null) => void): () => void {
  const supabase = getClient();
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    handler(session?.user ? toAccount(session.user) : null);
  });
  return () => data.subscription.unsubscribe();
}

/* ---------------------------------------------------------------- tracks -- */

/** The columns are snake_case in Postgres and camelCase in the app. */
interface TrackRow {
  id: string;
  owner: string;
  title: string;
  genre: string;
  bpm: number;
  song_key: string;
  lyrics: string;
  style: string;
  models: string[];
  source: string;
  seconds: number;
  created_at: string;
  remix_of: string | null;
  seed: number;
}

function rowToTrack(row: TrackRow): Track {
  const track: Track = {
    id: row.id,
    title: row.title,
    genre: row.genre,
    bpm: row.bpm,
    key: row.song_key,
    lyrics: row.lyrics ?? '',
    style: row.style ?? '',
    models: row.models ?? [],
    source: row.source === 'engine' ? 'engine' : 'sketch',
    seconds: row.seconds,
    createdAt: row.created_at,
    seed: row.seed,
  };
  return row.remix_of ? { ...track, remixOf: row.remix_of } : track;
}

function audioPath(owner: string, trackId: string): string {
  return `${owner}/${trackId}.wav`;
}

/**
 * Saves a track and its audio to the account. Returns false when there is no
 * account or no project — the caller has already saved locally either way, so
 * a false here means "stayed on this device", not "lost".
 */
/**
 * Why a save did not happen. `off` and `local` are ordinary — no project, or no
 * account — and the track is safely on the device either way. The other two are
 * real faults, and the caller shows them rather than swallowing them: a song
 * that silently failed to reach your channel is indistinguishable from one that
 * was never sent, which is how an empty table goes unnoticed for a day.
 */
export type PushResult =
  | { saved: true }
  | { saved: false; reason: 'off' | 'local' | 'upload' | 'row'; message: string };

export async function pushTrack(track: Track, audio: Blob): Promise<PushResult> {
  const supabase = getClient();
  if (!supabase) return { saved: false, reason: 'off', message: '' };
  const account = await currentAccount();
  if (!account) {
    return {
      saved: false,
      reason: 'local',
      message: 'Kept on this device — you are not signed in to an account.',
    };
  }

  const upload = await supabase.storage
    .from(BUCKET)
    .upload(audioPath(account.id, track.id), audio, { contentType: 'audio/wav', upsert: true });
  if (upload.error) {
    return { saved: false, reason: 'upload', message: `Audio did not upload: ${upload.error.message}` };
  }

  const row: TrackRow = {
    id: track.id,
    owner: account.id,
    title: track.title,
    genre: track.genre,
    bpm: track.bpm,
    song_key: track.key,
    lyrics: track.lyrics,
    style: track.style,
    models: track.models.slice(),
    source: track.source,
    seconds: track.seconds,
    created_at: track.createdAt,
    remix_of: track.remixOf ?? null,
    seed: track.seed,
  };
  const { error } = await supabase.from('tracks').upsert(row);
  if (error) return { saved: false, reason: 'row', message: `Song did not save: ${error.message}` };
  return { saved: true };
}

/** Every track on the account, newest first. Empty when signed out. */
export async function pullTracks(): Promise<Track[]> {
  const supabase = getClient();
  if (!supabase) return [];
  const account = await currentAccount();
  if (!account) return [];
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .eq('owner', account.id)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as TrackRow[]).map(rowToTrack);
}

/** The audio for a track that is on the account but not on this device yet. */
export async function pullAudio(trackId: string): Promise<Blob | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const account = await currentAccount();
  if (!account) return null;
  const { data, error } = await supabase.storage.from(BUCKET).download(audioPath(account.id, trackId));
  if (error || !data) return null;
  return data;
}

/** Removes a track from the account. Local deletion is the caller's job. */
export async function removeTrack(trackId: string): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const account = await currentAccount();
  if (!account) return;
  await supabase.storage.from(BUCKET).remove([audioPath(account.id, trackId)]);
  await supabase.from('tracks').delete().eq('id', trackId).eq('owner', account.id);
}

/**
 * Reconciles this device with the account and answers with the full channel.
 *
 * Anything made on another device arrives; anything made here while signed out
 * — or before the account existed — is uploaded. Ties go to whichever copy was
 * made first, since a track's id and its audio never change after it is cut.
 *
 * `readLocalAudio` is passed in rather than imported so this file stays free of
 * IndexedDB, which does not exist on the server.
 */
export async function syncChannel(
  local: readonly Track[],
  readLocalAudio: (id: string) => Promise<Blob | null>,
): Promise<Track[]> {
  const supabase = getClient();
  if (!supabase) return local.slice();
  const account = await currentAccount();
  if (!account) return local.slice();

  const remote = await pullTracks();
  const remoteIds: Record<string, true> = {};
  remote.forEach((track) => {
    remoteIds[track.id] = true;
  });

  // Upload what this device has and the account does not.
  for (let i = 0; i < local.length; i += 1) {
    const track = local[i];
    if (remoteIds[track.id]) continue;
    const audio = await readLocalAudio(track.id);
    if (audio) await pushTrack(track, audio);
  }

  const merged = remote.slice();
  const seen: Record<string, true> = { ...remoteIds };
  local.forEach((track) => {
    if (!seen[track.id]) {
      merged.push(track);
      seen[track.id] = true;
    }
  });
  merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return merged;
}
