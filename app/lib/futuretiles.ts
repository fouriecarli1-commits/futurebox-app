/**
 * The pictures on the character looks and the scene styles.
 *
 * The owner, 17 October 2026: *"Al die templates in al die kamers moet visual
 * wees."* Every choice in a room is a picture, so these are too — drawn here
 * in code, like the balloon on the style tiles (`magicstyles.ts`), so nobody's
 * picture is borrowed and nothing is fetched to show a choice.
 *
 * ── A figure for the characters, the balloon for the scenes ──────────────
 *
 * The balloon is the app's one sample subject and the scene tiles keep it: a
 * scene is a world, and the balloon floating in ten of them reads as ten
 * worlds rather than ten pictures. A character look is different. It is
 * about how a PERSON is made — skin, joints, clothes, a face — and a balloon
 * has none of those, so a look tile drawn on it would show nothing the look
 * does. So the characters get one small figure, the same in every tile, and
 * the look is the only thing that changes.
 */
import { balloon } from './magicstyles';

interface Bit {
  readonly path: Path2D;
  readonly ink: string;
  readonly kind: 'skin' | 'suit' | 'legs' | 'boot' | 'hair' | 'eye' | 'core';
}

const SKIN = '#f2c29b';
const SUIT = '#2563eb';
const LEGS = '#1f2937';
const BOOT = '#0f172a';
const HAIR = '#3b2414';
const EYE = '#111827';
const CORE = '#22d3ee';

/** A rod with round ends, as a closed path, from one point to another. */
function rod(p: Path2D, x1: number, y1: number, x2: number, y2: number, r: number): void {
  const a = Math.atan2(y2 - y1, x2 - x1);
  p.moveTo(x1 + r * Math.cos(a + Math.PI / 2), y1 + r * Math.sin(a + Math.PI / 2));
  p.arc(x1, y1, r, a + Math.PI / 2, a + (3 * Math.PI) / 2);
  p.arc(x2, y2, r, a - Math.PI / 2, a + Math.PI / 2);
  p.closePath();
}

/** The figure on an `s`-pixel square, back to front. `big` is a head a little larger, for the toy. */
export function figure(s: number, big = false): Bit[] {
  const at = (v: number): number => v * s;
  const bits: Bit[] = [];
  const legs = new Path2D();
  rod(legs, at(0.45), at(0.6), at(0.44), at(0.85), at(0.038));
  rod(legs, at(0.55), at(0.6), at(0.56), at(0.85), at(0.038));
  bits.push({ path: legs, ink: LEGS, kind: 'legs' });
  const boots = new Path2D();
  boots.ellipse(at(0.43), at(0.875), at(0.05), at(0.026), 0, 0, Math.PI * 2);
  boots.ellipse(at(0.57), at(0.875), at(0.05), at(0.026), 0, 0, Math.PI * 2);
  bits.push({ path: boots, ink: BOOT, kind: 'boot' });
  const arms = new Path2D();
  rod(arms, at(0.385), at(0.42), at(0.335), at(0.6), at(0.03));
  rod(arms, at(0.615), at(0.42), at(0.665), at(0.6), at(0.03));
  bits.push({ path: arms, ink: SUIT, kind: 'suit' });
  const hands = new Path2D();
  hands.arc(at(0.33), at(0.625), at(0.03), 0, Math.PI * 2);
  hands.moveTo(at(0.7), at(0.625));
  hands.arc(at(0.67), at(0.625), at(0.03), 0, Math.PI * 2);
  bits.push({ path: hands, ink: SKIN, kind: 'skin' });
  const body = new Path2D();
  body.moveTo(at(0.4), at(0.385));
  body.quadraticCurveTo(at(0.5), at(0.36), at(0.6), at(0.385));
  body.quadraticCurveTo(at(0.64), at(0.4), at(0.628), at(0.46));
  body.lineTo(at(0.6), at(0.63));
  body.lineTo(at(0.4), at(0.63));
  body.lineTo(at(0.372), at(0.46));
  body.quadraticCurveTo(at(0.36), at(0.4), at(0.4), at(0.385));
  body.closePath();
  bits.push({ path: body, ink: SUIT, kind: 'suit' });
  const core = new Path2D();
  core.arc(at(0.5), at(0.47), at(0.026), 0, Math.PI * 2);
  bits.push({ path: core, ink: CORE, kind: 'core' });
  const neck = new Path2D();
  neck.rect(at(0.48), at(0.33), at(0.04), at(0.05));
  bits.push({ path: neck, ink: SKIN, kind: 'skin' });
  const r = big ? 0.13 : 0.1;
  const cy = big ? 0.22 : 0.245;
  const head = new Path2D();
  head.ellipse(at(0.5), at(cy), at(r * 0.92), at(r), 0, 0, Math.PI * 2);
  bits.push({ path: head, ink: SKIN, kind: 'skin' });
  const hair = new Path2D();
  hair.moveTo(at(0.5 - r * 0.95), at(cy));
  hair.bezierCurveTo(at(0.5 - r), at(cy - r * 1.35), at(0.5 + r), at(cy - r * 1.35), at(0.5 + r * 0.95), at(cy));
  hair.quadraticCurveTo(at(0.5 + r * 0.4), at(cy - r * 0.55), at(0.5 - r * 0.95), at(cy));
  hair.closePath();
  bits.push({ path: hair, ink: HAIR, kind: 'hair' });
  const eyes = new Path2D();
  const ey = cy + r * 0.12;
  const er = r * (big ? 0.2 : 0.14);
  eyes.ellipse(at(0.5 - r * 0.38), at(ey), at(er), at(er * 1.2), 0, 0, Math.PI * 2);
  eyes.moveTo(at(0.5 + r * 0.38 + er), at(ey));
  eyes.ellipse(at(0.5 + r * 0.38), at(ey), at(er), at(er * 1.2), 0, 0, Math.PI * 2);
  bits.push({ path: eyes, ink: EYE, kind: 'eye' });
  return bits;
}

