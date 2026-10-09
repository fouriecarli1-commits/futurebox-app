/**
 * A room at a desk is not a room in a hand.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"is dit moontlik om die website anders te maak as
 * die phone app? Die website moet nie lyk soos 'n foon app nie."*
 *
 * ── Why the answer was already half-written, and half-broken ─────────────
 *
 * `lib/sideways.ts` asks a question with two halves: is this screen landscape,
 * AND is the pointer coarse. The second half is there on purpose, and its own
 * comment says why — *"a desktop browser window is landscape and nobody is
 * holding it"*. That was the right call for a phone turned on its side. What
 * it left behind is that the desktop case was then never given an answer of
 * its own: a mouse on a 1,600-pixel screen gets the layout drawn for a thumb
 * on a 390-pixel one, which is exactly the thing she is looking at.
 *
 * So there are now two questions — held sideways, and sat at a desk — and
 * this file holds three things about them.
 *
 * ── 1. The two questions cannot both be true ─────────────────────────────
 *
 * Because the rooms pick ONE layout from them, and two queries that can both
 * match is a room whose shape depends on which line of code ran last.
 * `pointer: coarse` against `pointer: fine` is what keeps them apart, and it
 * is asserted here rather than trusted, since dropping either half still
 * compiles and still looks right on whichever device the person who dropped
 * it was holding.
 *
 * ── 2. A room that mounts the bar must take its direction from them ──────
 *
 * This is the assertion that caught a real one. `CutDock.tsx` has had a rail
 * for the sideways case since September: 96 pixels wide, `borderLeft`, meant
 * to sit down the edge of the screen. `ProBooth.tsx` reads `sideways` and
 * turns its own wrapper into a `flex-row` so that the rail has an edge to sit
 * on. `VideoEditor.tsx` did not — its wrapper was the literal string
 * `"flex flex-col"` — so the cutting room held sideways stacked that
 * 96-pixel rail at the BOTTOM of a column, which is neither the bar nor the
 * rail but a squeezed ruin of both. The same hole, unfixed, is what would
 * have swallowed the desk layout.
 *
 * The instrument is therefore not "does the room look right" but "does the
 * element carrying `data-cutroom` get its flex direction from a value and
 * not from a constant". That is readable off the code, it is the thing that
 * was wrong, and it stays wrong out loud.
 *
 * ── 3. The desk panel is not a phone's sheet ─────────────────────────────
 *
 * The bottom sheet is capped — 46dvh — and the cap is correct for a phone:
 * her complaint on 8 October was that the panels were *"die view van die
 * video belemmer"*. At a desk there is no such trade, because the panel is
 * beside the film rather than on top of it, and carrying the phone's cap
 * across would throw away half a screen for a reason that does not apply.
 * So the edge branch must not be capped in `dvh` at all.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { SIDEWAYS } from '../app/lib/sideways.ts';
import { AT_DESK } from '../app/lib/atdesk.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nA room at a desk is not a room in a hand\n');

/* ── 1. The two questions cannot both be true ────────────────────────── */

ok('held sideways asks for a coarse pointer',
  /\(\s*pointer\s*:\s*coarse\s*\)/.test(SIDEWAYS),
  `SIDEWAYS is \`${SIDEWAYS}\` — without that half a desktop window is`
  + ' landscape too, and the rail appears on a screen nobody is holding');

ok('  and sat at a desk asks for a fine one, which is what keeps them apart',
  /\(\s*pointer\s*:\s*fine\s*\)/.test(AT_DESK),
  `AT_DESK is \`${AT_DESK}\` — the rooms pick one layout from these two, so`
  + ' a screen that matches both is a room whose shape depends on which'
  + ' branch was written first');

ok('  and a desk is wide, not merely mousey',
  /min-width\s*:\s*\d{4}px/.test(AT_DESK),
  `AT_DESK is \`${AT_DESK}\` — a mouse in a narrow window is still a narrow`
  + ' window, and a side panel in one leaves no film beside it');

/* ── 2. Every room that mounts the bar takes its direction from them ─── */

/* Read off the code rather than listed: a fourth room added next month gets
   measured the same day rather than when somebody remembers this file. */
/* Read off the code rather than listed: a fourth room added next month gets
   measured the same day rather than when somebody remembers this file. */
const ROOMS = ['VideoEditor', 'PostStudio', 'ProBooth'] as const;

for (const room of ROOMS) {
  const src = withoutComments(readFileSync(`app/components/${room}.tsx`, 'utf8'));

  ok(`${room} carries the room marker`,
    src.includes('data-cutroom'),
    '`data-cutroom` is how this check knows the file is a room with a bar at'
    + ' the foot of it, and a room without one is a room this check reports'
    + ' as fine while it draws a phone');

  const asks = [
    !/useSideways\s*\(/.test(src) && 'useSideways',
    !/useAtDesk\s*\(/.test(src) && 'useAtDesk',
  ].filter(Boolean);
  ok(`  and ${room} asks both questions`,
    asks.length === 0,
    `${asks.join(' and ')} missing — a room that asks only one of them has an`
    + ' answer for one device and the phone layout for the other');

  ok(`  and joins them into one answer`,
    /\bonEdge\s*=\s*sideways\s*\|\|\s*atDesk\b/.test(src),
    'the two answers are not combined, so the room has two booleans and the'
    + ' layout depends on which branch reads which');

  /* The assertion that caught the real one. `VideoEditor.tsx` carried the
     literal string "flex flex-col" on the element holding `data-cutroom`,
     so the bar's 96-pixel side rail was stacked at the bottom of a column
     instead of standing on an edge — the rail Carli asked for in September
     did not exist in that room and nothing said so. */
  ok(`  and picks its direction from it`,
    /onEdge \? 'flex-row' : 'flex-col'/.test(src),
    'the room never chooses between a row and a column from `onEdge`, so the'
    + " bar's side rail has no edge to stand on — it is stacked at the foot"
    + ' of a column, which is what the cutting room held sideways looked like'
    + ' from September until 9 October');
}

/* ── 3. The desk panel is not a phone's sheet ────────────────────────── */

const dock = withoutComments(readFileSync('app/components/CutDock.tsx', 'utf8'));

ok('the bar has an edge layout at all',
  /sideways\s*\|\|\s*atDesk|atDesk\s*\|\|\s*sideways/.test(dock),
  'the rail branch in `CutDock.tsx` is reached only when the phone is turned,'
  + ' so a desk still gets the bottom bar and the sheet over the film');

/* The phone's cap, and only the phone's. Count the capped sheets: there is
   one, and it is the bottom one. */
const caps = dock.match(/max-h-\[\d+dvh\]/g) ?? [];
ok('  and exactly one sheet is capped to a fraction of the screen',
  caps.length === 1,
  `${caps.length} found (${caps.join(', ') || 'none'}) — the cap is there so a`
  + ' panel does not cover the film it is about, which is a trade only the'
  + ' bottom sheet has to make; beside the film there is nothing to trade');

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);
