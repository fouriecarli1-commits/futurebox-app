/**
 * Which part of the photograph shows, in numbers rather than on a screen.
 *
 * ── What she asked, and what it was ──────────────────────────────────────
 *
 * Carli, 7 October 2026: *"Waar edit ek 'n foto?"* She found the screen, and
 * the thing it did not do was choose which part of a picture shows. A phone
 * photograph is 4:3 and a story is 9:16, so something always falls off — and
 * the app chose what, every time, with no argument.
 *
 * ── Why this is arithmetic and not a walk ────────────────────────────────
 *
 * `audit/postwalk.mjs` presses the controls and reads the canvas, which is
 * the only thing that proves the screen is wired up. What it cannot do is
 * say whether 740 pixels is the right number — a probe reading its own
 * output agrees with whatever the code does.
 *
 * So the maths lives in `app/lib/postcrop.ts` as pure functions and this
 * walks real numbers through them, including the exact case she will hit on
 * her own phone: a 4032x3024 photograph in a 1080x1920 story.
 *
 * ── The property worth more than all the others ──────────────────────────
 *
 * In `fill`, the frame is NEVER uncovered, whatever the pan is set to. Not
 * "is clamped on the way in" — cannot be, because the pan is stored as a
 * share of the slack and multiplied by it at the moment of drawing. So the
 * test for it is not a sensible range of values, it is a pile of absurd
 * ones: ten, minus ten, NaN, Infinity. A model where those are safe has no
 * clamp to forget.
 *
 *   npm run check:postcrop
 */
import {
  MIDDLE, ZOOM_MAX, ZOOM_MIN,
  canMove, moveBy, place, showsThrough, type Crop, type Size,
} from '../app/lib/postcrop';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/** Her phone, and the shape she posts to. */
const PHOTO: Size = { width: 4032, height: 3024 };
const STORY: Size = { width: 1080, height: 1920 };
const SQUARE: Size = { width: 1080, height: 1080 };
const near = (a: number, b: number, by = 0.75): boolean => Math.abs(a - b) <= by;

/* ── The case she will actually hit ──────────────────────────────────────── */

const story = place(PHOTO, STORY, MIDDLE);
ok('a 4:3 photo covers a 9:16 story by being scaled on its short side',
  near(story.height, STORY.height) && story.width > STORY.width,
  `${Math.round(story.width)}x${Math.round(story.height)} in 1080x1920`);
ok(`  and that leaves ${Math.round(story.slackX)} pixels falling off each side`,
  near(story.slackX, (PHOTO.width * (STORY.height / PHOTO.height) - STORY.width) / 2),
  'this is the number the app used to choose for her, silently');
ok('  so there is something to drag', canMove(story));

/* ── fill never shows background, however mad the pan ───────────────────── */

