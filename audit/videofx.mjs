/**
 * The video editor's generators and effects, used the way she would.
 *
 * Carli, 16 October 2026, a desktop editor's toolbox with its Generators and
 * Effects open: *"Kyk ook hoe netjies dit verpak is."* Read off pixels: a
 * generator becomes a shot on the clock that shows what it was, and an effect
 * turned on changes the picture the way its name says — cinema bars are black
 * at the top, a mirror makes the right side the left side turned over.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3339');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const { browser, page } = await enter({ at: server.url, lang: 'en' });
page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
const bench = async (which) => {
  const button = page.locator(`[data-cutbench="${which}"]`);
  if ((await button.getAttribute('aria-pressed').catch(() => null)) === 'true') return;
  await button.click({ timeout: 10000 }).catch(() => undefined);
  await page.waitForTimeout(500);
};
/** One pixel of the effects canvas, at shares across and down. */
const at = (x, y) => page.evaluate(([sx, sy]) => {
  const el = document.querySelector('[data-editorfxframe]');
  if (!(el instanceof HTMLCanvasElement)) return null;
  const d = el.getContext('2d').getImageData(Math.min(el.width - 1, Math.round(el.width * sx)), Math.min(el.height - 1, Math.round(el.height * sy)), 1, 1).data;
  return [d[0], d[1], d[2]];
}, [x, y]);

try {
  await studio(page);
  await toRoom(page, 'Video Editor');
  await page.waitForTimeout(900);

  await bench('folder');
  await page.locator('[data-editorgenbench] summary').click();
  await page.waitForTimeout(300);
  check('the generators are grouped like the transitions', (await page.locator('[data-editorgenhead]').count()) === 3);
  await page.locator('[data-editorgenhead="test"]').click();
  check('  and each one is a picture of itself', (await page.locator('[data-editorgenerator] canvas').count()) >= 6);
  await page.locator('[data-editorgenerator="colourBars"]').click();
  await page.locator('[data-editorgenlong="2"]').click();
  await page.locator('[data-editorgenmake]').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-editorblock]').length >= 1, null, { timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  check('Colour bars, made, lands on the clock as a shot', (await page.locator('[data-editorblock]').count()) === 1);

  /* ── Effects ── */
  await bench('looks');
  check('the effects are grouped, each with a moving picture', (await page.locator('[data-editorfxhead]').count()) === 4
    && (await page.locator('[data-editoreffect] canvas').count()) >= 3);
  await page.locator('[data-editorfxhead="frame"]').click();
  await page.locator('[data-editoreffect="letterbox"]').click();
  await page.waitForTimeout(900);
  check('an effect on puts its own picture over the film', (await page.locator('[data-editorfxframe]').count()) === 1);
  const top = await at(0.5, 0.01);
  const middle = await at(0.05, 0.4);
  check('  Cinema bars are black across the top of the colour bars', Boolean(top && middle)
    && top[0] + top[1] + top[2] < 20 && middle[0] + middle[1] + middle[2] > 200, `${top} / ${middle}`);
  await page.locator('[data-editoreffectamount="letterbox"]').fill('1');
  await page.waitForTimeout(500);
  const deeper = await at(0.5, 0.12);
  check('  and stronger is deeper bars', Boolean(deeper) && deeper[0] + deeper[1] + deeper[2] < 20, String(deeper));
  await page.locator('[data-editoreffect="letterbox"]').click();

  await page.locator('[data-editorfxhead="camera"]').click().catch(() => undefined);
  if (!(await page.locator('[data-editoreffect="mirror"]').count())) await page.locator('[data-editorfxhead="camera"]').click();
  await page.locator('[data-editoreffect="mirror"]').click();
  await page.waitForTimeout(800);
  const left = await at(0.04, 0.3);
  const right = await at(0.96, 0.3);
  check('Mirror turns the left of the picture over onto the right', Boolean(left && right)
    && Math.abs(left[0] - right[0]) + Math.abs(left[1] - right[1]) + Math.abs(left[2] - right[2]) < 30, `${left} | ${right}`);
  await page.locator('[data-editoreffect="mirror"]').click();
  await page.waitForTimeout(500);
  check('  and with every effect off the picture is the film again', (await page.locator('[data-editorfxframe]').count()) === 0);
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:videofx — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:videofx — a generator becomes a shot on the clock, and an effect changes the picture the way its name says.');
