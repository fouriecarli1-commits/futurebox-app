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

export interface Account {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly handle: string;
}

function toAccount(user: { id: string; email?: string | null }): Account {
  const email = user.email ?? '';
  const name = email.split('@')[0] || 'creator';
  return { id: user.id, email, name, handle: `@${name}` };
}

/** The signed-in account, or null. Null also when Supabase is not configured. */
export async function currentAccount(): Promise<Account | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  return user ? toAccount(user) : null;
}

export type AuthResult = { ok: true; account: Account | null } | { ok: false; message: string };

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const supabase = getClient();
  if (!supabase) return { ok: false, message: 'Accounts are not switched on for this app yet.' };
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, message: error.message };
  // With email confirmation on, there is no session until the link is clicked.
  return { ok: true, account: data.user ? toAccount(data.user) : null };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const supabase = getClient();
  if (!supabase) return { ok: false, message: 'Accounts are not switched on for this app yet.' };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message };
  return { ok: true, account: data.user ? toAccount(data.user) : null };
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
export async function pushTrack(track: Track, audio: Blob): Promise<boolean> {
  const supabase = getClient();
  if (!supabase) return false;
  const account = await currentAccount();
  if (!account) return false;

  const upload = await supabase.storage
    .from(BUCKET)
    .upload(audioPath(account.id, track.id), audio, { contentType: 'audio/wav', upsert: true });
  if (upload.error) return false;

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
  return !error;
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
