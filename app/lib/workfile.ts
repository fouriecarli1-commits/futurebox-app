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
 * Why a file could not be put in storage — and there are two answers, which
 * is the whole point of this type.
 *
 * Carli, 29 September 2026: *"Wat is die grootte van videos wat opgelaai kan
 * word? Noudat ons supabase en vercel betaal?"* A fair question that the app
 * could not answer, because every failure here came back as one sentence
 * ending "Sign in and try again" — including the failure of somebody who was
 * already signed in and whose file was simply bigger than the bucket takes.
 *
 * That is the shape of the thing she keeps meeting: an error that sends you
 * back round the loop you just came out of. A message that names the wrong
 * cause is worse than no message, because it costs an attempt to disprove.
 */
export type Stored =
  | { readonly ok: true; readonly key: string }
  | { readonly ok: false; readonly why: string };

/**
 * No account, no storage, or the upload failed for a reason we cannot name.
 * "Sign in" is the right advice here and only here.
 */
export const TOO_BIG_TO_SEND =
  'This is too long to send in one piece, and it could not be put in your storage first. Sign in and try again.';

/**
 * The bucket refused it on size.
 *
 * Supabase caps uploads per project: 50MB on the free plan, and on a paid one
 * whatever the project is set to — raising the plan does NOT raise the cap by
 * itself, it only raises the ceiling the cap may be set to. So a project that
 * has been upgraded and not reconfigured still refuses at 50MB, and this is
 * the message that says so instead of blaming the session.
 *
 * Deliberately without a number in it. The cap lives in a dashboard, not in
 * this repository, and a sentence here that names 50MB would be a second
 * answer to a question this code cannot see — wrong the day it is changed and
 * green forever, which is the failure mode worth avoiding above all others.
 */
export const TOO_BIG_FOR_STORAGE =
  'This file is larger than your storage will accept. Send a shorter piece, or split it in two.';

/** Does this upload error mean "too big" rather than "not allowed"? */
function refusedOnSize(error: unknown): boolean {
  const it = error as { statusCode?: unknown; message?: unknown } | null;
  if (!it) return false;
  if (String(it.statusCode ?? '') === '413') return true;
  return /exceeded the maximum|payload too large|too large/i.test(String(it.message ?? ''));
}

/**
 * Puts the audio in storage and gives back the key, or says why not.
 *
 * It used to give back `null` for all three failures at once, which is how
 * "the bucket refused this on size" arrived at the screen dressed as "you are
 * not signed in".
 */
export async function putWork(audio: Blob, extension = 'wav'): Promise<Stored> {
  const storage = getStorageClient();
  if (!storage) return { ok: false, why: TOO_BIG_TO_SEND };
  const account = await currentAccount();
  if (!account) return { ok: false, why: TOO_BIG_TO_SEND };

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
  if (!error) return { ok: true, key };
  return { ok: false, why: refusedOnSize(error) ? TOO_BIG_FOR_STORAGE : TOO_BIG_TO_SEND };
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
): Promise<{ ok: true; key: string | null } | { ok: false; why: string }> {
  if (audio.size <= POSTABLE_BYTES) {
    form.append(field, audio, filename);
    return { ok: true, key: null };
  }
  const put = await putWork(audio, 'wav');
  if (!put.ok) return put;
  form.append('key', put.key);
  return { ok: true, key: put.key };
}

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
): Promise<{ ok: true; keys: string[] } | { ok: false; keys: string[]; why: string }> {
  const keys: string[] = [];
  for (const file of files) {
    const put = await putWork(file.blob, 'wav');
    if (!put.ok) return { ok: false, keys, why: put.why };
    keys.push(put.key);
    form.append('keys', put.key);
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
