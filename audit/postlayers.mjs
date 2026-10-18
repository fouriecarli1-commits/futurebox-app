/**
 * The photo editor's layers, used the way she asked for them.
 *
 * The owner, 16 October 2026: *"Die photo editor sal moet layers kry. As mens op
 * die layers click moet mens kan kies op watter layer jy nou edit, en
 * natuurlik 'n all layer wat alles by mekaar het."*
 *
 * Read off the canvas, as `postwalk.mjs` does: a layer list whose rows press
 * and whose state changes, over a picture that does not, passes every test
 * written about the DOM. So every assertion here is a pixel count — the
 * shape is cyan, the words are white, the photograph is dark red, and the
 * three cannot be mistaken for one another.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';

const server = await serve(process.argv[2] || '3327');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};

const { browser, page } = await enter({ width: 390, height: 844, touch: true, at: server.url });

/** Open a tool on the bar, or shut it when it is the one open. */
const tool = async (which) => {
  await page.locator(`[data-cutbench="${which}"]`).first().click();
  await page.waitForTimeout(450);
};
const shutTools = async () => {
  const open = page.locator('[data-cutbench][aria-pressed="true"]').first();
  if (await open.count()) { await open.click(); await page.waitForTimeout(400); }
};

/** Cyan (the shape), white (the words), and where the cyan is. */
const read = () => page.evaluate(() => {
  const el = document.querySelector('[data-postcanvas]');
  if (!(el instanceof HTMLCanvasElement)) return null;
  const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
  let cyan = 0; let white = 0; let sx = 0; let sy = 0; let cyanG = 0;
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
    if (r < 140 && g > 150 && b > 150) {
      cyan += 1; cyanG += g;
      const p = i / 4;
      sx += p % el.width; sy += Math.floor(p / el.width);
    }
    if (r > 215 && g > 215 && b > 215) white += 1;
  }
  return {
    cyan, white,
    cx: cyan ? sx / cyan / el.width : 0,
    cy: cyan ? sy / cyan / el.height : 0,
    shade: cyan ? cyanG / cyan : 0,
  };
});

/** Drag on the glass from one share of the picture to another. */
const dragOnGlass = async (from, to) => {
  const box = await page.locator('[data-postcanvas]').boundingBox();
  const at = (p) => ({ x: box.x + p.x * box.width, y: box.y + p.y * box.height });
  const a = at(from); const b = at(to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let n = 1; n <= 8; n += 1) await page.mouse.move(a.x + ((b.x - a.x) * n) / 8, a.y + ((b.y - a.y) * n) / 8);
  await page.mouse.up();
  await page.waitForTimeout(400);
};

const rows = () => page.locator('[data-postlayers] [data-postlayer]').evaluateAll((all) => all.map((el) => el.getAttribute('data-postlayer')));

