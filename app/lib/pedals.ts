/**
 * The booth's own pedals and amps: no capture, no account, no third party.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * The owner, 22 October 2026: *"Ons moet ook nog tone3000 uit figure om te
 * werk vir probooth. of ons moet ons eie pedals, en amp modellers iewers
 * kry."* TONE3000's library waits on things only she can do (see
 * `docs/TONE3000-OPSTEL.md`), and a studio whose guitar sound depends on
 * somebody else's sign-off is a studio with no guitar sound until then. So
 * the rack has its own: three drive pedals, an amp with three voicings and a
 * real tone stack, two speaker cabinets, a flanger and a phaser — and rigs
 * that set a whole board at once.
 *
 * ── How they are built, and why that way ─────────────────────────────────
 *
 * The rule `lib/fx.ts` is built on holds here too: ordinary Web Audio nodes
 * and nothing else, so the live room and the mixdown are one graph and what
 * she hears is what is exported. What a node cannot know is worked out here
 * as data — the curves and the cabinet impulses — and handed to the nodes.
 * Everything in this file is arithmetic that fills arrays, so
 * `check:pedals` drives it without a browser.
 *
 *   overdrive   the "mid hump" pedal: the low end is cut before it clips, so
 *               it breaks up in the middle and stays tight; soft, slightly
 *               uneven clipping, the way two diodes that are not a matched
 *               pair clip
 *   distortion  harder: an exponential clip with far more gain, so the
 *               sound is square-shouldered and sustains
 *   fuzz        the oldest and roughest: very high gain into a lopsided
 *               clip that rectifies a little, with the middle scooped out
 *               of what is left
 *   amp         a preamp of one, two or three valve stages (clean, crunch,
 *               lead), a bass/middle/treble tone stack, a power stage that
 *               squashes gently, presence, and a speaker cabinet
 *   cabinet     a speaker in a box is a filter with a shape — a thump low,
 *               a dip in the low mids, a bite around 2–3 kHz, and nothing
 *               much above 5 kHz. That shape is written as an impulse
 *               (`cabinetImpulse`) and played through a convolver, which is
 *               exactly how a captured cabinet IR is used
 *
 * Every shaper is oversampled four times: clipping makes harmonics above the
 * top of the audible range, and without oversampling they fold back down as
 * a metallic whine nobody asked for.
 */

import type { Fx } from './fx';

export type DriveKind = 'overdrive' | 'distortion' | 'fuzz';

export interface DriveSettings {
  /** 0 to 1. How hard it is pushed. */
  readonly drive: number;
  /** 0 dark to 1 bright. */
  readonly tone: number;
  /** Decibels out, −24 to +12. */
  readonly level: number;
}

export type AmpVoice = 'clean' | 'crunch' | 'lead';
export type Cabinet = 'none' | 'open' | 'closed';

export interface AmpSettings {
  readonly voice: AmpVoice;
  /** 0 to 1, the preamp. */
  readonly gain: number;
  /** 0 to 1 each; a half is the knob at twelve o'clock. */
  readonly bass: number;
  readonly mid: number;
  readonly treble: number;
  readonly presence: number;
  /** Decibels out, −24 to +12. */
  readonly master: number;
  readonly cabinet: Cabinet;
}

export interface SweepSettings {
  /** Hertz. */
  readonly rate: number;
  /** 0 to 1. */
  readonly depth: number;
  /** 0 to 0.9: how much of the sound goes round again. */
  readonly feedback: number;
  /** 0 to 1. */
  readonly mix: number;
}

export const PEDAL_DEFAULTS = {
  overdrive: { drive: 0.45, tone: 0.55, level: 0 } as DriveSettings,
  distortion: { drive: 0.55, tone: 0.5, level: -2 } as DriveSettings,
  fuzz: { drive: 0.7, tone: 0.45, level: -4 } as DriveSettings,
  amp: { voice: 'crunch', gain: 0.5, bass: 0.5, mid: 0.5, treble: 0.55, presence: 0.5, master: 0, cabinet: 'closed' } as AmpSettings,
  flanger: { rate: 0.25, depth: 0.7, feedback: 0.5, mix: 0.5 } as SweepSettings,
  phaser: { rate: 0.5, depth: 0.7, feedback: 0, mix: 0.5 } as SweepSettings,
} as const;

