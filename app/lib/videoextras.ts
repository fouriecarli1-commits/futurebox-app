/**
 * What the cutting room's templates add to a film beyond the recipes:
 * words that move, a frame round the picture, and the photo room's text
 * styles carried over.
 *
 * The owner, 14 October 2026, looking at the video editor's recipe cards: *"Ek
 * verstaan nie wat hierdie is nie? Dan moet ons seker maak dat die cool text
 * templates in die photo editor ook hierdie kant kom. Ons kort shapes,
 * frames, en motion templates."* And: *"Die motion templates moet 'n
 * simulator hê wanneer mens op dit kliek."*
 *
 * ── One function for the preview and the film ───────────────────────────
 *
 * `motionAt` and `drawFrame` are pure and are called by BOTH the room's
 * preview and `stitch.ts`, which renders the film. A motion that previews as
 * a slide and renders as a fade would be the exact lie this app keeps having
 * to take back out, so there is one piece of arithmetic for each and the
 * screen and the file read the same one.
 */

import type { GlowId } from './postglow';
import type { TitleLine } from './posttitles';
import type { BoxShape } from './videopaint';
import type { EdgeId } from './wordsedge';

/* ── Words that move ───────────────────────────────────────────────────── */

export type MotionId = 'none' | 'pop' | 'rise' | 'slide' | 'type' | 'fade' | 'pulse' | 'drop'
  /* The owner, 16 October 2026, screenshots of a title library: fourteen more. */
  | 'flip' | 'scale' | 'shrink' | 'write' | 'rotate' | 'stretch' | 'spin'
  | 'glitch' | 'flicker' | 'jitter' | 'scroll' | 'vslide' | 'hslide' | 'bounce';

export interface WordMotion {
  readonly id: MotionId;
  readonly name: readonly [string, string];
  /** One plain line on what it does, for the button and the simulator. */
  readonly what: readonly [string, string];
}

export const WORD_MOTIONS: readonly WordMotion[] = [
  { id: 'none', name: ['motion.none', 'Still'], what: ['motion.noneWhat', 'The words are simply there.'] },
  { id: 'pop', name: ['motion.pop', 'Pop'], what: ['motion.popWhat', 'Grow in from small, with a little bounce.'] },
  { id: 'rise', name: ['motion.rise', 'Rise'], what: ['motion.riseWhat', 'Float up into place as they fade in.'] },
  { id: 'slide', name: ['motion.slide', 'Slide'], what: ['motion.slideWhat', 'Come in from the left and settle.'] },
  { id: 'type', name: ['motion.type', 'Typewriter'], what: ['motion.typeWhat', 'Appear one letter at a time.'] },
  { id: 'fade', name: ['motion.fade', 'Fade'], what: ['motion.fadeWhat', 'Fade in slowly.'] },
  { id: 'drop', name: ['motion.drop', 'Drop'], what: ['motion.dropWhat', 'Fall in from above and land.'] },
  { id: 'pulse', name: ['motion.pulse', 'Pulse'], what: ['motion.pulseWhat', 'Beat gently for as long as they are up.'] },
  /* ── Fourteen more, 16 October 2026 ───────────────────────────────────
     The owner's screenshots of a desktop editor's title library: flip up, scale
     up, random write on, rotate, stretch zoom, spin twist, glitch, neon
     flicker, jitter, scroll and the slides. Each is the same kind of thing
     as the eight above — numbers for one moment — so the preview and the
     film read the same arithmetic. */
  { id: 'flip', name: ['motion.flip', 'Flip up'], what: ['motion.flipWhat', 'Turn up into place like a card.'] },
  { id: 'scale', name: ['motion.scale', 'Scale up'], what: ['motion.scaleWhat', 'Grow from small to full size.'] },
  { id: 'shrink', name: ['motion.shrink', 'Zoom down'], what: ['motion.shrinkWhat', 'Come down from very big and settle.'] },
  { id: 'write', name: ['motion.write', 'Random write on'], what: ['motion.writeWhat', 'Scrambled letters settle into the words.'] },
  { id: 'rotate', name: ['motion.rotate', 'Rotate in'], what: ['motion.rotateWhat', 'Swing round into place.'] },
  { id: 'stretch', name: ['motion.stretch', 'Stretch zoom'], what: ['motion.stretchWhat', 'Snap in from stretched wide.'] },
  { id: 'spin', name: ['motion.spin', 'Spin twist'], what: ['motion.spinWhat', 'Spin in from small, all the way round.'] },
  { id: 'glitch', name: ['motion.glitch', 'Glitch'], what: ['motion.glitchWhat', 'Jump and flicker in like a bad signal.'] },
  { id: 'flicker', name: ['motion.flicker', 'Neon flicker'], what: ['motion.flickerWhat', 'Flicker on like a neon sign, and now and then again.'] },
  { id: 'jitter', name: ['motion.jitter', 'Jitter'], what: ['motion.jitterWhat', 'Shake a little the whole time they are up.'] },
  { id: 'scroll', name: ['motion.scroll', 'Scroll'], what: ['motion.scrollWhat', 'Roll up the screen like credits.'] },
  { id: 'vslide', name: ['motion.vslide', 'Slide up'], what: ['motion.vslideWhat', 'Come up from the bottom of the frame.'] },
  { id: 'hslide', name: ['motion.hslide', 'Slide from the right'], what: ['motion.hslideWhat', 'Come in from the right and settle.'] },
  { id: 'bounce', name: ['motion.bounce', 'Bounce in'], what: ['motion.bounceWhat', 'Drop in and bounce twice.'] },
];

