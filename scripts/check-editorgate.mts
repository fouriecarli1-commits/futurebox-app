/**
 * The editor is shut on Free and open on every paid plan.
 *
 * ── Why this is not in the browser probe ─────────────────────────────────
 *
 * Because a browser cannot see it. `loadOwned()` answers `EVERYTHING` — tier
 * `label` — when no Supabase is configured, which is this app's rule
 * everywhere: with no accounts, nothing is metered, and `charge()` and
 * `paidRoom()` do the same.
 *
 * So an unattended run is a paying member by design and the door never
 * shows. `check:editor`'s first version asserted the opposite and reported a
 * working gate as broken, which is the more dangerous direction to be wrong
 * in: a probe that fails on correct behaviour gets switched off, and the
 * next real failure goes with it.
 *
 * The gate is an entitlement row and a comparison. That needs no browser.
 *
 * ── What it is really holding ────────────────────────────────────────────
 *
 * Every plan card says the editor comes with a paid plan. The card and the
 * door are drawn from the same row — `ENTITLEMENTS['video.editor']` — so the
 * only way they can disagree is if somebody edits the row. This is the line
 * that notices.
 */
import { check, ENTITLEMENTS } from '../app/lib/entitlements.ts';
import { TIER_SPECS } from '../app/lib/plans.ts';
import { readFileSync } from 'node:fs';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) bad += 1;
};

ok('the editor is shut on Free',
  check('video.editor', 'free').allowed === false,
  'every plan card says it comes with a paid plan');

for (const tier of ['maker', 'studio', 'label'] as const) {
  ok(`  and open on ${TIER_SPECS[tier].name}`,
    check('video.editor', tier).allowed === true,
    'a card that sells a room the plan cannot open is worse than not selling it');
}

/* The refusal has to name a plan somebody can actually buy. "Needs a paid
   plan" to a Maker member who is already paying is the small lie this
   codebase has been caught in before. */
const room = readFileSync('app/components/VideoEditor.tsx', 'utf8');
ok('the shut room says what is still free',
  /stays free/i.test(room),
  'a locked room that does not say what you still have reads as the app breaking');

ok('  and offers a way to the plans',
  /data-editorupgrade/.test(room),
  'a door with no handle is a wall');

/* And the Pro Booth's gate exists for the same reason, on the same table. It
   is asserted here rather than in a second file: one question, one place. */
ok('the Pro Booth is gated the same way',
  check('booth.pro', 'free').allowed === false && check('booth.pro', 'maker').allowed === true,
  'the cards name it as a paid-plan room');

ok('  and the ordinary Booth is not gated at all',
  ENTITLEMENTS['booth.pro'].freeNote.toLowerCase().includes('free'),
  'the free note is what tells somebody what they keep');

if (bad > 0) {
  console.log(`\ncheck:editorgate — ${bad} problem(s) between what the cards sell and what the rooms open.`);
  process.exitCode = 1;
} else {
  console.log('\ncheck:editorgate — the editor and the Pro Booth are shut on Free, open on every paid plan, and say what stays free.');
}
