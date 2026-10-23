/**
 * Frames in and out of a shot, as data URLs the engines take.
 *
 * Three small jobs the characters and restyle benches share with nothing
 * else, kept out of the editor because it is nine thousand lines already and
 * none of these needs anything from it but a clip and a size.
 */
import { frameFrom } from './videocover';

/** A blob as a data URL, or null where it cannot be read. */
export function asDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((done) => {
    const reader = new FileReader();
    reader.onloadend = () => done(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => done(null);
    reader.readAsDataURL(blob);
  });
}

/**
 * One frame out of a clip, at a second of its own material, framed the way
 * the film frames it.
 *
 * ── Why a second player and not the one on screen ────────────────────────
 *
 * The restyle bench wants the clip's LAST frame as well as the one she is
 * standing on. Seeking the viewer there and back would move the picture
 * under her and, if the seek were slow, leave the playhead saying one second
 * while the screen showed another. A player of its own costs one object URL
 * and is thrown away the moment the frame is read.
 *
 * Eight seconds and then null. A clip the browser cannot seek — some
 * recordings carry no index — must give a sentence, not a bench that waits
 * for ever.
 */
export async function frameOfClip(
  clip: Blob,
  second: number,
  width: number,
  height: number,
  fill: boolean,
): Promise<string | null> {
  const url = URL.createObjectURL(clip);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  try {
    const ready = await new Promise<boolean>((done) => {
      const stop = window.setTimeout(() => done(false), 8000);
      video.onloadeddata = () => { window.clearTimeout(stop); done(true); };
      video.onerror = () => { window.clearTimeout(stop); done(false); };
      video.src = url;
    });
    if (!ready) return null;
    const seeked = await new Promise<boolean>((done) => {
      const stop = window.setTimeout(() => done(false), 8000);
      video.onseeked = () => { window.clearTimeout(stop); done(true); };
      video.currentTime = Math.max(0, second);
    });
    if (!seeked) return null;
    const shot = await frameFrom(video, width, height, fill);
    return shot ? await asDataUrl(shot) : null;
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

/**
 * A character sheet set into the shape of the film, ready to be an opening frame.
 *
 * The sheet is drawn tall, because a person standing is tall. The film is
 * wide or tall, and a video engine handed a picture of the wrong shape crops
 * it or stretches it — a character with no feet, or one twice as wide as
 * they should be. So the sheet is put in the middle of a canvas of the film's
 * shape and the sides are filled with the sheet's own background, which the
 * sheet was asked to keep plain for exactly this: the edge disappears.
 */
export async function intoShape(dataUrl: string, aspect: '16:9' | '9:16'): Promise<string> {
  const img = await new Promise<HTMLImageElement | null>((done) => {
    const one = new Image();
    one.onload = () => done(one);
    one.onerror = () => done(null);
    one.src = dataUrl;
  });
  if (!img) return dataUrl;
  const wide = img.naturalWidth || img.width;
  const tall = img.naturalHeight || img.height;
  if (!wide || !tall) return dataUrl;
  const ratio = aspect === '16:9' ? 16 / 9 : 9 / 16;
  /* Already the film's shape, near enough: left alone, because re-encoding a
     picture that needs nothing costs quality for nothing. */
  if (Math.abs(wide / tall - ratio) < 0.02) return dataUrl;
  const height = Math.min(1280, Math.max(tall, Math.round(wide / ratio)));
  const width = Math.round(height * ratio);
  const sheet = document.createElement('canvas');
  sheet.width = width;
  sheet.height = height;
  const ctx = sheet.getContext('2d');
  if (!ctx) return dataUrl;
  /* The corner pixel is the background the sheet was drawn on. */
  const probe = document.createElement('canvas');
  probe.width = 1;
  probe.height = 1;
  const p = probe.getContext('2d');
  let ground = '#d4d4d8';
  if (p) {
    p.drawImage(img, 2, 2, 1, 1, 0, 0, 1, 1);
    const [r, g, b] = p.getImageData(0, 0, 1, 1).data;
    ground = `rgb(${r},${g},${b})`;
  }
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, width, height);
  const scale = Math.min(width / wide, height / tall);
  const w = wide * scale;
  const h = tall * scale;
  ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
  return sheet.toDataURL('image/jpeg', 0.92);
}
