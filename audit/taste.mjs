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
 * Needs the stub build — see `audit/README.md`.
 */
import { chromium } from 'playwright';

const PORT = process.argv[2] || '3044';
const af = process.argv[3] === 'af';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
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

await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);

/* ── The rooms write themselves ───────────────────────────────────────────

   Through the front page's own button rather than the rail, because every way
   into a room runs through one `goToRoom` and this is the shortest of them.
   The rail is checked in `greeting.mjs`; what matters here is that using the
   app in the ordinary way is what fills the table, with no button built for
   the purpose. */
await p.locator('button').filter({ hasText: af ? /^Begin ’n podsending$/ : /^Start a podcast$/ }).first().click();
await p.waitForTimeout(2000);
check('opening a room tells the account',
  written.some((one) => one.kind === 'room' && one.label === 'podcast'),
  JSON.stringify(written.slice(0, 4)));

/* ── The welcome prefers the account ──────────────────────────────────────

   Reached the way a sign-in reaches it — the marked return address — rather
   than by pressing Home, because the point is what somebody arriving sees. */
await p.goto(`http://localhost:${PORT}/?welcome=1`, { waitUntil: 'networkidle' });
await p.waitForTimeout(3000);
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

await p.screenshot({ path: `audit/taste-${af ? 'af' : 'en'}.png`, fullPage: false });
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
