/**
 * The watermark, and why it is the only thing that works.
 *
 * ── What was asked ───────────────────────────────────────────────────────
 *
 * Carli, 20 September 2026:
 *
 *   *"Die hele app moet dan glad nie toelaat om screenshots te kan neem
 *    nie. Screenshots gaan die kunswerke skade doen. Is daar programme wat
 *    as iemand daardie kunswerk met 'n foon opneem dat dit die copyright
 *    daarvan optel en dan 'n lelike watermerk oor die foto sit?"*
 *
 * Two questions, and the honest answer to both is no:
 *
 *   **A web app cannot block a screenshot.** There is no browser API for
 *   it and there is not going to be one. Android apps can ask for
 *   FLAG_SECURE and iOS apps can be told a screenshot happened after the
 *   fact; a page in a browser can do neither. Anything built to "stop"
 *   it — right-click blockers, blur-on-blur, a transparent overlay —
 *   is theatre that inconveniences buyers and delays nobody.
 *
 *   **Nothing can reach somebody else's camera.** Once the light has left
 *   the screen it is gone. No software of ours is on that phone, so
 *   "detect the copyright and stamp their photo" is not a feature that is
 *   missing — it is outside physics.
 *
 * What is real, and what this file is:
 *
 *   **Show a marked, small preview. Release the clean file only to the
 *   buyer.** A screenshot of a marked 1000-pixel preview is a marked
 *   1000-pixel picture. A photograph of the screen is the same thing,
 *   slightly worse. Neither can be used as a 3000-pixel sleeve, which is
 *   the only thing anybody would steal this for.
 *
 * Every stock library on earth does this and none of them try to block
 * screenshots, which is the whole argument in one sentence.
 *
 * ── The two things that do exist, and are not this ───────────────────────
 *
 * Forensic watermarking — Digimarc, Imatag, Steg.AI — hides a signal in
 * the pixels that survives a camera photo, a crop and a re-encode. It does
 * not prevent anything; it lets you PROVE a copy came from you, later, in
 * an argument. Content Credentials (C2PA) does the same job with signed
 * provenance metadata. Both are worth having the day an artist sells
 * enough to be worth stealing from, and neither is worth its price today.
 * Written down in `docs/OPEN-QUESTIONS.md` rather than half-built.
 *
 * ── Why the mark is drawn into the pixels ────────────────────────────────
 *
 * Not a CSS overlay. An overlay is one line in a browser's inspector away
 * from gone, and the clean bytes were on the wire the whole time. This is
 * baked in at upload, before the preview is ever stored, and the clean
 * master is a different file in the same private bucket that the route
 * hands out to one person.
 */

import { squareMarked, type Made } from './imagefile';

/** What the wall shows. Big enough to judge, far too small for a sleeve. */
export const PREVIEW_SIDE = 1000;

/**
 * Ugly on purpose, and she asked for that in those words.
 *
 * A polite corner logo is cropped off in two seconds. A repeated diagonal
 * band across the whole square cannot be cropped out of, cannot be cloned
 * away without destroying the picture underneath, and still leaves the
 * work perfectly readable to somebody deciding whether to buy it — which
 * is the only job the preview has.
 *
 * Black under white, because a single colour disappears on artwork of that
 * colour and this has to survive every picture anybody ever hangs.
 */
function paintMark(context: CanvasRenderingContext2D, side: number, said: string): void {
  context.save();
  context.translate(side / 2, side / 2);
  context.rotate(-Math.PI / 6);

  const step = Math.round(side / 7);
  context.font = `600 ${Math.round(side / 22)}px ui-sans-serif, system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  /* Twice the square's own size, so the rotation cannot leave a bare
     corner — the one mistake that makes a diagonal watermark croppable. */
  for (let y = -side; y < side; y += step) {
    for (let x = -side; x < side; x += Math.round(side / 1.6)) {
      context.lineWidth = Math.max(2, side / 300);
      context.strokeStyle = 'rgba(0,0,0,0.22)';
      context.strokeText(said, x, y);
      context.fillStyle = 'rgba(255,255,255,0.32)';
      context.fillText(said, x, y);
    }
  }
  context.restore();
}

/**
 * The preview: small, marked, and the only version anybody sees before
 * they have paid.
 *
 * The artist's name is in the mark as well as the studio's, because the
 * mark is doing two jobs — it ruins the copy, and on a screenshot that
 * somebody shares anyway it says whose work it is and where it came from.
 */
export function previewOf(file: File, artist: string): Promise<Made> {
  const said = `${artist} · FUTUREBOX`.toUpperCase();
  return squareMarked(file, PREVIEW_SIDE, (context, side) => paintMark(context, side, said));
}
