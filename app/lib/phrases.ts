'use client';

/**
 * Where the singing actually is.
 *
 * The words on the stave have been landing in the wrong place, and the reason
 * is written in `app/lib/timeline.ts`: a section's lines are spread evenly
 * across it because nothing knew any better. Four lines across seventy-two
 * seconds get eighteen seconds each, and nobody sings like that. Worse, a
 * generated song usually opens with a bar or two of music before anybody sings
 * — so the first line lights up while the intro is still playing and every
 * line after it is early by the same amount, all the way to the end.
 *
 * Once the voice has been separated off the song, none of that has to be
 * guessed. The voice on its own is silent where nobody is singing, so the
 * phrases can simply be measured, and the words hung on them.
 *
 * This says nothing about *which* words are in a phrase. It finds the phrases;
 * `timeline.ts` puts the lines on them.
 */

/** Frames of this length are enough to catch a breath between phrases. */
const FRAME_S = 0.02;
/** A gap shorter than this is a breath or a consonant, not the end of a line. */
const MIN_GAP_S = 0.3;
/** Shorter than this is a click or a bleed from the separation, not singing. */
const MIN_PHRASE_S = 0.25;

export interface Phrase {
  readonly from: number;
  readonly to: number;
}

export function phrasesOf(samples: Float32Array, rate: number): Phrase[] {
  const frame = Math.max(1, Math.round(FRAME_S * rate));
  const count = Math.floor(samples.length / frame);
  if (count < 4) return [];

  const loudness = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    let power = 0;
    const from = i * frame;
    for (let j = 0; j < frame; j += 1) power += samples[from + j] * samples[from + j];
    loudness[i] = Math.sqrt(power / frame);
  }

  /**
   * The line between singing and not.
   *
   * Taken from the recording rather than fixed, because a separated vocal is
   * never digitally silent — what is left between phrases is the quiet wash
   * the separation could not place, and its level depends on the song. The
   * quietest fifth of the track is that wash; anything several times louder
   * than it, and a twentieth of the loudest moment, is somebody singing.
   */
  const sorted = Float32Array.from(loudness).sort();
  const floor = sorted[Math.floor(count * 0.2)];
  const loudest = sorted[count - 1];
  const line = Math.max(floor * 3, loudest * 0.05, 1e-4);

  const gap = Math.max(1, Math.round(MIN_GAP_S / FRAME_S));
  const shortest = Math.max(1, Math.round(MIN_PHRASE_S / FRAME_S));

  const out: Phrase[] = [];
  let from = -1;
  let quiet = 0;
  for (let i = 0; i < count; i += 1) {
    if (loudness[i] > line) {
      if (from < 0) from = i;
      quiet = 0;
      continue;
    }
    if (from < 0) continue;
    quiet += 1;
    // Held open through a breath, closed when the quiet is longer than one.
    if (quiet < gap) continue;
    const to = i - quiet;
    if (to - from >= shortest) out.push({ from: from * FRAME_S, to: (to + 1) * FRAME_S });
    from = -1;
    quiet = 0;
  }
  if (from >= 0 && count - quiet - from >= shortest) {
    out.push({ from: from * FRAME_S, to: (count - quiet) * FRAME_S });
  }
  return out;
}
