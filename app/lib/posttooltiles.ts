/**
 * The photo editor's tools, shown as pictures of what they do.
 *
 * Carli, 16 October 2026: *"Kyk asb ook hoe oulik dit is om die funksies op
 * prentjies te wys (onthou mense is visueel)."* Each tool along the foot is a
 * small square of HER photograph with the tool's work drawn on it — the crop
 * corners on it, the photograph split into a grid, words on it, a sparkle
 * where the magic goes — so a tool reads as what it will do to this picture
 * rather than as a symbol to learn. Before there is a photograph the square
 * is the drawn Highveld evening from `postfilters.ts`.
 */
import { POST_FILTERS, drawFilterTile } from './postfilters';
import { PLAIN } from './postlook';

const NEON = '#39ff14';
const MINT = '#34d399';
const PINK = '#ff3dc8';

/** The photograph, filling the square. */
const base = (ctx: CanvasRenderingContext2D, from: HTMLCanvasElement, s: number): void => {
  ctx.drawImage(from, 0, 0, s, s);
};

const shade = (ctx: CanvasRenderingContext2D, s: number, alpha: number): void => {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fillRect(0, 0, s, s);
};

/** A rounded rectangle path. */
const rounded = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const sparkle = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, ink: string): void => {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fillStyle = ink;
  ctx.fill();
};

