/**
 * The plan cards say only what is true, at today's prices.
 *
 * The plans review of 14 October 2026 found card lines quoting prices that
 * had moved (dubbing 162 when it is 110, stems 6 when they are 8, a month's
 * marketing plan 40 when it is 15), a Label promise that was false ("no
 * daily ceiling anywhere" — readings still have one), a workshop vote that
 * was never built, and a boost request that stayed on the phone.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { TIER_SPECS } from '../app/lib/plans.ts';
import { CREDITS, TIER_CREDITS } from '../app/lib/credits.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};
const lines = Object.values(TIER_SPECS).flatMap((one) => one.includes);
const all = lines.join('\n');

/* ── 1. Every price a card quotes is the price charged ───────────────── */
const said = (re: RegExp): number[] => [...all.matchAll(re)].map((m) => Number(m[1]));
const dub = said(/Dubbing[^\d]*(\d+) credits a minute/g);
ok('dubbing is quoted at its price', dub.length > 0 && dub.every((n) => n === CREDITS.dub), `${dub} vs ${CREDITS.dub}`);
const stems = said(/Splitting stems is (\d+) credits/g);
ok('stems are quoted at their price', stems.length > 0 && stems.every((n) => n === CREDITS.stems), `${stems} vs ${CREDITS.stems}`);
const voice = said(/changing a voice (\d+)/g);
ok('a voice change is quoted at its price', voice.every((n) => n === CREDITS.voiceChange), `${voice} vs ${CREDITS.voiceChange}`);
const plan = said(/plan is (\d+) credits/g);
ok('a month’s marketing plan is quoted at its price', plan.length > 0 && plan.every((n) => n === CREDITS.marketPlan), `${plan} vs ${CREDITS.marketPlan}`);
const ads = said(/eight advert lines (?:are )?(\d+)/g);
ok('eight advert lines are quoted at their price', ads.length > 0 && ads.every((n) => n === CREDITS.adLines), `${ads} vs ${CREDITS.adLines}`);
const outOf = [...all.matchAll(/out of your (\d+)/g)].map((m) => Number(m[1]));
ok('"out of your N" is the plan’s real allowance',
  outOf.every((n) => Object.values(TIER_CREDITS).includes(n)), String(outOf));
ok('training a sound says it costs more than a Studio month holds',
  TIER_SPECS.studio.includes.some((one) => new RegExp(`${CREDITS.finetune} credits`).test(one)));

/* ── 2. Nothing promised that is not there ────────────────────────────── */
ok('no "no daily ceiling" — readings have one on every plan', !/no daily ceiling/i.test(all));
ok('no workshop vote, which was never built', !/which workshops get made/i.test(all));
const radar = withoutComments(readFileSync('app/components/CollabRadar.tsx', 'utf8'));
ok('a boost request reaches FutureBox, not only this phone',
  /fetch\('\/api\/enquiry'/.test(radar) && /sendBoost\(/.test(radar));

/* ── 3. The cards in the app speak its language ───────────────────────── */
const page = readFileSync('app/page.tsx', 'utf8');
ok('the in-app plan list is translated like the welcome page’s',
  /t\(`plan\.\$\{spec\.id\}\.inc\.\$\{i\}`, line\)/.test(page));

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);
