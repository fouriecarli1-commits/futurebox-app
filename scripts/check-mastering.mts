/**
 * The master's last stage: loudness read the way streaming services read it,
 * and a limiter that never lets a sample over the ceiling.
 */
import { readFileSync } from 'node:fs';
import { finish, limited, lufsOf, truePeakDb, type Sound } from '../app/lib/mastering.ts';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

const RATE = 48000;
const tone = (seconds: number, amp: number, hz = 997, stereo = true): Sound => {
  const one = new Float32Array(seconds * RATE);
  for (let i = 0; i < one.length; i += 1) one[i] = amp * Math.sin((2 * Math.PI * hz * i) / RATE);
  return { channels: stereo ? [one, one.slice()] : [one], rate: RATE };
};
const peakOf = (sound: Sound): number => Math.max(...sound.channels.map((c) => c.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));

/* EBU Tech 3341, the reference: a 1 kHz stereo sine at -23 dBFS reads -23 LUFS. */
const ref = lufsOf(tone(10, 10 ** (-23 / 20)));
ok('a stereo 1 kHz tone at -23 dBFS reads -23.0 LUFS', Math.abs(ref + 23) < 0.15, ref.toFixed(2));
const louder = lufsOf(tone(10, 10 ** (-13 / 20)));
ok('  and ten dB louder reads ten LU louder', Math.abs(louder - ref - 10) < 0.05, (louder - ref).toFixed(2));
ok('silence reads as nothing at all', lufsOf(tone(5, 0)) === -Infinity);
/* The gates: a loud half and a silent half reads as the loud half, not an average with silence. */
const half = tone(10, 10 ** (-20 / 20));
half.channels.forEach((c) => c.fill(0, c.length / 2));
ok('silence in the song does not drag the reading down', Math.abs(lufsOf(half) - lufsOf(tone(5, 10 ** (-20 / 20)))) < 0.3, lufsOf(half).toFixed(2));

/* The limiter. */
const hot = tone(3, 0.9);
const out = limited(hot, 12, -1);
ok('turned up 12 dB, nothing goes over a -1 dB ceiling', 20 * Math.log10(peakOf(out)) <= -1 + 1e-6, (20 * Math.log10(peakOf(out))).toFixed(3));
ok('  and the input is left as it was', peakOf(hot) <= 0.9 + 1e-6);
const quiet = tone(3, 0.1);
const untouched = limited(quiet, 0, -1);
ok('a mix under the ceiling comes through unchanged', Math.abs(peakOf(untouched) - 0.1) < 1e-4);

/* Finishing: to the target and under the ceiling. */
const song = tone(8, 0.05);
const done = finish(song, { ceilingDb: -1, matchLoudness: true, target: 'stream' });
ok('matching brings a quiet mix to the streaming target', Math.abs(done.lufsAfter + 14) < 1, done.lufsAfter.toFixed(2));
ok('  with its true peak under the ceiling', done.truePeakDb <= -1 + 0.05, done.truePeakDb.toFixed(2));
const apple = finish(song, { ceilingDb: -1, matchLoudness: true, target: 'apple' });
ok('  and the Apple Music target is quieter', apple.lufsAfter < done.lufsAfter - 1.5, `${apple.lufsAfter.toFixed(1)} vs ${done.lufsAfter.toFixed(1)}`);
const off = finish(tone(4, 0.99), { ceilingDb: -1, matchLoudness: false });
ok('with matching off, a hot mix is still held under the ceiling', off.truePeakDb <= -1 + 0.05, off.truePeakDb.toFixed(2));
ok('  and a quiet one is not turned up', finish(song, { ceilingDb: -1, matchLoudness: false }).gainDb === 0);
const sine = tone(2, 1, 11025 * 0.99);
ok('the true peak reads between samples', truePeakDb(sine) >= 20 * Math.log10(peakOf(sine)) - 1e-6);

/* Both ways out of the room are finished, every time, with no reading to go stale. */
const booth = withoutComments(readFileSync('app/components/ProBooth.tsx', 'utf8'));
ok('the Library copy and the phone copy are both finished on the way out', (booth.match(/finishMix\(/g) ?? []).length >= 2, String((booth.match(/finishMix\(/g) ?? []).length));
ok('  and neither renders through the old trim', !/mixSession\(lanes, rate, master, trim\)/.test(booth));

if (bad) {
  console.error(`\ncheck:mastering — ${bad} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:mastering — loudness in LUFS, and nothing over the ceiling.');
