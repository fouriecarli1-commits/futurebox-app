'use client';

/**
 * Singing it slowly and keeping it at the right speed.
 *
 * Some songs are too fast to keep up with the first few times you sing them.
 * The booth can slow the backing down — a browser plays audio slower without
 * dropping its pitch, so the song stays in the same key while it moves at
 * three-quarter speed — but a take sung against a slowed song is itself slow,
 * and mixing that into the finished song would be a slow vocal over a
 * full-speed track.
 *
 * So the take is pulled back to speed afterwards. Not by playing it faster,
 * which would raise the pitch and undo the point of slowing down in the first
 * place, but by the same method the tuner uses in the other direction: the
 * signal is cut at its own pitch periods and those pieces are laid back down
 * closer together in time. The periods themselves are unchanged, so the pitch
 * is unchanged; there are simply fewer of them in the same second.
 *
 * It is not free. Squeezing a quarter out of a recording leaves some smearing
 * on consonants, which is why the booth says what the speed control costs
 * rather than presenting it as a free lunch.
 */

import { HOP_S, pitchTrack } from './tune';

/** The period used where there is no pitch, so unvoiced sound passes through. */
const UNVOICED_HZ = 200;

/**
 * The same audio, `factor` times as long, at the same pitch.
 *
 * Below one it gets shorter — which is the direction that matters here, since
 * a take sung at three-quarter speed is four-thirds too long and has to come
 * back by three-quarters.
 */
export function stretch(samples: Float32Array, rate: number, factor: number): Float32Array {
  if (!(factor > 0) || Math.abs(factor - 1) < 0.001 || samples.length < 2048) return samples;

  const hop = Math.max(1, Math.round(HOP_S * rate));
  const f0 = pitchTrack(samples, rate, hop).hz;
  const frames = f0.length;
  const frameOf = (index: number): number =>
    Math.min(frames - 1, Math.max(0, Math.round(index / hop)));
  const periodAt = (index: number): number => {
    const hz = f0[frameOf(index)];
    return hz > 0 ? rate / hz : rate / UNVOICED_HZ;
  };

  // Marks one measured period apart, exactly, all the way through. The reason
  // the spacing has to be exact rather than snapped to the loudest sample is
  // written out in app/lib/tune.ts, where getting it wrong dropped a note by
  // an octave and a half.
  const marks: number[] = [];
  let p = 0;
  while (p < samples.length) {
    marks.push(Math.round(p));
    p += Math.max(8, periodAt(p));
  }
  if (marks.length < 2) return samples;

  const out = new Float32Array(Math.max(1, Math.round(samples.length * factor)));
  let q = 0;
  let k = 0;
  while (q < out.length) {
    // Where in the original this moment of the output comes from.
    const source = q / factor;
    while (k + 1 < marks.length && Math.abs(marks[k + 1] - source) <= Math.abs(marks[k] - source)) k += 1;
    const mark = marks[k];
    const period = Math.max(8, periodAt(mark));
    const half = Math.max(8, Math.round(period));
    const centre = Math.round(q);
    for (let j = -half; j <= half; j += 1) {
      const from = mark + j;
      const to = centre + j;
      if (from < 0 || from >= samples.length) continue;
      if (to < 0 || to >= out.length) continue;
      // Hann across two periods: at this spacing the pieces sum back to one.
      out[to] += samples[from] * (0.5 - 0.5 * Math.cos((Math.PI * (j + half)) / half));
    }
    q += period;
  }
  return out;
}

/** The same on a buffer the browser can play. Mono, like the take itself. */
export function stretchBuffer(buffer: AudioBuffer, factor: number): AudioBuffer | null {
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  const pulled = stretch(buffer.getChannelData(0), buffer.sampleRate, factor);
  const ctx = new Ctx();
  const made = ctx.createBuffer(1, pulled.length, buffer.sampleRate);
  made.getChannelData(0).set(pulled);
  void ctx.close();
  return made;
}
