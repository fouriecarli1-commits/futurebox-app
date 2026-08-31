import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3111';
const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

let balance = 12;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));

let sent = null;
await page.route('**/api/credits', (route) =>
  route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ metered: true, signedIn: true, balance, tier: 'free', monthly: 25, cap: 25,
      packs: [{ id: 'small', credits: 150, rand: 99 }, { id: 'mid', credits: 400, rand: 229 }, { id: 'large', credits: 1000, rand: 499 }] }),
  }));
await page.route('**/api/checkout', async (route) => {
  sent = JSON.parse(route.request().postData() ?? '{}');
  await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ url: `${base}/probe-credits?paid=1` }) });
});

const ref = new URL(process.env.PROBE_SUPABASE_URL ?? 'https://probe.supabase.co').hostname.split('.')[0];
await page.addInitScript(([key, expires]) => {
  window.localStorage.setItem(key, JSON.stringify({
    access_token: 'probe-token', token_type: 'bearer', expires_in: 3600,
    expires_at: expires, refresh_token: 'probe-refresh',
    user: { id: '00000000-0000-0000-0000-000000000001', email: 'probe@example.com' },
  }));
}, [`sb-${ref}-auth-token`, Math.floor(Date.now() / 1000) + 3600]);

await page.goto(`${base}/probe-credits`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// The balance shows, and reads low against a 25 monthly.
const chip = page.locator('button[title]').first();
say((await chip.innerText()).trim() === '12', `the chip read "${(await chip.innerText()).trim()}"`);
say(!(await chip.getAttribute('class'))?.includes('amber'), '12 of 25 was drawn as low, which it is not');

// Nothing about prices is visible before anything is short.
const before = await page.locator('body').innerText();
say(!before.includes('R99'), 'a pack price was visible before anything ran out');

// A route refuses; the panel opens and names the shortfall.
await page.click('#pretend-refused');
await page.waitForTimeout(400);
const open = await page.locator('body').innerText();
say(/short by\s*18/i.test(open.replace(/\s+/g, ' ')), `the panel did not say short by 18: ${open.slice(0, 200)}`);
say(open.includes('R99') && open.includes('R229') && open.includes('R499'), 'not all three packs were priced');

// The smallest pack that covers an 18-credit gap is the one drawn as the answer.
const cards = page.locator('button', { hasText: 'credits' });
const lead = await page.locator('button.border-emerald-500').first().innerText();
say(lead.includes('150'), `the recommended pack was "${lead.split('\n')[0]}", not the 150`);

// Buying posts the pack's name and nothing about its size or price.
await page.locator('button', { hasText: '150 credits' }).first().click();
await page.waitForTimeout(600);
say(sent?.kind === 'credits', `checkout got kind ${sent?.kind}`);
say(sent?.pack === 'small', `checkout got pack ${sent?.pack}`);
say(!('credits' in (sent ?? {})) && !('rand' in (sent ?? {})), 'the browser told the server the size or the price');

// A balance genuinely under 15% of the month must read as low.
balance = 3;
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const lowChip = page.locator('button[title]').first();
say((await lowChip.innerText()).trim() === '3', `the low chip read "${(await lowChip.innerText()).trim()}"`);
say((await lowChip.getAttribute('class'))?.includes('amber'), '3 of 25 was not drawn as low');

await browser.close();
console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : 'all good');
process.exit(problems.length ? 1 : 0);
