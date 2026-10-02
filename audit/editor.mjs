/**
 * The video editor, walked in a browser.
 *
 * ── Why this exists the day the room does ────────────────────────────────
 *
 * Because the last thing called an editor in this app was not one. Carli,
 * 24 September 2026: *"Jy sê ons het een, maar ek vermoed jy meen die long
 * shot funksie."* She was right — it was a storyboard with a render button.
 *
 * A typecheck cannot tell those two apart. Both compile. What separates them
 * is whether there is a clock on the screen with your own material on it, so
 * that is what this measures: not that the component mounts, but that after
 * a clip goes in, a block comes out and it can be cut.
 *
 * ── The door is the first thing it checks, and on purpose ────────────────
 *
 * An unattended run has no account, so the plan is `free` and the room is
 * shut. That is the correct behaviour — every plan card says the editor
 * comes with a paid plan — and a probe that could only run signed in would
 * never notice the door disappearing.
 *
 * So it asserts the door first, from the outside, and only then reaches past
 * the gate to walk the room. Reaching past it is done by rendering the
 * component with a paid plan rather than by faking a session: this probe is
 * about whether the editor works, and a probe that also had to hold a
 * membership row upright would fail for reasons that are not about editing.
 */
import { readFileSync } from 'node:fs';
import { enter, studio, toRoom, unfold } from './enter.mjs';
import { serve } from './where.mjs';

/* How deep the history actually is, read out of the module that sets it
   rather than typed here. A probe holding its own copy of twenty would go
   green on a release that quietly dropped it to three. */
const KEEP_STEPS = Number(
  /export const KEEP_STEPS = (\d+)/.exec(readFileSync('app/lib/undo.ts', 'utf8'))?.[1] ?? '0',
);

const PORT = 3329;
const problems = [];

const check = (what, passed, detail = '') => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) problems.push(what);
};

/* `serve` + `enter` + `studio` + `toRoom`, in that order, and the order is
   the point: the first version of this probe called `toRoom` straight after
   dismissing the door and got "no way into Video desk", because the rail
   only exists once somebody is inside the studio. A probe that cannot get
   into the room reports the room as broken. */
const server = await serve(PORT);
const { browser: b, page: p } = await enter({ at: server.url, lang: 'en' });
p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));

await studio(p);

/* ── The button she asked for, walked before anything else ──────────────

   Carli, 30 September 2026: *"'N knoppie wat jou vat na sy eie kamer."*

   The rail can reach the cutting room and so can the door, but neither is
   what she described: she described the moment somebody has just made a clip
   on the video desk and wants to cut it. That door is one button in one room,
   and a probe that only ever arrived by the rail would have reported a
   working editor while the button she actually asked for did nothing. */
await toRoom(p, 'Video desk');
await p.waitForTimeout(600);
await p.locator('[data-tocutting]').click();
await p.waitForTimeout(1200);

const reachedByButton = (await p.locator('[data-cuttingroom]').count()) === 1;

await toRoom(p, 'Cutting room');
await unfold(p);

/* The clock reads "1.4s / 12.0s" — where the playhead is, over how long the
   film runs. Both halves are read by number rather than by string, because a
   check that compares "0.0s" to "0.0s" passes just as happily when the clock
   has stopped moving. */
const clockText = async () => (await p.locator('[data-editorruns]').innerText().catch(() => '')) || '';
const asSeconds = (text) => {
  const m = String(text).trim().match(/^(?:(\d+):)?([\d.]+)/);
  return m ? Number(m[1] ?? 0) * 60 + Number(m[2]) : NaN;
};
const playheadAt = async () => asSeconds((await clockText()).split('/')[0]);
const filmLength = async () => asSeconds((await clockText()).split('/')[1] ?? '');

