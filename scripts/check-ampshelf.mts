/**
 * The amps you keep, and the ways a shelf like this goes wrong.
 *
 * ── Why it needed building at all ────────────────────────────────────────
 *
 * Carli, 23 September 2026: *"ek wil 'n ordentlike probooth bou en voel ons
 * moet ook nog amp modellers in bring."*
 *
 * The modelling was built in September and verified by `check:nam`. What was
 * missing was anywhere to keep a capture: the booth read the file, ran the
 * lane through it, and kept only the RESULT — so a second lane meant finding
 * the same file again, and a re-recorded take could not get its amp back.
 *
 * ── The five ways this ships looking finished and is not ─────────────────
 *
 * Each rule below is one of them, and none is hypothetical — three are faults
 * this repository has already made somewhere else and has the commits to
 * prove it:
 *
 * - A file kept before it is known to load. The shelf fills with rows that
 *   fail on every press and nothing says which.
 * - The details written before the bytes. A row pointing at nothing draws an
 *   amp somebody cannot use and gives no reason.
 * - Eviction taking the favourite — the one thing somebody said to hold.
 * - A dead row left on the shelf after the bytes are gone, so the same press
 *   fails for ever.
 * - An English strip in an Afrikaans app.
 */

import { readFileSync } from 'node:fs';
import { AMP_MAX_BYTES, KEEP } from '../app/lib/amps';
import { before } from './order.mts';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const shelf = readFileSync('app/lib/amps.ts', 'utf8');
const booth = readFileSync('app/components/ProBooth.tsx', 'utf8');
const words = readFileSync('app/lib/i18n.tsx', 'utf8');

/* ── The store ───────────────────────────────────────────────────────── */

ok('the shelf keeps the capture itself, not only what it made',
  /putAudio\(amp\.id/.test(shelf) && /export async function ampJson/.test(shelf),
  'keeping the amped audio and dropping the file is the fault this exists to fix: '
  + 'a second lane cannot have the same amp');

ok('  and the bytes go down before the row does',
  before(shelf, 'await putAudio(amp.id', 'const all = loadAmps();'),
  'a row written first points at nothing until the write lands, and draws an amp nobody can use');

/* Eviction. The rule is not "there is a cap" — it is that the cap cannot take
   the one somebody said to keep, which is the half that is easy to leave out
   and impossible to see until it happens. */
ok('  and eviction never takes a kept one',
  /lastIndexOf\(false\)/.test(shelf) && /if \(at === -1\) break;/.test(shelf),
  'the oldest is dropped whether or not it was starred, and the star means nothing');

ok(`  with a cap that is a row somebody can read — ${KEEP}`, KEEP >= 6 && KEEP <= 20,
  `${KEEP} is either too few to be a shelf or too many to find anything in`);

ok(`  and a size a capture could actually be — ${Math.round(AMP_MAX_BYTES / 1024 / 1024)} MB`,
  AMP_MAX_BYTES >= 2 * 1024 * 1024 && AMP_MAX_BYTES <= 32 * 1024 * 1024,
  'a limit under a couple of megabytes refuses real captures; one over thirty refuses nothing');

/* ── The booth ───────────────────────────────────────────────────────── */

/* Run first, keep second. A shelf of files that will not load is worse than
   no shelf: every one is a press that fails later with nothing to say which. */
const bring = /const bringAmp = async[\s\S]*?\n  \};/.exec(booth)?.[0] ?? '';
/* Both present, THEN ordered. The first version compared two `indexOf`
   results, and deleting the run entirely gave -1, which is less than any
   position — so a bringAmp that never ran the capture at all read as one
   that ran it first. The same shape as the `startOpen` rule that once
   landed on a parameter four hundred lines above the call it was about:
   an index into a string is only an answer once you know the thing is
   there. */
const ranAt = bring.indexOf('await runThrough(');
const keptAt = bring.indexOf('await rememberAmp(');
ok('a capture is proved before it is kept',
  ranAt !== -1 && keptAt !== -1 && ranAt < keptAt,
  !bring ? 'no bringAmp found in ProBooth.tsx'
  : ranAt === -1 ? 'the capture is never run at all, so bringing one in puts nothing on the lane'
  : keptAt === -1 ? 'it is never kept, which is the whole of what this shelf is for'
  : 'it is kept first, so a file this engine cannot read still gets a row on the shelf');

ok('  and its size is refused before it is parsed',
  /file\.size > AMP_MAX_BYTES/.test(bring),
  'a wav renamed .nam is read into memory as text first, on a phone');

/* A row whose bytes are gone must go, not sit there failing. */
const use = /const useAmp = async[\s\S]*?\n  \};/.exec(booth)?.[0] ?? '';
ok('a row whose capture is gone takes itself off the shelf',
  Boolean(use) && /forgetAmp\(amp\.id\)/.test(use) && /ampGone/.test(use),
  use ? 'the press fails, says nothing useful, and will fail again every time'
      : 'no useAmp found in ProBooth.tsx');

ok('  and putting one on a lane is one press', /data-useamp=/.test(booth),
  'there is no way to use what is on the shelf, which makes it a list rather than a shelf');

/* Drawn even when the lane already has an amp: swapping one for another is
   the thing somebody actually does, and the old row made that "take it off,
   then find the file again". */
/* Anchored on `data-ampshelf`, which is the strip itself.
 
   The first version matched from `{shelf.length > 0 && (`, and there are TWO
   of those — the strip and the sentence under it. Gating the strip on
   `!lane.amped` simply moved the match onto the sentence, which of course
   mentions no lane, and the rule stayed green over the exact change it was
   written to catch. A rule that can slide onto its neighbour is a rule about
   whichever one it landed on. */
const at = booth.indexOf('data-ampshelf');
const shelfRow = at === -1 ? '' : booth.slice(Math.max(0, at - 400), at);
ok('  including when the lane already has one',
  at !== -1 && !/lane\.amped/.test(shelfRow),
  at === -1 ? 'there is no shelf strip at all'
  : 'the shelf hides itself the moment it is most useful, which is when you want the other amp');

/* ── The language ────────────────────────────────────────────────────── */

const KEYS = [...new Set([...booth.matchAll(/t\('(pro\.amp[A-Za-z]*)'/g)].map((one) => one[1]))];
const noAf = KEYS.filter((key) =>
  !new RegExp(`"${key.replace('.', '\\.')}":\\s*\\{[^}]*\\baf:\\s*"[^"]{2,}"`).test(words));
ok(`the strip speaks Afrikaans — ${KEYS.length} keys`, KEYS.length >= 6 && noAf.length === 0,
  noAf.length ? noAf.join(', ') : `${KEYS.length} keys is fewer than this strip has sentences`);

/* ── And the thing it does not claim ─────────────────────────────────── */

/* We ship no captures. Until TONE3000 answers about their library or about
   licensing, the shelf is bring-your-own and the room must not imply
   otherwise — a strip that reads as a catalogue with nothing in it is the
   worst version of this. */
ok('the room does not imply we supply the amps',
  !/(house|our|built-in|included)\s+(amps|captures)/i.test(booth),
  'nothing is shipped: every capture is a file the member brought, and the room says so');

if (failures) {
  console.error(`\ncheck:ampshelf — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(
  `\ncheck:ampshelf — a capture is found once and kept, up to ${KEEP}, `
  + 'proved before it is kept and never evicted over a starred one.',
);
