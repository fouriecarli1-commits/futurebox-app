/**
 * Colours for words, and what sits behind them.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 4 October 2026: *"Onthou dat die teks 'n kleur keuse ook moet hê, en
 * 'n keuse van agtergrond vir woorde, 'n square, 'n square met ronde punte, 'n
 * verfkwas. Die agtergrond moet ook kleur keuse hê. Daar moet 'n goeie variety
 * van kleur keuses wees."*
 *
 * Four things: a colour for the text, a shape behind it, a colour for that
 * shape, and enough colours to choose from that it is a choice rather than a
 * list.
 *
 * ── Why the swatches are a fixed set and not a colour wheel ──────────────
 *
 * A wheel gives every colour, which sounds generous and is not: most of the
 * wheel is unreadable on video. Mid-grey text on a mid-grey box is a caption
 * nobody can read, and a picker that offers it offers a mistake. Every pair
 * that can be made from this set clears 4.5:1 against each other or is a
 * deliberate pairing somebody chose — `check:videopaint` holds that, and it is
 * the same bar the rest of the app is measured at.
 *
 * Twenty, which is a good variety and still a grid somebody can see at once:
 * the neutrals a caption is usually set in, the app's own green, and then warm
 * through cool so the row reads as a spectrum rather than a jumble.
 *
 * Two of them were retuned the day they were written, by the check rather than
 * by eye: `bone` was #f5f0e6, fifty channel-values from white, and `teal` was
 * #14b8a6, forty-two from green. Two swatches that close are one swatch with
 * two names — somebody picking between them is picking nothing. They are a
 * real cream and a real cyan now.
 */

/** One swatch: a colour and the key its name is translated under. */
export type Paint = {
  readonly id: string;
  readonly hex: string;
  /** The i18n key and the English fallback, as the rest of this app writes them. */
  readonly name: readonly [string, string];
};

/**
 * The swatches, warm to cool after the neutrals.
 *
 * Ordered on purpose. A palette sorted by when somebody added a colour looks
 * like a bag of colours; a palette that runs through the spectrum looks like a
 * palette, and the eye finds the one it wants without reading any names.
 */
export const PAINTS: readonly Paint[] = [
  { id: 'white', hex: '#ffffff', name: ['paint.white', 'White'] },
  { id: 'bone', hex: '#f0e4c8', name: ['paint.bone', 'Bone'] },
  { id: 'grey', hex: '#9aa0a6', name: ['paint.grey', 'Grey'] },
  { id: 'black', hex: '#000000', name: ['paint.black', 'Black'] },
  { id: 'red', hex: '#e02424', name: ['paint.red', 'Red'] },
  { id: 'rust', hex: '#b4441c', name: ['paint.rust', 'Rust'] },
  { id: 'orange', hex: '#f97316', name: ['paint.orange', 'Orange'] },
  { id: 'amber', hex: '#f0b429', name: ['paint.amber', 'Amber'] },
  { id: 'yellow', hex: '#f7e017', name: ['paint.yellow', 'Yellow'] },
  { id: 'lime', hex: '#a3e635', name: ['paint.lime', 'Lime'] },
  { id: 'green', hex: '#10b981', name: ['paint.green', 'Green'] },
  { id: 'forest', hex: '#15603f', name: ['paint.forest', 'Forest'] },
  { id: 'teal', hex: '#0891b2', name: ['paint.teal', 'Teal'] },
  { id: 'sky', hex: '#38bdf8', name: ['paint.sky', 'Sky'] },
  { id: 'blue', hex: '#2563eb', name: ['paint.blue', 'Blue'] },
  { id: 'navy', hex: '#15306b', name: ['paint.navy', 'Navy'] },
  { id: 'violet', hex: '#8b5cf6', name: ['paint.violet', 'Violet'] },
  { id: 'plum', hex: '#6b2160', name: ['paint.plum', 'Plum'] },
  { id: 'pink', hex: '#ec4899', name: ['paint.pink', 'Pink'] },
  { id: 'sand', hex: '#c8a27a', name: ['paint.sand', 'Sand'] },
];

/** What a caption is set in when nobody has chosen. White on black, as before. */
export const INK_DEFAULT = '#ffffff';
export const BACK_DEFAULT = '#000000';

/** A swatch by id, or null — never a silent fallback to the first row. */
export function paintFor(id: string | undefined): Paint | null {
  if (!id) return null;
  return PAINTS.find((one) => one.id === id) ?? null;
}

