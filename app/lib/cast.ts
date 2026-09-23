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
import { ACCEPTS as IMAGE_ACCEPTS, fit, square } from './imagefile';

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
/**
 * Told when the cast changes, so two panels cannot disagree about it.
 *
 * ── The fault this ends ──────────────────────────────────────────────────
 *
 * Carli, 23 September 2026, with a photograph of her own screen: a face in
 * the cast at the top, and under it, in amber, *"Put somebody in your cast
 * first — the picture above is who the presenter will be."*
 *
 * Both panels were right about what they knew. `Cast` lives inside
 * `StartFrame` and had just written a member; `Presenter` is a sibling three
 * components away in `VideoCanvas`, and it reads the cast ONCE, in an effect
 * keyed on whether the engine is available. Nothing told it. So it went on
 * holding the empty list it had loaded at mount and went on saying the one
 * thing that was no longer true — while the evidence sat directly above it.
 *
 * Threading a callback from `Cast` up through `StartFrame` to `VideoCanvas`
 * and down to `Presenter` would fix these two and leave the next reader with
 * the same bug. The cast is one thing, kept in one place, so being told it
 * changed belongs in the same place.
 */
const listeners = new Set<() => void>();

/** Returns the way to stop listening, so an unmounted panel is not called. */
export function onCastChanged(handler: () => void): () => void {
  listeners.add(handler);
  return () => { listeners.delete(handler); };
}

/* Called by every writer below. Never exported: a caller that announced a
   change it had not made would be worse than one that stayed quiet, because
   every reader would then re-read and find nothing different and nobody
   would know why. */
function castChanged(): void {
  for (const handler of [...listeners]) {
    try {
      handler();
    } catch {
      /* One panel throwing must not stop the others being told. */
    }
  }
}

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
  | {
      readonly ok: false;
      /* ── Why 'failed' became three words ──────────────────────────────
 
         Carli, twice: *"die add a cast member heeltemal afhaal en weer oor
         doen. Die witskerm bly op kom"*, and then *"Die button net onder
         hom wat sê dat mens 'n foto kan oplaai werk, maar die cast member
         oplaai werk nie."*
 
         That second sentence is the diagnosis. The button under it is
         `Pictures`, which keeps the photo on the device and touches no
         server at all. The cast keeps it on the ACCOUNT, which means a
         bucket and a table — and every way either of those can refuse
         collapsed into one word, `failed`, on her screen and in this file.
 
         Three things can go wrong and they have three different owners:
         the bucket is missing or its policy refuses the upload; the row is
         refused because `cast.sql` was never run; or the shelf is full.
         Guessing between them has now cost two rebuilds of a component
         that was probably never the problem. */
      readonly why:
        | 'too_big' | 'too_many_pixels' | 'not_an_image' | 'unreadable'
        | 'signed_out' | 'full'
        /** The picture never reached the bucket. */
        | 'no_bucket'
        /** The picture is there; the row the app finds it by is not. */
        | 'no_row'
        | 'failed';
      /** Columns the row write asked for that the database does not have. */
      readonly missing?: readonly string[];
    };

/**
 * Put somebody in the cast.
 *
 * The picture goes to storage with the person's own session — the policies on
 * the bucket are what make that safe — and only then is the row written. That
 * order matters: a row pointing at a file that never arrived shows a broken
 * member on every device, while a file with no row is forty kilobytes nobody
 * ever sees.
 */
/**
 * Put somebody in the cast from a picture this device already has.
 *
 * ── Why there are two doors ──────────────────────────────────────────────
 *
 * The other one opens the operating system's file picker, and for Carli, on
 * her phone, that press leaves a white screen: the page comes back empty,
 * nothing is saved, and a reload cures it. Three explanations have been ruled
 * out — memory, an in-app browser, and any error the page could throw — and
 * it has not been reproduced from this side, because the video desk's picture
 * section does not draw without a live key.
 *
 * What is certain is that the file picker is on the path, and that the
 * pictures already on the device got there without it: `Pictures` had one in
 * it while the cast had none. So this is the door that does not go past the
 * thing that breaks.
 *
 * It is worth having whether or not that bug is ever found. Two shelves of
 * pictures sitting side by side with no way to move one to the other was a
 * gap on its own — somebody who tried a photo out on the scratch pad and then
 * wanted the same person in three clips had to go and find the file again.
 *
 * ── A data URL, not a file ───────────────────────────────────────────────
 *
 * Which is what the device shelf keeps. It is turned back into a blob here
 * rather than at the caller, so both doors hand `fit` the same kind of thing
 * and there is one place that knows the shelf's shape.
 */
