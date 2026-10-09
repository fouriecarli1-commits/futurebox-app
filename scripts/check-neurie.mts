/**
 * A hum becomes the rhythm that was hummed, and then an instrument.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026, about something Suno had launched: *"Wat oulik is
 * is dat mens die ritme van 'n liedjie met jou stem kan sing en in sit, en
 * dan kies jy net die instrument tipe."*
 *
 * ── Why this is driven and could not be anything else ────────────────────
 *
 * Every way this fails is a wrong number rather than an error. A note a
 * fourth away from where it was sung, an onset forty milliseconds late, a
 * held note that comes out short, four taps that come back as one — none of
 * them throws, none of them fails a build, and all of them sound like the
 * feature simply not being very good. There is nothing to read in the code
 * that distinguishes a working version from a broken one.
 *
 * So the hum is synthesised here, at frequencies and times this file
 * chooses, and what comes back is compared against what went in.
 *
 * ── The assertion the whole feature rests on ─────────────────────────────
 *
 * Four taps on ONE pitch. A pitch track reads that as a single held note —
 * the pitch never changes — so a version of this built on pitch alone
 * returns one note and loses the rhythm, which is the only thing she asked
 * for. It would look perfectly correct on a tune where the notes differ.
 * That case is first below for that reason.
 *
 * ── And why the synth is arithmetic ──────────────────────────────────────
 *
 * Because an `OfflineAudioContext` exists only in a browser, so a synth
 * built on one can be read and never driven. `renderHum` fills a
 * `Float32Array`, the same way `renderSketch` in `lib/audio.ts` does, and
 * the samples it fills are checked here for the things that are wrong with
 * a bad synth: silence, clipping, NaN, and a bass that is not actually an
 * octave down.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { MIN_NOTE_S, notesIn, snapTo } from '../app/lib/humnotes.ts';
import { RATE, VOICES, renderHum, voiceById } from '../app/lib/huminstrument.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nA hum becomes the rhythm that was hummed, and then an instrument\n');

/** A hum: notes at (start, length, hertz), shaped so they are notes not clicks. */
function hum(parts: readonly (readonly [number, number, number])[], total: number): Float32Array {
  const out = new Float32Array(Math.round(total * RATE));
  for (const [at, len, hz] of parts) {
    const from = Math.round(at * RATE);
    const n = Math.round(len * RATE);
    for (let i = 0; i < n && from + i < out.length; i += 1) {
      const t = i / RATE;
      const env = Math.min(1, t / 0.02) * Math.min(1, (len - t) / 0.03);
      out[from + i] = 0.3 * env * (
        Math.sin(2 * Math.PI * hz * t)
        + 0.4 * Math.sin(4 * Math.PI * hz * t)
        + 0.2 * Math.sin(6 * Math.PI * hz * t)
      );
    }
  }
  return out;
}

const A3 = 220;
const C4 = 261.63;
const E4 = 329.63;

/* ── 1. The rhythm, on one pitch ─────────────────────────────────────── */

const taps = hum([[0.2, 0.25, A3], [0.7, 0.25, A3], [1.2, 0.25, A3], [1.7, 0.25, A3]], 2.3);
const tapped = notesIn(taps, RATE);

ok('four taps on one pitch are four notes',
  tapped.length === 4,
  `${tapped.length} — a pitch track reads this as ONE held note, because the`
  + ' pitch never changes. Anything but four here means the rhythm is being'
  + ' found in the pitch rather than in the energy, which is the whole'
  + ' feature missing while looking correct on a tune');

ok('  and they land where they were hummed',
  tapped.length === 4
  && [0.2, 0.7, 1.2, 1.7].every((at, i) => Math.abs(tapped[i].from - at) < 0.06),
  `starts at ${tapped.map((one) => one.from.toFixed(2)).join(', ')} against`
  + ' 0.20, 0.70, 1.20, 1.70 — more than sixty milliseconds out is audible as'
  + ' a part that does not sit with the take it came from');

ok('  and all four are the pitch that was hummed',
  tapped.every((one) => one.midi === 57),
  `${tapped.map((one) => one.midi).join(', ')} against 57 (A3) — a note a`
  + ' semitone or more out is a bass line in the wrong key');

/* ── 2. A tune, and a held note ──────────────────────────────────────── */

const tune = hum([[0.2, 0.3, A3], [0.7, 0.3, C4], [1.2, 0.3, E4], [1.7, 0.5, A3]], 2.5);
const played = notesIn(tune, RATE);

ok('a four-note tune comes back as its four notes',
  played.length === 4,
  `${played.length} notes`);

ok('  in the pitches they were hummed in',
  played.length === 4 && [57, 60, 64, 57].every((midi, i) => played[i].midi === midi),
  `${played.map((one) => one.midi).join(', ')} against 57, 60, 64, 57`);

ok('  and the held note is held',
  played.length === 4
  && played[3].to - played[3].from > (played[0].to - played[0].from) * 1.4,
  `the last note is ${(played[3]?.to - played[3]?.from).toFixed(2)}s against a`
  + ` first of ${(played[0]?.to - played[0]?.from).toFixed(2)}s — it was hummed`
  + ' two thirds longer, and a part that flattens every length to the same'
  + ' one is a part with no phrasing in it');

/* ── 3. The things that are not notes ────────────────────────────────── */

ok('silence is no notes at all',
  notesIn(new Float32Array(RATE * 2), RATE).length === 0,
  'a note is found in silence, which means a take recorded with the mic off'
  + ' produces a part');

