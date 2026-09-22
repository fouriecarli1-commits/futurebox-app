/**
 * The other kind of cover, offered where a cover is being chosen.
 *
 * Carli, 22 September 2026: *"Kyk asb in make a song en channel dat daar by
 * cover art 'n opsie is vir real art."*
 *
 * ── What is already held elsewhere, and is not repeated here ─────────────
 *
 * `onRealArt` is a REQUIRED prop on `Sleeve`, so the compiler already
 * refuses a room that mounts the cover panel with no way through to the
 * artists — that is why it is required rather than optional, and repeating
 * it here would be a rule measuring the type checker.
 *
 * `check:handover` already holds the door in `page.tsx` to carrying both the
 * song and the reason, and `check:ops` already holds `for_song` to having a
 * description in the registry.
 *
 * ── What nothing else holds ──────────────────────────────────────────────
 *
 * Four things, and every one of them can be true in the type system while
 * being false on the screen:
 *
 *   1. That the panel DRAWS the door. The prop can be taken and never used.
 *   2. That it draws it in BOTH of its states. The panel is two branches of
 *      JSX — one for a song with a cover and one for a song without — and a
 *      door added to one of them looks finished. The state that matters
 *      most is the second one: somebody looking at a machine's attempt they
 *      are not happy with.
 *   3. That the price on the button is the price the market actually opens
 *      at. A rand figure typed into a dictionary line is the classic thing
 *      that rots: `START_RAND` moves and the button goes on saying R200.
 *   4. That the song arriving in the gallery reaches the shelf, rather than
 *      being held in a state nothing reads. A handler that sets something
 *      nobody uses is the shape of the advert fault.
 *
 *   npm run check:realart
 *
 * The walk is `check:realartwalk`, which presses it.
 */
import { readFileSync } from 'node:fs';
import { START_RAND } from '../app/data/artmarket';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/* Prose out first, everywhere. Every file below explains itself at length,
   and half of those notes quote the thing being searched for. */
const read = (path: string): string =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (had) => had.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (had, before) => before + ' '.repeat(had.length - before.length));

/* ── 1 and 2: the panel draws it, in both of its states ──────────────── */

const sleeve = read('app/components/Sleeve.tsx');

ok('the cover panel draws a door to real art', /data-realart/.test(sleeve),
  'the prop is taken and never used, which the compiler is happy with');
ok('  and pressing it is what calls onRealArt', /onClick=\{onRealArt\}/.test(sleeve),
  'the button is drawn and wired to something else');

/* The panel is `url ? (…) : (…)`. Split on the ternary's own arms rather
   than counting, because "twice somewhere in the file" is satisfied by two
   copies in the same branch — which is the adjacent-measurement mistake
   this repo keeps finding. */
const arm = /\{url \? \(([\s\S]*?)\n      \) : \(([\s\S]*?)\n      \)\}/.exec(sleeve);
ok('the panel is still the two-state shape this rule reads', Boolean(arm),
  'the ternary was rewritten, so the two rules below are measuring nothing');
if (arm) {
  ok('  a song that has no cover yet is offered real art', /\{realArt\}/.test(arm[2]),
    'the first screen anybody sees offers only the machine');
  ok('  and so is a song whose drawn cover is not good enough', /\{realArt\}/.test(arm[1]),
    'the door is on one branch of the panel and not the other');
}

/* ── 3: the price on it is the price the market opens at ─────────────── */

const strings = readFileSync('app/lib/i18n.tsx', 'utf8');
const line = /"cover\.real":\s*\{([^}]*)\}/.exec(strings)?.[1] ?? '';
ok('the real-art option exists in the dictionary', line.length > 0);
for (const [tongue, word] of [['en', /artist/i], ['af', /kunstenaar/i]] as const) {
  const said = new RegExp(`${tongue}: "([^"]*)"`).exec(line)?.[1] ?? '';
  ok(`  and says in ${tongue} that a person makes it`, word.test(said), said);
  ok(`  and says in ${tongue} what it opens at`, said.includes(`R${START_RAND}`),
    `${said} — the market opens at R${START_RAND}`);
}

/* ── 4: the song reaches the shelf, not just a state ─────────────────── */

const market = read('app/components/ArtMarket.tsx');
ok('the gallery takes the song it was opened with', /for_song:\s*\(/.test(market));
ok('  and holds it', /setForSong\(/.test(market));
ok('  and says on screen which song it is', /data-forsong=/.test(market),
  'the room was opened for a song and looks identical to one opened from the rail');
ok('  and hands it to the shelf, where a bought piece is put on a song',
  /preset=\{forSong\}/.test(market),
  'held in a state nothing reads, which is a hand-off that arrives nowhere');
ok('  and opens the drawer it lands in', /startOpen=\{Boolean\(forSong\)\}/.test(market),
  'preselected inside a fold that is shut is the advert fault again');
/* The fold reads `startOpen` once, at mount. A song handed over after the
   drawer is already on screen therefore needs the fold remounted, and `key`
   is what does it. Without this the rule above passes and the panel stays
   shut on every route except a cold load. */
ok('  and remounts that drawer when the song arrives after it', /key=\{forSong \?\? ''\}/.test(market),
  'startOpen is read at mount only, so a late hand-off lands in a shut fold');

console.log(
  `\n  Both rooms reach the artists through one panel, and the option opens at R${START_RAND}.`,
);

if (failures) {
  console.error(`\ncheck:realart — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('check:realart — the cover panel offers real art in both of its states, and the song reaches the shelf.');
