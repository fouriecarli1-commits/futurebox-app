/** The cancel panel, with a live subscription pretended in. */
import { chromium } from 'playwright';
import { shot } from './where.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const problems = [];
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));

const PORT = process.argv[2] || '3002';
const af = process.argv[3] === 'af';

await p.route('**/api/subscription*', async (route) => {
  if (route.request().method() === 'GET') {
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        subscribed: true, tier: 'studio', name: 'Studio', status: 'active',
        nextPaymentAt: '2026-10-04T00:00:00Z', cancellable: true,
      }),
    });
  }
  // The cancel. Record the language it asked for — that decides the letter.
  console.log('DELETE asked for lang=', new URL(route.request().url()).searchParams.get('lang'));
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ stopped: true }) });
});

await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
if (af) { await p.locator('button').filter({ hasText: /^Afrikaans$/ }).first().click(); await p.waitForTimeout(800); }
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
await room.locator('button').filter({ hasText: af ? /^Kanaal/ : /^Channel/ }).first().click();
await p.waitForTimeout(1500);

/* Each line is an assertion, not a print.

   The first Afrikaans run printed `cancel button present: false` and then
   `problems: none`, because only page errors counted as problems. A false
   under a green summary is how a missing translation gets read as a pass —
   the eleven `sub.*` keys were English fallbacks and the run said fine. */
const check = (label, ok) => {
  console.log(`${label}: ${ok}`);
  if (!ok) problems.push(label);
};

let text = await room.innerText();
check('panel shows the plan', /Studio/.test(text));
check('shows the next payment date', /2026|10\/|\/10/.test(text));
const stop = room.locator('button').filter({ hasText: af ? /Stop die maandelikse/ : /Stop the monthly/ }).first();
const hasStop = (await stop.count()) > 0;
check('cancel button present', hasStop);
if (hasStop) {
  await stop.click();
  await p.waitForTimeout(500);
  text = await room.innerText();
  check('confirmation explains the paid month is kept',
    af ? /nie afgesny|reeds betaal/.test(text) : /not cut short|already paid/.test(text));
  check('no parting offer in it', !/discount|korting|% off/i.test(text));
  await room.locator('button').filter({ hasText: af ? /^Ja, stop dit/ : /^Yes, stop it/ }).first().click();
  await p.waitForTimeout(1200);
  text = await room.innerText();
  check('confirms it stopped', af ? /Gestop/.test(text) : /Stopped/.test(text));
}
await p.screenshot({ path: shot(`subscription-${af ? 'af' : 'en'}.png`) });
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
