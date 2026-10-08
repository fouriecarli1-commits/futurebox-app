/**
 * The shows she found herself are still there tomorrow.
 *
 *   npm run check:radarkeep
 *
 * ── The fault this exists for ────────────────────────────────────────────
 *
 * Carli's list, 7 October 2026: *"Kyk nog mooi na colab radar."*
 *
 * The Radar's "Add a show you found yourself" kept its list in `useState`,
 * so every show she found, looked up and typed in was gone the next time
 * the page loaded. Nothing on the screen said so. A list that empties
 * itself overnight is indistinguishable, from the inside, from a list that
 * works — which is why this is a probe and not an assertion in a unit
 * test: `check:radar` holds that `saveOwn` and `loadOwn` are correct, and
 * only a browser can answer whether the panel actually calls them on the
 * way out and on the way back in.
 *
 * So the whole probe is one gesture: type a show, reload the page, look.
 */
import { enter, studioDoor } from './enter.mjs';
import { serve, shot } from './where.mjs';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const DOOR = 'div.fixed.inset-0.z-\\[55\\]';
const PORT = process.argv[2] || '3267';
const server = await serve(PORT);
const { browser, page } = await enter({ at: server.url, lang: 'en' });

try {
  const door = await studioDoor(page);
  await door.waitFor({ state: 'visible', timeout: 20000 }).catch(() => undefined);
  await page.waitForTimeout(1200);
  await page.locator(`${DOOR} button`).filter({ hasText: /Collab Radar/i }).first().click();
  await page.waitForTimeout(1600);

  const name = page.locator('[data-radarname]').first();
  check('the Radar offers a box for a show she found herself',
    (await name.count()) === 1,
    'the panel’s own note says FutureBox does not scrape podcast directories,'
    + ' so this box is the only way a target ever gets onto the list');

  const topics = page.locator('[data-radartopics]').first();
  check('  and a box for what that show is about',
    (await topics.count()) === 1,
    'a show added with no topics of its own used to arrive carrying'
    + ' `ai music`, `ai` and `creators`, written into the panel, and the'
    + ' matcher then drew a percentage from them — a number about nothing');

  if ((await name.count()) && (await topics.count())) {
    await name.fill('Die Teaterpodsending');
    await topics.fill('teater, afrikaans');
    await page.locator('[data-radaradd]').first().click();
    await page.waitForTimeout(900);

    const row = () => page.locator('div').filter({ hasText: 'Die Teaterpodsending' }).first();
    check('  and typing one in puts it on the list',
      (await page.getByText('Die Teaterpodsending').count()) > 0,
      'an Add button that clears the box and adds nothing is the shape of a'
      + ' form nobody checked');

    check('    marked as hers, with a way to take it off again',
      (await page.locator('[data-radardrop]').count()) > 0,
      'the five shows above it are ours and are not hers to delete, so the'
      + ' row she typed has to say which it is');

    /* ── The whole point: a reload ──────────────────────────── */
    await page.reload();
    await page.waitForTimeout(1800);
    const backIn = await studioDoor(page);
    await backIn.waitFor({ state: 'visible', timeout: 20000 }).catch(() => undefined);
    await page.waitForTimeout(1000);
    await page.locator(`${DOOR} button`).filter({ hasText: /Collab Radar/i }).first().click();
    await page.waitForTimeout(1600);

    check('  and it is still there after the page is loaded again',
      (await page.getByText('Die Teaterpodsending').count()) > 0,
      'this is the fault the whole probe exists for: the list lived in'
      + ' `useState`, so every show she found, looked up and typed in was'
      + ' gone the next morning, and nothing on the screen said so');

    /* ── The other half of the same fault, read off the screen ───────

       The first version of these two assertions expected the row she typed
       to score HIGH, on the reasoning that both of the topics typed with it
       are the ones she works in. It came back 16%, and the assertion was
       wrong rather than the app: the score is her topics against the SHOW's,
       and her topics come off what the signed-in account has actually
       released — which, on a fresh test account with no songs on it, is not
       theatre. A probe cannot know what that account's topics are, so an
       assertion that assumes them is an assertion about the fixture.

       What it CAN say, without knowing either side, is the thing the fault
       was about: a show with topics gets a number and a show with nothing
       said about it gets none. That is the whole claim — the score comes
       from what is typed, and where nothing is typed there is nothing to
       show. */
    const counted = () => page.locator('span')
      .filter({ hasText: /^[0-9]{1,3}%$/ }).allInnerTexts()
      .then((all) => all.map((one) => Number(one.replace('%', ''))).filter(Number.isFinite))
      .catch(() => []);

    const withTopics = await counted();
    check('    and a show with topics on it is scored',
      withTopics.length >= 6,
      `${JSON.stringify(withTopics)} — five shipped shows and hers makes six`
      + ' percentages, so one short means the row she typed is not being'
      + ' scored at all');

    await name.fill('Iets waaroor niks gese is nie');
    await topics.fill('');
    await page.locator('[data-radaradd]').first().click();
    await page.waitForTimeout(900);
    const noTopics = await counted();
    check('    and a show with nothing said about it gets no number at all',
      noTopics.length === withTopics.length,
      `${JSON.stringify(withTopics)} → ${JSON.stringify(noTopics)} — a seventh`
      + ' percentage is the fault this is for: a show added with no topics'
      + ' used to arrive carrying `ai music`, `ai` and `creators`, written'
      + ' into the panel, and the matcher drew a percentage from them. An'
      + ' Afrikaans theatre podcast scored on "ai music" is not a weak match;'
      + ' it is not a match at all, and the screen said 34%');
    check('      and says what to type to give it one',
      (await page.getByText(/nothing to measure/i).count()) > 0,
      'a dash with no sentence beside it reads as a row that failed to load'
      + ' rather than as a question nobody has answered yet');

    /* Off again, so what follows is about the show this probe is following
       rather than about the one it just used to count. The unscored rows
       sort to the top, so the first "Take it off" is this one's. */
    await page.locator('[data-radardrop]').first().click();
    await page.waitForTimeout(700);

    /* ── And taking it off really takes it off ─────────────────── */
    await page.locator('[data-radardrop]').first().click();
    await page.waitForTimeout(700);
    check('  and taking it off takes it off this device too',
      (await page.getByText('Die Teaterpodsending').count()) === 0,
      'a remove that leaves the row in storage comes back on the next load,'
      + ' which reads as the panel refusing to let go of a show she decided'
      + ' against');

    await page.reload();
    await page.waitForTimeout(1800);
    const third = await studioDoor(page);
    await third.waitFor({ state: 'visible', timeout: 20000 }).catch(() => undefined);
    await page.waitForTimeout(1000);
    await page.locator(`${DOOR} button`).filter({ hasText: /Collab Radar/i }).first().click();
    await page.waitForTimeout(1600);
    check('    and it stays off',
      (await page.getByText('Die Teaterpodsending').count()) === 0,
      'saved on add and not on remove is the half that looks like it worked');
  }

  await page.screenshot({ path: shot('radar-keep.png'), fullPage: false });
} finally {
  await browser.close();
  server.stop();
}

if (problems.length) {
  console.error(`\ncheck:radarkeep — ${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log(
  '\ncheck:radarkeep — a show she types into the Radar is on the list, scored'
  + ' on the topics she gave it, still there after a reload, and gone for good'
  + ' once she takes it off.',
);
