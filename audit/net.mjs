import { chromium } from 'playwright';
import { launchOptions } from './where.mjs';
const b = await chromium.launch(launchOptions());
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('response', async (r) => {
  if (r.status() >= 400) console.log(r.status(), r.request().resourceType(), r.url().slice(0, 120));
});
p.on('requestfailed', (r) => console.log('FAILED', r.request?.().resourceType?.() ?? '', r.url().slice(0,120), r.failure()?.errorText));
await p.goto('http://localhost:3000', { waitUntil: 'networkidle' });
// Sign in, so the studio's own requests are seen too.
const cta = p.locator('button, a').filter({ hasText: /start free/i }).first();
await cta.waitFor({ state: 'visible', timeout: 30000 });
await cta.click();
await p.waitForTimeout(500);
await p.locator('input[type="email"]').first().fill('audit@futurebox.test');
const pw = p.locator('input[type="password"]').first();
if (await pw.count()) await pw.fill('audit-password-1234');
await p.locator('button[type="submit"]').first().click();
await p.waitForTimeout(4000);
await b.close();
