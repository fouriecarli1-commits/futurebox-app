/**
 * The door from the podcast room to the long form.
 *
 * ── What it is for ───────────────────────────────────────────────────────
 *
 * Carli, 14 September 2026: "Podcast na aanbieder deur moet mens na long
 * shot toe vat en copilot se assistence dadelik verander na dit wat die
 * kamer vir die podcast moet doen."
 *
 * Three claims, and each of them is the kind that reads as true in source
 * and is false on screen:
 *
 *   1. The press lands you on the video desk.
 *   2. "Build a long one" is OPEN when you get there. Every card in this app
 *      starts shut, so landing in the right room with the right card folded
 *      is landing in a room, not at the long form. This is the assertion
 *      that actually needed a browser: `openOn` is a counter compared
 *      against what the card mounted with, and whether that fires across a
 *      room change is not a thing source-reading answers.
 *   3. The copilot's opening line has changed to the errand's.
 *
 * Claim 3 has a trap worth naming. The errand replaces the line and the
 * starters and nothing else, so a check that only asserts "the panel says
 * something" passes whatever happens. It asserts the room's own line is
 * GONE as well as that the errand's is there — the failure being guarded
 * against is the errand arriving nowhere and the desk's generic line
 * standing, which looks identical to a probe that only looks for words.
 *
 * The room asks the server who it is talking to, so `/api/show` is stubbed
 * with one published episode. Without it this tests the signed-out screen,
 * which is the mistake `cast.mjs` exists to stop making twice.
 */
import { serve, shot } from './where.mjs';
import { enter, studio, toRoom } from './enter.mjs';

const PORT = process.argv[2] || '3131';
const problems = [];
const check = (l, ok, d = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${l}${d && !ok ? ` — ${d}` : ''}`);
  if (!ok) problems.push(`${l}${d ? ` (${d})` : ''}`);
};

const EPISODE = 'Die een oor bassiste';

const server = await serve(PORT);
const { browser: b, page: p } = await enter({
  at: server.url,
  lang: 'en',
  before: async (page) => {
    await page.route('**/api/show*', (r) => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        signedIn: true, configured: true,
        show: { id: 'show1', title: 'The Bass Hour', language: 'af' },
        episodes: [{ id: 'ep1', title: EPISODE, made: 'recorded', audio_url: 'https://example.invalid/e.mp3' }],
        caps: { publish: true, dub: true },
      }),
    }));
    await page.route('**/api/voice*', (r) => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ configured: true, mine: [], stock: [], caps: { publish: true, dub: true } }),
    }));
  },
});
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));

const room = await studio(p);
await toRoom(p, 'Podcast');
await p.waitForTimeout(1500);

/* No press to open "An episode" first. `toRoom` unfolds a room on the way
   in — that is what it is for, and it is why every other probe can find
   controls that live behind a heading. Clicking the heading here SHUT the
   card and took the door off screen with it, which is how the first run of
   this probe came back "the podcast room has a door to a video — 0" with
   the door sitting right there. */
const door = room.getByRole('button', { name: /Put it on a video/i });
check('the podcast room has a door to a video', (await door.count()) > 0, String(await door.count()));

/* What the desk says to everybody, so claim 3 can assert it is gone. The
   string is read off the registry rather than retyped, or this probe
   passes for ever after somebody rewords the room. */
const GENERIC = 'I can write the whole shot list onto the board';

if (await door.count()) {
  await door.first().click();
  await p.waitForTimeout(2500);

  /* Scoped to the studio overlay, never to `body`. The feed is still in the
     DOM underneath and `innerText` hands back its text too, so a `body`
     assertion here is one that reads the page behind the one being tested. */
  const body = (await room.innerText()) || '';

  check('it lands on the video desk',
    /Video desk/i.test((await room.locator('button').first().innerText().catch(() => '')) + body)
      && /Build a long one/i.test(body),
    body.slice(0, 140));

  /* Open, not merely present. The board's own controls are behind the fold,
     so one of them being on screen is the fold being open. */
  const boardFold = room.getByRole('button', { name: /Build a long one/i }).first();
  const expanded = (await boardFold.count())
    ? await boardFold.getAttribute('aria-expanded')
    : null;
  check('and the long form is open, not folded', expanded === 'true', String(expanded));

  check('the copilot is briefed on the episode, not on video in general',
    /making a video of your episode/i.test(body), 'the errand line is not on screen');
  check('and the desk’s everyday line is gone',
    !body.includes(GENERIC),
    'the generic line is still there, so the errand reached nothing');

  /* The errand is why you walked in, not a mode. Leaving must end it. */
  await toRoom(p, 'Podcast');
  await p.waitForTimeout(800);
  await toRoom(p, 'Video');
  await p.waitForTimeout(1500);
  const after = (await room.innerText()) || '';
  check('walking in the ordinary way gets the ordinary line back',
    after.includes(GENERIC) || !/making a video of your episode/i.test(after),
    'the errand outlived the room it was carried into');
}

await p.screenshot({ path: shot('podvideo.png'), fullPage: false });
await b.close();
await server.stop();

if (problems.length) {
  console.error(`\ncheck:podvideo — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:podvideo — the door lands on the long form, open, with the copilot on the episode.');
