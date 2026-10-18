/**
 * The transition book: every transition beyond the first six, as numbers.
 *
 * The owner, 16 October 2026, a run of screenshots of a desktop editor's toolbox:
 * *"Ek gaan nou vir jou 'n klomp foto's gee wat belangrik is vir video
 * editing … Kyk ook hoe netjies dit verpak is."* Dissolves, irises, motion,
 * shapes, wipes and the Fusion set, each in its own group with a little
 * picture of what it does.
 *
 * ── What a transition is here ────────────────────────────────────────────
 *
 * The same honest constraint as `videojoins.ts`: one `<video>` decodes at a
 * time, so the outgoing side is the last frame of the shot before, held
 * still. Every transition below is a way of taking that still away and
 * bringing the moving arriving shot in: a shape that opens, a picture that
 * slides, spins or zooms, a mosaic, a glitch.
 *
 * Each one is `at(p)`: what the screen looks like `p` of the way through, nought
 * to one. Nothing is drawn here. `joinpaint.ts` paints what this answers, the
 * export and the toolbox's little previews alike, so the preview is the
 * transition and not a drawing of it.
 */

/** The groups, in the order her screenshots had them. */
export const JOIN_GROUPS = [
  { id: 'dissolve', en: 'Dissolve', af: 'Oorvloei' },
  { id: 'iris', en: 'Iris', af: 'Iris' },
  { id: 'motion', en: 'Motion', af: 'Beweging' },
  { id: 'shape', en: 'Shape', af: 'Vorm' },
  { id: 'wipe', en: 'Wipe', af: 'Vee' },
  { id: 'fusion', en: 'Effects', af: 'Effekte' },
] as const;
export type JoinGroup = typeof JOIN_GROUPS[number]['id'];

/** One picture's place on the screen during a transition. Absent fields are "as it is". */
export interface Layer {
  /** Across, as a share of the width; positive is right. */
  readonly x?: number;
  /** Down, as a share of the height; positive is down. */
  readonly y?: number;
  readonly scale?: number;
  /** Squeezed across only, one is as it is — a page turning edge-on. */
  readonly squash?: number;
  /** Turned, in turns (one is all the way round). */
  readonly turn?: number;
  /** Softened, as a share of the width. */
  readonly blur?: number;
  readonly alpha?: number;
  /** How it is laid over what is under it. Absent is ordinary. */
  readonly blend?: 'lighter' | 'lighten';
}

/** The shapes a reveal can open in. */
export type MaskKind =
  | 'circle' | 'oval' | 'eye' | 'diamond' | 'square' | 'triangle' | 'pentagon' | 'hexagon'
  | 'cross' | 'arrow' | 'star' | 'heart' | 'box'
  | 'edge' | 'center' | 'band' | 'venetian' | 'clock' | 'radial' | 'spiral' | 'x'
  | 'checker' | 'tile' | 'vee' | 'triLeft' | 'triRight' | 'blocks' | 'curl';

/** What the screen is, `p` of the way through. */
export interface JoinLook {
  readonly held?: Layer;
  readonly arrive?: Layer;
  /** Which picture is on top. The other is drawn whole underneath it. */
  readonly top: 'held' | 'arrive';
  /** The part of the screen the ARRIVING shot has reached, growing with `t`. */
  readonly mask?: { readonly kind: MaskKind; readonly t: number };
  /** The held frame torn in two (`h`) or four (`four`) and pulled apart by `t`. */
  readonly doors?: { readonly kind: 'h' | 'four'; readonly t: number };
  /** The arriving shot in strips that rise into place, staggered. */
  readonly slices?: number;
  /** Something over the whole screen, at strength nought to one. */
  readonly fx?: { readonly kind: 'mosaic' | 'glitch' | 'light'; readonly amount: number; readonly seed?: number };
}

export interface BookJoin {
  readonly id: string;
  readonly group: JoinGroup;
  readonly en: string;
  readonly af: string;
  readonly at: (p: number) => JoinLook;
}

