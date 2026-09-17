/**
 * A real photograph into the shot's picture strip, on a phone.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli, twice: "die laai jou eie foto op in shot werk steeds nie. Bladsy is
 * wit." `audit/frame.mjs` already attaches a picture and has always passed,
 * which is how the fault survived two reports — it attaches a **one-pixel
 * PNG**. Everything works at one pixel. Nothing about that file exercises the
 * thing a phone actually hands over, which is three or four megabytes.
 *
 * So this one uses `audit/fixtures/bigphoto.png`: 1100 x 1100 of pure noise,
 * 3.46 MB, deliberately incompressible so the bytes are real. As a data URL
 * that is about 4.6 MB, which is the number that matters — a browser's
 * localStorage quota is around 5 MB for the whole origin.
 *
 * ── What it watches for ──────────────────────────────────────────────────
 *
 * Not "did the strip list it". A white page is the report, so the test is
 * whether anything is still on screen afterwards, plus every error the page
 * raised — including unhandled promise rejections, which is the shape an
 * async file handler fails in and the shape `pageerror` alone does not catch.
 */
import { enter, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';

/* Its own server on its own port. A probe that borrows whatever is listening
   on 3000 is a probe that passes against whatever somebody left running. */
const PORT = process.argv[2] || '3119';
const server = await serve(PORT);

/* A phone, with a coarse pointer. She is holding one; the desktop run below
   is not the report. `hasTouch` matters beyond the viewport — globals.css
   keeps a whole block behind `@media (pointer: coarse)`. */
const { browser, page, problems } = await enter({ at: `http://localhost:${PORT}`, width: 390, height: 844, touch: true });

/* Rejections as well as throws. An `async` onload that rejects never reaches
   `pageerror`, and the whole upload path is inside one. */
const rejections = [];
await page.addInitScript(() => {
  window.__rejections = [];
  window.addEventListener('unhandledrejection', (event) => {
    window.__rejections.push(String(event.reason && event.reason.message ? event.reason.message : event.reason));
  });
});

await page.route('**/api/video', async (route) => {
  if (route.request().method() !== 'GET') return route.continue();
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      available: true,
      auth: 'api-key',
      grades: ['standard', 'premium'],
      can: {
        standard: { seconds: [5, 10], aspects: ['16:9', '9:16'], speaks: false, startFrame: false },
        premium: { seconds: [5, 10], aspects: ['16:9', '9:16'], speaks: true, startFrame: true },
      },
      sound: true,
      startFrame: true,
    }),
  });
});

/* `toRoom`, not `studio` then a click.

   `studio()` reaches for a button in the HEADER, and a phone has no header
   rail — the way in is the arrival door. `toRoom` knows both and is the one
   that is maintained. Unfolded on the way in, because "The shot" is a panel
   and every room's panels start closed. */
/* On a phone there is no header rail and no arrival door waiting — the way
   in is the bottom bar, and "Make" is the studio. `toRoom` reaches for the
   door and the rail and finds neither, so it is pressed by hand here. */
await page.locator('nav[aria-label] button').filter({ hasText: /^Make$/ }).first().click();
await page.waitForTimeout(1400);
/* `toRoom` returns nothing and opens every folded panel on its way in,
   which is what puts "The shot" on screen at all. The overlay is picked up
   separately afterwards. */
await toRoom(page, 'Video desk', { folded: false });
await page.waitForTimeout(1200);
const room = page.locator('div.fixed.inset-0.z-50').first();
/* The grade that carries a start frame, found rather than named.

   `audit/frame.mjs` clicks a button whose text begins "Premium" and that
   name has moved since it was written. What actually matters is that the
   picture attachment appears, so this presses each grade in turn and stops
   at the first one that produces a file input. A probe that hard-codes a
   label is a probe that reports the room broken when a word changed. */
/* "The shot" is a folded panel, and every room's panels start folded.

   That is the whole reason `audit/frame.mjs` and this one first came back
   with no file input at all: the attachment is real and is simply behind a
   heading nobody had pressed. */
/* ── First: pick a kind of video ──────────────────────────────────────

   This tool has never reached the shot. It went looking for the picture
   strip on a desk that was still asking *"Pick a kind of video to start
   from"* — the panel with the shot in it does not exist until a template is
   chosen, so "picture inputs: 0" was true and meant nothing about the
   upload. That is why two days of looking at the image code found nothing:
   the report was never reproduced, only guessed at.

   Chosen by pressing the first template the desk offers rather than by name,
   because the list has been rewritten twice and a tool that knows the names
   goes quiet the third time. */
/* ── And the picture only exists on a grade that reads one ────────────

   This is what the tool was missing, and it is why two days of reading the
   image code found nothing: the report was never reproduced, only guessed
   at.

   On Standard the strip is deliberately not drawn — the desk says so in
   words: *"The engines behind this grade would ignore the picture and charge
   you anyway, so it is not offered here. It works on Premium."* — and offers
   a button to switch. So a tool that lands on Standard and looks for a file
   input finds none, reports "picture inputs: 0", and that sentence is true
   and says nothing whatever about the upload.

   Pressing the desk's own way through rather than setting a grade behind its
   back, because the button is what she pressed too. */
