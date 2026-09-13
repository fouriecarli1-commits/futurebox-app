/**
 * The hats on the Afrikaans letters.
 *
 * ── What was on the screen ───────────────────────────────────────────────
 *
 * The box the copilot is typed into, in every room, said:
 *
 *     Se my wat jy wil he
 *
 * for **Sê my wat jy wil hê**. Two missing circumflexes in the most-seen
 * input in the app, with the buttons directly above it spelling `sê`
 * correctly — so it was not a font, an encoding or a theory about
 * diacritics. It was three strings out of 2101, typed without them.
 *
 * ── Why nothing found it ─────────────────────────────────────────────────
 *
 * `check:afrikaans` asserts every key has an Afrikaans line. It has one.
 * `audit/afrikaans.mjs` asserts the Afrikaans differs from the English. It
 * differs. Neither has any opinion about whether the Afrikaans is *spelled*
 * right, and no check can have one in general — that needs a speaker.
 *
 * What a check CAN have an opinion about is a short list of bare forms that
 * are not words in Afrikaans at all. `he` is not a word; `hê` is. `Se` at
 * the start of a sentence is not a word; `Sê` is (`se`, lowercase, is the
 * possessive and is left alone). That is a small, dull, checkable subset,
 * and it is where these three lived.
 *
 * ── The false positives are the interesting part ─────────────────────────
 *
 * The first run of this flagged five, and two of them were right as they
 * stood: "Genoeg vir ’n reel op sy eie" and "’n Hook, vir ’n reel". `reël`
 * is the Afrikaans word for a line or a rule — but the English beside them
 * reads "enough for a reel" and "a hook, for a reel", and that is the
 * Instagram format, which is called a reel in both languages.
 *
 * So the rule reads the English too: a word that appears on the English side
 * is a word the Afrikaans is allowed to borrow. That is what stops this
 * check from "correcting" the app into nonsense — and the reason it is
 * written down here is that I nearly committed the correction.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/**
 * Bare forms that are not Afrikaans words, and what was meant.
 *
 * Kept short on purpose. Every entry has to be a form that is never correct,
 * or this becomes a check that argues with the language.
 */
const HATLESS: readonly { readonly bare: RegExp; readonly meant: string }[] = [
  /* `he` is nothing; `hê` is "have". */
  { bare: /\bhe\b/, meant: 'hê' },
  /* `Se` capitalised opens a sentence, where only the imperative `Sê` can
     stand. Lowercase `se` is the possessive — "Jan se liedjie" — and is not
     matched. */
  { bare: /\bSe\b/, meant: 'Sê' },
  { bare: /\bgese\b/, meant: 'gesê' },
  { bare: /\bnerens\b/, meant: 'nêrens' },
  { bare: /\bwereld\b/, meant: 'wêreld' },
  { bare: /\bseen\b/, meant: 'seën' },
  { bare: /\bbrue\b/, meant: 'brûe' },
];

const source = readFileSync('app/lib/i18n.tsx', 'utf8');
/* Both sides of each entry, so the English can vouch for a borrowed word. */
const pairs = [...source.matchAll(/en:\s*"((?:[^"\\]|\\.)*)"\s*,\s*af:\s*"((?:[^"\\]|\\.)*)"/g)]
  .map((m) => ({ en: m[1], af: m[2] }));

ok('the dictionary can be read as pairs', pairs.length > 1500, `${pairs.length} found`);

const missing: string[] = [];
for (const pair of pairs) {
  for (const one of HATLESS) {
    if (!one.bare.test(pair.af)) continue;
    /* Borrowed from the English beside it — "a reel" is a reel in both. */
    const word = one.bare.source.replace(/\\b/g, '');
    if (new RegExp(`\\b${word}\\b`, 'i').test(pair.en)) continue;
    missing.push(`"${pair.af.slice(0, 58)}" wants ${one.meant}`);
  }
}
ok('every Afrikaans line has its hats on', missing.length === 0,
  missing.slice(0, 8).join(' · ') + (missing.length > 8 ? ` (+${missing.length - 8})` : ''));

if (failures) {
  console.error(`\ncheck:kappies — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(`\ncheck:kappies — ${pairs.length} lines, and none of them is missing a circumflex.`);
