/**
 * The video desk, with the engines answering exactly as the live app's do.
 *
 * The live deployment has Veo and Kling connected and Seedance switched off,
 * so `can.standard` is absent — which is the state that produced every one of
 * the complaints this run exists to check:
 *
 *   • lengths stuck at 5 and 10 whatever grade was chosen
 *   • two shapes, never the square, and no sizes on either
 *   • no picture attachment anywhere
 *   • "Pick for me" with nothing saying what it picks
 *
 * The probe is faked with the JSON `/api/video` really returns, so what is
 * under test is the desk rather than a mock of it.
 */
import { chromium } from 'playwright';

const PORT = process.argv[2] || '3012';
const af = process.argv[3] === 'af';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${label}: ${ok}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));
await p.addInitScript((l) => { try { window.localStorage.setItem('futurebox.lang.v1', l); } catch {} }, af ? 'af' : 'en');

// Exactly what the live app reports: no standard grade.
const LIVE = {
  available: true,
  auth: 'bearer',
  grades: ['better', 'premium'],
  can: {
    better: { seconds: [4, 6, 8], aspects: ['16:9', '9:16'], speaks: true, startFrame: false },
    premium: { seconds: [5, 10], aspects: ['16:9', '9:16', '1:1'], speaks: true, startFrame: true },
  },
  sound: true,
  startFrame: true,
};
await p.route('**/api/video*', async (route) => {
  if (route.request().method() === 'GET') {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LIVE) });
  }
  return route.fallback();
});

await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
const cta = p.locator('button, a').filter({ hasText: af ? /begin|gratis|teken/i : /start free|begin|sign up/i }).first();
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
await room.locator('button').filter({ hasText: /^Video desk|^Videolessenaar/i }).first().click();
await p.waitForTimeout(2200);

const words = await room.innerText();

// ── 1. It lands on a grade that exists ───────────────────────────────────
// Standard is not connected, so the lengths must be Better's 4/6/8 — not the
// hardcoded 5/10 that appeared whatever was chosen.
check('the lengths are the connected grade\'s, not a hardcoded pair',
  /\b4s\b/.test(words) && /\b6s\b/.test(words) && /\b8s\b/.test(words),
  words.match(/\d+s/g)?.join(',') || 'none');

// ── 2. The shapes carry their size ───────────────────────────────────────
check('the wide shape shows its size', /1920\s*×\s*1080/.test(words), '');
check('the tall shape shows its size', /1080\s*×\s*1920/.test(words), '');
check('where the shape goes is on screen, not in a tooltip',
  /YouTube|TikTok|Reels/.test(words));

// ── 3. Why the row stops where it stops ──────────────────────────────────
check('it says how long this grade goes, and where longer lives',
  af ? /Die langste op hierdie graad is/.test(words) : /The longest on this grade is/.test(words),
  words.slice(0, 0));

// ── 4. Pick for me explains itself before it is pressed ──────────────────
check('Pick for me says what it will choose',
  af ? /Lees wat jy geskryf het en kies/.test(words) : /Reads what you have written and chooses/.test(words));
check('and that it costs nothing',
  af ? /Dit kos niks/.test(words) : /It costs nothing/.test(words));

// ── 5. The picture attachment ────────────────────────────────────────────
check('the picture attachment is named',
  af ? /Begin by .n prent/i.test(words) : /Start from a picture/i.test(words));
check('it says what a picture is for',
  af ? /besleg die voorkoms/i.test(words) : /settles the look/i.test(words));
const toPremium = room.locator('button').filter({ hasText: af ? /^Skuif na/ : /^Switch to/ }).first();
check('there is a way through to the grade that reads it', (await toPremium.count()) > 0);

if (await toPremium.count()) {
  await toPremium.click();
  await p.waitForTimeout(1200);
  const after = await room.innerText();
  check('switching gets Premium\'s lengths', /\b5s\b/.test(after) && /\b10s\b/.test(after),
    after.match(/\d+s/g)?.join(',') || 'none');
  check('and Premium\'s square shape', /1080\s*×\s*1080/.test(after));
  check('and the actual file picker', (await room.locator('input[type="file"]').count()) > 0);
}

const wide = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
check('nothing overflows sideways', wide);

await p.screenshot({ path: `audit/videodesk-${af ? 'af' : 'en'}.png`, fullPage: true });
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
