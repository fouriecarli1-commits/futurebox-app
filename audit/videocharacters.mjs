/**
 * 3D characters and AI restyle, on the video editor, walked the way she would.
 *
 * ── Why a browser and not a source rule ──────────────────────────────────
 *
 * The owner, 22 October 2026 (translated): *"Can we put a studio like that in
 * the video editor, so animated characters can be made in the video studio
 * and eventually used in the video? I also think scenes could be prompted to
 * undergo an AI change, to get the whole futuristic effect into videos."*
 *
 * Both features are a chain of presses, and a chain can be whole in the
 * source and broken in the room: a picture drawn and never reaching the shot
 * bench, a clip made and landing at the end of the film instead of beside the
 * shot it restyles. So this presses every link with the engines stubbed, and
 * reads what each request CARRIED — the words, the pictures, the ratio, the
 * length and the grade — rather than only that a request went.
 *
 * Then the same two benches at 1440, at 1280 and on a 390-pixel phone held in
 * a hand: every control a thumb tall, the look tiles real pictures, and
 * nothing pushing the page sideways.
 *
 * Set SHOTS=<folder> to have it save a screenshot of each bench there.
 */
import { readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join } from 'node:path';
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const PORT = process.argv[2] || '3324';
const SHOTS = process.env.SHOTS || '';

/* Prices read out of `credits.ts` rather than typed here: a probe holding its
   own copy of a price goes green on a release that quietly changed it. */
const creditsSource = readFileSync('app/lib/credits.ts', 'utf8');
const REPAINT = Number(/\n\s*repaint:\s*(\d+)/.exec(creditsSource)?.[1] ?? NaN);
const VIDEO = Number(/\n\s*video:\s*(\d+)/.exec(creditsSource)?.[1] ?? NaN);
const BETTER = Number(/better:\s*(\d+)/.exec(creditsSource)?.[1] ?? NaN);

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};

/* ── A picture, made here, for the stubbed engine to hand back ─────────── */
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
};
function png(w, h, paint) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y += 1) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x += 1) {
      const [r, g, b] = paint(x, y);
      const at = y * (w * 3 + 1) + 1 + x * 3;
      raw[at] = r; raw[at + 1] = g; raw[at + 2] = b;
    }
  }
  const head = Buffer.alloc(13);
  head.writeUInt32BE(w, 0);
  head.writeUInt32BE(h, 4);
  head[8] = 8; head[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', head), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}
/* A grey sheet with a figure-shaped block on it, and a magenta world. */
const SHEET = png(300, 400, (x, y) => (x > 110 && x < 190 && y > 60 && y < 360 ? [37, 99, 235] : [214, 214, 218]));
const WORLD = png(320, 180, (x, y) => [180 + (x % 60), 40, 160 + (y % 80)]);
const FACE = png(200, 200, (x, y) => ((x - 100) ** 2 + (y - 100) ** 2 < 4000 ? [242, 194, 155] : [60, 90, 120]));

const pictures = [];
const videos = [];
let clipBytes = null;

/** The stubs, registered before the app loads anything. */
async function stubs(page) {
  await page.route((url) => url.pathname === '/api/google/picture', async (route) => {
    let body = {};
    try { body = JSON.parse(route.request().postData() || '{}'); } catch { /* recorded as empty */ }
    pictures.push(body);
    await route.fulfill({ status: 200, contentType: 'image/png', body: body.aspect === '3:4' ? SHEET : WORLD });
  });
  await page.route((url) => url.pathname === '/api/video', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      let body = {};
      try { body = JSON.parse(request.postData() || '{}'); } catch { /* recorded as empty */ }
      videos.push(body);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: `probe-job-${videos.length}` }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ state: 'done', url: `${new URL(request.url()).origin}/probe-made-clip.webm` }),
    });
  });
  await page.route((url) => url.pathname === '/probe-made-clip.webm', async (route) => {
    await route.fulfill({ status: 200, contentType: 'video/webm', body: clipBytes ?? Buffer.alloc(0) });
  });
}

