import { chromium, devices } from 'playwright';
import { launchOptions, shot } from './where.mjs';
const b = await chromium.launch(launchOptions());
const p = await b.newPage({ ...devices['iPhone 13'] });
await p.goto('http://localhost:3000', { waitUntil: 'networkidle' });
const cta = p.locator('button, a').filter({ hasText: /start free/i }).first();
await cta.waitFor({ state: 'visible', timeout: 40000 });
await cta.click();
await p.waitForTimeout(500);
await p.locator('input[type="email"]').first().fill('audit@futurebox.test');
const pw = p.locator('input[type="password"]').first();
if (await pw.count()) await pw.fill('audit-password-1234');
await p.locator('button[type="submit"]').first().click();
await p.waitForTimeout(2500);
await p.locator('header button').filter({ hasText: /Creator Studio|Studio/i }).first().click();
await p.waitForTimeout(1800);
const room = p.locator('div.fixed.inset-0.z-50').first();
for (const name of ['Adverts', 'Video desk']) {
  await room.locator('button').filter({ hasText: new RegExp(`^${name}`, 'i') }).first().click().catch(() => {});
  await p.waitForTimeout(1200);
  await p.screenshot({ path: shot(`phone-${name.replace(/\W+/g,'-').toLowerCase()}.png`) });
  console.log('shot', name, 'page width', await p.evaluate(() => document.documentElement.scrollWidth));
}
await b.close();
