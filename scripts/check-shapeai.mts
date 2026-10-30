/**
 * Shapes in the Photo Editor: the AI's outline, and every setting on every shape.
 *
 * The owner, 30 October 2026: *"Ek sien jy het nog nie gewerk aan my ding
 * rondom shapes nie. Dat photo editor dalk ook 'n ai engine het waar jy
 * sekere shapes vra en al die verstellings wat ek vroeer gevra het moet saam
 * met 'n shape gaan."* Held here: what the AI answers is read and fitted,
 * never trusted; it costs what the button says and is refunded when nothing
 * comes back; and the settings the words have are on the shapes too.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { before } from './order.mts';
import { fitShapePath, shapeAsk } from '../app/lib/shapeai.ts';
import { CREDITS } from '../app/lib/credits.ts';
import { CORNERS, FILLED_KINDS, MARK_SPECS } from '../app/lib/postshapes.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

/* ── Reading what the AI answers ───────────────────────────────────────── */
const tri = fitShapePath('M10 10 L210 10 L110 210 Z');
ok('an outline in any box comes back in 0 to 100', tri === 'M0 0L100 0L50 100Z', String(tri));
const wide = fitShapePath('M0 0 H200 V50 H0 Z');
ok('  with its shape kept, centred', wide === 'M0 37.5H100V62.5H0Z', String(wide));
ok('  wrapped in a fence or a whole <path>, it is still found',
  fitShapePath('```svg\n<path d="M0 0 L10 0 L5 10 Z"/>\n```') === 'M0 0L100 0L50 100Z');
ok('  repeated pairs after a command are read as that command (after M, as lines)',
  fitShapePath('M0 0 10 0 10 10 Z') === 'M0 0L100 0L100 100Z');
ok('lowercase, arcs and anything else are not an outline', [
  'm0 0 l10 0 l0 10 z', 'M0 0 A5 5 0 0 1 10 10 Z', '<script>alert(1)</script>', 'M0 0 L10 0 url(x) Z', 'Here is your shape!',
].every((one) => fitShapePath(one) === null));
ok('  nor is a line with no area, or one far too long', fitShapePath('M0 0 L10 0 L20 0 Z') === null && fitShapePath(`M0 0 ${'L1 1 '.repeat(3000)}Z`) === null);
ok('the AI is told the rules the reader holds it to', /absolute uppercase commands/.test(shapeAsk('x')) && /No arcs/.test(shapeAsk('x')) && /0 to 100/.test(shapeAsk('x')));

/* ── What it costs ─────────────────────────────────────────────────────── */
const route = withoutComments(readFileSync('app/api/shape/route.ts', 'utf8'));
ok('it costs at least two credits', CREDITS.shapeAi >= 2, String(CREDITS.shapeAi));
ok('the route charges that, and only after the screen and the ceiling', /charge\(request, CREDITS\.shapeAi/.test(route)
  && before(route, 'screen(words', 'charge(request') && before(route, "enough('image'", 'charge(request'));
ok('  refunded when the AI is slow or answers no outline', (route.match(/paid\.refund\(\)/g) ?? []).length >= 2);
ok('  and what leaves it has been through the reader', /fitShapePath\(answer\.text\)/.test(route) && /Response\.json\(\{ path \}/.test(route));

/* ── On the screen ─────────────────────────────────────────────────────── */
const studio = withoutComments(readFileSync('app/components/PostStudio.tsx', 'utf8'));
ok('the button says its price', /data-postshapeaigo[\s\S]{0,400}creditsSaid\(CREDITS\.shapeAi/.test(studio));
ok('  and the outline lands as a shape, kind "ai"', /newMark\('ai', id\), path/.test(studio));
for (const [what, key] of [['round corners', 'round'], ['see-through', 'opacity'], ['glow', 'glow'], ['shadow', 'shadow'], ['turn', 'turn']] as const) {
  ok(`every shape has ${what}`, studio.includes(`'${key}')}`));
}
ok('  and both flips', /data-postmarkflip="x"/.test(studio) && /data-postmarkflip="y"/.test(studio));
ok('  and see-through is on every shape, not only the filled ones',
  !/isFilled\(mark\.kind\) && slider\(t\('post\.markSeeThrough'/.test(studio));

/* ── More of them ──────────────────────────────────────────────────────── */
const picks = MARK_SPECS.length;
ok('at least twenty shapes to pick from', picks >= 20, String(picks));
ok('every filled shape but the AI\'s is on the list', FILLED_KINDS.filter((one) => one !== 'ai').every((one) => MARK_SPECS.some((spec) => spec.id === one)));
ok('the box, the rectangle, the triangle and the star can have their corners rounded', ['box', 'rect', 'triangle', 'star'].every((one) => one in CORNERS));

if (bad) {
  console.error(`\ncheck:shapeai — ${bad} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:shapeai — the AI\'s outline is read before it is drawn, priced on its button, and every shape has every setting.');
