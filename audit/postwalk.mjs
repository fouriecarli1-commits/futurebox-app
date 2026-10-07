/**
 * The post studio, walked the way she would walk it.
 *
 * ── Why this one needs a walk ────────────────────────────────────────────
 *
 * It is new, it is the biggest screen added in a day, and THREE of its
 * faults were caught by checks that were not written for it:
 *
 *   `check:photopath`  a camera photo would have killed the tab
 *   `check:backlayers` the phone's back button would have closed the room
 *   `check:belowtabs`  the Save button sat under the app's own bar
 *
 * All three are things only somebody holding a phone meets. Those checks
 * read source; none of them opens the screen. What nothing was asking is
 * whether the thing draws at all.
 *
 * ── What it measures, and why each one ───────────────────────────────────
 *
 * The canvas is read for PIXELS rather than looked at. A canvas that is
 * mounted, sized and blank passes every test anybody writes about the DOM,
 * and is exactly what a drawing bug looks like.
 *
 * The safe-zone warning is measured on BOTH shapes. On a story, words at the
 * bottom land under the caption bar and the screen must say so; on a square
 * nothing is printed over the picture and the same words must NOT raise a
 * warning. A warning that is always on is a warning nobody reads.
 */
import { readFileSync } from 'node:fs';
import { enter, studio, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3093';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const server = await serve(PORT);
const { browser, page, problems: noise } = await enter({
  width: 390, height: 844, at: server.url, touch: true,
  /* The export charges a credit before it draws anything, so on a build with
     no accounts the press would stop at the till and the file would never be
     made. Stubbed to "paid" — which is honest about what this probe is for:
     it measures the PICTURE that comes out, and `check:koste` measures the
     charge. Registered here because a route registered after `enter` returns
     is too late for anything fetched on mount. */
  before: async (p) => {
    await p.route('**/api/post/export', (r) => r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, left: 42 }),
    }));
  },
});