/** In slowly and out slowly, so nothing starts or stops with a jerk. */
export const ease = (p: number): number => {
  const t = Math.max(0, Math.min(1, p));
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
};
/** Up to the middle and back down: nought at both ends, one in the middle. */
const hump = (p: number): number => 1 - Math.abs(Math.max(0, Math.min(1, p)) * 2 - 1);
/** Which half: the held frame until the middle, then the arriving shot. */
const halves = (p: number): 'held' | 'arrive' => (p < 0.5 ? 'held' : 'arrive');

const iris = (id: string, kind: MaskKind, en: string, af: string): BookJoin => ({
  id, group: 'iris', en, af, at: (p) => ({ top: 'held', mask: { kind, t: ease(p) } }),
});
const shape = (id: string, kind: MaskKind, en: string, af: string): BookJoin => ({
  id, group: 'shape', en, af, at: (p) => ({ top: 'held', mask: { kind, t: ease(p) } }),
});
const wipe = (id: string, kind: MaskKind, en: string, af: string): BookJoin => ({
  id, group: 'wipe', en, af, at: (p) => ({ top: 'held', mask: { kind, t: ease(p) } }),
});
/** The arriving shot slides in over the held frame, from `x, y`. */
const slideIn = (id: string, x: number, y: number, en: string, af: string): BookJoin => ({
  id, group: 'motion', en, af,
  at: (p) => ({ top: 'arrive', arrive: { x: x * (1 - ease(p)), y: y * (1 - ease(p)) } }),
});
/** Both move together, the arriving shot pushing the held frame out. */
const push = (id: string, x: number, y: number, en: string, af: string): BookJoin => ({
  id, group: 'motion', en, af,
  at: (p) => {
    const e = ease(p);
    return { top: 'arrive', held: { x: -x * e, y: -y * e }, arrive: { x: x * (1 - e), y: y * (1 - e) } };
  },
});

