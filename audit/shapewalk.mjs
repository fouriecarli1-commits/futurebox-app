/**
 * Shapes in the Photo Editor, on screen: more of them, every setting on each,
 * and a shape described in words.
 *
 * The owner, 30 October 2026: *"Ek sien jy het nog nie gewerk aan my ding
 * rondom shapes nie. Dat photo editor dalk ook 'n ai engine het waar jy
 * sekere shapes vra en al die verstellings wat ek vroeer gevra het moet saam
 * met 'n shape gaan."*
 *
 * Read off the glass: an arrow is put down, and each setting — round
 * corners, a turn, flipped sideways, a shadow, see-through — changes what is
 * drawn. The AI is answered here with a fixed outline (nothing is spent), and
 * that outline lands as a shape with the same settings.
 *
 *   node audit/shapewalk.mjs [port]
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3427');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const { browser, page } = await enter({ width: 390, height: 844, touch: true, at: server.url });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const tool = async (which) => {
  await page.locator(`[data-cutbench="${which}"]`).first().click();
  await page.waitForTimeout(450);
};
/** The whole glass, as one list of brightnesses on a coarse grid. */
const glass = () => page.evaluate(() => {
  const el = document.querySelector('[data-postcanvas]');
  const x = el.getContext('2d');
  const d = x.getImageData(0, 0, el.width, el.height).data;
  const out = [];
  const step = Math.max(4, Math.floor(el.width / 60));
  for (let y = 0; y < el.height; y += step) for (let xx = 0; xx < el.width; xx += step) {
    const i = (y * el.width + xx) * 4;
    out.push(d[i] + d[i + 1] + d[i + 2]);
  }
  return out;
});
const change = (a, b) => a.reduce((n, v, i) => n + Math.abs(v - b[i]), 0) / a.length;
const slide = async (key, to) => {
  await page.locator(`[data-postmarkslider="${key}"] input`).evaluate((el, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, to);
  await page.waitForTimeout(350);
};

try {
  await page.route('**/api/shape', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ path: 'M50 0L62 38L100 38L69 61L81 100L50 76L19 100L31 61L0 38L38 38Z' }),
  }));
  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(800);
  await tool('shapes');

  const kinds = await page.locator('[data-postaddmark]').count();
  check('there are at least twenty shapes to pick from', kinds >= 20, String(kinds));

  await page.locator('[data-postaddmark="arrow"]').first().click();
  await page.waitForTimeout(500);
  let now = await glass();
  const turns = [
    ['round corners round it', async () => slide('round', 1)],
    ['a turn turns it', async () => slide('turn', 45)],
    ['flipping it sideways flips it', async () => { await page.locator('[data-postmarkflip="x"]').click(); await page.waitForTimeout(350); }],
    ['upside down turns it over', async () => { await slide('turn', 0); await page.locator('[data-postmarkflip="y"]').click(); await page.waitForTimeout(350); }],
    ['a shadow puts one under it', async () => slide('shadow', 1)],
    ['see-through lets the background show', async () => slide('opacity', 0.8)],
    ['the glow can be turned down to nothing', async () => slide('glow', 0)],
  ];
  for (const [what, act] of turns) {
    await act();
    const after = await glass();
    /* A black shadow on the dark post every new one starts on moves little
       of the glass, but it moves it. */
    const least = /shadow/.test(what) ? 0.2 : 0.5;
    check(what, change(now, after) > least, String(change(now, after)));
    now = after;
  }

  /* A neon outline takes see-through too, which it never did. */
  await page.locator('[data-postaddmark="ring"]').first().click();
  await page.waitForTimeout(500);
  const ring = await glass();
  await slide('opacity', 0.8);
  check('a neon outline can be made see-through too', change(ring, await glass()) > 0.3);

  /* The AI, answered here. */
  await page.locator('[data-postshapeaiwords]').fill('a star');
  const go = page.locator('[data-postshapeaigo]');
  check('the AI button names its price', /credit|kredi/i.test(await go.innerText()), await go.innerText());
  check('  and the ideas under it can be dealt again', (await page.locator('[data-postshapeai] [data-idearefresh]').count()) === 1);
  const beforeAi = await glass();
  await go.click();
  await page.waitForTimeout(900);
  check('the outline it answers lands on the photo', change(beforeAi, await glass()) > 0.5);
  check('  as "Your shape", with every setting', (await page.locator('[data-postmark="ai"]').count()) === 1
    && (await page.locator('[data-postmark="ai"] [data-postmarkslider="turn"]').count()) === 1
    && (await page.locator('[data-postmark="ai"] [data-postmarkflip="x"]').count()) === 1);
  check('no page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
} catch (problem) {
  check('the walk itself', false, String(problem).slice(0, 300));
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:shapewalk — ${problems.length} problem(s).`);
  process.exit(1);
}
console.log('\ncheck:shapewalk — twenty-odd shapes, every setting on each, and one described in words.');
