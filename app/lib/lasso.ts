/**
 * Drawing round a thing with a finger, and keeping it or losing it.
 *
 * ── Where this sits between the other two ────────────────────────────────
 *
 * The room already had two ways to take something out of a photograph, and
 * each of them has a shape of problem it is good at:
 *
 *   · `cutout.ts` asks a model to find a PERSON and takes everything else
 *     away. One press, very good, and it knows nothing about guitars, dogs,
 *     cars or bottles — on anything that is not a person it answers "no
 *     person could be found" and stops.
 *   · `erase.ts` grows the picture inwards over a gap. It is for making
 *     something small disappear — a bin, a sign, a stranger at the edge —
 *     and it cannot invent what was behind anything bigger.
 *
 * Neither answers "keep THIS thing". A lasso does, on anything at all, with
 * no model and no supplier, because the person holding the phone already
 * knows where the edges are. It is the slowest of the three and the only one
 * that always works.
 *
 * ── Shares again, and for the third time the same reason ─────────────────
 *
 * Every point is a share of the picture's own width and height, as in
 * `cropbox.ts` and for the same reason: the path then means the same thing
 * after the picture is replaced, cropped, read or enlarged, and the drawing
 * is a multiplication rather than a conversion nobody can see to check.
 *
 * ── What is clamped, and where ───────────────────────────────────────────
 *
 * On the way in, here, as everywhere else in this room. A finger that leaves
 * the picture mid-stroke — which happens on every single trace around
 * something at the edge of the frame — gives points outside 0..1, and a
 * polygon with a corner at -3 is drawn into a mask canvas as nothing at all
 * on some browsers and as a enormous wedge on others.
 */

/** A point on the picture, as a share of its width and height. */
export interface Dot {
  readonly x: number;
  readonly y: number;
}

export type Path = readonly Dot[];

/**
 * How far a finger must travel before another point is recorded.
 *
 * A pointermove fires for every pixel the finger covers, so a trace round a
 * person is six hundred points and the mask canvas is asked to fill a
 * six-hundred-sided polygon on every frame. Six thousandths of the picture
 * is about seven pixels on a 1080-wide photograph: close enough that no
 * corner anybody draws with a finger is lost, far enough that the path stays
 * a few dozen points.
 */
export const NEAR = 0.006;

/**
 * Smaller than this and it was a tap, not a shape.
 *
 * Four thousandths of the picture — a twentieth by a fifth, or about 65 by 65
 * pixels on a 1080x1080 photograph. Below that the thing being kept is too
 * small to see what it was, and the likeliest explanation is a finger that
 * touched the glass while scrolling.
 */
export const ENOUGH = 0.004;

/** And this much of the picture is not a selection, it is the picture. */
export const NEARLY_ALL = 0.985;

const hold = (n: number): number => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));

/**
 * One more point on the path, if the finger has gone far enough.
 *
 * The first point is always kept — there is nothing to be far from — and
 * every point is held inside the picture, because a finger traced round
 * something at the edge leaves it on nearly every stroke.
 */
export function trace(path: Path, at: Dot): Path {
  const dot = { x: hold(at.x), y: hold(at.y) };
  const last = path[path.length - 1];
  if (last && Math.hypot(dot.x - last.x, dot.y - last.y) < NEAR) return path;
  return [...path, dot];
}

/** Enough points to be a shape rather than a line. */
export const closed = (path: Path): boolean => path.length >= 3;

/**
 * How much of the picture is inside the path.
 *
 * The shoelace formula, and the absolute value of it: a path drawn
 * anticlockwise has a negative signed area, and which way somebody's finger
 * went round a thing is not information about anything. The first version
 * returned the signed number and "did she draw enough" was true for a
 * clockwise trace and false for the identical one drawn the other way.
 *
 * The polygon is closed between the last point and the first, which is what
 * the drawing does too — a lasso nobody joins up is a lasso with one
 * enormous straight edge, and showing it joined is how somebody knows the
 * shape is finished.
 */
