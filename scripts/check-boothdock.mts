/**
 * Two bars, six desks, and the app's own bar out of the way.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 14 September 2026: *"Bo op die 4 buttons heel onder is 'n tweede
 * button bar, wat in die middel 'n play/pause button het, back en forward,
 * en links en regs van dit is Track control icon en mix/master icon, en
 * daaruit pop al die netjiese funksies op. … Vier icon buttons heel onder
 * wat netjies die funksies uit pop, en as jy weer op buttons druk pop dit
 * terug. (daai buttons vervang die harde buttons van die hele app, dan val
 * daai hele bar van die app in die booth weg, let wel, links heel bo moet
 * dan darem 'n back icon wees om uit die booth te kom)"*
 *
 * Six things in one sentence, and every one of them is a way the rebuild can
 * be half-done: the second bar without the two desks on it, the four icons
 * without the second press that shuts them, the app's bar still underneath,
 * or — the one that would actually strand somebody — the app's bar gone and
 * no way out of the room.
 *
 * ── The one that has to be a pair ────────────────────────────────────────
 *
 * Hiding the tab bar and having a back button are not two features. Either
 * alone is a bug: the bar with the dock under it is three rows of buttons,
 * and the bar gone without a back button is a room a phone cannot leave
 * except by the hardware key. So they are asserted together, in one
 * assertion, and the failure message says so.
 *
 * ── Why the panels are not asserted one by one ───────────────────────────
 *
 * Nearly all of them already existed and are tested where they live —
 * check:bars, check:probooth, check:mixdown and the rest. What this holds is
 * the housing: that each desk has somewhere to come out, and that the room
 * still knows how to be left.
 *
 *   npm run check:boothdock
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const dock = readFileSync('app/components/BoothDock.tsx', 'utf8');
const booth = readFileSync('app/components/ProBooth.tsx', 'utf8');
const page = readFileSync('app/page.tsx', 'utf8');
const room = readFileSync('app/lib/fullroom.ts', 'utf8');

/* ── The upper bar ────────────────────────────────────────────────────── */
ok('the transport has play, back and forward', /onSkip\(-5\)/.test(dock) && /onSkip\(5\)/.test(dock) && /onClick=\{onPlay\}/.test(dock));
ok('  with track controls to the left of it', /spec=\{UPPER\[0\]\}/.test(dock) && /id: 'tracks'/.test(dock));
ok('  and mix and master to the right', /spec=\{UPPER\[1\]\}/.test(dock) && /id: 'mix'/.test(dock));
/* Read from the upright bar alone.

   There are two layouts in this file now — the rail for a device held
   sideways comes first, the bottom bars after `if (sideways) return rail;`
   — and `indexOf` finds the first occurrence in the whole file. The rail's
   own transport was then being compared with the bottom bar's desk buttons,
   which is two different bars measured as one and said the order was wrong
   while it was right in both. Split at the line that separates them. */
const upright = dock.slice(dock.indexOf('if (sideways) return rail;'));
const railOnly = dock.slice(0, dock.indexOf('if (sideways) return rail;'));

ok(
  '  in that order, which is the order she drew',
  upright.indexOf('spec={UPPER[0]}') < upright.indexOf('onSkip(-5)') &&
    upright.indexOf('onSkip(5)') < upright.indexOf('spec={UPPER[1]}'),
);

/* ── Turned sideways ───────────────────────────────────────────

   Carli: *"die booth moet asb op die dwars draai funksie van 'n foon en
   tablet getoets word … dan gaan die buttons weer beter werk aan die kant
   van die skerm en nie onder nie."*

   `audit/probooth.mjs` measures the result in a real phone and tablet
   profile. What is held here is the shape that makes it possible: one rail
   carrying all six desks, in a grid rather than a column — a single column
   fits three of them on a phone held sideways and hides the other three
   below a fold. */
ok('  and sideways they move to a rail down the side', /if \(sideways\) return rail;/.test(dock));
ok('    carrying every desk, not the four', /\[\.\.\.UPPER, \.\.\.LOWER\]\.map/.test(railOnly));
ok(
  '    laid out in a grid, because one column hides half of them on a phone',
  /grid w-full grid-cols-2/.test(railOnly),
  'six 52px buttons down one column need 450px; a phone held sideways is about 290',
);
ok(
  '  and both shapes name themselves, so a probe measures the same thing in each',
  (dock.match(/data-dock=""/g) ?? []).length === 2,
);

