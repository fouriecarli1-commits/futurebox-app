/**
 * The plain-background remover, pressed.
 *
 * ── Why this one needs a walk ────────────────────────────────────────────
 *
 * Carli, 10 October 2026, after it shipped: *"Die background remove nogsteeds
 * nie."* `check:plateground` drives the maths on pictures it builds itself
 * and proves the wiring by reading the file — and both of those pass while
 * the button on the screen does nothing at all. A control behind a bench
 * nobody opens, a handler that throws on a real canvas, a picture that comes
 * back unchanged: all three look exactly like this from the outside, and none
 * of them is visible to a check that reads source.
 *
 * So this presses it.
 *
 * ── The fixture, and why it is this one ──────────────────────────────────
 *
 * A CHECKERBOARD with a navy square on it: her picture, in miniature. A flat
 * white ground would pass with half the code working — the thing that made
 * her logo hard is that the ground is two colours, and a remover that assumes
 * one clears the white squares and leaves the grey.
 *
 * Measured in pixels off the canvas, not looked at. A picture that is mounted
 * and unchanged passes every assertion anybody writes about the DOM, and is
 * exactly what a dead button looks like.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const PORT = process.argv[2] || '3097';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const server = await serve(PORT);
const { browser, page } = await enter({
  width: 390, height: 844, at: server.url, touch: true,
});

const shouted = [];
page.on('console', (m) => { if (m.type() === 'error') shouted.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => shouted.push('THROWN ' + String(e).slice(0, 200)));

try {
  await studio(page);
  await toRoom(page, 'Video desk');
  await page.waitForTimeout(900);

  const door = page.locator('[data-openpost]').first();
  check('the photo editor has a way in', (await door.count()) > 0);
  if ((await door.count()) === 0) throw new Error('no way into the photo editor');
  await door.click();
  await page.waitForTimeout(1500);

  /* The picture bench, which is where every tool that needs a picture is.
 
     Pressing the bench that is already open CLOSES it, so asking twice in a
     row shuts away the control the walk is reaching for. That is how the
     first run of this walk reported the button missing when it was there —
     the walk's own fault, found by dumping what was on the page rather than
     by believing the assertion. */
  let openBench = null;
  const bench = async (which) => {
    const tab = page.locator(`[data-cutbench="${which}"]`).first();
    if ((await tab.count()) === 0) return false;
    const sheetUp = (await page.locator('[data-desk]').count()) > 0;
    if (openBench === which && sheetUp) return true;
    await tab.click();
    openBench = which;
    await page.waitForTimeout(500);
    return true;
  };
  await bench('pic');

  const put = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 240;
    c.height = 240;
    const x = c.getContext('2d');
    /* Her ground: a grid of 224-grey and white, 30 to a square. */
    for (let gy = 0; gy < 8; gy += 1) {
      for (let gx = 0; gx < 8; gx += 1) {
        x.fillStyle = (gx + gy) % 2 === 0 ? '#e0e0e0' : '#ffffff';
        x.fillRect(gx * 30, gy * 30, 30, 30);
      }
    }
    /* And the drawing, in her navy. */
    x.fillStyle = '#1f3a5f';
    x.fillRect(80, 80, 80, 80);
    const blob = await new Promise((done) => c.toBlob(done, 'image/png'));
    const input = document.querySelector('input[data-postpicture]')
      ?? document.querySelector('input[type=file]');
    if (!input || !blob) return false;
    const holder = new DataTransfer();
    holder.items.add(new File([blob], 'checks.png', { type: 'image/png' }));
    input.files = holder.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
  check('a checkerboard picture can be brought in', put === true);
  await page.waitForTimeout(1400);

  /* ── The button itself ─────────────────────────────────────────────── */

  await bench('pic');
  const tabs = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('[data-cutbench]')) out.push(el.getAttribute('data-cutbench'));
    return { tabs: out, desk: document.querySelectorAll('[data-desk]').length,
             simple: document.querySelector('[data-postsimple]')?.getAttribute('data-postsimple') };
  });
  console.log('       benches:', JSON.stringify(tabs));

  const seen = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('*')) {
      for (const a of el.attributes) {
        if (a.name.startsWith('data-post')) out.push(a.name);
      }
    }
    return [...new Set(out)].sort();
  });
  console.log('       data-post* on the page:', seen.join(' '));

  const button = page.locator('[data-postgroundgo]').first();
  check('the plain-background button is on the picture bench',
    (await button.count()) > 0,
    'a control nobody can reach is a control nobody has');
  check('  and it is the operator can actually see it',
    (await button.count()) > 0 && await button.isVisible(),
    'rendered but not visible is the same as missing, and looks the same'
    + ' from the source');

  const reach = page.locator('[data-postgroundreach="everywhere"]').first();
  if ((await reach.count()) > 0) await reach.click();

  if ((await button.count()) > 0) {
    await button.click();
    await page.waitForTimeout(2000);
  }

  const told = await page.evaluate(() => ({
    said: document.querySelector('[data-postsaid]')?.textContent?.trim() ?? '(nothing)',
    undo: document.querySelector('[data-postundo]')?.getAttribute('title')
      ?? document.querySelector('[data-postundo]')?.textContent?.trim() ?? '(none)',
  }));
  console.log('       the room says:', JSON.stringify(told));
  console.log('       console errors:', JSON.stringify(shouted.slice(0, 3)));

  /* ── And what it did to the picture, read through a colour ─────────
 
     The room's own canvas is the POST, not the picture: it is 540 square
     whatever the picture is, and it is opaque. Reading alpha off it says
     nothing, which is how the first run of this walk reported a dead button
     that had in fact just worked.
 
     So a loud colour is put BEHIND the picture instead. If the ground really
     went, that colour comes through where the checkerboard was; if the cut
     did nothing, the picture's own grey and white are still over it. Magenta
     because nothing in this fixture or this room is magenta, so counting it
     cannot pass for the wrong reason. */
  const BEHIND = '#ff00d4';
  await bench('pic');
  const painted = await page.evaluate((colour) => {
    const input = document.querySelector('input[data-postbehind]');
    if (!input) return false;
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(input, colour);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, BEHIND);
  check('a colour can be put behind the picture', painted === true);
  await page.waitForTimeout(1200);

  const read = await page.evaluate((colour) => {
    const canvas = document.querySelector('[data-postcanvas]') ?? document.querySelector('canvas');
    if (!canvas) return { why: 'no canvas' };
    const x = canvas.getContext('2d', { willReadFrequently: true });
    const d = x.getImageData(0, 0, canvas.width, canvas.height).data;
    const want = [parseInt(colour.slice(1, 3), 16), parseInt(colour.slice(3, 5), 16),
      parseInt(colour.slice(5, 7), 16)];
    let through = 0;
    let navy = 0;
    const total = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - want[0]) < 24 && Math.abs(d[i + 1] - want[1]) < 24
        && Math.abs(d[i + 2] - want[2]) < 24) through += 1;
      if (d[i] < 70 && d[i + 2] > 70 && d[i + 2] < 140) navy += 1;
    }
    return { w: canvas.width, h: canvas.height, through, navy, total };
  }, BEHIND);
  console.log('       picture now:', JSON.stringify(read));

  check('pressing it really takes the checkerboard off',
    Boolean(read.total) && read.through / read.total > 0.5,
    `only ${read.through ?? 0} of ${read.total ?? 0} pixels show what is`
    + ' behind — a button that changes nothing is what she is looking at');

  check('  and the drawing on it is still there',
    Boolean(read.total) && read.navy > 500,
    `${read.navy ?? 0} navy pixels left — everything cleared means the`
    + ' subject went with the ground');
} finally {
  await browser.close();
  await server.stop();
}

console.log(problems.length === 0
  ? '\n  The plain-background button is on the bench, and pressing it really\n'
    + '  clears a checkerboard off a picture.'
  : `\n  ${problems.length} not right.`);
process.exit(problems.length === 0 ? 0 : 1);
