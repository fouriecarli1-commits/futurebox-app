/**
 * Mono, stereo and the surround fold, with numbers put through them.
 *
 * ── Why this can be checked at all ───────────────────────────────────────
 *
 * Carli, 21 September 2026: *"Mono/stereo/dolby surround. Download type."*
 *
 * The same argument as `fitTo` and `check:photo`: a number you can only get
 * by rendering audio in a browser is a number nobody can check, and audio is
 * the worst possible place for that — a fold that is subtly wrong sounds
 * like a mix that is subtly wrong, which is indistinguishable from a mix
 * that is subtly wrong. So `lib/channels.ts` takes arrays and returns
 * arrays, and this puts signals through it whose answer is known before the
 * measurement is taken.
 *
 * ── What the first version of this file got wrong ────────────────────────
 *
 * Worth writing down, because it is the failure this whole discipline is
 * against. The first version measured the fold at FULL SCALE and asked
 * whether the difference had grown. It had not — ratio 1.0005 where the
 * maths says 1.4142 — and the obvious reading was that the phase turn was
 * not happening. It was happening perfectly. At full scale the fold reaches
 * exactly root two, so `foldTo` scaled the whole thing by one over root two
 * to keep it under the ceiling, and the two cancelled. The check had put its
 * measurement on the far side of a normaliser.
 *
 * Two real faults came out of chasing it, neither of which the check had
 * been looking for: the kernel was far too short to turn the bottom end at
 * all, and convolving with it took four seconds a song. Both are measured
 * below now, because "it sounded fine" would have carried either of them
 * for months.
 *
 * ── And the claim that is not made ───────────────────────────────────────
 *
 * Dolby Digital, Dolby Atmos and Pro Logic are licensed, trademarked
 * formats. This app does not encode one and must never say it does — the
 * same rule as `check:asdata` and the supplier page. What is built is the
 * matrix fold those decoders unfold, which is arithmetic and belongs to
 * nobody. The last rules here hold the wording to that.
 */

import { readFileSync } from 'node:fs';
import {
  FOLD_CEILING, LAYOUTS, channelsOf, convolve, foldTo, hilbertKernel, layoutById, through,
} from '../app/lib/channels';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};
const near = (a: number, b: number, by = 1e-6) => Math.abs(a - b) <= by;

const RATE = 44100;
const FRAMES = 65536;
/* Long enough to be past the kernel's reach at both ends. */
const SKIP = 8000;

/**
 * A tone that fades in and out, the way a mix does.
 *
 * The fade is not decoration. A tone that starts and stops mid-cycle is a
 * step, a phase turn rings at a step, and the ring can be loud enough to
 * pull the whole fold down through the ceiling — which is a measurement of
 * the test signal, not of the fold. Caught exactly that way: 60 Hz read 1.297
 * against a predicted 1.389 until the ends were faded, because the fold had
 * peaked at 1.0000 and been scaled. A real mix starts and ends in silence.
 */
function tone(hz: number, amp = 0.5, phase = 0, frames = FRAMES): Float32Array {
  const out = new Float32Array(frames);
  const ramp = RATE / 10;
  for (let i = 0; i < frames; i += 1) {
    const fade = Math.min(1, i / ramp) * Math.min(1, (frames - 1 - i) / ramp);
    out[i] = amp * fade * Math.sin((2 * Math.PI * hz * i) / RATE + phase);
  }
  return out;
}
/** How loud a signal is, ignoring the ends where a windowed filter is short. */
function level(signal: Float32Array, skip = SKIP): number {
  let sum = 0;
  let count = 0;
  for (let i = skip; i < signal.length - skip; i += 1) {
    sum += signal[i] * signal[i];
    count += 1;
  }
  return count ? Math.sqrt(sum / count) : 0;
}
const loudest = (signal: Float32Array): number => {
  let peak = 0;
  for (let i = 0; i < signal.length; i += 1) peak = Math.max(peak, Math.abs(signal[i]));
  return peak;
};

/* ── Mono ─────────────────────────────────────────────────────────────── */

{
  const left = tone(440, 1);
  const right = tone(440, 1);
  const [out] = foldTo('mono', left, right);
  ok('mono comes out as one channel', foldTo('mono', left, right).length === 1);
  ok('  and the same length as it went in', out.length === FRAMES, String(out.length));
  /* Halved, not summed. Two copies added together is twice as loud and
     clips — and a download that is louder than the mix is a download that
     is not the mix. */
  ok('  and the same loudness, not twice it', near(level(out, 0), level(left, 0), 1e-4),
    `${level(out, 0).toFixed(4)} against ${level(left, 0).toFixed(4)}`);

  /* The reason a mono fold is worth having at all: what was only there
     because of the width disappears, and you find out before a shop does. */
  const [collapsed] = foldTo('mono', tone(440), tone(440, 0.5, Math.PI));
  ok('  and something that is only width cancels, which is the point of it',
    level(collapsed, 0) < 1e-6, level(collapsed, 0).toExponential(2));
}

