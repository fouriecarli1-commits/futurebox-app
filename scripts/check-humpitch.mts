/**
 * A hum is heard the way a person hums it, not the way a test tone sounds.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * The owner, 22 October 2026: *"Gaan die Hum funksie na, as daardie baie fyn,
 * genuanseerd, en baie baie goed verfyn word met AI dan kan dit ons selling
 * point word op hierdie produk."*
 *
 * `check:neurie` proves the rhythm survives and the instruments sound. This
 * one is about the melody, and about the eleven things a real voice does that
 * a sine wave does not: it hums legato with no gap between notes, it scoops
 * into a note and falls off the end of one, it wavers in a vibrato a semitone
 * wide, it slides from one note to the next, it breathes between phrases, it
 * hums the whole tune a third of a semitone sharp and drifts flatter as it
 * goes, it accents some notes and not others, and it hums an "mmm" so pure
 * that the octave is the hardest thing to hear.
 *
 * ── Why everything here is synthesised ───────────────────────────────────
 *
 * Every one of those faults is a wrong number rather than an error: a note a
 * semitone out, a vibrato read as a trill, a breath played as a note. None of
 * them throws. So each hum is written here, sample by sample, at pitches and
 * times this file chooses, and what comes back is compared against what was
 * written.
 */

import { heardIn, inKey, keyOf, notesIn, snapTo, type HumNote } from '../app/lib/humnotes.ts';
import { trackHum } from '../app/lib/humpitch.ts';
import { renderHum, voiceById } from '../app/lib/huminstrument.ts';

const RATE = 44_100;
let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nA hum is heard the way a person hums it\n');

const hzOf = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

/** A deterministic noise, so a failure here is the same failure next run. */
let seed = 7;
const noise = (): number => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff * 2 - 1;
};

interface Part {
  /** Seconds. */
  readonly at: number;
  readonly len: number;
  /** The pitch, as fractional MIDI, at a time inside the part. */
  readonly midi: (t: number) => number;
  readonly amp?: number;
  /** Harmonic amplitudes from the fundamental up. A hum is mostly the first. */
  readonly partials?: readonly number[];
  /** Fade in and out, seconds. */
  readonly edge?: number;
}

/**
 * A voice, written one sample at a time with its phase carried, so a pitch
 * that moves moves smoothly — which is what a voice does and what a sum of
 * fixed sines cannot.
 */
function voice(parts: readonly Part[], total: number, hiss = 0): Float32Array {
  const out = new Float32Array(Math.round(total * RATE));
  for (const part of parts) {
    const from = Math.round(part.at * RATE);
    const n = Math.round(part.len * RATE);
    const partials = part.partials ?? [1, 0.3, 0.12, 0.05];
    const edge = part.edge ?? 0.02;
    let phase = 0;
    for (let i = 0; i < n && from + i < out.length; i += 1) {
      const t = i / RATE;
      phase += (2 * Math.PI * hzOf(part.midi(t))) / RATE;
      const env = Math.min(1, t / edge, (part.len - t) / edge);
      let v = 0;
      partials.forEach((a, k) => { v += a * Math.sin(phase * (k + 1)); });
      out[from + i] += (part.amp ?? 0.3) * Math.max(0, env) * v;
    }
  }
  if (hiss > 0) for (let i = 0; i < out.length; i += 1) out[i] += hiss * noise();
  return out;
}

const steady = (midi: number) => (): number => midi;
const pitches = (notes: readonly HumNote[]): string => notes.map((one) => one.midi ?? '·').join(' ');

/* ── 1. Every octave a person hums in ─────────────────────────────────── */

for (const midi of [40, 45, 52, 57, 64, 69, 76, 81]) {
  const got = notesIn(voice([{ at: 0.2, len: 0.6, midi: steady(midi) }], 1.1), RATE);
  ok(`a held ${midi} is read as ${midi}`,
    got.length === 1 && got[0].midi === midi,
    `${pitches(got)} — ${got.length === 1 ? 'the wrong note' : 'the wrong number of notes'}`);
}

/* ── 2. The octave, where the fundamental is the weak part ────────────── */

const thin = notesIn(voice([{ at: 0.2, len: 0.8, midi: steady(50), partials: [0.35, 1, 0.6, 0.3] }], 1.2), RATE);
ok('a nasal hum with a weak fundamental stays in its own octave',
  thin.length === 1 && thin[0].midi === 50,
  `${pitches(thin)} against 50 — a second harmonic louder than the fundamental is`
  + ' the classic way a tracker reads a note an octave up');

