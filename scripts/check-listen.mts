/**
 * Does the app actually hear what it says it hears?
 *
 * The style-from-a-song feature is only worth having if the numbers under it
 * are real. So the signals below are built on purpose, with the answer known
 * before the measurement is taken: a click track at a stated tempo, a chord in
 * a stated key, a bright signal and a dark one.
 *
 * This is the whole reason `lib/listen.ts` takes a Float32Array and a sample
 * rate rather than reaching for a browser's analyser: a measurement that can
 * only be taken in a browser, on a real song, is a measurement nobody can
 * check.
 */
import { tempoOf, chromaOf, keyOf, measure, wordsFor } from '../app/lib/listen';

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const RATE = 44100;

/** A click at a given tempo: a short decaying burst on every beat. */
function clicks(bpm: number, seconds: number): Float32Array {
  const out = new Float32Array(RATE * seconds);
  const step = Math.round((60 / bpm) * RATE);
  for (let at = 0; at < out.length; at += step) {
    for (let i = 0; i < 2000 && at + i < out.length; i += 1) {
      out[at + i] += Math.sin((2 * Math.PI * 180 * i) / RATE) * Math.exp(-i / 900);
    }
  }
  return out;
}

/** A chord held for a while: the given notes, as sine tones with harmonics. */
function chord(hz: readonly number[], seconds: number): Float32Array {
  const out = new Float32Array(RATE * seconds);
  for (let i = 0; i < out.length; i += 1) {
    let value = 0;
    for (const one of hz) {
      value += Math.sin((2 * Math.PI * one * i) / RATE);
      value += 0.4 * Math.sin((2 * Math.PI * one * 2 * i) / RATE);
    }
    out[i] = (value / (hz.length * 1.4)) * 0.7;
  }
  return out;
}

/* ── Tempo ────────────────────────────────────────────────────────────── */
for (const bpm of [90, 112, 128, 140]) {
  const heard = tempoOf(clicks(bpm, 12), RATE);
  check(`a ${bpm} BPM click is heard as ${bpm}`, Math.abs(heard - bpm) <= 2, `${heard} BPM`);
}

/* ── Key ──────────────────────────────────────────────────────────────── */
/* A minor: A, C, E. C major: C, E, G. Both held long enough for the chroma to
   settle, and both answered from the twelve notes alone. */
const aMinor = keyOf(chromaOf(chord([220, 261.63, 329.63], 8), RATE));
check('an A minor chord is heard as A minor', aMinor === 'A minor', aMinor || '(nothing)');
const cMajor = keyOf(chromaOf(chord([261.63, 329.63, 392.0], 8), RATE));
check('a C major chord is heard as C major', cMajor === 'C major', cMajor || '(nothing)');

/* ── Brightness ───────────────────────────────────────────────────────── */
const dark = measure(chord([80, 120, 160], 6), RATE);
const bright = measure(chord([2000, 3000, 4000], 6), RATE);
check('low tones read as dark', dark.brightness < 0.2, dark.brightness.toFixed(3));
check('high tones read as bright', bright.brightness > 0.5, bright.brightness.toFixed(3));
/* Not a half of it: the chord is 80, 120 and 160 hertz and every one of them
   carries a harmonic an octave up, so most of the energy in a "low" chord is
   above the line by construction. What matters is the gap between the two,
   and 0.40 against 0.00 is the gap. */
check('and the low ones carry the weight',
  dark.weight > 0.3 && bright.weight < 0.05,
  `${dark.weight.toFixed(2)} against ${bright.weight.toFixed(2)}`);

/* ── The words ────────────────────────────────────────────────────────── */
const words = wordsFor(measure(clicks(128, 12), RATE));
check('the description leads with the tempo', /^\d+ BPM$/.test(words[0]), words.join(', '));
check('and is short enough to be a direction, not an essay',
  words.length <= 6, `${words.length} words: ${words.join(', ')}`);

/* Silence says nothing rather than inventing something. */
const nothing = measure(new Float32Array(RATE * 5), RATE);
check('silence is not given a tempo', nothing.bpm === 0, String(nothing.bpm));
check('nor a key', nothing.key === '', nothing.key || '(nothing)');

if (failures) {
  console.error(`\ncheck:listen — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:listen — what it says it heard is what was there.');