const CURVE = 2048;
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/**
 * How hard each pedal pushes, at full drive.
 *
 * Folded into the curve rather than put on a gain in front of it, because a
 * `WaveShaperNode` holds its input to −1…1: a signal turned up before it
 * would just sit on the curve's last value, which is a hard clip of a
 * different sound.
 */
export function driveGain(kind: DriveKind, drive: number): number {
  const d = clamp(drive, 0, 1);
  if (kind === 'overdrive') return 1 + d * 40;
  if (kind === 'distortion') return 2 + d * 160;
  return 6 + d * 400;
}

/** One sample through one pedal's clipper, before the level. */
export function clip(kind: DriveKind, x: number, drive: number): number {
  const k = driveGain(kind, drive);
  const v = k * x;
  if (kind === 'overdrive') {
    /* Soft, and a little lopsided: the negative side gives way slightly
       sooner. That small unevenness adds the even harmonics that make an
       overdrive sound warm rather than buzzy. */
    return v >= 0 ? Math.tanh(v) : Math.tanh(1.25 * v) / 1.12;
  }
  if (kind === 'distortion') {
    /* An exponential clip: still smooth at the very corner, so no fizz, but
       flat-topped almost at once. */
    return Math.sign(v) * (1 - Math.exp(-Math.abs(v)));
  }
  /* Fuzz: the positive side clips early and hard, the negative side late
     and soft, and a small offset rectifies the quiet parts — which is the
     sputter of a fuzz on a dying note. */
  const lopsided = v >= 0 ? 1 - Math.exp(-v * 1.6) : -(1 - Math.exp(v * 0.55)) * 0.82;
  return lopsided;
}

/** The curve handed to the pedal's `WaveShaperNode`, and drawn on its panel. */
export function driveCurve(kind: DriveKind, drive: number): Float32Array<ArrayBuffer> {
  const out = new Float32Array(new ArrayBuffer(CURVE * 4));
  /* Normalised so the loudest the pedal can get is the same at every
     drive: the level knob is then a level, not a second drive. */
  const top = Math.max(Math.abs(clip(kind, 1, drive)), Math.abs(clip(kind, -1, drive)), 1e-6);
  for (let i = 0; i < CURVE; i += 1) out[i] = clip(kind, (i / (CURVE - 1)) * 2 - 1, drive) / top;
  return out;
}

/**
 * One valve stage, as a curve.
 *
 * A triode clips softly on one side and later on the other; stacking two or
 * three of them with gain between is what moves an amp from clean to
 * crunch to lead.
 */
export function valveCurve(gain: number): Float32Array<ArrayBuffer> {
  const out = new Float32Array(new ArrayBuffer(CURVE * 4));
  const k = Math.max(0.5, gain);
  const top = Math.tanh(k);
  for (let i = 0; i < CURVE; i += 1) {
    const x = ((i / (CURVE - 1)) * 2 - 1) * k;
    const y = x >= 0 ? Math.tanh(x) : Math.tanh(x * 1.15) / 1.06;
    out[i] = y / top;
  }
  return out;
}

/** How many valve stages each voicing has, and how hard each is driven at full gain. */
export function stagesOf(voice: AmpVoice, gain: number): number[] {
  const g = clamp(gain, 0, 1);
  if (voice === 'clean') return [0.8 + g * 3];
  if (voice === 'crunch') return [1.5 + g * 8, 1.2 + g * 4];
  return [3 + g * 14, 2 + g * 8, 1.5 + g * 4];
}

/** A knob at 0–1 as the decibels the tone stack moves. Twelve o'clock is flat. */
export const knobDb = (knob: number, most = 12): number => (clamp(knob, 0, 1) - 0.5) * 2 * most;

/* ── The cabinet ──────────────────────────────────────────────────────── */

