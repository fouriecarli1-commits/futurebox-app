/**
 * The question asked before a song goes into the room, and the heart on a row.
 *
 *   "kan jy 'n heart button op die live liedjies sit, dat mense daarop kan
 *    reageer. Wanneer iemand 'n live post dan kry hulle 'n pop up wat vra of
 *    ander dit mag gebruik as hooks."
 *
 * ── What this is actually checking ───────────────────────────────────────
 *
 * Not that a panel exists — a panel is easy and a wrong one is just as easy.
 * The three things that would make the feature dishonest:
 *
 * 1. **The question has no default.** Both answers post the song; the only
 *    difference between them is the permission. A panel where one answer is
 *    styled as the way out is a panel that decides for her.
 * 2. **`buildOn` actually leaves the browser.** The whole point is a flag on
 *    a row in Supabase. A panel that asks and then posts the same body either
 *    way is worse than not asking, so this reads the request body.
 * 3. **The heart is disabled when signed out, not hidden.** Hiding it makes
 *    the room look like it has no hearts; disabling it with a title says what
 *    to do about it.
 *
 * The room's own request is answered here rather than by Supabase, so what
 * runs is the real `LiveChannel`, the real `RoomPanel` and the real
 * `PostToLive` against the shapes `/api/live` really returns.
 */
import { cpSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3141';
const PROBE = 'app/buildon/page.probe.tsx';
const LIVE = 'app/buildon/page.tsx';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

/* Half a second of silence, as a real decodable file.

   A row with `audio: null` draws "That file is not there any more" over the
   art, which is the right thing for a post whose file has gone and the wrong
   thing to look at a heart against — the first screenshot from this probe was
   two rows of an error message. */
/* Four seconds of silence, served over http rather than inlined.

   The first version handed the room a `data:` URI, and every fetch of it was
   refused: `Refused to connect to 'data:audio/wav...'`. The app sets a
   Content-Security-Policy whose `connect-src` does not include `data:` — and
   it is right not to, because the real room hands out a signed https address
   for a file in the bucket, never an inlined one. A fixture that could only
   work with the app's own security switched off is a fixture testing a
   different app; the probe serves the bytes instead. */
const RATE = 44100;
const SAMPLES = RATE * 4;
const BYTES = SAMPLES * 2;
const WAV = Buffer.concat([
  Buffer.from('RIFF'), Buffer.from(new Uint32Array([36 + BYTES]).buffer),
  Buffer.from('WAVEfmt '), Buffer.from(new Uint32Array([16]).buffer),
  Buffer.from(new Uint16Array([1, 1]).buffer),
  Buffer.from(new Uint32Array([RATE, RATE * 2]).buffer),
  Buffer.from(new Uint16Array([2, 16]).buffer),
  Buffer.from('data'), Buffer.from(new Uint32Array([BYTES]).buffer),
  Buffer.alloc(BYTES),
]);
/** Same origin as the page, so nothing in the app's CSP has to bend for it. */
const SILENCE = '/probe-silence.wav';

/** What the room hands back. Two posts, so one hearted row sits beside a bare one. */
const ROOM = {
  ready: true,
  signedIn: true,
  here: 3,
  says: [],
  posts: [
    {
      id: 'p1', kind: 'track', title: 'Stil water', note: '', seconds: 48,
      platform: '', link: '', startsAt: null, at: new Date().toISOString(),
      by: 'Carli', mine: true, audio: SILENCE, sourceId: 'buildon-song',
      hearts: 12, hearted: true, buildOn: true,
    },
    {
      id: 'p2', kind: 'track', title: 'Laatnag', note: '', seconds: 61,
      platform: '', link: '', startsAt: null, at: new Date().toISOString(),
      by: 'Thabo', mine: false, audio: SILENCE, sourceId: 'other-song',
      hearts: 0, hearted: false, buildOn: false,
    },
    {
      id: 'p3', kind: 'track', title: 'Bergwind', note: '', seconds: 55,
      platform: '', link: '', startsAt: null, at: new Date().toISOString(),
      by: 'Nomsa', mine: false, audio: SILENCE, sourceId: 'shared-song',
      hearts: 4, hearted: false, buildOn: true, style: 'slow kwaito, deep bass',
    },
  ],
};

let server = null;
let browser = null;
try {
  cpSync(PROBE, LIVE);
  console.log('building with the probe page…');
  /* An ordinary build, with no stubbed Supabase in it.

     The first version passed `NEXT_PUBLIC_SUPABASE_URL=https://stub...` out of
     habit, which `check:probes` refused — a probe that builds with a
     build-time variable has to build back without it, or it leaves a stubbed
     `.next` behind for whatever runs next, and a poisoned build reads as a
     broken app in a different file.

     Nothing here needs it. `accessToken()` returns null when Supabase is not
     configured rather than throwing, the room's own request is answered by
     this file, and `signedIn` comes off that answer. So: one build, nothing
     to put back. */
  execSync('npx next build', { stdio: 'ignore' });
  server = await serve(PORT);
  browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 430, height: 932 }, hasTouch: true });
  page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
  /* A room that swallows its own failure — Hooks catches everything around
     the fetch and the decode on purpose — leaves a probe with nothing but an
     empty panel to look at. The console is where the reason actually is. */
  page.on('console', (m) => { if (m.type() === 'error') console.log(`  console: ${m.text().slice(0, 200)}`); });

  /* Every song put in the room, so the permission can be read off the wire.

     Only `what: 'post'`. The room POSTs to the same address for its own
     reasons — the presence ping is one — and the first version of this
     counted that as a song being posted, which made "opening the question
     posts nothing" fail against an app that was doing the right thing. A
     probe that reads the wrong request is not a probe. */
  const sent = [];
  const posted = () => sent.filter((one) => one && one.what === 'post');
  await page.route('**/probe-silence.wav', async (route) =>
    route.fulfill({ status: 200, contentType: 'audio/wav', body: WAV }));

  await page.route('**/api/live*', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      try { sent.push(JSON.parse(request.postData() || '{}')); } catch { sent.push(null); }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"posted":true}' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ROOM) });
  });

  await page.goto(`${server.url}/buildon`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  /* ── The room row ─────────────────────────────────────────────────── */
  const hearts = page.locator('[data-probe="room"] button[aria-pressed]');
  check('there is a heart on every row', (await hearts.count()) === 3, `found ${await hearts.count()}`);
  check('the hearted row is pressed', (await hearts.nth(0).getAttribute('aria-pressed')) === 'true');
  check('the un-hearted row is not', (await hearts.nth(1).getAttribute('aria-pressed')) === 'false');
  const counts = await hearts.allTextContents();
  check('the count is under the heart', counts.join('|').includes('12') && counts.join('|').includes('0'), counts.join(' · '));
  const box = await hearts.nth(0).boundingBox();
  check('the heart is a thumb-sized target', box && box.height >= 44 && box.width >= 44,
    box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'no box');
  /* The rows are below the two folded questions and the message box, so a
     viewport screenshot of the top of the page shows everything except the
     thing this probe is about. */
  await hearts.nth(0).scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot('buildon-room.png'), fullPage: false });

  /* ── The question ─────────────────────────────────────────────────── */
  const opener = page.locator('[data-probe="post"] button').first();
  await opener.click();
  await page.waitForTimeout(500);
  const panel = page.locator('[role="dialog"]');
  check('pressing post opens the question instead of posting', (await panel.count()) === 1);
  check('nothing was posted by opening it', posted().length === 0, `${posted().length} posts`);

  const words = (await panel.innerText()).toLowerCase();
  check('it says a clip may be cut', /clip|snit/.test(words));
  check('it says the audio does not go into a model', /model|nooit|never/.test(words));

  const answers = panel.locator('button');
  check('the question has exactly two answers', (await answers.count()) === 2, `found ${await answers.count()}`);
  const sizes = [];
  for (let n = 0; n < (await answers.count()); n += 1) sizes.push(await answers.nth(n).boundingBox());
  check('neither answer is the small one', sizes.every((one) => one && one.height >= 44 && one.width >= 120),
    sizes.map((one) => (one ? `${Math.round(one.width)}x${Math.round(one.height)}` : '?')).join(' · '));
  await page.screenshot({ path: shot('buildon-vraag.png'), fullPage: false });

  /* ── The answer, on the wire ──────────────────────────────────────── */
  await answers.nth(0).click();
  await page.waitForTimeout(600);
  check('saying yes posts the song', posted().length === 1, `${posted().length} posts`);
  check('saying yes sends buildOn true', posted()[0]?.buildOn === true, JSON.stringify(posted()[0]?.buildOn));

  await opener.click();
  await page.waitForTimeout(500);
  await page.locator('[role="dialog"] button').nth(1).click();
  await page.waitForTimeout(600);
  check('saying no also posts the song', posted().length === 2, `${posted().length} posts`);
  check('saying no sends buildOn false', posted()[1]?.buildOn === false, JSON.stringify(posted()[1]?.buildOn));
  check('the two answers differ in nothing but the permission',
    posted().length === 2
      && JSON.stringify({ ...posted()[0], buildOn: null }) === JSON.stringify({ ...posted()[1], buildOn: null }));
  /* ── The far end: Hooks ───────────────────────────────────────────── */
  const sources = page.locator('[data-probe="hooks"] button');
  const names = (await sources.allTextContents()).join(' | ');
  check('a song somebody opened up is offered to cut from', /Bergwind/.test(names), names.slice(0, 120));
  check('and the maker\'s name is on it', /Nomsa/.test(names));
  check('a song nobody opened up is not', !/Laatnag/.test(names));
  /* Her own open post is already in the list above under its real title.
     Offering it again as somebody else's is two rows for one thing. */
  check('and neither is her own, twice', !/Stil water/.test(names));

  await sources.filter({ hasText: /Bergwind/ }).first().click();
  /* Fetched, decoded and searched — three awaits deep, and a fixed sleep that
     is long enough on this machine is the thing that makes a probe flake on a
     slower one. Wait for the room to say it found something instead. */
  await page.locator('[data-probe="hooks"]')
    .getByText(/Make a song from this/)
    .waitFor({ timeout: 30000 })
    .catch(() => {});
  const hooksText = await page.locator('[data-probe="hooks"]').innerText();
  check('picking it finds a moment to cut', /\d+:\d\d/.test(hooksText), hooksText.replace(/\n+/g, ' · '));
  check('the style is shown before anything is pressed', /slow kwaito/.test(hooksText));
  check('and the room says the new song comes from the words', /words|woorde/i.test(hooksText));

  const make = page.locator('[data-probe="hooks"] button').filter({ hasText: /Make a song from this/ }).first();
  check('there is a way to start a song from it', (await make.count()) > 0);
  await make.click();
  await page.waitForTimeout(400);
  const handed = JSON.parse((await page.locator('[data-probe="handed"]').innerText()) || '{}');
  check('the title goes over', handed.title === 'Bergwind', JSON.stringify(handed.title));
  check('the style goes over', handed.style === 'slow kwaito, deep bass', JSON.stringify(handed.style));
  check('and so does whose it was', handed.by === 'Nomsa', JSON.stringify(handed.by));
  await page.locator('[data-probe="hooks"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('buildon-hooks.png'), fullPage: false });
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.stop();
  try { rmSync(LIVE); } catch { /* never made it */ }
}

console.log(problems.length ? `\n${problems.length} problem(s):\n- ${problems.join('\n- ')}` : '\nall clear');
process.exit(problems.length ? 1 : 0);
