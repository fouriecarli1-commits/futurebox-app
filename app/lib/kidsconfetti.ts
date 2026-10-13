/**
 * A burst of confetti over the kids room, drawn by hand.
 *
 * Google's page pulled a confetti library off a CDN for this. Here it is
 * sixty lines and no dependency: a canvas laid over the window, a hundred
 * and twenty bits of paper thrown upward, gravity, and the canvas removed
 * when the last one has fallen off the bottom. Nothing is left in the page
 * afterwards, and anybody who has asked for less motion gets none.
 */

const COLOURS = ['#34d399', '#fde047', '#a7f3d0', '#f472b6', '#60a5fa', '#fb923c'];

interface Bit {
  x: number; y: number; vx: number; vy: number;
  w: number; h: number; spin: number; turn: number; colour: string;
}

let running: HTMLCanvasElement | null = null;

export function confetti(count = 120): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  if (running) running.remove();
  const canvas = document.createElement('canvas');
  canvas.setAttribute('data-kidsconfetti', '');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:60;';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  running = canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); running = null; return; }

  const bits: Bit[] = Array.from({ length: count }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.3,
    y: canvas.height * 0.65,
    vx: (Math.random() - 0.5) * 16,
    vy: -(8 + Math.random() * 14),
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    spin: Math.random() * Math.PI,
    turn: (Math.random() - 0.5) * 0.3,
    colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
  }));

  const draw = (): void => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    for (const bit of bits) {
      bit.vy += 0.35;
      bit.vx *= 0.99;
      bit.x += bit.vx;
      bit.y += bit.vy;
      bit.spin += bit.turn;
      if (bit.y < canvas.height + 20) alive += 1;
      ctx.save();
      ctx.translate(bit.x, bit.y);
      ctx.rotate(bit.spin);
      ctx.fillStyle = bit.colour;
      ctx.fillRect(-bit.w / 2, -bit.h / 2, bit.w, bit.h);
      ctx.restore();
    }
    if (alive > 0 && running === canvas) {
      requestAnimationFrame(draw);
    } else {
      canvas.remove();
      if (running === canvas) running = null;
    }
  };
  requestAnimationFrame(draw);
}
