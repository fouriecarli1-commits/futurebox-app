/**
 * The poster maker, walked on a phone.
 *
 * The owner, 16 October 2026: a poster maker with three ways in. Read off the
 * glass and off what is sent: it opens from beside Bring a picture in; its
 * button says its price and waits until there is something to draw; a kind
 * sends its look and asks for words in her language; the poster comes back
 * as the picture on the post, in the poster's shape; her own lines go up
 * exactly, with the photo as the subject; and Undo takes a poster back. The
 * picture route is answered here, so nothing is spent.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3359');
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

/** A plain picture of one colour, made in the page, at a size. */
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
  await page.locator('[data-postposter]').click();
  await page.waitForTimeout(600);
  check('the poster maker opens from beside Bring a picture in', (await page.locator('[data-postermaker]').count()) === 1);
  const go = page.locator('[data-postergo]');
  check('its button says its price, and waits until there is something to draw', /6 credits/.test(await go.innerText()) && await go.isDisabled());

  /* A kind. */
  await page.locator('[data-posterkind="sale"]').click();
  await page.locator('[data-posterabout]').fill('30% off all winter jackets this weekend');
  await page.locator('[data-postersize="story"]').click();
  answer = Buffer.from(await made(540, 960, '#dc2626'));
  check('  and is ready once it is said what the poster is for', !(await go.isDisabled()));
  await go.click();
  await page.waitForSelector('[data-postermaker]', { state: 'detached', timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(800);
  const one = asked[0] ?? {};
  check('a kind sends its look and asks for words in her language', /bold promotional sale poster/.test(one.words ?? '') && /in English/.test(one.words ?? '') && one.aspect === '9:16' && !one.from,
    JSON.stringify({ aspect: one.aspect, from: Boolean(one.from) }));
  const story = await shape();
  check('the poster is the picture on the post, in the poster\'s shape', Math.abs(story.ratio - 16 / 9) < 0.02 && story.rgb[0] > 200 && story.rgb[1] < 60, JSON.stringify(story));

  /* Her own lines, with the poster now on the post as the subject. */
  await page.locator('[data-postposter]').click();
  await page.waitForTimeout(500);
  await page.locator('[data-posterway="lines"]').click();
  await page.locator('[data-posterline="headline"]').fill('Die "Groot" Uitverkoping');
  await page.locator('[data-posterline="cta"]').fill('Koop nou');
  await page.locator('[data-postersize="square"]').click();
  check('the photo on the post is offered as the subject, already chosen', (await page.locator('[data-posterphoto]').getAttribute('aria-pressed')) === 'true');
  answer = Buffer.from(await made(800, 800, '#2563eb'));
  await page.locator('[data-postergo]').click();
  await page.waitForSelector('[data-postermaker]', { state: 'detached', timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(800);
  const two = asked[1] ?? {};
  check('her lines go up exactly, her quotes unable to break ours', (two.words ?? '').includes('"Die ’Groot’ Uitverkoping"') && (two.words ?? '').includes('"Koop nou"'), two.words);
  check('  with the photo going up as the subject, in the square shape', Array.isArray(two.from) && two.from.length === 1 && /attached picture is the subject/.test(two.words ?? '') && two.aspect === '1:1');
  const square = await shape();
  check('  and the post is square and the new poster', Math.abs(square.ratio - 1) < 0.02 && square.rgb[2] > 200 && square.rgb[0] < 80, JSON.stringify(square));

  await page.locator('[data-postundo]').first().click();
  await page.waitForTimeout(600);
  const back = await shape();
  check('Undo takes the poster back', back.rgb[0] > 200 && back.rgb[2] < 80, JSON.stringify(back));
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:posterwalk — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:posterwalk — the poster says its price, sends what she typed exactly, lands on the post in its shape, and Undo takes it back.');
