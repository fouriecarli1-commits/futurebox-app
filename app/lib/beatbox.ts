/**
 * ProBooth's drum machine: sixteen steps a bar, eight sounds, drawn on the
 * device and laid onto a lane at the session's tempo.
 *
 * The audit of 29 October 2026 against the studios every musician knows
 * found ProBooth had no drum pads and no step sequencer, which every one of
 * them has. This is the pattern (which steps play, how hard), the kit (each
 * sound drawn from a few lines of maths, deterministic, so the same pattern is
 * the same file every time and a check can hold it), and the render: a bar of
 * the pattern repeated as many bars as asked, swung if asked, at the session's
 * own tempo so it sits on the grid and the click.
 *
 * The log drum is here because a South African studio without one would be
 * missing the sound of the decade: a pitched, rounded bass hit that slides
 * down, which is what an amapiano beat is built on.
 */

export const RATE = 44100;
export const STEPS = 16;

export const SOUNDS = ['kick', 'snare', 'clap', 'hat', 'open', 'tom', 'rim', 'log'] as const;
export type SoundId = (typeof SOUNDS)[number];

export const SOUND_NAMES: Record<SoundId, readonly [string, string]> = {
  kick: ['beat.kick', 'Kick'],
  snare: ['beat.snare', 'Snare'],
  clap: ['beat.clap', 'Clap'],
  hat: ['beat.hat', 'Hi-hat'],
  open: ['beat.open', 'Open hat'],
  tom: ['beat.tom', 'Tom'],
  rim: ['beat.rim', 'Rim'],
  log: ['beat.log', 'Log drum'],
};

/** Each sound's sixteen steps: 0 is off, otherwise how hard, up to 1. */
export type Pattern = Readonly<Record<SoundId, readonly number[]>>;

export interface Beat {
  readonly pattern: Pattern;
  /** How many bars it plays for. */
  readonly bars: number;
  /** 0 is straight; 0.5 pushes every second sixteenth half way to the next. */
  readonly swing: number;
}

export const empty = (): Pattern =>
  Object.fromEntries(SOUNDS.map((one) => [one, new Array(STEPS).fill(0)])) as unknown as Pattern;

const row = (steps: readonly number[], hard = 1): number[] => {
  const out = new Array(STEPS).fill(0);
  for (const step of steps) out[step] = hard;
  return out;
};

/** Starting points, each a real style, to change rather than build from nothing. */
export const PRESETS: readonly { readonly id: string; readonly name: readonly [string, string]; readonly beat: Beat }[] = [
  {
    id: 'pop',
    name: ['beat.presetPop', 'Pop'],
    beat: { bars: 4, swing: 0, pattern: { ...empty(), kick: row([0, 8, 10]), snare: row([4, 12]), hat: row([0, 2, 4, 6, 8, 10, 12, 14], 0.7) } },
  },
  {
    id: 'fourfloor',
    name: ['beat.presetHouse', 'House'],
    beat: { bars: 4, swing: 0, pattern: { ...empty(), kick: row([0, 4, 8, 12]), clap: row([4, 12]), open: row([2, 6, 10, 14], 0.6) } },
  },
  {
    id: 'boombap',
    name: ['beat.presetBoomBap', 'Boom bap'],
    beat: { bars: 4, swing: 0.35, pattern: { ...empty(), kick: row([0, 7, 10]), snare: row([4, 12]), hat: row([0, 2, 4, 6, 8, 10, 12, 14], 0.6), rim: row([15], 0.5) } },
  },
  {
    id: 'trap',
    name: ['beat.presetTrap', 'Trap'],
    beat: { bars: 4, swing: 0, pattern: { ...empty(), kick: row([0, 6, 11]), snare: row([8]), hat: row([0, 1, 2, 3, 4, 6, 8, 9, 10, 11, 12, 14, 15], 0.55), clap: row([8], 0.8) } },
  },
  {
    id: 'amapiano',
    name: ['beat.presetAmapiano', 'Amapiano'],
    beat: { bars: 4, swing: 0.2, pattern: { ...empty(), kick: row([0, 4, 8, 12], 0.8), log: row([3, 6, 10, 14]), clap: row([4, 12], 0.7), hat: row([2, 6, 10, 14], 0.5), rim: row([7, 15], 0.45) } },
  },
];

/** Seconds a sixteenth lasts at a tempo. */
export const stepSeconds = (bpm: number): number => 60 / Math.max(30, Math.min(300, bpm)) / 4;

/** When a step starts within its bar, swing included: the off-beat sixteenths are pushed late. */
export function stepAt(step: number, bpm: number, swing: number): number {
  const each = stepSeconds(bpm);
  const late = step % 2 === 1 ? Math.max(0, Math.min(0.6, swing)) * each : 0;
  return step * each + late;
}

/* ── The kit ─────────────────────────────────────────────────────────── */

/** Deterministic noise, so a render is the same every time. */
const noise = (i: number): number => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};

