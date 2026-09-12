/**
 * From a song on the channel to that song on the timeline, in one press.
 *
 * Two complaints, one run. The channel offered nothing to do *to* a song — one
 * button, "put a video to it" — and the studio turned away every song that did
 * not carry a composition plan, which is every song made before plans were
 * carried and every one whose words were written by hand. Between them, a
 * person with songs and a room called Studio had no way to edit anything.
 *
 * The songs are seeded into the library the app actually reads, one with a
 * plan and one with only words, because the second is the case that was
 * refused.
 */
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';
import { studio, toRoom, unfold } from './enter.mjs';

const PORT = process.argv[2] || '3020';
const af = process.argv[3] === 'af';

const b = await chromium.launch(launchOptions());
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));

const WORDS = '[Verse]\nDie pad is lank vanaand\nEn die ligte brand nog aan\n[Chorus]\nHou vas, hou vas\nDie oggend kom\n[Verse]\nNiemand weet waarheen\nMaar ons ry aan\n';

await p.addInitScript(({ lang, words }) => {
  try {
    window.localStorage.setItem('futurebox.lang.v1', lang);
    /* Two songs, and the difference between them is the point.

       "Met plan" carries `parts`, the way a song made through the make screen
       does. "Sonder plan" has words and no plan, which is what the studio used
       to refuse — and there is no way to make one through the UI any more, so
       it is seeded rather than built. */
    window.localStorage.setItem(
      'futurebox.tracks.v1',
      JSON.stringify([
        {
          id: 'song-with-plan', title: 'Met plan', genre: 'Afrikaans', bpm: 96, key: 'Am',
          lyrics: words, style: 'warm, acoustic', models: [], source: 'engine',
          seconds: 120, createdAt: new Date().toISOString(), seed: 1,
          parts: [
            { name: 'Verse', lines: ['Die pad is lank vanaand', 'En die ligte brand nog aan'], seconds: 40 },
            { name: 'Chorus', lines: ['Hou vas, hou vas', 'Die oggend kom'], seconds: 40 },
            { name: 'Verse', lines: ['Niemand weet waarheen', 'Maar ons ry aan'], seconds: 40 },
          ],
        },
        {
          id: 'song-no-plan', title: 'Sonder plan', genre: 'Afrikaans', bpm: 100, key: 'C',
          lyrics: words, style: 'sparse, late', models: [], source: 'engine',
          seconds: 90, createdAt: new Date().toISOString(), seed: 2,
        },
      ]),
    );
  } catch {}
}, { lang: af ? 'af' : 'en', words: WORDS });

/* ── Its own server, on its own port ─────────────────────────────────────

   This went to a port it did not start and hoped somebody had left a server
   there. That is the fault `serve()` exists to fix, and it is the reason this
   probe sat in the waiting list: it passed on the machine it was written on
   and could not run anywhere else. */
const server = await serve(PORT);

await p.goto(server.url, { waitUntil: 'networkidle' });
const cta = p.locator('button, a').filter({ hasText: af ? /begin|gratis|teken/i : /start free|begin|sign up/i }).first();
await cta.waitFor({ state: 'visible', timeout: 40000 });
await cta.click();
await p.waitForTimeout(700);
await p.locator('input[type="email"]').first().fill('toets@futurebox.test');
const pw = p.locator('input[type="password"]').first();
if (await pw.count()) await pw.fill('toets-wagwoord-1234');
await p.locator('button[type="submit"]').first().click();
  /* Waited for, not slept through.

   `waitForTimeout(2500)` is how long signing in takes on an idle machine.
   On a loaded one it is sometimes not enough, and the probe then measures
   the signed-out page while believing it is signed in — which is not a
   probe failing, it is a probe answering a different question and
   reporting the answer as a fault. The bottom bar exists on every screen
   the app shows a signed-in person and on none that it shows a signed-out
   one. */
await p
  .locator('nav[aria-label]')
  .first()
  .waitFor({ state: 'visible', timeout: 30000 })
  .catch(() => undefined);
await p.waitForTimeout(400);
/* Through the door, the way a person gets there.

   The studio opens on its own front door — a layer above it — so clicking a
   room button on the studio underneath is clicking through an overlay, and
   Playwright waits thirty seconds and then says the door "intercepts pointer
   events". `studio()` dismisses it and `toRoom()` presses the room on
   whichever of the two is actually in front. */
const room = await studio(p);

// ── The studio, opened on its own ────────────────────────────────────────
await toRoom(p, 'Studio');
await p.waitForTimeout(1500);

const options = await room.locator('select option').allInnerTexts();
check('the song that carries a plan is offered', options.includes('Met plan'), options.join(','));
check('the song with only words is offered too', options.includes('Sonder plan'), options.join(','));
check('it does not say there is nothing to lay out',
  !/No song to lay out|Geen snit om uit te l/i.test(await room.innerText()));

