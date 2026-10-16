/**
 * The video editor's effects reach the film, not only the preview.
 *
 * Carli, 16 October 2026, a desktop editor's toolbox with its Effects open.
 * `check:videofx` (the browser probe) reads the preview's pixels; this reads
 * the road from the piece to the export, which no probe can afford to render
 * on every push: the piece carries its effects, `cutFrom` hands them to the
 * scene cleaned, and `stitch` paints them with the same `paintFx` the preview
 * runs — after the shot and its blurred patches, before anything of ours.
 *
 *   npm run check:videoeffects
 */
import { readFileSync } from 'node:fs';
import { FX, FX_GROUPS, cleanFx } from '../app/lib/videofx';
import { GENERATORS, GENERATOR_GROUPS } from '../app/lib/videogenerators';

let bad = 0;
const ok = (label: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${label}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) bad += 1;
};

ok('every effect is in a group that is shown', FX.every((one) => FX_GROUPS.some((g) => g.id === one.group)));
ok('every generator is in a group that is shown', GENERATORS.every((one) => GENERATOR_GROUPS.some((g) => g.id === one.group)));
ok('effects and generators each have an Afrikaans name of their own',
  [...FX, ...GENERATORS].every((one) => one.af.trim().length > 0));

const cleaned = cleanFx([
  { id: 'glow', amount: 9 },
  { id: 'glow', amount: 0.2 },
  { id: 'nonsense' as never, amount: 0.5 },
  { id: 'grain', amount: Number.NaN },
]);
ok('a stored list is cleaned: known effects, each once, strength 0..1',
  cleaned.length === 2 && cleaned[0].amount === 1 && cleaned[1].amount === 0, JSON.stringify(cleaned));

const edit = readFileSync('app/lib/videoedit.ts', 'utf8');
ok('the piece carries its effects into the scene', /fx\?\.length \? \{ fx: cleanFx\(one\.fx\) \}/.test(edit));

const stitch = readFileSync('app/lib/stitch.ts', 'utf8');
const patches = stitch.indexOf('drawPatches(context, video, cut.scenes[index].blurs');
const painted = stitch.indexOf('paintFx(context, cut.width, cut.height');
const shapes = stitch.indexOf('for (const one of cut.shapes ?? []) drawShape(');
ok('the export paints them after the shot and its patches, before shapes, words and the mark',
  patches > 0 && painted > patches && shapes > painted, `${patches} < ${painted} < ${shapes}`);

const room = readFileSync('app/components/VideoEditor.tsx', 'utf8');
ok('the preview draws them with the same grade the player shows',
  /<FxFrame[\s\S]{0,200}grade=\{gradeCss\(filterCss\(piece\.look\), piece\.adjust, previewScale\)\}/.test(room));

if (bad) {
  console.error(`\ncheck:videoeffects — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:videoeffects — effects go from the piece to the film by the same paint the preview uses, and generators are all shown and named.');
