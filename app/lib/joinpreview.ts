/**
 * The little moving picture beside each transition's name.
 *
 * The owner's screenshots show a picture by every transition. These
 * are drawn by `paintJoin` itself, over two sample frames — a teal sky with a
 * sun leaving, an orange evening with a mountain arriving — so the picture in
 * the list is the transition, not an illustration of it.
 */
import { paintJoin } from './joinpaint';
import { joiningAt, type Join } from './videojoins';

const samples = new Map<string, { leaving: HTMLCanvasElement; arriving: HTMLCanvasElement }>();

function samplesFor(w: number, h: number): { leaving: HTMLCanvasElement; arriving: HTMLCanvasElement } | null {
  if (typeof document === 'undefined') return null;
  const key = `${w}x${h}`;
  const had = samples.get(key);
  if (had) return had;
  const make = (paint: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) paint(ctx);
    return canvas;
  };
  const leaving = make((ctx) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0e7490');
    sky.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(w * 0.32, h * 0.45, h * 0.22, 0, Math.PI * 2);
    ctx.fill();
  });
  const arriving = make((ctx) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#f97316');
    sky.addColorStop(1, '#db2777');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.moveTo(w * 0.35, h);
    ctx.lineTo(w * 0.68, h * 0.3);
    ctx.lineTo(w * 1.0, h);
    ctx.closePath();
    ctx.fill();
  });
  const both = { leaving, arriving };
  samples.set(key, both);
  return both;
}

/** Draw `join` onto `canvas`, `p` of the way through (nought to one). */
export function drawJoinPreview(canvas: HTMLCanvasElement, join: Join, p: number): void {
  const ctx = canvas.getContext('2d');
  const pics = samplesFor(canvas.width, canvas.height);
  if (!ctx || !pics) return;
  const w = canvas.width;
  const h = canvas.height;
  const t = Math.max(0, Math.min(1, p));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  if (join === 'cut') {
    ctx.drawImage(t < 0.5 ? pics.leaving : pics.arriving, 0, 0, w, h);
    return;
  }
  if (join === 'dip' || join === 'flash') {
    /* A colour join has a half on each side of the cut; the preview shows both. */
    ctx.drawImage(t < 0.5 ? pics.leaving : pics.arriving, 0, 0, w, h);
    ctx.globalAlpha = t < 0.5 ? t * 2 : 1 - (t - 0.5) * 2;
    ctx.fillStyle = join === 'dip' ? '#000' : '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    return;
  }
  ctx.drawImage(pics.arriving, 0, 0, w, h);
  const now = joiningAt({
    arrive: join, arriveFor: 0.6, leave: 'cut', into: t * 0.6, runs: 100, first: false, last: false,
  });
  paintJoin(ctx, w, h, now, pics.leaving);
}
