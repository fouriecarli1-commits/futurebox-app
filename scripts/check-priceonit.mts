/**
 * Every press that spends says what it costs, before it is pressed.
 *
 * ── The principle, which this app already states ─────────────────────────
 *
 * From the cutting room, beside its own number: *"A charge somebody meets
 * afterwards is a surprise, and a surprise about money is the thing that
 * makes people stop trusting a room."* The adverts desk said the same in its
 * own words — "each says its own price at its own button" — in a comment,
 * four lines above a label reading "Writing these is free."
 *
 * ── What was actually wrong ──────────────────────────────────────────────
 *
 * Writing adverts has cost forty credits since 30 September, when
 * `CREDITS.adLines` was raised with the plan. Eight finished lines against a
 * brief is the largest Anthropic call in this app and `credits.ts` works the
 * figure out in full. The room went on saying it was free.
 *
 * It was not obvious, because the desk's call carried no token: `charge`
 * answered 401 and the writing failed rather than billing. Putting the token
 * on, on 5 October, turned a broken step into a working one with "free"
 * written under it — so the fix for one fault is what made the other one
 * live. That is the sequence this check exists to make impossible.
 *
 * The market plan showed no number at all and took seventy-five.
 *
 * ── Why it is a scan and not two rules ───────────────────────────────────
 *
 * Because this reopens the same way `check:paidcall` does: every new paid
 * route is a new room that can forget. The routes that charge are read out of
 * the handlers, the rooms are found by who calls them, and a room with no
 * price in it fails by name.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';
import { CREDITS } from '../app/lib/credits';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(path)) out.push(path);
  }
  return out;
}

const paid: string[] = [];
for (const file of walk('app/api')) {
  if (!/\/route\.ts$/.test(file)) continue;
  if (!/\bcharge\(/.test(withoutComments(readFileSync(file, 'utf8')))) continue;
  paid.push(`/${file.replace(/^app\//, '').replace(/\/route\.ts$/, '')}`);
}

ok('the routes that charge are read out of the handlers',
  paid.length >= 15,
  `${paid.length} — the same way \`check:paidcall\` finds them, so a new paid`
  + ' route is covered the day it is written rather than the day somebody'
  + ' remembers to add it here');

/* ── Every room that calls one shows a number ──────────────────────────── */

const silent: string[] = [];
let rooms = 0;
for (const file of walk('app/components')) {
  const text = withoutComments(readFileSync(file, 'utf8'));
  if (!paid.some((route) => new RegExp(`fetch\\(\\s*'${route}'`).test(text))) continue;
  rooms += 1;
  /* The test is whether the room reads the file that SETS the price, not
     whether the word "cost" appears in it. A room that renders `40` is a room
     that goes on saying forty the day the price moves, and a room that
     mentions cost in a sentence has said nothing at all.

     `credits.ts` exports the table and the per-room functions —
     `presenterCost`, `readCost`, `perMinute`, `billForEdit` — so importing
     from it is the one thing every honest price here has in common. */
  if (/from '\.\.\/lib\/credits'/.test(text)) continue;
  silent.push(file.replace('app/components/', ''));
}

ok('every room that spends shows what it costs',
  silent.length === 0,
  silent.length
    ? silent.join(', ')
    : `${rooms} rooms call a route that charges, and every one of them puts a`
      + ' number on the screen before the press');

/* ── And the number comes from the one place that knows it ─────────────── */

const desk = withoutComments(readFileSync('app/components/Campaign.tsx', 'utf8'));
const plan = withoutComments(readFileSync('app/components/MarketPlan.tsx', 'utf8'));

ok('the adverts desk shows the same figure the route charges',
  /\{CREDITS\.adLines\}/.test(desk)
  && /CREDITS\.adLines/.test(withoutComments(readFileSync('app/api/campaign/route.ts', 'utf8'))),
  `${CREDITS.adLines} credits — read from \`credits.ts\` at both ends, so the`
  + ' button and the bill cannot drift apart');

ok('  and the market plan does too',
  /\{CREDITS\.marketPlan\}/.test(plan)
  && /CREDITS\.marketPlan/.test(withoutComments(readFileSync('app/api/plan/route.ts', 'utf8'))),
  `${CREDITS.marketPlan} credits`);

/* Blanked, because the dictionary's own comments explain the key that was
   removed and say its name — the first run of this rule reported the
   paragraph recording the fix as the fault. `check:ordering` and
   `check:whofirst` each learnt this the same way. */
const dictCode = withoutComments(readFileSync('app/lib/i18n.tsx', 'utf8'));

ok('nothing calls the advert writing free any more',
  !/ads\.free/.test(desk) && !/ads\.free/.test(dictCode),
  'the key is gone rather than merely unused: a sentence nobody renders is a'
  + ' sentence waiting to be rendered again by somebody looking for a label');

ok('  and no room anywhere calls a paid step free',
  (() => {
    const dict = dictCode;
    const starts = [...dict.matchAll(/^\s*"([^"]+)":\s*\{/gm)];
    return !starts.some((hit, at) => {
      const body = dict.slice(hit.index ?? 0, at + 1 < starts.length ? starts[at + 1].index ?? dict.length : dict.length);
      /* "free" said about WRITING or MAKING something. The room full of
         genuinely free things — the cutting room — says so correctly and
         often, so the shape being looked for is the claim about a step. */
      return /\b(writing|making|this) (these|them|it|one)? ?is free\b/i.test(body);
    });
  })(),
  'the one shape this app must never carry, because it is the sentence that'
  + ' is read instead of the number');

if (bad) {
  console.error(`\ncheck:priceonit — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  `\ncheck:priceonit — ${paid.length} routes charge credits, all ${rooms} rooms`
  + ' that reach one put the number on the screen first, and the numbers are'
  + ' read from the file that sets them.',
);