/** One hit of a sound, as samples. */
export function hit(sound: SoundId, rate = RATE): Float32Array {
  const len = (seconds: number): Float32Array => new Float32Array(Math.round(seconds * rate));
  if (sound === 'kick') {
    const out = len(0.45);
    let phase = 0;
    for (let i = 0; i < out.length; i += 1) {
      const t = i / rate;
      const hz = 45 + 110 * Math.exp(-t * 28);
      phase += (2 * Math.PI * hz) / rate;
      out[i] = Math.sin(phase) * Math.exp(-t * 7) + (i < rate * 0.004 ? noise(i) * 0.3 : 0);
    }
    return out;
  }
  if (sound === 'log') {
    /* A rounded, pitched bass hit sliding down a few semitones. */
    const out = len(0.6);
    let phase = 0;
    for (let i = 0; i < out.length; i += 1) {
      const t = i / rate;
      const hz = 70 * (1 + 0.6 * Math.exp(-t * 12));
      phase += (2 * Math.PI * hz) / rate;
      const body = Math.sin(phase) + 0.35 * Math.sin(2 * phase) + 0.12 * Math.sin(3 * phase);
      out[i] = Math.tanh(body * 1.4) * Math.min(1, t / 0.004) * Math.exp(-t * 4.2) * 0.8;
    }
    return out;
  }
  if (sound === 'tom') {
    const out = len(0.35);
    let phase = 0;
    for (let i = 0; i < out.length; i += 1) {
      const t = i / rate;
      phase += (2 * Math.PI * (120 + 80 * Math.exp(-t * 18))) / rate;
      out[i] = Math.sin(phase) * Math.exp(-t * 9) * 0.8;
    }
    return out;
  }
  if (sound === 'snare') {
    const out = len(0.25);
    let low = 0;
    for (let i = 0; i < out.length; i += 1) {
      const t = i / rate;
      low += 0.35 * (noise(i) - low);
      const rattle = (noise(i) - low) * Math.exp(-t * 18);
      const body = Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 28);
      out[i] = (rattle * 0.75 + body * 0.5) * 0.9;
    }
    return out;
  }
  if (sound === 'clap') {
    const out = len(0.3);
    for (let i = 0; i < out.length; i += 1) {
      const t = i / rate;
      /* Three quick claps and a tail, the shape of hands together. */
      const burst = [0, 0.011, 0.023].reduce((sum, at) => sum + (t >= at ? Math.exp(-(t - at) * 180) : 0), 0);
      const tail = Math.exp(-t * 14) * 0.4;
      out[i] = noise(i * 3) * (burst * 0.6 + tail) * 0.8;
    }
    return out;
  }
  if (sound === 'hat' || sound === 'open') {
    const out = len(sound === 'hat' ? 0.06 : 0.35);
    let last = 0;
    for (let i = 0; i < out.length; i += 1) {
      const t = i / rate;
      const n = noise(i * 7);
      const bright = n - last;
      last = n;
      out[i] = bright * Math.exp(-t * (sound === 'hat' ? 70 : 9)) * 0.45;
    }
    return out;
  }
  /* rim */
  const out = len(0.08);
  for (let i = 0; i < out.length; i += 1) {
    const t = i / rate;
    out[i] = (Math.sin(2 * Math.PI * 1700 * t) * 0.6 + noise(i) * 0.25) * Math.exp(-t * 60);
  }
  return out;
}

/** The beat as samples: `bars` bars at `bpm`, every hit mixed in, held under -1 dB. */
export function renderBeat(beat: Beat, bpm: number, rate = RATE): Float32Array {
  const bar = stepSeconds(bpm) * STEPS;
  const bars = Math.max(1, Math.min(64, Math.round(beat.bars)));
  const out = new Float32Array(Math.ceil((bar * bars + 0.7) * rate));
  const sounds = new Map<SoundId, Float32Array>();
  for (const sound of SOUNDS) {
    const steps = beat.pattern[sound] ?? [];
    if (!steps.some((one) => one > 0)) continue;
    const one = sounds.get(sound) ?? hit(sound, rate);
    sounds.set(sound, one);
    for (let b = 0; b < bars; b += 1) {
      steps.forEach((hard, step) => {
        if (!(hard > 0)) return;
        const start = Math.round((b * bar + stepAt(step, bpm, beat.swing)) * rate);
        const gain = Math.min(1, hard);
        for (let i = 0; i < one.length && start + i < out.length; i += 1) out[start + i] += one[i] * gain;
      });
    }
  }
  let top = 0;
  for (let i = 0; i < out.length; i += 1) top = Math.max(top, Math.abs(out[i]));
  const ceiling = 10 ** (-1 / 20);
  if (top > ceiling) for (let i = 0; i < out.length; i += 1) out[i] *= ceiling / top;
  return out;
}

/** How long a beat plays on the session's clock: whole bars, without the last hit's tail. */
export const beatSeconds = (beat: Beat, bpm: number): number => stepSeconds(bpm) * STEPS * Math.max(1, Math.round(beat.bars));
