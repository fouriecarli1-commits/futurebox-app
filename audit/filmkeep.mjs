/**
 * The Video Editor remembers the project, walked in a browser.
 *
 * ── The fault ────────────────────────────────────────────────────────────
 *
 * Carli, 5 October 2026: *"Die kamer onthou nie die projek nie. Ek het
 * perongeluk back gedruk en toe ek terug gaan was die projek weg."*
 *
 * The edit lived in React state and nowhere else, so the phone's own Back
 * button threw away an afternoon of work. Nothing warned her, because nothing
 * failed: from the room's point of view it was a new room with an empty clock.
 *
 * ── Why this cannot be a source rule ─────────────────────────────────────
 *
 * Everything about keeping a project is browser machinery — IndexedDB, a
 * Blob surviving a round trip to disk, an effect that reads before another
 * one writes. A source check can see that `keepFilm` is called. It cannot see
 * whether what comes back is the same film, and the way this breaks in
 * practice is that something comes back and it is not.
 *
 * In particular the race: the read is a round trip to disk and a person with
 * a clip ready can be faster than it. A restore that lands on top of a clip
 * she has just brought in is the same fault wearing the other mask, so the
 * walk below checks the clip survives AND that the words on it do.
 */
import { enter, studio, toRoom, unfold } from './enter.mjs';
import { serve } from './where.mjs';

const PORT = 3351;
const problems = [];

const check = (what, passed, detail = '') => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) problems.push(what);
};

const server = await serve(PORT);
const { browser: b, page: p } = await enter({ at: server.url, lang: 'en' });
p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));

/** Into the cutting room from the front door, which is how she gets there. */
const intoTheRoom = async () => {
  await studio(p);
  await toRoom(p, 'Video Editor');
  await unfold(p);
  await p.waitForTimeout(800);
};

await intoTheRoom();

/* A real clip, recorded in the page — the same fixture `audit/editor.mjs`
   uses, cut down to the picture: what is being measured here is whether a
   Blob survives being put away and taken back out, and a sound would only
   make the file bigger. */
const made = await p.evaluate(async () => {
  const canvas = document.createElement('canvas');
  canvas.width = 320; canvas.height = 240;
  const c = canvas.getContext('2d');
  const stream = canvas.captureStream(30);
  const type = ['video/webm;codecs=vp8', 'video/webm'].find((one) => MediaRecorder.isTypeSupported(one));
  if (!type) return null;
  const rec = new MediaRecorder(stream, { mimeType: type });
  const parts = [];
  rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
  const stopped = new Promise((done) => { rec.onstop = done; });
  rec.start();
  const began = performance.now();
  await new Promise((finish) => {
    const draw = () => {
      const t = (performance.now() - began) / 1000;
      c.fillStyle = '#2b6'; c.fillRect(0, 0, 320, 240);
      c.fillStyle = '#fff'; c.fillRect((t / 2) * 280, 100, 40, 40);
      if (t >= 2) { finish(); return; }
      requestAnimationFrame(draw);
    };
    draw();
  });
  rec.stop();
  await stopped;
  const buf = await new Blob(parts, { type }).arrayBuffer();
  return Array.from(new Uint8Array(buf));
});

if (!made) {
  console.log('  --  this browser cannot record webm; the walk is skipped rather than faked.');
} else {
  await p.locator('[data-editoropenbring] input[type="file"]').setInputFiles({
    name: 'onthou-my.webm',
    mimeType: 'video/webm',
    buffer: Buffer.from(made),
  });
  await p.waitForTimeout(2500);

  check('a clip brought in is on the clock',
    (await p.locator('[data-editorblock]').count()) === 1,
    'nothing below means anything if this did not happen');

  const ranFor = (await p.locator('[data-editorruns]').innerText().catch(() => '')) || '';

  /* Words on it, because a film is not only its material: the trims, the
     looks and the text are the afternoon she lost, and a restore that brings
     back the clip and none of the work is the same loss in slower motion. */
  await p.locator('[data-cutbench="words"]').click().catch(() => undefined);
  await p.waitForTimeout(600);
  await p.locator('[data-editorwords]').fill('Onthou my');
  await p.waitForTimeout(1800);

  /* ── The press that lost it ─────────────────────────────────────────

     A reload rather than the phone's Back, and it is the harder case: Back
     within a single-page app may never unmount anything, while a reload takes
     the whole page down to nothing. A film that survives this survives Back. */
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await intoTheRoom();

  check('the film is still there after the page is taken down and brought back',
    (await p.locator('[data-editorblock]').count()) === 1,
    `${await p.locator('[data-editorblock]').count()} blocks — "ek het`
    + ' perongeluk back gedruk en toe ek terug gaan was die projek weg"');

  check('  and it is the same length it was',
    ((await p.locator('[data-editorruns]').innerText().catch(() => '')) || '') === ranFor,
    `"${ranFor}" before, "${(await p.locator('[data-editorruns]').innerText().catch(() => '')) || ''}" after`
    + ' — a clip that comes back untrimmed is the work lost with the file kept');

  check('  and the explanation page is not standing over it',
    (await p.locator('[data-editoropening]').count()) === 0,
    'the room asking what it is for, over a film, is the fault wearing the'
    + ' other mask');

  await p.locator('[data-cutbench="words"]').click().catch(() => undefined);
  await p.waitForTimeout(700);
  check('  and the words she typed came back with it',
    ((await p.locator('[data-editorwords]').inputValue().catch(() => '')) || '') === 'Onthou my',
    `"${(await p.locator('[data-editorwords]').inputValue().catch(() => '')) || ''}" —`
    + ' the material is the easy half; the afternoon is in the settings');

  /* ── And it is really off the disk, not held in memory ───────────────

     A fresh browser: a new context has its own storage, so if this one found
     the film it would mean the room had kept it somewhere shared, and if the
     SAME browser had simply never unmounted the component the assertions
     above would pass on a room that keeps nothing. */
  const second = await enter({ at: server.url, lang: 'en' });
  await studio(second.page);
  await toRoom(second.page, 'Video Editor');
  await unfold(second.page);
  await second.page.waitForTimeout(1200);
  check('a different browser does not see her project',
    (await second.page.locator('[data-editorblock]').count()) === 0,
    'it is kept on the device, like her songs — a project that followed her'
    + ' browser around would be a project on somebody else’s server');
  await second.browser.close();
}

await b.close();
await server.stop();

if (problems.length) {
  console.error(`\ncheck:filmkeep — ${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log(
  '\ncheck:filmkeep — a film on the clock survives the page being taken down'
  + ' and brought back, with its trims and its words, and stays on the device'
  + ' it was made on.',
);
