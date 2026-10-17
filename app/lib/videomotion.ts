/**
 * A shot that moves: its picture pushed in, panned, shaken, turned or faded,
 * by a ready-made movement or by keyframes she sets herself.
 *
 * Carli, 17 October 2026, about another program's motion effects: *"Die
 * effects … kan ook cool wees."* The words already
 * move (`videoextras.ts`); this moves the picture under them.
 *
 * One function, `poseAt`, says where the picture is at a moment in the shot.
 * The editor's preview and the renderer (`stitch.ts`) both call it, so the
 * movement she watches is the movement that comes out — the rule `paintFx`
 * and `motionAt` already keep.
 *
 * Pure arithmetic (`check:videomotion`).
 */

/** Where the picture is: shifted by a share of the frame, scaled, turned in degrees, and how solid. */
export interface Pose {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly rotate: number;
  readonly opacity: number;
}

export const STILL: Pose = { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 };

export type Ease = 'linear' | 'in' | 'out' | 'inOut' | 'bounce';

/** A keyframe: a pose at a point in the shot, nought to one, and how the way into it moves. */
export interface Key extends Pose {
  readonly at: number;
  readonly ease: Ease;
}

export type MoveId =
  | 'none' | 'zoomIn' | 'zoomOut' | 'kenBurns' | 'panLeft' | 'panRight' | 'panUp' | 'panDown'
  | 'shake' | 'bounce' | 'spinIn' | 'punch' | 'float' | 'wobble' | 'dropIn' | 'slideIn' | 'whipOut' | 'pulse' | 'tiltIn' | 'fadeIn';

export interface Motion {
  readonly move?: MoveId;
  /** How strong the ready-made movement is, 0.25 to 2. */
  readonly strength?: number;
  /** Her own keyframes, on top of the movement. */
  readonly keys?: readonly Key[];
}

export const MOVES: readonly { readonly id: MoveId; readonly en: string; readonly af: string; readonly group: 'camera' | 'energy' | 'enter' }[] = [
  { id: 'none', en: 'Still', af: 'Stil', group: 'camera' },
  { id: 'zoomIn', en: 'Push in', af: 'Stoot in', group: 'camera' },
  { id: 'zoomOut', en: 'Pull out', af: 'Trek uit', group: 'camera' },
  { id: 'kenBurns', en: 'Slow drift', af: 'Stadige dryf', group: 'camera' },
  { id: 'panLeft', en: 'Pan left', af: 'Swaai links', group: 'camera' },
  { id: 'panRight', en: 'Pan right', af: 'Swaai regs', group: 'camera' },
  { id: 'panUp', en: 'Tilt up', af: 'Kantel op', group: 'camera' },
  { id: 'panDown', en: 'Tilt down', af: 'Kantel af', group: 'camera' },
  { id: 'float', en: 'Float', af: 'Sweef', group: 'camera' },
  { id: 'shake', en: 'Shake', af: 'Skud', group: 'energy' },
  { id: 'punch', en: 'Punch in', af: 'Slaan in', group: 'energy' },
  { id: 'pulse', en: 'Pulse', af: 'Klop', group: 'energy' },
  { id: 'bounce', en: 'Bounce', af: 'Bons', group: 'energy' },
  { id: 'wobble', en: 'Wobble', af: 'Wiebel', group: 'energy' },
  { id: 'spinIn', en: 'Spin in', af: 'Draai in', group: 'enter' },
  { id: 'dropIn', en: 'Drop in', af: 'Val in', group: 'enter' },
  { id: 'slideIn', en: 'Slide in', af: 'Gly in', group: 'enter' },
  { id: 'tiltIn', en: 'Swing in', af: 'Swaai in', group: 'enter' },
  { id: 'fadeIn', en: 'Fade up', af: 'Vervaag in', group: 'enter' },
  { id: 'whipOut', en: 'Whip out', af: 'Swiep uit', group: 'enter' },
];

