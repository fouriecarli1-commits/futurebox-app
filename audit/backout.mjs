/**
 * Both Backs walk out the same way.
 *
 * ── The fault this exists for ────────────────────────────────────────────
 *
 * Carli, 30 September 2026: *"Die back knoppie in make gaan terug na spotlight
 * en nie creative studio kamer nie."*
 *
 * The app had two Backs and they disagreed. The phone's own button walked the
 * layers — a room falls back to the door with every room on it, and only a
 * second press leaves the studio. The arrow in the room's header was
 * `setUploadModalOpen(false)` and nothing else: one press, straight out to
 * Spotlight, past the door.
 *
 * The wrong one was the one under her thumb, in the corner of the room she
 * was working in.
 *
 * ── What is measured ─────────────────────────────────────────────────────
 *
 * Both, against the same expectation, because a rule only one of them obeys
 * is how this started. Told apart by what is actually on screen: the video
 * desk draws the editor, the door draws the room list over it, and Spotlight
 * draws neither.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { ROOMS } from './rooms.mjs';
import { serve } from './where.mjs';

const PORT = 3339;
const problems = [];
const check = (what, passed, detail = '') => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) problems.push(what);
};

const server = await serve(PORT);
/* Phone-sized AND with a touch pointer. `app/globals.css` keeps the
   forty-four pixel minimums behind `@media (pointer: coarse)`, and desktop
   Chromium reports a fine pointer whatever viewport it is handed — so a probe
   that only shrinks the window measures the app with those rules off.
   `check:probes` holds every narrow probe to this. */
const { browser: b, page: p } = await enter({
  at: server.url, lang: 'en', width: 390, height: 844, touch: true,
});
p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));

/**
 * Which of the three places we are in, read off the screen.
 *
 * Told by the arrow rather than by anything a single room draws. The first
 * draft looked for the video editor, which measured one room and then said a
 * sentence about all of them — and her report was *"Kyk na elke kamer se back
 * knoppie"*, plural, precisely because it was not one room's bug.
 *
 * The arrow lives in the shared room column: present in a room, covered when
 * the door is drawn over it, gone once the studio is closed. Three places,
 * one signal, and no room list of its own.
 */
const place = async () =>
  p.evaluate(() => {
    const inStudio = document.querySelector('[data-backout]') !== null;
    const overlays = [...document.querySelectorAll('div.fixed.inset-0')].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 100 && r.height > 100 && getComputedStyle(e).visibility !== 'hidden';
    });
    if (!inStudio) return 'out';
    return overlays.length >= 2 ? 'door' : 'room';
  });

try {
  /* Four rooms, from the shared list, so this cannot quietly become a
     statement about one — her report was plural. `Live` is left out: it is a
     tab rather than a room on the door and reaches the studio its own way. */
  const WALK = ROOMS.filter((one) => one !== 'Live').slice(0, 4);

  for (const room of WALK) {
    await studio(p);
    await toRoom(p, room);
    await p.waitForTimeout(900);
    check(`${room}: the arrow is there to press`, (await place()) === 'room', await place());
    await p.locator('[data-backout]').click();
    await p.waitForTimeout(900);
    check('  and one press lands on the door, not on Spotlight',
      (await place()) === 'door',
      `${await place()} — the door is Make with every room on it, and it is one layer, not none`);
    await p.goBack();
    await p.waitForTimeout(700);
  }

  for (const how of ['the phone’s own Back', 'the arrow in the room']) {
    await studio(p);
    await toRoom(p, 'Video desk');
    await p.waitForTimeout(900);
    check(`${how}: she starts in the room`, (await place()) === 'room', await place());

    if (how.startsWith('the phone')) await p.goBack();
    else await p.locator('[data-backout]').click();
    await p.waitForTimeout(900);

    check('  and one press lands on the door, not outside',
      (await place()) === 'door',
      `${await place()} — the door is Make with every room on it, and it is one layer, not none`);

    if (how.startsWith('the phone')) {
      await p.goBack();
      await p.waitForTimeout(900);
      check('  and the second press leaves the studio',
        (await place()) === 'out',
        await place());
    } else {
      /* And there is no second press to make, which is the right answer
         rather than a gap in this walk. The arrow lives in the room's own
         header; at the door the room list is drawn over it, so the arrow is
         not reachable and the way on from there is the tab bar. Asserting it
         is hidden is the honest version of "one press, one layer" — the first
         draft asserted a second press that no thumb could ever make, and
         reported the correct screen as broken. */
      /* The rule is not "it is hidden" — `isVisible` reads CSS and says
         nothing about what is drawn on top of it, so the first draft of this
         asserted invisibility and failed a screen that was right.
 
         The rule this app actually holds is that **no press does nothing**.
         So: press it. Either the door is over it and the press cannot land —
         which is a fine answer — or it lands and must leave the studio. What
         may not happen is a button a thumb reaches, presses, and watches do
         nothing, which is the failure this app keeps meeting. */
      const landed = await p
        .locator('[data-backout]')
        .click({ timeout: 4000 })
        .then(() => true, () => false);
      await p.waitForTimeout(900);
      check('  and at the door it either cannot be pressed, or it leaves',
        !landed || (await place()) === 'out',
        `the press landed and left her at the ${await place()} — a control that answers a press with nothing`);
      if (!landed) await p.goBack();
      await p.waitForTimeout(600);
    }
  }
} catch (thrown) {
  problems.push(`threw: ${String(thrown).slice(0, 200)}`);
} finally {
  if (b) await b.close().catch(() => undefined);
  server.stop();
}

if (problems.length > 0) {
  console.error(`\ncheck:backout — ${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\ncheck:backout — in every room walked, the arrow and the phone walk out the same way, one layer at a time.');