export function area(path: Path): number {
  if (!closed(path)) return 0;
  let sum = 0;
  for (let i = 0; i < path.length; i += 1) {
    const one = path[i];
    const next = path[(i + 1) % path.length];
    sum += one.x * next.y - next.x * one.y;
  }
  return Math.abs(sum) / 2;
}

/** Is there a shape here worth cutting along? */
export const worthCutting = (path: Path): boolean => {
  const much = area(path);
  return much >= ENOUGH && much <= NEARLY_ALL;
};

/**
 * Why not, in the one word the screen needs.
 *
 * `null` when it is fine. Separated from `worthCutting` rather than returned
 * instead of it, because most callers want the question and one wants the
 * reason, and a caller that has to compare against a string to ask a yes-or-no
 * question gets it wrong the first time the wording changes.
 */
export const whyNot = (path: Path): 'short' | 'small' | 'all' | null => {
  if (!closed(path)) return 'short';
  const much = area(path);
  if (much < ENOUGH) return 'small';
  if (much > NEARLY_ALL) return 'all';
  return null;
};

/**
 * How soft the cut edge is, in pixels of the picture.
 *
 * A quarter of a per cent of the shorter side — about three pixels on a
 * 1080-wide photograph. The path is drawn at the picture's own resolution so
 * its edge is already smooth; this is only to stop the hard line that an
 * antialiased polygon still shows against a very different colour.
 *
 * Nothing like the background remover's settings, and that is not an
 * oversight: its mask comes back 256 pixels square whatever the photograph
 * was, so one mask pixel is a block ten or more across and the edge has to be
 * grown in steps. This mask is drawn at full size. There is no staircase to
 * soften, so there is no choice to offer.
 */
export const softness = (of: { readonly width: number; readonly height: number }): number =>
  Math.max(1, Math.min(of.width, of.height) * 0.0025);

/**
 * The picture cut along the path, as a new canvas.
 *
 * ── Two directions, one mask ─────────────────────────────────────────────
 *
 * `keep` true keeps what is inside the path and drops the rest, which is the
 * manual answer to the background remover. False drops what is inside and
 * keeps the rest, which is the honest answer to "take this out" on something
 * too big for `erase.ts` to grow the picture over — honest because it leaves
 * a see-through hole rather than inventing what was behind it.
 *
 * The same mask either way, painted the other way round, so the two
 * directions cannot drift apart. A second code path for the inverse is how a
 * feather comes to be soft on one and hard on the other.
 *
 * ── Why `destination-in` and not pixel arithmetic ────────────────────────
 *
 * The same reason as `maskOnto` in `cutout.ts`: the browser's own compositor
 * multiplies the alpha for us, at whatever precision it has, in one pass. A
 * loop over four million pixels in JavaScript is slower, and the hand-written
 * multiply is where a half-transparent edge turns into a hard one.
 *
 * Returns `null` rather than an empty canvas when the path is not worth
 * cutting along, so the caller says why in its own words instead of handing
 * back a photograph of nothing.
 */