try {
  /* ── The gate, and why a browser cannot see it here ────────────────

     `loadOwned()` answers `EVERYTHING` — tier `label` — when no Supabase is
     configured, which is this app's rule everywhere: with no accounts,
     nothing is metered. `charge()` and `paidRoom()` do the same.

     So an unattended run is a paying member by design and the door never
     shows. The first version of this probe asserted the opposite and
     reported a working gate as broken, which is the more dangerous
     direction: a probe that fails on correct behaviour gets switched off.

     The door is asserted in `check:editorgate` instead, which asks the
     entitlement table directly and does not need a browser at all. What a
     browser IS for is the half that cannot be unit-tested — whether a clip
     put in comes out as a block that can be cut. */

  /* ── Its own room, and it looks like one ─────────────────────

     Carli, 30 September 2026: *"dit moet ook sy eie studio op sy eie video
     wees … Daardie studio kan dan ook regdeur die hele bladsy die futurebox
     groen kleure hê … sodat daardie kamer ook anders lyk."*

     Measured as a colour, not as a class name. `bg-emerald-950` in the source
     proves somebody typed it; what she asked for is that the room LOOKS
     different, and the only way to know that is to read what was painted. A
     class that is overridden, purged from the bundle, or hidden under an
     opaque child is green in the source and zinc on the screen. */
  check('the video desk\u2019s own button reaches the cutting room',
    reachedByButton,
    'the rail and the door both get here; this is the one she described');

  const paint = await p.locator('[data-cuttingroom]').evaluate((el) => {
    const style = getComputedStyle(el);
    const found = `${style.backgroundImage} ${style.backgroundColor}`;
    return [...found.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)].map((m) => m.slice(1).map(Number));
  }).catch(() => []);
  check('the cutting room is painted its own colour, not the studio\u2019s zinc',
    paint.some(([r, g, bl]) => g > r + 6 && g > bl + 6),
    `painted ${JSON.stringify(paint)} — zinc is grey, so green has to lead`);

  const room = p.locator('[data-videoeditor]');
  check('with no accounts configured the room opens, as every other room does',
    (await room.count()) === 1,
    `${await room.count()} — loadOwned() gives tier "label" when nothing is metered`);

  check('  and it says nothing on the clock yet',
    (await p.locator('[data-editorempty]').count()) === 1,
    'an editor with no material should say so, not show an empty strip');

  /* ── A real clip, recorded in the page and handed to the file input ── */

  const made = await p.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 240;
    const c = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    const type = ['video/webm;codecs=vp8,opus', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
    if (!type) return null;
    const rec = new MediaRecorder(stream, { mimeType: type });
    const parts = [];
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    const stopped = new Promise((r) => { rec.onstop = r; });
    rec.start();
    const began = performance.now();
    await new Promise((finish) => {
      const draw = () => {
        const t = (performance.now() - began) / 1000;
        c.fillStyle = '#2b6'; c.fillRect(0, 0, 320, 240);
        c.fillStyle = '#fff'; c.fillRect((t / 2) * 280, 100, 40, 40);
        if (t >= 2) { finish(); return; }
        requestAnimationFrame(draw);
      };
      draw();
    });
    rec.stop();
    await stopped;
    const blob = new Blob(parts, { type });
    const buf = await blob.arrayBuffer();
    return Array.from(new Uint8Array(buf));
  });

  if (!made) {
    console.log('  --  this browser cannot record webm; the walk below is skipped rather than faked.');
  } else {
    await p.locator('[data-editorbring] input[type="file"]').setInputFiles({
      name: 'a-take.webm',
      mimeType: 'video/webm',
      buffer: Buffer.from(made),
    });
    await p.waitForTimeout(2500);

    const blocks = p.locator('[data-editorblock]');
    check('a clip brought in becomes a block on the clock',
      (await blocks.count()) === 1,
      `${await blocks.count()} blocks — this is the whole difference between an editor and a storyboard`);

    check('  and the clock says how long the film runs',
      /\d/.test((await p.locator('[data-editorruns]').innerText().catch(() => '')) || ''),
      'a timeline with no length on it is a strip of pictures');

    check('  and picking it opens the piece it picked',
      (await p.locator('[data-editorpiece]').count()) === 1,
      'the block is selected on arrival, so its panel should be up');

    /* The panel had two number boxes and no picture at first, which is asking
       somebody to decide "starts at 3.4" about a shot they cannot see. */
    const viewer = p.locator('[data-editorviewer]');
    check('  and shows the piece you are trimming',
      (await viewer.count()) === 1 && Boolean(await viewer.getAttribute('src')),
      'the trim boxes without a picture are a guess checked by exporting the whole film');

    /* The look has to be ON the viewer, not only in the render — a swatch
       that previews one thing while the film does another is worse than no
       preview. `filterCss` is the same function on both sides. */
    await p.locator('[data-editorlook="mono"]').click();
    await p.waitForTimeout(400);
    const styled = await viewer.evaluate((el) => el.style.filter || '');
    check('  and the look is on the picture, not only in the render',
      /grayscale|saturate|contrast|brightness/.test(styled),
      `the viewer's filter is "${styled}"`);

    /* ── It is a clock, and the clock is what you steer by ─────────

       Carli, 29 September 2026: *"dit moet seker ook op 'n tydlyn wees. Die
       ordentlike editor."* She was right about the strip too. What was there
       was a row of blocks sized in PROPORTION to each other — which makes a
       ten-second film and a ten-minute one look identical and leaves nowhere
       to point at "eighteen seconds in".

       These four checks are the difference between a proportion bar and a
       timeline: there are marks with times on them, there is a line saying
       where you are, tapping the track moves it, and playing moves it by
       itself. A strip that draws all four and steers none of them is the
       exact failure this app keeps meeting — something green because it
       measures the picture of the thing. */
    check('the strip has a ruler with times on it',
      (await p.locator('[data-editorruler] span').count()) >= 2,
      `${await p.locator('[data-editorruler] span').count()} marks — a strip with no times on it is a bar chart wearing a ruler`);

    check('  and a playhead saying where you are',
      (await p.locator('[data-editorplayhead]').count()) === 1);

    /* Tapping the track. Aimed a second in, in the strip's own pixels, so
       the assertion is about where the clock LANDED rather than about the
       click having been received. */
    /* `locator.click({ position })` rather than `mouse.click` at a bounding
       box, and the difference cost an hour: the mouse does not scroll, so on
       a page this long the coordinates were honest and pointed off-screen.
       Both clicks reported a clock at nought, which reads exactly like a
       dead handler. `position` is the element's own pixels, scrolled to. */
    const track = p.locator('[data-editortrack]');
    /* Read, not assumed. A second stopped being forty pixels on 30 September:
       the strip fits the film to its own width now, so a probe that still
       clicked at x=40 for "one second in" would be testing a number this app
       no longer uses. */
    const perSecond = Number(await track.getAttribute('data-persecond')) || 40;
    await track.click({ position: { x: perSecond, y: 30 } });
    await p.waitForTimeout(500);
    const landed = await playheadAt();
    check('  and tapping the track moves the clock to that second',
      Math.abs(landed - 1) < 0.35,
      `tapped one second in and the clock reads ${landed}s`);

    check('  and the viewer went with it, rather than the line moving alone',
      Math.abs(await viewer.evaluate((el) => el.currentTime) - 1) < 0.4,
      `the picture is at ${await viewer.evaluate((el) => el.currentTime)}s while the line says ${landed}s`);

    /* And it runs. A play button that starts the piece but leaves the clock
       where it was is the same failure one layer down. */
    await p.locator('[data-editorrewind]').click();
    await p.waitForTimeout(300);
    await p.locator('[data-editorplayall]').click();
    await p.waitForTimeout(1200);
    const ran = await playheadAt();
    await p.locator('[data-editorplayall]').click();
    await p.waitForTimeout(300);
    check('  and playing the film moves the clock by itself',
      ran > 0.3,
      `after 1.2s of playing, the clock reads ${ran}s`);

    await p.locator('[data-editorrewind]').click();
    await p.waitForTimeout(300);
    check('  and Back to the start puts it back to nought',
      (await playheadAt()) === 0,
      `the clock reads ${await playheadAt()} after rewinding`);

    /* ── Fades you pull, rather than set somewhere else ───────────

       Carli, 30 September 2026: *"Op die tydlyn kan mens aan die begin en
       einde van elke tydlyn 'n trek lyntjie in sit wat die in en uitfade
       moontlik maak om te trek."*

       The sliders were always there. A fade is judged against the picture,
       and reaching into another card to set one is reaching away from the
       thing being judged.

       Dragged rather than clicked, because a drag is the whole feature: a
       handle that only answers a tap has not been built. And the undo check
       after it is the half that is easy to skip — a drag writes a few hundred
       times, and if each one filed a history step, Back would mean "a pixel
       and a half ago" and the editor's whole history would be one gesture. */
    const strip = await p.locator('[data-editortrack]').boundingBox();
    const handle = p.locator('[data-editorfadeinhandle]');
    check('the timeline carries a fade handle at each end',
      (await handle.count()) === 1 && (await p.locator('[data-editorfadeouthandle]').count()) === 1);

    const stepsBefore = await p.locator('[data-editorundo]').isDisabled();
    await handle.hover();
    await p.mouse.down();
    await p.mouse.move((strip?.x ?? 0) + perSecond * 0.8, (strip?.y ?? 0) + 30, { steps: 12 });
    await p.mouse.up();
    await p.waitForTimeout(500);

    const pulled = Number(await p.locator('[data-editorfadein]').inputValue().catch(() => '0'));
    check('  and pulling it sets the fade',
      pulled > 0.2,
      `the slider reads ${pulled} after dragging the handle most of a second in`);

    check('  and the slider and the handle agree',
      Math.abs(Number(await handle.getAttribute('aria-valuenow')) - pulled) < 0.15,
      'two controls for one number that disagree is worse than one');

    /* One press of Back, not three hundred. */
    await p.locator('[data-editorundo]').click();
    await p.waitForTimeout(500);
    check('  and the whole drag is one press of Back',
      Number(await p.locator('[data-editorfadein]').inputValue().catch(() => '1')) === 0,
      `the fade is ${await p.locator('[data-editorfadein]').inputValue()} after one undo — a drag that files a step per pixel fills the history with one gesture`);
    void stepsBefore;

    /* ── The sound, on a lane of its own ───────────────────────────────

       Carli, 30 September 2026: *"dan moet dit soos die probooth die tydlyne
       hê, asook vir die klank."*

       The lane is in the same scrolling strip as the blocks, so what is
       measured is that it exists AND that it lines up: a lane at its own
       width is a second picture of time, and two pictures of time that do
       not agree are worse than one.

       With no track under it the lane still has to be there and still has to
       say so — an empty lane with nothing in it reads as a rendering fault,
       and the room has to be able to tell "nothing yet" from "broken". */
    /* ── Zoom, which magnifies the preview and not the film ────────────

       Carli, 30 September 2026: *"mens moet op die prent van die video kan
       kliek en in en uit zoom."*

       Measured as a change to the PICTURE's rendered width, not as a class
       or a state readout: a zoom control that lights up and leaves the
       picture the size it was is the exact failure this app keeps meeting.

       And the last check is the one that says what this is: the film must be
       unchanged. A preview zoom that quietly cropped the shot would be a
       different feature wearing this one's name. */
    const plain = (await p.locator('[data-editorviewer]').boundingBox())?.width ?? 0;
    const lengthBefore = (await p.locator('[data-editorruns]').innerText().catch(() => '')) || '';
    await p.locator('[data-editorzoomin]').click();
    await p.waitForTimeout(500);
    const magnified = (await p.locator('[data-editorviewer]').boundingBox())?.width ?? 0;
    check('zooming in makes the picture bigger',
      magnified > plain + 10,
      `${Math.round(plain)}px became ${Math.round(magnified)}px`);

    check('  and the film itself is untouched by it',
      ((await p.locator('[data-editorruns]').innerText().catch(() => '')) || '') === lengthBefore,
      'this magnifies the preview; a zoom that cropped the shot would be a different feature wearing this name');

    await p.locator('[data-editorzoomout]').click();
    await p.waitForTimeout(500);
    check('  and zooming back out returns it',
      Math.abs(((await p.locator('[data-editorviewer]').boundingBox())?.width ?? 0) - plain) < 12,
      `it came back to ${Math.round((await p.locator('[data-editorviewer]').boundingBox())?.width ?? 0)}px against ${Math.round(plain)}px`);

    check('the timeline has a lane for the sound',
      (await p.locator('[data-editorsoundlane]').count()) === 1);

    check('  and with no track under it, it says so rather than sitting empty',
      (await p.locator('[data-editornobed], [data-editorsoundlane]').first().innerText().catch(() => '')).trim().length > 0
        || (await p.locator('[data-editorbed]').count()) === 1,
      'an empty lane with nothing in it reads as a rendering fault');

    /* A piece carrying its own sound is marked on the lane, which is the
       whole reason the lane is worth drawing with no bed in it: "why can I
       hear a room" should have an answer you can see. */
    const soundOn = p.locator('[data-editorsound]');
    if ((await soundOn.count()) === 1) {
      const before = await p.locator('[data-editorownsound]').count();
      await soundOn.click();
      await p.waitForTimeout(500);
      check('  and turning a piece’s own sound on marks it there',
        (await p.locator('[data-editorownsound]').count()) !== before,
        `${before} marks before, ${await p.locator('[data-editorownsound]').count()} after`);
      await soundOn.click();
      await p.waitForTimeout(400);
    }

    /* ── Words, set and placed by hand ─────────────────────

       Carli, 30 September 2026: *"Die teks moet font opsies hê, en dit moet
       ook gemanipuleer moet kan word op die skerm van die video, deur dit
       rond te kan skuif, en groter en kleiner te kan maak."*

       The size check is the one that matters and the one that nearly was not
       here. The first version of this sized the words in `cqh` inside an
       `@container`, which compiles to nothing without Tailwind's container
       plugin — and `cqh` with no container resolves to a font size of
       nought. Words that vanish, with no error anywhere. So the size is read
       off the rendered element in pixels, which cannot be nought and cannot
       lie. */
    await p.locator('[data-editorwords]').fill('Dit is die woorde');
    await p.waitForTimeout(600);

    const onFilm = p.locator('[data-editorwordsdrag]');
    check('words typed appear on the picture, not only in the box',
      (await onFilm.count()) === 1,
      'the only useful question about a caption is what it covers');

    if ((await onFilm.count()) === 1) {
      const small = await onFilm.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      check('  at a real size',
        small > 6,
        `${small}px — nought is what a container unit resolves to when nothing is a container`);

      check('  and the faces are offered',
        (await p.locator('[data-editorfont="heavy"]').count()) === 1);

      await p.locator('[data-editorfont="heavy"]').click();
      await p.waitForTimeout(400);
      const face = await onFilm.evaluate((el) => getComputedStyle(el).fontFamily);
      check('  and picking one changes the face on the picture',
        /arial black|impact|helvetica/i.test(face),
        `the words are drawn in ${face}`);

      await p.locator('[data-editorwordssize]').fill('0.1');
      await p.waitForTimeout(400);
      const big = await onFilm.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      check('  and bigger is bigger',
        big > small,
        `${small}px became ${big}px`);

      /* ── One press of Back for one pull of a slider ─────────────────────

         Dragged with the mouse and not filled, because `fill` fires ONE change
         event and this fault only exists across many. A range input fires
         `change` on every pixel it is dragged over, and every one of those used
         to file a history step: one pull of this slider was thirty or forty
         steps where `KEEP_STEPS` is twenty, so bringing the clip in fell off
         the end of the history and Back could no longer reach the empty clock.

         Found by the walk at the bottom of this file going red, not by looking
         at the screen — and the tempting fix was to raise `KEEP_STEPS`, which
         would have moved the number the fault shows up at and left the fault. */
      const sizer = p.locator('[data-editorwordssize]');
      const sizeBox = await sizer.boundingBox();
      const sizeWas = await sizer.inputValue();
      const midY = (sizeBox?.y ?? 0) + (sizeBox?.height ?? 0) / 2;
      await p.mouse.move((sizeBox?.x ?? 0) + (sizeBox?.width ?? 0) * 0.9, midY);
      await p.mouse.down();
      await p.mouse.move((sizeBox?.x ?? 0) + (sizeBox?.width ?? 0) * 0.1, midY, { steps: 25 });
      await p.mouse.up();
      await p.waitForTimeout(400);
      check('  and pulling the slider across really moves it',
        (await sizer.inputValue()) !== sizeWas,
        `it read ${sizeWas} and reads ${await sizer.inputValue()}`);
      await p.locator('[data-editorundo]').click();
      await p.waitForTimeout(400);
      check('    and the whole pull is ONE press of Back, not twenty-five',
        (await sizer.inputValue()) === sizeWas,
        `it reads ${await sizer.inputValue()} after one undo where it was ${sizeWas} — a slider that files a step per pixel empties the history with one gesture`);

      const pic = await p.locator('[data-editorviewer]').boundingBox();
      const was = await onFilm.boundingBox();
      await onFilm.hover();
      await p.mouse.down();
      await p.mouse.move((pic?.x ?? 0) + (pic?.width ?? 0) * 0.5,
                         (pic?.y ?? 0) + (pic?.height ?? 0) * 0.25, { steps: 10 });
      await p.mouse.up();
      await p.waitForTimeout(400);
      const now = await onFilm.boundingBox();
      check('  and the words can be dragged off the bottom',
        Math.abs((now?.y ?? 0) - (was?.y ?? 0)) > 20,
        `they were at y=${Math.round(was?.y ?? 0)} and are at y=${Math.round(now?.y ?? 0)}`);

      check('  with a way back to the bottom once they have moved',
        (await p.locator('[data-editorwordsreset]').count()) === 1);

      /* ── The preview is the FILM's frame, not the clip's ───────────────

         The fault this catches was invisible to everything, including a check
         written about exactly this subject.

         Everything on the frame is placed in FRACTIONS — `markAt` and `wordsAt`
         are x and y between nought and one — and `drawMark` and `drawCaption`
         read those fractions against the FILM's 1080x1920. The preview read
         them against whatever shape the clip happened to be. Both were right
         about the fraction. The preview was wrong about the frame.

         So a logo dragged to the bottom of a landscape clip, in a vertical film,
         came out in the black bar below the picture. `check:logomark` compares
         the preview's corner fractions with `markBox`'s and they agreed exactly,
         which is why it stayed green: the two numbers matched and the box they
         were fractions OF did not.

         Measured as a ratio, because that is the whole claim: the box the
         overlays are positioned inside has to be the shape the film comes out
         in. A tall film is 1080x1920, so 0.5625. */
      const framed = await p.locator('[data-editorframe]').boundingBox();
      const ratio = (framed?.width ?? 0) / Math.max(1, framed?.height ?? 1);
      check('  and the preview box is the shape the FILM comes out in',
        Math.abs(ratio - 1080 / 1920) < 0.02,
        `the box is ${Math.round(framed?.width ?? 0)}x${Math.round(framed?.height ?? 0)}, `
        + `a ratio of ${ratio.toFixed(3)} where a tall film is ${(1080 / 1920).toFixed(3)}`
        + ' — a logo placed at the bottom of a box that is not the frame lands in the black bar');

      await p.locator('[data-editorshape="wide"]').click();
      await p.waitForTimeout(500);
      const wideBox = await p.locator('[data-editorframe]').boundingBox();
      const wideRatio = (wideBox?.width ?? 0) / Math.max(1, wideBox?.height ?? 1);
      check('    and follows the shape when the shape is changed',
        Math.abs(wideRatio - 1920 / 1080) < 0.05,
        `a ratio of ${wideRatio.toFixed(3)} where a wide film is ${(1920 / 1080).toFixed(3)}`);
      await p.locator('[data-editorshape="tall"]').click();
      await p.waitForTimeout(500);

      /* And filling the frame crops rather than bars. Read off the computed
         `object-fit` of the element the bars belong to, because that is the one
         thing that decides whether there are bars at all. */
      check('  the picture fits whole inside it, with bars, as it always did',
        (await p.locator('[data-editorviewer]').evaluate((el) => getComputedStyle(el).objectFit)) === 'contain');
      await p.locator('[data-editorfill]').click();
      await p.waitForTimeout(500);
      check('    and filling the frame crops the sides instead',
        (await p.locator('[data-editorviewer]').evaluate((el) => getComputedStyle(el).objectFit)) === 'cover',
        'a wide clip letterboxed into a vertical film is right for an establishing'
        + ' shot and wrong for a face');
      await p.locator('[data-editorfill]').click();
      await p.waitForTimeout(400);

      /* ── Turned, faint, round, and nudged ──────────────────────────────

         Carli, 2 October 2026, having sent two-and-thirty screens of a video
         editor. Turned, how solid and how round are the ordinary handles on
         anything sitting on a frame.

         Measured off the RENDERED element — the computed transform, the
         computed opacity, the computed radius, the bounding box — and not off
         the input's own value. An input holding 45 proves a slider moved; the
         box growing taller proves the words turned. The `@container` fault on
         30 September was exactly a control whose value was right and whose
         picture was nought. */
      const flat = await onFilm.boundingBox();
      await p.locator('[data-editorwordsturn]').fill('45');
      await p.waitForTimeout(400);
      const turned = await onFilm.boundingBox();
      const spin = await onFilm.evaluate((el) => getComputedStyle(el).transform);
      check('  and the words can be turned',
        (turned?.height ?? 0) > (flat?.height ?? 0) + 4,
        `${Math.round(flat?.height ?? 0)}px tall flat became ${Math.round(turned?.height ?? 0)}px at 45° — ${spin}`);
      check('    and the turn is on the picture, not only in the slider',
        /matrix\(/.test(spin) && !/matrix\(1,\s*0,\s*0,\s*1/.test(spin),
        spin);
      check('    and the degrees are written out, because 45 on a slider is not readable',
        (await p.locator('[data-editorwordsturnnow]').innerText()).includes('45'));
      await p.locator('[data-editorwordsturn]').fill('0');
      await p.waitForTimeout(300);

      await p.locator('[data-editorwordssolid]').fill('0.3');
      await p.waitForTimeout(400);
      const faint = await onFilm.evaluate((el) => parseFloat(getComputedStyle(el).opacity));
      check('  and they can be made faint',
        Math.abs(faint - 0.3) < 0.02,
        `the element is at opacity ${faint}`);
      await p.locator('[data-editorwordssolid]').fill('1');
      await p.waitForTimeout(300);

      const round = await onFilm.evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius));
      await p.locator('[data-editorwordsround]').fill('0');
      await p.waitForTimeout(400);
      const square = await onFilm.evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius));
      check('  and the band behind them can be squared off',
        round > 1 && square < 1,
        `the corner was ${round}px and is ${square}px`);

      /* ── Bigger and smaller by the corner ──────────────────────────────

         Carli, 30 September 2026: *"dit moet ook gemanipuleer moet kan word op
         die skerm van die video, deur dit rond te kan skuif, en groter en
         kleiner te kan maak."* The dragging landed that week; the resizing has
         been a slider in another card ever since, which is reaching away from
         the thing being judged — the same objection that put the fade handles
         on the strip.

         Dragged OUTWARD from the middle so the size goes up, then one press of
         Back: the size is written on every pointermove, and a history step per
         move is the fault the sliders had. */
      const grip = p.locator('[data-editorwordsgrip]');
      check('  the words carry a corner to drag',
        (await grip.count()) === 1);

      /* `hover` first, and only then read the boxes.
 
         `boundingBox` answers in VIEWPORT coordinates and `mouse.move` takes
         them, and by this point in the walk the page has scrolled — the first
         version read the handle at y = -259, off the top of the window, and
         `elementFromPoint` there is nothing at all. So the pointer went down on
         the page and the probe reported a resize handle that does not resize.
 
         `hover` scrolls the element into view, which is why the drags written
         before this one all start with it. */
      await grip.hover();
      await p.waitForTimeout(200);
      const sized = await onFilm.boundingBox();
      const griped = await grip.boundingBox();
      const beforeGrip = await p.locator('[data-editorwordssize]').inputValue();
      await p.mouse.move((griped?.x ?? 0) + 2, (griped?.y ?? 0) + 2);
      await p.mouse.down();
      await p.mouse.move(
        (griped?.x ?? 0) + (sized?.width ?? 0) * 0.6,
        (griped?.y ?? 0) + (sized?.height ?? 0) * 0.6,
        { steps: 15 },
      );
      await p.mouse.up();
      await p.waitForTimeout(400);
      const afterGrip = await p.locator('[data-editorwordssize]').inputValue();
      check('    and pulling it outward makes them bigger',
        Number(afterGrip) > Number(beforeGrip),
        `the size was ${beforeGrip} and is ${afterGrip}`);
      check('    and the words on the picture grew with it, not only the number',
        (await onFilm.boundingBox())?.height > (sized?.height ?? 0),
        `the band was ${Math.round(sized?.height ?? 0)}px tall`);
      await p.locator('[data-editorundo]').click();
      await p.waitForTimeout(400);
      check('    and the whole pull is one press of Back',
        (await p.locator('[data-editorwordssize]').inputValue()) === beforeGrip,
        `${await p.locator('[data-editorwordssize]').inputValue()} after one undo`
        + ` where it was ${beforeGrip}`);

      /* Align, and the one thing about it that is worth checking: it moves ONE
         axis, which is what an align control does everywhere, and a "top"
         button that also slid the words into the middle sideways would undo a
         placement she had just made. */
      const spread = await p.locator('[data-editorviewer]').boundingBox();
      const placed = await onFilm.boundingBox();
      await p.locator('[data-editoralign="words:top"]').click();
      await p.waitForTimeout(400);
      const up = await onFilm.boundingBox();
      check('  and an align button moves them to the top',
        (up?.y ?? 0) < (spread?.y ?? 0) + (spread?.height ?? 0) * 0.3,
        `they are at y=${Math.round(up?.y ?? 0)} with the picture starting at ${Math.round(spread?.y ?? 0)}`);
      check('    and leaves the other axis where she put it, which is the point of one-axis align',
        Math.abs((up?.x ?? 0) - (placed?.x ?? 0)) < 6,
        `x was ${Math.round(placed?.x ?? 0)} and is ${Math.round(up?.x ?? 0)}`);

      /* The nudge, which is why it is here at all: a drag on a 390-pixel
         preview cannot be landed on a round number. Three taps, because one
         percent of a narrow frame is under four pixels and a single tap is
         inside the noise of a bounding box. */
      const before3 = await onFilm.boundingBox();
      for (let i = 0; i < 3; i += 1) {
        await p.locator('[data-editornudge="words:right"]').click();
        await p.waitForTimeout(120);
      }
      await p.waitForTimeout(300);
      const after3 = await onFilm.boundingBox();
      const moved = (after3?.x ?? 0) - (before3?.x ?? 0);
      const want = (spread?.width ?? 0) * 0.03;
      check('  and three nudges move them three percent of the frame, not a guess',
        moved > want * 0.5 && moved < want * 1.8,
        `${Math.round(moved)}px moved where three percent of ${Math.round(spread?.width ?? 0)} is ${Math.round(want)}px`);
    }

    /* ── The mark, moved by hand ───────────────────────────

       Carli, 30 September 2026: *"Mens moet die logo foto fisies moet kan
       skuif."*

       Four corner buttons cannot answer the only useful question about a
       logo, which is what it covers: in a vertical clip of a person, the
       corner that is free depends on where the person is standing.

       Walked with a real PNG rather than skipped, because the drag only
       exists once there is a mark to drag. The corner buttons are pressed
       afterwards: a drag that could not be undone by choosing a corner again
       would be a one-way door. */
    const dot = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    await p.locator('[data-editormark] input[type="file"]').setInputFiles({
      name: 'mark.png', mimeType: 'image/png', buffer: dot,
    }).catch(() => undefined);
    await p.waitForTimeout(1200);

    const onPicture = p.locator('[data-editormarkdrag]');
    check('the mark is drawn on the picture, not beside it',
      (await onPicture.count()) === 1,
      'the only useful question about a logo is what it covers');

    if ((await onPicture.count()) === 1) {
      const frame = await p.locator('[data-editorviewer]').boundingBox();
      const was = await onPicture.boundingBox();
      await onPicture.hover();
      await p.mouse.down();
      await p.mouse.move((frame?.x ?? 0) + (frame?.width ?? 0) * 0.3,
                         (frame?.y ?? 0) + (frame?.height ?? 0) * 0.4, { steps: 10 });
      await p.mouse.up();
      await p.waitForTimeout(400);
      const now = await onPicture.boundingBox();
      check('  and it can be dragged somewhere else',
        Math.abs((now?.x ?? 0) - (was?.x ?? 0)) > 20 || Math.abs((now?.y ?? 0) - (was?.y ?? 0)) > 20,
        `it was at ${Math.round(was?.x ?? 0)},${Math.round(was?.y ?? 0)} and is at ${Math.round(now?.x ?? 0)},${Math.round(now?.y ?? 0)}`);

      check('  and a way back to a corner appears once it has been moved',
        (await p.locator('[data-editormarkreset]').count()) === 1,
        'a drag with no way back is a one-way door');

      await p.locator('[data-editorcorner="topLeft"]').click();
      await p.waitForTimeout(400);
      const back = await onPicture.boundingBox();
      check('  and pressing a corner takes it back there',
        (back?.x ?? 0) < (frame?.x ?? 0) + (frame?.width ?? 0) * 0.35,
        `it is at ${Math.round(back?.x ?? 0)} with the frame starting at ${Math.round(frame?.x ?? 0)}`);

      check('  and it can be made bigger and smaller',
        (await p.locator('[data-editormarksize]').count()) === 1);

      /* The same three the words carry, on the mark. A watermark is the one
         thing on a film that is usually MEANT to be faint, and until tonight
         ours was pinned at `MARK_OPACITY` with no handle on it. */
      await p.locator('[data-editormarkturn]').fill('45');
      await p.waitForTimeout(400);
      const spun = await onPicture.evaluate((el) => getComputedStyle(el).transform);
      check('  and it can be turned',
        /matrix\(/.test(spun) && !/matrix\(1,\s*0,\s*0,\s*1/.test(spun),
        spun);
      await p.locator('[data-editormarkturn]').fill('0');
      await p.waitForTimeout(300);

      await p.locator('[data-editormarksolid]').fill('0.3');
      await p.waitForTimeout(400);
      const dim = await onPicture.evaluate((el) => parseFloat(getComputedStyle(el).opacity));
      check('  and quietened behind the picture',
        Math.abs(dim - 0.3) < 0.02,
        `the mark is at opacity ${dim}`);

      /* The same corner on the mark, which keeps no history: where the mark sits
         and how big it is are not on the `Edit` and never were. */
      const markGrip = p.locator('[data-editormarkgrip]');
      check('  and carries a corner to drag as well',
        (await markGrip.count()) === 1);
      await markGrip.hover();
      await p.waitForTimeout(200);
      const markWas = await onPicture.boundingBox();
      const atGrip = await markGrip.boundingBox();
      await p.mouse.move((atGrip?.x ?? 0) + 2, (atGrip?.y ?? 0) + 2);
      await p.mouse.down();
      await p.mouse.move(
        (atGrip?.x ?? 0) + (markWas?.width ?? 0),
        (atGrip?.y ?? 0) + (markWas?.height ?? 0),
        { steps: 15 },
      );
      await p.mouse.up();
      await p.waitForTimeout(400);
      const markNow = await onPicture.boundingBox();
      check('    and pulling it outward makes the mark bigger on the picture',
        (markNow?.width ?? 0) > (markWas?.width ?? 0) + 4,
        `it was ${Math.round(markWas?.width ?? 0)}px and is ${Math.round(markNow?.width ?? 0)}px wide`);

      /* The two controls for one number, measured against each other: the slider
         is a share of the FRAME's width, so the mark's pixels over the frame's
         pixels has to come back to what the slider reads. Two controls for one
         number that disagree is worse than one. */
      const frameWide = (await p.locator('[data-editorframe]').boundingBox())?.width ?? 1;
      const said = Number(await p.locator('[data-editormarksize]').inputValue());
      check('    and the size slider in the card reads the same share',
        Math.abs(said - (markNow?.width ?? 0) / Math.max(1, frameWide)) < 0.03,
        `the slider reads ${said} for a mark ${Math.round(markNow?.width ?? 0)}px`
        + ` wide in a frame ${Math.round(frameWide)}px wide`);

      /* ── Layers ─────────────────────────────────────────────────────────

         Layer order, and one switch rather than a list because exactly two
         things on this canvas are ours. Read off the computed `z-index` of both
         overlays rather than off the switch: a toggle that flips a flag and
         leaves the stacking alone is the kind of control that is green in a
         check and wrong on the screen.

         The film's own ordering is a source assertion in `check:logomark`,
         because a canvas has no z-index to read. */
      const stacked = async () => ({
        mark: parseInt(await onPicture.evaluate((el) => getComputedStyle(el).zIndex), 10),
        words: parseInt(await onFilm.evaluate((el) => getComputedStyle(el).zIndex), 10),
      });
      const over = await stacked();
      check('the mark is over the words to begin with, which is what it always was',
        over.mark > over.words,
        `mark at ${over.mark}, words at ${over.words}`);
      await p.locator('[data-editormarkunder]').click();
      await p.waitForTimeout(400);
      const under = await stacked();
      check('  and the switch really puts it underneath them',
        under.mark < under.words,
        `mark at ${under.mark}, words at ${under.words}`);
      await p.locator('[data-editormarkunder]').click();
      await p.waitForTimeout(300);
    }

    /* ── Speed ────────────────────────────────────────────────────────────

       The strongest assertion in this room, and the reason the slider was
       worth building: speed changes how LONG the piece is, so the FILM gets
       shorter. Read off the clock, which is read off `runs()`, which is read
       off `lengthOfPiece` — so a ruler that did not divide by the speed would
       be caught here rather than discovered on an export.

       Checked before the split below, because a split makes two pieces and
       the slider only governs the one that is picked. */
    const asFilmed = await filmLength();
    await p.locator('[data-editorspeed]').fill('2');
    await p.waitForTimeout(600);
    const fast = await filmLength();
    check('playing a piece at twice the speed makes the film half as long',
      asFilmed > 0 && Math.abs(fast - asFilmed / 2) < 0.4,
      `${asFilmed}s as filmed became ${fast}s at 2× — a ruler that did not divide by the speed would say ${asFilmed}s`);
    check('  and the picture under her thumb plays at that speed too',
      Math.abs(await p.locator('[data-editorviewer]').evaluate((el) => el.playbackRate) - 2) < 0.01,
      `the viewer is at ${await p.locator('[data-editorviewer]').evaluate((el) => el.playbackRate)}×`);
    check('  and the multiple is written out beside the slider',
      (await p.locator('[data-editorspeednow]').innerText()).includes('2'));
    await p.locator('[data-editorspeed]').fill('1');
    await p.waitForTimeout(600);
    check('  and putting it back makes the film what it was',
      Math.abs((await filmLength()) - asFilmed) < 0.2,
      `${asFilmed}s before, ${await filmLength()}s after`);

    /* Split, which is the one operation that proves there is a clock under
       this rather than a list: one piece becomes two, and the total length
       does not change. */
    const before = await filmLength();
    await p.locator('[data-editorsplit]').click();
    await p.waitForTimeout(600);
    check('splitting a piece makes two blocks out of one',
      (await blocks.count()) === 2,
      `${await blocks.count()} after a split`);
    check('  and the film is still as long as it was',
      (await filmLength()) === before,
      `${before} before the split, ${await filmLength()} after — a split that moves the total cut material away rather than in two`);

    /* Scrubbing ACROSS the split, which is the case that was broken and
       invisible: two pieces cut out of one file share a Blob, so picking the
       second half does not change the viewer's `src` and `loadeddata` never
       fires again. The line moved and the picture stayed. */
    await p.locator('[data-editortrack]').click({ position: { x: perSecond * 1.5, y: 30 } });
    await p.waitForTimeout(600);
    check('  and scrubbing across the split moves the picture, not only the line',
      Math.abs(await p.locator('[data-editorviewer]').evaluate((el) => el.currentTime) - 1.5) < 0.45,
      `the line says ${await playheadAt()}s and the picture is at ${await p.locator('[data-editorviewer]').evaluate((el) => el.currentTime)}s`);

    /* ── Splitting the SECOND piece, which is where the bug lived ─────────

       Everything above split the first piece of a film, starting at nought and
       untrimmed — and for exactly that piece, a position in the file and a
       second on the film's clock are the same number. So the editor passed
       `piece.from + length/2` where `split` wanted a film second, and it worked.

       On the second piece it does not: `startsAt` is three and `from` is nought,
       so the cut landed three seconds early. `check:editor` could not see it
       because the only thing it asserted was that the film was still as long as
       it was, which is true wherever the cut falls.

       What is measured here is WHERE. Two pieces out of a split in the middle
       have to be the same length as each other, give or take a tenth. A cut at
       the wrong place makes one of them long and one short, and the total is
       unchanged either way. */
    await p.locator('[data-editorblock]').nth(1).click();
    await p.waitForTimeout(400);
    const halves = await blocks.count();
    const wholeFilm = await filmLength();
    await p.locator('[data-editorsplit]').click();
    await p.waitForTimeout(700);
    check('  and the SECOND piece splits in the middle of itself, not of the film',
      (await blocks.count()) === halves + 1,
      `${await blocks.count()} blocks where ${halves + 1} was wanted`);

    const widths = await blocks.evaluateAll(
      (all) => all.map((el) => el.getBoundingClientRect().width),
    );
    const two = widths.slice(-2);
    check('    and the two halves are the same length as each other',
      two.length === 2 && Math.abs(two[0] - two[1]) < Math.max(6, two[0] * 0.15),
      `the halves are ${two.map((w) => Math.round(w)).join('px and ')}px wide — `
      + 'a cut at the wrong place leaves one long and one short, and the total unchanged either way');
    check('    and the film is still as long as it was',
      Math.abs((await filmLength()) - wholeFilm) < 0.2,
      `${wholeFilm}s before, ${await filmLength()}s after`);

    /* ── How a piece comes in ─────────────────────────────────────────────

       Carli, 3 October 2026: *"net 'n praktiese video editing en die elemente
       wat moontlik is."* Every join in this room was a hard cut until today.

       The arithmetic is read without a browser by `check:joins` — a four-tenth
       transition cannot be told from a hard cut by a real-time recording on a
       shared runner, and pretending otherwise would be a probe that passes on
       noise. What is walked HERE is what only a browser can answer: that the
       picker is absent on the first piece and present on the second, that
       choosing one marks the strip where the join really is, and that a film
       with joins in it still comes out. */
    await p.locator('[data-editorblock]').first().click();
    await p.waitForTimeout(400);
    check('the first piece is offered no join, because there is nothing behind it',
      (await p.locator('[data-editorjoin="dissolve"]').count()) === 0,
      'a picker that cannot change anything is worse than a picker that is absent');

    await p.locator('[data-editorblock]').nth(1).click();
    await p.waitForTimeout(400);
    check('  and the second piece is',
      (await p.locator('[data-editorjoin="dissolve"]').count()) === 1);

    check('  with no join marked on the strip while every cut is a hard one',
      (await p.locator('[data-editorjoinmark]').count()) === 0);

    await p.locator('[data-editorjoin="dissolve"]').click();
    await p.waitForTimeout(500);
    check('  and choosing one marks the strip where that join is',
      (await p.locator('[data-editorjoinmark="dissolve"]').count()) === 1,
      'a transition is the one control in this room whose effect the preview cannot show,'
      + ' so the strip has to');

    const mark = await p.locator('[data-editorjoinmark="dissolve"]').boundingBox();
    const second = await p.locator('[data-editorblock]').nth(1).boundingBox();
    check('    at the start of the piece it belongs to',
      Math.abs((mark?.x ?? 0) - (second?.x ?? 0)) < 8,
      `the mark is at ${Math.round(mark?.x ?? 0)} and the piece starts at ${Math.round(second?.x ?? 0)}`);

    /* And the mark is the join's REAL length, not the slider's number. A join is
       capped at half the piece it arrives on, so a long join on a short piece is
       shorter than asked — and a strip drawing the asked-for length would be
       showing her a transition that does not happen. */
    await p.locator('[data-editorjoinfor]').fill('0.6');
    await p.waitForTimeout(500);
    const said = await p.locator('[data-editorjoinnow]').innerText();
    const wide = (await p.locator('[data-editorjoinmark="dissolve"]').boundingBox())?.width ?? 0;
    const asSeconds2 = Number((said.match(/([\d.]+)/) ?? [])[1] ?? '0');
    check('    and as wide as the join really lasts, not as wide as it was asked for',
      asSeconds2 > 0 && Math.abs(wide - asSeconds2 * perSecond) < Math.max(6, perSecond * 0.2),
      `the strip draws ${Math.round(wide)}px for a join the room says lasts ${said}`
      + ` at ${Math.round(perSecond)}px a second`);

    check('    and it says so where the slider is, not only on the strip',
      said.length > 0 && /frame|prent/i.test(said),
      `"${said}" — the outgoing half of a dissolve here is a held frame, and a`
      + ' control that hid that would be a control that lies');

    /* A copy, which carries everything that was decided about the piece. */
    const wasBlocks = await blocks.count();
    const wasLong = await filmLength();
    await p.locator('[data-editorcopy]').click();
    await p.waitForTimeout(600);
    check('a piece can be copied',
      (await blocks.count()) === wasBlocks + 1,
      `${await blocks.count()} blocks after a copy where ${wasBlocks + 1} was wanted`);
    check('  and the copy makes the film longer by its own length',
      (await filmLength()) > wasLong,
      `${wasLong}s became ${await filmLength()}s`);
    await p.locator('[data-editorundo]').click();
    await p.waitForTimeout(500);
    check('  and one press of Back removes it again',
      (await blocks.count()) === wasBlocks,
      `${await blocks.count()} after undoing the copy`);

    /* ── Dropping one, and walking it back ────────────────────────────────

       Counted against whatever is on the clock NOW rather than against one and
       two. These four read `=== 1` and `=== 2` until 3 October 2026, because the
       walk above them happened to leave exactly two blocks — and the moment a
       second split was added above, four checks about undo went red having found
       nothing wrong with undo.

       An editor without undo is worse than a booth without one: a split you did
       not mean, and the only way back is bringing the file in again and doing
       every trim over. That is what these four are about, and a count relative
       to where the walk got to cannot be broken by lengthening the walk. */
    const onClock = await blocks.count();
    await p.locator('[data-editordrop]').click();
    await p.waitForTimeout(600);
    check('taking a piece out leaves the rest',
      (await blocks.count()) === onClock - 1,
      `${await blocks.count()} after removing one of ${onClock}`);

    await p.locator('[data-editorundo]').click();
    await p.waitForTimeout(500);
    check('undo puts the dropped piece back',
      (await blocks.count()) === onClock,
      `${await blocks.count()} after taking back a removal, where ${onClock} was wanted`);

    /* ── A round trip on ONE step, rather than a guess about the step before ─

       This was "and again undoes the split", pressing Back a second time and
       expecting the split above to come apart. That was true of the walk as it
       stood on 2 October and false on 3 October, because the step immediately
       before the drop had become the undo of a copy. The check went red having
       found nothing wrong.

       A guess about which action is one step back is a guess about everything
       written above, which is the thing that keeps changing. So the round trip
       is taken on the one action this section performed: drop, back, forward,
       back. Both directions, on a known step, and nothing added above can move
       it. How DEEP the history goes is measured on its own below. */
    await p.locator('[data-editorredo]').click();
    await p.waitForTimeout(500);
    check('  and forward drops it again',
      (await blocks.count()) === onClock - 1,
      `${await blocks.count()} after stepping forward, where ${onClock - 1} was wanted`);

    await p.locator('[data-editorundo]').click();
    await p.waitForTimeout(500);
    check('  and back once more puts it right, so the step goes both ways',
      (await blocks.count()) === onClock,
      `${await blocks.count()} after the second trip back`);

    /* ── All the way back, and all the way forward again ────────────────

       This asked for an EMPTY clock: back past the import, the room as it
       opened. That was true when it was written and stopped being true on
       2 October 2026 — and not because undo broke.

       The history is `KEEP_STEPS` deep, twenty, shared with the Pro Booth on
       purpose. The walk above this line now makes more than twenty changes, so
       the clip's arrival has fallen off the far end of it and no number of
       presses can reach a clock that never had the clip on it. A probe asking
       for one is asking for an unbounded history this app has never had.

       Both tempting fixes were wrong. Raising `KEEP_STEPS` moves the number
       the probe breaks at and leaves the probe making a claim the app does not
       make. Loosening it to "some blocks remain" would pass for a history one
       step deep, which is the thing actually worth catching.

       So what is measured is what is true and what matters: Back walks a real
       history rather than a step or two, it stops rather than staying
       pressable, forward returns exactly as many steps as Back took, and the
       film comes back as it was. A one-deep history fails the first. A history
       that empties the room and cannot refill it fails the third and fourth.
       Neither can be made to pass by adding or removing a check above. */
    /* The forward list is drained first, and that is not tidying.

       The two undos and the redo above leave ONE step already sitting in
       front, so the first run of this reported nineteen back and twenty
       forward and called a working history broken. The counts can only be
       compared from a known start: nothing in front, then back as far as it
       goes, then forward as far as it goes. */
    for (let i = 0; i < 90; i += 1) {
      if (await p.locator('[data-editorredo]').isDisabled().catch(() => true)) break;
      await p.locator('[data-editorredo]').click().catch(() => undefined);
      await p.waitForTimeout(110);
    }

    let backs = 0;
    for (let i = 0; i < 90; i += 1) {
      if (await p.locator('[data-editorundo]').isDisabled().catch(() => true)) break;
      await p.locator('[data-editorundo]').click().catch(() => undefined);
      backs += 1;
      await p.waitForTimeout(110);
    }
    check('  Back walks a real history, as deep as the app says it keeps',
      backs >= 10 && backs <= KEEP_STEPS && KEEP_STEPS > 0,
      `${backs} presses where the app keeps ${KEEP_STEPS} — a history a step or two deep is an undo button that lies`);

    check('  and Back is then disabled rather than doing nothing',
      await p.locator('[data-editorundo]').isDisabled(),
      'a button that is pressable and does nothing is the failure this app keeps meeting');

    let forwards = 0;
    for (let i = 0; i < 90; i += 1) {
      if (await p.locator('[data-editorredo]').isDisabled().catch(() => true)) break;
      await p.locator('[data-editorredo]').click().catch(() => undefined);
      forwards += 1;
      await p.waitForTimeout(110);
    }
    check('  and forward returns exactly as many steps as Back took',
      forwards === backs,
      `${backs} back and ${forwards} forward — a step that cannot be walked again is a step that was lost`);
    /* `onClock - 1`: all the way forward is the state after the drop, which is
       one block fewer than the walk had before it. Relative, for the same reason
       the four above are. */
    check('  and the film comes back as it was',
      (await blocks.count()) === onClock - 1,
      `${await blocks.count()} after stepping all the way forward, where ${onClock - 1} was wanted`
      + ' — nothing may be lost on the way back');
  }

    /* ── And it comes out the other end ───────────────────────

       Nothing walked the export until now, which made this the worst gap in
       the probe: every check above could pass while "Put it together" gave
       back nothing at all — and the person who found out would be somebody
       an hour into cutting, with no way to get their work out.

       It is also the one part with no fallback. `stitch.ts` paints frames
       onto a canvas and records them in the browser, which is why this room
       has no per-minute bill; the price of that is that there is no server
       to ask when it fails.

       Recorded in real time, so a two-second film takes two seconds. The
       wait is generous rather than tuned: a probe that fails because a
       loaded runner was half a second slow teaches nobody anything. */
    /* ── The price, said before the press ─────────────────────

       Carli, 1 October 2026: *"Onthou dat hierdie ook 'n betaalde produk is
       wat krediete werd is."*

       Everything in this room is free and exactly one press costs, which
       makes it the easiest possible place to meet a charge nobody expected:
       nothing has cost money for twenty minutes, so nothing feels like it is
       about to. `check:saysprice` holds the source side of that; this reads
       the number off the screen, because a price that is in the code and not
       on the glass has been said to nobody. */
    const priceTag = (await p.locator('[data-editorprice]').innerText().catch(() => '')) || '';
    check('the button that costs says so before it is pressed',
      /\d/.test(priceTag),
      `the button reads "${priceTag.trim()}" — a charge met afterwards is a surprise about money`);

    await p.locator('[data-editormake]').click();
    const film = p.locator('[data-editormade]');
    await film.waitFor({ state: 'visible', timeout: 45000 }).catch(() => undefined);

    const said = await p.locator('[data-videoeditor] [role="alert"]').innerText().catch(() => '');
    check('putting the film together says nothing went wrong',
      said.trim() === '',
      said.trim().slice(0, 120));

    check('  and gives back a film',
      (await film.count()) === 1,
      'the export is the only way work leaves this room and there is no server behind it');

    /* Decoded rather than weighed, and the first attempt is worth writing
       down: fetching the blob URL to measure it returned "Failed to fetch",
       because the app sends a Content-Security-Policy and `connect-src` does
       not list `blob:`. That is the policy doing its job — the probe was
       wrong, not the app.

       Asking the element to decode is the better question anyway. A `<video>`
       with a blob src that contains nothing looks exactly like one that
       works, and a MediaRecorder webm reports `duration` as Infinity until
       it is seeked; `videoWidth` is only non-zero once a real frame has been
       read out of the file. */
    const frame = await p.locator('[data-editormade] video').evaluate(
      (el) => new Promise((done) => {
        const answer = () => done({ w: el.videoWidth, h: el.videoHeight, state: el.readyState });
        if (el.readyState >= 1) { answer(); return; }
        el.addEventListener('loadedmetadata', answer, { once: true });
        el.addEventListener('error', () => done({ w: 0, h: 0, state: -1 }), { once: true });
        setTimeout(() => done({ w: el.videoWidth, h: el.videoHeight, state: el.readyState }), 8000);
      }),
    ).catch(() => ({ w: 0, h: 0, state: -2 }));
    check('  with a film in it that actually decodes',
      frame.w > 0 && frame.h > 0,
      `${frame.w}×${frame.h}, readyState ${frame.state} — an empty film looks identical to a working one until something reads a frame out of it`);

    check('  and a way to save it',
      (await p.locator('[data-editorsave]').count()) === 1);

  /* ── Nothing the room adds breaks the page it sits on ──────────────── */

  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  const seen = p.viewportSize()?.width ?? 0;
  check('the video desk still fits its own window with the editor on it',
    wide <= seen + 1,
    `${wide}px inside a ${seen}px window — something in the editor pushes the page sideways`);

  /* Card headings are buttons because a card folds; `check:buttonlook` has
     the same exemption. Measuring them here reported four 20px "controls"
     that are headings, which is the probe being wrong about what a control
     is. Only the things inside a card are measured. */
  const tiny = await p.evaluate(() => {
    const small = [];
    for (const el of document.querySelectorAll('[data-videoeditor] button')) {
      if (el.closest('h2, h3, header')) continue;
      if (!el.hasAttribute('data-editorblock') && !/^data-editor/.test(el.getAttributeNames().find((n) => n.startsWith('data-editor')) ?? '')) continue;
      const r = el.getBoundingClientRect();
      if (r.height > 0 && r.height < 44) small.push(`${el.textContent?.trim().slice(0, 24)} ${Math.round(r.height)}px`);
    }
    return small;
  });
  check('every control the editor adds is a thumb tall',
    tiny.length === 0,
    tiny.join(', '));

} catch (thrown) {
  problems.push(`threw: ${String(thrown).slice(0, 200)}`);
} finally {
  if (b) await b.close().catch(() => undefined);
  server.stop();
}

if (problems.length > 0) {
  console.error(`\ncheck:editor — ${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\ncheck:editor — a clip brought in becomes a block on a ruled clock you can tap, scrub and play; a split makes two without losing a frame; and nothing added pushes the page sideways.');
