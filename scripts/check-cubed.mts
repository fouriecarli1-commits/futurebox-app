/**
 * Cubed: three to a masterclass, sixty to the guest, and the mark is woven.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Die masterclass section wil ek rename na Cubed
 * classes… Die rede vir cubed gaan oor die mag 3. Ek wil elke masterclass 3
 * klasse lank maak. Ons moet dit ook so uit stipuleer vir ons gaste. Ons gaan
 * 'n 60/40 winsverdeling doen. Dus 60% vir die gas."* And: *"Ek soek ook 'n
 * Logo waar twee cubes in mekaar vervleg is met 'n sterk yster tipe look."*
 *
 * ── Why the number is checked rather than trusted ────────────────────────
 *
 * The name IS the rule. "Cubed" means three, and a series published with two
 * classes in it is a promise broken to the person who sat down for the third —
 * quietly, because nothing on a screen counts for you. So the three is one
 * constant, every screen reads it, and a series that is not three fails the
 * build.
 *
 * ── And why the split is checked hardest of all ──────────────────────────
 *
 * Because it is quoted TO GUESTS, in public, before they agree. A number that
 * says 60 on the invitation and 55 in the agreement is not a bug, it is the
 * thing that ends a relationship with somebody whose name was on three
 * classes. One constant, derived house share, and every sentence on the page
 * built from it.
 *
 * ── The mark ─────────────────────────────────────────────────────────────
 *
 * The first version of it was two cubes drawn one over the other and called
 * interwoven. It was rendered, looked at, and thrown away — a thing drawn
 * second is in front everywhere, which is overlapping. Woven needs the far
 * cube to come BACK over the near one somewhere, and that is a specific pass
 * this file holds, because a mark without it still looks deliberate and is
 * simply the wrong drawing.
 *
 * The second version was two cubes in the same stance, which she looked at and
 * sent back: *"die een moet half gedraai wees… en dan meer hoeke het."* Same
 * stance means same three directions, so the overlap added clutter and no
 * angles. So the questions here are asked of the geometry and not of the file:
 * the bars are crossed for real, the turn is measured against the view, and
 * the fresh angles are counted. A mark can be the wrong drawing and still read
 * perfectly in the source, which is the only reason any of this is code.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import {
  CLASSES_IN_A_SERIES, GUEST_SHARE, GUEST_TERMS, HOUSE_SHARE, SERIES,
  minutesOf, seriesById, splitAsSaid,
} from '../app/lib/cubed.ts';
import {
  BAR, CASING, FAR, NEAR, OVER, SQUARE_ON, TURN, TURN_AXIS, VIEW, cubeBars,
} from '../app/lib/cubedmark.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const room = withoutComments(readFileSync('app/components/CubedRoom.tsx', 'utf8'));
const mark = withoutComments(readFileSync('app/components/CubedMark.tsx', 'utf8'));
const page = withoutComments(readFileSync('app/page.tsx', 'utf8'));
const css = readFileSync('app/globals.css', 'utf8');

/* ── 1. The rule the name means ───────────────────────────────────────── */

ok('a masterclass is three classes',
  CLASSES_IN_A_SERIES === 3,
  'the name is the rule — "die rede vir cubed gaan oor die mag 3"');

ok('  and every series really has three',
  (() => {
    const wrong = SERIES
      .filter((one) => one.parts.length !== CLASSES_IN_A_SERIES)
      .map((one) => `${one.id} has ${one.parts.length}`);
    for (const one of wrong) console.log(`         ${one}`);
    return wrong.length === 0;
  })(),
  'a series published with two is a promise broken to the person who sat'
  + ' down for the third, and nothing on a screen counts for them');

ok('  and they are numbered one, two, three',
  SERIES.every((one) => one.parts.every((part, at) => part.part === at + 1)),
  'a series whose parts are 1, 2, 2 reads as a list and not as an order');

