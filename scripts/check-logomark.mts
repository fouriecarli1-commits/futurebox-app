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
import { before, from, upTo } from './order.mts';

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
/* ── Written to allow a line break, 1 October 2026 ───────────────────────

   These three pinned the exact one-line form — `drawMark(context, cut.mark`
   and `if (cut.mark) drawMark` — and went red when the call grew a fourth and
   fifth argument and wrapped onto several lines. Nothing about the rule had
   been broken: the guard was there, the order was there, the mark was there.

   The same fault `check:align` had on 30 September, where asserting the exact
   string `noteCost(upstream, 'align')` held a missing argument in place. A
   check that asserts the SHAPE of a line keeps the line still, and the thing
   worth keeping still is the behaviour. */
ok('the stitcher draws it', /drawMark\(\s*context,\s*cut\.mark/.test(stitch));

/* ── Why this is no longer `before(drawCaption, drawMark)` ────────────────

   2 October 2026. The two calls moved into closures — `words()` and
   `badge()` — so that `markUnder` can swap them, and the ordering is now the
   line that CALLS them. The order they are DEFINED in says nothing about what
   gets painted first.

   The old assertion, `before(stitch, 'drawCaption(context', 'drawMark(')`,
   stayed GREEN through that change, because `drawCaption(` is still earlier in
   the file than `drawMark(`. It would have stayed green with the dispatch
   written the wrong way round. That is a check measuring the thing beside the
   real thing, which is the one fault this repository keeps finding, so the
   assertion moved onto the dispatch itself.

   Sliced rather than regexed so it tolerates the line wrapping, which is the
   lesson of the note above this. The window ends at the next comment rather
   than at a newline, for the same reason: a dispatch that grows long enough to
   wrap is still the same dispatch, and a slice that stopped at the first
   newline would read half of it and report an ordering that is not there. */
const dispatch = upTo(from(stitch, 'if (cut.markUnder)'), '/*');
const otherwise = from(dispatch, 'else');
ok(
  '  with the caption and the mark dispatched, not called where they are written',
  dispatch.includes('words()') && dispatch.includes('badge()'),
);
ok(
  '  after the caption by default, so the caption cannot slide over it',
  before(otherwise, 'words()', 'badge()'),
);
ok(
  '  and under it only when the cut asks, which is the only way round it',
  before(upTo(dispatch, 'else'), 'badge()', 'words()'),
);
ok(
  '  and only when the cut asks for one, so an unbranded film is unchanged',
  /if \(!cut\.mark\) return;/.test(stitch) || /if \(cut\.mark\)\s*\{?\s*drawMark/.test(stitch),
);

/* ── And the preview agrees about which is on top ─────────────────────────

   The same reason `CORNER_AT` is measured against `markBox`: the render
   stacks with the order it paints in and the preview stacks with `z-index`,
   and nothing can be shared between a canvas and a `<div>`. So the one thing
   that CAN be checked is that both sides read the same flag — a preview that
   showed the mark on top while the film put it underneath would be a decision
   she makes on a lie. */
const room = readFileSync('app/components/VideoEditor.tsx', 'utf8');
ok(
  'the preview stacks the mark from the same flag the film does',
  /zIndex:\s*markUnder \?/.test(room),
);
ok(
  '  and the flag reaches the stitcher',
  /markTurn,\s*markSolid,\s*markUnder,/.test(room),
);

/* ── The box those fractions are fractions OF ─────────────────────────────

   3 October 2026, and this is the fault the two assertions above could not see.

   They compare `CORNER_AT`'s fractions with `markBox`'s arithmetic and they
   agreed exactly — both right about the fraction. What neither of them asked was
   what the preview was positioning those fractions INSIDE: it was the clip's own
   shape, and `markBox` reads the FILM's. A logo dragged to the bottom of a
   landscape clip in a vertical film came out in the black bar under the picture,
   with every number in this check green.

   A check comparing two halves of a calculation has to assert what they are
   calculations of. `check:editor` measures the box's real ratio in a browser;
   this holds the one line that makes it so. */
ok(
  'the preview is drawn in the FILM\'s shape, so a fraction means one thing',
  /aspectRatio:\s*`\$\{shape\.width\} \/ \$\{shape\.height\}`/.test(room),
  'fractions of the clip\'s box and fractions of the film\'s frame are different'
  + ' places, and the logo is placed in one and painted in the other',
);
ok(
  '  and that shape is the one the edit asked for, not a constant',
  /const shape = SHAPES\[edit\.shape \?\? 'tall'\]/.test(room),
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
