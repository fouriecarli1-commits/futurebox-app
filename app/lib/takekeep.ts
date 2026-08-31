/**
 * Keeping a take: what happens to a song after somebody has sung on it.
 *
 * This lived inside the make screen, which was fine while the make screen was
 * the only door into the booth. It is not any more — the booth has its own rung
 * on the rail — and two copies of this would drift. When they drifted the
 * symptom would be a song kept from one door that cannot be opened up again
 * from the other, because the take was filed under a different name.
 *
 * So it is decided once, here.
 */

import { putAudio, type Track } from './library';
import { durationOf } from './trackaudio';

/** Where the raw take is filed, beside the mix. Both doors use this. */
export const takeId = (mixId: string): string => `${mixId}:take`;

/**
 * File a sung mix as its own song, and keep the take beside it.
 *
 * Returns the new track. Storing it in the library, pushing it to the cloud and
 * telling the rest of the screen are the caller's, because the two callers do
 * those differently.
 *
 * @param over     the song that was sung over
 * @param mixed    the finished mix
 * @param doubled  whether the AI voice was kept under the recorded one
 * @param take     the recorded voice on its own, so this can be opened again
 * @param suffix   what to add to the title, already in the reader's language
 */
export async function keepMix(
  over: Track,
  mixed: Blob,
  doubled: boolean,
  take: Blob,
  suffix: string,
): Promise<Track> {
  const id = `t-${Date.now()}`;
  await putAudio(id, mixed);
  // Kept beside the mix so the song can be opened up and changed again.
  await putAudio(takeId(id), take);
  const length = (await durationOf(mixed)) ?? over.seconds;
  return {
    ...over,
    id,
    title: `${over.title} — ${suffix}`,
    // Named for what it is. The vocal here is a recording of a person, and
    // that is a stronger thing to print on a release than any clone.
    models: over.models
      .filter((name) => name !== 'Backing — no vocal')
      .concat('Your voice (recorded)')
      // Said out loud when it is true. A double is a real production choice
      // and a good one, and a song that quietly has a generated voice in it
      // while the credits say otherwise is the one thing this must not be.
      .concat(doubled ? ['AI voice, kept under yours'] : []),
    seconds: Math.round(length),
    createdAt: new Date().toISOString(),
    // The new song is a new file. Whatever was separated belongs to the one it
    // came from, and carrying the flag across would claim stems that are not on
    // the device under this id.
    stems: undefined,
    mixOf: { source: over.id },
  };
}