ok('  and each part says what it is for',
  SERIES.every((one) => one.parts.every((part) =>
    part.outcome[0].trim().length > 20 && part.outcome[1].trim().length > 20
    && part.minutes > 0)),
  'a class with no outcome is a lecture, and the whole shape of three is'
  + ' that each one leaves somebody able to do something');

ok('  and the length adds up',
  SERIES.every((one) => minutesOf(one) === one.parts.reduce((s, p) => s + p.minutes, 0)),
  'a total that is not the sum of the parts is a number the page invented');

/* ── 2. The split, which is quoted to guests ──────────────────────────── */

ok('sixty per cent goes to the guest',
  GUEST_SHARE === 0.6,
  'her number, and the direction matters: the guest has the audience and the'
  + ' reputation at stake');

ok('  and the two halves cannot stop adding up',
  Math.abs(GUEST_SHARE + HOUSE_SHARE - 1) < 1e-9,
  'the house share is derived rather than typed, so there is no second number'
  + ' to forget');

ok('  and it is said the way a person says it',
  splitAsSaid() === '60/40',
  splitAsSaid());

ok('  and the guest terms quote the real numbers',
  (() => {
    const one = GUEST_TERMS.map((term) => term[0]).join(' ');
    return one.includes('60%') && one.includes('40%')
      && one.includes(`${CLASSES_IN_A_SERIES} sessions`);
  })(),
  'a number in a conversation is a number two people remember differently; a'
  + ' number on the page a guest read before saying yes is an agreement');

ok('  and every term is written in both languages',
  GUEST_TERMS.every((term) => term[0].trim() && term[1].trim() && term[0] !== term[1]),
  'a guest reading Afrikaans is being asked to agree to something in another'
  + ' language');

ok('  and the room prints the split rather than a number of its own',
  /splitAsSaid\(\)/.test(room) && /Math\.round\(GUEST_SHARE \* 100\)/.test(room)
  && !/\b60\/40\b/.test(room),
  'a 60/40 typed into the page is a number that stays 60/40 the day the'
  + ' constant moves');

ok('  and the room says the terms out loud',
  /data-cubedterms/.test(room) && /GUEST_TERMS\.map/.test(room),
  '"Ons moet dit ook so uit stipuleer vir ons gaste" — in public, before the'
  + ' conversation');

/* ── 3. Nothing is promised that is not arranged ──────────────────────── */

ok('every series says where it stands',
  SERIES.every((one) => ['planned', 'recording', 'open'].includes(one.stage)),
  'a room full of classes nobody can press reads as broken rather than as a'
  + ' calendar');

ok('  and the room says the rest are still being arranged',
  /data-cubedmore/.test(room) && /cubed\.more/.test(room),
  'she is arranging them — a room listing six imaginary guests would be the'
  + ' landing page promising something, which is the fault this app already'
  + ' has a check about');

ok('  and an id that is not there answers nothing',
  seriesById('no-such-series') === undefined);

/* ── 4. The mark: two cubes, one turned, really passing through ───────── */

/** A bar is "Mx,yLx,y". Read it back as the two ends. */
const endsOf = (d: string): [number, number, number, number] => {
  const n = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  return [n[0], n[1], n[2], n[3]];
};

/** Where two bars cross, if they cross anywhere but at a shared end. */
const crosses = (one: string, two: string): boolean => {
  const [ax, ay, bx, by] = endsOf(one);
  const [cx, cy, dx, dy] = endsOf(two);
  const rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy;
  const turn = rx * sy - ry * sx;
  if (Math.abs(turn) < 1e-9) return false;
  const t = ((cx - ax) * sy - (cy - ay) * sx) / turn;
  const u = ((cx - ax) * ry - (cy - ay) * rx) / turn;
  /* Strictly inside both, so two bars meeting at a corner do not count. */
  return t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98;
};

