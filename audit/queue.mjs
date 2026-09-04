/**
 * The posting queue, pressed rather than read.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 *
 * `check:queue` proves the arithmetic: a date and a time somebody typed become
 * the instant they meant, in any zone. It cannot prove that the instant then
 * reaches the server, comes back, and is shown to the same person as the time
 * they typed — and a queue that stores 16:00 correctly and shows it back as
 * 16:00 is wrong in exactly the way nobody reports, because "the reminder came
 * at the wrong time" reads as a scheduling problem rather than a display one.
 *
 * So the browser runs in Johannesburg here. Six in the evening typed into the
 * form must leave as 16:00 UTC on the wire and come back onto the screen as
 * six in the evening. Both halves, or neither is worth anything.
 *
 * ── And the sentence ─────────────────────────────────────────────────────
 *
 * The room must say, in the language it is being read in, that it does not
 * post for you. A button that looks like it publishes and does not is the one
 * failure this whole feature is shaped around avoiding, and it is a failure of
 * words rather than of code — which means no type check or unit test will ever
 * catch it and this is the only place that can.
 *
 * Needs the stub build — see `audit/README.md`.
 */
import { chromium } from 'playwright';
import { shot } from './where.mjs';

const PORT = process.argv[2] || '3045';
const af = process.argv[3] === 'af';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
/* Johannesburg, deliberately. On UTC the whole conversion is the identity and
   every one of these checks would pass against a version that ignored the
   timezone entirely. */
const context = await b.newContext({
  viewport: { width: 1280, height: 950 },
  timezoneId: 'Africa/Johannesburg',
  locale: af ? 'af-ZA' : 'en-ZA',
});
const p = await context.newPage();
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
await p.route('**/api/taste*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ taste: [], ready: true }) }));

/* ── The queue, stood up in memory ────────────────────────────────────────
   The real route is `app/api/schedule/route.ts` and it needs Supabase. What
   is being tested here is the browser's half: what it sends, and what it does
   with what comes back. So the table is a list and the rules it enforces are
   the two the screen depends on — a row comes back with an id, and cancelling
   takes it out of what is returned. */
let rows = [];
let n = 0;
const sent = [];
await p.route('**/api/schedule*', async (route) => {
  const request = route.request();
  const method = request.method();
  const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  if (method === 'POST') {
    const asked = JSON.parse(request.postData() || '{}');
    sent.push(asked);
    n += 1;
    const post = {
      id: `0000${n}000-0000-4000-8000-000000000000`.slice(-36),
      platform: asked.platform, caption: asked.caption ?? '', media_path: '',
      due_at: asked.dueAt, state: 'due',
    };
    rows.push(post);
    return json({ post });
  }
  if (method === 'DELETE') {
    const id = new URL(request.url()).searchParams.get('id') ?? '';
    const before = rows.length;
    rows = rows.filter((one) => one.id !== id);
    return json({ cancelled: rows.length < before });
  }
  return json({ posts: rows, ready: true });
});

await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
await p.waitForTimeout(2000);

// Into the advert desk, where the queue lives.
await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
await p.waitForTimeout(1800);
const room = p.locator('div.fixed.inset-0.z-50').first();
await room.locator('button').filter({ hasText: af ? /^Advertensies/ : /^Adverts/ }).first().click();
await p.waitForTimeout(2000);

const words = await room.innerText();
check('the queue is in the advert desk',
  af ? /Wanneer dit uitgaan/.test(words) : /When it goes out/.test(words),
  words.slice(0, 160).replace(/\n/g, ' / '));

/* The sentence, on the face of the room rather than folded away. Somebody who
   never opens the explanation must still know before they queue anything. */
check('it says on its face that it does not post for you',
  af ? /Dit plaas nie vir jou nie/.test(words) : /It does not post for you/.test(words),
  'the honest line is missing or has been softened');

check('an empty queue says so rather than showing nothing',
  af ? /Nog niks in die ry nie/.test(words) : /Nothing queued yet/.test(words));

/* ── Six in the evening ───────────────────────────────────────────────────
   Typed as a local date and time. In Johannesburg that is 16:00 UTC, which is
   what has to go over the wire — the app stores an instant and the browser is
   the only thing that knows which one was meant. */
await room.locator('#queue-date').fill('2027-03-09');
await room.locator('#queue-time').fill('18:00');
await room.locator('textarea').filter({ hasText: '' }).last().fill('New single out now.');
await room.locator('button').filter({ hasText: af ? /^Sit dit in die ry$/ : /^Put it in the queue$/ }).first().click();
await p.waitForTimeout(1500);

check('the queue was asked once', sent.length === 1, `${sent.length} requests`);
check('six in the evening in Johannesburg left as 16:00 UTC',
  sent[0]?.dueAt === '2027-03-09T16:00:00.000Z', sent[0]?.dueAt ?? 'nothing sent');
check('and it went with the words and the platform',
  sent[0]?.caption === 'New single out now.' && typeof sent[0]?.platform === 'string' && sent[0].platform.length > 0,
  JSON.stringify(sent[0] ?? {}));

const after = await room.innerText();
/* Back on the screen as the time it was typed as. This is the half a unit test
   cannot reach: the instant is right and the reader is in Johannesburg, so the
   row must say six in the evening and not four in the afternoon. */
check('and it is shown back as six in the evening, not four in the afternoon',
  /18:00|06:00\s*(PM|pm)/.test(after) && !/16:00|04:00\s*(PM|pm)/.test(after),
  (after.match(/\d\d:\d\d(\s*[AP]M)?/g) || ['no time on screen']).join(' | '));
check('the row names the platform rather than its id',
  /TikTok/.test(after), (after.match(/tiktok|TikTok/g) || ['neither']).join(' | '));
check('the row names the day it was queued for',
  /2027|Mar|Maa/.test(after), (after.match(/.*(Mar|Maa|2027).*/) || ['no date shown'])[0]);
check('the waiting count moved to one',
  af ? /Wag · 1/.test(after) : /Waiting · 1/.test(after),
  (after.match(/(Waiting|Wag) · \d+/) || ['no count'])[0]);
check('and the words went with it', /New single out now/.test(after));

await p.screenshot({ path: shot(`queue-${af ? 'af' : 'en'}.png`), fullPage: false });

// ── Taking it out again ─────────────────────────────────────────────────
await room.locator(`button[aria-label="${af ? 'Haal dit uit die ry' : 'Take it out of the queue'}"]`).first().click();
await p.waitForTimeout(1500);
const gone = await room.innerText();
check('cancelling takes it off the screen', !/New single out now/.test(gone),
  gone.slice(0, 160).replace(/\n/g, ' / '));
check('and the screen goes back to saying nothing is queued',
  af ? /Nog niks in die ry nie/.test(gone) : /Nothing queued yet/.test(gone));

/* ── Why, for somebody who asks ───────────────────────────────────────────
   Folded away, but there — and naming what it would take rather than saying
   "coming soon", which is the difference between a limitation and an excuse. */
await room.locator('summary').filter({ hasText: af ? /Hoekom dit jou herinner/ : /Why this reminds you/ }).first().click();
await p.waitForTimeout(600);
const why = await room.innerText();
check('and the explanation names what posting for real would take',
  af ? /ontwikkelaarrekening/.test(why) && /TikTok/.test(why) : /developer account/.test(why) && /TikTok/.test(why),
  'the explanation is vague');

console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
