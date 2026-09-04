/**
 * The play buttons are visible in a light theme.
 *
 * They were not. `tailwind.config.js` remaps `white` to `--fb-ink` so that
 * `text-white` follows the theme, which is right for text and a trap for a
 * fill: on the default light preset `bg-white` paints near-black. Four play
 * buttons were `bg-white text-onAccent` — a black disc with a black glyph on
 * it, which is what somebody saw on their screen and reported as "black dots".
 *
 * `check:theme` now refuses `bg-white` outright, and that check reads source.
 * This one reads pixels: the disc and the glyph on it, in the theme where it
 * went wrong, measured as a contrast ratio the way every other colour in this
 * app is measured.
 */
import { chromium } from 'playwright';

const PORT = process.argv[2] || '3024';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${label}: ${ok}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));

const WORDS = '[Verse]\nDie pad is lank vanaand\n[Chorus]\nHou vas, hou vas\n';
await p.addInitScript((words) => {
  try {
    // The light preset, which is also this app's default.
    window.localStorage.setItem('futurebox.theme.v1', JSON.stringify({ preset: 'clean' }));
    window.localStorage.setItem('futurebox.tracks.v1', JSON.stringify([{
      id: 'song-1', title: 'Toetsliedjie', genre: 'Afrikaans', bpm: 96, key: 'Am',
      lyrics: words, style: 'warm', models: [], source: 'engine', seconds: 60,
      createdAt: new Date().toISOString(), seed: 1,
    }]));
  } catch {}
}, WORDS);

await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
await cta.waitFor({ state: 'visible', timeout: 40000 });
await cta.click();
await p.waitForTimeout(700);
await p.locator('input[type="email"]').first().fill('toets@futurebox.test');
const pw = p.locator('input[type="password"]').first();
if (await pw.count()) await pw.fill('toets-wagwoord-1234');
await p.locator('button[type="submit"]').first().click();
await p.waitForTimeout(2500);
await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
await p.waitForTimeout(1800);
const room = p.locator('div.fixed.inset-0.z-50').first();

check('the light preset is on', 'paper' === await p.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--fb-surface-name')?.trim() || 'paper'));

/** The disc's fill against the glyph drawn on it. */
const measured = await p.evaluate(() => {
  const lum = (c) => {
    const [r, g, b] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (s) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const out = [];
  for (const el of document.querySelectorAll('button')) {
    const style = getComputedStyle(el);
    if (!/rounded|9999px/.test(style.borderRadius) && parseFloat(style.borderRadius) < 20) continue;
    const box = el.getBoundingClientRect();
    if (box.width < 36 || box.width > 60 || Math.abs(box.width - box.height) > 4) continue;
    if (!el.querySelector('svg')) continue;
    const fill = parse(style.backgroundColor);
    const glyph = parse(getComputedStyle(el.querySelector('svg')).color);
    if (fill.length < 3 || glyph.length < 3) continue;
    const a = lum(fill), bb = lum(glyph);
    out.push({
      fill: style.backgroundColor,
      glyph: getComputedStyle(el.querySelector('svg')).color,
      ratio: Math.round(((Math.max(a, bb) + 0.05) / (Math.min(a, bb) + 0.05)) * 100) / 100,
    });
  }
  return out;
});

check('round play buttons were found to measure', measured.length > 0, String(measured.length));
for (const one of measured) {
  check(`a play button's icon shows on its disc (${one.ratio}:1)`, one.ratio >= 4.5,
    `${one.fill} under ${one.glyph}`);
}
check('and none of them is a black disc',
  measured.every((one) => !/rgb\(1?\d?\d, 1?\d?\d, 1?\d?\d\)/.test(one.fill) || one.ratio >= 4.5),
  measured.map((o) => o.fill).join(' | '));

await p.screenshot({ path: 'audit/playbutton-light.png', fullPage: true });
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
