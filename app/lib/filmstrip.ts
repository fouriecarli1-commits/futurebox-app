/**
 * The pictures along a block on the clock, so a cut can be aimed.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 8 October 2026: *"Hoe moontlik is dit om die video se visuals op die
 * tydlyn te wys? Dit gaan dit makliker maak om te weet waar om te cut ens."*
 *
 * Very possible, and free: the material is already a Blob in this browser, so
 * the frames come out of it on the device. Nothing is uploaded, nothing is
 * generated, nothing is charged. It works on the free plan and in a tunnel.
 *
 * A block on the strip used to carry a name and a duration, which tells you
 * WHICH shot it is and nothing about WHERE in it anything happens. Aiming a
 * cut then means scrubbing the viewer and watching, one second at a time.
 * With pictures on the block the shape of the shot is visible at a glance —
 * where the person walks in, where the hand comes down, where it goes dark.
 *
 * ── Why the arithmetic is here and not in the component ──────────────────
 *
 * Because it has three traps in it and a component is not a place a check can
 * drive them:
 *
 *   **A frame at the very end does not exist.** Seeking to `to` lands at or
 *   past the last frame, and most files answer that with the player's idea of
 *   nothing — a black thumbnail at the end of every block. So each picture is
 *   taken from the MIDDLE of the slice it stands for, which is also the
 *   honest thing: a strip of N pictures is N equal slices, and the picture
 *   that represents a slice should come from inside it.
 *
 *   **A piece can be shorter than a frame.** A trim down to a tenth of a
 *   second, or a piece whose `to` has not caught up with its `from`, must
 *   answer one picture rather than zero, a negative, or a NaN seek that hangs
 *   the decoder for ever.
 *
 *   **Count follows width, and width follows her zoom.** The clock stretches
 *   from a whole film in a thumb's width to a second across the screen, so a
 *   fixed count is either four pictures smeared across a metre or sixty
 *   decoded for a block nobody can see.
 */

/**
 * How wide one picture on the strip is, in pixels.
 *
 * 48 rather than the 44 of a thumb target: nothing here is pressed — the
 * strip is underneath the block's own button — so it is sized to be READ
 * rather than hit, and a 16:9 frame 48 across is 27 tall, which fits the
 * 64-pixel lane this room opens at with room for the name over it.
 */
export const FRAME_WIDE = 48;

/**
 * The most pictures one block may ask for.
 *
 * Each one is a seek and a draw, and a seek is tens of milliseconds. Twelve
 * across a block is enough to read the shape of a shot; sixty is a decoder
 * working for a second and a half on one block while she is trying to drag
 * another. Zoomed far in, the cap means the pictures stretch rather than
 * multiply, which is the right way for it to degrade — the strip stays a
 * picture of the shot instead of becoming a slideshow nobody waited for.
 */
export const MOST_FRAMES = 12;

/**
 * How many pictures a block this wide should carry.
 *
 * Never nought: a block too thin for one picture still gets one, because the
 * alternative is a block that is the only blank one on the strip and reads as
 * a clip that failed to load.
 */
export function howMany(wide: number, each: number = FRAME_WIDE, most: number = MOST_FRAMES): number {
  if (!Number.isFinite(wide) || !Number.isFinite(each) || each <= 0) return 1;
  const fits = Math.floor(wide / each);
  return Math.min(Math.max(1, fits), Math.max(1, most));
}

/**
 * Where in the material each picture is taken from, in seconds.
 *
 * The middle of each slice, for the reason in the note at the top: the edges
 * of a range are where a decoder has nothing to give.
 *
 * A range that is empty or backwards answers a single time at its start,
 * rather than an empty list — one picture of the first frame is a true
 * picture of a piece that is a tenth of a second long.
 */
export function timesFor(from: number, to: number, count: number): number[] {
  const start = Number.isFinite(from) ? Math.max(0, from) : 0;
  const stop = Number.isFinite(to) ? to : start;
  const many = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1;
  const runs = stop - start;
  if (!(runs > 0)) return [start];
  const slice = runs / many;
  const out: number[] = [];
  for (let i = 0; i < many; i += 1) out.push(start + slice * (i + 0.5));
  return out;
}

/**
 * The key a strip is remembered under.
 *
 * The material, the trim and the count — change any of the three and the
 * pictures are different ones. Width is deliberately NOT in it: a block that
 * grows by a pixel is the same pictures, and keying on width would decode the
 * whole strip again on every frame of a zoom.
 */
