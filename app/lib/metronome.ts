'use client';

/**
 * The click.
 *
 * ── Why it is scheduled rather than played ───────────────────────────────
 *
 * `setInterval` fires when the browser gets round to it, which on a busy tab
 * is tens of milliseconds late and never the same amount twice. A metronome
 * built on it wanders, and a take recorded against a wandering click is a take
 * that will not line up with anything afterwards.
 *
 * So nothing here plays a sound when the timer fires. The timer only looks
 * ahead — every hundred milliseconds it asks `clicksIn` for the next quarter
 * second of clicks and hands them to the audio clock, which is sample-accurate
 * and does not care that the timer was late. This is the standard shape and it
 * is standard because every other shape drifts.
 *
 * ── And why the window is half-open ──────────────────────────────────────
 *
 * Each pass schedules `[now, now + look)`. A closed interval would emit the
 * click on the boundary in this pass and again in the next one — two clicks a
 * few milliseconds apart, which is a flam. `clicksIn` is half-open for exactly
 * this and `check:tempo` pins it.
 */

import { clicksIn, type DivisionId, type Meter } from './tempo';

/** How far ahead to schedule, and how often to look. */
const LOOK = 0.25;
const EVERY = 100;

export interface Voice {
  readonly hz: number;
  readonly gain: number;
}

/**
 * Three weights, so a bar is countable by ear.
 *
 * Without the difference a musician cannot tell where they are in the bar,
 * which is most of what a metronome is for — the pulse alone is a ticking
 * clock, not a count.
 */
const DOWNBEAT: Voice = { hz: 1600, gain: 1 };
const BEAT: Voice = { hz: 1000, gain: 0.7 };
const SUB: Voice = { hz: 800, gain: 0.35 };

export class Metronome {
  private readonly ctx: AudioContext;
  private readonly out: GainNode;
  private timer: number | null = null;
  /** The audio-clock time that session second zero corresponds to. */
  private origin = 0;
  private upTo = 0;
  private meter: Meter | null = null;
  private division: DivisionId = '1/1';

  constructor(ctx: AudioContext, destination?: AudioNode) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0.5;
    this.out.connect(destination ?? ctx.destination);
  }

  /** −∞ to 0 dB, as the panel shows it. */
  setVolume(db: number): void {
    const level = db <= -40 ? 0 : 10 ** (db / 20);
    this.out.gain.setTargetAtTime(level, this.ctx.currentTime, 0.01);
  }

  /**
   * Run from a moment on the session clock.
   *
   * `origin` is the audio-clock time of session second zero — which is how the
   * click and the lanes stay on one clock even though one is scheduled ahead
   * and the other was started once.
   */
  start(meter: Meter, division: DivisionId, origin: number, from: number): void {
    this.stop();
    this.meter = meter;
    this.division = division;
    this.origin = origin;
    this.upTo = from;
    this.tick();
    this.timer = window.setInterval(() => this.tick(), EVERY);
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Count in, in audio-clock time rather than session time.
   *
   * A count-in happens before the session starts, so it has no position on the
   * session clock at all — asking for "bar minus one" is a question the rest of
   * this file deliberately cannot answer. It is scheduled directly instead.
   */
  countIn(meter: Meter, bars: number, until: number): void {
    if (bars <= 0) return;
    const beat = 60 / meter.bpm;
    const total = bars * meter.beats;
    for (let n = 0; n < total; n += 1) {
      const at = until - (total - n) * beat;
      if (at <= this.ctx.currentTime) continue;
      this.hit(at, n % meter.beats === 0 ? DOWNBEAT : BEAT);
    }
  }

  private tick(): void {
    if (!this.meter) return;
    const ahead = this.ctx.currentTime - this.origin + LOOK;
    if (ahead <= this.upTo) return;
    for (const click of clicksIn(this.upTo, ahead, this.meter, this.division)) {
      this.hit(this.origin + click.at, click.downbeat ? DOWNBEAT : click.onBeat ? BEAT : SUB);
    }
    this.upTo = ahead;
  }

  /**
   * One click: a short tone with a fast decay.
   *
   * Not a sample. A file would have to be fetched, decoded and kept somewhere,
   * and would be one more thing that can fail to load in the moment somebody
   * presses record. Two nodes and an envelope cost nothing and always work.
   */
  private hit(at: number, voice: Voice): void {
    const tone = this.ctx.createOscillator();
    const level = this.ctx.createGain();
    tone.frequency.value = voice.hz;
    /* A hard start on a sine is a click of its own — the discontinuity, not
       the note. The two-millisecond ramp is what makes it a tick rather than
       a pop. */
    level.gain.setValueAtTime(0, at);
    level.gain.linearRampToValueAtTime(voice.gain, at + 0.002);
    level.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    tone.connect(level).connect(this.out);
    tone.start(at);
    tone.stop(at + 0.06);
  }

  close(): void {
    this.stop();
    try {
      this.out.disconnect();
    } catch {
      // Already gone with the context.
    }
  }
}
