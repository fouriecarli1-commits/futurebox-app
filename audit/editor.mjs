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
import { enter, studio, toRoom, unfold } from './enter.mjs';
import { serve } from './where.mjs';

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
    }

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

    /* And taking one out puts it back to one. */
    await p.locator('[data-editordrop]').click();
    await p.waitForTimeout(600);
    check('taking a piece out leaves the rest',
      (await blocks.count()) === 1,
      `${await blocks.count()} after removing one of two`);

    /* ── And it can be taken back ─────────────────────────────────────
 
       An editor without undo is worse than a booth without one: a split you
       did not mean and the only way back is bringing the file in again and
       doing every trim over. So the whole sequence is walked backwards. */
    await p.locator('[data-editorundo]').click();
    await p.waitForTimeout(500);
    check('undo puts the dropped piece back',
      (await blocks.count()) === 2,
      `${await blocks.count()} after taking back a removal`);

    await p.locator('[data-editorundo]').click();
    await p.waitForTimeout(500);
    check('  and again undoes the split',
      (await blocks.count()) === 1,
      `${await blocks.count()} after taking back the split too`);

    await p.locator('[data-editorredo]').click();
    await p.waitForTimeout(500);
    check('  and forward puts the split back',
      (await blocks.count()) === 2,
      `${await blocks.count()} after stepping forward`);

    /* ── All the way back, and all the way forward again ────────────
 
       The first version of this asserted that the clip survives being taken
       back to the beginning. That was my assumption and not a rule: every
       editor lets you undo an import, and this one does.
 
       What matters is that nothing is LOST. So it goes all the way back to
       an empty clock — which is the state before the clip arrived, and is
       correct — and then all the way forward, and the film has to come back
       exactly as it was. A history that empties the room and cannot refill
       it is the fault; an empty room with a forward button is not. */
    for (let i = 0; i < 8; i += 1) {
      await p.locator('[data-editorundo]').click().catch(() => undefined);
      await p.waitForTimeout(120);
    }
    check('  taking it all the way back leaves an empty clock',
      (await blocks.count()) === 0 && (await p.locator('[data-editorempty]').count()) === 1,
      `${await blocks.count()} blocks — back past the import should be the room as it opened`);

    check('  and Back is then disabled rather than doing nothing',
      await p.locator('[data-editorundo]').isDisabled(),
      'a button that is pressable and does nothing is the failure this app keeps meeting');

    for (let i = 0; i < 8; i += 1) {
      await p.locator('[data-editorredo]').click().catch(() => undefined);
      await p.waitForTimeout(120);
    }
    check('  and forward brings the whole film back',
      (await blocks.count()) === 1,
      `${await blocks.count()} after stepping all the way forward — nothing may be lost on the way back`);
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
