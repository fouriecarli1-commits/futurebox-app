/**
 * check:tuner — the voice tuner really moves a voice onto the note.
 *
 * The owner, 20 October 2026: *"Ek sien die woorde sê, die gate, vocoder ens.
 * Is nog nie gebou nie. Kan ons werk maak daarvan."* The tuner is pure
 * (`app/lib/tuner.ts`), so it is held here on a made voice: a buzz with
 * overtones, like a sung vowel, sung a little sharp.
 */
import { pitchOf, targetOf, trackPitch, trackPitchSoftly, tune, midiOf, type TuneHow } from '../app/lib/tuner.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

const RATE = 44100;
/** A sung vowel: a fundamental and four overtones, with a gentle vibrato-free hold. */
function voice(hz: number, seconds: number): Float32Array {
  const out = new Float32Array(Math.round(RATE * seconds));
  for (let i = 0; i < out.length; i += 1) {
    const t = i / RATE;
    let sample = 0;
    for (let k = 1; k <= 5; k += 1) sample += Math.sin(2 * Math.PI * hz * k * t) / k;
    out[i] = sample * 0.25;
  }
  return out;
}

const CHROMATIC: TuneHow = { root: 0, scale: 'chromatic', strength: 1 };

ok('a pitch a little sharp of A is pulled to A', Math.abs(targetOf(midiOf(452), CHROMATIC) - 69) < 1e-9);
ok('  and halfway at half strength', Math.abs(targetOf(midiOf(452), { ...CHROMATIC, strength: 0.5 }) - (69 + (midiOf(452) - 69) / 2)) < 1e-9);
ok('in C major, C♯ is not a note, so it goes to C or D',
  [60, 62].includes(Math.round(targetOf(61.2, { root: 0, scale: 'major', strength: 1 }))));
ok('in A minor, G is a note and G♯ is not', targetOf(67, { root: 9, scale: 'minor', strength: 1 }) === 67
  && targetOf(68.1, { root: 9, scale: 'minor', strength: 1 }) !== 68);

const sharp = voice(452, 1.5);
const heard = pitchOf([sharp], RATE);
ok('the made voice is heard at the pitch it was made at', Math.abs(heard - 452) < 3, `${heard.toFixed(1)} Hz`);

const tuned = tune([sharp], RATE, CHROMATIC);
const after = pitchOf(tuned, RATE);
ok('tuned, it sings A', Math.abs(after - 440) < 3, `${after.toFixed(1)} Hz`);
ok('  and is as long as it was', tuned[0].length === sharp.length);
ok('  and nothing in it is broken', tuned[0].every((one) => Number.isFinite(one)));
const peak = (data: Float32Array): number => data.reduce((most, one) => Math.max(most, Math.abs(one)), 0);
ok('  and it is about as loud as it was', Math.abs(peak(tuned[0]) / peak(sharp) - 1) < 0.35,
  `${(peak(tuned[0]) / peak(sharp)).toFixed(2)}×`);

const already = voice(440, 1.2);
const left = pitchOf(tune([already], RATE, CHROMATIC), RATE);
ok('a voice already on the note stays on it', Math.abs(left - 440) < 3, `${left.toFixed(1)} Hz`);

const untouched = pitchOf(tune([sharp], RATE, { ...CHROMATIC, strength: 0 }), RATE);
ok('at no strength it is left alone', Math.abs(untouched - 452) < 3, `${untouched.toFixed(1)} Hz`);

const stereo = tune([sharp, sharp], RATE, CHROMATIC);
ok('both sides of a stereo lane come back', stereo.length === 2 && stereo[1].length === sharp.length);

const softly = await trackPitchSoftly([sharp], RATE);
const firmly = trackPitch([sharp], RATE);
ok('heard a slice at a time, it hears the same as all at once',
  softly.hz.length === firmly.hz.length && softly.hz.every((one, i) => one === firmly.hz[i]));
ok('  and tunes the same from it', pitchOf(tune([sharp], RATE, CHROMATIC, softly), RATE) === after);

const silence = tune([new Float32Array(RATE)], RATE, CHROMATIC);
ok('silence comes back silent', peak(silence[0]) === 0);

if (bad) {
  console.error(`\ncheck:tuner — ${bad} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:tuner — a sung note a little off is pulled onto the note of the key, the line keeps its length and level, and a note already on is left alone.');
