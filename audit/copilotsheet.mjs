/**
 * The room keeps its width on a tablet; the copilot comes when asked for.
 *
 * At 820 pixels the rail, the room and a copilot column left the room 180
 * pixels — ProBooth's opening sentence ran one word to a line — and at 1024 it
 * was 320. Between `md` and `xl` the copilot is now a sheet over the room
 * (see `copilotSheetFor` in page.tsx). This checks, at a tablet held upright,
 * a tablet on its side and a small desk:
 *
 *   - the room is at least as wide as a phone,
 *   - on a tablet the copilot is shut until the Room AI Copilot button,
 *     which opens it with the box she types into focused, and Escape shuts it,
 *   - on a desk it is the third column, as before.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3396';
const server = await serve(PORT);

const PHONE = 390;
let bad = 0;
const fail = (why) => { console.log(`  ✗ ${why}`); bad += 1; };
const state = (page) => page.locator('[data-copilotsheet]').getAttribute('data-copilotsheet').catch(() => null);

try {
for (const [width, height, sheet] of [[820, 1180, true], [1024, 768, true], [1280, 800, false]]) {
  const { browser, page, problems } = await enter({ width, height, at: server.url });
  await studio(page);
  await page.waitForTimeout(1000);
  for (const room of ['ProBooth', 'Collab Radar', 'Channel']) {
    try {
      await toRoom(page, room);
    } catch {
      fail(`${width} ${room}: no way in`);
      continue;
    }
    await page.waitForTimeout(1000);
    const m = await page.evaluate(() => {
      const aside = document.querySelector('[data-copilotaside]');
      const work = document.querySelector('[data-roomback]')?.closest('.flex-1');
      const w = (el) => (el ? Math.round(el.getBoundingClientRect().width) : 0);
      return { aside: w(aside), work: w(work) };
    });
    console.log(`${width} ${room.padEnd(12)} room ${m.work}px · copilot ${m.aside}px`);
    if (m.work < PHONE) fail(`${width} ${room}: the room is ${m.work}px, narrower than a phone`);
    if (sheet && m.aside > 0) fail(`${width} ${room}: the copilot takes a column on a tablet`);
    if (!sheet && m.aside === 0) fail(`${width} ${room}: the copilot column is missing on a desk`);

    await page.locator('[data-roomai]:visible').first().click();
    await page.waitForTimeout(700);
    const focused = await page.evaluate(() => !!document.activeElement?.closest('[data-copilotaside]'));
    if (!focused) fail(`${width} ${room}: Room AI Copilot did not reach the box she types into`);
    if (sheet) {
      if ((await state(page)) !== 'open') fail(`${width} ${room}: the sheet did not open`);
      if (room === 'ProBooth') await page.screenshot({ path: shot(`copilot-sheet-${width}.png`) });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      if ((await state(page)) !== 'shut') fail(`${width} ${room}: Escape did not shut the sheet`);
    }
  }
  if (problems.length) console.log('problems:', problems.slice(0, 4).join(' | '));
  await browser.close();
}
} finally {
  server.stop();
}

console.log(bad ? `\n${bad} wrong` : '\nright — the room keeps its width; the copilot opens over it on a tablet');
process.exitCode = bad ? 1 : 0;