/** One RBJ biquad, run over an array in place. */
function biquad(
  data: Float32Array,
  type: 'lowpass' | 'highpass' | 'peaking',
  hz: number,
  q: number,
  db: number,
  rate: number,
): void {
  const w = (2 * Math.PI * hz) / rate;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  const a = 10 ** (db / 40);
  let b0: number; let b1: number; let b2: number; let a0: number; let a1: number; let a2: number;
  if (type === 'lowpass') {
    b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
  } else if (type === 'highpass') {
    b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
  } else {
    b0 = 1 + alpha * a; b1 = -2 * cos; b2 = 1 - alpha * a; a0 = 1 + alpha / a; a1 = -2 * cos; a2 = 1 - alpha / a;
  }
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0;
  for (let i = 0; i < data.length; i += 1) {
    const x0 = data[i];
    const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    data[i] = y0;
  }
}

/**
 * A speaker cabinet's impulse, made rather than recorded.
 *
 * An open-backed 1×12 combo is lighter in the low end and a little brighter;
 * a closed 4×12 has the thump of the box and less on top. Both: a dip in the
 * low mids where a guitar gets boxy, the speaker's bite around 2–3 kHz, and
 * a steep roll-off above 5 kHz, which is most of why a guitar through a
 * cabinet sounds like a guitar and a guitar straight into a desk sounds like
 * a bee. A few early reflections inside the box give it a body.
 */
export function cabinetImpulse(kind: Exclude<Cabinet, 'none'>, rate: number): Float32Array {
  const n = Math.round(rate * 0.04);
  const out = new Float32Array(n);
  out[0] = 1;
  const echo = (ms: number, gain: number): void => {
    const at = Math.round((ms / 1000) * rate);
    if (at < n) out[at] += gain;
  };
  if (kind === 'closed') { echo(0.9, 0.35); echo(2.1, -0.18); echo(3.4, 0.1); }
  else { echo(0.6, 0.22); echo(1.7, -0.1); }
  const closed = kind === 'closed';
  biquad(out, 'highpass', closed ? 75 : 95, 0.8, 0, rate);
  biquad(out, 'peaking', closed ? 110 : 140, 1.3, closed ? 5 : 2.5, rate);
  biquad(out, 'peaking', 420, 1.0, -5, rate);
  biquad(out, 'peaking', closed ? 2300 : 2800, 1.4, closed ? 4 : 5.5, rate);
  biquad(out, 'lowpass', closed ? 4800 : 5600, 0.75, 0, rate);
  biquad(out, 'lowpass', closed ? 5200 : 6200, 0.6, 0, rate);
  /* A short fade at the end, so the impulse does not stop on a step. */
  const fade = Math.round(n * 0.25);
  for (let i = 0; i < fade; i += 1) out[n - 1 - i] *= i / fade;
  return out;
}

/* ── Rigs: a whole board, set at once ─────────────────────────────────── */

export interface Rig {
  readonly id: string;
  readonly says: readonly [string, string];
  readonly what: readonly [string, string];
  readonly fx: Fx;
}

/**
 * Starting points a guitarist recognises, made from the pedals above and the
 * rack that was already here. Fixed settings — nothing is asked of anyone —
 * and every one is the rack's own, so a rig is changed afterwards dial by
 * dial like anything else.
 */
