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
  check('the video desk offers a post', (await door.count()) > 0,
    'the still that goes beside the moving ones has no way in');
  if ((await door.count()) === 0) throw new Error('no way into the post studio');
  await door.click();
  await page.waitForTimeout(700);

  const sheet = page.locator('[data-poststudio]').first();
  check('  and it opens', (await sheet.count()) > 0);

  /* ── It draws ────────────────────────────────────────────────────────── */

  await page.locator('[data-addwords]').first().click();
  await page.waitForTimeout(300);
  await page.locator('[data-poststudio] textarea').first().fill('Karoo pad');
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

  /* ── The bands, on the shape that has them ───────────────────────────── */

  const clash = () => page.locator('[data-postclash]').count();

  check('a square raises no warning about a caption bar',
    (await clash()) === 0,
    'nothing is printed over a feed post, and a warning drawn where it is'
    + ' false teaches somebody to ignore it where it is true');

  const story = page.locator('[data-poststudio] button').filter({ hasText: /Story/ }).first();
  check('  and there is a story to choose', (await story.count()) > 0);
  await story.click();
  await page.waitForTimeout(700);

  check('  and on a story, words at the bottom are flagged',
    (await clash()) > 0,
    'they land under the caption, the username and the sound bar — which is'
    + ' something you otherwise find out after posting');

  /* ── The price, before the press ─────────────────────────────────────── */

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
  const coming = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
  await save.click();
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
    if (sheet2) sheet2.scrollTop = sheet2.scrollHeight;
  });
  await page.waitForTimeout(400);

  const covered = await page.evaluate(() => {
    const bar = document.querySelector('nav[aria-label]');
    const sheet2 = document.querySelector('[data-poststudio]');
    if (!bar || !sheet2) return ['no bar or no sheet'];
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

  /* ── And it can be left ──────────────────────────────────────────────── */

  await page.locator('[data-poststudio] [data-backout]').first().click();
  await page.waitForTimeout(600);
  check('it closes, and the desk is still behind it',
    (await page.locator('[data-poststudio]').count()) === 0
    && (await page.locator('[data-openpost]').count()) > 0,
    'closing the post should leave the video desk, not the whole studio');

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
  '\ncheck:postwalk — the post studio opens on the video desk, draws what is'
  + ' typed, warns where a platform covers it, names its price, and can be left.',
);
