import { chromium } from 'playwright';
const S = '/tmp/claude-0/-home-user-Vibefy/f13dc240-dbf1-5b8e-b2ca-b7ec534319fd/scratchpad';
const problems = [];
const say = (ok, w) => { if (!ok) problems.push(w); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
// Prices show in rand only in South Africa, so pretend to be there.
await page.addInitScript(() => {
  Object.defineProperty(Intl, 'DateTimeFormat', {
    value: class extends Intl.DateTimeFormat {
      resolvedOptions() { return { ...super.resolvedOptions(), timeZone: 'Africa/Johannesburg' }; }
    },
  });
});
await page.goto('http://127.0.0.1:3111', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

const text = await page.locator('#pricing').innerText();
for (const want of ['10 credits a month', '120 credits a month', '350 credits a month', '800 credits a month']) {
  say(text.includes(want), `the cards do not say "${want}"`);
}
say(!text.includes('899'), 'the old R899 is still on the page');
say(!/\b90 music videos\b|\b25 music videos\b/.test(text), 'an old video count is still on the page');

await page.locator('#pricing').screenshot({ path: `${S}/cards.png` });
await browser.close();
console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : 'all good');
process.exit(problems.length ? 1 : 0);
