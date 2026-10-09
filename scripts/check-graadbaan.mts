/**
 * The grade ladder: who is offered, who is retired, and who shares a bill.
 *
 * ── Why this file exists ─────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Ons gaan ook nie meer Kling gebruik nie, die
 * video generation deur kling is sleg."*
 *
 * Taking an engine out of a list is one line, and two things can go wrong
 * with it, both silent and both expensive.
 *
 * **It can come back.** Kling is still imported, still exported, still
 * configured by the same two environment variables. Somebody — me, in a
 * month, reading `PROVIDERS` and noticing premium looks thin — puts it back
 * in one line, and the engine she rejected starts selling again. Nothing
 * would fail. So her decision is written down as a rule rather than as a
 * deletion.
 *
 * **It can take the paid clips with it.** A video is a charge, and then a
 * question minutes later: the route reads `providerById(row.provider)` and
 * asks that engine whether the clip is done. An engine deleted outright
 * answers `undefined`, and every clip in flight when it went is a charge
 * that can never be finished or refunded. So retired has to mean *not
 * offered*, never *not answerable*, and those are two different lists.
 *
 * ── And the money one ────────────────────────────────────────────────────
 *
 * Two Google rungs now bill the SAME project against the SAME
 * `GOOGLE_CAP_VIDEO`. Spend is counted per provider id, so counted naively
 * each rung sees the whole ceiling and between them they spend twice what
 * she capped. The cap is the entire reason it is safe to point this app at
 * her own Google account, so that is not a rounding error, it is the safety
 * feature quietly off.
 *
 * `purse` is the fix and this is what holds it: engines that share a bill
 * name the same purse, AND the route sums by purse rather than by id. Both,
 * because either alone is useless — a purse nothing reads is a comment.
 */

import { readFileSync } from 'node:fs';
import { PROVIDERS, RETIRED, providerById } from '../app/lib/server/video/index.ts';
/* From `types.ts` rather than through the index: `export *` is re-exported at
   runtime in a way a named import cannot see under tsx, and the failure reads
   as "no such export" for an export that is plainly there. */
import { purseOf, type Grade } from '../app/lib/server/video/types.ts';
import { googleVeo, googleVeoFull } from '../app/lib/server/video/google.ts';
import { videoCost } from '../app/lib/credits.ts';
import { TIER_SPECS } from '../app/lib/plans.ts';
import { TIER_CREDITS } from '../app/lib/credits.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

/* ── Retired means not offered, and still answerable ───────────────────── */

ok('something is retired rather than deleted',
  RETIRED.length > 0, 'an empty retired list is the deletion this file exists to prevent');

for (const one of RETIRED) {
  ok(`${one.id} is not offered to anybody`,
    !PROVIDERS.some((other) => other.id === one.id),
    'it is in PROVIDERS, so it is being picked and charged');

  ok(`  and ${one.id} can still be asked about a clip already paid for`,
    providerById(one.id)?.id === one.id,
    'providerById does not know it, so every job in flight when it was'
    + ' retired is a charge that can never be finished or refunded');
}

ok('Kling in particular is retired, because she said so',
  RETIRED.some((one) => one.id === 'kling') && !PROVIDERS.some((one) => one.id === 'kling'),
  'Carli, 9 October 2026: "Ons gaan ook nie meer Kling gebruik nie, die'
  + ' video generation deur kling is sleg." Putting it back is a decision'
  + ' of hers to reverse, not a list to tidy');

/* ── The old id still answers ──────────────────────────────────────────── */

ok('the id Google’s cheap rung used before the rungs split still answers',
  providerById('google-veo')?.id === googleVeo.id,
  'rows written before 9 October 2026 say google-veo, and a clip whose'
  + ' engine cannot be found is a clip paid for and lost');

/* ── Every rung the desk offers has an engine behind it ────────────────── */

for (const grade of ['standard', 'better', 'premium'] as const) {
  const behind = PROVIDERS.filter((one) => one.grade === grade);
  ok(`${grade} has at least one engine behind it`,
    behind.length > 0,
    'a grade with nothing behind it is a rung the desk stops offering —'
    + ' honest, but a product with a hole in it');
}

/* ── No rung rests on somebody else's approval ──────────────────────────

   Seedance is behind `ELEVEN_SEEDANCE_READY=1`, because ByteDance models
   have to be approved on an ElevenLabs workspace. Nothing in this repository
   can know whether that variable is set on the deployment. While Seedance was
   the only engine on `standard`, the cheapest video grade was either there or
   not there depending on a value nobody here can read — and its absence
   looks like nothing at all: no error, no failing check, just a rung missing
   off a page.

   So every rung must have at least one engine on her OWN account, behind her
   OWN ceiling, which is configured by a variable this project sets. */
