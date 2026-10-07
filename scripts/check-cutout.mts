/**
 * The background remover is ours, and the files it asks for are here.
 *
 * ── The hour this is written to save ─────────────────────────────────────
 *
 * `audit/cutout.mjs` is the proof: it runs the model under a real `next
 * start` and reads the compositing off a bench page. It also takes four
 * minutes, because it builds twice.
 *
 * This is the cheap half, and it exists because of exactly one afternoon.
 * The remover shipped asking for `selfie_segmentation_landscape.tflite` — a
 * file that was never copied, because `modelSelection: 1` chooses the
 * landscape model and nothing said so. The server answered 404, the
 * WebAssembly aborted from inside itself, the callback never fired, and the
 * screen said *"the background could not be taken out of that picture"*,
 * which is honest and useless: it is not the picture, it is a missing file.
 *
 * So the rule below lists the files BY the model that chooses them. Change
 * the model number without copying its data and this says so in a second.
 *
 *   npm run check:cutout
 */
import { existsSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';
import { ENOUGH } from '../app/lib/cutout';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const HERE = join('public', 'segment');
const lib = withoutComments(readFileSync(join('app', 'lib', 'cutout.ts'), 'utf8'));

/** Which model is chosen, and therefore which data file is fetched. */
const chosen = /modelSelection:\s*(\d)/.exec(lib)?.[1] ?? '';
ok(`a model is chosen on purpose (${chosen || 'none'})`, chosen === '0' || chosen === '1',
  'the default is not written down, so the file it needs is not either');

/** 0 is the general model, 1 is the landscape one, and they load different data. */
const DATA = chosen === '1' ? 'selfie_segmentation_landscape.tflite' : 'selfie_segmentation.tflite';

const NEEDED: ReadonlyArray<readonly [string, number]> = [
  ['selfie_segmentation.js', 20_000],
  ['selfie_segmentation.binarypb', 100],
  [DATA, 100_000],
  ['selfie_segmentation_solution_simd_wasm_bin.js', 100_000],
  ['selfie_segmentation_solution_simd_wasm_bin.wasm', 1_000_000],
];

for (const [name, least] of NEEDED) {
  const path = join(HERE, name);
  const there = existsSync(path);
  const bytes = there ? statSync(path).size : 0;
  ok(`  public/segment/${name} is served by this app (${(bytes / 1_000_000).toFixed(2)} MB)`,
    there && bytes >= least,
    there ? `only ${bytes} bytes` : `missing — model ${chosen} asks for this one`);
}

/* ── Nothing points off this app ─────────────────────────────────────────── */

const offsite = /https?:\/\/(?!\/)[^'"`\s]+/.exec(lib);
ok('the remover fetches nothing from anywhere but this app', offsite === null,
  `${offsite?.[0] ?? ''} — connect-src is 'self', so a CDN is refused`);
ok('  and every file it asks for is sent to /segment',
  /locateFile:\s*\(file: string\) => `\$\{HERE\}\/\$\{file\}`/.test(lib),
  'the loader asks for its own files by name and the default is a CDN');

/* ── It is a script, not an import ───────────────────────────────────────── */

ok('the library is fetched as a script rather than imported',
  /document\.createElement\('script'\)/.test(lib) && !/import\(.?@mediapipe/.test(lib),
  'it is a Closure bundle that ends `Aa("SelfieSegmentation", nd)` — it'
  + ' attaches a global and exports nothing, so an import hands back an empty'
  + ' module and the `new` throws');

/* ── It refuses rather than handing back an empty frame ──────────────────── */

ok('it refuses when it finds nobody', /why: 'nobody'/.test(lib) && ENOUGH > 0 && ENOUGH < 0.2,
  `ENOUGH is ${ENOUGH} — cutting a picture with no person in it leaves a frame`
  + ' that is entirely transparent, and on a dark phone screen that and a'
  + ' deleted picture look the same');
ok('  and it gives up rather than spinning for ever',
  /setTimeout\(\(\) => done\(null\), 30_000\)/.test(lib),
  '`onResults` is a callback with no error path, so a model that loads and'
  + ' never answers would leave the button spinning');

const screen = withoutComments(readFileSync(join('app', 'components', 'PostStudio.tsx'), 'utf8'));
ok('  and the cut can be undone', /data-postcutback/.test(screen) && /setWhole\(picture\)/.test(screen),
  'a member who cuts a photograph and does not like it has nothing to go back'
  + ' to but the camera roll, and the file they picked may have been a crop');

if (bad) {
  console.error(`\ncheck:cutout — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:cutout — the remover is served by this app, asks only for files that'
  + ' are here, refuses rather than emptying a picture, and can be undone.',
);
