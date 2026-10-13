/**
 * The loop cards in the music door: four tunes that play on the browser's
 * own oscillator when a card is pressed, and the lights that move with them.
 *
 * From Google's "Create Music Studio" page, 13 October 2026: four picture
 * cards — Dino Stomp, Cosmic Disco, Hero March, Sparkle Dreams — each a
 * short melody looping on a triangle wave, pressed to start and pressed to
 * stop. That part of the page is real and is kept exactly. The page's
 * visualiser moved its bars at random; this one reads the sound through an
 * analyser, so the bars are the music and go still when it stops.
 *
 * Costs nothing and sends nothing: a loop a six-year-old starts forty times
 * is forty oscillators and no request.
 */
import { soundContext } from './kidsbeat';

export interface Loop {
  readonly id: string;
  readonly icon: string;
  readonly says: readonly [string, string];
  readonly note: readonly [string, string];
  /** Frequencies in hertz, in order; nought is a rest. */
  readonly notes: readonly number[];
  /** Milliseconds a step lasts. */
  readonly step: number;
  readonly wave: OscillatorType;
}

export const LOOPS: readonly Loop[] = [
  { id: 'dino', icon: '🦖', says: ['kids.loopDino', 'Dino Stomp'], note: ['kids.loopDinoNote', 'Heavy rock bass beat'],
    notes: [130.81, 146.83, 164.81, 130.81, 196.0, 0, 130.81, 0], step: 220, wave: 'sawtooth' },
  { id: 'space', icon: '🚀', says: ['kids.loopSpace', 'Cosmic Disco'], note: ['kids.loopSpaceNote', 'Glow synth and laser pop'],
    notes: [261.63, 329.63, 392.0, 523.25, 392.0, 329.63], step: 200, wave: 'triangle' },
  { id: 'hero', icon: '🦸', says: ['kids.loopHero', 'Hero March'], note: ['kids.loopHeroNote', 'Fast upbeat adventure'],
    notes: [220.0, 220.0, 261.63, 329.63, 440.0, 0, 329.63, 261.63], step: 180, wave: 'square' },
  { id: 'magic', icon: '🦄', says: ['kids.loopMagic', 'Sparkle Dreams'], note: ['kids.loopMagicNote', 'Sweet bell melody'],
    notes: [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25], step: 240, wave: 'sine' },
];

/** How many bars the visualiser draws. */
export const BARS = 32;

/**
 * One player for the door. Starts a loop, stops it, and owns the analyser
 * the visualiser reads. Stopping clears the interval, so a card left
 * playing is silenced the moment the door is left.
 */
export class LoopPlayer {
  private timer: number | null = null;
  private analyser: AnalyserNode | null = null;
  private out: GainNode | null = null;
  private readonly data = new Uint8Array(64);
  playing: string | null = null;

  private wire(): { ctx: AudioContext; out: GainNode; analyser: AnalyserNode } | null {
    const ctx = soundContext();
    if (!ctx) return null;
    if (!this.analyser || !this.out) {
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.6;
      this.out = ctx.createGain();
      this.out.gain.value = 0.35;
      this.out.connect(this.analyser).connect(ctx.destination);
    }
    return { ctx, out: this.out, analyser: this.analyser };
  }

  start(loop: Loop): void {
    this.stop();
    const wired = this.wire();
    if (!wired) return;
    const { ctx, out } = wired;
    let step = 0;
    const tick = (): void => {
      const hz = loop.notes[step % loop.notes.length];
      step += 1;
      if (hz <= 0) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = loop.wave;
      osc.frequency.value = hz;
      const at = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.8, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + loop.step / 1000 * 0.9);
      osc.connect(gain).connect(out);
      osc.start(at);
      osc.stop(at + loop.step / 1000);
    };
    tick();
    this.timer = window.setInterval(tick, loop.step);
    this.playing = loop.id;
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.playing = null;
  }

  /** The bars, nought to one each, from the sound that is really playing. */
  levels(): number[] {
    if (!this.analyser) return new Array<number>(BARS).fill(0);
    this.analyser.getByteFrequencyData(this.data);
    const out: number[] = [];
    for (let i = 0; i < BARS; i += 1) out.push(this.data[Math.min(this.data.length - 1, i * 2)] / 255);
    return out;
  }
}