const pure = notesIn(voice([{ at: 0.2, len: 0.8, midi: steady(55), partials: [1] }], 1.2), RATE);
ok('  and a pure "mmm" with no harmonics at all is not read an octave down',
  pure.length === 1 && pure[0].midi === 55,
  `${pitches(pure)} against 55`);

const frames = trackHum(voice([{ at: 0.1, len: 1.6, midi: steady(48), partials: [0.4, 1, 0.5] }], 1.9), RATE);
let octaveSlips = 0;
let voiced = 0;
for (let i = 0; i < frames.midi.length; i += 1) {
  if (!Number.isFinite(frames.midi[i])) continue;
  voiced += 1;
  if (Math.abs(frames.midi[i] - 48) > 6) octaveSlips += 1;
}
ok('  and not one frame of a held note jumps an octave',
  voiced > 100 && octaveSlips === 0,
  `${octaveSlips} of ${voiced} frames an octave out — one frame is one wrong note`
  + ' once the frames are grouped');

/* ── 3. Legato: four notes, no gap, no dip ─────────────────────────────── */

const legatoPitches = [57, 60, 64, 62];
const legato = voice([{
  at: 0.2,
  len: 1.6,
  midi: (t) => {
    const which = Math.min(3, Math.floor(t / 0.4));
    const into = t - which * 0.4;
    /* A forty-millisecond slide from the note before, as a voice does. */
    if (which > 0 && into < 0.04) {
      const was = legatoPitches[which - 1];
      return was + (legatoPitches[which] - was) * (into / 0.04);
    }
    return legatoPitches[which];
  },
}], 2.1);
const legatoGot = notesIn(legato, RATE);
ok('four notes hummed legato, with no gap and no dip, are four notes',
  legatoGot.length === 4,
  `${legatoGot.length} (${pitches(legatoGot)}) — found by loudness alone this is ONE`
  + ' note, which is how most people hum a tune');
ok('  in their own pitches',
  legatoGot.map((one) => one.midi).join() === legatoPitches.join(),
  `${pitches(legatoGot)} against ${legatoPitches.join(' ')}`);
ok('  and changing where the voice changed',
  legatoGot.length === 4
  && [0.6, 1.0, 1.4].every((at, i) => Math.abs(legatoGot[i + 1].from - at) < 0.05),
  `changes at ${legatoGot.slice(1).map((one) => one.from.toFixed(2)).join(', ')} against 0.60, 1.00, 1.40`);

/* ── 4. Vibrato is one note ────────────────────────────────────────────── */

for (const [depth, rate] of [[0.8, 5.5], [1.0, 4.6], [0.5, 6.5]] as const) {
  const got = notesIn(voice([{
    at: 0.2, len: 1.6, midi: (t) => 60 + depth * Math.sin(2 * Math.PI * rate * t) * Math.min(1, t / 0.3),
  }], 2.1), RATE);
  ok(`a held C with a ±${depth * 100}-cent vibrato at ${rate} Hz is one C`,
    got.length === 1 && got[0].midi === 60,
    `${got.length} notes (${pitches(got)}) — a vibrato read as notes is a trill`
    + ' nobody sang');
}

/* ── 5. Scoops, falls and slides ──────────────────────────────────────── */

const scoop = notesIn(voice([{
  at: 0.2, len: 0.9, midi: (t) => (t < 0.12 ? 62 + 2 * (t / 0.12) : 64),
}], 1.3), RATE);
ok('a scoop up into an E is one E',
  scoop.length === 1 && scoop[0].midi === 64,
  `${pitches(scoop)} — the slide into a note is how it is sung, not a note of its own`);

const fall = notesIn(voice([{
  at: 0.2, len: 1.0, midi: (t) => (t < 0.85 ? 67 : 67 - 3 * ((t - 0.85) / 0.15)),
}], 1.4), RATE);
ok('  and a fall off the end of a G is one G',
  fall.length === 1 && fall[0].midi === 67,
  `${pitches(fall)} — the voice dropping as the breath runs out is not a second note`);

const slide = notesIn(voice([{
  at: 0.2, len: 1.4, midi: (t) => (t < 0.5 ? 57 : t < 0.8 ? 57 + 5 * ((t - 0.5) / 0.3) : 62),
}], 1.8), RATE);
ok('  and a slow slide from A to D, held there, is an A and a D',
  slide.map((one) => one.midi).join() === '57,62',
  `${pitches(slide)} against 57 62`);

/* ── 6. Breath and silence ────────────────────────────────────────────── */

const breathy = voice([
  { at: 0.2, len: 0.4, midi: steady(60) },
  { at: 1.1, len: 0.4, midi: steady(64) },
], 1.8);
/* A breath: a third of a second of soft noise, the way an in-breath sounds
   on a phone held close. */
