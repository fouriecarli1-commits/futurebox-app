'use client';

/**
 * The band behind the drum game: an electric guitar and a bass, and no drums
 * — the child is the drummer.
 *
 * The owner, 19 October 2026: *"Daar moet lekker musiek met elektric guitar
 * byvoorbeeld speel, en die push van die buttons is die dromme."* Drawn by the
 * browser, so it costs nothing to play and plays on a phone with no signal:
 * power chords (root, fifth, octave) on two slightly detuned saws each, through
 * a fuzz and a tone control, chugged on the eighths; a round bass on the beat;
 * and a count of four on a woodblock first. Everything is scheduled on the
 * sound clock up front, so the band never drifts from the notes on the screen.
 */

import { soundContext, playSound } from './kidsbeat';
import { BARS, COUNT_IN, eighthMs, type DrumSong, type Lane } from './kidsdrums';

const hz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

/** A fuzz: a soft clip that turns a saw into a guitar through an amp. */
function fuzz(ctx: AudioContext): WaveShaperNode {
  const shaper = ctx.createWaveShaper();
  const samples = 1024;
  const curve = new Float32Array(samples);
  const drive = 28;
  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + drive) * x * 20 * (Math.PI / 180)) / (Math.PI + drive * Math.abs(x));
  }
  shaper.curve = curve;
  shaper.oversample = '4x';
  return shaper;
}

export interface Band {
  /** The sound clock's time of the first note after the count-in. */
  readonly start: number;
  /** When the last bar ends, on the same clock. */
  readonly end: number;
  readonly stop: () => void;
}

/** Start the band. `null` where the browser has no sound. */
export function startBand(song: DrumSong): Band | null {
  const ctx = soundContext();
  if (!ctx) return null;
  const eighth = eighthMs(song.bpm) / 1000;
  const begin = ctx.currentTime + 0.15;
  const start = begin + COUNT_IN * eighth;
  const end = start + BARS * 8 * eighth;
  const made: AudioScheduledSourceNode[] = [];

  const out = ctx.createGain();
  out.gain.value = 0.55;
  out.connect(ctx.destination);

  /* The guitar's amp: fuzz, then the tone knob turned down a little. */
  const amp = fuzz(ctx);
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2600;
  const level = ctx.createGain();
  level.gain.value = 0.22;
  amp.connect(tone);
  tone.connect(level);
  level.connect(out);

  /* Count-in: four woodblock clicks, the first a little higher. */
  for (let beat = 0; beat < COUNT_IN / 2; beat += 1) {
    const at = begin + beat * 2 * eighth;
    const click = ctx.createOscillator();
    const env = ctx.createGain();
    click.type = 'square';
    click.frequency.value = beat === 0 ? 1600 : 1200;
    env.gain.setValueAtTime(0.25, at);
    env.gain.exponentialRampToValueAtTime(0.001, at + 0.05);
    click.connect(env);
    env.connect(out);
    click.start(at);
    click.stop(at + 0.06);
    made.push(click);
  }

  for (let bar = 0; bar < BARS; bar += 1) {
    const root = song.chords[bar % song.chords.length];
    for (let step = 0; step < 8; step += 1) {
      const at = start + (bar * 8 + step) * eighth;
      /* Bass on the beat. */
      if (step % 2 === 0) {
        const bass = ctx.createOscillator();
        const env = ctx.createGain();
        bass.type = 'triangle';
        bass.frequency.value = hz(root - 12);
        env.gain.setValueAtTime(0.0001, at);
        env.gain.exponentialRampToValueAtTime(0.5, at + 0.01);
        env.gain.exponentialRampToValueAtTime(0.001, at + eighth * 1.8);
        bass.connect(env);
        env.connect(out);
        bass.start(at);
        bass.stop(at + eighth * 2);
        made.push(bass);
      }
      if (!song.strum[step]) continue;
      /* A power chord, chugged — and the bar's last one left to ring. */
      const ring = step === 7 || (bar === BARS - 1 && step >= 6);
      const length = ring ? eighth * 2.5 : eighth * 0.8;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, at);
      env.gain.exponentialRampToValueAtTime(1, at + 0.008);
      env.gain.exponentialRampToValueAtTime(0.001, at + length);
      env.connect(amp);
      for (const interval of [0, 7, 12]) {
        for (const detune of [-7, 7]) {
          const saw = ctx.createOscillator();
          saw.type = 'sawtooth';
          saw.frequency.value = hz(root + interval);
          saw.detune.value = detune;
          saw.connect(env);
          saw.start(at);
          saw.stop(at + length + 0.02);
          made.push(saw);
        }
      }
    }
  }

  return {
    start,
    end,
    stop: () => {
      const now = ctx.currentTime;
      out.gain.setTargetAtTime(0, now, 0.05);
      for (const one of made) {
        try { one.stop(now + 0.2); } catch { /* already stopped */ }
      }
      setTimeout(() => out.disconnect(), 400);
    },
  };
}

/** The sound clock now, in seconds. */
export function clock(): number {
  return soundContext()?.currentTime ?? performance.now() / 1000;
}

/** A pad pressed: its drum, now. */
export function drum(lane: Lane): void {
  playSound(lane === 'kick' ? 'kick' : lane === 'snare' ? 'snare' : 'hihat');
}
