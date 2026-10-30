/**
 * ProBooth's "choose the best pass" (`lib/besttake.ts`), held to passes built
 * here so the right answer is known: a pass on the note beats one 40 cents
 * off it, one that sings all of the phrase beats one that comes in late, a
 * steady note beats a wobbling one, and a clipped pass loses to a clean one.
 */
import { readFileSync } from 'node:fs';
import { IN_TUNE_CENTS, rankPasses, readPass } from '../app/lib/besttake.ts';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

const rate = 16000;
const seconds = 2;
/* A voice-like note: a few harmonics, so the tracker has something to hold. */
const sung = (hz: (t: number) => number, amp = 0.3, from = 0): Float32Array => {
  const out = new Float32Array(seconds * rate);
  let phase = 0;
  for (let i = 0; i < out.length; i += 1) {
    const t = i / rate;
    phase += (2 * Math.PI * hz(t)) / rate;
    if (t < from) continue;
    out[i] = amp * (Math.sin(phase) + 0.5 * Math.sin(2 * phase) + 0.25 * Math.sin(3 * phase));
  }
  return out;
};
const A = 220;
const onNote = readPass(sung(() => A), rate, null);
const off = readPass(sung(() => A * 2 ** (40 / 1200)), rate, null);
const late = readPass(sung(() => A, 0.3, 1), rate, null);
const wobbly = readPass(sung((t) => A * 2 ** ((45 * Math.sin(2 * Math.PI * 9 * t)) / 1200)), rate, null);
const clippedPass = readPass(sung(() => A, 0.9).map((v) => Math.max(-1, Math.min(1, v * 1.6))), rate, null);

ok('a pass on the note reads as in tune', onNote.inTune > 0.9 && onNote.cents < 10, JSON.stringify(onNote));
ok(`  and one 40 cents off reads as out (over ${IN_TUNE_CENTS})`, off.inTune < 0.2 && off.cents > 30, JSON.stringify(off));
ok('a pass that comes in half way through sang about half as much', Math.abs(late.voiced / onNote.voiced - 0.5) < 0.1, `${late.voiced} vs ${onNote.voiced}`);
ok('a wobbling note wobbles more than a steady one', wobbly.wobble > onNote.wobble + 3, `${wobbly.wobble} vs ${onNote.wobble}`);
ok('a clipped pass is seen to clip', clippedPass.clipped > 0.01 && onNote.clipped === 0);

const ranked = rankPasses([
  { id: 'off', reading: off },
  { id: 'late', reading: late },
  { id: 'clean', reading: onNote },
  { id: 'wobbly', reading: wobbly },
  { id: 'clipped', reading: clippedPass },
]);
ok('the pass on the note, all there, steady and clean is chosen', ranked[0].id === 'clean', ranked.map((one) => `${one.id} ${one.score}`).join(', '));
ok('  and out of tune ranks below in tune', ranked.findIndex((one) => one.id === 'off') > ranked.findIndex((one) => one.id === 'clean'));
ok('  and late below all there, clipped below clean', ranked.find((one) => one.id === 'late')!.score < ranked[0].score && ranked.find((one) => one.id === 'clipped')!.score < ranked[0].score);
ok('the scale is respected: a G# is out of tune in C major, in tune with every semitone allowed',
  readPass(sung(() => 415.3), rate, [0, 2, 4, 5, 7, 9, 11]).inTune < 0.2 && readPass(sung(() => 415.3), rate, null).inTune > 0.9);

const booth = withoutComments(readFileSync('app/components/ProBooth.tsx', 'utf8'));
const card = withoutComments(readFileSync('app/components/BestTake.tsx', 'utf8'));
ok('the marked piece is comped from the winner, the same way a hand-picked pass is', /const bestPass[\s\S]{0,4500}compWith\(/.test(booth) && /const regionComp[\s\S]{0,200}compWith\(/.test(booth));
ok('  and the whole take keeps the winner playing and mutes the others, every piece of a pass together, as one undoable step', /remember\(t\('undo\.best'/.test(booth) && /muted: one\.name !== pass/.test(booth));
ok('the whole take judges each pass on all it recorded, not on what comping left of it', /from: Math\.min\(\.\.\.windows\.map\(\(w\) => w\.from\)\)/.test(booth));
ok('passes with nothing sung in them are not ranked against each other', /< MIN_SUNG_S\)[\s\S]{0,200}best\.nothingSung/.test(booth));
ok('every pass shows its score, so another can still be chosen', /data-bestscore/.test(card) && /data-bestpick/.test(card));
ok('the presses say they take no credits', (card.match(/script\.noCredits/g) ?? []).length >= 1);

if (bad) {
  console.error(`\ncheck:besttake — ${bad} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:besttake — the best pass is the one in tune, all there, steady and clean.');
