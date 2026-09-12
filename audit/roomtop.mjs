/**
 * Every room opens at the top.
 *
 * Carli: "wanneer mens tussen kamers beweeg dat die kamer elke keer weer heel
 *  bo begin. huidiglik bly dit waar jy voorheen gescroll het, dan voel mens
 *  lost."
 *
 * ── Why it happened ──────────────────────────────────────────────────────
 *
 * The studio draws one working surface and swaps the room inside it. The
 * scroll position belongs to that surface, and the surface does not change
 * when the room does — so leaving the video desk two screens down and pressing
 * Channel drops you two screens into the Channel, in the middle of something
 * you have never seen. Nothing looks broken; it just reads as being lost,
 * which is the harder kind of fault to report.
 *
 * ── Why this is a probe and not a source check ───────────────────────────
 *
 * Because the interesting part is which element is actually scrolling, and
 * that depends on the width: on a phone the whole column scrolls and on a desk
 * it is the pane beside the rail. A source check would have to assume one of
 * them and would then pass while the other stayed broken.
 *
 * So this finds whatever is scrolling by measuring it, scrolls it, changes
 * room, and reads it back. And it asserts the scroll happened first — a probe
 * that switches rooms from a page that was already at the top proves nothing
 * at all, which is the way this test would rot.
 */
import { rmSync } from 'node:fs';
import { serve, shot } from './where.mjs';
import { enter, studio, toRoom, unfold } from './enter.mjs';

const PORT = process.argv[2] || '3098';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

/**
 * Everything in the studio that can be scrolled, except the way around it.
 *
 * The rail is a list of fourteen rooms and it scrolls on a short desk window.
 * It is navigation, not the room, and where it sits is nobody's business but
 * its own — sending a menu back to the top every time somebody uses it would
 * be a second annoyance rather than a fix for the first. The first version of
 * this probe swept it up with the rest and then reported 209 pixels of "the
 * room did not open at the top", which was the menu.
 */
const SCROLLERS = () => {
  const layer = document.querySelector('div.fixed.inset-0.z-50');
  if (!layer) return null;
  const found = [];
  for (const one of [layer, ...layer.querySelectorAll('*')]) {
    if (one.closest('nav')) continue;
    const style = getComputedStyle(one);
    if (!/auto|scroll/.test(style.overflowY)) continue;
    if (one.scrollHeight <= one.clientHeight + 8) continue;
    found.push(one);
  }
  return found;
};

let server = null;
let browser = null;
let fell = false;
try {
  server = await serve(PORT);

  for (const size of [
    { name: 'desk', width: 1280, height: 900 },
    { name: 'phone', width: 390, height: 844, touch: true },
  ]) {
    console.log(`\n— ${size.name} ${size.width}x${size.height}`);
    const opened = await enter({ at: server.url, width: size.width, height: size.height, touch: size.touch });
    browser = opened.browser;
    const page = opened.page;

    await studio(page);

    /* Walked in folded, then opened by hand.
 
       `toRoom` unfolds on the way in now, and unfolding scrolls — it has to
       bring each heading into view to press it. That is harmless in every
       probe except this one, whose entire subject is where the page is
       scrolled to the moment a room opens. Measuring after the scaffolding
       has scrolled the page is measuring the scaffolding.
 
       So every arrival here is `folded: true`, and the height this first
       assertion needs is made afterwards, deliberately, by `unfold`. */
    await toRoom(page, 'Video desk', { folded: true });
    await unfold(page);
    await page.waitForTimeout(1200);

    const pushed = await page.evaluate((find) => {
      const scrollers = new Function(`return (${find})()`)();
      if (!scrollers || !scrollers.length) return -1;
      let most = 0;
      for (const one of scrollers) {
        one.scrollTop = one.scrollHeight;
        if (one.scrollTop > most) most = one.scrollTop;
      }
      return most;
    }, SCROLLERS.toString());
    check(`${size.name} · a room has something to scroll`, pushed > 50, `${Math.round(pushed)}px down`);

    /* Now the thing she described: a different room, from there. */
    await toRoom(page, 'Channel', { folded: true });
    await page.waitForTimeout(1200);

    const after = await page.evaluate((find) => {
      const scrollers = new Function(`return (${find})()`)();
      if (!scrollers) return -1;
      return scrollers.reduce((most, one) => Math.max(most, one.scrollTop), 0);
    }, SCROLLERS.toString());
    check(`${size.name} · the next room opens at the top`, after <= 1, `${Math.round(after)}px down`);

    /* And out through the door, which is the other way in and does not change
       which room is chosen — so it is the path a fix in `goToRoom` alone would
       miss. */
    await unfold(page);
    await page.evaluate((find) => {
      const scrollers = new Function(`return (${find})()`)();
      for (const one of scrollers ?? []) one.scrollTop = one.scrollHeight;
    }, SCROLLERS.toString());
    await toRoom(page, 'Video desk', { folded: true });
    await page.waitForTimeout(1200);
    const backAgain = await page.evaluate((find) => {
      const scrollers = new Function(`return (${find})()`)();
      if (!scrollers) return -1;
      return scrollers.reduce((most, one) => Math.max(most, one.scrollTop), 0);
    }, SCROLLERS.toString());
    check(`${size.name} · and so does the one after that`, backAgain <= 1, `${Math.round(backAgain)}px down`);

    await page.screenshot({ path: shot(`roomtop-${size.name}.png`) });
    await browser.close();
    browser = null;
  }
} catch (problem) {
  fell = true;
  console.error(`  FAIL the probe itself fell over — ${String(problem).slice(0, 240)}`);
} finally {
  if (browser) await browser.close();
  if (server) await server.stop();
}

if (problems.length || fell) {
  console.error(`\ncheck:roomtop — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:roomtop — every room opens at the top, at both widths and through the door.');
