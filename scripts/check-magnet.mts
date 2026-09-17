/**
 * The magnet, the interlock, and lanes that can be reordered.
 *
 * Carli, 16 September 2026: *"Die timeline het 'n magnet nodig, en ook 'n
 * interlock funksie om twee tydlyne met mekaar vas te maak. Tracks moet ook
 * geswitch kan word, menend op en af beweeg en omgeruil word."*
 *
 * ── Why this one runs the code instead of reading it ─────────────────────
 *
 * Most checks in here are shape checks, and that is usually the honest kind:
 * a screen either has the element or it does not. The magnet is different —
 * it is arithmetic with a rule, and the rule has a case that is easy to get
 * backwards and impossible to see by reading a regex. `lib/magnet` is a pure
 * module with no browser in it, so this imports it and tries the cases.
 *
 * The case: with Snap OFF the grid's answer IS the raw finger, so a magnet
 * written as "the point wins if it is nearer than the grid" does nothing
 * whatever in the one mode where the points are all there is. The first
 * version of `pullTo` had exactly that bug and a comment claiming the
 * opposite. Hence `gridded: number | null`, and hence the two assertions
 * below that would both have caught it.
 */

import { readFileSync } from 'node:fs';
import { pullTo, reachOf, REACH, type Sticky } from '../app/lib/magnet';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const line = readFileSync('app/components/BoothTimeline.tsx', 'utf8');
const booth = readFileSync('app/components/ProBooth.tsx', 'utf8');
const keep = readFileSync('app/lib/keepsession.ts', 'utf8');
const lane = readFileSync('app/lib/session.ts', 'utf8');

/* ── The rule ─────────────────────────────────────────────────────────── */

const clipAt = (at: number, name = 'drums'): Sticky => ({ at, what: 'clip', name });

ok(
  'a point within reach pulls a drag onto it',
  pullTo(10.1, null, [clipAt(10)], 0.5).at === 10,
);
ok(
  '  and says what it stuck to, so the room can name it',
  pullTo(10.1, null, [clipAt(10)], 0.5).to?.name === 'drums',
);
ok(
  'a point out of reach leaves the drag alone',
  pullTo(12, null, [clipAt(10)], 0.5).at === 12,
  'the magnet is a nudge, not a quantiser — far from everything nothing happens',
);
ok(
  'with no reach at all the magnet does nothing',
  pullTo(10.1, null, [clipAt(10)], 0).at === 10.1,
  'reach 0 is the magnet switched off, and it has to be a true no-op',
);

/* ── Snap off is not a quieter grid, it is no grid ─────────────────────── */

ok(
  'with Snap off a point still wins',
  pullTo(10.1, null, [clipAt(10)], 0.5).at === 10,
  'written as "nearer than the grid", this is the finger losing to itself and the magnet dies',
);
ok(
  '  and open space stays free with Snap off',
  pullTo(37.42, null, [clipAt(10)], 0.5).at === 37.42,
);

/* ── With a grid, the nearer of the two wins ───────────────────────────── */

ok(
  'the grid keeps a drag that is nearer to the grid than to any point',
  pullTo(8.1, 8, [clipAt(9)], 2).at === 8,
  'a bar line 0.1 away must beat a clip 0.9 away',
);
ok(
  '  and a point takes one that is nearer to the point',
  pullTo(8.9, 8, [clipAt(9)], 2).at === 9,
);
ok(
  '  and a point taking a dead tie',
  pullTo(9, 8, [clipAt(10)], 2).at === 10,
  'a tie is arbitrary, so it goes to the more specific of the two — the thing, not the ruler',
);
ok(
  '  while a grid that landed under the finger beats a point that did not',
  pullTo(8, 8, [clipAt(9)], 2).at === 8,
  'the grid really did answer, and answering exactly cannot lose',
);

/* ── The reach is pixels, converted — not a number of seconds ──────────── */

