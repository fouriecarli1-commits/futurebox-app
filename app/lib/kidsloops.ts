/**
 * The loop cards in the music door, and the loop each one builds.
 *
 * From Google's "Create Music Studio" page, 13 October 2026: four picture
 * cards — Dino Stomp, Cosmic Disco, Hero March, Sparkle Dreams. They each
 * played one short tune on one oscillator, round and round, and that was
 * all. The owner, 15 October 2026, looking at them: *"Dit sal cool wees as die
 * funksie regtig loops bou."*
 *
 * So a card now builds a loop the way a loop is built: four layers — drums,
 * bass, the tune, sparkles — on one sixteen-step clock, joining one at a time
 * so a child hears and sees the thing assemble itself. Once it is built each
 * layer can be switched off and on, the whole thing mixed up into a new
 * version of itself, sped up or slowed down, and carried into the beat
 * machine to be changed square by square.
 *
 * Every sound is drawn on the browser's own oscillators and noise, through
 * one analyser, so the bars under the cards are the music. Costs nothing and
 * sends nothing: a loop a six-year-old builds forty times is forty loops and
 * no request.
 */
import { soundContext, STEPS as BEAT_STEPS, type Beat } from './kidsbeat';

/** Sixteen eighth notes: two bars, long enough to be a loop and short enough to hear go round. */
export const LOOP_STEPS = 16;

export type LayerId = 'drums' | 'bass' | 'tune' | 'sparkle';

export interface Layer {
  readonly id: LayerId;
  readonly icon: string;
  readonly says: readonly [string, string];
}

/** In the order they join. */
export const LAYERS: readonly Layer[] = [
  { id: 'drums', icon: '🥁', says: ['kids.layerDrums', 'Drums'] },
  { id: 'bass', icon: '🎸', says: ['kids.layerBass', 'Bass'] },
  { id: 'tune', icon: '🎹', says: ['kids.layerTune', 'Tune'] },
  { id: 'sparkle', icon: '✨', says: ['kids.layerSparkle', 'Sparkles'] },
];

/** The drums, as three lines of `x` and `-`, sixteen long. */
export interface Drums {
  readonly kick: string;
  readonly snare: string;
  readonly hat: string;
}

export interface Loop {
  readonly id: string;
  readonly icon: string;
  readonly says: readonly [string, string];
  readonly note: readonly [string, string];
  readonly bpm: number;
  readonly drums: Drums;
  /** Hertz per step; nought is a rest. */
  readonly bass: readonly number[];
  readonly tune: readonly number[];
  readonly sparkle: readonly number[];
  readonly tuneWave: OscillatorType;
  readonly bassWave: OscillatorType;
}

/* Notes by name, so the patterns below read as music. */
const N = {
  A1: 55.0, C2: 65.41, D2: 73.42, Eb2: 77.78, F2: 87.31, G2: 98.0, A2: 110.0,
  C3: 130.81, D3: 146.83, E3: 164.81, G3: 196.0, A3: 220.0,
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, C6: 1046.5, E6: 1318.51,
} as const;
const _ = 0;

export const LOOPS: readonly Loop[] = [
  {
    id: 'dino', icon: '🦖', says: ['kids.loopDino', 'Dino Stomp'], note: ['kids.loopDinoNote', 'Heavy rock bass beat'],
    bpm: 100, tuneWave: 'sawtooth', bassWave: 'sawtooth',
    drums: { kick: 'x---x---x-x-x---', snare: '----x-------x---', hat: 'x-x-x-x-x-x-x-x-' },
    bass: [N.C2, _, N.C2, _, N.Eb2, _, N.C2, _, N.G2, _, N.F2, _, N.Eb2, _, N.D2, _],
    tune: [N.C3, N.D3, N.E3, N.C3, N.G3, _, N.C3, _, N.C3, N.D3, N.E3, N.C3, N.A3, _, N.G3, _],
    sparkle: [_, _, _, _, _, _, _, N.C5, _, _, _, _, _, _, _, N.G4],
  },
  {
    id: 'space', icon: '🚀', says: ['kids.loopSpace', 'Cosmic Disco'], note: ['kids.loopSpaceNote', 'Glow synth and laser pop'],
    bpm: 120, tuneWave: 'triangle', bassWave: 'square',
    drums: { kick: 'x---x---x---x---', snare: '----x-------x---', hat: '--x---x---x---x-' },
    bass: [N.C3, N.C4, N.C3, N.C4, N.A2, N.A3, N.A2, N.A3, N.F2, N.F2, N.F2, N.F2, N.G2, N.G2, N.G2, N.G2],
    tune: [N.C4, N.E4, N.G4, N.C5, N.G4, N.E4, _, _, N.A4, N.C5, N.A4, N.G4, N.E4, _, N.G4, _],
    sparkle: [_, _, _, N.E6, _, _, _, _, _, _, _, N.E6, _, _, N.C6, _],
  },
  {
    id: 'hero', icon: '🦸', says: ['kids.loopHero', 'Hero March'], note: ['kids.loopHeroNote', 'Fast upbeat adventure'],
    bpm: 132, tuneWave: 'square', bassWave: 'triangle',
    drums: { kick: 'x---x---x---x---', snare: '--x---x---xx-xxx', hat: 'xxxxxxxxxxxxxxxx' },
    bass: [N.A1, _, N.A2, _, N.A1, _, N.A2, _, N.F2, _, N.F2, _, N.G2, _, N.G2, _],
    tune: [N.A3, N.A3, N.C4, N.E4, N.A4, _, N.E4, N.C4, N.D4, N.D4, N.E4, N.G4, N.A4, _, _, _],
    sparkle: [N.A5, _, _, _, _, _, _, _, N.E5, _, _, _, N.A5, _, _, _],
  },
  {
    id: 'magic', icon: '🦄', says: ['kids.loopMagic', 'Sparkle Dreams'], note: ['kids.loopMagicNote', 'Sweet bell melody'],
    bpm: 90, tuneWave: 'sine', bassWave: 'sine',
    drums: { kick: 'x-------x-------', snare: '----------------', hat: '--x---x---x---x-' },
    bass: [N.C3, _, _, _, N.A2, _, _, _, N.F2, _, _, _, N.G2, _, _, _],
    tune: [N.C5, N.E5, N.G5, N.C6, N.G5, N.E5, _, _, N.A5, N.G5, N.E5, N.D5, N.C5, _, _, _],
    sparkle: [_, _, N.E6, _, _, _, N.C6, _, _, _, N.E6, _, _, _, N.G5, _],
  },
];

