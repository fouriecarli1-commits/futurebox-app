/**
 * Smart crop in the photo editor, in a browser.
 *
 *   npm run check:smartcropwalk
 *
 * The owner, 18 October 2026: *"'n dimensions blokke vir smart cropping."*
 * A wide photograph with its subject far to the right is brought into the
 * photo editor; the frame bench must offer every shape as a block over it,
 * and pressing Square must make the post square with the subject in it —
 * which on this photo means the right-hand end, not the middle.
 * `check:smartcrop` holds the arithmetic; this holds that the room uses it.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';

const server = await serve(process.argv[2] || '3371');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};

const { browser, page } = await enter({ width: 390, height: 844, touch: true, at: server.url });
try {
  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(900);
  await page.locator('[data-cutbench="pic"]').first().click();
  await page.waitForTimeout(400);
  /* 1600 × 900, grey, with a busy red-and-green figure at the far right. */
  const brought = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 1600;
    c.height = 900;
    const x = c.getContext('2d');
    x.fillStyle = '#7a7a7a';
    x.fillRect(0, 0, 1600, 900);
    for (let row = 0; row < 30; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        x.fillStyle = (row + col) % 2 ? '#e0301e' : '#1ee070';
        x.fillRect(1300 + col * 30, 100 + row * 24, 30, 24);
      }
    }
    const blob = await new Promise((done) => c.toBlob(done, 'image/png'));
    const input = document.querySelector('[data-poststudio] input[type=file]') ?? document.querySelector('input[type=file]');
    if (!input || !blob) return false;
    const holder = new DataTransfer();
    holder.items.add(new File([blob], 'wide.png', { type: 'image/png' }));
    input.files = holder.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
  check('a wide photograph is brought in', brought === true);
  await page.waitForTimeout(1500);
  const shape = await page.evaluate(() => {
    const one = document.querySelector('[data-postcanvas]');
    return one ? one.width / one.height : 0;
  });
  check('  and on an empty canvas the canvas takes its shape, nothing cut off', Math.abs(shape - 16 / 9) < 0.02, `${shape.toFixed(3)}:1`);

  await page.locator('[data-cutbench="pic"]').first().click();
  await page.waitForTimeout(300);
  await page.locator('[data-cutbench="frame"]').first().click();
  await page.waitForTimeout(600);
  /* The crop box comes first now; the frame's own tools are one press on. */
  check('the crop tool opens with the box round the photo', (await page.locator('[data-postcropbar]:visible').count()) > 0);
  await page.screenshot({ path: shot('cropbox.png') });
  await page.locator('[data-postcropframing]').first().click();
  await page.waitForTimeout(500);
  const blocks = await page.locator('[data-postsmartcrop]').count();
  check('the frame offers every shape as a block over the photo', blocks === 4, `${blocks} blocks`);
  await page.screenshot({ path: shot('smartcrop.png') });

  await page.locator('[data-postsmartcrop="square"]').first().click();
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => {
    const one = document.querySelector('[data-postcanvas]');
    if (!one) return null;
    const ctx = one.getContext('2d');
    const d = ctx.getImageData(0, 0, one.width, one.height).data;
    let busy = 0;
    for (let i = 0; i < d.length; i += 16) if (Math.abs(d[i] - d[i + 1]) > 80) busy += 1;
    return { shape: one.width / one.height, busy };
  });
  check('  and Square makes the post square', after !== null && Math.abs(after.shape - 1) < 0.02, JSON.stringify(after));
  check('  with the figure at the far right in it, not cut off by a centred crop',
    after !== null && after.busy > 500, JSON.stringify(after));
  check('  and the block says it is the one in use',
    (await page.locator('[data-postsmartcrop="square"]').first().getAttribute('aria-pressed')) === 'true');

  /* ── The whole picture, loose, with a ring to pull ───────────────────
     The owner, 25 October 2026: *"'n raam om die hele prent te kan trek, en
     die hele prent manually te shrink na 'n size wat mens verkies."* A wide
     photo in a square frame sits in the middle with background above and
     below; its top-left corner is a known place. Pulled toward the middle,
     the picture gets smaller — the zoom reads below one — and it stays in
     the middle. */
  await page.locator('[data-postbasis="whole"]').first().click();
  await page.waitForTimeout(500);
  const zoomWas = (await page.locator('[data-postzoomnow]').first().innerText().catch(() => '')) || '';
  const canvasBox = await page.locator('[data-postcanvas]').first().boundingBox();
  check('the whole picture starts at one', /1\.00/.test(zoomWas) && canvasBox !== null, zoomWas);
  if (canvasBox) {
    /* A 16:9 photo contained in a 1:1 frame: full width, 9/16 of the height,
       so its top edge is (1 − 9/16) / 2 of the frame down. */
    const cornerX = canvasBox.x + 2;
    const cornerY = canvasBox.y + canvasBox.height * ((1 - 9 / 16) / 2) + 2;
    const midX = canvasBox.x + canvasBox.width / 2;
    const midY = canvasBox.y + canvasBox.height / 2;
    await page.mouse.move(cornerX, cornerY);
    await page.mouse.down();
    for (let step = 1; step <= 8; step += 1) {
      await page.mouse.move(cornerX + (midX - cornerX) * 0.3 * (step / 8), cornerY + (midY - cornerY) * 0.3 * (step / 8));
      await page.waitForTimeout(30);
    }
    await page.mouse.up();
    await page.waitForTimeout(400);
    const zoomNow = (await page.locator('[data-postzoomnow]').first().innerText().catch(() => '')) || '';
    const read = Number((zoomNow.match(/([\d.]+)x/) ?? [])[1]);
    check('  and pulling its corner toward the middle makes it smaller',
      Number.isFinite(read) && read < 0.95 && read > 0.4, `the zoom reads "${zoomNow}" after the pull`);
    const seen = await page.evaluate(() => {
      const one = document.querySelector('[data-postcanvas]');
      if (!one) return null;
      const ctx = one.getContext('2d');
      const d = ctx.getImageData(0, 0, one.width, one.height).data;
      /* The photo is grey with a coloured figure; the frame's background is
         not grey. Where the grey starts and stops across the middle row says
         where the picture sits. */
      const y = Math.floor(one.height / 2);
      let first = -1; let last = -1;
      for (let x = 0; x < one.width; x += 1) {
        const i = (y * one.width + x) * 4;
        const grey = Math.abs(d[i] - 0x7a) < 12 && Math.abs(d[i + 1] - 0x7a) < 12 && Math.abs(d[i + 2] - 0x7a) < 12;
        const figure = Math.abs(d[i] - d[i + 1]) > 80;
        if (grey || figure) { if (first < 0) first = x; last = x; }
      }
      return { first, last, width: one.width };
    });
    check('  about its middle, not toward the corner that was pulled',
      seen !== null && seen.first > 0 && Math.abs(seen.first - (seen.width - 1 - seen.last)) <= Math.max(6, seen.width * 0.03),
      JSON.stringify(seen));
  }
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 300)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:smartcropwalk — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:smartcropwalk — a wide photo keeps its shape on an empty canvas, and Square is cut around the part worth keeping.');