/** How long an entrance takes, in seconds. */
export const MOTION_IN = 0.6;

export interface MotionState {
  /** Multiplies the words' own see-through setting. */
  readonly alpha: number;
  /** Moves, as shares of the frame's HEIGHT, so a phone and a 4K file agree. */
  readonly dx: number;
  readonly dy: number;
  readonly scale: number;
  /** How much of the words are showing, 0 to 1 — the typewriter. */
  readonly reveal: number;
  /** Turned, in degrees, on top of any turn she set. Absent is none. */
  readonly turn?: number;
  /** Squeezed or stretched across (`sx`) or up and down (`sy`). Absent is one. */
  readonly sx?: number;
  readonly sy?: number;
  /** How many of the letters are still scrambled, 0 to 1, and which scramble. */
  readonly scramble?: number;
  readonly seed?: number;
}

const STILL: MotionState = { alpha: 1, dx: 0, dy: 0, scale: 1, reveal: 1 };

/** A number from a whole number that is the same every time — no `Math.random`, so a frame redrawn is the same frame. */
const noise = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const ease = (p: number): number => 1 - (1 - p) ** 3;

/**
 * Where moving words are, `age` seconds after they came up.
 *
 * An age below nought is "not up yet" and draws as the first frame of the
 * entrance; past the entrance every motion but the pulse is at rest.
 */
