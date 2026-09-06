/**
 * The door, on a stubbed account with a history behind it.
 *
 * ── What is actually being asked ─────────────────────────────────────────
 *
 * Not "does the screen render". Three things that would each be worse than not
 * building it at all:
 *
 *   · that it greets them by *their* name, from their channel, with their own
 *     picture — a greeting addressed to nobody is a template;
 *   · that the suggestion is the one their own library earns. `check:habits`
 *     proves the arithmetic; this proves the arithmetic is wired to the
 *     screen, which is a different claim and the one that has historically
 *     been wrong;
 *   · that it is a door and not a wall — one press into a room, and a way
 *     back to it afterwards.
 *
 * The songs are seeded into the same IndexedDB store `lib/library.ts` reads,
 * and the history into the same localStorage key `lib/makes.ts` reads, so what
 * runs is the real derivation over real storage. Only the account behind it is
 * stubbed. Needs the stub build — see `audit/README.md`.
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

const WHO = { id: '11111111-2222-3333-4444-555555555555', email: 'toets@futurebox.test' };

/* Started signed out, on purpose.

   The run used to seed a session into storage and open the studio, which meant
   it never once did the thing being tested. Signing in through the form is
   both the only way to see this screen and the sequence that kept failing in
   real life. */

/* Four of one genre and one of another: enough for a habit, with something
   else in it so the answer is a majority rather than the only value present.

   The genre is an argument to this run, and there is a second run below with a
   different one. That is not thoroughness for its own sake — the sentence on
   the door has to be *this account's*, and a screenshot showing "dubstep" is
   equally consistent with a screen that says dubstep to everybody. Two
   accounts, two sentences, same code. */
const GENRE = process.argv[4] || 'dubstep';
await p.addInitScript((genre) => {
  const made = (id, kind, day) => ({
    id, title: `Song ${id}`, genre: kind, bpm: 140, key: 'F min', lyrics: '', style: `${kind}, night`,
    models: [], source: 'engine', seconds: 120,
    createdAt: new Date(2026, 5, day).toISOString(), seed: 1,
  });
  try {
    window.localStorage.setItem('futurebox.tracks.v1', JSON.stringify([
      made('a', genre, 1), made('b', genre, 2), made('c', genre, 3),
      made('d', genre, 4), made('e', 'gospel', 5),
    ]));
    window.localStorage.setItem('futurebox.makes.v1', JSON.stringify([
      { id: 'm1', surface: 'make', kind: 'audio', title: 'One', createdAt: new Date(2026, 5, 4).toISOString() },
      { id: 'm2', surface: 'make', kind: 'audio', title: 'Two', createdAt: new Date(2026, 5, 5).toISOString() },
    ]));
  } catch {}
}, GENRE);

await p.route('**/auth/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
  body: JSON.stringify({ id: WHO.id, email: WHO.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }) }));
await p.route('**/rest/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

// Their channel: a name, a handle, and a picture at a path in the public bucket.
await p.route('**/api/creator*', (r) => r.fulfill({ status: 200, contentType: 'application/json',
  body: JSON.stringify({ creator: {
    name: 'Carli Fourie', handle: 'carli', about: '', links: {},
    avatar_path: `${WHO.id}/1.webp`,
  } }) }));

// The picture itself, out of the public bucket.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
let servedPhoto = 0;
await p.route('**/storage/v1/object/**', (r) => {
  servedPhoto += 1;
  return r.fulfill({ status: 200, contentType: 'image/png', body: PIXEL });
});

/* Arrive the way a person does, through the form.

   A page load with a session already in place deliberately shows nothing:
   coming back to a tab is not signing in, and this welcome is a whole page. So
   the run signs in rather than reloading — which is also the sequence the
   owner tried, twice, before it worked. */
const SESSION = {
  access_token: 'stub-access-token', refresh_token: 'stub-refresh-token', token_type: 'bearer',
  expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400,
  user: { id: WHO.id, email: WHO.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
};
for (const path of ['**/auth/v1/token*', '**/auth/v1/signup*']) {
  await p.route(path, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION) }));
}

async function signIn() {
  await p.locator('button').filter({ hasText: af ? /^Begin verniet$/ : /^Start free$/ }).first().click();
  await p.waitForTimeout(900);
  await p.locator('input[type="email"]').first().fill(WHO.email);
  await p.locator('input[type="password"]').first().fill('hierdie-is-nie-eg-nie');
  await p.locator('form button[type="submit"]').first().click();
  await p.waitForTimeout(3000);
}

await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
check('a page load on its own shows no welcome — that is for arriving',
  !/Hello, Carli!|Hallo, Carli!/.test(await p.locator('body').innerText()));
