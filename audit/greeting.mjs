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
 * The songs are seeded into the same store `lib/library.ts` reads, and the
 * history into the same localStorage key `lib/makes.ts` reads, so what runs is
 * the real derivation over real storage. Only the account behind it is stubbed.
 *
 * ── The build it needs, and why it makes one ────────────────────────────
 *
 * The greeting is a signed-in screen, and there is no signing in without
 * `NEXT_PUBLIC_SUPABASE_URL`: `cloud.configured()` is false, the form is not
 * there to fill in, and the run gets no further than the landing page. That
 * variable is inlined at build time, so an environment handed to `next start`
 * changes nothing — this probe cannot borrow anybody else's build.
 *
 * So it makes one, and puts the ordinary build back on the way out. The
 * header used to say "needs the stub build" and leave the making of it to
 * somebody's memory, which is why it never ran: it went straight to a port
 * nobody had started, on a build that had no accounts in it.
 *
 * The values are obvious nonsense on purpose. Nothing here reaches Supabase —
 * every call the screen makes is answered by `page.route` below — and a real
 * project's address in a test build is how a probe ends up talking to
 * production.
 */
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';
import { unfold } from './enter.mjs';

const PORT = process.argv[2] || '3253';
const af = process.argv[3] === 'af';

const STUB = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://stub.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'stub-anon-key',
};
console.log('building with a project that has accounts…');
execSync('npx next build', { stdio: 'ignore', env: { ...process.env, ...STUB } });

/* The tree as it was found, whatever happened above.

   In a `process.on('exit')` handler rather than at the end of the run: a probe
   that throws on its first assertion never reaches a tidy-up written at the
   bottom, and the stubbed build it leaves behind is then read by the next
   probe as a broken app — in a different file, with nothing pointing back
   here. `taste` did exactly that, once, which is why the rule exists.

   `execSync` in an exit handler is allowed to be slow. Nothing is waiting on
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
/* The detail is printed, not only collected.

   It used to go into `problems` and nowhere else, and `problems` is printed on
   the last line — which a run that throws never reaches. So every failure in a
   run that fell over showed as the word `false` and nothing more, and the
   detail written to explain it was thrown away with the process. */
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
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

/* Whether this run is currently signed out, and why a stub has to know.

   Every request under `/auth/v1/` was answered with a valid user, always. That
   is right up until somebody signs out: the auth library asks again a moment
   later, is told the session is fine, and puts it straight back — so the app
   went on showing the name and the library of somebody who had just left, and
   the run below could not find the way back in.

   That is the stub, not the app. A real project answers 401 once the session
   is revoked, and this now does the same. It is also the only way the rest of
   this file can prove anything: the whole point of the last third is signing
   out and signing back in. */
let signedOut = false;
await p.route('**/auth/v1/**', (r) => {
  if (signedOut) {
    return r.fulfill({ status: 401, contentType: 'application/json',
      body: JSON.stringify({ message: 'Invalid Refresh Token' }) });
  }
  return r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ id: WHO.id, email: WHO.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }) });
});
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
  await p.route(path, (r) => {
    /* A refresh while signed out is refused; the sign-in form's own request is
       not, because `signIn` clears the flag before it fills anything in. */
    if (signedOut) {
      return r.fulfill({ status: 401, contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid Refresh Token' }) });
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION) });
  });
}

/* The bottom bar. It is on every signed-in screen and no signed-out one, so
   it is how this run knows it is in — rather than a flat three seconds, which
   is how long the sign-in took on an idle laptop and sometimes less than it
   takes on a loaded one. A probe that drives the signed-out page believing it
   is signed in reports the room as broken when the fault is the wait. */
async function signIn() {
  signedOut = false;
  await p.locator('button').filter({ hasText: af ? /^Begin verniet$/ : /^Start free$/ }).first().click();
  await p.locator('input[type="email"]').first().waitFor({ timeout: 20_000 });
  await p.locator('input[type="email"]').first().fill(WHO.email);
  await p.locator('input[type="password"]').first().fill('hierdie-is-nie-eg-nie');
  await p.locator('form button[type="submit"]').first().click();
  await p.locator('nav[aria-label]').first().waitFor({ timeout: 40_000 });
  await p.waitForTimeout(1200);
}

await p.goto(server.url, { waitUntil: 'domcontentloaded' });
await p.locator('button').filter({ hasText: af ? /^Begin verniet$/ : /^Start free$/ }).first()
  .waitFor({ timeout: 30_000 });
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
/* Waited out rather than glanced at, and this is the assertion that found the
   fault the file was revived for.

   The auth library re-emits the session after the sign-in has already been
   answered — and the studio was treating every one of those as an arrival, so
   the door came back over the room a second or two after somebody pressed
   their way out of it. A check that read the screen 1.5s in saw the room and
   said yes. Four seconds is longer than that callback takes and short enough
   to keep the run honest; the same line covers the hourly token refresh,
   which is the version of this that lands on somebody mid-verse. */
await p.waitForTimeout(4000);
words = await p.locator('body').innerText();
check('pressing it lands in the room, and the room stays',
  !/Hello, Carli!|Hallo, Carli!/.test(words),
  'the greeting came back over the room');

/* Which room it is, is now behind a fold.
 
   Every card starts shut, so a room's body text is its list of headings and
   nothing else — and the two phrases that identify Make a song live inside
   `StyleFinder`, which is inside one of them. The room was opening correctly
   the whole time; the probe was reading a table of contents.
 
   Below the "the room stays" assertion on purpose: that one is about the
   door coming back over the room a second later, and it has to read the
   screen as somebody arriving actually finds it. */
