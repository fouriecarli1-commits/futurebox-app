/**
 * The FutureBox app icon, drawn neon.
 *
 * Carli, 13 October 2026, with her home screen: *"Huidiglik lyk die icon
 * so. Ek sal wil hê dit moet neon wees sodat dit tussen ander apps
 * uitstaan."* The icon was a flat teal tile with a black chip on it — the
 * look of the page in September. The page has since gone green-black with a
 * neon mint, and the header's tile is a black square inside a glowing
 * gradient ring with a lit chip on it. This is that tile, so the thing on
 * the home screen and the thing that opens are one picture.
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
const GROUND = '#080c0a';

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
const page = (size, filled) => {
  const inset = filled ? size * 0.14 : size * 0.05;
  const tile = size - inset * 2;
  const ring = Math.max(2, Math.round(tile * 0.055));
  const radius = tile * 0.24;
  const glow = tile * 0.16;
  return `<!doctype html><html><body style="margin:0;background:${filled ? GROUND : 'transparent'}">
<div id="icon" style="position:relative;width:${size}px;height:${size}px;background:${filled ? GROUND : 'transparent'}">
  <div style="position:absolute;left:${inset}px;top:${inset}px;width:${tile}px;height:${tile}px;
       border-radius:${radius}px;padding:${ring}px;box-sizing:border-box;
       background:linear-gradient(135deg,${MINT},${CYAN});
       box-shadow:0 0 ${glow * 0.5}px rgba(5,255,147,0.75),0 0 ${glow}px rgba(5,255,147,0.35)">
    <div style="width:100%;height:100%;border-radius:${radius - ring}px;
         background:radial-gradient(circle at 50% 38%,#0f3324 0%,${GROUND} 72%);
         display:flex;align-items:center;justify-content:center">
      <svg width="${tile * 0.56}" height="${tile * 0.56}" viewBox="0 0 24 24" fill="none"
           stroke="${MINT}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"
           style="filter:drop-shadow(0 0 ${tile * 0.02}px ${MINT}) drop-shadow(0 0 ${tile * 0.06}px rgba(5,255,147,0.7))">${glyph}</svg>
    </div>
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
