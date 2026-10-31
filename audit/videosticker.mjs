/**
 * Stickers on a film: an emoji or the user's own picture, on the whole film.
 *
 * The owner, 30 October 2026: the photo tools on video, a sticker among them,
 * across the whole clip. Walked here: the Stickers row in the Shapes tab, an
 * emoji put on and drawn on the film, a picture from the device put on, its
 * dials changing it on the film, and taking one off.
 */
import { enter, studio, toRoom, unfold } from './enter.mjs';
import { serve, shot } from './where.mjs';

const server = await serve(process.argv[2] || '3499');
const problems = [];
const check = (what, passed, detail = '') => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) problems.push(what);
};
const { browser: b, page: p } = await enter({ at: server.url, lang: 'en', width: 1280, height: 900 });
p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));

/** How much of the film's furniture layer is drawn on, 0 to 1. */
const inked = () => p.evaluate(() => {
  const el = document.querySelector('[data-editorfurniture]');
  if (!el) return -1;
  const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
  let on = 0;
  for (let i = 3; i < d.length; i += 4 * 7) if (d[i] > 20) on += 1;
  return on / (d.length / (4 * 7));
});

try {
  await studio(p);
  await toRoom(p, 'Video Editor');
  await unfold(p);
  const made = await p.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 240;
    const c = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    const type = ['video/webm;codecs=vp8', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
    if (!type) return null;
    const rec = new MediaRecorder(stream, { mimeType: type });
    const parts = [];
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    const stopped = new Promise((r) => { rec.onstop = r; });
    rec.start();
    const began = performance.now();
    await new Promise((finish) => {
      const draw = () => {
        const t = (performance.now() - began) / 1000;
        c.fillStyle = '#245'; c.fillRect(0, 0, 320, 240);
        c.fillStyle = '#fff'; c.fillRect((t / 2) * 280, 100, 40, 40);
        if (t >= 2) { finish(); return; }
        requestAnimationFrame(draw);
      };
      draw();
    });
    rec.stop();
    await stopped;
    return Array.from(new Uint8Array(await new Blob(parts, { type }).arrayBuffer()));
  });
  if (!made) throw new Error('this browser cannot record webm');
  await p.locator('[data-editoropenbring] input[type="file"]').setInputFiles({
    name: 'a-take.webm', mimeType: 'video/webm', buffer: Buffer.from(made),
  });
  await p.waitForTimeout(2500);
  check('a clip is on the clock', (await p.locator('[data-editorblock]').count()) === 1);
  await p.locator('[data-editorblock]').first().click();
  await p.waitForTimeout(400);
  await p.locator('[data-cutbench="film"]').click({ timeout: 10000 }).catch(() => undefined);
  await p.waitForTimeout(500);
  await p.locator('[data-editortpltab="shapes"]').click();
  await p.waitForTimeout(400);

  check('the Shapes tab has a Stickers row', (await p.locator('[data-editorstickers]').count()) === 1);
  const emoji = await p.locator('[data-editoraddsticker]').count();
  check('  with at least twenty emoji to choose', emoji >= 20, String(emoji));

  const before = await inked();
  await p.locator('[data-editoraddsticker="🔥"]').click();
  await p.waitForTimeout(600);
  check('an emoji goes on the film as a sticker', (await p.locator('[data-editorsticker]').count()) === 1);
  check('  with a drag handle on the film', (await p.locator('[data-editorshapedrag="sticker"]').count()) === 1);
  const after = await inked();
  check('  and it is drawn on the film', after > before + 0.01, `${before.toFixed(3)} → ${after.toFixed(3)}`);

  /* Its size dial makes it bigger on the film. */
  const wide = async () => (await p.locator('[data-editorshapedrag="sticker"]').first().boundingBox())?.width ?? 0;
  const small = await wide();
  await p.locator('[data-editorsticker] [data-editorstickerdial="size"]').first().fill('0.7');
  await p.waitForTimeout(400);
  const big = await wide();
  check('  its size dial makes it bigger on the film', big > small * 1.8, `${Math.round(small)} → ${Math.round(big)}`);

  /* The user's own picture: a PNG with a see-through background. */
  const png = await p.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 200; c.height = 200;
    const x = c.getContext('2d');
    x.fillStyle = '#f0f'; x.beginPath(); x.arc(100, 100, 80, 0, Math.PI * 2); x.fill();
    return c.toDataURL('image/png').split(',')[1];
  });
  await p.locator('[data-editorstickerfile]').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await p.waitForTimeout(1200);
  check('a picture from the device goes on as a sticker too', (await p.locator('[data-editorsticker]').count()) === 2);
  check('  shown in its row as the picture', (await p.locator('[data-editorsticker] img').count()) === 1);
  const magenta = await p.evaluate(() => {
    const el = document.querySelector('[data-editorfurniture]');
    const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4 * 5) if (d[i] > 200 && d[i + 1] < 60 && d[i + 2] > 200 && d[i + 3] > 200) n += 1;
    return n;
  });
  check('  and drawn on the film', magenta > 50, String(magenta));

  await p.locator('[data-editorstickeroff]').first().click();
  await p.waitForTimeout(400);
  check('a sticker can be taken off', (await p.locator('[data-editorsticker]').count()) === 1);
  await p.locator('[data-editorstickers]').scrollIntoViewIfNeeded();
  await p.screenshot({ path: shot('videosticker.png') });
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 300)}`);
} finally {
  await b.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:videosticker — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:videosticker — an emoji or the user\'s own picture goes on the whole film, drawn there, with its dials, and comes off again.');
