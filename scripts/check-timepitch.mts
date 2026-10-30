/**
 * ProBooth's time and pitch (`lib/timepitch.ts`), held to what it says on
 * sounds built here so the right answer is known: a beat at 96 reads as 96,
 * a chord of A minor reads as A minor, a tone moved up three semitones is
 * that many semitones higher and as long as it was, and a clip made faster
 * keeps its pitch.
 */
import { readFileSync } from 'node:fs';
import {
  FASTEST_SPEED, SLOWEST_SPEED, keyOfClip, keyOfName, sayKey, semitonesBetween, speedToFit, tempoOf, timeAndPitch,
} from '../app/lib/timepitch.ts';
import { hit, RATE } from '../app/lib/beatbox.ts';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

const rate = RATE;
const tone = (hz: number, seconds: number): Float32Array =>
  Float32Array.from({ length: Math.round(seconds * rate) }, (_, i) => 0.5 * Math.sin((2 * Math.PI * hz * i) / rate));

/* The pitch of a steady tone, from its zero crossings in the middle. */
const hzOf = (samples: Float32Array): number => {
  const from = Math.floor(samples.length * 0.25);
  const to = Math.floor(samples.length * 0.75);
  let crossings = 0;
  for (let i = from + 1; i < to; i += 1) if (samples[i - 1] < 0 && samples[i] >= 0) crossings += 1;
  return crossings / ((to - from) / rate);
};

/* A drum loop at 96: kick on every beat, hat between, eight bars. */
const beatAt = (bpm: number, bars: number): Float32Array => {
  const beat = 60 / bpm;
  const out = new Float32Array(Math.round(bars * 4 * beat * rate) + rate);
  const kick = hit('kick', rate);
  const hat = hit('hat', rate);
  for (let b = 0; b < bars * 4; b += 1) {
    const at = Math.round(b * beat * rate);
    kick.forEach((v, i) => { out[at + i] += v; });
    const off = Math.round((b + 0.5) * beat * rate);
    hat.forEach((v, i) => { out[off + i] += v * 0.6; });
  }
  return out;
};

for (const bpm of [96, 124, 140]) {
  const read = tempoOf([beatAt(bpm, 8)], rate);
  ok(`a beat at ${bpm} reads as ${bpm}`, read !== null && Math.abs(read - bpm) <= 1, String(read));
}
ok('  and a held note has no tempo to read', tempoOf([tone(220, 6)], rate) === null);

/* A minor: A, C and E, with A in the bass, for four seconds. */
const chord = (notes: readonly number[], seconds: number): Float32Array => {
  const out = new Float32Array(Math.round(seconds * rate));
  for (const midi of notes) {
    const hz = 440 * 2 ** ((midi - 69) / 12);
    for (let i = 0; i < out.length; i += 1) out[i] += 0.2 * Math.sin((2 * Math.PI * hz * i) / rate);
  }
  return out;
};
const aMinor = keyOfClip([chord([45, 57, 60, 64, 69], 4)], rate);
ok('a chord of A minor reads as A minor', aMinor !== null && sayKey(aMinor) === 'Am', aMinor ? sayKey(aMinor) : 'null');
const gMajor = keyOfClip([chord([43, 55, 59, 62, 67], 4)], rate);
ok('  and G major as G', gMajor !== null && sayKey(gMajor) === 'G', gMajor ? sayKey(gMajor) : 'null');

ok('the session key is read however it is written', ['C', 'F#m', 'Bb minor', 'Eb major', 'a'].map((one) => keyOfName(one)).map((k) => (k ? sayKey(k) : '?')).join() === 'C,F#m,Bbm,Eb,A');
ok('A to C is three up; a minor clip goes to the relative minor of a major song', semitonesBetween({ root: 9, minor: false }, { root: 0, minor: false }) === 3 && semitonesBetween({ root: 9, minor: true }, { root: 0, minor: false }) === 0);
ok('  and the move is never more than a tritone either way', Array.from({ length: 12 }, (_, r) => semitonesBetween({ root: r, minor: false }, { root: 0, minor: false })).every((s) => Math.abs(s) <= 6));
ok('a loop at 96 in a song at 120 plays 1.25 times as fast', Math.abs(speedToFit(96, 120) - 1.25) < 1e-9);
ok('  and a loop at 64 in a song at 128 is half-time, left at its speed', Math.abs(speedToFit(64, 128) - 1) < 1e-9);

