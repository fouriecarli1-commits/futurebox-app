/**
 * Nothing that does one job is on the screen twice.
 *
 * ── What was there ───────────────────────────────────────────────────────
 *
 * Two search controls, and not merely both present — overlapping, at every
 * width measured:
 *
 *     1440   the header's "Search ⌘K" 1295–1420, the corner circle 1384–1428
 *      390   the header's icon          334–378, the corner circle  338–382
 *
 * On a phone the header button collapses to just its icon, so what was on
 * the screen was the same little magnifying glass twice, four pixels apart.
 *
 * ── Why nothing saw it ───────────────────────────────────────────────────
 *
 * Every browser probe in this repo runs at 390 pixels, and at 390 the two
 * sit so exactly on top of each other that a screenshot shows one button.
 * `check:buttonlook` counts buttons and asks whether each looks like one —
 * both of these do. `audit/phone.mjs` asks whether the page spills sideways
 * — it does not. Nothing asked whether two of them were the same control.
 *
 * It was found by opening the app at 1440 and looking at it, which is the
 * width nothing had ever looked at.
 *
 * ── The rule ─────────────────────────────────────────────────────────────
 *
 * One control per job, per screen. Search is the one job named here because
 * it is the one that was wrong; the shape is meant to take more.
 *
 * Counted at four widths and in two places — the feed and the studio — since
 * the fault was that the studio drew its own on top of the global one. Both
 * places need exactly one: nought is a feature gone, two is this bug.
 */
import { enter, dismissDoor, studio } from './enter.mjs';
import { serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3187';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

/** Every visible control that opens the search, wherever it came from. */
const SEARCHES = () => {
  const out = [];
  for (const el of document.querySelectorAll('button')) {
    const said = `${el.innerText || ''} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
    /* By the icon as well as by the word, because the phone-width one has no
       word on it — which is exactly how two of them hid as one. */
    if (!/search|soek/.test(said) && !el.querySelector('svg.lucide-search')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    out.push({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
  }
  return out;
};

const WIDTHS = [
  { name: 'phone', width: 390, height: 844, touch: true },
  { name: 'tablet', width: 900, height: 800 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desk', width: 1440, height: 900 },
];

const server = await serve(PORT);
let browser = null;
try {
  for (const size of WIDTHS) {
    const opened = await enter({ at: server.url, width: size.width, height: size.height, touch: size.touch });
    browser = opened.browser;
    const page = opened.page;

    await dismissDoor(page);
    await page.waitForTimeout(900);
    const onFeed = await page.evaluate(SEARCHES);
    check(`${size.name} · one way to search on the feed`, onFeed.length === 1,
      `${onFeed.length}: ${onFeed.map((o) => `${o.x},${o.y} ${o.w}x${o.h}`).join(' · ')}`);

    await studio(page);
    await page.waitForTimeout(700);
    const inStudio = await page.evaluate(SEARCHES);
    check(`${size.name} · and one inside the studio`, inStudio.length === 1,
      `${inStudio.length}: ${inStudio.map((o) => `${o.x},${o.y} ${o.w}x${o.h}`).join(' · ')}`);

    if (size.name === 'desk') await page.screenshot({ path: shot('twice-desk.png') });
    await browser.close();
    browser = null;
  }
} finally {
  if (browser) await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:twice — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:twice — one way to search, at every width, on the feed and in the studio.');
