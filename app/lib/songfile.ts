/**
 * Handing somebody their song, with the sleeve in it.
 *
 * Carli, 9 October 2026: *"Liedjies moet ook kan export saam met hulle Album
 * art."*
 *
 * Three screens downloaded a song before this existed — the channel, the
 * share row and the booth — and each one called `downloadBlob` with its own
 * idea of the file extension. None of them knew the song had a cover.
 *
 * So the decision is made once, here, and the three call this instead. The
 * next screen that offers a download gets the art for free, which is the
 * same reasoning as `attach` deciding by size in one place rather than at
 * every call site.
 *
 * ── What happens to a WAV ────────────────────────────────────────────────
 *
 * WAV has no standard place for a picture. ID3 tags are sometimes bolted on
 * to one and sometimes read, which is another way of saying a file that
 * works on the machine it was tested on.
 *
 * So the audio is left exactly as it is and the cover comes down beside it
 * as a second file, named after the song. That is what somebody uploading to
 * a distributor needs anyway: every one of them asks for the artwork
 * separately, at 3000 × 3000, and none of them reads it out of a WAV.
 *
 * Two files is worse than one and it is said out loud rather than hidden —
 * the caller gets back what happened so the screen can say so.
 */

import { downloadBlob, safeFilename } from './library';
import { isMp3, withCover } from './id3';

/** What was actually handed over, so a screen can say it in words. */
export type Handed =
  /** One file, with the picture inside it. */
  | 'together'
  /** Two files: the song as it was, and the cover beside it. */
  | 'beside'
  /** One file, no cover — there was none, or it could not be read. */
  | 'alone';

const extFor = (type: string): string => {
  const kind = (type || '').toLowerCase();
  if (kind.includes('wav')) return 'wav';
  if (kind.includes('ogg')) return 'ogg';
  if (kind.includes('mp4') || kind.includes('m4a')) return 'm4a';
  return 'mp3';
};

/**
 * The cover for this song, if there is one kept.
 *
 * `null` for every reason that is not "here it is": no cover, not signed in,
 * the request failed, the link had expired. None of those should stop a
 * download, so none of them throw.
 */
async function coverFor(
  trackId: string,
  token: string | null,
): Promise<{ bytes: Uint8Array; mime: string } | null> {
  try {
    const answer = await fetch(`/api/cover?track=${encodeURIComponent(trackId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!answer.ok) return null;
    const said = (await answer.json()) as { state?: string; url?: string };
    if (said.state !== 'done' || !said.url) return null;
    const got = await fetch(said.url);
    if (!got.ok) return null;
    const bytes = new Uint8Array(await got.arrayBuffer());
    if (!bytes.length) return null;
    /* The route writes PNG and nothing else, but the mime is read off what
       came back rather than assumed: a picture declared PNG and sent as JPEG
       is a frame some players skip silently. */
    const type = (got.headers.get('content-type') ?? '').split(';')[0].trim();
    return { bytes, mime: type.startsWith('image/') ? type : 'image/png' };
  } catch {
    return null;
  }
}

/**
 * Save a song to the device, with its cover wherever the format allows.
 *
 * @param token  A sign-in token, where the screen has one. Without it the
 *               cover simply is not found and the song still comes down,
 *               which is the right way round.
 */
export async function saveSong(
  track: { readonly id: string; readonly title: string },
  audio: Blob,
  token: string | null = null,
  artist?: string,
): Promise<Handed> {
  const bytes = new Uint8Array(await audio.arrayBuffer());
  const art = await coverFor(track.id, token);

  if (isMp3(bytes)) {
    downloadBlob(
      withCover(bytes, art, { title: track.title, artist }),
      safeFilename(track.title, 'mp3'),
    );
    return art ? 'together' : 'alone';
  }

  downloadBlob(audio, safeFilename(track.title, extFor(audio.type)));
  if (!art) return 'alone';
  downloadBlob(
    new Blob([art.bytes as BlobPart], { type: art.mime }),
    safeFilename(`${track.title} (album art)`, art.mime.includes('jpeg') ? 'jpg' : 'png'),
  );
  return 'beside';
}