const a4 = tone(440, 2);
const [up] = timeAndPitch([a4], rate, 1, 3);
ok('a tone moved up three semitones is a C', Math.abs(hzOf(up) - 523.25) < 6, hzOf(up).toFixed(1));
ok('  and as long as it was', up.length === a4.length, `${up.length} vs ${a4.length}`);
const [down] = timeAndPitch([a4], rate, 1, -12);
ok('  and an octave down is half the pitch, as long as it was', Math.abs(hzOf(down) - 220) < 4 && down.length === a4.length, hzOf(down).toFixed(1));
const [fast] = timeAndPitch([a4], rate, 1.25, 0);
ok('a clip made 1.25 times as fast is four-fifths as long', Math.abs(fast.length - a4.length / 1.25) <= 1);
ok('  and keeps its pitch', Math.abs(hzOf(fast) - 440) < 6, hzOf(fast).toFixed(1));
const [slow] = timeAndPitch([a4], rate, 0.8, 0);
ok('  and one made slower is longer and keeps its pitch too', Math.abs(slow.length - a4.length / 0.8) <= 1 && Math.abs(hzOf(slow) - 440) < 6, hzOf(slow).toFixed(1));
const quiet = slow.slice(rate * 0.2, slow.length - rate * 0.2).reduce((m, v) => Math.max(m, Math.abs(v)), 0);
ok('  without the joins pulling it louder or quieter', quiet > 0.45 && quiet < 0.56, quiet.toFixed(3));
const [left, right] = timeAndPitch([a4, Float32Array.from(a4, (v) => v * 0.5)], rate, 1.1, 2);
ok('both sides of a stereo clip move together', left.length === right.length && left.every((v, i) => Math.abs(v * 0.5 - right[i]) < 1e-6));
ok('one press goes no further than half or double speed', timeAndPitch([a4], rate, 10, 0)[0].length === Math.round(a4.length / FASTEST_SPEED) && timeAndPitch([a4], rate, 0.01, 0)[0].length === Math.round(a4.length / SLOWEST_SPEED));

const booth = withoutComments(readFileSync('app/components/ProBooth.tsx', 'utf8'));
ok('the booth bakes it into the clip as one undoable step', /timeAndPitch\(/.test(booth) && /remember\(t\('undo\.timepitch'|commit\(t\('undo\.timepitch'/.test(booth));
ok('  and lets go of the notes or beat a lane was drawn from, which no longer match its sound', /notes: undefined,\s*beat: undefined/.test(booth));
ok('  and moves the fades and marks, which are in the clip\'s own seconds, with it', /fadeIn: lane\.fadeIn !== undefined \? lane\.fadeIn \/ fast/.test(booth) && /marks: lane\.marks\?\.map\(\(one\) => \(one - start\) \/ fast\)/.test(booth));
const card = withoutComments(readFileSync('app/components/TimePitch.tsx', 'utf8'));
ok('  and the press says it takes no credits', /data-timepitchapply[\s\S]{0,600}script\.noCredits/.test(card));
ok('the fit presses set the controls and leave the change to the one press', /data-timepitchfit[\s\S]{0,120}setSpeed\(/.test(card) && /data-timepitchkey[\s\S]{0,160}setShift\(semitonesBetween/.test(card));

if (bad) {
  console.error(`\ncheck:timepitch — ${bad} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:timepitch — a clip is read for its tempo and key, and moved in time and pitch without the other changing.');
