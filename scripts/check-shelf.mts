/**
 * A picture kept in the app has no way out of it.
 *
 *   npm run check:shelf
 *
 * ── What this guards ─────────────────────────────────────────────────────
 *
 * Carli, 8 October 2026: *"Daar moet ook 'n opsie wees om 'n foto binne die
 * app te bêre. Daar moet dalk 'n gallery in channel gestoor word. Dan
 * wanneer mens video editor gebruik is dit een van die plekke wat geroep
 * word waaruit mens kan kies."*
 *
 * The photo editor now writes to `lib/assets.ts` — the same twenty-picture
 * shelf the brand kit, the start frame and the video canvas already pick
 * from — and it does it for nothing. Everything in that room is free; the
 * one press that spends is taking the picture OFF the device, and keeping it
 * on the shelf does not take it off anything.
 *
 * That is only true while the shelf has no way out. `Pictures.tsx` chooses,
 * renames, stars and deletes; the moment it learns to download, the free
 * keep IS the paid export with one extra step, and nothing would say so.
 * Nobody would notice either: the room would still look right and the
 * credits would quietly stop being charged.
 *
 * So this check is about an absence, and that is the hard kind to hold. An
 * absence has no line to point at — it has to be stated as a rule and the
 * rule has to be narrow enough to mean something.
 *
 * ── The rule ─────────────────────────────────────────────────────────────
 *
 *   1. Nothing in the shelf, the strip, or the gallery card may build a
 *      download: no `downloadBlob`, no `createObjectURL` into an anchor, no
 *      `a.download`, no `showSaveFilePicker`.
 *   2. The photo editor's free keep may not call the paid route, and its
 *      paid save may not be reachable without it. One `charge`, one press.
 *   3. The shelf's own cap is said on the screen, because a shelf that
 *      quietly drops a picture she kept is worse than a small one.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { KEEP } from '../app/lib/assets.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const code = (file: string): string => withoutComments(readFileSync(file, 'utf8'));

/* ── 1. No way out of the shelf ─────────────────────────────────────── */
const WAYS_OUT = [
  /downloadBlob\s*\(/,
  /\.download\s*=/,
  /showSaveFilePicker/,
  /createObjectURL/,
];
const SHELF = [
  'app/lib/assets.ts',
  'app/components/Pictures.tsx',
];
for (const file of SHELF) {
  const src = code(file);
  const found = WAYS_OUT.filter((one) => one.test(src)).map((one) => one.source);
  ok(`${file.split('/').pop()} gives no way to get the file off the device`,
    found.length === 0,
    `${found.join(', ')} — the keep is free because it keeps the picture HERE.`
    + ' A shelf that can hand the file back is the paid export with one extra'
    + ' step, and nothing on the screen would say so');
}

/* And the gallery card on the Channel, which is the one place the shelf is
   shown rather than picked from. */
const channel = code('app/components/Channel.tsx');
ok('the Channel shows the shelf',
  /data-chanpictures/.test(channel) && /<Pictures/.test(channel),
  'a shelf three rooms write to and no room can look at is a drawer with no'
  + ' handle: she had no way to know what was on it or that it was there');

/* ── 2. One charge, one press ───────────────────────────────────────── */
const studio = code('app/components/PostStudio.tsx');
const keep = studio.slice(studio.indexOf('const keepInApp'), studio.indexOf('const intoFilm'));
ok('the free keep does not touch the paid route',
  keep.length > 200 && !/\/api\/post\/export/.test(keep) && !/paidPicture/.test(keep),
  `${keep.length} characters read — a free press that charges, or a paid`
  + ' press that does not, is the one fault in this room that costs somebody'
  + ' money');
ok('  and it really writes to the shelf',
  /rememberAsset\s*\(/.test(keep),
  'a button that says it kept the picture and kept nothing is the shape of a'
  + ' feature nobody checked');
ok('  and the paid save is still the only thing that charges',
  (studio.match(/\/api\/post\/export/g) ?? []).length === 1,
  'two routes to the till is two prices to keep in step');
ok('  and the room says which press costs and which does not',
  /post\.keepHereWhy/.test(studio) && /post\.keepHere/.test(studio),
  'a free button beside a paid one with nothing between them reads as a'
  + ' mistake, and the mistake she would assume is that the free one is'
  + ' broken');

/* ── 3. The cutting room picks from the same shelf ──────────────────── */
const room = code('app/components/VideoEditor.tsx');
ok('the cutting room picks a logo off the shelf as well as off the device',
  /data-editormarkshelf/.test(room) && /<Pictures/.test(room),
  'the logo slot took a file input and nothing else, which sends her back to'
  + ' the file manager for the same logo on every film — and a logo is the'
  + ' one picture in this app that gets used on everything');

/* ── 4. The cap is said out loud ────────────────────────────────────── */
const strip = readFileSync('app/components/Pictures.tsx', 'utf8');
ok(`the strip says how many it keeps (${KEEP})`,
  new RegExp(`\\bKEEP\\b`).test(strip),
  'a shelf that quietly drops a picture she kept is worse than a small one'
  + ' that says so');

if (bad) {
  console.error(`\ncheck:shelf — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:shelf — a picture kept in the app costs nothing and cannot be got'
  + ' off the device from the shelf, the paid save is still the only press'
  + ' that charges, and the Channel and the cutting room both reach the same'
  + ' twenty pictures.',
);