await signIn();
const room = p.locator('div.fixed.inset-0.z-50').first();
/* The welcome is its own page over everything, not a panel inside the studio,
   so what it says is read off the body rather than out of the studio shell. */
const door = p.locator('div.fixed.inset-0.z-\\[55\\]').first();
let words = await p.locator('body').innerText();

// ── It is the first thing shown, addressed to them ───────────────────────
check('the studio opens on the door, not on a room',
  af ? /Hallo, Carli!/.test(words) : /Hello, Carli!/.test(words),
  words.split('\n').slice(0, 12).join(' / '));
check('the surname is not read back at them', !/Carli Fourie!/.test(words));
check('it welcomes them back rather than for the first time',
  af ? /welkom terug by FutureBox/i.test(words) : /welcome back to FutureBox/i.test(words));
check('the mark is on it', (await door.locator('img[src="/icon-192.png"]').count()) === 1);
check('and it is its own page, not a panel inside the studio',
  (await door.count()) === 1 && (await door.locator('nav button').count()) === 0,
  `${await door.count()} door(s), ${await door.locator('nav button').count()} rail rows on it`);
// The alt is the first name, the same one in the greeting — the habit carries
// `firstName`, so the picture and the sentence above it agree.
check('their own picture is shown, not a generated cover',
  (await door.locator('img[alt="Carli"]').count()) === 1 && servedPhoto > 0,
  `${await door.locator('img[alt="Carli"]').count()} matching, served ${servedPhoto}`);

await p.screenshot({
  path: shot(`welcome-${af ? 'af' : 'en'}${GENRE === 'dubstep' ? '' : `-${GENRE}`}.png`),
  fullPage: false,
});

// ── The suggestion is the one their library earns ────────────────────────
const asked = af
  ? new RegExp(`Nog ’n ${GENRE}-liedjie vandag\\?`)
  : new RegExp(`Another ${GENRE} song today\\?`);
check(`it offers the genre this account actually keeps making (${GENRE})`,
  asked.test(words), words.match(/.*(song today|liedjie vandag).*/i)?.[0] ?? 'no question found');
/* And says nothing about any other. A screen that named the genre correctly
   while also mentioning a different one would still be wrong. */
check('and names no other genre',
  !new RegExp(GENRE === 'dubstep' ? 'amapiano' : 'dubstep', 'i').test(words));
check('and says where that came from',
  af ? /reeds op hierdie toestel/.test(words) : /already on this device/.test(words));
check('and that nothing extra is recorded',
  af ? /Niks ekstra word aangeteken nie/.test(words) : /Nothing extra is recorded/.test(words));

// ── It is a door ─────────────────────────────────────────────────────────
const quick = door.locator('button').filter({ hasText: af ? /^Maak ’n snit/ : /^Make a song/ });
check('the rooms are one press away', (await quick.count()) > 0, String(await quick.count()));

/* The big one under the question. Both it and the quick button below carry
   the room's name, so this takes the first — which is the primary. */
const open = door.locator('button').filter({
  hasText: af ? /^Maak ’n snit$/ : /^Make a song$/,
}).first();
check('the suggestion has its own button', (await open.count()) > 0);
await open.click();
await p.waitForTimeout(1500);
words = await p.locator('body').innerText();
check('pressing it lands in the room', !/Hello, Carli!|Hallo, Carli!/.test(words));
check('and the room is the one that was offered',
  af ? /Hoor hoe ’n styl klink|Skryf vir my ’n styl/.test(words) : /Hear what a style sounds like|Write me a style/.test(words),
  words.split('\n').slice(0, 10).join(' / '));

// ── And there is a way back ──────────────────────────────────────────────
const home = room.locator('nav button').filter({ hasText: af ? /^Tuis$/ : /^Home$/ }).first();
check('the rail carries a way back to it', (await home.count()) > 0);
await home.click();
await p.waitForTimeout(900);
words = await p.locator('body').innerText();
check('and it goes back',
  af ? /Hallo, Carli!/.test(words) : /Hello, Carli!/.test(words));

/* ── Out and in again ────────────────────────────────────────────────────

   Into a room first, and this line is the whole check.

   Without it the previous step has already left the door open, so the
   assertion below passes whatever the sign-in does — which is exactly what the
   first version of this did: it went green against the bug it was written to
   catch. The door has to be shut before anything can be proved about opening
   it.

   The way anybody checks that a greeting works: sign out, sign back in. The
   first version latched on the first sign-in and never let go for the life of
   the page, so this exact sequence skipped the door — and it is the sequence
   the owner tried within an hour of it being built.

   Driven through the real buttons — the sign-out in the header and the
   sign-in form — rather than through a faked auth event. The first version
   dispatched a `StorageEvent` and asserted on what happened next, which tested
   the probe: the app's auth library does not listen to that in the same tab,
   so nothing happened and the check reported on a screen nobody had changed.

   Doing it properly is what found the actual fault. The form sets the account
   from its own result and does not wait for the library's event, so the door
   was opened by a code path that only sometimes runs. */
