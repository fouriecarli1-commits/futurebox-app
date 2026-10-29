/**
 * Make my photo good: three of fal.ai's own models, priced, asked with the
 * fields on their own pages, and shut until the owner has cleared them.
 */
import { readFileSync } from 'node:fs';
import { RESTORES, RESTORE_IDS, restoreInput } from '../app/lib/restore.ts';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

ok('three presses, each fal.ai\'s own model', RESTORE_IDS.length === 3 && RESTORE_IDS.every((id) => RESTORES[id].model.startsWith('fal-ai/')));
ok('  each with its fields written down', RESTORE_IDS.every((id) => readFileSync('docs/FAL-SKEMAS.md', 'utf8').includes(`\`${RESTORES[id].model}\``)));
ok('  and none under two credits', RESTORE_IDS.every((id) => RESTORES[id].credits >= 2));
const faces = restoreInput('faces', 'data:x');
ok('faces are asked with the page\'s own names', faces.upscale_factor === 2 && faces.face_upscale === true && faces.only_center_face === false && typeof faces.fidelity === 'number');
ok('a repair comes back in the answer, as PNG', restoreInput('repair', 'data:x').sync_mode === true && restoreInput('repair', 'data:x').output_format === 'png');

const route = withoutComments(readFileSync('app/api/restore/route.ts', 'utf8'));
const bench = withoutComments(readFileSync('app/components/RestoreBench.tsx', 'utf8'));
const lib = readFileSync('app/lib/restore.ts', 'utf8');
const cleared = /export const RESTORE_CLEARED = (true|false);/.exec(lib)?.[1];
ok('it is shut until the owner clears it, in the route and on the screen',
  cleared !== undefined && /if \(!RESTORE_CLEARED/.test(route) && /if \(!RESTORE_CLEARED \|\| !picture\) return null;/.test(bench));
ok('both yeses, the picture looked at, then charged', /body\?\.abroad !== true \|\| body\?\.adult !== true/.test(route)
  && /screenPicture\([\s\S]{0,300}await charge\(/.test(route));
ok('given back when the engine fails or sends nothing', (route.match(/paid\.refund\(\)/g) ?? []).length >= 2);
ok('the screen asks the two yeses first, and says each price', /if \(!yes && !agreed\) \{ setAsking\(id\)/.test(bench) && /creditsSaid\(spec\.credits/.test(bench));

if (bad) {
  console.error(`\ncheck:restore — ${bad} problem(s).`);
  process.exit(1);
}
console.log(`\ncheck:restore — repair, faces and colour are fal.ai's own, priced and asked right${cleared === 'true' ? '' : ', and shut until cleared'}.`);