await unfold(p);
words = await p.locator('body').innerText();
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
const notNow = door.locator('button').filter({ hasText: af ? /^Nie nou nie/ : /^Not now/ }).first();
await notNow.waitFor({ timeout: 20_000 });
await notNow.click();
await p.waitForTimeout(1200);
check('there is a way past it that is not a room',
  !/Hello, Carli!|Hallo, Carli!/.test(await p.locator('body').innerText()),
  'the greeting was still up');

// Out of the studio next: the overlay covers the header the sign-out lives
// in, which is also the route somebody takes to sign out in real life.
await p.locator('button').filter({ hasText: af ? /^Terug na FutureBox$/ : /^Back to FutureBox$/ }).first().click();
await p.waitForTimeout(900);
/* Refused before the press, not after it.

   The flag used to flip on the line below, which left a gap: the sign-out
   request itself, and any refresh already on the wire, were still answered
   with a valid session — so the app was signed back in by its own auth
   library a moment after being told to leave. A real project revokes the
   session when it is asked to; this is that. */
signedOut = true;
await p.locator('button').filter({ hasText: af ? /^Teken uit$/ : /^Sign out$/ }).first().click();
await p.waitForTimeout(1500);
check('signing out closes the door behind them',
  !/Hello, Carli!|Hallo, Carli!/.test(await p.locator('body').innerText()));
/* And actually leaves. The screen used to keep the name and the library of
   somebody who had just signed out, because the press waited on the network
   before touching anything — so on a bad connection nothing visible happened
   at all. The way back in is the landing's own button, so its absence is the
   failure that matters here. */
const startAgain = p.locator('button').filter({ hasText: af ? /^Begin verniet$/ : /^Start free$/ }).first();
/* Generously. Signing out against a stub project sets off a round of refused
   token refreshes with a backoff behind them, and how long that takes to
   settle varies from run to run — twenty seconds was enough most times, which
   is the worst kind of enough. */
await startAgain.waitFor({ timeout: 60_000 }).catch(() => undefined);
/* What is on screen when it is not the landing page, named in the failure.

   This check went red in a full run and green in a trimmed one built from the
   same file, which is the shape of a fault nobody finds by re-reading the
   code. A failure that says which buttons were there instead is one run away
   from an answer; a failure that says `false` is an afternoon. */
const back = (await startAgain.count()) > 0;
check('and the screen actually goes back to signed out', back,
  back ? '' : `on screen: ${(await p.locator('button:visible').allInnerTexts())
    .map((one) => one.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 14).join(', ')}`);
if (!back) {
  await p.screenshot({ path: shot(`greeting-stuck-${af ? 'af' : 'en'}.png`), fullPage: false });
}

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
await p.goto(`${server.url}/`, { waitUntil: 'domcontentloaded' });
/* Past the door first, because a page load carrying a session now lands on it
   — which is the behaviour asserted three checks above. The front page is
   underneath, and the row being tested is on the front page. Without this the
   press below is aimed at a button the door is covering, and Playwright spends
   thirty seconds explaining that in a way that reads like the button is
   broken. */
const pastIt = p.locator('button').filter({ hasText: af ? /^Nie nou nie/ : /^Not now/ }).first();
await pastIt.waitFor({ timeout: 30_000 });
await pastIt.click();
const podcast = p.locator('button').filter({
  hasText: af ? /^Begin ’n potgooi$|^Begin ’n podsending$/ : /^Start a podcast$/,
}).first();
await podcast.waitFor({ timeout: 30_000 });
await podcast.click();
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
await p.goto(`${server.url}/?welcome=1`, { waitUntil: 'domcontentloaded' });
await p.locator('nav[aria-label]').first().waitFor({ timeout: 40_000 });
await p.waitForTimeout(2500);
words = await p.locator('body').innerText();
check('coming back from Google arrives at the door too',
  af ? /Hallo, Carli!/.test(words) : /Hello, Carli!/.test(words),
  words.split('\n').slice(0, 8).join(' / '));
check('and the mark is wiped out of the address bar',
  !p.url().includes('welcome='), p.url());

/* ── And an ordinary return, which used to be the opposite ──────────────

   This check asserted that a plain reload with a session does *not* show the
   greeting: coming back to a tab is not signing in, and the feed is what
   somebody came back for. That reasoning was overturned, by the person who
   uses the app: "na in log moet make die eerste blad wees wat die klient
   sien." Somebody with an account opens this to make something.

   So a session lands on the door however it got here, and the greeting on it
   already says a different thing to a first arrival than to a return. The
   assertion is kept rather than deleted, pointed the other way — a reversal
   that leaves no test behind is a reversal nobody can undo safely.

   What is still refused is the feed: being dropped on somebody else's songs
   with a studio you have to go and find. */
await p.goto(`${server.url}/`, { waitUntil: 'domcontentloaded' });
await p.locator('nav[aria-label]').first().waitFor({ timeout: 40_000 });
await p.waitForTimeout(2500);
words = await p.locator('body').innerText();
check('an ordinary return to a signed-in tab lands on the door, not the feed',
  af ? /Hallo, Carli!/.test(words) : /Hello, Carli!/.test(words),
  words.split('\n').slice(0, 8).join(' / '));

await p.screenshot({
  path: shot(`greeting-${af ? 'af' : 'en'}${GENRE === 'dubstep' ? '' : `-${GENRE}`}.png`),
  fullPage: false,
});
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
server.stop();
process.exit(problems.length ? 1 : 0);