/** How many bars the visualiser draws. */
export const BARS = 32;

/** Half a beat a step. */
export const loopStepMs = (bpm: number): number => (60 / bpm / 2) * 1000;

/** How many steps pass before the next layer joins: half a loop. */
export const JOIN_EVERY = LOOP_STEPS / 2;

/** A small seeded random, so "mix it up" can be checked against a known answer. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The same loop, mixed up: a new version of itself, not a different one.
 *
 * The tune keeps its notes and rearranges some of them, the sparkles move,
 * and the hi-hat gains or loses a few hits. The kick, the snare and the bass
 * stay where they were, because they are what makes it still sound like
 * Dino Stomp rather than like noise.
 */
export function mixUp(loop: Loop, pick: () => number = Math.random): Loop {
  const notes = loop.tune.filter((hz) => hz > 0);
  const tune = loop.tune.map((hz) => (hz > 0 && pick() < 0.4 ? notes[Math.floor(pick() * notes.length)] : hz));
  const sparkle: number[] = loop.sparkle.map(() => _);
  for (const hz of loop.sparkle.filter((one) => one > 0)) sparkle[Math.floor(pick() * LOOP_STEPS)] = hz;
  const hat = loop.drums.hat.split('').map((one) => (pick() < 0.2 ? (one === 'x' ? '-' : 'x') : one)).join('');
  return { ...loop, tune, sparkle, drums: { ...loop.drums, hat } };
}

/** Whether a layer plays anything on a step — what the builder lights. */
export function hitsOn(loop: Loop, layer: LayerId, at: number): boolean {
  if (layer === 'drums') return loop.drums.kick[at] === 'x' || loop.drums.snare[at] === 'x' || loop.drums.hat[at] === 'x';
  return loop[layer][at] > 0;
}

/**
 * The loop, put into the beat machine's eight squares a line.
 *
 * The beat machine is eight steps and five lines with one note each, so this
 * is the loop's first bar in that shape: the drums as they are, the tune and
 * the bass as "something plays here". The machine then lets a child change
 * it square by square, which is the thing the loop builder does not do.
 */
export function asBeat(loop: Loop): Beat {
  const line = (on: (at: number) => boolean): boolean[] => Array.from({ length: BEAT_STEPS }, (_x, at) => on(at));
  return {
    kick: line((at) => loop.drums.kick[at] === 'x'),
    snare: line((at) => loop.drums.snare[at] === 'x'),
    hihat: line((at) => loop.drums.hat[at] === 'x'),
    high: line((at) => loop.tune[at] > 0),
    low: line((at) => loop.bass[at] > 0),
  };
}

type Listener = () => void;

/**
 * The builder: one loop at a time, on one clock, layer by layer.
 *
 * `joined` is how many of `LAYERS` have come in so far; a new one joins every
 * `JOIN_EVERY` steps until all four are there. `off` is the layers a child
 * has switched off. `step` is the step that just sounded, or -1.
 */
export class LoopBuilder {
  loop: Loop | null = null;
  bpm = 110;
  step = -1;
  joined = 0;
  off = new Set<LayerId>();
  private sinceJoin = 0;
  private next = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private analyser: AnalyserNode | null = null;
  private out: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private readonly data = new Uint8Array(64);
  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private tell(): void { this.listeners.forEach((fn) => fn()); }

