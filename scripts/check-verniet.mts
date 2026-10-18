/**
 * The app does not tell her customers that her work is free.
 *
 *   npm run check:verniet
 *
 * ── What she said ────────────────────────────────────────────────────────
 *
 * The owner, 11 October 2026, in three words: *"Niks is gratis."*
 *
 * Sixty strings in this app used the word. Most of them were describing a
 * TOOL — "Free, and it happens on your own phone", "it costs nothing", "all
 * of it on your own device, for nothing" — and every one of those is a
 * sentence that teaches somebody paying R49 a month that what they are
 * paying for is worth nothing. She is launching a business on 1 November,
 * and that is her money.
 *
 * ── The fact underneath, which is worth keeping ──────────────────────────
 *
 * Those sentences were carrying real information: this press will not eat
 * your credits. A person deciding whether to try something four times needs
 * that, and it is not the same claim as "free". So the words changed and the
 * meaning did not: **no credits**, **included in your plan**.
 *
 * ── Three kinds of "free" that STAY, and why ─────────────────────────────
 *
 * **The free tier.** It is a real plan that really costs nothing, and a plan
 * that costs R0 may not be described as costing money. Whether to keep
 * offering one at all is her decision about her business, not a word this
 * check gets to change.
 *
 * **The free entry route into a competition.** The Consumer Protection Act
 * requires a promotional competition with a paid entry to offer a free one
 * on the same terms. That wording is a legal obligation, and a check that
 * quietly removed it would be a check that created a compliance problem.
 *
 * **Somebody else's free thing.** "Google Authenticator and Authy are all
 * free" is a fact about other people's apps, not a claim about her work.
 *
 * Each of those is a KEY in the allowlist below, not a blanket exemption on
 * a word — because the next sentence that calls one of her tools free would
 * otherwise slip in behind them.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nThe app does not tell her customers that her work is free\n');

const words = readFileSync('app/lib/i18n.tsx', 'utf8');

/** Keys allowed to say it, each for one of the three reasons above. */
const ALLOWED = new Set([
  /* The free tier itself: its name, what is in it, and the promise that it
     is real rather than a trial. */
  'common.free', 'welcome.free', 'landing.startFree', 'landing.noCard',
  'landing.freeTitle', 'pay.freeAlways', 'credits.freeIsReal', 'addon.stillFree',
  'plan.free.who', 'plan.free.inc.0', 'plan.free.inc.1', 'plan.free.inc.2',
  'plan.free.inc.3', 'plan.free.inc.4', 'plan.maker.inc.1', 'edit.lockedFree',
  'common.createAccount', 'feed.freeClass',
  /* The free entry route, which the Consumer Protection Act requires. */
  'arena.sub', 'arena.freeRoute', 'arena.enterFree', 'arena.freeOnly',
  'arena.rubricNote',
  /* Other people's apps. */
  'mfa.getOne',
  /* The welcome page's header button, 13 October 2026, from Google's
     landing design: "Get Started Free" is the free tier, which is real and
     not a trial — the same thing `landing.startFree` beside it says. */
  'landing.getStarted',
]);

/**
 * Said of a tool, these are the sentences that give her work away.
 *
 * `kos niks` and `verniet` are the Afrikaans, and they are listed because
 * the first pass through this file changed the English and left half the
 * Afrikaans saying the opposite — which is the one failure a reader of
 * either language would never report, because each sees only their own.
 */
const GIVING_IT_AWAY = [
  'costs nothing', 'cost nothing', 'for nothing',
  /* `vir niks` is NOT here, and that is deliberate. It is ordinary
     Afrikaans for "for nothing" in the sense of "nothing at all" — the
     trends page says "vir niks wat jy kan nagaan nie", meaning a headline
     that says nothing checkable — and a rule that bans it reports a page
     about journalism as a pricing mistake. The first version did exactly
     that. `kos niks` and `verniet` carry the price meaning and nothing
     else. */
  'kos niks', 'verniet',
];

