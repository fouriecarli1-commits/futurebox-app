/**
 * The booth's own pedals and amps do what their names say.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * The owner, 22 October 2026: *"of ons moet ons eie pedals, en amp modellers
 * iewers kry."* `lib/pedals.ts` is that: three drives, an amp with three
 * voicings, two cabinets, a flanger, a phaser, and rigs.
 *
 * ── Why it is driven ─────────────────────────────────────────────────────
 *
 * A pedal that is wrong does not throw. An overdrive whose curve is a
 * straight line is a level knob; a cabinet whose impulse lets 10 kHz through
 * is the bee-in-a-jar sound of a guitar into a desk; a fuzz that clips
 * evenly is a distortion with another name. So the curves and the impulses
 * — which are the whole of what makes each one itself — are measured here,
 * and the rack is read to make sure the room actually builds them.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { before } from './order.mts';
import {
  PEDAL_DEFAULTS, RIGS, cabinetImpulse, clip, driveCurve, stagesOf, valveCurve, type DriveKind,
} from '../app/lib/pedals.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nThe booth\'s own pedals and amps do what their names say\n');

const RATE = 48_000;

/** A sine through a curve, as a WaveShaperNode would play it. */
function through(curve: Float32Array, amp: number, n = 4800): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const x = amp * Math.sin((2 * Math.PI * 100 * i) / RATE);
    const at = ((x + 1) / 2) * (curve.length - 1);
    const lo = Math.floor(at);
    const hi = Math.min(curve.length - 1, lo + 1);
    out[i] = curve[lo] + (curve[hi] - curve[lo]) * (at - lo);
  }
  return out;
}

/** The size of one harmonic of the 100 Hz test tone. */
function harmonic(signal: Float32Array, k: number): number {
  let re = 0;
  let im = 0;
  for (let i = 0; i < signal.length; i += 1) {
    const w = (2 * Math.PI * 100 * k * i) / RATE;
    re += signal[i] * Math.cos(w);
    im += signal[i] * Math.sin(w);
  }
  return (2 * Math.hypot(re, im)) / signal.length;
}

/** How much of a signal is not its fundamental: total harmonic distortion. */
function thd(signal: Float32Array): number {
  const f = harmonic(signal, 1);
  let rest = 0;
  for (let k = 2; k <= 9; k += 1) rest += harmonic(signal, k) ** 2;
  return Math.sqrt(rest) / Math.max(1e-9, f);
}

/* ── The drives ───────────────────────────────────────────────────────── */

for (const kind of ['overdrive', 'distortion', 'fuzz'] as DriveKind[]) {
  const soft = driveCurve(kind, 0.1);
  const hard = driveCurve(kind, 0.9);
  ok(`the ${kind} curve is finite and never past full scale`,
    [soft, hard].every((c) => c.every((v) => Number.isFinite(v) && Math.abs(v) <= 1 + 1e-6)));
  let rising = true;
  for (let i = 1; i < hard.length; i += 1) if (hard[i] < hard[i - 1] - 1e-9) rising = false;
  ok(`  and it only ever rises, so louder in is never quieter out`, rising,
    'a curve that folds back is a wave folder, which is a different effect');
  /* A quiet string, as a guitar into a phone mostly is: loud enough and
     every drive is flat-topped, which is the knob doing nothing either. */
  const a = thd(through(soft, 0.05));
  const b = thd(through(hard, 0.05));
  ok(`  and more drive is more distortion (${(a * 100).toFixed(0)}% → ${(b * 100).toFixed(0)}%)`,
    b > a * 1.5 && b > 0.1,
    'turning the drive up does not add harmonics, so the knob does nothing a level knob would not');
}

const even = (kind: DriveKind): number => {
  const out = through(driveCurve(kind, 0.6), 0.2);
  return harmonic(out, 2) / Math.max(1e-9, harmonic(out, 3));
};
ok('the fuzz is the lopsided one: far more second harmonic than the distortion',
  even('fuzz') > even('distortion') * 3,
  `${even('fuzz').toFixed(3)} against ${even('distortion').toFixed(3)} — an even clip makes odd`
  + ' harmonics only, and a fuzz that clips evenly is a distortion with another name');
ok('  and the overdrive has a little of it, for warmth',
  even('overdrive') > 0.02,
  even('overdrive').toFixed(3));
ok('the distortion squares the wave off harder than the overdrive at the same drive',
  thd(through(driveCurve('distortion', 0.5), 0.3)) > thd(through(driveCurve('overdrive', 0.5), 0.3)));
ok('at nought a clip still passes a quiet signal nearly straight',
  Math.abs(clip('overdrive', 0.001, 0) / 0.001 - 1) < 0.01);

/* ── The amp ──────────────────────────────────────────────────────────── */

ok('clean is one valve stage, crunch two, lead three',
  stagesOf('clean', 0.5).length === 1 && stagesOf('crunch', 0.5).length === 2 && stagesOf('lead', 0.5).length === 3);
