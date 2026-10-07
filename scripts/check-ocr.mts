/**
 * The reader is ours, and nothing about it leaves this app.
 *
 * ── What the browser walk proves, and what it cannot ─────────────────────
 *
 * `audit/grabtext.mjs` runs the whole thing under a real `next start` and
 * reads FUTUREBOX STUDIO out of a picture. That is the proof. It takes a
 * minute, it needs Chromium, and it is the only thing that can tell a
 * working engine from a 6.6 MB download that answers nothing.
 *
 * This is the cheap half, and it holds the three things that would make the
 * walk fail in a way somebody might then "fix" by pointing at a CDN:
 *
 *   the files are here          6.6 MB in `public/ocr/`, ours to serve
 *   nothing points off-site     `connect-src 'self'` would refuse it
 *   the worker is not a blob    `default-src 'self'` would refuse that too
 *
 * ── And the one that is about money ──────────────────────────────────────
 *
 * The import has to stay inside the function. Hoisted to the top of the
 * file, `tesseract.js` joins the bundle every member downloads on their
 * first visit to the app — including everybody who never grabs any text.
 * That is not a credit cost, it is her members' data, and it is the sort of
 * regression that is invisible in every test except a byte count.
 *
 *   npm run check:ocr
 */
import { existsSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';
import { READABLE } from '../app/lib/ocr';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const HERE = join('public', 'ocr');

/** Every file the reader asks the server for, and the least it can weigh. */
const NEEDED: ReadonlyArray<readonly [string, number]> = [
  ['worker.min.js', 50_000],
  ['tesseract-core-simd-lstm.js', 50_000],
  ['tesseract-core-simd-lstm.wasm', 1_000_000],
  ...READABLE.map((lang) => [`${lang}.traineddata.gz`, 500_000] as const),
];

for (const [name, least] of NEEDED) {
  const path = join(HERE, name);
  const there = existsSync(path);
  /* The SIZE as well as the name. A Git LFS pointer, a failed download or a
     truncated copy is a file that exists and is two hundred bytes, and the
     engine's answer to that is a worker that never replies. */
  const bytes = there ? statSync(path).size : 0;
  ok(`  public/ocr/${name} is served by this app (${(bytes / 1_000_000).toFixed(2)} MB)`,
    there && bytes >= least,
    there ? `only ${bytes} bytes — a pointer or a truncated copy` : 'missing');
}

const lib = withoutComments(readFileSync(join('app', 'lib', 'ocr.ts'), 'utf8'));

/* ── Nothing points off this app ─────────────────────────────────────────── */

const offsite = /https?:\/\/(?!\/)[^'"`\s]+/.exec(lib);
ok('the reader fetches nothing from anywhere but this app', offsite === null,
  `${offsite?.[0] ?? ''} — this app's connect-src is 'self' and Supabase, so a`
  + ' CDN is refused by the browser with a console line nobody reads and a'
  + ' button that spins for ever');
/* Each of the three by name, not a count of mentions.
 
   The first version counted occurrences of the directory and wanted four,
   which the code never had: `langPath: HERE` carries no braces, so three
   mentions is correct and the rule was wrong about the code. Counting is
   also the weaker question — what matters is that no ONE of the three is
   left on its default, because any single default goes to a CDN and is
   refused on its own. */
const PATHS = ['workerPath', 'corePath', 'langPath'] as const;
const adrift = PATHS.filter((one) => {
  const line = new RegExp(`${one}:\\s*([^,\n]+)`).exec(lib);
  return !line || !/HERE/.test(line[1]);
});
ok('  and the worker, the core and the language files all come from /ocr',
  adrift.length === 0,
  `${adrift.join(', ')} left on the default — which is a CDN, refused on its`
  + ' own by this app\u2019s connect-src');

/* ── The worker is not a blob ────────────────────────────────────────────── */

ok('  and the worker is not wrapped in a blob URL',
  /workerBlobURL:\s*false/.test(lib),
  "default-src 'self' does not allow blob: workers, and this is the one line"
  + ' without which none of it runs at all. Proved by turning it back on:'
  + ' "Refused to create a worker from blob:"');

/* ── Nobody pays for it who does not use it ──────────────────────────────── */

ok('the engine is loaded only when the button is pressed',
  /await import\('tesseract\.js'\)/.test(lib)
  && !/^import .*tesseract\.js/m.test(lib),
  'hoisted to the top of the file it joins the bundle every member downloads'
  + ' on their first visit, including everybody who never grabs any text');

const screen = withoutComments(readFileSync(join('app', 'components', 'PostStudio.tsx'), 'utf8'));
ok('  and the screen imports the wrapper, not the engine',
  /from '\.\.\/lib\/ocr'/.test(screen) && !/tesseract/i.test(screen),
  'naming tesseract in a component is how a dynamic import becomes a static one');

/* ── It reads the picture, not the canvas ────────────────────────────────── */

ok('it reads the picture she brought in, not the canvas',
  /readWords\(picture,/.test(screen),
  'the canvas carries her own words, her crop and her blur — handing that to'
  + ' an engine that reads letters would have it read her captions back to her');

/* ── Both languages, like everything else here ───────────────────────────── */

ok(`both languages are offered (${READABLE.length})`, READABLE.length >= 2
  && READABLE.includes('afr'), READABLE.join(', '));

if (bad) {
  console.error(`\ncheck:ocr — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:ocr — the reader is served by this app, points nowhere else, is not a'
  + ' blob worker, and is downloaded only by the people who press the button.',
);
