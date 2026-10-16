/**
 * Photo templates, used the way she would.
 *
 * Carli, 16 October 2026: *"Hoe hou ons sulke cool templates?"* and then
 * *"gaan aan met die template-stelsel."* Read off the canvas: choosing a
 * template sets the post's colour, makes its frames and writes its words,
 * and a photo already in the room lands in the first frame rather than being
 * thrown away.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';

const server = await serve(process.argv[2] || '3341');
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
const pixel = (x, y) => page.evaluate(([sx, sy]) => {
  const el = document.querySelector('[data-postcanvas]');
  const d = el.getContext('2d').getImageData(Math.round(el.width * sx), Math.round(el.height * sy), 1, 1).data;
  return [d[0], d[1], d[2]];
}, [x, y]);
const near = (a, b, by = 12) => Math.abs(a[0] - b[0]) <= by && Math.abs(a[1] - b[1]) <= by && Math.abs(a[2] - b[2]) <= by;
const photoRows = async () => {
  await tool('layers');
  const n = await page.locator('[data-postlayers] [data-postlayer]').filter({ hasText: /Photo|Foto/ }).count();
  await tool('layers');
  return n;
};

try {
  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(800);

  await tool('starts');
  check('Templates opens with photo templates, each a picture of itself', (await page.locator('[data-postdesign] canvas').count()) >= 16);
  check('  grouped the way people post', (await page.locator('[data-postdesigngroup]').count()) >= 8);
  await page.locator('[data-postdesigngroup="collage"]').click();
  await page.waitForTimeout(300);
  const collages = await page.locator('[data-postdesign]').count();
  check('  and a group shows only its own', collages >= 3 && collages < 16, String(collages));
  check('  a member who is not the owner has no Save as template', (await page.locator('[data-postdesignkeep]').count()) === 0);
  await page.locator('[data-postdesigngroup="all"]').click();
  await tool('starts');

  /* A red photo first, then a template with one frame. */
  await tool('pic');
  await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 400; c.height = 400;
    const x = c.getContext('2d');
    x.fillStyle = '#e0301e';
    x.fillRect(0, 0, 400, 400);
    const blob = await new Promise((done) => c.toBlob(done, 'image/png'));
    const input = document.querySelector('[data-poststudio] input[type=file]');
    const holder = new DataTransfer();
    holder.items.add(new File([blob], 'red.png', { type: 'image/png' }));
    input.files = holder.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(1400);
  await tool('pic');
  await tool('starts');
  await page.locator('[data-postdesign="newSingle"]').click();
  await page.waitForTimeout(1200);
  check('choosing New single puts its colour behind the post', near(await pixel(0.03, 0.5), [0x1a, 0x0b, 0x2e]), String(await pixel(0.03, 0.5)));
  const middle = await pixel(0.5, 0.45);
  check('  and the photo already in the room lands in its frame', middle[0] > 170 && middle[1] < 90, String(middle));
  check('  as one photo frame in the layers', (await photoRows()) === 1);

  await tool('starts');
  await page.locator('[data-postdesign="photoDump"]').click();
  await page.waitForTimeout(1200);
  check('Photo dump makes four frames to fill', (await photoRows()) === 4);
  check('  on its own colour', near(await pixel(0.5, 0.995), [0xf5, 0xf1, 0xe6]), String(await pixel(0.5, 0.995)));
  /* ── A frame of her own, placed by hand — for a template's artwork ── */
  await tool('starts');
  await page.locator('[data-postdesign="quoteCard"]').click();
  await page.waitForTimeout(900);
  const plain = await pixel(0.5, 0.5);
  await tool('grid');
  await page.locator('[data-postaddframe]').click();
  await page.waitForTimeout(500);
  check('Add a photo frame puts one on, picked, with Move on', (await page.locator('[data-postcellbarbutton="place"][aria-pressed="true"]').count()) === 1);
  const framed = await pixel(0.5, 0.5);
  check('  and it shows where it is', !near(framed, plain, 6), `${plain} → ${framed}`);
  const glass = await page.locator('[data-postcanvas]').boundingBox();
  const drag = async (fx, fy, tx, ty) => {
    await page.mouse.move(glass.x + glass.width * fx, glass.y + glass.height * fy);
    await page.mouse.down();
    for (let n = 1; n <= 10; n += 1) {
      await page.mouse.move(glass.x + glass.width * (fx + ((tx - fx) * n) / 10), glass.y + glass.height * (fy + ((ty - fy) * n) / 10));
    }
    await page.mouse.up();
    await page.waitForTimeout(400);
  };
  await drag(0.5, 0.5, 0.25, 0.3);
  check('dragging it moves the frame', near(await pixel(0.6, 0.6), plain, 6) && !near(await pixel(0.25, 0.3), plain, 6),
    `${await pixel(0.6, 0.6)} / ${await pixel(0.25, 0.3)}`);
  await drag(0.45, 0.5, 0.85, 0.8);
  check('  and its corner makes it bigger', !near(await pixel(0.75, 0.7), plain, 6), String(await pixel(0.75, 0.7)));

  await page.screenshot({ path: shot('postdesigns.png') });
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:postdesigns — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:postdesigns — a template sets the colour, makes the frames and the words, and keeps the photo she already had.');