/**
 * The shapes that can sit behind words.
 *
 * `none` is in the list and is not the absence of a choice: words straight on
 * the picture is what a title card looks like, and leaving it out would make
 * "no box" reachable only by setting the box's opacity to nought, which is a
 * setting nobody finds.
 */
/**
 * What sits behind a caption.
 *
 * ── Four, and she asked for a variety ────────────────────────────────────
 *
 * It was `none | square | round | brush` — the three she named on 4 October
 * plus the title card. Carli, 9 October 2026: *"daar moet van alles wat
 * opsies is, 'n verskeidenheid wees."*
 *
 * Ten now, and every one of them is a shape somebody who has watched
 * television would recognise: the full-width band a news bulletin puts a
 * name in, the ribbon with notched ends a sports graphic uses, the strip of
 * tape a documentary sticks over a photograph, the rule under a title, the
 * hollow frame a title card uses when the picture behind it matters.
 *
 * ── Why they are paths and not a chain of ifs ────────────────────────────
 *
 * `stitch.ts` had `if (shape === 'brush') brushPath(…) else roundRect(…)`,
 * which is a fine shape for two and a bad one for ten — and it put the
 * drawing of a caption in the file that renders a whole film, where a check
 * cannot reach it without a canvas.
 *
 * `boxPath` below takes the shape and draws it. `stitch.ts` asks for the
 * path and fills or strokes it. Adding a shape is adding a case here and a
 * row below, and `check:videopaint` drives every row.
 */
export type BoxShape =
  | 'none' | 'square' | 'round' | 'pill' | 'brush'
  | 'tape' | 'banner' | 'line' | 'outline' | 'bar';

export interface Box {
  readonly id: BoxShape;
  readonly name: readonly [string, string];
  /**
   * Stretches from one edge of the frame to the other.
   *
   * A news bulletin's name band does this, and it is the one property of a
   * shape that changes the GEOMETRY rather than the path: the box stops
   * being as wide as the words. Carried as data so `stitch.ts` reads it
   * rather than naming shapes.
   */
  readonly wide?: boolean;
  /**
   * Drawn as a line rather than filled.
   *
   * The hollow frame and the rule under the words. Both leave the picture
   * visible where a filled box would cover it, which is the reason to have
   * them at all.
   */
  readonly stroked?: boolean;
}

export const BOXES: readonly Box[] = [
  { id: 'none', name: ['box.none', 'No box'] },
  /* ── Named for its corners, not its geometry ─────────────────────
 
     Carli, 10 October 2026: *"square word 3 keer genoem in video editor."*
     She is right and it is a naming fault, not a duplication: the film's
     SHAPE can be square, a caption box's corners can be square, and the
     picture ratios offer a square — three controls, three different things,
     one word.
 
     The frame's shape is genuinely a square and keeps the name. This one is
     not a square: it is a band with sharp corners, and it sits two buttons
     away from "Rounded", which is what it is really being chosen against. So
     it says that.
 
     The id stays `square`, because an id is stored on every edit somebody
     has already made and renaming it would make those edits forget which
     box they had. */
  { id: 'square', name: ['box.square', 'Sharp corners'] },
  { id: 'round', name: ['box.round', 'Rounded'] },
  { id: 'pill', name: ['box.pill', 'Pill'] },
  { id: 'brush', name: ['box.brush', 'Brush'] },
  { id: 'tape', name: ['box.tape', 'Tape'] },
  { id: 'banner', name: ['box.banner', 'Ribbon'] },
  { id: 'bar', name: ['box.bar', 'News band'], wide: true },
  { id: 'line', name: ['box.line', 'Underline'], stroked: true },
  { id: 'outline', name: ['box.outline', 'Frame'], stroked: true },
];

export const BOX_DEFAULT: BoxShape = 'round';

/** The one with this id, or undefined. */
export const boxById = (id: string): Box | undefined =>
  BOXES.find((one) => one.id === id);

/** Whether a string names a shape this app draws. */
export function isBox(what: unknown): what is BoxShape {
  return typeof what === 'string' && BOXES.some((one) => one.id === what);
}

/**
 * How round each shape's corners are, as a share of the band's half-height.
 *
 * The renderer already took a `round` number — 0 a square box, 1 a lozenge —
 * so three of the four shapes are that number and need no new drawing code.
 * Only the brush does, below.
 */
export function roundFor(shape: BoxShape): number {
  if (shape === 'round') return 0.38;
  /* A lozenge. One is the whole half-height, which is what makes a pill a
     pill rather than a very rounded rectangle. */
  if (shape === 'pill') return 1;
  /* Everything else draws its own path and the number is not read. Square is
     zero because square IS the rounded box with no rounding. */
  return 0;
}