/** Two seconds of a moving square, recorded in the page. */
async function record(page) {
  return page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 180;
    const c = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    const type = ['video/webm;codecs=vp8', 'video/webm'].find((one) => MediaRecorder.isTypeSupported(one));
    if (!type) return null;
    const rec = new MediaRecorder(stream, { mimeType: type });
    const parts = [];
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    const stopped = new Promise((r) => { rec.onstop = r; });
    rec.start(250);
    const began = performance.now();
    await new Promise((finish) => {
      const draw = () => {
        const t = (performance.now() - began) / 1000;
        c.fillStyle = '#2b6'; c.fillRect(0, 0, 320, 180);
        c.fillStyle = '#fff'; c.fillRect((t / 2) * 280, 70, 40, 40);
        if (t >= 2) { finish(); return; }
        requestAnimationFrame(draw);
      };
      draw();
    });
    rec.stop();
    await stopped;
    return Array.from(new Uint8Array(await new Blob(parts, { type }).arrayBuffer()));
  });
}

const bench = async (page, which) => {
  const button = page.locator(`[data-cutbench="${which}"]`);
  if ((await button.getAttribute('aria-pressed').catch(() => null)) === 'true') return;
  await button.click({ timeout: 10000 }).catch(() => undefined);
  await page.waitForTimeout(600);
};

