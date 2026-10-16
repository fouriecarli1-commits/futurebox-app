/**
 * Photo grids in the photo editor, used the way she showed them.
 *
 * Carli, 16 October 2026, a four-photo collage open on her phone: *"Kyk ook
 * wanneer foto's in so grid is dan moet mens op een foto kan kliek en dit kan
 * ge-edit word."* Read off the canvas: a frame filled is that quarter of the
 * picture changing colour, a photo moved in its frame is its pixels moving,
 * and an edit made on one photo is that quarter changing and no other.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';

const server = await serve(process.argv[2] || '3333');
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
const shut = async () => {
  const open = page.locator('[data-cutbench][aria-pressed="true"]').first();
  if (await open.count()) { await open.click(); await page.waitForTimeout(350); }
};

/** The average colour of one quarter of the post: 0 top-left, 1 top-right, 2 bottom-left, 3 bottom-right. */
const quarter = (which) => page.evaluate((q) => {
  const el = document.querySelector('[data-postcanvas]');
  const ctx = el.getContext('2d');
  const w = el.width / 2;
  const h = el.height / 2;
  const x0 = (q % 2) * w;
  const y0 = Math.floor(q / 2) * h;
  const d = ctx.getImageData(x0 + w * 0.2, y0 + h * 0.2, w * 0.6, h * 0.6).data;
  let r = 0; let g = 0; let b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4;
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}, which);

/** A photograph made in the page: left half one colour, right half another. */
const photo = (left, right) => page.evaluate(async ([a, b]) => {
  const c = document.createElement('canvas');
  c.width = 400; c.height = 300;
  const x = c.getContext('2d');
  x.fillStyle = a; x.fillRect(0, 0, 200, 300);
  x.fillStyle = b; x.fillRect(200, 0, 200, 300);
  const blob = await new Promise((done) => c.toBlob(done, 'image/png'));
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
}, [left, right]);

try {
  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(800);

  check('the bar has a Grids tool', (await page.locator('[data-cutbench="grid"]').count()) > 0);
  await tool('grid');
  check('  with layouts drawn as pictures of themselves', (await page.locator('[data-postlayout]').count()) >= 12);
  await page.locator('[data-postlayout="four"]').click();
  await page.waitForTimeout(500);
  await shut();
  await tool('layers');
  check('choosing Four makes four photo frames', (await page.locator('[data-postlayers] [data-postlayer]').filter({ hasText: /Photo|Foto/ }).count()) >= 4);
  await shut();

  /* Tap the bottom-right frame: it is empty, so the phone's picker opens —
     here the file is handed to the picker the room uses. */
  const box = await page.locator('[data-postcanvas]').boundingBox();
  const before = await quarter(3);
  await page.locator('[data-postcellinput]').evaluate((el) => { el.dataset.watch = '1'; });
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.75);
  await page.waitForTimeout(400);
  check('tapping an empty frame picks it and brings up its own small bar', (await page.locator('[data-postcellbar]').count()) === 1);
  await page.locator('[data-postcellinput]').setInputFiles({ name: 'two.png', mimeType: 'image/png', buffer: Buffer.from(await photo('#ff0000', '#0000ff')) });
  await page.waitForTimeout(1200);
  const filled = await quarter(3);
  check('  and the photo lands in that frame', filled.r > 80 || filled.b > 80, `${JSON.stringify(before)} → ${JSON.stringify(filled)}`);
  check('  and nowhere else', JSON.stringify(await quarter(0)) === JSON.stringify(before), JSON.stringify(await quarter(0)));

  /* Picked, a drag moves the photograph about inside its frame. */
  check('  and the bar leaves the photo uncovered', await page.evaluate(() => {
    const bar = document.querySelector('[data-postcellbar] > div')?.getBoundingClientRect();
    const canvas = document.querySelector('[data-postcanvas]')?.getBoundingClientRect();
    return Boolean(bar && canvas && bar.height < canvas.height * 0.2);
  }));
  const at = async () => page.evaluate(() => {
    const el = document.querySelector('[data-postcanvas]');
    const d = el.getContext('2d').getImageData(Math.round(el.width * 0.75), Math.round(el.height * 0.75), 1, 1).data;
    return [d[0], d[1], d[2]];
  });
  for (let n = 0; n < 4; n += 1) await page.locator('[data-postcellbarbutton="closer"]').click();
  await page.waitForTimeout(300);
  const mid = await at();
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.75);
  await page.mouse.down();
  for (let n = 1; n <= 8; n += 1) await page.mouse.move(box.x + box.width * (0.75 - 0.02 * n), box.y + box.height * 0.75);
  await page.mouse.up();
  await page.waitForTimeout(400);
  const moved = await at();
  check('dragging a picked photo moves it inside its frame', JSON.stringify(mid) !== JSON.stringify(moved), `${mid} → ${moved}`);

  /* Edit this photo: open alone, darken it, Done — only that quarter changes. */
  const other = await quarter(0);
  const mine = await quarter(3);
  await page.locator('[data-postcellbarbutton="edit"]').click();
  await page.waitForTimeout(700);
  check('Edit this photo opens it on its own', (await page.locator('[data-postcellsession]').count()) === 1);
  await tool('tone');
  const slider = page.locator('[data-postlookslider="bright"]').first();
  await slider.fill(await slider.getAttribute('min'));
  await page.waitForTimeout(400);
  await page.locator('[data-postcelldone]').click();
  await page.waitForTimeout(1200);
  check('  and Done puts it back in its frame', (await page.locator('[data-postcellsession]').count()) === 0);
  const darker = await quarter(3);
  check('  darker, as it was made', darker.r + darker.g + darker.b < mine.r + mine.g + mine.b - 30, `${JSON.stringify(mine)} → ${JSON.stringify(darker)}`);
  check('  and the rest of the post as it was', JSON.stringify(await quarter(0)) === JSON.stringify(other));

  await page.screenshot({ path: shot('postgrid.png') });
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:postgrid — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:postgrid — a layout makes frames, a tapped frame takes a photo, a picked photo moves in its frame, and one photo is edited on its own and put back.');
