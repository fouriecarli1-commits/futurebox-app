/**
 * A cover drawn by Google arrives in one answer, and the panel takes it.
 *
 * The owner, 22 October 2026: covers through Google's image model, the way
 * a song made in Gemini comes back with a sleeve that shows the song. That
 * route answers `state: 'done'` with the picture already kept, and no job
 * id — and a panel that only knew how to poll would read that as a failure
 * and say "The cover could not be made" over a picture that was paid for.
 *
 * Stubbed: one song, and the cover endpoint. The panel, its buttons and
 * what it says are real.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const PORT = process.argv[2] || '3098';
const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const SONG = {
  id: 'googlecover-1',
  title: 'Nagrit Deur Die Karoo',
  genre: 'Synthwave',
  bpm: 100,
  key: 'A Minor',
  lyrics: '[Verse 1]\nOns ry deur die nag\n[Chorus]\nDie sterre brand\n',
  style: 'retro neon',
  models: ['Backing'],
  source: 'engine',
  seconds: 12,
  createdAt: '2026-10-22T10:00:00.000Z',
  seed: 7,
};

let made = false;
let bought = false;
let posted = null;
let polled = 0;

const server = await serve(PORT);
const { browser, page, problems } = await enter({
  at: server.url,
  width: 390,
  height: 844,
  touch: true,
  before: async (p) => {
    await p.addInitScript(([key, songs]) => {
      try { window.localStorage.setItem(key, JSON.stringify(songs)); } catch { /* storage off */ }
    }, ['futurebox.tracks.v1', [SONG]]);
    await p.route('**/api/cover**', (route) => {
      const request = route.request();
      const url = request.url();
      if (request.method() === 'POST') {
        posted = JSON.parse(request.postData() || '{}');
        made = true;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: 'done', url: PIXEL, kept: true, engine: 'google' }) });
      }
      if (/[?&]id=/.test(url)) polled += 1;
      const body = /[?&]tracks=/.test(url)
        ? '{"covers":{}}'
        : bought
          ? JSON.stringify({ state: 'done', url: PIXEL, kept: true, bought: true, credit: { title: 'Rooi Aarde', by: 'Lize Botha' } })
          : made ? JSON.stringify({ state: 'done', url: PIXEL, kept: true }) : '{"state":"none","pending":false}';
      return route.fulfill({ status: 200, contentType: 'application/json', body });
    });
  },
});

const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok && !problems.includes(label)) problems.push(label);
};

try {
  await studio(page);
  await toRoom(page, 'Make');
  await page.waitForTimeout(800);
  /* The card for this song, not the first card on the screen: the room
     also shows a song of its own, with no words. */
  const coverButton = page.locator('button').filter({ hasText: /^(Cover art|Omslagkuns)$/ });
  const card = page.locator('div').filter({ hasText: SONG.title }).filter({ has: coverButton }).last();
  const cover = card.locator('button').filter({ hasText: /^(Cover art|Omslagkuns)$/ }).first();
  check('the song offers Cover art', (await cover.count()) > 0);
  if ((await cover.getAttribute('aria-expanded')) !== 'true') await cover.click();
  const makeIt = card.locator('button').filter({ hasText: /credits|krediete/ }).filter({ hasNotText: /Another|Nog een/ }).first();
  await makeIt.waitFor({ state: 'visible', timeout: 15000 });
  await makeIt.click();
  await page.waitForTimeout(1500);

  check('the panel sends the song’s words and the name choice with the request',
    Boolean(posted?.words?.includes('Ons ry deur die nag')) && posted?.named === true && posted?.title === SONG.title,
    JSON.stringify(posted));
  const said = await page.locator('body').innerText();
  check('the picture arrives at once, saved, with no "could not be made"',
    /cover now|omslag nou/i.test(said) && !/could not be made|kon nie gemaak word nie/i.test(said),
    said.slice(0, 300));
  check('  and nothing waits on a job that does not exist', polled === 0, `${polled} poll(s)`);
  check('  and the picture is on the panel', (await page.locator(`img[src="${PIXEL}"]`).count()) > 0);

  /* ── Kept: the cover is offered movement, with its price ────────────
     The owner, 27 October 2026: *"bou notifications in wat vra of hulle
     nie iets met die image wil doen nie"* (`lib/ideas.ts`). */
  await page.waitForTimeout(1600);
  const idea = page.locator('[data-idea="coverKept"]');
  check('a kept cover asks whether it should move', (await idea.count()) === 1);
  check('  with the price on the offer', /credit|krediet/i.test(await page.locator('[data-ideago="alive"]').innerText().catch(() => '')));
  if (process.argv[3]) {
    await idea.scrollIntoViewIfNeeded().catch(() => undefined);
    await page.screenshot({ path: `${process.argv[3]}/cover-idea.png` });
  }
  await page.locator('[data-ideago="alive"]').click();
  await page.waitForTimeout(400);
  check('  and a yes opens Wake it up there, asking the two questions first',
    (await page.locator('[data-wakesheet] [data-becomeyes]').count()) === 1);
  if (process.argv[3]) await page.screenshot({ path: `${process.argv[3]}/cover-wake.png` });

  /* ── A piece bought from an artist ──────────────────────────────────
     The owner, 22 October 2026: the artist's name and the piece's name were
     still missing on a bought cover. The panel on the song is where she
     looks, and it now carries the credit on the picture. */
  bought = true;
  await page.reload();
  await page.waitForTimeout(1500);
  await toRoom(page, 'Make');
  await page.waitForTimeout(800);
  const card2 = page.locator('div').filter({ hasText: SONG.title }).filter({ has: coverButton }).last();
  const cover2 = card2.locator('button').filter({ hasText: /^(Cover art|Omslagkuns)$/ }).first();
  if ((await cover2.getAttribute('aria-expanded')) !== 'true') await cover2.click();
  const tag = card2.locator('[data-arttag]').first();
  await tag.waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);
  const credit = (await tag.textContent().catch(() => '')) ?? '';
  check('a bought cover carries the piece’s name and its artist on the picture',
    credit.includes('Rooi Aarde') && credit.includes('Lize Botha'), credit || 'no credit drawn');
  check('  and offers no "Another" that would draw a cover the bought one hides',
    (await card2.locator('button').filter({ hasText: /^(Another|Nog een) \u2014/ }).count()) === 0,
    (await card2.locator('button').filter({ hasText: /^(Another|Nog een) \u2014/ }).allTextContents()).join(' | ') + ' // tags: ' + (await card2.locator('[data-arttag]').count()));
  check('  and is never offered movement: the piece is the artist\u2019s', (await page.locator('[data-idea]').count()) === 0);
} catch (error) {
  problems.push(String(error));
  console.log(`  FAIL ${error}`);
} finally {
  await browser.close();
  await server.stop();
}

console.log(problems.length ? `\ngooglecover: ${problems.length} problem(s).` : '\ngooglecover: a Google cover lands in one answer and the panel keeps it.');
process.exit(problems.length ? 1 : 0);