export const RIGS: readonly Rig[] = [
  {
    id: 'cleanChime',
    says: ['rig.cleanChime', 'Clean chime'],
    what: ['rig.cleanChimeWhat', 'Glassy clean amp, a touch of chorus and a small room.'],
    fx: {
      compressor: { threshold: -22, ratio: 3, attack: 0.01, release: 0.2 },
      amp: { voice: 'clean', gain: 0.35, bass: 0.45, mid: 0.45, treble: 0.65, presence: 0.6, master: 0, cabinet: 'open' },
      chorus: { rate: 0.7, depth: 0.35 },
      reverb: { size: 1.6, mix: 0.2 },
    },
  },
  {
    id: 'bluesCrunch',
    says: ['rig.bluesCrunch', 'Blues crunch'],
    what: ['rig.bluesCrunchWhat', 'A mid-hump overdrive into an amp just breaking up.'],
    fx: {
      overdrive: { drive: 0.4, tone: 0.55, level: 0 },
      amp: { voice: 'crunch', gain: 0.4, bass: 0.5, mid: 0.6, treble: 0.5, presence: 0.5, master: 0, cabinet: 'open' },
      reverb: { size: 1.2, mix: 0.15 },
    },
  },
  {
    id: 'classicRock',
    says: ['rig.classicRock', 'Classic rock'],
    what: ['rig.classicRockWhat', 'Distortion pedal, a crunchy stack and a slapback echo.'],
    fx: {
      distortion: { drive: 0.45, tone: 0.6, level: -2 },
      amp: { voice: 'crunch', gain: 0.6, bass: 0.55, mid: 0.6, treble: 0.55, presence: 0.55, master: 0, cabinet: 'closed' },
      delay: { time: 0.12, feedback: 0.15, mix: 0.18 },
    },
  },
  {
    id: 'highGain',
    says: ['rig.highGain', 'Modern high gain'],
    what: ['rig.highGainWhat', 'Gate, a boost to tighten the low end, and a three-stage lead amp.'],
    fx: {
      gate: { threshold: -50, speed: 0.02 },
      overdrive: { drive: 0.08, tone: 0.65, level: 6 },
      amp: { voice: 'lead', gain: 0.75, bass: 0.55, mid: 0.4, treble: 0.6, presence: 0.6, master: -3, cabinet: 'closed' },
    },
  },
  {
    id: 'fuzzWall',
    says: ['rig.fuzzWall', 'Wall of fuzz'],
    what: ['rig.fuzzWallWhat', 'A scooped fuzz into a clean amp, for a big sustaining sound.'],
    fx: {
      fuzz: { drive: 0.75, tone: 0.45, level: -4 },
      amp: { voice: 'clean', gain: 0.5, bass: 0.6, mid: 0.4, treble: 0.5, presence: 0.5, master: 0, cabinet: 'closed' },
      reverb: { size: 2, mix: 0.18 },
    },
  },
  {
    id: 'funkPhase',
    says: ['rig.funkPhase', 'Funk phase'],
    what: ['rig.funkPhaseWhat', 'Squeezed and clean, with a slow phaser on it.'],
    fx: {
      compressor: { threshold: -28, ratio: 6, attack: 0.005, release: 0.15 },
      amp: { voice: 'clean', gain: 0.3, bass: 0.4, mid: 0.55, treble: 0.65, presence: 0.6, master: 0, cabinet: 'open' },
      phaser: { rate: 0.6, depth: 0.7, feedback: 0, mix: 0.5 },
    },
  },
  {
    id: 'jetFlange',
    says: ['rig.jetFlange', 'Jet flange'],
    what: ['rig.jetFlangeWhat', 'A crunchy amp with a slow, deep flanger sweeping through it.'],
    fx: {
      amp: { voice: 'crunch', gain: 0.5, bass: 0.5, mid: 0.5, treble: 0.55, presence: 0.5, master: 0, cabinet: 'closed' },
      flanger: { rate: 0.18, depth: 0.85, feedback: 0.65, mix: 0.5 },
    },
  },
  {
    id: 'ambientSwell',
    says: ['rig.ambientSwell', 'Ambient wash'],
    what: ['rig.ambientSwellWhat', 'Clean amp into long echoes and a big room.'],
    fx: {
      amp: { voice: 'clean', gain: 0.3, bass: 0.45, mid: 0.5, treble: 0.6, presence: 0.5, master: 0, cabinet: 'open' },
      chorus: { rate: 0.4, depth: 0.4 },
      delay: { time: 0.48, feedback: 0.55, mix: 0.35 },
      reverb: { size: 4.5, mix: 0.45 },
    },
  },
  {
    id: 'bassGrit',
    says: ['rig.bassGrit', 'Bass with grit'],
    what: ['rig.bassGritWhat', 'A held-back overdrive and a compressor for a bass that cuts.'],
    fx: {
      compressor: { threshold: -24, ratio: 4, attack: 0.02, release: 0.15 },
      overdrive: { drive: 0.3, tone: 0.4, level: 0 },
      eq: { low: 3, mid: 1.5, midHz: 800, high: -2 },
    },
  },
];
