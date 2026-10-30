/**
 * Filters in the photo editor, and its tools shown as pictures.
 *
 * The owner, 16 October 2026: *"Kyk asb ook hoe oulik dit is om die funksies op
 * prentjies te wys (onthou mense is visueel). Ek soek ook al daai funksies en
 * ook sulke oulike filters ... Ons foto's en filter prentjies moet net iets
 * anders wees en anders lyk."*
 *
 * Read off canvases: a tool's picture is her photograph once she has one, a
 * filter's picture is her photograph with that filter on, and pressing a
 * filter changes the post the way its picture said it would.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';

const server = await serve(process.argv[2] || '3335');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const { browser, page } = await enter({ width: 390, height: 844, touch: true, at: server.url });
const tool = async (which) => {
  await page.locator(`[data-cutbench="${which}"]`).first().click();
  await page.waitForTimeout(450);
};

/** The average colour of the middle of a canvas. */
const middle = (selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!(el instanceof HTMLCanvasElement)) return null;
  const d = el.getContext('2d').getImageData(el.width * 0.3, el.height * 0.3, el.width * 0.4, el.height * 0.4).data;
  let r = 0; let g = 0; let b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4;
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}, selector);
const grey = (c) => Boolean(c) && Math.abs(c.r - c.g) < 14 && Math.abs(c.g - c.b) < 14;
const far = (a, b) => Boolean(a && b) && Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);