ok(
  'the reach is the same handful of pixels whatever the song is long',
  Math.abs(reachOf(REACH, 180, 360) - REACH / 2) < 1e-9 &&
    Math.abs(reachOf(REACH, 20, 360) - (REACH * 20) / 360) < 1e-9,
  'a tolerance in seconds is a different distance on every song and every screen',
);
ok(
  '  and an axis that has not been measured switches it off rather than on',
  reachOf(REACH, 180, 0) === 0,
  'dividing by a width of 0 would give a reach of everything and pin every drag',
);

/* ── The interlock ────────────────────────────────────────────────────── */

ok('a lane can carry a lock', /readonly link\?: string;/.test(lane));
ok(
  '  and the lock is a shared group name rather than a pointer at one lane',
  /no second copy to disagree with/.test(lane),
  'two ids to keep one fact go wrong the first time a third lane joins or one is deleted',
);
ok(
  'dragging a locked lane picks up everything locked to it',
  /one\.link === lane\.link/.test(line),
);
ok(
  '  and the whole group moves by ONE number',
  /const walled = \(shift: number\): number =>/.test(line) &&
    /now\.with\.map\(\(one\) => \(\{ id: one\.id, at: one\.at \+ shift \}\)\)/.test(line),
  'clamping each lane on its own stops the one at the end of the song and lets the rest go on',
);
ok(
  '  through a handler that does not snap them again',
  /onSlide\(/.test(line) && /const slide = \(moves/.test(booth) &&
    /move \? \{ \.\.\.lane, at: move\.at \} : lane/.test(booth),
  'a second rounding per lane pulls a locked group apart across a bar line',
);
ok(
  'locking two lanes that are each already locked merges both groups',
  /const absorbed = \[mine\.link, yours\.link\]/.test(booth),
  'otherwise asking for more locking leaves the rest of the second group behind',
);
ok(
  '  and a lock left holding one lane comes off it',
  /left\.length > 1/.test(booth),
  'a lock of one locks nothing, and the badge on it would be a lie',
);
ok('a locked clip says so on the timeline', /lane\.link && \(/.test(line));

/* ── Reordering ───────────────────────────────────────────────────────── */

ok(
  'a lane can be swapped with the one above or below it',
  /const shuffleLane = \(id: string, way: -1 \| 1\)/.test(booth) &&
    /next\[from\] = was\[to\];/.test(booth),
);
ok(
  '  with the button switched off at the ends of the stack',
  /disabled=\{off\}/.test(booth),
);

/* ── Both switches, and both reachable ────────────────────────────────── */

ok('the magnet has a switch of its own', /data-magnet=""/.test(line));
ok(
  '  next to the marker, both 44 by 44',
  /data-mark=""/.test(line) &&
    (line.match(/className="flex h-11 w-11 items-center justify-center"/g) ?? []).length >= 2,
  '44 is the area a thumb has to land in; two of them is exactly what a 96-pixel gutter holds',
);
ok(
  '  and the magnet starts on',
  /useState\(true\)[^\n]*\n|const \[magnet, setMagnet\] = useState\(true\)/.test(line) &&
    /const \[magnet, setMagnet\] = useState\(true\)/.test(line),
  'a magnet nobody finds is a magnet nobody asked for twice',
);

/* ── Four fields that were being dropped ──────────────────────────────── */

for (const field of ['repeat', 'fx', 'clean', 'link']) {
  ok(
    `a lane's ${field} survives a save and a reload`,
    new RegExp(`readonly ${field}\\?:`).test(keep) &&
      new RegExp(`lane\\.${field} === undefined \\? \\{\\} : \\{ ${field}: lane\\.${field} \\}`).test(keep) &&
      new RegExp(`lane\\.${field} === undefined \\? \\{\\} : \\{ ${field}: lane\\.${field} \\}`).test(booth),
    'written down and never read back is a save that reports success and loses the work',
  );
}

if (failures) {
  console.error(
    '\ncheck:magnet — the magnet sticks a drag to the THINGS on the timeline, and the grid\n' +
      'still owns the ruler. Snap off means there is no grid, not a quiet one. A locked group\n' +
      'moves by one number or it is not locked. And a lane is written down with every field\n' +
      'it has, or the next one added quietly joins the ones that were being dropped.\n',
  );
  process.exit(1);
}
console.log('\ncheck:magnet — it sticks, it holds, it swaps, and a reload brings all of it back.');
