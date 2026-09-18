/**
 * A press you can see, on a screen that has no hover.
 *
 * Carli, 17 September 2026, twice: *"Die knoppies binne die videos en
 * liedjies, soos die delete knoppie moet wys as mens dit druk, huidiglik
 * maak die knoppie geen beweging."*
 *
 * Nearly every button in this app carries a `hover:` state and nothing else,
 * and a phone has no hover. A press therefore produced no change at all —
 * the finger covers the button while it is down, lifts, and the screen is
 * exactly as it was. That is indistinguishable from a broken button, which
 * is what she reported.
 *
 * ── Why this is a rule and not three hundred edits ───────────────────────
 *
 * "Soos die delete knoppie" is an example, not a list. `check:buttonlook`
 * already holds that every button looks like a button; this holds that every
 * button ANSWERS like one. Both are properties of the whole app, so both
 * belong in one place rather than in every row that happens to have a bin in
 * it.
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const css = readFileSync('app/globals.css', 'utf8');
const at = css.indexOf('A press you can see');
ok('the stylesheet answers a press', at > 0);
const block = at > 0 ? css.slice(at) : '';

ok(
  'every button, link and role=button answers',
  /button:not\(\[disabled\]\):active/.test(block) &&
    /a:active/.test(block) &&
    /\[role='button'\]:not\(\[aria-disabled='true'\]\):active/.test(block),
  'one rule, because "like the delete button" is an example and not a list',
);
ok(
  '  and a disabled one does not',
  /button:not\(\[disabled\]\):active/.test(block),
  'a button that answers a press it is refusing is a button that lied',
);
/* ── The sum, not the rule ────────────────────────────────────────────

   This used to assert that a `filter: brightness(1.3)` was present, and it
   passed, and what shipped was invisible. The commonest button background in
   this app is `bg-zinc-950` — rgb(9, 9, 11) — and multiplying nearly nothing
   by 1.3 leaves nearly nothing: the colour moved by THREE parts in 255, on
   exactly the buttons Carli said were not moving. The check confirmed a rule
   existed and never asked what the rule did.

   So it does the arithmetic now, against the three backgrounds this app
   actually paints buttons in. A press has to change the colour by at least
   24 parts in 255 on every one of them — about a tenth of the range, which
   is comfortably visible on a phone in daylight and is roughly the step
   between two neighbouring Tailwind greys.

   An additive lift is the only kind that can pass this: a multiplier big
   enough to move black is a multiplier that blows out everything else. */
/* Every kind of button this app paints, and the overlay that is supposed to
   answer for it. Two kinds, because there are two: nearly-black, which is
   almost all of them, and the green primary. */
const BACKGROUNDS: readonly (readonly [string, readonly [number, number, number], 'white' | 'black'])[] = [
  ['zinc-950', [9, 9, 11], 'white'],
  ['zinc-900', [24, 24, 27], 'white'],
  ['zinc-700', [63, 63, 70], 'white'],
  ['emerald-500', [16, 185, 129], 'black'],
];
/* In L* — CIE lightness, which stretches the dark end the way an eye does.
   Ten is about two steps on Tailwind's grey ramp: not loud, and not
   arguable. */
const LEAST = 10;

const lift = block.match(/inset 0 0 0 999px rgba\(255, 255, 255, ([0-9.]+)\)/);
const dark = block.match(/inset 0 0 0 999px rgba\(0, 0, 0, ([0-9.]+)\)/);
ok('the press lays a flat lift over the button', Boolean(lift),
  'a brightness multiplier cannot move a background that is nearly black');
ok(
  '  and the opposite one over the bright primary',
  Boolean(dark) && /bg-emerald-500:not\(\[disabled\]\):active/.test(block),
  'white over a colour that is already bright is the one case a white lift cannot answer',
);

/* ── Measured as lightness, not as the weakest channel ────────────────

   The first version of this sum took the smallest change across the three
   channels, and it failed the bright green primary: white over
   rgb(16, 185, 129) moves red by 38 and green by 11, because green is
   already near the top of its range. Eleven looked like a failure and is
   not one — the button plainly changes colour, and what changed is its
   LIGHTNESS, which is what an eye is actually reading.

   So the measure is relative luminance, sRGB's own weighting of the three
   channels, on a 0–255 scale so the floor stays a number anybody can picture
   against a grey ramp. The weakest-channel version is kept in the history
   rather than the file: it was too strict in one direction and would have
   forced a lift big enough to wash the green button out. */
const lightness = (rgb: readonly [number, number, number]): number => {
  const linear = rgb.map((one) => {
    const c = one / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const y = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  /* L*, not the luminance itself. Luminance is linear and an eye is not: the
     step from rgb 9 to rgb 48 is enormous to look at and almost nothing in
     linear terms, so a floor set on luminance failed every dark button in
     the app while they were plainly changing colour. That was this check's
     second wrong answer in one sitting, and the reason both are written
     down: the measure has to match what "can you see it" means. */
  return y > 0.008856 ? 116 * y ** (1 / 3) - 16 : 903.3 * y;
};

if (lift && dark) {
  for (const [name, rgb, which] of BACKGROUNDS) {
    const part = Number(which === 'white' ? lift[1] : dark[1]);
    const towards = which === 'white' ? 255 : 0;
    const after = rgb.map((one) => Math.round(one * (1 - part) + towards * part)) as unknown as
      readonly [number, number, number];
    const moved = Math.round(Math.abs(lightness(after) - lightness(rgb)));
    ok(
      `  and it is visible on ${name} (${which})`,
      moved >= LEAST,
      `lightness moves by ${moved}, and ${LEAST} is the floor`,
    );
  }
}
ok(
  'and it shrinks by enough to notice',
  /transform: scale\(0\.94\)/.test(block),
  '0.97 on a 44-pixel button is a pixel and a third, under a finger that is covering it',
);
ok(
  'only on a coarse pointer',
  /@media \(pointer: coarse\) \{/.test(block),
  'the desktop already answers with hover and does not need a second answer',
);
ok(
  'and the timeline is left out of it',
  /\[data-timeline\] button:active/.test(block) && /box-shadow: none;/.test(block),
  'a clip is dragged, not pressed — one that shrinks for the whole gesture looks damaged',
);
ok(
  '  as is anything that already answers durably',
  /\[aria-pressed\]:active/.test(block),
  'a flicker on top of a control that changes colour and keeps it is noise on a signal',
);

if (failures) {
  console.error(
    '\ncheck:pressed — a button with only a `hover:` state gives a phone nothing. The press\n' +
      'has to change something, or it reads as a button that does not work.\n',
  );
  process.exit(1);
}
console.log('\ncheck:pressed — every button answers a thumb, and the timeline is left to its drags.');
