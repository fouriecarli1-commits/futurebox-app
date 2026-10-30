/**
 * The Photo Editor's opening card, read off the glass.
 *
 * The owner, 30 October 2026: *"daai opening baar se buttons en woorde kan
 * beter lyk"*, and *"wanneer ek op daai bring a picture in druk dan gooi hy
 * my net na die photo bar toe in plaas van om mens sommer van daar af na die
 * device se foto's toe te vat."* So: three tiles of one shape, every word on
 * them whole, and the photo tile opens the phone's own picker, with no tool
 * bench in between.
 *
 *   node audit/poststart.mjs [port] [shot-folder]
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3417');
const folder = process.argv[3] || '';
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const { browser, page } = await enter({ width: 390, height: 844, touch: true, at: server.url });
const snap = async (name) => { if (folder) await page.screenshot({ path: `${folder}/${name}.png` }); };

try {
  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(900);
  await snap('start');

  const tiles = page.locator('[data-poststart]');
  check('the card offers three ways in', (await tiles.count()) === 3);
  const boxes = [];
  for (let i = 0; i < 3; i += 1) boxes.push(await tiles.nth(i).boundingBox());
  check('  as tiles of one size', boxes.every((b) => b && Math.abs(b.width - boxes[0].width) < 1 && Math.abs(b.height - boxes[0].height) < 2 && b.height >= 44),
    JSON.stringify(boxes.map((b) => b && [Math.round(b.width), Math.round(b.height)])));
  const cut = await page.evaluate(() => [...document.querySelectorAll('[data-poststart] span, [data-poststarthead], [data-poststartsays]')]
    .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1).map((el) => el.textContent));
  check('every word on the card is whole', cut.length === 0, cut.join(' | '));
  const says = await page.locator('[data-poststartsays]').innerText();
  check('the line under the heading is read whole, with no ⓘ', !says.includes('ⓘ') && says.length > 20, says);

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null),
    page.locator('[data-poststart="photo"]').click(),
  ]);
  check('Bring a picture in opens the phone\'s photos at once', chooser !== null);
  check('  and no tool bench opens in between', (await page.locator('[data-postpop]').count()) === 0);
  if (chooser) {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    await chooser.setFiles({ name: 'one.png', mimeType: 'image/png', buffer: png });
    await page.waitForTimeout(1200);
    check('  and the chosen photo is on the picture', (await page.locator('[data-poststart]').count()) === 0);
  }
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:poststart — ${problems.length} problem(s).`);
  process.exit(1);
}
console.log('\ncheck:poststart — a neat card, and the photo tile opens the photos.');