try {
  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(900);

  /* ── The tools down both sides ──
     The owner, 28 October 2026: the tools on the empty sides of the photo,
     small — "much much more minimalistic, clean and out of the way". Icons
     on a phone; the pictures of her photo stay on the desk's rail. */
  const sides = await page.evaluate(() => ['left', 'right'].map((side) => {
    const rail = document.querySelector(`[data-postside="${side}"]`);
    const tools = rail ? [...rail.querySelectorAll('[data-cutbench]')] : [];
    return { n: tools.length, widest: Math.max(0, ...tools.map((el) => el.getBoundingClientRect().width)) };
  }));
  check('the tools run down both sides of the photo, small', sides.every((one) => one.n >= 6 && one.widest <= 48), JSON.stringify(sides));
  check('  and Filters is one of them', (await page.locator('[data-postside] [data-cutbench="filters"]').count()) > 0);

  await tool('pic');
  const brought = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 400; c.height = 400;
    const x = c.getContext('2d');
    x.fillStyle = '#e0301e';
    x.fillRect(0, 0, 400, 400);
    x.fillStyle = '#1e90e0';
    x.fillRect(0, 300, 400, 100);
    const blob = await new Promise((done) => c.toBlob(done, 'image/png'));
    const input = document.querySelector('[data-poststudio] input[type=file]') ?? document.querySelector('input[type=file]');
    if (!input || !blob) return false;
    const holder = new DataTransfer();
    holder.items.add(new File([blob], 'red.png', { type: 'image/png' }));
    input.files = holder.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
  check('a photograph is brought in', brought === true);
  await page.waitForTimeout(1400);

  /* ── The filters ── */
  await tool('filters');
  check('Filters opens with its groups', (await page.locator('[data-postfiltergroup]').count()) >= 8);
  check('  and each filter is a picture', (await page.locator('[data-postfilters] [data-postfilter] canvas').count()) >= 6);
  await page.locator('[data-postfiltergroup="mono"]').click();
  await page.waitForTimeout(300);
  check('  drawn on her own photograph', grey(await middle('[data-postfilter="charcoal"] canvas'))
    && (await middle('[data-postfilter="none"] canvas'))?.r > 150);

  const before = await middle('[data-postcanvas]');
  await page.locator('[data-postfilter="charcoal"]').click();
  await page.waitForTimeout(500);
  const charcoal = await middle('[data-postcanvas]');
  check('pressing Charcoal makes the post black and white', grey(charcoal) && !grey(before),
    `${JSON.stringify(before)} → ${JSON.stringify(charcoal)}`);
  check('  and it is the one shown as chosen', (await page.locator('[data-postfilter="charcoal"][aria-pressed="true"]').count()) === 1);

  await page.locator('[data-postfilterstrength] input[type=range]').fill('0.5');
  await page.waitForTimeout(400);
  const half = await middle('[data-postcanvas]');
  check('  half strength is half way back to her colours', !grey(half) && half.r - half.g < before.r - before.g,
    `${JSON.stringify(half)}`);

  await page.locator('[data-postfiltergroup="neon"]').click();
  await page.locator('[data-postfilter="synthwave"]').click();
  await page.waitForTimeout(400);
  const neon = await middle('[data-postcanvas]');
  check('another group, another filter: the post changes again', far(neon, charcoal) > 40, JSON.stringify(neon));

  await page.locator('[data-postfilter="none"]').click();
  await page.waitForTimeout(400);
  const back = await middle('[data-postcanvas]');
  check('Original puts her photograph back as it came', far(back, before) < 8, `${JSON.stringify(before)} → ${JSON.stringify(back)}`);

  /* The sliders in Adjust carry on from a filter rather than starting over. */
  await page.locator('[data-postfiltergroup="warm"]').click();
  await page.locator('[data-postfilter="kalahari"]').click();
  await page.waitForTimeout(300);
  await tool('tone');
  const colour = await page.locator('[data-postlookslider="colour"] input[type=range], input[data-postlookslider="colour"]').first().inputValue().catch(() => null);
  check('Adjust shows what the filter did', colour !== null && Number(colour) > 1.05, String(colour));

  /* ── Before and after ──
     The owner, 16 October 2026: *"met die auto enhance moet daar 'n ruler wees
     wat oor die prent slide om te wys hoe dit gelyk het."* */
  await page.locator('[data-postauto]').click();
  await page.waitForTimeout(400);
  check('Lift it brings up the before-and-after line', (await page.locator('[data-postcomparehandle]').count()) === 1);
  await tool('filters');
  await page.locator('[data-postfiltergroup="mono"]').click();
  await page.locator('[data-postfilter="charcoal"]').click();
  await page.waitForTimeout(300);
  if (!(await page.locator('[data-postcomparehandle]').count())) await page.locator('[data-postcompare]').first().click();
  await page.waitForTimeout(400);
  const side = (x) => page.evaluate((share) => {
    const el = document.querySelector('[data-postcanvas]');
    const d = el.getContext('2d').getImageData(Math.round(el.width * share), Math.round(el.height * 0.4), 1, 1).data;
    return { r: d[0], g: d[1], b: d[2] };
  }, x);
  const left = await side(0.25);
  const right = await side(0.75);
  check('  left of the line is her photo as it came, right of it the filter', !grey(left) && left.r > 150 && grey(right),
    `${JSON.stringify(left)} | ${JSON.stringify(right)}`);
  const handle = await page.locator('[data-postcomparehandle]').boundingBox();
  const glass = await page.locator('[data-postcanvas]').boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, glass.y + glass.height * 0.4);
  await page.mouse.down();
  for (let n = 1; n <= 8; n += 1) await page.mouse.move(handle.x + handle.width / 2 + (glass.x + glass.width * 0.9 - handle.x - handle.width / 2) * (n / 8), glass.y + glass.height * 0.4);
  await page.mouse.up();
  await page.waitForTimeout(400);
  const slid = await side(0.75);
  check('  and sliding it across shows more of how it looked', !grey(slid) && slid.r > 150, JSON.stringify(slid));
  await page.locator('[data-postfilter="none"]').click();
  await page.waitForTimeout(300);
  check('  and it goes when there is nothing to compare', (await page.locator('[data-postcomparehandle]').count()) === 0);

  /* Smart light: a dim photo, measured and lit, with the line to show it. */
  await tool('pic');
  await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 400; c.height = 400;
    const x = c.getContext('2d');
    x.fillStyle = '#2a3040';
    x.fillRect(0, 0, 400, 400);
    x.fillStyle = '#4a4038';
    x.fillRect(100, 100, 200, 200);
    const blob = await new Promise((done) => c.toBlob(done, 'image/png'));
    const input = document.querySelector('[data-poststudio] input[type=file]');
    const holder = new DataTransfer();
    holder.items.add(new File([blob], 'dim.png', { type: 'image/png' }));
    input.files = holder.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(1400);
  await tool('tone');
  const dim = await page.evaluate(() => {
    const el = document.querySelector('[data-postcanvas]');
    const d = el.getContext('2d').getImageData(Math.round(el.width * 0.75), Math.round(el.height * 0.4), 1, 1).data;
    return { r: d[0], g: d[1], b: d[2] };
  });
  await page.locator('[data-postsmartlight]').click();
  await page.waitForTimeout(500);
  const lit = await page.evaluate(() => {
    const el = document.querySelector('[data-postcanvas]');
    const d = el.getContext('2d').getImageData(Math.round(el.width * 0.75), Math.round(el.height * 0.4), 1, 1).data;
    return { r: d[0], g: d[1], b: d[2] };
  });
  check('Smart light lifts her dim photo', lit.r + lit.g + lit.b > dim.r + dim.g + dim.b + 30, `${JSON.stringify(dim)} → ${JSON.stringify(lit)}`);
  check('  and brings up the before-and-after line', (await page.locator('[data-postcomparehandle]').count()) === 1);

  /* ── Transparency shows what is behind it ─────────────────────────────
     Task #40, "the transparency slider shows no change": it faded the photo
     into the near-black behind every new post, so a dark photo barely moved
     and "Lighter" made it darker. What shows through is chosen beside it,
     and white behind a faded photo makes it lighter. */
  const pixel = () => page.evaluate(() => {
    const el = document.querySelector('[data-postcanvas]');
    const d = el.getContext('2d').getImageData(Math.round(el.width * 0.75), Math.round(el.height * 0.4), 1, 1).data;
    return d[0] + d[1] + d[2];
  });
  const solid = await pixel();
  await page.locator('[data-postphotoalpha] input[type=range]').evaluate((el) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '60');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(400);
  check('the transparency slider offers what shows through it', (await page.locator('[data-postalphaback]').count()) >= 3);
  await page.locator('[data-postalphaback="white"]').click();
  await page.waitForTimeout(500);
  const overWhite = await pixel();
  check('  and with white behind it, fading the photo makes it lighter', overWhite > solid + 60, `${solid} solid → ${overWhite} faded over white`);
  await page.locator('[data-postalphaback="black"]').click();
  await page.waitForTimeout(500);
  const overBlack = await pixel();
  check('  and with black behind it, darker', overBlack < solid - 20, `${solid} solid → ${overBlack} faded over black`);

  await page.screenshot({ path: shot('postfilters.png') });
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:postfilters — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:postfilters — the tools are pictures of her photograph, every filter is shown on it, and pressing one does what its picture showed.');