/** Every key and its two sentences, as the dictionary writes them. */
const rows = [...words.matchAll(
  /^ {2}"([a-zA-Z0-9._]+)":\s*\{[^}]*?en:\s*"((?:[^"\\]|\\.)*)"[^}]*?af:\s*"((?:[^"\\]|\\.)*)"/gm,
)];

ok('the dictionary can be read', rows.length > 1000, `${rows.length} rows`);

const giving: string[] = [];
const freeish: string[] = [];
for (const [, key, en, af] of rows) {
  if (ALLOWED.has(key)) continue;
  const said = `${en} ${af}`.toLowerCase();
  if (GIVING_IT_AWAY.some((one) => said.includes(one))) giving.push(key);
  else if (/\bfree\b|\bgratis\b/.test(said)) freeish.push(key);
}

ok('nothing tells her customers a tool costs them nothing',
  giving.length === 0,
  `${giving.join(', ')} — say what it does not SPEND instead: "no credits",`
  + ' "included in your plan". The fact is the same and the sentence is not'
  + ' an argument that her work is worth nothing');

ok('  and nothing else calls one of her tools free',
  freeish.length === 0,
  `${freeish.join(', ')} — the free tier, the competition's free entry route`
  + ' and other people\'s apps are named in the allowlist and may say it.'
  + ' Anything new has to earn its place there with a reason');

/* ── And both languages moved together ──────────────────────────────── */

const halfDone = rows.filter(([, key, en, af]) => {
  if (ALLOWED.has(key)) return false;
  const english = /\bfree\b|costs nothing|cost nothing|for nothing/i.test(en);
  const afrikaans = /\bgratis\b|kos niks|verniet/i.test(af);
  return english !== afrikaans;
}).map(([, key]) => key);

ok('  and no row was changed in one language only',
  halfDone.length === 0,
  `${halfDone.join(', ')} — a reader sees one language, so a half-done`
  + ' rewrite is invisible to everybody who could report it');


/* ── The two doors this check did not watch ──────────────────────────────

   Everything above reads `i18n.tsx`. On 11 October 2026, auditing the advert
   desk, that turned out to be most of the sentences and not all of them.

   **A `t()` fallback.** `t('cost.free', 'Costs nothing')` carries its own
   English, and it is what renders if the key is ever missing. The "Niks is
   gratis" pass changed the dictionary and left thirty-nine fallbacks saying
   the opposite — `booth.free` read "use no credits" in the dictionary and
   "cost nothing" in the component, in the same breath.

   **An inline `en:`/`af:` pair.** The advert desk's four steps are written in
   `Campaign.tsx`, not the dictionary. Step two said "Several, each doing
   something different. Free." — on the same screen as a button reading "40
   credits", because `CREDITS.adLines` went from six to forty on 30 September
   and the note did not move.

   Both were invisible here, and this check reported "All good" through all of
   it. That is the failure worth guarding against: not the sentence, but a
   green check that measured the dictionary and was read as measuring the app.

   A fallback is held to its dictionary row rather than to the word list,
   because the row is the sentence that actually ships and two copies of one
   sentence that disagree is the fault itself. */

const SOURCE = /\bfree\b|\bgratis\b|kos niks|verniet|costs? nothing/i;
/**
 * A TS string body, decoded the way the compiler reads it.
 *
 * Two of them, because the two sources quote differently and one decoder for
 * both throws on the first row that contains a quote mark: the dictionary
 * writes `en: "…"` with `\"` inside, and a fallback is `'…'` with `\'`.
 */
const fromDouble = (raw: string): string => JSON.parse(`"${raw}"`) as string;
const fromSingle = (raw: string): string =>
  JSON.parse(`"${raw.replace(/\\'/g, "'").replace(/"/g, '\\"')}"`) as string;

const dictionary = new Map(rows.map(([, key, en]) => [key, fromDouble(en)] as const));

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== 'node_modules') sourceFiles(path, found);
    } else if (/\.(ts|tsx)$/.test(path) && !path.endsWith('i18n.tsx')) found.push(path);
  }
  return found;
}

/**
 * Files whose inline sentences may say it, and why.
 *
 * Not an exemption from the rule — a statement of what the rule is about. It
 * bans a claim that HER work is free. A question teaching somebody what a
 * term of art means is the opposite of that claim, and the same reasoning
 * already lets this check name other people's free apps.
 */
const TEACHING: Readonly<Record<string, string>> = {
  'app/data/musicquiz.ts':
    'quiz questions about what "royalty-free" means on somebody else\'s sound'
    + ' pack — teaching the term, not pricing anything here',
};

const drifted: string[] = [];
const inline: string[] = [];
for (const file of sourceFiles('app')) {
  const code = withoutComments(readFileSync(file, 'utf8'));

  for (const call of code.matchAll(/t\(\s*'([a-zA-Z0-9._]+)'\s*,\s*'((?:[^'\\]|\\.)*)'/g)) {
    const row = dictionary.get(call[1]);
    if (row === undefined) continue;
    const fallback = fromSingle(call[2]);
    if (fallback !== row && SOURCE.test(fallback) !== SOURCE.test(row)) {
      drifted.push(`${call[1]} in ${file}`);
    }
  }

  /* `en:`/`af:`/`noteEn:`/`noteAf:`, which is how a room writes a list of
     steps or chips without a dictionary key for each line. The allowlist is
     by key and these have none, so a sentence here that needs to say "free"
     needs a dictionary key — which is the right outcome. */
  const teaching = TEACHING[file];
  for (const pair of code.matchAll(/\b(?:note)?(?:[eE]n|[aA]f):\s*'((?:[^'\\]|\\.)*)'/g)) {
    if (!SOURCE.test(fromSingle(pair[1]))) continue;
    if (teaching) continue;
    inline.push(`${file}: "${fromSingle(pair[1]).slice(0, 60)}"`);
  }
}

ok('  and no fallback disagrees with its dictionary row about being free',
  drifted.length === 0,
  `${drifted.join(', ')} — the fallback is what renders when a key is missing,`
  + ' so a dictionary fixed without it is a fix that reappears');

for (const [file, why] of Object.entries(TEACHING)) {
  console.log(`  ok    ${file} may say it — ${why}`);
}

ok('  and no sentence written outside the dictionary calls it free',
  inline.length === 0,
  `${inline.join(' | ')} — give it a dictionary key, which is also how it`
  + ' gets an Afrikaans that moves with it');

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);
