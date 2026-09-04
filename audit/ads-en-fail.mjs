/** What an Afrikaans reader is told when the ad writer refuses. */
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
await p.goto('http://localhost:3000', { waitUntil: 'networkidle' });

await p.waitForTimeout(900);
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
await room.locator('button').filter({ hasText: /^Adverts/ }).first().click();
await p.waitForTimeout(1500);

await room.locator('#ads-what').fill('n Bakkery in Bellville. Suurdeeg, ses dae oop.');
await p.waitForTimeout(400);
const before = await room.innerText();
const go = room.locator('button').filter({ hasText: /Write the adverts/ }).first();
console.log('write button enabled:', await go.isEnabled());
await go.click();
await p.waitForTimeout(2500);
const after = await room.innerText();
// The route answers 503 with an English sentence when no key is configured.
// Whatever appeared that was not there before pressing.
const beforeLines = new Set(before.split('\n'));
const fresh = after.split('\n').filter((l) => l.trim() && !beforeLines.has(l));
console.log('new on screen after pressing:');
for (const l of fresh.slice(0, 6)) console.log('   ', JSON.stringify(l.trim()));
const english = fresh.some((l) => /switched off|could not|Ad writing|is not|was rejected/i.test(l));
console.log('any English in it?', english);
await p.screenshot({ path: 'audit/ads-af-fail.png' });
await b.close();
