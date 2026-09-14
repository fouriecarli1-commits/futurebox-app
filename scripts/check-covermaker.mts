/**
 * The sleeve says it is kept, keeps nothing over the artwork, and can come off.
 *
 * ── The three faults ─────────────────────────────────────────────────────
 *
 * Carli, 14 September 2026: *"daar is nerens 'n keep knoppie nie wat jou help
 * om te sê dat jy die image kies en save as cover art, die anther button gaan
 * lê ook agter daai cover art image… en dalk 'n remove button."*
 *
 * The first is the interesting one, because the button she went looking for
 * should not exist. A cover is written to storage the moment it is drawn and
 * the next page that opens finds it — nothing was ever unsaved. What was
 * missing is any sentence saying so, and a screen that saves in silence is
 * indistinguishable from one that did nothing. So what this holds is the
 * sentence, not a button.
 *
 * ── Not `check:sleeves`, which is next door ──────────────────────────────
 *
 * That one holds that a sleeve somebody made SHOWS wherever the song shows —
 * the channel grid, the live room, both full-screen players. This one is
 * about the panel that MAKES it, and the two are deliberately apart: the
 * maker is mounted once and the showing is on five screens, which is the
 * whole reason `check:sleeves` exists.
 *
 * ── Why a source check and not a probe ───────────────────────────────────
 *
 * Because drawing a real cover needs an image engine and a key, and neither
 * exists on this machine or in CI. What CAN be held without either is the
 * shape of the screen once there is one: nothing positioned over the picture,
 * a line saying it is kept, a way to take it off, and a warning before a
 * press that destroys what is on screen.
 *
 * That is a smaller promise than a browser would make and it is written down
 * so nobody reads a green build as "the cover panel was looked at".
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const sleeve = readFileSync('app/components/Sleeve.tsx', 'utf8');
const route = readFileSync('app/api/cover/route.ts', 'utf8');
const words = readFileSync('app/lib/i18n.tsx', 'utf8');

/* ── Nothing on top of the picture ─────────────────────────────────────── */

/* The artwork's own tag, and then whether anything in this file is placed
   over it. `absolute` inside the panel is the shape that did it: the button
   sat at `bottom-2 right-2` on the one thing worth looking at. */
ok('the artwork is drawn', /<img[^>]*aspect-square/.test(sleeve.replace(/\n/g, " ")));
ok(
  'and nothing is positioned on top of it',
  !/className="[^"]*\babsolute\b[^"]*"/.test(sleeve),
  'a control placed over the cover covers whatever the picture put there',
);

/* ── It says it is kept ────────────────────────────────────────────────── */
ok("the screen says the cover is the song's now", /t\('cover\.kept'/.test(sleeve));
ok('and that line exists in both languages', /"cover\.kept":\s*\{\s*en:.*af:/.test(words));

/* ── It can come off ───────────────────────────────────────────────────── */
ok('there is a way to take it off', /t\('cover\.takeOff'/.test(sleeve));
ok('which calls DELETE rather than pretending', /method: 'DELETE'/.test(sleeve));
ok('and the route has a DELETE to call', /export async function DELETE\(/.test(route));

/* The path is derived from the caller, never taken from the request. This is
   the whole of why a delete cannot reach somebody else's file, so it is held
   rather than left to a reader to notice. */
ok(
  'and it deletes a path built from the caller, not one it was handed',
  /remove\(\[coverPath\(caller\.id, trackId\)\]\)/.test(route),
  'a delete that takes a path from the request is a delete of anybody’s file',
);

/* ── And "Another" is honest before the press ──────────────────────────── */
ok('Another says it replaces what is there', /t\('cover\.againWarns'/.test(sleeve));
ok(
  'and says what it costs, not only on the first one',
  (sleeve.match(/CREDITS\.cover/g) ?? []).length >= 2,
  'the price was on the first press and not on the repeat',
);

if (failures) {
  console.error(
    '\ncheck:covermaker — a cover is saved the moment it is drawn, so the screen has to SAY so;\n' +
      'nothing may sit over the artwork; there must be a way to take it off; and a press that\n' +
      'destroys the picture on screen must say so before it is pressed.\n',
  );
  process.exit(1);
}
console.log('\ncheck:covermaker — the cover says it is kept, carries nothing over it, and can be taken off.');