/** Draw one tool's picture on a square canvas. Returns false for a tool with no picture. */
export function drawToolTile(canvas: HTMLCanvasElement, id: string, from: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const s = canvas.width;
  const line = Math.max(1.5, s / 28);
  ctx.save();
  ctx.clearRect(0, 0, s, s);
  rounded(ctx, 0, 0, s, s, s * 0.22);
  ctx.clip();
  switch (id) {
    case 'starts': {
      /* A finished design: her photo under a band with a title on it. */
      base(ctx, from, s);
      shade(ctx, s, 0.25);
      const band = ctx.createLinearGradient(0, 0, s, 0);
      band.addColorStop(0, 'rgba(124,58,237,0.9)');
      band.addColorStop(1, 'rgba(255,61,200,0.9)');
      ctx.fillStyle = band;
      ctx.fillRect(0, s * 0.62, s, s * 0.38);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(s * 0.14, s * 0.7, s * 0.62, s * 0.09);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(s * 0.14, s * 0.84, s * 0.4, s * 0.05);
      break;
    }
    case 'grid': {
      /* The photograph four times over, with a gap between. */
      ctx.fillStyle = '#f4f4f5';
      ctx.fillRect(0, 0, s, s);
      const g = s * 0.05;
      const half = (s - g * 3) / 2;
      for (let n = 0; n < 4; n += 1) {
        const x = g + (n % 2) * (half + g);
        const y = g + Math.floor(n / 2) * (half + g);
        ctx.save();
        ctx.filter = n === 1 ? 'grayscale(1)' : n === 2 ? 'saturate(1.6) hue-rotate(-20deg)' : n === 3 ? 'sepia(0.6)' : 'none';
        ctx.drawImage(from, x, y, half, half);
        ctx.restore();
      }
      break;
    }
    case 'pic': {
      /* The photograph, with a plus: bring one in. */
      base(ctx, from, s);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.arc(s * 0.74, s * 0.74, s * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = line * 1.2;
      ctx.beginPath();
      ctx.moveTo(s * 0.74, s * 0.65);
      ctx.lineTo(s * 0.74, s * 0.83);
      ctx.moveTo(s * 0.65, s * 0.74);
      ctx.lineTo(s * 0.83, s * 0.74);
      ctx.stroke();
      break;
    }
    case 'frame': {
      /* Outside the crop darkened, and the white corners of the crop. */
      base(ctx, from, s);
      const a = s * 0.18;
      const b = s * 0.82;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, s, a);
      ctx.fillRect(0, b, s, s - b);
      ctx.fillRect(0, a, a, b - a);
      ctx.fillRect(b, a, s - b, b - a);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = line * 1.3;
      const c = s * 0.16;
      ctx.beginPath();
      ctx.moveTo(a, a + c); ctx.lineTo(a, a); ctx.lineTo(a + c, a);
      ctx.moveTo(b - c, a); ctx.lineTo(b, a); ctx.lineTo(b, a + c);
      ctx.moveTo(b, b - c); ctx.lineTo(b, b); ctx.lineTo(b - c, b);
      ctx.moveTo(a + c, b); ctx.lineTo(a, b); ctx.lineTo(a, b - c);
      ctx.stroke();
      break;
    }
    case 'tone': {
      /* Before and after: the right half lifted, with the line between. */
      base(ctx, from, s);
      ctx.save();
      ctx.beginPath();
      ctx.rect(s / 2, 0, s / 2, s);
      ctx.clip();
      ctx.filter = 'brightness(1.25) contrast(1.2) saturate(1.5)';
      ctx.drawImage(from, 0, 0, s, s);
      ctx.restore();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(s / 2 - line / 2, 0, line, s);
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'filters': {
      /* Three stripes, three filters. */
      const picks = ['karoo', 'charcoal', 'synthwave'];
      const strip = document.createElement('canvas');
      strip.width = s;
      strip.height = s;
      picks.forEach((pick, at) => {
        drawFilterTile(strip, from, POST_FILTERS.find((one) => one.id === pick)?.look ?? PLAIN);
        ctx.drawImage(strip, (at * s) / 3, 0, s / 3, s, (at * s) / 3, 0, s / 3, s);
      });
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(s / 3 - line / 4, 0, line / 2, s);
      ctx.fillRect((2 * s) / 3 - line / 4, 0, line / 2, s);
      break;
    }
    case 'magic': {
      /* A dashed ring where the AI goes, and sparkles. */
      base(ctx, from, s);
      shade(ctx, s, 0.2);
      ctx.save();
      ctx.strokeStyle = NEON;
      ctx.shadowColor = NEON;
      ctx.shadowBlur = s / 10;
      ctx.lineWidth = line;
      ctx.setLineDash([line * 2, line * 1.5]);
      ctx.beginPath();
      ctx.arc(s * 0.46, s * 0.54, s * 0.24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      sparkle(ctx, s * 0.76, s * 0.26, s * 0.13, '#ffffff');
      sparkle(ctx, s * 0.6, s * 0.14, s * 0.07, '#fef08a');
      break;
    }
    case 'read': {
      /* Something picked out of the photo: a box with its handles. */
      base(ctx, from, s);
      shade(ctx, s, 0.35);
      const x = s * 0.2;
      const y = s * 0.3;
      const w = s * 0.6;
      const h = s * 0.4;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.drawImage(from, 0, 0, s, s);
      ctx.restore();
      ctx.strokeStyle = MINT;
      ctx.lineWidth = line;
      ctx.setLineDash([line * 1.6, line]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff';
      for (const [hx, hy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
        ctx.fillRect(hx - line * 1.2, hy - line * 1.2, line * 2.4, line * 2.4);
      }
      break;
    }
    case 'text': {
      /* Words on the photograph. */
      base(ctx, from, s);
      shade(ctx, s, 0.3);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = PINK;
      ctx.shadowBlur = s / 8;
      ctx.font = `900 ${Math.round(s * 0.42)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Aa', s / 2, s / 2 + s * 0.02);
      break;
    }
    case 'charts': {
      /* Three rising columns over the photograph, in the chart palette's first three hues. */
      base(ctx, from, s);
      shade(ctx, s, 0.45);
      ctx.save();
      ['#3987e5', '#d95926', '#199e70'].forEach((c, k) => {
        const h = s * (0.22 + k * 0.16);
        ctx.fillStyle = c;
        ctx.fillRect(s * (0.2 + k * 0.22), s * 0.8 - h, s * 0.16, h);
      });
      ctx.restore();
      break;
    }
    case 'shapes': {
      /* A glowing ring and a square over the photograph. */
      base(ctx, from, s);
      shade(ctx, s, 0.35);
      ctx.save();
      ctx.lineWidth = line * 1.2;
      ctx.shadowBlur = s / 9;
      ctx.strokeStyle = '#22d3ee';
      ctx.shadowColor = '#22d3ee';
      ctx.beginPath();
      ctx.arc(s * 0.38, s * 0.42, s * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = PINK;
      ctx.shadowColor = PINK;
      ctx.strokeRect(s * 0.46, s * 0.46, s * 0.34, s * 0.34);
      ctx.restore();
      break;
    }
    case 'layers': {
      /* The photograph as three cards, one on top of the other. */
      ctx.fillStyle = '#e4e4e7';
      ctx.fillRect(0, 0, s, s);
      const w = s * 0.62;
      [[0.3, 0.06, 0.45], [0.19, 0.17, 0.7], [0.08, 0.28, 1]].forEach(([x, y, a]) => {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = s / 14;
        ctx.drawImage(from, s * x, s * y, w, w);
        ctx.restore();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = line * 0.8;
        ctx.strokeRect(s * x, s * y, w, w);
      });
      break;
    }
    case 'save': {
      /* The photograph with the arrow that takes it out. */
      base(ctx, from, s);
      shade(ctx, s, 0.3);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = line * 1.3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(s / 2, s * 0.37);
      ctx.lineTo(s / 2, s * 0.6);
      ctx.moveTo(s * 0.41, s * 0.52);
      ctx.lineTo(s / 2, s * 0.61);
      ctx.lineTo(s * 0.59, s * 0.52);
      ctx.stroke();
      break;
    }
    default:
      ctx.restore();
      return false;
  }
  ctx.restore();
  return true;
}