for (let i = Math.round(0.7 * RATE); i < Math.round(1.0 * RATE); i += 1) {
  const t = (i / RATE - 0.7) / 0.3;
  breathy[i] += 0.05 * Math.sin(Math.PI * t) * noise();
}
const breathGot = heardIn(breathy, RATE).notes;
ok('a breath between two notes is not a pitched note',
  breathGot.filter((one) => one.midi !== null).map((one) => one.midi).join() === '60,64',
  `${pitches(breathGot)} — a breath read as a pitch is a wrong note in every instrument`);
/* And if the reader ever does keep one — a lip smack is loud enough — it is
   still not played by a pitched instrument in a take that was sung. */
const withSmack: HumNote[] = [
  { midi: 60, from: 0.2, to: 0.6, loud: 1 },
  { midi: null, from: 0.75, to: 0.85, loud: 0.6 },
  { midi: 64, from: 1.1, to: 1.5, loud: 1 },
];
const violinOnBreath = renderHum(withSmack, voiceById('violin')!, 1.8);
const onlyNotes = renderHum(withSmack.filter((one) => one.midi !== null), voiceById('violin')!, 1.8);
ok('  and a pitched instrument does not play the breath as a note',
  violinOnBreath.every((one, i) => one === onlyNotes[i]),
  'an unpitched sound in a hummed tune is played as a middle C on the violin');

ok('silence is no notes', notesIn(new Float32Array(RATE * 2), RATE).length === 0);
const room = new Float32Array(RATE * 2);
for (let i = 0; i < room.length; i += 1) room[i] = 0.002 * noise();
ok('  and nor is a quiet room', notesIn(room, RATE).length === 0);

/* ── 7. Nobody hums at A = 440 ────────────────────────────────────────── */

const tune = [57, 59, 60, 62, 64, 62, 60, 59, 57];
const sharpBy = [0.46, 0.41, 0.52, 0.44, 0.49, 0.43, 0.53, 0.47, 0.45];
const sharp = notesIn(voice(tune.map((midi, i) => ({
  at: 0.2 + i * 0.4, len: 0.3, midi: steady(midi + sharpBy[i]),
})), 4), RATE);
ok('a tune hummed half a semitone sharp throughout comes back as the tune',
  sharp.map((one) => one.midi).join() === tune.join(),
  `${pitches(sharp)} against ${tune.join(' ')} — rounded one at a time, the notes`
  + ' a little sharper than the rest round up and the tune has wrong notes in it');

const drift = notesIn(voice(tune.map((midi, i) => ({
  at: 0.2 + i * 0.4, len: 0.3, midi: steady(midi - 0.08 * i),
})), 4), RATE);
ok('  and a tune that drifts flat as it goes, by most of a semitone',
  drift.map((one) => one.midi).join() === tune.join(),
  `${pitches(drift)} against ${tune.join(' ')}`);

const inTune = notesIn(voice(tune.map((midi, i) => ({ at: 0.2 + i * 0.4, len: 0.3, midi: steady(midi) })), 4), RATE);
ok('  and a tune hummed in tune is left alone',
  inTune.map((one) => one.midi).join() === tune.join(),
  `${pitches(inTune)}`);

/* ── 8. Timing, and how hard ──────────────────────────────────────────── */

ok('every note of the tune starts within thirty milliseconds of where it was hummed',
  inTune.length === tune.length && inTune.every((one, i) => Math.abs(one.from - (0.2 + i * 0.4)) < 0.03),
  inTune.map((one) => one.from.toFixed(3)).join(', '));
ok('  and lasts about as long',
  inTune.length === tune.length && inTune.every((one) => Math.abs((one.to - one.from) - 0.3) < 0.06),
  inTune.map((one) => (one.to - one.from).toFixed(2)).join(', '));

const accents = notesIn(voice([
  { at: 0.2, len: 0.3, midi: steady(60), amp: 0.12 },
  { at: 0.7, len: 0.3, midi: steady(60), amp: 0.4 },
  { at: 1.2, len: 0.3, midi: steady(60), amp: 0.12 },
], 1.7), RATE);
ok('an accented note is played harder than the ones around it',
  accents.length === 3 && accents[1].loud > accents[0].loud + 0.2 && accents[1].loud > accents[2].loud + 0.2,
  accents.map((one) => one.loud.toFixed(2)).join(', '));
const quietTake = notesIn(voice([{ at: 0.2, len: 0.4, midi: steady(60), amp: 0.03 }], 0.8), RATE);
ok('  and a hum recorded quietly is still played, not whispered',
  quietTake.length === 1 && quietTake[0].loud > 0.9,
  `${quietTake.map((one) => one.loud.toFixed(2)).join(', ')} — loudness is against the take's own loudest note`);

