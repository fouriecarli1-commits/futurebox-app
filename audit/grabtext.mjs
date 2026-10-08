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
  /* ── The bench with the picture row on it, opened first ───────────────
 
     The room's tools live behind a bar along the bottom since 7 October —
     Carli: *"Die editing tools moet ook onder in 'n bar wees."* So the file
     input is not in the page until the bench holding it is open, and a walk
     written against the old long scroll fell over on `null.files` with no
     clue that the room had simply changed shape. */
  const pic = page.locator('[data-cutbench="pic"]').first();
  if (await pic.count()) {
    await pic.click();
    await page.waitForTimeout(600);
  }
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

  /* And the reader is its own bench. The picture comes in on one and is read
     on another, which is the room's shape now rather than one long scroll. */
  const readTab = page.locator('[data-cutbench="read"]').first();
  if (await readTab.count()) {
    await readTab.click();
    await page.waitForTimeout(600);
  }

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

  /* ── And the same reading, tappable ─────────────────────────

     Carli, 8 October 2026: *"dat die masjien self objekte en text
     identifiseer wat dan highlight en dan kan die klient op die objekte of
     text click wat hulle graag wil grab, rondskuif, of delete."*

     Walked here rather than in a probe of its own, and the reason is five
     megabytes: the first read fetches the core and the language file, and a
     second probe would pay that again to prove something about the same
     engine. `check:textpick` holds the arithmetic — the three frames of
     reference, the tap, the mask. What a browser has to answer is whether a
     thumb on the glass lands on the writing.

     Which is the one thing the arithmetic cannot say: it proves the
     conversion is right, not that the room is using it. */
  /* Back to the reader's own bench. Pressing "Put it on the picture" above
     opens the words bench — deliberately, so she can fix what the reader
     got wrong — so the button this needs is no longer on screen. The first
     version of this assertion reported the feature missing when what was
     missing was the bench. */
  const backToRead = page.locator('[data-cutbench="read"]').first();
  if (await backToRead.count()) {
    await backToRead.click();
    await page.waitForTimeout(600);
  }

  const findIt = page.locator('[data-postfindwords]').first();
  check('the room offers to find the lines, not only to read them',
    (await findIt.count()) > 0,
    'reading hands back the whole page as text to copy; this puts a box'
    + ' round each line so one can be taken — somebody photographing a page'
    + ' wants the first and somebody fixing a poster wants the second');

  /* The reading before the press, so the one after it has something to be
     compared with. Taken before the click and not after, which is the only
     order that can tell a highlight from a picture that was always green. */
  const beforeFind = await page.evaluate(() => {
    const el = document.querySelector('[data-postcanvas]');
    if (!el) return null;
    const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
    let red = 0;
    let green = 0;
    for (let i = 0; i < d.length; i += 4) { red += d[i]; green += d[i + 1]; }
    return (green - red) / (d.length / 4);
  });

  if (await findIt.count()) {
    await findIt.click();
    /* The engine is warm by now — the read above paid for it — but it still
       has to run. */
    let bar = 0;
    for (let waited = 0; waited < 90; waited += 1) {
      await page.waitForTimeout(1000);
      bar = await page.locator('[data-postlinebar]').count();
      if (bar > 0) break;
    }
    check('  and pressing it puts the room into picking a line',
      bar > 0,
      'no [data-postlinebar] — the bench closes and the bar comes up, the'
      + ' same shape cropping and cutting use');

    /* ── The highlights, read off the glass ───────────────────

       Measured as the GREEN CAST over the whole picture, before and after,
       rather than by counting pixels of a particular colour.

       The first version counted pixels where green beat red by forty. That
       is right for the box she has tapped, which is filled at 0.28, and
       wrong for the rest, which are filled at 0.10 — a tenth of
       `rgb(52,211,153)` over white paper comes out about (235, 251, 245),
       and 251 does not beat 235 by forty. It reported nought highlighted
       pixels over a picture that was covered in them, which is an
       instrument failing and reading as the feature failing.

       A cast is the honest measure for a wash: whatever the alpha, a green
       wash moves green away from red across the whole frame. */
    const cast = () => page.evaluate(() => {
      const el = document.querySelector('[data-postcanvas]');
      if (!el) return null;
      const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
      let red = 0;
      let green = 0;
      for (let i = 0; i < d.length; i += 4) { red += d[i]; green += d[i + 1]; }
      return (green - red) / (d.length / 4);
    });
    const lit = await cast();
    check('    and the lines it found are drawn on the picture',
      beforeFind !== null && lit !== null && lit > beforeFind + 1,
      `the green cast over the picture was ${beforeFind?.toFixed(2)} and is`
      + ` ${lit?.toFixed(2)} — a feature that finds the writing and shows her`
      + ' nothing is a feature she cannot aim at');

    /* ── The tap, which is the thing arithmetic cannot prove ──────── */
    const glass = await page.locator('[data-postcanvas]').first().boundingBox();
    await page.mouse.click(glass.x + glass.width / 2, glass.y + glass.height / 2);
    await page.waitForTimeout(600);
    const named = ((await page.locator('[data-postlinesaid]').first()
      .innerText().catch(() => '')) ?? '').trim();
    check('    and a tap in the middle of the writing names the line it hit',
      flat(named).includes(flat(WANT)),
      `the bar says "${named}" and the picture says "${WANT}" — the fixture is`
      + ' one line across the middle, so a tap in the middle of the glass has'
      + ' to find it. Anything else is the conversion between the picture,'
      + ' the frame and the canvas being applied once too often, which does'
      + ' not throw — it just selects the wrong thing');

    /* ── And taking it out really takes it out ───────────────────

       Counting PAPER, not ink, and that is the second instrument this
       assertion has had.

       The first counted dark pixels and passed — for the wrong reason. The
       room's background colour is `#111113`, and a 1400 × 420 photograph
       letterboxed into this frame leaves wide bands of it above and below.
       Those bands are dark and opaque, so "ink" was counting the
       background: 200 959 of them before, and nought after, because
       finishing the cut put the placement back to filling the frame and the
       bands went away. The writing could have survived untouched and that
       assertion would still have gone green.

       White paper cannot be confounded that way. The fixture is black type
       on white, the background is near-black, and erasing the type turns
       those pixels into the paper around them — so the paper grows by about
       what the ink was. */
    const paper = () => page.evaluate(() => {
      const el = document.querySelector('[data-postcanvas]');
      if (!el) return 0;
      const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] > 200 && d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) n += 1;
      }
      return n;
    });
    const paperWas = await paper();
    const dropIt = page.locator('[data-postlinedrop]').first();
    check('    and the line she tapped can be taken out',
      (await dropIt.count()) > 0,
      'no [data-postlinedrop] — nothing was picked, so the three actions'
      + ' never appeared');
    if ((await dropIt.count()) > 0) {
      await dropIt.click();
      await page.waitForTimeout(1500);
      const paperNow = await paper();
      check('      and the writing really goes out of the photograph',
        paperWas > 1000 && paperNow > paperWas * 1.02,
        `${paperWas} white pixels became ${paperNow} — the eraser is handed a`
        + ' mask in the picture’s own pixels, and a mask built against the'
        + ' canvas would clear a rectangle a third of the way across instead');

      /* And the words are gone from the reading as well as from the glass:
         a second read of the same photograph should no longer find them. */
      const stillSaid = ((await page.locator('[data-postlinesaid]').first()
        .innerText().catch(() => '')) ?? '').trim();
      check('      and the room stops offering a line that is no longer there',
        stillSaid === '' || !flat(stillSaid).includes(flat(WANT)),
        `the bar still says "${stillSaid}" — the boxes belonged to a picture`
        + ' that no longer exists, and a tap on erased writing is a tap on'
        + ' nothing');
    }
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
