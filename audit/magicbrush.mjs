/**
 * The photo editor's magic brush, Adjust with no photograph, and a
 * see-through background that can be seen.
 *
 * The owner, 16 October 2026: *"Adjust se funksies kom nie uit nie. Magic se crop
 * box werk nie, moet dit in elkgeval nie 'n paint brush wees wat oor 'n
 * gedeelte verf en dit word dan ai gemaster en gefix"* — and *"Ek sien ook nog
 * nerens transparent en dat dit werk nie."*
 *
 * Read off the glass: a finger dragged over the photograph leaves neon paint
 * where it went and nowhere else, the bench says it is ready, and Start over
 * takes the paint away. Adjust opens with its controls before there is a
 * photograph, changing the whole picture. A see-through post shows a light
 * checkerboard, and the button says the word.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';

const server = await serve(process.argv[2] || '3345');
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

/** Pixels of the post canvas that are the brush's neon, in a band across a share of its height. */
const neonIn = (top, bottom) => page.evaluate(([a, b]) => {
  const el = document.querySelector('[data-postcanvas]');
  if (!(el instanceof HTMLCanvasElement)) return -1;
  const y = Math.round(el.height * a);
  const h = Math.max(1, Math.round(el.height * (b - a)));
  const d = el.getContext('2d').getImageData(0, y, el.width, h).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 1] > d[i] + 40 && d[i + 1] > d[i + 2] + 40) n += 1;
  return n;
}, [top, bottom]);

