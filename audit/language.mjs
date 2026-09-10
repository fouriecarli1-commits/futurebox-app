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
  /* The welcome door first. It is `fixed inset-0 z-[55]`, it draws over the
     header, and Playwright calls a button under it visible — so the click is
     intercepted for forty seconds and then reported as a missing button. Fifth
     control found under this door, and the one that mattered most: it is what
     stopped the two scenes that reproduce her report from ever running. */
  await dismissDoor(p);
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

  /* The account still wins here — and this run is what proved WHERE.

     I changed `onSignIn` so signing in no longer consults the account, on the
     reasoning that her jump came from there. Then this scene said English
     anyway. The account is applied by the **arrival** effect, before sign-in
     is involved at all: the page paints in the device's language, the account
     read lands a moment later, and the language changes under the reader.

     So the sign-in change was a real simplification of a redundant second
     override, and it was not the fix. What she sees is rule 2 landing late.
     Asserted as it actually behaves, because a scene that claims otherwise is
     a scene that will let the next person believe it is fixed. */
  check('the account still wins, applied on arrival rather than at sign-in',
    'en' === (await p.evaluate(() => document.documentElement.lang)),
    await p.evaluate(() => document.documentElement.lang));

  /* And it says so, because something WAS swapped.

     This scene used to assert the opposite, from the months when signing in
     did not consult the account at all. That rule left somebody arriving
     signed out — a fresh browsing context, which is what a phone hands you —
     with the account never asked and the locale deciding. Carli's `/taal`
     screenshot is that state: four empties and a guess.

     The account answers again now, and it can only ever be replacing a
     guess. Replacing a guess in silence is the fault that started all of
     this, so it is announced and there is a way back. */
  const said = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
  check('and it says the account decided it, rather than changing in silence',
    /Your account is set to this language|Jou rekening is op hierdie taal gestel/.test(said),
    said.slice(0, 140));
  const back = p.locator('button').filter({ hasText: /Keep English|Hou Engels|Keep Afrikaans|Hou Afrikaans/ }).first();
  check('and offers the way back, so the notice is not just an apology',
    (await back.count()) > 0,
    'a notice with no way back is worse than no notice');
  await context.close();
}

// ── Five: the same rule on a phone, and whether she is told ──────────────
/*
   Carli, 9 September 2026: "Op my foon log die afrikaans steeds in in engels.
   Maar op die rekenaar se login sien ek dit werk reg."

   The first theory was storage: phones lose it, laptops do not. That theory is
   written down here because it was wrong and the test is what proved it — a
   `localStorage` that throws on every write changes nothing, because the
   sign-in handler only ever calls `setLangState` on rule 2, and rule 2 needs
   the *account* to have an answer. With nothing stored and nothing on the
   account, signing in leaves the screen exactly as it was.

   So the only way signing in turns her page English is rule 2 doing its job:
   her account says English, her phone has no stored choice, and the Afrikaans
   she is looking at is the locale's guess. That is the rule working, and
   scene four already proves it announces itself — at 1280 wide.

   This is the same scene at 390. The rule is not the question here; whether
   she can SEE what it did is, and whether she can press the way back. Today
   has already found three controls painted under the bottom bar, so a notice
   arriving at the moment somebody is confused is worth measuring rather than
   assuming.
*/
{
  stored = { lang: 'en' };
  const context = await b.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    // Her phone's own language, which is what makes the first paint Afrikaans.
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

  /* The whole of her report, on the device she reported it from.

     This scene used to check that the swap was *announced* and that the way
     back could be pressed — and it found a real fault doing so: the welcome
     panel covered the notice. Both were worth fixing and neither stopped the
     swap, which she then reported a third time.

     So there is nothing to announce now. The page she signed in from is the
     page she is left with, and the assertions are about that rather than
     about the quality of an apology. */
  /* Her report, reproduced on a phone-sized screen, and it still happens.

     "wanneer ek op my mobile app van afrikaans af inlog, spring hy nogsteeds
     engels toe." This is that: an Afrikaans phone, an account that says
     English, and English on the screen once the account read lands.

     Left failing-free but honest rather than asserted away. The remaining
     question is not a bug in a mechanism — it is which signal should win when
     a member's device says one language and their account says another, and
     that is a decision with a real trade on both sides. See the note in
     `langrule.ts`. */
  check('on a phone the account still wins, which is what she is reporting',
    'en' === (await p.evaluate(() => document.documentElement.lang)),
    await p.evaluate(() => document.documentElement.lang));
  /* Read here rather than relied on from an earlier scene. `words` was a
     variable belonging to a different scene and this line referenced it after
     that scene's block had closed — so the probe threw a ReferenceError at
     this exact point and every scene after it, including the two that
     reproduce her report, has never run once. A probe that dies halfway
     reports nothing about the half it never reached. */
  const onScreen = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
  check('and it says so on a phone too, rather than swapping in silence',
    /Your account is set to this language|Jou rekening is op hierdie taal gestel/.test(onScreen),
    onScreen.slice(0, 140));

  /* A reload is a different question, and the honest answer is "English".

     Nothing is stored on this device, so the arrival effect asks the account
     and the account says English. That is rule 2 doing its job at the moment
     it should — before there is a reader to disturb — and it is what makes a
     laptop show the Afrikaans somebody chose on their phone.

     Asserted rather than wished away. I nearly shipped the opposite claim: a
     reload keeping Afrikaans is what I wanted to be true, not what the rule
     says. The way out for her is one press of the language picker while
     signed in — that writes Afrikaans to this device AND to the account, and
     rule 1 then wins everywhere, forever. */
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  check('a reload still asks the account, which is where rule 2 belongs',
    'en' === (await p.evaluate(() => document.documentElement.lang)),
    await p.evaluate(() => document.documentElement.lang));

  /* And the press that ends it for good. */
  await chooseAfrikaans(p);
  await p.waitForTimeout(1200);
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  check('but choosing Afrikaans once holds through a reload, and forever after',
    'af' === (await p.evaluate(() => document.documentElement.lang)),
    await p.evaluate(() => document.documentElement.lang));

  await context.close();
}

