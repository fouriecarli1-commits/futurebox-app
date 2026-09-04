/**
 * The app on the devices people actually hold.
 *
 * ── Why this exists next to `phone.mjs` and `touch.mjs` ──────────────────
 *
 * Those two check one thing each at one size. This is the sweep: a real device
 * profile for iOS, for Android and for a tablet, each with its own viewport,
 * pixel ratio, user agent and — the one that matters most — a coarse pointer,
 * because `globals.css` gives every control a 44-pixel minimum only under
 * `@media (pointer: coarse)`. Measuring that in a desktop browser narrowed to
 * a phone's width measures a rule that is not being applied.
 *
 * Three questions per device, and each of them is a real way an app fails on a
 * phone and nowhere else: does anything push the page sideways, is every
 * control big enough for a thumb, and does the way in — the sign-in — actually
 * open.
 */
import { chromium, devices } from 'playwright';

const PORT = process.argv[2] || '3000';
const WANTED = [
  ['iPhone 13', devices['iPhone 13']],
  ['iPhone SE', devices['iPhone SE']],
  ['Pixel 5', devices['Pixel 5']],
  ['Galaxy S9+', devices['Galaxy S9+']],
  ['iPad (gen 7)', devices['iPad (gen 7)']],
];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const problems = [];

for (const [name, device] of WANTED) {
  const p = await b.newPage({ ...device });
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e).slice(0, 80)));
  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1800);

  const coarse = await p.evaluate(() => window.matchMedia('(pointer: coarse)').matches);
  const width = p.viewportSize().width;
  const page = await p.evaluate(() => document.documentElement.scrollWidth);

  await p.locator('button').filter({ hasText: /^Start free$/ }).first().click().catch(() => undefined);
  await p.waitForTimeout(1500);
  const opens = (await p.locator('input[type="email"]').count()) === 1;

  /* Anything under 44 pixels either way. A strip that scrolls inside its own
     box is allowed to be wider than the screen; nothing is allowed to be
     smaller than a thumb. */
  const small = await p.evaluate(() => {
    const out = [];
    for (const el of Array.from(document.querySelectorAll('button, a, input, select'))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.width < 44 || r.height < 44) {
        const label = (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20);
        out.push(`${Math.round(r.width)}×${Math.round(r.height)} "${label}"`);
      }
    }
    return out;
  });

  const wide = page > width + 1;
  console.log(
    `${name.padEnd(13)} ${String(width).padStart(4)}px  ` +
    `coarse:${coarse ? 'yes' : 'NO '}  page:${page}${wide ? ' ← WIDER' : ''}  ` +
    `sign-in:${opens ? 'opens' : 'DOES NOT OPEN'}  small:${small.length}` +
    `${small.length ? ' → ' + small.slice(0, 3).join(', ') : ''}`,
  );
  if (wide) problems.push(`${name}: page is ${page} on a ${width} screen`);
  if (!opens) problems.push(`${name}: the sign-in does not open`);
  if (small.length) problems.push(`${name}: ${small.length} control(s) under 44px — ${small.slice(0, 3).join(', ')}`);
  if (errors.length) problems.push(`${name}: ${errors.join('; ')}`);
  await p.screenshot({ path: `audit/device-${name.replace(/[^a-z0-9]/gi, '')}.png` });
  await p.close();
}

console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
