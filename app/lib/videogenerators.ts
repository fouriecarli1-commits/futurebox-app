'use client';

/**
 * Generators: a shot made out of nothing, on the phone.
 *
 * Carli, 16 October 2026, screenshots of a desktop editor's toolbox with its
 * Generators open — a solid colour, a gradient, a four-colour gradient, grey
 * scale, colour bars, noise. Those are the plain ones, and they are here; so
 * are moving backgrounds of our own (a neon grid, a starfield, an aurora,
 * light bokeh, plasma) and a 3-2-1 countdown, because a background behind a
 * title is what somebody making a reel actually reaches for.
 *
 * Each one is drawn by `drawGenerator` as a function of time, so the little
 * moving picture in the list and the clip that lands on the clock come from
 * the same code. The clip is recorded off a canvas (`recordGenerator`), the
 * same way the templates are, and goes on the clock as an ordinary piece:
 * trims, looks, words, effects and transitions all work on it unchanged.
 * Free — nothing leaves the phone.
 */
import { TemplateVideoUnsupported } from './templatevideo';
import { videoSupported } from './video';

export type GeneratorId =
  | 'solid' | 'gradient' | 'fourColour' | 'greyScale' | 'colourBars' | 'noise'
  | 'neonGrid' | 'starfield' | 'aurora' | 'bokeh' | 'plasma' | 'countdown';

export type GeneratorGroup = 'colour' | 'moving' | 'test';

export const GENERATOR_GROUPS: readonly { readonly id: GeneratorGroup; readonly en: string; readonly af: string }[] = [
  { id: 'colour', en: 'Colour', af: 'Kleur' },
  { id: 'moving', en: 'Moving backgrounds', af: 'Bewegende agtergronde' },
  { id: 'test', en: 'Test pictures', af: 'Toetsprente' },
];

export interface GeneratorSpec {
  readonly id: GeneratorId;
  readonly group: GeneratorGroup;
  readonly en: string;
  readonly af: string;
  /** Whether the colours she picks change it. */
  readonly inked: boolean;
}

export const GENERATORS: readonly GeneratorSpec[] = [
  { id: 'solid', group: 'colour', en: 'Solid colour', af: 'Soliede kleur', inked: true },
  { id: 'gradient', group: 'colour', en: 'Gradient', af: 'Kleurverloop', inked: true },
  { id: 'fourColour', group: 'colour', en: 'Four-colour gradient', af: 'Vierkleur-verloop', inked: true },
  { id: 'neonGrid', group: 'moving', en: 'Neon grid', af: 'Neonrooster', inked: true },
  { id: 'starfield', group: 'moving', en: 'Starfield', af: 'Sterreveld', inked: false },
  { id: 'aurora', group: 'moving', en: 'Aurora', af: 'Aurora', inked: true },
  { id: 'bokeh', group: 'moving', en: 'Bokeh lights', af: 'Bokeh-ligte', inked: true },
  { id: 'plasma', group: 'moving', en: 'Plasma', af: 'Plasma', inked: false },
  { id: 'countdown', group: 'moving', en: 'Countdown 3-2-1', af: 'Aftelling 3-2-1', inked: true },
  { id: 'greyScale', group: 'test', en: 'Grey scale', af: 'Grysskaal', inked: false },
  { id: 'colourBars', group: 'test', en: 'Colour bars', af: 'Kleurstawe', inked: false },
  { id: 'noise', group: 'test', en: 'Noise', af: 'Ruis', inked: false },
];

/** The colours offered for a generator that takes them. */
export const GENERATOR_INKS: readonly string[] = [
  '#7c3aed', '#ff3dc8', '#22d3ee', '#39ff14', '#f59e0b', '#ef4444', '#0f172a', '#ffffff',
];

export const generatorLabel = (one: { readonly en: string; readonly af: string }, lang: string): string =>
  (lang === 'af' ? one.af : one.en);

/** Two colours, as she picked them. */
export interface GeneratorInks {
  readonly a: string;
  readonly b: string;
}

