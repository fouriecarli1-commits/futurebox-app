/**
 * The account screen, behind the press people were already making.
 *
 * ── What is being asked ──────────────────────────────────────────────────
 *
 * None of this is new machinery — the plan, the balance and the cancel button
 * all existed. What was wrong was where they were: three presses into a room
 * called Channel, under the playlists. So what is checked is findability and
 * nothing else: press your own name, and everything about the account is in
 * front of you.
 *
 * The balance is checked in its three separate states, because `wallet.ts`
 * keeps them apart on purpose — a request that never arrived used to look
 * exactly like a working free account, and a screen that collapses them back
 * together undoes that.
 *
 * Needs the stub build — see `audit/README.md`.
 */
import { chromium } from 'playwright';
import { launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3044';
const af = process.argv[3] === 'af';

const b = await chromium.launch(launchOptions());
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${label}: ${ok}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));
await p.addInitScript((l) => { try { window.localStorage.setItem('futurebox.lang.v1', l); } catch {} }, af ? 'af' : 'en');

const WHO = { id: '11111111-2222-3333-4444-555555555555', email: 'carli@futurebox.test' };
await p.addInitScript((who) => {
  try {
    window.localStorage.setItem('sb-stub-auth-token', JSON.stringify({
      access_token: 'stub-access-token', refresh_token: 'stub-refresh-token', token_type: 'bearer',
      expires_at: Math.floor(Date.now() / 1000) + 86400, expires_in: 86400,
      user: { id: who.id, email: who.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
    }));
  } catch {}
}, WHO);
await p.route('**/auth/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
  body: JSON.stringify({ id: WHO.id, email: WHO.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }) }));
await p.route('**/rest/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

// A wallet with something in it, and a plan behind it.
let creditsAnswer = { metered: true, signedIn: true, ready: true, balance: 87, monthly: 120, cap: 400, packs: [] };
await p.route('**/api/credits*', (r) =>
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(creditsAnswer) }));
await p.route('**/api/subscription*', (r) => r.fulfill({ status: 200, contentType: 'application/json',
  body: JSON.stringify({
    subscribed: true, tier: 'maker', name: 'Maker', status: 'active',
    nextPaymentAt: '2026-07-01T00:00:00.000Z', cancellable: true,
  }) }));

await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);

/* The press itself. Their own name in the corner — which is where somebody
   looks for their account, and which used to do nothing at all. */
const mine = p.locator('header button').filter({ hasText: /carli/i }).first();
check('their own name is a control in the header', (await mine.count()) > 0);
await mine.click();
await p.waitForTimeout(1200);

const panel = p.locator('[role="dialog"]').first();
check('pressing it opens the account', (await panel.count()) === 1, String(await panel.count()));
let words = await panel.innerText();

check('the address they signed up with is on it', /carli@futurebox\.test/.test(words),
  words.split('\n').slice(0, 6).join(' / '));
check('the plan is named', af ? /Jou plan/.test(words) : /Your plan/.test(words));
check('the balance is the one the server gave', /\b87\b/.test(words), words.match(/\b\d+\b/g)?.join(',') ?? 'none');
check('and what the plan pays in each month', /\b120\b/.test(words));
/* The panel calls it "Stop the monthly payment" rather than "cancel", which
   is better English and is what the button actually does. Matched on the
   heading above it as well, so a reworded button does not silently take the
   whole section out of this check. */
check('what they are paying, and the way to stop it, is on it',
  (af ? /Wat jy betaal/ : /What you are paying/).test(words) &&
  (af ? /Stop die maandelikse betaling/ : /Stop the monthly payment/).test(words),
  words.split('\n').filter((one) => /paying|betaal/i.test(one)).join(' / ') || 'neither found');
check('the way to a question is on it',
  af ? /Vraag|probleem/i.test(words) : /question|problem/i.test(words));
check('and so are the terms and the privacy notice',
  (await panel.locator('a[href="/terms"]').count()) === 1 &&
  (await panel.locator('a[href="/privacy"]').count()) === 1);

// Escape closes it, like every other overlay here.
await p.keyboard.press('Escape');
await p.waitForTimeout(700);
check('escape closes it', (await p.locator('[role="dialog"]').count()) === 0);

/* The three ways there is no number, which `wallet.ts` keeps apart and a
   screen must not collapse. A balance that failed to arrive showing as "0" is
   how somebody decides the app has lost their money. */
creditsAnswer = { metered: true, signedIn: true, ready: false, balance: 0, monthly: 0, cap: 0, packs: [] };
await p.route('**/api/credits*', (r) => r.abort());
await mine.click();
await p.waitForTimeout(1500);
words = await p.locator('[role="dialog"]').first().innerText();
check('a balance that could not be fetched says so rather than showing zero',
  af ? /kon nou nie gehaal word nie/.test(words) : /could not be fetched/.test(words),
  /\b0\b/.test(words) ? 'it showed a zero' : words.split('\n').slice(0, 8).join(' / '));

await p.screenshot({ path: shot(`account-${af ? 'af' : 'en'}.png`), fullPage: false });
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