const pictures = room.locator('input[data-take="shotpicture"]');
if ((await pictures.count()) === 0) {
  const toPremium = room.locator('button')
    .filter({ hasText: /Switch to Premium|Skakel oor na Premium/ }).first();
  if (await toPremium.count()) {
    await toPremium.click().catch(() => undefined);
    await page.waitForTimeout(1200);
    console.log('switched to Premium → picture inputs:', await pictures.count());
  }
}
/* Still nothing: try each grade the desk offers, by its own button. */
if ((await pictures.count()) === 0) {
  for (const label of ['Premium', 'Better', 'Beter']) {
    const grade = room.locator('button').filter({ hasText: new RegExp(`^${label}$`) }).first();
    if ((await grade.count()) === 0) continue;
    await grade.click().catch(() => undefined);
    await page.waitForTimeout(1200);
    console.log('pressed grade:', label, '→ picture inputs:', await pictures.count());
    if ((await pictures.count()) > 0) break;
  }
}

const file = room.locator('input[type="file"]');
if ((await file.count()) === 0) {
  const shotPanel = room.locator('button').filter({ hasText: /^The shot|^Die skoot/ }).first();
  if (await shotPanel.count()) {
    await shotPanel.click().catch(() => undefined);
    await page.waitForTimeout(900);
  }
}
/* And the picture attachment only exists on a grade that reads one, so if it
   is still not there, try each grade in turn. Found by what it produces
   rather than by its name — the label has moved once already. */
if ((await file.count()) === 0) {
  for (const one of await room.locator('button').all()) {
    const label = (await one.innerText().catch(() => '')).trim();
    if (!/premium|beter|better|hoog|best/i.test(label)) continue;
    await one.click().catch(() => undefined);
    await page.waitForTimeout(800);
    if ((await file.count()) > 0) break;
  }
}
console.log('file input present:', await file.count());
if ((await file.count()) === 0) {
  console.log('buttons on the desk:', (await room.locator('button').allInnerTexts())
    .map((one) => one.split('\n')[0].trim()).filter(Boolean).slice(0, 25).join(' | '));
  await page.screenshot({ path: shot('bigphoto.png') });
  await browser.close();
  await server.stop();
  process.exit(1);
}

/* The PICTURE input, not the first one on the page.

   There are several: Pictures takes images, Cast takes a presenter's face,
   the storyboard takes audio. `first()` was landing on whichever React
   happened to mount first, so a run could report "nothing was stored" about
   an input that was never going to store a picture. Matched on what it
   accepts, which is the only thing that actually distinguishes them. */
/* ── The SHOT's picture input, by name ────────────────────────────────

   This was `input[type="file"][accept*="image/png"]`, with a note saying
   what a control accepts is the only thing that tells these apart. It is
   not: `Cast` takes a presenter's face, accepts the same five types, sits
   in the same overlay and comes FIRST in the DOM. So this tool spent two
   days filling the cast's input and reporting "nothing was stored" — true,
   and nothing to do with the shot. The input carries `data-take` now. */
const picture = room.locator('input[data-take="shotpicture"]').first();
console.log('picture inputs:', await pictures.count());
/* Every file input on the WHOLE page, with what it accepts and where it
   lives. "picture inputs: 0" inside the overlay says the strip is not there;
   it does not say why, and the difference between "not rendered" and "not in
   this overlay" is the whole diagnosis. */
console.log('all file inputs on the page:', JSON.stringify(await page.evaluate(() =>
  [...document.querySelectorAll('input[type="file"]')].map((one) => ({
    accept: one.getAttribute('accept'),
    inOverlay: Boolean(one.closest('div.fixed.inset-0.z-50')),
    hidden: getComputedStyle(one).display === 'none',
  })))));
console.log('overlays:', JSON.stringify(await page.evaluate(() =>
  [...document.querySelectorAll('div.fixed.inset-0')].map((one) => ({
    cls: one.className.slice(0, 60),
    words: (one.innerText || '').replace(/\s+/g, ' ').slice(0, 120),
  })))));
await picture.setInputFiles('audit/fixtures/bigphoto.png');
await page.waitForTimeout(3500);

const alive = await page.evaluate(() => {
  const body = document.body;
  return {
    text: (body.innerText || '').trim().length,
    nodes: body.querySelectorAll('*').length,
    rejections: window.__rejections || [],
    stored: (() => {
      try {
        const raw = window.localStorage.getItem('futurebox.assets.v1');
        return raw ? raw.length : 0;
      } catch (e) {
        return `localStorage threw: ${e && e.name}`;
      }
    })(),
  };
});

console.log('characters still on screen:', alive.text);
console.log('elements still in the body:', alive.nodes);
console.log('unhandled rejections:', alive.rejections.length ? alive.rejections.join(' ;; ') : 'none');
console.log('bytes in the asset index:', alive.stored);
console.log('page errors:', problems.join(' ;; ') || 'none');
console.log(alive.text < 40 ? '\nWHITE PAGE — the tree is gone.' : '\nthe room is still there.');

await page.screenshot({ path: shot('bigphoto.png') });
await browser.close();
await server.stop();

/* The report, as an exit code, because this one is wired into `checks`.

   Two ways to fail and they are different faults: the tree gone is the white
   page she reported, and a picture that stored nothing is the silent version
   of the same thing. */
if (alive.text < 40 || alive.stored === 0) {
  console.error('\ncheck:bigphoto — a real photograph did not survive the shot.');
  process.exit(1);
}
console.log('\ncheck:bigphoto — a 3.4MB photograph goes into the shot and is kept.');
