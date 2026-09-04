/** Switch to Afrikaans and check the rooms that were English-only. */
import { chromium } from 'playwright';
import { shot } from './where.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await p.locator('button').filter({ hasText: /^Afrikaans$/ }).first().click();
await p.waitForTimeout(800);
const cta = p.locator('button, a').filter({ hasText: /begin|gratis|teken/i }).first();
await cta.waitFor({ state: 'visible', timeout: 30000 });
await cta.click();
await p.waitForTimeout(600);
await p.locator('input[type="email"]').first().fill('audit@futurebox.test');
const pw = p.locator('input[type="password"]').first();
if (await pw.count()) await pw.fill('audit-password-1234');
await p.locator('button[type="submit"]').first().click();
await p.waitForTimeout(2200);
/* The welcome page lands on top of the header after a sign-in. Cleared the way
   a person clears it, or this run dies against a door. */
{
  const notNow = p.locator('button').filter({ hasText: /Not now|Nie nou nie/ }).first();
  if (await notNow.count()) {
    await notNow.click().catch(() => undefined);
    await p.waitForTimeout(800);
  }
}
await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
await p.waitForTimeout(1500);
const room = p.locator('div.fixed.inset-0.z-50').first();
for (const name of ['Advertensies', 'Adverts']) {
  const entry = room.locator('button').filter({ hasText: new RegExp(`^${name}`) });
  if (await entry.count()) { await entry.first().click(); break; }
}
await p.waitForTimeout(1400);
const text = await room.innerText();
console.log('advert desk in Afrikaans:', /Wat adverteer jy|Vir wie hierdie advertensies/.test(text));
console.log('brand kit in Afrikaans:', /Vir wie hierdie advertensies is/.test(text));
console.log('picture strip in Afrikaans:', /Voeg ’n prent by|Voeg nog ’n prent by/.test(text));
console.log('\nsample:', text.split('\n').filter(Boolean).slice(6, 18).join(' | ').slice(0, 500));
await p.screenshot({ path: shot('afrikaans.png') });
await b.close();
