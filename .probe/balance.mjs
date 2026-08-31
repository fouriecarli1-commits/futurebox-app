import { chromium } from 'playwright';
const base = 'http://127.0.0.1:3111';
const problems = [];
const say = (ok, w) => { if (!ok) problems.push(w); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function look(name, fulfil) {
  const page = await browser.newPage({ viewport: { width: 400, height: 200 } });
  page.on('pageerror', (e) => problems.push(`${name}: page error ${e.message}`));
  await page.route('**/api/credits', fulfil);
  await page.goto(`${base}/probe-bal`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const text = (await page.locator('body').innerText()).trim();
  await page.close();
  return text;
}

const json = (body) => (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });

// A free account with credits must show them. This was the bug.
say(await look('free', json({ metered: true, signedIn: true, balance: 5, tier: 'free', monthly: 10, cap: 10, packs: [] })) === '5',
  'a free account with 5 credits showed nothing');

// Zero is a real number and must still show.
say(await look('zero', json({ metered: true, signedIn: true, balance: 0, tier: 'free', monthly: 10, cap: 10, packs: [] })) === '0',
  'a balance of zero showed nothing');

// A paid account.
say(await look('paid', json({ metered: true, signedIn: true, balance: 120, tier: 'maker', monthly: 120, cap: 360, packs: [] })) === '120',
  'a paid balance did not show');

// A broken endpoint must show a dash, not vanish — that is how this hid.
say(await look('broken', (r) => r.fulfill({ status: 500, body: 'boom' })) === '—',
  'a failing endpoint made the chip disappear instead of showing a dash');

// The migration has not been run: the server answers, but with no balance.
// A zero here would read as "you have used them up", which is the bug.
say(await look('unready', json({ metered: true, signedIn: true, ready: false, balance: 0, tier: 'free', monthly: 10, cap: 10, packs: [] })) === '—',
  'an unset-up credit system showed 0 instead of a dash');

// And a real zero, on a working system, still shows a zero.
say(await look('real zero', json({ metered: true, signedIn: true, ready: true, balance: 0, tier: 'free', monthly: 10, cap: 10, packs: [] })) === '0',
  'a genuine balance of zero did not show as zero');

// Signed out, and an app with no accounts, both show nothing. Correctly.
say(await look('out', json({ metered: true, signedIn: false, balance: 0, packs: [] })) === '',
  'a signed-out visitor was shown a balance');
say(await look('unmetered', json({ metered: false, balance: 0, packs: [] })) === '',
  'an app with no accounts showed a balance');

await browser.close();
console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : 'all good');
process.exit(problems.length ? 1 : 0);