export const EASES: readonly { readonly id: Ease; readonly en: string; readonly af: string }[] = [
  { id: 'linear', en: 'Even', af: 'Gelyk' },
  { id: 'in', en: 'Speed up', af: 'Versnel' },
  { id: 'out', en: 'Slow down', af: 'Vertraag' },
  { id: 'inOut', en: 'Smooth', af: 'Glad' },
  { id: 'bounce', en: 'Bounce', af: 'Bons' },
];

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** How far along a stretch is after easing, nought to one. */
export function eased(p: number, ease: Ease): number {
  const t = clamp(p, 0, 1);
  switch (ease) {
    case 'in': return t * t * t;
    case 'out': return 1 - (1 - t) ** 3;
    case 'inOut': return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    case 'bounce': {
      /* Overshoots and settles, like something landing. */
      const c = 1.70158 * 1.3;
      return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
    }
    default: return t;
  }
}

/** The ready-made movement's pose, `p` through a shot `len` seconds long, `s` seconds in. */
function movePose(move: MoveId, p: number, s: number, len: number, k: number): Pose {
  const into = (seconds: number): number => clamp(s / Math.max(0.05, Math.min(seconds, len)), 0, 1);
  switch (move) {
    case 'zoomIn': return { ...STILL, scale: 1 + 0.18 * k * eased(p, 'inOut') };
    case 'zoomOut': return { ...STILL, scale: 1 + 0.18 * k * (1 - eased(p, 'inOut')) };
    case 'kenBurns': return { ...STILL, scale: 1.08 + 0.1 * k * p, x: -0.04 * k * (p - 0.5), y: 0.025 * k * (p - 0.5) };
    case 'panLeft': return { ...STILL, scale: 1 + 0.16 * k, x: 0.07 * k * (0.5 - eased(p, 'inOut')) };
    case 'panRight': return { ...STILL, scale: 1 + 0.16 * k, x: -0.07 * k * (0.5 - eased(p, 'inOut')) };
    case 'panUp': return { ...STILL, scale: 1 + 0.16 * k, y: 0.07 * k * (0.5 - eased(p, 'inOut')) };
    case 'panDown': return { ...STILL, scale: 1 + 0.16 * k, y: -0.07 * k * (0.5 - eased(p, 'inOut')) };
    case 'float': return { ...STILL, scale: 1.06, x: 0.012 * k * Math.sin(s * 1.3), y: 0.016 * k * Math.sin(s * 0.9 + 1), rotate: 0.6 * k * Math.sin(s * 0.7) };
    case 'shake': {
      /* Fixed frequencies, so a shake is the same shake on every play and in the file. */
      const a = 0.012 * k;
      return { ...STILL, scale: 1 + 0.05 * k, x: a * (Math.sin(s * 47) + Math.sin(s * 23.3) * 0.6) / 1.6, y: a * (Math.sin(s * 39.7 + 1.3) + Math.sin(s * 17.9) * 0.6) / 1.6, rotate: 0.8 * k * Math.sin(s * 31) };
    }
    case 'punch': return { ...STILL, scale: 1 + 0.22 * k * (1 - eased(into(0.45), 'out')) };
    case 'pulse': return { ...STILL, scale: 1 + 0.04 * k * (0.5 + 0.5 * Math.sin(s * Math.PI * 2)) };
    case 'bounce': return { ...STILL, y: -0.03 * k * Math.abs(Math.sin(s * Math.PI * 1.6)), scale: 1.04 };
    case 'wobble': return { ...STILL, scale: 1.08, rotate: 3 * k * Math.sin(s * 5) * Math.exp(-s * 0.6) };
    case 'spinIn': { const q = eased(into(0.9), 'out'); return { ...STILL, rotate: -180 * k * (1 - q), scale: 0.2 + 0.8 * q, opacity: clamp(q * 2, 0, 1) }; }
    case 'dropIn': { const q = eased(into(0.8), 'bounce'); return { ...STILL, y: -0.9 * (1 - q), opacity: clamp(into(0.8) * 3, 0, 1) }; }
    case 'slideIn': { const q = eased(into(0.7), 'out'); return { ...STILL, x: 1 * (1 - q) }; }
    case 'tiltIn': { const q = eased(into(0.8), 'bounce'); return { ...STILL, rotate: 25 * k * (1 - q), scale: 0.85 + 0.15 * q, opacity: clamp(into(0.8) * 2.5, 0, 1) }; }
    case 'fadeIn': return { ...STILL, opacity: eased(into(1.2 * k), 'inOut') };
    case 'whipOut': {
      /* Still, then thrown off to the side in the last third of a second. */
      const q = eased(clamp((s - (len - 0.35)) / 0.35, 0, 1), 'in');
      return { ...STILL, x: -1.2 * q, rotate: -8 * q };
    }
    default: return STILL;
  }
}

