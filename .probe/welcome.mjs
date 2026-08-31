import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3111';
const S = '/tmp/claude-0/-home-user-Vibefy/f13dc240-dbf1-5b8e-b2ca-b7ec534319fd/scratchpad';
const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

for (const [lang, tag] of [['en', 'en'], ['af', 'af']]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.on('pageerror', (error) => problems.push(`${lang} page error: ${error.message}`));
  await page.addInitScript((chosen) => window.localStorage.setItem('futurebox.lang.v1', chosen), lang);
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.screenshot({ path: `${S}/welcome-${tag}-top.png` });

  // Four plan cards, each with a price and a button.
  const cards = page.locator('#pricing').locator('> div > div');
  say(await cards.count() === 4, `${lang}: expected 4 plan cards, saw ${await cards.count()}`);

  // The free card must say one watermarked video a month.
  const free = await page.locator('#pricing').innerText();
  say(/watermark/i.test(free) || /watermerk/i.test(free), `${lang}: the free plan does not mention the watermark`);
  say(/video/i.test(free), `${lang}: no plan mentions videos`);

  // Google is offered before anything is typed.
  say(await page.getByRole('button', { name: /Google/ }).count() > 0, `${lang}: no Google button on the page`);

  await page.locator('#pricing').screenshot({ path: `${S}/welcome-${tag}-plans.png` });

  const wide = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth);
  say(!wide, `${lang}: the welcome page scrolls sideways`);
  await page.close();
}

// The sign-in modal offers Google too.
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
page.on('pageerror', (error) => problems.push(`modal page error: ${error.message}`));
await page.goto(base, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Start free' }).first().click();
await page.waitForTimeout(800);
say(await page.getByRole('button', { name: /Continue with Google/ }).count() > 0, 'no Google button in the sign-in modal');
await page.screenshot({ path: `${S}/welcome-modal.png` });
await page.close();

// And on a phone.
const phone = await browser.newPage({ viewport: { width: 390, height: 900 } });
await phone.goto(base, { waitUntil: 'networkidle' });
await phone.waitForTimeout(400);
const wide = await phone.evaluate(() =>
  document.documentElement.scrollWidth > document.documentElement.clientWidth);
say(!wide, 'the welcome page scrolls sideways on a phone');
await phone.screenshot({ path: `${S}/welcome-phone.png` });
await phone.close();

await browser.close();
console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : 'all good');
process.exit(problems.length ? 1 : 0);