/* Off the welcome without choosing a room.

   Somebody who came to read the feed should not have to pick a studio to get
   past a greeting. It is also what shuts the door so the sign-in below has
   something to prove — and the rail is deliberately behind this page and
   cannot be reached from it, which is what being a page means. */
await door.locator('button').filter({
  hasText: af ? /^Nie nou nie/ : /^Not now/,
}).first().click();
await p.waitForTimeout(1200);
check('there is a way past it that is not a room',
  !/Hello, Carli!|Hallo, Carli!/.test(await p.locator('body').innerText()),
  'the greeting was still up');

// Out of the studio next: the overlay covers the header the sign-out lives
// in, which is also the route somebody takes to sign out in real life.
await p.locator('button').filter({ hasText: af ? /^Terug na FutureBox$/ : /^Back to FutureBox$/ }).first().click();
await p.waitForTimeout(900);
await p.locator('button').filter({ hasText: af ? /^Teken uit$/ : /^Sign out$/ }).first().click();
await p.waitForTimeout(1500);
check('signing out closes the door behind them',
  !/Hello, Carli!|Hallo, Carli!/.test(await p.locator('body').innerText()));

/* Signing out drops the whole app back to the landing page, so the way back
   in is the landing's own button rather than a header that is no longer
   there — which is what `signIn` above already does. */
await signIn();

/* And nothing is pressed after this. That is the assertion.

   The greeting lives inside the studio, and signing in leaves somebody on the
   feed — so it was being armed correctly and shown to nobody until they
   happened to open the studio themselves, which is not a welcome, it is a
   surprise several minutes later. A sign-in has to arrive at it. */
words = await p.locator('body').innerText();
check('signing in arrives at the door without pressing anything else',
  af ? /Hallo, Carli!/.test(words) : /Hello, Carli!/.test(words),
  words.split('\n').slice(0, 10).join(' / '));

/* ── A room chosen from the front page ───────────────────────────────────

   "Start a podcast" on the first screen opened the studio, set the room behind
   the greeting, and left the greeting on screen — so the press appeared to do
   nothing and the rail did not move either.

   The door taught its own six buttons to close it and nothing else: the rail,
   this row, and every hand-off from one room to the next all set the room
   without leaving the door. There is one `goToRoom` now and it is the only way
   to set one, which is what stops the next room-picker arriving with the same
   fault. */
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
await p.locator('button').filter({ hasText: af ? /^Begin ’n potgooi$|^Begin ’n podsending$/ : /^Start a podcast$/ }).first().click();
await p.waitForTimeout(2500);
words = await p.locator('body').innerText();
check('a room chosen on the front page opens that room, not the door',
  !/Hello, Carli!|Hallo, Carli!/.test(words), words.split('\n').slice(0, 6).join(' / '));
check('and the rail moves with it',
  (await room.locator('nav button[aria-current="page"]').first().innerText()).startsWith('Podcast'),
  await room.locator('nav button[aria-current="page"]').first().innerText());

/* ── The way back from Google ────────────────────────────────────────────

   Signing in with Google leaves the page and comes back, so the return is a
   page load — indistinguishable from opening a tab you were already signed
   into, which is the one case that must *not* take over the screen. It was
   putting people back on the feed with a session and no greeting.

   `cloud.signInWithGoogle` marks its own return address, and this is that
   return: a fresh load carrying the mark, with nothing pressed afterwards. */
await p.goto(`http://localhost:${PORT}/?welcome=1`, { waitUntil: 'networkidle' });
await p.waitForTimeout(3000);
words = await p.locator('body').innerText();
check('coming back from Google arrives at the door too',
  af ? /Hallo, Carli!/.test(words) : /Hello, Carli!/.test(words),
  words.split('\n').slice(0, 8).join(' / '));
check('and the mark is wiped out of the address bar',
  !p.url().includes('welcome='), p.url());

/* And an ordinary load, with the same session and no mark, does not. Somebody
   coming back to a tab came for the feed. */
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
check('but an ordinary return to a signed-in tab does not take over the screen',
  !/Hello, Carli!|Hallo, Carli!/.test(await p.locator('body').innerText()));

await p.screenshot({
  path: shot(`greeting-${af ? 'af' : 'en'}${GENRE === 'dubstep' ? '' : `-${GENRE}`}.png`),
  fullPage: false,
});
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
