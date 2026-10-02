/**
 * The cutting room is open to everybody, and the EXPORT is the gate.
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
import { TIER_CREDITS } from '../app/lib/credits.ts';
import { billFor, NOTHING_IN_IT } from '../app/lib/filmcost.ts';
import { readFileSync } from 'node:fs';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) bad += 1;
};

/* ── The room, 3 October 2026 ─────────────────────────────────────────────

   This read "the editor is shut on Free" until today, and it was right about
   what the app did. Carli: *"hulle kan 'n video bou, en die funksies toets,
   maar nie hulle video export nie want hulle het nie genoeg krediete nie."*

   The room renders in the member's own browser and costs this app nothing to
   serve, however many hours somebody sits in it. A door on a room that costs
   nothing keeps people out of the one place where they find out what the
   product is. So the door comes off and the gate moves to where the value
   actually is: the press that hands over a finished film.

   A free account holds nought credits, so the gate holds without a door. */
for (const tier of ['free', 'maker', 'studio', 'label'] as const) {
  ok(`the cutting room is open on ${TIER_SPECS[tier].name}`,
    check('video.editor', tier).allowed === true,
    'it renders in their own browser and costs us nothing to serve');
}

ok('  and a free account has nothing to spend, so the export is the gate',
  TIER_CREDITS.free === 0,
  'the whole design rests on this: the room is free and the film is not');

ok('  and the cheapest film costs more than nought, or there is no gate at all',
  billFor({ ...NOTHING_IN_IT, seconds: 1 }).total > 0,
  'a free export would open the room AND the film, which is not what was asked');

const room = readFileSync('app/components/VideoEditor.tsx', 'utf8');

/* ── What replaced the door ───────────────────────────────────────────────

   A door says "you cannot come in". The bill says "here is what this costs,
   here is what you have, and your film is still here" — which is the same
   refusal with the work preserved and a reason attached.

   These three are what the old `stays free` and `data-editorupgrade` rules
   were really protecting: that a refusal names what is still theirs, and that
   it offers a way forward rather than a wall. */
ok('the room reads the balance before it renders, not after',
  /loadWallet\(\)/.test(room),
  'the charge lands after the film exists, so without this a free member sits'
  + ' through a full real-time render to be told no at the end');

ok('  and tells somebody short of credits that the film is not lost',
  /edit\.billShort/.test(room) && /data-editorshort/.test(room),
  'a refusal that does not say the work survived reads as the work going with it');

ok('  and offers a way to the plans from the bill',
  /data-editorbillplans/.test(room),
  'a door with no handle is a wall, and so is a price with no way to pay it');

/* And the Pro Booth's gate exists for the same reason, on the same table. It
   is asserted here rather than in a second file: one question, one place. */
ok('the Pro Booth is gated the same way',
  check('booth.pro', 'free').allowed === false && check('booth.pro', 'maker').allowed === true,
  'the cards name it as a paid-plan room');

ok('  and the ordinary Booth is not gated at all',
  ENTITLEMENTS['booth.pro'].freeNote.toLowerCase().includes('free'),
  'the free note is what tells somebody what they keep');

/* ── And the doors have to READ the table ─────────────────────────────────

   The three rules above say the table is right. They were all green while
   `ProBooth` had no gate of any kind and the room opened for anybody, which
   made four plan cards say something untrue.

   A table nobody consults is a table that is right about nothing. So the
   door is read too: it must ask `check('booth.pro', …)` and it must offer a
   way to the plans when the answer is no. */
const door = readFileSync('app/components/VocalBooth.tsx', 'utf8');
ok('the Pro Booth door asks the table before it opens',
  /check\(\s*'booth\.pro'/.test(door),
  'the cards sell it as a paid-plan room and the door lets everybody in');

ok('  and sends a free member to the plans instead of nowhere',
  /onUpgrade\?\.\(\)/.test(door) && /data-probooth/.test(door),
  'a door that refuses and offers nothing is a button that does nothing');

const editorDoor = readFileSync('app/components/VideoEditor.tsx', 'utf8');
ok('the editor asks the same table',
  /check\(\s*'video\.editor'/.test(editorDoor),
  'same rule, same row, same failure if it stops asking');

if (bad > 0) {
  console.log(`\ncheck:editorgate — ${bad} problem(s) between what the cards sell and what the rooms open.`);
  process.exitCode = 1;
} else {
  console.log(
    '\ncheck:editorgate — the cutting room is open to everybody and the export is'
    + ' the gate; the Pro Booth is shut on Free and says what stays free.',
  );
}
