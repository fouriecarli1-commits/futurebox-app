/**
 * Every room, and whether the tab bar is standing on any of its controls.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * `TabBar` is `fixed bottom-0 z-[95]`. Every full-screen room in this app is
 * below that, so the bar is painted over the foot of each of them.
 *
 * It was found one room at a time, and each time by Carli rather than by a
 * check. The Pro Booth's "Mix it down" — the button that room exists to reach
 * — was underneath it, and she asked for a feature that had been built and
 * covered. Fixing that, the same question of The Booth found two more, one of
 * them a paid control. Fixing *that* with a number of my own, seven pixels
 * short of the bar's real height, she found it again in a third room:
 *
 *   "By your voice is daar ook 'n hele button onder agter die main button
 *    bar. kyk asb na elke kamer en maak elke kamer reg."
 *
 * Three rooms, three separate reports, one fault. So this asks every room the
 * same question in one run, which is what she actually asked for.
 *
 * ── What it asks, and what it deliberately does not ──────────────────────
 *
 * It scrolls each room to its end and then asks what is *painted* at each
 * control — `elementFromPoint`, not `getBoundingClientRect`. A rectangle says
 * where a thing would be; it does not say whether a bar is on top of it, and
 * that difference is this whole fault.
 *
 * A control passing under the bar mid-scroll is ordinary and is not counted:
 * the question is whether anything is still under it when there is no more
 * scrolling to do.
 *
 * A room that will not open is reported as unopened rather than as passing.
 * A room nobody could reach is the one most likely to be broken.
 */
import { chromium } from 'playwright';
import { enter, studio, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3061';

/** The twelve on the door, by the first line of their own button. */
const ROOMS = [
  'Make a song', 'Studio', 'The Booth', 'Video desk', 'Hooks', 'Channel',
  'Collab Radar', 'Live', 'Your voice', 'Podcast', 'Sound trainer', 'Adverts',
];

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok ' : 'NOT'}  ${label}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};

const server = await serve(PORT);
/* `at` and flat width/height — `enter` takes neither a `port` nor a
   `viewport`, and passing them silently leaves it on its default port 3000,
   which is the server nobody started. */
const { browser, page } = await enter({
  at: `http://localhost:${PORT}`,
  width: 390,
  height: 844,
  touch: true,
});

try {
  /* Into the studio once. `toRoom` finds its own way back to the door — it
     presses "All rooms" when it has to — so calling `studio()` again from
     inside a room reaches for a header button the room is covering, and
     spends thirty seconds failing to click it. */
  await studio(page);

  for (const room of ROOMS) {
    await toRoom(page, room).catch(() => undefined);
    await page.waitForTimeout(1200);

    /* To the end of whatever scrolls, then ask. */
    await page.evaluate(() => {
      for (const el of Array.from(document.querySelectorAll('div, main, section'))) {
        if (el.scrollHeight > el.clientHeight + 4) el.scrollTop = el.scrollHeight;
      }
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(500);

    const found = await page.evaluate(() => {
      const bar = document.querySelector('nav.fixed.bottom-0');
      if (!bar) return { open: false, hidden: ['no tab bar'] };
      const over = bar.getBoundingClientRect();
      const hidden = [];
      for (const el of Array.from(document.querySelectorAll('button, input, select, textarea, a'))) {
        if (bar.contains(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) continue;
        if (r.bottom <= over.top || r.top >= over.bottom) continue;
        /* Painted over, not merely overlapping. An element behind an opaque
           room, or one the bar happens to sit in front of but which nothing
           can reach anyway, is not what this is looking for. */
        const x = Math.min(Math.max(r.x + r.width / 2, 1), window.innerWidth - 1);
        const y = Math.min(Math.max(r.y + r.height / 2, 1), window.innerHeight - 1);
        const top = document.elementFromPoint(x, y);
        if (top && (bar === top || bar.contains(top))) {
          hidden.push((el.innerText || el.getAttribute('aria-label') || el.type || el.tagName)
            .replace(/\s+/g, ' ').trim().slice(0, 28));
        }
      }
      return { open: true, hidden: [...new Set(hidden)] };
    });

    check(`${room}: the bar stands on nothing`, found.open && found.hidden.length === 0,
      found.hidden.join(', '));
  }

  await page.screenshot({ path: shot('underbar.png'), fullPage: false });
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 200)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:underbar — ${problems.length} room(s) with something under the bar:`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:underbar — twelve rooms, and the bar is standing on none of them.');
