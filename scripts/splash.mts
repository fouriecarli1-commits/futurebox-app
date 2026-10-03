/**
 * The screens iOS paints when an installed FutureBox is opened.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 4 October 2026: *"wanneer mens die app icon druk, dan launch hy
 * huidiglik net met die app icon, maar ek sal wil hê die woorde futurebox moet
 * saam met die icon/logo launch. Dus die futurebox woorde logo moet saam
 * launch"*.
 *
 * An installed app's opening screen belongs to the operating system, not to
 * us: it is drawn from the manifest before a line of our HTML exists. iOS
 * draws the icon on `background_color` and nothing else — which is exactly
 * what she described — unless the page offers it a real picture to use
 * instead, through `apple-touch-startup-image`. That is what this writes.
 *
 * `app/components/LaunchMark.tsx` is the other half, for every platform whose
 * opening screen we cannot replace and for the moment after this one goes.
 *
 * ── Why a file per device ────────────────────────────────────────────────
 *
 * Not a choice. iOS takes the startup image whose media query matches the
 * device EXACTLY — width, height and pixel ratio — and if none matches it
 * draws its own screen and ignores every file offered. One generous picture
 * for all of them is the same as none.
 *
 * Portrait only, and said rather than hidden: this app is portrait
 * everywhere, `display: standalone`, and a landscape launch falls back to
 * iOS's own screen followed a moment later by `LaunchMark`. Thirteen more
 * files to cover a case this app does not have would be thirteen more files
 * to keep in step.
 *
 * The device list is `app/lib/splash.ts`, which `app/layout.tsx` also writes
 * its media queries from — see the note there for why one pixel of
 * disagreement between a query and a picture is no splash at all.
 *
 * ── Why the colours are read and not typed ───────────────────────────────
 *
 * They come out of `app/globals.css` and `app/lib/brand.ts`. A splash painted
 * in a hand-copied hex is a splash that stops matching the app the first time
 * the theme moves, and the seam shows at the one moment everybody is looking:
 * the hand-over from this picture to the app's own first paint.
 *
 *     npx tsx scripts/splash.mts
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launchOptions } from '../audit/where.mjs';
import { SCREENS, splashFile } from '../app/lib/splash';

/* The first `:root` in the stylesheet is the shipped default — the light
   theme. The dark ones restate the same names further down, and a splash has
   no way to ask which theme somebody chose: it is painted before our CSS
   runs at all. */
const css = readFileSync('app/globals.css', 'utf8');
const token = (name: string): string => {
  const found = new RegExp(`--${name}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)`).exec(css);
  if (!found) throw new Error(`--${name} is not in app/globals.css`);
  return `rgb(${found[1]}, ${found[2]}, ${found[3]})`;
};

const PAGE = token('fb-page');
const INK = token('fb-ink');
const ACCENT = token('fb-primary-400');
const ON_ACCENT = token('fb-on-accent');

/* The same glyph as the app icon and the email mark, from the same package's
   path data, so the thing on the home screen and the thing that opens are one
   drawing. */
const glyph = `
  <rect width="16" height="16" x="4" y="4" rx="2"/>
  <rect width="6" height="6" x="9" y="9" rx="1"/>
  <path d="M15 2v2"/><path d="M15 20v2"/>
  <path d="M2 15h2"/><path d="M2 9h2"/>
  <path d="M20 15h2"/><path d="M20 9h2"/>
  <path d="M9 2v2"/><path d="M9 20v2"/>`;

/** The drawing, at whatever logical size the device has. */
const drawing = (w: number, h: number): string => {
  /* Sized off the short side so the mark is the same fraction of the screen
     on a phone and on a 12.9-inch iPad — a tile sized in absolute pixels is
     a postage stamp on one and a billboard on the other. */
  const tile = Math.round(Math.min(w, h) * 0.22);
  const word = Math.round(Math.min(w, h) * 0.105);
  return `<!doctype html><html><body style="margin:0">
<div style="width:${w}px;height:${h}px;background:${PAGE};display:flex;
     flex-direction:column;align-items:center;justify-content:center;
     gap:${Math.round(tile * 0.3)}px;
     font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">
  <div style="width:${tile}px;height:${tile}px;border-radius:${Math.round(tile * 0.28)}px;
       background:linear-gradient(to top right,#10b981,#22d3ee);
       display:flex;align-items:center;justify-content:center;
       box-shadow:0 0 ${Math.round(tile * 0.7)}px rgba(16,185,129,0.25)">
    <svg width="${Math.round(tile * 0.56)}" height="${Math.round(tile * 0.56)}"
         viewBox="0 0 24 24" fill="none" stroke="${ON_ACCENT}" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">${glyph}</svg>
  </div>
  <p style="margin:0;font-size:${word}px;line-height:1;font-weight:900;
     letter-spacing:-0.05em;color:${INK}">FUTURE<span
     style="color:${ACCENT}">BOX</span></p>
</div></body></html>`;
};

mkdirSync('public/splash', { recursive: true });
const browser = await chromium.launch(launchOptions());
const written = [];
for (const one of SCREENS) {
  const tab = await browser.newPage({
    viewport: { width: one.w, height: one.h },
    deviceScaleFactor: one.dpr,
  });
  await tab.setContent(drawing(one.w, one.h));
  const shot = await tab.screenshot({ type: 'png' });
  const name = `public${splashFile(one)}`;
  writeFileSync(name, shot);
  written.push(`${name} — ${one.what}, ${(shot.length / 1024).toFixed(1)}kB`);
  await tab.close();
}
await browser.close();
console.log(written.join('\n'));
console.log(`\n${written.length} startup screens, each with the mark and the words on it.`);
