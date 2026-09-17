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
ok(
  'it answers with brightness AND a scale',
  /filter: brightness\(1\.3\)/.test(block) && /transform: scale\(0\.97\)/.test(block),
  'a scale is invisible on a full-width button and brightness on a white one',
);
ok(
  'only on a coarse pointer',
  /@media \(pointer: coarse\) \{/.test(block),
  'the desktop already answers with hover and does not need a second answer',
);
ok(
  'and the timeline is left out of it',
  /\[data-timeline\] button:active/.test(block) && /transform: none;/.test(block),
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
