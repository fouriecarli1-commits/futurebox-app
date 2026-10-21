/**
 * A transparency slider in both editors: a photo or a shot, solid or lighter.
 *
 * The owner, 21 October 2026: *"Ek dink ook video en photo editor kort 'n
 * transparency slider om 'n foto solied of ligter te maak."* The arithmetic
 * of the video side is run (`videomotion.ts`); the sliders are read for.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) failures += 1;
};

const { poseAt, moves, shows, cleanMotion } = await import('../app/lib/videomotion.ts');

const faded = { solid: 0.4 };
ok('a see-through shot is drawn at its transparency all the way through',
  Math.abs(poseAt(faded, 0, 4).opacity - 0.4) < 1e-9 && Math.abs(poseAt(faded, 3.9, 4).opacity - 0.4) < 1e-9);
ok('  and does not move', poseAt(faded, 2, 4).scale === 1 && poseAt(faded, 2, 4).x === 0);
ok('it is drawn through a pose, but not priced as a moving shot', shows(faded) && !moves(faded));
ok('with a movement as well, the two multiply',
  Math.abs(poseAt({ move: 'zoomIn', solid: 0.5 }, 2, 4).opacity - 0.5) < 1e-9 && poseAt({ move: 'zoomIn', solid: 0.5 }, 2, 4).scale !== 1);
ok('a saved film keeps it', cleanMotion({ solid: 0.4 })?.solid === 0.4);
ok('  never below a tenth, so a shot cannot be lost entirely', cleanMotion({ solid: 0 })?.solid === 0.1);
ok('  and solid is no motion at all', cleanMotion({ solid: 1 }) === undefined);

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const stitch = read('app/lib/stitch.ts');
ok('the finished film draws it, not only the preview', /shows\(motion\) \? poseAt\(/.test(stitch));
const video = read('app/components/VideoEditor.tsx');
ok('the video editor has the slider, with the filters', /bench === 'looks' && piece && \([\s\S]{0,700}data-editorsolid/.test(video));
ok('  and its preview fades too', /if \(!shows\(motion\)\) \{/.test(video));
const photo = read('app/components/PostStudio.tsx');
ok('the photo editor has the slider at the top of Adjust',
  /const toneBench = \([\s\S]{0,900}data-postphotoalpha/.test(photo) && /setPhotoAlpha\(1 - Number\(event\.target\.value\) \/ 100\)/.test(photo));

if (failures) {
  console.error(`\ncheck:transparency — ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:transparency — a photo or a shot can be solid or see-through, in both editors.');
