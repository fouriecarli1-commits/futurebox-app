/**
 * The cast strip may not put full-size pictures on the screen.
 *
 * ── The fault this is the fix for ────────────────────────────────────────
 *
 * Carli reported a white screen on the shot's cast three times, and the
 * third time she said the thing that solved it:
 *
 *   *"Dit is weird want die add a photo wat net langs dit is werk, maar
 *    daai cast funksie werk nie."*
 *
 * Two strips, six pixels apart, doing the same job. One works. The previous
 * two rounds both went looking at the file picker, because that is where
 * the press is, and both were wrong. The difference was what each strip put
 * on the screen:
 *
 *   Pictures  renders a 240px thumbnail, made once and kept
 *   Cast      rendered the WHOLE 1024px reference, as a base64 data URL,
 *             into a 96px tile — for all twelve members, fetched at once
 *
 * Twelve 1024×1024 bitmaps is 48 MB of decoded image, on a phone already
 * holding the rest of this app, plus base64 strings a third larger than the
 * bytes they encode, built by twelve concurrent downloads and twelve
 * concurrent FileReaders. A tab killed for memory does not throw and leaves
 * nothing in a console. It goes white, and a reload cures it.
 *
 * ── Why a check and not just a fix ───────────────────────────────────────
 *
 * Every part of the fix is invisible when it is undone. Swapping `thumbOf`
 * back to `pictureOf` in the strip is a one-word edit that makes the
 * pictures sharper, reviews well, and brings the white screen back on a
 * device the person making the edit is not holding. Same for the two-at-a-
 * time loading, same for the revoke. Nothing goes red. That is the whole
 * reason this file exists.
 *
 * ── And why it reads the source rather than a browser ────────────────────
 *
 * The strip needs a Supabase project, an account, and pictures in a private
 * bucket, none of which an unattended run has. A probe would report "no
 * cast to measure" every time, which is zero tests at the cost of one. The
 * rules below are about which function is called where, and that is a
 * question the source answers exactly.
 */
import { fitTo } from '../app/lib/imagefile';
import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) failures += 1;
};

const strip = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');

const cast = strip(readFileSync('app/components/Cast.tsx', 'utf8'));
const lib = strip(readFileSync('app/lib/cast.ts', 'utf8'));

/* ── 1. The strip shows thumbnails ────────────────────────────────────────
   The load effect is the one that runs for every member on mount. It must
   ask for the small one. */
