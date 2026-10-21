'use client';
/**
 * The words a song takes into the live channel, listened to first.
 *
 * The owner, 21 October 2026: *"Wanneer iemand 'n liedjie na die live channel
 * post, moet dit betaald standaard die liedjie eers luister, om die lyrics
 * presies op die image te kry wat gaan hardloop op die image."*
 *
 * So by default a song is listened to before it goes in (`listenedFor`: the
 * paid rungs, and free for a song already listened to), and the post carries
 * the second each line is sung (`lib/livetimed.ts`). When listening cannot be
 * done — no file on this device, no credits, nothing heard — the post still
 * goes in with its words spread over their sections, as before, and `why`
 * says what happened rather than the room quietly running the words wrong.
 */
import { CREDITS, perMinute } from './credits';
import type { Track } from './library';
import { listenedFor } from './lyrictime';
import { planOf, type Part } from './timeline';
import { readAudio } from './trackaudio';
import { timedParts, type TimedPart } from './livetimed';

/** What listening to this song costs, for the button that says so. Nothing if it has no words. */
export const listenPrice = (track: Track): number =>
  (track.lyrics ?? '').trim() || (track.parts ?? []).length ? perMinute(track.seconds || 0, CREDITS.transcribe) : 0;

export async function wordsForRoom(
  track: Track,
  listen: boolean,
): Promise<{ words: readonly (Part | TimedPart)[]; listened: boolean; why?: string }> {
  const plan = planOf(track);
  if (!listen) return { words: plan, listened: false };
  const audio = await readAudio(track.id).catch(() => null);
  if (!audio) return { words: plan, listened: false, why: 'The song file is not on this device, so it could not be listened to first.' };
  const heard = await listenedFor(track, audio).catch(() => null);
  if (!heard?.lines.length) {
    return { words: plan, listened: false, why: heard?.why ?? 'Nothing clear enough was heard, so the words are spread over the song.' };
  }
  return { words: timedParts(heard.lines), listened: true };
}
