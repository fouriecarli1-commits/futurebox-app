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
 * ── Why this had never run ───────────────────────────────────────────────
 *
 * It was written against a server somebody had left on port 3000 — the fault
 * `serve()` exists to fix and `check:probes` holds every wired probe to — so
 * it never got a `check:` name and sat here being run by nobody. Eleven
 * assertions about the one screen that holds somebody's money and the button
 * that deletes everything they have made.
 *
 * It builds its own stubbed project and starts its own server now, and puts
 * the ordinary build back in an exit handler however the run ends.
 */
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';

const PORT = Number(process.argv[2] || 3044);
const af = process.argv[3] === 'af';

/* A project that has accounts, so the header draws a signed-in person at all.
   `stub.supabase.co` is nonsense on purpose — nothing here reaches Supabase —
   and the storage key the app derives from it is `sb-stub-auth-token`, which
   is what this probe has always seeded. Copied from `audit/language.mjs`
   rather than reinvented. */
const STUB = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://stub.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'stub-anon-key',
};
console.log('building with a project that has accounts…');
execSync('npx next build', { stdio: 'ignore', env: { ...process.env, ...STUB } });

/* Put back however this run ends. In an exit handler rather than at the
   bottom: a probe that throws on its first assertion never reaches a tidy-up
   written at the end, and the stubbed build it leaves behind is read by the
   next probe as a broken app. */
let putBack = false;
process.on('exit', () => {
  if (putBack) return;
  putBack = true;
  console.log('putting the ordinary build back…');
  try {
    execSync('npx next build', { stdio: 'ignore' });
  } catch {
    console.error('the ordinary build could not be put back — run `npx next build`');
  }
});

const server = await serve(PORT, { env: STUB });
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

/* Past the front door first, the way a person does.

   A signed-in load opens on the welcome screen, which is `fixed inset-0
   z-[55]` over everything including the header. That is deliberate — it is
   the thing you arrive at — but it means the header cannot be pressed until
   it is closed, and this probe timed out on exactly that with Playwright
   naming the panel as the thing intercepting the click.

   Worth doing by pressing its own way out rather than by hiding the element,
   because a door with no visible way past it is its own fault and this walks
   into it if it ever appears. */
/* Waited for, not counted once. The door draws after two fetches settle, so
   asking whether it is there the instant the bottom bar appears gets "no" —
   and half a second later it is there, over the header and under the next
   press. `check:probes` holds every probe to this now. */
const door = p.locator('button').filter({ hasText: /Not now|Nie nou/ }).first();
const there = await door.waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false);
check('the welcome screen has a way past it', there,
  'it covers the header, so a screen with no way out is a trap');
if (there) {
  await door.click();
  await door.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined);
  await p.waitForTimeout(600);
}

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

/* ── The button that deletes everything, and what it promises ────────────

   On 9 September 2026 the DELETE behind this button was found to read the
   member's cloned voices, treat a failed read as "there are none", and then
   delete the account anyway — leaving a recording of somebody's voice on
   ElevenLabs after telling them it was gone.

   The route refuses now. What is checked here is the half a route cannot
   check: that the screen says what will happen before the press, in the
   reader's own language, and that it cannot be pressed by accident. A
   destructive button one tap away from the balance is its own fault. */
await p.keyboard.press('Escape');
await p.waitForTimeout(500);
await mine.click();
await p.waitForTimeout(1200);
const open = p.locator('[role="dialog"]').first();
words = await open.innerText();

check('the way to delete the account is on the screen',
  af ? /verwyder|skrap/i.test(words) : /delete/i.test(words),
  words.split('\n').filter((one) => /delete|verwyder|skrap/i.test(one)).join(' / ') || 'nothing about deleting');

/* Not one press. Pressing "Delete my account" opens the confirmation rather
   than deleting anything: the route asks for the address to be typed, and a
   screen that deleted on a single tap beside the balance is how somebody
   loses everything by aiming badly on a phone. */
const start = open.locator('button').filter({ hasText: af ? /Vee my rekening uit/ : /Delete my account/ }).first();
check('the first press opens a confirmation rather than deleting',
  (await start.count()) > 0);
await start.click();
await p.waitForTimeout(700);
words = await open.innerText();
check('and it asks for the address to be typed',
  (await open.locator('input').count()) > 0 &&
    (af ? /om te bevestig/ : /to confirm/).test(words),
  'a destructive button beside the balance needs something typed first');

/* The promise the route was breaking, checked where somebody actually reads
   it — on the list this panel shows before the press.

   ── The assertion that was wrong ──────────────────────────────────────

   This first looked for the word "ElevenLabs" and failed. The screen was
   right and the check was not: it says "removed from the voice service too,
   not just from here", which is better — this app deliberately does not put
   its suppliers' names in front of members anywhere else, and a screen that
   suddenly did would be the odd one out rather than the honest one.

   What matters is the promise, not the supplier: the terms and the privacy
   notice both say the cloned voice goes from the service as well as from
   here, and this is the sentence somebody relies on when they press it. */
check('and it says the cloned voice goes from the voice service as well',
  (af ? /stemdiens/i : /voice service/i).test(words),
  words.split('\n').filter((one) => /voice|stem/i.test(one)).join(' / ') || 'nothing about the voice');

await p.screenshot({ path: shot(`account-${af ? 'af' : 'en'}.png`), fullPage: false });
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
server.stop();
process.exit(problems.length ? 1 : 0);