/* ── Stereo ───────────────────────────────────────────────────────────── */

{
  const left = tone(300);
  const right = tone(700);
  const out = foldTo('stereo', left, right);
  ok('stereo is two channels and touches neither', out.length === 2
    && out[0] === left && out[1] === right,
    'a "layout" that rewrites the ordinary case is a layout that can break it');
}

/* ── The Hilbert kernel itself ────────────────────────────────────────── */

{
  const kernel = hilbertKernel();
  ok('the phase turn has a true centre tap', kernel.length % 2 === 1, String(kernel.length));
  const mid = (kernel.length - 1) / 2;
  /* Every even tap is zero. This is what makes it a quarter turn rather than
     some other filter, and it is invisible in the output of one signal — the
     kind of thing that would be wrong for months. */
  let evens = 0;
  for (let i = 0; i < kernel.length; i += 1) if ((i - mid) % 2 === 0 && kernel[i] !== 0) evens += 1;
  ok('  and every even tap is zero, which is what makes it one', evens === 0, `${evens} were not`);
  /* And it is antisymmetric: the half before the centre is the half after,
     upside down. */
  let wrong = 0;
  for (let i = 0; i < mid; i += 1) if (!near(kernel[i], -kernel[kernel.length - 1 - i], 1e-9)) wrong += 1;
  ok('  and it is the same either side of the centre, upside down', wrong === 0, `${wrong} taps`);
}

/* ── The turn, frequency by frequency ─────────────────────────────────── */

/** Gain and how much of the answer is in quadrature rather than in phase. */
function turnAt(hz: number): { gain: number; inPhase: number } {
  const signal = tone(hz, 1);
  const turned = through(signal, hilbertKernel());
  const quarter = tone(hz, 1, Math.PI / 2);
  let alike = 0;
  let count = 0;
  for (let i = SKIP; i < FRAMES - SKIP; i += 1) { alike += turned[i] * signal[i]; count += 1; }
  return { gain: level(turned) / level(signal), inPhase: Math.abs((2 * alike) / count) / level(quarter) };
}

{
  /* This is the assertion the old 127-tap kernel would have failed at every
     frequency below about 900 Hz, and the comment above it claimed it passed
     down to a couple of hundred. Numbers, not adjectives. */
  const flat: [number, number][] = [];
  for (const hz of [80, 110, 220, 440, 1000, 4000, 10000]) {
    const { gain } = turnAt(hz);
    if (!near(gain, 1, 0.03)) flat.push([hz, gain]);
  }
  ok('the turn is a full quarter from eighty hertz up', flat.length === 0,
    flat.map(([hz, gain]) => `${hz}Hz ${gain.toFixed(3)}`).join(', '));

  /* And it is a TURN, not a filter that happens to have the right gain:
     what comes out has nothing left in phase with what went in. */
  let leaked = 0;
  for (const hz of [220, 440, 1000, 4000]) if (turnAt(hz).inPhase > 0.02) leaked += 1;
  ok('  and nothing of it is left in phase, which is what "a quarter" means',
    leaked === 0, `${leaked} frequencies leaked`);

  /* Below eighty it fades, and that is stated rather than hidden. The rule
     is here so that shortening the kernel to save time — which is what was
     wrong before — cannot pass unnoticed. */
  const low = turnAt(40).gain;
  ok('  and below forty hertz it has faded, which the comment says outright',
    low > 0.6 && low < 0.95, low.toFixed(3));
}

/* ── The fast path is the same arithmetic ─────────────────────────────── */

{
  /* `through` multiplies spectra. `convolve` is the definition written out.
     If these two ever disagree the fast one is wrong, and no amount of
     listening would find it. */
  const kernel = hilbertKernel();
  const mid = (kernel.length - 1) / 2;
  let worst = 0;
  for (const length of [3000, 40000, 131072]) {
    const signal = new Float32Array(length);
    /* Fixed, not Math.random: a check that fails one run in fifty is a check
       nobody believes. */
    let seed = 12345;
    for (let i = 0; i < length; i += 1) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      signal[i] = (seed / 0x3fffffff) - 1;
    }
    const slow = convolve(signal, kernel);
    const fast = through(signal, kernel);
    for (let i = 0; i < length; i += 1) worst = Math.max(worst, Math.abs(fast[i] - slow[i + mid]));
  }
  ok('the fast transform gives the same answer as the arithmetic written out',
    worst < 1e-4, worst.toExponential(2));

  /* And it is actually fast. Three minutes of stereo took 4.3 s the slow way
     with a kernel an eighth of this length — a download button that locks
     her phone for a minute. This rule is what stops it coming back. */
  const frames = RATE * 180;
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  for (let i = 0; i < frames; i += 1) { left[i] = 0.4 * Math.sin(i / 40); right[i] = 0.4 * Math.sin(i / 41); }
  const began = Date.now();
  foldTo('surround', left, right);
  const took = (Date.now() - began) / 1000;
  ok('  and folds a three-minute mix in under five seconds', took < 5, `${took.toFixed(2)} s`);
}

