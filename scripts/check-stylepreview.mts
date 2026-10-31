/**
 * Style match: the user's own photo in every tile, and many more styles.
 *
 * The owner, 30 October 2026: *"Met sulke veranderings voorstelle, kan jy nie
 * die foto wat huidiglik daar op is binne daai voorstelle sit nie? Ek dink daai
 * style match is baie cool. Ons kort ook baie verskillende voorstelle daar."*
 * Held here: every style on offer has a likeness the photo can be shown in,
 * and every one has its own (no two styles fall through to the same plain
 * picture); the tile shows the photo when there is one; and the styles stay
 * many.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { PREVIEWED } from '../app/lib/stylepreview.ts';
import { MAGIC_STYLES } from '../app/lib/magicstyles.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

const ids = MAGIC_STYLES.map((one) => one.id as string);
const previewed = PREVIEWED as readonly string[];
const missing = ids.filter((id) => !previewed.includes(id));
ok('every style has a likeness to show the photo in', missing.length === 0, missing.join(', '));
const stray = previewed.filter((id) => !ids.includes(id));
ok('  and no likeness is kept for a style that is not offered', stray.length === 0, stray.join(', '));
ok('the styles are many (at least 60)', ids.length >= 60, String(ids.length));
ok('  and none is offered twice', new Set(ids).size === ids.length);

const preview = withoutComments(readFileSync('app/lib/stylepreview.ts', 'utf8'));
const body = preview.slice(preview.indexOf('export function previewStyle'), preview.indexOf('export function drawCover'));
const cased = new Set([...body.matchAll(/case '([a-z0-9]+)'/g)].map((m) => m[1]));
const plain = ids.filter((id) => !cased.has(id));
ok('every style has its own treatment, none left to the plain default', plain.length === 0, plain.join(', '));
ok('  pixel work only, so it looks the same on every phone (no canvas filter)', !/\.filter\s*=/.test(preview));

const room = withoutComments(readFileSync('app/components/PostStudio.tsx', 'utf8'));
ok('the tile is given the photo in the room', /<StyleTile id=\{one\.id\} photo=\{picture\} \/>/.test(room));
ok('  draws it in the style', /drawCover\(work, spare\.width, photo\);\s*previewStyle\(work, spare\.width, id\);/.test(room));
ok('  on a spare canvas, so a photo the canvas may not read leaves the balloon possible', /document\.createElement\('canvas'\)/.test(room.slice(room.indexOf('function StyleTile'), room.indexOf('function StyleTile') + 1500)));

const tiles = withoutComments(readFileSync('app/lib/magicstyles.ts', 'utf8'));
ok('with no photo, the newer styles still show the balloon in their likeness', /if \(\(PREVIEWED as readonly string\[\]\)\.includes\(id\)\) previewStyle\(ctx, s, id\);/.test(tiles));

if (bad) {
  console.error(`\ncheck:stylepreview — ${bad} assertion(s) failed.`);
  process.exit(1);
}
console.log(`\ncheck:stylepreview — ${ids.length} styles, every one shown on the photo in the room.`);
