/**
 * The FutureBox app icon, drawn neon.
 *
 * Carli, 13 October 2026, with her home screen: *"Ek sal wil hê dit moet
 * neon wees sodat dit tussen ander apps uitstaan."* And, seeing a first
 * version that put a lit chip on a black tile: *"Ek dink weer eerder die
 * groen om die icon moet brighter en neon wees, en die swart lyne bly
 * swart … Nee net nie geel nie."* So: the tile is the brightest green the
 * page owns, lit from behind, and the chip on it is black. No yellow, no
 * dark tile.
 *
 * Rendered in the browser (the same way `brand-mark.mjs` renders the mark
 * for email), because a neon glow is a blur, and a blur is the one thing a
 * PNG written by hand cannot cheaply do. It replaces `icon.py`, which drew
 * the old tile with no library at all.
 *
 *     node scripts/icon.mjs
 *
 * Five files:
 *   public/icon-512.png            the icon, transparent corners ("any")
 *   public/icon-512-maskable.png   the same on a full dark square, the tile
 *                                  inside the 80% safe zone ("maskable")
 *   public/icon-192.png            the small one
 *   app/apple-icon.png             iOS ignores transparency, so the full square
 *   app/icon.png                   the favicon
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

/* The page's own neon: primary-500, secondary-400 and the page ground, as
   `globals.css` sets them. */
const MINT = '#05ff93';
const CYAN = '#47d2eb';

const glyph = `
  <rect width="16" height="16" x="4" y="4" rx="2"/>
  <rect width="6" height="6" x="9" y="9" rx="1"/>
  <path d="M15 2v2"/><path d="M15 20v2"/>
  <path d="M2 15h2"/><path d="M2 9h2"/>
  <path d="M20 15h2"/><path d="M20 9h2"/>
  <path d="M9 2v2"/><path d="M9 20v2"/>`;

/**
 * The tile, at `size` pixels. `filled` paints the whole square the page's
 * ground and shrinks the tile into the safe zone; otherwise the corners are
 * transparent and the tile fills the square but for the glow's room.
 */
/* Carli, 13 October 2026, shown the plain tile and the dark-ground one:
   "Die een" — the plain one. So the maskable file is the same green all the
   way to the edge, the chip inside the safe zone, and a launcher that cuts
   a circle cuts green, not a dark square. */
const page = (size, filled) => {
  const inset = filled ? 0 : size * 0.06;
  const tile = size - inset * 2;
  const radius = filled ? 0 : tile * 0.24;
  const glow = tile * 0.18;
  const chip = filled ? size * 0.5 : tile * 0.58;
  return `<!doctype html><html><body style="margin:0;background:transparent">
<div id="icon" style="position:relative;width:${size}px;height:${size}px;background:transparent">
  <div style="position:absolute;left:${inset}px;top:${inset}px;width:${tile}px;height:${tile}px;
       border-radius:${radius}px;
       background:linear-gradient(135deg,${CYAN} 0%,${MINT} 55%,#2bff9e 100%);
       box-shadow:${filled ? 'none' : `0 0 ${glow * 0.45}px rgba(5,255,147,0.9),0 0 ${glow}px rgba(5,255,147,0.45)`};
       display:flex;align-items:center;justify-content:center">
    <svg width="${chip}" height="${chip}" viewBox="0 0 24 24" fill="none"
         stroke="#06110c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${glyph}</svg>
  </div>
</div></body></html>`;
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const files = [
  ['public/icon-512.png', 512, false],
  ['public/icon-512-maskable.png', 512, true],
  ['public/icon-192.png', 192, false],
  ['app/apple-icon.png', 180, true],
  ['app/icon.png', 32, false],
];
for (const [path, size, filled] of files) {
  const tab = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await tab.setContent(page(size, filled));
  const shot = await tab.locator('#icon').screenshot({ omitBackground: !filled });
  writeFileSync(path, shot);
  console.log(`${path} — ${size}×${size}, ${shot.length} bytes`);
  await tab.close();
}
await browser.close();
