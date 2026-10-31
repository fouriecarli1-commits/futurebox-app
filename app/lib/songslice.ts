/**
 * The part of the song that plays under one shot, as a small WAV.
 *
 * For a lip-sync (docs/VIDEO-EDITOR-ROADMAP.md, gap 3): the face in a shot
 * sings what the film plays under it, so what is sent is exactly that
 * stretch of the song, from where the song is at the shot's first second, for
 * as long as the shot runs on the film, at the song's own speed. Cut here, on
 * the device; only the stretch leaves it.
 */
import { wavOf } from './subtitles';

/** Plenty for a voice to be lip-read from, and small to send. */
export const SLICE_RATE = 22050;

export async function songSlice(song: Blob, from: number, filmSeconds: number, speed = 1): Promise<Blob | null> {
  if (!(filmSeconds > 0) || !(from >= 0)) return null;
  try {
    const decoded = await new OfflineAudioContext(1, 1, SLICE_RATE).decodeAudioData(await song.arrayBuffer());
    const rate = Math.max(0.5, Math.min(2, speed));
    const start = Math.floor(from * SLICE_RATE);
    const end = Math.min(decoded.length, start + Math.ceil(filmSeconds * rate * SLICE_RATE));
    if (end - start < SLICE_RATE * 0.5) return null;
    const mono = new Float32Array(end - start);
    for (let c = 0; c < decoded.numberOfChannels; c += 1) {
      const data = decoded.getChannelData(c);
      for (let i = start; i < end; i += 1) mono[i - start] += data[i] / decoded.numberOfChannels;
    }
    /* At the song's speed, the stretch is played back faster or slower on the
       film; the samples are written at a rate that plays them in the shot's
       own length, which is what the film does to them. */
    return wavOf(mono, Math.round(SLICE_RATE * rate));
  } catch {
    return null;
  }
}
