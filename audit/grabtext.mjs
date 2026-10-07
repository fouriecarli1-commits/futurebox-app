/**
 * The words in a photograph, read on the phone.
 *
 * ── Why this needs a browser and nothing else will do ────────────────────
 *
 * Carli, 7 October 2026: *"grab text"*. The engine is Tesseract compiled to
 * WebAssembly, served from `public/ocr/`, and the only question worth asking
 * about it is whether it reads. A source rule can check that the files are
 * there and that the paths point at them; it cannot tell a working OCR from
 * a 6.6 MB download that answers nothing.
 *
 * And the way this fails is quiet. Three separate things in this app's own
 * Content-Security-Policy would each stop it dead with a console line nobody
 * reads and a button that spins for ever:
 *
 *   `connect-src 'self'`   the engine's default CDN for its core
 *   `connect-src 'self'`   and for the language file
 *   `default-src 'self'`   the blob: URL it wraps its worker in
 *
 * `audit/where.mjs` starts a real `next start`, so the headers in
 * `next.config.mjs` are live here. That is what makes this probe worth its
 * minute: it is the policy, the worker, the wasm and the language data, all
 * at once, on the real thing.
 *
 * The picture is made in the page — black on white, one short line in a face
 * every phone has. A photograph committed to this repository would be a
 * fixture to go stale, and a hard one to read would be testing Tesseract
 * rather than our wiring of it.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const PORT = process.argv[2] || '3094';
const WANT = 'FUTUREBOX STUDIO';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const server = await serve(PORT);
const { browser, page, problems: noise } = await enter({
  width: 390, height: 844, at: server.url, touch: true,
});

try {
  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(1200);

  check('the photo editor opens', (await page.locator('[data-poststudio]').count()) > 0);

  /* The files are really served, under the real headers. Fetched from inside
     the page so the app's own origin and policy apply — curl would prove
     something about a web server and nothing about a browser. */
  const served = await page.evaluate(async (names) => {
    const out = {};
    for (const name of names) {
      try {
        const answer = await fetch(`/ocr/${name}`, { method: 'HEAD' });
        out[name] = answer.status;
      } catch (e) {
        out[name] = `blocked: ${String(e).slice(0, 40)}`;
      }
    }
    return out;
  }, ['worker.min.js', 'tesseract-core-simd-lstm.js', 'tesseract-core-simd-lstm.wasm',
      'eng.traineddata.gz', 'afr.traineddata.gz']);
  const missing = Object.entries(served).filter(([, status]) => status !== 200);
  check('every file the reader needs is served by this app', missing.length === 0,
    `${missing.map(([name, status]) => `${name} ${status}`).join(', ')} — a CDN would`
    + " be refused by this app's connect-src, so these have to be ours");

  /* A picture with words in it, made here. */
  const put = await page.evaluate(async (words) => {
    /* Measured, then sized to fit with a margin.
 
       The first version of this drew sixteen characters at 110px bold into a
       canvas 1000 wide. That is about 1120 pixels of text, so the F and the
       O fell off the ends — and the probe reported "UTUREBOX STUDI!" as the
       reader being wrong when the reader had read exactly what was in front
       of it. A fixture that cuts its own subject in half is the check being
       wrong about the code, which is the costlier direction. */
    const c = document.createElement('canvas');
    c.width = 1400;
    c.height = 420;
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#000000';
    let px = 120;
    const margin = c.width * 0.12;
    do {
      x.font = `bold ${px}px Georgia, serif`;
      px -= 2;
    } while (px > 20 && x.measureText(words).width > c.width - margin);
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(words, c.width / 2, c.height / 2);
    const blob = await new Promise((done) => c.toBlob(done, 'image/png'));
    const input = document.querySelector('[data-poststudio] input[type=file]');
    if (!input || !blob) return false;
    const holder = new DataTransfer();
    holder.items.add(new File([blob], 'sign.png', { type: 'image/png' }));
    input.files = holder.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, WANT);
  check('a picture with words in it can be brought in', put === true);
  await page.waitForTimeout(1200);

  const grab = page.locator('[data-postgrabbed]').first();
  check('the room offers to read the words',
    (await page.locator('[data-postgrablang="eng"]').count()) > 0
    && (await page.locator('[data-postgrablang="afr"]').count()) > 0,
    'both languages, because this app is bilingual everywhere else');

  await page.locator('[data-postgrablang="eng"]').first().click();

  /* Generous, and on purpose. The first press fetches the core and the
     language file — about five megabytes — and then reads. On a cold cache
     that is slow, and a probe that gives up at ten seconds would report a
     working reader as broken on the one run that matters. */
  let read = '';
  for (let waited = 0; waited < 180; waited += 1) {
    await page.waitForTimeout(1000);
    if ((await grab.count()) > 0) {
      read = ((await grab.inputValue().catch(() => '')) ?? '').trim();
      if (read) break;
    }
    if ((await page.locator('[data-postgrabnone]').count()) > 0) break;
    if ((await page.locator('[data-postsaid]').count()) > 0) break;
  }

  const said = ((await page.locator('[data-postsaid]').first().innerText().catch(() => '')) ?? '').trim();
  check('the reader runs at all, under this app’s own policy',
    read.length > 0 || said.length > 0,
    'nothing came back and nothing was said — the worker, the wasm or the'
    + ' language file was refused and the button simply spun');
  check('  and it did not fall over', said.length === 0, said);

  /* Loosely. OCR is allowed to be imperfect — what is being proved is that
     the picture went in and ITS words came out, not that Tesseract is
     flawless. Letters only, case folded, so a stray newline or a comma does
     not fail a correct read. */
  const flat = (one) => one.toUpperCase().replace(/[^A-Z]/g, '');
  check(`  and read the words that were in the picture`,
    flat(read).includes(flat(WANT)),
    `it read "${read.replace(/\s+/g, ' ').slice(0, 60)}" and the picture said "${WANT}"`);

  /* And what it read can be used, which is the point of reading it. */
  if (read) {
    await page.locator('[data-postgrabuse]').first().click();
    await page.waitForTimeout(700);
    const onCanvas = await page.evaluate(() => {
      const el = document.querySelector('[data-poststudio] textarea');
      return el ? el.value.trim() : '';
    });
    check('    and what it read lands in the words, ready to edit',
      flat(onCanvas).includes(flat(WANT)),
      `the words box holds "${onCanvas.slice(0, 50)}" — a read nobody can use is`
      + ' a read nobody wanted');
  }

  for (const one of noise) check(`no console error: ${one}`, false);
} catch (error) {
  check('the walk itself fell over', false, String(error).split('\n')[0]);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.log(`\ncheck:grabtext — ${problems.length} problem(s):`);
  for (const one of problems) console.log(`  · ${one}`);
  process.exit(1);
}
console.log(
  '\ncheck:grabtext — the reader is served by this app, runs inside its own'
  + ' Content-Security-Policy, reads the words out of a picture and hands them'
  + ' to the post.',
);
