/**
 * The file a post comes out as, held to the things that would reach her as
 * a broken download.
 *
 *   npm run check:postfile
 *
 * Four of them, and each one is a way an export goes wrong silently — the
 * file saves, the room says "Saved to your device", and what is on the
 * device is not what was on the screen:
 *
 *   1. **A type `toBlob` does not know.** An unrecognised type is not an
 *      error: the canvas quietly writes a PNG and the file is called .jpg.
 *      Every operating system then opens it by the name and shows a broken
 *      picture.
 *   2. **A name that does not match the file.** Same ending, same result.
 *   3. **A quality on a format that has none**, or none on a format that
 *      needs one — a JPEG with no quality is written at the browser's own
 *      default, which differs between browsers, so the same post is a
 *      different size on her phone and on her laptop.
 *   4. **A see-through post saved as a JPEG.** The format has three
 *      channels. There is no flag and no quality that brings transparency
 *      back, so the only question is whether the room warns her first.
 */
import {
  FORMATS, SCALES, formatOf, holdsClear, nameFor, sane, type FileKind,
} from '../app/lib/postfile.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

/* ── 1. Only the two types every browser can really write ─────────────
 
   `toBlob` takes a type and, given one it does not know, falls back to PNG
   WITHOUT SAYING SO. So a typo here does not fail, it ships a PNG named
   .webp. The two below are the only two the HTML specification requires
   every browser to support. */
const CAN = ['image/png', 'image/jpeg'];
const wrong = FORMATS.filter((one) => !CAN.includes(one.type));
ok('every format asks for a type the canvas really writes',
  wrong.length === 0,
  `${wrong.map((one) => `${one.id} → ${one.type}`).join(', ')} — toBlob writes a`
  + ' PNG for anything it does not know, and says nothing');

/* ── 2. The name ends in the thing the file actually is ──────────────── */
let named: string | null = null;
for (const one of FORMATS) {
  for (const scale of SCALES) {
    const name = nameFor('story', one.id, scale);
    if (!name.endsWith(`.${one.ext}`)) named ??= `${one.id} at ${scale}x → ${name}`;
    if (scale !== 1 && !name.includes(`${scale}x`)) named ??= `${one.id} at ${scale}x → ${name}`;
    if (scale === 1 && name.includes('1x')) named ??= `${one.id} at 1x → ${name}`;
  }
}
ok('  and the file is named after what it is', named === null, named ?? '');
ok('  and the ending matches the type',
  FORMATS.every((one) => (one.type === 'image/png') === (one.ext === 'png')),
  FORMATS.map((one) => `${one.ext}/${one.type}`).join(', '));

/* ── 3. A quality where there is one to set, and none where there is not ── */
ok('the lossy format sets its own quality',
  formatOf('jpg').quality !== undefined
  && formatOf('jpg').quality! > 0.85 && formatOf('jpg').quality! < 1,
  `${formatOf('jpg').quality} — left unset, each browser picks its own, so the`
  + ' same post is a different file on her phone and on her laptop');
ok('  and the lossless one does not pretend to have one',
  formatOf('png').quality === undefined,
  'a quality on a PNG is a number that does nothing, which is a number'
  + ' somebody will one day try to tune');

/* ── 4. Transparency, which is the one that reaches her ─────────────── */
ok('a see-through post cannot be called safe as a JPEG',
  holdsClear('jpg', true) === false,
  'JPEG has three channels; there is no setting that brings the fourth back');
ok('  and is safe as a PNG', holdsClear('png', true) === true);
ok('  and a post with a background behind it is safe either way',
  holdsClear('jpg', false) && holdsClear('png', false));

/* And the scale cannot be asked for in a size nobody meant. */
ok('the size is one of the two offered, whatever is asked for',
  [0, 1, 2, 3, 9, -1, Number.NaN].every((n) => (SCALES as readonly number[]).includes(sane(n))),
  [0, 1, 2, 3, 9, -1, Number.NaN].map((n) => `${n}→${sane(n)}`).join(' '));

/* An id nobody offers still answers with a real format rather than
   undefined, because the alternative is a crash on the one press that has
   already been paid for. */
ok('an id that is not offered still answers with a usable format',
  formatOf('webp' as FileKind).type === 'image/png',
  'the charge is taken before the file is written, so this cannot throw');

if (bad) {
  console.error(`\ncheck:postfile — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:postfile — every format the room offers is one the canvas really'
  + ' writes, named after what it is, and a see-through post cannot be called'
  + ' safe as a JPEG.',
);