/** The figure's whole outline, for looks that clip to it or stroke it as one. */
function outlineOf(bits: readonly Bit[]): Path2D {
  const all = new Path2D();
  for (const bit of bits) if (bit.kind !== 'eye' && bit.kind !== 'core') all.addPath(bit.path);
  return all;
}

const backdrop = (ctx: CanvasRenderingContext2D, s: number, stops: readonly string[], radial = false): void => {
  const g = radial
    ? ctx.createRadialGradient(s * 0.5, s * 0.4, s * 0.05, s * 0.5, s * 0.5, s * 0.75)
    : ctx.createLinearGradient(0, 0, 0, s);
  stops.forEach((one, k) => g.addColorStop(k / Math.max(1, stops.length - 1), one));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
};

const floor = (ctx: CanvasRenderingContext2D, s: number, ink: string): void => {
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(s * 0.5, s * 0.9, s * 0.17, s * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
};

/** A colour a little lighter or darker, for shading. `by` is -255..255. */
function shade(hex: string, by: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const k = (v: number): number => Math.max(0, Math.min(255, v + by));
  return `rgb(${k((n >> 16) & 255)},${k((n >> 8) & 255)},${k(n & 255)})`;
}

/** Each part lit from the upper left, as a rounded thing under a soft key light. */
function rounded(ctx: CanvasRenderingContext2D, s: number, bits: readonly Bit[], recolour: (bit: Bit) => string, gloss: number): void {
  for (const bit of bits) {
    const ink = recolour(bit);
    if (bit.kind === 'eye' || bit.kind === 'core') { ctx.fillStyle = ink; ctx.fill(bit.path); continue; }
    const g = ctx.createRadialGradient(s * 0.42, s * 0.28, s * 0.01, s * 0.5, s * 0.5, s * 0.55);
    g.addColorStop(0, shade(ink, 70));
    g.addColorStop(gloss, ink);
    g.addColorStop(1, shade(ink, -70));
    ctx.fillStyle = g;
    ctx.fill(bit.path);
  }
}

/** The figure reduced to an `n`-square grid of colours, for blocks and facets. */
function sampled(n: number, big = false): Uint8ClampedArray | null {
  const tiny = document.createElement('canvas');
  tiny.width = n;
  tiny.height = n;
  const c = tiny.getContext('2d', { willReadFrequently: true });
  if (!c) return null;
  for (const bit of figure(n, big)) {
    c.fillStyle = bit.ink;
    c.fill(bit.path);
  }
  return c.getImageData(0, 0, n, n).data;
}

const rgbAt = (d: Uint8ClampedArray, i: number, by = 0): string =>
  `rgb(${Math.max(0, Math.min(255, d[i] + by))},${Math.max(0, Math.min(255, d[i + 1] + by))},${Math.max(0, Math.min(255, d[i + 2] + by))})`;

/** Draw a character look's sample on a square canvas. */
export function drawCharacterTile(canvas: HTMLCanvasElement, id: string): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const s = canvas.width;
  ctx.save();
  ctx.clearRect(0, 0, s, s);
  const bits = figure(s, id === 'toy');
  const line = Math.max(1, s / 60);

  switch (id) {
    case 'game': {
      backdrop(ctx, s, ['#0b1220', '#1e293b', '#0b1220'], true);
      floor(ctx, s, 'rgba(249,115,22,0.25)');
      const armour = (bit: Bit): string => (bit.kind === 'suit' ? '#475569' : bit.kind === 'legs' ? '#1e293b' : bit.kind === 'hair' ? '#1c1917' : bit.ink);
      for (const bit of bits) {
        const ink = armour(bit);
        if (bit.kind === 'eye') { ctx.fillStyle = '#e2e8f0'; ctx.fill(bit.path); continue; }
        if (bit.kind === 'core') { ctx.shadowColor = '#f97316'; ctx.shadowBlur = s / 12; ctx.fillStyle = '#fb923c'; ctx.fill(bit.path); ctx.shadowBlur = 0; continue; }
        const g = ctx.createLinearGradient(s * 0.3, 0, s * 0.7, 0);
        g.addColorStop(0, shade(ink, -40));
        g.addColorStop(0.45, shade(ink, 30));
        g.addColorStop(1, shade(ink, -60));
        ctx.fillStyle = g;
        ctx.fill(bit.path);
      }
      /* The rim: warm on one side, cool on the other — the light every game
         hero is lit with. */
      ctx.save();
      ctx.clip(outlineOf(bits));
      const rim = ctx.createLinearGradient(s * 0.3, 0, s * 0.7, 0);
      rim.addColorStop(0, 'rgba(45,212,191,0.55)');
      rim.addColorStop(0.2, 'rgba(45,212,191,0)');
      rim.addColorStop(0.8, 'rgba(249,115,22,0)');
      rim.addColorStop(1, 'rgba(249,115,22,0.7)');
      ctx.fillStyle = rim;
      ctx.fillRect(0, 0, s, s);
      ctx.restore();
      break;
    }
    case 'clay': {
      backdrop(ctx, s, ['#f6e7d4', '#e9cfae']);
      floor(ctx, s, 'rgba(120,72,30,0.22)');
      const matte = (bit: Bit): string => (bit.kind === 'suit' ? '#e76f51' : bit.kind === 'legs' ? '#2a9d8f' : bit.kind === 'core' ? '#f4a261' : bit.ink);
      ctx.shadowColor = 'rgba(80,40,10,0.3)';
      ctx.shadowBlur = s / 30;
      ctx.shadowOffsetY = s / 80;
      for (const bit of bits) { ctx.fillStyle = matte(bit); ctx.fill(bit.path); }
      ctx.shadowColor = 'transparent';
      ctx.save();
      ctx.clip(outlineOf(bits));
      let seed = 11;
      for (let k = 0; k < 90; k += 1) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const x = (seed % 1000) / 1000;
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const y = (seed % 1000) / 1000;
        ctx.strokeStyle = k % 2 ? 'rgba(255,255,255,0.18)' : 'rgba(60,30,10,0.16)';
        ctx.lineWidth = Math.max(0.6, s / 160);
        ctx.beginPath();
        ctx.arc(x * s, y * s, s * 0.012, 0, Math.PI * 1.3);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'anime': {
      backdrop(ctx, s, ['#fbcfe8', '#c7d2fe', '#a5f3fc']);
      const cel = (bit: Bit): string => (bit.kind === 'suit' ? '#f43f5e' : bit.kind === 'legs' ? '#312e81' : bit.kind === 'hair' ? '#6366f1' : bit.ink);
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = line * 2.4;
      ctx.lineJoin = 'round';
      for (const bit of bits) if (bit.kind !== 'eye' && bit.kind !== 'core') ctx.stroke(bit.path);
      for (const bit of bits) {
        if (bit.kind === 'eye') continue;
        ctx.fillStyle = cel(bit);
        ctx.fill(bit.path);
      }
      /* Two tones: the shadow side as one flat step, which is what cel
         shading is. */
      ctx.save();
      ctx.clip(outlineOf(bits));
      ctx.fillStyle = 'rgba(30,27,75,0.22)';
      ctx.beginPath();
      ctx.moveTo(s * 0.55, 0);
      ctx.lineTo(s, 0);
      ctx.lineTo(s, s);
      ctx.lineTo(s * 0.6, s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      /* Spiked hair over the head, and the large eyes with their light. */
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.moveTo(s * 0.39, s * 0.24);
      [[0.4, 0.12], [0.45, 0.19], [0.5, 0.1], [0.55, 0.19], [0.6, 0.12], [0.61, 0.24]].forEach(([x, y]) => ctx.lineTo(s * x, s * y));
      ctx.quadraticCurveTo(s * 0.5, s * 0.17, s * 0.39, s * 0.24);
      ctx.fill();
      for (const x of [0.462, 0.538]) {
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath(); ctx.ellipse(s * x, s * 0.262, s * 0.018, s * 0.028, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(s * (x - 0.006), s * 0.25, s * 0.007, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'android': {
      backdrop(ctx, s, ['#0f172a', '#0c4a6e', '#020617'], true);
      floor(ctx, s, 'rgba(34,211,238,0.25)');
      const plate = (bit: Bit): string => (bit.kind === 'suit' || bit.kind === 'skin' ? '#e2e8f0' : bit.kind === 'legs' || bit.kind === 'boot' ? '#334155' : bit.kind === 'hair' ? '#94a3b8' : bit.ink);
      rounded(ctx, s, bits.filter((bit) => bit.kind !== 'eye'), plate, 0.35);
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = s / 16;
      ctx.strokeStyle = 'rgba(34,211,238,0.9)';
      ctx.lineWidth = line;
      for (const bit of bits) if (bit.kind === 'suit' || bit.kind === 'legs') ctx.stroke(bit.path);
      /* A visor instead of eyes, lit from inside. */
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.ellipse(s * 0.5, s * 0.262, s * 0.065, s * 0.018, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    }
    case 'hologram': {
      backdrop(ctx, s, ['#020617', '#042f2e', '#020617']);
      /* The projector it stands on. */
      const beam = ctx.createLinearGradient(0, s * 0.95, 0, s * 0.15);
      beam.addColorStop(0, 'rgba(34,211,238,0.35)');
      beam.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(s * 0.3, s * 0.92);
      ctx.lineTo(s * 0.7, s * 0.92);
      ctx.lineTo(s * 0.82, s * 0.1);
      ctx.lineTo(s * 0.18, s * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#67e8f9';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = s / 10;
      ctx.beginPath();
      ctx.ellipse(s * 0.5, s * 0.92, s * 0.2, s * 0.025, 0, 0, Math.PI * 2);
      ctx.fill();
      const body = outlineOf(bits);
      const glow = ctx.createLinearGradient(0, s * 0.1, 0, s * 0.9);
      glow.addColorStop(0, 'rgba(167,139,250,0.75)');
      glow.addColorStop(0.5, 'rgba(34,211,238,0.6)');
      glow.addColorStop(1, 'rgba(226,232,240,0.7)');
      ctx.fillStyle = glow;
      ctx.fill(body);
      ctx.shadowBlur = 0;
      ctx.save();
      ctx.clip(body);
      ctx.fillStyle = 'rgba(2,6,23,0.35)';
      for (let y = 0; y < s; y += Math.max(2, s / 36)) ctx.fillRect(0, y, s, Math.max(1, s / 110));
      ctx.restore();
      ctx.strokeStyle = 'rgba(207,250,254,0.9)';
      ctx.lineWidth = Math.max(0.8, line * 0.7);
      ctx.stroke(body);
      break;
    }
    case 'wireframe': {
      backdrop(ctx, s, ['#05010d', '#120326', '#05010d']);
      const body = outlineOf(bits);
      ctx.save();
      ctx.clip(body);
      ctx.strokeStyle = 'rgba(34,211,238,0.55)';
      ctx.lineWidth = Math.max(0.6, line * 0.5);
      const step = s / 16;
      for (let k = -s; k < s * 2; k += step) {
        ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + s * 0.6, s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(k + s * 0.6, 0); ctx.lineTo(k, s); ctx.stroke();
      }
      ctx.restore();
      ctx.shadowBlur = s / 14;
      bits.forEach((bit) => {
        if (bit.kind === 'eye') return;
        const ink = bit.kind === 'suit' || bit.kind === 'core' ? '#ff3dc8' : '#22d3ee';
        ctx.strokeStyle = ink;
        ctx.shadowColor = ink;
        ctx.lineWidth = line * 1.2;
        ctx.stroke(bit.path);
      });
      ctx.shadowBlur = 0;
      break;
    }
    case 'lowpoly': {
      backdrop(ctx, s, ['#e0f2fe', '#bae6fd']);
      floor(ctx, s, 'rgba(14,116,144,0.2)');
      const n = 24;
      const d = sampled(n * 2);
      if (!d) break;
      const cell = s / n;
      for (let y = 0; y < n; y += 1) {
        for (let x = 0; x < n; x += 1) {
          for (let half = 0; half < 2; half += 1) {
            const cx = Math.min(n * 2 - 1, Math.round((x + (half ? 0.66 : 0.33)) * 2));
            const cy = Math.min(n * 2 - 1, Math.round((y + (half ? 0.66 : 0.33)) * 2));
            const i = (cy * n * 2 + cx) * 4;
            if (d[i + 3] < 128) continue;
            ctx.beginPath();
            if (half) {
              ctx.moveTo((x + 1) * cell, y * cell); ctx.lineTo((x + 1) * cell, (y + 1) * cell); ctx.lineTo(x * cell, (y + 1) * cell);
            } else {
              ctx.moveTo(x * cell, y * cell); ctx.lineTo((x + 1) * cell, y * cell); ctx.lineTo(x * cell, (y + 1) * cell);
            }
            ctx.closePath();
            ctx.fillStyle = rgbAt(d, i, half ? -28 : 22);
            ctx.fill();
          }
        }
      }
      break;
    }
    case 'toy': {
      backdrop(ctx, s, ['#fdf2f8', '#fbcfe8'], true);
      floor(ctx, s, 'rgba(190,24,93,0.18)');
      const pastel = (bit: Bit): string => (bit.kind === 'suit' ? '#a78bfa' : bit.kind === 'legs' ? '#f472b6' : bit.kind === 'boot' ? '#fde047' : bit.kind === 'hair' ? '#fb7185' : bit.ink);
      rounded(ctx, s, bits, pastel, 0.14);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.ellipse(s * 0.45, s * 0.16, s * 0.04, s * 0.016, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 0.43, s * 0.44, s * 0.025, s * 0.012, -0.6, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'voxel': {
      backdrop(ctx, s, ['#dcfce7', '#86efac']);
      const n = 16;
      const d = sampled(n);
      if (!d) break;
      const cell = s / (n + 1);
      for (let y = 0; y < n; y += 1) {
        for (let x = 0; x < n; x += 1) {
          const i = (y * n + x) * 4;
          if (d[i + 3] < 128) continue;
          const px = x * cell + cell * 0.4;
          const py = y * cell + cell * 0.3;
          const lip = cell * 0.26;
          ctx.fillStyle = rgbAt(d, i, -55);
          ctx.fillRect(px + lip, py + lip, cell, cell);
          ctx.fillStyle = rgbAt(d, i, 20);
          ctx.fillRect(px, py, cell, cell);
          ctx.strokeStyle = 'rgba(0,0,0,0.2)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, cell, cell);
        }
      }
      break;
    }
    default: {
      /* film3d: the soft, warm, rounded figure of an animated feature. */
      backdrop(ctx, s, ['#fef3c7', '#fcd34d', '#f59e0b'], true);
      floor(ctx, s, 'rgba(120,53,15,0.25)');
      ctx.shadowColor = 'rgba(120,53,15,0.35)';
      ctx.shadowBlur = s / 18;
      ctx.shadowOffsetY = s / 50;
      rounded(ctx, s, bits.filter((bit) => bit.kind !== 'eye'), (bit) => bit.ink, 0.3);
      ctx.shadowColor = 'transparent';
      for (const x of [0.462, 0.538]) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(s * x, s * 0.26, s * 0.02, s * 0.024, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1f2937';
        ctx.beginPath(); ctx.arc(s * x, s * 0.264, s * 0.012, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(s * (x - 0.005), s * 0.258, s * 0.004, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
  }
  ctx.restore();
}

/* ── The scenes ─────────────────────────────────────────────────────────── */

/** The same handful of towers in every scene, so the scenes differ by world and not by layout. */
const TOWERS: readonly (readonly [number, number, number])[] = [
  /* left edge, width, height — fractions of the tile */
  [0.0, 0.12, 0.42], [0.1, 0.09, 0.3], [0.18, 0.13, 0.52], [0.3, 0.08, 0.36],
  [0.62, 0.1, 0.46], [0.71, 0.08, 0.32], [0.78, 0.12, 0.56], [0.9, 0.1, 0.38],
];

const HORIZON = 0.72;

function towers(ctx: CanvasRenderingContext2D, s: number, fill: (x: number, w: number, h: number, k: number) => void): void {
  TOWERS.forEach(([x, w, h], k) => fill(x * s, w * s, h * s, k));
}

/** Windows on a tower, lit in a scene's colours. Seeded, so a tile is the same picture every time. */
function windows(ctx: CanvasRenderingContext2D, s: number, x: number, w: number, h: number, inks: readonly string[], k: number): void {
  let seed = 31 + k * 17;
  const size = Math.max(1, s / 64);
  for (let y = s * HORIZON - h + size * 2; y < s * HORIZON - size; y += size * 2.6) {
    for (let xx = x + size; xx < x + w - size; xx += size * 2.2) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      if (seed % 3 === 0) continue;
      ctx.fillStyle = inks[seed % inks.length];
      ctx.fillRect(xx, y, size, size);
    }
  }
}

/** The balloon, small and floating in the middle of the scene, recoloured to belong there. */
function balloonIn(ctx: CanvasRenderingContext2D, s: number, tint: string | null, alpha = 1, stroke: string | null = null): void {
  const size = s * 0.5;
  const off = document.createElement('canvas');
  off.width = Math.ceil(size);
  off.height = Math.ceil(size);
  const c = off.getContext('2d');
  if (!c) return;
  for (const part of balloon(size)) {
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = Math.max(1, size / 40);
      c.shadowColor = stroke;
      c.shadowBlur = size / 12;
      c.stroke(part.path);
    } else {
      c.fillStyle = part.ink;
      c.fill(part.path);
    }
  }
  if (tint && !stroke) {
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = tint;
    c.fillRect(0, 0, size, size);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(off, s * 0.5 - size / 2, s * 0.14);
  ctx.restore();
}

function stars(ctx: CanvasRenderingContext2D, s: number, many: number, top = 0.6): void {
  let seed = 5;
  for (let k = 0; k < many; k += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const x = (seed % 1000) / 1000;
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const y = ((seed % 1000) / 1000) * top;
    ctx.fillStyle = k % 5 === 0 ? 'rgba(255,255,255,0.95)' : 'rgba(226,232,240,0.6)';
    const d = Math.max(1, s / (k % 5 === 0 ? 90 : 150));
    ctx.fillRect(x * s, y * s, d, d);
  }
}

/** A glowing grid floor running to the horizon. */
function gridFloor(ctx: CanvasRenderingContext2D, s: number, ink: string, from = HORIZON): void {
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.shadowColor = ink;
  ctx.shadowBlur = s / 40;
  ctx.lineWidth = Math.max(1, s / 140);
  for (let k = -8; k <= 8; k += 1) {
    ctx.beginPath();
    ctx.moveTo(s * 0.5 + k * s * 0.02, s * from);
    ctx.lineTo(s * 0.5 + k * s * 0.18, s);
    ctx.stroke();
  }
  for (let k = 1; k < 7; k += 1) {
    const y = s * from + (s * (1 - from)) * (k / 7) ** 1.7;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(s, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Draw a scene style's sample on a square canvas. */
export function drawSceneTile(canvas: HTMLCanvasElement, id: string): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const s = canvas.width;
  ctx.save();
  ctx.clearRect(0, 0, s, s);
  const ground = s * HORIZON;

  switch (id) {
    case 'chrome': {
      backdrop(ctx, s, ['#f8fafc', '#cbd5e1', '#e2e8f0']);
      towers(ctx, s, (x, w, h) => {
        const g = ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, '#64748b'); g.addColorStop(0.35, '#f8fafc'); g.addColorStop(0.6, '#94a3b8'); g.addColorStop(1, '#334155');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x, ground);
        ctx.lineTo(x, ground - h + w * 0.5);
        ctx.quadraticCurveTo(x + w / 2, ground - h - w * 0.3, x + w, ground - h + w * 0.5);
        ctx.lineTo(x + w, ground);
        ctx.fill();
      });
      const floorG = ctx.createLinearGradient(0, ground, 0, s);
      floorG.addColorStop(0, '#e2e8f0'); floorG.addColorStop(1, '#94a3b8');
      ctx.fillStyle = floorG;
      ctx.fillRect(0, ground, s, s - ground);
      balloonIn(ctx, s, 'rgba(226,232,240,0.55)');
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(0, ground, s, Math.max(1, s / 120));
      break;
    }
    case 'hologram': {
      backdrop(ctx, s, ['#020617', '#042f2e', '#020617']);
      gridFloor(ctx, s, 'rgba(34,211,238,0.7)');
      ctx.strokeStyle = 'rgba(103,232,249,0.7)';
      ctx.lineWidth = Math.max(1, s / 120);
      towers(ctx, s, (x, w, h) => ctx.strokeRect(x + 1, ground - h, w - 2, h));
      balloonIn(ctx, s, null, 1, '#67e8f9');
      ctx.fillStyle = 'rgba(2,6,23,0.35)';
      for (let y = 0; y < s; y += Math.max(2, s / 40)) ctx.fillRect(0, y, s, Math.max(1, s / 120));
      break;
    }
    case 'rain': {
      backdrop(ctx, s, ['#020617', '#1e293b', '#0f172a']);
      towers(ctx, s, (x, w, h, k) => {
        ctx.fillStyle = '#0b1120';
        ctx.fillRect(x, ground - h, w, h);
        windows(ctx, s, x, w, h, ['#fbbf24', '#22d3ee', '#f472b6'], k);
      });
      const wet = ctx.createLinearGradient(0, ground, 0, s);
      wet.addColorStop(0, '#1e293b'); wet.addColorStop(1, '#020617');
      ctx.fillStyle = wet;
      ctx.fillRect(0, ground, s, s - ground);
      for (const [x, ink] of [[0.24, 'rgba(244,114,182,0.45)'], [0.66, 'rgba(34,211,238,0.45)'], [0.84, 'rgba(251,191,36,0.4)']] as const) {
        ctx.fillStyle = ink;
        ctx.fillRect(s * x, ground + s * 0.02, s * 0.05, s * 0.22);
      }
      balloonIn(ctx, s, 'rgba(15,23,42,0.45)');
      ctx.strokeStyle = 'rgba(203,213,225,0.45)';
      ctx.lineWidth = Math.max(0.8, s / 200);
      let seed = 9;
      for (let k = 0; k < 70; k += 1) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const x = (seed % 1000) / 1000;
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const y = (seed % 1000) / 1000;
        ctx.beginPath(); ctx.moveTo(x * s, y * s); ctx.lineTo(x * s - s * 0.02, y * s + s * 0.08); ctx.stroke();
      }
      break;
    }
    case 'synthwave': {
      backdrop(ctx, s, ['#1e1b4b', '#6d28d9', '#f472b6']);
      /* The striped sun, set on the horizon. */
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, s, ground);
      ctx.clip();
      const sun = ctx.createLinearGradient(0, s * 0.3, 0, ground);
      sun.addColorStop(0, '#fde047'); sun.addColorStop(1, '#f43f5e');
      ctx.fillStyle = sun;
      ctx.beginPath(); ctx.arc(s * 0.5, ground, s * 0.3, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#7c3aed';
      for (let k = 0; k < 5; k += 1) ctx.fillRect(0, ground - s * (0.04 + k * 0.05), s, s * (0.008 + k * 0.004));
      ctx.restore();
      ctx.fillStyle = '#3b0764';
      ctx.beginPath();
      ctx.moveTo(0, ground);
      [[0.12, 0.6], [0.24, 0.68], [0.36, 0.62], [0.42, ground / s]].forEach(([x, y]) => ctx.lineTo(s * x, s * y));
      ctx.moveTo(s * 0.58, ground);
      [[0.68, 0.6], [0.8, 0.66], [0.9, 0.58], [1, 0.66], [1, ground / s]].forEach(([x, y]) => ctx.lineTo(s * x, s * y));
      ctx.fill();
      ctx.fillStyle = '#0c0420';
      ctx.fillRect(0, ground, s, s - ground);
      gridFloor(ctx, s, 'rgba(236,72,153,0.9)');
      balloonIn(ctx, s, 'rgba(219,39,119,0.35)', 0.95);
      break;
    }
    case 'space': {
      backdrop(ctx, s, ['#000000', '#020617', '#0b1120']);
      stars(ctx, s, 90, 1);
      const planet = ctx.createRadialGradient(s * 0.25, s * 1.15, s * 0.2, s * 0.25, s * 1.2, s * 0.62);
      planet.addColorStop(0, '#1d4ed8'); planet.addColorStop(0.8, '#0ea5e9'); planet.addColorStop(1, 'rgba(125,211,252,0)');
      ctx.fillStyle = planet;
      ctx.beginPath(); ctx.arc(s * 0.25, s * 1.2, s * 0.62, 0, Math.PI * 2); ctx.fill();
      /* The station: a ring and its spokes. */
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = Math.max(1.5, s / 50);
      ctx.beginPath(); ctx.ellipse(s * 0.72, s * 0.3, s * 0.2, s * 0.07, -0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = Math.max(1, s / 120);
      for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        ctx.beginPath(); ctx.moveTo(s * 0.72, s * 0.3);
        ctx.lineTo(s * 0.72 + Math.cos(a - 0.3) * s * 0.2, s * 0.3 + Math.sin(a) * s * 0.07); ctx.stroke();
      }
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath(); ctx.arc(s * 0.72, s * 0.3, s * 0.03, 0, Math.PI * 2); ctx.fill();
      /* And the window she is looking out of. */
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = s * 0.07;
      ctx.beginPath();
      ctx.roundRect(s * 0.035, s * 0.035, s * 0.93, s * 0.93, s * 0.16);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(56,189,248,0.6)';
      ctx.lineWidth = Math.max(1, s / 120);
      ctx.beginPath();
      ctx.roundRect(s * 0.07, s * 0.07, s * 0.86, s * 0.86, s * 0.13);
      ctx.stroke();
      ctx.save();
      ctx.translate(-s * 0.12, s * 0.1);
      ctx.scale(0.8, 0.8);
      balloonIn(ctx, s, 'rgba(148,163,184,0.25)');
      ctx.restore();
      break;
    }
    case 'biolum': {
      backdrop(ctx, s, ['#020617', '#082f49', '#022c22']);
      stars(ctx, s, 30, 0.4);
      ctx.shadowBlur = s / 18;
      const stalks: readonly (readonly [number, number, string])[] = [
        [0.1, 0.5, '#22d3ee'], [0.2, 0.62, '#4ade80'], [0.3, 0.45, '#a78bfa'],
        [0.7, 0.55, '#4ade80'], [0.8, 0.4, '#22d3ee'], [0.9, 0.6, '#a78bfa'],
      ];
      for (const [x, top, ink] of stalks) {
        ctx.strokeStyle = ink;
        ctx.shadowColor = ink;
        ctx.lineWidth = Math.max(1, s / 90);
        ctx.beginPath();
        ctx.moveTo(s * x, s);
        ctx.quadraticCurveTo(s * (x + 0.06), s * (top + 0.25), s * x, s * top);
        ctx.stroke();
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.arc(s * x, s * top, s * 0.025, 0, Math.PI * 2); ctx.fill();
      }
      let seed = 21;
      for (let k = 0; k < 40; k += 1) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const x = (seed % 1000) / 1000;
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const y = 0.3 + ((seed % 1000) / 1000) * 0.7;
        ctx.fillStyle = k % 2 ? 'rgba(74,222,128,0.8)' : 'rgba(34,211,238,0.8)';
        ctx.shadowColor = ctx.fillStyle;
        ctx.beginPath(); ctx.arc(x * s, y * s, Math.max(1, s / 110), 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
      balloonIn(ctx, s, 'rgba(8,47,73,0.45)');
      break;
    }
    case 'animefuture': {
      backdrop(ctx, s, ['#0ea5e9', '#7dd3fc', '#e0f2fe']);
      ctx.fillStyle = '#ffffff';
      for (const [x, y, r] of [[0.18, 0.2, 0.07], [0.26, 0.18, 0.09], [0.34, 0.21, 0.06], [0.72, 0.12, 0.06], [0.8, 0.1, 0.08]] as const) {
        ctx.beginPath(); ctx.arc(s * x, s * y, s * r, 0, Math.PI * 2); ctx.fill();
      }
      towers(ctx, s, (x, w, h, k) => {
        ctx.fillStyle = k % 2 ? '#e0e7ff' : '#c7d2fe';
        ctx.fillRect(x, ground - h, w, h);
        ctx.fillStyle = '#818cf8';
        ctx.fillRect(x + w * 0.62, ground - h, w * 0.38, h);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x + w * 0.2, ground - h + s * 0.03, w * 0.3, s * 0.015);
      });
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(0, ground, s, s - ground);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(0, ground, s, s * 0.03);
      balloonIn(ctx, s, null);
      break;
    }
    case 'animated3d': {
      backdrop(ctx, s, ['#fde68a', '#fbcfe8', '#c4b5fd']);
      for (const [x, r, ink] of [[0.15, 0.32, '#86efac'], [0.85, 0.36, '#4ade80'], [0.5, 0.4, '#bbf7d0']] as const) {
        const g = ctx.createRadialGradient(s * x - s * r * 0.3, s - s * r * 0.9, s * 0.02, s * x, s, s * r);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, ink); g.addColorStop(1, shade(ink, -60));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(s * x, s * 1.05, s * r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowColor = 'rgba(91,33,182,0.3)';
      ctx.shadowBlur = s / 20;
      balloonIn(ctx, s, null);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.ellipse(s * 0.42, s * 0.26, s * 0.03, s * 0.06, 0.5, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'solar': {
      backdrop(ctx, s, ['#7dd3fc', '#e0f2fe', '#fef9c3']);
      const sun = ctx.createRadialGradient(s * 0.82, s * 0.16, 0, s * 0.82, s * 0.16, s * 0.3);
      sun.addColorStop(0, 'rgba(254,240,138,1)'); sun.addColorStop(0.25, 'rgba(254,240,138,0.8)'); sun.addColorStop(1, 'rgba(254,240,138,0)');
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, s, s);
      towers(ctx, s, (x, w, h, k) => {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(x, ground - h, w, h);
        ctx.fillStyle = '#38bdf8';
        for (let y = ground - h + s * 0.03; y < ground - s * 0.02; y += s * 0.07) ctx.fillRect(x + w * 0.15, y, w * 0.7, s * 0.02);
        ctx.fillStyle = k % 2 ? '#22c55e' : '#16a34a';
        for (const dx of [0.2, 0.55, 0.85]) {
          ctx.beginPath(); ctx.arc(x + w * dx, ground - h, Math.max(2, w * 0.22), 0, Math.PI * 2); ctx.fill();
        }
      });
      ctx.fillStyle = '#86efac';
      ctx.fillRect(0, ground, s, s - ground);
      balloonIn(ctx, s, null);
      break;
    }
    default: {
      /* neoncity */
      backdrop(ctx, s, ['#0b0218', '#3b0764', '#7e22ce']);
      stars(ctx, s, 25, 0.3);
      towers(ctx, s, (x, w, h, k) => {
        ctx.fillStyle = '#0b0218';
        ctx.fillRect(x, ground - h, w, h);
        windows(ctx, s, x, w, h, ['#ff3dc8', '#22d3ee', '#a78bfa'], k);
      });
      ctx.shadowBlur = s / 16;
      for (const [x, y, w, ink] of [[0.19, 0.32, 0.1, '#ff3dc8'], [0.79, 0.24, 0.1, '#22d3ee'], [0.63, 0.4, 0.07, '#fde047']] as const) {
        ctx.shadowColor = ink;
        ctx.fillStyle = ink;
        ctx.fillRect(s * x, s * y, s * w, s * 0.025);
      }
      ctx.shadowBlur = 0;
      const street = ctx.createLinearGradient(0, ground, 0, s);
      street.addColorStop(0, '#1e0b3a'); street.addColorStop(1, '#05010d');
      ctx.fillStyle = street;
      ctx.fillRect(0, ground, s, s - ground);
      for (const [x, ink] of [[0.2, 'rgba(255,61,200,0.4)'], [0.8, 'rgba(34,211,238,0.4)']] as const) {
        ctx.fillStyle = ink;
        ctx.fillRect(s * x, ground + s * 0.02, s * 0.09, s * 0.2);
      }
      balloonIn(ctx, s, 'rgba(126,34,206,0.35)');
      break;
    }
  }
  ctx.restore();
}