/* ── The surround fold ────────────────────────────────────────────────── */

{
  /* A mono-in-the-middle mix: the same thing on both channels and no width
     at all. A matrix decoder should find nothing for the rears, so the fold
     must leave the two channels identical, and leave them alone. */
  const same = tone(440);
  const [lt, rt] = foldTo('surround', same, Float32Array.from(same));
  let apart = 0;
  for (let i = 0; i < FRAMES; i += 1) if (!near(lt[i], rt[i], 1e-9)) apart += 1;
  ok('a mix with no width folds to two identical channels', apart === 0, `${apart} samples differ`);
  ok('  and stays exactly as loud as it was', near(level(lt), level(same), 1e-4),
    `${level(lt).toFixed(4)} against ${level(same).toFixed(4)}`);

  /* And a mix that is ALL width — the same tone in anti-phase — is what a
     decoder should send to the rears.
     
     The folded difference is the original difference PLUS the original
     difference turned a quarter. Those two are at right angles, so they add
     the way the sides of a right-angled triangle do and the answer is root
     two of one of them — not two, which is what an un-turned copy would
     give, and not one, which is what no copy at all would give. So this one
     number separates a working fold from both ways of breaking it.
     
     At 0.5 the fold peaks around 0.71 and the ceiling never engages, which
     is the mistake the first version of this file made. */
  for (const hz of [220, 440, 1000, 4000]) {
    const l = tone(hz);
    const r = tone(hz, 0.5, Math.PI);
    const [wl, wr] = foldTo('surround', l, r);
    const was = new Float32Array(FRAMES);
    const now = new Float32Array(FRAMES);
    for (let i = 0; i < FRAMES; i += 1) {
      was[i] = (l[i] - r[i]) / 2;
      now[i] = (wl[i] - wr[i]) / 2;
    }
    const ratio = level(now) / level(was);
    /* Predicted from the measured gain of the turn at this frequency, so the
       rule is exact rather than approximately root two. */
    const want = Math.sqrt(1 + turnAt(hz).gain ** 2);
    ok(`  and the difference at ${hz} Hz lands where the right angle puts it`,
      near(ratio, want, 0.01),
      `${ratio.toFixed(4)} against ${want.toFixed(4)} — 1.0 means no turn happened, 2.0 means it was copied instead of turned`);
    ok(`  and the fold at ${hz} Hz never reached the ceiling, so nothing was scaled`,
      loudest(wl) < FOLD_CEILING - 1e-6, loudest(wl).toFixed(4));
  }

  /* Nothing clips. A square at the ceiling, in anti-phase, is the worst case
     there is: the arithmetic alone reaches 1.5 and the turn rings above even
     that at every edge. */
  const loudL = new Float32Array(FRAMES).fill(1);
  const loudR = new Float32Array(FRAMES).fill(-1);
  const [cl, cr] = foldTo('surround', loudL, loudR);
  let over = 0;
  for (let i = 0; i < FRAMES; i += 1) if (Math.abs(cl[i]) > 1 || Math.abs(cr[i]) > 1) over += 1;
  ok('  and a mix already at the ceiling does not clip', over === 0, `${over} samples past 1`);
  ok('  and comes down by exactly what it needed and no more',
    near(Math.max(loudest(cl), loudest(cr)), FOLD_CEILING, 1e-4),
    'a fixed headroom figure makes every quiet mix pay for the loudest one');
  ok('  which is what the ceiling is', FOLD_CEILING === 1, String(FOLD_CEILING));
}

/* ── The three the room offers ────────────────────────────────────────── */

ok('the room offers exactly the three she asked for',
  LAYOUTS.length === 3 && LAYOUTS.map((one) => one.id).sort().join(',') === 'mono,stereo,surround',
  LAYOUTS.map((one) => one.id).join(', '));
ok('  and an unknown one falls back to stereo rather than to nothing',
  layoutById('dolby-atmos') === 'stereo' && layoutById('mono') === 'mono');
ok('  and each one says how many channels the file has',
  channelsOf('mono') === 1 && channelsOf('stereo') === 2 && channelsOf('surround') === 2);

/* ── And the claim we do not make ─────────────────────────────────────── */

