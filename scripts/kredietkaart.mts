/**
 * The whole price list, written out of the code.
 *
 *   npm run kaart
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * The owner, 11 October 2026: *"Ek het nodig dat jy vir my elke funksie met
 * krediete uitwys. Ek moet in 'n tabel sien wat kos die engines wat ons
 * gebruik, vs die krediete wat ons vra vir daardie funksie. In daardie tabel
 * moet ek ook sien watter verskillende funksies op die app is, maak nie saak
 * hoe klein nie, noem alles wat gratis is en niks kos nie."*
 *
 * ── Why it is generated and not written ──────────────────────────────────
 *
 * Because a price list typed out by hand is a second answer to a question
 * the code already answers, and it is the one that goes stale — quietly,
 * because nothing reads it. She is deciding what to charge off this table.
 * It has to be what the app actually does, on the day she reads it.
 *
 * So: the prices come from `lib/credits.ts`, the engine rates from
 * `scripts/enginecost.mts` — the same numbers `check:kredietkoste` asserts
 * its rules against — the rooms from `lib/surfaces.ts`, and the routes that
 * reach a supplier without charging from `check-gratis`'s own list. Nothing
 * below is typed twice.
 *
 * `check:kaart` runs this and fails if the document on disk is not what
 * comes out, so a price changed in the code and not here cannot survive a
 * push.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CREDITS } from '../app/lib/credits.ts';
import { TIER_SPECS } from '../app/lib/plans.ts';
import { TIER_CREDITS } from '../app/lib/credits.ts';
import { priced } from './enginecost.mts';
import { FREE } from './freeroutes.mts';
import { SURFACES } from '../app/lib/surfaces.ts';

/* In `private/`, which git ignores: the margins on this card are the
   owner's, and the repository is public (`privatedocs.mts`). */
export const CARD = 'private/KREDIETE.md';

/** What a credit sells for, cheapest plan first — she presses the same buttons. */
const rates = (['maker', 'studio', 'label'] as const)
  .map((tier) => TIER_SPECS[tier].rand / TIER_CREDITS[tier]);
const WORST = Math.min(...rates);
const BEST = Math.max(...rates);

const rand = (amount: number): string => `R${amount.toFixed(2)}`;

/**
 * Every priced row, with the money and not only the ratio.
 *
 * The owner, 11 October 2026: *"Jy het nie die somme reg gedoen nie, ek moet kan
 * sien, wat kos die engines wat ons gebruik, en wat ons wins is wat ons bo op
 * sit? Ek wil sien dat ons nie net gelyk breuk nie maar dat ons wins maak."*
 *
 * The first version of this table had credits, what we charge, what the
 * engine bills us, and the multiple between them — and no profit column at
 * all. The multiple is the wrong number to decide on by itself: transcribing
 * shows 44 times, which sounds like the best line in the app and is R2.91 of
 * actual money. Dubbing shows 6 times and is R200.90.
 *
 * So the rand is the column, and the multiple comes last.
 */
function pricedRows(): string {
  const out = [
    '| Wat dit doen | Krediete | Ons vra | Enjin kos ons | **Wins** | Wins % | Hoeveel keer |',
    '|---|---:|---:|---:|---:|---:|---:|',
  ];
  const rows = [...priced].sort((a, b) => (b.credits * WORST - b.cost) - (a.credits * WORST - a.cost));
  for (const row of rows) {
    const sell = row.credits * WORST;
    const win = sell - row.cost;
    const pct = sell > 0 ? `${((win / sell) * 100).toFixed(0)}%` : '—';
    /* No supplier, no multiple. "Infinity×" is not a number she can use,
       and a dash with "niks" beside it says the true thing: the browser
       renders it and the whole charge is margin. */
    const times = row.cost > 0 ? `${(sell / row.cost).toFixed(1)}×` : '— geen enjin';
    out.push(
      `| ${row.what} | ${row.credits} | ${rand(sell)} | ${row.cost > 0 ? rand(row.cost) : 'niks'}`
      + ` | **${rand(win)}** | ${pct} | ${times} |`,
    );
  }
  /* The two ends of the list, said in a sentence, because a column of
     numbers does not answer "are we making money" on its own. */
  const wins = rows.map((one) => one.credits * WORST - one.cost);
  const thin = rows[rows.length - 1];
  out.push('');
  out.push(`**Elke een hierbo maak wins.** Die kleinste is *${thin.what}* teen`
    + ` ${rand(Math.min(...wins))}, die grootste is *${rows[0].what}* teen`
    + ` ${rand(Math.max(...wins))}.`);
  return out.join('\n');
}

/**
 * Which credit price each costed row above is about.
 *
 * A mapping and not a price — the numbers all come from `CREDITS` and
 * `enginecost.mts`, and this only says which row is which. Written out
 * rather than matched on words, because the first version matched the
 * row's English against the key's spelling and quietly put five prices in
 * BOTH tables below: a price list that counts a price twice is worse than
 * no price list.
 *
 * `check:kaart` fails if a costed row is not named here, so a row added
 * upstairs cannot go missing from the join.
 */
