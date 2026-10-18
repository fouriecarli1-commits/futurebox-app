/**
 * The jam room's four pads — kick, snare, hi-hat and riser — made by this
 * browser's own oscillators, with no file fetched.
 *
 * Its own file since the looper (`lib/looper.ts`): the pads are pressed in
 * `LiveJam` and replayed, on the beat, by `JamLooper`, and both have to make
 * exactly the same sound. A pattern shared with the room is replayed by this
 * same function on every screen, which is why a pattern is the whole sound.
 */
import type { Pad } from './looper';

export type { Pad };

/**
 * One sound, out of nothing but oscillators and noise.
 *
 * `when` is a time on the AudioContext's clock — now for a press, a moment
 * in the next pass for the looper — and `into` is where it goes: the
 * speakers, or a layer's own volume so a muted layer goes quiet at once.
 */
export function hit(ctx: AudioContext, pad: Pad, when: number = ctx.currentTime, into: AudioNode = ctx.destination): void {
  const now = Math.max(when, ctx.currentTime);
  const out = ctx.createGain();
  out.connect(into);
  if (pad === 'kick') {
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
    out.gain.setValueAtTime(0.9, now);
    out.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(out); osc.start(now); osc.stop(now + 0.32);
    return;
  }
  if (pad === 'riser') {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 1.4);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(6000, now + 1.4);
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(0.35, now + 1.2);
    out.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc.connect(filter); filter.connect(out); osc.start(now); osc.stop(now + 1.5);
    return;
  }
  /* Snare and hi-hat are shaped noise. */
  const length = Math.floor(ctx.sampleRate * (pad === 'snare' ? 0.22 : 0.08));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = pad === 'snare' ? 'bandpass' : 'highpass';
  filter.frequency.value = pad === 'snare' ? 1800 : 7000;
  out.gain.setValueAtTime(pad === 'snare' ? 0.7 : 0.4, now);
  out.gain.exponentialRampToValueAtTime(0.001, now + (pad === 'snare' ? 0.2 : 0.07));
  noise.connect(filter); filter.connect(out); noise.start(now);
  if (pad === 'snare') {
    const tone = ctx.createOscillator();
    tone.frequency.setValueAtTime(190, now);
    const toneOut = ctx.createGain();
    toneOut.gain.setValueAtTime(0.4, now);
    toneOut.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    tone.connect(toneOut); toneOut.connect(into); tone.start(now); tone.stop(now + 0.13);
  }
}
