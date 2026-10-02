/**
 * The film's cover: one frame out of it, or a picture brought in.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 4 October 2026: *"Daar moet ook 'n opsie wees om 'n cover foto vir die
 * video te screen shot uit die video, of een in te bring wat dan die video se
 * voorblad foto word ook wanneer die video ge-export word."*
 *
 * ── Why a cover cannot be inside the film file ───────────────────────────
 *
 * It is worth saying plainly, because "the video's cover" sounds like it
 * belongs in the video. It does not, and it cannot here:
 *
 *  - `MediaRecorder` writes a stream. It has no way to attach cover art, and
 *    nothing in the browser can add one to a webm or mp4 afterwards without a
 *    muxer this app does not ship.
 *  - Making the cover the first FRAME of the film would change the film —
 *    a still at the front of a twenty-second advert is a twenty-one-second
 *    advert with a freeze on it.
 *
 * What a cover actually is everywhere it matters — a channel, a library, a
 * post, a player before it has loaded — is a SEPARATE image shown in the
 * film's place. So that is what this makes: a picture that travels with the
 * film, is the `poster` on the player the moment the film is made, and is
 * saved beside it when she saves.
 *
 * ── Drawn into the film's own frame, not the clip's ──────────────────────
 *
 * The shot might be wide inside a tall film. A cover grabbed at the clip's
 * shape would be a different picture from the one the film shows at that
 * second — bars missing, framing different — which is the same fault the
 * preview had before it was given the film's aspect. So it is drawn through
 * the renderer's own `fitted`/`covering`, at the film's size.
 */

import { covering, fitted } from './stitch';

/** What a cover is written as. JPEG, because a poster is a photograph. */
export const COVER_TYPE = 'image/jpeg';

/**
 * How hard it is squeezed.
 *
 * 0.9 rather than 1: a cover is looked at on a card at a fraction of its size,
 * and the last tenth of quality is invisible there and is most of the bytes.
 */
export const COVER_QUALITY = 0.9;

/** Where a cover came from, which the room says out loud. */
export type CoverFrom = 'shot' | 'brought';

/**
 * One frame of a playing clip, drawn into the film's frame.
 *
 * `fill` is the piece's own setting — whether it fills the frame and is
 * cropped, or fits inside it with bars — so the cover is framed the way that
 * second of the film is framed and not some other way.
 *
 * Returns null rather than throwing when there is nothing to draw: a cover is
 * a nice-to-have and a film that fails to export because a poster could not be
 * grabbed would be the tail wagging the dog.
 */
export async function frameFrom(
  video: HTMLVideoElement,
  width: number,
  height: number,
  fill: boolean,
): Promise<Blob | null> {
  if (!(width > 0) || !(height > 0)) return null;
  if (!video.videoWidth || !video.videoHeight) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  /* Black behind it, for the bars. A cover with transparent bars is a cover
     that goes white on half the cards it is shown on. */
  context.fillStyle = '#000';
  context.fillRect(0, 0, width, height);
  const box = fill ? covering(video, width, height) : fitted(video, width, height);
  try {
    context.drawImage(video, box.x, box.y, box.w, box.h);
  } catch {
    /* A frame the browser will not let us read — a cross-origin clip. The film
       is unaffected; there is simply no cover from this shot. */
    return null;
  }
  return new Promise((done) => {
    canvas.toBlob((blob) => done(blob), COVER_TYPE, COVER_QUALITY);
  });
}

/**
 * What a brought-in picture is allowed to be.
 *
 * Images only, and said here rather than trusted to the file input's `accept`
 * — that attribute is a filter on a picker, not a rule, and a file dragged in
 * or chosen through "all files" ignores it entirely.
 */
export function isPicture(file: File | null | undefined): boolean {
  return Boolean(file && /^image\//.test(file.type));
}

/**
 * The cover's filename, built from the film's.
 *
 * Same stem as the film, so the two sit next to each other in a downloads
 * folder sorted by name instead of at opposite ends of it. That is the whole
 * reason this is a function rather than "cover.jpg".
 */
export function coverName(filmName: string): string {
  return `${filmName.replace(/\.[^.]+$/, '')}-cover.jpg`;
}
