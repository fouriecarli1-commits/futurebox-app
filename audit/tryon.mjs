/**
 * Clothes on a model, walked on a phone.
 *
 * Carli, 16 October 2026: *"Show clothes on models."* Read off the glass and
 * off what is sent: it opens from beside Bring a picture in; a garment
 * brought in goes up with a described model; choosing a real person keeps
 * the button shut until their photo is in and the box is ticked, and then
 * both pictures go up; the photo lands on the post in its shape. The picture
 * route is answered here, so nothing is spent.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3361');
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
  await page.locator('[data-posttryon]').click();
  await page.waitForTimeout(600);
  check('clothes on a model opens from beside Bring a picture in', (await page.locator('[data-tryon]').count()) === 1);
  const go = page.locator('[data-tryongo]');
  check('with no garment it asks for one, says its price, and will not spend',
    (await page.locator('[data-tryonneeds]').count()) === 1 && /6 credits/.test(await go.innerText()) && await go.isDisabled());

  await page.locator('[data-tryonfile]').setInputFiles({ name: 'dress.png', mimeType: 'image/png', buffer: Buffer.from(await made(300, 500, '#eab308')) });
  await page.waitForTimeout(800);
  check('a garment brought in is shown, and the button is ready', (await page.locator('[data-tryongarment]').count()) === 1 && !(await go.isDisabled()));

  /* A real person: shut until their photo is in and the box is ticked. */
  await page.locator('[data-tryonmodel="real"]').click();
  check('choosing a real person shuts the button until their photo is in', await go.isDisabled());
  await page.locator('[data-tryonpersonfile]').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: Buffer.from(await made(400, 600, '#78350f')) });
  await page.waitForTimeout(800);
  check('  and still until the box is ticked', (await page.locator('[data-tryonperson]').count()) === 1 && await go.isDisabled());
  await page.locator('[data-tryonconsent]').check();
  check('  and opens once it is', !(await go.isDisabled()));

  await page.locator('[data-tryonsetting="cafe"]').click();
  await page.locator('[data-tryonpose="half"]').click();
  await page.locator('[data-tryonsize="story"]').click();
  answer = Buffer.from(await made(540, 960, '#0891b2'));
  await go.click();
  await page.waitForSelector('[data-tryon]', { state: 'detached', timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(800);
  const one = asked[0] ?? {};
  check('the garment and the person go up, the garment first, kept themselves', Array.isArray(one.from) && one.from.length === 2
    && /Reproduce that exact garment/.test(one.words ?? '') && /Keep them exactly themselves/.test(one.words ?? '') && /cosy café/.test(one.words ?? '') && one.aspect === '9:16',
    JSON.stringify({ aspect: one.aspect, from: one.from?.length }));
  const story = await shape();
  check('the photo is the picture on the post, in the story shape', Math.abs(story.ratio - 16 / 9) < 0.02 && story.rgb[2] > 150 && story.rgb[0] < 60, JSON.stringify(story));

  /* Again with a described model, from the photo on the post. */
  await page.locator('[data-posttryon]').click();
  await page.waitForTimeout(500);
  await page.locator('[data-tryonmodel="w50"]').click();
  answer = Buffer.from(await made(600, 800, '#be123c'));
  await page.locator('[data-tryongo]').click();
  await page.waitForSelector('[data-tryon]', { state: 'detached', timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(600);
  const two = asked[1] ?? {};
  check('a described model sends only the garment, and says who wears it', Array.isArray(two.from) && two.from.length === 1 && /woman in her fifties/.test(two.words ?? '') && /an adult/.test(two.words ?? ''));
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:tryonwalk — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:tryonwalk — the garment goes up with a model or a person who agreed, and lands on the post in its shape.');
