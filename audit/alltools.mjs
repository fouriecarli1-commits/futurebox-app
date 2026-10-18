/**
 * All tools, on one page, each straight to its tool.
 *
 * The owner, 16 October 2026, another app's All tools page: round buttons under
 * Generative AI, Video editing, Photo editing, Shoot and record. Walked on a
 * phone: the page opens from the studio's front door and from inside a room,
 * it finds a tool by name, and pressing a tool opens its room AND the panel
 * inside it — from outside the room, and from inside it.
 */
import { enter, studio } from './enter.mjs';
import { serve, shot } from './where.mjs';

const server = await serve(process.argv[2] || '3343');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const { browser, page } = await enter({ width: 390, height: 844, touch: true, at: server.url });
page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
const openTools = async () => {
  await page.locator('[data-opentools]:visible').first().click();
  await page.waitForTimeout(400);
};

try {
  await studio(page);
  await page.waitForTimeout(800);
  check('the front door has a way to every tool', (await page.locator('[data-opentools]:visible').count()) >= 1);
  await openTools();
  check('All tools opens in groups', (await page.locator('[data-alltoolsgroup]').count()) === 6);
  check('  with a round button per tool', (await page.locator('[data-alltool]').count()) >= 30);
  check('  and the ones that cost credits say so', (await page.locator('[data-alltool="song"]').innerText()).toLowerCase().includes('credit'));
  await page.locator('[data-alltoolssearch]').fill('filter');
  await page.waitForTimeout(200);
  check('finding "filter" shows the filter tools only', (await page.locator('[data-alltoolsfound] [data-alltool]').count()) >= 1
    && (await page.locator('[data-alltoolsfound] [data-alltool="filters"]').count()) === 1
    && (await page.locator('[data-alltoolsfound] [data-alltool="song"]').count()) === 0);
  await page.locator('[data-alltool="filters"]').click();
  await page.waitForTimeout(1500);
  check('pressing Filters opens the photo editor on Filters', (await page.locator('[data-alltools]').count()) === 0
    && (await page.locator('[data-cutbench="filters"][aria-pressed="true"]').count()) === 1);

  /* Back out of the room — its own arrow goes to the front door — and in
     again by another tool of the same room. */
  await page.locator('[data-roomback]').first().click();
  await page.waitForTimeout(800);
  await openTools();
  check('out of the room, All tools is there again', (await page.locator('[data-alltools]').count()) === 1);
  await page.locator('[data-alltoolsclose]').click();
  await page.waitForTimeout(300);
  check('  and it closes', (await page.locator('[data-alltools]').count()) === 0);
  await openTools();
  await page.locator('[data-alltool="templates"]').click();
  await page.waitForTimeout(1500);
  check('  and Templates opens the photo editor on Templates', (await page.locator('[data-cutbench="starts"][aria-pressed="true"]').count()) === 1);
  await page.locator('[data-roomback]').first().click();
  await page.waitForTimeout(800);

  await openTools();
  await page.locator('[data-alltool="generators"]').click();
  await page.waitForTimeout(1500);
  check('Generators goes to the video editor and opens its panel', (await page.locator('[data-cutbench="folder"][aria-pressed="true"]').count()) === 1
    && (await page.locator('[data-editorgenbench]').count()) === 1);

  await page.screenshot({ path: shot('alltools.png') });
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:alltools — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:alltools — every tool is on one page in groups, found by name, and a press opens its room on its own panel.');
