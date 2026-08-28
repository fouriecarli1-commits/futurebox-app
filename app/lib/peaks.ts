'use client';

/**
 * The shape of a piece of audio, read from the audio.
 *
 * Every waveform on this screen is measured from the file it sits under. A
 * decorative squiggle would have been a fraction of the code and would be a
 * picture of nothing — you could not use it to find the chorus, which is the
 * only reason to draw one.
 */

export interface Peaks {
  /** One loudness value per column, 0…1. */
  readonly values: Float32Array;
  /** The file's real length, which is also what the playhead is scaled against. */
  readonly duration: number;
}

/**
 * Decodes the audio once and reduces it to a few hundred columns.
 *
 * Decoding is the expensive part — a three-minute track is about thirty
 * million samples — so the result is cached by the caller and this is asked
 * once per track, not once per render.
 */
export async function peaksOf(blob: Blob, columns = 480): Promise<Peaks | null> {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const context = new Ctx();
    try {
      const decoded = await context.decodeAudioData(await blob.arrayBuffer());
      const channel = decoded.getChannelData(0);
      const per = Math.max(1, Math.floor(channel.length / columns));
      const values = new Float32Array(columns);

      let loudest = 0;
      for (let column = 0; column < columns; column += 1) {
        const from = column * per;
        const to = Math.min(channel.length, from + per);
        let peak = 0;
        // The loudest sample in the window rather than the average: an average
        // flattens a track to a smooth blob and hides exactly the transients
        // that let you see where a section starts.
        for (let i = from; i < to; i += 1) {
          const size = channel[i] < 0 ? -channel[i] : channel[i];
          if (size > peak) peak = size;
        }
        values[column] = peak;
        if (peak > loudest) loudest = peak;
      }

      // Normalised, so a quiet recording is still legible. The picture is of
      // relative loudness within this track, which is what it is read for.
      if (loudest > 0) for (let i = 0; i < columns; i += 1) values[i] /= loudest;

      return { values, duration: decoded.duration };
    } finally {
      await context.close();
    }
  } catch {
    return null;
  }
}
