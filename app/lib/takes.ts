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

/**
 * The most columns anybody can ask for.
 *
 * A screen is two or three thousand pixels across at the very widest, so a
 * shape with more values than this has more detail than any drawing of it can
 * use. The ceiling is not a nicety: the caller works its count out from a
 * ratio, and a ratio with a very small number underneath it asks for
 * something no machine can allocate.
 */
const MOST = 20_000;

/**
 * A buffer's shape, for drawing. One value per column, 0–1.
 *
 * ── Why the count is clamped ─────────────────────────────────────────────
 *
 * Carli, 15 September 2026, with a photograph: the clip on her timeline was
 * a white rectangle with a broken-image glyph in it, which is exactly how
 * Chrome on Android draws a `<canvas>` whose backing store it has had to
 * throw away.
 *
 * `BoothTimeline`'s `Wave` asked for enough columns that the *visible window*
 * of a clip got one per pixel — `(whole / (cut.to - cut.from)) * width`.
 * That is the right idea and it has no floor under the divisor: a clip whose
 * window has collapsed makes the divisor 0.001, and on a three-minute song
 * that is a hundred and twenty-six million columns. `new Float32Array` of
 * that is half a gigabyte, the allocation fails on a phone, and the canvas
 * dies with it.
 *
 * Clamped here rather than only at the call site, because this function is
 * the one that allocates and a rule that lives next to the allocation is one
 * a second caller cannot forget.
 */
export function shapeOf(buffer: AudioBuffer, columns: number): Float32Array {
  const data = buffer.getChannelData(0);
  const want = Math.min(MOST, Math.max(8, Math.floor(columns) || 8));
  const per = Math.max(1, Math.floor(data.length / want));
  const out = new Float32Array(want);
  let loudest = 0;
  for (let column = 0; column < want; column += 1) {
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
  if (loudest > 0) for (let i = 0; i < want; i += 1) out[i] /= loudest;
  return out;
}
