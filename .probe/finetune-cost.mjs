import { chromium } from 'playwright';
const base = 'http://127.0.0.1:3111';
const problems = [];
const say = (ok, w) => { if (!ok) problems.push(w); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));

await page.route('**/api/finetunes**', (r) => r.fulfill({
  contentType: 'application/json',
  body: JSON.stringify({ configured: true, signedIn: true, keep: 3, mine: [] }),
}));
await page.route('**/api/credits', (r) => r.fulfill({
  contentType: 'application/json',
  body: JSON.stringify({ metered: true, signedIn: true, balance: 140, tier: 'studio', monthly: 350, cap: 1050, packs: [] }),
}));

await page.goto(`${base}/probe-sound2`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

const text = await page.locator('body').innerText();
// The price has to be visible before anybody starts, not at the refusal.
say(/300 credits each time/.test(text), `the panel does not state the cost up front: ${text.slice(0, 200)}`);
say(/you have 140/.test(text), 'it does not say what they have against it');

await page.getByRole('button', { name: 'Train a sound' }).click();
await page.waitForTimeout(300);
const button = await page.getByRole('button', { name: /^Train on/ }).innerText();
say(/300 credits/.test(button), `the button reads "${button}" — no cost on it`);

await page.screenshot({ path: '/tmp/claude-0/-home-user-Vibefy/f13dc240-dbf1-5b8e-b2ca-b7ec534319fd/scratchpad/finetune.png' });
await browser.close();
console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : 'all good');
process.exit(problems.length ? 1 : 0);
