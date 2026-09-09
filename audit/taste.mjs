/**
 * What the account remembers, and what it refuses to remember.
 *
 * ── The two halves ───────────────────────────────────────────────────────
 *
 * Writing: that a song and a room actually reach `/api/taste`, from the
 * ordinary course of using the app rather than from a button built to be
 * tested. Reading: that the welcome screen prefers the account over the
 * browser — which is the whole reason this exists, because the browser is the
 * one thing that does not follow somebody to their phone.
 *
 * ── And the half that matters more ───────────────────────────────────────
 *
 * That the greeting says where it got it. The line under it used to claim
 * "already on this device, nothing is sent anywhere", which stopped being true
 * the moment the account started answering — and a privacy sentence that is
 * quietly no longer true is worse than not having one.
 *
 * ── The build this needs, and why it makes one ──────────────────────────
 *
 * The account half is gated on `accessToken()`, which is `null` the moment
 * `NEXT_PUBLIC_SUPABASE_URL` is missing — so on an ordinary build `noteTaste`
 * returns before it sends anything and `loadTaste` answers `NO_TASTE`. That is
 * correct behaviour, not a fault: an app with no accounts behind it has no
 * account to remember anything.
 *
 * It also means this probe cannot borrow anybody else's build, and
 * `NEXT_PUBLIC_*` is inlined at build time so an environment handed to
 * `next start` changes nothing. The header used to say "needs the stub build"
 * and leave the making of it to somebody's memory, which is why it never ran.
 *
 * It makes one, and puts the ordinary build back afterwards. The values are
 * obvious nonsense on purpose: nothing here reaches Supabase, every call the
 * screen makes is answered by `page.route` below, and a real project's address
 * in a test build is how a probe ends up talking to production.
 *
 * ── One correction, recorded ────────────────────────────────────────────
 *
 * On 8 September this file was briefly rewritten to sign in through the app's
 * own form instead, which removed exactly the thing that made it work — and
 * the run then reported that the account had stopped remembering anything.
 * **It had not.** The probe had stopped being able to ask: without
 * `NEXT_PUBLIC_SUPABASE_URL` there is no session, `accessToken()` is null, and
 * `noteTaste` correctly returns before it sends anything. That is an app with
 * no accounts behind it behaving exactly as it should.
 *
 * The claim was written into a commit message and told to Carli before it was
 * checked. It is wrong and this is where it is corrected.
 *
 * ── A second correction, of the first correction ────────────────────────
 *
 * This header used to say the probe could not get past the studio's front
 * door, because against a stub Supabase project that layer re-rendered
 * continuously and Playwright gave up. That was written down as a fact about
 * the environment and it kept this file on the waiting list.
 *
 * It was wrong. There was no re-render and nothing to fight. The probe
 * dismissed the *welcome* door and then asked `toRoom` for a room, and
 * `toRoom` looks for rooms on the *studio's* door — which had never been
 * opened. The two layers share a `z-[55]`, so a missing step read as an
 * environment that would not settle.
 *
 * One line — open the studio first — and all nine assertions pass, in English
 * and in Afrikaans. Twice now this file has recorded an inability to ask as
 * an answer, which is the exact fault `check:couldnotask` exists to catch in
 * the app; it turns out the probes can do it to themselves.
 */
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';
import { studio, toRoom } from './enter.mjs';

const PORT = process.argv[2] || '3105';
const af = process.argv[3] === 'af';

const STUB = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://stub.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'stub-anon-key',
};
console.log('building with a project that has accounts…');
execSync('npx next build', { stdio: 'ignore', env: { ...process.env, ...STUB } });

/* The tree as it was found, whatever happened above.

   In a `process.on('exit')` handler rather than at the end of the run: this
   probe threw once, before this line, and left the stubbed build behind — and
   the next probe to run then signed in against an app that believed it had
   accounts and could not find its way past the front page. Restoring on the
   way out is the same discipline the probe pages keep with `rmSync` in a
   `finally`, and for the same reason: the failure that skips the tidy-up is
   the one that was never planned for.

   `execSync` in an exit handler is allowed to be slow — nothing is waiting on
   this process any more, and a slow tidy-up beats a poisoned build. */
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
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
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
await p.route('**/api/creator*', (r) => r.fulfill({ status: 200, contentType: 'application/json',
  body: JSON.stringify({ creator: { name: 'Carli', handle: 'carli', about: '', links: {} } }) }));

/* The account's own memory, stood up here. Amapiano nine times against gospel
   twice: enough to be a habit and not the only thing in it, so the answer is a
   majority rather than the only value present. */
let remembered = [
  { kind: 'genre', label: 'amapiano', times: 9, last_at: '2026-06-01T00:00:00.000Z' },
  { kind: 'genre', label: 'gospel', times: 2, last_at: '2026-05-01T00:00:00.000Z' },
  { kind: 'room', label: 'canvas', times: 14, last_at: '2026-06-01T00:00:00.000Z' },
];
const written = [];
await p.route('**/api/taste*', async (route) => {
  const method = route.request().method();
  if (method === 'POST') {
    written.push(JSON.parse(route.request().postData() || '{}'));
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ noted: true }) });
  }
  if (method === 'DELETE') {
    remembered = [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ forgotten: true }) });
  }
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ taste: remembered, ready: true }) });
});

/* The browser's own library says something else entirely. That is the point:
   where the two disagree the account wins, because it describes the person and
   the browser describes one browser. */
