/**
 * The photo editor's magic brush, Adjust with no photograph, and a
 * see-through background that can be seen.
 *
 * Carli, 16 October 2026: *"Adjust se funksies kom nie uit nie. Magic se crop
 * box werk nie, moet dit in elkgeval nie 'n paint brush wees wat oor 'n
 * gedeelte verf en dit word dan ai gemaster en gefix"* — and *"Ek sien ook nog
 * nerens transparent en dat dit werk nie."*
 *
 * Read off the glass: a finger dragged over the photograph leaves neon paint
 * where it went and nowhere else, the bench says it is ready, and Start over
 * takes the paint away. Adjust opens with its controls before there is a
 * photograph, changing the whole picture. A see-through post shows a light
 * checkerboard, and the button says the word.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';

const server = await serve(process.argv[2] || '3345');
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

/** Pixels of the post canvas that are the brush's neon, in a band across a share of its height. */
const neonIn = (top, bottom) => page.evaluate(([a, b]) => {
  const el = document.querySelector('[data-postcanvas]');
  if (!(el instanceof HTMLCanvasElement)) return -1;
  const y = Math.round(el.height * a);
  const h = Math.max(1, Math.round(el.height * (b - a)));
  const d = el.getContext('2d').getImageData(0, y, el.width, h).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 1] > d[i] + 40 && d[i + 1] > d[i + 2] + 40) n += 1;
  return n;
}, [top, bottom]);

try {
  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(900);

  /* ── Adjust before there is a photograph ── */
  await tool('tone');
  check('Adjust shows its controls with no photograph', (await page.locator('[data-postlook]').count()) === 1);
  check('  and changes the whole picture, the only thing there is to change',
    (await page.locator('[data-postlook] [data-postlooktarget="all"]').count()) === 1
    && (await page.locator('[data-postlookon="photo"]').count()) === 0);
  check('  with Lift it there to press', (await page.locator('[data-postauto]').count()) === 1);
  await tool('tone');

  /* ── See-through, said and seen ── */
  await tool('pic');
  const clear = page.locator('[data-postclear]').first();
  check('the background button says transparent', /transparent|deursigtig/i.test(await clear.innerText()));
  await clear.click();
  await page.waitForTimeout(400);
  const corner = await page.evaluate(() => {
    const el = document.querySelector('[data-postcanvas]');
    const d = el.getContext('2d').getImageData(Math.round(el.width * 0.02), Math.round(el.height * 0.02), 1, 1).data;
    return { r: d[0], g: d[1], b: d[2] };
  });
  check('  and a see-through post shows a light checkerboard, not a dark square',
    corner.r > 180 && corner.g > 180 && corner.b > 180, JSON.stringify(corner));
  await clear.click();
  await page.waitForTimeout(300);

  /* ── The brush ── */
  const brought = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 400; c.height = 400;
    const x = c.getContext('2d');
    x.fillStyle = '#7a7a7a';
    x.fillRect(0, 0, 400, 400);
    const blob = await new Promise((done) => c.toBlob(done, 'image/png'));
    const input = document.querySelector('[data-poststudio] input[type=file]') ?? document.querySelector('input[type=file]');
    if (!input || !blob) return false;
    const holder = new DataTransfer();
    holder.items.add(new File([blob], 'grey.png', { type: 'image/png' }));
    input.files = holder.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
  check('a photograph is brought in', brought === true);
  await page.waitForTimeout(1400);

  await tool('magic');
  const says = page.locator('[data-postmagicsays]');
  check('Magic touch asks for paint, not a tap', /paint|verf/i.test(await says.innerText()), await says.innerText());
  check('  and nothing is painted yet', (await neonIn(0, 1)) === 0);
  const clearOf = await page.evaluate(() => {
    const glass = document.querySelector('[data-postcanvas]')?.getBoundingClientRect();
    const panel = document.querySelector('[data-postunder]')?.getBoundingClientRect();
    return glass && panel ? { glassFoot: Math.round(glass.bottom), panelTop: Math.round(panel.top) } : null;
  });
  check('  and its panel keeps under the photograph, so every part of it can be painted',
    clearOf !== null && clearOf.panelTop >= clearOf.glassFoot - 2, JSON.stringify(clearOf));

  const box = await page.locator('[data-postcanvas]').boundingBox();
  const y = box.y + box.height * 0.3;
  await page.mouse.move(box.x + box.width * 0.2, y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i += 1) {
    await page.mouse.move(box.x + box.width * (0.2 + i * 0.05), y);
  }
  await page.mouse.up();
  await page.waitForTimeout(400);

  const along = await neonIn(0.25, 0.35);
  const elsewhere = await neonIn(0.6, 0.9);
  check('a finger dragged over the photograph leaves paint where it went', along > 2000, `${along} neon pixels along the stroke`);
  check('  and nowhere else', elsewhere === 0, `${elsewhere} neon pixels below it`);
  check('  and the bench says that part is painted', /painted|geverf/i.test(await says.innerText()), await says.innerText());
  check('  with the three AI choices to press',
    (await page.locator('[data-postmagicbetter]').count()) === 1
    && (await page.locator('[data-postmagicfill]').count()) === 1);
  await page.screenshot({ path: shot('magicbrush.png') });

  await page.locator('[data-postmagicclear]').click();
  await page.waitForTimeout(300);
  check('Start over takes the paint away', (await neonIn(0, 1)) === 0);
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:magicbrush — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:magicbrush — the magic touch is a brush, Adjust works with no photograph, and see-through looks see-through.');
