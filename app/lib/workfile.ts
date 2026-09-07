'use client';

/**
 * A big file, put where the server can fetch it, instead of posted at it.
 *
 * ── The wall ─────────────────────────────────────────────────────────────
 *
 * A serverless function on Vercel refuses a request body over about four and a
 * half megabytes, and it refuses it at the edge — before the route runs, so
 * the route's own message never gets said. What comes back is a bare 413 with
 * no body, which the client then reports as "(413)" and nothing else.
 *
 * `/api/analyse` posts a WAV. At 44.1 kHz mono, sixteen bits, that is 88 kB a
 * second, so the wall is fifty-one seconds of audio — twenty-five in stereo.
 * Every song longer than that failed, always, while the route's own ceiling
 * said sixty megabytes. Carli: "die measure the mix gooi 'n 413 warning en
 * ... klank [kan] nie geseperate ... word nie."
 *
 * ── The way round it ─────────────────────────────────────────────────────
 *
 * The browser already has a signed-in Supabase session and a bucket it is
 * allowed to write into — `pushTrack` has used it since the channel existed.
 * So the file goes straight there, into a `work/` folder inside the account's
 * own folder, and the route is handed the key. The request body is then a few
 * hundred bytes and there is no wall.
 *
 * It is a key rather than a URL on purpose. A route that fetched any URL given
 * to it is an open proxy, which is the rule `/api/analyse/part` exists under;
 * `lib/server/ownedpath.ts` pins the key to the folder of whoever's token
 * signed the request.
 *
 * ── Cleaning up ──────────────────────────────────────────────────────────
 *
 * `dropWork` is called when the job comes back, and the file is small and in
 * her own folder if a tab is closed before that. It is not a place anything is
 * kept: nothing reads a work file except the one job it was uploaded for.
 */

import { currentAccount, getStorageClient } from './cloud';

const BUCKET = 'tracks';

/** Where a scratch file lives. Must match `workPath` in lib/server/ownedpath. */
function pathFor(owner: string, name: string, extension: string): string {
  return `${owner}/work/${name}.${extension}`;
}

/**
 * Roughly where the platform stops accepting a body.
 *
 * Under this, posting the file directly is one request instead of three and
 * there is no file to tidy up afterwards. Deliberately below the real ceiling:
 * the form's other fields, the multipart boundaries and the headers all count
 * towards it, and a limit set at exactly the wall would send some requests
 * into it.
 */
export const POSTABLE_BYTES = 3 * 1024 * 1024;

/**
 * Puts the audio in storage and gives back the key.
 *
 * Null when there is no account, no storage, or the upload failed — the caller
 * falls back to posting it directly, which works for a short file and gives
 * the honest platform error for a long one rather than a silent nothing.
 */
export async function putWork(audio: Blob, extension = 'wav'): Promise<string | null> {
  const storage = getStorageClient();
  if (!storage) return null;
  const account = await currentAccount();
  if (!account) return null;

  /* A uuid, so nothing about the name is guessable and two jobs started at the
     same second cannot land on each other. */
  const name =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const key = pathFor(account.id, name, extension);

  const { error } = await storage
    .from(BUCKET)
    .upload(key, audio, { contentType: audio.type || 'audio/wav', upsert: false });
  return error ? null : key;
}

/** Takes a scratch file back out. Failure is not worth telling anybody about. */
export async function dropWork(key: string | null | undefined): Promise<void> {
  if (!key) return;
  const storage = getStorageClient();
  if (!storage) return;
  try {
    await storage.from(BUCKET).remove([key]);
  } catch {
    // A scratch file left behind is a few megabytes in her own folder.
  }
}

/**
 * Puts the audio on a form the right way, whichever way that is.
 *
 * Six routes take an audio file and every one of them hit the same wall, so
 * this is the decision made once: under the limit the file goes on the form,
 * over it the file goes to storage and its key goes on the form. The route
 * end of the same decision is `audioFrom` in `lib/server/workfile.ts`.
 *
 * @returns the key when one was made, so the caller can take it back out if
 *          the job never starts; `ok: false` when a big file could not be
 *          stored, which is the one case the caller has to report.
 */
export async function attach(
  form: FormData,
  audio: Blob,
  field: string,
  filename: string,
): Promise<{ ok: true; key: string | null } | { ok: false }> {
  if (audio.size <= POSTABLE_BYTES) {
    form.append(field, audio, filename);
    return { ok: true, key: null };
  }
  const key = await putWork(audio, 'wav');
  if (!key) return { ok: false };
  form.append('key', key);
  return { ok: true, key };
}

/**
 * What to say when a big file could not be stored, in both languages.
 *
 * One sentence rather than six slightly different ones, because it is one
 * cause: no account, no storage, or the upload failed.
 */
export const TOO_BIG_TO_SEND =
  'This is too long to send in one piece, and it could not be put in your storage first. Sign in and try again.';

/**
 * The same decision, for a request that carries several files.
 *
 * Training a sound sends at least a handful of whole songs, which is over the
 * platform's body limit before the second one is added — so there is no
 * "small enough" case here worth keeping and every file goes to storage. The
 * keys go on the form as repeated `keys` fields, in the order they were given,
 * because the order is the caller's.
 *
 * @returns the keys, so a caller can take them back out if the job never
 *          starts; `ok: false` when any one of them could not be stored.
 */
export async function attachAll(
  form: FormData,
  files: readonly { readonly blob: Blob; readonly filename: string }[],
): Promise<{ ok: true; keys: string[] } | { ok: false; keys: string[] }> {
  const keys: string[] = [];
  for (const file of files) {
    const key = await putWork(file.blob, 'wav');
    if (!key) return { ok: false, keys };
    keys.push(key);
    form.append('keys', key);
    /* The name travels beside the key: the key is a uuid on purpose, and the
       upstream service is shown the song's name rather than that. */
    form.append('names', file.filename);
  }
  return { ok: true, keys };
}

/** Takes several scratch files back out. */
export async function dropAll(keys: readonly string[]): Promise<void> {
  for (const key of keys) await dropWork(key);
}