const hiss = new Float32Array(RATE);
for (let i = 0; i < hiss.length; i += 1) hiss[i] = (Math.sin(i * 12.9898) % 1) * 0.002;
ok('  and so is room tone',
  notesIn(hiss, RATE).length === 0,
  `${notesIn(hiss, RATE).length} notes out of near-silence — the floor under`
  + ' the onset detector is too low, so a quiet room becomes a drum part');

ok('  and every note is at least as long as the floor',
  played.every((one) => one.to - one.from >= MIN_NOTE_S - 1e-9),
  'a note shorter than the floor survived, and a zero-length note is one the'
  + ' instrument plays as a click');

/* ── 4. The grid ─────────────────────────────────────────────────────── */

const snapped = snapTo(played, 120);
const sixteenth = 60 / 120 / 4;
ok('snapping puts every note on a sixteenth',
  snapped.every((one) => Math.abs(one.from / sixteenth - Math.round(one.from / sixteenth)) < 1e-6),
  'a note is off the grid after snapping, so the part does not sit with the'
  + ' click it was recorded against');

ok('  and never snaps a note out of existence',
  snapped.every((one) => one.to - one.from >= sixteenth - 1e-9),
  'a note came back zero long — which is a note silently deleted, and the'
  + ' one outcome of snapping nobody would look for');

ok('  and leaves the pitches alone',
  snapped.map((one) => one.midi).join() === played.map((one) => one.midi).join(),
  'snapping changed a pitch, and it is about time');

/* ── 5. The instruments ──────────────────────────────────────────────── */

const sounding = (out: Float32Array): number => {
  let n = 0;
  for (let i = 0; i < out.length; i += 1) if (Math.abs(out[i]) > 0.02) n += 1;
  return n / RATE;
};

for (const voice of VOICES) {
  const out = renderHum(played, voice, 2.5);
  const clean = out.every((one) => Number.isFinite(one) && Math.abs(one) <= 1);
  ok(`${voice.id} makes a sound`,
    sounding(out) > 0.2 && clean,
    `${sounding(out).toFixed(2)}s above the floor, ${clean ? 'finite' : 'with a NaN or a sample past 1'}`
    + ' — a voice that renders nothing is a button that does nothing, and a'
    + ' sample past one is the buzz a hard clip makes');

  /* The same hum twice has to give the same bytes. The kit uses a hash
     rather than `Math.random` for exactly this: a synth that answers
     differently each run is one no check can hold. */
  const again = renderHum(played, voice, 2.5);
  ok(`  and ${voice.id} gives the same part twice`,
    out.every((one, i) => one === again[i]),
    'two renders of one hum differ, so nothing about this voice can be'
    + ' asserted and a part cannot be reproduced');
}

/* The bass is an octave down, measured rather than read off its `shift`.
   Zero crossings are a coarse pitch reading and coarse is all this needs:
   half is unmistakable. */
const crossings = (out: Float32Array): number => {
  let n = 0;
  for (let i = 1; i < out.length; i += 1) if ((out[i - 1] < 0) !== (out[i] < 0)) n += 1;
  return n;
};
const low = crossings(renderHum(played, voiceById('bass')!, 2.5));
const mid = crossings(renderHum(played, voiceById('keys')!, 2.5));
/* And the part follows the desk's rate. A part rendered at 44,100 and
   dropped into a session running at 48,000 plays flat, which sounds like the
   pitch detection failing rather than like a resampling bug — so it would be
   looked for in the wrong file. */
const at48 = renderHum(played, voiceById('keys')!, 2.5, 48_000);
ok('a part is rendered at the rate it is asked for',
  Math.abs(at48.length / 48_000 - renderHum(played, voiceById('keys')!, 2.5).length / RATE) < 0.001,
  `${(at48.length / 48_000).toFixed(3)}s at 48k against`
  + ` ${(renderHum(played, voiceById('keys')!, 2.5).length / RATE).toFixed(3)}s at 44.1k`
  + ' — the same part has to be the same LENGTH at either rate, and a part'
  + ' that is not is one playing at the wrong speed');

ok('the bass really is an octave below the keys',
  low < mid * 0.75,
  `${low} crossings against ${mid} — a voice humming a bass part sits an`
  + ' octave above where a bass plays it, and without the transpose the'
  + ' "bass" is the same note as the piano');


/* ── 6. And the room actually calls it ───────────────────────────────── */

/* Everything above drives two libraries. Without this, all of it could be
   green while the booth has a button that does nothing — which is the shape
   of a check measuring something adjacent, and one this session has already
   shipped once today and caught. */
const booth = withoutComments(readFileSync('app/components/ProBooth.tsx', 'utf8'));

ok('the booth turns a lane into a part with these',
  /notesIn\s*\(/.test(booth) && /renderHum\s*\(/.test(booth),
  `${[!/notesIn\s*\(/.test(booth) && 'notesIn', !/renderHum\s*\(/.test(booth) && 'renderHum']
    .filter(Boolean).join(' and ')} not called — the libraries work and nothing`
  + ' uses them');

ok('  and renders at the lane\'s own rate, not the library default',
  /renderHum\([\s\S]{0,200}?sampleRate/.test(booth),
  'the part is rendered at the default rate and dropped into a session that'
  + ' may be running at another, which plays it flat and sounds like the'
  + ' pitch detection failing');

ok('  and offers the snap she asked about, switchable',
  /data-humsnap/.test(booth) && /snapTo\s*\(/.test(booth),
  'a hummed rhythm is never quite in time, so snapping is the default — and'
  + ' a part that swings on purpose is the case where it is wrong, so it has'
  + ' to be switchable');

ok('  and spends nothing to do it',
  !/charge\s*\([^)]*hum/i.test(booth),
  'the hum path charges — it runs entirely on the device, and a charge for'
  + ' arithmetic done on a phone is a charge for nothing');

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);