const ABOUT: Readonly<Record<string, keyof typeof CREDITS>> = {
  'a two-minute song': 'song',
  'a one-minute half song': 'halfSong',
  'splitting stems, per minute': 'stems',
  'transcribing, per minute': 'transcribe',
  'cleaning a take, per minute': 'clean',
  'a voice change, per minute': 'voiceChange',
  'singing it, per minute (Kits)': 'sing',
  'dubbing, per minute': 'dub',
  'a sound effect, up to ten seconds': 'sfx',
  /* Not a CREDITS key: `readCost()` computes a charge from a length, and
     these two rows are that rate and its floor. Mapping them onto `read`
     claimed the song-reading price was covered by a row about text. */
  /* `read`, not `parts`. That row is Music.ai reading a song — `CREDITS.read`
     — and naming `parts` here marked the named-stems price as shown and then
     showed it nowhere. Exactly the `video` fault again, in a different key,
     four hours later, and `check:kaart` passed it because it only asked
     whether the ROW existed and never whether the row was about that price. */
  'reading a song, per minute (Music.ai)': 'read',
  'putting a film together, per half minute (in the browser)': 'filmOut',
  'words set on the picture (in the browser)': 'filmWords',
  'a look over the film (in the browser)': 'filmLook',
  'a join between two shots (in the browser)': 'filmJoin',
  'a mark on the film (in the browser)': 'filmMark',
  'a song laid under the film (in the browser)': 'filmUnder',
  'bouncing a mix out (in the browser)': 'mixOut',
  'taking a post off the device (in the browser)': 'postOut',
  'a style word': 'styleword',
  'a marketing plan': 'marketPlan',
  'eight advert lines': 'adLines',
  'a background taken out, per five seconds': 'cutout',
  'an item taken out, per five seconds': 'erase',
  'a still picture changed by saying what to change': 'repaint',
  /* NOT 'five seconds of video' → video. That line is printed by
     `check-kredietkoste.mts` as prose, not held in `priced`, because its
     upstream rate is two numbers apart and nothing is asserted on it until
     an invoice settles which. Claiming it here covered `video` took the
     app's dearest common press out of BOTH tables below and nothing said
     so — found by searching the finished document for a price I knew had
     to be in it. `check:kaart` now counts every key instead. */
};

/** Prices in the code with no engine rate beside them yet. */
function unpricedRows(): string {
  const covered = new Set(Object.values(ABOUT));
  const out = [
    '| Sleutel in die kode | Krediete | Ons vra | Enjin kos ons | Wins |',
    '|---|---:|---:|---|---|',
  ];
  for (const [key, value] of Object.entries(CREDITS)) {
    if (covered.has(key as keyof typeof CREDITS)) continue;
    /* No engine rate read yet, so the profit is UNKNOWN and says so. A
       blank here would read as nought, and a nought profit is the one
       thing this table must never say by accident. */
    out.push(`| \`${key}\` | ${value} | ${value === 0 ? '— (niks)' : rand(value * WORST)}`
      + ' | nog nie gelees nie | nog nie bekend nie |');
  }
  return out.join('\n');
}

/** The routes that reach a supplier and charge nobody, with their reasons. */
function freeRoutes(): string {
  const out = ['| Roete | Hoekom dit niemand hef nie |', '|---|---|'];
  for (const [route, why] of Object.entries(FREE)) {
    out.push(`| \`${route.replace('app/api', '/api').replace('/route.ts', '')}\` | ${why} |`);
  }
  return out.join('\n');
}

/**
 * Every room, with the first sentence of what it is for.
 *
 * Read off `lib/surfaces.ts`, which is the directory the app itself uses to
 * answer "where do I ..." — so a room that exists and is not here is a room
 * the app cannot point anybody at either.
 */
function rooms(): string {
  const out = ['| Kamer | Waarvoor dit is |', '|---|---|'];
  for (const one of Object.values(SURFACES)) {
    const first = `${String(one.purpose ?? '').split('. ')[0]}.`;
    out.push(`| \`${one.id}\` | ${first.replace(/\|/g, '\\|')} |`);
  }
  return out.join('\n');
}

export function card(): string {
  return `# Wat kos wat — die hele prys lys

> **Hierdie dokument word deur \`npm run kaart\` geskryf, nie met die hand nie.**
> \`check:kaart\` laat 'n stoot misluk as die kode en hierdie bladsy verskil,
> so wat hier staan is wat die app werklik doen op die dag wat jy dit lees.

'n Krediet verkoop vir tussen **${rand(BEST)}** en **${rand(WORST)}**.
Alles hieronder is teen **${rand(WORST)}** gereken — die goedkoopste een, want
daardie lid druk dieselfde knoppies.

---

## 1. Elke funksie wat krediete kos, met wat die enjin ons kos

${pricedRows()}

### Pryse in die kode waarvoor daar nog nie 'n enjin-koste hier is nie

${unpricedRows()}

---

## 2. Elke roete wat 'n verskaffer bereik en niemand hef nie

${freeRoutes()}

---

## 3. Die kamers

${rooms()}

---

*Geskryf deur \`scripts/kredietkaart.mts\`.*
`;
}

if (process.argv[1]?.endsWith('kredietkaart.mts')) {
  mkdirSync(dirname(CARD), { recursive: true });
  writeFileSync(CARD, card());
  console.log(`${CARD} — written from the code.`);
}
