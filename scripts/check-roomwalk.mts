/**
 * A probe that walks every room uses the shared way in.
 *
 * ── The red this is written out of ───────────────────────────────────────
 *
 * Five of the eleven probes failing in CI on 5 October 2026 failed for one
 * reason, written five times: `writing`, `wide`, `afrikaans` and `cards`
 * each carried their own copy of "press Make on the app's bottom bar, then
 * pick the room off the door".
 *
 * That copy was correct when it was written. Then the cutting room was built
 * and Carli asked for it to BE the screen, so `roomOwnsScreen` takes the
 * app's bar away there — `check:underbar` holds it that way on purpose. The
 * Video Editor is seventh of fourteen in `ROOMS`, so from the eighth room
 * onwards every one of those probes was pressing a bar the app had correctly
 * removed. Playwright waited thirty seconds for an element that will never
 * exist and threw, and the failure read as "the room is broken".
 *
 * Five probes, one lesson, and the lesson was already written down — in
 * `enter.mjs`, which handles exactly this. The probes never got it because
 * nothing connected them to it.
 *
 * ── Why the rule is scoped to the room walk ──────────────────────────────
 *
 * Forty probes press the bar with their own two lines and almost all of them
 * are fine: they visit one or two rooms and never reach the cutting room. A
 * rule banning the two lines everywhere would be forty rewrites to fix five
 * faults, and every rewrite is a chance to break a probe that works.
 *
 * What makes it certain rather than likely is walking `ROOMS`, because that
 * list contains the room that takes the bar away. So the rule is: import the
 * full list of rooms, use the shared way in. Narrow, mechanical, and exactly
 * as wide as the fault.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { ROOMS } from '../audit/rooms.mjs';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

/** Probes that take the whole room list, so they must pass through it all. */
const walkers = readdirSync('audit')
  .filter((one) => one.endsWith('.mjs'))
  .filter((one) => /from '\.\/rooms\.mjs'/.test(readFileSync(`audit/${one}`, 'utf8')));

ok('there are probes that walk every room',
  walkers.length >= 10,
  `${walkers.length} found — if this drops, the rule below is guarding nothing`);

/** The one room that takes the app's bar away, named so the reason is legible. */
const BARE = 'Video Editor';
ok(`and ${BARE} is among the rooms they walk`,
  ROOMS.includes(BARE),
  'this whole rule rests on the walk passing through a room with no bar;'
  + ' if that room is renamed or removed, the rule has to be re-argued rather'
  + ' than left standing on a name that no longer means anything');

/* ── The rule ──────────────────────────────────────────────────────────── */

const ownRoll: string[] = [];
for (const name of walkers) {
  const text = readFileSync(`audit/${name}`, 'utf8');
  /* Its own press on the app's bar: the bottom bar, filtered by a label. */
  const rolls = /nav\[aria-label\][\s\S]{0,400}?locator\('button'\)\.filter\(\{ hasText/.test(text);
  const shared = /\b(pressTab|toRoom)\s*\(/.test(text);
  if (rolls && !shared) ownRoll.push(name);
}

ok(`every one of them uses the shared way in (${walkers.length} walked)`,
  ownRoll.length === 0,
  ownRoll.length
    ? `${ownRoll.join(', ')} — press the bar through \`pressTab\`, which steps`
      + ' out of a room that owns the screen first. Written by hand, this'
      + ' probe passes for six rooms and then waits thirty seconds for a bar'
      + ' the app took away on purpose'
    : '');

if (bad) {
  console.error(`\ncheck:roomwalk — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  `\ncheck:roomwalk — all ${walkers.length} probes that walk the ${ROOMS.length} rooms`
  + ' go in through the shared helper, which knows the cutting room has no bar.',
);
