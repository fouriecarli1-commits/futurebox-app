/**
 * Which part of a photograph shows, and how close.
 *
 * ── The fault this exists for ────────────────────────────────────────────
 *
 * Carli, 7 October 2026: *"Waar edit ek 'n foto?"* — and when she found the
 * screen, what it did not do was choose which part of the picture shows.
 *
 * That is not a nicety, it is the thing you hit every single time. A phone
 * photograph is 4:3 and a story is 9:16. A 4032x3024 photo covering a
 * 1080x1920 frame is drawn 2560 wide, so 740 pixels fall off each side and
 * the app decided which 740 — every time, with no way to argue. Anything not
 * dead centre is cut in half: a face at the edge, a sign, a person.
 *
 * ── Why the pan is stored as a FRACTION of the slack ─────────────────────
 *
 * This is the whole design, and it is the one decision worth explaining.
 *
 * The obvious model stores the offset in pixels and clamps it so the picture
 * never slides off the frame and leaves a gap. That clamp then has to be
 * applied again on every zoom change, every basis change, every new picture
 * and every change of shape — and the one place it is forgotten is a
 * transparent wedge down one side of a post, which on a dark phone screen
 * looks like nothing at all until it is over somebody's video.
 *
 * So `x` and `y` are held in -1..1 and MULTIPLIED by however much slack
 * there happens to be. There is no state that can be out of range, because
 * the range is applied at the moment of drawing rather than stored. Zero is
 * centred, 1 is as far as it can go, and a picture with no slack in an axis
 * cannot be moved along it however hard anything pushes — the slack is zero,
 * so the offset is zero.
 *
 * The cost is honest and small: zooming keeps the relative framing rather
 * than the absolute spot, so "two-thirds of the way across" stays
 * two-thirds of the way across as it gets closer. That reads as the picture
 * holding its composition, which is the better of the two behaviours anyway.
 *
 * ── The two bases ────────────────────────────────────────────────────────
 *
 * `fill` is cover: the picture is scaled until it covers the frame and the
 * rest falls off the edges. `whole` is contain: the whole picture fits and
 * the background shows around it, which is what somebody wants when the
 * photograph itself is the point and nothing in it may be lost. With the
 * background turned off, `whole` is a picture on nothing — which is why the
 * two features belong on the same screen.
 */

/** How close in, as a multiple of the basis. 1 is the basis itself. */
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 0.05;

export type Basis = 'fill' | 'whole';

export interface Crop {
  readonly basis: Basis;
  /** `ZOOM_MIN`..`ZOOM_MAX`. */
  readonly zoom: number;
  /** Across, -1..1, as a share of whatever slack there is. */
  readonly x: number;
  /** Up and down, -1..1, same. */
  readonly y: number;
}

export const MIDDLE: Crop = { basis: 'fill', zoom: 1, x: 0, y: 0 };

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Placed {
  /** Where the picture's top-left corner goes, in frame units. */
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  /** How far it CAN be moved from centre, in frame units, each way. */
  readonly slackX: number;
  readonly slackY: number;
}

/** Keep a number inside a pair of ends, whichever way round they come. */
const held = (n: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, Number.isFinite(n) ? n : low));

/**
 * Where a picture lands in a frame, and how much room it has to move.
 *
 * Everything the screen draws comes from here, so the screen cannot place a
 * picture one way and report its limits another.
 */
export function place(picture: Size, frame: Size, crop: Crop): Placed {
  const wide = picture.width > 0 ? picture.width : 1;
  const tall = picture.height > 0 ? picture.height : 1;

  const across = frame.width / wide;
  const down = frame.height / tall;
  /* `fill` takes the larger scale so neither edge falls short; `whole` takes
     the smaller so neither edge runs over. That is the entire difference
     between the two bases. */
  const basis = crop.basis === 'fill' ? Math.max(across, down) : Math.min(across, down);

  const scale = basis * held(crop.zoom, ZOOM_MIN, ZOOM_MAX);
  const width = wide * scale;
  const height = tall * scale;

  /* Slack is never negative: a picture narrower than the frame has nowhere
     to go, and `Math.max(0, …)` is what makes the stored fraction safe. */
  const slackX = Math.max(0, (width - frame.width) / 2);
  const slackY = Math.max(0, (height - frame.height) / 2);

  return {
    left: (frame.width - width) / 2 + held(crop.x, -1, 1) * slackX,
    top: (frame.height - height) / 2 + held(crop.y, -1, 1) * slackY,
    width,
    height,
    slackX,
    slackY,
  };
}

/** Whether there is anything to drag. Nothing to pan is not a broken drag. */
export const canMove = (at: Placed): boolean => at.slackX > 0.5 || at.slackY > 0.5;

/**
 * A drag, in frame units, turned into a new crop.
 *
 * The movement is divided by the slack, so a picture with a little room
 * moves a little and one with a lot moves a lot — the thumb covers the same
 * distance on screen either way, which is what makes it feel like dragging
 * the picture rather than a hidden slider.
 *
 * An axis with no slack is left exactly as it was rather than set to zero:
 * the same gesture on a different shape should not quietly re-centre the
 * other axis.
 */
export function moveBy(crop: Crop, at: Placed, byX: number, byY: number): Crop {
  return {
    ...crop,
    x: at.slackX > 0 ? held(crop.x + byX / at.slackX, -1, 1) : crop.x,
    y: at.slackY > 0 ? held(crop.y + byY / at.slackY, -1, 1) : crop.y,
  };
}

/** Closer in or further out, with the ends respected. */
export const zoomTo = (crop: Crop, to: number): Crop =>
  ({ ...crop, zoom: held(to, ZOOM_MIN, ZOOM_MAX) });

/**
 * Whether the picture leaves any of the frame uncovered.
 *
 * Used to say so on screen rather than to prevent it: `whole` is a choice,
 * and with the background off it is a picture on nothing, which is a real
 * thing to want. What it is not is a surprise, so the screen says when some
 * of the frame is background rather than photograph.
 */
export const showsThrough = (at: Placed, frame: Size): boolean =>
  at.left > 0.5 || at.top > 0.5
  || at.left + at.width < frame.width - 0.5
  || at.top + at.height < frame.height - 0.5;
