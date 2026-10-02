/**
 * The cutting room is solid, and the copilot is a button.
 *
 * ── The photograph that caused this ──────────────────────────────────────
 *
 * Carli, 4 October 2026, with a picture of the room on her phone: *"Dit is hoe
 * dit huidiglik lyk. Dit lyk nie goed nie. Die copilot kan ook net 'n button
 * wees wat uit pop. Die hele kamer moet solid wees."*
 *
 * In the photograph the room fades from green at the top to the page's own
 * white at the bottom, and every word in it — the hint line, the empty note,
 * Back and Forward — is grey on grey. The cause was one character: the middle
 * stop of `bg-gradient-to-b from-emerald-950 via-emerald-950/80 to-zinc-950`.
 * An `/80` is eighty per cent opaque, so the page showed through the room.
 *
 * ── Why this is a check and not a fix ────────────────────────────────────
 *
 * Because it is the second time. The room was given the FutureBox green in
 * September and the gradient went in then; nothing measured it, so the day the
 * surrounding page's background changed, the room went see-through and stayed
 * that way until somebody photographed it.
 *
 * A colour is exactly the kind of thing no check ever holds — it feels like
 * taste. Transparency is not taste. A panel you can read the page through is
 * broken whatever colour it is, and that IS measurable: the room's own
 * background must be one opaque value, with no gradient and no alpha.
 *
 * ── And the second half, which is the same mistake in another shape ──────
 *
 * The copilot used to be drawn as a 22rem pane below this room. Every other
 * room scrolls, so a third pane at the foot of it is where it belongs. This
 * room does not scroll — it is a screen with a fixed bar at its foot, which is
 * the whole point of the October rebuild — so the pane was a second screenful
 * below the bar that nobody ever reached.
 *
 * It is a button on the room's own top row now, opening a sheet. The thing
 * that can go wrong is drawing it BOTH ways: `page.tsx` renders the third
 * column for every room not in `copilotInside`, so forgetting the room there
 * gives two copilots on one screen, each with its own scroll box. That is held
 * below by name.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

/* Comments blanked, because every rule here looks FOR a string rather than at
   the shape of the code around it — and the note above this very file's
   subject quotes the broken gradient in full. A check that reads its own
   reasoning passes on the strength of the sentence explaining why it should
   fail, and this repository has made that mistake four times. */
const page = withoutComments(readFileSync('app/page.tsx', 'utf8'));
const room = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));

/** The wrapper `page.tsx` paints the cutting room onto. */
const WRAPPER = (() => {
  const at = page.indexOf('data-cuttingroom');
  if (at < 0) return '';
  return page.slice(Math.max(0, at - 400), at + 600);
})();

ok('page.tsx still paints a cutting room at all',
  WRAPPER !== '',
  'nothing carries data-cuttingroom — if the attribute is renamed, rename it here'
  + ' too rather than letting this file quietly stop measuring anything');

/* ── 1. Solid ──────────────────────────────────────────────────────────── */

ok('the room is not painted with a gradient',
  !/bg-gradient/.test(WRAPPER),
  'a gradient down a room is a room that is one colour at the top and another at'
  + ' the bottom, and the bottom is where the bar she works from lives');

ok('  and carries no colour you can see through',
  !/(emerald|zinc|black|white)-\d{2,3}\/\d/.test(WRAPPER)
  && !/rgba\([^)]*,\s*0?\.\d+\s*\)/.test(WRAPPER),
  'a translucent stop lets the page behind it through, which is exactly what'
  + ' made every word in the photograph grey on grey');

