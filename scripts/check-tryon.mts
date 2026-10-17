/**
 * Clothes on a model, without a browser.
 *
 *   npm run check:tryon
 *
 * Carli, 16 October 2026: *"Show clothes on models."* What has to hold is
 * that the garment is said to stay exactly itself, first and last; that a
 * real person's photo keeps them themselves and is never sent without the
 * box ticked; that every model, described or real, is an adult; and that it
 * goes through the magic touch's route at its price.
 */
import { readFileSync } from 'node:fs';
import { before } from './order.mts';
import { MODELS, POSES, SETTINGS, TRYON_SIZES, tryOnAsk } from '../app/lib/tryon.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const described = tryOnAsk({ model: 'm35', setting: 'street', pose: 'walking' });
ok('the garment is kept exactly — said first', described.startsWith('The first attached picture shows a piece of clothing. Reproduce that exact garment'));
ok('  and said again last', described.endsWith('Keep the garment itself unchanged.'));
ok('a described model is worn, posed and placed', described.includes(MODELS.find((m) => m.id === 'm35')!.who) && /walking towards the camera/.test(described) && /sunny city street/.test(described));
const real = tryOnAsk({ model: 'real', setting: 'studio', pose: 'standing', person: true });
ok('a real person is kept themselves — not beautified, slimmed or changed', /Keep them exactly themselves — the same face, hair, skin tone, build and age/.test(real) && /Do not beautify, slim or change them/.test(real));
ok('  and the garment is still said before the person', before(real, 'Reproduce that exact garment', 'The second attached picture is the person'));
ok('every model is an adult, described or real', [described, real, ...MODELS.map((m) => tryOnAsk({ model: m.id, setting: 'studio', pose: 'half' }))].every((one) => /adult/.test(one))
  && MODELS.every((m) => !/\b(girl|boy|child|kid|teen|teenager)\b/i.test(m.who)));
ok(`the models, settings and poses are named in both languages (${MODELS.length}, ${SETTINGS.length}, ${POSES.length})`,
  MODELS.length >= 8 && SETTINGS.length >= 6 && POSES.length >= 3 && [...MODELS, ...SETTINGS, ...POSES].every((one) => one.en && one.af));
ok('nothing is added that is not on the garment', /No text, logos or watermarks besides what is on the garment itself/.test(described));
ok('every shape is one the picture route takes, and a post size in the editor',
  TRYON_SIZES.every((one) => ['1:1', '16:9', '9:16', '4:3', '3:4'].includes(one.aspect))
  && TRYON_SIZES.every((one) => readFileSync('app/lib/posttext.ts', 'utf8').includes(`id: '${one.id}'`)));

const sheet = readFileSync('app/components/TryOn.tsx', 'utf8');
ok('it is made through the magic touch\'s route, at its price, said on the button',
  /fetch\('\/api\/google\/picture'/.test(sheet) && /String\(CREDITS\.repaint\)/.test(sheet) && /Authorization: `Bearer \$\{token\}`/.test(sheet));
ok('  a real person is never sent without the box ticked', /const ready = Boolean\(garment\) && \(!real \|\| \(Boolean\(person\) && consent\)\)/.test(sheet) && /disabled=\{!ready \|\| busy\}/.test(sheet) && /if \(!ready \|\| !garment \|\| busy\) return/.test(sheet));
ok('  and the box says they are an adult who agreed', /they have agreed to be shown wearing this\. They are an adult\./.test(sheet));

if (bad) {
  console.error(`\ncheck:tryon — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:tryon — the garment stays itself, a real person stays themselves and is asked about, and every model is an adult.');
