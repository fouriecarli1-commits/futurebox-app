/** A policy that breaks the app is worse than no policy. */
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3111';
const problems = [];
const say = (ok, w) => { if (!ok) problems.push(w); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

const blocked = [];
page.on('console', (m) => {
  const text = m.text();
  if (/Content Security Policy|Refused to/i.test(text)) blocked.push(text);
});
page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));

await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

// The page has to have actually rendered, not just returned bytes.
const text = await page.locator('body').innerText();
say(text.length > 200, `the page rendered only ${text.length} characters`);
say(/Put your voice in|Sit jou stem in/.test(text), 'the welcome page did not render its headline');

// Open the sign-in modal — inline handlers and dynamic styles run there.
await page.getByRole('button', { name: 'Start free' }).first().click();
await page.waitForTimeout(800);
say(await page.getByRole('button', { name: /Continue with Google/ }).count() > 0,
  'the sign-in modal did not render under the policy');

say(blocked.length === 0, `the policy blocked ${blocked.length}: ${blocked.slice(0, 3).join(' | ')}`);

await page.screenshot({ path: '/tmp/claude-0/-home-user-Vibefy/f13dc240-dbf1-5b8e-b2ca-b7ec534319fd/scratchpad/csp.png' });
await browser.close();
console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : 'all good — nothing refused');
process.exit(problems.length ? 1 : 0);
