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
import { execSync } from 'node:child_process';
import { dismissDoor } from './enter.mjs';
import { launchOptions, serve } from './where.mjs';

/* Its own server, on its own port.
 
   This probe sat unrun for months in `check:everycheck`'s waiting list, along
   with seven others, for one reason: it was written against a server somebody
   had left running on port 3000. A probe that needs a server it did not start
   is a probe that passes when the port happens to be right and lies the rest
   of the time — the same shape as every "check that stopped checking" this
   codebase keeps finding.
 
   Brought back because the thing it guards broke twice in front of Carli, in
   both directions, and both times the code was reasoned about rather than
   run. */
const PORT = process.argv[2] || '3018';

/* ── The build this needs, and why it makes one ──────────────────────────
 
   This is a signed-in screen, and there is no signing in without
   `NEXT_PUBLIC_SUPABASE_URL`: `cloud.configured()` is false, the app never
   leaves the landing page, and every assertion below is about a screen that
   was never reached. That variable is inlined at build time, so an environment
   handed to `next start` changes nothing — this probe cannot borrow anybody
   else's build.
 
   Which is the *other* half of why this sat in the waiting list. It was not
   only missing its own server; it was reading the ordinary build, on which it
   can never pass. Run cold it reported four failures that were all one thing.
 
   `stub.supabase.co` is nonsense on purpose — nothing here reaches Supabase,
   every call is answered by `page.route` below — and the storage key the app
   derives from it is `sb-stub-auth-token`, which is exactly what this probe
   has always seeded. The pattern is `audit/greeting.mjs`'s, copied rather than
   reinvented. */
const STUB = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://stub.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'stub-anon-key',
};
console.log('building with a project that has accounts…');
execSync('npx next build', { stdio: 'ignore', env: { ...process.env, ...STUB } });

/* Put back however this run ends. In an exit handler rather than at the
   bottom: a probe that throws on its first assertion never reaches a tidy-up
   written at the end, and the stubbed build it leaves behind is read by the
   next probe as a broken app — in a different file, with nothing pointing
   back here. */
let putBack = false;
const restore = () => {
  if (putBack) return;
  putBack = true;
  console.log('putting the ordinary build back…');
  try {
    execSync('npx next build', { stdio: 'ignore' });
  } catch {
    console.error('the ordinary build could not be put back — run `npx next build`');
  }
};
process.on('exit', restore);

const server = await serve(PORT, { env: STUB });
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
      /* What this browser had before the app could write anything.

         Read here rather than after the page settles, because the app's own
         mount effect asks the account and — correctly — stores the answer. By
         the time `networkidle` has passed, "nothing stored" has become "af",
         and the assertion that was meant to describe the browser was
         describing the fix instead. */
      window.__before = window.localStorage.getItem('futurebox.lang.v1');
    } catch {
      window.__before = 'unreadable';
    }
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
  /* The welcome door, which did not exist when this probe was written and sits
     over everything until it is dealt with. Half the reason this probe stopped
     passing is that it was looking underneath one. */
  await dismissDoor(p);
  return { context, p };
}

/**
 * The language control, wherever this screen keeps it.
 *
 * The probe used to look for a button reading exactly "EN". That is the
 * compact toggle in the signed-in header, and it is not the only one: the
 * landing page carries the full picker, whose buttons say "English" and
 * "Afrikaans". Which of the two is on screen depends on whether the stubbed
 * session was accepted, which is not what this probe is about.
 *
 * So: found by what it does rather than by the two letters one of them happens
 * to print.
 */
async function chooseAfrikaans(p) {
  const full = p.locator('button', { hasText: /^Afrikaans$/ }).first();
  if (await full.count()) {
    await full.click();
    return;
  }
  const compact = p.locator('button[title="Language"], button[title="Taal"]').first();
  await compact.waitFor({ state: 'visible', timeout: 40000 });
  await compact.click();
}

// ── One: choosing Afrikaans writes it to the account ─────────────────────
{
  const { context, p } = await fresh();
  /* The compact toggle in the header, because a seeded session means the app
     comes up signed in and the landing page's picker is not on screen. */
  await chooseAfrikaans(p);
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
  const localHas = await p.evaluate(() => window.__before ?? null);
  check('the new browser had no stored language of its own when it opened',
    localHas === null, String(localHas));
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
  /* Read off the document rather than off the header. The header is one of two
     layouts depending on whether the stubbed session was accepted, and this
     assertion is about the language, not about which screen it is on. */
  check('it opens in Afrikaans anyway, from the account',
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

// ── Four: the account overrules a guess, and says so ─────────────────────
/*
   Carli, 9 September 2026: "Wanneer ek vanuit die afrikaanse skerm in log,
   spring hy na die engels toe wanneer mens in is."

   The switch is the rule working — an Afrikaans page on an Afrikaans phone is
   a guess, and a guess deliberately stores nothing, so the account answers.
   What was wrong is that it happened in silence: the decision compared the
   account against a ref that another effect had not filled in yet, so English
   matched English and nothing was announced.

   Reproduced the way it actually happens: a phone whose own language is
   Afrikaans, no stored choice, and an account that says English. The page must
   end in English *and* carry the notice offering Afrikaans back.
*/
{
  stored = { lang: 'en' };
  const context = await b.newContext({
    viewport: { width: 1280, height: 950 },
    // The phone's own language, which is what makes the first paint Afrikaans.
    locale: 'af-ZA',
  });
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
  await p.route('**/auth/v1/**', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: WHO.id, email: WHO.email, aud: 'authenticated', role: 'authenticated',
        app_metadata: {}, user_metadata: stored,
      }),
    }));
  await p.route('**/rest/v1/**', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await p.route('**/storage/v1/**', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);

  check('an English account beats an Afrikaans guess',
    'en' === (await p.evaluate(() => document.documentElement.lang)),
    await p.evaluate(() => document.documentElement.lang));

  /* The half that was silently missing. Without it the page simply changes
     language under somebody who was reading it, which is what she saw. */
  const said = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
  check('and the swap is said out loud, not done in silence',
    /Your account is set to this language|Jou rekening is op hierdie taal gestel/.test(said),
    said.slice(0, 140));
  check('with one press back to what was on screen',
    (await p.locator('button', { hasText: /Keep Afrikaans|Hou Afrikaans/ }).count()) > 0);
  await context.close();
}

console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
server.stop();
process.exit(problems.length ? 1 : 0);
