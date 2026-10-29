/**
 * Fix an old photo: three priced presses under The picture, the two yeses
 * first, and the fixed photo put in place of the old one as a step that can
 * be put back.
 *
 * fal.ai is not called: `/api/restore` answers with a photo the colour a
 * repair would never be, so the swap can be seen on the canvas.
 *
 *   node audit/restore.mjs [port]
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3494');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const { browser, page } = await enter({ width: 390, height: 844, touch: true, at: server.url });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));

/** The colour at the middle of the canvas. */
const middle = () => page.evaluate(() => {
  const c = document.querySelector('[data-postcanvas]');
  const d = c.getContext('2d').getImageData(Math.round(c.width / 2), Math.round(c.height / 2), 1, 1).data;
  return [d[0], d[1], d[2]];
});

try {
  let asked = null;
  await page.route('**/api/restore', async (route) => {
    asked = route.request().postDataJSON();
    const green = await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 400; c.height = 400;
      const x = c.getContext('2d');
      x.fillStyle = '#18c964'; x.fillRect(0, 0, 400, 400);
      return c.toDataURL('image/png');
    });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: 'done', url: green, credits: 3 }) });
  });

  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(900);
  await page.locator('[data-cutbench="pic"]').first().click();
  await page.waitForTimeout(450);
  const brought = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 400; c.height = 400;
    const x = c.getContext('2d');
    x.fillStyle = '#7a6a55'; x.fillRect(0, 0, 400, 400);
    const blob = await new Promise((done) => c.toBlob(done, 'image/png'));
    const input = document.querySelector('[data-poststudio] input[type=file]') ?? document.querySelector('input[type=file]');
    if (!input || !blob) return false;
    const holder = new DataTransfer();
    holder.items.add(new File([blob], 'old.png', { type: 'image/png' }));
    input.files = holder.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
  check('an old photo is brought in', brought === true);
  await page.waitForTimeout(1200);
  if ((await page.locator('[data-restore]').count()) === 0) { await page.locator('[data-cutbench="pic"]').first().click(); await page.waitForTimeout(600); }

  const buttons = await page.locator('[data-restorego]').allInnerTexts();
  check('three presses under The picture, each with its price',
    buttons.length === 3 && buttons.every((one) => /credits/.test(one)), JSON.stringify(buttons));
  const before = await middle();
  await page.locator('[data-restorego="repair"]').scrollIntoViewIfNeeded();
  await page.locator('[data-restorego="repair"]').click();
  await page.waitForTimeout(400);
  check('  the first time, it asks the two yeses and sends nothing', (await page.locator('[data-becomeyes]').count()) === 1 && asked === null);
  await page.locator('[data-becomeabroad]').check();
  await page.locator('[data-becomeadult]').check();
  await page.locator('[data-becomeyesgo]').click();
  await page.waitForTimeout(2500);
  check('  then it asks for a repair, with the photo and both yeses',
    asked?.restore === 'repair' && /^data:image\//.test(asked?.picture ?? '') && asked?.abroad === true && asked?.adult === true,
    JSON.stringify({ ...asked, picture: String(asked?.picture ?? '').slice(0, 30) }));
  const after = await middle();
  check('  and the fixed photo takes the old one\'s place', after[1] > 150 && after[0] < 100, `${before} → ${after}`);
  await page.locator('[data-postundo]').first().click();
  await page.waitForTimeout(800);
  const back = await middle();
  check('  and Put back brings the old photo back', Math.abs(back[0] - before[0]) < 12 && Math.abs(back[1] - before[1]) < 12, `${back}`);
  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (problem) {
  check('the walk itself', false, String(problem).slice(0, 300));
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\naudit/restore — ${problems.length} problem(s).`);
  process.exit(1);
}
console.log('\naudit/restore — an old photo is repaired on a priced press, after the two yeses, and can be put back.');