const hexRgb = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : 0x7c3aed;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: string, b: string, k: number): string => {
  const [r1, g1, b1] = hexRgb(a);
  const [r2, g2, b2] = hexRgb(b);
  return `rgb(${Math.round(r1 + (r2 - r1) * k)},${Math.round(g1 + (g2 - g1) * k)},${Math.round(b1 + (b2 - b1) * k)})`;
};
/** A repeatable number in 0..1 for a whole number. */
const hash = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** One frame of a generator, `t` seconds in, over the whole of a w×h canvas. */
export function drawGenerator(ctx: CanvasRenderingContext2D, id: GeneratorId, w: number, h: number, t: number, inks: GeneratorInks): void {
  const { a, b } = inks;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  switch (id) {
    case 'solid':
      ctx.fillStyle = a;
      ctx.fillRect(0, 0, w, h);
      break;
    case 'gradient': {
      /* Turning slowly, so a still colour wash still feels alive behind words. */
      const turn = t * 0.35;
      const r = Math.hypot(w, h) / 2;
      const g = ctx.createLinearGradient(w / 2 - Math.cos(turn) * r, h / 2 - Math.sin(turn) * r, w / 2 + Math.cos(turn) * r, h / 2 + Math.sin(turn) * r);
      g.addColorStop(0, a);
      g.addColorStop(1, b);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case 'fourColour': {
      const top = ctx.createLinearGradient(0, 0, w, 0);
      top.addColorStop(0, a);
      top.addColorStop(1, b);
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, w, h);
      /* The lower two corners, faded in from nothing at the top to whole at the bottom. */
      const lower = document.createElement('canvas');
      lower.width = Math.max(1, Math.round(w / 4));
      lower.height = Math.max(1, Math.round(h / 4));
      const lctx = lower.getContext('2d');
      if (lctx) {
        const lb = lctx.createLinearGradient(0, 0, lower.width, 0);
        lb.addColorStop(0, mix(b, '#000000', 0.2));
        lb.addColorStop(1, mix(a, '#ffffff', 0.35));
        lctx.fillStyle = lb;
        lctx.fillRect(0, 0, lower.width, lower.height);
        lctx.globalCompositeOperation = 'destination-in';
        const lf = lctx.createLinearGradient(0, 0, 0, lower.height);
        lf.addColorStop(0, 'rgba(0,0,0,0)');
        lf.addColorStop(1, 'rgba(0,0,0,1)');
        lctx.fillStyle = lf;
        lctx.fillRect(0, 0, lower.width, lower.height);
        ctx.drawImage(lower, 0, 0, w, h);
      }
      break;
    }
    case 'greyScale': {
      const steps = 11;
      for (let i = 0; i < steps; i += 1) {
        const v = Math.round((i / (steps - 1)) * 255);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect((i * w) / steps, 0, w / steps + 1, h);
      }
      break;
    }
    case 'colourBars': {
      const bars = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
      bars.forEach((ink, i) => { ctx.fillStyle = ink; ctx.fillRect((i * w) / 7, 0, w / 7 + 1, h * 0.67); });
      const mid = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'];
      mid.forEach((ink, i) => { ctx.fillStyle = ink; ctx.fillRect((i * w) / 7, h * 0.67, w / 7 + 1, h * 0.08); });
      const low = ['#00214c', '#ffffff', '#32006a', '#131313', '#090909', '#131313', '#1d1d1d'];
      low.forEach((ink, i) => { ctx.fillStyle = ink; ctx.fillRect((i * w) / 7, h * 0.75, w / 7 + 1, h * 0.25); });
      break;
    }
    case 'noise': {
      /* Static, a fresh field 25 times a second, from the frame number. */
      const cw = Math.max(1, Math.round(w / 4));
      const ch = Math.max(1, Math.round(h / 4));
      const img = ctx.createImageData(cw, ch);
      let seed = Math.floor(t * 25) * 7919 + 1;
      for (let i = 0; i < img.data.length; i += 4) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const v = seed % 256;
        img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
      }
      const small = document.createElement('canvas');
      small.width = cw;
      small.height = ch;
      small.getContext('2d')?.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, w, h);
      break;
    }
    case 'neonGrid': {
      /* A synthwave floor running towards a sun on the horizon. */
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
      sky.addColorStop(0, '#0b0221');
      sky.addColorStop(1, mix(a, '#0b0221', 0.4));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      const horizon = h * 0.55;
      const sunR = Math.min(w, h) * 0.18;
      const sun = ctx.createLinearGradient(0, horizon - sunR * 2, 0, horizon);
      sun.addColorStop(0, '#ffd166');
      sun.addColorStop(1, b);
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(w / 2, horizon, sunR, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#0b0221';
      ctx.fillRect(0, horizon, w, h - horizon);
      ctx.strokeStyle = a;
      ctx.shadowColor = a;
      ctx.shadowBlur = Math.max(4, w / 120);
      ctx.lineWidth = Math.max(1, w / 400);
      for (let i = -12; i <= 12; i += 1) {
        ctx.beginPath();
        ctx.moveTo(w / 2 + (i * w) / 40, horizon);
        ctx.lineTo(w / 2 + (i * w) / 4, h);
        ctx.stroke();
      }
      const run = (t * 0.6) % 1;
      for (let i = 0; i < 12; i += 1) {
        const k = (i + run) / 12;
        const y = horizon + (h - horizon) * k * k;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      break;
    }
    case 'starfield': {
      ctx.fillStyle = '#02030a';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i += 1) {
        const depth = ((hash(i) + t * 0.25) % 1);
        const z = 1 - depth;
        const angle = hash(i + 500) * Math.PI * 2;
        const reach = (1 / Math.max(0.05, z)) * 0.08;
        const x = w / 2 + Math.cos(angle) * reach * w;
        const y = h / 2 + Math.sin(angle) * reach * h;
        if (x < 0 || x > w || y < 0 || y > h) continue;
        const size = Math.max(0.6, (1 - z) * Math.max(w, h) / 300);
        ctx.fillStyle = `rgba(255,255,255,${(0.3 + 0.7 * (1 - z)).toFixed(2)})`;
        ctx.fillRect(x, y, size, size);
      }
      break;
    }
    case 'aurora': {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'screen';
      for (let band = 0; band < 3; band += 1) {
        const ink = band === 1 ? b : a;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += w / 40) {
          const y = h * (0.35 + band * 0.12) + Math.sin(x / w * 6 + t * (0.8 + band * 0.3) + band) * h * 0.08;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, h * 0.2, 0, h);
        g.addColorStop(0, mix(ink, '#000000', 0));
        g.addColorStop(0.5, mix(ink, '#020617', 0.6));
        g.addColorStop(1, 'rgba(2,6,23,0)');
        ctx.fillStyle = g;
        ctx.globalAlpha = 0.55;
        ctx.fill();
      }
      break;
    }
    case 'bokeh': {
      const back = ctx.createLinearGradient(0, 0, 0, h);
      back.addColorStop(0, '#0a0614');
      back.addColorStop(1, mix(a, '#0a0614', 0.75));
      ctx.fillStyle = back;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 26; i += 1) {
        const x = (hash(i) * 1.2 - 0.1 + Math.sin(t * 0.3 + i) * 0.03) * w;
        const y = ((hash(i + 99) - t * 0.04 * (0.5 + hash(i + 7))) % 1 + 1) % 1 * h;
        const r = (0.03 + hash(i + 33) * 0.08) * Math.min(w, h);
        const ink = i % 2 ? a : b;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, mix(ink, '#ffffff', 0.3));
        g.addColorStop(0.7, mix(ink, '#000000', 0.2));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.35 + 0.4 * hash(i + 3);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'plasma': {
      const cw = 80;
      const ch = Math.max(1, Math.round((80 * h) / w));
      const img = ctx.createImageData(cw, ch);
      for (let y = 0; y < ch; y += 1) {
        for (let x = 0; x < cw; x += 1) {
          const v = Math.sin(x / 9 + t) + Math.sin(y / 7 - t * 1.3) + Math.sin((x + y) / 11 + t * 0.7) + Math.sin(Math.hypot(x - cw / 2, y - ch / 2) / 6 - t);
          const i = (y * cw + x) * 4;
          img.data[i] = Math.round(128 + 127 * Math.sin(v * Math.PI));
          img.data[i + 1] = Math.round(128 + 127 * Math.sin(v * Math.PI + 2.1));
          img.data[i + 2] = Math.round(128 + 127 * Math.sin(v * Math.PI + 4.2));
          img.data[i + 3] = 255;
        }
      }
      const small = document.createElement('canvas');
      small.width = cw;
      small.height = ch;
      small.getContext('2d')?.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(small, 0, 0, w, h);
      break;
    }
    case 'countdown': {
      /* 3, 2, 1 — one a second, with the sweep going round each. */
      ctx.fillStyle = '#0b0b10';
      ctx.fillRect(0, 0, w, h);
      const n = Math.max(1, 3 - Math.floor(t));
      const part = t % 1;
      const r = Math.min(w, h) * 0.3;
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = Math.max(2, r / 14);
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = a;
      ctx.shadowColor = a;
      ctx.shadowBlur = r / 4;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, -Math.PI / 2, -Math.PI / 2 + part * Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.round(r * 1.1)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(n), w / 2, h / 2 + r * 0.05);
      break;
    }
    default:
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

