/**
 * Product photos' sentences, without a browser.
 *
 *   npm run check:productshots
 *
 * The owner, 16 October 2026: *"Generate product photos in seconds."* What has
 * to hold is that the product is said to stay exactly as it is — first,
 * before the scene, and again last — that each scene is its own place, that
 * her extra words go in but cannot run on, that nothing is added to the
 * picture that is not on the product, and that it goes through the magic
 * touch's route at its price with the product as a reference.
 */
import { readFileSync } from 'node:fs';
import { before } from './order.mts';
import { MOST_EXTRA, PRODUCT_SCENES, PRODUCT_SIZES, productAsk } from '../app/lib/productshots.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const beach = productAsk('beach', 'with a straw hat beside it');
ok('the product is kept exactly — said before the scene', before(beach, 'Reproduce the product exactly', 'Place it on smooth sand'));
ok('  and said again last', beach.endsWith('Keep the product itself unchanged.'));
ok('  its label, lettering and logo named, so none is redrawn', /label, lettering and logo/.test(beach) && /Do not redraw, restyle, recolour, reletter or improve it/.test(beach));
ok('her extra words go in', beach.includes('Also: with a straw hat beside it.'));
ok('  but cannot run on', !productAsk('white', 'x'.repeat(500)).includes('x'.repeat(MOST_EXTRA + 1)));
ok('  and none is no sentence at all', !/Also:/.test(productAsk('white')));
ok('nothing is added that is not on the product', /Add no text, logos, price tags or watermarks besides what is on the product itself/.test(beach));
ok(`every scene is its own place, named in both languages (${PRODUCT_SCENES.length})`, PRODUCT_SCENES.length >= 14
  && new Set(PRODUCT_SCENES.map((one) => one.scene)).size === PRODUCT_SCENES.length && PRODUCT_SCENES.every((one) => one.en && one.af));
ok('an unknown scene falls back to the clean white one', productAsk('nowhere').includes(PRODUCT_SCENES[0].scene));
ok('every shape is one the picture route takes, and a post size in the editor',
  PRODUCT_SIZES.every((one) => ['1:1', '16:9', '9:16', '4:3', '3:4'].includes(one.aspect))
  && PRODUCT_SIZES.every((one) => readFileSync('app/lib/posttext.ts', 'utf8').includes(`id: '${one.id}'`)));

const sheet = readFileSync('app/components/ProductShots.tsx', 'utf8');
ok('it is made through the magic touch\'s route, at its price, said on the button',
  /fetch\('\/api\/google\/picture'/.test(sheet) && /String\(CREDITS\.repaint\)/.test(sheet) && /Authorization: `Bearer \$\{token\}`/.test(sheet));
ok('  with the product sent as a reference, and nothing sent without one', /packLed\(null, \[product\]\)/.test(sheet) && /disabled=\{!product \|\| busy\}/.test(sheet));

if (bad) {
  console.error(`\ncheck:productshots — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:productshots — the product stays exactly itself, each scene is its own place, and the button says its price.');