const lib = readFileSync('app/lib/channels.ts', 'utf8');
const words = readFileSync('app/lib/i18n.tsx', 'utf8');
const room = readFileSync('app/components/ProBooth.tsx', 'utf8');

/* The dictionary writes its curly quotes and accents as \u escapes, so a
   rule that matches the real characters matches nothing and passes. It did.
   Turn them back before reading a word of it. */
const plain = (line: string) => line.replace(/\\u([0-9a-fA-F]{4})/g,
  (_, code) => String.fromCharCode(parseInt(code, 16)));

const dictionary = new Map<string, [string, string]>();
for (const one of words.matchAll(/"([a-zA-Z.]+)": \{ en: "((?:[^"\\]|\\.)*)", af: "((?:[^"\\]|\\.)*)" \}/g)) {
  dictionary.set(one[1], [plain(one[2]), plain(one[3])]);
}
/* Named, not counted. The first version asked for "at least fourteen
   strings" — and the dictionary has fifty-six keys beginning `mix.`, so
   every layout line could have been deleted and the guard would still have
   passed, taking all four wording rules below it green with nothing to
   read. A rule whose subject is "enough of something" is usually this bug. */
const NEEDED = ['mix.layout', 'mix.stereo', 'mix.stereoNote', 'mix.mono',
  'mix.monoNote', 'mix.surround', 'mix.surroundNote'];
const missing = NEEDED.filter((key) => !dictionary.has(key));
ok('the seven lines about how it comes out are all in the dictionary',
  missing.length === 0,
  `${missing.join(', ')} — a rule that reads nothing passes every rule below it`);
const said = NEEDED.flatMap((key) => dictionary.get(key) ?? []);

const denies = /not a Dolby file|nie ’n Dolby-lêer|do not licence Dolby|lisensieer nie Dolby/i;
const claims = said.filter((line) => /dolby/i.test(line) && !denies.test(line));
ok('  and nothing on the screen calls the file a Dolby one', claims.length === 0, claims.join(' | '));
ok('  and the screen says outright that it is not',
  said.some((line) => /not a Dolby file/.test(line))
  && said.some((line) => /nie ’n Dolby-lêer nie/.test(line)),
  'in both languages, because the claim would be made in both');
ok('  and the button says matrix rather than a trademark',
  said.includes('Surround (matrix)') && !/\bPro Logic\b|\bAtmos\b/i.test(words),
  /* Boundaries, not a bare substring. Without them this failed on
     "Atmosphere" in the scene list and would have gone on failing on any
     word with those five letters in it — a rule that cries wolf is a rule
     somebody eventually deletes. */
  'Pro Logic and Atmos are names somebody owns');

/* The library may say the word — the notes it holds are the very sentences
   that deny it. What it may not do is NAME anything after one. So the rule
   reads the names, not the prose: the type, the ids, and every declaration. */
const code = lib.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const names = [
  ...code.matchAll(/(?:type|const|function|let)\s+([A-Za-z0-9_]+)/g),
  ...code.matchAll(/\bid:\s*'([^']*)'/g),
  ...code.matchAll(/^export type Layout = (.*)$/gm),
].map((one) => one[1]);
ok('  and neither is anything in the code named after one',
  !names.some((name) => /prologic|atmos|dolby/i.test(name)),
  'a type called `dolby` becomes a label called Dolby the first time somebody is in a hurry');
/* And where the word does appear in the library, it is inside a denial. */
const inLib = [...code.matchAll(/'([^']*dolby[^']*)'/gi)].map((one) => one[1]);
ok('  and where the library says the word at all, it is to deny it',
  inLib.every((line) => denies.test(line)), inLib.join(' | '));

/* ── And the room actually uses it ────────────────────────────────────── */

ok('the room lets her choose before it writes the file',
  /data-layout=\{one\.id\}/.test(room) && /LAYOUTS\.map/.test(room),
  'three functions nothing calls');
ok('  and the file says which layout it is, unless it is the ordinary one',
  /\$\{layout === 'stereo' \? '' : ` \(\$\{layout\}\)`\}\.wav/.test(room),
  'three downloads called song.wav, song (1).wav and song (2).wav tell her nothing about the one thing she got them to compare');
ok('  and both doors write the same layout',
  (room.match(/encodeWav\(mixed, layout\)/g) ?? []).length === 2,
  'the phone and the Library must not differ — nobody notices until a shop plays it');

if (failures) {
  console.error(`\ncheck:channels — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(
  '\ncheck:channels — mono halves rather than sums, stereo is untouched, the turn is a full quarter'
  + ' from eighty hertz, the fast transform matches the arithmetic written out and folds a song in'
  + ' under five seconds, the fold cannot clip, and nothing anywhere calls the file a Dolby one.',
);