export function motionAt(id: string | undefined, age: number): MotionState {
  /* No clock (a still frame, a thumbnail) is at rest, the pulse included. */
  if (!id || id === 'none' || !Number.isFinite(age)) return STILL;
  const p = Math.max(0, Math.min(1, age / MOTION_IN));
  const e = ease(p);
  switch (id) {
    case 'pop': {
      /* Overshoots to 1.08 and comes back: the bounce is what reads as "pop"
         rather than as a zoom. */
      const grow = p < 0.7 ? 0.4 + (1.08 - 0.4) * ease(p / 0.7) : 1.08 - 0.08 * ease((p - 0.7) / 0.3);
      return { alpha: Math.min(1, p * 2.5), dx: 0, dy: 0, scale: grow, reveal: 1 };
    }
    case 'rise':
      return { alpha: e, dx: 0, dy: 0.06 * (1 - e), scale: 1, reveal: 1 };
    case 'slide':
      return { alpha: Math.min(1, p * 2), dx: -0.35 * (1 - e), dy: 0, scale: 1, reveal: 1 };
    case 'drop':
      return { alpha: Math.min(1, p * 2), dx: 0, dy: -0.08 * (1 - e), scale: 1, reveal: 1 };
    case 'type': {
      /* Slower than the others — a letter at a time has to be readable as
         letters — so it takes twice the entrance. */
      const q = Math.max(0, Math.min(1, age / (MOTION_IN * 2.5)));
      return { alpha: 1, dx: 0, dy: 0, scale: 1, reveal: q };
    }
    case 'fade':
      return { alpha: Math.max(0, Math.min(1, age / (MOTION_IN * 2))), dx: 0, dy: 0, scale: 1, reveal: 1 };
    case 'pulse':
      return { alpha: Math.min(1, p * 2), dx: 0, dy: 0, scale: 1 + 0.05 * Math.sin(Math.max(0, age) * Math.PI * 2 * 1.2), reveal: 1 };
    case 'flip':
      return { alpha: Math.min(1, p * 2), dx: 0, dy: 0.03 * (1 - e), scale: 1, reveal: 1, sy: Math.max(0.02, e) };
    case 'scale':
      return { alpha: Math.min(1, p * 3), dx: 0, dy: 0, scale: 0.2 + 0.8 * e, reveal: 1 };
    case 'shrink':
      return { alpha: Math.min(1, p * 2), dx: 0, dy: 0, scale: 1 + 2 * (1 - e), reveal: 1 };
    case 'write': {
      /* Twice the entrance: the letters have to be seen settling. */
      const q = Math.max(0, Math.min(1, age / (MOTION_IN * 2)));
      return { alpha: Math.min(1, q * 4), dx: 0, dy: 0, scale: 1, reveal: 1, scramble: 1 - q, seed: Math.floor(Math.max(0, age) * 14) };
    }
    case 'rotate':
      return { alpha: Math.min(1, p * 2), dx: 0, dy: 0, scale: 0.8 + 0.2 * e, reveal: 1, turn: -90 * (1 - e) };
    case 'stretch':
      return { alpha: Math.min(1, p * 2.5), dx: 0, dy: 0, scale: 1, reveal: 1, sx: 1 + 2.5 * (1 - e), sy: Math.max(0.3, e) };
    case 'spin':
      return { alpha: Math.min(1, p * 2), dx: 0, dy: 0, scale: 0.2 + 0.8 * e, reveal: 1, turn: 360 * (1 - e) };
    case 'glitch': {
      /* A bad signal for the first second, then still. */
      const frame = Math.floor(Math.max(0, age) * 24);
      const live = Math.max(0, 1 - Math.max(0, age) / (MOTION_IN * 1.7));
      const on = noise(frame) > 0.25 * live;
      return {
        alpha: live > 0 && !on ? 0.15 : 1,
        dx: live * (noise(frame + 7) - 0.5) * 0.12,
        dy: live * (noise(frame + 19) - 0.5) * 0.02,
        scale: 1, reveal: 1, sx: 1 + live * (noise(frame + 3) - 0.5) * 0.4,
      };
    }
    case 'flicker': {
      /* On, off, on: a tube warming up, and every few seconds a blink. */
      const t = Math.max(0, age);
      const warm = t < 0.9 ? (noise(Math.floor(t * 18)) > 0.45 ? 1 : 0.12) : 1;
      const blink = t >= 0.9 && t % 3.1 < 0.12 ? 0.25 : 1;
      return { alpha: warm * blink, dx: 0, dy: 0, scale: 1, reveal: 1 };
    }
    case 'jitter': {
      const frame = Math.floor(Math.max(0, age) * 15);
      return { alpha: Math.min(1, p * 3), dx: (noise(frame) - 0.5) * 0.012, dy: (noise(frame + 5) - 0.5) * 0.012, scale: 1, reveal: 1, turn: (noise(frame + 9) - 0.5) * 3 };
    }
    case 'scroll':
      /* Credits: up from below the frame at a steady pace, and on up past the top. */
      return { alpha: 1, dx: 0, dy: 0.6 - Math.max(0, age) * 0.16, scale: 1, reveal: 1 };
    case 'vslide':
      return { alpha: Math.min(1, p * 2), dx: 0, dy: 0.35 * (1 - e), scale: 1, reveal: 1 };
    case 'hslide':
      return { alpha: Math.min(1, p * 2), dx: 0.35 * (1 - e), dy: 0, scale: 1, reveal: 1 };
    case 'bounce': {
      /* Falls, lands, bounces twice, each smaller. */
      const t = Math.max(0, Math.min(1, age / (MOTION_IN * 1.6)));
      const fall = t < 0.5 ? 1 - (t / 0.5) ** 2 : 0;
      const hop = t >= 0.5 ? Math.abs(Math.sin((t - 0.5) * Math.PI * 4)) * 0.25 * (1 - t) * 2 : 0;
      return { alpha: Math.min(1, t * 5), dx: 0, dy: -0.12 * (fall + hop), scale: 1, reveal: 1 };
    }
    default:
      return STILL;
  }
}