export const BOOK = [
  /* ── Dissolve ─────────────────────────────────────────────────────── */
  {
    id: 'additive', group: 'dissolve', en: 'Additive dissolve', af: 'Optel-oorvloei',
    at: (p) => ({ top: 'arrive', held: { alpha: 1 - ease(p) }, arrive: { alpha: ease(p), blend: 'lighter' } }),
  },
  {
    id: 'lighten', group: 'dissolve', en: 'Non-additive dissolve', af: 'Helderste-oorvloei',
    at: (p) => ({ top: 'arrive', held: { alpha: 1 - ease(p) * 0.6 }, arrive: { alpha: ease(p), blend: 'lighten' } }),
  },
  {
    id: 'blurDissolve', group: 'dissolve', en: 'Blur dissolve', af: 'Wasige oorvloei',
    at: (p) => ({
      top: 'held',
      held: { alpha: 1 - ease(p), blur: 0.02 * hump(p) + 0.01 * p },
      arrive: { blur: 0.03 * (1 - p) * hump(Math.min(1, p + 0.5)) },
    }),
  },
  {
    id: 'smoothCut', group: 'dissolve', en: 'Smooth cut', af: 'Gladde sny',
    at: (p) => ({ top: 'held', held: { alpha: 1 - ease(p), scale: 1 + 0.03 * p }, arrive: { scale: 1.03 - 0.03 * ease(p) } }),
  },

  /* ── Iris ─────────────────────────────────────────────────────────── */
  iris('irisArrow', 'arrow', 'Arrow iris', 'Pyl-iris'),
  iris('irisCross', 'cross', 'Cross iris', 'Kruis-iris'),
  iris('irisDiamond', 'diamond', 'Diamond iris', 'Diamant-iris'),
  iris('irisEye', 'eye', 'Eye iris', 'Oog-iris'),
  iris('irisHexagon', 'hexagon', 'Hexagon iris', 'Seshoek-iris'),
  iris('irisOval', 'oval', 'Oval iris', 'Ovaal-iris'),
  iris('irisPentagon', 'pentagon', 'Pentagon iris', 'Vyfhoek-iris'),
  iris('irisSquare', 'square', 'Square iris', 'Vierkant-iris'),
  iris('irisTriangle', 'triangle', 'Triangle iris', 'Driehoek-iris'),

  /* ── Motion ───────────────────────────────────────────────────────── */
  {
    id: 'barnDoor', group: 'motion', en: 'Barn door', af: 'Staldeure',
    at: (p) => ({ top: 'held', doors: { kind: 'h', t: ease(p) } }),
  },
  push('push', 1, 0, 'Push', 'Stoot'),
  push('pushRight', -1, 0, 'Push right', 'Stoot regs'),
  push('pushUp', 0, 1, 'Push up', 'Stoot op'),
  push('pushDown', 0, -1, 'Push down', 'Stoot af'),
  {
    id: 'split', group: 'motion', en: 'Split', af: 'Verdeel',
    at: (p) => ({ top: 'held', doors: { kind: 'four', t: ease(p) } }),
  },
  slideIn('slideLeft', 1, 0, 'Slide left', 'Gly links'),
  slideIn('slideRight', -1, 0, 'Slide right', 'Gly regs'),
  slideIn('slideUp', 0, 1, 'Slide up', 'Gly op'),
  slideIn('slideDown', 0, -1, 'Slide down', 'Gly af'),
  {
    id: 'slicePush', group: 'motion', en: 'Slice push', af: 'Strokiestoot',
    at: (p) => ({ top: 'arrive', slices: p }),
  },

  /* ── Shape ────────────────────────────────────────────────────────── */
  shape('box', 'box', 'Box', 'Blok'),
  shape('heart', 'heart', 'Heart', 'Hart'),
  shape('star', 'star', 'Star', 'Ster'),
  shape('triLeft', 'triLeft', 'Triangle left', 'Driehoek links'),
  shape('triRight', 'triRight', 'Triangle right', 'Driehoek regs'),

  /* ── Wipe ─────────────────────────────────────────────────────────── */
  wipe('bandWipe', 'band', 'Band wipe', 'Bandvee'),
  wipe('centerWipe', 'center', 'Center wipe', 'Middelvee'),
  wipe('clockWipe', 'clock', 'Clock wipe', 'Horlosievee'),
  wipe('radialWipe', 'radial', 'Radial wipe', 'Straalvee'),
  wipe('spiralWipe', 'spiral', 'Spiral wipe', 'Spiraalvee'),
  wipe('venetian', 'venetian', 'Venetian blind wipe', 'Hortjiesvee'),
  wipe('xWipe', 'x', 'X wipe', 'X-vee'),
  wipe('checkerWipe', 'checker', 'Checker wipe', 'Skaakbordvee'),
  wipe('tileWipe', 'tile', 'Tile wipe', 'Teëlvee'),
  wipe('veeWipe', 'vee', 'Vee wipe', 'V-vee'),
  wipe('pageCurl', 'curl', 'Page curl', 'Bladsy omblaai'),

  /* ── Effects ──────────────────────────────────────────────────────── */
  {
    id: 'crashZoom', group: 'fusion', en: 'Crash zoom', af: 'Blitszoem',
    at: (p) => (p < 0.5
      ? { top: 'held', held: { scale: 1 + 2.4 * ease(p * 2) ** 2, blur: 0.03 * p * 2 } }
      : { top: 'arrive', arrive: { scale: 1 + 0.6 * (1 - ease((p - 0.5) * 2)), blur: 0.03 * (1 - (p - 0.5) * 2) } }),
  },
  {
    id: 'zoomIn', group: 'fusion', en: 'Zoom in', af: 'Zoem in',
    at: (p) => ({ top: 'held', held: { scale: 1 + 1.5 * ease(p), alpha: 1 - ease(p) } }),
  },
  {
    id: 'zoomInOut', group: 'fusion', en: 'Zoom in and out', af: 'Zoem in en uit',
    at: (p) => (p < 0.5
      ? { top: 'held', held: { scale: 1 + 0.8 * ease(p * 2) } }
      : { top: 'arrive', arrive: { scale: 1.8 - 0.8 * ease((p - 0.5) * 2) } }),
  },
  {
    id: 'spin', group: 'fusion', en: 'Spin', af: 'Tol',
    at: (p) => (p < 0.5
      ? { top: 'held', held: { turn: 0.5 * ease(p * 2), scale: 1 - 0.7 * ease(p * 2) } }
      : { top: 'arrive', arrive: { turn: -0.5 * (1 - ease((p - 0.5) * 2)), scale: 0.3 + 0.7 * ease((p - 0.5) * 2) } }),
  },
  {
    id: 'rotate', group: 'fusion', en: 'Rotate', af: 'Draai',
    at: (p) => ({ top: 'held', held: { turn: 0.25 * ease(p), scale: 1 + 0.4 * ease(p), alpha: 1 - ease(p) } }),
  },
  {
    id: 'rotate90', group: 'fusion', en: 'Rotate 90', af: 'Draai 90',
    at: (p) => ({ top: 'arrive', arrive: { turn: -0.25 * (1 - ease(p)), x: 0.0, scale: 0.6 + 0.4 * ease(p), alpha: Math.min(1, p * 3) } }),
  },
  {
    id: 'flip3d', group: 'fusion', en: 'Flip 3D', af: 'Omflip',
    at: (p) => (p < 0.5
      ? { top: 'held', held: { squash: 1 - ease(p * 2), scale: 1 - 0.15 * hump(p) } }
      : { top: 'arrive', arrive: { squash: ease((p - 0.5) * 2), scale: 1 - 0.15 * hump(p) } }),
  },
  {
    id: 'stretchBlur', group: 'fusion', en: 'Stretch blur', af: 'Rek en vervaag',
    at: (p) => (p < 0.5
      ? { top: 'held', held: { squash: 1 + 2 * ease(p * 2), blur: 0.04 * p * 2, alpha: 1 - p } }
      : { top: 'arrive', arrive: { squash: 3 - 2 * ease((p - 0.5) * 2), blur: 0.04 * (1 - (p - 0.5) * 2) } }),
  },
  {
    id: 'glitch', group: 'fusion', en: 'Glitch', af: 'Steuring',
    at: (p) => ({ top: halves(p), fx: { kind: 'glitch', amount: hump(p), seed: Math.floor(p * 12) } }),
  },
  {
    id: 'blockGlitch', group: 'fusion', en: 'Block glitch', af: 'Blokkiesteuring',
    at: (p) => ({ top: 'held', mask: { kind: 'blocks', t: p }, fx: { kind: 'glitch', amount: hump(p) * 0.6, seed: Math.floor(p * 10) } }),
  },
  {
    id: 'mosaic', group: 'fusion', en: 'Mosaic', af: 'Mosaïek',
    at: (p) => ({ top: halves(p), fx: { kind: 'mosaic', amount: hump(p) } }),
  },
  {
    id: 'cameraShake', group: 'fusion', en: 'Camera shake', af: 'Kameraskud',
    at: (p) => {
      const shake = (1 - p) * 0.05;
      const wob = Math.sin(p * 40);
      return { top: 'arrive', held: { alpha: 1 }, arrive: { alpha: ease(Math.min(1, p * 3)), x: shake * wob, y: shake * Math.cos(p * 33), scale: 1.08 } };
    },
  },
  {
    id: 'popWobble', group: 'fusion', en: 'Pop wobble', af: 'Wip-wobbel',
    at: (p) => {
      const e = ease(Math.min(1, p * 1.4));
      const wobble = Math.sin(p * Math.PI * 3) * (1 - p) * 0.12;
      return { top: 'arrive', arrive: { scale: Math.max(0.01, e + wobble), alpha: Math.min(1, p * 4) } };
    },
  },
  {
    id: 'tunnelOfLight', group: 'fusion', en: 'Tunnel of light', af: 'Ligtonnel',
    at: (p) => ({
      top: halves(p),
      held: { scale: 1 + 0.5 * ease(Math.min(1, p * 2)) },
      arrive: { scale: 1.5 - 0.5 * ease(Math.max(0, p * 2 - 1)) },
      fx: { kind: 'light', amount: hump(p) },
    }),
  },
] as const satisfies readonly BookJoin[];

export type BookId = typeof BOOK[number]['id'];

/** The book's entry for an id, or nothing for the first six. */
export function bookJoin(id: string | undefined): BookJoin | undefined {
  return (BOOK as readonly BookJoin[]).find((one) => one.id === id);
}
