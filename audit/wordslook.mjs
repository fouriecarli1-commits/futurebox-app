/**
 * The words' own sliders and ways round, read off the glass.
 *
 * The owner, 30 October 2026: *"By teks moet daar ook 'n transparency slider
 * wees, en met die glowy tekste 'n glow slider ... Dan ook 'n shadow slider.
 * Teks se rigting, vertical ... omgooi ... flip ... En rotation."* And the
 * colour is chosen in the app's own sheet, not the phone's dialog.
 *
 *   node audit/wordslook.mjs [port] [shot-folder]
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3423');
const folder = process.argv[3] || '';
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const { browser, page } = await enter({ width: 390, height: 844, touch: true, at: server.url });
const snap = async (name) => { if (folder) await page.screenshot({ path: `${folder}/${name}.png` }); };
/** Where the bright letters are: how many, and the box round them as shares of the picture. */
const letters = () => page.evaluate(() => {
  const el = document.querySelector('[data-postcanvas]');
  const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
  let n = 0; let x0 = 1; let x1 = 0; let y0 = 1; let y1 = 0; let sum = 0;
  for (let i = 0; i < d.length; i += 4) {
    const bright = d[i] + d[i + 1] + d[i + 2];
    if (bright > 600) {
      n += 1;
      const p = i / 4;
      const x = (p % el.width) / el.width; const y = Math.floor(p / el.width) / el.height;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    sum += bright;
  }
  return { n, wide: x1 - x0, tall: y1 - y0, left: x0, sum };
});
const slide = async (id, to) => {
  await page.locator(`[data-postwordslider="${id}"] input`).evaluate((el, v) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, to);
  await page.waitForTimeout(400);
};

try {
  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(800);
  await page.locator('[data-cutbench="text"]').first().click();
  await page.waitForTimeout(400);
  await page.locator('[data-addwords]').first().click();
  await page.waitForTimeout(300);
  await page.locator('textarea').first().fill('NEON NIGHTS');
  await page.waitForTimeout(500);
  const flat = await letters();
  check('the words are on the picture, wider than tall', flat.n > 200 && flat.wide > flat.tall * 2, JSON.stringify(flat));
  for (const id of ['alpha', 'shadow', 'turn']) check(`  a ${id} slider is there`, (await page.locator(`[data-postwordslider="${id}"]`).count()) === 1);

  await page.locator('[data-postwordsvertical="up"]').click();
  await page.waitForTimeout(500);
  const up = await letters();
  await snap('words-up');
  check('Up the side stands them on their side', up.tall > up.wide * 2, JSON.stringify(up));
  await page.locator('[data-postwordsvertical="flat"]').click();
  await page.waitForTimeout(400);

  await page.locator('[data-postwordsflipx]').click();
  await page.waitForTimeout(400);
  const mirrored = await letters();
  check('Mirror turns them back to front, in the same place', Math.abs(mirrored.n - flat.n) < flat.n * 0.1 && Math.abs(mirrored.left - flat.left) < 0.05 && mirrored.sum !== flat.sum,
    JSON.stringify(mirrored));
  await page.locator('[data-postwordsflipx]').click();
  await page.waitForTimeout(300);

  await slide('turn', 45);
  const turned = await letters();
  check('Turn tilts them', turned.tall > flat.tall * 2, `${flat.tall} → ${turned.tall}`);
  await slide('turn', 0);

  await slide('alpha', 80);
  const faint = await letters();
  check('See-through fades them', faint.n < flat.n * 0.2, `${flat.n} → ${faint.n}`);
  await slide('alpha', 0);

  await page.locator('[data-postwordsink]').first().click();
  await page.waitForTimeout(300);
  check('the colour opens the app\'s own sheet, with every word whole',
    (await page.locator('[data-neonsheet]').count()) === 1 && (await page.locator('[data-neonswatch]').count()) >= 20);
  await snap('words-colour');
  await page.locator('[data-neonswatch="#FF2BD6"]').click();
  await page.locator('[data-neondone]').click();
  await page.waitForTimeout(400);
  const pink = await page.evaluate(() => {
    const el = document.querySelector('[data-postcanvas]');
    const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] < 120 && d[i + 2] > 170) n += 1;
    return n;
  });
  check('  and a colour chosen there colours the words', pink > 200, String(pink));
} catch (problem) {
  check('the walk itself', false, String(problem).slice(0, 300));
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:wordslook — ${problems.length} problem(s).`);
  process.exit(1);
}
console.log('\ncheck:wordslook — the words fade, cast a shadow, turn, stand up, mirror, and take a colour from the app\'s own sheet.');
