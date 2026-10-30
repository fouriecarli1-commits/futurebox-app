/**
 * ProBooth's drum pads (`lib/beatbox.ts`): every hit lands on its step at the
 * session's tempo, swing pushes only the off-beats, the beat is the same file
 * every time, and it never goes over -1 dB.
 */
import { readFileSync } from 'node:fs';
import { PRESETS, RATE, SOUNDS, STEPS, beatSeconds, empty, hit, renderBeat, stepAt, stepSeconds, type Beat } from '../app/lib/beatbox.ts';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

ok('a sixteenth at 120 BPM is an eighth of a second', Math.abs(stepSeconds(120) - 0.125) < 1e-12);
ok('straight, step 5 starts five sixteenths in', Math.abs(stepAt(5, 120, 0) - 0.625) < 1e-12);
ok('  and swing pushes only the off-beat sixteenths late', stepAt(4, 120, 0.5) === stepAt(4, 120, 0) && Math.abs(stepAt(5, 120, 0.5) - (0.625 + 0.0625)) < 1e-12);
ok('every preset has sixteen steps for every sound', PRESETS.every((one) => SOUNDS.every((sound) => one.beat.pattern[sound].length === STEPS)));
ok('every sound in the kit makes sound', SOUNDS.every((sound) => hit(sound).some((v) => Math.abs(v) > 0.05)));

const lone: Beat = { bars: 1, swing: 0, pattern: { ...empty(), kick: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] } };
const one = renderBeat(lone, 120);
const first = one.findIndex((v) => Math.abs(v) > 0.01);
ok('a kick on step 5 at 120 BPM starts half a second in', Math.abs(first / RATE - 0.5) < 0.002, (first / RATE).toFixed(4));
ok('  and nothing plays before it', one.slice(0, first).every((v) => v === 0));
const amapiano = PRESETS.find((p) => p.id === 'amapiano')!.beat;
const a = renderBeat(amapiano, 112);
const b = renderBeat(amapiano, 112);
ok('the same beat is the same file every time', a.length === b.length && a.every((v, i) => v === b[i]));
ok('  and never louder than -1 dB', a.reduce((m, v) => Math.max(m, Math.abs(v)), 0) <= 10 ** (-1 / 20) + 1e-6);
ok('  and is as long as its bars on the clock, plus the last hit ringing out', a.length >= beatSeconds(amapiano, 112) * RATE);
ok('the amapiano style has a log drum on it', amapiano.pattern.log.some((v) => v > 0));

const booth = withoutComments(readFileSync('app/components/ProBooth.tsx', 'utf8'));
ok('a new beat lands on the bar the line is in', /Math\.floor\(at \/ bar\) \* bar/.test(booth));
ok('  keeps its pattern on the lane so it can be changed after', /beat,\s*\}\]\);/.test(booth) && /data-beatedit/.test(booth));
ok('  and is saved with the session', /beat: JSON\.parse\(JSON\.stringify\(lane\.beat\)\)/.test(readFileSync('app/lib/keepsession.ts', 'utf8')) && /\{ beat: lane\.beat \}/.test(booth));
ok('  and both adding and changing a beat are undoable', /remember\(t\('undo\.beat'/.test(booth));

if (bad) {
  console.error(`\ncheck:beatbox — ${bad} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:beatbox — every hit on its step, swung where it should be, the same every time and never clipping.');
