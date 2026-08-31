/** The competition surface has to be gone, and unreachable — not just hidden. */
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3111';
const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

// The payment path is the part that matters: it must refuse an entry outright.
for (const body of [
  { kind: 'entry', competitionId: 'anything' },
  { kind: 'entry', competitionId: 'c-1', amount: 100 },
]) {
  const response = await fetch(`${base}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  say(response.status >= 400, `checkout answered ${response.status} to a competition entry`);
  say(!/authorization_url|paystack\.com/i.test(text), 'checkout tried to start a payment for an entry');
}

// The old routes must be gone, not returning something.
for (const path of ['/api/arena', '/api/arena/claim']) {
  const response = await fetch(`${base}${path}`);
  say(response.status === 404, `${path} answered ${response.status}, not 404`);
}

// And nothing on the welcome page may promise a competition.
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const text = await page.locator('body').innerText();
for (const word of ['ompetition', 'Arena', 'ompetisie']) {
  say(!text.includes(word), `the welcome page still says "${word}"`);
}
await browser.close();

console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : 'all good');
process.exit(problems.length ? 1 : 0);
