/**
 * The money in the art market adds up, and the artist's share is on profit.
 *
 * ── Why this is a check and not a comment ────────────────────────────────
 *
 * Carli, 20 September 2026: *"70% van wins vir kunstenaar, 30% wins vir
 * ons."* Wins — profit. Somebody reading "70%" a year from now will
 * reasonably compute it on the sticker price, and be wrong by the gateway's
 * cut every single time: R6.30 of the artist's money on a R200 piece, paid
 * out of money that never arrived.
 *
 * That error is invisible. Nothing on a screen changes, no test of the room
 * fails, and it is discovered by an artist doing their own arithmetic — at
 * which point the app has been quietly underpaying the people it is meant
 * to be for. So the rule is held here, in numbers, rather than in the
 * sentence above the function.
 *
 * The other half is the one that bites in the other direction: three
 * numbers that do not add up to what was paid. A cent created is a
 * shortfall that grows, and a bank finds it rather than a test.
 */

import { split, START_RAND, UNIQUE_RAND, ARTIST_SHARE, WINDOWS } from '../app/data/artmarket';
import { gatewayFee } from '../app/lib/plans';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/* ── Her numbers, as she said them ────────────────────────────────────── */

ok('a piece starts at R200', START_RAND === 200, `${START_RAND}`);
ok('a one-off costs R500', UNIQUE_RAND === 500, `${UNIQUE_RAND}`);
ok('the artist takes 70%', ARTIST_SHARE === 0.7, `${ARTIST_SHARE}`);
ok(
  'and an artist picks from four windows, not a typed date',
  WINDOWS.map((one) => one.days).join(',') === '2,4,6,14',
  WINDOWS.map((one) => one.days).join(','),
);
ok(
  '  each named in both languages',
  WINDOWS.every((one) => one.en.trim() && one.af.trim()),
);

/* ── Nothing is created and nothing is lost ───────────────────────────── */

/**
 * Every price a person could actually be charged, plus the awkward ones.
 *
 * Swept rather than sampled: a rounding rule is exactly the kind of thing
 * that is right at R200 and R500 and wrong at R333.33, and two hand-picked
 * cases would have proved nothing.
 */
const PRICES: number[] = [];
for (let rand = 1; rand <= 2000; rand += 1) PRICES.push(rand);
for (const odd of [0, 0.01, 1.5, 33.33, 99.99, 200.005, 12345.67]) PRICES.push(odd);

const uneven = PRICES.filter((paid) => {
  const s = split(paid);
  return Math.round((s.gateway + s.artist + s.house) * 100) !== Math.round(s.paid * 100);
});
ok(
  'the gateway, the artist and the house add up to exactly what was paid',
  uneven.length === 0,
  `${uneven.length} prices are out, first: R${uneven[0]}`,
);

const negative = PRICES.filter((paid) => {
  const s = split(paid);
  return s.artist < 0 || s.house < 0 || s.profit < 0;
});
ok(
  '  and nobody is ever owed a negative amount',
  negative.length === 0,
  `R${negative[0]} — a price below the gateway's own fee`,
);

/* ── On profit, not on the sticker ────────────────────────────────────── */

/**
 * The assertion this file exists for.
 *
 * Stated as the difference it would make rather than as a formula: at R200
 * the wrong reading pays the artist R140 and the right one pays R133.70.
 * Somebody breaking this sees the six rand thirty, which is the number that
 * makes the mistake obvious.
 */
const at200 = split(200);
const onTheSticker = Math.round(200 * ARTIST_SHARE * 100) / 100;
ok(
  "the artist's share is taken off the profit, not off the sticker price",
  at200.artist < onTheSticker,
  `both come to R${at200.artist}`,
);
ok(
  `  which at R200 is R${at200.artist.toFixed(2)} and not R${onTheSticker.toFixed(2)}`,
  Math.abs(at200.artist - 133.7) < 0.01,
  `R${at200.artist}`,
);
ok(
  '  because the gateway comes off first',
  Math.abs(at200.gateway - gatewayFee(200)) < 0.005,
  `${at200.gateway} against ${gatewayFee(200)}`,
);

/* ── One formula for the fee, not two ─────────────────────────────────── */

/**
 * The fee is imported, never re-typed.
 *
 * This app has twice had two meanings for one word — `arrival`, `watermark`
 * — and both were caught late. Two formulas for a payment fee is that same
 * fault with money on it: they agree on the day they are written and drift
 * the first time one is updated.
 */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(path)) out.push(path);
  }
  return out;
}
const defines = [...walk('app'), ...walk('scripts')].filter((path) =>
  /export function gatewayFee/.test(readFileSync(path, 'utf8')),
);
ok(
  'the gateway fee is written down once in the whole app',
  defines.length === 1,
  defines.join(', '),
);

/* ── The check can fail, shown rather than claimed ────────────────────── */

/**
 * The wrong reading, run.
 *
 * Not "imagine somebody did this" — the sum is done here, and the assertion
 * is that it comes out different from what the app pays. A rule proved
 * against a number it cannot produce is a rule nobody has tested.
 */
const wrong = (paid: number): number => Math.round(paid * ARTIST_SHARE * 100) / 100;
ok(
  '  and the mistake it guards against really is a different number',
  wrong(500) !== split(500).artist && wrong(500) - split(500).artist > 10,
  `the sticker reading pays R${wrong(500)}, the app pays R${split(500).artist}`,
);

if (failures) {
  console.error(
    '\ncheck:artmarket — a share computed on the sticker price pays an artist out of money'
    + ' that never arrived, and nothing on a screen would say so.\n',
  );
  process.exit(1);
}
console.log(
  `\ncheck:artmarket — R${START_RAND} a piece, R${UNIQUE_RAND} for a one-off,`
  + ` 70/30 on the profit, and every cent accounted for across ${PRICES.length} prices.`,
);