/** Things in a bench smaller than a thumb, and whether the page slides sideways. */
async function measure(page, scope) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    const small = [];
    if (root) {
      for (const el of root.querySelectorAll('button, label, input, textarea')) {
        if (el instanceof HTMLInputElement && (el.type === 'file' || el.type === 'checkbox')) continue;
        const box = el.getBoundingClientRect();
        if (box.width === 0 && box.height === 0) continue;
        if (box.height < 43.5 || (el.tagName === 'BUTTON' && box.width < 43.5)) {
          small.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(box.width)}×${Math.round(box.height)}`);
        }
      }
    }
    const view = window.innerWidth;
    const inRoot = root ? [...root.querySelectorAll('*')].filter((el) => {
      const box = el.getBoundingClientRect();
      return box.width > 0 && (box.right > view + 1 || box.left < -1);
    }).length : -1;
    return {
      found: Boolean(root),
      small,
      sideways: document.documentElement.scrollWidth > view + 1 || document.body.scrollWidth > view + 1,
      spill: inRoot,
    };
  }, scope);
}

/** Whether every tile's canvas holds a picture rather than one flat colour. */
async function tilesDrawn(page, attr) {
  return page.evaluate((a) => [...document.querySelectorAll(`[${a}] canvas[data-futuretile]`)].map((canvas) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const seen = new Set();
    for (let i = 0; i < data.length; i += 4 * 37) seen.add(`${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`);
    return seen.size;
  }), attr);
}

const blockNames = (page) => page.locator('[data-editorblock]').evaluateAll(
  (all) => all.map((one) => (one.textContent || '').trim()),
);

const server = await serve(PORT);
let browser = null;
try {
  /* ── At a desk, 1440 × 900: the whole walk ─────────────────────────── */
  const desk = await enter({ at: server.url, lang: 'en', width: 1440, height: 900, before: stubs });
  browser = desk.browser;
  const p = desk.page;
  p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
  await studio(p);
  await toRoom(p, 'Video Editor');
  await p.waitForTimeout(900);

  const made = await record(p);
  if (!made) throw new Error('this browser cannot record webm, so there is no clip to restyle');
  clipBytes = Buffer.from(made);
  await p.locator('[data-editoropenbring] input[type="file"]').setInputFiles([
    { name: 'a-take.webm', mimeType: 'video/webm', buffer: clipBytes },
    { name: 'b-take.webm', mimeType: 'video/webm', buffer: clipBytes },
  ]);
  await p.waitForTimeout(3000);
  check('two clips brought in are two blocks on the clock', (await p.locator('[data-editorblock]').count()) === 2,
    `${await p.locator('[data-editorblock]').count()} blocks`);

  check('the bar carries a 3D characters bench and an AI restyle bench',
    (await p.locator('[data-cutbench="characters"]').count()) === 1 && (await p.locator('[data-cutbench="restyle"]').count()) === 1);

  /* ── 3D characters ─────────────────────────────────────────────── */
  await bench(p, 'characters');
  const charBench = p.locator('[data-charbench]');
  check('the characters bench opens', await charBench.isVisible().catch(() => false));
  const charWhat = (await p.locator('[data-charwhat]').innerText().catch(() => '')) || '';
  check('  and says plainly these are AI-drawn characters the engine animates, not rigged 3D models',
    /AI-drawn 3D-style characters/.test(charWhat) && /not rigged 3D models/.test(charWhat), charWhat.slice(0, 120));
  const looks = await p.locator('[data-charlook]').evaluateAll((all) => all.map((one) => one.getAttribute('data-charlook')));
  check('  and offers at least eight looks, including the ones asked for',
    looks.length >= 8 && ['film3d', 'game', 'clay', 'anime', 'android', 'hologram', 'wireframe'].every((one) => looks.includes(one)),
    JSON.stringify(looks));
  const charTiles = await tilesDrawn(p, 'data-charlook');
  check('  and every look is a picture, not a flat square',
    charTiles.length === looks.length && charTiles.every((n) => n >= 6), JSON.stringify(charTiles));
  const drawLabel = (await p.locator('[data-chardraw]').innerText().catch(() => '')) || '';
  check('  and the draw button says its price, which is the picture route’s own',
    drawLabel.includes(`${REPAINT} credits`), `"${drawLabel}" — expected ${REPAINT} credits`);

  await p.locator('[data-charwords]').fill('a meerkat pilot in a silver flight suit');
  await p.locator('[data-charlook="android"]').click();
  check('  and picking a look lights it',
    (await p.locator('[data-charlook="android"]').getAttribute('aria-pressed')) === 'true');
  await p.locator('[data-charself] input[type="file"]').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: FACE });
  await p.locator('[data-charselfpic]').waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
  check('  and a photo of yourself shows beside the button that takes it out',
    (await p.locator('[data-charselfpic]').count()) === 1 && (await p.locator('[data-charselfoff]').count()) === 1);
  if (SHOTS) await p.screenshot({ path: join(SHOTS, 'characters-1440.png') });

  await p.locator('[data-chardraw]').click();
  await p.locator('[data-charsheet]').waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);
  const drawn = pictures[0] ?? {};
  check('drawing sends the words, the look and a character-sheet sentence to the picture route',
    /meerkat pilot/.test(drawn.words ?? '') && /android/.test(drawn.words ?? '')
      && /character sheet/.test(drawn.words ?? '') && /whole body/.test(drawn.words ?? '') && /plain/.test(drawn.words ?? ''),
    String(drawn.words).slice(0, 200));
  check('  tall, at three by four, because a person standing is tall', drawn.aspect === '3:4', String(drawn.aspect));
  check('  with the photo as the one picture going up, and the sentence that only goes with a photo',
    Array.isArray(drawn.from) && drawn.from.length === 1 && /image\/(jpeg|png)/.test(drawn.from[0]?.mime ?? '')
      && /attached photo/.test(drawn.words ?? ''),
    `${Array.isArray(drawn.from) ? drawn.from.length : 'no'} pictures`);
  check('  and the sheet comes back onto the bench', (await p.locator('[data-charsheet]').count()) === 1);
  const againLabel = (await p.locator('[data-chardraw]').innerText().catch(() => '')) || '';
  check('  with "Again", priced', /again/i.test(againLabel) && againLabel.includes(`${REPAINT} credits`), againLabel);

  await p.locator('[data-charname]').fill('Nova');
  await p.locator('[data-charkeep]').click();
  await p.waitForTimeout(800);
  const keptSaid = (await p.locator('[data-charsaid]').innerText().catch(() => '')) || '';
  check('"Keep in my cast" goes through the cast and says why when it cannot (no accounts in this run)',
    /could not be kept in your cast/.test(keptSaid) && /Sign in/.test(keptSaid), keptSaid);
  if (SHOTS) await p.screenshot({ path: join(SHOTS, 'characters-drawn-1440.png') });

  const sizesChar = await measure(p, '[data-charbench]');
  check('desk 1440 · every control on the characters bench is a thumb tall', sizesChar.small.length === 0, sizesChar.small.join('; '));
  check('desk 1440 ·   and nothing slides sideways', !sizesChar.sideways && sizesChar.spill === 0, JSON.stringify(sizesChar));

  await p.locator('[data-charput="frame"]').click();
  await p.waitForTimeout(1200);
  check('"Put it in a shot" as the opening frame closes the bench and opens the shot bench over the film',
    (await p.locator('[data-charbench]').count()) === 0 && (await p.locator('[data-editorwand]').isVisible().catch(() => false)));
  const framed = await p.locator('[data-editorshotframe]').getAttribute('src').catch(() => '');
  check('  with the character as the opening frame', /^data:image\//.test(framed || ''), String(framed).slice(0, 40));
  const shotWords = await p.locator('[data-editorshotwords]').inputValue().catch(() => '');
  check('  and words written for it to move by', /Nova comes to life/.test(shotWords), shotWords);
  const moveLabel = (await p.locator('[data-editorshotmove]').innerText().catch(() => '')) || '';
  check('  and "Make it move" says its price', moveLabel.includes(`${VIDEO} credits`), moveLabel);
  await p.locator('[data-editorshotmove]').click();
  await p.locator('[data-editorshotclip]').waitFor({ state: 'visible', timeout: 20000 }).catch(() => undefined);
  const moved = videos[0] ?? {};
  check('making it move sends the character as the opening frame, with the words, to /api/video',
    /^data:image\//.test(moved.image ?? '') && /Nova comes to life/.test(moved.prompt ?? '') && !moved.endImage,
    `${String(moved.image).slice(0, 30)} · ${String(moved.prompt).slice(0, 60)}`);
  await p.locator('[data-editorshotkeep]').click().catch(() => undefined);
  await p.waitForTimeout(2500);
  const afterChar = await blockNames(p);
  check('  and the clip it makes lands on the clock', afterChar.length === 3 && /made-shot/.test(afterChar[2] ?? ''), JSON.stringify(afterChar));
  await p.locator('[data-editorwandshut]').click().catch(() => undefined);
  await p.waitForTimeout(400);

  /* ── AI restyle ────────────────────────────────────────────────── */
  await p.locator('[data-editorblock]').first().click();
  await p.waitForTimeout(600);
  await bench(p, 'restyle');
  check('the restyle bench opens on a picked shot', await p.locator('[data-restylebench]').isVisible().catch(() => false));
  const restyleWhat = (await p.locator('[data-restylewhat]').innerText().catch(() => '')) || '';
  check('  and is honest: a new shot from the frame, not every frame of her footage repainted',
    /makes a new shot/.test(restyleWhat) && /does not repaint every frame/.test(restyleWhat), restyleWhat.slice(0, 160));
  await p.locator('[data-restylebefore]').waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
  check('  and has taken the frame at the playhead off the clock',
    /^data:image\//.test((await p.locator('[data-restylebefore]').getAttribute('src').catch(() => '')) || ''));
  const styles = await p.locator('[data-restylestyle]').evaluateAll((all) => all.map((one) => one.getAttribute('data-restylestyle')));
  check('  and offers at least eight futures, including the ones asked for',
    styles.length >= 8 && ['neoncity', 'chrome', 'hologram', 'rain', 'synthwave', 'space', 'biolum', 'animefuture', 'animated3d'].every((one) => styles.includes(one)),
    JSON.stringify(styles));
  const sceneTiles = await tilesDrawn(p, 'data-restylestyle');
  check('  and every future is a picture', sceneTiles.length === styles.length && sceneTiles.every((n) => n >= 6), JSON.stringify(sceneTiles));
  const oneLabel = (await p.locator('[data-restyledraw]').innerText().catch(() => '')) || '';
  check('  and the restyle button says its price', oneLabel.includes(`${REPAINT} credits`), oneLabel);
  await p.locator('[data-restylestyle="synthwave"]').click();
  await p.locator('[data-restyleend]').check();
  const twoLabel = (await p.locator('[data-restyledraw]').innerText().catch(() => '')) || '';
  check('  and with the closing frame too, the price is two drawings', twoLabel.includes(`${REPAINT * 2} credits`), twoLabel);
  if (SHOTS) await p.screenshot({ path: join(SHOTS, 'restyle-1440.png') });

  const before = pictures.length;
  await p.locator('[data-restyledraw]').click();
  /* Both drawings, not the first: the after-picture lands while the last
     frame is still being read off the clip and drawn. */
  await p.locator('[data-restyledend]').waitFor({ state: 'visible', timeout: 30000 }).catch(() => undefined);
  await p.waitForTimeout(500);
  const restyled = pictures.slice(before);
  check('restyling sends the frame as `from`, with the world named and the composition kept',
    restyled.length >= 1 && Array.isArray(restyled[0].from) && restyled[0].from.length === 1
      && /Redraw this exact frame/.test(restyled[0].words ?? '') && /synthwave/.test(restyled[0].words ?? '')
      && /same composition/.test(restyled[0].words ?? '') && restyled[0].aspect === undefined,
    JSON.stringify({ n: restyled.length, words: String(restyled[0]?.words).slice(0, 120), aspect: restyled[0]?.aspect }));
  check('  and the clip’s last frame as a second picture, told it is the end of the same shot',
    restyled.length === 2 && Array.isArray(restyled[1].from) && /last frame of the same shot/.test(restyled[1].words ?? ''),
    `${restyled.length} drawings · ${(await p.locator('[data-restylesaid]').innerText().catch(() => '')) || ''}`);
  check('  and before, after and the closing frame are all on the bench',
    (await p.locator('[data-restyledframe]').count()) === 1 && (await p.locator('[data-restyledend]').count()) === 1);
  const restyleWords = await p.locator('[data-restylewords]').inputValue().catch(() => '');
  check('  and the words are written to keep the camera move and the action', /same camera move/.test(restyleWords), restyleWords);

  await p.locator('[data-restyleseconds="6"]').click();
  await p.locator('[data-restylegrade="better"]').click();
  const restyleMove = (await p.locator('[data-restylemove]').innerText().catch(() => '')) || '';
  check('  and "Make it move" says its price for the length and grade chosen',
    restyleMove.includes(`${BETTER * 2} credits`), `"${restyleMove}" — expected ${BETTER * 2} credits`);
  if (SHOTS) await p.screenshot({ path: join(SHOTS, 'restyle-drawn-1440.png') });
  await p.locator('[data-restylemove]').click();
  await p.locator('[data-restyleclip]').waitFor({ state: 'visible', timeout: 20000 }).catch(() => undefined);
  const restyleJob = videos[1] ?? {};
  check('making it move sends both restyled frames, the words, the length and the grade',
    /^data:image\//.test(restyleJob.image ?? '') && /^data:image\//.test(restyleJob.endImage ?? '')
      && /same camera move/.test(restyleJob.prompt ?? '') && restyleJob.seconds === 6 && restyleJob.grade === 'better',
    JSON.stringify({ image: Boolean(restyleJob.image), end: Boolean(restyleJob.endImage), s: restyleJob.seconds, g: restyleJob.grade }));
  await p.locator('[data-restylekeep]').click().catch(() => undefined);
  await p.waitForTimeout(2500);
  const afterRestyle = await blockNames(p);
  check('  and the new shot lands on the clock straight after the original, not at the end',
    afterRestyle.length === 4 && /a-take/.test(afterRestyle[0]) && /made-shot/.test(afterRestyle[1]) && /b-take/.test(afterRestyle[2]),
    JSON.stringify(afterRestyle));
  check('  and says where it went', /straight after the original/.test((await p.locator('[data-restylesaid]').innerText().catch(() => '')) || ''));

  const sizesRestyle = await measure(p, '[data-restylebench]');
  check('desk 1440 · every control on the restyle bench is a thumb tall', sizesRestyle.small.length === 0, sizesRestyle.small.join('; '));
  check('desk 1440 ·   and nothing slides sideways', !sizesRestyle.sideways && sizesRestyle.spill === 0, JSON.stringify(sizesRestyle));
  await browser.close();
  browser = null;

  /* ── 1280 and a phone: both benches, measured ──────────────────── */
  for (const where of [
    { name: 'desk 1280', width: 1280, height: 800, touch: false },
    { name: 'phone 390', width: 390, height: 844, touch: true },
  ]) {
    const one = await enter({ at: server.url, lang: 'en', width: where.width, height: where.height, touch: where.touch, before: stubs });
    browser = one.browser;
    const q = one.page;
    q.on('pageerror', (e) => problems.push(`${where.name} pageerror: ${String(e).slice(0, 160)}`));
    await studio(q);
    await toRoom(q, 'Video Editor');
    await q.waitForTimeout(900);
    await q.locator('[data-editoropenbring] input[type="file"]').setInputFiles({ name: 'a-take.webm', mimeType: 'video/webm', buffer: clipBytes });
    await q.waitForTimeout(2500);

    await bench(q, 'characters');
    await q.locator('[data-charwords]').fill('a street dancer from the year 2080');
    await q.locator('[data-chardraw]').click();
    await q.locator('[data-charsheet]').waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);
    const c = await measure(q, '[data-charbench]');
    check(`${where.name} · the characters bench draws, and every control is a thumb tall`,
      c.found && (await q.locator('[data-charsheet]').count()) === 1 && c.small.length === 0, c.small.join('; ') || JSON.stringify(c));
    check(`${where.name} ·   and nothing slides sideways`, !c.sideways && c.spill === 0, JSON.stringify(c));
    if (SHOTS) await q.screenshot({ path: join(SHOTS, `characters-${where.width}.png`) });

    await bench(q, 'restyle');
    await q.locator('[data-restylebefore]').waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
    await q.locator('[data-restyledraw]').click();
    await q.locator('[data-restyledframe]').waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);
    const r = await measure(q, '[data-restylebench]');
    check(`${where.name} · the restyle bench restyles, and every control is a thumb tall`,
      r.found && (await q.locator('[data-restyledframe]').count()) === 1 && r.small.length === 0, r.small.join('; ') || JSON.stringify(r));
    check(`${where.name} ·   and nothing slides sideways`, !r.sideways && r.spill === 0, JSON.stringify(r));
    if (SHOTS) await q.screenshot({ path: join(SHOTS, `restyle-${where.width}.png`) });
    await browser.close();
    browser = null;
  }
} catch (thrown) {
  problems.push(`threw: ${String(thrown).slice(0, 240)}`);
} finally {
  if (browser) await browser.close().catch(() => undefined);
  server.stop();
}

if (problems.length) {
  console.error(`\ncheck:videocharacters — ${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\ncheck:videocharacters — a character is drawn in a look at its price, kept or put in a shot and made to move; a scene is restyled from the frame on the clock and its new shot lands beside the original; at 1440, 1280 and on a phone.');