ok('  and does carry one flat background of its own',
  /background:\s*'#[0-9a-fA-F]{6}'/.test(WRAPPER) || /\bbg-\[#[0-9a-fA-F]{6}\]/.test(WRAPPER),
  'no opaque colour at all means the room is whatever the page under it happens'
  + ' to be, which is the same fault by a different route');

/* The same rule `audit/editor.mjs` applies to the painted pixel, applied here
   to the written hex. Not a duplicate: the probe is the one that counts,
   because a class can be overridden or an opaque child can cover the lot, and
   only a browser knows. But the probe needs a build, a server and ninety
   seconds, and this needs none of them — so a colour typed too dark fails in
   the sweep rather than in the probe run after it.

   Six is the probe's own threshold and is deliberately copied rather than
   softened. `#09120d` sat at nine over red and five over blue, which is how a
   room spent four days being green in the source and black on the screen. */
const HEX = /#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/.exec(WRAPPER);
const rgb = HEX ? HEX.slice(1, 4).map((pair) => parseInt(pair, 16)) : null;

ok('  and the green in it actually leads, rather than merely being present',
  rgb !== null && rgb[1] > rgb[0] + 6 && rgb[1] > rgb[2] + 6,
  rgb
    ? `rgb(${rgb.join(', ')}) — green is ${rgb[1] - rgb[0]} over red and`
      + ` ${rgb[1] - rgb[2]} over blue, and audit/editor.mjs wants more than six`
      + ' of each before it will call a room green'
    : 'no colour to read');

/* ── One source for the colour, not three files agreeing by hand ────────

   The room, the bar and every bench are one surface. That was three literals
   in three files until 4 October, which is three colours the first time one of
   them moves — and one of them did move, from #09120d to #05180f, and the
   check caught the file that had not been edited.

   `app/lib/cutlook.ts` is the one place now. `page.tsx` still carries the
   literal, because a background set in a style attribute cannot import, so
   that one is held against the file that defines it. */

const look = withoutComments(readFileSync('app/lib/cutlook.ts', 'utf8'));
const PAINT = /export const PANEL = '(#[0-9a-fA-F]{6})'/.exec(look)?.[1] ?? '';

ok('the cutting room has one file that says what colour it is',
  PAINT !== '',
  'app/lib/cutlook.ts no longer exports a PANEL — if the palette moves, move'
  + ' this with it rather than letting the room go unmeasured');

ok('  and page.tsx paints the room that exact colour',
  PAINT !== '' && new RegExp(PAINT, 'i').test(WRAPPER),
  `cutlook says ${PAINT}; the wrapper in page.tsx does not use it`);

ok('  and the bar and the benches take their colours from that same file',
  /from '\.\.\/lib\/cutlook'/.test(withoutComments(readFileSync('app/components/CutDock.tsx', 'utf8')))
  && /look=\{CUT_LOOK\}/.test(withoutComments(readFileSync('app/components/CutDock.tsx', 'utf8'))),
  'DeskSheet was written for the Pro Booth and imported its palette directly —'
  + ' a blue-black body and a sky-blue heading icon inside a green room. It'
  + ' takes a `look` now, and the cutting room has to hand it one');

ok('  and the room restates the surface ramp for a dark room',
  /\[data-cuttingroom\]\s*\{[^}]*--fb-surface-400/.test(
    readFileSync('app/globals.css', 'utf8'),
  ),
  'zinc maps onto the surface family and the theme this app ships is light,'
  + ' which inverts the ramp — so every text-zinc-400 in a dark room resolves'
  + ' to a dark warm grey. Measured at 1.88:1 before this block existed, which'
  + ' is what Carli meant by "niks is duidelik nie"');

/* ── 2. Edge to edge, so the bar reads as a floor ─────────────────────── */

ok('the wrapper puts no frame around the bar',
  !/\bp-\d/.test(WRAPPER) && !/\bpx-\d/.test(WRAPPER),
  'padding on the wrapper draws a margin of lighter surface down both sides of'
  + ' the dock, which is what makes it look like a card lying on a page instead'
  + ' of the floor of a room');

ok('  and the room scroller carries the padding instead',
  /overflow-y-auto px-3/.test(room),
  'the padding has to be somewhere, or the words run into the screen edge — it'
  + ' belongs on the part that scrolls, not on the part the bar sits in');

/* ── 3. One copilot, not two ─────────────────────────────────────────── */

ok('the cutting room is one of the rooms that holds the copilot itself',
  /copilotInside\s*=[^;]*'videoedit'/.test(page),
  'without this page.tsx draws its third column below the room as well, so the'
  + ' room has a copilot behind a button AND a copilot under the bar');

ok('  and is handed the copilot to put behind that button',
  /<VideoEditor[\s\S]{0,1600}copilot=\{copilotPane\}/.test(page),
  'the button opens an empty sheet otherwise');

ok('  and the room draws a button for it',
  /data-editorask[=\s>]/.test(room),
  'the prop arriving and nothing opening it is the copilot gone, not moved');

ok('  and opens it in a sheet rather than in the page flow',
  /asking2 &&[\s\S]{0,400}DeskSheet/.test(room),
  'the point of the move is that it is over the room and not below it');

ok('  and the same sheet every bench in this room uses',
  /import DeskSheet from '\.\/BoothCard'/.test(room),
  'a second kind of panel in one room is a second way to close something');

/* ── The three things that went wrong the first time it was built ────────

   All three looked right in the code and were visible the moment the room was
   photographed, which is the whole argument for a screenshot in the loop. */

ok('  and the button is a toggle, not a disclosure',
  /data-editorask[\s\S]{0,1200}aria-pressed=\{asking2\}/.test(room)
  && !/data-editorask[\s\S]{0,1200}aria-expanded/.test(room),
  'every bench on the bar below uses aria-pressed, and `unfold()` in'
  + ' audit/enter.mjs presses every aria-expanded="false" button with a label'
  + ' on its way into a room — so with expanded on it, the copilot was open'
  + ' over the room on arrival, in every probe and every screenshot');

ok('  and the sheet holds it whole rather than as one cell of a grid',
  /plain\n/.test(room) || /\splain\s/.test(room),
  "DeskSheet's body is `grid grid-cols-2`, which is right for a bench of"
  + ' control cards and wrong for a conversation: it made the copilot 190'
  + ' pixels wide on a 390-pixel phone, wrapping four words to a line');

ok('  and the copilot drops its own card inside it',
  /bare=\{studioTab === 'videoedit'\}/.test(page),
  'the copilot draws its own rounded border, its own fill and its own name,'
  + ' which inside a sheet that has all three is a panel on a panel under two'
  + ' headings, one reading "Ask the copilot" and the next reading "Copilot"');

/* ── 4. And the room is a screen, which is what makes the bar a floor ──

   The dock is the last child of the room's column, so where the column ends is
   where the bar ends. Both ways of getting that wrong have happened, within an
   hour of each other, and both put controls where she cannot press them:

   - `minHeight` alone is a floor with no ceiling. `flex-1` in a column with no
     height to divide does not scroll, it grows, so the room grew a page under
     itself and the dock went wherever the content ended. With the copilot
     sheet open the dock measured 3,642 pixels down a 900-pixel window.
   - `calc(100dvh - 7.5rem)` is a guess at what sits above the room. The header
     over it is a back arrow, a search and a room card, and on a 390x844 phone
     that is 155 pixels, not 120 — so the bottom row of the bar was off the
     screen and `audit/underbar.mjs` named all five controls on it.

   The height is read off the element now. This holds that it still is. */

ok('the room measures its own height rather than assuming one',
  /getBoundingClientRect\(\)\.top/.test(room) && /visualViewport/.test(room),
  'a constant allowance for what sits above the room is a guess, and the guess'
  + ' was 35 pixels out at the first width it was checked at');

ok('  and takes the app bar off it by measuring that too',
  /nav\.fixed\.bottom-0/.test(room),
  'the bar is BAR_HEIGHT plus the device safe area, and only the device knows'
  + ' the second number');

ok('  and sets a height, not only a minimum',
  /height:\s*tall === null/.test(room) && /maxHeight:\s*tall === null/.test(room),
  'a minimum is what let the room grow a page under itself');

if (bad) {
  console.error(`\ncheck:solidroom — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:solidroom — the cutting room is one opaque colour with no frame around'
  + ' its bar, and the copilot is a button over it rather than a pane under it.',
);