try {
  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(800);

  /* A dark red photograph, made in the page. */
  await tool('pic');
  const brought = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 400; c.height = 400;
    const x = c.getContext('2d');
    x.fillStyle = '#7a0000';
    x.fillRect(0, 0, 400, 400);
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
  await page.waitForTimeout(1200);

  /* Words, then a shape on top of them. */
  await tool('text');
  await page.locator('[data-addwords]').first().click();
  await page.waitForTimeout(300);
  await page.locator('textarea').first().fill('LAAG');
  await page.waitForTimeout(300);
  /* At the top, clear of the shape in the middle, so the white of the words
     and the cyan of the shape are never the same pixels. */
  await page.locator('[data-postspot="top"]').first().click();
  await page.waitForTimeout(400);
  await tool('shapes');
  await page.locator('[data-postaddmark="box"]').first().click();
  await page.waitForTimeout(500);
  await shutTools();
  const start = await read();
  check('the shape and the words are both drawn', start && start.cyan > 300 && start.white > 30, JSON.stringify(start));

  /* ── The list ─────────────────────────────────────────────────────────── */
  check('the bar has a Layers tool', (await page.locator('[data-cutbench="layers"]').count()) > 0);
  await tool('layers');
  let order = await rows();
  check('the list is All, then every layer front to back, then the photo and the background',
    order.length === 5 && order[0] === 'all' && order[3] === 'photo' && order[4] === 'back', order.join(' | '));
  const [shapeId, wordsId] = [order[1], order[2]];
  const frontName = await page.locator(`[data-postlayer="${shapeId}"]`).innerText();
  const nextName = await page.locator(`[data-postlayer="${wordsId}"]`).innerText();
  check('  the newest layer — the shape — is in front, the words behind it',
    /Box|Blokkie/.test(frontName) && /LAAG/.test(nextName), `${frontName} / ${nextName}`);

  /* ── Hide and show ────────────────────────────────────────────────────── */
  await page.locator(`[data-postlayereye="${shapeId}"]`).click();
  await page.waitForTimeout(400);
  const hidden = await read();
  check('hiding the shape takes it off the picture', hidden.cyan < start.cyan * 0.05, `${start.cyan} → ${hidden.cyan}`);
  check('  and leaves the words', hidden.white > start.white * 0.8, `${start.white} → ${hidden.white}`);
  await page.locator(`[data-postlayereye="${shapeId}"]`).click();
  await page.waitForTimeout(400);
  check('  and showing it brings it back', (await read()).cyan > start.cyan * 0.9);

  /* ── Order ────────────────────────────────────────────────────────────── */
  await page.locator(`[data-postlayerdown="${shapeId}"]`).click();
  await page.waitForTimeout(400);
  order = await rows();
  check('moving the shape back puts the words in front of it', order[1] === wordsId && order[2] === shapeId, order.join(' | '));
  await page.locator(`[data-postlayerup="${shapeId}"]`).click();
  await page.waitForTimeout(400);

  /* ── One layer chosen: only it answers a thumb ────────────────────────── */
  await page.locator(`[data-postlayerpick="${wordsId}"]`).click();
  await page.waitForTimeout(300);
  check('choosing a layer marks it chosen', (await page.locator(`[data-postlayer="${wordsId}"][data-postlayeron="yes"]`).count()) === 1);
  await shutTools();
  check('  and the photo says which layer is being edited', (await page.locator(`[data-postlayerchip="${wordsId}"]`).count()) === 1);
  const before = await read();
  await dragOnGlass({ x: before.cx, y: before.cy }, { x: before.cx, y: Math.min(0.9, before.cy + 0.25) });
  const after = await read();
  check('  so a drag on the shape does not move it while the words are chosen',
    Math.abs(after.cy - before.cy) < 0.02, `${before.cy.toFixed(3)} → ${after.cy.toFixed(3)}`);

  /* ── All: everything together ─────────────────────────────────────────── */
  /* Tapped where it is, as a thumb does. Playwright's own click scrolls the
     element into view first, and the stage it sits in has hidden overflow —
     which still scrolls when asked — so its click lands beside the chip. */
  const chip = await page.locator(`[data-postlayerchip="${wordsId}"]`).boundingBox();
  await page.mouse.click(chip.x + chip.width / 2, chip.y + chip.height / 2);
  await page.waitForTimeout(300);
  check('the chip goes back to All layers', (await page.locator('[data-postlayerchip]').count()) === 0);
  await dragOnGlass({ x: after.cx, y: after.cy }, { x: after.cx, y: Math.min(0.9, after.cy + 0.25) });
  const moved = await read();
  check('  and with All, the same drag moves the shape', moved.cy > after.cy + 0.1, `${after.cy.toFixed(3)} → ${moved.cy.toFixed(3)}`);
  await shutTools();

  /* ── Opacity ──────────────────────────────────────────────────────────── */
  await tool('layers');
  await page.locator(`[data-postlayerpick="${shapeId}"]`).click();
  await page.waitForTimeout(300);
  const solid = await read();
  await page.locator('[data-postlayeralpha] input[type=range]').first().fill('0.2');
  await page.waitForTimeout(400);
  const faint = await read();
  check('a layer’s opacity makes it see-through', faint.cyan < solid.cyan * 0.5,
    `cyan pixels ${solid.cyan} → ${faint.cyan}`);
  /* The layer back to solid, then the shape's own See-through slider in
     Shapes, which had the same fault: one fill per glow pass, each faded,
     stacking back up to nearly solid. */
  await page.locator('[data-postlayeralpha] input[type=range]').first().fill('1');
  await page.waitForTimeout(300);
  await shutTools();
  await tool('shapes');
  const ownSolid = await read();
  await page.locator('[data-postmarkslider="opacity"] input[type=range]').first().fill('0.9');
  await page.waitForTimeout(400);
  const ownFaint = await read();
  check('the shape\u2019s own See-through slider really makes it see-through', ownFaint.cyan < ownSolid.cyan * 0.5,
    `cyan pixels ${ownSolid.cyan} → ${ownFaint.cyan}`);
  await shutTools();
  await tool('layers');

  /* ── How it reads: the photo alone, or all layers ─────────────────────── */
  await page.locator('[data-postlayerpick="all"]').click();
  await page.waitForTimeout(300);
  await shutTools();
  await tool('tone');
  check('Adjust asks whether it is the photo or all layers', (await page.locator('[data-postlookon]').count()) === 2);
  check('  and All layers is the one chosen after choosing All', (await page.locator('[data-postlooktarget="all"]').count()) === 1);
  const lit = await read();
  const dim = async () => {
    const slider = page.locator('[data-postlookslider="bright"]').first();
    await slider.fill(await slider.getAttribute('min'));
  };
  await dim();
  await page.waitForTimeout(500);
  const darkAll = await read();
  check('  with All layers, darker darkens the words too', darkAll.white < lit.white * 0.2, `${lit.white} → ${darkAll.white}`);
  await page.locator('[data-postplain]').click();
  await page.waitForTimeout(300);
  await page.locator('[data-postlookon="photo"]').click();
  await page.waitForTimeout(300);
  await dim();
  await page.waitForTimeout(500);
  const darkPhoto = await read();
  check('  with the photo alone, the words stay as they were', darkPhoto.white > lit.white * 0.8, `${lit.white} → ${darkPhoto.white}`);

  /* ── The photo forward ────────────────────────────────────────────────
     The owner, 17 October 2026: the photo that was there first would not come
     forward. Moved to the front, it covers the words and the shape. */
  await page.locator('[data-postplain]').click().catch(() => undefined);
  await page.waitForTimeout(300);
  await tool('layers');
  const beforeFront = await read();
  await page.locator('[data-postlayerup="photo"]').click();
  await page.waitForTimeout(250);
  await page.locator('[data-postlayerup="photo"]').click();
  await page.waitForTimeout(400);
  order = await rows();
  check('the photo can be moved to the front of the list', order[1] === 'photo', order.join(' | '));
  const inFront = await read();
  check('  and then it covers the words',
    beforeFront.white > 30 && inFront.white < beforeFront.white * 0.2,
    `${JSON.stringify(beforeFront)} → ${JSON.stringify(inFront)}`);
  await page.locator('[data-postlayerdown="photo"]').click();
  await page.waitForTimeout(250);
  await page.locator('[data-postlayerdown="photo"]').click();
  await page.waitForTimeout(400);
  check('  and back again, they show', (await read()).white > beforeFront.white * 0.8);

  await page.screenshot({ path: shot('postlayers.png') });
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 1200)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:postlayers — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:postlayers — the layer list hides, orders and fades each layer on the picture itself,'
  + ' a chosen layer is the only one a thumb moves, and All layers changes everything together.');