const ampThd = (voice: 'clean' | 'crunch' | 'lead'): number => {
  let signal = new Float32Array(4800);
  for (let i = 0; i < signal.length; i += 1) signal[i] = 0.25 * Math.sin((2 * Math.PI * 100 * i) / RATE);
  for (const gain of stagesOf(voice, 0.6)) {
    const curve = valveCurve(gain);
    const next = new Float32Array(signal.length);
    for (let i = 0; i < signal.length; i += 1) {
      const at = ((Math.max(-1, Math.min(1, signal[i])) + 1) / 2) * (curve.length - 1);
      next[i] = curve[Math.round(at)];
    }
    signal = next;
  }
  return thd(signal);
};
ok(`and each voicing is dirtier than the one before (${['clean', 'crunch', 'lead'].map((v) => (ampThd(v as 'clean') * 100).toFixed(0)).join('% → ')}%)`,
  ampThd('clean') < ampThd('crunch') && ampThd('crunch') < ampThd('lead'));

/* ── The cabinets ─────────────────────────────────────────────────────── */

/** The cabinet's loudness at one frequency, from its impulse. */
function at(impulse: Float32Array, hz: number): number {
  let re = 0;
  let im = 0;
  for (let i = 0; i < impulse.length; i += 1) {
    re += impulse[i] * Math.cos((2 * Math.PI * hz * i) / RATE);
    im -= impulse[i] * Math.sin((2 * Math.PI * hz * i) / RATE);
  }
  return 20 * Math.log10(Math.hypot(re, im) + 1e-12);
}

for (const kind of ['open', 'closed'] as const) {
  const ir = cabinetImpulse(kind, RATE);
  ok(`the ${kind} cabinet's impulse is finite and dies away`,
    ir.every(Number.isFinite) && Math.abs(ir[ir.length - 1]) < 1e-3);
  const bite = at(ir, 2500);
  ok(`  and passes the speaker's bite at 2.5 kHz far above 10 kHz (${(bite - at(ir, 10000)).toFixed(0)} dB)`,
    bite - at(ir, 10000) > 20,
    'a cabinet that lets 10 kHz through is the fizz of a guitar plugged straight into a desk');
  ok(`  and the lowest octave is held back (${(bite - at(ir, 40)).toFixed(0)} dB under the bite at 40 Hz)`,
    bite - at(ir, 40) > 6);
  ok('  and the low mids are dipped against the bite',
    bite - at(ir, 420) > 3);
}
ok('the closed 4×12 has more thump than the open 1×12',
  at(cabinetImpulse('closed', RATE), 110) - at(cabinetImpulse('closed', RATE), 2500)
  > at(cabinetImpulse('open', RATE), 110) - at(cabinetImpulse('open', RATE), 2500));

/* ── The rigs ─────────────────────────────────────────────────────────── */

const KNOWN = new Set([
  'gate', 'vocoder', 'eq', 'compressor', 'limiter', 'utility', 'saturator', 'folder', 'crusher',
  'tremolo', 'chorus', 'delay', 'reverb', 'overdrive', 'distortion', 'fuzz', 'amp', 'flanger', 'phaser',
]);
ok(`every rig (${RIGS.length}) is made only of effects the rack has`,
  RIGS.every((rig) => Object.keys(rig.fx).every((key) => KNOWN.has(key))),
  RIGS.flatMap((rig) => Object.keys(rig.fx).filter((key) => !KNOWN.has(key))).join(', '));
ok('  and every rig has a name and a line to say what it is',
  RIGS.every((rig) => rig.says[0].startsWith('rig.') && rig.what[1].length > 10));
ok('  and the defaults switch each pedal on to something audible',
  PEDAL_DEFAULTS.overdrive.drive > 0.2 && PEDAL_DEFAULTS.amp.gain > 0.2 && PEDAL_DEFAULTS.flanger.depth > 0.3);

/* ── And the room builds them ─────────────────────────────────────────── */

const fx = withoutComments(readFileSync('app/lib/fx.ts', 'utf8'));
ok('the rack builds every pedal from these curves',
  /driveCurve\s*\(/.test(fx) && /valveCurve\s*\(/.test(fx) && /cabinetImpulse\s*\(/.test(fx),
  'the curves are measured here and nothing plays them');
ok('  oversampled, so the clipping does not alias',
  (fx.match(/oversample\s*=\s*'4x'/g) ?? []).length >= 3);
const chain = ['if (fx.gate)', 'const drives', 'if (fx.amp)', 'if (fx.eq)', 'if (fx.compressor)',
  'if (fx.tremolo)', 'if (fx.flanger)', 'if (fx.phaser)', 'if (fx.delay)', 'if (fx.reverb)'];
const outOfOrder = chain.slice(1).filter((one, i) => !before(fx, chain[i], one));
ok('  in a pedalboard\'s order: gate, drives, amp, EQ, dynamics, modulation, echo, room',
  outOfOrder.length === 0,
  `out of place: ${outOfOrder.join(', ')}`);

const rack = withoutComments(readFileSync('app/components/BoothFx.tsx', 'utf8'));
ok('the rack panel offers the rigs and every new pedal',
  /RIGS\.map/.test(rack) && ['overdrive', 'distortion', 'fuzz', 'flanger', 'phaser'].every((one) => rack.includes(`'${one}'`))
  && /id="amp"/.test(rack));

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);
