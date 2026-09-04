/**
 * The two backgrounds, side by side, out of the shipped stitcher.
 *
 * `audit/stitch.mjs` measures the blur in numbers, which is what a check
 * should do. This makes the picture those numbers describe: the same wide clip
 * cut into the same tall film twice, once with black bars and once with the
 * blurred sides, and a frame lifted out of each.
 *
 * Nothing here is drawn by this file. Both frames come out of `stitch()` by
 * way of `MediaRecorder`, so what is shown is a frame of a real exported film.
 *
 *   npx esbuild app/lib/stitch.ts --bundle --format=iife --global-name=ST \
 *     --outfile=/tmp/stitch.bundle.js
 *   node audit/blurshot.mjs /tmp/stitch.bundle.js audit/blur.png
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BUNDLE = process.argv[2] || '/tmp/stitch.bundle.js';
const OUT = process.argv[3] || 'audit/blur.png';

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const p = await b.newPage();
await p.goto('about:blank');
await p.addScriptTag({ content: readFileSync(BUNDLE, 'utf8') });

const dataUrl = await p.evaluate(async () => {
  /* A wide clip with something in it worth blurring: a sky, a horizon, a sun
     and a dark band of hills. A flat colour would blur to the same flat
     colour and show nothing. */
  async function clip(seconds, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const c = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    const type = ['video/webm;codecs=vp8', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, { mimeType: type });
    const parts = [];
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    const stopped = new Promise((r) => { rec.onstop = r; });
    rec.start();
    const began = performance.now();
    await new Promise((finish) => {
      const draw = () => {
        const t = (performance.now() - began) / 1000;
        const sky = c.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, '#0b2545'); sky.addColorStop(0.6, '#c96f3c'); sky.addColorStop(1, '#f2c14e');
        c.fillStyle = sky; c.fillRect(0, 0, width, height);
        c.fillStyle = '#ffe8a3';
        c.beginPath(); c.arc(width * 0.7, height * 0.55, height * 0.14, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#12232e';
        c.beginPath(); c.moveTo(0, height);
        for (let x = 0; x <= width; x += 20) c.lineTo(x, height * 0.72 + Math.sin(x / 90) * height * 0.08);
        c.lineTo(width, height); c.fill();
        c.fillStyle = '#ffffff';
        c.fillRect(width * 0.08 + t * 30, height * 0.2, 46, 10);
        if (t >= seconds) { finish(); return; }
        requestAnimationFrame(draw);
      };
      draw();
    });
    rec.stop();
    await stopped;
    return new Blob(parts, { type });
  }

  const W = 200, H = 356; // a tall film
  const source = await clip(2, 356, 200); // a wide shot going into it

  async function frameOf(background) {
    const film = await window.ST.stitch({ scenes: [{ clip: source }], width: W, height: H, background });
    const v = document.createElement('video');
    v.src = URL.createObjectURL(film.blob);
    v.muted = true;
    await new Promise((r) => { v.onloadedmetadata = r; v.onerror = r; });
    v.currentTime = 1.0;
    await new Promise((r) => { v.onseeked = r; setTimeout(r, 1500); });
    return v;
  }

  const black = await frameOf('black');
  const blurred = await frameOf('blur');

  const sheet = document.createElement('canvas');
  const pad = 16, gap = 20, head = 30;
  sheet.width = pad * 2 + W * 2 + gap;
  sheet.height = pad * 2 + head + H;
  const g = sheet.getContext('2d');
  g.fillStyle = '#09090b'; g.fillRect(0, 0, sheet.width, sheet.height);
  g.fillStyle = '#a1a1aa';
  g.font = '600 14px system-ui, sans-serif';
  g.fillText('Black bars', pad, pad + 18);
  g.fillText('Blur the sides', pad + W + gap, pad + 18);
  g.drawImage(black, pad, pad + head, W, H);
  g.drawImage(blurred, pad + W + gap, pad + head, W, H);
  return sheet.toDataURL('image/png');
});

writeFileSync(OUT, Buffer.from(dataUrl.split(',')[1], 'base64'));
console.log(`wrote ${OUT}`);
await b.close();