/* ── The lower four ───────────────────────────────────────────────────── */
for (const [id, what] of [
  ['effects', 'audio effects'],
  ['stems', 'the stem generator'],
  ['voice', 'voice conversion'],
  ['ai', 'the copilot'],
] as const) {
  ok(`the bottom bar has ${what}`, new RegExp(`id: '${id}'`).test(dock));
}
ok(
  'and a second press on the open one shuts it',
  /onClick=\{\(\) => onOpen\(on \? null : spec\.id\)\}/.test(dock),
  'a panel whose only way out is another panel is a panel that has taken the room',
);
ok('  as does Escape', /event\.key === 'Escape'/.test(dock));

/* ── Every icon says what it is, and what it costs ───────────────────

   Carli, 14 September 2026: *"Maak ook seker dat knoppies pop-ups het wat sê
   wat 'n funksie is, en maak seker betaalde funksies word uitgewys."*

   Six icons in two rows is six pictures, and a picture of a wand does not
   say what a wand does. A `title` would be the cheap answer and it is the
   wrong one on the device this room was rebuilt for: nothing hovers on a
   phone. So the sentence has to be DRAWN, and the price has to be on the
   button rather than only inside the panel — finding out something costs
   money once you are already in there is the shape of complaint this app has
   had before. */
const specs = [...dock.matchAll(/id: '(\w+)',[\s\S]{0,900}?\n  \},/g)].map((one) => one[0]);
ok(
  'every desk carries a sentence saying what it is',
  specs.length === 6 && specs.every((one) => /what: \[/.test(one)),
  `${specs.filter((one) => /what: \[/.test(one)).length} of ${specs.length} have one`,
);
ok(
  '  and it is drawn, not only hovered',
  /\{t\(here\.what\[0\], here\.what\[1\]\)\}/.test(dock),
  'a title attribute does nothing on a phone, which is the device this room was rebuilt for',
);
ok(
  '  and it reaches a screen reader, which gets one string',
  /aria-label=\{spec\.paid \? `\$\{label\}\. \$\{what\}/.test(dock),
);
ok(
  'the desks that spend credits are marked as such',
  specs.filter((one) => /paid: true/.test(one)).length === 3,
  'stems, voice and the effects desk (which holds "take the room off") all charge',
);
ok(
  '  on the button itself, before it is pressed',
  /\{spec\.paid && \(/.test(dock),
  'a price found only after opening the panel is a price found too late',
);
ok(
  '  and said again in words when the panel opens',
  /\{here\.paid && \(/.test(dock) && /dock\.paidHere/.test(dock),
);
ok(
  '  without claiming everything in there is free or everything costs',
  /Some of what is in here spends credits/.test(dock),
  'the stems desk also holds free controls; promising otherwise would be its own small lie',
);

/* ── The panels really are wired to something ─────────────────────────── */
ok('track controls open the clock and the picked lane', /deskOpen === 'tracks' && trackDesk/.test(booth));
ok('mix and master opens the mix panel', /deskOpen === 'mix' && mixDesk/.test(booth));
ok('stems opens the part generator', /deskOpen === 'stems' && stemDesk/.test(booth));
ok(
  'and the room opens with all of them shut',
  /useState<Desk>\(null\)/.test(booth),
  'every control on screen at once is the shape this rebuild replaced',
);

/* ── The pair that has to hold together ───────────────────────────────── */
ok(
  'the app’s own bar goes, AND the room keeps a way out',
  /\|\| roomOwnsScreen\)/.test(page) &&
    /const roomOwnsScreen = useOwnedScreen\(\);/.test(page) &&
    /useOwnScreen\(true\)/.test(booth) &&
    /<ArrowLeft className="h-4 w-4" \/>/.test(booth),
  'the bar with the dock under it is three rows of buttons; the bar gone with no back button is a room a phone cannot leave',
);
ok(
  '  and the claim is counted, not a flag',
  /claims \+= 1;/.test(room) && /claims = Math\.max\(0, claims - 1\);/.test(room),
  'the pro booth opens from inside the ordinary booth, so two rooms can hold the screen at once',
);
ok(
  '  and it is given back however the room is left',
  /return \(\) => \{\n\s*claims = Math\.max/.test(room),
  'a claim released only on a tidy exit is a tab bar that never comes back',
);
ok(
  'the room no longer reserves space for a bar that is not there',
  !/paddingBottom: barClearance/.test(booth) && !/^import .*barClearance/m.test(booth),
  'padding for a bar that is hidden is a strip of dead screen at the foot of the room',
);

if (failures) {
  console.error(
    '\ncheck:boothdock — the booth carries its own two rows of controls, so the app’s bar\n' +
      'stands down while it is open. That is only safe while the back button at the top\n' +
      'left is there, which is why the two are one assertion.\n',
  );
  process.exit(1);
}
console.log('\ncheck:boothdock — two bars, six desks, and a way out of the room.');