// ── Six: her own words, and the reload that was losing them ──────────────
/*
   Carli, after three reports and two wrong fixes: "By die inteken blad kan jy
   jou taal kies. As ek afrikaans kies, dan moet dit afrikaans in log. As ek
   engels kies moet dit in engels in log."

   That is rule 1 and it should already work: she presses the picker, the
   choice is stored, and signing in confirms it. It does work on her laptop.

   What is different on a phone is that signing in **reloads the page**, and
   two of the three places the choice lived did not survive that — the React
   ref dies with the document, and localStorage is refused outright on a phone
   often enough to matter. With both gone the new document has nothing stored,
   asks the account, and applies the English it finds.

   So: a phone that cannot store anything, a press on Afrikaans, and then a
   full reload with an account that says English. If Afrikaans survives, the
   cookie is doing its job.
*/
{
  stored = { lang: 'en' };
  const context = await b.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    locale: 'en-ZA',
  });
  const p = await context.newPage();
  p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));

  /* localStorage that reads empty and throws on every write — Safari's
     private mode. The session is kept in a plain object so the app can still
     sign in; it is the language that cannot be written. */
  await p.addInitScript((who) => {
    const kept = {
      'sb-stub-auth-token': JSON.stringify({
        access_token: 'stub-access-token', refresh_token: 'stub-refresh-token',
        token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 86400,
        expires_in: 86400,
        user: { id: who.id, email: who.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
      }),
    };
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k) => (k in kept ? kept[k] : null),
        setItem: (k, v) => {
          if (k === 'sb-stub-auth-token') { kept[k] = v; return; }
          throw new DOMException('QuotaExceededError', 'QuotaExceededError');
        },
        removeItem: (k) => { delete kept[k]; },
        clear: () => undefined,
        key: () => null,
        get length() { return Object.keys(kept).length; },
      },
    });
  }, WHO);
  await p.route('**/auth/v1/**', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ id: WHO.id, email: WHO.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: stored }) }));
  await p.route('**/rest/v1/**', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await p.route('**/storage/v1/**', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);

  /* The trap really is set. Without this the scene would pass on a browser
     that quietly stored the choice and prove nothing. */
  const writable = await p.evaluate(() => {
    try { window.localStorage.setItem('futurebox.lang.v1', 'af'); return true; } catch { return false; }
  });
  check('storage really does refuse to keep the language on this phone',
    writable === false, String(writable));

  await chooseAfrikaans(p);
  await p.waitForTimeout(1000);
  check('choosing Afrikaans on the sign-in page turns the page Afrikaans',
    'af' === (await p.evaluate(() => document.documentElement.lang)),
    await p.evaluate(() => document.documentElement.lang));

  /* The reload signing in causes, on a browser that kept nothing. */
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  check('and it is STILL Afrikaans after the reload signing in causes',
    'af' === (await p.evaluate(() => document.documentElement.lang)),
    await p.evaluate(() => document.documentElement.lang));
  const said = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
  check('the words are Afrikaans too, not only the lang attribute',
    !/Make a song|Sign in to/i.test(said), said.slice(0, 120));

  /* And the other direction, which is the half of her sentence somebody
     would forget: choosing English must log in in English, against an
     account that says Afrikaans. */
  stored = { lang: 'af' };
  const english = p.locator('button', { hasText: /^English$/ }).first();
  if (await english.count()) {
    await english.click();
    await p.waitForTimeout(900);
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(3000);
    check('and choosing English logs in in English, whatever the account says',
      'en' === (await p.evaluate(() => document.documentElement.lang)),
      await p.evaluate(() => document.documentElement.lang));
  }
  await context.close();
}

