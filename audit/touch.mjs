/**
 * The same count, on a device that reports a coarse pointer.
 *
 * `globals.css` gives every button a 44-pixel minimum under
 * `@media (pointer: coarse)`. A desktop browser at a phone's width does not
 * match that query, so measuring there measures a rule that is not applied —
 * which would report a problem the phone does not have, or hide one it does.
 */
import { chromium, devices } from 'playwright';

const b = await chromium.launch(launchOptions());
const p = await b.newPage({ ...devices['iPhone 13'] });
p.on('response', (r) => { if (r.status() === 404) console.log('404 →', r.url()); });
await p.goto('http://localhost:3000', { waitUntil: 'networkidle' });
const cta = p.locator('button, a').filter({ hasText: /start free/i }).first();
await cta.waitFor({ state: 'visible', timeout: 40000 });
await cta.click();
await p.waitForTimeout(500);
await p.locator('input[type="email"]').first().fill('audit@futurebox.test');
const pw = p.locator('input[type="password"]').first();
if (await pw.count()) await pw.fill('audit-password-1234');
await p.locator('button[type="submit"]').first().click();
await p.waitForTimeout(3000);

const report = await p.evaluate(() => {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const small = [];
  for (const el of Array.from(document.querySelectorAll('button, [role="button"], a'))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && (r.height < 32 || r.width < 32)) {
      small.push(`${el.tagName.toLowerCase()} ${Math.round(r.width)}×${Math.round(r.height)} "${(el.textContent||'').trim().slice(0,24)}"`);
    }
  }
  return { coarse, width: document.documentElement.scrollWidth, total: small.length, small: small.slice(0, 14) };
});
console.log('pointer:coarse matches =', report.coarse);
console.log('page width =', report.width, '(viewport 390)');
console.log('small targets =', report.total);
console.log(report.small.join('\n'));
await b.close();
