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

    /* ── What a brand-new member actually sees ──────────────────

       Two versions of these assertions were wrong before this one, and both
       in the same direction: they assumed something about the signed-in
       account rather than reading it.

       The first expected the row she typed to score HIGH, reasoning that
       the topics typed with it are the ones she works in. It came back 16%:
       the score is her topics against the SHOW's, and hers come off what
       the account has actually released. The second expected it to be
       scored at all, and six percentages came back as six noughts — because
       the account this probe signs up has released nothing, and a profile
       built on nothing has no topics to compare with.

       That is the honest state of this panel for every new member, so it is
       what the probe reads: every row a dash, the sentence saying what
       would give it a number, and the heading admitting there is nothing
       released yet. `check:radar` holds the scored case against a fixture
       it controls, which is where arithmetic belongs; a browser is here to
       say what is on the screen.

       The nought-per-cent bars this replaced were the fault rather than the
       passing. A bar at nought beside all five shows says "measured, and
       all five are a bad fit", which is a verdict on a fit nothing has been
       measured about — and before today this account was quietly profiled
       on FUTUREBOX's own song, its genre, its tags and its model stack, so
       five shows were ranked against a record she had no part in under the
       heading of her own profile. */
    const pct = (await page.locator('span')
      .filter({ hasText: /^[0-9]{1,3}%$/ }).allInnerTexts().catch(() => []))
      .map((one) => Number(one.replace('%', '')))
      .filter(Number.isFinite);
    check('    and a member who has released nothing is given no percentages',
      pct.length === 0,
      `${JSON.stringify(pct)} — a profile built on nothing has nothing to`
      + ' compare with, and a number drawn from it is a number about nothing');

    check('      and is told what would give them one',
      (await page.getByText(/Nothing of yours to compare/i).count()) > 0,
      'a row of dashes with no sentence beside it reads as a panel that'
      + ' failed to load rather than as a question nobody has answered yet');

    check('      and the heading says there is nothing released yet',
      (await page.getByText(/nothing released yet/i).count()) > 0,
      'the heading says matches are worked out from what you have released,'
      + ' so on an account with nothing on it that sentence has to finish'
      + ' itself honestly');

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
  '\ncheck:radarkeep — a show she types into the Radar lands on the list'
  + ' marked as hers, is still there after a reload, and is gone for good once'
  + ' she takes it off — and an account with nothing released gets dashes and'
  + ' a sentence rather than five percentages about nothing.',
);
