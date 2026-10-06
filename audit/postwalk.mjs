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

  /* ── Nothing stranded under the app's own bar ────────────────────────── */

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
        out.push(`${el.tagName.toLowerCase()} @${Math.round(r.top)}-${Math.round(r.bottom)}`);
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
