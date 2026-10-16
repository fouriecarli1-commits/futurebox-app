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
import { AUDIO_FX, AUDIO_FX_GROUPS, cleanAudioFx, fadeLevel } from '../app/lib/audiofx';
import { soundEdges, type Piece } from '../app/lib/videoedit';
import { FX_EFFECT_GROUPS, FX_FILTER_GROUPS } from '../app/lib/videofx';

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

ok('every effect and filter group is on one of the two shelves, once',
  FX_GROUPS.every((g) => (FX_EFFECT_GROUPS.includes(g.id) ? 1 : 0) + (FX_FILTER_GROUPS.includes(g.id) ? 1 : 0) === 1));

/* ── The sound ── */
ok('every sound effect is in a group that is shown, with a line saying what it does',
  AUDIO_FX.every((one) => AUDIO_FX_GROUPS.some((g) => g.id === one.group) && one.what[0].length > 8 && one.what[1].length > 8));
ok('a stored list of sound effects is cleaned the same way',
  cleanAudioFx([{ id: 'echo', amount: 3 }, { id: 'echo', amount: 0.1 }, { id: 'nope' as never, amount: 1 }]).length === 1);
ok('the three cross fades have the curves their names say',
  Math.abs(fadeLevel('smooth', 0.5) - Math.SQRT1_2) < 1e-9 && fadeLevel('even', 0.5) === 0.5
  && fadeLevel('quick', 0.5) === 0.25 && fadeLevel('cut', 0) === 1 && fadeLevel('smooth', 0) === 0);
const shot = (id: string, extra: Partial<Piece> = {}): Piece => ({ id, clip: new Blob([]), name: id, from: 0, to: 4, ...extra });
const three = [shot('a'), shot('b', { join: 'dissolve' as Piece['join'], joinFor: 0.6 }), shot('c', { join: 'dissolve' as Piece['join'], soundJoin: 'cut' })];
const first = soundEdges(three, 0);
const middle = soundEdges(three, 1);
const last = soundEdges(three, 2);
ok('a shot\u2019s sound fades out through the next transition and in through its own',
  !first.soundIn && first.soundOut?.how === 'smooth' && first.soundOut.seconds === 0.6
  && middle.soundIn?.seconds === 0.6 && !middle.soundOut && !last.soundIn,
  JSON.stringify({ first, middle, last }));

const edit = readFileSync('app/lib/videoedit.ts', 'utf8');
ok('the piece carries its effects into the scene', /fx\?\.length \? \{ fx: cleanFx\(one\.fx\) \}/.test(edit));

const stitch = readFileSync('app/lib/stitch.ts', 'utf8');
const patches = stitch.indexOf('drawPatches(context, video, cut.scenes[index].blurs');
const painted = stitch.indexOf('paintFx(context, cut.width, cut.height');
const shapes = stitch.indexOf('for (const one of cut.shapes ?? []) drawShape(');
ok('the export paints them after the shot and its patches, before shapes, words and the mark',
  patches > 0 && painted > patches && shapes > painted, `${patches} < ${painted} < ${shapes}`);

ok('the export puts the song through its sound effects before its level',
  /chainAudioFx\(audioContext, song, songGain, cut\.audioFx\)/.test(stitch));
ok('  and a shot\u2019s sound through its own, then its level through the transitions',
  /chainAudioFx\(audioContext, (from|high), level, cut\.scenes\[index\]\.sfx\)/.test(stitch) && /fadeLevel\(arrive\.how/.test(stitch));
ok('the cut carries the sound effects and the fades', /sfx: cleanAudioFx\(one\.sfx\)/.test(edit) && /\.\.\.soundEdges\(kept, at\)/.test(edit)
  && /audioFx: cleanAudioFx\(edit\.underFx\)/.test(edit));

const room = readFileSync('app/components/VideoEditor.tsx', 'utf8');
ok('the preview hears the same chains', /useAudioFx\(viewer,/.test(room) && /useAudioFx\(bed, edit\.underFx\)/.test(room));
ok('the preview draws them with the same grade the player shows',
  /<FxFrame[\s\S]{0,200}grade=\{gradeCss\(filterCss\(piece\.look\), piece\.adjust, previewScale\)\}/.test(room));

if (bad) {
  console.error(`\ncheck:videoeffects — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:videoeffects — effects, filters and sound effects go from the piece to the film by the same code the preview uses, and the cross fades have the curves their names say.');
