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

const WHO = { id: '11111111-2222-3333-4444-555555555555', email: 'toets@futurebox.test' };
await p.addInitScript((who) => {
  try {
    window.localStorage.setItem('sb-stub-auth-token', JSON.stringify({
      access_token: 'stub-access-token', refresh_token: 'stub-refresh-token', token_type: 'bearer',
      expires_at: Math.floor(Date.now() / 1000) + 86400, expires_in: 86400,
      user: { id: who.id, email: who.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
    }));
  } catch {}
}, WHO);

/* Four dubstep songs and one gospel one: enough for a habit, with something
   else in it so the answer is a majority rather than the only value present. */
await p.addInitScript(() => {
  const made = (id, genre, day) => ({
    id, title: `Song ${id}`, genre, bpm: 140, key: 'F min', lyrics: '', style: `${genre}, night`,
    models: [], source: 'engine', seconds: 120,
    createdAt: new Date(2026, 5, day).toISOString(), seed: 1,
  });
  try {
    window.localStorage.setItem('futurebox.tracks.v1', JSON.stringify([
      made('a', 'dubstep', 1), made('b', 'dubstep', 2), made('c', 'dubstep', 3),
      made('d', 'dubstep', 4), made('e', 'gospel', 5),
    ]));
    window.localStorage.setItem('futurebox.makes.v1', JSON.stringify([
      { id: 'm1', surface: 'make', kind: 'audio', title: 'One', createdAt: new Date(2026, 5, 4).toISOString() },
      { id: 'm2', surface: 'make', kind: 'audio', title: 'Two', createdAt: new Date(2026, 5, 5).toISOString() },
    ]));
  } catch {}
});

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

await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
await p.locator('header button').filter({ hasText: /Studio/i }).first().waitFor({ timeout: 40000 });
await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
await p.waitForTimeout(2500);
const room = p.locator('div.fixed.inset-0.z-50').first();
let words = await room.innerText();

// ── It is the first thing shown, addressed to them ───────────────────────
check('the studio opens on the door, not on a room',
  af ? /Hallo, Carli!/.test(words) : /Hello, Carli!/.test(words),
  words.split('\n').slice(0, 12).join(' / '));
check('the surname is not read back at them', !/Carli Fourie!/.test(words));
check('it welcomes them back rather than for the first time',
  af ? /welkom terug by FutureBox/i.test(words) : /welcome back to FutureBox/i.test(words));
check('the mark is on it', (await room.locator('img[src="/icon-192.png"]').count()) === 1);
// The alt is the first name, the same one in the greeting — the habit carries
// `firstName`, so the picture and the sentence above it agree.
check('their own picture is shown, not a generated cover',
  (await room.locator('img[alt="Carli"]').count()) === 1 && servedPhoto > 0,
  `${await room.locator('img[alt="Carli"]').count()} matching, served ${servedPhoto}`);

// ── The suggestion is the one their library earns ────────────────────────
check('it offers the genre they actually keep making',
  af ? /Nog ’n dubstep-liedjie vandag\?/.test(words) : /Another dubstep song today\?/.test(words),
  words.match(/.*dubstep.*/i)?.[0] ?? 'no dubstep line');
check('and says where that came from',
  af ? /reeds op hierdie toestel/.test(words) : /already on this device/.test(words));
check('and that nothing extra is recorded',
  af ? /Niks ekstra word aangeteken nie/.test(words) : /Nothing extra is recorded/.test(words));

// ── It is a door ─────────────────────────────────────────────────────────
const quick = room.locator('button').filter({ hasText: af ? /^Maak ’n snit/ : /^Make a song/ });
check('the rooms are one press away', (await quick.count()) > 0, String(await quick.count()));

/* The big one under the question. Both it and the quick button below carry
   the room's name, so this takes the first — which is the primary. */
const open = room.locator('button').filter({
  hasText: af ? /^Maak ’n snit$/ : /^Make a song$/,
}).first();
check('the suggestion has its own button', (await open.count()) > 0);
await open.click();
await p.waitForTimeout(1500);
words = await room.innerText();
check('pressing it lands in the room', !/Hello, Carli!|Hallo, Carli!/.test(words));
check('and the room is the one that was offered',
  af ? /Hoor hoe ’n styl klink|Skryf vir my ’n styl/.test(words) : /Hear what a style sounds like|Write me a style/.test(words),
  words.split('\n').slice(0, 10).join(' / '));

// ── And there is a way back ──────────────────────────────────────────────
const home = room.locator('nav button').filter({ hasText: af ? /^Tuis$/ : /^Home$/ }).first();
check('the rail carries a way back to it', (await home.count()) > 0);
await home.click();
await p.waitForTimeout(900);
words = await room.innerText();
check('and it goes back',
  af ? /Hallo, Carli!/.test(words) : /Hello, Carli!/.test(words));

await p.screenshot({ path: `audit/greeting-${af ? 'af' : 'en'}.png`, fullPage: false });
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
