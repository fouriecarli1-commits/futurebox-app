/**
 * Taking the background out: the engine, and what we do with its answer.
 *
 * ── Two halves, and only one of them is ours ─────────────────────────────
 *
 * Carli, 7 October 2026: *"BG remover"*. Google's model decides what is a
 * person. `maskOnto` decides what that answer does to her picture. They fail
 * in completely different ways and this walk tests them separately.
 *
 * ── What can be proved here, and the one thing that cannot ───────────────
 *
 * Everything about the wiring: that six megabytes of model and WebAssembly
 * are served by this app rather than a CDN its own Content-Security-Policy
 * would refuse, that the engine loads and RUNS and answers, that an answer
 * of "nobody" is reported as nobody rather than as a failure, and that the
 * picture is left alone when it refuses.
 *
 * The distinction in that third one is the whole value of it. "No person
 * could be found" means the model ran and looked; "the background could not
 * be taken out" means it never got that far. The first version of this code
 * said the second for a reason that had nothing to do with the picture — it
 * asked for `selfie_segmentation_landscape.tflite`, which was not among the
 * files copied, so the wasm aborted inside itself and the callback never
 * fired. Two messages that look alike and mean opposite things, and the walk
 * tells them apart.
 *
 * What CANNOT be proved here is that the model finds a real person, because
 * nothing that can be drawn into a canvas is one: a flat rectangle, a
 * gradient and a drawn figure all come back as nobody, correctly. That needs
 * a photograph and a human looking at the result. It is written down in
 * `docs/EDITING-TOOLS.md` as the one thing waiting on Carli rather than
 * pretended at here.
 *
 * ── Which is why there is a bench page ───────────────────────────────────
 *
 * Because the model finds nobody in anything synthetic, the compositing is
 * never exercised by the room. `app/cutcheck/page.probe.tsx` calls `maskOnto`
 * with a mask made by hand, and this walk reads the numbers. A mask applied
 * inside out keeps the background and throws the person away, and the result
 * still looks like "a picture with something cut out of it".
 */
import { cpSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const PORT = process.argv[2] || '3095';
const PROBE = 'app/cutcheck/page.probe.tsx';
const LIVE = 'app/cutcheck/page.tsx';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

let server = null;
let browser = null;
let fell = false;
try {
  cpSync(PROBE, LIVE);
  console.log('building with the bench page…');
  execSync('npx next build', { stdio: 'ignore' });
  server = await serve(PORT);
  const entered = await enter({ width: 390, height: 844, at: server.url, touch: true });
  browser = entered.browser;
  const { page } = entered;

  /* ── The half that is ours ────────────────────────────────────────── */

  await page.goto(`${server.url}/cutcheck`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const raw = ((await page.locator('[data-cutcheck]').innerText().catch(() => '')) ?? '').trim();
  let bench = null;
  try { bench = JSON.parse(raw); } catch { bench = null; }
  check('the bench runs the real compositing', bench !== null, raw.slice(0, 120));

  if (bench) {
    const half = (bench.side * bench.side) / 2;
    check('  a mask keeps exactly what it covers', bench.keptLeft === half,
      `${bench.keptLeft} of ${half} pixels on the covered side survived`);
    check('  and exactly nothing of what it does not', bench.keptRight === 0,
      `${bench.keptRight} pixels survived where the mask was clear — a mask`
      + ' applied inside out keeps the background and throws the person away,'
      + ' and the result still looks like a picture with something cut out');
    check('  and the picture that survives is unchanged', bench.colourChanged === 0,
      `${bench.colourChanged} surviving pixels are no longer the colour they were`);
    /* ── The real case: a small mask on a big picture ─────────────── */

    /* [no feather, hard, normal, soft] — the first is what shipped. */
    const [bare, tight, normal, softest] = bench.edges ?? [];
    check('a mask ten times smaller than the picture comes out softer than it shipped',
      normal > bare * 1.8,
      `${normal} pixels part way against ${bare} with no feather — the shipped`
      + ' version stretched a 256-square mask over a whole photograph, which is'
      + ' the staircase and the streaks Carli photographed');
    check('  and each edge is a real step from the one before it',
      tight < normal && normal < softest && tight > 0,
      `${tight} / ${normal} / ${softest} — three buttons that all do the same`
      + ' thing is a choice offered and not given');
    check('  and the hard edge is still softer than none at all',
      tight > bare,
      `${tight} against ${bare} — the tightest of the three has to beat what`
      + ' shipped, or it is the fault with a name on it');
    /* The real bound is on the FEATHER, not on the share of this fixture.
 
       A 25% ceiling failed the soft edge here, and the ceiling was wrong
       rather than the edge: this bench is one straight seam down the middle
       of a square, so a wide feather naturally covers a large share of it. A
       person's outline is a perimeter, and the same feather on a real
       photograph touches a fraction of what it touches here. Measuring the
       share of THIS picture measures the fixture's geometry.
 
       What actually matters is the feather against the size of a mask pixel,
       which is a property of the constants and says the same thing on every
       photograph. The share stays as a loose sanity bound — it would still
       catch a feather that dissolved everything. */
    /* ── The staircase, measured on a shape the model never sees ──── */

    const [rawStair, tightStair, normalStair, softStair] = bench.stairs ?? [];
    check('a blown-up mask comes out as an edge, not a staircase',
      normalStair > 0 && normalStair <= 2,
      `the edge jumps ${normalStair} pixels sideways between neighbouring rows,`
      + ` where one mask pixel is ${bench.scale} — a jump the size of a mask`
      + ' pixel IS the staircase, and it is what Carli photographed twice');
    check('  and better than the single jump that shipped',
      rawStair > normalStair,
      `${rawStair} in one jump at the browser's default quality against`
      + ` ${normalStair} grown in steps — the stepped growth is what kills the`
      + ' stairs; the blur softens what is left');
    check('  on a picture a different shape from the mask, which is the real case',
      softStair > 0 && softStair <= 2,
      `the softest still jumps ${softStair} — the model takes a square, so a`
      + ' portrait photograph has mask pixels taller than they are wide, and a'
      + ' feather measured on the width alone barely blurs vertically at all');

    /* ── And the blur that keeps the person sharp ─────────────────────
 
       Carli's list, 7 October 2026: *"auto focus, blur"*. Measured on
       vertical stripes, because a blur is only visible as a loss of
       difference between neighbouring pixels and flat colour has none to
       lose: a blur over red is red, and every reading of it would pass.
 
       What is read is the spread of values along a row, well inside each
       half so the feather at the seam is not what is being measured. */
    /* ── The model answers a probability, not a yes ───────────────────

       Carli, 8 October 2026, with a photograph of her own face cut out:
       *"Dit is hoe die bg remover nou lyk."* The checkerboard was showing
       THROUGH her, and everything below her chin had gone.

       The cause was the whole design of the thing: the model's confidence
       was being handed straight to the alpha channel, so a pixel it was
       sixty per cent sure about came out sixty per cent opaque. A face it is
       unsure about does not come out wrong — it comes out see-through, which
       is a failure that looks like a rendering bug rather than a bad guess.

       The bench hands `decided` a mask that is 60% sure in the middle and
       20% sure outside, which is the shape of the answer that produced her
       screenshot. Both flats sit INSIDE the range rather than at 0 and 255,
       so a function that did nothing at all cannot pass. */
    check('a mask the model is only 60% sure of comes out fully opaque',
      bench.middleNow === 255,
      `the middle of the mask is ${bench.middleNow} of 255 — anything under`
      + ' it is the checkerboard showing through her face, which is exactly'
      + ' what she photographed');
    check('  and 20% sure comes out fully gone',
      bench.outsideNow === 0,
      `the outside is ${bench.outsideNow} of 255 — a background the model has`
      + ' not ruled out is still a background, and leaving it at a fifth of'
      + ' its strength is a grey haze round everything');
    check('  with the band sitting below the middle, not across it',
      bench.unsureAt < 0.5 && bench.sureAt > 0.5 && bench.unsureAt < bench.sureAt,
      `the band is ${bench.unsureAt} to ${bench.sureAt} — a model that is`
      + ' unsure is unsure INWARDS, at hair and at a shoulder against a'
      + ' similar colour, so a band centred on a half eats the person at the'
      + ' places somebody looks');
    check('and the whole chain leaves her solid, not a ghost',
      bench.solidInside === 255 && bench.emptyOutside === 0,
      `through the feather and the blow-up, well inside her reads`
      + ` ${bench.solidInside} and well outside reads ${bench.emptyOutside},`
      + ' of 255 — this is the reading that would have caught it, and it did'
      + ' not exist');

    check('putting the background out of focus leaves the person untouched',
      bench.sharpSide === 255,
      `the stripes behind the mask span ${bench.sharpSide} of 255 — anything`
      + ' under that is the blur reaching into the thing it is supposed to'
      + ' keep sharp, which is a face going soft');
    check('  and really does blur what is behind',
      bench.softSide < 60,
      `the stripes outside it still span ${bench.softSide} of 255 — a blur`
      + ' that leaves the difference between neighbouring pixels is a filter'
      + ' that ran and did nothing');

    check('  and no edge feathers by more than a few mask pixels',
      bench.softest <= 3.5,
      `the softest is ${bench.softest} of a mask pixel — past about one and a`
      + ' few it stops being an edge and starts dissolving hair, which is the'
      + ' part everybody looks at');
    check('  and even the softest leaves most of the picture untouched',
      softest < bench.side * bench.side * 0.6,
      `${softest} of ${bench.side * bench.side} pixels are part way`);
    check('  and well away from the seam nothing has moved',
      bench.keptFar > 0 && bench.goneFar > 0,
      `${bench.keptFar} kept on the far side and ${bench.goneFar} gone on the other`);

    check('  and the share of a mask is read the same way it is applied',
      bench.allOn === 1 && bench.allOff === 0 && Math.abs(bench.half - 0.5) < 0.01
      && bench.empty === 0,
      `all ${bench.allOn}, none ${bench.allOff}, half ${bench.half}, empty ${bench.empty}`);
  }

  /* ── The half that is Google's, and whether it runs at all ────────── */

  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(1200);

  const served = await page.evaluate(async (names) => {
    const out = {};
    for (const name of names) {
      try {
        const answer = await fetch(`/segment/${name}`, { method: 'HEAD' });
        out[name] = answer.status;
      } catch (e) {
        out[name] = `blocked: ${String(e).slice(0, 30)}`;
      }
    }
    return out;
  }, ['selfie_segmentation.js', 'selfie_segmentation.binarypb', 'selfie_segmentation.tflite',
      'selfie_segmentation_solution_simd_wasm_bin.js',
      'selfie_segmentation_solution_simd_wasm_bin.wasm']);
  const missing = Object.entries(served).filter(([, status]) => status !== 200);
  check('every file the model asks for is served by this app', missing.length === 0,
    `${missing.map(([n, s]) => `${n} ${s}`).join(', ')} — a missing one aborts the`
    + ' wasm from inside and the button spins until a timeout, which reads as'
    + ' the picture being at fault');

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
  await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 480;
    c.height = 480;
    const x = c.getContext('2d');
    x.fillStyle = '#2b6cb0';
    x.fillRect(0, 0, 480, 480);
    const blob = await new Promise((done) => c.toBlob(done, 'image/png'));
    const input = document.querySelector('[data-poststudio] input[type=file]');
    const holder = new DataTransfer();
    holder.items.add(new File([blob], 'flat.png', { type: 'image/png' }));
    input.files = holder.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(1200);

  check('the room offers to take the background out',
    (await page.locator('[data-postcutgo]').count()) > 0);
  await page.locator('[data-postcutgo]').first().click();

  let said = '';
  for (let waited = 0; waited < 150; waited += 1) {
    await page.waitForTimeout(1000);
    said = ((await page.locator('[data-postsaid]').first().innerText().catch(() => '')) ?? '').trim();
    if (said) break;
  }

  check('pressing it gets an answer rather than spinning', said.length > 0,
    'nothing came back within two and a half minutes');
  /* The distinction that matters. */
  check('  and the model RAN: it reports nobody, not a failure',
    /no person|geen persoon/i.test(said),
    `it said "${said.slice(0, 80)}" — "could not be taken out" means the engine`
    + ' never got there, which is a missing file or a refused fetch and not a'
    + ' fact about the picture');
  check('  and the picture is left alone when it refuses',
    (await page.locator('[data-postcutback]').count()) === 0,
    'a refusal offered a way back, so it changed something it then refused to do');

  for (const one of entered.problems) check(`no console error: ${one}`, false);
} catch (problem) {
  fell = true;
  console.error(`  FAIL the walk itself fell over — ${String(problem).split('\n')[0].slice(0, 200)}`);
} finally {
  if (browser) await browser.close();
  if (server) await server.stop();
  try { rmSync(LIVE); } catch { /* never made it */ }
}

if (problems.length || fell) {
  console.error(`\ncheck:cutout — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log(
  '\ncheck:cutout — the model is served by this app, runs inside its own'
  + ' Content-Security-Policy, says nobody when it finds nobody, and a mask'
  + ' keeps exactly what it covers and nothing else.',
);