/**
 * A painted stroke behind the words, drawn rather than rounded.
 *
 * ── What makes it read as a brush and not as a wobbly rectangle ──────────
 *
 * Three things, and all three are needed:
 *
 *  - The ends are not straight. A real stroke starts where the brush landed
 *    and ends where it left, so both ends are angled and slightly ragged.
 *  - The long edges are not parallel. A stroke made by a hand is thicker
 *    where the hand slowed and thinner where it sped up.
 *  - It overhangs the words. Paint goes past what it is covering; a stroke
 *    that stops exactly at the text looks like a box with bad corners.
 *
 * Deterministic, from the band's own size rather than `Math.random`: a caption
 * that is a different shape on every frame is a caption that boils, and this
 * is drawn once per frame for the whole length of a shot.
 */
export function brushPath(
  context: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
): void {
  /* Past the words on both sides, which is what paint does. */
  const over = h * 0.16;
  const left = x - over;
  const right = x + w + over;
  const lean = h * 0.13;
  /* How far the long edges bow. A straight edge is a rectangle however ragged
     its ends are, so this is what carries the whole effect. */
  const bow = h * 0.1;
  const mid = (left + right) / 2;

  context.beginPath();
  /* The top edge: into the stroke at an angle, bowing up, out at an angle. */
  context.moveTo(left, y + lean);
  context.quadraticCurveTo(mid, y - bow, right, y + lean * 0.55);
  /* The right end, cut at an angle the way a flat brush leaves the surface. */
  context.lineTo(right - lean * 0.5, y + h - lean * 0.25);
  /* The bottom edge, bowing the other way so the stroke is not symmetrical. */
  context.quadraticCurveTo(mid, y + h + bow * 0.85, left + lean * 0.35, y + h - lean * 0.6);
  context.closePath();
}

/**
 * The path for whatever sits behind a caption.
 *
 * ── Why every shape is here and not in the renderer ──────────────────────
 *
 * `stitch.ts` renders a whole film. A caption's corner radius being wrong is
 * not a thing to debug in that file, and a canvas is not a thing a check can
 * drive — so the geometry lives here, takes plain numbers, and
 * `check:videopaint` calls it with a recording context that writes down
 * every instruction instead of drawing.
 *
 * `x, y, w, h` is the band. `round` is the share of the band's half-height
 * the corners take, which only `square`, `round` and `pill` read — the rest
 * have a shape of their own and ignore it.
 *
 * `none` is not here: a shape that draws nothing has nothing to path, and
 * the caller skips it. Calling this with `none` draws the square, which is
 * the one wrong answer a check should catch rather than a silent no-op.
 */
export function boxPath(
  context: CanvasRenderingContext2D,
  shape: BoxShape,
  x: number, y: number, w: number, h: number,
  round: number,
): void {
  if (shape === 'brush') {
    brushPath(context, x, y, w, h);
    return;
  }

  if (shape === 'tape') {
    /* ── A strip of tape ────────────────────────────────────────────────

       What makes it read as tape rather than as a crooked box is that the
       two ends lean the SAME way — a piece torn off a roll and pressed down
       at an angle. Both ends leaning opposite ways is a banner; both
       straight is a box. It also overhangs the words, because tape does.

       Deliberately NOT ragged. A torn edge is what a sticker looks like;
       tape is cut and the cut is clean. */
    const over = h * 0.12;
    const lean = h * 0.22;
    context.beginPath();
    context.moveTo(x - over + lean, y);
    context.lineTo(x + w + over + lean, y);
    context.lineTo(x + w + over - lean, y + h);
    context.lineTo(x - over - lean, y + h);
    context.closePath();
    return;
  }

  if (shape === 'banner') {
    /* ── A ribbon with notched ends ─────────────────────────────────────

       The sports-graphic shape: a band whose ends are cut inwards to a
       point, so it reads as a ribbon passing behind the words rather than
       as a label stuck on top. The notch is a share of the height, so it
       stays the same shape at 32 pixels and at 96.

       The ends go PAST the words by the depth of the notch. Without that
       the notch eats into the first and last letter, which is the one way
       this shape goes wrong and it looks like a font problem. */
    const notch = h * 0.42;
    const left = x - notch;
    const right = x + w + notch;
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(right, y);
    context.lineTo(right - notch, y + h / 2);
    context.lineTo(right, y + h);
    context.lineTo(left, y + h);
    context.lineTo(left + notch, y + h / 2);
    context.closePath();
    return;
  }

  if (shape === 'line') {
    /* A rule under the words, drawn as a stroke. The band's own bottom, a
       little past the text on each side so it reads as an underline rather
       than as a box with three sides missing. */
    const over = h * 0.08;
    context.beginPath();
    context.moveTo(x - over, y + h);
    context.lineTo(x + w + over, y + h);
    return;
  }

  if (shape === 'outline') {
    /* A hollow frame. The same rounded rectangle as `round`, stroked
       instead of filled, so the picture stays visible inside it — which is
       the entire reason somebody picks it over the filled one. */
    context.beginPath();
    context.roundRect(x, y, w, h, Math.round(round * Math.min(h / 2, h / 2)));
    return;
  }

  /* `square`, `round`, `pill` and `bar`: one rounded rectangle, with the
     radius doing the work. `bar` is square-cornered by `roundFor` and gets
     its full width from the caller, because width is geometry and not a
     path. */
  context.beginPath();
  context.roundRect(x, y, w, h, Math.round(round * (h / 2)));
}

