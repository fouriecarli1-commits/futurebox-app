'use client';

/**
 * Punching in: re-recording a piece of a take without losing the rest.
 *
 * This is the difference between a recording screen and a record button. Nobody
 * sings three minutes without one line going wrong, and being made to start
 * again from the top for a bad word is why people give up on the second take.
 *
 * The whole trick is the crossfade. Cutting straight from one recording to
 * another leaves a click — two waveforms meeting at different points in their
 * cycle is a step, and a step is a click. Twenty milliseconds of fade either
 * side is short enough that nobody hears a fade and long enough that nobody
 * hears a join.
 */

/** Twenty milliseconds. Long enough to hide a join, short enough to hide itself. */
const FADE = 0.02;

function context(): typeof AudioContext | null {
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
    null
  );
}

/** An empty buffer of a given length, to build a take into. */
function blank(rate: number, seconds: number, channels: number): AudioBuffer | null {
  const Ctx = context();
  if (!Ctx) return null;
  const ctx = new Ctx();
  const made = ctx.createBuffer(channels, Math.max(1, Math.ceil(seconds * rate)), rate);
  void ctx.close();
  return made;
}

/**
 * A take with one region replaced by a newer recording.
 *
 * `at` is where the new piece belongs on the song's clock, not on the new
 * recording's own — the punch-in is recorded against the backing, so it starts
 * wherever the singer punched in, and that is the offset it has to land at.
 */
export function spliceTake(
  original: AudioBuffer | null,
  piece: AudioBuffer,
  at: number,
  totalSeconds: number,
): AudioBuffer | null {
  const rate = piece.sampleRate;
  const channels = Math.max(1, original?.numberOfChannels ?? piece.numberOfChannels);
  const out = blank(rate, Math.max(totalSeconds, at + piece.duration), channels);
  if (!out) return null;

  const start = Math.max(0, Math.round(at * rate));
  const fade = Math.round(FADE * rate);

  for (let c = 0; c < channels; c += 1) {
    const target = out.getChannelData(c);

    // Everything that was there before.
    if (original && c < original.numberOfChannels) {
      const from = original.getChannelData(c);
      const copy = Math.min(from.length, target.length);
      for (let i = 0; i < copy; i += 1) target[i] = from[i];
    }

    const source = piece.getChannelData(Math.min(c, piece.numberOfChannels - 1));
    for (let i = 0; i < source.length; i += 1) {
      const at_ = start + i;
      if (at_ >= target.length) break;
      // Fade the new piece in at its head and out at its tail, and fade what
      // was underneath in the opposite direction, so the two sum to one.
      let mix = 1;
      if (i < fade) mix = i / fade;
      else if (i > source.length - fade) mix = Math.max(0, (source.length - i) / fade);
      target[at_] = source[i] * mix + target[at_] * (1 - mix);
    }
  }

  return out;
}

/** Samples straight out of a recorded blob, at the backing's own rate. */
export async function decodeAt(blob: Blob, rate: number): Promise<AudioBuffer | null> {
  const Ctx = context();
  if (!Ctx) return null;
  // Decoded into a context running at the backing's rate, so the two never
  // need resampling later — a mismatch there is a take that drifts.
  const ctx = new Ctx({ sampleRate: rate });
  try {
    return await ctx.decodeAudioData(await blob.arrayBuffer());
  } catch {
    return null;
  } finally {
    void ctx.close();
  }
}

/** A buffer's shape, for drawing. One value per column, 0–1. */
export function shapeOf(buffer: AudioBuffer, columns: number): Float32Array {
  const data = buffer.getChannelData(0);
  const per = Math.max(1, Math.floor(data.length / columns));
  const out = new Float32Array(columns);
  let loudest = 0;
  for (let column = 0; column < columns; column += 1) {
    let peak = 0;
    const from = column * per;
    const to = Math.min(data.length, from + per);
    for (let i = from; i < to; i += 1) {
      const size = data[i] < 0 ? -data[i] : data[i];
      if (size > peak) peak = size;
    }
    out[column] = peak;
    if (peak > loudest) loudest = peak;
  }
  if (loudest > 0) for (let i = 0; i < columns; i += 1) out[i] /= loudest;
  return out;
}
