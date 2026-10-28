/**
 * The photo editor on a 360-pixel phone: the bar, the tools, the way out,
 * and the purple eye.
 *
 * The owner, 15 October 2026, four things in two messages:
 *
 *   "Daai take it out button daar regs bo is afgesny."
 *   "Die scrolling bar onder moet 'n bietjie groter. Beweeg die hele ding op
 *    tot in die middel van die prent."
 *   "Take it out se pop out kan oor die hele skerm gaan."
 *   "Die pers ogie moet vir jou opsies gee van tipe posts. Elke platform se
 *    size lyk anders."
 *
 * Measured on the narrowest phone the app is held to, with her own kind of
 * picture in it — a square portrait — because that is where the bar ran out
 * of room: at 360 the green button ended 18 pixels past the edge, and the
 * size button had been squeezed to nothing on every phone.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';

const server = await serve(process.argv[2] || '3321');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};

const { browser, page } = await enter({ width: 360, height: 760, touch: true, at: server.url });
try {
  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(800);
  /* Square chosen first, on purpose. A photo on an empty canvas now gives the
     canvas its own shape (18 October 2026) — this walk measures a wide
     picture on a SQUARE post, so it chooses the square the way she would. */
  await page.locator('[data-cutbench="frame"]').first().click();
  await page.waitForTimeout(400);
  await page.locator('[data-postshape="square"]').first().click();
  await page.waitForTimeout(300);
  await page.locator('[data-cutbench="frame"]').first().click();
  await page.waitForTimeout(300);
  const pic = page.locator('[data-cutbench="pic"]').first();
  await pic.click();
  await page.waitForTimeout(400);
  await page.locator('[data-poststudio] input[type=file]').first().setInputFiles('public/welcome-cover.jpg');
  await page.waitForTimeout(1500);

  /* ── A tool never shrinks the photograph ──────────────────────────────
     The owner, 27 October 2026, with a screenshot of a tool open and the
     photo a stamp above it: *"Die oomblik wanneer mens 'n funksie oop maak
     dan maak dit die prent klein, en die funksie is lewensgroot."* The
     photo keeps its size with a tool out; the tool is a small glass strip
     over the foot of the room, with a handle to tuck it away. */
  const sized = () => page.evaluate(() => {
    const r = document.querySelector('[data-postcanvas]')?.getBoundingClientRect();
    return r ? Math.round(r.width * r.height) : 0;
  });
  await pic.click();
  await page.waitForTimeout(400);
  const shut = await sized();
  await pic.click();
  await page.waitForTimeout(500);
  const open = await sized();
  check('a tool opened leaves the photograph its full size', shut > 0 && open >= shut * 0.98, `${shut} shut, ${open} open`);
  const reach = await page.evaluate(() => {
    const panel = document.querySelector('[data-postunder]')?.getBoundingClientRect();
    const photo = document.querySelector('[data-postcanvas]')?.getBoundingClientRect();
    const bg = panel ? getComputedStyle(document.querySelector('[data-postunder]')).backgroundImage : '';
    return panel && photo ? { tall: panel.height, top: panel.top, photoBottom: photo.bottom, bg } : null;
  });
  check('  and its strip takes no more than a third of the screen', !!reach && reach.tall >= 170 && reach.tall <= 760 * 0.36, JSON.stringify(reach));
  check('  and is see-through glass, clearest at the top where the photo shows through',
    !!reach && /^linear-gradient\(rgba\(10, 12, 16, 0\.[0-3]\d*\)/.test(reach.bg),
    reach?.bg ?? 'no panel');
  await page.locator('[data-posttuck]').click();
  await page.waitForTimeout(400);
  const tucked = await page.evaluate(() => document.querySelector('[data-postunder]')?.getBoundingClientRect().height ?? 0);
  check('  and tucks down to one button, the tool still on', tucked > 0 && tucked <= 48
    && (await page.locator('[data-cutbench="pic"][aria-pressed="true"]').count()) === 1, `${tucked}px`);
  await pic.click();
  await page.waitForTimeout(400);

  /* ── Every button in the bar is on the screen ───────────────────────── */
  const bar = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('[data-postbar] button')) {
      const r = el.getBoundingClientRect();
      out.push({ name: Object.keys(el.dataset)[0] ?? el.textContent, left: r.left, right: r.right, wide: r.width });
    }
    return { out, edge: document.documentElement.clientWidth };
  });
  const off = bar.out.filter((one) => one.right > bar.edge || one.left < 0);
  check('every button in the top bar is on a 360-pixel screen', off.length === 0,
    off.map((one) => `${one.name} ends at ${Math.round(one.right)}`).join(', '));
  const sizeButton = bar.out.find((one) => one.name === 'postcustomsize');
  check('  and the size button has room to say the shape', (sizeButton?.wide ?? 0) >= 40,
    `${Math.round(sizeButton?.wide ?? 0)} pixels wide`);
  check('  undo and redo ride on the photograph instead',
    (await page.locator('[data-postundorow] [data-postundo]').count()) === 1);

  /* ── Take it out covers the whole space between the bars ────────────── */
  await page.locator('[data-postexportopen]').click();
  await page.waitForTimeout(600);
  const cover = await page.evaluate(() => {
    const sheet = document.querySelector('[data-postsavefull]')?.getBoundingClientRect();
    const bar = document.querySelector('[data-postbar]')?.getBoundingClientRect();
    const room = document.querySelector('[data-postsavefull]')?.parentElement?.getBoundingClientRect();
    return sheet && bar && room ? { gapTop: sheet.top - bar.bottom, gapFoot: room.bottom - sheet.bottom, wide: sheet.width, roomWide: room.width } : null;
  });
  check('Take it out opens over the whole screen under the bar, the side tools too',
    cover !== null && Math.abs(cover.gapTop) <= 2 && Math.abs(cover.gapFoot) <= 2 && cover.wide >= cover.roomWide - 2,
    JSON.stringify(cover));
  check('  with its price on it', (await page.locator('[data-postsavefull] [data-postexport]').count()) > 0);
  await page.locator('[data-postexportopen]').click();
  await page.waitForTimeout(400);
  check('  and the green button shuts it again', (await page.locator('[data-postsavefull]').count()) === 0);

  /* ── Grab, on a picture with words low down ─────────────────────────
     The owner, 15 October 2026: "Die grab funksie werk ook nie." Two faults on a
     phone, both of them the tool panel: what Grab said was printed at the
     foot of the photograph, behind the panel, so a press looked like
     nothing; and while picking, the panel lay over the lower half of the
     photograph, so a line down there could not be tapped. The sign is
     drawn here so the words sit where the panel used to be. */
  const sign = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 1080; c.height = 1080;
    const g = c.getContext('2d');
    g.fillStyle = '#2a3b55'; g.fillRect(0, 0, 1080, 1080);
    g.fillStyle = '#ffffff'; g.fillRect(80, 120, 920, 200); g.fillRect(80, 740, 920, 200);
    g.fillStyle = '#111111'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 120px Arial, sans-serif';
    g.fillText('SUMMER SALE', 540, 220);
    g.fillText('MARKET DAY', 540, 840);
    return c.toDataURL('image/png').split(',')[1];
  });
  await pic.click();
  await page.waitForTimeout(400);
  await page.locator('[data-poststudio] input[type=file]').first().setInputFiles({
    name: 'sign.png', mimeType: 'image/png', buffer: Buffer.from(sign, 'base64'),
  });
  await page.waitForTimeout(1500);
  await page.locator('[data-cutbench="read"]').first().click();
  await page.waitForTimeout(600);
  await page.locator('[data-postthingsgo]').click();
  const saidBox = page.locator('[data-postsaid]');
  await saidBox.waitFor({ timeout: 15000 }).catch(() => undefined);
  const seen = await saidBox.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { text: el.textContent ?? '', onTop: Boolean(top && el.contains(top)) };
  }).catch(() => null);
  check('Grab says what happened where it can be read, not behind the tool',
    seen !== null && seen.text.length > 0 && seen.onTop, JSON.stringify(seen));

  await page.locator('[data-postfindwords]').click();
  await page.locator('[data-postlinebar]').waitFor({ timeout: 90000 });
  await page.waitForTimeout(1500);
  const frame = await page.locator('[data-postcanvas]').boundingBox();
  const low = { x: frame.x + frame.width / 2, y: frame.y + frame.height * (840 / 1080) };
  const under = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.hasAttribute('data-postcanvas') ?? false, low);
  check('  while picking, a line in the lower half of the photograph is not under the panel', under);
  await page.touchscreen.tap(low.x, low.y);
  await page.waitForTimeout(600);
  const took = (await page.locator('[data-postlinesaid]').innerText().catch(() => '')).trim();
  check('  and tapping it picks that line', /MARKET|DAY/i.test(took), took || 'nothing picked');
  await page.locator('[data-postlinedone]').click();
  await page.waitForTimeout(400);
  /* Done closes everything — the owner, 16 October 2026: the panels that popped
     up "wil ook nie weg gaan nie". */
  check('  and Done puts every panel away, the photograph clear again',
    (await page.locator('[data-postlinebar], [data-postbenchpanel]').count()) === 0);

  /* ── The purple eye: a place, a kind of post, its own shape ─────────── */
  await page.locator('[data-postsocial]').click();
  await page.waitForTimeout(700);
  const places = await page.locator('[data-postsocialplace]').count();
  check('the eye offers the places a post goes', places >= 6, `${places}`);
  const shapeNow = async () => page.evaluate(() => {
    const frame = document.querySelector('[data-postsocialframe]')?.getBoundingClientRect();
    const picture = document.querySelector('[data-postsocialpicture]');
    return {
      frame: frame ? frame.width / frame.height : 0,
      drawn: picture ? picture.width / picture.height : 0,
      fit: document.querySelector('[data-postsocialfit]')?.getAttribute('data-postsocialfit'),
    };
  });
  const square = await shapeNow();
  check('  and opens on the kind nearest the post, which a square post fits',
    square.fit === 'none' && Math.abs(square.frame - 1) < 0.02, JSON.stringify(square));
  await page.locator('[data-postsocialplace="tiktok"]').click();
  await page.waitForTimeout(500);
  const tall = await shapeNow();
  check('  TikTok is drawn upright, 9 by 16, and says the sides are cut off',
    Math.abs(tall.frame - 9 / 16) < 0.02 && Math.abs(tall.drawn - 9 / 16) < 0.02 && tall.fit === 'leftRight',
    JSON.stringify(tall));
  await page.locator('[data-postsocialplace="youtube"]').click();
  await page.waitForTimeout(500);
  const kinds = await page.locator('[data-postsocialkind]').count();
  const wide = await shapeNow();
  check('  YouTube has more than one kind, and its thumbnail is 16 by 9',
    kinds >= 2 && Math.abs(wide.frame - 16 / 9) < 0.03 && wide.fit === 'topBottom', `${kinds} kinds, ${JSON.stringify(wide)}`);
  await page.locator('[data-postsocialuse]').click();
  await page.waitForTimeout(900);
  const made = await shapeNow();
  const canvas = await page.evaluate(() => {
    const el = document.querySelector('[data-postcanvas]');
    return el ? `${el.width}x${el.height}` : null;
  });
  check('  and one press makes the post that shape', made.fit === 'none' && /^\d+x\d+$/.test(canvas ?? '')
    && Math.abs(Number(canvas.split('x')[0]) / Number(canvas.split('x')[1]) - 16 / 9) < 0.02,
  `${canvas}, ${JSON.stringify(made)}`);
  await page.screenshot({ path: shot('postround.png') });
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 200)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:postround — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:postround — on a 360-pixel phone the bar fits, the tools reach the middle of the photo,'
  + ' Take it out has the screen, the eye shows each place in its own shape, and Grab can be seen and tapped.');