/** The screen directions a cube's bars run in, to the nearest degree. */
const anglesOf = (cube: readonly string[]): Set<number> => new Set(cube.map((d) => {
  const [ax, ay, bx, by] = endsOf(d);
  const deg = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
  return Math.round(((deg % 180) + 180) % 180);
}));

const boxOf = (cube: readonly string[]): [number, number, number, number] => {
  const xs: number[] = [], ys: number[] = [];
  for (const d of cube) { const [ax, ay, bx, by] = endsOf(d); xs.push(ax, bx); ys.push(ay, by); }
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};

ok('the mark draws two cubes',
  FAR.length >= 9 && NEAR.length >= 9 && /\bFAR\b/.test(mark) && /\bNEAR\b/.test(mark),
  'her words: "twee cubes in mekaar vervleg"');

ok('  and a cube hides the edges behind it',
  cubeBars(SQUARE_ON, 0, 21, 60, 60).length === 9,
  'a cube seen corner-on shows nine of its twelve edges. Drawing all twelve'
  + ' is a wireframe, which reads as a diagram rather than as a solid thing —'
  + ' and the three it must drop are only knowable from the face normals');

ok('  and the second one is really turned',
  (() => {
    /* Every direction in the whole mark, with near-parallels folded together. */
    const apart = (a: number, b: number) => Math.min(Math.abs(a - b), 180 - Math.abs(a - b));
    const kept: number[] = [];
    for (const deg of [...anglesOf(FAR), ...anglesOf(NEAR)].sort((a, b) => a - b)) {
      if (kept.every((was) => apart(was, deg) >= 7)) kept.push(deg);
    }
    if (kept.length < 5) console.log(`         ${kept.length} directions: ${kept.join(', ')}`);
    return kept.length >= 5;
  })(),
  '"die een moet half gedraai wees… en dan meer hoeke het, omdat die een'
  + ' gedraai is". Two cubes in the SAME stance share three directions between'
  + ' them, so overlapping them adds clutter and no angles — which is exactly'
  + ' what the first version of this mark was. And the folding is why this'
  + ' counts five and not six: a turn that leaves two bars three degrees off'
  + ' parallel reads as a line that missed, not as an angle, and two of the'
  + ' turns tried here did precisely that');

ok('  and it is turned ACROSS the view, not around it',
  Math.abs(TURN_AXIS[0] * VIEW[0] + TURN_AXIS[1] * VIEW[1] + TURN_AXIS[2] * VIEW[2]) < 1e-9
  && TURN > 0.2,
  'turning a cube about the corner we are looking down spins the finished'
  + ' drawing on the page and changes nothing about it: same bars, same'
  + ' angles. Those were generated, looked at, and thrown away. Only an axis'
  + ' across the view shows a face the other cube is not showing');

ok('  and the two sit inside one another',
  (() => {
    const [ax, ay, bx, by] = boxOf(FAR);
    const [cx, cy, dx, dy] = boxOf(NEAR);
    const over = Math.max(0, Math.min(bx, dx) - Math.max(ax, cx))
      * Math.max(0, Math.min(by, dy) - Math.max(ay, cy));
    const least = Math.min((bx - ax) * (by - ay), (dx - cx) * (dy - cy));
    return over / least > 0.55;
  })(),
  '"Die cubed nog meer in mekaar" — two cubes touching at a corner are two'
  + ' cubes next to each other');

ok('  and the near one erases what it crosses',
  /bars\(NEAR, back, CASING\)/.test(mark),
  'without the erasing pass the near cube is simply drawn on top, and lines'
  + ' show through it');

ok('  and the far one comes BACK over the near one',
  /bars\(OVER\.map\(\(at\) => FAR\[at\]\), back, CASING\)/.test(mark)
  && /bars\(OVER\.map\(\(at\) => FAR\[at\]\), iron, BAR\)/.test(mark),
  'this is the whole of the word. Without it the far cube is merely behind,'
  + ' and behind is overlapping rather than woven — which is exactly what the'
  + ' first version of this mark was');