try {
  await studio(page);
  await toRoom(page, 'Video desk');
  await page.waitForTimeout(900);

  /* ── The way in ──────────────────────────────────────────────────────── */

  const door = page.locator('[data-openpost]').first();
  check('the video desk points at the photo editor', (await door.count()) > 0,
    'the still that goes beside the moving ones has no way in');
  if ((await door.count()) === 0) throw new Error('no way into the photo editor');
  await door.click();
  await page.waitForTimeout(1500);

  const sheet = page.locator('[data-poststudio]').first();
  check('  and it opens', (await sheet.count()) > 0);
  /* A ROOM, not a sheet over the desk.
 
     A sheet has no card in the menu and nothing points at it; the only way
     to find it was to know it was there. The two are told apart here rather
     than taken on trust, because a sheet painted in the room's colours looks
     identical in a screenshot and behaves differently under the phone's back
     button. */
  check('  as a room of its own, in the cutting room\u2019s colours',
    (await page.locator('[data-poststudio][data-postroom="yes"]').count()) > 0,
    'it is still a sheet painted to look like a room');
  check('    with no close button of its own, because a room is left by the menu',
    (await page.locator('[data-poststudio] [data-backout]').count()) === 0,
    'a second way out that only this room has, going somewhere that depends'
    + ' on how you arrived');


  /**
   * Open a bench on the room's bar.
   *
   * Carli, 7 October 2026: *"Die editing tools moet ook onder in 'n bar
   * wees."* Every control in this room is behind one of six benches now, so
   * a walk that reaches straight for a button is a walk that times out —
   * which is what this one did, on `data-addwords`, the moment the bar
   * arrived. Reaching for a control without opening the thing it lives in is
   * also what a person would do, so the failure was fair.
   */
  let openBench = null;
  const bench = async (which) => {
    const tab = page.locator(`[data-cutbench="${which}"]`).first();
    if ((await tab.count()) === 0) return false;
    /* Pressing the bench that is already open CLOSES it — which is right in
       the room and wrong in a walk that asks for the same bench twice in a
       row. Asking for what is already open timed out looking for a control
       it had just shut away. */
    if (openBench === which) return true;
    await tab.click();
    openBench = which;
    await page.waitForTimeout(500);
    return true;
  };

  /** And shut whatever is open, because the sheet is drawn OVER the picture.
   *
   * The sheet is portalled out of the room now so it can be capped against
   * the screen rather than the room's own box, which means it sits above the
   * canvas rather than below it. A drag aimed at the picture with a bench
   * open lands on the sheet: the pan read 47536 → 47536, exactly unchanged,
   * which is the signature of a gesture that never reached the thing it was
   * aimed at. In the room she does the same — looks at the picture, then
   * opens a tool — so closing it first is also what a person does. */
  const shut = async () => {
    if (openBench === null) return;
    const tab = page.locator(`[data-cutbench="${openBench}"]`).first();
    if (await tab.count()) await tab.click();
    openBench = null;
    await page.waitForTimeout(400);
  };

  /* ── It draws ────────────────────────────────────────────────────────── */

  check('the bar offers its benches', await bench('text'),
    'the room has no bar, so every control below is unreachable');
  await page.locator('[data-addwords]').first().click();
  await page.waitForTimeout(300);
  await page.locator('textarea').first().fill('Karoo pad');
  await page.waitForTimeout(600);

  /**
   * Read off the canvas, not off the DOM.
   *
   * The ink is white by default and the ground is near-black, so "something
   * was drawn" is a bright pixel. A canvas that is mounted and blank is what
   * a drawing bug looks like, and it passes every DOM assertion there is.
   */
  const ink = await page.evaluate(() => {
    const el = document.querySelector('[data-postcanvas]');
    if (!(el instanceof HTMLCanvasElement)) return -1;
    const ctx = el.getContext('2d');
    if (!ctx) return -1;
    const { data } = ctx.getImageData(0, 0, el.width, el.height);
    let bright = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) bright += 1;
    }
    return bright;
  });
  check('the words are actually drawn on the picture', ink > 200,
    `${ink} bright pixels — a canvas that is mounted and blank passes every`
    + ' test anybody writes about the DOM');

  /* ── The faces are really different faces ────────────────────────────
 
     She asked for nice fonts. What was there was three system stacks, and on
     most Android phones Georgia is not installed — so "Serif" handed back the
     same sans the page was already using, the control worked, the state
     changed, the canvas redrew, and the picture was identical.
 
     Nothing a rule reading source can see. `ctx.font = '700 48px X'` is a
     string assignment that succeeds whether or not X exists, and a canvas
     substitutes silently. So this measures the only thing that cannot lie:
     the WIDTH of the same words in each face. Two faces that measure the
     same width are one face with two names.
 
     `document.fonts.check` is read alongside it, because a width that
     differs tells us the faces differ and a check that says false tells us
     WHY when they do not. */
  const faces = await page.evaluate(async () => {
    const ctx = document.createElement('canvas').getContext('2d');
    /* Long and mixed on purpose: two different faces can agree on the width
       of a short word by luck, and the whole assertion below is a comparison
       of widths. */
    const SAMPLE = 'Karoo pad, 48 myl — WAGTING op die wind';
    /* A family that cannot exist, so a request for it is a request for the
       browser's default. This is the ruler everything else is read against. */
    const ABSENT = '"NoSuchFaceAnywhere7391"';

    const wide = (shorthand) => {
      ctx.font = shorthand;
      return Math.round(ctx.measureText(SAMPLE).width);
    };

    const out = [];
    for (const el of Array.from(document.querySelectorAll('[data-postface]'))) {
      const style = getComputedStyle(el);
      const first = style.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
      const weight = style.fontWeight;
      /* The face alone, backed only by the absent one, so there is nothing
         for it to fall through to but the default. */
      const alone = wide(`${weight} 64px "${first}", ${ABSENT}`);
      out.push({
        id: el.getAttribute('data-postface'),
        first,
        width: wide(`${weight} 64px ${style.fontFamily}`),
        alone,
        floor: wide(`${weight} 64px ${ABSENT}`),
      });
    }
    return out;
  });

  check(`the post offers more than one face (${faces.length})`, faces.length >= 3,
    'the chips are gone, so nothing below is measuring anything');

  const widths = faces.map((one) => one.width);
  check('  and each one draws the same words at its own width',
    new Set(widths).size === faces.length,
    faces.map((one) => `${one.id} ${one.width}px`).join(', ')
    + ' — two faces that measure the same width are one face with two names,'
    + ' which is what three system stacks are on a phone that has one of them');

  /* Both halves are needed and neither is enough.
 
     `next/font` emits a metric-adjusted local fallback beside each face —
     "Inter Fallback", "Anton Fallback" — whose whole purpose is to measure
     like the real one. So three different widths can be three fallbacks and
     prove nothing about the download. And a loaded face proves nothing about
     whether the canvas is using it. Together they do. */
  /* Both halves are needed and neither is enough.
 
     `next/font` emits a metric-adjusted local fallback beside each face —
     "Inter Fallback", "Anton Fallback" — whose whole purpose is to measure
     like the real one. So three different widths can be three stand-ins and
     prove nothing about the download.
 
     And `document.fonts.check` cannot do this half. It was tried first and
     it is BLIND to the likeliest mistake of all: asked about a family that
     does not exist anywhere, it answers true, because all it reports is
     whether matching @font-face rules are still loading — and a name nobody
     declared has none. A face set to "Bebas Neue" with no Bebas Neue in the
     build passed it. So the ruler is a family that cannot exist: a face that
     measures the same as THAT is a face the browser does not have. */
  const missing = faces.filter((one) => one.alone === one.floor);
  check('  and each face is really on the device, not a stand-in for it',
    missing.length === 0,
    missing.map((one) => `${one.id} wants ${one.first}`).join(', ')
    + ' — backed by nothing, it measures exactly as wide as a family that'
    + ' cannot exist, which is the browser quietly handing back its default');

  /* ── The bands, on the shape that has them ───────────────────────────── */

  const clash = () => page.locator('[data-postclash]').count();

  check('a square raises no warning about a caption bar',
    (await clash()) === 0,
    'nothing is printed over a feed post, and a warning drawn where it is'
    + ' false teaches somebody to ignore it where it is true');

  await bench('frame');
  const story = page.locator('button').filter({ hasText: /Story/ }).first();
  check('  and there is a story to choose', (await story.count()) > 0);
  await story.click();
  await page.waitForTimeout(700);

  check('  and on a story, words at the bottom are flagged',
    (await clash()) > 0,
    'they land under the caption, the username and the sound bar — which is'
    + ' something you otherwise find out after posting');

  /* ── The price, before the press ─────────────────────────────────────── */

  /* The bill before the work, not only on the button.
 
     Carli: *"Remember to monetize and nothing is free in this app."* The
     cutting room shows an itemised bill before it charges; this room let
     somebody build a whole post and meet the price at the foot of it. */
  await bench('save');
  const priced = ((await page.locator('[data-postprice]').first().innerText().catch(() => '')) ?? '')
    .replace(/\s+/g, ' ');
  check('the room says what taking a picture out costs, before the work',
    /\d/.test(priced) && /credit|krediet/i.test(priced),
    `${priced || 'nothing at the top of the room'} — a price met at the end is`
    + ' a price somebody has already spent time to reach');

  await bench('save');
  const save = page.locator('[data-postexport]').first();
  const said = ((await save.innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ');
  check('the save button names what it costs', /\d/.test(said) && /credit|krediet/i.test(said),
    `${said} — a paid button with no price on it is the fault this repo keeps`
    + ' catching');

  /* ── Nothing behind it ───────────────────────────────────────────────
 
     Transparency is the one thing in this screen that can work perfectly and
     still be useless, because a transparent post and a black post are the
     same dark square on a phone. So it is measured twice, in the two places
     it can be wrong in opposite directions:
 
       on screen   the checkerboard must be THERE, or she cannot tell the
                   feature did anything
       in the file  it must NOT be there, or every layered post she ever
                   exports has a grey grid baked into it
 
     One canvas read and one real download. Nothing about this is visible to
     a rule that reads source, because both halves come out of the same
     function and differ only by the argument it is called with. */

  await bench('pic');
  await page.locator('[data-postclear]').first().click();
  await page.waitForTimeout(500);

  const ground = await page.evaluate(() => {
    const el = document.querySelector('[data-postcanvas]');
    if (!(el instanceof HTMLCanvasElement)) return null;
    const ctx = el.getContext('2d');
    if (!ctx) return null;
    const { data } = ctx.getImageData(0, 0, el.width, el.height);
    const greys = new Set();
    let seeThrough = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 250) seeThrough += 1;
      /* The two checker greys, and only those: #3f3f46 and #27272a. */
      if (data[i] === 0x3f || data[i] === 0x27) greys.add(data[i]);
    }
    return { greys: [...greys].sort(), seeThrough, total: data.length / 4 };
  });

  check('with the background off, the preview shows a checkerboard',
    ground !== null && ground.greys.length === 2,
    `${ground ? ground.greys.length : 'no'} of the two checker greys found — `
    + 'without it a transparent post looks exactly like a black one, and the'
    + ' feature is unusable rather than missing');
  check('  and the preview itself is still solid, so nothing shows through it',
    ground !== null && ground.seeThrough === 0,
    `${ground ? ground.seeThrough : '?'} see-through pixels on screen`);

  /* And now the file. */
  /* Back to the bench the save button lives on. It was found under `save`
     and pressed after three other benches had been opened over it, which is
     a locator pointing at something no longer in the room. */
  await bench('save');
  const coming = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
  await page.locator('[data-postexport]').first().click();
  const got = await coming;
  check('  and pressing save really hands over a file', got !== null,
    'the till was stubbed as paid, so a press that produces no download is'
    + ' the drawing or the blob and not the charge');

  if (got) {
    const where = await got.path();
    const bytes = readFileSync(where);
    check('    which is a PNG, the only format that carries the alpha',
      bytes[0] === 0x89 && bytes.slice(1, 4).toString() === 'PNG',
      `starts ${bytes.slice(0, 4).toString('hex')} — a JPEG would flatten every`
      + ' transparent background to black with nothing on screen to say so');

    /* Read back through the browser, because decoding a PNG by hand here
       would be a second implementation to be wrong in. */
    const inFile = await page.evaluate(async (base64) => {
      const img = new Image();
      await new Promise((done, fail) => {
        img.onload = done;
        img.onerror = fail;
        img.src = `data:image/png;base64,${base64}`;
      });
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, c.width, c.height);
      let clear = 0;
      const greys = new Set();
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) clear += 1;
        /* The WHOLE colour, and opaque with it.
 
           Matching one channel reported the checkerboard baked into a file
           that was 94% transparent — the antialiased edge of white text over
           nothing produces greys, and some of them happen to carry 0x3f or
           0x27 in red. A false alarm about the thing this assertion exists to
           catch is worse than no assertion, because the next person turns it
           off. A checker block is flat #3f3f46 or #27272a at full alpha and
           nothing else in this picture is. */
        if (data[i + 3] !== 255) continue;
        const hex = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
        if (hex === 0x3f3f46 || hex === 0x27272a) greys.add(hex.toString(16));
      }
      return { clear, greys: [...greys], total: data.length / 4, w: c.width, h: c.height };
    }, bytes.toString('base64'));

    check('    and most of the saved picture is genuinely see-through',
      inFile.clear > inFile.total * 0.5,
      `${inFile.clear} of ${inFile.total} pixels at ${inFile.w}×${inFile.h} are clear`
      + ' — a post that exports opaque is a black box behind her words the first'
      + ' time she layers it over somebody else\u2019s video');
    check('    and the checkerboard she was shown is not in it',
      inFile.greys.length === 0,
      `the guide greys ${inFile.greys.join(', ')} were baked into the file — it is`
      + ' drawn to help her see transparency, not to be part of the post');
  }

  /* ── Which part of the photograph shows ──────────────────────────────
 
     Carli, 7 October 2026: *"Waar edit ek 'n foto?"* `check:postcrop` walks
     the arithmetic — 6804 placements, none of them uncovering the frame. What
     arithmetic cannot say is whether the screen is wired to it: a slider that
     updates its own label and a canvas that never changes is exactly what a
     broken control looks like.
 
     So the picture is HALF RED AND HALF BLUE, and every assertion below is a
     colour count. Two halves is the only fixture that answers "which part is
     showing" rather than "did something change".
 
     Made in the page rather than kept as a file in this repo: a binary
     fixture is a thing to go stale, and a 4:3 picture is two fillRects. */
  await bench('pic');
  const put = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 400;
    c.height = 300;
    const x = c.getContext('2d');
    x.fillStyle = '#ff0000';
    x.fillRect(0, 0, 200, 300);
    x.fillStyle = '#0000ff';
    x.fillRect(200, 0, 200, 300);
    /* A third colour, down the seam, for the eraser to be aimed at. Narrow
       enough that taking it out is something small — which is what this
       eraser is for and what it is honest about being for.
 
       YELLOW, and that is not a free choice. It was green first, and green is
       already what this walk paints behind the picture to prove that `fill`
       leaves no gap — so a green band in the picture was counted as
       background and failed an assertion three hundred lines earlier. A
       fixture colour has to collide with none of the sentinels already in
       use: yellow is neither red nor blue nor green to any of the readings
       here. */
    x.fillStyle = '#ffff00';
    x.fillRect(188, 0, 24, 300);
    const blob = await new Promise((done) => c.toBlob(done, 'image/png'));
    /* Not prefixed with `[data-poststudio]`. The bar's sheet is portalled
       out of the room's own element, so a selector scoped to the room finds
       nothing the moment a control moves onto a bench. */
    const input = document.querySelector('input[data-postpicture]')
      ?? document.querySelector('input[type=file]');
    if (!input || !blob) return false;
    const holder = new DataTransfer();
    holder.items.add(new File([blob], 'half.png', { type: 'image/png' }));
    input.files = holder.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
  check('a picture off the phone can be brought in', put === true,
    'the file input is not where this walk looks for it');
  await page.waitForTimeout(1200);

  /** How much red and blue is on screen, and how much is neither. */
  const colours = () => page.evaluate(() => {
    const el = document.querySelector('[data-postcanvas]');
    if (!(el instanceof HTMLCanvasElement)) return null;
    const ctx = el.getContext('2d');
    const { data } = ctx.getImageData(0, 0, el.width, el.height);
    let red = 0;
    let blue = 0;
    let green = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 170 && data[i + 1] < 90 && data[i + 2] < 90) red += 1;
      else if (data[i + 2] > 170 && data[i] < 90 && data[i + 1] < 90) blue += 1;
      else if (data[i + 1] > 170 && data[i] < 90 && data[i + 2] < 90) green += 1;
    }
    return { red, blue, green, total: data.length / 4 };
  });

  /* A background nothing in the photograph can be mistaken for. If any of it
     shows while the basis is `fill`, the picture is not covering the frame.
 
     Set with `fill` and not by assigning `.value` and firing an event.
     React keeps its own record of what an input last held, so a value
     written straight onto the node is read back as "unchanged" and the
     handler never runs. The first version of this did exactly that: the
     background was never green, so "none of the background shows" counted
     green pixels in a picture that had no green in it and passed every
     time. An assertion that cannot fail is worse than none, because it is
     read as cover. */
  await bench('pic');
  await page.locator('[data-postbehind]').first().fill('#00ff00');
  await page.waitForTimeout(500);

  const middle = await colours();
  check('  and at the centre, both sides of it are showing',
    middle !== null && middle.red > 1000 && middle.blue > 1000,
    `red ${middle?.red}, blue ${middle?.blue} — the frame is 9:16 and the`
    + ' picture 4:3, so the middle of it should straddle both halves');
  check('  and none of the background shows behind it',
    middle !== null && middle.green === 0,
    `${middle?.green} background pixels — in "fill" the photograph covers the`
    + ' frame, and a gap on a transparent post is an invisible wedge');

  await bench('frame');
  check('the canvas says it can be dragged',
    (await page.locator('[data-postcanvas][data-postmovable="yes"]').count()) > 0,
    '740 pixels fall off each side of this picture and the screen reports'
    + ' nothing to move, so she cannot choose which');

  /* Dragged to one end, by hand, across the canvas.
 
     On a tall shape the canvas is 636 points high on an 844-point screen, so
     its middle sits under the dock — and a drag aimed there lands on the
     furniture, not the picture. The first version of this reported the drag
     doing nothing, which was true of the gesture and false of the app: the
     same drag in isolation moved the picture from half red to two-thirds
     blue. So the point is scrolled into view and then held well inside both
     the canvas and the screen. */
  await shut();
  await page.locator('[data-postcanvas]').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  let pulled = null;
  const box = await page.locator('[data-postcanvas]').first().boundingBox();
  /* ── Aimed at the middle of what is actually on the screen ──────────────
 
     `844 - 160` was an allowance for the dock, and on 7 October the room
     became a fixed-height column: the canvas is taller than the strip it
     scrolls inside, so part of it is off the top as well as behind the bar,
     and a point computed from the canvas's own box can be either. The drag
     then landed half on the picture and moved it 3 per cent — "blue went
     47536 → 46054", which read as the pan being broken when the pan was fine.
 
     So the band is the canvas clipped to the screen above the room's own bar,
     and the drag is aimed at the middle of that. Measured, not allowed for. */
  const onGlass = await page.evaluate(() => {
    const glass = document.querySelector('[data-postcanvas]');
    const dock = document.querySelector('[data-cutdock]');
    if (!glass) return null;
    const r = glass.getBoundingClientRect();
    const floor = dock ? dock.getBoundingClientRect().top : window.innerHeight;
    const top = Math.max(r.top, 0);
    const bottom = Math.min(r.bottom, floor);
    return bottom - top < 40 ? null : { middle: Math.round((top + bottom) / 2) };
  });
  if (box && onGlass) {
    const y = onGlass.middle;
    await page.mouse.move(box.x + box.width * 0.8, y);
    await page.mouse.down();
    /* Step by step rather than one `steps:` move. Each pointermove is one
       increment applied from the last, which is what makes an edge stop the
       picture instead of storing a total that snaps back. */
    for (let step = 1; step <= 10; step += 1) {
      await page.mouse.move(box.x + box.width * (0.8 - 0.07 * step), y);
    }
    await page.mouse.up();
    await page.waitForTimeout(500);
    pulled = await colours();
    check('  and dragging it changes which part is in the frame',
      pulled !== null && middle !== null && pulled.blue > middle.blue,
      `blue went ${middle?.blue} → ${pulled?.blue} — a drag that moves nothing`
      + ' is the fault this whole feature exists to fix, wearing a new face');
    check('    and still nothing of the background shows',
      pulled !== null && pulled.green === 0,
      `${pulled?.green} background pixels after dragging to the end — the pan`
      + ' is stored as a share of the slack precisely so this cannot happen');
  }

  /* Closer in, to the point where only one half can fit. */
  /* Centred first.
 
     Zoomed from the edge the drag left it at, the frame is a hundred per
     cent blue at every magnification — the rightmost tenth of a picture
     whose right half is blue is blue whatever the scale — so the counts
     were identical and the assertion called a working slider broken. The
     third time in this one block that the walk was wrong about the code
     rather than the other way round, and all three were the same mistake:
     measuring a change against a reading taken somewhere else. */
  /* And the bench open again — the drag above needed it shut, and Centre and
     the zoom live on it. */
  await bench('frame');
  await page.locator('[data-postcentre]').first().click();
  await page.waitForTimeout(400);
  const was = await colours();
  await page.locator('[data-postzoom]').first().fill('4');
  await page.waitForTimeout(500);
  const close = await colours();
  const label = await page.locator('[data-postzoomnow]').first().innerText().catch(() => '');
  /* `was` is the centred reading taken immediately above, not the one from
     before the drag. Compared to the older number this passed on the drag's
     change and would have gone on passing with the slider wired to nothing —
     the same adjacent measurement this whole file is arranged against, and I
     wrote it three assertions after writing the warning about it. */
  check('going closer says so and actually goes closer',
    /4\.00/.test(label) && close !== null && was !== null
      && Math.abs(close.blue - was.blue) > 500,
    `the label reads "${label}" and blue went ${was?.blue} → ${close?.blue}`
    + ' — a slider that moves its own number and nothing else is what a'
    + ' control wired to nothing looks like');

  /* And the whole picture, which is allowed to leave background showing —
     at its own size. Tested while still at 4x, it covered the frame and
     reported no background, which is correct and proves nothing: "the whole
     picture" means the picture FITS, and a picture zoomed four times past
     fitting does not. */
  await page.locator('[data-postzoom]').first().fill('1');
  await page.waitForTimeout(400);
  await page.locator('[data-postbasis="whole"]').first().click();
  await page.waitForTimeout(600);
  const whole = await colours();
  check('the whole picture fits, with background above and below it',
    whole !== null && whole.green > 1000 && whole.red > 500 && whole.blue > 500,
    `${whole?.green} background, red ${whole?.red}, blue ${whole?.blue} — a 4:3`
    + ' picture contained in a 9:16 frame leaves 555 pixels top and bottom');
  check('  and the screen says that is what is happening',
    (await page.locator('[data-postgap]').count()) > 0,
    'background where a photograph was expected, with nothing saying why');

  /* ── Smaller than the frame, and movable while it is ─────────────────
 
     Carli, 7 October 2026: *"Die foto moet ook kan shrink onder 1.00 dit moet
     ook gedrag kan word soos mens die behoefte het."*
 
     Two separate things, and the second is the one that was missing for a
     reason worth catching: the slack was the picture's OVERHANG, so a
     picture smaller than the frame had none and was nailed to the middle.
     The slider's floor and the drag are both checked, because a slider that
     goes below one over a picture that cannot then be placed anywhere is
     half a feature. */
  await page.locator('[data-postzoom]').first().fill('0.4');
  await page.waitForTimeout(600);
  const shrunk = await colours();
  check('the picture can be made smaller than the frame',
    shrunk !== null && whole !== null && shrunk.green > whole.green,
    `${whole?.green} → ${shrunk?.green} background pixels — the slider's floor`
    + ' is still at one, so its whole left-hand half does nothing');

  check('  and the screen still offers to move it',
    (await page.locator('[data-postcanvas][data-postmovable="yes"]').count()) > 0,
    'a small picture nailed to the middle can only ever be a small picture in'
    + ' the middle, which is not a layout anybody chose');

  await shut();
  await page.locator('[data-postcanvas]').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const smallBox = await page.locator('[data-postcanvas]').first().boundingBox();
  const smallBand = await page.evaluate(() => {
    const glass = document.querySelector('[data-postcanvas]');
    const dock = document.querySelector('[data-cutdock]');
    if (!glass) return null;
    const r = glass.getBoundingClientRect();
    const floor = dock ? dock.getBoundingClientRect().top : window.innerHeight;
    const top = Math.max(r.top, 0);
    const bottom = Math.min(r.bottom, floor);
    return bottom - top < 40 ? null : { middle: Math.round((top + bottom) / 2) };
  });
  let moved = null;
  if (smallBox && smallBand) {
    const y = smallBand.middle;
    await page.mouse.move(smallBox.x + smallBox.width * 0.5, y);
    await page.mouse.down();
    for (let step = 1; step <= 10; step += 1) {
      await page.mouse.move(smallBox.x + smallBox.width * (0.5 - 0.04 * step), y);
    }
    await page.mouse.up();
    await page.waitForTimeout(500);
    moved = await page.evaluate(() => {
      /* Where the photograph sits on the glass, read as the first and last
         column holding any of it. Colour counts cannot answer this one: a
         small picture dragged sideways shows the same pixels, just
         somewhere else. */
      const el = document.querySelector('[data-postcanvas]');
      const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
      let first = -1;
      let last = -1;
      for (let x = 0; x < el.width; x += 1) {
        for (let y = 0; y < el.height; y += 1) {
          const i = (y * el.width + x) * 4;
          const red = d[i] > 170 && d[i + 1] < 90 && d[i + 2] < 90;
          const blue = d[i + 2] > 170 && d[i] < 90 && d[i + 1] < 90;
          if (red || blue) {
            if (first < 0) first = x;
            last = x;
            break;
          }
        }
      }
      return { first, last, width: el.width };
    });
  }
  check('  and dragging a small picture really moves it inside the frame',
    moved !== null && moved.first >= 0 && moved.first < Math.round(moved.width * 0.12),
    `the photograph sits between ${moved?.first} and ${moved?.last} of`
    + ` ${moved?.width} — dragged to the left edge it should start at nought,`
    + ' and a picture still centred is one nailed to the middle');

  await bench('frame');
  await page.locator('[data-postcentre]').first().click();
  await page.locator('[data-postzoom]').first().fill('1');
  await page.locator('[data-postbasis="fill"]').first().click();
  await page.waitForTimeout(500);

  /* ── How it reads, which is free and on the device ───────────────────
 
     Carli, 7 October 2026, listing a modern editor's tools. Half of that
     list runs on the phone for nothing and this is it; the other half needs
     an engine and a price per use.
 
     Measured as colour again, with the half-red half-blue picture: a lift
     changes the pixels, and "as it came" puts them back exactly. "Exactly"
     is the assertion worth having — a reset that lands near the original is
     a reset that has quietly kept something. */
  /* The MEAN, not the colour counts.
 
     `colours()` sorts pixels into buckets — red enough, blue enough — and a
     lift of four per cent brightness moves values without moving anything
     between buckets, so it reported the lift doing nothing. The right
     instrument for "did the picture change" is the average, which moves
     whenever any pixel does. The counts are the right instrument for "which
     part is showing", which is a different question and the one they were
     written for. */
  const mean = () => page.evaluate(() => {
    const el = document.querySelector('[data-postcanvas]');
    if (!(el instanceof HTMLCanvasElement)) return null;
    const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
    let r = 0;
    let g = 0;
    let b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4;
    return { r: +(r / n).toFixed(3), g: +(g / n).toFixed(3), b: +(b / n).toFixed(3) };
  });

  /* ── Cutting the photograph down, which is not framing it ───────────
 
     Carli, 7 October 2026: *"Ek sien nie goeie cropping en cutting tools
     nie."* `lib/cropbox.ts` carries why that is a different tool from the
     framing above, and `check:cropbox` holds the arithmetic — no gesture can
     put the box outside the picture, inside out, or down to nothing.
 
     What a browser has to answer is the half arithmetic cannot: that the
     gesture reaches the box at all, that the box is drawn, and that pressing
     Cut really replaces the photograph with the part inside it. The third is
     the one that matters — a crop tool that looks right and leaves the
     picture alone is the exact failure the pan had in September. */
  const sizeOfPicture = () => page.evaluate(() => {
    /* The picture itself, not the canvas: the canvas is the frame and stays
       1080x1920 whatever is cut away. */
    const img = document.querySelector('[data-postpicturesize]');
    return img ? { width: Number(img.dataset.w), height: Number(img.dataset.h) } : null;
  });

  /* On the FRAME's bench, not the picture's. Carli, 7 October 2026: *"Ek dink
     wel cutting moet by The frame wees nie picture nie."* Somebody looking
     for a crop looks where the shapes are. */
  await bench('frame');
  const before = await sizeOfPicture();
  check('the room offers to cut the photograph down, where the shapes are',
    (await page.locator('[data-postcropstart]').count()) > 0,
    'there is no crop in this room, only a frame to look through');

  if ((await page.locator('[data-postcropstart]').count()) > 0 && before) {
    const asIs = await colours();
    await page.locator('[data-postcropstart]').first().click();
    await page.waitForTimeout(600);

    check('  and the bar to cut with is on the screen, not behind a tab',
      (await page.locator('[data-postcropbar]:visible').count()) > 0,
      'the bench closes so the corners can be reached, so a Cut button behind'
      + ' it is a Cut button nobody can press');

    /* Measured AFTER the box has been made smaller, not merely after the
       crop opens.
 
       The first version read the glass the moment cutting started and
       compared it with the moment before — and the box starts as the whole
       picture, so nothing is shaded and the only difference is the picture
       being drawn whole instead of filling the frame. It passed at a one per
       cent change, which is a reading of the letterboxing and not of the
       shading. Square on a 4:3 photograph throws away a quarter of it, and a
       quarter of a photograph going dark is not a one per cent change. */
    const whole = await colours();
    await page.locator('[data-postcropshape="square"]').first().click();
    await page.waitForTimeout(500);
    const shaded = await colours();
    const lit = (one) => (one ? one.red + one.blue : 0);
    check('  and the glass shades what is being thrown away',
      shaded !== null && whole !== null && lit(shaded) < lit(whole) * 0.85,
      `${lit(whole)} → ${lit(shaded)} bright pixels — square throws a quarter of`
      + ' a 4:3 photograph away, so a reading that barely moves is a box'
      + ' nobody is drawing');

    await page.locator('[data-postcropdo]').first().click();
    await page.waitForTimeout(1200);

    const after = await sizeOfPicture();
    check('  and pressing Cut really cuts the photograph',
      after !== null && (after.width < before.width || after.height < before.height),
      `${before.width}x${before.height} → ${after?.width}x${after?.height} — the`
      + ' picture is the size it was, so the press changed a number and not a'
      + ' photograph');
    check('    to the shape that was asked for',
      after !== null && Math.abs(after.width - after.height) <= 2,
      `${after?.width}x${after?.height} — square was pressed`);

    const kept = await colours();
    check('    and what is left is still the middle of the picture',
      kept !== null && kept.red > 1000 && kept.blue > 1000,
      `red ${kept?.red}, blue ${kept?.blue} — a square out of the middle of a`
      + ' half-red half-blue photograph holds some of each; one of them at'
      + ' nought means the cut was taken from the wrong place');

    check('      and the bar goes away once it is done',
      (await page.locator('[data-postcropbar]:visible').count()) === 0,
      'a crop bar that stays up is a room that thinks it is still cropping');
  }

  /* ── What kind of file, and the one warning that has to reach her ────
 
     Carli, 7 October 2026: *"Ook die formaat van export?"* Two formats now,
     and the whole reason this is a browser assertion rather than a source
     one is the clash between them: JPEG has three channels, so a see-through
     post saved as a JPG comes out on a solid colour and no setting undoes
     it. `check:postfile` holds that `holdsClear` says so; this holds that the
     ROOM says so, on the screen, before the credit is spent. */
  await bench('save');
  check('the room offers more than one kind of file',
    (await page.locator('[data-postkind="png"]').count()) > 0
    && (await page.locator('[data-postkind="jpg"]').count()) > 0,
    'one format and no choice, which is what she asked about');
  check('  and more than one size',
    (await page.locator('[data-postscale="2"]').count()) > 0);

  await page.locator('[data-postkind="jpg"]').first().click();
  await page.waitForTimeout(300);
  check('  JPG with a background behind it says nothing, because there is nothing to say',
    (await page.locator('[data-postkindwarn]:visible').count()) === 0,
    'a warning that is always up is a warning nobody reads');

  /* The background off, which is the state that clashes. */
  await bench('pic');
  await page.locator('[data-postclear]').first().click();
  await page.waitForTimeout(400);
  await bench('save');
  check('  and JPG on a see-through post warns her before the press',
    (await page.locator('[data-postkindwarn]:visible').count()) > 0,
    'she took the background out, chose the one format that cannot hold it,'
    + ' and the room let her pay for a picture on a black rectangle');

  await page.locator('[data-postkind="png"]').first().click();
  await page.waitForTimeout(300);
  check('    and the warning goes once she picks the format that can hold it',
    (await page.locator('[data-postkindwarn]:visible').count()) === 0);

  /* Put back, so nothing below this is measured against a transparent post. */
  await bench('pic');
  await page.locator('[data-postclear]').first().click();
  await page.waitForTimeout(400);

  await bench('tone');
  const asShot = await mean();
  await page.locator('[data-postauto]').first().click();
  await page.waitForTimeout(500);
  const lifted = await mean();
  check('one press lifts the picture',
    lifted !== null && asShot !== null
      && (lifted.r !== asShot.r || lifted.g !== asShot.g || lifted.b !== asShot.b),
    `${JSON.stringify(asShot)} → ${JSON.stringify(lifted)} — the lift changed`
    + ' nothing, which is a button wired to a state nobody draws');

  await page.locator('[data-postplain]').first().click();
  await page.waitForTimeout(500);
  const back = await mean();
  check('  and "as it came" puts it back exactly',
    back !== null && asShot !== null
      && back.r === asShot.r && back.g === asShot.g && back.b === asShot.b,
    `${JSON.stringify(back)} against ${JSON.stringify(asShot)} — a reset that`
    + ' lands near the original is one that has quietly kept something');

  /* The one that cannot be seen by looking: a blur must not reach the words.
 
     The filter is set on the context to draw the picture and has to come off
     before anything is written. Left on, every letter goes through it — and
     a blurred post with blurred words looks deliberate enough that nobody
     reports it. Counted as bright pixels, which is what the words are. */
  const sharpWords = await page.evaluate(() => {
    const el = document.querySelector('[data-postcanvas]');
    const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
    let bright = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 230 && d[i + 1] > 230 && d[i + 2] > 230) bright += 1;
    }
    return bright;
  });
  await page.locator('[data-postlookslider="blur"]').first().fill('20');
  await page.waitForTimeout(600);
  const blurredWords = await page.evaluate(() => {
    const el = document.querySelector('[data-postcanvas]');
    const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
    let bright = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 230 && d[i + 1] > 230 && d[i + 2] > 230) bright += 1;
    }
    return bright;
  });
  check('a blur on the picture leaves the words alone',
    sharpWords > 100 && Math.abs(blurredWords - sharpWords) < sharpWords * 0.15,
    `${sharpWords} solid white pixels became ${blurredWords} — the filter is`
    + ' still set when the words are drawn, so every letter went through it');

  await page.locator('[data-postplain]').first().click();
  await page.waitForTimeout(400);

  /* ── Taking something out ────────────────────────────────────────────
 
     Carli, 7 October 2026: *"magic eraser"*. `check:erase` walks the
     arithmetic with known pixels. What it cannot say is whether a thumb
     dragged across a canvas reaches the right pixels of the photograph —
     the brush is painted on a view of the whole picture and the mask is in
     the PICTURE's own coordinates, and a mapping that is out by a scale
     factor erases the wrong part of the photograph and looks, on a phone,
     like the eraser simply being bad.
 
     So the fixture has a third colour in a known place: a green band down
     the middle of the red and blue halves. Paint over the green, press, and
     the green has to be gone while the red and blue are still there. */
  /** How much of the band is on a canvas. Yellow collides with nothing. */
  const band = (which) => page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el || !el.getContext) return -1;
    const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
    let seen = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 170 && d[i + 1] > 170 && d[i + 2] < 90) seen += 1;
    }
    return seen;
  }, which);

  /* Read off the SAME canvas before and after. The first version read the
     brush's own view before and the post's preview after — two canvases at
     two sizes showing two different framings, so the numbers were never
     comparable and the assertion was arithmetic on nothing. */
  const bandBefore = await band('[data-postcanvas]');

  await bench('pic');
  await page.locator('[data-postrubmode]').first().click();
  await page.waitForTimeout(600);
  const rub = page.locator('[data-postrubcanvas]').first();
  check('painting over something opens a view of the whole picture',
    (await rub.count()) > 0,
    'the brush has nowhere to paint, so nothing below is measuring anything');

  if ((await rub.count()) > 0) {
    check('  and the thing to take out is in the picture', bandBefore > 100,
      `${bandBefore} band pixels on the post — the fixture has a band down the`
      + ' middle for the eraser to be aimed at');

    /* Three passes, covering the band and a little either side.
 
       One pass down the middle left a two-pixel rim of the band unpainted —
       and the gap is filled from whatever is around it, so it filled with
       more band. 3811 bytes genuinely changed and the picture looked
       identical, which read as the eraser doing nothing.
 
       The app was right and the test was painting too little. It is also
       the thing a person will get wrong first, so the room now says it:
       cover ALL of it. */
    /* The box is read again before EVERY stroke.
 
       Reading it once was wrong twice over: the buttons used to appear when
       the first stroke landed, which pushed the canvas down the page, so
       strokes two and three went somewhere other than where they were
       aimed. The room now keeps those buttons drawn and disabled so nothing
       moves — and this re-reads anyway, because a walk that depends on the
       layout never shifting is a walk that will lie again. */
    /* The brush lives inside the bar's sheet now, which is capped and
       scrolls on its own, so part of it can be off the bottom of the screen
       — and a drag aimed at a point that is not showing lands on whatever
       is. */
    await rub.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    for (const across of [0.47, 0.5, 0.53]) {
      const box = await rub.boundingBox();
      await page.mouse.move(box.x + box.width * across, box.y + box.height * 0.1);
      await page.mouse.down();
      for (let step = 1; step <= 12; step += 1) {
        await page.mouse.move(box.x + box.width * across, box.y + box.height * (0.1 + 0.066 * step));
      }
      await page.mouse.up();
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(500);

    check('    and the drag can be pressed into the picture',
      (await page.locator('[data-postrubgo]').count()) > 0,
      'nothing was painted, so the thumb never reached the mask');

    await page.locator('[data-postrubgo]').first().click();
    await page.waitForTimeout(2500);

    const after = await colours();
    check('  the painted band is gone from the picture',
      after !== null && after.red > 1000 && after.blue > 1000,
      `red ${after?.red}, blue ${after?.blue} — the halves either side of the`
      + ' band have to survive, or the mapping from thumb to pixel is out and'
      + ' it erased somewhere else');

    const bandAfter = await band('[data-postcanvas]');
    check('    with most of it gone where the thumb went',
      bandBefore > 0 && bandAfter < bandBefore * 0.5,
      `${bandAfter} band pixels remain against ${bandBefore} before — a mapping`
      + ' out by a scale factor erases the wrong part of the photograph and'
      + ' reads, on a phone, as the eraser simply being bad');

    check('    and it can be put back', (await page.locator('[data-postrubback]').count()) > 0,
      'an erase with no way back, on a photograph that may itself have been a'
      + ' crop made somewhere else');
    await page.locator('[data-postrubback]').first().click();
    await page.waitForTimeout(600);
  }

  /* Back to where the rest of the walk expects to be. */
  await bench('frame');
  await page.locator('[data-postbasis="fill"]').first().click();
  await page.locator('[data-postcentre]').first().click();
  await page.locator('button').filter({ hasText: /^Take it out$|^Haal dit uit$/ })
    .first().click()
    .catch(() => {});
  await page.waitForTimeout(600);

  /* ── The preview is not the product ──────────────────────────────────
 
     Right-click on a canvas offers "Save image as…", and what that hands
     over is not a screenshot of a phone screen — it is the exact file. The
     preview used to be the full 1080x1920, so there was a free full-size
     road out of a screen whose entire charging model is a credit on the way
     out. Her reason for having no watermark was *"hulle sal nie kan export
     sonder krediete nie"*; a free road out is that decision reversed by
     nobody.
 
     Read off the canvas rather than the CSS, because CSS is what made it
     look fine while being wrong. */
  const shownAt = await page.evaluate(() => {
    const el = document.querySelector('[data-postcanvas]');
    return el instanceof HTMLCanvasElement ? { w: el.width, h: el.height } : null;
  });
  check('the preview is drawn smaller than the file it stands for',
    shownAt !== null && Math.max(shownAt.w, shownAt.h) <= 720,
    `${shownAt ? `${shownAt.w}x${shownAt.h}` : 'no canvas'} — saved straight off`
    + ' the canvas that is the finished picture, for nothing');

  /* ── And it can go next door ─────────────────────────────────────────
 
     Carli: *"kan ook in die video editor ingesit word."* The editor is the
     room under this desk, so this is the whole feature: press once, and the
     picture is the film's cover with no trip through the camera roll.
 
     Measured in the editor and not in the studio. A confirmation sentence
     is the studio agreeing with itself; the cover appearing downstairs is
     the only thing that says the hand-over happened. */
  await bench('save');
  const into = page.locator('[data-postintofilm]').first();
  check('the post offers to become the film\u2019s cover', (await into.count()) > 0,
    'the only way into the editor is a download and a re-import');

  if ((await into.count()) > 0) {
    const price = ((await into.innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ');
    check('  and says what that costs, like the save does',
      /\d/.test(price) && /credit|krediet/i.test(price),
      `${price} — the editor exports for nothing on the device, so a free`
      + ' hand-over would be a free road off the phone');
  }

  /* ── Nothing stranded under the app's own bar ────────────────────────── */

  /* Scrolled to the END first, which is the whole point of the assertion.
 
     Measured where it happened to be standing, this reported "Start a new
     post" under the bar — and it was, at that scroll position. So is every
     other control in a scrolling sheet on its way past. Stranded means
     UNREACHABLE: the thing you cannot get out from under the bar however far
     you scroll, which is what `barClearance` is for and what a snapshot
     cannot tell apart from a control in transit. */
  await page.evaluate(() => {
    const sheet2 = document.querySelector('[data-poststudio]');
    /* The LAST control in the room, brought into view.
 
       Scrolling to the bottom of the page was right while this was a
       full-screen sheet and wrong the moment it became a room: the copilot
       is drawn below the room, so the bottom of the page is the bottom of
       the copilot and the room's own last button sits wherever it sits.
       "Stranded" means it cannot be got out from under the bar, not that it
       happens to be under it at some scroll position — so the thing to do
       is what a person would do, and scroll to it. */
    if (sheet2) sheet2.scrollTop = sheet2.scrollHeight;
    const controls = sheet2 ? sheet2.querySelectorAll('button, input, textarea, label') : [];
    const last = controls[controls.length - 1];
    /* `center`, not `end`. `end` parks the element's bottom edge on the
       viewport's bottom edge by definition, which puts it under a bar that
       overlays the foot of the screen no matter how much clearance the room
       leaves — so it reported the last button stranded at every possible
       padding. Stranded means no scroll position clears it. */
    if (last) last.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(400);

  const covered = await page.evaluate(() => {
    const bar = document.querySelector('nav[aria-label]');
    const sheet2 = document.querySelector('[data-poststudio]');
    if (!sheet2) return ['no sheet'];
    /* ── No app bar is the answer here now, not a missing measurement ─────
 
       The photo editor claims the screen since 7 October — Carli asked for
       its tools along the bottom, and two bars stacked is the fault the booth
       had in September. So nothing CAN be stranded under a bar that is not
       drawn, and what has to be true instead is that the room's own bar is
       down there and reaches the bottom edge. `audit/underbar.mjs` asks that
       question of every room, in both states, and this one defers to it
       rather than reporting a room doing the right thing as broken. */
    if (!bar) {
      const dock = document.querySelector('[data-cutdock]');
      if (!dock) return ['no app bar AND no bar of the room’s own'];
      const r = dock.getBoundingClientRect();
      return r.bottom >= window.innerHeight - 1
        ? []
        : [`the room’s own bar ends at ${Math.round(r.bottom)} of ${window.innerHeight}`];
    }
    const over = bar.getBoundingClientRect();
    const out = [];
    for (const el of Array.from(sheet2.querySelectorAll('button, input, textarea, label'))) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      if (r.bottom > over.top && r.top < over.bottom) {
        /* Named, not counted. "button @761-805" sends somebody scrolling
           through four hundred lines of JSX to find out which one. */
        const says = (el.getAttribute('data-postclear') !== null && 'background toggle')
          || (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 28)
          || el.tagName.toLowerCase();
        out.push(`${says} @${Math.round(r.top)}-${Math.round(r.bottom)}`);
      }
    }
    return [...new Set(out)];
  });
  check('nothing in the sheet is stranded under the tab bar',
    covered.length === 0, covered.slice(0, 5).join(', '));

  /* ── And it is a room somebody can find ─────────────────────────────── */

  const named = await page.evaluate(() => Array.from(document.querySelectorAll('button, a'))
    .map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim())
    .filter((text) => /Photo Editor|Foto Editor/i.test(text)).length);
  check('the photo editor is named somewhere a person can press', named > 0,
    'a room nothing points at is a sheet with extra steps');


  /* ── And then, from a clean start, the hand-over ─────────────────────
 
     Last and on its own, because it ends somewhere else: pressing it closes
     nothing but the measurement has to be taken in the EDITOR, and a block
     in the middle of this walk that reopened the sheet afterwards was how
     the first version of it broke the three assertions below it.
 
     Carli: *"kan ook in die video editor ingesit word."* A confirmation
     sentence in the studio is the studio agreeing with itself. The cover
     appearing downstairs is the only thing that says the hand-over
     happened — and if it did not, she was charged for nothing. */
  {
    const again = page.locator('[data-postintofilm]').first();
    if ((await again.count()) > 0) {
      await again.click();
      await page.waitForTimeout(1200);
      const said = await page.evaluate(() => {
        /* The room AND whatever the bar has portalled out of it. */
        return document.body.textContent ?? '';
      });
      check('pressing it says where the picture went',
        /cutting room|snykamer/i.test(said),
        'it has to NAME the room. It said "below this desk" at first, which'
        + ' is where the button is and not where the editor is, so she went'
        + ' looking down a page for something that was never on it');
      await page.waitForTimeout(400);

      /* Through the door, then behind the bar.
 
         Two layers, and the first version of this walked neither — it read
         for the cover straight after closing the sheet, found nothing, and
         reported the hand-over broken when it had worked. A check wrong
         about the code is the costlier direction to be wrong in, and it
         also found the real fault next to it: the studio's own sentence
         said "the editor is below this desk", and the cutting room is a
         ROOM away. The sentence was sending her scrolling.
 
         So: into the cutting room, then open the dock's film bench, which
         is where the cover panel lives and until then is not in the DOM. */
      /* Through the menu, because the door on the video desk is on the
         video desk — and the photo editor is its own room now, so the walk
         is no longer standing next to that button when it needs it. */
      await toRoom(page, 'Video Editor');
      await page.waitForTimeout(1400);
      const film = page.locator('[data-cutbench="film"]').first();
      if ((await film.count()) > 0) {
        await film.click();
        await page.waitForTimeout(800);
      }
      const hasCover = await page.evaluate(() => {
        const shown = document.querySelector('[data-editorcovershown]');
        /* And it says WHICH of the two it is. A frame shot out of the film
           would also fill this slot; only `coverFrom: 'brought'` makes the
           panel say a picture was brought in, which is what the hand-over
           sets. */
        const panel = shown?.closest('div')?.parentElement?.textContent ?? '';
        return { shown: Boolean(shown), brought: /brought|ingebring|gebring/i.test(panel) };
      });
      check('  and the cutting room really has it as the film\u2019s cover', hasCover.shown,
        'nothing in the editor\u2019s cover slot, so the press went nowhere —'
        + ' which is what a charge for nothing looks like');
      check('    as a picture brought in, not a frame shot out of the film',
        hasCover.brought,
        'the slot is filled but the panel does not say it was brought in, so'
        + ' `coverFrom` did not come with it');
    }
  }
  const faults = noise.filter((one) => /pageerror|console: /.test(one));
  check('and nothing throws while it is used', faults.length === 0,
    faults.slice(0, 3).join(' · '));

  await page.screenshot({ path: shot('postwalk.png'), fullPage: true });
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 200)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:postwalk — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log(
  '\ncheck:postwalk — the photo editor is a room of its own, draws what is typed,'
  + ' lets her choose which part of a photo shows, warns where a platform covers'
  + ' her words, says its price before the work, and hands the picture to a film.',
);
