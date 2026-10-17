/**
 * The video editor's Motion bench, used the way she would.
 *
 * Carli, 17 October 2026, about another program's motion effects: *"Die
 * effects … kan ook cool wees."* Read off the player: a movement chosen moves
 * the picture by the same numbers the renderer uses, How strong makes it
 * stronger, a keyframe set at the playhead changes the picture there, and
 * Keep the picture still puts it back.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3357');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const { browser, page } = await enter({ at: server.url, lang: 'en' });
page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
const bench = async (which) => {
  const button = page.locator(`[data-cutbench="${which}"]`);
  if ((await button.getAttribute('aria-pressed').catch(() => null)) === 'true') return;
  await button.click({ timeout: 10000 }).catch(() => undefined);
  await page.waitForTimeout(500);
};
/** The scale the player is drawn at right now. */
const scaleNow = async () => {
  const transform = await page.locator('[data-editorviewer]').evaluate((el) => el.style.transform);
  const m = /scale\(([\d.]+)\)/.exec(transform);
  return { transform, scale: m ? Number(m[1]) : 1 };
};

try {
  await studio(page);
  await toRoom(page, 'Video Editor');
  await page.waitForTimeout(900);

  /* A shot to move: colour bars from the generators. */
  await bench('folder');
  await page.locator('[data-editorgenbench] summary').click();
  await page.waitForTimeout(300);
  await page.locator('[data-editorgenhead="test"]').click();
  await page.locator('[data-editorgenerator="colourBars"]').click();
  await page.locator('[data-editorgenlong="2"]').click();
  await page.locator('[data-editorgenmake]').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-editorblock]').length >= 1, null, { timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(1500);

  await bench('motion');
  const tiles = await page.locator('[data-editormove]').count();
  check('Motion is a bench, with its movements as moving pictures', tiles >= 18 && (await page.locator('[data-editormove] span span').count()) >= 18, String(tiles));
  check('  and a shot with no movement is drawn still', (await scaleNow()).transform === '');

  await page.locator('[data-editormove="zoomOut"]').click();
  await page.waitForTimeout(500);
  const pulled = await scaleNow();
  check('Pull out starts the shot pushed in, by the renderer\'s numbers', pulled.scale > 1.1 && pulled.scale < 1.3, pulled.transform);
  await page.locator('[data-editorkeydial="strength"] input').fill('2');
  await page.waitForTimeout(400);
  const stronger = await scaleNow();
  check('  and How strong makes it stronger', stronger.scale > pulled.scale + 0.1, `${pulled.scale} → ${stronger.scale}`);

  await page.locator('[data-editorkeyadd]').click();
  await page.waitForTimeout(300);
  check('a keyframe is set at the playhead', (await page.locator('[data-editorkeyframe]').count()) === 1 && (await page.locator('[data-editorkeyon]').count()) === 1,
    `${await page.locator('[data-editorkeyframe]').count()} keys, ${await page.locator('[data-editorkeyon]').count()} open`);
  await page.locator('[data-editorkeydial="scale"] input').fill('2');
  await page.waitForTimeout(400);
  const keyed = await scaleNow();
  check('  and making it bigger there makes the picture bigger there', keyed.scale > stronger.scale * 1.8, `${stronger.scale} → ${keyed.scale}`);
  await page.locator('[data-editorkeydial="rotate"] input').fill('30');
  await page.waitForTimeout(400);
  check('  and turning it turns the picture', /rotate\(30(\.0+)?deg\)/.test((await scaleNow()).transform), (await scaleNow()).transform);

  await page.locator('[data-editormotionclear]').click();
  await page.waitForTimeout(400);
  check('Keep the picture still puts it back', (await scaleNow()).transform === '' && (await page.locator('[data-editorkeyframe]').count()) === 0,
    `${(await scaleNow()).transform} · ${await page.locator('[data-editorkeyframe]').count()} keys`);
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:editormotion — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:editormotion — a movement moves the picture by the renderer\'s numbers, keyframes change it where they are set, and still is still.');