export async function addToCastFromKept(dataUrl: string, name: string): Promise<Added> {
  const answer = await fetch(dataUrl).catch(() => null);
  const blob = answer ? await answer.blob().catch(() => null) : null;
  if (!blob || !blob.type.startsWith('image/')) return { ok: false, why: 'not_an_image' };
  /* Named after the shelf entry, with a type the rest of the path can read.
     `File` rather than `Blob` because that is what `addToCast` takes, and
     giving it a second signature to save one line here is how a function
     ends up with two ways to be called and one of them untested. */
  return addToCast(new File([blob], `${name || 'cast'}.png`, { type: blob.type }), name);
}

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
  if (put.error) {
    /* The bucket's own words to the console, our word to the screen — the
       same split the art market uses, and the same reason: a storage
       error names policies and ids that are nobody's business but ours. */
    console.error(`[cast] the picture did not reach the bucket. ${put.error.message}`);
    return { ok: false, why: 'no_bucket' };
  }

  const response = await fetch('/api/cast', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await authed()) },
    body: JSON.stringify({ name, path }),
  }).catch(() => null);

  if (!response?.ok) {
    // The row is what makes the file findable, so a file whose row was refused
    // is rubbish. Taken out rather than left to sit in the bucket forever.
    await storage.from(BUCKET).remove([path]).catch(() => undefined);
    const said = (await response?.json().catch(() => ({}))) as
      { error?: string; missing?: string[] };
    if (said?.error === 'full') return { ok: false, why: 'full' };
    /* The file went up and the row did not. That is the shape of a
       migration nobody ran, and it is the one failure the screen used to
       describe as simply "it did not work". */
    return { ok: false, why: 'no_row', missing: said?.missing };
  }

  const said = (await response.json()) as { member: Member };
  /* A thumbnail from the bytes already in hand, so the strip draws the new
     member without a round trip. It used to cache `made.preview` — the WHOLE
     1024px picture as a data URL — which is the fault described below. */
  void thumbFrom(said.member.path, made.blob);
  /* Announced only once the row came back. Telling the other panels before
     the write landed would have them draw a member that does not exist, and
     then quietly lose it on the next read. */
  castChanged();
  return { ok: true, member: said.member };
}

/** Rename, or change the note. Both are one write. */
export async function editCast(id: string, fields: { name?: string; note?: string }): Promise<boolean> {
  const response = await fetch('/api/cast', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await authed()) },
    body: JSON.stringify({ id, ...fields }),
  }).catch(() => null);
  const saved = Boolean(response?.ok);
  if (saved) castChanged();
  return saved;
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
    const going = thumbs.get(member.path);
    if (going) URL.revokeObjectURL(going);
    thumbs.delete(member.path);
  }
  castChanged();
  return true;
}

