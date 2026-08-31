/** The things a store reviewer or a crawler arrives and checks. */
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3111';
const problems = [];
const say = (ok, w) => { if (!ok) problems.push(w); };

// ── Reachable without a browser at all, which is how reviewers often come ──
for (const [path, must] of [['/robots.txt', /User-Agent/], ['/privacy', /Privacy/]]) {
  const r = await fetch(`${base}${path}`);
  const body = await r.text();
  say(r.ok, `${path} answered ${r.status}`);
  say(must.test(body), `${path} did not contain what it should`);
}

// ── The headers, on the page and on an API route ──────────────────────
for (const path of ['/', '/api/credits']) {
  const r = await fetch(`${base}${path}`);
  for (const h of ['content-security-policy', 'x-content-type-options', 'referrer-policy', 'x-frame-options']) {
    say(r.headers.get(h), `${path} is missing ${h}`);
  }
}

// ── Nothing that should not be served ─────────────────────────────────
for (const path of ['/.env', '/.env.local', '/.git/HEAD', '/next.config.mjs', '/package.json']) {
  const r = await fetch(`${base}${path}`);
  say(r.status === 404, `${path} answered ${r.status} instead of 404`);
}

// ── The API refuses an unauthenticated caller rather than answering ───
for (const path of ['/api/collab', '/api/subscription', '/api/finetunes']) {
  const r = await fetch(`${base}${path}`);
  const body = await r.text();
  say(!/"threads":\[\{|"mine":\[\{|owner/.test(body), `${path} returned somebody's data unauthenticated`);
}

// ── And the privacy link is on the landing page, as a link ────────────
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const link = page.locator('a[href="/privacy"]');
say(await link.count() > 0, 'no link to the privacy policy on the landing page');

// Following it must land on the real thing.
await link.first().click();
await page.waitForTimeout(900);
say(/\/privacy$/.test(page.url()), `the link went to ${page.url()}`);
say((await page.locator('body').innerText()).includes('Your card'), 'the privacy page did not render');
await browser.close();

console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : 'all good');
process.exit(problems.length ? 1 : 0);