ok('  and the bars it brings back over really do cross the other cube',
  OVER.length >= 2 && OVER.every((at) => FAR[at] !== undefined
    && NEAR.some((other) => crosses(FAR[at], other))),
  'a bar chosen to come back over that crosses NOTHING is drawn twice and'
  + ' changes no pixel. The mark then looks deliberate in the source and'
  + ' overlapped on the page, and no amount of reading the file tells you'
  + ' which — so they are crossed here for real');

ok('  and the casing is wider than the bar it hides',
  CASING > BAR + 1 && BAR > 0,
  'a casing the same width as the bar leaves the line it was meant to hide'
  + ' showing along both edges');

ok('  and the whole mark stays inside its box',
  (() => {
    const [ax, ay, bx, by] = boxOf([...FAR, ...NEAR]);
    const lip = CASING / 2;
    return ax - lip > 0 && ay - lip > 0 && bx + lip < 120 && by + lip < 120;
  })(),
  'a bar whose casing runs off the viewBox is clipped square at the edge, and'
  + ' a rounded cap that ends in a straight cut reads as a broken line');

ok('  and the background is given rather than assumed',
  /readonly back\?: string;/.test(mark) && /back = '#/.test(mark)
  /* And the rooms that draw it pass their own, rather than letting the
     default stand on a surface it does not match. */
  && /back=\{INK\}/.test(room) && /back="#0b0b0e"/.test(page),
  'the erasing pass is painted in the page’s own colour, so a mark that'
  + ' assumes black has black gashes through it on a white page');

ok('  and the iron is one gradient across the whole mark',
  /gradientUnits="userSpaceOnUse"/.test(mark),
  'a gradient per bar lights every bar from its own direction, and twenty'
  + ' separately lit bars read as twenty objects rather than two cubes');

/* ── 5. The room is dark through the theme, not around it ─────────────── */

ok('the room declares its darkness to the theme',
  /\[data-cubed\]/.test(css) && /data-cubed/.test(room),
  '`white` in this app is `--fb-ink`, which follows the theme — so a room'
  + ' that paints its own black and writes `text-white` on top draws every'
  + ' heading near-black on near-black under the light theme. It compiled, it'
  + ' read correctly, and it was invisible');

ok('  and it paints its background with a class that exists',
  /className="min-h-screen bg-zinc-950"/.test(room),
  'the second version used `bg-page`, which is not a utility: it compiled,'
  + ' produced rgba(0,0,0,0), and let the light body through');

ok('  and no inline colour is left fighting the tokens',
  !/style=\{\{ background: INK \}\}/.test(room)
  && !/borderColor: 'rgba/.test(room),
  'a room with half its colours in tokens and half in style attributes is a'
  + ' room that is wrong in one theme and nobody knows which');

ok('  and the palette reaches the footer the layout renders',
  /body:has\(\[data-cubed\]\)/.test(css),
  'the site footer is a SIBLING of the page, so a selector on the room alone'
  + ' ends a near-black room in a white band');

/* ── 6. Her button ───────────────────────────────────────────────────── */

ok('the classes section has its own door into the room',
  /data-cubeddoor/.test(page) && /href="\/cubed"/.test(page),
  'her words: "Die masterclass button moet ook sy eie button hê en wanneer'
  + ' iemand daar op click vat dit jou ook na ’n futuristic kamer toe"');

ok('  and the door carries the mark',
  /<CubedMark size=\{48\}/.test(page),
  'the mark is the only thing on that page with a surface, which is what'
  + ' makes it read as a door into somewhere else rather than another row');

ok('  and the section is called what she called it',
  /t\('tab\.classes', 'Cubed classes'\)/.test(page),
  '"Die masterclass section wil ek rename na Cubed classes"');

console.log(bad === 0
  ? '\n  Three to a masterclass, sixty to the guest, said in public — and the two\n'
    + '  cubes really do pass through each other.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);