try {
  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(900);

  /* ── Adjust before there is a photograph ── */
  await tool('tone');
  check('Adjust shows its controls with no photograph', (await page.locator('[data-postlook]').count()) === 1);
  check('  and changes the whole picture, the only thing there is to change',
    (await page.locator('[data-postlook] [data-postlooktarget="all"]').count()) === 1
    && (await page.locator('[data-postlookon="photo"]').count()) === 0);
  check('  with Lift it there to press', (await page.locator('[data-postauto]').count()) === 1);
  await tool('tone');

  /* ── See-through, said and seen ── */
  await tool('pic');
  const clear = page.locator('[data-postclear]').first();
  check('the background button says transparent', /transparent|deursigtig/i.test(await clear.innerText()));
  await clear.click();
  await page.waitForTimeout(400);
  const corner = await page.evaluate(() => {
    const el = document.querySelector('[data-postcanvas]');
    const d = el.getContext('2d').getImageData(Math.round(el.width * 0.02), Math.round(el.height * 0.02), 1, 1).data;
    return { r: d[0], g: d[1], b: d[2] };
  });
  check('  and says the squares are not in the picture that is saved',
    (await page.locator('[data-postcheckernote]').count()) === 1);
  check('  and a see-through post shows a light checkerboard, not a dark square',
    corner.r > 180 && corner.g > 180 && corner.b > 180, JSON.stringify(corner));
  await clear.click();
  await page.waitForTimeout(300);

  /* ── The brush ── */
  const brought = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 400; c.height = 400;
    const x = c.getContext('2d');
    x.fillStyle = '#7a7a7a';
    x.fillRect(0, 0, 400, 400);
    /* Something on a plain ground, so taking the background out has a
       subject to keep. Red, so it is never read as the brush's green. */
    x.fillStyle = '#c0392b';
    x.beginPath();
    x.arc(200, 200, 70, 0, Math.PI * 2);
    x.fill();
    const blob = await new Promise((done) => c.toBlob(done, 'image/png'));
    const input = document.querySelector('[data-poststudio] input[type=file]') ?? document.querySelector('input[type=file]');
    if (!input || !blob) return false;
    const holder = new DataTransfer();
    holder.items.add(new File([blob], 'grey.png', { type: 'image/png' }));
    input.files = holder.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
  check('a photograph is brought in', brought === true);
  await page.waitForTimeout(1400);

  await tool('magic');
  const says = page.locator('[data-postmagicsays]');
  check('Magic touch asks for paint, not a tap', /paint|verf/i.test(await says.innerText()), await says.innerText());
  check('  and nothing is painted yet', (await neonIn(0, 1)) === 0);
  const clearOf = await page.evaluate(() => {
    const glass = document.querySelector('[data-postcanvas]')?.getBoundingClientRect();
    const panel = document.querySelector('[data-postunder]')?.getBoundingClientRect();
    return glass && panel ? { glassFoot: Math.round(glass.bottom), panelTop: Math.round(panel.top) } : null;
  });
  check('  and its panel keeps under the photograph, so every part of it can be painted',
    clearOf !== null && clearOf.panelTop >= clearOf.glassFoot - 2, JSON.stringify(clearOf));

  const box = await page.locator('[data-postcanvas]').boundingBox();
  const y = box.y + box.height * 0.3;
  await page.mouse.move(box.x + box.width * 0.2, y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i += 1) {
    await page.mouse.move(box.x + box.width * (0.2 + i * 0.05), y);
  }
  await page.mouse.up();
  await page.waitForTimeout(400);

  const along = await neonIn(0.25, 0.35);
  const elsewhere = await neonIn(0.6, 0.9);
  check('a finger dragged over the photograph leaves paint where it went', along > 2000, `${along} neon pixels along the stroke`);
  check('  and nowhere else', elsewhere === 0, `${elsewhere} neon pixels below it`);
  check('  and the bench says that part is painted', /painted|geverf/i.test(await says.innerText()), await says.innerText());
  check('  with the three AI choices to press',
    (await page.locator('[data-postmagicbetter]').count()) === 1
    && (await page.locator('[data-postmagicfill]').count()) === 1);
  await page.screenshot({ path: shot('magicbrush.png') });

  await page.locator('[data-postmagicclear]').click();
  await page.waitForTimeout(300);
  check('Start over takes the paint away', (await neonIn(0, 1)) === 0);

  /* ── A real finger sweep, not a mouse ──
     The owner, 17 October 2026: "Die brush werk nie met 'n vee nie. Dit is
     basically 'n touch." The phone took a sweep for a scroll and cancelled
     it, which a mouse never does — so this sweeps with a touch. */
  const cdp = await page.context().newCDPSession(page);
  const ty = box.y + box.height * 0.7;
  const touch = (type, x) => cdp.send('Input.dispatchTouchEvent', {
    type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: ty, id: 1 }],
  });
  await touch('touchStart', box.x + box.width * 0.15);
  for (let i = 1; i <= 14; i += 1) {
    await touch('touchMove', box.x + box.width * (0.15 + i * 0.05));
    await page.waitForTimeout(16);
  }
  await touch('touchEnd');
  await page.waitForTimeout(400);
  const swept = await neonIn(0.66, 0.74);
  check('a finger SWEEP paints a line, not a dab', swept > 3000, `${swept} neon pixels along the sweep`);
  await page.locator('[data-postmagicclear]').click();
  await page.waitForTimeout(300);

  /* ── The brush switch ── */
  const brush = page.locator('[data-postmagicbrush]');
  check('there is a Brush button, on to begin with', (await brush.getAttribute('aria-pressed')) === 'true');
  await brush.click();
  await page.waitForTimeout(200);
  await page.mouse.move(box.x + box.width * 0.2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  check('  and with it off, a drag paints nothing', (await neonIn(0, 1)) === 0);
  await brush.click();
  check('  and nothing painted, the bench says the AI changes the whole photo',
    /whole photo|hele foto/i.test(await says.innerText()), await says.innerText());

  /* ── Select: Adjust changes only what was painted ── */
  const at = (fy) => page.evaluate((y) => {
    const el = document.querySelector('[data-postcanvas]');
    const d = el.getContext('2d').getImageData(Math.round(el.width * 0.45), Math.round(el.height * y), 1, 1).data;
    return d[0] + d[1] + d[2];
  }, fy);
  /* Clear of the undo buttons in the top corner, and above the red disc. */
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.22);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.22, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  await tool('tone');
  await page.locator('[data-postselectpart="painted"]').click();
  await page.waitForTimeout(300);

  check('Adjust can be told to change only what was painted',
    (await page.locator('[data-postselect="painted"]').count()) === 1);
  const inBefore = await at(0.22);
  const outBefore = await at(0.88);
  /* Brightness right up — a flat grey has nothing for Lift it to lift. */
  await page.evaluate(() => {
    const el = document.querySelector('[data-postlookslider="bright"]');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(el, el.max);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(500);
  const inAfter = await at(0.22);
  const outAfter = await at(0.88);
  check('  and brightening changes the painted part', Math.abs(inAfter - inBefore) > 12, `${inBefore} → ${inAfter}`);
  check('  and leaves the rest of the photo as it was', Math.abs(outAfter - outBefore) <= 3, `${outBefore} → ${outAfter}`);
  await page.locator('[data-postselectpart="all"]').click();
  await page.waitForTimeout(300);
  const outAll = await at(0.88);
  check('  and back on the whole photo, the rest changes too', Math.abs(outAll - outBefore) > 12, `${outBefore} → ${outAll}`);
  await page.locator('[data-postplain]').first().click().catch(() => undefined);
  await tool('magic');
  await page.locator('[data-postmagicclear]').click();
  await page.waitForTimeout(200);

  /* ── Style match: drawn samples, in groups ── */
  const tiles = async () => page.evaluate(() => [...document.querySelectorAll('[data-poststyle] canvas')].map((el) => {
    const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += d[i] * 3 + d[i + 1] * 5 + d[i + 2] * 7;
    return sum;
  }));
  const digital = await tiles();
  check('Style match offers drawn samples', digital.length >= 5 && digital.every((one) => one > 0), JSON.stringify(digital.length));
  check('  and every sample looks different', new Set(digital).size === digital.length);
  await page.locator('[data-poststylegroup="craft"]').click();
  await page.waitForTimeout(300);
  const physical = await tiles();
  check('  and another group shows other styles', physical.length >= 5 && physical[0] !== digital[0]);
  await page.locator('[data-poststylegroup="featured"]').click();
  await page.locator('[data-poststyle]').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: shot('magicstyles.png') });

  /* ── A press is seen ── */
  const glowed = await page.evaluate(() => new Promise((done) => {
    const el = document.querySelector('[data-postmagicbrush]');
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    requestAnimationFrame(() => done(el.classList.contains('fb-tap')));
  }));
  check('a pressed button glows after the finger lifts', glowed === true);

  /* ── Make it transparent works on the photograph, under a glow ── */
  await tool('pic');
  await page.locator('[data-postclear]').first().click();
  await page.waitForTimeout(600);
  check('Make it transparent glows over the photo while it works',
    (await page.locator('[data-postworking="long"]').count()) === 1);
  let landed = false;
  for (let i = 0; i < 40 && !landed; i += 1) {
    await page.waitForTimeout(500);
    landed = (await page.locator('[data-postclear]').first().getAttribute('aria-pressed')) === 'true';
  }
  check('  and then it is transparent', landed);
  check('  and the glow has stopped', (await page.locator('[data-postworking="long"]').count()) === 0);

  /* ── The pixel eraser: Restore paints the cut background back, Erase wipes ── */
  const glass = (fx, fy) => page.evaluate(([x, y]) => {
    const el = document.querySelector('[data-postcanvas]');
    const d = el.getContext('2d').getImageData(Math.round(el.width * x), Math.round(el.height * y), 1, 1).data;
    return [d[0], d[1], d[2]];
  }, [fx, fy]);
  const checker = (c) => (c[0] === 0xe7 && c[2] === 0xea) || (c[0] === 0xc8 && c[2] === 0xce);
  check('the cut-out shows nothing behind at the side', checker(await glass(0.15, 0.5)), JSON.stringify(await glass(0.15, 0.5)));
  await page.locator('[data-postpixelstart]').click();
  await page.waitForTimeout(300);
  check('the pixel eraser has Erase and Restore', (await page.locator('[data-postpixelmode]').count()) === 2);
  /* Measured fresh for every sweep, after the pad is scrolled into view:
     the pad sits in a docked panel now (23 October 2026) and pressing a
     mode button can scroll its column, so a box taken once before the
     presses pointed at where the pad used to be. */
  const sweep = async (fy, from, to) => {
    const canvas = page.locator('[data-postpixelcanvas]');
    await canvas.scrollIntoViewIfNeeded();
    const pad = await canvas.boundingBox();
    await page.mouse.move(pad.x + pad.width * from, pad.y + pad.height * fy);
    await page.mouse.down();
    await page.mouse.move(pad.x + pad.width * to, pad.y + pad.height * fy, { steps: 8 });
    await page.mouse.up();
  };
  await page.locator('[data-postpixelmode="restore"]').click();
  await sweep(0.5, 0.05, 0.25);
  await page.locator('[data-postpixelmode="erase"]').click();
  await sweep(0.5, 0.45, 0.55);
  await page.locator('[data-postpixeldone]').click();
  await page.waitForTimeout(800);
  const restored = await glass(0.15, 0.5);
  const erased = await glass(0.5, 0.5);
  check('  and Restore paints back what the cut took', Math.abs(restored[0] - 0x7a) < 12 && Math.abs(restored[1] - 0x7a) < 12, JSON.stringify(restored));
  check('  and Erase wipes what it went over', checker(erased), JSON.stringify(erased));
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:magicbrush — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:magicbrush — the magic touch is a brush a finger can sweep, Adjust works with no photograph, a press glows, and see-through looks see-through.');