/* ── The pictures themselves ─────────────────────────────────────────────
 *
 * ── The white screen, and what was actually causing it ──────────────────
 *
 * Carli, three times now, most recently 20 September 2026: *"Die witskerm
 * bly op kom. Dit is weird want die add a photo wat net langs dit is werk,
 * maar daai cast funksie werk nie."*
 *
 * That sentence is the whole diagnosis, and it took three rounds to read it
 * properly. The two strips sit six pixels apart and do the same job. One
 * works. The difference is not the file picker, which is where the previous
 * two rounds looked — it is what each strip puts on the screen:
 *
 *   Pictures  renders `asset.thumb`, a 240px JPEG made once and kept.
 *   Cast      rendered the WHOLE 1024px reference, as a base64 data URL,
 *             into a 96px tile. For every member. All twelve at once.
 *
 * The arithmetic is the bug. Twelve 1024×1024 images is 12 × 1024 × 1024 × 4
 * bytes of decoded bitmap — **48 MB** — held live while the rest of this app
 * is also in memory, on a phone. Plus the base64 strings, which are a third
 * larger again than the bytes they encode, plus twelve concurrent downloads
 * and twelve concurrent FileReaders to build them. A tab killed for memory
 * does not throw and leaves nothing in the console: it goes white, and a
 * reload cures it. Which is exactly, and only, what she has reported.
 *
 * `Pictures` has a comment about being fixed for a version of this same
 * fault. This strip never got the lesson.
 *
 * So the strip now shows a 192px thumbnail — 12 × 192 × 192 × 4 = **1.7 MB**,
 * twenty-eight times less — and the full picture is downloaded only at the
 * moment somebody actually chooses a member, which is one at a time and is
 * the only moment the full thing is needed.
 *
 * ── Object URLs, not data URLs ──────────────────────────────────────────
 *
 * The thumbnails are handed out as object URLs. A data URL is a string the
 * JavaScript heap has to hold; an object URL is a pointer to a blob the
 * browser owns and can page out. They are revoked on unmount, which the old
 * map of data URLs could not do — it was module-level, never evicted, and
 * grew for the life of the tab across every screen that showed a face.
 *
 * `check:castmemory` holds all of it.
 */

/** The strip's tile is 96px; the thumbnail is twice that, for a retina screen. */
const THUMB = 192;

/**
 * Thumbnails handed out, by path, so a strip of twelve is twelve downloads
 * once rather than twelve per render.
 *
 * Bounded at twice the cast limit and revoked oldest-first. An unbounded
 * cache of object URLs is the same leak as the data URLs it replaces, only
 * quieter — the strings are gone but the blobs are not.
 */
const thumbs = new Map<string, string>();

/** The one download, shared by both the thumbnail and the full picture. */
async function bytesOf(path: string): Promise<Blob | null> {
  const storage = getStorageClient();
  if (!storage) return null;
  const { data, error } = await storage.from(BUCKET).download(path);
  return error || !data ? null : data;
}

function keepThumb(path: string, url: string): void {
  thumbs.set(path, url);
  while (thumbs.size > CAST_LIMIT * 2) {
    const oldest = thumbs.keys().next();
    if (oldest.done) break;
    const going = thumbs.get(oldest.value);
    if (going) URL.revokeObjectURL(going);
    thumbs.delete(oldest.value);
  }
}

/** A thumbnail for a blob we already hold, without a second download. */
async function thumbFrom(path: string, blob: Blob): Promise<string | null> {
  /* Through `square`, which puts the resize INTO the decode: on a browser
     that honours it the 1024px bitmap is never allocated at all. A decode
     followed by a scale allocates both, which is the thing being fixed. */
  const made = await square(new File([blob], 'cast.webp', { type: blob.type || 'image/webp' }), THUMB);
  if (!made.ok) return null;
  const url = URL.createObjectURL(made.blob);
  keepThumb(path, url);
  return url;
}

/**
 * The small picture for the strip. This is what a list of members shows.
 *
 * Never the full reference. See the note above for the arithmetic.
 */
export async function thumbOf(path: string): Promise<string | null> {
  const already = thumbs.get(path);
  if (already) return already;
  const blob = await bytesOf(path);
  return blob ? thumbFrom(path, blob) : null;
}

/**
 * The full reference, as a data URL, for the one moment it is needed.
 *
 * A data URL rather than an object URL here on purpose: this one is handed
 * to the video route as the shot's start frame, and it has to survive being
 * put in a request body. An object URL is meaningless outside this page.
 *
 * Not cached. It is fetched when somebody presses a member and not before,
 * which is once or twice in a session — and holding it is the leak this
 * whole rewrite removes.
 */
export async function pictureOf(path: string): Promise<string | null> {
  const blob = await bytesOf(path);
  if (!blob) return null;
  return new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

/**
 * Let go of every thumbnail this module handed out.
 *
 * Called when the strip unmounts. Without it the blobs stay alive for the
 * life of the tab, which is the quiet half of the fault being fixed: the
 * old cache was module-level and nothing ever emptied it.
 */
export function releaseCast(): void {
  for (const url of thumbs.values()) URL.revokeObjectURL(url);
  thumbs.clear();
}