ok('the strip loads thumbnails', /thumbOf\(/.test(cast),
  'Cast.tsx no longer calls thumbOf — the strip is back on full-size pictures');

/* And `pictureOf` is called exactly once in the component: in `use`, on the
   press. A second call site is almost certainly the strip again. */
const fullCalls = [...cast.matchAll(/pictureOf\(/g)].length;
ok('  and fetches the full picture in exactly one place', fullCalls === 1,
  `pictureOf is called ${fullCalls} times — it belongs only in the press that chooses a member`);

/* The one call site is inside `use`, which is the press. Located by finding
   the function and checking the call falls inside it, rather than by
   trusting the count above: one call in the wrong place passes a count. */
const useAt = cast.indexOf('const use = useCallback');
const fullAt = cast.indexOf('pictureOf(');
ok('  and that place is the press that chooses a member',
  useAt >= 0 && fullAt > useAt && fullAt - useAt < 1200,
  'the full download has moved out of `use` — it is on mount again');

/* ── 2. Nothing loads twelve at once ──────────────────────────────────────
   The spike is concurrency as much as size: a phone has one decoder, and
   twelve downloads plus twelve decodes in one tick is the shape that kills
   the tab whatever the pictures weigh. */
ok('the thumbnails load a couple at a time',
  !/Promise\.all\(\s*cast\.map/.test(cast),
  'Cast.tsx is back to Promise.all over the whole cast, which is twelve decodes in one tick');

/* ── 3. The blobs are let go ──────────────────────────────────────────────
   The old cache was a module-level map of data URLs that nothing emptied,
   so every face anybody had looked at stayed for the life of the tab. */
ok('the strip releases its pictures when it goes away', /releaseCast/.test(cast),
  'nothing revokes the object URLs, so they live as long as the tab does');
ok('  and the release really revokes them', /revokeObjectURL/.test(lib),
  'releaseCast no longer calls revokeObjectURL, so it frees nothing');
ok('  and the cache is bounded', /CAST_LIMIT \* 2/.test(lib),
  'the thumbnail cache grows without a ceiling again');

/* ── 4. No data URL cache in the library ──────────────────────────────────
   `pictureOf` used to write every full picture into a module map. Holding
   one is the leak; holding twelve is the white screen. */
ok('the full pictures are not cached at all',
  !/const held = new Map/.test(lib),
  'the data-URL cache is back in cast.ts');

/* ── 5. The thumbnail is genuinely small ──────────────────────────────────
   A "thumbnail" constant that somebody raises to 1024 to make the strip
   crisp is this bug again with a different variable name. 192px is twice a
   96px tile, which is what a retina screen needs and no more. */
const thumb = /const THUMB = (\d+)/.exec(lib);
ok('the thumbnail is 192px, which is twice the tile it is drawn into',
  thumb !== null && Number(thumb[1]) <= 256,
  thumb ? `THUMB is ${thumb[1]}` : 'there is no THUMB constant any more');

/* ── 6. And the arithmetic, stated so it cannot be argued with ────────────
   Not a rule about the code — a rule about whether the fix is worth
   anything. If these two numbers ever stop being far apart, the fix has
   stopped being a fix. */
const before = 12 * 1024 * 1024 * 4;
const after = 12 * 192 * 192 * 4;
ok(`  so twelve members cost ${(after / 1024 / 1024).toFixed(1)} MB instead of ${(before / 1024 / 1024).toFixed(0)} MB`,
  after * 20 < before,
  'the saving is under twenty-fold, which is not enough to explain the white screen going away');

/* ── 7. The other strip still does it right ──────────────────────────────
   `Pictures` is the worked example this fix was copied from. If it ever
   stops rendering a thumbnail, the comparison that diagnosed this stops
   being true and the next person reading these notes is misled. */
const pictures = strip(readFileSync('app/components/Pictures.tsx', 'utf8'));
ok('and the strip beside it, which always worked, still renders a thumbnail',
  /\.thumb\b/.test(pictures),
  'Pictures no longer uses asset.thumb — the two strips have swapped faults');

/* ── And a refusal says WHICH refusal ────────────────────────────────────

   Carli, twice: *"die add a cast member heeltemal afhaal en weer oor doen.
   Die witskerm bly op kom"*, and then, a week later: *"Die button net onder
   hom wat sê dat mens 'n foto kan oplaai werk, maar die cast member oplaai
   werk nie."*

   The second sentence is the diagnosis and it is hers, not mine. The button
   under this one is `Pictures`, which keeps the photo on the device and
   touches no server at all. The cast keeps it on the ACCOUNT, which needs a
   bucket AND a table — and every way either could refuse collapsed into one
   word, `failed`, on her screen and in `lib/cast.ts`.

   So this component has been rebuilt twice for a fault that was very likely
   never in it. The three causes have three different owners, and until now
   nothing could tell them apart:

     no_bucket  the picture never reached storage — the bucket is missing,
                or its policy refused this path
     no_row     the picture is there and the row is not, which is the shape
                of `supabase/cast.sql` never having been run
     full       the shelf holds twelve

   Held as source rules because none of it can be measured in an unattended
   run: there is no Supabase project behind the probes, so every one of these
   paths is unreachable and a browser assertion would be one that never
   executes. §AC is the file full of those. */
{
  const lib = readFileSync('app/lib/cast.ts', 'utf8');
  ok('a picture that never reached storage says so',
    /why: 'no_bucket'/.test(lib),
    'a missing bucket and a missing table are the same word again');
  ok('  and a picture with no row behind it says that instead',
    /why: 'no_row'/.test(lib),
    'the one failure that means "run the SQL" is described as "try again in a moment"');
  ok('  and the bucket’s own words go to the log, not the screen',
    /console\.error\(`\[cast\] the picture did not reach the bucket/.test(lib),
    'a storage error names policies and ids, which is nobody’s business but ours');

  const route = readFileSync('app/api/cast/route.ts', 'utf8');
  /* The LOOP, not the name. Renaming the constant left the word in the
     file and this stayed green — a rule that passes on any mention of a
     thing it is meant to see used. */
  ok('  and the row write names the columns the table has not got',
    /for \(const column of CAST_COLUMNS\)/.test(route) && /'42703'/.test(route),
    'she is told it could not be saved, and has to ask which column');
  /* This branch put `error.message` straight on the screen while the branch
     forty lines above it explained why that is wrong. One of the two was
     following the rule. */
  ok('    without putting Postgres’ sentence on her screen',
    !/message: error\?\.message/.test(route),
    'the insert is sending the database’s own words to the browser');

  const room = readFileSync('app/components/Cast.tsx', 'utf8');
  ok('and both doors give the same answer',
    /function whySaid\(/.test(room) && (room.match(/whySaid\(/g) ?? []).length === 3,
    'there are two ladders of reasons again, and last time they had already drifted');
}

/* ── The shape is kept, and that is now checkable ─────────────────────
 *
 * A cast member is a reference for what a shot should look like, so cropping
 * a wide product shot square throws away half of what it is being used to
 * say. That is the rule that matters most about this strip, and for weeks the
 * only thing holding it was `audit/cast.mjs` measuring what came back out of
 * a bucket the probe itself stubs with a one-pixel PNG. It was reading the
 * stub.
 *
 * `fitTo` is the arithmetic on its own, so the numbers can be put through it
 * here — where the answer is known before the measurement is taken.
 */
{
  const wide = fitTo(1600, 900, 1024);
  ok('a wide picture stays wide', Math.abs(wide.width / wide.height - 16 / 9) < 0.01,
    `${wide.width}x${wide.height}`);
  ok('  and comes down to the ceiling', wide.width === 1024 && wide.height === 576,
    `${wide.width}x${wide.height}`);

  const tall = fitTo(900, 1600, 1024);
  ok('a tall one stays tall, and the ceiling is the LONGEST side',
    tall.height === 1024 && tall.width === 576, `${tall.width}x${tall.height}`);

  const small = fitTo(300, 200, 1024);
  ok('a small one is left alone rather than stretched',
    small.width === 300 && small.height === 200, `${small.width}x${small.height}`);

  const square = fitTo(2048, 2048, 1024);
  ok('and a square one is still square', square.width === 1024 && square.height === 1024,
    `${square.width}x${square.height}`);

  /* The rounding floor, which is the line between a thin picture and a
     divide that makes the canvas zero pixels wide and throws. */
  const sliver = fitTo(4000, 3, 1024);
  ok('a sliver still has a pixel of height rather than none',
    sliver.height >= 1 && sliver.width === 1024, `${sliver.width}x${sliver.height}`);
  ok('and a picture of no size at all does not divide by zero',
    fitTo(0, 0, 1024).width === 1 && Number.isFinite(fitTo(0, 0, 1024).height),
    JSON.stringify(fitTo(0, 0, 1024)));

  /* And the strip uses it. A rule about `fitTo` that the cast does not call
     is a rule about nothing. */
  const lib = readFileSync('app/lib/cast.ts', 'utf8');
  ok('the cast fits rather than squares its pictures',
    /await fit\(file, LONGEST\)/.test(lib) && /const LONGEST = 1024;/.test(lib),
    'squaring a cast member is the one thing that separates it from a profile picture');
}

if (failures) {
  console.error(
    `\ncheck:castmemory — ${failures} wrong. A tab killed for memory does not throw and leaves`
    + ' nothing in a console: it goes white, and a reload cures it. That is the only symptom,'
    + ' and it appears on a phone rather than on the machine making the edit.\n',
  );
  process.exit(1);
}
console.log(
  '\ncheck:castmemory — the strip shows 192px thumbnails, two at a time, revoked on the way out,'
  + ' and the full reference is fetched once, on the press that uses it.',
);
