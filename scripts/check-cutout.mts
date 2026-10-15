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

/* ── The model, 15 October 2026 ────────────────────────────────────────────
   The old selfie model was made for a webcam call and kept the microphone
   on her studio photograph ("Ek kan sien die BG remover werk ook nogsteeds
   nie"). The person-parts model is the one the remover runs now, from this
   app, with its engine copied out of the package at build time. */
const MODEL = 'selfie_multiclass_256x256.tflite';
const path = join(HERE, MODEL);
const bytes = existsSync(path) ? statSync(path).size : 0;
ok(`the person-parts model is served by this app (${(bytes / 1_000_000).toFixed(1)} MB)`,
  bytes > 10_000_000 && /selfie_multiclass_256x256\.tflite/.test(lib),
  bytes ? `only ${bytes} bytes` : `public/segment/${MODEL} is missing`);
ok('  and the old webcam model is gone, so nothing can quietly fall back to it',
  !/selfie_segmentation\.js|modelSelection/.test(lib));
const copy = readFileSync(join('scripts', 'nam-copy.mjs'), 'utf8');
ok('  its engine is copied into public/vision at build time',
  /tasks-vision\/wasm/.test(copy) && /public\/vision/.test(copy) && /const VISION = '\/vision'/.test(lib));
ok('  everything that is not background is kept',
  /confidenceMasks\?\.\[0\]/.test(lib) && /1 - sure\[i\]/.test(lib),
  'the multiclass model answers per part; keeping one part loses hair or clothes');

/* ── Nothing points off this app ─────────────────────────────────────────── */

const offsite = /https?:\/\/(?!\/)[^'"`\s]+/.exec(lib);
ok('the remover fetches nothing from anywhere but this app', offsite === null,
  `${offsite?.[0] ?? ''} — connect-src is 'self', so a CDN is refused`);
ok('  and the engine is told to fetch its own files from /vision',
  /forVisionTasks\(VISION\)/.test(lib) && /modelAssetPath: MODEL/.test(lib),
  'the loader asks for its own files by name and the default is a CDN');

/* ── It refuses rather than handing back an empty frame ──────────────────── */

ok('it refuses when it finds nobody', /why: 'nobody'/.test(lib) && ENOUGH > 0 && ENOUGH < 0.2,
  `ENOUGH is ${ENOUGH} — cutting a picture with no person in it leaves a frame`
  + ' that is entirely transparent, and on a dark phone screen that and a'
  + ' deleted picture look the same');
ok('  and it gives up rather than spinning for ever',
  /setTimeout\(\(\) => done\(null\), 60_000\)/.test(lib),
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
