/**
 * Adjust and Filters change the layer chosen in Layers, and only that one.
 *
 * The owner, 30 October 2026, with Background chosen in Layers and the Blur
 * slider pulled: *"Layers moet regdeur die hele editor oor al perfek werk.
 * Ek het nou die background select. En nou dat ek blur, blur die hele
 * bladsy in plaas van net die background."* How it reads knew two layers,
 * the photo and everything, so any other choice fell through to everything.
 *
 * Read off the glass: words, a box in the middle, the background
 * behind. Blurring the box leaves the words as sharp as they were; brightening
 * the background brightens a corner and leaves the box and the words alone;
 * the background is not offered a blur, which a flat colour cannot show.
 *
 *   node audit/layerlook.mjs [port] [shot-folder]
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3421');
const folder = process.argv[3] || '';
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const { browser, page } = await enter({ width: 390, height: 844, touch: true, at: server.url });
const snap = async (name) => { if (folder) await page.screenshot({ path: `${folder}/${name}.png` }); };
const tool = async (which) => {
  await page.locator(`[data-cutbench="${which}"]`).first().click();
  await page.waitForTimeout(450);
};
const shutTools = async () => {
  const open = page.locator('[data-cutbench][aria-pressed="true"]').first();
  if (await open.count()) { await open.click(); await page.waitForTimeout(400); }
};
/** The top band (the words), the middle (the box) and a corner (the background), as sums of their pixels. */
const read = () => page.evaluate(() => {
  const el = document.querySelector('[data-postcanvas]');
  const x = el.getContext('2d');
  const sum = (l, t, w, h) => {
    const d = x.getImageData(Math.round(l * el.width), Math.round(t * el.height), Math.max(1, Math.round(w * el.width)), Math.max(1, Math.round(h * el.height))).data;
    const out = [];
    for (let i = 0; i < d.length; i += 4) out.push(d[i] + d[i + 1] + d[i + 2]);
    return out;
  };
  const all = x.getImageData(0, 0, el.width, el.height).data;
  let white = 0;
  /* The words' white, below where the box's own glow can reach. */
  const from = Math.round(el.height * 0.79) * el.width * 4;
  for (let i = from; i < all.length; i += 4) if (all[i] > 215 && all[i + 1] > 215 && all[i + 2] > 215) white += 1;
  /* The box sits in the middle; its left edge, its inside, and a corner of the background. */
  return { white, edge: sum(0.18, 0.4, 0.18, 0.15), box: sum(0.42, 0.42, 0.16, 0.1), corner: sum(0.01, 0.01, 0.03, 0.03) };
});
const change = (a, b) => a.reduce((n, v, i) => n + Math.abs(v - b[i]), 0) / a.length;
const mean = (a) => a.reduce((n, v) => n + v, 0) / a.length;
const slide = async (key, to) => {
  await page.locator(`[data-postlookslider="${key}"]`).evaluate((el, v) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, to);
  await page.waitForTimeout(500);
};

try {
  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(800);
  await tool('text');
  await page.locator('[data-addwords]').first().click();
  await page.waitForTimeout(300);
  await page.locator('textarea').first().fill('LAAG');
  await page.waitForTimeout(300);
  await page.locator('[data-postspot="top"]').first().click();
  await page.waitForTimeout(400);
  await tool('shapes');
  await page.locator('[data-postaddmark="box"]').first().click();
  await page.waitForTimeout(500);
  await shutTools();
  const start = await read();

  await tool('layers');
  const order = await page.locator('[data-postlayers] [data-postlayer]').evaluateAll((all) => all.map((el) => el.getAttribute('data-postlayer')));
  const shapeId = order[1];
  await page.locator(`[data-postlayer="${shapeId}"]`).first().click();
  await page.waitForTimeout(400);
  await tool('tone');
  check('with a shape chosen in Layers, Adjust says it changes only that shape',
    (await page.locator('[data-postlookon="layer"]').count()) === 1 && (await page.locator('[data-postlooktarget="item"]').count()) === 1);
  const max = Number(await page.locator('[data-postlookslider="blur"]').getAttribute('max'));
  await slide('blur', max);
  const blurred = await read();
  await snap('layerlook-shape');
  check('  blurring it softens the box\'s edge', change(start.edge, blurred.edge) > 3, String(change(start.edge, blurred.edge)));
  check('  and the words stay exactly as sharp', Math.abs(blurred.white - start.white) <= start.white * 0.03, `${start.white} → ${blurred.white}`);
  await slide('blur', 0);

  await tool('layers');
  await page.locator('[data-postlayer="back"]').first().click();
  await page.waitForTimeout(400);
  await tool('tone');
  check('with Background chosen, Adjust says so', (await page.locator('[data-postlooktarget="back"]').count()) === 1);
  check('  and offers no blur, which one flat colour cannot show', (await page.locator('[data-postlookslider="blur"]').count()) === 0);
  const before = await read();
  await slide('bright', Number(await page.locator('[data-postlookslider="bright"]').getAttribute('max')));
  const lit = await read();
  await snap('layerlook-back');
  check('  brightening it lifts the background', mean(lit.corner) > mean(before.corner) + 6, `${mean(before.corner)} → ${mean(lit.corner)}`);
  /* The box's fill lets a breath of what is behind it through, so it may
     move a little with the background; nothing like the background does. */
  check('  and leaves the box and the words alone',
    change(before.box, lit.box) < 0.25 * change(before.corner, lit.corner) && Math.abs(lit.white - before.white) <= before.white * 0.03,
    `${change(before.box, lit.box)} vs ${change(before.corner, lit.corner)} / ${before.white} → ${lit.white}`);
} catch (problem) {
  check('the walk itself', false, String(problem).slice(0, 300));
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:layerlook — ${problems.length} problem(s).`);
  process.exit(1);
}
console.log('\ncheck:layerlook — Adjust changes the layer chosen in Layers, and only that one.');
