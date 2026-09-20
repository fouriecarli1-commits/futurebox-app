/**
 * The gallery block in the CSS is the gallery theme, to the channel.
 *
 * ── Why this needs a check ───────────────────────────────────────────────
 *
 * `[data-gallery]` in `app/globals.css` is eighty-one variables. Nobody
 * typed them and nobody should: they are `themeVariables(GALLERY_THEME)`,
 * run through the same ramp maths and the same AA solve as every preset a
 * person can choose. A block that size, written out flat, is a block that
 * gets edited by hand the first time one colour looks slightly off — and
 * from then on the theme engine and the screen disagree, with the engine
 * being the one everybody reads.
 *
 * That has already happened once in this repository, to the `:root` block,
 * which is why `check:theme` exists. This is the same check for the same
 * shape of mistake, and it is separate only because the two blocks come
 * from two different themes.
 *
 * It also holds the two rules the gallery theme is FOR, which a later edit
 * could quietly undo: the wall has to be dark, and the room has to be
 * applied to the shell rather than to the component.
 *
 *   npm run check:gallery
 */
import { readFileSync } from 'node:fs';
import { GALLERY_THEME, themeVariables } from '../app/lib/theme';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) failures += 1;
};

const want = themeVariables(GALLERY_THEME);
const css = readFileSync('app/globals.css', 'utf8');

const open = css.indexOf('[data-gallery] {');
ok('the gallery block is in globals.css', open >= 0,
  'nothing selects [data-gallery] — the room falls back to the app theme and the seam is back');

if (open >= 0) {
  const block = css.slice(open, css.indexOf('\n}\n', open));
  const got: Record<string, string> = {};
  for (const match of block.matchAll(/(--fb-[\w-]+):\s*([^;]+);/g)) got[match[1]] = match[2].trim();

  const wrong: string[] = [];
  for (const [name, value] of Object.entries(want)) {
    if (got[name] === undefined) wrong.push(`${name} missing`);
    else if (got[name] !== value) wrong.push(`${name}: css "${got[name]}" vs theme "${value}"`);
  }
  for (const name of Object.keys(got)) if (!(name in want)) wrong.push(`${name} is in the css and not in the theme`);

  ok(`  and every one of its ${Object.keys(want).length} variables is what the theme engine produces`,
    wrong.length === 0, wrong.slice(0, 4).join(' ;; '));

  /* ── The two things the theme is for ────────────────────────────────

     Read off the generated numbers rather than off GALLERY_THEME's field
     names: 'ember' could be redefined in SURFACES tomorrow and the room
     would go pale with every name in this file still reading correctly. */
  const page = (want['--fb-page'] ?? '').split(' ').map(Number);
  const bright = Math.max(...page);
  ok('  the wall is dark enough for a painting to glow', page.length === 3 && bright < 60,
    `the page is rgb(${page.join(' ')}) — a gallery at an evening viewing is not a pale room`);

  const accent = (want['--fb-primary-500'] ?? '').split(' ').map(Number);
  ok('  and the accent is gold rather than the app green',
    accent.length === 3 && accent[0] > 200 && accent[2] < 100,
    `primary-500 is rgb(${accent.join(' ')})`);
}

/* ── And it is on the shell, not on the room ──────────────────────────────

   The whole point, and the one thing four rebuilds got wrong. The flag has
   to sit on the studio's own root — the element that also carries the
   header, the rail and the copilot — beside the booth's, which is the
   element this repository already proved works. Anywhere inside
   `ArtMarket.tsx` and it is a card in somebody else's page again. */
const page = readFileSync('app/page.tsx', 'utf8');
const at = page.indexOf("'data-booth': ''");
const shell = at < 0 ? '' : page.slice(at, at + 400);
ok('the gallery is switched on at the shell, beside the booth',
  /'data-gallery': ''/.test(shell),
  'data-gallery is not on the same element as data-booth — the chrome around the room keeps the app theme');

/* Comments stripped first. The room's own doc-comment points AT
   `[data-gallery]` to say where its colours come from, and the first
   version of this check read that as the room setting the flag on itself —
   a check that fails on a sentence describing the correct arrangement. */
const room = readFileSync('app/components/ArtMarket.tsx', 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
ok('  and the room does not try to set it on itself',
  !/data-gallery/.test(room),
  'ArtMarket sets data-gallery inside the room, which cannot reach the header, the rail or the copilot');
ok('  nor carry a font of its own',
  !/fontFamily:/.test(room),
  'the room overrides the face the shell already set — the seam this theme exists to remove');

if (failures) {
  console.error(
    '\ncheck:gallery — the gallery block and GALLERY_THEME have to be the same thing.'
    + ' Regenerate the block from themeVariables(GALLERY_THEME) rather than editing the CSS.\n',
  );
  process.exit(1);
}
console.log(
  `\ncheck:gallery — [data-gallery] is themeVariables(GALLERY_THEME) exactly (${Object.keys(want).length} variables),`
  + ' the wall is dark, the accent is gold, and it is applied to the shell.',
);
