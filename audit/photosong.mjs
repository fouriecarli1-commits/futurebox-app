/**
 * A song out of a photograph, both halves of it.
 *
 * There are two, and they are different promises. One measures the picture on
 * the device — colour, light, busyness — and cannot tell a beach from an
 * orange wall. The other sends it to the model and comes back with words about
 * what is actually there.
 *
 * ── Why the model is stood in for ────────────────────────────────────────
 *
 * There is no Anthropic key here and there must not be one: a probe that needs
 * a paid account is a probe nobody runs. What is being checked is this app —
 * that it does not offer the second one where there is no model behind it,
 * that it does offer it where there is, and that what comes back lands in the
 * room rather than in a message nobody reads.
 *
 * The first of those is the one worth having. A button that always fails is
 * worse than a button that is not there, and "available" is asked of the route
 * rather than assumed.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3144';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

/** A real 2×2 PNG, so the canvas has something to measure. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGP8z8Dwn4GBgYGJAQkAAB' +
    'YoAQ2mM3qXAAAAAElFTkSuQmCC',
  'base64',
);

const WROTE = {
  title: 'Orange Wall',
  style: 'warm acoustic pop, fingerpicked guitar, brushed drums, close vocal, sparse',
  lyrics: '[Verse]\nAn orange wall and a folding chair\nSomebody left the radio on\n\n[Chorus]\nAnd the afternoon went nowhere',
  saw: 'A plain orange wall in strong afternoon light.',
};

/** The whole walk, once, with the model either present or absent. */
async function run(browser, hasModel) {
  const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

  await p.route('**/api/photosong', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ available: hasModel }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(WROTE) });
  });

  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill(`photo-${hasModel}@futurebox.test`);
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('photo-password-1234');
  await p.locator('button[type="submit"]').first().click();

  /* Waited for, not slept through. A `click()` auto-waits, so the sleeps here
     were survivable right up to the first `count()` — and `count()` does not
     wait for anything. This probe read an empty room, found no file input, set
     no picture, and reported "the picture is measured either way — nothing",
     which is a true sentence about a room it had not opened yet. */
  const bar = p.locator('nav[aria-label]').first();
  await bar.waitFor({ state: 'visible', timeout: 30000 });
  await bar.locator('button').filter({ hasText: 'Make' }).first().click();
  await p.locator('div.fixed.inset-0.z-\\[55\\] button').first()
    .waitFor({ state: 'visible', timeout: 20000 })
    .catch(() => undefined);
  const door = p.locator('div.fixed.inset-0.z-\\[55\\] button');
  const many = await door.count();
  for (let i = 0; i < many; i += 1) {
    const first = ((await door.nth(i).innerText().catch(() => '')) ?? '').split('\n')[0].trim();
    if (/^Make a song/i.test(first)) {
      await door.nth(i).click();
      break;
    }
  }
  const room = p.locator('div.fixed.inset-0.z-50').first();
  await room.waitFor({ state: 'visible', timeout: 20000 });
  const says = async () => ((await room.innerText()) ?? '').replace(/\s+/g, ' ');

  /* The picture, through the file input the camera button opens. Waited for
     rather than assumed: `setInputFiles` auto-waits, but everything read
     afterwards does not, and a room that is still drawing has no input yet. */
  /* Addressed by its own handle rather than by being first on the screen.
     It was first until the prompt cards arrived above it with a camera of
     their own, and then this probe filled theirs and measured nothing. */
  const picker = room.locator('input[data-take="picture"]').first();
  await picker.waitFor({ state: 'attached', timeout: 20000 });
  await picker.setInputFiles({ name: 'wall.png', mimeType: 'image/png', buffer: PNG });
  await p.waitForTimeout(1500);

  check(`${hasModel ? 'with' : 'without'} a model: the picture is measured either way`,
    (await says()).includes('Measured:'), (await says()).match(/Measured:[^·]*/)?.[0] ?? 'nothing');

  const write = room.locator('button').filter({ hasText: /^And write the song from it$/ });
  if (!hasModel) {
    check('and where there is no model, the writing is not offered at all',
      (await write.count()) === 0, `${await write.count()} buttons`);
    await p.close();
    return;
  }

  check('and where there is one, it is offered', (await write.count()) === 1);
  await write.first().click();
  await p.waitForTimeout(1500);

  const title = await room.locator('input:visible').first().inputValue();
  const boxes = room.locator('textarea');
  const words = await boxes.first().inputValue();
  const style = await boxes.nth(1).inputValue();
  check('pressing it puts the title in the room', title === WROTE.title, `"${title}"`);
  check('and the words, with their part markers',
    words.includes('[Verse]') && words.includes('orange wall'), JSON.stringify(words.slice(0, 44)));
  check('and the style, which is what the engine reads',
    style.includes('fingerpicked guitar'), style.slice(0, 50));
  check('and says what it thinks it saw, so you can tell whether it looked',
    (await says()).includes('afternoon light'));
  await p.screenshot({ path: shot('photosong.png') });
  await p.close();
}

let server = null;
let browser = null;
try {
  server = spawn('npx', ['next', 'start', '-p', PORT], { detached: true, stdio: 'ignore' });
  for (let tries = 0; tries < 40; tries += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const r = await fetch(`http://localhost:${PORT}/`);
      if (r.ok) break;
    } catch { /* not up yet */ }
  }

  browser = await chromium.launch(launchOptions());
  await run(browser, false);
  await run(browser, true);
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\ncheck:photosong — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:photosong — measured with no model, written with one, and never offered where it cannot work.');
