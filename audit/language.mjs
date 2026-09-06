/**
 * The language choice reaches the account, and comes back on a second device.
 *
 * ── Why this is worth a browser run ──────────────────────────────────────
 *
 * Every renewal receipt went out in English whoever it was for, because the
 * choice lived in localStorage and a webhook months later has no browser. The
 * fix is one write to `user_metadata` — small, invisible, and exactly the kind
 * of thing that silently stops happening.
 *
 * Two halves, and the second is the one that proves it:
 *   • choosing Afrikaans writes it to the account
 *   • a browser that has never been here reads it back and opens in Afrikaans
 *
 * The second half is run in a fresh context with empty storage, which is what
 * "their laptop" actually is.
 */
import { chromium } from 'playwright';
import { launchOptions } from './where.mjs';

const PORT = process.argv[2] || '3018';
const b = await chromium.launch(launchOptions());
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${label}: ${ok}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};

const WHO = { id: '11111111-2222-3333-4444-555555555555', email: 'toets@futurebox.test' };
/** What the stubbed auth service is holding. The point of the whole run. */
let stored = {};
let writes = 0;

async function fresh() {
  const context = await b.newContext({ viewport: { width: 1280, height: 950 } });
  const p = await context.newPage();
  p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));

  await p.addInitScript((who) => {
    try {
      window.localStorage.setItem(
        'sb-stub-auth-token',
        JSON.stringify({
          access_token: 'stub-access-token',
          refresh_token: 'stub-refresh-token',
          token_type: 'bearer',
          expires_at: Math.floor(Date.now() / 1000) + 86400,
          expires_in: 86400,
          user: { id: who.id, email: who.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
        }),
      );
    } catch {}
  }, WHO);

  // The auth service, holding metadata across the two contexts the way a real
  // one does — which is the only reason the second half means anything.
  await p.route('**/auth/v1/**', async (route) => {
    const request = route.request();
    if (request.method() === 'PUT') {
      const body = JSON.parse(request.postData() || '{}');
      if (body.data) {
        stored = { ...stored, ...body.data };
        writes += 1;
      }
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: WHO.id, email: WHO.email, aud: 'authenticated', role: 'authenticated',
        app_metadata: {}, user_metadata: stored,
      }),
    });
  });
  await p.route('**/rest/v1/**', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await p.route('**/storage/v1/**', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  return { context, p };
}

// ── One: choosing Afrikaans writes it to the account ─────────────────────
{
  const { context, p } = await fresh();
  /* The compact toggle in the header, because a seeded session means the app
     comes up signed in and the landing page's picker is not on screen. */
  const toggle = p.locator('button').filter({ hasText: /^EN$/ }).first();
  await toggle.waitFor({ state: 'visible', timeout: 40000 });
  await toggle.click();
  await p.waitForTimeout(2500);

  check('the page is in Afrikaans', /af/i.test(await p.evaluate(() => document.documentElement.lang)));
  check('the choice was written to the account', stored.lang === 'af', JSON.stringify(stored));
  check('it was one write, not a loop', writes === 1, String(writes));
  await context.close();
}

// ── Two: a browser that has never been here reads it back ────────────────
{
  const before = writes;
  const { context, p } = await fresh();
  // Nothing in this context's storage but the session — no language at all.
  const localHas = await p.evaluate(() => window.localStorage.getItem('futurebox.lang.v1'));
  check('the new browser has no stored language of its own', localHas === null, String(localHas));
  /* And its session carries no language either.

     Seeded with empty metadata on purpose: a session issued before the choice
     was made is exactly the second device's situation, and it is why this has
     to be asked of the server rather than read out of the token. */
  const inSession = await p.evaluate(() => {
    try {
      return JSON.parse(window.localStorage.getItem('sb-stub-auth-token') || '{}')?.user?.user_metadata?.lang ?? null;
    } catch {
      return 'unreadable';
    }
  });
  check('and its session predates the choice, as a real one would', inSession === null, String(inSession));

  await p.waitForTimeout(2500);
  check('it opens in Afrikaans anyway, from the account',
    /AF/.test(await p.locator('header').innerText()) &&
      'af' === (await p.evaluate(() => document.documentElement.lang)),
    await p.evaluate(() => document.documentElement.lang));
  check('and reading it back did not write it again', writes === before, `${before} → ${writes}`);
  await context.close();
}

// ── Three: a choice made in a browser is never overruled by the account ──
{
  const { context, p } = await fresh();
  await p.evaluate(() => window.localStorage.setItem('futurebox.lang.v1', 'en'));
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  check('a browser that chose English stays English',
    'en' === (await p.evaluate(() => document.documentElement.lang)),
    await p.evaluate(() => document.documentElement.lang));
  await context.close();
}

console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
