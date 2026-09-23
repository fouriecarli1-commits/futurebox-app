/**
 * The logo lands where it can be seen, on any shape of frame.
 *
 * ── What this is guarding ────────────────────────────────────────────────
 *
 * A mark in "the corner" is easy to write and easy to get wrong in a way
 * nobody notices until it is posted: the corner of the FRAME is under
 * TikTok's button column, Reels' caption or Shorts' title, so a logo put
 * there is a logo nobody sees. Which is the same as not having one, except
 * that it also costs a render.
 *
 * `app/lib/logomark.ts` places it inside the `all` zone from `safezones.ts`
 * — the deepest margin on each side, the part visible on all three at once.
 * This checks the arithmetic rather than the intent: every corner, on a tall
 * frame, a wide one and a square one, with a wide logo and a tall one.
 *
 * Arithmetic and not a picture, deliberately. A probe that renders a frame
 * and looks for non-background pixels proves something was drawn; it cannot
 * say whether it was drawn somewhere a person will see it, which is the only
 * claim worth making here.
 */

import { readFileSync } from 'node:fs';
import { markBox, MARK_SHARE, MARK_INSET } from '../app/lib/logomark';
import { ZONES, type Zone } from '../app/lib/safezones';
import { before } from './order.mts';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const ALL = ZONES.find((one) => one.id === 'all') as Zone;
ok('there is an all-platforms zone to place it in', Boolean(ALL));

const FRAMES = [
  ['tall', 1080, 1920],
  ['wide', 1920, 1080],
  ['square', 1080, 1080],
] as const;
const CORNERS = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const;
/** A wide wordmark and a squarish badge: the two shapes a logo actually is. */
const SHAPES = [['wide', 3.2], ['square', 1]] as const;

for (const [frameName, w, h] of FRAMES) {
  const safe = {
    left: ALL.left * w,
    top: ALL.top * h,
    right: (1 - ALL.right) * w,
    bottom: (1 - ALL.bottom) * h,
  };
  for (const [shapeName, aspect] of SHAPES) {
    for (const corner of CORNERS) {
      const box = markBox(w, h, aspect, corner);
      const where = `${frameName}/${shapeName}/${corner}`;

      /* Inside the safe box, with a pixel of slack for the rounding that a
         fraction times a frame size always produces. */
      const inside =
        box.x >= safe.left - 1
        && box.y >= safe.top - 1
        && box.x + box.w <= safe.right + 1
        && box.y + box.h <= safe.bottom + 1;
      ok(
        `${where}: the mark is inside what all three platforms leave visible`,
        inside,
        `box ${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.w)}×${Math.round(box.h)}`
        + ` against safe ${Math.round(safe.left)},${Math.round(safe.top)}`
        + `–${Math.round(safe.right)},${Math.round(safe.bottom)}`,
      );

      /* Not squashed. A stretched logo is worse than none: it is somebody's
         brand, drawn wrong, by us. */
      const drawn = box.w / box.h;
      ok(
        `  and it keeps its own proportions`,
        Math.abs(drawn - aspect) < 0.02,
        `asked ${aspect.toFixed(2)}, drawn ${drawn.toFixed(2)}`,
      );
    }
  }
}

/* A share of the width, so the mark reads the same size against the picture
   whatever shape the film is. Checked as a relationship rather than as a
   number, so tuning MARK_SHARE does not break the rule it is tuned within. */
const tall = markBox(1080, 1920, 1, 'bottomRight');
const wide = markBox(1920, 1080, 1, 'bottomRight');
ok(
  'the mark is a share of the width, not of whatever side is shorter',
  Math.abs(tall.w - 1080 * MARK_SHARE) < 1 && Math.abs(wide.w - 1920 * MARK_SHARE) < 1,
  `${Math.round(tall.w)} on tall, ${Math.round(wide.w)} on wide`,
);
ok('and it is a sixth of the frame or less, not the subject of it', MARK_SHARE <= 0.2);
ok('and it does not touch the edge of the safe box', MARK_INSET > 0);

/* And it is actually drawn, in the one place that already paints every
   frame. A module nobody calls is the fault this whole thing started as. */
const stitch = readFileSync('app/lib/stitch.ts', 'utf8');
ok('the stitcher draws it', /drawMark\(context, cut\.mark/.test(stitch));
ok(
  '  after the caption, so the caption cannot slide over it',
  before(stitch, 'drawCaption(context', 'drawMark(context'),
);
ok(
  '  and only when the cut asks for one, so an unbranded film is unchanged',
  /if \(cut\.mark\) drawMark/.test(stitch),
);

/* ── The filmed take, and the one ordering that makes it safe ────────────

   A take cannot be re-recorded. The moment has gone. So the marking pass
   runs AFTER `setTake`, never instead of it: from that line on she has her
   take, and the pass that follows either improves it or is discarded. Get
   that order the wrong way round and a failed pass loses a performance.

   Checked as an ordering in the source rather than by running it, because
   the failure it guards against only appears when something else goes
   wrong, and a probe cannot make a MediaRecorder fail on demand. */
const follow = readFileSync('app/components/FollowWords.tsx', 'utf8');
ok('the filmed take is branded too', /markTake\(raw, mark/.test(follow));
/* Pinned to the SHAPE, not to two positions in the file.

   The first version of this compared indexes — setTake before markTake —
   and I tried to prove it by moving the call inside the guard. It still
   passed, because setTake was still earlier in the text. An ordering is not
   what makes this safe; what makes it safe is that the take is set
   UNCONDITIONALLY, before any branch, so no path can reach the marking pass
   without her already having the file. That is a shape a regex can hold:
   the bare call, then the guard, in that order and with nothing between
   them but a comment. */
ok(
  '  but only after the take itself is unconditionally in hand',
  /setTake\(raw\);\s*(?:\/\*[\s\S]*?\*\/\s*)?if \(!mark \|\| !brandIt\) return;/.test(follow),
  'the pass must not be reachable on any path where the take is not already saved',
);
ok(
  '  and the camera recording itself is untouched',
  /new MediaRecorder\(built \? built\.stream : camera/.test(follow),
  'a canvas inside a live take is a dropped frame in a moment that cannot be repeated',
);
ok(
  '  and the screen says the pass is running, because it is real time',
  /data-marking=/.test(follow) && /aria-live="polite"/.test(follow),
);
ok(
  '  and says the take is already saved without it',
  /"sing\.marking"/.test(readFileSync('app/lib/i18n.tsx', 'utf8')),
);

const mark = readFileSync('app/lib/logomark.ts', 'utf8');
ok(
  'the take keeps its own sound through the pass',
  /createMediaElementSource/.test(mark) && /createMediaStreamDestination/.test(mark),
  'the stitcher drops clip audio by design; a take IS its audio',
);
ok(
  '  and the pass is silent to whoever is waiting for it',
  !/connect\(context\.destination\)/.test(mark),
  'routing to the speakers would play the take back at them while it marks',
);
ok(
  '  and one failed pass gives back nothing rather than a broken file',
  /return \{ ok: false, why: 'failed' \}/.test(mark),
);

if (failures) {
  console.error(`\ncheck:logomark — ${failures} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:logomark — the logo lands inside what TikTok, Reels and Shorts all leave visible,'
  + ' keeps its shape, and is painted over the picture rather than under the furniture.',
);
