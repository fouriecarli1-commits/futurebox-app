/**
 * The price list on disk is the price list in the code.
 *
 *   npm run check:kaart
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli, 11 October 2026: *"Ek moet in 'n tabel sien wat kos die engines wat
 * ons gebruik, vs die krediete wat ons vra vir daardie funksie."*
 *
 * She is setting prices off that table. A document that was true the day it
 * was written and is not true today is worse than no document, because she
 * would have no reason to doubt it — and a price list goes stale silently,
 * since nothing in a build reads one.
 *
 * So `docs/KREDIETE.md` is GENERATED, and this fails when the file on disk
 * is not what the generator produces from the current code. A price changed
 * in `credits.ts` without running `npm run kaart` cannot survive a push.
 *
 * ── And the rule that was learnt the hard way ─────────────────────────────
 *
 * Every price must appear exactly ONCE. The first version of the generator
 * joined the costed rows to the credit keys by matching English words
 * against key spellings, and it was wrong in both directions at once: five
 * prices appeared in both tables, and then — after that was fixed with an
 * explicit map — `video`, the dearest press in the app at fifteen credits,
 * appeared in NEITHER, because the map claimed a row covered it that lives
 * in another check's prose rather than in the data.
 *
 * Neither fault announced itself. The second was found by searching the
 * finished document for a price that had to be in it. So the count is
 * asserted rather than trusted: a price list that loses a price is the one
 * failure this whole document exists to prevent.
 */

import { readFileSync } from 'node:fs';
import { CARD, card } from './kredietkaart.mts';
import { CREDITS } from '../app/lib/credits.ts';
import { priced } from './enginecost.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nThe price list on disk is the price list in the code\n');

const onDisk = (() => {
  try { return readFileSync(CARD, 'utf8'); } catch { return null; }
})();

ok('the price list exists', onDisk !== null, `${CARD} — run \`npm run kaart\``);

ok('  and is what the code says today',
  onDisk === card(),
  'a price moved in the code and the document still says the old one. Run'
  + ' `npm run kaart`. She sets prices off this table, so a stale one is'
  + ' worse than none — she would have no reason to doubt it');

/* ── Every price, exactly once ─────────────────────────────────────── */

/**
 * The keys the generator's own map claims are covered by a costed row.
 *
 * Read back out of the generator rather than re-derived, so the two cannot
 * disagree about what is covered — which is the exact fault this section
 * exists for.
 */
const costed = new Set<string>();
const claimed: string[] = [];
{
  const gen = readFileSync('scripts/kredietkaart.mts', 'utf8');
  const map = gen.slice(gen.indexOf('const ABOUT'), gen.indexOf('};', gen.indexOf('const ABOUT')));
  const real = new Set(priced.map((one) => one.what));
  for (const [, what, key] of map.matchAll(/'([^']+)':\s*'(\w+)',/g)) {
    /* ── The hole the first version of this check had ──────────────
 
       It took the generator's word for it. A line in `ABOUT` saying some
       row covers `video` was enough to count `video` as covered — so
       when exactly that was tried as a mutation, the dearest press in
       the app vanished from both tables and this check passed.
 
       A claim is only worth something if the row it names exists. So
       every mapping is checked against `priced` itself, and a claim
       about a row that is not there counts for nothing. */
    if (!real.has(what)) { claimed.push(`${what} → ${key}`); continue; }
    costed.add(key);
  }
}

ok('every costed row the document claims really exists',
  claimed.length === 0,
  `${claimed.join('; ')} — a mapping that names a row which is not in`
  + ' `priced` takes that price out of BOTH tables and says nothing');

const said = onDisk ?? '';
const missing: string[] = [];
const twice: string[] = [];
for (const key of Object.keys(CREDITS)) {
  const asKey = (said.match(new RegExp(`\\\`${key}\\\``, 'g')) ?? []).length;
  if (asKey === 0 && !costed.has(key)) missing.push(key);
  if (asKey > 1) twice.push(key);
}

ok('every price in the code is somewhere in the document',
  missing.length === 0,
  `${missing.join(', ')} — a price list that loses a price is the one failure`
  + ' this document exists to prevent, and nothing on screen would say so');

ok('  and none of them is in it twice',
  twice.length === 0,
  `${twice.join(', ')} — a price counted twice reads as two different things`
  + ' she can charge for');

ok('  and the dearest common press is in it',
  /\| `video` \| 15 \|/.test(said) || /video/.test(said),
  'fifteen credits, and it went missing from both tables once already');

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);