/**
 * The same shape, as CSS, for the preview in the cutting room.
 *
 * ── Why this is not "approximate" any more ───────────────────────────────
 *
 * The preview was a div with a `borderRadius`, and its own comment said so
 * honestly: the brush could not be a radius, so it used a wobbly ellipse and
 * said it was showing "a shape, not a box". That was the right call for one
 * shape out of four.
 *
 * With ten it is not, because six of the new ones CAN be drawn exactly in
 * CSS. A ribbon and a strip of tape are `clip-path: polygon(…)` with the same
 * arithmetic the canvas path uses. A frame and an underline are a border. A
 * news band is `left: 0; width: 100%`. Leaving them all as rounded rectangles
 * would mean a person choosing a ribbon sees a box and only finds out what
 * they picked after paying to export — which is the fault the preview exists
 * to prevent, and she has reported it in other rooms.
 *
 * So the geometry is written once, here, for both renderings. The brush stays
 * approximate and stays labelled: a painted stroke with two bowed edges is
 * not a polygon, and a lozenge is the closest an element gets.
 *
 * `px` is the band's height in screen pixels, because every share below is a
 * share of that — the same rule the canvas path follows, so the two agree at
 * any size.
 */
export interface Preview {
  readonly borderRadius?: string;
  readonly clipPath?: string;
  /** True where the band must run the whole width of the frame. */
  readonly wide: boolean;
  /** True where the words sit on the picture and only a line is drawn. */
  readonly stroked: boolean;
  /** How thick that line is, at this size. */
  readonly lineWidth: number;
}

export function previewFor(shape: BoxShape, round: number, px: number): Preview {
  const spec = boxById(shape);
  const wide = spec?.wide === true;
  const stroked = spec?.stroked === true;
  /* The same weight the renderer strokes at: a share of the text size rather
     than a number of pixels, so a frame is not a hairline on a 4K export. */
  const lineWidth = Math.max(2, Math.round(px / 10));
  const plain = { wide, stroked, lineWidth };

  if (shape === 'brush') {
    /* Approximate, and said so rather than implied. A painted stroke with two
       bowed edges and angled ends is not a polygon; this reads as "a shape,
       not a box", and the film draws the real one. */
    return { ...plain, borderRadius: '48% 44% 46% 50% / 60% 56% 58% 54%' };
  }

  if (shape === 'tape') {
    /* The same lean as `boxPath`: 22% of the height, both ends the same way.
       As a percentage of the band's own width it would change with the
       words, so it is worked out in pixels and handed to `polygon` in px. */
    const lean = px * 0.22;
    return {
      ...plain,
      clipPath: `polygon(${lean}px 0, 100% 0, calc(100% - ${lean}px) 100%, 0 100%)`,
    };
  }

  if (shape === 'banner') {
    /* And the same notch: 42% of the height, cut inwards at both ends. */
    const notch = px * 0.42;
    return {
      ...plain,
      clipPath: `polygon(0 0, 100% 0, calc(100% - ${notch}px) 50%, 100% 100%,`
        + ` 0 100%, ${notch}px 50%)`,
    };
  }

  if (shape === 'line' || shape === 'outline') {
    return {
      ...plain,
      borderRadius: shape === 'outline' ? `${Math.round(0.38 * (px / 2))}px` : undefined,
    };
  }

  /* `square`, `round`, `pill`, `bar` and `none`: the radius carries it. */
  return { ...plain, borderRadius: `${Math.round(round * (px / 2))}px` };
}
