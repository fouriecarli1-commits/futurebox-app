/**
 * Every price written into words is the price in the code.
 *
 *   npm run check:pricewords
 *
 * ── Why ──────────────────────────────────────────────────────────────────
 *
 * 17 October 2026. Three sentences people read had gone stale while the
 * buttons beside them were right: the copilot told people Grab was two
 * credits a week after Carli made it fifteen; the photo editor's export
 * panel said one credit where the button said five; the video editor said a
 * frame was five credits where it is six. A button reads `CREDITS`; a
 * sentence was typed, and nothing held it. Carli: *"Jy moet altyd alles
 * regmaak wat jy optel."*
 *
 * So: every sentence on the price cards that names a price is matched here
 * against `credits.ts`, in English and in Afrikaans; every OTHER sentence
 * that types a number of credits fails, so a new one has to read its price
 * from the code (with `{n}`) or be added to this table — and the copilot's
 * room descriptions (`surfaces.ts`) may not type a price at all.
 */
import { readFileSync } from 'node:fs';
import { CREDITS, TIER_CREDITS } from '../app/lib/credits.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const i18n = readFileSync('app/lib/i18n.tsx', 'utf8');
const plans = readFileSync('app/lib/plans.ts', 'utf8');
const surfaces = readFileSync('app/lib/surfaces.ts', 'utf8');

/* The words as a person reads them: \u2019 is a quote mark, not the number 2019. */
const plain = (text: string): string => text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
const entries = [...i18n.matchAll(/"([\w.]+)": \{ en: "((?:[^"\\]|\\.)*)", af: "((?:[^"\\]|\\.)*)" \}/g)]
  .map((m) => ({ key: m[1], en: plain(m[2]), af: plain(m[3]) }));
const allNumbers = (text: string): string => (text.match(/\d+/g) ?? []).join(',');
ok(`the word table reads (${entries.length} entries)`, entries.length > 2000);

const five = CREDITS.filmWords + CREDITS.filmLook + CREDITS.filmJoin + CREDITS.filmMark + CREDITS.filmUnder + CREDITS.filmMotion;

/**
 * The sentences that may name a price, what they say in English, and what
 * the code says each number is. A sentence's numbers are read in order.
 */
const CLAIMS: readonly { readonly name: string; readonly en: RegExp; readonly is: () => number[] }[] = [
  { name: 'keeping a mixed take', en: /mixed take is (\d+) credits a minute/, is: () => [CREDITS.mixOut] },
  { name: 'bouncing the mix out', en: /Bouncing (?:a|the) finished mix out(?: of it)? is (\d+) credits a minute/, is: () => [CREDITS.mixOut] },
  { name: 'stems and a voice change', en: /Splitting stems is (\d+) credits a minute, changing a voice (\d+)/, is: () => [CREDITS.stems, CREDITS.voiceChange] },
  { name: 'putting a film together', en: /together is (?:what costs: )?(\d+) credits per 30 seconds/, is: () => [CREDITS.filmOut] },
  { name: 'the six film functions', en: /words (\d+), a look (\d+), a transition (\d+), your logo (\d+), a track under it (\d+), movement (\d+)/, is: () => [CREDITS.filmWords, CREDITS.filmLook, CREDITS.filmJoin, CREDITS.filmMark, CREDITS.filmUnder, CREDITS.filmMotion] },
  { name: 'an advert and a dressed film', en: /using all six is (\d+); a dressed three-minute film is (\d+)/, is: () => [CREDITS.filmOut + five, 6 * CREDITS.filmOut + five] },
  { name: 'the marketing desk', en: /plan is (\d+) credits[;,] eight advert lines (?:are )?(\d+)/, is: () => [CREDITS.marketPlan, CREDITS.adLines] },
  { name: 'dubbing', en: /(\d+) credits a minute/, is: () => [CREDITS.dub] },
  { name: 'the photo editor', en: /picture out is (\d+) credits(?:; the AI magic touch is (\d+); finding the things in a photo is (\d+); a chart set by AI from your words is (\d+); a vector picture drawn by AI is (\d+))?/, is: () => [CREDITS.postOut, CREDITS.repaint, CREDITS.grab, CREDITS.chart, CREDITS.vector] },
  { name: 'training a sound', en: /Train a sound of your own.*?\b(\d+) credits/, is: () => [CREDITS.finetune] },
  { name: 'a plan\'s month', en: /^(\d+) credits a month/, is: () => [] },
];

const TYPED = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|thirty|forty|fifty)\s+credits?\b/i;
const numbersOf = (m: RegExpMatchArray | null): number[] => (m ? m.slice(1).filter((x) => x !== undefined).map(Number) : []);

let claimed = 0;
for (const entry of entries) {
  if (!TYPED.test(entry.en) && !CLAIMS.some((c) => c.name === 'the photo editor' && c.en.test(entry.en))) continue;
  const claim = CLAIMS.find((c) => c.en.test(entry.en) && (c.name !== 'dubbing' || /Dubbing|dubbing/.test(entry.en)));
  if (!claim) {
    ok(`${entry.key} types a price nobody checks`, false, `"${entry.en.slice(0, 90)}" — read it from CREDITS with {n}, or add the sentence to CLAIMS here`);
    continue;
  }
  claimed += 1;
  const en = numbersOf(entry.en.match(claim.en));
  let want = claim.is();
  if (claim.name === 'a plan\'s month') {
    const tier = entry.key.split('.')[1] as keyof typeof TIER_CREDITS;
    want = [TIER_CREDITS[tier]];
  }
  /* A sentence may name fewer of a claim's prices (the free card names only the first). */
  const expected = want.slice(0, en.length);
  ok(`${entry.key}: ${claim.name} is ${expected.join(', ')}`, en.length > 0 && en.join() === expected.join(), `the words say ${en.join(', ')}`);
  ok(`  and ${entry.key} in Afrikaans has the same numbers`, allNumbers(entry.af) === allNumbers(entry.en), `en ${allNumbers(entry.en)}, af ${allNumbers(entry.af)}`);
}
ok(`the price sentences were found (${claimed})`, claimed >= 20);

/* The cards' English lives in plans.ts as well, and is held to the same table. */
for (const m of plans.matchAll(/^\s+'((?:[^'\\\n]|\\.)*)',?\s*$/gm)) {
  const text = plain(m[1]);
  if (!TYPED.test(text)) continue;
  const claim = CLAIMS.find((c) => c.en.test(text) && (c.name !== 'dubbing' || /Dubbing|dubbing/.test(text)));
  if (!claim || claim.name === 'a plan\'s month') continue;
  const said = numbersOf(text.match(claim.en));
  const expected = claim.is().slice(0, said.length);
  ok(`plans.ts: ${claim.name}`, said.join() === expected.join(), `"${text.slice(0, 80)}" says ${said.join(', ')}, the code ${expected.join(', ')}`);
}

/* The copilot repeats the room descriptions word for word: no typed prices. */
const typedInRooms = [...surfaces.matchAll(/["`][^"`]*["`]/g)].map((m) => m[0]).filter((text) => TYPED.test(text) && !text.includes('${CREDITS'));
ok('the copilot\'s room descriptions read their prices from the code', typedInRooms.length === 0, typedInRooms.map((t) => t.slice(0, 80)).join(' | '));

if (bad) {
  console.error(`\ncheck:pricewords — ${bad} wrong.\n`);
  process.exit(1);
}
console.log('\ncheck:pricewords — every price written into a sentence is the price in the code, in both languages.');
