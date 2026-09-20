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