/** Letters a scramble draws from — the shapes of words without being any. */
const SCRAMBLE = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@';

/** The words with `amount` of their letters still scrambled. Spaces stay spaces, so the shape of the line holds. */
export function scrambled(text: string, amount: number, seed = 0): string {
  if (!amount || amount <= 0) return text;
  const letters = Array.from(text);
  return letters.map((one, at) => {
    if (one.trim() === '') return one;
    /* Each letter settles at its own moment, left to right with a little disorder. */
    const settles = (at / Math.max(1, letters.length)) * 0.7 + noise(at + 31) * 0.3;
    if (1 - amount >= settles) return one;
    return SCRAMBLE[Math.floor(noise(at * 13 + seed) * SCRAMBLE.length)];
  }).join('');
}

/** What the words say at this moment: as far as the typewriter has got, and unscrambled as far as the scramble has. */
export function shownWords(text: string, moving: MotionState): string {
  return scrambled(revealed(text, moving.reveal), moving.scramble ?? 0, moving.seed ?? 0);
}

/** The motion as a CSS transform, after a translate to the words' place — for the room's previews. */
export function motionCss(moving: MotionState, tall: number, turn = 0): string {
  return `translate(${moving.dx * tall}px, ${moving.dy * tall}px) rotate(${turn + (moving.turn ?? 0)}deg)`
    + ` scale(${moving.scale * (moving.sx ?? 1)}, ${moving.scale * (moving.sy ?? 1)})`;
}

/** The words as far as the typewriter has got, never cutting a letter in two. */
export function revealed(text: string, reveal: number): string {
  if (reveal >= 1) return text;
  const letters = Array.from(text);
  return letters.slice(0, Math.round(letters.length * Math.max(0, reveal))).join('');
}

/* ── A frame round the picture ─────────────────────────────────────────── */

export type FrameId = 'none' | 'line' | 'neon' | 'film' | 'polaroid' | 'corners' | 'rounded';

export interface FilmFrame {
  readonly id: FrameId;
  readonly name: readonly [string, string];
}

export const FRAMES: readonly FilmFrame[] = [
  { id: 'none', name: ['frame.none', 'No frame'] },
  { id: 'line', name: ['frame.line', 'Thin line'] },
  { id: 'neon', name: ['frame.neon', 'Neon glow'] },
  { id: 'film', name: ['frame.film', 'Film strip'] },
  { id: 'polaroid', name: ['frame.polaroid', 'Instant photo'] },
  { id: 'corners', name: ['frame.corners', 'Corners'] },
  { id: 'rounded', name: ['frame.rounded', 'Soft corners'] },
];

export const FRAME_INKS = ['#ffffff', '#34d399', '#22d3ee', '#f472b6', '#fde68a', '#000000'] as const;

