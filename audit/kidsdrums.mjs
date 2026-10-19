/**
 * The drum game, played: once well, once not at all.
 *
 * The owner, 19 October 2026: *"die push van die buttons is die dromme vir
 * die liedjie en hou dan die beat. Onthou die awards wat kinders wen met elke
 * try."* A good try opens the next unit and says so the way her screenshot
 * does; a try that hits nothing still wins an award; both are kept.
 */
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';

const server = await serve(process.argv[2] || '3379');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};

const browser = await chromium.launch(launchOptions());
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const thrown = [];
page.on('pageerror', (error) => thrown.push(String(error).slice(0, 160)));
await page.route('**/api/kids', (route) => route.fulfill({
  json: { open: true, allowance: 40, spent: 0, left: 40, minutes: null, secondsLeft: null, signedIn: true },
}));

/** Play along: press each note's key as it reaches the line. */
const drummer = () => page.evaluate(() => new Promise((done) => {
  const keys = { hat: 'a', snare: 's', kick: 'd' };
  const pressed = new WeakSet();
  const started = performance.now();
  const tick = () => {
    const line = document.querySelector('[data-drumtrack] .z-10')?.getBoundingClientRect();
    if (line) {
      for (const note of document.querySelectorAll('[data-drumnote="waiting"]')) {
        if (pressed.has(note)) continue;
        const box = note.getBoundingClientRect();
        if (Math.abs(box.left + box.width / 2 - line.left) < 10) {
          pressed.add(note);
          window.dispatchEvent(new KeyboardEvent('keydown', { key: keys[note.dataset.drumlane] }));
        }
      }
    }
    if (document.querySelector('[data-drumresult]') || performance.now() - started > 30000) { done(); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}));

try {
  await page.goto(`${server.url}/kids`, { waitUntil: 'networkidle' });
  await page.locator('[data-kidsroom]').waitFor({ timeout: 15000 });
  await page.locator('[data-kidshome]').first().click().catch(() => undefined);
  const doors = await page.locator('[data-kidsroomdoor]').evaluateAll((all) => all.map((one) => one.getAttribute('data-kidsroomdoor')));
  check('Studio Games & Beats is the door under Easy Editing', doors.indexOf('games') === doors.indexOf('edit') + 1, doors.join(','));
  await page.locator('[data-kidsroomdoor="games"]').click();
  const game = page.locator('[data-kidsdrums]');
  await game.waitFor({ timeout: 10000 });
  check('the drum game is the first thing in it', await game.isVisible());
  check('  three pads that are the drums', (await game.locator('[data-drumpad]').count()) === 3);
  check('  and it starts on Unit 1', (await game.locator('[data-drumunit]').getAttribute('data-drumunit')) === '1');

  await game.locator('[data-drumplay]').click();
  await drummer();
  await game.locator('[data-drumresult]').waitFor({ timeout: 35000 });
  const said = await game.locator('[data-drumsays]').innerText();
  check('playing along well opens the next unit, and says so', /Unit 2 unlocked/.test(said), said);
  /* The notes have scrolled off by the end, so the stars and the award are
     what say the presses landed. */
  const stars = await game.locator('[data-drumresult] [aria-label]').first().getAttribute('aria-label');
  const award = await game.locator('[data-drumaward]').getAttribute('data-drumaward');
  check('  because the presses landed on the notes', /^[23] \/ 3$/.test(stars ?? ''), stars ?? '');
  check('  and the try wins an award for it', !['brave', 'again'].includes(award ?? 'brave'), award ?? '');
  await page.screenshot({ path: shot('kidsdrums.png') });
  await game.locator('[data-drumcontinue]').click();
  check('Continue goes on to Unit 2', (await game.locator('[data-drumunit]').getAttribute('data-drumunit')) === '2');

  await game.locator('[data-drumplay]').click();
  await game.locator('[data-drumresult]').waitFor({ timeout: 35000 });
  check('a try that hits nothing still wins an award',
    ['brave', 'again'].includes(await game.locator('[data-drumaward]').getAttribute('data-drumaward')));
  check('  and does not take away what was opened', /Unit|Good try/.test(await game.locator('[data-drumsays]').innerText()));
  await game.locator('[data-drumcontinue]').click();
  check('the awards are kept on the shelf under the game',
    /2/.test(await game.locator('[data-drumawards]').innerText().catch(() => '')));
  check('nothing threw', thrown.length === 0, thrown.join(' | '));
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:kidsdrumwalk — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:kidsdrumwalk — the band plays, the pads are the drums, a good try opens the next unit, and every try wins an award that is kept.');
