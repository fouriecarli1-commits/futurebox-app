/**
 * What the cloud keeps of a piece of sound: the same sound, a fifth the size.
 *
 * ── Why ──────────────────────────────────────────────────────────────────
 *
 * The owner, 14 October 2026: *"Ek wil nie gecap wees nie, ek wil groot gaan,
 * en as storage 'n probleem is dan moet ons op kom met 'n plan."* The plan
 * had three parts, and this is the third. A take sung in the booth is mixed
 * down to a WAV — every sample written out, ten megabytes a minute — and
 * that WAV went to the account as it was. A generated song arrives as an MP3
 * and was always kept as one; the booth's copy of the same song with a voice
 * on it was five times bigger for no reason anybody could hear. A kids'
 * storybook reading was the same.
 *
 * ── Why MP3, and why it waited ───────────────────────────────────────────
 *
 * It waited on 16 October because the format to hand was Opus, and an iPhone
 * on an older iOS will not play an Opus file — a song kept "smaller" that
 * will not play on her phone is a song lost. MP3 plays on everything, and
 * since 18 October the app carries its own MP3 encoder (`lib/mp3.ts`, for the
 * booth's file-size limit). At 320 kbps — the most an MP3 holds — a mix whose
 * backing was itself a 192 kbps MP3 loses nothing anybody can hear.
 *
 * ── What stays whole ─────────────────────────────────────────────────────
 *
 * The device's own copy: the WAV goes into IndexedDB first, untouched, and
 * the booth's own Save still writes a WAV. Only what crosses to the account
 * is made smaller. Anything that is not a WAV is sent as it is, and anything
 * that cannot be decoded, or does not come out smaller, is sent as it was —
 * this never fails a save to save space.
 */
import { encodeMp3 } from './mp3';

/** Kilobits a second the cloud's copy is written at: MP3's best. */
export const CLOUD_KBPS = 320;

/** Whether a file of this type is shrunk before it is kept in the cloud. */
export function shrinksForCloud(type: string): boolean {
  return /^audio\/(wav|wave|x-wav|vnd\.wave)\b/i.test(type.trim());
}

/** The copy to keep in the cloud: an MP3 of a WAV, anything else as it is. */
export async function cloudCopyOf(audio: Blob): Promise<Blob> {
  if (!shrinksForCloud(audio.type) || typeof window === 'undefined') return audio;
  const Ctx = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return audio;
  let context: AudioContext | null = null;
  try {
    context = new Ctx();
    const decoded = await context.decodeAudioData(await audio.arrayBuffer());
    const mp3 = await encodeMp3(decoded, CLOUD_KBPS, decoded.numberOfChannels > 1 ? 'stereo' : 'mono');
    return mp3.size > 0 && mp3.size < audio.size ? mp3 : audio;
  } catch {
    return audio;
  } finally {
    await context?.close().catch(() => undefined);
  }
}
