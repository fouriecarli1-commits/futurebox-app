/**
 * The darkroom: in from the photo editor, developed, and back out.
 *
 * Carli, 17 October 2026: *"Binne photoshop wonder ek of daar by bring a photo
 * in of daar nie 'n fancy looking button moet wees wat mense na die lightroom
 * toe vat."* — with screenshots of Light, Colour, grading wheels and Detail.
 *
 * Read off the glass: the button sits beside Bring a picture in, it opens the
 * darkroom with the photograph that is there and a histogram drawn from it,
 * more exposure makes the preview lighter, B&W makes it grey, Reset brings it
 * back, every section opens, and Done hands a lighter photograph to the
 * editor and closes the darkroom. All tools opens it too.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3353');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const { browser, page } = await enter({ width: 390, height: 844, touch: true, at: server.url });

/** The average colour in the middle of a canvas. */
const middleOf = (selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!(el instanceof HTMLCanvasElement) || !el.width) return null;
  const s = Math.max(1, Math.round(Math.min(el.width, el.height) * 0.1));
  const d = el.getContext('2d').getImageData(Math.round(el.width / 2 - s / 2), Math.round(el.height / 2 - s / 2), s, s).data;
  const sum = [0, 0, 0];
  for (let i = 0; i < d.length; i += 4) { sum[0] += d[i]; sum[1] += d[i + 1]; sum[2] += d[i + 2]; }
  const n = d.length / 4;
  return sum.map((v) => Math.round(v / n));
}, selector);
const bright = (c) => (c ? c[0] + c[1] + c[2] : -1);
/** Move a range input to a value the way a finger would leave it. */
const slide = (mark, value) => page.evaluate(([m, v]) => {
  const input = document.querySelector(`[data-darkslider="${m}"] input`);
  if (!(input instanceof HTMLInputElement)) return false;
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  set.call(input, String(v));
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}, [mark, value]);

try {
  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(900);
  await page.locator('[data-cutbench="pic"]').first().click();
  await page.waitForTimeout(450);

  const button = page.locator('[data-postdarkroom]');
  check('the darkroom button is beside Bring a picture in', (await button.count()) === 1
    && (await page.evaluate(() => {
      const a = document.querySelector('[data-postdarkroom]')?.getBoundingClientRect();
      const b = document.querySelector('[data-postpicture]')?.closest('label')?.getBoundingClientRect();
      return Boolean(a && b && Math.abs(a.top - b.top) < 60);
    })));

  /* A mid-grey photograph with a red disc, so light and colour both show. */
  const brought = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 600; c.height = 400;
    const x = c.getContext('2d');
    x.fillStyle = '#6e6e6e';
    x.fillRect(0, 0, 600, 400);
    x.fillStyle = '#b03a2e';
    x.beginPath();
    x.arc(300, 200, 60, 0, Math.PI * 2);
    x.fill();
    const blob = await new Promise((done) => c.toBlob(done, 'image/png'));
    const input = document.querySelector('[data-postpicture]');
    if (!input || !blob) return false;
    const holder = new DataTransfer();
    holder.items.add(new File([blob], 'grey.png', { type: 'image/png' }));
    input.files = holder.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
  check('a photograph is brought in', brought === true);
  await page.waitForTimeout(1400);
  const editorBefore = await middleOf('[data-postcanvas]');

  await page.locator('[data-postdarkroom]').click();
  await page.waitForTimeout(900);
  check('the button opens the darkroom', (await page.locator('[data-darkroom]').count()) === 1);
  check('  with the photograph in it', (await page.locator('[data-darkview]').count()) === 1);
  const asShot = await middleOf('[data-darkview]');
  check('  drawn as it was shot', asShot !== null && Math.abs(asShot[0] - 0xb0) < 14 && Math.abs(asShot[1] - 0x3a) < 14, JSON.stringify(asShot));
  const histogramDrawn = await page.evaluate(() => {
    const el = document.querySelector('[data-darkhistogram]');
    if (!(el instanceof HTMLCanvasElement)) return 0;
    const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n += 1;
    return n;
  });
  check('  and a histogram drawn from it', histogramDrawn > 50, String(histogramDrawn));
  for (const id of ['light', 'curve', 'colour', 'mixer', 'grading', 'effects', 'detail', 'presets']) {
    check(`  with ${id}`, (await page.locator(`[data-darksection="${id}"]`).count()) === 1);
  }

  check('exposure can be moved', await slide('exposure', 1.2));
  await page.waitForTimeout(500);
  const lighter = await middleOf('[data-darkview]');
  check('  and more exposure is a lighter preview', bright(lighter) > bright(asShot) + 60, `${JSON.stringify(asShot)} → ${JSON.stringify(lighter)}`);

  await page.locator('[data-darkedit="bw"]').click();
  await page.waitForTimeout(500);
  const grey = await middleOf('[data-darkview]');
  check('B&W makes it grey', grey !== null && Math.abs(grey[0] - grey[1]) <= 2 && Math.abs(grey[1] - grey[2]) <= 2, JSON.stringify(grey));
  await page.locator('[data-darkedit="reset"]').click();
  await page.waitForTimeout(500);
  const reset = await middleOf('[data-darkview]');
  check('Reset brings it back as shot', reset !== null && Math.abs(reset[0] - asShot[0]) <= 3 && Math.abs(reset[1] - asShot[1]) <= 3, JSON.stringify(reset));

  for (const id of ['curve', 'mixer', 'grading', 'effects', 'detail']) {
    const opened = page.locator(`[data-darksection="${id}"] > button`).first();
    await opened.scrollIntoViewIfNeeded();
    await opened.click();
    await page.waitForTimeout(200);
  }
  check('the mixer has its eight colours', (await page.locator('[data-darkband]').count()) === 8);
  check('grading has its three wheels', (await page.locator('[data-darkwheel]').count()) >= 3);
  check('the curve can be drawn on', (await page.locator('[data-darkcurve]').count()) === 1);

  await slide('exposure', 1);
  await page.waitForTimeout(400);
  await page.locator('[data-darkdone]').click();
  await page.waitForTimeout(2500);
  check('Done closes the darkroom', (await page.locator('[data-darkroom]').count()) === 0);
  const editorAfter = await middleOf('[data-postcanvas]');
  check('  and the editor has the developed photograph', bright(editorAfter) > bright(editorBefore) + 40,
    `${JSON.stringify(editorBefore)} → ${JSON.stringify(editorAfter)}`);
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:darkroom — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:darkroom — the darkroom opens from beside Bring a picture in, develops what its sliders say, and hands the photograph back.');
