/**
 * The photo editor's charts, walked on a phone.
 *
 * The owner, 17 October 2026: *"In photo editor sal daar ook graph templates
 * moet wees, en verskillende verskeidenheid van graphs. Wat cool sal wees as
 * dit AI verstelbaar is dat data ingevoer kan word en AI die data in die
 * grafiek verstel."*
 *
 * Read off the glass: Charts is on the bar, its designs are drawn from their
 * own data, one press puts a chart on the post, a number typed in the table
 * moves a bar, a pasted table replaces the data, another kind redraws it, it
 * is a layer in the list, and the AI's answer — stubbed here, so nothing is
 * spent — lands as the chart's new data, with the price on the button.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3355');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
let asked = null;
const { browser, page } = await enter({
  width: 390, height: 844, touch: true, at: server.url,
  /* The AI, answered here: the walk must never spend. */
  before: async (p) => {
    await p.route('**/api/post/chart', async (route) => {
      asked = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ chart: { ...asked.chart, title: 'From the AI', labels: ['Jan', 'Feb', 'Mar', 'Apr'], series: [{ name: 'Sales', values: [40, 52, 61, 90] }] } }),
      });
    });
  },
});
page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 200)}`));
const tool = async (which) => {
  await page.locator(`[data-cutbench="${which}"]`).first().click();
  await page.waitForTimeout(450);
};

/** How many pixels of the post are near a colour. */
const near = (hex) => page.evaluate((h) => {
  const el = document.querySelector('[data-postcanvas]');
  if (!(el instanceof HTMLCanvasElement)) return -1;
  const want = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 16) if (Math.abs(d[i] - want[0]) + Math.abs(d[i + 1] - want[1]) + Math.abs(d[i + 2] - want[2]) < 30) n += 1;
  return n;
}, hex);

try {
  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(900);
  check('Charts is a tool on the photo editor\'s bar', (await page.locator('[data-cutbench="charts"]').count()) >= 1);
  await tool('charts');
  const templates = await page.locator('[data-postcharttemplate]').count();
  check('  with a dozen chart designs to pick from', templates >= 12, String(templates));
  const tileDrawn = await page.evaluate(() => {
    const c = document.querySelector('[data-postcharttemplate] canvas');
    if (!(c instanceof HTMLCanvasElement)) return 0;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n += 1;
    return n;
  });
  check('  each drawn from its own data', tileDrawn > 1000, String(tileDrawn));

  const blueBefore = await near('#2a78d6');
  await page.locator('[data-postcharttemplate="sales"]').click();
  await page.waitForTimeout(600);
  const blueAfter = await near('#2a78d6');
  check('one press puts a chart on the post, in the palette\'s first colour', blueAfter > blueBefore + 200, `${blueBefore} → ${blueAfter}`);
  check('  and opens it to be changed', (await page.locator('[data-postchart="column"]').count()) === 1);

  /* A number typed in moves its bar. */
  await page.locator('[data-postchartcell="0-0"]').fill('200');
  await page.waitForTimeout(400);
  const taller = await near('#2a78d6');
  check('a number typed in the table changes the chart', taller !== blueAfter, `${blueAfter} → ${taller}`);

  /* Another kind redraws it. */
  await page.locator('[data-postchartkind="pie"]').click();
  await page.waitForTimeout(400);
  check('another kind redraws it', (await page.locator('[data-postchart="pie"]').count()) === 1 && (await near('#eb6834')) > 50);
  await page.locator('[data-postchartkind="column"]').click();

  /* A pasted table replaces the data. */
  await page.locator('[data-postchartpastebox] summary').click();
  await page.locator('[data-postchartpaste]').fill('Mon\t5\nTue\t9\nWed\t4');
  await page.locator('[data-postchartpastego]').click();
  await page.waitForTimeout(400);
  const labels = await page.locator('[data-postchartlabel]').evaluateAll((all) => all.map((one) => one.value));
  check('a pasted table becomes the chart\'s rows', labels.join() === 'Mon,Tue,Wed', labels.join());

  /* The AI, with its price said before it is pressed. */
  const go = page.locator('[data-postchartaigo]');
  check('the AI button says its price and waits for words', /credit|kredi/i.test(await go.innerText()) && await go.isDisabled());
  await page.locator('[data-postchartai]').fill('sales were 40, 52 and 61 in Jan to Mar, add April at 90');
  await go.click();
  await page.waitForTimeout(1500);
  check('  and sends the chart as it is with the words', asked?.chart?.labels?.join() === 'Mon,Tue,Wed' && /April at 90/.test(asked?.words ?? ''), JSON.stringify(asked).slice(0, 200));
  const afterAi = await page.locator('[data-postchartlabel]').evaluateAll((all) => all.map((one) => one.value));
  check('  and its answer becomes the chart', afterAi.join() === 'Jan,Feb,Mar,Apr' && (await page.locator('[data-postcharttitle]').inputValue()) === 'From the AI', afterAi.join());

  /* The owner, 17 October 2026: closing the panel hid the chart behind the
     start card on a post with no photo. It stays in sight. */
  await tool('charts');
  await page.waitForTimeout(500);
  const covered = await page.evaluate(() => {
    const c = document.querySelector('[data-postcanvas]')?.getBoundingClientRect();
    if (!c) return 'no canvas';
    const hit = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2);
    return hit?.closest('[data-postcanvas]') || hit?.tagName === 'CANVAS' ? '' : (hit?.textContent ?? '').slice(0, 60);
  });
  check('with the panel closed, the chart is in sight and nothing sits over it', covered === '', covered);
  await tool('layers');
  check('the chart is a layer in the list', /📊/.test(await page.locator('[data-postlayers], [data-postlayerlist]').first().innerText().catch(() => '')));
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:postcharts — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:postcharts — a chart from a design, changed by hand, by a pasted table and by the AI, on the post and in the layers.');