await p.addInitScript(() => {
  const made = (id, genre, day) => ({
    id, title: `Song ${id}`, genre, bpm: 140, key: 'F min', lyrics: '', style: `${genre}, night`,
    models: [], source: 'engine', seconds: 120,
    createdAt: new Date(2026, 5, day).toISOString(), seed: 1,
  });
  try {
    window.localStorage.setItem('futurebox.tracks.v1', JSON.stringify([
      made('a', 'trance', 1), made('b', 'trance', 2), made('c', 'trance', 3),
    ]));
  } catch {}
});

/* `domcontentloaded`, not `networkidle`.

   The stub project has a Supabase address in it, and the client opens a
   realtime socket to it that never settles — so `networkidle` waits thirty
   seconds and gives up on a page that drew fine in two. The bottom bar is the
   signal that the app is up, the same one `enter()` waits for. */
await p.goto(server.url, { waitUntil: 'domcontentloaded' });
await p.locator('nav[aria-label]').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => undefined);
await p.waitForTimeout(2500);

/* ── The rooms write themselves ───────────────────────────────────────────

   Through the front page's own button rather than the rail, because every way
   into a room runs through one `goToRoom` and this is the shortest of them.
   The rail is checked in `greeting.mjs`; what matters here is that using the
   app in the ordinary way is what fills the table, with no button built for
   the purpose.

   The door comes down first. Arriving opens the welcome over the whole page,
   and a button underneath it is a button Playwright waits thirty seconds to
   click and then reports as missing — it is on screen and it is covered. The
   welcome gets its own fresh arrival further down, which is where it is
   actually read. */
const notNow = p.locator('button').filter({ hasText: af ? /^Nie nou nie/ : /^Not now/ }).first();
if (await notNow.isVisible({ timeout: 8000 }).catch(() => false)) {
  await notNow.click();
  await p.waitForTimeout(600);
}

/* Through the studio's own door, which is how somebody opens a room now.

   This used to press "Start a podcast" on the front page. That button is still
   there and still works, and it is now underneath the studio's front door —
   the `z-[55]` layer Playwright names when it says the click was intercepted —
   because the app opens on that door. Waiting thirty seconds for a covered
   button and calling it missing is measuring the overlay, not the app.

   The door is the better path anyway: it is the one every room is opened
   from, and what this file is actually asking is whether opening a room in the
   ordinary way tells the account. */
/* The studio is opened first, because `toRoom` looks for a room on a door
   and the door it looks for is the studio's — not the welcome overlay that
   was dismissed above. They share a `z-[55]`, which is why this read as "no
   way into Podcast" rather than as a step that had been left out. */
await studio(p);
await p.waitForTimeout(800);
await toRoom(p, af ? 'Potgooi' : 'Podcast');
await p.waitForTimeout(2000);
check('opening a room tells the account',
  written.some((one) => one.kind === 'room' && one.label === 'podcast'),
  JSON.stringify(written.slice(0, 4)));

/* ── The welcome prefers the account ──────────────────────────────────────

   Reached the way a sign-in reaches it — the marked return address — rather
   than by pressing Home, because the point is what somebody arriving sees. */
await p.goto(`${server.url}/?welcome=1`, { waitUntil: 'domcontentloaded' });
await p.locator('nav[aria-label]').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => undefined);
await p.waitForTimeout(2500);
const words = await p.locator('body').innerText();
check('the welcome offers what the account remembers, not what this browser holds',
  af ? /Nog ’n amapiano-liedjie vandag\?/.test(words) : /Another amapiano song today\?/.test(words),
  words.match(/.*(song today|liedjie vandag).*/i)?.[0] ?? 'no question found');
check('and not the genre sitting in this browser', !/trance/i.test(words));
check('it says the memory is on the account, not on the device',
  af ? /teen jou rekening/.test(words) : /kept against your account/.test(words),
  'the old device-only sentence is still there');
check('and that it is a count rather than a record of when you work',
  af ? /Nie ’n rekord van wanneer jy werk nie/.test(words) : /Not a record of when you work/.test(words));

// ── It can be seen, and stopped ──────────────────────────────────────────
await p.locator('button').filter({ hasText: af ? /^Nie nou nie/ : /^Not now/ }).first().click();
await p.waitForTimeout(1200);
await p.locator('header button').filter({ hasText: /carli/i }).first().click();
await p.waitForTimeout(1500);
const panel = p.locator('[role="dialog"]').first();
let shown = await panel.innerText();
check('the account screen shows what is remembered',
  /amapiano/.test(shown) && /9×/.test(shown),
  shown.split('\n').filter((one) => /amapiano|×/.test(one)).join(' / ') || 'not shown');
check('and what each line means', af ? /wat jy maak/.test(shown) : /what you make/.test(shown));

await panel.locator('button').filter({ hasText: af ? /^Vee dit uit/ : /^Clear this/ }).first().click();
await p.waitForTimeout(1500);
shown = await panel.innerText();
check('clearing it empties the list', !/amapiano/.test(shown), shown.slice(0, 120).replace(/\n/g, ' / '));
check('and says so rather than going blank',
  af ? /Nog niks nie/.test(shown) : /Nothing yet/.test(shown));

await p.screenshot({ path: shot(`taste-${af ? 'af' : 'en'}.png`), fullPage: false });
await b.close();
await server.stop();

/* The tree as it was found. Every other probe here shares one ordinary build,
   and leaving a stubbed one behind would hand the next probe an app that
   believes it has accounts. */
restore();

if (problems.length) {
  console.error(`\ncheck:taste — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:taste — the account remembers, the browser does not overrule it, and the screen says which.');