// The one with a plan says nothing about estimates; the one without says so.
await room.locator('select').first().selectOption({ label: 'Met plan' });
await p.waitForTimeout(1200);
check('a carried plan is not called an estimate',
  !(af ? /uit die woorde uitgewerk/ : /worked out from the words/).test(await room.innerText()));

await room.locator('select').first().selectOption({ label: 'Sonder plan' });
await p.waitForTimeout(1200);
const guessed = await room.innerText();
check('a song without a plan says its times are worked out from the words',
  (af ? /uit die woorde uitgewerk/ : /worked out from the words/).test(guessed));

/* Section names live in inputs, so they are read as values, not as text.

   The first version of this matched `innerText` and passed in English for the
   wrong reason entirely — "This second verse is weak" is one of the copilot's
   starter prompts, sitting in the panel beside the room. The Afrikaans run
   said "vers" instead and failed, which is the only reason anybody looked. */
/** The section names on screen, in order. */
const sectionNames = async () =>
  room.locator('input.font-bold').evaluateAll((nodes) => nodes.map((node) => node.value));

/* ── The two songs are two different cases, and the room treats them so ──

   This used to read the sections without choosing a song, and expected the
   carried plan. The room now opens on the *second* song — the one with only
   words — and lays it out with an intro and an outro around the sung parts,
   because `splitSections` hands the words to `shapeSong` and that is what a
   song shape is. The old assertion was not catching a fault; it was reading
   the other song.

   So each case is asked for by name. That is the whole point of this file:
   "Met plan" is a song made through the make screen, "Sonder plan" is every
   song written by hand or made before plans were carried, and the second is
   the one the studio used to turn away entirely. */
const chooser = room.locator('select').first();

await chooser.selectOption('song-with-plan');
await p.waitForTimeout(800);
const carried = await sectionNames();
check('a song that carries a plan is laid out on that plan', carried.length === 3, carried.join(','));
check('with the names it was made with, and nothing added',
  carried.join(',') === 'Verse,Chorus,Verse', carried.join(','));

await chooser.selectOption('song-no-plan');
await p.waitForTimeout(800);
const shaped = await sectionNames();
check('a song with only words is laid out too, rather than turned away',
  shaped.length > 0, shaped.join(','));
check('its sung parts are the ones in the lyric sheet, in order',
  shaped.filter((one) => /^(Verse|Chorus)$/i.test(one)).join(',') === 'Verse,Chorus,Verse',
  shaped.join(','));
check('and the shape around them is a real one, with an intro and an outro',
  shaped[0] === 'Intro' && shaped[shaped.length - 1] === 'Outro',
  shaped.join(','));
const named = shaped;

// ── From the channel ─────────────────────────────────────────────────────
await room.locator('button').filter({ hasText: af ? /^Kanaal/ : /^Channel/ }).first().click();
await p.waitForTimeout(1500);
const edit = room.locator('button').filter({ hasText: af ? /Maak dit in die studio oop/ : /Open it in the studio/ });
check('every song on the channel has a way into the studio', (await edit.count()) === 2, String(await edit.count()));

// The second card is "Sonder plan" — newest first puts it at the top, so take
// whichever card carries that title and press its own button.
const cards = room.locator('article');
const titles = await cards.locator('p.font-bold, p.text-base').allInnerTexts().catch(() => []);
const which = (await cards.count()) > 1 ? 1 : 0;
await cards.nth(which).locator('button').filter({ hasText: af ? /Maak dit in die studio oop/ : /Open it in the studio/ }).first().click();
await p.waitForTimeout(1800);

/* Opened, because this arrival is not through `toRoom`.
 
   The press above is the channel's own "Open it in the studio", which is
   the path a person takes and which nothing unfolds for. Every card starts
   shut now, so the song picker this last assertion reads was simply not on
   the screen — `inputValue()` threw, the catch turned it into an empty
   string, and an empty string is not one of the two song ids. */
await unfold(p);

const onTimeline = await room.locator('input.font-bold').evaluateAll((nodes) =>
  nodes.map((node) => node.value),
);
check('pressing it lands on the timeline', onTimeline.length > 0, onTimeline.join(','));
const chosenTitle = await room.locator('select').first().inputValue().catch(() => '');
check('and on that song, not the top of the list',
  ['song-with-plan', 'song-no-plan'].includes(chosenTitle), chosenTitle);

await p.screenshot({ path: shot(`studioroute-${af ? 'af' : 'en'}.png`), fullPage: true });
await b.close();
await server.stop();

if (problems.length) {
  console.error(`\ncheck:studioroute — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:studioroute — every assertion in this file holds.');