export function cutAlong(
  picture: CanvasImageSource & { readonly width: number; readonly height: number },
  path: Path,
  keep: boolean,
  of: { readonly width: number; readonly height: number },
): HTMLCanvasElement | null {
  if (!worthCutting(path)) return null;

  const made = document.createElement('canvas');
  made.width = of.width;
  made.height = of.height;
  const ctx = made.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(picture, 0, 0, of.width, of.height);

  const mask = document.createElement('canvas');
  mask.width = of.width;
  mask.height = of.height;
  const on = mask.getContext('2d');
  if (!on) return null;

  /* White is kept, nothing is dropped — the mask's own alpha is what
     `destination-in` reads, so the colour is only there to be visible if
     anybody ever draws this canvas to look at it. */
  on.fillStyle = '#ffffff';
  if (!keep) on.fillRect(0, 0, of.width, of.height);
  on.beginPath();
  on.moveTo(path[0].x * of.width, path[0].y * of.height);
  for (const dot of path.slice(1)) on.lineTo(dot.x * of.width, dot.y * of.height);
  on.closePath();
  if (keep) {
    on.fill();
  } else {
    /* Out of the solid sheet, which is the same shape taken away rather than
       a second shape drawn. */
    on.globalCompositeOperation = 'destination-out';
    on.fill();
    on.globalCompositeOperation = 'source-over';
  }

  /* The soft edge, blurred at the picture's own size — see `softness`. Drawn
     through the filter onto a second canvas rather than filtered in place,
     because `ctx.filter` applies to drawing operations and not to pixels
     already written. */
  const soft = document.createElement('canvas');
  soft.width = of.width;
  soft.height = of.height;
  const edge = soft.getContext('2d');
  if (!edge) return null;
  edge.filter = `blur(${softness(of)}px)`;
  edge.drawImage(mask, 0, 0);
  edge.filter = 'none';

  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(soft, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  return made;
}

/**
 * The four ways to say which part of a picture you mean.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 8 October 2026: *"Ek dink daai opsie moet verskillende shapes hê
 * waarvan iemand kan kies om mee te cut. 'N circle, 'n vierkand, 'n lyn, 'n
 * pencil waar jy totale vryheid het om mooi om elke edge te sny."*
 *
 * She is right that one of these is not enough, and right about which four.
 * They are not four features; they are four answers to "how hard is this
 * edge", and the one somebody reaches for says what kind of picture it is:
 *
 *   · `circle` — a face, a plate, a logo, a moon. Two corners of a drag and
 *     it is done, and nothing drawn by hand is as round as this.
 *   · `square` — a sign, a window, a screen, a label. Same gesture.
 *   · `line`  — a building, a table, a box, anything made by people. Tap
 *     each corner; the edges between them are exactly straight, which is
 *     the one thing a finger cannot do.
 *   · `pencil` — everything else. The slowest and the only one that can
 *     follow hair, a hand or a leaf.
 *
 * All four end as the same `Path`, so `cutAlong` has never heard of them and
 * the mask, the feather and the two directions are the same code for all
 * four. A shape that compiled to its own mask would be four edges to get
 * right instead of one.
 */
export const SHAPES = ['pencil', 'circle', 'square', 'line'] as const;
export type Shape = (typeof SHAPES)[number];

/** Is this one drawn by dragging two corners apart? */
export const dragged = (how: Shape): boolean => how === 'circle' || how === 'square';

/** A rectangle, from the two corners of a drag. */
export function boxPath(from: Dot, to: Dot): Path {
  const left = hold(Math.min(from.x, to.x));
  const right = hold(Math.max(from.x, to.x));
  const top = hold(Math.min(from.y, to.y));
  const bottom = hold(Math.max(from.y, to.y));
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];
}

/**
 * How many points an ellipse is drawn with.
 *
 * Sixty-four. The mask is filled at the picture's own resolution, so the
 * flat side between two points is about one fiftieth of the ring — half a
 * pixel on a 1080-wide circle, which is under the feather and cannot be
 * seen. Sixteen is visibly a polygon on anything bigger than a thumbnail;
 * two hundred and fifty-six is slower to fill for no difference at all.
 */
export const ROUND = 64;

/** An ellipse inscribed in the two corners of a drag. */
export function ringPath(from: Dot, to: Dot, points: number = ROUND): Path {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const acrossX = Math.abs(to.x - from.x) / 2;
  const acrossY = Math.abs(to.y - from.y) / 2;
  const out: Dot[] = [];
  for (let i = 0; i < points; i += 1) {
    const turn = (i / points) * Math.PI * 2;
    out.push({
      x: hold(midX + Math.cos(turn) * acrossX),
      y: hold(midY + Math.sin(turn) * acrossY),
    });
  }
  return out;
}

/**
 * The path a shape makes from where a gesture started and where it is now.
 *
 * One function so the room does not have to know which shapes are dragged
 * and which are traced — it hands over what it has and gets back a path. A
 * `pencil` or a `line` is already a path and comes back untouched, because
 * their points were put there one at a time.
 */
export function shapePath(how: Shape, from: Dot | null, to: Dot, made: Path): Path {
  if (!dragged(how) || !from) return made;
  return how === 'circle' ? ringPath(from, to) : boxPath(from, to);
}