/**
 * Record a generator as a clip, `seconds` long, at `width` × `height`.
 *
 * Off a canvas, in real time, as the templates are — so a four-second
 * background takes four seconds to make. Throws `TemplateVideoUnsupported`
 * where the browser cannot record, for the room to say so in words.
 */
export async function recordGenerator(
  id: GeneratorId,
  inks: GeneratorInks,
  seconds: number,
  width: number,
  height: number,
): Promise<Blob> {
  if (typeof window === 'undefined' || !videoSupported() || typeof MediaRecorder === 'undefined') {
    throw new TemplateVideoUnsupported();
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof canvas.captureStream !== 'function') throw new TemplateVideoUnsupported();
  const stream = canvas.captureStream(25);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      if (!chunks.length) { reject(new TemplateVideoUnsupported()); return; }
      resolve(new Blob(chunks, { type: mimeType }));
    };
  });
  drawGenerator(ctx, id, width, height, 0, inks);
  recorder.start();
  const started = performance.now();
  return new Promise<Blob>((resolve, reject) => {
    const frame = (): void => {
      const t = (performance.now() - started) / 1000;
      drawGenerator(ctx, id, width, height, Math.min(seconds, t), inks);
      if (t < seconds) {
        requestAnimationFrame(frame);
      } else {
        try { recorder.stop(); } catch { /* already stopped */ }
        stopped.then(resolve, reject);
      }
    };
    requestAnimationFrame(frame);
  });
}