/**
 * Draws the film's frame over a picture `width` by `height`.
 *
 * Sizes are shares of the SHORT side, so the frame is the same weight on a
 * tall film and a wide one and at any export size.
 */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  id: string | undefined,
  width: number,
  height: number,
  ink = '#ffffff',
): void {
  if (!id || id === 'none') return;
  const short = Math.min(width, height);
  ctx.save();
  switch (id) {
    case 'line': {
      const w = Math.max(2, short * 0.012);
      const inset = short * 0.035;
      ctx.strokeStyle = ink;
      ctx.lineWidth = w;
      ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
      break;
    }
    case 'neon': {
      const w = Math.max(2, short * 0.01);
      const inset = short * 0.04;
      ctx.strokeStyle = ink;
      ctx.lineWidth = w;
      for (const blur of [short * 0.06, short * 0.03, short * 0.012]) {
        ctx.shadowColor = ink;
        ctx.shadowBlur = blur;
        ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
      }
      break;
    }
    case 'film': {
      /* Black bands down the long sides with the sprocket holes cut out of
         them in the frame's own colour. */
      const band = short * 0.07;
      const across = width <= height;
      ctx.fillStyle = '#000000';
      if (across) {
        ctx.fillRect(0, 0, band, height);
        ctx.fillRect(width - band, 0, band, height);
      } else {
        ctx.fillRect(0, 0, width, band);
        ctx.fillRect(0, height - band, width, band);
      }
      ctx.fillStyle = ink;
      const hole = band * 0.42;
      const gap = hole * 1.9;
      const long = across ? height : width;
      for (let at = gap * 0.6; at < long - hole; at += gap) {
        if (across) {
          ctx.fillRect((band - hole) / 2, at, hole, hole * 0.7);
          ctx.fillRect(width - band + (band - hole) / 2, at, hole, hole * 0.7);
        } else {
          ctx.fillRect(at, (band - hole) / 2, hole * 0.7, hole);
          ctx.fillRect(at, height - band + (band - hole) / 2, hole * 0.7, hole);
        }
      }
      break;
    }
    case 'polaroid': {
      /* An instant photo's border: even on three sides, deep at the bottom. */
      const side = short * 0.05;
      const foot = short * 0.16;
      ctx.fillStyle = ink;
      ctx.fillRect(0, 0, width, side);
      ctx.fillRect(0, 0, side, height);
      ctx.fillRect(width - side, 0, side, height);
      ctx.fillRect(0, height - foot, width, foot);
      break;
    }
    case 'corners': {
      const w = Math.max(2, short * 0.014);
      const inset = short * 0.05;
      const arm = short * 0.12;
      ctx.strokeStyle = ink;
      ctx.lineWidth = w;
      ctx.lineCap = 'square';
      const corner = (x: number, y: number, sx: number, sy: number): void => {
        ctx.beginPath();
        ctx.moveTo(x, y + arm * sy);
        ctx.lineTo(x, y);
        ctx.lineTo(x + arm * sx, y);
        ctx.stroke();
      };
      corner(inset, inset, 1, 1);
      corner(width - inset, inset, -1, 1);
      corner(inset, height - inset, 1, -1);
      corner(width - inset, height - inset, -1, -1);
      break;
    }
    case 'rounded': {
      /* The picture's corners rounded off, in the frame's colour. */
      const r = short * 0.08;
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.moveTo(r, 0);
      ctx.arcTo(0, 0, 0, r, r);
      ctx.lineTo(0, height - r);
      ctx.arcTo(0, height, r, height, r);
      ctx.lineTo(width - r, height);
      ctx.arcTo(width, height, width, height - r, r);
      ctx.lineTo(width, r);
      ctx.arcTo(width, 0, width - r, 0, r);
      ctx.closePath();
      ctx.fill('evenodd');
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

/* ── The photo room's text styles, for words on a film ─────────────────── */

/**
 * The photo room's faces, as the film's face ids.
 *
 * This used to fold fifteen faces down to the five system stacks the film
 * could draw, so a Script line came over as Georgia and Future as Arial
 * Black. Since 15 October 2026 the film draws every one of them — see
 * `videofonts.ts` — so each maps to itself, except the two whose ids this
 * room was already using for a different face (`plain` and `round`).
 */
const FACE_TO_FONT: Readonly<Record<string, string>> = {
  plain: 'sans',
  round: 'soft',
  poster: 'poster',
  book: 'book',
  hand: 'hand',
  type: 'type',
  future: 'future',
  script: 'script',
  spray: 'spray',
  comic: 'comic',
  classic: 'classic',
  retro: 'retro',
  pixel: 'pixel',
  block: 'block',
  fashion: 'fashion',
};

/** A photo-room face id as the film's own, or plain for anything unknown. */
export function fontOfFace(face: string | undefined): string {
  return (face && FACE_TO_FONT[face]) || 'plain';
}

export interface WordsStyle {
  readonly wordsFont: string;
  readonly wordsInk: string;
  readonly wordsGlow: GlowId;
  readonly wordsEdge: EdgeId;
  readonly wordsBox: BoxShape;
}

/** One line of a photo-room title, as a film's words. */
export function wordsStyleOf(line: TitleLine): WordsStyle {
  const glowing = line.glow !== 'none';
  return {
    wordsFont: fontOfFace(line.face),
    wordsInk: line.ink,
    wordsGlow: line.glow,
    /* A glow is its own edge; a plain style keeps the outline that makes
       words readable over any picture. */
    wordsEdge: glowing ? 'none' : 'outline',
    wordsBox: 'none',
  };
}

