// The two documents, and whether anybody can actually reach them.
//
//   PROBE=1 npm run build && npx next start -p 3111 &
//   node .probe/policies.mjs
//
// The point of this one is the reaching. An outside assessment found no way to
// get to a policy from the front door, and the policy existed the whole time.

import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3111';
const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

// ── Without JavaScript at all ──────────────────────────────────────────
// A crawler, a store reviewer and a screen reader all arrive like this.
const plain = await browser.newContext({ javaScriptEnabled: false });
for (const path of ['/terms', '/privacy']) {
  const page = await plain.newPage();
  const response = await page.goto(base + path, { waitUntil: 'domcontentloaded' });
  say(response.status() === 200, `${path} answered ${response.status()}`);

  const text = await page.locator('body').innerText();
  say(text.length > 2000, `${path} is only ${text.length} characters with JavaScript off`);
  await page.close();
}

// ── The words that have to be in them ──────────────────────────────────
const page = await plain.newPage();
await page.goto(base + '/terms', { waitUntil: 'domcontentloaded' });
const terms = (await page.locator('body').innerText()).toLowerCase();
for (const phrase of [
  'clone a voice that is not yours',
  'named person',
  'refused',
  'thirty days',
  'voice, your face or your name',
  '18 or older',
  'south african law',
]) {
  say(terms.includes(phrase), `the terms never say "${phrase}"`);
}

await page.goto(base + '/privacy', { waitUntil: 'domcontentloaded' });
const privacy = (await page.locator('body').innerText()).toLowerCase();
for (const phrase of ['refused', 'hashed', 'paystack', 'elevenlabs', 'delete']) {
  say(privacy.includes(phrase), `the privacy policy never says "${phrase}"`);
}
say(!privacy.includes('being built'), 'the privacy policy still promises a delete button as future work');

// ── Reachable from the front door, and from each other ─────────────────
for (const from of ['/', '/terms', '/privacy']) {
  await page.goto(base + from, { waitUntil: 'domcontentloaded' });
  for (const to of ['/terms', '/privacy']) {
    // Anywhere on the page for reachability — a document may well link to the
    // other one in its own text, and does.
    say(await page.locator(`a[href="${to}"]`).count() >= 1, `no link to ${to} from ${from}`);
    // In the footers, exactly once. Two would mean the site footer and a
    // page's own footer are both carrying it, which is what this replaced.
    const inFooters = await page.locator(`footer a[href="${to}"]`).count();
    say(inFooters === 1, `${inFooters} footer links to ${to} from ${from}`);
  }
}

// ── The badge the footer loads is allowed by the policy that guards it ──
await page.goto(base + '/terms', { waitUntil: 'domcontentloaded' });
const csp = (await (await fetch(base + '/terms')).headers.get('content-security-policy')) ?? '';
const badge = await page.locator('footer img').first().getAttribute('src').catch(() => null);
if (badge) {
  const origin = new URL(badge).origin;
  say(csp.includes(origin), `the footer loads ${origin} and the CSP does not allow it`);
}
say(csp.includes("frame-ancestors 'none'"), 'the CSP no longer refuses framing');

await browser.close();
console.log(problems.length ? `FAIL\n  ${problems.join('\n  ')}` : 'PASS — both documents render, read and are reachable');
process.exit(problems.length ? 1 : 0);
