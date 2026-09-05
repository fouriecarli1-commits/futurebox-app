/**
 * The FutureBox mark, as a file an email client will draw.
 *
 * The app draws its mark live — a gradient tile with a lucide Cpu glyph on it,
 * beside "FUTURE" in the text colour and "BOX" in emerald. None of that
 * survives an email: there is no Tailwind, no gradient utility, and half the
 * clients that matter throw away a <svg> without a word.
 *
 * So the tile is rendered once, here, at twice its display size, and the
 * wordmark stays live text in the signature. That split is deliberate. Most
 * mail clients block remote images until the reader allows them, so a
 * signature that is entirely a picture is a signature that is usually blank —
 * the name has to be text. The tile is the one thing that cannot be.
 *
 * Rendered rather than drawn by hand so it is the same geometry as the app's:
 * the same glyph, from the same package, at the same corner radius.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

/** Twice the 32-pixel display size, for a retina screen. */
const SIZE = 128;

const glyph = `
  <rect width="16" height="16" x="4" y="4" rx="2"/>
  <rect width="6" height="6" x="9" y="9" rx="1"/>
  <path d="M15 2v2"/><path d="M15 20v2"/>
  <path d="M2 15h2"/><path d="M2 9h2"/>
  <path d="M20 15h2"/><path d="M20 9h2"/>
  <path d="M9 2v2"/><path d="M9 20v2"/>`;

const page = `<!doctype html><html><body style="margin:0;background:transparent">
<div style="width:${SIZE}px;height:${SIZE}px;border-radius:${SIZE * 0.28}px;
     background:linear-gradient(to top right,#10b981,#22d3ee);
     display:flex;align-items:center;justify-content:center">
  <svg width="${SIZE * 0.56}" height="${SIZE * 0.56}" viewBox="0 0 24 24" fill="none"
       stroke="#052e16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${glyph}</svg>
</div></body></html>`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const tab = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
await tab.setContent(page);
const shot = await tab.locator('div').first().screenshot({ omitBackground: true });
writeFileSync('public/brand/futurebox-mark.png', shot);
await browser.close();
console.log(`public/brand/futurebox-mark.png — ${SIZE}×${SIZE}, ${shot.length} bytes`);