const MAD = [0, 1, -1, 10, -10, 999, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
const FRAMES: readonly Size[] = [STORY, SQUARE, { width: 1920, height: 1080 }];
const PICTURES: readonly Size[] = [PHOTO, { width: 3024, height: 4032 }, { width: 1000, height: 1000 }, { width: 50, height: 4000 }];

/* ── At one and above. Below one is a choice now, not a leak ──────────
 
   This swept every zoom including `ZOOM_MIN`, and said `fill` never shows
   background. That was true while `ZOOM_MIN` was 1 — `fill` scales the
   picture until it covers, and a multiple of one or more of that still
   covers.
 
   Carli, 7 October 2026: *"Die foto moet ook kan shrink onder 1.00."* Below
   one it does not cover, and that is the whole point of being allowed below
   one: a small photograph on a colour, with room around it for words. So the
   rule splits — above one it still may not leak, below one it must, and the
   screen must be told either way. A single rule over both would have had to
   be weakened to pass, and a weakened rule is the one that stops catching
   the wedge down the side of a transparent post. */
let leaks = 0;
let tried = 0;
for (const frame of FRAMES) {
  for (const picture of PICTURES) {
    for (const zoom of [1, 1.37, 2, ZOOM_MAX, 999, Number.NaN]) {
      for (const x of MAD) {
        for (const y of MAD) {
          tried += 1;
          const crop: Crop = { basis: 'fill', zoom, x, y };
          if (showsThrough(place(picture, frame, crop), frame)) leaks += 1;
        }
      }
    }
  }
}
ok(`fill at one and above leaves no part of the frame uncovered, in ${tried} placements`,
  leaks === 0,
  `${leaks} of them showed background through — which on a transparent post is`
  + ' an invisible wedge down one side until it is over somebody’s video');

/* And shrinking really shrinks, rather than being clamped back to covering.
   `ZOOM_MIN` moved from 1 to a fifth; a `held()` left at the old floor would
   make every value below one behave as one, and the slider would simply stop
   doing anything on its left-hand half. */
const small = place(PHOTO, STORY, { basis: 'fill', zoom: ZOOM_MIN, x: 0, y: 0 });
const atOne = place(PHOTO, STORY, { basis: 'fill', zoom: 1, x: 0, y: 0 });
ok('  and below one it really is smaller',
  small.width < atOne.width * 0.5,
  `${Math.round(small.width)} against ${Math.round(atOne.width)} at one — a floor`
  + ' left at 1 makes the whole left half of the slider do nothing');
ok('    and the screen is told the rest is background',
  showsThrough(small, STORY),
  'a picture smaller than the frame with nothing said about it is a'
  + ' see-through wedge she finds out about afterwards');

/* And the reason it cannot: the stored pan is a share, not a distance. */
const far = place(PHOTO, STORY, { basis: 'fill', zoom: 1, x: 999, y: 999 });
const edge = place(PHOTO, STORY, { basis: 'fill', zoom: 1, x: 1, y: 1 });
ok('  because a pan past the end is the end, not past it',
  near(far.left, edge.left) && near(far.top, edge.top),
  `${Math.round(far.left)} against ${Math.round(edge.left)}`);

/* ── whole fits, and says so ─────────────────────────────────────────────── */

const fits = place(PHOTO, STORY, { ...MIDDLE, basis: 'whole' });
ok('the whole picture fits inside the frame with nothing lost',
  fits.width <= STORY.width + 0.5 && fits.height <= STORY.height + 0.5,
  `${Math.round(fits.width)}x${Math.round(fits.height)}`);
ok('  and the screen is told the rest is background', showsThrough(fits, STORY));

/* ── A letterboxed picture can be moved, and cannot be pushed out ─────
 
   This said "there is nothing to drag, because there is no slack", and the
   slack was `Math.max(0, overhang)` — nought for a picture smaller than the
   frame, so it was nailed to the middle.
 
   Carli, 7 October 2026: *"dit moet ook gedrag kan word soos mens die
   behoefte het."* A picture smaller than the frame has exactly as much room
   to move as one bigger than it; moving it slides it about INSIDE the frame
   instead of sliding the frame about inside it, and nailed to the centre it
   can only ever be a small picture in the middle.
 
   So the invariant that replaces "cannot be moved" is "cannot be pushed
   out". That is the one that was really being protected: a stored pan that
   means more than the room available is how a picture ends up half off the
   edge of a post. Every value the pan can hold, including the ones that are
   not numbers. */
ok('  and it CAN be dragged, because a small picture has room inside the frame',
  canMove(fits),
  'nailed to the middle, a picture smaller than the frame can only ever be a'
  + ' small picture in the middle, which is not a layout anybody chose');

const shifted = MAD.map((one) => place(PHOTO, STORY, { basis: 'whole', zoom: 1, x: one, y: one }));
const held = shifted.filter((one) => one.left < -0.5 || one.top < -0.5
  || one.left + one.width > STORY.width + 0.5
  || one.top + one.height > STORY.height + 0.5);
ok('    and no pan value can push it outside the frame',
  held.length === 0,
  held.map((one) => `${Math.round(one.left)},${Math.round(one.top)} `
    + `${Math.round(one.width)}x${Math.round(one.height)}`).join(' | ')
  + ` in ${STORY.width}x${STORY.height} — a pan that means more than the room`
  + ' there is, is a picture half off the edge of a post');

/* And it reaches the edge, rather than stopping somewhere short of it: a
   pan of 1 is "as far as it goes", and a small picture's as-far-as-it-goes
   is its own edge against the frame's. */
const corner = place(PHOTO, STORY, { basis: 'whole', zoom: 1, x: -1, y: -1 });
ok('    and a pan of one really reaches the edge',
  near(corner.left, 0) && near(corner.top, 0),
  `${Math.round(corner.left)},${Math.round(corner.top)} — stopping short means`
  + ' a corner of the frame she can never put the picture into');

/* ── Zoom is a multiple of the basis, in both bases ─────────────────────── */

const twice = place(PHOTO, STORY, { ...MIDDLE, zoom: 2 });
ok('going twice as close doubles the picture', near(twice.width, story.width * 2, 2)
  && near(twice.height, story.height * 2, 2),
  `${Math.round(twice.width)} against ${Math.round(story.width * 2)}`);
ok('  and keeps it centred when the pan is nought',
  near(twice.left + twice.width / 2, STORY.width / 2)
  && near(twice.top + twice.height / 2, STORY.height / 2));
/* The threshold, both sides of it.
 
   My first version of this asserted that 2x covers, reasoning that a
   contained 4:3 is 1080 wide and doubles to 2160 against a 1080 frame. The
   width was never the constraint. Contained in a 9:16 frame that photo is
   1080 x 810, and the frame is 1920 tall — so it needs 1920/810, about 2.37,
   and at 2x it is still 300 pixels short top and bottom. The check was wrong
   about the code, which is the costlier direction, and pinning the number
   from both sides is what stops me reasoning about the wrong edge again. */
const wholeTwice = place(PHOTO, STORY, { basis: 'whole', zoom: 2, x: 0, y: 0 });
ok('  and the whole picture at 2x still does not reach top and bottom',
  showsThrough(wholeTwice, STORY) && near(wholeTwice.height, 1620, 2),
  `${Math.round(wholeTwice.width)}x${Math.round(wholeTwice.height)} in 1080x1920`);
const enough = STORY.height / (PHOTO.height * (STORY.width / PHOTO.width));
const wholeCovers = place(PHOTO, STORY, { basis: 'whole', zoom: enough, x: 0, y: 0 });
ok(`  and covers it at ${enough.toFixed(2)}x, which is the frame over the fitted height`,
  !showsThrough(wholeCovers, STORY) && enough < ZOOM_MAX,
  `${Math.round(wholeCovers.height)} against ${STORY.height}, and the slider stops at ${ZOOM_MAX}`);

/* ── A drag moves by what the thumb moved, and stops at the edge ────────── */

const moved = moveBy(MIDDLE, story, story.slackX / 2, 0);
ok('a drag of half the slack moves the picture half way',
  near(moved.x, 0.5, 0.01) && moved.y === 0,
  `x became ${moved.x.toFixed(3)}`);
const pinned = moveBy({ basis: 'fill', zoom: 1, x: 1, y: 0 }, story, story.slackX, 0);
ok('  and a drag past the edge stays at the edge', pinned.x === 1, `${pinned.x}`);

/* An axis with no slack is LEFT ALONE rather than zeroed, or the same
   gesture on a tall shape quietly re-centres the other axis. */
const sideways = place(PHOTO, STORY, MIDDLE);
const kept = moveBy({ basis: 'fill', zoom: 1, x: 0.4, y: 0.4 }, sideways, 0, 50);
ok('  and a drag along an axis with no room leaves that axis where it was',
  kept.y === 0.4, `y became ${kept.y}, and the slack down is ${sideways.slackY}`);

/* ── A picture with no size at all does not break the frame ─────────────── */

const silly = place({ width: 0, height: 0 }, STORY, MIDDLE);
ok('a picture reporting no size still places somewhere real',
  Number.isFinite(silly.left) && Number.isFinite(silly.width) && silly.width > 0,
  `${silly.width}x${silly.height} at ${silly.left},${silly.top}`);

if (bad) {
  console.error(`\ncheck:postcrop — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  `\ncheck:postcrop — fill covers the frame in all ${tried} placements, the whole`
  + ' picture fits and says so, and a drag stops at the edge.',
);
