/**
 * Reading a scratch file the caller put in their own folder.
 *
 * The browser uploads a big file to storage and posts the key (see
 * `lib/workfile.ts` for why). This is the other half: the key is checked
 * against the folder of whoever's token signed *this* request, and only then
 * is the object read — with the service key, which does not consult the bucket
 * policies at all, so the check here is the only thing deciding whose file
 * comes back.
 *
 * Refused rather than repaired. A key that is not exactly
 * `<caller>/work/<uuid>.<ext>` gets null, and null is a 400. There is no
 * sanitising step, because stripping is where traversal bugs live.
 */

import { admin, callerFrom } from './account';
import { workPath } from './ownedpath';

const BUCKET = 'tracks';

/**
 * The file, if this caller owns it.
 *
 * @param key       what the form said, unchecked.
 * @param owner     the caller's id, from a verified token — never from the form.
 * @param extension the file type the route expects.
 */
export async function readWork(
  key: unknown,
  owner: string,
  extension = 'wav',
): Promise<Blob | null> {
  const safe = workPath(key, owner, extension);
  if (!safe) return null;
  const client = admin();
  if (!client) return null;
  const { data, error } = await client.storage.from(BUCKET).download(safe);
  return error || !data ? null : data;
}

/** Takes it back out once the job has it. Best effort; a leftover is harmless. */
export async function dropWork(key: unknown, owner: string, extension = 'wav'): Promise<void> {
  const safe = workPath(key, owner, extension);
  if (!safe) return;
  const client = admin();
  if (!client) return;
  await client.storage.from(BUCKET).remove([safe]);
}

/**
 * The audio on a request, whichever way it arrived.
 *
 * The pair of `attach` in `lib/workfile.ts`. A small file is on the form; a
 * big one is in the caller's own storage folder and the form carries its key.
 * Six routes needed this and six copies of it would drift, so it is here once.
 *
 * A key means there has to be a caller — the key is checked against their
 * folder — whether or not this app is metering anything today.
 *
 * @returns the audio and, when it came from storage, the owner to tidy up
 *          under; or a Response to return as-is.
 */
export async function audioFrom(
  form: FormData,
  request: Request,
  field: string,
): Promise<
  | { readonly audio: Blob; readonly owner: string | null; readonly key: unknown }
  | { readonly problem: Response }
> {
  const stored = form.get('key');
  if (typeof stored === 'string' && stored) {
    const caller = await callerFrom(request);
    if (!caller) {
      return {
        problem: Response.json(
          { error: 'signed_out', message: 'Sign in to send something this long.' },
          { status: 401 },
        ),
      };
    }
    const audio = await readWork(stored, caller.id, 'wav');
    if (!audio) {
      return {
        problem: Response.json(
          { error: 'bad_request', message: 'That file could not be read back.' },
          { status: 400 },
        ),
      };
    }
    return { audio, owner: caller.id, key: stored };
  }

  const sent = form.get(field);
  if (!(sent instanceof Blob) || sent.size === 0) {
    return {
      problem: Response.json(
        { error: 'bad_request', message: 'No audio was sent.' },
        { status: 400 },
      ),
    };
  }
  return { audio: sent, owner: null, key: null };
}

/**
 * Several files off a request, whichever way they arrived.
 *
 * The pair of `attachAll`. Training a sound needs a handful of whole songs and
 * that is over the platform's body limit several times over, so the browser
 * puts them in its own folder and posts the keys — and the names beside them,
 * because a key is a uuid and the upstream service should see the song's name.
 *
 * Every key is checked against the caller's folder. One bad key fails the
 * whole request rather than being skipped: a training run quietly missing a
 * song is a worse answer than a refusal.
 */
export async function audioListFrom(
  form: FormData,
  request: Request,
  field: string,
): Promise<
  | { readonly files: { readonly blob: Blob; readonly filename: string }[]; readonly keys: string[]; readonly owner: string | null }
  | { readonly problem: Response }
> {
  const keys = form.getAll('keys').filter((one): one is string => typeof one === 'string' && one !== '');
  if (keys.length) {
    const caller = await callerFrom(request);
    if (!caller) {
      return {
        problem: Response.json(
          { message: 'Sign in to send music this long.' },
          { status: 401 },
        ),
      };
    }
    const names = form.getAll('names').map((one) => (typeof one === 'string' ? one : 'song.wav'));
    const files: { blob: Blob; filename: string }[] = [];
    for (let at = 0; at < keys.length; at += 1) {
      const blob = await readWork(keys[at], caller.id, 'wav');
      if (!blob) {
        return {
          problem: Response.json(
            { message: 'One of those files could not be read back.' },
            { status: 400 },
          ),
        };
      }
      files.push({ blob, filename: names[at] ?? `song-${at + 1}.wav` });
    }
    return { files, keys, owner: caller.id };
  }

  const sent = form
    .getAll(field)
    .filter((one): one is File => one instanceof File && one.size > 0)
    .map((one) => ({ blob: one as Blob, filename: one.name }));
  return { files: sent, keys: [], owner: null };
}
