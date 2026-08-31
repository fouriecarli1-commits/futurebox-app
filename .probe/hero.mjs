import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3111';
const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

for (const [lang, out] of [['en', 'hero-en.png'], ['af', 'hero-af.png']]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  await page.route('**/api/here**', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ here: 37 }) }));
  await page.addInitScript((chosen) => {
    window.localStorage.setItem('futurebox.lang', chosen);
    window.localStorage.setItem('futurebox.lang.v1', chosen);
  }, lang);
  await page.goto(`${base}/probe-hero`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const section = page.locator('section').first();
  say(await section.count() > 0, `${lang}: no hero section`);
  await section.screenshot({ path: `/tmp/claude-0/-home-user-Vibefy/f13dc240-dbf1-5b8e-b2ca-b7ec534319fd/scratchpad/${out}` });

  // Nothing may run off the side of the page.
  const wide = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth);
  say(!wide, `${lang}: the hero scrolls sideways`);
  await page.close();
}

// And on a phone.
const phone = await browser.newPage({ viewport: { width: 390, height: 900 } });
await phone.route('**/api/here**', (route) =>
  route.fulfill({ contentType: 'application/json', body: JSON.stringify({ here: 37 }) }));
await phone.goto(`${base}/probe-hero`, { waitUntil: 'networkidle' });
await phone.waitForTimeout(400);
const wide = await phone.evaluate(() =>
  document.documentElement.scrollWidth > document.documentElement.clientWidth);
say(!wide, 'the hero scrolls sideways on a phone');
await phone.locator('section').first().screenshot({
  path: '/tmp/claude-0/-home-user-Vibefy/f13dc240-dbf1-5b8e-b2ca-b7ec534319fd/scratchpad/hero-phone.png',
});
await phone.close();

await browser.close();
console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : 'all good');
process.exit(problems.length ? 1 : 0);
