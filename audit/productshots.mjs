/**
 * Product photos, walked on a phone.
 *
 * The owner, 16 October 2026: *"Generate product photos in seconds."* Read off
 * the glass and off what is sent: it opens from beside Bring a picture in;
 * with no photo on the post it asks for one and will not spend; a product
 * brought in is shown and sent as a reference with the scene chosen; the
 * photo comes back as the picture on the post in the chosen shape; and
 * Undo takes it back. The picture route is answered here, so nothing is
 * spent.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3360');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const asked = [];
let answer = null;
const { browser, page } = await enter({
  width: 390, height: 844, touch: true, at: server.url,
  before: async (p) => {
    await p.route('**/api/google/picture', (route) => {
      asked.push(JSON.parse(route.request().postData() || '{}'));
      return route.fulfill({ status: 200, contentType: 'image/png', body: answer });
    });
  },
});
page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 200)}`));

const made = (w, h, colour) => page.evaluate(async ({ w, h, colour }) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = colour; x.fillRect(0, 0, w, h);
  const blob = await new Promise((done) => c.toBlob(done, 'image/png'));
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
}, { w, h, colour });
const shape = () => page.evaluate(() => {
  const el = document.querySelector('[data-postcanvas]');
  const d = el.getContext('2d').getImageData(Math.floor(el.width / 2), Math.floor(el.height / 2), 1, 1).data;
  return { ratio: el.height / el.width, rgb: [d[0], d[1], d[2]] };
});

try {
  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(900);
  await page.locator('[data-cutbench="pic"]').first().click();
  await page.waitForTimeout(400);
  await page.locator('[data-postproduct]').click();
  await page.waitForTimeout(600);
  check('product photos open from beside Bring a picture in', (await page.locator('[data-productshots]').count()) === 1);
  const go = page.locator('[data-productgo]');
  check('with no photo of the product it asks for one, says its price, and will not spend',
    (await page.locator('[data-productneeds]').count()) === 1 && /6 credits/.test(await go.innerText()) && await go.isDisabled());

  await page.locator('[data-productfile]').setInputFiles({ name: 'candle.png', mimeType: 'image/png', buffer: Buffer.from(await made(300, 400, '#16a34a')) });
  await page.waitForTimeout(800);
  check('a product brought in is shown, and the button is ready', (await page.locator('[data-productshown]').count()) === 1 && !(await go.isDisabled()));

  await page.locator('[data-productscene="marble"]').click();
  await page.locator('[data-productextra]').fill('with a sprig of lavender');
  await page.locator('[data-productsize="portrait"]').click();
  answer = Buffer.from(await made(600, 800, '#7c3aed'));
  await go.click();
  await page.waitForSelector('[data-productshots]', { state: 'detached', timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(800);
  const one = asked[0] ?? {};
  check('the product goes up as a reference, with the scene and her words', Array.isArray(one.from) && one.from.length === 1
    && /polished white marble/.test(one.words ?? '') && /sprig of lavender/.test(one.words ?? '') && /Reproduce the product exactly/.test(one.words ?? '') && one.aspect === '3:4',
    JSON.stringify({ aspect: one.aspect, from: one.from?.length }));
  const tall = await shape();
  check('the photo is the picture on the post, in the tall shape', Math.abs(tall.ratio - 1.25) < 0.02 && tall.rgb[2] > 180 && tall.rgb[1] < 90, JSON.stringify(tall));

  /* Again, from the photo now on the post. */
  await page.locator('[data-postproduct]').click();
  await page.waitForTimeout(500);
  check('the next time, the photo on the post is the product already', (await page.locator('[data-productshown]').count()) === 1 && !(await page.locator('[data-productgo]').isDisabled()));
  await page.locator('[data-productclose]').click();
  await page.waitForTimeout(400);

  await page.locator('[data-postundo]').first().click();
  await page.waitForTimeout(600);
  const back = await shape();
  check('Undo takes the product photo back', !(back.rgb[2] > 180 && back.rgb[1] < 90), JSON.stringify(back));
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:productwalk — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:productwalk — the product goes up as itself with the scene she chose, lands on the post in its shape, and Undo takes it back.');
