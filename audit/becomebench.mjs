/**
 * Bring to life, in the Photo Editor: the suggestion, the three priced
 * presses, a sticker pulled out, waiting, and peeled off onto a layer.
 *
 * The owner, 27 October 2026: *"as dit soos 'n sticker afhaal, moet die
 * sticker effect in gebou word en afgetrek word wanneer hulle op dit
 * click"*, and *"daar moet dalk notifications op kom wat vra, make it come
 * alive, of pull the sticker and make a 3d model"*.
 *
 * fal.ai is not called: `/api/become` is answered here with a mask the shape
 * of the red circle on the test photo, which is what the engine sends.
 *
 *   node audit/becomebench.mjs [port] [shot-folder]
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3351');
const folder = process.argv[3] || '';
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const { browser, page } = await enter({ width: 390, height: 844, touch: true, at: server.url });
const snap = async (name) => { if (folder) await page.screenshot({ path: `${folder}/${name}.png` }); };

try {
  /* The engine, answered with a white circle on black where the red one is. */
  await page.route('**/api/become', async (route) => {
    const mask = await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 400; c.height = 400;
      const x = c.getContext('2d');
      x.fillStyle = '#000'; x.fillRect(0, 0, 400, 400);
      x.fillStyle = '#fff'; x.beginPath(); x.arc(200, 200, 70, 0, Math.PI * 2); x.fill();
      return c.toDataURL('image/png');
    });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: 'done', url: mask, credits: 2 }) });
  });

  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(900);
  await page.evaluate(() => { try { localStorage.setItem('fb.engine.yes.v1', '1'); } catch { /* */ } });
  /* The photo's own bench holds the way to bring one in. */
  await page.locator('[data-cutbench="pic"]').first().click();
  await page.waitForTimeout(450);

  const brought = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 400; c.height = 400;
    const x = c.getContext('2d');
    x.fillStyle = '#4b6f8f'; x.fillRect(0, 0, 400, 400);
    x.fillStyle = '#c0392b'; x.beginPath(); x.arc(200, 200, 70, 0, Math.PI * 2); x.fill();
    const blob = await new Promise((done) => c.toBlob(done, 'image/png'));
    const input = document.querySelector('[data-poststudio] input[type=file]') ?? document.querySelector('input[type=file]');
    if (!input || !blob) return false;
    const holder = new DataTransfer();
    holder.items.add(new File([blob], 'ball.png', { type: 'image/png' }));
    input.files = holder.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
  check('a photograph is brought in', brought === true);
  await page.waitForTimeout(600);
  /* The bench shut, as somebody does once the photo is in: the suggestion
     waits for no tool to be out. */
  await page.locator('[data-cutbench="pic"]').first().click();
  await page.waitForTimeout(2600);

  /* ── The suggestion, a moment after the photo opens ── */
  check('the photo offers to come alive, with its price',
    (await page.locator('[data-becomenudgego="alive"]').count()) === 1
    && /credit|krediet/i.test(await page.locator('[data-becomenudgego="alive"]').innerText()));
  await snap('nudge');
  const fits = await page.evaluate(() => {
    const el = document.querySelector('[data-becomenudge]');
    return el ? el.scrollWidth <= document.documentElement.clientWidth + 1 : false;
  });
  check('  and it fits the screen', fits);

  /* ── The bench: three presses, each with its price ── */
  await page.locator('[data-becomenudgego="sticker"]').first().click();
  await page.waitForTimeout(500);
  for (const id of ['sticker', 'alive', 'model3d']) {
    const button = page.locator(`[data-become="${id}"]`);
    check(`${id}: on the bench, with its price`, (await button.count()) === 1 && /credit|krediet/i.test(await button.innerText()));
  }
  check('the sticker suggestion turned Pull it out on', (await page.locator('[data-become="sticker"][aria-pressed="true"]').count()) === 1);
  await snap('bench');

  /* ── A tap on the thing: it waits, ready to peel ── */
  const glass = await page.locator('[data-postcanvas]').boundingBox();
  await page.mouse.click(glass.x + glass.width / 2, glass.y + glass.height / 2);
  await page.waitForTimeout(1200);
  check('the thing tapped waits on the photo, ready to peel', (await page.locator('[data-peel][data-peeling="no"]').count()) === 1);
  const sits = await page.evaluate(() => {
    const peel = document.querySelector('[data-peel]')?.getBoundingClientRect();
    const g = document.querySelector('[data-postcanvas]')?.getBoundingClientRect();
    if (!peel || !g) return null;
    return { dx: Math.round(peel.left + peel.width / 2 - (g.left + g.width / 2)), dy: Math.round(peel.top + peel.height / 2 - (g.top + g.height / 2)) };
  });
  check('  over the thing itself', sits !== null && Math.abs(sits.dx) < 12 && Math.abs(sits.dy) < 12, JSON.stringify(sits));
  await snap('ready');

  /* ── Peeled ── */
  await page.locator('[data-peel]').click();
  await page.waitForTimeout(300);
  check('a tap peels it', (await page.locator('[data-peel][data-peeling="yes"]').count()) === 1);
  await snap('peeling');
  await page.waitForTimeout(1300);
  check('  and it lands as a layer of its own', (await page.locator('[data-peel]').count()) === 0);
  check('  and the sticker offers to become a 3D model', (await page.locator('[data-becomenudgego="model3d"]').count()) === 1);
  await snap('peeled');
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\naudit/becomebench — ${problems.length} problem(s).`);
  process.exit(1);
}
console.log('\naudit/becomebench — the photo offers to come alive, each press says its price, and a sticker waits, peels and lands on a layer.');
