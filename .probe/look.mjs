import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:3111', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Start free' }).first().click();
await page.waitForTimeout(1500);
const names = await page.locator('button').evaluateAll((els) =>
  els.map((el) => (el.textContent || '').trim().slice(0, 40)).filter(Boolean));
console.log(JSON.stringify(names));
console.log((await page.locator('body').innerText()).slice(0, 600));
await browser.close();
