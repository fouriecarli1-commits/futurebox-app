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
import { shot } from './where.mjs';

const PORT = process.argv[2] || '3020';
const af = process.argv[3] === 'af';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${label}: ${ok}`);
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

await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
const cta = p.locator('button, a').filter({ hasText: af ? /begin|gratis|teken/i : /start free|begin|sign up/i }).first();
await cta.waitFor({ state: 'visible', timeout: 40000 });
await cta.click();
await p.waitForTimeout(700);
await p.locator('input[type="email"]').first().fill('toets@futurebox.test');
const pw = p.locator('input[type="password"]').first();
if (await pw.count()) await pw.fill('toets-wagwoord-1234');
await p.locator('button[type="submit"]').first().click();
await p.waitForTimeout(2500);
await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
await p.waitForTimeout(1800);
const room = p.locator('div.fixed.inset-0.z-50').first();

// ── The studio, opened on its own ────────────────────────────────────────
await room.locator('button').filter({ hasText: af ? /^Studio/ : /^Studio/ }).first().click();
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
const named = await room.locator('input.font-bold').evaluateAll((nodes) =>
  nodes.map((node) => node.value),
);
check('and it still shows the sections', named.length === 3, named.join(','));
check('with the names off the lyric sheet',
  named.join(',') === 'Verse,Chorus,Verse', named.join(','));

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

const onTimeline = await room.locator('input.font-bold').evaluateAll((nodes) =>
  nodes.map((node) => node.value),
);
check('pressing it lands on the timeline', onTimeline.length > 0, onTimeline.join(','));
const chosenTitle = await room.locator('select').first().inputValue().catch(() => '');
check('and on that song, not the top of the list',
  ['song-with-plan', 'song-no-plan'].includes(chosenTitle), chosenTitle);

await p.screenshot({ path: shot(`studioroute-${af ? 'af' : 'en'}.png`), fullPage: true });
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
