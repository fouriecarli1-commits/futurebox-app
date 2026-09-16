/**
 * Every photograph off a device goes through one guard, or the tab dies.
 *
 * ── The fault this exists to prevent ─────────────────────────────────────
 *
 * Carli, 14 September 2026, choosing a photo on her phone: *"Toe ek 'n foto
 * kies op my foon maak die skerm so blank."* `app/lib/imagefile.ts` was
 * written that day, and its header explains the mechanism: a modern phone's
 * camera writes a 200-megapixel JPEG that is ten or twelve megabytes on disk.
 * Any guard written in BYTES waves it through, and the browser is then asked
 * for 200,000,000 pixels x 4 bytes — eight hundred megabytes in one
 * allocation. The tab is not thrown from. It is killed, and a killed tab is a
 * white screen with nothing in the console, because whatever would have
 * logged the error died with it.
 *
 * So `imagefile.ts` reads the dimensions out of the file's own header BEFORE
 * any decoder is asked for anything, refuses by pixels, and scales during the
 * decode rather than after.
 *
 * ── Why a check and not a code review ────────────────────────────────────
 *
 * Because it was already fixed once and it came back. The guard was applied
 * to `avatar.ts` and `cast.ts` and nobody moved `Pictures.tsx` onto it — so
 * the shot's own-photo strip kept its `FileReader`, its `new Image()` and a
 * four-megabyte ceiling on bytes. Carli reported the white page a SECOND
 * time, on 16 September, with the word "steeds", and the reason two reports
 * produced no fix is that they were two different code paths and only one of
 * them had been looked at.
 *
 * A rule that lives in somebody's memory is a rule that holds until the next
 * component. This is the rule: if a file input accepts images, the file it
 * sits in reaches `lib/imagefile`. Nothing about how — `fit`, `square` or a
 * re-export through `lib/cast` all count — only that the raw file never meets
 * a decoder without passing the guard first.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
const ok = (label: string, good: boolean, detail = '') => {
  console.log(`  ${good ? 'ok  ' : '✗   '} ${label}${detail && !good ? ` — ${detail}` : ''}`);
  if (!good) failures += 1;
};

/** Every .tsx under app/, however deep. */
function sources(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) sources(path, found);
    else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) found.push(path);
  }
  return found;
}

/* A file input that takes pictures. Matched on the accept rather than on the
   input, because a component may take audio or video and has no business
   here — `Storyboard` accepts `audio/*` and is correctly not on this list. */
const TAKES_PICTURES = /accept=\{?["']?[^"'}\n]*image\//;
/* Or names the shared list, which is the same thing said properly. */
const NAMES_ACCEPTS = /accept=\{ACCEPTS\}|accept=\{IMAGE_ACCEPTS\}/;

/** Reaching the guard, directly or through a module that wraps it. */
const GUARDED = /from '(\.\.?\/)+lib\/imagefile'|from '\.\/imagefile'|from '(\.\.?\/)+lib\/cast'|from '(\.\.?\/)+lib\/avatar'/;

const offenders: string[] = [];
let looked = 0;
for (const path of sources('app')) {
  const source = readFileSync(path, 'utf8');
  if (!/type="file"/.test(source)) continue;
  if (!TAKES_PICTURES.test(source) && !NAMES_ACCEPTS.test(source)) continue;
  looked += 1;
  if (!GUARDED.test(source)) offenders.push(path);
}

ok('every picture input in the app was found', looked > 0, `${looked} found`);
ok(
  'and each one goes through the megapixel guard',
  offenders.length === 0,
  offenders.join(', '),
);

/* And the guard itself still guards by pixels. A ceiling that quietly became
   a byte count again would pass everything above and prevent nothing. */
const guard = readFileSync('app/lib/imagefile.ts', 'utf8');
ok(
  'and the guard still refuses by pixels rather than by bytes',
  /MAX_PIXELS/.test(guard) && /width \* .*height > MAX_PIXELS|height > MAX_PIXELS/.test(guard),
  'imagefile.ts no longer compares a pixel count against MAX_PIXELS',
);

if (failures) {
  console.error(
    `\ncheck:photopath — ${failures} problem(s).\n\n` +
      'A photograph taken on a modern phone is two hundred megapixels and ten\n' +
      'megabytes. A byte ceiling lets it through and the decode kills the tab,\n' +
      'which is a white screen with nothing in the console. Route it through\n' +
      "`app/lib/imagefile.ts` — `fit` is what Cast and this app's other picture\n" +
      'inputs use.\n',
  );
  process.exit(1);
}
console.log('\ncheck:photopath — every picture off a device passes the megapixel guard.');