/** Her keyframes' pose at `p`, eased into each key. Before the first and after the last, they hold. */
export function keyPose(keys: readonly Key[] | undefined, p: number): Pose {
  if (!keys?.length) return STILL;
  const sorted = [...keys].sort((a, b) => a.at - b.at);
  if (p <= sorted[0].at) return sorted[0];
  const last = sorted[sorted.length - 1];
  if (p >= last.at) return last;
  const next = sorted.findIndex((one) => one.at > p);
  const a = sorted[next - 1];
  const b = sorted[next];
  const q = eased((p - a.at) / Math.max(1e-6, b.at - a.at), b.ease);
  const mix = (u: number, v: number): number => u + (v - u) * q;
  return { x: mix(a.x, b.x), y: mix(a.y, b.y), scale: mix(a.scale, b.scale), rotate: mix(a.rotate, b.rotate), opacity: mix(a.opacity, b.opacity) };
}

/** Where the picture is `seconds` into a shot `length` seconds long: the movement and her keyframes together. */
export function poseAt(motion: Motion | undefined, seconds: number, length: number): Pose {
  if (!motion || ((!motion.move || motion.move === 'none') && !motion.keys?.length)) return STILL;
  const len = Math.max(0.05, length);
  const s = clamp(seconds, 0, len);
  const p = s / len;
  const k = clamp(motion.strength ?? 1, 0.25, 2);
  const m = movePose(motion.move ?? 'none', p, s, len, k);
  const key = keyPose(motion.keys, p);
  return {
    x: m.x + key.x,
    y: m.y + key.y,
    scale: clamp(m.scale * key.scale, 0.05, 8),
    rotate: m.rotate + key.rotate,
    opacity: clamp(m.opacity * key.opacity, 0, 1),
  };
}

/** Whether a shot moves at all — the renderer skips the arithmetic when it does not. */
export const moves = (motion: Motion | undefined): boolean =>
  Boolean(motion && ((motion.move && motion.move !== 'none') || motion.keys?.length));

/** The pose as a CSS transform for the preview: the same numbers the renderer draws with. */
export function poseCss(pose: Pose): string {
  return `translate(${(pose.x * 100).toFixed(3)}%, ${(pose.y * 100).toFixed(3)}%) rotate(${pose.rotate.toFixed(3)}deg) scale(${pose.scale.toFixed(4)})`;
}

/** The pose applied to a canvas of `w` × `h` before the picture is drawn: about its middle. */
export function applyPose(ctx: CanvasRenderingContext2D, pose: Pose, w: number, h: number): void {
  ctx.translate(w / 2 + pose.x * w, h / 2 + pose.y * h);
  ctx.rotate((pose.rotate * Math.PI) / 180);
  ctx.scale(pose.scale, pose.scale);
  ctx.translate(-w / 2, -h / 2);
  ctx.globalAlpha *= pose.opacity;
}

const MOVE_IDS = new Set<string>(MOVES.map((one) => one.id));
const EASE_IDS = new Set<string>(EASES.map((one) => one.id));
const num = (v: unknown, lo: number, hi: number, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? clamp(n, lo, hi) : fallback;
};

/** A motion from a saved film, made safe: a known movement, at most 24 keyframes of sane numbers. */
export function cleanMotion(raw: unknown): Motion | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const move = typeof r.move === 'string' && MOVE_IDS.has(r.move) ? r.move as MoveId : undefined;
  const keys = Array.isArray(r.keys)
    ? r.keys.slice(0, 24).map((one): Key => {
      const k = (one ?? {}) as Record<string, unknown>;
      return {
        at: num(k.at, 0, 1, 0), x: num(k.x, -2, 2, 0), y: num(k.y, -2, 2, 0), scale: num(k.scale, 0.05, 8, 1),
        rotate: num(k.rotate, -1080, 1080, 0), opacity: num(k.opacity, 0, 1, 1),
        ease: typeof k.ease === 'string' && EASE_IDS.has(k.ease) ? k.ease as Ease : 'inOut',
      };
    })
    : undefined;
  const motion: Motion = {
    ...(move ? { move } : {}),
    ...(r.strength !== undefined ? { strength: num(r.strength, 0.25, 2, 1) } : {}),
    ...(keys?.length ? { keys } : {}),
  };
  return moves(motion) ? motion : undefined;
}
