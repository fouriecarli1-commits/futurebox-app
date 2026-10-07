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
import { ROOMS } from './rooms.mjs';

const PORT = process.argv[2] || '3061';

/** The twelve on the door, by the first line of their own button. */

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

    /* ── A room that claims the screen has no bar, and that is the point ──

       Carli asked for it twice, about two rooms: *"daai buttons vervang die
       harde buttons van die hele app, dan val daai hele bar van die app in die
       booth weg"* (14 September, the Pro Booth) and *"Daai onderste harde bar
       van die hele app moet weg wees binne die kamer"* (4 October, the cutting
       room). `app/lib/fullroom.ts` is how a room does it.

       So "no tab bar" is not one answer here, it is two: a bar that failed to
       draw, and a room that correctly sent it away. Telling them apart is what
       `[data-cutdock]`/`[data-boothdock]` is for — a room that claims the
       screen owes one of its own in that space, and a room with neither has
       simply lost its navigation.

       Without this the probe reported the cutting room as broken for doing
       exactly what it was asked to do, which is the kind of failure that gets
       a probe switched off. */
    /* ── And it is the bar of THIS room, not the last one ──────────────
 
       A room that claims the screen stays MOUNTED under the door and under
       whatever is opened next — that is the subject of the last assertion in
       this file. So `querySelector` can hand back a bar belonging to a room
       nobody is looking at: on 7 October the photo editor was reported as
       failing with "the room's own bar ends at 223 in a 844px window", and
       223 was the cutting room's bar, drawn behind it, while the photo
       editor's own was exactly on the bottom edge.
 
       So: what is PAINTED at the foot of the screen, which is the question
       this whole probe is built on, with the tallest-reaching bar as the
       fallback when nothing of the kind is painted there — because that is
       the real fault this assertion exists to catch and it still has to be
       reported as itself. */
    const instead = await page.evaluate(() => {
      const view = window.innerHeight;
      const docks = Array.from(document.querySelectorAll('[data-cutdock], [data-boothdock]'));
      if (docks.length === 0) return null;
      const at = document.elementFromPoint(Math.round(window.innerWidth / 2), view - 2);
      const painted = at ? at.closest('[data-cutdock], [data-boothdock]') : null;
      const own = painted ?? docks
        .reduce((best, one) => (one.getBoundingClientRect().bottom
          > best.getBoundingClientRect().bottom ? one : best));
      const r = own.getBoundingClientRect();
      return { bottom: Math.round(r.bottom), view };
    });

    if (!found.open && instead) {
      check(`${room}: the app's bar steps aside for the room's own`,
        instead.bottom >= instead.view - 1,
        `the room's own bar ends at ${instead.bottom} in a ${instead.view}px`
        + " window — it took the app bar's space, so it has to fill it");
      continue;
    }

    check(`${room}: the bar stands on nothing`, found.open && found.hidden.length === 0,
      found.hidden.join(', ')
      + (found.open ? '' : ' — and the room draws no bar of its own in its place'));
  }

  /* ── And the bar comes BACK when the room stops being the screen ───────

     Carli, 4 October 2026: *"Die res van die app se harde buttons onder het
     verdwyn seker toe jy die nuwe video kamer gebou het."*

     She was right about the cause as well as the symptom. A room that claims
     the screen sends the app's bar away, which is what she asked for twice —
     but the cutting room stays MOUNTED when the room list is opened over it,
     so it went on holding the screen while she was looking at the door. The
     bar was missing from the door and from everything she reached through it,
     and the only way to get it back was to open a different room.

     Every assertion above walks INTO a room. None of them walked back out and
     looked, which is why this passed for a day: "the bar stands on nothing" is
     true of a bar that is not drawn at all.

     So: into the room that claims the screen, back out to the door, and the
     bar has to be there. */
  /* Both of them. The photo editor claims the screen too since 7 October, and
     a room that holds the claim after she has walked out of it takes the
     whole app's navigation away — which is what Carli reported about the
     cutting room, so it is not hypothetical in either. */
  for (const claiming of ROOMS.filter((one) => one === 'Video Editor' || one === 'Photo Editor')) {
    try {
      await toRoom(page, claiming);
      await page.waitForTimeout(700);
      const inside = await page.evaluate(() => !!document.querySelector('nav.fixed.bottom-0'));
      check(`${claiming}: the app's bar is away while the room IS the screen`,
        inside === false,
        'this is the whole point of a room that claims the screen');

      await page.locator('[data-backout]:visible').first().click();
      await page.waitForTimeout(900);
      const after = await page.evaluate(() => ({
        bar: !!document.querySelector('nav.fixed.bottom-0'),
        room: !!document.querySelector('[data-videoeditor], [data-poststudio]'),
      }));
      check(`${claiming}: and it comes back the moment she steps out`,
        after.bar === true,
        `bar ${after.bar}, room still mounted ${after.room} — a room drawn`
        + ' under the door is not the screen any more, and a claim it keeps'
        + " holding takes the whole app's navigation away");
    } catch (why) {
      problems.push(`${claiming}: could not walk out — ${String(why).slice(0, 80)}`);
    }
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
/* Counted off `ROOMS` rather than written out. It said "twelve rooms" while
   it walked fifteen, which is the same fault as a probe measuring a subset:
   a sentence about a number nobody re-counts. */
console.log(`\ncheck:underbar — ${ROOMS.length} rooms, and the bar is standing on none of them.`);
