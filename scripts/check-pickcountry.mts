/**
 * A person can correct the country we price them in.
 *
 * ── What was wrong ───────────────────────────────────────────────────────
 *
 * Until 11 October 2026 `setRegion` was called in one place, by the guess,
 * and nowhere else — on the front page and inside the app both. A visitor
 * priced in the wrong currency could not change it, could not see why it had
 * happened, and was not told it was a guess at all.
 *
 * It is not hypothetical. `lib/pricing.ts` carries the record: *"Found by
 * opening the You tab in Afrikaans on a phone: 'Jou plan — Label · $119.00
 * per maand'."* The timezone list is written by hand, and the next zone
 * missing from it fails the same silent way.
 *
 * The owner, 11 October 2026: *"Maak 'n country picker"*.
 *
 * ── What this holds, and what it cannot ─────────────────────────────────
 *
 * The behaviour, with real values: a kept choice comes back, junk in storage
 * reads as no choice, forgetting works, and the list a picker shows is in an
 * order somebody can find their own country in.
 *
 * It cannot tell you the picker LOOKS right — a check cannot see a screen.
 * What it can do is hold the one decision that is silently destructive:
 * `keptRegion` answering with a region for a code that is not on the list.
 * Falling through to `REGIONS[0]` there would put a South African on dollars,
 * which is the exact fault this whole path exists to stop, arriving by a new
 * door and looking like a preference.
 */
import { readFileSync } from 'node:fs';
import {
  REGIONS, REGION_KEPT, keepRegion, keptRegion, regionByCode, regionsByName,
} from '../app/lib/pricing.ts';

let bad = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
}

/* A browser's storage, near enough: the functions only ever get, set and
   remove, and what matters is what they do with what comes back. */
const kept = new Map<string, string>();
(globalThis as Record<string, unknown>).window = {
  localStorage: {
    getItem: (k: string): string | null => kept.get(k) ?? null,
    setItem: (k: string, v: string): void => { kept.set(k, v); },
    removeItem: (k: string): void => { kept.delete(k); },
  },
};

ok('with nothing kept, there is no choice to honour', keptRegion() === null);

keepRegion('ZA');
ok('a chosen country is remembered', keptRegion()?.code === 'ZA', String(keptRegion()?.code));
ok('  and it is the real region, not a bare code', keptRegion()?.currency === 'ZAR');

keepRegion(null);
ok('forgetting a choice puts it back on the guess', keptRegion() === null,
  'without this there is no way back once somebody has picked wrong');

/* ── The one that matters ───────────────────────────────────────────────

   Storage is a place anybody can edit, and a code can also simply be retired
   from `REGIONS` by a later change to this app. Both have to read as "no
   choice". Answering `REGIONS[0]` instead — the United States — would price
   a South African in dollars and call it her own preference. */
kept.set(REGION_KEPT, 'ZZ');
ok('a country that is not on the list reads as no choice', keptRegion() === null,
  'it answered with a region, which on a stale code means dollars for somebody who chose rand');

kept.set(REGION_KEPT, '');
ok('  and so does an empty one', keptRegion() === null);

kept.clear();
keepRegion('ZZ');
ok('  and one is never written in the first place', kept.size === 0, [...kept.keys()].join(','));

/* ── The list a picker shows ────────────────────────────────────────── */

const listed = regionsByName();
ok('the picker offers every region', listed.length === REGIONS.length,
  `${listed.length} of ${REGIONS.length}`);

const names = listed.map((one) => one.name);
ok('  in an order somebody can find their own country in',
  names.join('|') === [...names].sort((a, b) => a.localeCompare(b, 'en')).join('|'),
  'REGIONS is ordered by purchasing power, which is right for the table and'
  + ' wrong for a drop list of nineteen');

ok('  and South Africa is one of them',
  listed.some((one) => one.code === 'ZA' && one.currency === 'ZAR'));

ok('a code that is not on the list still resolves somewhere for display',
  regionByCode('ZZ').code === REGIONS[0].code,
  'regionByCode is the DISPLAY fallback and may do this; keptRegion may not');

/* ── And both price screens actually have one ───────────────────────────

   Structural, and says so. The two screens that show a plan price are the
   front page — which a buyer reads before they have an account, so it is
   where a wrong currency costs a sale rather than a support message — and
   the price list inside the app. A picker on one of them only is the fault
   half fixed. */
for (const [file, id] of [
  ['app/components/Landing.tsx', 'welcome-region'],
  ['app/page.tsx', 'fb-region'],
] as const) {
  const code = readFileSync(file, 'utf8');
  ok(`${file} lets somebody choose`,
    code.includes(`id="${id}"`) && code.includes('chooseRegion('),
    'it shows a price and offers no way to correct the country it is in');
}

if (bad) {
  console.error(`\ncheck:pickcountry — ${bad} wrong. Somebody is stuck with a price in a currency they did not choose.\n`);
  process.exit(1);
}
console.log(`\ncheck:pickcountry — ${REGIONS.length} countries, a choice that survives, and junk that reads as no choice.`);
