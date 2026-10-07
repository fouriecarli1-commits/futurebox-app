/**
 * Drawing round a thing, held to the arithmetic that decides whether it works.
 *
 *   npm run check:lasso
 *
 * Four things, each of which reaches her as the tool doing nothing or doing
 * something mad, with no error anywhere:
 *
 *   1. **A point outside the picture.** A finger traced round something at
 *      the edge leaves the glass on nearly every stroke. A polygon with a
 *      corner at -3 fills as nothing on one browser and as an enormous wedge
 *      on another, and neither throws.
 *   2. **Which way round she drew it.** The shoelace area is negative for an
 *      anticlockwise path. Returned signed, "did she draw enough" is true
 *      for a clockwise trace and false for the identical one drawn the other
 *      way — so the tool works for right-handed people and not left.
 *   3. **A path of six hundred points.** Every pointermove recorded is a
 *      polygon the mask canvas refills on every frame, and the drawing slows
 *      to a crawl halfway round the first person she traces.
 *   4. **A tap counted as a shape.** A finger that touches the glass while
 *      scrolling is three points a pixel apart, and cutting along it leaves
 *      a photograph of nothing.
 */
import {
  ENOUGH, NEAR, NEARLY_ALL, area, closed, softness, trace, whyNot, worthCutting,
  type Dot, type Path,
} from '../app/lib/lasso.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const walk = (dots: readonly (readonly [number, number])[]): Path =>
  dots.reduce<Path>((path, [x, y]) => trace(path, { x, y }), []);

/* ── 1. Nothing a finger can do puts a point outside the picture ──────── */
const WILD: readonly (readonly [number, number])[] = [
  [-3, 0.5], [0.5, -9], [2, 2], [0.5, 0.5], [-0.001, 1.001],
  [Number.NaN, 0.4], [0.4, Number.POSITIVE_INFINITY], [0.9, Number.NEGATIVE_INFINITY],
];
const wild = walk(WILD);
const out = wild.filter((one) => one.x < 0 || one.x > 1 || one.y < 0 || one.y > 1
  || !Number.isFinite(one.x) || !Number.isFinite(one.y));
ok('every point a finger can leave is held inside the picture',
  out.length === 0,
  `${out.map((one) => `${one.x},${one.y}`).join(' | ')} — a polygon with a corner`
  + ' outside fills as nothing on one browser and as a wedge on another');

/* ── 2. Which way round she drew it cannot matter ─────────────────────── */
const SQUARE: readonly (readonly [number, number])[] = [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]];
const round = walk(SQUARE);
const widdershins = walk([...SQUARE].reverse());
ok('a square covering 36 hundredths of the picture measures as 0.36',
  Math.abs(area(round) - 0.36) < 1e-9, String(area(round)));
ok('  and measures the same drawn the other way round',
  Math.abs(area(round) - area(widdershins)) < 1e-9,
  `${area(round)} against ${area(widdershins)} — a signed area makes the tool`
  + ' work for one hand and not the other');
ok('  and a triangle is half its box',
  Math.abs(area(walk([[0, 0], [1, 0], [1, 1]])) - 0.5) < 1e-9,
  String(area(walk([[0, 0], [1, 0], [1, 1]]))));
ok('  and the whole picture is all of it',
  Math.abs(area(walk([[0, 0], [1, 0], [1, 1], [0, 1]])) - 1) < 1e-9,
  String(area(walk([[0, 0], [1, 0], [1, 1], [0, 1]]))));

/* ── 3. A finger dragged slowly does not become six hundred points ───── */
const crawl: Path = Array.from({ length: 600 }, (_, i) => [0.2 + i * 0.0005, 0.5] as const)
  .reduce<Path>((path, [x, y]) => trace(path, { x, y }), []);
ok('a slow drag across the picture records tens of points, not hundreds',
  crawl.length > 2 && crawl.length < 60,
  `${crawl.length} points over 0.3 of the picture at ${NEAR} apart — every`
  + ' pointermove kept is a polygon the mask refills on every frame');
ok('  and the first one is always kept, because there is nothing to be far from',
  crawl.length > 0 && Math.abs(crawl[0].x - 0.2) < 1e-9, JSON.stringify(crawl[0]));
/* And the same point twice never grows the path. */
let same: Path = [];
for (let i = 0; i < 50; i += 1) same = trace(same, { x: 0.5, y: 0.5 });
ok('  and a finger held still adds one point and then no more', same.length === 1,
  `${same.length} points without moving`);

/* ── 4. A tap is not a shape, and the whole picture is not a selection ── */
ok('two points are not a shape', !closed(walk([[0.1, 0.1], [0.2, 0.2]])));
ok('  and three are', closed(round));
const tap: Path = [{ x: 0.5, y: 0.5 }, { x: 0.505, y: 0.5 }, { x: 0.5, y: 0.505 }];
ok('  a tap is too small to cut along', !worthCutting(tap) && whyNot(tap) === 'small',
  `${area(tap)} against a floor of ${ENOUGH} — cutting along it leaves a`
  + ' photograph of nothing');
ok('  and a trace round the whole picture is not a selection',
  !worthCutting(walk([[0, 0], [1, 0], [1, 1], [0, 1]]))
  && whyNot(walk([[0, 0], [1, 0], [1, 1], [0, 1]])) === 'all',
  `a ceiling of ${NEARLY_ALL}`);
ok('  and an ordinary shape is fine', worthCutting(round) && whyNot(round) === null,
  String(area(round)));
ok('  and a line with two points says it is too short, not too small',
  whyNot(walk([[0.1, 0.1], [0.9, 0.9]])) === 'short',
  String(whyNot(walk([[0.1, 0.1], [0.9, 0.9]]))));

/* ── And the edge softness is a real number of pixels at every size ──── */
for (const of of [{ width: 4032, height: 3024 }, { width: 64, height: 64 }, { width: 1, height: 1 }]) {
  const soft = softness(of);
  ok(`a ${of.width}x${of.height} picture gets a ${soft.toFixed(2)}px edge`,
    soft >= 1 && soft < Math.min(of.width, of.height) / 4 + 1,
    'a blur of nought is a hard line and a blur of half the picture is a smear');
}

if (bad) {
  console.error(`\ncheck:lasso — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:lasso — a traced path stays inside the picture, measures the same'
  + ' whichever way round it was drawn, stays tens of points long, and a tap'
  + ' is not mistaken for a shape.',
);
