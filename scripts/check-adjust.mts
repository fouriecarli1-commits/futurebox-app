/**
 * The dials do something, and the ones that are missing are named.
 *
 * ── Why the second half matters as much as the first ─────────────────────
 *
 * Carli, 4 October 2026: *"kyk asb weer na al die foto's wat ek gestuur het. Om
 * seker te maak al die video editing tools is daar."*
 *
 * Her screenshots carry about twenty dials. Five of them are in this app. The
 * honest way to answer "are all the tools there" is not to add fifteen sliders
 * that do nothing — it is to say which fifteen are not here and why, in a place
 * that goes red when somebody adds one of them badly.
 *
 * So this reads both: that each dial is a real filter string the renderer will
 * honour, and that `videoadjust.ts` still names every one it does not carry.
 */
import {
  DIALS, NO_ADJUST, adjustCss, adjusted, gradeCss,
} from '../app/lib/videoadjust';
import { filterCss } from '../app/lib/videofilters';
import { readFileSync } from 'node:fs';
import { from } from './order.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

/* ── Nothing moved is nothing done ─────────────────────────────────────── */

ok('with nothing moved the dials add no filter at all',
  adjustCss(NO_ADJUST) === '' && adjustCss(undefined) === '' && adjustCss({}) === '',
  `"${adjustCss(NO_ADJUST)}" — a string of no-ops makes the browser run a filter`
  + ' pass over every frame to achieve nothing, which on a phone rendering in'
  + ' real time is the difference between a film that finishes and one that stutters');

/* And a dial resting while another is moved adds nothing of its own. The rule
   above is about the whole set; this is about each one, and it is the version
   that actually bites — a `brightness(1)` riding along beside a real
   `saturate(1.4)` is the same wasted pass, and the set is not empty so the
   first rule would never see it. */
ok('  and a dial left alone adds nothing beside one that was moved',
  adjustCss({ ...NO_ADJUST, colour: 1.4 }) === 'saturate(1.40)',
  `"${adjustCss({ ...NO_ADJUST, colour: 1.4 })}"`);

ok('  and nothing moved is reported as nothing moved',
  !adjusted(NO_ADJUST) && !adjusted(undefined) && adjusted({ bright: 1.2 }));

/* ── Each dial produces the filter it claims ───────────────────────────── */

const MAKES: Readonly<Record<string, RegExp>> = {
  bright: /brightness\(/,
  contrast: /contrast\(/,
  colour: /saturate\(/,
  warm: /hue-rotate\(/,
  sharp: /blur\(/,
};

for (const dial of DIALS) {
  /* Moved to the far end of its own track rather than to a number typed here:
     a test that moves a dial to 1.5 passes for a dial whose range stops at 1.2
     and never tells anybody. */
  const far = dial.rest === dial.least ? dial.most : dial.least;
  const made = adjustCss({ ...NO_ADJUST, [dial.id]: far });
  ok(`${dial.id} makes a filter the browser understands`,
    MAKES[dial.id].test(made),
    `"${made}" at ${far}`);
}

ok('  and every dial rests somewhere inside its own range',
  DIALS.every((one) => one.rest >= one.least && one.rest <= one.most),
  DIALS.filter((one) => one.rest < one.least || one.rest > one.most).map((o) => o.id).join(', '));

/* ── Clamped, because a slider is a thing somebody drags ───────────────── */

for (const dial of DIALS) {
  const over = adjustCss({ ...NO_ADJUST, [dial.id]: dial.most * 100 });
  const under = adjustCss({ ...NO_ADJUST, [dial.id]: dial.least - 1000 });
  const numbers = [...`${over} ${under}`.matchAll(/-?\d+(\.\d+)?/g)].map((m) => Number(m[0]));
  ok(`  and ${dial.id} cannot be driven past its own ends`,
    numbers.every((n) => n >= Math.min(dial.least, 0) - 0.001 && n <= Math.max(dial.most, 1) + 0.001),
    `${over} | ${under}`);
}

ok('and nothing readable comes back as NaN',
  !/NaN/.test(adjustCss({ bright: Number.NaN, warm: Number.POSITIVE_INFINITY })),
  adjustCss({ bright: Number.NaN, warm: Number.POSITIVE_INFINITY }));

/* ── The look first, the correction after ──────────────────────────────── */

const look = filterCss('mono');
const dialled = adjustCss({ ...NO_ADJUST, bright: 1.4 });
ok('a look and its corrections compose, in that order',
  gradeCss(look, { ...NO_ADJUST, bright: 1.4 }) === `${look} ${dialled}`,
  gradeCss(look, { ...NO_ADJUST, bright: 1.4 }));

ok('  and a look with nothing dialled is just the look',
  gradeCss(look, NO_ADJUST) === look);

ok('  and dials with no look are just the dials',
  gradeCss('', { ...NO_ADJUST, bright: 1.4 }) === dialled);

ok('  and neither is an empty string of spaces',
  gradeCss('', NO_ADJUST) === '',
  `"${gradeCss('', NO_ADJUST)}" — a filter of one space is a filter pass for nothing`);

/* ── Both ends read the same function ──────────────────────────────────── */

const edit = readFileSync('app/lib/videoedit.ts', 'utf8');
const room = readFileSync('app/components/VideoEditor.tsx', 'utf8');
ok('the cut handed to the renderer composes them with gradeCss',
  /gradeCss\(/.test(edit),
  'a second way of composing a look and a dial is a second answer to what the'
  + ' picture looks like');
ok('  and so does the preview she is judging',
  /gradeCss\(filterCss\(piece\.look\), piece\.adjust\)/.test(room));

/* ── And what is NOT here is named, which is the other half of the answer ─ */

/* Scoped to the REASONING, not to the file.

   The first version searched the whole of `videoadjust.ts`, and the header
   lists every dial her screenshots carry — so deleting the paragraph that
   explains why vignette and grain are not here left the words elsewhere in the
   file and the check stayed green. Proved by deleting it: nought failures.

   A check that reads the list and not the reason is a check that holds a list.
   This reads from "The rest are not one honest group" onwards, which is the
   paragraph that has to survive. */
const whole = readFileSync('app/lib/videoadjust.ts', 'utf8');
const lib = from(whole, 'The rest are not one honest group');
ok('the reasoning for what is missing is still in the file',
  lib.length > 200,
  `${lib.length} characters after the anchor`);
const NAMED = [
  'Vignette', 'grain', 'Highlights', 'shadows', 'whites', 'blacks',
  'curves', 'HSL', 'Stabilize', 'optical flow', 'super resolution',
];
const missing = NAMED.filter((one) => !new RegExp(one, 'i').test(lib));
ok('every dial her screenshots carry and this app does not is named, with a reason',
  missing.length === 0,
  `${missing.join(', ')} — "are all the tools there" is answered by saying which`
  + ' are not and why, not by adding sliders that move and change nothing');

ok('  and the ones that need an engine are sent to the room that says so',
  /engine/i.test(lib),
  'stabilising and super resolution need somebody else\'s money, and this app'
  + ' already has three doors that say that plainly');

if (bad) {
  console.error(`\ncheck:adjust — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:adjust — five dials that make a real filter the renderer honours, clamped'
  + ' at both ends, composed with the look in one place; and the fifteen that are not'
  + ' here are named with the reason.',
);
