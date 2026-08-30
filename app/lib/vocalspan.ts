'use client';

/**
 * Where the singing starts and stops, in a song nobody has separated.
 *
 * The words run ahead of the music because a generated song opens with a bar
 * or two before anybody sings, and the plan says the first verse begins at
 * zero. Once the voice has been separated this is not a problem — the phrases
 * are simply measured off it. But separating costs money and most songs have
 * not been, and those songs are exactly the ones somebody is trying to sing.
 *
 * The good news is that the hard question and the easy question are not the
 * same. *What is the melody* cannot be answered from a mix — a bass line under
 * it reads as the tune, and `app/lib/melody.ts` has the numbers. *When does
 * the voice come in* is far easier, because two things are true of nearly
 * every produced record: the lead vocal sits in the middle of the stereo
 * image, and it lives in a band the bass and the cymbals mostly do not.
 *
 * So this bandpasses the song around the voice, compares the middle of the
 * image against the sides, and calls the first sustained rise the entry. It is
 * an estimate and it is treated as one: the booth puts the number on a control
 * so a person can move it, which takes a second and always works.
 */

/** The band a sung voice mostly lives in. */
const LOW_HZ = 250;
const HIGH_HZ = 3200;
/** Long enough to ignore a snare, short enough to place an entry closely. */
const FRAME_S = 0.05;
/** Sound has to hold up for this long to count as somebody singing. */
const HOLD_S = 0.4;

export interface Span {
  readonly from: number;
  readonly to: number;
}

/** A two-pole bandpass, applied in place. Cheap, and steep enough to matter. */
function bandpass(samples: Float32Array, rate: number): Float32Array {
  const out = Float32Array.from(samples);
  // One-pole high-pass then one-pole low-pass, twice each: gentle, stable, and
  // no coefficient arithmetic to get subtly wrong.
  const highK = Math.exp((-2 * Math.PI * LOW_HZ) / rate);
  const lowK = Math.exp((-2 * Math.PI * HIGH_HZ) / rate);
  for (let pass = 0; pass < 2; pass += 1) {
    let previous = 0;
    let held = 0;
    for (let i = 0; i < out.length; i += 1) {
      const sample = out[i];
      held = highK * (held + sample - previous);
      previous = sample;
      out[i] = held;
    }
    let low = 0;
    for (let i = 0; i < out.length; i += 1) {
      low = low * lowK + out[i] * (1 - lowK);
      out[i] = low;
    }
  }
  return out;
}

export function vocalSpanOf(buffer: AudioBuffer): Span | null {
  const rate = buffer.sampleRate;
  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;

  const mid = new Float32Array(left.length);
  const side = new Float32Array(left.length);
  for (let i = 0; i < left.length; i += 1) {
    mid[i] = (left[i] + right[i]) / 2;
    side[i] = (left[i] - right[i]) / 2;
  }
  const midBand = bandpass(mid, rate);
  const sideBand = bandpass(side, rate);

  const frame = Math.max(1, Math.round(FRAME_S * rate));
  const count = Math.floor(left.length / frame);
  if (count < 8) return null;

  const presence = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    let middle = 0;
    let sides = 0;
    const from = i * frame;
    for (let j = 0; j < frame; j += 1) {
      middle += midBand[from + j] * midBand[from + j];
      sides += sideBand[from + j] * sideBand[from + j];
    }
    // What is in the middle and not at the sides. On a mono file there are no
    // sides, so this is simply how much is in the voice's band.
    presence[i] = Math.max(0, Math.sqrt(middle / frame) - Math.sqrt(sides / frame));
  }

  // A three-frame median, so one snare does not become an entry.
  const smooth = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const a = presence[Math.max(0, i - 1)];
    const b = presence[i];
    const c = presence[Math.min(count - 1, i + 1)];
    smooth[i] = Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
  }

  const sorted = Float32Array.from(smooth).sort();
  const loud = sorted[Math.floor(count * 0.95)];
  const quiet = sorted[Math.floor(count * 0.1)];
  if (!(loud > 0)) return null;
  // Between the quiet part of the song and its loudest: an intro with a band
  // playing is not silent, so a fraction of the peak alone would find the
  // downbeat rather than the singer.
  const line = quiet + (loud - quiet) * 0.45;

  const hold = Math.max(1, Math.round(HOLD_S / FRAME_S));
  let from = -1;
  for (let i = 0; i + hold <= count; i += 1) {
    let all = true;
    for (let j = 0; j < hold; j += 1) if (smooth[i + j] <= line) all = false;
    if (all) {
      from = i;
      break;
    }
  }
  if (from < 0) return null;

  let to = -1;
  for (let i = count - hold; i >= 0; i -= 1) {
    let all = true;
    for (let j = 0; j < hold; j += 1) if (smooth[i + j] <= line) all = false;
    if (all) {
      to = i + hold;
      break;
    }
  }
  if (to <= from) return null;

  // An entry in the first breath is no entry at all: the song simply starts
  // with the voice, and saying so is the same as saying nothing.
  const start = from * FRAME_S;
  const end = Math.min(buffer.duration, to * FRAME_S);
  if (end - start < 1) return null;
  return { from: start, to: end };
}