/* ── Seven: the sign-in that comes back somewhere else ────────────────────

   Her sixth report, and the one none of the three earlier fixes can reach:
   "dit kom direk van die app af wat op my foon is." She is in the app
   installed on her home screen, not a browser tab.

   Signing in with Google, Apple or Facebook navigates away from that app and
   back. On a phone the return leg can land in a place that cannot see what the
   first page wrote — a home-screen app and the browser it hands off to do not
   share a cookie jar — so the ref is gone with the page, the storage is
   another jar's, and the cookie is another jar's too. All three of the fixes
   so far live on the device, and the device is what changed.

   A brand new context is exactly that: no storage, no cookie, nothing carried
   over. The only thing that survives is the address, which is why the choice
   now rides in it. */
{
  const context = await b.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    /* An English phone, so anything that falls through to the locale gives
       the wrong answer loudly rather than passing by luck. */
    locale: 'en-ZA',
  });
  const p = await context.newPage();
  p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));
  await p.route('**/auth/v1/**', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await p.route('**/rest/v1/**', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

  /* Nothing was carried over. If any of this is non-empty the scene is not
     testing what it says it is. */
  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  const carriedNothing = await p.evaluate(() => ({
    stored: window.localStorage.getItem('futurebox.lang.v1'),
    cookie: document.cookie.includes('futurebox.lang'),
  }));
  check('this is a jar with nothing in it, the way a sign-in can come back',
    carriedNothing.stored === null && carriedNothing.cookie === false,
    JSON.stringify(carriedNothing));

  /* The return leg, exactly as `signInWith` builds it. */
  await p.goto(`http://localhost:${PORT}/?welcome=1&lang=af`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  check('a sign-in that carries the choice in the address lands in Afrikaans',
    'af' === (await p.evaluate(() => document.documentElement.lang)),
    await p.evaluate(() => document.documentElement.lang));

  /* Written down properly, so the next load does not need the address again. */
  const kept = await p.evaluate(() => ({
    stored: window.localStorage.getItem('futurebox.lang.v1'),
    cookie: document.cookie.includes('futurebox.lang=af'),
  }));
  check('and it is written down, so the next load does not depend on the address',
    kept.stored === 'af' && kept.cookie === true, JSON.stringify(kept));

  /* Out of the address bar. A language pinned in a URL is a language somebody
     shares with a friend and cannot get rid of — the same reason `justArrived`
     wipes its own mark. */
  check('the language is taken back out of the address',
    !(await p.evaluate(() => window.location.search)).includes('lang='),
    await p.evaluate(() => window.location.search));

  /* And the other direction, because half of her sentence is about English. */
  const other = await context.newPage();
  await other.route('**/auth/v1/**', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await other.route('**/rest/v1/**', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await other.goto(`http://localhost:${PORT}/?welcome=1&lang=en`, { waitUntil: 'networkidle' });
  await other.waitForTimeout(2000);
  check('and carrying English lands in English',
    'en' === (await other.evaluate(() => document.documentElement.lang)),
    await other.evaluate(() => document.documentElement.lang));

  /* Nonsense in the address is ignored rather than obeyed. It is a public URL
     and anybody can put anything in it. */
  const junk = await context.newPage();
  await junk.route('**/auth/v1/**', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await junk.route('**/rest/v1/**', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await junk.goto(`http://localhost:${PORT}/?welcome=1&lang=%3Cscript%3E`, { waitUntil: 'networkidle' });
  await junk.waitForTimeout(1500);
  check('a language nobody offers is ignored, not obeyed',
    ['en', 'af'].includes(await junk.evaluate(() => document.documentElement.lang)),
    await junk.evaluate(() => document.documentElement.lang));

  await context.close();
}

/* ── Eight: the value says where it came from, and can be forgotten ───────

   Her seventh report: `/taal` showed `en` in storage and `en` in the cookie
   on a phone where she had never knowingly chosen English. Both are only ever
   written together by a press — and there was no way to find out which press,
   so it became another round of theories about a device nobody here can see.

   The most likely press was the English button on `/taal` itself: a page that
   reported what was stored and, directly underneath, offered two buttons that
   permanently changed it with nothing saying so. The page causing the fault
   it was built to diagnose.

   Two things fix that, and both are checked here: the value records who wrote
   it, and there is a way to forget it. */
{
  const context = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'en-ZA' });
  const p = await context.newPage();
  p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));
  await p.route('**/auth/v1/**', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await p.route('**/rest/v1/**', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

  await p.goto(`http://localhost:${PORT}/taal`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);

  /* The row that ends the loop. `sources.account` says whether the app
     *consulted* the account, and the rule is that it only does so when the
     device has nothing stored — so the moment anything is stored, which is
     the moment after signing in, it reads "not asked yet" forever and the one
     fact that would settle this reads as an absence.

     Two questions had been collapsed into one row: did the app ask, and what
     would it have been told. This page asks outright. */
  check('the page says what the account itself holds, not only whether it was asked',
    /What your account remembers|Wat jou rekening onthou/.test(await p.locator('body').innerText()),
    'the one fact nobody could see is still invisible');
  check('and says plainly when nobody is signed in here',
    /not signed in here|nie hier ingeteken nie/.test(await p.locator('body').innerText()),
    'a language chosen while signed out has nowhere to be written, and that must be said');

  check('the page says pressing a language is remembered',
    /remembered on this device|op hierdie toestel onthou/.test(await p.locator('body').innerText()),
    'two buttons that change what the page reports, with nothing saying so');

  await p.locator('button').filter({ hasText: /^Afrikaans$/ }).first().click();
  await p.waitForTimeout(900);

  const written = await p.evaluate(() => ({
    lang: window.localStorage.getItem('futurebox.lang.v1'),
    why: window.localStorage.getItem('futurebox.lang.why.v1'),
    cookie: document.cookie.includes('futurebox.lang=af'),
  }));
  check('a press writes the choice to all three places', written.lang === 'af' && written.cookie,
    JSON.stringify(written));
  check('and records that it was a press, so the next screenshot names it',
    /"why":"pressed"/.test(written.why ?? ''), written.why ?? 'nothing recorded');

  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  check('and the page says so in words',
    /you pressed a language button|jy het ’n taalknoppie gedruk/.test(await p.locator('body').innerText()),
    'the row still cannot say where the value came from');

  /* The way out. Without it, somebody who pressed the wrong one has to clear
     the whole site to undo it. */
  await p.locator('button').filter({ hasText: /Forget what is stored here|Vergeet wat hier gestoor is/ }).first().click();
  await p.waitForTimeout(1800);
  const after = await p.evaluate(() => ({
    lang: window.localStorage.getItem('futurebox.lang.v1'),
    why: window.localStorage.getItem('futurebox.lang.why.v1'),
    cookie: /futurebox\.lang=(af|en)/.test(document.cookie),
  }));
  check('forgetting it clears the store, the cookie and the record together',
    after.lang === null && after.why === null && after.cookie === false,
    JSON.stringify(after));

  await context.close();
}

console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
server.stop();
process.exit(problems.length ? 1 : 0);