export function stripKey(clipId: string, from: number, to: number, count: number): string {
  return `${clipId}|${from.toFixed(3)}|${to.toFixed(3)}|${count}`;
}

/* ── Below here needs a browser ──────────────────────────────────────────

   Everything above is arithmetic and `check:filmstrip` drives it. What
   follows seeks a real decoder, which only a browser has, so `audit/strip.mjs`
   is what says whether it produces pictures. Both, because neither can do the
   other's job: a source rule cannot tell a working decoder from one that
   answers black, and a browser probe cannot tell you that the ninth of twelve
   slices is half a second out. */

/** One picture as a data URL, or null if this frame could not be read. */
async function drawOne(
  video: HTMLVideoElement,
  at: number,
  wide: number,
  tall: number,
): Promise<string | null> {
  const landed = await new Promise<boolean>((done) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      done(ok);
    };
    const onSeeked = () => finish(true);
    const onError = () => finish(false);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    /* A decoder that never answers must not hold the strip open for ever —
       one bad file would otherwise leave every later block blank, because
       they are drawn in turn. */
    setTimeout(() => finish(false), 4000);
    try {
      /* Clamped inside the material. A seek past the end is the request a
         decoder is least likely to answer, and `duration` is NaN until the
         metadata is in, so an unknown duration means do not clamp rather
         than clamp to nothing. */
      const last = Number.isFinite(video.duration) ? Math.max(0, video.duration - 0.05) : at;
      video.currentTime = Math.max(0, Math.min(at, last));
    } catch {
      finish(false);
    }
  });
  if (!landed || !video.videoWidth || !video.videoHeight) return null;

  const canvas = document.createElement('canvas');
  canvas.width = wide;
  canvas.height = tall;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.fillStyle = '#000';
  context.fillRect(0, 0, wide, tall);
  /* Covering rather than fitted: a strip is read as a band of colour and
     movement, and letterbox bars inside a 48-pixel picture leave about thirty
     pixels of actual photograph. The block is not where framing is judged —
     the viewer is. */
  const scale = Math.max(wide / video.videoWidth, tall / video.videoHeight);
  const w = video.videoWidth * scale;
  const h = video.videoHeight * scale;
  try {
    context.drawImage(video, (wide - w) / 2, (tall - h) / 2, w, h);
  } catch {
    /* A frame the browser will not let us read. The film is unaffected. */
    return null;
  }
  /* JPEG at a low quality on purpose: twelve of these per block, a dozen
     blocks on a strip, held in memory while the room is open. A sharper
     thumbnail costs megabytes and shows nothing at 48 pixels. */
  return canvas.toDataURL('image/jpeg', 0.55);
}

/**
 * The pictures for one piece of material.
 *
 * Returns as many as it could read; a frame that would not decode is left out
 * rather than filled with black, so a half-readable file shows the half it
 * has instead of pretending the rest is dark footage.
 */
export async function stripFor(
  clip: Blob,
  from: number,
  to: number,
  count: number,
  wide: number = FRAME_WIDE,
  tall: number = Math.round(FRAME_WIDE * 9 / 16),
): Promise<string[]> {
  if (typeof document === 'undefined') return [];
  const url = URL.createObjectURL(clip);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  /* Not appended to the document. A video element off-document still decodes
     and still seeks, and one in the page would be a second player somebody
     can hear. */
  video.src = url;
  try {
    const ready = await new Promise<boolean>((done) => {
      let settled = false;
      const finish = (ok: boolean) => { if (!settled) { settled = true; done(ok); } };
      video.addEventListener('loadeddata', () => finish(true), { once: true });
      video.addEventListener('error', () => finish(false), { once: true });
      setTimeout(() => finish(false), 8000);
      video.load();
    });
    if (!ready) return [];
    const out: string[] = [];
    for (const at of timesFor(from, to, count)) {
      const one = await drawOne(video, at, wide, tall);
      if (one) out.push(one);
    }
    return out;
  } finally {
    /* Both, and in this order. Clearing `src` without the revoke leaks the
       blob for the life of the tab; revoking without clearing leaves an
       element pointing at an address that no longer resolves, which some
       browsers report as a decode error on a strip that already finished. */
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}
