/**
 * The poster maker's sentences, without a browser.
 *
 *   npm run check:postposter
 *
 * The owner, 16 October 2026: a poster maker with three ways in. What has to
 * hold is that what she typed is what is asked to be drawn, exactly and in
 * quotation marks that her own quotes cannot break; that a kind carries its
 * look and asks for words in her language; that a photo goes up as the
 * subject; that nothing invents a logo; that the button waits until there
 * is something to draw; and that it goes through the magic touch's route at
 * the magic touch's price.
 */
import { readFileSync } from 'node:fs';
import { before } from './order.mts';
import { MOST, NO_LINES, POSTER_KINDS, POSTER_SIZES, inQuotes, posterAsk, quotedIn, readyToDraw } from '../app/lib/postposter.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

/* Describe. */
const described = posterAsk({ way: 'describe', describe: 'A summer market with "Saturday Market" and “Bring a basket”' });
ok('the words she put in quotation marks are drawn exactly', described.includes('"Saturday Market"') && described.includes('"Bring a basket"') && /exactly as written/.test(described));
ok('  curly quotes count as quotes', JSON.stringify(quotedIn('a “Hallo” and "Totsiens"')) === JSON.stringify(['Hallo', 'Totsiens']));
ok('  with nothing quoted, the engine is told to keep words short and right', /short, correctly spelled/.test(posterAsk({ way: 'describe', describe: 'a bakery poster' })));

/* Kind. */
for (const kind of POSTER_KINDS) {
  const asked = posterAsk({ way: 'kind', kind: kind.id, about: 'something', lang: 'af' });
  if (!asked.includes(kind.look)) ok(`the ${kind.en} kind carries its look`, false);
}
ok(`every kind carries its own look (${POSTER_KINDS.length})`, POSTER_KINDS.length >= 12 && new Set(POSTER_KINDS.map((k) => k.look)).size === POSTER_KINDS.length
  && POSTER_KINDS.every((k) => k.en && k.af && k.hintEn && k.hintAf));
const kindAf = posterAsk({ way: 'kind', kind: 'sale', about: '30% af alle baadjies, Saterdag', lang: 'af' });
ok('a kind asks for a headline and a button in her language', /in Afrikaans/.test(kindAf) && /headline/.test(kindAf) && /call to action/.test(kindAf));
ok('  and keeps her dates, prices and names as given', /exactly as given/.test(kindAf) && kindAf.includes('30% af alle baadjies, Saterdag'));

/* Lines. */
const lines = { ...NO_LINES, headline: 'Die "Groot" Opening', sub: 'Vrydag 7 November', cta: 'Kom kuier' };
const fielded = posterAsk({ way: 'lines', lines, kind: 'opening' });
ok('each line is drawn exactly, biggest first', before(fielded, 'Die ’Groot’ Opening', 'Vrydag 7 November') && fielded.includes('"Kom kuier"'));
ok('  her own quotation marks cannot end ours early', !fielded.includes('"Groot"') && inQuotes('a "b" c', 20) === 'a ’b’ c');
ok('  an empty line is not asked for', !/Contact details/.test(fielded) && !/short line of text/.test(fielded));
ok('  a line too long is cut to what a picture can carry', posterAsk({ way: 'lines', lines: { ...NO_LINES, headline: 'x'.repeat(200) } }).includes(`"${'x'.repeat(MOST.headline)}"`));

/* Everything. */
ok('a photo goes up as the subject, kept recognisable', /attached picture is the subject/.test(posterAsk({ way: 'describe', describe: 'my candle', photo: true }))
  && !/attached picture/.test(posterAsk({ way: 'describe', describe: 'my candle' })));
ok('no poster invents a logo', [described, kindAf, fielded].every((one) => /No logos/.test(one) && /inside the frame/.test(one)));
ok('the button waits until there is something to draw',
  !readyToDraw({ way: 'describe', describe: '' }) && !readyToDraw({ way: 'kind', kind: 'sale', about: '' }) && !readyToDraw({ way: 'lines', lines: NO_LINES })
  && readyToDraw({ way: 'kind', kind: 'sale', about: 'big sale' }) && readyToDraw({ way: 'lines', lines: { ...NO_LINES, headline: 'Hi' } }));
ok('every shape is one the picture route takes, and a post size in the editor',
  POSTER_SIZES.every((one) => ['1:1', '16:9', '9:16', '4:3', '3:4'].includes(one.aspect))
  && POSTER_SIZES.every((one) => readFileSync('app/lib/posttext.ts', 'utf8').includes(`id: '${one.id}'`)));

const sheet = readFileSync('app/components/PosterMaker.tsx', 'utf8');
ok('it is drawn through the magic touch\'s route, at its price, said on the button',
  /fetch\('\/api\/google\/picture'/.test(sheet) && /String\(CREDITS\.repaint\)/.test(sheet) && /Authorization: `Bearer \$\{token\}`/.test(sheet));
ok('  and a photo goes as a reference, not as the picture to be changed', /packLed\(null, \[photo\]\)/.test(sheet));

if (bad) {
  console.error(`\ncheck:postposter — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:postposter — what she typed is what is drawn, each kind has its look, a photo is the subject, and the button says its price.');
