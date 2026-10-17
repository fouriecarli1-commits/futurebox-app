/**
 * The vector studio, walked on a phone.
 *
 * Carli, 17 October 2026: *"Ek hou van daai vector illustration."* Read off
 * the glass: it opens from beside Bring a picture in; a rectangle is drawn by
 * dragging, a line by a finger, words by a tap; a shape is chosen, moved and
 * the move undone; the AI's drawing — answered here, so nothing is spent, and
 * with a script hidden in it — lands without the script; a photograph is
 * traced into shapes; and Into the post makes it a layer on the post
 * that opens in the studio again.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3356');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const AI_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><script>window.__pwned = 1</script>'
  + '<circle cx="256" cy="256" r="200" fill="#ff7700" onclick="window.__pwned = 2"/><rect x="200" y="200" width="112" height="112" fill="#1d4ed8"/></svg>';
const { browser, page } = await enter({
  width: 390, height: 844, touch: true, at: server.url,
  before: async (p) => {
    await p.route('**/api/vector/draw', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ svg: AI_SVG }) }));
  },
});
page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 200)}`));

/** A drag on the artboard, in shares of it. */
const onBoard = async (u1, v1, u2 = u1, v2 = v1) => {
  /* The artboard brought into sight first, the way a thumb scrolls back up to it. */
  await page.evaluate(() => document.querySelector('[data-vboard]')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(100);
  const box = await page.locator('[data-vboard]').boundingBox();
  await page.mouse.move(box.x + box.width * u1, box.y + box.height * v1);
  await page.mouse.down();
  for (let k = 1; k <= 8; k += 1) await page.mouse.move(box.x + box.width * (u1 + (u2 - u1) * (k / 8)), box.y + box.height * (v1 + (v2 - v1) * (k / 8)) + (k % 2 ? 0.6 : -0.6));
  await page.mouse.up();
  await page.waitForTimeout(250);
};
const count = (kind) => page.locator(`[data-vboard] [data-vitem="${kind}"]`).count();

try {
  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(900);
  await page.locator('[data-cutbench="pic"]').first().click();
  await page.waitForTimeout(400);
  await page.locator('[data-postvector]').click();
  await page.waitForTimeout(800);
  check('the vector studio opens from beside Bring a picture in', (await page.locator('[data-vectorstudio]').count()) === 1);

  await page.locator('[data-vtool="rect"]').click();
  await onBoard(0.2, 0.2, 0.5, 0.45);
  check('a rectangle is drawn by dragging', (await count('rect')) === 1);
  await page.locator('[data-vtool="pencil"]').click();
  await onBoard(0.1, 0.8, 0.9, 0.7);
  check('a line is drawn with a finger, smoothed into a curve', (await count('path')) === 1
    && /C/.test(await page.locator('[data-vboard] [data-vitem="path"] path').getAttribute('d')));
  await page.locator('[data-vtool="text"]').click();
  await onBoard(0.5, 0.6);
  check('a tap puts words down', (await count('text')) === 1);
  await page.locator('[data-vtext]').fill('Hallo FutureBox');
  await page.locator('[data-vtext]').blur();
  check('  and the words can be changed', /Hallo FutureBox/.test(await page.locator('[data-vboard] [data-vitem="text"]').textContent()));

  /* Choose the rectangle, move it, and take the move back. */
  await page.locator('[data-vtool="select"]').click();
  const before = await page.locator('[data-vboard] [data-vitem="rect"] g').first().getAttribute('transform');
  await onBoard(0.35, 0.32, 0.6, 0.5);
  const after = await page.locator('[data-vboard] [data-vitem="rect"] g').first().getAttribute('transform');
  check('a shape is chosen and dragged to a new place', before !== after && (await page.locator('[data-vframe]').count()) === 1, `${before} → ${after}`);
  await page.locator('[data-vundo]').click();
  await page.waitForTimeout(200);
  check('  and Undo puts it back', (await page.locator('[data-vboard] [data-vitem="rect"] g').first().getAttribute('transform')) === before);
  await page.locator('[data-vpanel] [data-vswatch="#ef4444"]').first().click();
  check('  and a colour from the swatches fills it', (await page.locator('[data-vboard] [data-vitem="rect"] path').getAttribute('fill')) === '#ef4444');

  /* Tap empty space to let go, then the AI. */
  await onBoard(0.95, 0.05);
  const go = page.locator('[data-vaigo]');
  check('the AI button says its price and waits for words', /credit|kredi/i.test(await go.innerText()) && await go.isDisabled());
  await page.locator('[data-vaiwords]').fill('a sun over a blue box');
  await go.click();
  await page.waitForTimeout(800);
  check('the AI\'s drawing lands on the artboard', (await count('art')) === 1);
  check('  without the script that was hidden in it', (await page.locator('[data-vboard] script').count()) === 0
    && !(await page.evaluate(() => document.querySelector('[data-vboard]').innerHTML.includes('onclick')))
    && (await page.evaluate(() => window.__pwned)) === undefined);
  await page.locator('[data-vbreak]').click();
  await page.waitForTimeout(200);
  check('  and breaks apart into its own pieces', (await count('art')) === 2);

  /* A photograph, traced. */
  await onBoard(0.95, 0.05);
  const png = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 120; c.height = 90;
    const x = c.getContext('2d');
    x.fillStyle = '#fafafa'; x.fillRect(0, 0, 120, 90);
    x.fillStyle = '#dc2626'; x.beginPath(); x.arc(60, 45, 30, 0, Math.PI * 2); x.fill();
    const blob = await new Promise((done) => c.toBlob(done, 'image/png'));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  await page.locator('[data-vtracefile]').setInputFiles({ name: 'dot.png', mimeType: 'image/png', buffer: Buffer.from(png) });
  await page.waitForTimeout(2500);
  check('a photograph is traced into shapes', (await count('art')) === 3
    && (await page.locator('[data-vboard] [data-vitem="art"]').last().locator('path').count()) >= 2);
  /* Each traced outline is a real shape, not collapsed to a point. */
  const tracedD = await page.locator('[data-vboard] [data-vitem="art"]').last().locator('path').evaluateAll((all) => all.map((p) => (p.getAttribute('d') ?? '').split('C').length - 1));
  check('  each a real outline, not a dot', tracedD.every((n) => n >= 4), tracedD.join());

  await page.locator('[data-vdone]').click();
  await page.waitForTimeout(1500);
  check('Into the post closes the studio', (await page.locator('[data-vectorstudio]').count()) === 0);
  const painted = await page.evaluate(() => {
    const el = document.querySelector('[data-postcanvas]');
    const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 16) if (d[i] > 200 && d[i + 1] < 90 && d[i + 2] < 90) n += 1;
    return n;
  });
  check('  and the art is on the post', painted > 50, String(painted));
  check('  as a layer that opens in the studio again', (await page.locator('[data-postvectoredit]').count()) === 1);
  await page.locator('[data-postvectoredit]').click();
  await page.waitForTimeout(800);
  check('  with everything that was drawn still there to change', (await count('rect')) === 1 && (await count('text')) === 1);
  await page.locator('[data-vclose]').click();
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:vectorstudio — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:vectorstudio — drawn by hand, by the AI and from a photo, let in clean, and on the post as a layer that opens again.');
