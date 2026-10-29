/**
 * A song's cover, moving: pressed, agreed to, made, kept, played, and taken off.
 *
 * The owner, 29 October 2026: *"Gaan aan met die moving cover."* The engine
 * is not called: `/api/cover` answers that the song has a kept cover, and
 * `/api/cover/loop` answers a ticket and then a clip, the way the route does.
 *
 *   node audit/coverloop.mjs [port]
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const PORT = Number(process.argv[2] || 3492);
const SONG = {
  id: 'loop-1', title: 'Lig oor die Karoo', genre: 'Amapiano', bpm: 112, key: 'A Minor',
  lyrics: '[Verse 1]\nDie eerste reël\n', style: 'warm, late night', models: ['Backing'],
  source: 'engine', seconds: 12, createdAt: '2026-09-01T10:00:00.000Z', seed: 7,
};
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const server = await serve(PORT);
const asked = { started: 0, removed: 0 };
const { browser, page, problems } = await enter({
  at: server.url, width: 390, height: 844, touch: true,
  before: async (p) => {
    await p.addInitScript(([key, song]) => {
      try { window.localStorage.setItem(key, JSON.stringify([song])); } catch { /* */ }
    }, ['futurebox.tracks.v1', SONG]);
    await p.route('**/api/cover**', (route) => {
      const url = route.request().url();
      const body = /[?&]tracks=/.test(url) ? '{"covers":{}}' : JSON.stringify({ state: 'done', url: PIXEL, kept: true });
      return route.fulfill({ status: 200, contentType: 'application/json', body });
    });
    /* Registered after, so it answers first for the loop's own address. */
    await p.route('**/api/cover/loop**', (route) => {
      const req = route.request();
      if (req.method() === 'POST') { asked.started += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ticket: 'probe-loop', credits: 12 }) }); }
      if (req.method() === 'DELETE') { asked.removed += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); }
      if (/[?&]ticket=/.test(req.url())) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: 'done', url: `${server.url}/probe-loop.mp4` }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"url":null}' });
    });
    await p.route('**/probe-loop.mp4', (route) => route.fulfill({ status: 200, contentType: 'video/mp4', body: Buffer.alloc(64) }));
  },
});
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok && !problems.includes(label)) problems.push(label);
};

try {
  await studio(page);
  await toRoom(page, 'Channel');
  await page.waitForTimeout(800);
  const cover = page.locator('button').filter({ hasText: /^(Cover art|Omslagkuns)$/ }).first();
  await cover.waitFor({ state: 'visible', timeout: 30000 });
  if ((await cover.getAttribute('aria-expanded')) !== 'true') { await cover.click(); await page.waitForTimeout(1200); }

  const go = page.locator('[data-coverloopgo]').first();
  await go.waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);
  const says = (await go.innerText().catch(() => '')).replace(/\s+/g, ' ');
  check('a kept cover offers to move, with its price on the button', /move/i.test(says) && /12 credits/.test(says), says);
  await go.click();
  await page.waitForTimeout(500);
  check('  the first time, it asks the two yeses before anything is sent', (await page.locator('[data-becomeyes]').count()) === 1 && asked.started === 0);
  await page.locator('[data-becomeabroad]').check();
  await page.locator('[data-becomeadult]').check();
  await page.locator('[data-becomeyesgo]').click();
  await page.waitForTimeout(7000);
  check('  then it is made, once', asked.started === 1, String(asked.started));
  check('  and the cover plays, moving, in place of the still', (await page.locator('video[data-coverloopplays]').count()) === 1);
  await page.locator('[data-coverloopoff]').click();
  await page.waitForTimeout(600);
  check('"Back to the still cover" takes the motion off', asked.removed === 1 && (await page.locator('video[data-coverloopplays]').count()) === 0);
} catch (problem) {
  check('the walk itself', false, String(problem).slice(0, 300));
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\naudit/coverloop — ${problems.length} problem(s).`);
  process.exit(1);
}
console.log('\naudit/coverloop — a kept cover moves on a priced press, after the two yeses, and goes back to still.');
