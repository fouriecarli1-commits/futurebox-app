/**
 * Filters in the photo editor, and its tools shown as pictures.
 *
 * Carli, 16 October 2026: *"Kyk asb ook hoe oulik dit is om die funksies op
 * prentjies te wys (onthou mense is visueel). Ek soek ook al daai funksies en
 * ook sulke oulike filters ... Ons foto's en filter prentjies moet net iets
 * anders wees en anders lyk."*
 *
 * Read off canvases: a tool's picture is her photograph once she has one, a
 * filter's picture is her photograph with that filter on, and pressing a
 * filter changes the post the way its picture said it would.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';

const server = await serve(process.argv[2] || '3335');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const { browser, page } = await enter({ width: 390, height: 844, touch: true, at: server.url });
const tool = async (which) => {
  await page.locator(`[data-cutbench="${which}"]`).first().click();
  await page.waitForTimeout(450);
};

/** The average colour of the middle of a canvas. */
const middle = (selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!(el instanceof HTMLCanvasElement)) return null;
  const d = el.getContext('2d').getImageData(el.width * 0.3, el.height * 0.3, el.width * 0.4, el.height * 0.4).data;
  let r = 0; let g = 0; let b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4;
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}, selector);
const grey = (c) => Boolean(c) && Math.abs(c.r - c.g) < 14 && Math.abs(c.g - c.b) < 14;
const far = (a, b) => Boolean(a && b) && Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);

try {
  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(900);

  /* ── The tools as pictures ── */
  const drawn = await page.evaluate(() => [...document.querySelectorAll('[data-cutbench] canvas[data-posttooltile]')]
    .filter((el) => getComputedStyle(el).opacity === '1').length);
  check('the tools along the foot are pictures, not only symbols', drawn >= 10, `${drawn} drawn`);
  check('  and Filters is one of them', (await page.locator('[data-cutbench="filters"]').count()) > 0);
  const sample = await middle('[data-cutbench="pic"] canvas');

  await tool('pic');
  const brought = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 400; c.height = 400;
    const x = c.getContext('2d');
    x.fillStyle = '#e0301e';
    x.fillRect(0, 0, 400, 400);
    x.fillStyle = '#1e90e0';
    x.fillRect(0, 300, 400, 100);
    const blob = await new Promise((done) => c.toBlob(done, 'image/png'));
    const input = document.querySelector('[data-poststudio] input[type=file]') ?? document.querySelector('input[type=file]');
    if (!input || !blob) return false;
    const holder = new DataTransfer();
    holder.items.add(new File([blob], 'red.png', { type: 'image/png' }));
    input.files = holder.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
  check('a photograph is brought in', brought === true);
  await page.waitForTimeout(1400);
  await tool('pic');
  const mine = await middle('[data-cutbench="pic"] canvas');
  check('  and the tool pictures become her photograph', mine && mine.r > 150 && mine.g < 110 && far(sample, mine) > 60,
    `${JSON.stringify(sample)} → ${JSON.stringify(mine)}`);

  /* ── The filters ── */
  await tool('filters');
  check('Filters opens with its groups', (await page.locator('[data-postfiltergroup]').count()) >= 8);
  check('  and each filter is a picture', (await page.locator('[data-postfilters] [data-postfilter] canvas').count()) >= 6);
  await page.locator('[data-postfiltergroup="mono"]').click();
  await page.waitForTimeout(300);
  check('  drawn on her own photograph', grey(await middle('[data-postfilter="charcoal"] canvas'))
    && (await middle('[data-postfilter="none"] canvas'))?.r > 150);

  const before = await middle('[data-postcanvas]');
  await page.locator('[data-postfilter="charcoal"]').click();
  await page.waitForTimeout(500);
  const charcoal = await middle('[data-postcanvas]');
  check('pressing Charcoal makes the post black and white', grey(charcoal) && !grey(before),
    `${JSON.stringify(before)} → ${JSON.stringify(charcoal)}`);
  check('  and it is the one shown as chosen', (await page.locator('[data-postfilter="charcoal"][aria-pressed="true"]').count()) === 1);

  await page.locator('[data-postfilterstrength] input[type=range]').fill('0.5');
  await page.waitForTimeout(400);
  const half = await middle('[data-postcanvas]');
  check('  half strength is half way back to her colours', !grey(half) && half.r - half.g < before.r - before.g,
    `${JSON.stringify(half)}`);

  await page.locator('[data-postfiltergroup="neon"]').click();
  await page.locator('[data-postfilter="synthwave"]').click();
  await page.waitForTimeout(400);
  const neon = await middle('[data-postcanvas]');
  check('another group, another filter: the post changes again', far(neon, charcoal) > 40, JSON.stringify(neon));

  await page.locator('[data-postfilter="none"]').click();
  await page.waitForTimeout(400);
  const back = await middle('[data-postcanvas]');
  check('Original puts her photograph back as it came', far(back, before) < 8, `${JSON.stringify(before)} → ${JSON.stringify(back)}`);

  /* The sliders in Adjust carry on from a filter rather than starting over. */
  await page.locator('[data-postfiltergroup="warm"]').click();
  await page.locator('[data-postfilter="kalahari"]').click();
  await page.waitForTimeout(300);
  await tool('tone');
  const colour = await page.locator('[data-postlookslider="colour"] input[type=range], input[data-postlookslider="colour"]').first().inputValue().catch(() => null);
  check('Adjust shows what the filter did', colour !== null && Number(colour) > 1.05, String(colour));

  await page.screenshot({ path: shot('postfilters.png') });
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:postfilters — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:postfilters — the tools are pictures of her photograph, every filter is shown on it, and pressing one does what its picture showed.');
