/**
 * The cast: the people, places and products a set of clips is about.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 *
 * A start frame is the only way to get the same face into two clips that are
 * meant to cut together. Two prompts, however carefully written, give two
 * strangers — "a woman in her thirties in a bright kitchen" is a description,
 * not a person, and a video model draws a different one each time.
 *
 * That already worked. What did not is that the picture lived in one browser.
 * `lib/assets.ts` keeps a shelf of twenty in IndexedDB, on the device that
 * uploaded them, which is right for a scratch pad and wrong for a presenter
 * three adverts have been built around: open the studio on a phone and they
 * are gone.
 *
 * A cast member is a row and a file on the account. Named, because "the
 * picture I used last Tuesday" is not how anybody thinks about a presenter,
 * and because a name is what makes it one press in any room that takes a
 * start frame.
 *
 * ── Private, and downloaded rather than linked ───────────────────────────
 *
 * The bucket is private — see `supabase/cast.sql` for why, which is the whole
 * reason it is not a folder in `avatars`. So there is no public URL to build:
 * the browser downloads the file with the owner's own session and turns it
 * into a data URL, which is the shape every engine request already takes.
 *
 * Downloads are remembered for the life of the page. A strip of six cast
 * members would otherwise fetch six files on every render, and the file that
 * has not changed since the last render is the same file.
 *
 * ── The note ─────────────────────────────────────────────────────────────
 *
 * Held, shown, and never silently used. "Always shot from his left" belongs
 * with the picture, and a note that quietly edits the prompt on its way to the
 * engine is a note nobody can debug when the clip comes back wrong. It is put
 * in front of the person writing the shot, who decides.
 */

import { configured, currentAccount, getStorageClient, accessToken } from './cloud';
import { ACCEPTS as IMAGE_ACCEPTS, fit } from './imagefile';

const BUCKET = 'cast';

/**
 * The longest edge a stored reference is kept at.
 *
 * Big enough that a face is a face and a label is readable — the engines take
 * a start frame at around this and go no higher. Small enough that a member is
 * a couple of hundred kilobytes rather than a phone photo, which matters
 * because these are downloaded again on every device the account opens.
 */
const LONGEST = 1024;

export const ACCEPTS = IMAGE_ACCEPTS;

/**
 * How many a cast holds.
 *
 * Twelve is more people than any advert has and few enough that the strip is
 * still something the eye reads rather than scrolls. The ceiling is enforced
 * on the server as well, because a limit only the browser knows is not one.
 */
export const CAST_LIMIT = 12;

export interface Member {
  readonly id: string;
  readonly name: string;
  readonly note: string;
  readonly path: string;
  readonly created_at?: string;
}

async function authed(): Promise<Record<string, string>> {
  const token = await accessToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

/** Everybody on the account, newest first. Empty when signed out or unconfigured. */
export async function loadCast(): Promise<Member[]> {
  if (!configured()) return [];
  try {
    const response = await fetch('/api/cast', { headers: await authed() });
    if (!response.ok) return [];
    const said = (await response.json()) as { cast?: Member[] };
    return said.cast ?? [];
  } catch {
    return [];
  }
}

export type Added =
  | { readonly ok: true; readonly member: Member }
  | { readonly ok: false; readonly why: 'too_big' | 'not_an_image' | 'unreadable' | 'signed_out' | 'full' | 'failed' };

/**
 * Put somebody in the cast.
 *
 * The picture goes to storage with the person's own session — the policies on
 * the bucket are what make that safe — and only then is the row written. That
 * order matters: a row pointing at a file that never arrived shows a broken
 * member on every device, while a file with no row is forty kilobytes nobody
 * ever sees.
 */
export async function addToCast(file: File, name: string): Promise<Added> {
  if (!configured()) return { ok: false, why: 'signed_out' };

  const made = await fit(file, LONGEST);
  if (!made.ok) return { ok: false, why: made.why };

  const storage = getStorageClient();
  const account = await currentAccount();
  if (!storage || !account) return { ok: false, why: 'signed_out' };

  const path = `${account.id}/${Date.now()}.webp`;
  const put = await storage.from(BUCKET).upload(path, made.blob, {
    contentType: 'image/webp',
    upsert: false,
    cacheControl: '31536000',
  });
  if (put.error) return { ok: false, why: 'failed' };

  const response = await fetch('/api/cast', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await authed()) },
    body: JSON.stringify({ name, path }),
  }).catch(() => null);

  if (!response?.ok) {
    // The row is what makes the file findable, so a file whose row was refused
    // is rubbish. Taken out rather than left to sit in the bucket forever.
    await storage.from(BUCKET).remove([path]).catch(() => undefined);
    const said = (await response?.json().catch(() => ({}))) as { error?: string };
    return { ok: false, why: said?.error === 'full' ? 'full' : 'failed' };
  }

  const said = (await response.json()) as { member: Member };
  remember(said.member.path, made.preview);
  return { ok: true, member: said.member };
}

/** Rename, or change the note. Both are one write. */
export async function editCast(id: string, fields: { name?: string; note?: string }): Promise<boolean> {
  const response = await fetch('/api/cast', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await authed()) },
    body: JSON.stringify({ id, ...fields }),
  }).catch(() => null);
  return Boolean(response?.ok);
}

/** Take somebody out of the cast, and their picture with them. */
export async function removeFromCast(member: Member): Promise<boolean> {
  const storage = getStorageClient();
  const account = await currentAccount();
  const response = await fetch(`/api/cast?id=${encodeURIComponent(member.id)}`, {
    method: 'DELETE',
    headers: await authed(),
  }).catch(() => null);
  if (!response?.ok) return false;

  /* The file goes after the row.

     Best effort, and in this order on purpose: a member whose row is gone is
     gone from every screen, so a file left behind is invisible waste. The
     other order would leave a row on every device pointing at nothing. The
     path is checked to be theirs first, because it came back from a row. */
  if (storage && account && member.path.startsWith(`${account.id}/`)) {
    await storage.from(BUCKET).remove([member.path]).catch(() => undefined);
    forget(member.path);
  }
  return true;
}

/* ── The pictures themselves ─────────────────────────────────────────────
 *
 * A private bucket has no URL to put in a `src`, so each one is downloaded and
 * turned into a data URL. Held for the life of the page: six members on a
 * strip would otherwise be six fetches per render.
 */
const held = new Map<string, string>();

function remember(path: string, dataUrl: string): void {
  held.set(path, dataUrl);
}

function forget(path: string): void {
  held.delete(path);
}

export async function pictureOf(path: string): Promise<string | null> {
  const already = held.get(path);
  if (already) return already;

  const storage = getStorageClient();
  if (!storage) return null;
  const { data, error } = await storage.from(BUCKET).download(path);
  if (error || !data) return null;

  const dataUrl = await new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(data);
  });
  if (dataUrl) remember(path, dataUrl);
  return dataUrl;
}
