'use client';

/**
 * What note is being sung, right now.
 *
 * This is here instead of sheet music, and the reason is worth stating: the
 * app has no score. ElevenLabs returns audio, not notes, so there is nothing
 * to engrave. Working notation back out of a finished mix means transcribing a
 * melody from under drums and bass, which is unreliable enough that a stave
 * drawn from it would be confidently wrong — and a singer following a wrong
 * stave is worse off than one following nothing.
 *
 * What can be done honestly, and is more use to somebody singing: measure the
 * pitch of a monophonic signal in real time. That answers the question a
 * singer actually has — "am I on it?" — rather than the question notation
 * answers, which is "what am I meant to sing?", and which the words and the
 * backing already answer.
 *
 * The method is autocorrelation, which is old, cheap and good enough for a
 * voice. It is not good on a chord, and nothing here pretends otherwise: the
 * clarity figure comes back with every reading so the screen can stay quiet
 * when it is unsure rather than jitter through notes nobody sang.
 */

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** A voice lives here. Looking outside it finds octave errors, not notes. */
const MIN_HZ = 70;
const MAX_HZ = 1100;

export interface Reading {
  readonly hz: number;
  /** 0–1. Below about 0.9 the reading is not worth showing. */
  readonly clarity: number;
}

/**
 * The fundamental frequency of a buffer, or null when there is not one.
 *
 * Normalised autocorrelation: the signal is compared against itself at every
 * plausible lag, and the lag that matches best is the period. The normalising
 * is what makes the score comparable between a loud note and a quiet one, and
 * therefore what makes a clarity threshold mean anything.
 */
export function detectPitch(samples: Float32Array, sampleRate: number): Reading | null {
  // Silence has no pitch, and looking for one in it produces noise.
  let power = 0;
  for (let i = 0; i < samples.length; i += 1) power += samples[i] * samples[i];
  const rms = Math.sqrt(power / samples.length);
  if (rms < 0.01) return null;

  const minLag = Math.floor(sampleRate / MAX_HZ);
  const maxLag = Math.min(Math.floor(sampleRate / MIN_HZ), Math.floor(samples.length / 2));
  if (maxLag <= minLag) return null;

  const scores = new Float32Array(maxLag + 1);
  let bestScore = 0;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let dot = 0;
    let here = 0;
    let there = 0;
    for (let i = 0; i < samples.length - lag; i += 1) {
      dot += samples[i] * samples[i + lag];
      here += samples[i] * samples[i];
      there += samples[i + lag] * samples[i + lag];
    }
    const score = dot / (Math.sqrt(here * there) + 1e-9);
    scores[lag] = score;
    if (score > bestScore) bestScore = score;
  }

  if (bestScore < 0.9) return null;

  /**
   * The **shortest** period that scores nearly as well as the best, not the
   * best one.
   *
   * A voice repeats at its period and also, almost as convincingly, at twice
   * and three times it — the harmonics line up there too. Taking the highest
   * score therefore reads C4 as C3 and E5 as C3, which is what testing this
   * against synthetic vowels actually did. Preferring the shortest lag inside
   * a small margin picks the fundamental instead of its subharmonics, which
   * is the same idea YIN's absolute threshold uses.
   */
  const enough = bestScore * 0.93;
  let bestLag = -1;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    if (scores[lag] < enough) continue;
    // A peak, not the shoulder of one: the neighbours have to be lower, or the
    // first lag over the line wins on the way up to the real peak.
    if (scores[lag] >= scores[lag - 1] && scores[lag] >= scores[lag + 1]) {
      bestLag = lag;
      break;
    }
  }
  if (bestLag < 0) return null;

  /**
   * Where the peak really sits, between two samples.
   *
   * At 48 kHz one lag step near A4 is about four cents, and near E5 nearly
   * eight — enough to make a tuner wobble on a held note that is not moving.
   * Fitting a parabola through the peak and its neighbours recovers the rest.
   */
  const before = scores[bestLag - 1] ?? 0;
  const peak = scores[bestLag];
  const after = scores[bestLag + 1] ?? 0;
  const shift = (0.5 * (before - after)) / (before - 2 * peak + after || 1);
  const lag = bestLag + (Number.isFinite(shift) ? Math.max(-1, Math.min(1, shift)) : 0);

  return { hz: sampleRate / lag, clarity: peak };
}

export interface Note {
  readonly name: string;
  readonly octave: number;
  /** How far off the note, in cents. Negative is flat. ±50 is halfway to the next. */
  readonly cents: number;
}

/** A frequency as a note somebody can read. A440 as the reference. */
export function noteOf(hz: number): Note {
  const fromA = 12 * Math.log2(hz / 440);
  const midi = Math.round(fromA) + 69;
  const cents = Math.round((fromA - Math.round(fromA)) * 100);
  return {
    name: NOTES[((midi % 12) + 12) % 12],
    octave: Math.floor(midi / 12) - 1,
    cents,
  };
}