/* ── 9. Noise and a long take ─────────────────────────────────────────── */

const noisy = notesIn(voice(tune.map((midi, i) => ({ at: 0.2 + i * 0.4, len: 0.3, midi: steady(midi) })), 4, 0.02), RATE);
ok('a tune under room noise twenty decibels down is still the tune',
  noisy.filter((one) => one.midi !== null).map((one) => one.midi).join() === tune.join(),
  pitches(noisy));

const long = voice(Array.from({ length: 60 }, (_, i) => ({ at: i * 0.5, len: 0.4, midi: steady(55 + (i % 8)) })), 30);
const started = performance.now();
const longGot = notesIn(long, RATE);
const took = (performance.now() - started) / 1000;
ok(`thirty seconds of hum is read in ${took.toFixed(2)} s`,
  took < 6 && longGot.length === 60,
  `${longGot.length} notes — on a phone this is several times slower, and a wait`
  + ' past a few seconds is a button that seems not to work');

/* ── 10. The grid is the song's ───────────────────────────────────────── */

const offbeat: HumNote[] = [
  { midi: 60, from: 0.02, to: 0.24, loud: 1 },
  { midi: 62, from: 0.27, to: 0.49, loud: 1 },
];
/* The take starts 0.1 s into the song, at 120 to the minute: sixteenths
   are 0.125 s, so on the song's clock 0.12 and 0.37 sit nearest 0.125 and
   0.375. */
const onSong = snapTo(offbeat, 120, { offset: 0.1 });
ok('snapping lands notes on the song\'s grid, not the take\'s',
  onSong.every((one) => Math.abs(((one.from + 0.1) / 0.125) - Math.round((one.from + 0.1) / 0.125)) < 1e-6),
  onSong.map((one) => (one.from + 0.1).toFixed(3)).join(', '));
const triplets = snapTo([{ midi: 60, from: 0.16, to: 0.3, loud: 1 }], 120, { grid: '1/8T' });
ok('  and a triplet grid is in thirds of a beat',
  Math.abs(triplets[0].from - 1 / 6) < 1e-6,
  triplets[0].from.toFixed(4));
const half = snapTo([{ midi: 60, from: 0.1, to: 0.3, loud: 1 }], 120, { strength: 0.5 });
ok('  and half strength moves a note half way',
  Math.abs(half[0].from - 0.1125) < 1e-6,
  half[0].from.toFixed(4));
const crowded = snapTo([
  { midi: 60, from: 0.01, to: 0.05, loud: 1 },
  { midi: 62, from: 0.05, to: 0.12, loud: 1 },
], 120);
ok('  and two notes that would land on one line become two lines',
  crowded.length === 2 && crowded[1].from > crowded[0].from && crowded[0].to <= crowded[1].from + 1e-9,
  crowded.map((one) => `${one.from.toFixed(3)}–${one.to.toFixed(3)}`).join(', '));

/* ── 11. The key ──────────────────────────────────────────────────────── */

const minorTune: HumNote[] = [69, 72, 76, 74, 72, 71, 69, 64, 69, 72, 71, 69]
  .map((midi, i) => ({ midi, from: i * 0.4, to: i * 0.4 + (i % 4 === 0 ? 0.38 : 0.3), loud: 0.8 }));
const heardKey = keyOf(minorTune);
ok('a tune in A minor is heard in A minor',
  heardKey?.root === 9 && heardKey.minor,
  heardKey ? `${heardKey.root} ${heardKey.minor ? 'minor' : 'major'}` : 'nothing');
const majorTune: HumNote[] = [67, 71, 74, 72, 71, 69, 67, 66, 67, 74, 71, 67]
  .map((midi, i) => ({ midi, from: i * 0.4, to: i * 0.4 + 0.3, loud: 0.8 }));
const gMajor = keyOf(majorTune);
ok('  and one in G major in G major',
  gMajor?.root === 7 && !gMajor.minor,
  gMajor ? `${gMajor.root} ${gMajor.minor ? 'minor' : 'major'}` : 'nothing');
ok('  and four notes are not enough to say',
  keyOf(minorTune.slice(0, 4)) === null);

const leaning = inKey([
  { midi: 66, from: 0, to: 0.3, loud: 1, exact: 66.38 },
  { midi: 66, from: 0.4, to: 0.7, loud: 1, exact: 65.62 },
  { midi: 64, from: 0.8, to: 1.1, loud: 1, exact: 64.1 },
], 0, false);
ok('keeping to C major moves an F# the way the voice leant',
  leaning.map((one) => one.midi).join() === '67,65,64',
  `${pitches(leaning)} against 67 65 64 — sung sharp of F# is a G reached for, flat of it an F`);

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);
