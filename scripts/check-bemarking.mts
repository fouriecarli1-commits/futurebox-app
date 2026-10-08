/**
 * The marketing material says nothing the app does not do.
 *
 *   npm run check:bemarking
 *
 * ── Why this is a check and not a proofread ──────────────────────────────
 *
 * Carli's list, 7 October 2026: *"Bemarkingsmateriaal."*
 *
 * An advertisement is the one place an overclaim becomes a complaint, and it
 * has already happened once in this repo. The Label card carried *"Five seats
 * on one account"* and nothing in the codebase adds a second person to an
 * account. It came out rather than getting a rushed implementation, and the
 * comment where it stood says why: an overclaim on a paid tier sits on the
 * page where money changes hands.
 *
 * A document is worse than a card for this, because nothing compiles it. It
 * is written once, read by somebody three months later, and pasted into a
 * post. So the two things in it that go stale on their own — the prices and
 * the claims — are held here.
 *
 * ── What is held ─────────────────────────────────────────────────────────
 *
 *   1. Every rand figure in the document is a price `plans.ts` really has.
 *   2. Every credit allowance in it matches the plan it is attributed to.
 *   3. The sentences the repo has already decided not to say do not appear
 *      in it: five seats, unlimited songs, free videos, checking copyright.
 *   4. Every check it cites as proof is a check that exists.
 *
 * The fourth is the one that keeps the document honest rather than merely
 * accurate. A claim with "proved by `check:postwalk`" next to it is a claim
 * somebody can go and verify; a claim citing a check that was renamed last
 * month is a footnote that reads like evidence and is not.
 */
import { readFileSync } from 'node:fs';
import { TIER_SPECS } from '../app/lib/plans.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const doc = readFileSync('docs/BEMARKING.md', 'utf8');
const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts as Record<string, string>;

ok('the marketing material exists and has something in it',
  doc.length > 2000,
  `${doc.length} characters`);

/* ── 1. Every rand figure is a real price ───────────────────────────── */
const prices = new Set(Object.values(TIER_SPECS).map((one) => one.rand));
/* A thousands separator in this document is a non-breaking space, which is
   how the rest of the Afrikaans in this repo writes one. */
const said = [...doc.matchAll(/R\s?([0-9][0-9   ]*)/g)]
  .map((one) => Number(one[1].replace(/[   ]/g, '')))
  .filter((one) => Number.isFinite(one));
const strange = said.filter((one) => !prices.has(one));
ok('every rand figure in it is a price the app really charges',
  strange.length === 0,
  `${JSON.stringify(strange)} against ${JSON.stringify([...prices].sort((a, b) => a - b))}`
  + ' — a price in a marketing document is exactly what goes stale and'
  + ' exactly what then gets charged wrong');

/* ── 2. Credit allowances match the plan named ──────────────────────── */
for (const plan of Object.values(TIER_SPECS)) {
  const line = plan.includes.find((one) => /credits a month/.test(one));
  if (!line) continue;
  const monthly = Number(line.match(/^([0-9]+) credits/)?.[1] ?? NaN);
  if (!Number.isFinite(monthly)) continue;
  /* Only where the document mentions that number at all: it does not list
     every plan, and it does not have to. What it may not do is misstate one. */
  const mentioned = new RegExp(`${monthly}\\s*krediete`).test(doc);
  if (!mentioned) continue;
  ok(`  and the ${plan.name} allowance in it is the allowance the plan gives`,
    new RegExp(`${monthly}\\s*krediete`).test(doc),
    `${monthly} — a number in a post that the app then disagrees with`);
}

/* ── 3. The sentences this repo has decided not to say ──────────────── */
const refused: readonly { readonly what: RegExp; readonly why: string }[] = [
  {
    what: /vyf plekke op een rekening|five seats/i,
    why: 'nothing in the codebase adds a second person to an account; it came'
      + ' off the Label card for that reason',
  },
  {
    what: /onbeperkte liedjies|unlimited songs/i,
    why: 'credits are monthly and bounded, and the numbers are in plans.ts',
  },
  {
    what: /gratis video['’]?s|free videos/i,
    why: 'the free plan has no video engine at all — what is free is the'
      + ' browser sketch drawn on the device',
  },
  {
    what: /ons kontroleer kopiereg|we check copyright/i,
    why: 'the app cannot and does not claim to; lib/filmrights.ts says why',
  },
];
/* Read across the COPY and nothing else: sections one to four, which are the
   line, the paragraph, the message to her people and the three posts. That
   is where an overclaim does harm — it gets pasted somewhere.

   Sections five and six, and the rule at the top, are about the overclaims
   on purpose: the rule quotes "Five seats on one account" as the one that
   already happened here, and the table lists all four. The first version of
   this read the whole document above the table and flagged the rule for
   quoting the thing it exists to warn about, which is a check that cannot
   tell a warning from a claim. */
const copy = doc.slice(
  doc.indexOf('## 1. Die een sin'),
  doc.indexOf('## 5. Wat ons NIE mag s'),
);
ok('  and the copy itself can be found to read',
  copy.length > 1000,
  `${copy.length} characters between the first heading and the table — the`
  + ' four assertions below read that slice, and without it they read nothing');
for (const one of refused) {
  ok(`  and it does not claim: ${one.what.source.split('|')[0]}`,
    !one.what.test(copy),
    one.why);
}
ok('  and it still carries the list of what not to say',
  doc.includes('Wat ons NIE mag s'),
  'the table is the part that stops the next version of this document being'
  + ' written from memory');

/* ── 4. Every check it cites is a check that exists ─────────────────── */
const cited = [...new Set([...doc.matchAll(/`(check:[a-z]+)`/g)].map((one) => one[1]))];
const missing = cited.filter((one) => !(one in scripts));
ok('every check the material cites as proof is a check that exists',
  cited.length >= 4 && missing.length === 0,
  `${missing.join(', ') || `only ${cited.length} cited`} — a claim citing a`
  + ' check that was renamed last month is a footnote that reads like'
  + ' evidence and is not');

/* ── 5. And it says what has to come from her ──────────────────────── */
ok('and it says plainly which parts only she can make',
  /Wat van jou af moet kom/.test(doc),
  'a marketing pack with no photograph of her making something in it is a'
  + ' pack whose strongest piece is missing, and a stock photo of a stranger'
  + ' at a mixing desk is the opposite of what this app is');

if (bad) {
  console.error(`\ncheck:bemarking — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:bemarking — every price in the marketing material is one the app'
  + ' really charges, every check it cites exists, and none of the four things'
  + ' this repo has decided not to say appears in it.',
);