  get building(): boolean { return this.loop !== null && this.joined < LAYERS.length; }

  isIn(layer: LayerId): boolean {
    return LAYERS.findIndex((one) => one.id === layer) < this.joined;
  }

  start(loop: Loop): void {
    this.stop();
    if (!this.wire()) return;
    this.loop = loop;
    this.bpm = loop.bpm;
    this.joined = 1;
    this.sinceJoin = 0;
    this.off = new Set();
    this.next = 0;
    this.tick();
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.loop = null;
    this.step = -1;
    this.joined = 0;
    this.tell();
  }

  /** Switch one layer off or on. A layer that has not joined yet joins now. */
  toggle(layer: LayerId): void {
    if (!this.loop) return;
    const at = LAYERS.findIndex((one) => one.id === layer);
    if (at >= this.joined) { this.joined = at + 1; this.off.delete(layer); } else if (this.off.has(layer)) this.off.delete(layer);
    else this.off.add(layer);
    this.tell();
  }

  /** All four in at once, for a child who does not want to wait. */
  buildNow(): void {
    if (!this.loop) return;
    this.joined = LAYERS.length;
    this.tell();
  }

  /** A new version of the loop that is playing, without stopping it. */
  mix(pick: () => number = Math.random): void {
    if (!this.loop) return;
    this.loop = mixUp(this.loop, pick);
    this.tell();
  }

  setBpm(bpm: number): void {
    this.bpm = Math.min(170, Math.max(70, Math.round(bpm)));
    this.tell();
  }

  /** The bars, nought to one each, from the sound that is really playing. */
  levels(): number[] {
    if (!this.analyser) return new Array<number>(BARS).fill(0);
    this.analyser.getByteFrequencyData(this.data);
    const out: number[] = [];
    for (let i = 0; i < BARS; i += 1) out.push(this.data[Math.min(this.data.length - 1, i * 2)] / 255);
    return out;
  }

  private wire(): boolean {
    const ctx = soundContext();
    if (!ctx) return false;
    if (!this.analyser || !this.out) {
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.6;
      this.out = ctx.createGain();
      this.out.gain.value = 0.4;
      this.out.connect(this.analyser).connect(ctx.destination);
      const length = Math.floor(ctx.sampleRate * 0.2);
      this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
      const samples = this.noise.getChannelData(0);
      for (let i = 0; i < length; i += 1) samples[i] = Math.random() * 2 - 1;
    }
    return true;
  }

  private tick = (): void => {
    const loop = this.loop;
    if (!loop) return;
    const at = this.next;
    const plays = (layer: LayerId): boolean => this.isIn(layer) && !this.off.has(layer);
    if (plays('drums')) {
      if (loop.drums.kick[at] === 'x') this.kick();
      if (loop.drums.snare[at] === 'x') this.snare();
      if (loop.drums.hat[at] === 'x') this.hat();
    }
    if (plays('bass') && loop.bass[at] > 0) this.tone(loop.bass[at], loop.bassWave, 0.5, 0.9);
    if (plays('tune') && loop.tune[at] > 0) this.tone(loop.tune[at], loop.tuneWave, 0.3, 0.8);
    if (plays('sparkle') && loop.sparkle[at] > 0) this.tone(loop.sparkle[at], 'sine', 0.25, 2.5);
    this.step = at;
    this.next = (at + 1) % LOOP_STEPS;
    this.sinceJoin += 1;
    if (this.joined < LAYERS.length && this.sinceJoin >= JOIN_EVERY) {
      this.joined += 1;
      this.sinceJoin = 0;
    }
    this.tell();
    this.timer = setTimeout(this.tick, loopStepMs(this.bpm));
  };

  /* ── The sounds, all into one analyser ─────────────────────────────── */

  private tone(hz: number, wave: OscillatorType, level: number, length: number): void {
    const ctx = soundContext();
    if (!ctx || !this.out) return;
    const at = ctx.currentTime;
    const seconds = (loopStepMs(this.bpm) / 1000) * length;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = hz;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    osc.connect(gain).connect(this.out);
    osc.start(at);
    osc.stop(at + seconds + 0.02);
  }

  private kick(): void {
    const ctx = soundContext();
    if (!ctx || !this.out) return;
    const at = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, at);
    osc.frequency.exponentialRampToValueAtTime(40, at + 0.15);
    gain.gain.setValueAtTime(1, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.25);
    osc.connect(gain).connect(this.out);
    osc.start(at);
    osc.stop(at + 0.26);
  }

  private hiss(level: number, length: number, from: number): void {
    const ctx = soundContext();
    if (!ctx || !this.out || !this.noise) return;
    const at = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = from;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + length);
    src.connect(filter).connect(gain).connect(this.out);
    src.start(at);
    src.stop(at + length + 0.01);
  }

  private snare(): void { this.hiss(0.7, 0.16, 1200); this.tone(190, 'triangle', 0.3, 0.4); }

  private hat(): void { this.hiss(0.25, 0.05, 7000); }
}