for (const grade of ['standard', 'better', 'premium'] as const) {
  ok(`${grade} has an engine on her own Google account, not only somebody else's`,
    PROVIDERS.some((one) => one.grade === grade && purseOf(one) === 'google-video'),
    'a rung whose only engine needs a supplier\'s approval is a rung that'
    + ' disappears off the desk silently when the approval is not there');
}

/* ── A shared bill is counted once ─────────────────────────────────────── */

ok('the two Google rungs draw on one purse',
  purseOf(googleVeo) === purseOf(googleVeoFull)
  && purseOf(googleVeo) !== googleVeo.id,
  `${purseOf(googleVeo)} vs ${purseOf(googleVeoFull)} — same project, same`
  + ' GOOGLE_CAP_VIDEO, so counted apart they spend it twice');

ok('  and they are genuinely two different engines, not one named twice',
  googleVeo.id !== googleVeoFull.id && googleVeo.model !== googleVeoFull.model,
  `${googleVeo.id}/${googleVeo.model} vs ${googleVeoFull.id}/${googleVeoFull.model}`);

const route = readFileSync('app/api/video/route.ts', 'utf8');
ok('  and the route counts spend by purse rather than by id',
  /purseOf\(one\)/.test(route) && /purses\.get\(purseOf\(one\)\)/.test(route),
  'app/api/video/route.ts asks candidates() for spend per provider id, so a'
  + ' purse nothing reads is a comment and the ceiling is still doubled');

ok('  and no two engines share a purse by accident',
  (() => {
    const byPurse = new Map<string, string[]>();
    for (const one of PROVIDERS) {
      const name = purseOf(one);
      byPurse.set(name, [...(byPurse.get(name) ?? []), one.id]);
    }
    /* Sharing is deliberate, so every shared purse must be named rather than
       being an id two engines happen to both carry. */
    return [...byPurse].every(([name, ids]) =>
      ids.length === 1 ? name === ids[0] : !ids.includes(name));
  })(),
  'a purse that is also an engine id means one engine is quietly spending'
  + " another's allowance");

/* ── Every engine offered earns more than it costs ─────────────────────── */

/**
 * The cheapest a credit is ever sold for, read rather than remembered.
 *
 * I guessed this at twenty-five cents on 9 October 2026 and told her fifteen
 * credits was R3.75. It is R22.35. The guess turned a healthy margin into an
 * imaginary loss and produced advice that no Veo tier could be sold at all.
 * So it is read off the tiers here, every run.
 */
const RAND_PER_CREDIT = Math.min(
  ...(['maker', 'studio', 'label'] as const).map(
    (tier) => TIER_SPECS[tier].rand / TIER_CREDITS[tier],
  ),
);

ok('a credit’s cheapest price is read off the tiers, not typed here',
  RAND_PER_CREDIT > 0.5 && RAND_PER_CREDIT < 5,
  `R${RAND_PER_CREDIT.toFixed(3)} a credit — outside that range means the`
  + ' tiers moved and this file is pricing against a number nobody checked');

/** Rand a five-second clip costs US, per engine, from this project's invoices. */
const COSTS_RAND: Record<string, number> = {
  /* The ids are the ElevenLabs ones, read off the providers rather than
     guessed: this file was written with `eleven-seedance` and `eleven-veo`
     and failed on its first run, which is the only reason those are right
     now. */
  seedance: 2.62,
  veo: 10.72,
  'google-veo-standard': 4.00,
  'google-veo-better': 12.00,
  'google-veo-premium': 32.00,
  kling: 3.44,
};

for (const one of PROVIDERS) {
  const costs = COSTS_RAND[one.id];
  ok(`${one.id} has a rand cost written down`,
    typeof costs === 'number',
    'an engine whose real cost is not recorded cannot be known to earn'
    + ' anything, and "it is probably fine" is how this project got a'
    + ' thousand-fold error past itself once already');
  if (typeof costs !== 'number') continue;

  const takes = videoCost(one.grade as Grade, 5) * RAND_PER_CREDIT;
  ok(`  and on ${one.grade} it takes R${takes.toFixed(2)} for the R${costs.toFixed(2)} it spends`,
    takes >= costs * 2,
    `${(takes / costs).toFixed(1)}x — Carli, 9 October 2026: "ons moet net`
    + ' seker maak ons maak ordentlike wins uit elke generation uit". Under'
    + ' twice the supplier price there is nothing left for the platform fee,'
    + ' the storage or a retry');
}

console.log(bad === 0
  ? '\nThe grade ladder holds.'
  : `\n${bad} thing(s) about the grade ladder are not true.`);
process.exit(bad === 0 ? 0 : 1);
